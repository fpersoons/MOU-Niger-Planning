// ─── Export Excel ────────────────────────────────────────────────────────────
// ExcelJS (vrai .xlsx, ouverture sans avertissement sous Excel), chargé à la demande.
// Feuille « Quantités et coûts » (quantités, prix livrés, totaux) entièrement en
// formules, liée à la feuille « Paramètres » (hypothèses modifiables), aux couleurs
// de l'application. parseWorkbookRows relit « Paramètres » (tests).

import {
  COMMODITIES, FUTURE_YEARS, METHODS, METHOD_LABEL, MILDA, REGULAR, YEARS, byId,
  CARRY_LABEL, CARRY_RULES, CARRY_YEARS, PSN_LABEL, PSN_SHORT, PSN_YEARS, normalizeScenarioData, parseVal, psnSplit, simulate,
} from './model.js';
import { fmtDay } from './logistics.js';

// Couleurs de l'application (palette CHEMONICS, tailwind.config.js).
const C = {
  darkblue: 'FF005D83', blue: 'FF00B7F1', blue20: 'FFCCF1FC', blue10: 'FFE6F8FE',
  gray1: 'FF333E48', gray2: 'FF56565A', gray20: 'FFD6D8DA', gray10: 'FFEBECED', gray5: 'FFF5F7F8', white: 'FFFFFFFF',
  posText: 'FF377225', posFill: 'FFEBF1D5', negText: 'FF7B0046', negFill: 'FFFDE0D8',
};
const FONT = { size: 10, name: 'Montserrat', color: { argb: C.gray1 } };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = (argb) => ({ style: 'thin', color: { argb } });
const MONEY = '"$"#,##0';
const PRICE = '"$"#,##0.00##';
const QTY = '#,##0';
const GAP = '+0%;-0%;0%'; // écart signé par rapport à la quantité prévue
const PCT = '0%';
const MODE_CODE = { air: 'Air', sea: 'Mer' };
const MODE_PLAIN = { air: 'Avion', sea: 'Bateau + route via Lomé' };

const pad = (n) => String(n).padStart(2, '0');
const slug = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const q = (t) => `"${String(t).replace(/"/g, '""')}"`; // chaîne dans une formule

/** GHSC-PSM_Budget_Prospective_MM_DD_YY[_scenario].xlsx */
export const exportFileName = (scenarioName, date = new Date()) => {
  const d = `${pad(date.getMonth() + 1)}_${pad(date.getDate())}_${pad(date.getFullYear() % 100)}`;
  const s = slug(scenarioName);
  return `GHSC-PSM_Budget_Prospective_${d}${s ? `_${s}` : ''}.xlsx`;
};

// ─── Styles ───
const styleHeader = (row) => row.eachCell((c) => {
  c.font = { ...FONT, size: 9, bold: true, color: { argb: C.gray2 } };
  c.fill = fill(C.gray5);
  c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  c.border = { bottom: thin(C.gray20), top: thin(C.gray20) };
});
const styleBanner = (row, ncol) => {
  for (let i = 1; i <= ncol; i++) {
    const c = row.getCell(i);
    c.fill = fill(C.darkblue);
    c.font = { ...FONT, bold: true, size: 11, color: { argb: C.white } };
  }
  row.height = 20;
  row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
};
/** Cellule modifiable : fond bleu clair, texte bleu foncé (comme les champs de saisie de l'application). */
const asInput = (cell) => {
  cell.fill = fill(C.blue10);
  cell.font = { ...FONT, color: { argb: C.darkblue } };
  cell.border = { top: thin(C.blue20), bottom: thin(C.blue20), left: thin(C.blue20), right: thin(C.blue20) };
};
const lineBorder = (row, ncol) => { for (let i = 1; i <= ncol; i++) row.getCell(i).border = { ...row.getCell(i).border, bottom: thin(C.gray10) }; };
/** Mise en forme conditionnelle : vert si positif, aubergine sur fond orangé si négatif (rôles POS / NEG). */
const signRules = (ws, ref, { zeroPositive = false } = {}) => {
  const tl = ref.split(':')[0];
  ws.addConditionalFormatting({
    ref,
    rules: [
      { type: 'expression', priority: 1, formulae: [`AND(ISNUMBER(${tl}),${tl}<0)`], style: { font: { color: { argb: C.negText }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.negFill } } } },
      { type: 'expression', priority: 2, formulae: [`AND(ISNUMBER(${tl}),${tl}${zeroPositive ? '>=' : '>'}0)`], style: { font: { color: { argb: C.posText }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.posFill } } } },
    ],
  });
};
const f = (formula, result) => ({ formula, result });

/**
 * Construit le classeur ExcelJS d'un scénario. Tout est calculé par formules à partir
 * de la feuille « Paramètres » (cellules bleu clair modifiables) : coûts, split contribution USG,
 * quantités (automatiques ou manuelles), totaux, budgets disponibles, reports et restes.
 * Les valeurs calculées par l'application sont jointes comme résultats en cache.
 */
export const buildWorkbook = async (scenario, today = new Date()) => {
  const ExcelJS = (await import('exceljs')).default;
  const data = normalizeScenarioData(scenario.data);
  const sim = simulate(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GHSC-PSM — Planificateur Intrants Paludisme';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  const pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  const wo = wb.addWorksheet('Quantités et coûts', { views: [{ showGridLines: false }], pageSetup, properties: { tabColor: { argb: C.darkblue } } });
  const wp = wb.addWorksheet('Paramètres', { views: [{ showGridLines: false }], pageSetup, properties: { tabColor: { argb: C.blue } } });
  const P = (addr) => `'Paramètres'!${addr}`;
  const regular = REGULAR;
  const milda = data.includeMilda ? MILDA : [];

  // ═══ Feuille « Paramètres » ═══
  wp.columns = [{ width: 44 }, { width: 30 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const pt = wp.addRow(['Paramètres du scénario']);
  pt.getCell(1).font = { ...FONT, size: 14, bold: true, color: { argb: C.darkblue } };
  const pl = wp.addRow(['Cellules bleu clair : valeurs modifiables. La feuille « Quantités et coûts » se recalcule à partir d’elles.']);
  pl.getCell(1).font = { ...FONT, italic: true, color: { argb: C.gray2 } };
  wp.addRow([]);

  // Coûts par intrant (réguliers puis MILDA : plages contiguës pour les formules)
  styleHeader(wp.addRow(['Intrant', 'Unité d\'achat', 'Prix EXW ($)', 'Coût livré bateau + route ($)', 'Coût livré avion ($)', 'Qté FY26', 'Fret bateau (calculé)', 'Fret avion (calculé)']));
  const costRow = {};
  for (const c of [...regular, ...MILDA]) {
    const p = data.commodities[c.id];
    const r = wp.addRow([c.name, c.unit, p.price, p.landedSea, c.isMilda ? null : p.landedAir, c.isMilda ? null : p.qty26]);
    const n = r.number;
    costRow[c.id] = n;
    r.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
    [3, 4].concat(c.isMilda ? [] : [5, 6]).forEach((i) => asInput(r.getCell(i)));
    r.getCell(3).numFmt = PRICE; r.getCell(4).numFmt = PRICE; r.getCell(5).numFmt = PRICE; r.getCell(6).numFmt = QTY;
    r.getCell(7).value = f(`IF(C${n}=0,"",D${n}/C${n}-1)`, p.price ? p.landedSea / p.price - 1 : '');
    if (!c.isMilda) r.getCell(8).value = f(`IF(C${n}=0,"",E${n}/C${n}-1)`, p.price ? p.landedAir / p.price - 1 : '');
    r.getCell(7).numFmt = PCT; r.getCell(8).numFmt = PCT;
    lineBorder(r, 8);
  }
  const regRange = (col) => `${col}${costRow[regular[0].id]}:${col}${costRow[regular[regular.length - 1].id]}`;
  wp.addRow([]);

  // Exercices
  styleHeader(wp.addRow(['Exercice', 'Mode logistique', 'Budget MOU ($)', 'Réserve assistance ($)', 'Accruals ($)', 'Report du solde', 'Méthode', ...milda.map((m) => `Qté ${m.name}`)]));
  const yearRow = {};
  for (const y of YEARS) {
    const r = wp.addRow([`FY${y}`, MODE_CODE[data.logistics[y]], Number(data.budgets[y]) || 0, Number(data.reserves[y]) || 0,
      Number(data.yearAccruals[y]) || 0, CARRY_YEARS.includes(y) ? CARRY_LABEL[data.carryRules[y]] : '—',
      y === '2026' ? '—' : METHOD_LABEL[data.methods[y]],
      ...milda.map((m) => Number(data.manualQtys[y][m.id]) || 0)]);
    yearRow[y] = r.number;
    r.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
    r.getCell(1).font = { ...FONT, bold: true };
    [3, 4, 5].forEach((i) => { asInput(r.getCell(i)); r.getCell(i).numFmt = MONEY; });
    if (y !== '2026') {
      asInput(r.getCell(2));
      r.getCell(2).dataValidation = { type: 'list', allowBlank: false, formulae: ['"Air,Mer"'] };
      asInput(r.getCell(7));
      r.getCell(7).dataValidation = { type: 'list', allowBlank: false, formulae: [q(METHODS.map((m) => METHOD_LABEL[m]).join(','))] };
      milda.forEach((_, k) => { asInput(r.getCell(8 + k)); r.getCell(8 + k).numFmt = QTY; });
    }
    if (CARRY_YEARS.includes(y)) {
      asInput(r.getCell(6));
      r.getCell(6).dataValidation = { type: 'list', allowBlank: false, formulae: [q(CARRY_RULES.map((k) => CARRY_LABEL[k]).join(','))] };
    }
    lineBorder(r, 7 + milda.length);
  }
  const yr26 = wp.addRow(['FY2026 est clos : la réserve prévue est indicative, le solde = budget − accruals (tout l’engagé).']);
  yr26.getCell(1).font = { ...FONT, italic: true, size: 9, color: { argb: C.gray2 } };

  // Quantification PSN et split calculé
  wp.addRow([]);
  styleHeader(wp.addRow([`Quantification PSN — ${PSN_LABEL}`, ...PSN_YEARS]));
  const psnRow = {};
  for (const c of regular) {
    const r = wp.addRow([c.name, ...PSN_YEARS.map((y) => Number(data.quantification[y][c.id]) || 0)]);
    psnRow[c.id] = r.number;
    r.eachCell({ includeEmpty: true }, (cell, i) => { cell.font = FONT; if (i > 1) { asInput(cell); cell.numFmt = QTY; } });
    lineBorder(r, PSN_YEARS.length + 1);
  }
  const psnCol = Object.fromEntries(PSN_YEARS.map((y, k) => [y, String.fromCharCode(66 + k)]));
  const psnRange = (y) => `${psnCol[y]}${psnRow[regular[0].id]}:${psnCol[y]}${psnRow[regular[regular.length - 1].id]}`;
  wp.addRow([]);
  styleHeader(wp.addRow(['Split contribution USG (calculé, valeur EXW)', ...PSN_YEARS]));
  const splits = Object.fromEntries(PSN_YEARS.map((y) => [y, psnSplit(data, y)]));
  for (const c of regular) {
    const r = wp.addRow([c.name]);
    PSN_YEARS.forEach((y, k) => {
      const col = psnCol[y];
      r.getCell(2 + k).value = f(`IF(SUMPRODUCT(${psnRange(y)},${regRange('C')})=0,0,${col}${psnRow[c.id]}*C${costRow[c.id]}/SUMPRODUCT(${psnRange(y)},${regRange('C')}))`, splits[y][c.id]);
      r.getCell(2 + k).numFmt = '0.0%';
    });
    r.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
    lineBorder(r, PSN_YEARS.length + 1);
  }

  // Quantités manuelles (méthode « Ajusté manuellement »)
  wp.addRow([]);
  styleHeader(wp.addRow(['Quantités manuelles', ...FUTURE_YEARS.map((y) => `FY${y}`)]));
  const manRow = {};
  for (const c of regular) {
    const r = wp.addRow([c.name, ...FUTURE_YEARS.map((y) => Number(data.regularQtys[y][c.id]) || 0)]);
    manRow[c.id] = r.number;
    r.eachCell({ includeEmpty: true }, (cell, i) => { cell.font = FONT; if (i > 1) { asInput(cell); cell.numFmt = QTY; } });
    lineBorder(r, FUTURE_YEARS.length + 1);
  }
  const manCol = Object.fromEntries(FUTURE_YEARS.map((y, k) => [y, String.fromCharCode(66 + k)]));
  wp.addRow([]);
  const fy26Planned = data.fy26Spending !== 'unspent';
  for (const [label, value] of [
    ['Options — FY2026 dépensé', fy26Planned ? 'Oui' : 'Non'],
    ['Options — Inclure les MILDA', data.includeMilda ? 'Oui' : 'Non'],
  ]) {
    const r = wp.addRow([label, value]);
    r.getCell(1).font = { ...FONT, bold: true };
    r.getCell(2).font = FONT;
  }

  // ═══ Feuille « Quantités et coûts » ═══
  const NC = 7;
  wo.columns = [{ width: 46 }, { width: 30 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 20 }, { width: 13 }];
  const ot = wo.addRow(['MOU Niger — Quantités commandables et coûts livrés FY2027-FY2030']);
  ot.getCell(1).font = { ...FONT, size: 14, bold: true, color: { argb: C.darkblue } };
  for (const txt of [
    `Scénario : ${scenario.name} — situation au ${fmtDay(today)}`,
    `Quantités commandables = ${PSN_LABEL.charAt(0).toLowerCase()}${PSN_LABEL.slice(1)}, ajustées pour rester dans le budget disponible. Montants en dollars américains, livrés au Niger (produit + transport).`,
    'Toutes les valeurs sont calculées par formules à partir de la feuille « Paramètres » (cellules bleu clair modifiables).',
  ]) { const r = wo.addRow([txt]); r.getCell(1).font = { ...FONT, color: { argb: C.gray2 } }; }
  wo.addRow([]);

  const moneyRow = (label, formula, result, { strong = false, sign = false, note } = {}) => {
    const r = wo.addRow([label]);
    wo.mergeCells(r.number, 1, r.number, 4);
    r.getCell(1).font = { ...FONT, bold: strong, color: { argb: strong ? C.darkblue : C.gray1 } };
    r.getCell(1).alignment = { horizontal: 'right' };
    const c = r.getCell(5);
    c.value = f(formula, result);
    c.numFmt = MONEY;
    c.font = { ...FONT, bold: strong };
    if (strong) { for (let i = 1; i <= NC; i++) r.getCell(i).fill = fill(C.blue10); c.border = { top: thin(C.darkblue) }; }
    if (note) { r.getCell(6).value = note; r.getCell(6).font = { ...FONT, size: 8, italic: true, color: { argb: C.gray2 } }; }
    if (sign) signRules(wo, `E${r.number}`, { zeroPositive: true });
    return r;
  };

  // FY2026 (clos) : solde reporté selon sa règle
  const s26 = sim.years['2026'];
  styleBanner(wo.addRow(['FY2026 — exercice clos au 30/09/2026']), NC);
  const b26 = moneyRow('Budget MOU', P(`C${yearRow['2026']}`), s26.base);
  const a26 = moneyRow('Accruals (engagé : produits et assistance)', `-${P(`E${yearRow['2026']}`)}`, -s26.accruals);
  const extra26 = fy26Planned && s26.total
    ? moneyRow('Commandes FY2026', `-SUMPRODUCT(${P(regRange('F'))},${P(regRange(data.logistics['2026'] === 'air' ? 'E' : 'D'))})`, -s26.total)
    : null;
  const resteCell = { 2026: null };
  const solde26 = moneyRow('Solde FY2026', `SUM(E${b26.number}:E${(extra26 || a26).number})`, s26.balance, { strong: true, sign: true });
  resteCell['2026'] = `E${solde26.number}`;
  wo.addRow([]);

  // Report reçu par une année : somme des soldes des années précédentes selon leur règle.
  const carryFormula = (y) => {
    const terms = [];
    for (const x of CARRY_YEARS.filter((x) => x < y)) {
      const rule = P(`F${yearRow[x]}`);
      const after = FUTURE_YEARS.filter((z) => z > x);
      if (after[0] === y) terms.push(`IF(${rule}=${q(CARRY_LABEL.next)},${resteCell[x]},0)`);
      terms.push(`IF(${rule}=${q(CARRY_LABEL.smooth)},${resteCell[x]}/${after.length},0)`);
    }
    return terms.join('+') || '0';
  };

  const totalRefs = [];
  for (const y of FUTURE_YEARS) {
    const yr = sim.years[y];
    const yrow = yearRow[y];
    const mode = P(`B${yrow}`);
    const method = P(`G${yrow}`);
    const banner = wo.addRow([]);
    banner.getCell(1).value = f(`"FY${y} — Transport : "&IF(${mode}="Air","Avion","Bateau + route via Lomé")&" — Calcul : "&${method}`,
      `FY${y} — Transport : ${MODE_PLAIN[yr.mode]} — Calcul : ${METHOD_LABEL[yr.method]}`);
    wo.mergeCells(banner.number, 1, banner.number, NC);
    styleBanner(banner, NC);
    styleHeader(wo.addRow(['Produit', 'Unité d\'achat', 'Quantité commandable', 'Prix unitaire livré ($)', 'Total livré ($)', `${PSN_SHORT} — ${y}`, 'Écart vs prévu']));
    const first = wo.rowCount + 1;
    const nReg = regular.length;
    const last = first + nReg + milda.length - 1;
    // Lignes à venir (adresses connues d'avance) : budget disponible et lignes MILDA.
    const totalRowN = last + 1;
    const availRowN = totalRowN + 5;
    const regF = `F${first}:F${first + nReg - 1}`;
    const regD = `D${first}:D${first + nReg - 1}`;
    const mildaE = milda.length ? `SUM(E${first + nReg}:E${last})` : '0';
    const residual = `(E${availRowN}-${mildaE})`;
    const denom = `SUMPRODUCT(${regF},${regD},--(${P(regRange('C'))}>0))`;
    const byIdLine = Object.fromEntries(yr.lines.map((l) => [l.id, l]));
    for (const c of regular) {
      const l = byIdLine[c.id];
      const n = wo.rowCount + 1;
      const cr = costRow[c.id];
      const auto = `IF(OR(${P(`C${cr}`)}<=0,${denom}<=0,${residual}<=0),0,ROUNDDOWN(${residual}*F${n}/${denom},0))`;
      const r = wo.addRow([`${c.plain} (${c.name})`, c.unit]);
      r.getCell(3).value = f(`IF(${method}=${q(METHOD_LABEL.manual)},${P(`${manCol[y]}${manRow[c.id]}`)},${auto})`, l.qty);
      r.getCell(4).value = f(`IF(${mode}="Air",${P(`E${cr}`)},${P(`D${cr}`)})`, l.price * (1 + l.rate / 100));
      r.getCell(5).value = f(`C${n}*D${n}`, l.landed);
      r.getCell(6).value = f(P(`${psnCol[y]}${psnRow[c.id]}`), l.need);
      r.getCell(7).value = f(`IF(F${n}=0,"",C${n}/F${n}-1)`, l.need > 0 ? l.coverage - 1 : '');
      r.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
      r.getCell(3).font = { ...FONT, bold: true, color: { argb: C.darkblue } };
      r.getCell(3).numFmt = QTY; r.getCell(4).numFmt = PRICE; r.getCell(5).numFmt = MONEY; r.getCell(6).numFmt = QTY; r.getCell(7).numFmt = GAP;
      lineBorder(r, NC);
    }
    for (const m of milda) {
      const l = byIdLine[m.id];
      const n = wo.rowCount + 1;
      const r = wo.addRow([`${m.plain || m.name} (${m.name})`, m.unit]);
      r.getCell(3).value = f(`IF(${mode}="Mer",${P(`${String.fromCharCode(72 + MILDA.indexOf(m))}${yrow}`)},0)`, l ? l.qty : 0);
      r.getCell(4).value = f(P(`D${costRow[m.id]}`), data.commodities[m.id].landedSea);
      r.getCell(5).value = f(`C${n}*D${n}`, l ? l.landed : 0);
      r.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
      r.getCell(3).numFmt = QTY; r.getCell(4).numFmt = PRICE; r.getCell(5).numFmt = MONEY;
      lineBorder(r, NC);
    }
    signRules(wo, `G${first}:G${last}`);
    const totalRow = moneyRow(`Total commandé FY${y}`, `SUM(E${first}:E${last})`, yr.total, { strong: true });
    totalRefs.push(`E${totalRow.number}`);
    const bRow = moneyRow('Budget MOU', P(`C${yrow}`), yr.base);
    moneyRow('Report reçu des années précédentes', carryFormula(y), yr.bonus, { note: 'selon « Report du solde »' });
    moneyRow('Réserve assistance (AT, entreposage, distribution)', `-${P(`D${yrow}`)}`, -yr.reserve);
    moneyRow('Accruals', `-${P(`E${yrow}`)}`, -yr.accruals);
    const avail = moneyRow('Budget disponible pour les produits', `SUM(E${bRow.number}:E${bRow.number + 3})`, yr.available, { strong: true });
    if (avail.number !== availRowN || totalRow.number !== totalRowN) throw new Error('Mise en page Excel incohérente');
    const reste = moneyRow('Reste (+) ou dépassement (−)', `E${avail.number}-E${totalRow.number}`, yr.balance, { strong: true, sign: true });
    resteCell[y] = `E${reste.number}`;
    wo.addRow([]);
  }
  moneyRow('Total commandé FY2027-FY2030', totalRefs.join('+'), FUTURE_YEARS.reduce((t, y) => t + sim.years[y].total, 0), { strong: true });
  return wb;
};

/** Télécharge le scénario au format .xlsx. */
export const exportScenarioXlsx = async (scenario) => {
  const wb = await buildWorkbook(scenario);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(scenario.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─── Import ─────────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const NAME_INDEX = Object.fromEntries(COMMODITIES.map((c) => [norm(c.name), c.id]));

const findCol = (header, tests) => header.findIndex((h) => tests.some((t) => t(norm(h))));

/**
 * Lit les paramètres d'un classeur (tableau de lignes par feuille, format SheetJS
 * `sheet_to_json(..., { header: 1 })`). Reconnaît le tableau des intrants par son
 * en-tête « Intrant », celui des exercices par « Exercice » (budgets, réserves, accruals, report).
 * Renvoie { data, found } où found compte les intrants reconnus.
 */
export const parseWorkbookRows = (sheets, base) => {
  const data = normalizeScenarioData(base);
  let found = 0;
  let legacyAcc = null; // anciens formats d'accruals FY2026
  let assistValue = null; // assistance FY2026 dépensée (nouveau format) ou engagée (ancien format)
  let newAcc = false;
  for (const rows of sheets) {
    for (let i = 0; i < rows.length; i++) {
      const header = rows[i] || [];
      const first = norm(header[0]);
      // Tableau des intrants
      if (header.some((h) => ['intrant', 'commodity', 'produit', 'item'].includes(norm(h)))) {
        const cName = header.findIndex((h) => ['intrant', 'commodity', 'produit', 'item'].includes(norm(h)));
        const cPrice = findCol(header, [(h) => h.includes('prix'), (h) => h.includes('price'), (h) => h === 'exw' || h.startsWith('exw')]);
        const cAir = findCol(header, [(h) => h.includes('air'), (h) => h.includes('avion')]);
        const cSea = findCol(header, [(h) => h.includes('mer'), (h) => h.includes('sea'), (h) => h.includes('bateau')]);
        // Coûts livrés unitaires ($) ou, dans les anciens fichiers, taux de fret (%).
        const asLanded = (k) => k >= 0 && /landed|livre|cout/.test(norm(header[k])) && !/fret/.test(norm(header[k]));
        const cQty = findCol(header, [(h) => h.includes('qte'), (h) => h.includes('qty'), (h) => h.includes('quantite')]);
        if (cPrice < 0) continue; // ex. tableaux de simulation : ignorés
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const id = NAME_INDEX[norm(r[cName])];
          if (!id) { if (!r.length || r.every((v) => v === null || v === undefined || v === '')) break; continue; }
          const p = data.commodities[id];
          const c = byId[id];
          if (cPrice >= 0 && r[cPrice] !== undefined && r[cPrice] !== null) p.price = parseVal(r[cPrice]);
          const setLanded = (k, field) => {
            if (k < 0 || r[k] === undefined || r[k] === null || r[k] === '') return;
            p[field] = asLanded(k) ? parseVal(r[k]) : Math.round(p.price * (1 + parseVal(r[k], true) / 100) * 10000) / 10000;
          };
          if (!c.isMilda) setLanded(cAir, 'landedAir');
          setLanded(cSea, 'landedSea');
          if (cQty >= 0 && !c.isMilda && r[cQty] !== undefined && r[cQty] !== null) p.qty26 = parseVal(r[cQty]);
          found++;
        }
      }
      // Tableau des exercices
      if (first === 'exercice' || first === 'fiscalyear' || first === 'year') {
        const cMode = findCol(header, [(h) => h.includes('logist') || h.includes('mode')]);
        const cBudget = findCol(header, [(h) => h.includes('budget')]);
        const cReserve = findCol(header, [(h) => h.includes('reserve')]);
        const cMethod = findCol(header, [(h) => h.includes('methode') || h.includes('method')]);
        const cAcc = findCol(header, [(h) => h.includes('accrual')]);
        const cCarry = findCol(header, [(h) => h.includes('report')]);
        const cMilda = MILDA.map((m) => header.findIndex((h) => norm(h).includes(norm(m.name))));
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const y = String(r[0] ?? '').match(/20(2[6-9]|30)/)?.[0];
          if (!y) break;
          if (cMode >= 0 && r[cMode]) data.logistics[y] = /air/i.test(String(r[cMode])) ? 'air' : 'sea';
          if (cBudget >= 0 && r[cBudget] !== undefined && r[cBudget] !== null && r[cBudget] !== '') data.budgets[y] = parseVal(r[cBudget]);
          if (cReserve >= 0 && r[cReserve] !== undefined && r[cReserve] !== null && r[cReserve] !== '') data.reserves[y] = parseVal(r[cReserve]);
          if (cAcc >= 0 && r[cAcc] !== undefined && r[cAcc] !== null && r[cAcc] !== '') { data.yearAccruals[y] = parseVal(r[cAcc]); newAcc = true; }
          if (cCarry >= 0 && CARRY_YEARS.includes(y)) {
            const v = norm(r[cCarry]);
            const rule = CARRY_RULES.find((k) => norm(CARRY_LABEL[k]) === v) || (/lisse/.test(v) ? 'smooth' : /aucun/.test(v) ? 'none' : /suivante/.test(v) ? 'next' : null);
            if (rule) data.carryRules[y] = rule;
          }
          if (cMethod >= 0 && y !== '2026') {
            const v = norm(r[cMethod]);
            const m = METHODS.find((k) => norm(METHOD_LABEL[k]) === v) || (/manuel/.test(v) ? 'manual' : /quantif|split|psn/.test(v) ? 'quantif' : null);
            if (m) data.methods[y] = m;
          }
          MILDA.forEach((m, k) => { if (cMilda[k] >= 0) data.manualQtys[y][m.id] = Math.max(0, Math.floor(parseVal(r[cMilda[k]]))); });
        }
      }
      // Quantification PSN (ou « Quantification Niger », anciens fichiers) / quantités manuelles
      if (first.startsWith('quantificationpsn') || first === 'quantificationniger' || first === 'quantitesmanuelles') {
        const key = first === 'quantitesmanuelles' ? 'regularQtys' : 'quantification';
        const years = key === 'quantification' ? PSN_YEARS : FUTURE_YEARS;
        const cols = years.map((y) => header.findIndex((h, k) => k > 0 && String(h ?? '').includes(y)));
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const id = NAME_INDEX[norm(r[0])];
          if (!id) break;
          years.forEach((y, k) => { if (cols[k] >= 0) data[key][y][id] = Math.max(0, Math.floor(parseVal(r[cols[k]]))); });
        }
      }
      // Options et délais
      if (first.startsWith('options')) {
        const v = norm(header[1]);
        // anciens fichiers : assistance engagée (ajoutée aux accruals FY2026) et report du surplus FY2026
        if (first.includes('milda')) data.includeMilda = v === 'oui';
        else if (first.includes('assistance')) assistValue = parseVal(header[1]);
        else if (first.includes('report')) data.carryRules['2026'] = v.includes('lisse') || v.endsWith('4') ? 'smooth' : 'next';
        else if (first.includes('depense')) data.fy26Spending = v === 'non' ? 'unspent' : 'planned';
      }
      // Anciens fichiers : tableau des accruals au 30/09/2026 ou lignes « Accruals — … »
      if (first === 'accrualsau30092026') {
        legacyAcc = 0;
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          if (r.every((v) => v === null || v === undefined || v === '')) break;
          legacyAcc += parseVal(r[2]) * (1 + parseVal(r[3], true) / 100);
        }
      } else if (first.startsWith('accruals') && first.includes('montant')) {
        legacyAcc = (legacyAcc || 0) + parseVal(header[1]);
      }
    }
  }
  if (newAcc) { if (assistValue !== null) data.yearAccruals['2026'] += assistValue; }
  else if (legacyAcc !== null) data.yearAccruals['2026'] = legacyAcc + (assistValue || 0);
  return { data, found };
};

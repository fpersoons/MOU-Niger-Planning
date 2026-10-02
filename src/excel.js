// ─── Export Excel ────────────────────────────────────────────────────────────
// ExcelJS (vrai .xlsx, ouverture sans avertissement sous Excel), chargé à la demande.
// Feuille « Quantités et coûts » (quantités, prix livrés, totaux) et feuille
// « Paramètres » (hypothèses). parseWorkbookRows relit « Paramètres » (tests).

import {
  COMMODITIES, FUTURE_YEARS, METHODS, METHOD_LABEL, MILDA, REGULAR, YEARS, byId,
  CARRY_LABEL, CARRY_RULES, CARRY_YEARS, PSN_YEARS, normalizeScenarioData, parseVal, simulate,
} from './model.js';
import { fmtDay } from './logistics.js';

const MODE_PLAIN = { air: 'Avion', sea: 'Bateau + route via Lomé' };
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const METHOD_PLAIN = { quantif: 'Automatique (split PSN)', manual: 'Ajusté manuellement' };

const FONT = { size: 11, name: 'Arial' };
const MONEY = '"$"#,##0.00';
const QTY = '#,##0';
const GAP = '+0%;-0%;0%'; // écart signé par rapport à la quantité prévue
const PCT = '0.00%'; // valeurs écrites en fraction (4,41 % -> 0.0441), relues par parseVal
const pct = (v) => (v === null || v === undefined ? null : (Number(v) || 0) / 100);
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000066' } };
const GREEN = 'FF15803D';
const RED = 'FFB91C1C';
const MODE_LABEL = { air: 'Air', sea: 'Mer' };

const pad = (n) => String(n).padStart(2, '0');
const slug = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** GHSC-PSM_Budget_Prospective_MM_DD_YY[_scenario].xlsx */
export const exportFileName = (scenarioName, date = new Date()) => {
  const d = `${pad(date.getMonth() + 1)}_${pad(date.getDate())}_${pad(date.getFullYear() % 100)}`;
  const s = slug(scenarioName);
  return `GHSC-PSM_Budget_Prospective_${d}${s ? `_${s}` : ''}.xlsx`;
};

/** Construit le classeur ExcelJS d'un scénario. */
export const buildWorkbook = async (scenario, today = new Date()) => {
  const ExcelJS = (await import('exceljs')).default;
  const data = normalizeScenarioData(scenario.data);
  const sim = simulate(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GHSC-PSM — Planificateur Intrants Paludisme';
  wb.created = new Date();

  // ─── Feuille 1 : quantités et coûts (à transmettre) ───
  // Par année : quantité commandable, prix unitaire livré, total livré (formule),
  // quantité initialement prévue pour l'USG et écart ; puis totaux et budget.
  const wo = wb.addWorksheet('Quantités et coûts', { views: [{ showGridLines: false }] });
  wo.columns = [{ width: 48 }, { width: 30 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 12 }];
  const NC = 7;
  const ot = wo.addRow(['MOU Niger — Quantités commandables et coûts livrés FY2027-FY2030']);
  ot.getCell(1).font = { ...FONT, bold: true };
  for (const txt of [
    `Scénario : ${scenario.name} — situation au ${fmtDay(today)}`,
    'Quantités commandables = quantités initialement prévues pour l\'USG, ajustées pour rester dans le budget disponible. Montants en dollars américains, livrés au Niger (produit + transport).',
  ]) { const r = wo.addRow([txt]); r.getCell(1).font = FONT; }
  wo.addRow([]);
  const totalRefs = [];
  const moneyRow = (label, value, { bold = false, sign = false, formula } = {}) => {
    const r = wo.addRow([label]);
    wo.mergeCells(r.number, 1, r.number, 4);
    r.getCell(1).font = { ...FONT, bold };
    r.getCell(1).alignment = { horizontal: 'right' };
    const c = r.getCell(5);
    c.value = formula ? { formula, result: value } : value;
    c.numFmt = MONEY;
    c.font = { ...FONT, bold, ...(sign ? { color: { argb: value >= 0 ? GREEN : RED } } : {}) };
    return r;
  };
  for (const y of FUTURE_YEARS) {
    const yr = sim.years[y];
    const title = wo.addRow([`FY${y} — Transport : ${MODE_PLAIN[yr.mode]} — Calcul : ${METHOD_PLAIN[yr.method]}`]);
    wo.mergeCells(title.number, 1, title.number, NC);
    title.getCell(1).font = { ...FONT, bold: true };
    const hdr = wo.addRow(['Produit', 'Unité d\'achat', 'Quantité commandable', 'Prix unitaire livré ($)', 'Total livré ($)', `Quantité initialement prévue pour l'USG (${y})`, 'Écart vs prévu']);
    hdr.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
    const first = wo.rowCount + 1;
    const lines = yr.lines.filter((l) => l.qty > 0 || l.need > 0);
    for (const l of lines) {
      const unitPrice = l.price * (1 + l.rate / 100);
      const hasNeed = l.need > 0;
      const r = wo.addRow([`${l.plain} (${l.name})`, l.unit, l.qty, unitPrice, null, hasNeed ? l.need : null, null]);
      const n = r.number;
      r.getCell(5).value = { formula: `C${n}*D${n}`, result: l.landed };
      if (hasNeed) r.getCell(7).value = { formula: `C${n}/F${n}-1`, result: l.coverage - 1 };
      r.eachCell({ includeEmpty: true }, (c) => (c.font = FONT));
      r.getCell(3).numFmt = QTY; r.getCell(4).numFmt = '"$"#,##0.0000'; r.getCell(5).numFmt = MONEY; r.getCell(6).numFmt = QTY; r.getCell(7).numFmt = GAP;
    }
    const last = wo.rowCount;
    const totalRow = moneyRow(`Total commandé FY${y}`, yr.total, { bold: true, formula: lines.length ? `SUM(E${first}:E${last})` : undefined });
    totalRefs.push(`E${totalRow.number}`);
    moneyRow('Budget MOU', yr.base);
    if (yr.bonus) moneyRow('Report reçu des années précédentes', yr.bonus);
    if (yr.reserve) moneyRow('Réserve assistance (AT, entreposage, distribution)', -yr.reserve);
    if (yr.accruals) moneyRow('Accruals', -yr.accruals);
    const avail = moneyRow('Budget disponible pour les produits', yr.available, { bold: true });
    moneyRow(yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget', yr.balance, { bold: true, sign: true, formula: `E${avail.number}-E${totalRow.number}` });
    wo.addRow([]);
  }
  moneyRow('Total commandé FY2027-FY2030', FUTURE_YEARS.reduce((t, y) => t + sim.years[y].total, 0), { bold: true, formula: totalRefs.join('+') });

  // ─── Feuille 2 : paramètres (hypothèses du scénario) ───
  const wp = wb.addWorksheet('Paramètres', { views: [{ showGridLines: false }] });
  wp.columns = [{ width: 44 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const h1 = wp.addRow(['Intrant', 'Catégorie', 'Prix EXW ($)', 'Coût livré bateau + route ($)', 'Coût livré avion ($)', 'Qté FY26']);
  h1.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const c of COMMODITIES) {
    const p = data.commodities[c.id];
    const row = wp.addRow([c.name, c.category, p.price, p.landedSea, c.isMilda ? null : p.landedAir, c.isMilda ? null : p.qty26]);
    row.getCell(3).numFmt = MONEY; row.getCell(4).numFmt = '"$"#,##0.0000'; row.getCell(5).numFmt = '"$"#,##0.0000'; row.getCell(6).numFmt = QTY;
    row.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
  }
  wp.addRow([]);
  const h2 = wp.addRow(['Exercice', 'Mode logistique', 'Budget initial ($)', 'Réserve assistance ($)', 'Accruals ($)', 'Report du solde', 'Méthode', ...MILDA.map((m) => `Qté ${m.name}`)]);
  h2.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const y of YEARS) {
    const row = wp.addRow([`FY${y}`, MODE_LABEL[data.logistics[y]], data.budgets[y], Number(data.reserves[y]) || 0,
      Number(data.yearAccruals[y]) || 0, CARRY_YEARS.includes(y) ? CARRY_LABEL[data.carryRules[y]] : '—',
      y === '2026' ? '—' : METHOD_LABEL[data.methods[y]],
      ...MILDA.map((m) => Number(data.manualQtys[y][m.id]) || 0)]);
    row.getCell(3).numFmt = MONEY; row.getCell(4).numFmt = MONEY; row.getCell(5).numFmt = MONEY; [8, 9, 10].forEach((i) => (row.getCell(i).numFmt = QTY));
    row.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
  }
  // Quantification PSN et quantités manuelles (FY27-FY30)
  for (const [label, key, years] of [['Quantification PSN', 'quantification', PSN_YEARS], ['Quantités manuelles', 'regularQtys', FUTURE_YEARS]]) {
    wp.addRow([]);
    const h = wp.addRow([label, ...years.map((y) => `${key === 'quantification' ? '' : 'FY'}${y}`)]);
    h.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
    for (const c of REGULAR) {
      const row = wp.addRow([c.name, ...years.map((y) => Number(data[key][y][c.id]) || 0)]);
      row.eachCell({ includeEmpty: true }, (cell, i) => { cell.font = FONT; if (i > 1) cell.numFmt = QTY; });
    }
  }
  wp.addRow([]);
  const acc = [];
  acc.push(
    ['Options — FY2026 dépensé', data.fy26Spending === 'unspent' ? 'Non' : 'Oui'],
    ['Options — Inclure les MILDA', data.includeMilda ? 'Oui' : 'Non'],
  );
  for (const [label, value, fmt] of acc) {
    const row = wp.addRow([label, value]);
    row.getCell(1).font = { ...FONT, bold: true };
    row.getCell(2).font = FONT;
    if (fmt) row.getCell(2).numFmt = fmt;
  }
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
      if (first === 'quantificationpsn' || first === 'quantificationniger' || first === 'quantitesmanuelles') {
        const key = first === 'quantitesmanuelles' ? 'regularQtys' : 'quantification';
        const years = key === 'quantification' ? PSN_YEARS : FUTURE_YEARS;
        const cols = years.map((y) => header.findIndex((h) => String(h ?? '').includes(y)));
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

// ─── Export / import Excel ──────────────────────────────────────────────────
// Export : ExcelJS (vrai .xlsx, ouverture sans avertissement sous Excel).
// Import : SheetJS. Les deux bibliothèques sont chargées à la demande.

import {
  CATEGORIES, COMMODITIES, FUTURE_YEARS, METHODS, METHOD_LABEL, MILDA, REGULAR, YEARS, byId,
  CARRYOVER_LABEL, PSN_YEARS, newAccrual, normalizeScenarioData, parseVal, simulate,
} from './model.js';
import { STATUS_LABEL, assessDelivery, fmtDay, fmtMonth } from './logistics.js';

const MODE_PLAIN = { air: 'Avion', sea: 'Bateau + route via Lomé' };
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const METHOD_PLAIN = { quantif: 'Automatique (split PSN)', manual: 'Ajusté manuellement' };

const FONT = { size: 11, name: 'Arial' };
const MONEY = '"$"#,##0.00';
const QTY = '#,##0';
const PCT = '0.00%'; // valeurs écrites en fraction (4,41 % -> 0.0441), relues par parseVal
const pct = (v) => (v === null || v === undefined ? null : (Number(v) || 0) / 100);
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000066' } };
const CATEGORY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
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

const styleRow = (row, from = 1, to = 5) => {
  for (let c = from; c <= to; c++) row.getCell(c).font = { ...FONT, ...(row.getCell(c).font || {}) };
};

const writeHeader = (ws, labels) => {
  const row = ws.addRow(labels);
  row.eachCell((cell) => {
    cell.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  return row;
};

const COLS = 7; // Intrant, Quantité, EXW, Fret, Landed, Besoin, Couverture

const writeCategory = (ws, label) => {
  const row = ws.addRow([label]);
  ws.mergeCells(row.number, 1, row.number, COLS);
  const cell = row.getCell(1);
  cell.font = { ...FONT, bold: true, italic: true };
  cell.fill = CATEGORY_FILL;
  return row;
};

const writeLine = (ws, l) => {
  const hasNeed = l.need !== undefined && l.need > 0;
  const row = ws.addRow([l.name, l.qty, l.exw, l.freight, l.landed, hasNeed ? l.need : null, hasNeed ? l.coverage : null]);
  row.getCell(2).numFmt = QTY;
  [3, 4, 5].forEach((c) => (row.getCell(c).numFmt = MONEY));
  row.getCell(6).numFmt = QTY;
  row.getCell(7).numFmt = '0.0%';
  styleRow(row, 1, COLS);
  return row;
};

const writeTotal = (ws, label, value, { bold = false, sign = false } = {}) => {
  const row = ws.addRow([label, null, null, null, value]);
  ws.mergeCells(row.number, 1, row.number, 4);
  row.getCell(1).font = { ...FONT, bold };
  row.getCell(1).alignment = { horizontal: 'right' };
  const v = row.getCell(5);
  v.numFmt = MONEY;
  v.font = { ...FONT, bold, ...(sign ? { color: { argb: value >= 0 ? GREEN : RED } } : {}) };
  return row;
};

/** Construit le classeur ExcelJS d'un scénario. */
export const buildWorkbook = async (scenario, today = new Date()) => {
  const ExcelJS = (await import('exceljs')).default;
  const data = normalizeScenarioData(scenario.data);
  const sim = simulate(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GHSC-PSM — Planificateur Intrants Paludisme';
  wb.created = new Date();

  // ─── Feuille 0 : quantités à commander (langage courant, à transmettre) ───
  const wo = wb.addWorksheet('Quantités à commander', { views: [{ showGridLines: false }] });
  wo.columns = [{ width: 46 }, { width: 40 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 13 }];
  const ot = wo.addRow(['MOU Niger — Quantités à commander FY2027-FY2030']);
  ot.getCell(1).font = { ...FONT, bold: true };
  for (const txt of [
    `Scénario : ${scenario.name} — situation au ${fmtDay(today)}`,
    `FY2026 (clos au 30/09/2026) : accruals ${Math.round(sim.years['2026'].accrualsLanded).toLocaleString('fr-FR')} $${data.fy26Spending === 'unspent' ? '' : ' + commandes FY26 saisies'} ; solde produits ${Math.round(sim.surplus).toLocaleString('fr-FR')} $ et solde assistance ${Math.round(sim.assistanceBalance).toLocaleString('fr-FR')} $, reportés ${lowerFirst(CARRYOVER_LABEL[sim.carryover])}.`,
    `Délais estimés de la commande à l'arrivée au Niger : avion ${data.leadTimes.air.min}-${data.leadTimes.air.max} mois ; bateau + route via Lomé (Togo - Burkina Faso - Niger, frontière Bénin fermée) ${data.leadTimes.sea.min}-${data.leadTimes.sea.max} mois. Hypothèses à confirmer avec GHSC-PSM.`,
  ]) { const r = wo.addRow([txt]); r.getCell(1).font = FONT; }
  wo.addRow([]);
  for (const y of FUTURE_YEARS) {
    const yr = sim.years[y];
    const a = assessDelivery({ year: y, mode: yr.mode, leadTimes: data.leadTimes, needMonth: data.needDates[y], today });
    const title = wo.addRow([`FY${y} — ${MODE_PLAIN[yr.mode]} — ${METHOD_PLAIN[yr.method]} — ${STATUS_LABEL[a.status]}`]);
    wo.mergeCells(title.number, 1, title.number, 6);
    title.getCell(1).font = { ...FONT, bold: true };
    const when = a.status === 'ok'
      ? `Produits attendus en ${fmtMonth(a.need)} : commander au plus tard le ${fmtDay(a.orderBy)}.`
      : `Commande passée aujourd'hui : arrivée estimée entre ${fmtMonth(a.arrivalMin)} et ${fmtMonth(a.arrivalMax)} (produits attendus en ${fmtMonth(a.need)}).`;
    const w = wo.addRow([when]);
    wo.mergeCells(w.number, 1, w.number, 6);
    w.getCell(1).font = FONT;
    const hdr = wo.addRow(['Produit', 'Usage', 'Quantité à commander', 'Coût estimé livré ($)', 'Quantification PSN', 'Couverture']);
    hdr.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
    for (const l of yr.lines) {
      const hasNeed = l.need > 0;
      const r = wo.addRow([`${l.plain} (${l.name})`, l.use, l.qty, l.landed, hasNeed ? l.need : null, hasNeed ? l.coverage : null]);
      r.eachCell({ includeEmpty: true }, (c) => (c.font = FONT));
      r.getCell(3).numFmt = QTY; r.getCell(4).numFmt = MONEY; r.getCell(5).numFmt = QTY; r.getCell(6).numFmt = '0%';
    }
    for (const [label, value, sign] of [
      ['Budget disponible pour les produits', yr.available],
      ['Total estimé (produits + transport)', yr.total],
      [yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget', yr.balance, true],
    ]) {
      const r = wo.addRow([label, null, null, value]);
      wo.mergeCells(r.number, 1, r.number, 3);
      r.getCell(1).font = { ...FONT, bold: true };
      r.getCell(1).alignment = { horizontal: 'right' };
      r.getCell(4).numFmt = MONEY;
      r.getCell(4).font = { ...FONT, bold: true, ...(sign ? { color: { argb: value >= 0 ? GREEN : RED } } : {}) };
    }
    wo.addRow([]);
  }

  // ─── Feuille 1 : simulation ───
  const ws = wb.addWorksheet('Simulation', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 44 }, { width: 16 }, { width: 20 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 13 }];
  const t = ws.addRow(['Planificateur Budgétaire Intrants Paludisme FY26-FY30']);
  t.getCell(1).font = { ...FONT, bold: true };
  const s = ws.addRow([`Scénario : ${scenario.name}`]);
  s.getCell(1).font = FONT;
  const g = ws.addRow(['GHSC-PSM — MOU Niger']);
  g.getCell(1).font = FONT;
  ws.addRow([]);

  for (const y of YEARS) {
    const yr = sim.years[y];
    const method = y === '2026' ? 'Quantités FY26 saisies' : `${METHOD_LABEL[yr.method]}`;
    const title = ws.addRow([`FY ${y} — Logistique : ${MODE_LABEL[yr.mode]} — Méthode : ${method}`]);
    ws.mergeCells(title.number, 1, title.number, COLS);
    title.getCell(1).font = { ...FONT, bold: true };
    writeHeader(ws, ['Intrant', 'Quantité', 'Total EXW', 'Fret', 'Total Landed', 'Quantification (besoin)', 'Couverture']);
    for (const cat of CATEGORIES) {
      const lines = yr.lines.filter((l) => l.category === cat);
      if (!lines.length) continue;
      writeCategory(ws, cat);
      lines.forEach((l) => writeLine(ws, l));
    }
    writeTotal(ws, 'Budget de base', yr.base);
    if (yr.reserve) writeTotal(ws, 'Réserve assistance (AT, entreposage, distribution)', -yr.reserve);
    if (y !== '2026') writeTotal(ws, `Report du solde produits FY2026 (${lowerFirst(CARRYOVER_LABEL[sim.carryover])})`, yr.bonus);
    writeTotal(ws, 'Budget disponible pour les intrants', yr.available, { bold: true });
    if (yr.needLanded) writeTotal(ws, 'Coût landed de la quantification (pour mémoire)', yr.needLanded);
    writeTotal(ws, 'Total dépenses', yr.total, { bold: true });
    writeTotal(ws, 'Solde final (reste)', yr.balance, { bold: true, sign: true });
    if (y === '2026') writeTotal(ws, `Solde assistance FY2026 (réserve − assistance engagée ${Math.round(yr.assistanceSpent).toLocaleString('fr-FR')} $), reporté`, yr.assistanceBalance);
    else if (yr.assistCarry || yr.reserve) writeTotal(ws, 'Pour mémoire : assistance disponible (réserve + report du solde assistance FY2026)', yr.assistance);
    ws.addRow([]);
  }

  // ─── Feuille 2 : paramètres (relisible par l'import, Option B) ───
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
  const h2 = wp.addRow(['Exercice', 'Mode logistique', 'Budget initial ($)', 'Réserve assistance ($)', 'Méthode', ...MILDA.map((m) => `Qté ${m.name}`)]);
  h2.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const y of YEARS) {
    const row = wp.addRow([`FY${y}`, MODE_LABEL[data.logistics[y]], data.budgets[y], Number(data.reserves[y]) || 0,
      y === '2026' ? '—' : METHOD_LABEL[data.methods[y]],
      ...MILDA.map((m) => Number(data.manualQtys[y][m.id]) || 0)]);
    row.getCell(3).numFmt = MONEY; row.getCell(4).numFmt = MONEY; [6, 7, 8].forEach((i) => (row.getCell(i).numFmt = QTY));
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
  // Accruals (engagements) au 30/09/2026 : une ligne par engagement
  wp.addRow([]);
  const ha = wp.addRow(['Accruals au 30/09/2026', 'Références', 'Montant EXW ($)', 'Taux fret aérien (%)']);
  ha.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const a of data.accruals.items) {
    const row = wp.addRow([a.desc || 'Accruals', a.refs || '', a.amount, pct(a.freightPct)]);
    row.eachCell({ includeEmpty: true }, (c) => (c.font = FONT));
    row.getCell(3).numFmt = MONEY; row.getCell(4).numFmt = PCT;
  }
  wp.addRow([]);
  const acc = [];
  acc.push(
    ['Options — FY2026 dépensé', data.fy26Spending === 'unspent' ? 'Non' : 'Oui'],
    ['Options — Report du surplus FY2026', CARRYOVER_LABEL[data.carryover]],
    ['Options — Assistance engagée au 30/09/2026 ($)', data.fy26AssistanceSpent, MONEY],
    ['Délais — Avion min (mois)', data.leadTimes.air.min],
    ['Délais — Avion max (mois)', data.leadTimes.air.max],
    ['Délais — Bateau min (mois)', data.leadTimes.sea.min],
    ['Délais — Bateau max (mois)', data.leadTimes.sea.max],
    ...FUTURE_YEARS.map((y) => [`Délais — Produits attendus FY${y} (AAAA-MM)`, data.needDates[y]]),
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
 * en-tête « Intrant », celui des exercices par « Exercice », et les lignes Accruals.
 * Renvoie { data, found } où found compte les intrants reconnus.
 */
export const parseWorkbookRows = (sheets, base) => {
  const data = normalizeScenarioData(base);
  let found = 0;
  let legacyAcc = null;
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
        const cMilda = MILDA.map((m) => header.findIndex((h) => norm(h).includes(norm(m.name))));
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const y = String(r[0] ?? '').match(/20(2[6-9]|30)/)?.[0];
          if (!y) break;
          if (cMode >= 0 && r[cMode]) data.logistics[y] = /air/i.test(String(r[cMode])) ? 'air' : 'sea';
          if (cBudget >= 0 && r[cBudget] !== undefined && r[cBudget] !== null && r[cBudget] !== '') data.budgets[y] = parseVal(r[cBudget]);
          if (cReserve >= 0 && r[cReserve] !== undefined && r[cReserve] !== null && r[cReserve] !== '') data.reserves[y] = parseVal(r[cReserve]);
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
        if (first.includes('assistance')) data.fy26AssistanceSpent = parseVal(header[1]);
        else if (first.includes('report')) data.carryover = v.includes('lisse') || v.endsWith('4') ? 'smooth' : 'fy27';
        else if (first.includes('depense')) data.fy26Spending = v === 'non' ? 'unspent' : 'planned';
      }
      if (first.startsWith('delais')) {
        const mode = first.includes('avion') ? 'air' : first.includes('bateau') ? 'sea' : null;
        const y = String(header[0]).match(/FY(20(2[7-9]|30))/)?.[1];
        if (mode && /min/.test(first)) data.leadTimes[mode].min = parseVal(header[1]);
        else if (mode && /max/.test(first)) data.leadTimes[mode].max = parseVal(header[1]);
        else if (y && /^\d{4}-\d{2}/.test(String(header[1] ?? ''))) data.needDates[y] = String(header[1]).slice(0, 7);
      }
      // Tableau des accruals au 30/09/2026 (une ligne par engagement, jusqu'à la ligne vide)
      if (first === 'accrualsau30092026') {
        const items = [];
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          if (r.every((v) => v === null || v === undefined || v === '')) break;
          items.push({ ...newAccrual(String(r[0] ?? ''), parseVal(r[2])), refs: String(r[1] ?? ''), freightPct: parseVal(r[3], true) });
        }
        data.accruals = { items };
      } else if (first.startsWith('accruals')) {
        // Ancien format : une seule ligne « Accruals — Intitulé / Références / Montant / Taux »
        const v = header[1];
        if (!legacyAcc) { legacyAcc = newAccrual(); data.accruals = { items: [legacyAcc] }; }
        if (first.includes('intitule')) legacyAcc.desc = String(v ?? '');
        else if (first.includes('reference')) legacyAcc.refs = String(v ?? '');
        else if (first.includes('montant')) legacyAcc.amount = parseVal(v);
        else if (first.includes('fret') || first.includes('taux')) legacyAcc.freightPct = parseVal(v, true);
      }
    }
  }
  return { data, found };
};

/** Lit un fichier .xlsx/.xls (ArrayBuffer) et renvoie { data, found }. */
export const importWorkbook = async (arrayBuffer, base) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  // Feuille « Paramètres » (export de l'application) seule si présente, sinon toutes.
  const params = wb.SheetNames.filter((n) => norm(n) === 'parametres');
  const names = params.length ? params : wb.SheetNames;
  const sheets = names.map((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }));
  return parseWorkbookRows(sheets, base);
};

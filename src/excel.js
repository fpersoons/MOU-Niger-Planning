// ─── Export / import Excel ──────────────────────────────────────────────────
// Export : ExcelJS (vrai .xlsx, ouverture sans avertissement sous Excel).
// Import : SheetJS. Les deux bibliothèques sont chargées à la demande.

import {
  CATEGORIES, COMMODITIES, MILDA, YEARS, byId, normalizeScenarioData, parseVal, simulate,
} from './model.js';

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

const writeCategory = (ws, label) => {
  const row = ws.addRow([label]);
  ws.mergeCells(row.number, 1, row.number, 5);
  const cell = row.getCell(1);
  cell.font = { ...FONT, bold: true, italic: true };
  cell.fill = CATEGORY_FILL;
  return row;
};

const writeLine = (ws, l) => {
  const row = ws.addRow([l.name, l.qty, l.exw, l.freight, l.landed]);
  row.getCell(2).numFmt = QTY;
  [3, 4, 5].forEach((c) => (row.getCell(c).numFmt = MONEY));
  styleRow(row);
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
export const buildWorkbook = async (scenario) => {
  const ExcelJS = (await import('exceljs')).default;
  const data = normalizeScenarioData(scenario.data);
  const sim = simulate(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GHSC-PSM — Planificateur Intrants Paludisme';
  wb.created = new Date();

  // ─── Feuille 1 : simulation ───
  const ws = wb.addWorksheet('Simulation', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 44 }, { width: 16 }, { width: 20 }, { width: 20 }, { width: 22 }];
  const t = ws.addRow(['Planificateur Budgétaire Intrants Paludisme FY26-FY30']);
  t.getCell(1).font = { ...FONT, bold: true };
  const s = ws.addRow([`Scénario : ${scenario.name}`]);
  s.getCell(1).font = FONT;
  const g = ws.addRow(['GHSC-PSM — U.S. Department of State | Bureau of Global Health Security and Diplomacy (GHSD)']);
  g.getCell(1).font = FONT;
  ws.addRow([]);

  for (const y of YEARS) {
    const yr = sim.years[y];
    const title = ws.addRow([`FY ${y} — Logistique : ${MODE_LABEL[yr.mode]}`]);
    ws.mergeCells(title.number, 1, title.number, 5);
    title.getCell(1).font = { ...FONT, bold: true };
    writeHeader(ws, ['Intrant', 'Quantité', 'Total EXW', 'Fret', 'Total Landed']);
    for (const cat of CATEGORIES) {
      const lines = yr.lines.filter((l) => l.category === cat);
      if (!lines.length) continue;
      writeCategory(ws, cat);
      lines.forEach((l) => writeLine(ws, l));
    }
    writeTotal(ws, 'Budget de base', yr.base);
    if (y !== '2026') writeTotal(ws, 'Report annuel lissé (Surplus FY26 / 4)', yr.bonus);
    writeTotal(ws, 'Budget disponible total', yr.available, { bold: true });
    writeTotal(ws, 'Total dépenses', yr.total, { bold: true });
    writeTotal(ws, 'Solde final (reste)', yr.balance, { bold: true, sign: true });
    ws.addRow([]);
  }

  // ─── Feuille 2 : paramètres (relisible par l'import, Option B) ───
  const wp = wb.addWorksheet('Paramètres', { views: [{ showGridLines: false }] });
  wp.columns = [{ width: 44 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const h1 = wp.addRow(['Intrant', 'Catégorie', 'Split FY25 (%)', 'Prix EXW ($)', 'Fret Air (%)', 'Fret Mer (%)', 'Qté FY26']);
  h1.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const c of COMMODITIES) {
    const p = data.commodities[c.id];
    const row = wp.addRow([c.name, c.category, c.isMilda ? null : pct(p.split), p.price, c.isMilda ? null : pct(p.air), pct(p.sea), c.isMilda ? null : p.qty26]);
    row.getCell(3).numFmt = PCT; row.getCell(4).numFmt = MONEY; row.getCell(5).numFmt = PCT; row.getCell(6).numFmt = PCT; row.getCell(7).numFmt = QTY;
    row.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
  }
  wp.addRow([]);
  const h2 = wp.addRow(['Exercice', 'Mode logistique', 'Budget initial ($)', ...MILDA.map((m) => `Qté ${m.name}`)]);
  h2.eachCell((c) => { c.font = { ...FONT, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HEADER_FILL; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const y of YEARS) {
    const row = wp.addRow([`FY${y}`, MODE_LABEL[data.logistics[y]], data.budgets[y], ...MILDA.map((m) => Number(data.manualQtys[y][m.id]) || 0)]);
    row.getCell(3).numFmt = MONEY; [4, 5, 6].forEach((i) => (row.getCell(i).numFmt = QTY));
    row.eachCell({ includeEmpty: true }, (cell) => (cell.font = FONT));
  }
  wp.addRow([]);
  const acc = [
    ['Accruals — Intitulé', data.accruals.desc],
    ['Accruals — Références', data.accruals.refs],
    ['Accruals — Montant EXW ($)', data.accruals.amount, MONEY],
    ['Accruals — Taux fret aérien (%)', pct(data.accruals.freightPct), PCT],
  ];
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
  for (const rows of sheets) {
    for (let i = 0; i < rows.length; i++) {
      const header = rows[i] || [];
      const first = norm(header[0]);
      // Tableau des intrants
      if (header.some((h) => ['intrant', 'commodity', 'produit', 'item'].includes(norm(h)))) {
        const cName = header.findIndex((h) => ['intrant', 'commodity', 'produit', 'item'].includes(norm(h)));
        const cSplit = findCol(header, [(h) => h.includes('split')]);
        const cPrice = findCol(header, [(h) => h.includes('prix'), (h) => h.includes('price'), (h) => h === 'exw' || h.startsWith('exw')]);
        const cAir = findCol(header, [(h) => h.includes('air')]);
        const cSea = findCol(header, [(h) => h.includes('mer'), (h) => h.includes('sea')]);
        const cQty = findCol(header, [(h) => h.includes('qte'), (h) => h.includes('qty'), (h) => h.includes('quantite')]);
        if (cSplit < 0 && cPrice < 0) continue; // ex. tableaux de simulation : ignorés
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const id = NAME_INDEX[norm(r[cName])];
          if (!id) { if (!r.length || r.every((v) => v === null || v === undefined || v === '')) break; continue; }
          const p = data.commodities[id];
          const c = byId[id];
          if (cSplit >= 0 && !c.isMilda && r[cSplit] !== undefined && r[cSplit] !== null) p.split = parseVal(r[cSplit], true);
          if (cPrice >= 0 && r[cPrice] !== undefined && r[cPrice] !== null) p.price = parseVal(r[cPrice]);
          if (cAir >= 0 && !c.isMilda && r[cAir] !== undefined && r[cAir] !== null) p.air = parseVal(r[cAir], true);
          if (cSea >= 0 && r[cSea] !== undefined && r[cSea] !== null) p.sea = parseVal(r[cSea], true);
          if (cQty >= 0 && !c.isMilda && r[cQty] !== undefined && r[cQty] !== null) p.qty26 = parseVal(r[cQty]);
          found++;
        }
      }
      // Tableau des exercices
      if (first === 'exercice' || first === 'fiscalyear' || first === 'year') {
        const cMode = findCol(header, [(h) => h.includes('logist') || h.includes('mode')]);
        const cBudget = findCol(header, [(h) => h.includes('budget')]);
        const cMilda = MILDA.map((m) => header.findIndex((h) => norm(h).includes(norm(m.name))));
        for (let j = i + 1; j < rows.length; j++) {
          const r = rows[j] || [];
          const y = String(r[0] ?? '').match(/20(2[6-9]|30)/)?.[0];
          if (!y) break;
          if (cMode >= 0 && r[cMode]) data.logistics[y] = /air/i.test(String(r[cMode])) ? 'air' : 'sea';
          if (cBudget >= 0 && r[cBudget] !== undefined && r[cBudget] !== null && r[cBudget] !== '') data.budgets[y] = parseVal(r[cBudget]);
          MILDA.forEach((m, k) => { if (cMilda[k] >= 0) data.manualQtys[y][m.id] = Math.max(0, Math.floor(parseVal(r[cMilda[k]]))); });
        }
      }
      // Lignes Accruals
      if (first.startsWith('accruals')) {
        const v = header[1];
        if (first.includes('intitule')) data.accruals.desc = String(v ?? '');
        else if (first.includes('reference')) data.accruals.refs = String(v ?? '');
        else if (first.includes('montant')) data.accruals.amount = parseVal(v);
        else if (first.includes('fret') || first.includes('taux')) data.accruals.freightPct = parseVal(v, true);
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

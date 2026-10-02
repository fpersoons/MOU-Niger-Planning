// ─── Vérification des formules de l'export Excel ─────────────────────────────
// Construit l'export de plusieurs scénarios, recalcule toutes les formules avec
// HyperFormula (moteur de tableur, outil de développement uniquement) et compare
// chaque résultat à la valeur calculée par l'application (simulate).
// Vérifie aussi qu'une modification de la feuille « Paramètres » donne dans Excel
// le même résultat que la même modification dans l'application.
//
//   npm run verify:excel        → « 0 écart » attendu pour chaque scénario
//
// À lancer après toute modification de src/model.js ou src/excel.js.

import { createRequire } from 'node:module';
import { buildWorkbook } from '../src/excel.js';
import { CARRY_LABEL, METHOD_LABEL, REGULAR, defaultScenarioData, normalizeScenarioData } from '../src/model.js';

const require = createRequire(import.meta.url);
const { HyperFormula } = require('hyperformula');

const withPsn = (d) => {
  for (const y of ['2027', '2028', '2029', '2030', '2031']) for (const c of REGULAR) d.quantification[y][c.id] = 50000 * c.id + 1234 * Number(y.slice(3));
  return d;
};

const scenarios = {};
scenarios['défaut'] = defaultScenarioData();
scenarios['PSN complet'] = withPsn(defaultScenarioData());
{
  const d = withPsn(defaultScenarioData());
  d.carryRules = { 2026: 'smooth', 2027: 'next', 2028: 'smooth', 2029: 'none' };
  d.methods['2028'] = 'manual';
  for (const c of REGULAR) d.regularQtys['2028'][c.id] = 100000 * c.id;
  d.yearAccruals['2027'] = 250000; d.logistics['2029'] = 'air';
  d.includeMilda = true; d.manualQtys['2028'][11] = 20000; d.manualQtys['2030'][12] = 5000;
  scenarios['mixte (manuel, lissé, MILDA, avion)'] = d;
}
{ const d = withPsn(defaultScenarioData()); d.budgets['2027'] = 0; d.carryRules['2026'] = 'none'; scenarios['dépassement'] = d; }
scenarios['ancien format'] = withPsn(normalizeScenarioData({ budgets: { 2026: 10000000 }, commodities: { 1: { price: 10, air: 50, sea: 20, qty26: 5000 } } }));

/** Feuilles du classeur en tableaux (formules préfixées par « = ») et résultats en cache. */
const load = (wb) => {
  const sheets = {}; const cached = [];
  wb.eachSheet((ws) => {
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const arr = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        let v = cell.value;
        if (cell.formula) { cached.push([ws.name, r - 1, c - 1, cell.result]); v = `=${cell.formula}`; }
        else if (v && typeof v === 'object') v = null;
        arr[c - 1] = v ?? null;
      });
      rows[r - 1] = arr;
    });
    sheets[ws.name] = Array.from(rows, (x) => x || []);
  });
  return { sheets, cached };
};

let failures = 0;
const compare = (hf, cached, label) => {
  let bad = 0;
  for (const [sheet, r, c, expected] of cached) {
    const got = hf.getCellValue({ sheet: hf.getSheetId(sheet), row: r, col: c });
    const ok = typeof expected === 'number'
      ? typeof got === 'number' && Math.abs(got - expected) <= Math.max(0.01, Math.abs(expected) * 1e-9)
      : String(got ?? '') === String(expected ?? '');
    if (!ok) { bad++; if (bad <= 5) console.log(`  ${sheet} L${r + 1}C${c + 1} : attendu ${expected}, obtenu ${JSON.stringify(got)}`); }
  }
  console.log(`${bad ? '✗' : '✓'} ${label} : ${cached.length} formules, ${bad} écart(s)`);
  failures += bad;
};

for (const [name, data] of Object.entries(scenarios)) {
  const wb = await buildWorkbook({ name, data });
  const { sheets, cached } = load(wb);
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3', useArrayArithmetic: true });
  compare(hf, cached, name);

  if (name.startsWith('mixte')) {
    // Mêmes modifications dans « Paramètres » (Excel) et dans les données (application).
    const d2 = JSON.parse(JSON.stringify(data));
    d2.budgets['2028'] = 9000000; d2.logistics['2027'] = 'sea'; d2.carryRules['2026'] = 'next';
    d2.methods['2028'] = 'quantif'; d2.commodities[4].landedSea = 12.5; d2.quantification['2029'][3] = 7;
    const p = hf.getSheetId('Paramètres');
    const rows = sheets['Paramètres'];
    const rowOf = (pred, from = 0) => rows.findIndex((row, i) => i >= from && pred(row));
    const yr = (y) => rowOf((row) => row[0] === `FY${y}`);
    hf.setCellContents({ sheet: p, row: yr('2028'), col: 2 }, 9000000);
    hf.setCellContents({ sheet: p, row: yr('2027'), col: 1 }, 'Mer');
    hf.setCellContents({ sheet: p, row: yr('2026'), col: 5 }, CARRY_LABEL.next);
    hf.setCellContents({ sheet: p, row: yr('2028'), col: 6 }, METHOD_LABEL.quantif);
    hf.setCellContents({ sheet: p, row: rowOf((row) => row[0] === REGULAR.find((c) => c.id === 4).name), col: 3 }, 12.5);
    const psnHeader = rowOf((row) => String(row[0] ?? '').startsWith('Quantification PSN'));
    hf.setCellContents({ sheet: p, row: rowOf((row) => row[0] === REGULAR.find((c) => c.id === 3).name, psnHeader), col: 3 }, 7);
    const { cached: expected } = load(await buildWorkbook({ name, data: d2 }));
    compare(hf, expected, `${name}, après modification de « Paramètres »`);
  }
}

if (failures) { console.error(`\n${failures} écart(s) : les formules Excel ne reproduisent pas l'application.`); process.exit(1); }
console.log('\nFormules Excel conformes à l’application.');

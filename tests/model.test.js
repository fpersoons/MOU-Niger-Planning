// Tests du moteur de calcul et de l'aller-retour Excel : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { defaultScenarioData, simulate, parseVal, splitStatus, REGULAR, MILDA, zeroedScenarioData, normalizeScenarioData, quantitiesFor } from '../src/model.js';
import { buildWorkbook, parseWorkbookRows, exportFileName } from '../src/excel.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('parseVal respecte l’heuristique du cahier des charges', () => {
  assert.equal(parseVal(0.6141, true).toFixed(2), '61.41');
  assert.equal(parseVal(1.74, true), 174);
  assert.equal(parseVal(50, true), 50);
  assert.equal(parseVal('174%', true), 174);
  assert.equal(parseVal('174,00%', true), 174);
  assert.equal(parseVal('$13.79'), 13.79);
  assert.equal(parseVal(''), 0);
  assert.equal(parseVal('0,5', true), 50);
});

test('split FY25 par défaut = 100 %', () => {
  const s = splitStatus(defaultScenarioData().commodities);
  assert.ok(s.ok, String(s.total));
});

test('FY26 : dépenses, surplus et report lissé', () => {
  const d = defaultScenarioData();
  const sim = simulate(d);
  let expected = 0;
  for (const c of REGULAR) {
    const p = d.commodities[c.id];
    expected += p.qty26 * p.price * (1 + p.air / 100);
  }
  expected += 1106690;
  close(sim.years['2026'].total, expected);
  close(sim.surplus, 13321800 - expected);
  close(sim.bonus, sim.surplus / 4);
  assert.ok(!sim.years['2026'].lines.some((l) => l.isMilda), 'MILDA masquées en mode Air');
});

test('FY27-30 : saturation du budget résiduel sans dépassement, split sur base EXW', () => {
  const d = defaultScenarioData();
  d.manualQtys['2028'][11] = 100000;
  const sim = simulate(d);
  for (const y of ['2027', '2028', '2029', '2030']) {
    const yr = sim.years[y];
    close(yr.available, d.budgets[y] + sim.bonus);
    assert.ok(yr.balance >= 0, `solde ${y} négatif`);
    // Le reliquat est inférieur au coût landed d'une unité de chaque intrant.
    const slack = REGULAR.reduce((s, c) => { const p = d.commodities[c.id]; return s + p.price * (1 + (yr.mode === 'air' ? p.air : p.sea) / 100); }, 0);
    assert.ok(yr.balance < slack, `${y} : budget non saturé (${yr.balance})`);
    // Parts EXW proches des poids normalisés
    const exw = yr.lines.filter((l) => !l.isMilda).reduce((s, l) => s + l.exw, 0);
    const sp3 = yr.lines.find((l) => l.id === 3);
    close(sp3.exw / exw, 33.21 / 100, 1e-4);
  }
  close(sim.years['2028'].mildaCost, 100000 * 2 * 1.5);
  assert.equal(sim.years['2027'].lines.filter((l) => l.isMilda).length, 0);
  assert.equal(sim.years['2028'].lines.filter((l) => l.isMilda).length, MILDA.length);
});

test('remise à zéro : aucune dépense', () => {
  const sim = simulate(zeroedScenarioData(defaultScenarioData()));
  assert.equal(sim.years['2026'].total, 0);
  assert.equal(sim.years['2030'].total, 0);
});

test('nom de fichier export au format américain', () => {
  assert.equal(exportFileName('', new Date(2026, 9, 2)), 'GHSC-PSM_Budget_Prospective_10_02_26.xlsx');
  assert.equal(exportFileName('Scénario Mer', new Date(2026, 0, 5)), 'GHSC-PSM_Budget_Prospective_01_05_26_Scenario-Mer.xlsx');
});

test('aller-retour Excel : export ExcelJS puis import SheetJS', async () => {
  const d = defaultScenarioData();
  d.commodities[10].air = 174;
  d.logistics['2027'] = 'sea';
  d.manualQtys['2027'][12] = 4321;
  d.budgets['2029'] = 8000000;
  d.accruals.freightPct = 2.35;
  d.accruals.desc = 'Test accruals';
  d.reserves['2028'] = 1600000;
  d.methods['2028'] = 'quantif';
  d.methods['2030'] = 'manual';
  d.quantification['2028'][3] = 150000;
  d.regularQtys['2030'][9] = 777;
  const wb = await buildWorkbook({ name: 'Test', data: d });
  const buf = await wb.xlsx.writeBuffer();
  const x = XLSX.read(buf, { type: 'buffer' });
  assert.deepEqual(x.SheetNames, ['Simulation', 'Paramètres']);
  const rows = XLSX.utils.sheet_to_json(x.Sheets['Paramètres'], { header: 1, raw: true, defval: null });
  const { data, found } = parseWorkbookRows([rows], zeroedScenarioData(defaultScenarioData()));
  assert.equal(found, 13);
  for (const c of [...REGULAR, ...MILDA]) {
    for (const k of ['price', 'sea']) close(data.commodities[c.id][k], d.commodities[c.id][k]);
    if (!c.isMilda) for (const k of ['split', 'air', 'qty26']) close(data.commodities[c.id][k], d.commodities[c.id][k]);
  }
  assert.deepEqual(data.logistics, d.logistics);
  assert.equal(data.budgets['2029'], 8000000);
  assert.equal(data.manualQtys['2027'][12], 4321);
  close(data.accruals.freightPct, 2.35);
  assert.equal(data.accruals.desc, 'Test accruals');
  close(data.accruals.amount, 1106690);
  assert.equal(data.reserves['2028'], 1600000);
  assert.deepEqual(data.methods, d.methods);
  assert.equal(data.quantification['2028'][3], 150000);
  assert.equal(data.regularQtys['2030'][9], 777);
});

test('réserve d’assistance déduite du budget intrants', () => {
  const d = defaultScenarioData();
  const ref = simulate(d);
  d.reserves['2026'] = 100000;
  d.reserves['2027'] = 1600000;
  const sim = simulate(d);
  close(sim.surplus, ref.surplus - 100000);
  close(sim.years['2027'].available, d.budgets['2027'] - 1600000 + sim.bonus);
  assert.ok(sim.years['2027'].total < ref.years['2027'].total);
  assert.ok(sim.years['2027'].balance >= 0);
});

const withQuantif = (scale) => {
  const d = defaultScenarioData();
  for (const c of REGULAR) d.quantification['2027'][c.id] = Math.round(d.commodities[c.id].qty26 * scale) || 1000 * scale;
  d.methods['2027'] = 'quantif';
  return d;
};

test('split quantification : budget insuffisant → réduction proportionnelle sans dépassement', () => {
  const d = withQuantif(10);
  const yr = simulate(d).years['2027'];
  assert.ok(yr.balance >= 0);
  const cov = yr.lines.filter((l) => !l.isMilda && l.need > 0).map((l) => l.coverage);
  assert.ok(Math.max(...cov) < 1);
  assert.ok(Math.max(...cov) - Math.min(...cov) < 0.01, 'couverture uniforme');
});

test('split quantification : budget suffisant → plafonné aux besoins', () => {
  const d = withQuantif(0.1);
  const yr = simulate(d).years['2027'];
  for (const l of yr.lines.filter((x) => !x.isMilda)) assert.ok(l.qty <= l.need, `${l.name} dépasse le besoin`);
  assert.ok(yr.lines.filter((x) => !x.isMilda && x.need > 0).every((l) => l.need - l.qty <= 1));
  assert.ok(yr.balance > 0);
});

test('quantités manuelles : saisies telles quelles, solde éventuellement négatif', () => {
  const d = defaultScenarioData();
  d.methods['2029'] = 'manual';
  d.regularQtys['2029'][9] = 50000000;
  const yr = simulate(d).years['2029'];
  assert.equal(yr.lines.find((l) => l.id === 9).qty, 50000000);
  assert.equal(yr.lines.find((l) => l.id === 1).qty, 0);
  assert.ok(yr.balance < 0);
  // pré-remplissage « ajuster au budget » = méthode quantif sur le même budget résiduel
  const q = quantitiesFor(d, '2029', 'split', yr.residual).qtys;
  assert.ok(q[3] > 0);
});

test('anciens scénarios (sans réserve ni méthode) complétés par défaut', () => {
  const old = defaultScenarioData();
  delete old.reserves; delete old.methods; delete old.quantification; delete old.regularQtys;
  const n = normalizeScenarioData(old);
  assert.equal(n.reserves['2027'], 0);
  assert.equal(n.methods['2027'], 'split');
  assert.equal(n.quantification['2030'][1], 0);
});

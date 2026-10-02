// Tests du moteur de calcul et de l'aller-retour Excel : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  defaultScenarioData, simulate, parseVal, freightRate, psnSplit, REGULAR, MILDA, zeroedScenarioData,
  normalizeScenarioData, quantitiesFor,
} from '../src/model.js';
import { buildWorkbook, parseWorkbookRows, exportFileName } from '../src/excel.js';
import { fiscalYear } from '../src/logistics.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
// Pas de report après FY2026 : isole l'effet du solde FY2026.
const noLaterCarry = (d, rule26 = 'next') => ({ ...d, carryRules: { 2026: rule26, 2027: 'none', 2028: 'none', 2029: 'none' } });
const withPsn = (d, years = ['2027', '2028', '2029', '2030'], f = (c) => 1000 * c.id) => {
  for (const y of years) for (const c of REGULAR) d.quantification[y][c.id] = f(c);
  return d;
};

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

test('FY2026 : solde = budget − accruals, reporté sur l’année suivante (défaut)', () => {
  const d = defaultScenarioData();
  assert.equal(d.carryRules['2026'], 'next');
  const sim = simulate(noLaterCarry(d));
  close(sim.surplus, 13321800 - 1106690);
  close(sim.years['2027'].bonus, sim.surplus);
  close(sim.years['2027'].available, d.budgets['2027'] + sim.surplus);
  close(sim.years['2028'].available, d.budgets['2028']);
  // la réserve FY2026 n'est pas déduite : seule compte la part engagée (accruals)
  d.reserves['2026'] = 1600000;
  close(simulate(noLaterCarry(d)).surplus, 13321800 - 1106690);
});

test('FY2026 lissé : solde ÷ 4 sur FY2027-FY2030', () => {
  const sim = simulate(noLaterCarry(defaultScenarioData(), 'smooth'));
  for (const y of ['2027', '2028', '2029', '2030']) close(sim.years[y].bonus, sim.surplus / 4);
});

test('FY26 avec commandes saisies (anciens scénarios) : solde = budget − accruals − commandes', () => {
  const d = noLaterCarry({ ...defaultScenarioData(), fy26Spending: 'planned' });
  const orders = REGULAR.reduce((s, c) => s + d.commodities[c.id].qty26 * d.commodities[c.id].landedAir, 0);
  const sim = simulate(d);
  close(sim.years['2026'].total, orders);
  close(sim.surplus, 13321800 - 1106690 - orders);
  assert.ok(!sim.years['2026'].lines.some((l) => l.isMilda), 'MILDA masquées en mode Air');
});

test('report par année : solde FY2027 vers l’année suivante, ou lissé sur les suivantes', () => {
  const d = withPsn(defaultScenarioData());
  d.methods['2027'] = 'manual'; // rien commandé en FY2027 : tout le budget est un solde
  let sim = simulate(d);
  const s27 = sim.years['2027'].balance;
  close(sim.years['2027'].carryOut, s27);
  close(sim.years['2028'].bonus, s27);
  d.carryRules['2027'] = 'smooth';
  sim = simulate(d);
  for (const y of ['2028', '2029', '2030']) assert.ok(sim.years[y].bonus >= s27 / 3 - 1e-6);
  d.carryRules['2027'] = 'none';
  sim = simulate(d);
  close(sim.years['2027'].carryOut, 0);
});

test('accruals et réserve des années suivantes déduits du budget produits', () => {
  const d = noLaterCarry(defaultScenarioData());
  d.reserves['2028'] = 1600000;
  d.yearAccruals['2028'] = 400000;
  close(simulate(d).years['2028'].available, d.budgets['2028'] - 1600000 - 400000);
  close(simulate(d).years['2028'].assistance, 1600000);
});

test('FY27-30 : split PSN — budget saturé sans dépassement, split sur base EXW', () => {
  const d = noLaterCarry(withPsn(defaultScenarioData()), 'smooth');
  d.manualQtys['2028'][11] = 100000;
  const sim = simulate(d);
  for (const y of ['2027', '2028', '2029', '2030']) {
    const yr = sim.years[y];
    close(yr.available, d.budgets[y] + sim.surplus / 4);
    assert.ok(yr.balance >= 0, `solde ${y} négatif`);
    const slack = REGULAR.reduce((s, c) => { const p = d.commodities[c.id]; return s + (yr.mode === 'air' ? p.landedAir : p.landedSea); }, 0);
    assert.ok(yr.balance < slack, `${y} : budget non saturé (${yr.balance})`);
    const exw = yr.lines.filter((l) => !l.isMilda).reduce((s, l) => s + l.exw, 0);
    const tot = REGULAR.reduce((s, c) => s + 1000 * c.id * d.commodities[c.id].price, 0);
    close(yr.lines.find((l) => l.id === 3).exw / exw, (3000 * d.commodities[3].price) / tot, 1e-4);
  }
  close(sim.years['2028'].mildaCost, 100000 * d.commodities[11].landedSea);
  assert.equal(sim.years['2027'].lines.filter((l) => l.isMilda).length, 0);
  assert.equal(sim.years['2028'].lines.filter((l) => l.isMilda).length, MILDA.length);
});

test('PSN non saisi : aucune quantité calculée', () => {
  const yr = simulate(defaultScenarioData()).years['2027'];
  assert.equal(yr.method, 'quantif');
  assert.equal(yr.total, 0);
});

test('split PSN : budget insuffisant → réduction proportionnelle sans dépassement', () => {
  const d = withPsn(defaultScenarioData(), ['2027'], () => 1000000);
  const yr = simulate(d).years['2027'];
  assert.ok(yr.balance >= 0);
  const cov = yr.lines.filter((l) => !l.isMilda && l.need > 0).map((l) => l.coverage);
  assert.ok(Math.max(...cov) < 1);
  assert.ok(Math.max(...cov) - Math.min(...cov) < 0.01, 'couverture uniforme');
});

test('split PSN : budget supérieur au PSN → tout le budget utilisé, au-delà des quantités PSN', () => {
  const d = withPsn(defaultScenarioData(), ['2027'], () => 100);
  const yr = simulate(d).years['2027'];
  const reg = yr.lines.filter((x) => !x.isMilda && x.need > 0);
  assert.ok(reg.every((l) => l.qty > l.need), 'quantités au-delà du PSN');
  const cov = reg.map((l) => l.coverage);
  assert.ok((Math.max(...cov) - Math.min(...cov)) / Math.max(...cov) < 0.01, 'proportions conservées');
  const slack = REGULAR.reduce((s, c) => s + d.commodities[c.id].landedAir, 0);
  assert.ok(yr.balance >= 0 && yr.balance < slack, 'budget saturé');
});

test('quantités manuelles : saisies telles quelles, solde éventuellement négatif', () => {
  const d = defaultScenarioData();
  d.methods['2029'] = 'manual';
  d.regularQtys['2029'][9] = 50000000;
  const yr = simulate(d).years['2029'];
  assert.equal(yr.lines.find((l) => l.id === 9).qty, 50000000);
  assert.equal(yr.lines.find((l) => l.id === 1).qty, 0);
  assert.ok(yr.balance < 0);
  d.quantification['2029'][3] = 1000;
  const q = quantitiesFor(d, '2029', 'quantif', yr.residual).qtys;
  assert.equal(q[1], 0);
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
  d.commodities[10].landedAir = 2.466;
  d.logistics['2027'] = 'sea';
  d.manualQtys['2027'][12] = 4321;
  d.budgets['2029'] = 8000000;
  d.reserves['2028'] = 1600000;
  d.yearAccruals['2026'] = 1234567;
  d.yearAccruals['2028'] = 5000;
  d.carryRules['2026'] = 'smooth';
  d.carryRules['2028'] = 'none';
  d.methods['2030'] = 'manual';
  d.quantification['2028'][3] = 150000;
  d.quantification['2031'][4] = 777;
  d.regularQtys['2030'][9] = 777;
  const wb = await buildWorkbook({ name: 'Test', data: d });
  const buf = await wb.xlsx.writeBuffer();
  const x = XLSX.read(buf, { type: 'buffer' });
  assert.deepEqual(x.SheetNames, ['Quantités à commander', 'Simulation', 'Paramètres']);
  const rows = XLSX.utils.sheet_to_json(x.Sheets['Paramètres'], { header: 1, raw: true, defval: null });
  const { data, found } = parseWorkbookRows([rows], zeroedScenarioData(defaultScenarioData()));
  assert.equal(found, 13);
  for (const c of [...REGULAR, ...MILDA]) {
    for (const k of ['price', 'landedSea']) close(data.commodities[c.id][k], d.commodities[c.id][k]);
    if (!c.isMilda) for (const k of ['landedAir', 'qty26']) close(data.commodities[c.id][k], d.commodities[c.id][k]);
  }
  assert.deepEqual(data.logistics, d.logistics);
  assert.equal(data.budgets['2029'], 8000000);
  assert.equal(data.reserves['2028'], 1600000);
  assert.deepEqual(data.yearAccruals, d.yearAccruals);
  assert.deepEqual(data.carryRules, d.carryRules);
  assert.deepEqual(data.methods, d.methods);
  assert.equal(data.manualQtys['2027'][12], 4321);
  assert.equal(data.quantification['2028'][3], 150000);
  assert.equal(data.quantification['2031'][4], 777);
  assert.equal(data.regularQtys['2030'][9], 777);
});

test('anciens scénarios : méthodes, coûts en %, accruals et report repris sans changer le résultat', () => {
  const old = normalizeScenarioData({ methods: { 2028: 'split' }, commodities: { 1: { price: 10, air: 50, sea: 20, qty26: 5 } } });
  assert.equal(old.methods['2028'], 'quantif');
  close(old.commodities[1].landedAir, 15);
  close(old.commodities[1].landedSea, 12);
  // ancien format : liste d'accruals + assistance engagée + report « fy27 »
  const prev = normalizeScenarioData({
    budgets: { 2026: 10000000 }, reserves: { 2026: 500000 },
    accruals: { items: [{ id: 'a', desc: 'A', amount: 100000, freightPct: 10 }, { id: 'b', desc: 'B', amount: 50000, freightPct: 0 }] },
    fy26AssistanceSpent: 200000, carryover: 'fy27',
  });
  close(prev.yearAccruals['2026'], 110000 + 50000 + 200000);
  assert.deepEqual(prev.carryRules, { 2026: 'next', 2027: 'none', 2028: 'none', 2029: 'none' });
  // très ancien format sans assistance engagée : la réserve FY2026 était considérée comme dépensée
  close(normalizeScenarioData({ budgets: {}, reserves: { 2026: 500000 }, accruals: { amount: 1000, desc: 'x' } }).yearAccruals['2026'], 501000);
});

test('années fiscales : FY2027 = 1er octobre 2026 – 30 septembre 2027', () => {
  assert.deepEqual(fiscalYear('2027').start, new Date(2026, 9, 1));
  assert.deepEqual(fiscalYear('2027').end, new Date(2027, 8, 30));
});

test('coûts livrés : taux implicite et split PSN', () => {
  const d = defaultScenarioData();
  close(freightRate(d.commodities[10], 'air'), 174, 1e-3);
  d.quantification['2027'][1] = 100; d.quantification['2027'][4] = 300;
  close(psnSplit(d, '2027')[1], 1314 / (1314 + 2400));
  // coûts de référence MOU 27 (fichier Niger) : EXW et coût livré maritime
  close(d.commodities[4].price, 8); close(d.commodities[4].landedSea, 10.747648);
  close(d.commodities[9].landedSea, 1.622334);
});

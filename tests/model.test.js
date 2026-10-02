// Tests du moteur de calcul et de l'aller-retour Excel : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { defaultScenarioData, simulate, parseVal, freightRate, psnSplit, REGULAR, MILDA, zeroedScenarioData, normalizeScenarioData, quantitiesFor } from '../src/model.js';
import { buildWorkbook, parseWorkbookRows, exportFileName } from '../src/excel.js';
import { assessDelivery, fiscalYear } from '../src/logistics.js';

// Règles d'origine du cahier des charges : FY26 dépensé selon les quantités saisies, report ÷ 4.
const specData = () => ({ ...defaultScenarioData(), fy26Spending: 'planned', carryover: 'smooth' });

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

test('FY26 : dépenses, surplus et report lissé', () => {
  const d = specData();
  const sim = simulate(d);
  let expected = 0;
  for (const c of REGULAR) {
    const p = d.commodities[c.id];
    expected += p.qty26 * p.landedAir;
  }
  expected += 1106690;
  close(sim.years['2026'].total, expected);
  close(sim.surplus, 13321800 - expected);
  close(sim.bonus, sim.surplus / 4);
  assert.ok(!sim.years['2026'].lines.some((l) => l.isMilda), 'MILDA masquées en mode Air');
});

test('FY27-30 : split PSN — budget saturé sans dépassement, split sur base EXW', () => {
  const d = specData();
  for (const y of ['2027', '2028', '2029', '2030']) {
    for (const c of REGULAR) d.quantification[y][c.id] = 1000 * c.id;
  }
  d.manualQtys['2028'][11] = 100000;
  const sim = simulate(d);
  for (const y of ['2027', '2028', '2029', '2030']) {
    const yr = sim.years[y];
    close(yr.available, d.budgets[y] + sim.bonus);
    assert.ok(yr.balance >= 0, `solde ${y} négatif`);
    // Le reliquat est inférieur au coût landed d'une unité de chaque intrant.
    const slack = REGULAR.reduce((s, c) => { const p = d.commodities[c.id]; return s + (yr.mode === 'air' ? p.landedAir : p.landedSea); }, 0);
    assert.ok(yr.balance < slack, `${y} : budget non saturé (${yr.balance})`);
    // Part EXW de l'intrant 3 ≈ son split dans la valeur de la quantification
    const exw = yr.lines.filter((l) => !l.isMilda).reduce((s, l) => s + l.exw, 0);
    const tot = REGULAR.reduce((s, c) => s + 1000 * c.id * d.commodities[c.id].price, 0);
    close(yr.lines.find((l) => l.id === 3).exw / exw, (3000 * d.commodities[3].price) / tot, 1e-4);
  }
  close(sim.years['2028'].mildaCost, 100000 * 2 * 1.5);
  assert.equal(sim.years['2027'].lines.filter((l) => l.isMilda).length, 0);
  assert.equal(sim.years['2028'].lines.filter((l) => l.isMilda).length, MILDA.length);
});

test('quantification PSN non saisie : aucune quantité calculée', () => {
  const yr = simulate(defaultScenarioData()).years['2027'];
  assert.equal(yr.method, 'quantif');
  assert.equal(yr.total, 0);
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
  d.accruals.items[0].freightPct = 2.35;
  d.accruals.items[0].desc = 'Test accruals';
  d.accruals.items.push({ id: 'x2', desc: 'Second engagement', refs: 'RO-42', amount: 250000, freightPct: 0 });
  d.reserves['2028'] = 1600000;
  d.methods['2028'] = 'quantif';
  d.methods['2030'] = 'manual';
  d.quantification['2028'][3] = 150000;
  d.quantification['2031'][4] = 777;
  d.carryover = 'smooth';
  d.fy26Spending = 'planned';
  d.leadTimes.sea.max = 15;
  d.needDates['2029'] = '2029-03';
  d.fy26AssistanceSpent = 123456;
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
  assert.equal(data.manualQtys['2027'][12], 4321);
  assert.equal(data.accruals.items.length, 2);
  close(data.accruals.items[0].freightPct, 2.35);
  assert.equal(data.accruals.items[0].desc, 'Test accruals');
  close(data.accruals.items[0].amount, 1106690);
  assert.equal(data.accruals.items[1].refs, 'RO-42');
  close(data.accruals.items[1].amount, 250000);
  assert.equal(data.reserves['2028'], 1600000);
  assert.deepEqual(data.methods, d.methods);
  assert.equal(data.quantification['2028'][3], 150000);
  assert.equal(data.quantification['2031'][4], 777);
  assert.equal(data.carryover, 'smooth');
  assert.equal(data.fy26Spending, 'planned');
  assert.equal(data.leadTimes.sea.max, 15);
  assert.equal(data.needDates['2029'], '2029-03');
  assert.equal(data.fy26AssistanceSpent, 123456);
  assert.equal(data.regularQtys['2030'][9], 777);
});

test('réserve d’assistance déduite du budget intrants', () => {
  const d = specData();
  for (const c of REGULAR) d.quantification['2027'][c.id] = 1000;
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

test('split PSN : budget insuffisant → réduction proportionnelle sans dépassement', () => {
  const d = withQuantif(10);
  const yr = simulate(d).years['2027'];
  assert.ok(yr.balance >= 0);
  const cov = yr.lines.filter((l) => !l.isMilda && l.need > 0).map((l) => l.coverage);
  assert.ok(Math.max(...cov) < 1);
  assert.ok(Math.max(...cov) - Math.min(...cov) < 0.01, 'couverture uniforme');
});

test('split PSN : budget supérieur au PSN → tout le budget utilisé, au-delà des quantités PSN', () => {
  const d = withQuantif(0.1);
  const yr = simulate(d).years['2027'];
  assert.ok(yr.balance >= 0);
  const reg = yr.lines.filter((x) => !x.isMilda && x.need > 0);
  assert.ok(reg.every((l) => l.qty > l.need), 'quantités au-delà des besoins');
  const cov = reg.map((l) => l.coverage);
  assert.ok((Math.max(...cov) - Math.min(...cov)) / Math.max(...cov) < 0.01, 'proportions conservées');
  const slack = REGULAR.reduce((s, c) => { const p = d.commodities[c.id]; return s + p.landedAir; }, 0);
  assert.ok(yr.balance < slack, 'budget saturé');
});

test('quantités manuelles : saisies telles quelles, solde éventuellement négatif', () => {
  const d = defaultScenarioData();
  d.methods['2029'] = 'manual';
  d.regularQtys['2029'][9] = 50000000;
  const yr = simulate(d).years['2029'];
  assert.equal(yr.lines.find((l) => l.id === 9).qty, 50000000);
  assert.equal(yr.lines.find((l) => l.id === 1).qty, 0);
  assert.ok(yr.balance < 0);
  // pré-remplissage « quantification ajustée au budget » = méthode quantif sur le même budget résiduel
  d.quantification['2029'][3] = 1000;
  const q = quantitiesFor(d, '2029', 'quantif', yr.residual).qtys;
  assert.ok(q[3] > 1000, 'tout le budget sur le seul intrant du PSN');
  assert.equal(q[1], 0);
});

test('anciens scénarios (sans réserve ni méthode) complétés par défaut', () => {
  const old = defaultScenarioData();
  delete old.reserves; delete old.methods; delete old.quantification; delete old.regularQtys;
  const n = normalizeScenarioData(old);
  assert.equal(n.reserves['2027'], 0);
  assert.equal(n.methods['2027'], 'quantif');
  // l'ancienne méthode « split » (FY25) bascule sur la quantification PSN
  assert.equal(normalizeScenarioData({ methods: { 2028: 'split' } }).methods['2028'], 'quantif');
  assert.equal(n.quantification['2030'][1], 0);
});

test('FY26 non dépensé : seules les accruals comptent, surplus reporté en totalité sur FY27', () => {
  const d = defaultScenarioData();
  assert.equal(d.fy26Spending, 'unspent');
  assert.equal(d.carryover, 'fy27');
  const sim = simulate(d);
  close(sim.years['2026'].total, 1106690);
  close(sim.surplus, 13321800 - 1106690);
  close(sim.years['2027'].available, d.budgets['2027'] + sim.surplus);
  close(sim.years['2028'].available, d.budgets['2028']);
  d.carryover = 'smooth';
  const s2 = simulate(d);
  close(s2.years['2028'].available, d.budgets['2028'] + s2.surplus / 4);
});

test('anciens scénarios : FY26 dépensé et report lissé conservés', () => {
  const old = defaultScenarioData();
  delete old.fy26Spending; delete old.carryover;
  const n = normalizeScenarioData(old);
  assert.equal(n.fy26Spending, 'planned');
  assert.equal(n.carryover, 'smooth');
});

test('délais : exercice clos, à temps, risque, en retard', () => {
  const lt = { air: { min: 4, max: 7 }, sea: { min: 6, max: 13 } };
  const today = new Date(2026, 9, 2);
  assert.equal(assessDelivery({ year: '2026', mode: 'air', leadTimes: lt, needMonth: '2026-01', today }).status, 'closed');
  // FY27, besoin janvier 2027 : même par avion (4 mois min) trop tard
  const a27 = assessDelivery({ year: '2027', mode: 'air', leadTimes: lt, needMonth: '2027-01', today });
  assert.equal(a27.status, 'late');
  assert.equal(a27.arrivalMin.getMonth(), 1); // février 2027
  // besoin juin 2027 : avion possible si tout va bien (4 mois) mais pas garanti (7)
  assert.equal(assessDelivery({ year: '2027', mode: 'air', leadTimes: lt, needMonth: '2027-04', today }).status, 'risk');
  // FY29 par bateau : commande possible jusqu'en décembre 2027
  const s29 = assessDelivery({ year: '2029', mode: 'sea', leadTimes: lt, needMonth: '2029-01', today });
  assert.equal(s29.status, 'ok');
  assert.equal(s29.orderBy.getFullYear(), 2027);
  assert.equal(s29.orderBy.getMonth(), 11);
  assert.deepEqual(fiscalYear('2027').start, new Date(2026, 9, 1));
});

test('accruals : plusieurs lignes, et reprise de l’ancien format à ligne unique', () => {
  const d = defaultScenarioData();
  d.accruals.items.push({ id: 'b', desc: 'B', refs: '', amount: 100000, freightPct: 10 });
  const sim = simulate(d);
  close(sim.years['2026'].total, 1106690 + 110000);
  assert.equal(sim.years['2026'].lines.filter((l) => l.isAccrual).length, 2);
  const old = normalizeScenarioData({ accruals: { amount: 5000, desc: 'Ancien', refs: 'R', freightPct: 1 } });
  assert.deepEqual(old.accruals.items.map((a) => [a.desc, a.amount, a.freightPct]), [['Ancien', 5000, 1]]);
});

test('solde d’assistance FY2026 reporté comme le solde produits, enveloppe séparée', () => {
  const d = defaultScenarioData();
  d.reserves['2026'] = 1600000;
  d.fy26AssistanceSpent = 400000;
  d.reserves['2027'] = 1000000;
  let sim = simulate(d);
  close(sim.assistanceBalance, 1200000);
  close(sim.surplus, 13321800 - 1600000 - 1106690);
  close(sim.years['2027'].assistance, 1000000 + 1200000);
  close(sim.years['2027'].available, d.budgets['2027'] - 1000000 + sim.surplus);
  close(sim.totalBalance, sim.surplus + 1200000);
  d.carryover = 'smooth';
  sim = simulate(d);
  close(sim.years['2029'].assistCarry, 300000);
  // anciens scénarios : réserve FY26 considérée comme dépensée
  const old = defaultScenarioData(); delete old.fy26AssistanceSpent; old.reserves['2026'] = 500000;
  assert.equal(normalizeScenarioData(old).fy26AssistanceSpent, 500000);
});

test('coûts livrés : taux implicite et reprise de l’ancien format en %', () => {
  const d = defaultScenarioData();
  close(freightRate(d.commodities[10], 'air'), 174, 1e-3);
  const old = normalizeScenarioData({ commodities: { 1: { price: 10, air: 50, sea: 20, qty26: 5 } } });
  close(old.commodities[1].landedAir, 15);
  close(old.commodities[1].landedSea, 12);
  d.quantification['2027'][1] = 100; d.quantification['2027'][4] = 300;
  const sp = psnSplit(d, '2027');
  close(sp[1], 1379 / (1379 + 1500));
});

// ─── Modèle de données & moteur de calcul ───────────────────────────────────
// Module pur (sans React) : constantes, valeurs par défaut, parsing numérique
// et simulation FY26-FY30. Testé par tests/model.test.js.

export const YEARS = ['2026', '2027', '2028', '2029', '2030'];
export const FUTURE_YEARS = ['2027', '2028', '2029', '2030'];

export const CATEGORIES = [
  'Prevention Commodity Procurement',
  'Diagnostic Commodity Procurement',
  'Therapeutic Commodity Procurement',
  'OTHER',
];

// Catalogue des 13 références (propriétés fixes : nom, catégorie, type).
// `plain` : nom en langage courant ; `use` : à quoi sert le produit (pour les non-spécialistes).
export const COMMODITIES = [
  { id: 1, name: 'SP 500/25mg', category: CATEGORIES[0], plain: 'Sulfadoxine-pyriméthamine (SP)', use: 'Prévention chez la femme enceinte (TPIg)' },
  { id: 2, name: 'AQ-SP 76.5/262.5mg (3-11m)', category: CATEGORIES[0], plain: 'AQ + SP, enfants de 3 à 11 mois', use: 'Chimioprévention du paludisme saisonnier (CPS)' },
  { id: 3, name: 'AQ-SP 153/525MG (12-59M)', category: CATEGORIES[0], plain: 'AQ + SP, enfants de 12 à 59 mois', use: 'Chimioprévention du paludisme saisonnier (CPS)' },
  { id: 4, name: 'RDT', category: CATEGORIES[1], plain: 'Test de diagnostic rapide (TDR)', use: 'Dépistage du paludisme' },
  { id: 5, name: 'AL6', category: CATEGORIES[2], plain: 'Artéméther-luméfantrine, 6 comprimés (5-14 kg)', use: 'Traitement du paludisme simple' },
  { id: 6, name: 'AL12', category: CATEGORIES[2], plain: 'Artéméther-luméfantrine, 12 comprimés (15-24 kg)', use: 'Traitement du paludisme simple' },
  { id: 7, name: 'AL18', category: CATEGORIES[2], plain: 'Artéméther-luméfantrine, 18 comprimés (25-34 kg)', use: 'Traitement du paludisme simple' },
  { id: 8, name: 'AL24', category: CATEGORIES[2], plain: 'Artéméther-luméfantrine, 24 comprimés (35 kg et plus)', use: 'Traitement du paludisme simple' },
  { id: 9, name: 'Inj 60 mg', category: CATEGORIES[2], plain: 'Artésunate injectable 60 mg', use: 'Traitement du paludisme grave' },
  { id: 10, name: 'AS 100mg SUPPO', category: CATEGORIES[2], plain: 'Artésunate rectal 100 mg (suppositoire)', use: 'Traitement pré-transfert du paludisme grave (enfants)' },
  { id: 11, name: 'MILDA Régulière', category: CATEGORIES[0], isMilda: true, plain: 'Moustiquaire imprégnée standard', use: 'Protection contre les piqûres de moustiques' },
  { id: 12, name: 'MILDA PBO', category: CATEGORIES[0], isMilda: true, plain: 'Moustiquaire imprégnée PBO', use: 'Protection dans les zones de résistance aux insecticides' },
  { id: 13, name: 'MILDA IG2', category: CATEGORIES[0], isMilda: true, plain: 'Moustiquaire imprégnée double principe actif (IG2)', use: 'Protection dans les zones de résistance aux insecticides' },
];
export const REGULAR = COMMODITIES.filter((c) => !c.isMilda);
export const MILDA = COMMODITIES.filter((c) => c.isMilda);
export const byId = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));

// Paramètres éditables par intrant (pourcentages en échelle 0-100).
const DEFAULT_PARAMS = {
  1: { price: 13.79, air: 61.41, sea: 50, qty26: 15000 },
  2: { price: 12.0, air: 54.04, sea: 50, qty26: 31959 },
  3: { price: 12.64, air: 46.93, sea: 50, qty26: 124442 },
  4: { price: 5.0, air: 100, sea: 50, qty26: 0 },
  5: { price: 6.3, air: 58.2, sea: 50, qty26: 28000 },
  6: { price: 10.8, air: 42.9, sea: 50, qty26: 30480 },
  7: { price: 14.7, air: 60, sea: 50, qty26: 15000 },
  8: { price: 16.1, air: 51.2, sea: 50, qty26: 26552 },
  9: { price: 1.35, air: 109.5, sea: 50, qty26: 650000 },
  10: { price: 0.9, air: 174, sea: 50, qty26: 10000 },
  11: { price: 2.0, air: 0, sea: 50, qty26: 0 },
  12: { price: 2.3, air: 0, sea: 50, qty26: 0 },
  13: { price: 3.0, air: 0, sea: 50, qty26: 0 },
};

export const DEFAULT_BUDGETS = {
  2026: 13321800,
  2027: 10947300,
  2028: 9142167,
  2029: 8034067,
  2030: 7400000,
};

export const DEFAULT_LOGISTICS = { 2026: 'air', 2027: 'air', 2028: 'sea', 2029: 'sea', 2030: 'sea' };

// Accruals (engagements) au 30 septembre 2026 : une ou plusieurs lignes, chacune
// avec son taux de fret aérien (ajustement fin pour caler le landed sur MFS).
export const newAccrual = (desc = '', amount = 0) => ({
  id: Math.random().toString(36).slice(2, 9), desc, refs: '', amount, freightPct: 0,
});
export const DEFAULT_ACCRUALS = { items: [{ id: 'acc1', desc: 'mRDTs (RO Accruals)', refs: '', amount: 1106690, freightPct: 0 }] };
export const accrualsTotal = (accruals) =>
  (accruals?.items || []).reduce((s, a) => s + num(a.amount) * (1 + num(a.freightPct) / 100), 0);

// Réserve d'assistance (assistance technique, entreposage, distribution) déduite
// du budget total de chaque exercice. 0 par défaut (budgets du cahier des charges).
export const DEFAULT_RESERVES = { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 };

// Méthode de calcul des quantités des intrants réguliers en FY27-FY30 :
//  quantif — répartition selon la quantification PSN (base EXW), plafonnée aux besoins
//            (ou maximisée : tout le budget, au-delà des besoins) ;
//  manual  — quantités saisies directement.
// (L'ancienne répartition selon le split FY25 a été retirée : les scénarios qui
// l'utilisaient passent en « quantif ».)
export const METHODS = ['quantif', 'manual'];
export const METHOD_LABEL = { quantif: 'Quantification PSN', manual: 'Quantités manuelles' };
export const DEFAULT_METHODS = { 2027: 'quantif', 2028: 'quantif', 2029: 'quantif', 2030: 'quantif' };
// Méthode « quantif » : true = tout le budget est réparti selon la quantification,
// même au-delà des besoins ; false = plafonné aux besoins (défaut).
export const DEFAULT_MAXIMIZE = { 2027: false, 2028: false, 2029: false, 2030: false };

// FY2026 (clos le 30/09/2026) : « planned » = les quantités FY26 saisies ont été
// commandées ; « unspent » = rien n'a été commandé, seules les accruals sont comptées.
export const FY26_SPENDING = ['planned', 'unspent'];
// Report du surplus FY26 : « fy27 » = en totalité sur FY2027 ; « smooth » = ÷ 4 sur FY27-FY30.
export const CARRYOVER = ['fy27', 'smooth'];
export const CARRYOVER_LABEL = { fy27: 'En totalité sur FY2027', smooth: 'Lissé sur les autres années du MOU (FY2027-FY2030)' };

// Délais d'acheminement (mois, de la commande à l'arrivée au Niger) — hypothèses
// par défaut à valider avec GHSC-PSM. Bateau = mer jusqu'à Lomé puis route
// Togo - Burkina Faso - Niger (frontière Bénin-Niger fermée).
export const DEFAULT_LEAD_TIMES = { air: { min: 4, max: 7 }, sea: { min: 6, max: 13 } };
// Date à laquelle les produits doivent être au Niger (AAAA-MM), par exercice.
export const DEFAULT_NEED_DATES = { 2027: '2027-01', 2028: '2028-01', 2029: '2029-01', 2030: '2030-01' };

const emptyManual = () =>
  Object.fromEntries(YEARS.map((y) => [y, Object.fromEntries(MILDA.map((m) => [m.id, 0]))]));
const emptyRegular = () =>
  Object.fromEntries(FUTURE_YEARS.map((y) => [y, Object.fromEntries(REGULAR.map((c) => [c.id, 0]))]));

/** Données d'un scénario aux valeurs par défaut du cahier des charges. */
export const defaultScenarioData = () => ({
  budgets: { ...DEFAULT_BUDGETS },
  reserves: { ...DEFAULT_RESERVES },
  commodities: JSON.parse(JSON.stringify(DEFAULT_PARAMS)),
  logistics: { ...DEFAULT_LOGISTICS },
  methods: { ...DEFAULT_METHODS },
  maximize: { ...DEFAULT_MAXIMIZE },
  fy26Spending: 'unspent',
  carryover: 'fy27',
  leadTimes: JSON.parse(JSON.stringify(DEFAULT_LEAD_TIMES)),
  needDates: { ...DEFAULT_NEED_DATES },
  accruals: JSON.parse(JSON.stringify(DEFAULT_ACCRUALS)),
  manualQtys: emptyManual(),       // MILDA, saisie manuelle (mode Mer)
  quantification: emptyRegular(),  // besoins exprimés par le Niger, FY27-FY30
  regularQtys: emptyRegular(),     // quantités saisies (méthode « manual »), FY27-FY30
});

/** Remise à zéro (Option C) : intrants, accruals, MILDA et quantités à 0 ; budgets, réserves, logistique et méthodes conservés. */
export const zeroedScenarioData = (data) => ({
  ...data,
  commodities: Object.fromEntries(
    COMMODITIES.map((c) => [c.id, { price: 0, air: 0, sea: 0, qty26: 0 }])
  ),
  accruals: { items: (data.accruals?.items || []).map((a) => ({ ...a, amount: 0, freightPct: 0 })) },
  manualQtys: emptyManual(),
  quantification: emptyRegular(),
  regularQtys: emptyRegular(),
});

/** Accruals : liste de lignes ; reprend l'ancien format à ligne unique { amount, desc, refs, freightPct }. */
const normalizeAccruals = (acc, def) => {
  if (Array.isArray(acc?.items)) {
    return { items: acc.items.map((a, i) => ({ id: a.id || `acc${i + 1}`, desc: a.desc ?? '', refs: a.refs ?? '', amount: num(a.amount), freightPct: num(a.freightPct) })) };
  }
  if (acc && ('amount' in acc || 'desc' in acc)) {
    return { items: [{ id: 'acc1', desc: acc.desc ?? '', refs: acc.refs ?? '', amount: num(acc.amount), freightPct: num(acc.freightPct) }] };
  }
  return JSON.parse(JSON.stringify(def));
};

/** Complète un scénario partiel (import JSON ancien / incomplet) avec les valeurs par défaut. */
export const normalizeScenarioData = (d = {}) => {
  const def = defaultScenarioData();
  const commodities = {};
  for (const c of COMMODITIES) commodities[c.id] = { ...def.commodities[c.id], ...(d.commodities?.[c.id] || {}) };
  const nested = (key, years) => Object.fromEntries(years.map((y) => [y, { ...def[key][y], ...(d[key]?.[y] || {}) }]));
  const methods = { ...def.methods, ...(d.methods || {}) };
  for (const y of FUTURE_YEARS) if (!METHODS.includes(methods[y])) methods[y] = 'quantif';
  return {
    budgets: { ...def.budgets, ...(d.budgets || {}) },
    reserves: { ...def.reserves, ...(d.reserves || {}) },
    commodities,
    logistics: { ...def.logistics, ...(d.logistics || {}) },
    methods,
    maximize: Object.fromEntries(FUTURE_YEARS.map((y) => [y, !!(d.maximize?.[y] ?? def.maximize[y])])),
    // Scénarios antérieurs à ces options : on conserve le comportement d'origine
    // (quantités FY26 dépensées, report lissé ÷ 4) pour ne pas changer leurs résultats.
    fy26Spending: FY26_SPENDING.includes(d.fy26Spending) ? d.fy26Spending : 'planned',
    carryover: CARRYOVER.includes(d.carryover) ? d.carryover : 'smooth',
    leadTimes: {
      air: { ...def.leadTimes.air, ...(d.leadTimes?.air || {}) },
      sea: { ...def.leadTimes.sea, ...(d.leadTimes?.sea || {}) },
    },
    needDates: { ...def.needDates, ...(d.needDates || {}) },
    accruals: normalizeAccruals(d.accruals, def.accruals),
    manualQtys: nested('manualQtys', YEARS),
    quantification: nested('quantification', FUTURE_YEARS),
    regularQtys: nested('regularQtys', FUTURE_YEARS),
  };
};

// ─── Parsing numérique robuste (§5 du cahier des charges) ───────────────────
export const parseVal = (v, isPct = false) => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') {
    // Excel a souvent transformé x% en x/100. Le seuil de 20 couvre jusqu'à
    // 2000 % de fret (1.74 -> 174 %) sans altérer les valeurs déjà en 0-100.
    return isPct && v <= 20.0 ? v * 100 : v;
  }
  let s = String(v).trim().replace(/\s/g, '').replace(/[$/]/g, '').replace(',', '.');
  const hasPct = s.includes('%');
  s = s.replace('%', '');
  let n = parseFloat(s) || 0;
  if (isPct && !hasPct && n > 0 && n <= 20) n = n * 100;
  return n;
};

/** Nombre saisi au clavier (virgule ou point décimal, espaces tolérés). */
export const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const line = (c, qty, price, ratePct) => {
  const exw = qty * price;
  const freight = exw * (ratePct / 100);
  return { id: c.id, name: c.name, plain: c.plain || c.name, use: c.use || '', category: c.category, isMilda: !!c.isMilda, qty, price, rate: ratePct, exw, freight, landed: exw + freight };
};

const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);

const floorQty = (x) => Math.max(0, Math.floor(x + 1e-9));

/**
 * Répartit un budget landed entre les intrants réguliers selon des poids EXW
 * (w_i normalisés) : E_tot = budget / Σ w_i (1 + r_i), Q_i = ⌊E_tot × w_i / P_i⌋.
 * `cap` (facultatif) plafonne chaque quantité (besoins de la quantification).
 */
const allocate = (budget, weights, price, rate, cap) => {
  const factor = REGULAR.reduce((s, c) => s + weights[c.id] * (1 + rate(c.id) / 100), 0);
  let eTot = factor > 0 && budget > 0 ? budget / factor : 0;
  if (cap) {
    // E_tot maximal tel qu'aucune quantité ne dépasse son besoin.
    const limits = REGULAR.filter((c) => weights[c.id] > 0).map((c) => (cap[c.id] * price(c.id)) / weights[c.id]);
    if (limits.length) eTot = Math.min(eTot, ...limits);
  }
  const qtys = Object.fromEntries(REGULAR.map((c) => {
    const pr = price(c.id);
    const q = pr > 0 ? floorQty((eTot * weights[c.id]) / pr) : 0;
    return [c.id, cap ? Math.min(q, floorQty(cap[c.id])) : q];
  }));
  return { eTot, qtys };
};

/** Quantités FY27-30 d'une méthode donnée, pour un budget résiduel (utilisé aussi par les boutons de pré-remplissage). */
export const quantitiesFor = (data, year, method, residual) => {
  const p = (id) => data.commodities[id] || {};
  const price = (id) => num(p(id).price);
  const rate = (id) => num(data.logistics[year] === 'air' ? p(id).air : p(id).sea);
  if (method === 'manual') {
    return { eTot: null, qtys: Object.fromEntries(REGULAR.map((c) => [c.id, floorQty(num(data.regularQtys?.[year]?.[c.id]))])) };
  }
  // quantif
  {
    const need = Object.fromEntries(REGULAR.map((c) => [c.id, floorQty(num(data.quantification?.[year]?.[c.id]))]));
    const values = Object.fromEntries(REGULAR.map((c) => [c.id, need[c.id] * price(c.id)]));
    const tot = REGULAR.reduce((s, c) => s + values[c.id], 0);
    const weights = Object.fromEntries(REGULAR.map((c) => [c.id, tot > 0 ? values[c.id] / tot : 0]));
    return allocate(residual, weights, price, rate, data.maximize?.[year] ? undefined : need);
  }
};

// ─── Simulation FY26-FY30 (§3) ──────────────────────────────────────────────
export const simulate = (data) => {
  const { budgets, reserves = {}, commodities, logistics, accruals, manualQtys, methods = {}, quantification = {} } = data;
  const fy26Unspent = data.fy26Spending === 'unspent';
  const p = (id) => commodities[id] || {};
  const rateFor = (id, mode) => num(mode === 'air' ? p(id).air : p(id).sea);
  const mildaLines = (y) =>
    logistics[y] === 'sea'
      ? MILDA.map((m) => line(m, floorQty(num(manualQtys?.[y]?.[m.id])), num(p(m.id).price), num(p(m.id).sea)))
      : [];

  // FY 2026 : quantités saisies ; la réserve d'assistance est déduite du budget.
  const mode26 = logistics['2026'];
  const regular26 = REGULAR.map((c) => line(c, fy26Unspent ? 0 : Math.max(0, num(p(c.id).qty26)), num(p(c.id).price), rateFor(c.id, mode26)));
  const milda26 = fy26Unspent ? [] : mildaLines('2026');
  const accrualLines = (accruals?.items || []).map((a) => {
    const exw = num(a.amount);
    const freight = exw * (num(a.freightPct) / 100);
    return {
      id: `acc-${a.id}`, accId: a.id, name: a.desc || 'Accruals', plain: a.desc || 'Accruals', use: 'Engagement au 30/09/2026',
      category: 'OTHER', isAccrual: true, qty: null, rate: num(a.freightPct), exw, freight, landed: exw + freight,
    };
  });
  const accExw = sum(accrualLines, 'exw');
  const accFreight = sum(accrualLines, 'freight');
  const base26 = num(budgets['2026']);
  const reserve26 = num(reserves['2026']);
  const accrualsLanded = sum(accrualLines, 'landed');
  const total26 = sum(regular26, 'landed') + sum(milda26, 'landed') + accrualsLanded;
  const available26 = base26 - reserve26;
  const surplus = available26 - total26;
  const carryover = data.carryover === 'fy27' ? 'fy27' : 'smooth';
  const carry = Object.fromEntries(FUTURE_YEARS.map((y) => [y, carryover === 'fy27' ? (y === '2027' ? surplus : 0) : surplus / 4]));
  const bonus = surplus / 4; // report annuel lissé (règle d'origine), conservé pour compatibilité

  const result = {
    2026: {
      year: '2026', mode: mode26, method: 'fy26', unspent: fy26Unspent, base: base26, reserve: reserve26, bonus: 0, available: available26,
      lines: [...regular26, ...milda26, ...accrualLines], mildaCost: sum(milda26, 'landed'), accrualsLanded,
      totalExw: sum(regular26, 'exw') + sum(milda26, 'exw') + accExw,
      totalFreight: sum(regular26, 'freight') + sum(milda26, 'freight') + accFreight,
      total: total26, balance: surplus,
    },
  };

  // FY 2027-2030 : budget intrants = budget total − réserve + report lissé.
  for (const y of FUTURE_YEARS) {
    const mode = logistics[y];
    const method = METHODS.includes(methods[y]) ? methods[y] : 'quantif';
    const base = num(budgets[y]);
    const reserve = num(reserves[y]);
    const available = base - reserve + carry[y];
    const milda = mildaLines(y);
    const mildaCost = sum(milda, 'landed');
    const residual = available - mildaCost;
    const { eTot, qtys } = quantitiesFor(data, y, method, residual);
    const regular = REGULAR.map((c) => {
      const l = line(c, qtys[c.id], num(p(c.id).price), rateFor(c.id, mode));
      const need = floorQty(num(quantification?.[y]?.[c.id]));
      return { ...l, need, coverage: need > 0 ? l.qty / need : null };
    });
    const needLanded = REGULAR.reduce((s, c) => s + floorQty(num(quantification?.[y]?.[c.id])) * num(p(c.id).price) * (1 + rateFor(c.id, mode) / 100), 0);
    const total = sum(regular, 'landed') + mildaCost;
    result[y] = {
      year: y, mode, method, maximize: method === 'quantif' && !!data.maximize?.[y], base, reserve, bonus: carry[y], available, residual, eTot, lines: [...regular, ...milda], mildaCost,
      needLanded,
      totalExw: sum(regular, 'exw') + sum(milda, 'exw'),
      totalFreight: sum(regular, 'freight') + sum(milda, 'freight'),
      total, balance: available - total,
    };
  }
  return { years: result, surplus, bonus, carry, carryover };
};

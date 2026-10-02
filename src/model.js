// ─── Modèle de données & moteur de calcul ───────────────────────────────────
// Module pur (sans React) : constantes, valeurs par défaut, parsing numérique
// et simulation FY26-FY30. Testé par tests/model.test.js.

export const YEARS = ['2026', '2027', '2028', '2029', '2030'];
export const FUTURE_YEARS = ['2027', '2028', '2029', '2030'];
// Années du PSN (quantités financées par l'USG) : 2027-2031 ; le MOU couvre FY2027-FY2030.
export const PSN_YEARS = ['2027', '2028', '2029', '2030', '2031'];

export const CATEGORIES = [
  'Prevention Commodity Procurement',
  'Diagnostic Commodity Procurement',
  'Therapeutic Commodity Procurement',
  'OTHER',
];

// Catalogue des 13 références (propriétés fixes : nom, catégorie, type).
// `plain` : nom en langage courant ; `use` : à quoi sert le produit (pour les non-spécialistes).
export const COMMODITIES = [
  { id: 1, name: 'SP 500/25mg', category: CATEGORIES[0], unit: 'boîte de 50 plaquettes de 3 cp', plain: 'Sulfadoxine-pyriméthamine (SP)', use: 'Prévention chez la femme enceinte (TPIg)' },
  { id: 2, name: 'AQ-SP 76.5/262.5mg (3-11m)', category: CATEGORIES[0], unit: 'boîte de 50 co-blisters', plain: 'AQ + SP, enfants de 3 à 11 mois', use: 'Chimioprévention du paludisme saisonnier (CPS)' },
  { id: 3, name: 'AQ-SP 153/525MG (12-59M)', category: CATEGORIES[0], unit: 'boîte de 50 co-blisters', plain: 'AQ + SP, enfants de 12 à 59 mois', use: 'Chimioprévention du paludisme saisonnier (CPS)' },
  { id: 4, name: 'RDT', category: CATEGORIES[1], unit: 'kit de 25 tests', plain: 'Test de diagnostic rapide (TDR)', use: 'Dépistage du paludisme' },
  { id: 5, name: 'AL6', category: CATEGORIES[2], unit: 'boîte de 30 plaquettes de 6 cp', plain: 'Artéméther-luméfantrine, 6 comprimés (5-14 kg)', use: 'Traitement du paludisme simple' },
  { id: 6, name: 'AL12', category: CATEGORIES[2], unit: 'boîte de 30 plaquettes de 12 cp', plain: 'Artéméther-luméfantrine, 12 comprimés (15-24 kg)', use: 'Traitement du paludisme simple' },
  { id: 7, name: 'AL18', category: CATEGORIES[2], unit: 'boîte de 30 plaquettes de 18 cp', plain: 'Artéméther-luméfantrine, 18 comprimés (25-34 kg)', use: 'Traitement du paludisme simple' },
  { id: 8, name: 'AL24', category: CATEGORIES[2], unit: 'boîte de 30 plaquettes de 24 cp', plain: 'Artéméther-luméfantrine, 24 comprimés (35 kg et plus)', use: 'Traitement du paludisme simple' },
  { id: 9, name: 'Inj 60 mg', category: CATEGORIES[2], unit: 'flacon', plain: 'Artésunate injectable 60 mg', use: 'Traitement du paludisme grave' },
  { id: 10, name: 'AS 100mg SUPPO', category: CATEGORIES[2], unit: 'boîte de 2 suppositoires', plain: 'Artésunate rectal 100 mg (suppositoire)', use: 'Traitement pré-transfert du paludisme grave (enfants)' },
  { id: 11, name: 'MILDA Régulière', category: CATEGORIES[0], isMilda: true, unit: 'moustiquaire 190×180×170 cm', plain: 'Moustiquaire imprégnée standard', use: 'Protection contre les piqûres de moustiques' },
  { id: 12, name: 'MILDA PBO', category: CATEGORIES[0], isMilda: true, unit: 'moustiquaire 190×180×170 cm', plain: 'Moustiquaire imprégnée PBO', use: 'Protection dans les zones de résistance aux insecticides' },
  { id: 13, name: 'MILDA IG2', category: CATEGORIES[0], isMilda: true, unit: 'moustiquaire 190×180×170 cm', plain: 'Moustiquaire imprégnée double principe actif (IG2)', use: 'Protection dans les zones de résistance aux insecticides' },
];
export const REGULAR = COMMODITIES.filter((c) => !c.isMilda);
export const MILDA = COMMODITIES.filter((c) => c.isMilda);
export const byId = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));

// Valeurs du cahier des charges : prix EXW et taux de fret en %. Servent seulement à
// convertir les anciens scénarios (taux en %) en coûts livrés : landed = EXW × (1 + taux).
const REFERENCE_PARAMS = {
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
const round4 = (x) => Math.round(x * 10000) / 10000;
const n0 = (v) => Number(v) || 0; // (défini ici : utilisé au chargement du module)
const toLanded = (p) => ({
  price: n0(p.price),
  landedSea: round4(n0(p.price) * (1 + n0(p.sea) / 100)),
  landedAir: round4(n0(p.price) * (1 + n0(p.air) / 100)),
  qty26: n0(p.qty26),
});
// Paramètres éditables par intrant : prix EXW, coût livré unitaire bateau + route
// (landedSea) et avion (landedAir), quantité FY26. Valeurs par défaut validées le
// 02/10/2026 (scénario de référence) : coût livré maritime du fichier
// « Malaria_MOU_27-Niger.xlsx » (Commodity calculator, colonne F) et livré avion =
// EXW × (1 + % aérien de référence). MILDA : bateau uniquement.
const DEFAULT_PARAMS = {
  1: { price: 13.14, landedSea: 16.03, landedAir: 21.2093, qty26: 15000 },  // SP 25/500mg, boîte de 50 plaquettes de 3 cp
  2: { price: 11.91, landedSea: 14.53, landedAir: 18.3462, qty26: 31959 },  // AQ + SP 3-11 mois, boîte de 50 co-blisters
  3: { price: 14, landedSea: 17.08, landedAir: 20.5702, qty26: 124442 },    // AQ + SP 12-59 mois, boîte de 50 co-blisters
  4: { price: 8, landedSea: 10.75, landedAir: 16, qty26: 0 },               // TDR, kit de 25 tests
  5: { price: 6, landedSea: 7.32, landedAir: 9.492, qty26: 28000 },         // AL 6 cp × 30
  6: { price: 10.3, landedSea: 12.56, landedAir: 14.7187, qty26: 30480 },   // AL 12 cp × 30
  7: { price: 14, landedSea: 17.08, landedAir: 22.4, qty26: 15000 },        // AL 18 cp × 30
  8: { price: 15.72, landedSea: 19.18, landedAir: 23.7686, qty26: 26552 },  // AL 24 cp × 30
  9: { price: 1.33, landedSea: 1.62, landedAir: 2.7863, qty26: 650000 },    // Artésunate 60mg injectable, flacon
  10: { price: 0.7, landedSea: 0.85, landedAir: 1.918, qty26: 10000 },      // Artésunate 100mg suppositoire
  11: { price: 1.81, landedSea: 2.28763366, landedAir: 1.81, qty26: 0 },    // MILDA standard
  12: { price: 2.08, landedSea: 2.62888288, landedAir: 2.08, qty26: 0 },    // MILDA PBO
  13: { price: 2.81, landedSea: 3.55151966, landedAir: 2.81, qty26: 0 },    // MILDA double principe actif
};
/** Coûts de référence (valeurs par défaut) : prix EXW et coûts livrés, sans les quantités. */
export const referenceCosts = () => Object.fromEntries(Object.entries(DEFAULT_PARAMS).map(([id, p]) =>
  [id, { price: p.price, landedSea: p.landedSea, landedAir: p.landedAir }]));

/** Taux de fret implicite (%) d'un intrant pour un mode : landed / EXW − 1. */
export const freightRate = (p, mode) => {
  const price = num(p?.price);
  const landed = num(mode === 'air' ? p?.landedAir : p?.landedSea);
  return price > 0 ? (landed / price - 1) * 100 : 0;
};

export const DEFAULT_BUDGETS = {
  2026: 13321800,
  2027: 10947300,
  2028: 9142167,
  2029: 8034067,
  2030: 7400000,
};

// FY2027 (année à venir) par avion par défaut, pour respecter le plan d'approvisionnement.
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
// du budget de chaque exercice (fichier MOU 27, ligne « Supply Chain Management and
// Warehouse and distribution »). FY2026 : indicative (exercice clos).
export const DEFAULT_RESERVES = { 2026: 1800000, 2027: 1500000, 2028: 1300000, 2029: 1000000, 2030: 800000 };

// Méthode de calcul des quantités des intrants réguliers en FY27-FY30 :
//  quantif — tout le budget réparti selon le split contribution USG (base EXW) : quantités maximales ;
//  manual  — quantités saisies directement.
// (L'ancienne répartition selon le split FY25 a été retirée : les scénarios qui
// l'utilisaient passent en « quantif ».)
export const METHODS = ['quantif', 'manual'];
/** Libellé complet des quantités PSN (à rappeler partout où elles apparaissent). */
export const PSN_LABEL = 'Quantités prévues d’être couvertes par le Gouvernement américain (USG) dans la quantification du Plan stratégique 2027-2031 (PSN)';
export const PSN_SHORT = 'Quantité prévue pour l’USG (quantification PSN 2027-2031)';

export const METHOD_LABEL = { quantif: 'Automatique (split contribution USG)', manual: 'Ajusté manuellement' };
export const DEFAULT_METHODS = { 2027: 'quantif', 2028: 'quantif', 2029: 'quantif', 2030: 'quantif' };

// FY2026 (clos le 30/09/2026) : « planned » = les quantités FY26 saisies ont été
// commandées ; « unspent » = rien n'a été commandé, seules les accruals sont comptées.
export const FY26_SPENDING = ['planned', 'unspent'];
// Report du solde d'une année (FY2026-FY2029) : « next » = en totalité sur l'année
// suivante ; « smooth » = lissé à parts égales sur toutes les années suivantes du MOU ;
// « none » = pas de report.
export const CARRY_RULES = ['next', 'smooth', 'none'];
export const CARRY_LABEL = { next: 'Année suivante', smooth: 'Lissé sur les années suivantes', none: 'Aucun report' };
export const CARRY_YEARS = ['2026', '2027', '2028', '2029'];
export const DEFAULT_CARRY_RULES = { 2026: 'smooth', 2027: 'none', 2028: 'none', 2029: 'none' };
// Accruals (montants engagés) par année ; FY2026 : engagements au 30/09/2026.
export const DEFAULT_YEAR_ACCRUALS = { 2026: 0, 2027: 0, 2028: 0, 2029: 0, 2030: 0 };


const emptyManual = () =>
  Object.fromEntries(YEARS.map((y) => [y, Object.fromEntries(MILDA.map((m) => [m.id, 0]))]));
const emptyRegular = (years = FUTURE_YEARS) =>
  Object.fromEntries(years.map((y) => [y, Object.fromEntries(REGULAR.map((c) => [c.id, 0]))]));

// Quantités prévues pour l'USG dans la quantification du PSN 2027-2031, année 2027
// (scénario de référence du 02/10/2026) ; années suivantes à saisir.
const DEFAULT_PSN_2027 = { 1: 46560, 2: 49623, 3: 146156, 4: 144000, 5: 43447, 6: 47318, 7: 32150, 8: 41236, 9: 1009453, 10: 15519 };

/** Données d'un scénario aux valeurs par défaut (scénario de référence du 02/10/2026). */
export const defaultScenarioData = () => ({
  budgets: { ...DEFAULT_BUDGETS },
  reserves: { ...DEFAULT_RESERVES },
  commodities: JSON.parse(JSON.stringify(DEFAULT_PARAMS)),
  logistics: { ...DEFAULT_LOGISTICS },
  methods: { ...DEFAULT_METHODS },
  fy26Spending: 'unspent',
  yearAccruals: { ...DEFAULT_YEAR_ACCRUALS },
  carryRules: { ...DEFAULT_CARRY_RULES },
  // Moustiquaires (MILDA) : non prévues dans le MOU, masquées et exclues des calculs.
  includeMilda: false,
  manualQtys: emptyManual(),       // MILDA, saisie manuelle (mode Mer)
  quantification: { ...emptyRegular(PSN_YEARS), 2027: { ...DEFAULT_PSN_2027 } },  // quantités prévues pour l'USG, PSN 2027-2031
  regularQtys: emptyRegular(),     // quantités saisies (méthode « manual »), FY27-FY30
});

/** Remise à zéro (Option C) : intrants, accruals, MILDA et quantités à 0 ; budgets, réserves, logistique et méthodes conservés. */
export const zeroedScenarioData = (data) => ({
  ...data,
  commodities: Object.fromEntries(
    COMMODITIES.map((c) => [c.id, { price: 0, landedSea: 0, landedAir: 0, qty26: 0 }])
  ),
  yearAccruals: Object.fromEntries(YEARS.map((y) => [y, 0])),
  manualQtys: emptyManual(),
  quantification: emptyRegular(PSN_YEARS),
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

/**
 * Accruals par année et règles de report. Reprise des anciens formats (résultats
 * inchangés) : liste d'accruals FY2026 + assistance engagée (ou, à défaut, réserve
 * FY2026 considérée comme dépensée) → accruals FY2026 ; « carryover » → règle FY2026 ;
 * pas de report des années suivantes.
 */
const normalizeCarry = (d, def) => {
  if (d.yearAccruals || d.carryRules) {
    const rules = { ...def.carryRules, ...(d.carryRules || {}) };
    for (const y of CARRY_YEARS) if (!CARRY_RULES.includes(rules[y])) rules[y] = 'next';
    const yearAccruals = Object.fromEntries(YEARS.map((y) => [y, num(d.yearAccruals?.[y] ?? def.yearAccruals[y])]));
    // Ancien champ « assistance FY2026 dépensée » : désormais compris dans les accruals FY2026.
    yearAccruals['2026'] += num(d.fy26AssistanceSpent);
    return { yearAccruals, carryRules: rules };
  }
  const hasOld = d.accruals || d.carryover || d.fy26AssistanceSpent !== undefined || d.budgets;
  if (!hasOld) return { yearAccruals: { ...def.yearAccruals }, carryRules: { ...def.carryRules } };
  const acc = accrualsTotal(normalizeAccruals(d.accruals, DEFAULT_ACCRUALS));
  const assist = d.fy26AssistanceSpent ?? num(d.reserves?.['2026']);
  return {
    yearAccruals: { ...Object.fromEntries(YEARS.map((y) => [y, 0])), 2026: acc + num(assist) },
    carryRules: { 2026: d.carryover === 'fy27' ? 'next' : 'smooth', 2027: 'none', 2028: 'none', 2029: 'none' },
  };
};

/** Complète un scénario partiel (import JSON ancien / incomplet) avec les valeurs par défaut. */
export const normalizeScenarioData = (d = {}) => {
  const def = defaultScenarioData();
  const commodities = {};
  for (const c of COMMODITIES) {
    const src = d.commodities?.[c.id];
    // Ancien format (taux de fret en %) : conversion en coûts livrés unitaires.
    const converted = src && (src.landedSea === undefined || src.landedAir === undefined) && ('sea' in src || 'air' in src)
      ? { ...toLanded({ ...REFERENCE_PARAMS[c.id], ...src }), ...src } : src;
    const merged = { ...def.commodities[c.id], ...(converted || {}) };
    commodities[c.id] = { price: num(merged.price), landedSea: num(merged.landedSea), landedAir: num(merged.landedAir), qty26: num(merged.qty26) };
  }
  const nested = (key, years) => Object.fromEntries(years.map((y) => [y, { ...def[key][y], ...(d[key]?.[y] || {}) }]));
  const methods = { ...def.methods, ...(d.methods || {}) };
  for (const y of FUTURE_YEARS) if (!METHODS.includes(methods[y])) methods[y] = 'quantif';
  return {
    budgets: { ...def.budgets, ...(d.budgets || {}) },
    reserves: { ...def.reserves, ...(d.reserves || {}) },
    commodities,
    logistics: { ...def.logistics, ...(d.logistics || {}) },
    methods,
    // Scénarios antérieurs à ces options : on conserve le comportement d'origine
    // (quantités FY26 dépensées, report lissé ÷ 4) pour ne pas changer leurs résultats.
    fy26Spending: FY26_SPENDING.includes(d.fy26Spending) ? d.fy26Spending : 'planned',
    ...normalizeCarry(d, def),
    // Anciens scénarios avec des MILDA saisies : on les garde visibles.
    includeMilda: d.includeMilda ?? YEARS.some((y) => MILDA.some((m) => num(d.manualQtys?.[y]?.[m.id]) > 0)),
    manualQtys: nested('manualQtys', YEARS),
    quantification: nested('quantification', PSN_YEARS),
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
  return { id: c.id, name: c.name, plain: c.plain || c.name, use: c.use || '', unit: c.unit || '', category: c.category, isMilda: !!c.isMilda, qty, price, rate: ratePct, exw, freight, landed: exw + freight };
};

const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);

const floorQty = (x) => Math.max(0, Math.floor(x + 1e-9));

/**
 * Répartit un budget landed entre les intrants réguliers selon des poids EXW
 * (w_i normalisés) : E_tot = budget / Σ w_i (1 + r_i), Q_i = ⌊E_tot × w_i / P_i⌋.
 */
const allocate = (budget, weights, price, rate) => {
  const factor = REGULAR.reduce((s, c) => s + weights[c.id] * (1 + rate(c.id) / 100), 0);
  const eTot = factor > 0 && budget > 0 ? budget / factor : 0;
  const qtys = Object.fromEntries(REGULAR.map((c) => {
    const pr = price(c.id);
    return [c.id, pr > 0 ? floorQty((eTot * weights[c.id]) / pr) : 0];
  }));
  return { eTot, qtys };
};

/** Split contribution USG d'une année : part de chaque intrant dans la valeur EXW des quantités PSN. */
export const psnSplit = (data, year) => {
  const values = Object.fromEntries(REGULAR.map((c) => [c.id,
    floorQty(num(data.quantification?.[year]?.[c.id])) * num(data.commodities[c.id]?.price)]));
  const tot = REGULAR.reduce((s, c) => s + values[c.id], 0);
  return Object.fromEntries(REGULAR.map((c) => [c.id, tot > 0 ? values[c.id] / tot : 0]));
};

/** Quantités FY27-30 d'une méthode donnée, pour un budget résiduel (utilisé aussi par les boutons de pré-remplissage). */
export const quantitiesFor = (data, year, method, residual) => {
  const p = (id) => data.commodities[id] || {};
  const price = (id) => num(p(id).price);
  const rate = (id) => freightRate(p(id), data.logistics[year]);
  if (method === 'manual') {
    return { eTot: null, qtys: Object.fromEntries(REGULAR.map((c) => [c.id, floorQty(num(data.regularQtys?.[year]?.[c.id]))])) };
  }
  // quantif
  {
    const weights = psnSplit(data, year);
    // Tout le budget est réparti selon le split contribution USG (quantités maximales achetables).
    return allocate(residual, weights, price, rate);
  }
};

// ─── Simulation FY26-FY30 (§3) ──────────────────────────────────────────────
export const simulate = (data) => {
  const { budgets, reserves = {}, commodities, logistics, manualQtys, methods = {}, quantification = {} } = data;
  const fy26Unspent = data.fy26Spending === 'unspent';
  const p = (id) => commodities[id] || {};
  const rateFor = (id, mode) => freightRate(p(id), mode);
  const mildaLines = (y) =>
    data.includeMilda && logistics[y] === 'sea'
      ? MILDA.map((m) => line(m, floorQty(num(manualQtys?.[y]?.[m.id])), num(p(m.id).price), freightRate(p(m.id), 'sea')))
      : [];

  // Report des soldes : chaque année (FY2026-FY2029) transmet son solde à l'année
  // suivante ou le lisse sur toutes les années suivantes, selon sa règle.
  const yearAccruals = data.yearAccruals || {};
  const carryRules = data.carryRules || {};
  const carryIn = Object.fromEntries(FUTURE_YEARS.map((y) => [y, 0]));
  const distribute = (from, amount) => {
    const rule = carryRules[from] || 'none';
    const after = FUTURE_YEARS.filter((y) => y > from);
    if (!after.length || rule === 'none' || !amount) return 0;
    if (rule === 'next') carryIn[after[0]] += amount;
    else after.forEach((y) => { carryIn[y] += amount / after.length; });
    return amount;
  };

  // FY 2026 (clos au 30/09/2026) : solde = budget − accruals (− commandes FY26 saisies,
  // anciens scénarios). Les accruals couvrent tout l'engagé (produits et assistance) ;
  // la réserve prévue n'est donc pas déduite.
  const mode26 = logistics['2026'];
  const regular26 = REGULAR.map((c) => line(c, fy26Unspent ? 0 : Math.max(0, num(p(c.id).qty26)), num(p(c.id).price), rateFor(c.id, mode26)));
  const milda26 = fy26Unspent ? [] : mildaLines('2026');
  const base26 = num(budgets['2026']);
  const accruals26 = num(yearAccruals['2026']);
  const reserve26 = num(reserves['2026']);
  const available26 = base26 - accruals26;
  const total26 = sum(regular26, 'landed') + sum(milda26, 'landed');
  const surplus = available26 - total26;
  const result = {
    2026: {
      year: '2026', mode: mode26, method: 'fy26', unspent: fy26Unspent, base: base26, reserve: reserve26, accruals: accruals26, bonus: 0,
      available: available26, assistance: 0, lines: [...regular26, ...milda26], mildaCost: sum(milda26, 'landed'),
      totalExw: sum(regular26, 'exw') + sum(milda26, 'exw'), totalFreight: sum(regular26, 'freight') + sum(milda26, 'freight'),
      total: total26, balance: surplus, carryRule: carryRules['2026'] || 'none', carryOut: distribute('2026', surplus),
    },
  };

  // FY 2027-2030 : budget produits = budget + report reçu − réserve − accruals.
  for (const y of FUTURE_YEARS) {
    const mode = logistics[y];
    const method = METHODS.includes(methods[y]) ? methods[y] : 'quantif';
    const base = num(budgets[y]);
    const reserve = num(reserves[y]);
    const accruals = num(yearAccruals[y]);
    const received = carryIn[y];
    const available = base + received - reserve - accruals;
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
    const balance = available - total;
    result[y] = {
      year: y, mode, method, base, reserve, accruals, bonus: received, available, assistance: reserve,
      residual, eTot, lines: [...regular, ...milda], mildaCost, needLanded,
      totalExw: sum(regular, 'exw') + sum(milda, 'exw'),
      totalFreight: sum(regular, 'freight') + sum(milda, 'freight'),
      total, balance, carryRule: y === '2030' ? 'none' : (carryRules[y] || 'none'), carryOut: y === '2030' ? 0 : distribute(y, balance),
    };
  }
  return { years: result, surplus, totalBalance: surplus, carryIn };
};

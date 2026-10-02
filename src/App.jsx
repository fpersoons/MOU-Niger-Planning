// ─── Planificateur Budgétaire Intrants Paludisme FY26-FY30 ──────────────────
// GHSC-PSM — U.S. Department of State | Bureau of Global Health Security and
// Diplomacy (GHSD). Preset couleurs : CHEMONICS (DESIGN_SYSTEM.md).
// Données : JSON dans le navigateur (localStorage), multi-scénarios,
// sauvegarde automatique ; export Excel par scénario ; import/export JSON.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES, COMMODITIES, FUTURE_YEARS, METHODS, METHOD_LABEL, MILDA, REGULAR, YEARS, defaultScenarioData,
  normalizeScenarioData, num, quantitiesFor, simulate, splitStatus, zeroedScenarioData,
} from './model.js';
import { exportScenarioXlsx, importWorkbook } from './excel.js';
import {
  AlertTriangle, BookOpen, Calculator, CheckCircle2, ChevronDown, ChevronRight, Circle, Cloud, CloudCheck,
  Copy, Database, Download, FileSpreadsheet, Info, Landmark, Layers, Package, Plane, Plus,
  Repeat, RotateCcw, ShieldCheck, Trash2, TrendingUp, Upload, Waves,
} from './icons.jsx';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ghsc-psm-planificateur-paludisme-v1';
const DRIVE_FILE_ID = '1e2J9WXyNFNI4DYm1JX4V5H1jVxMLoFnQ';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;
const MODE_LABEL = { air: 'Air', sea: 'Mer' };
const CAT_LABEL = {
  'Prevention Commodity Procurement': 'Prevention Commodity Procurement',
  'Diagnostic Commodity Procurement': 'Diagnostic Commodity Procurement',
  'Therapeutic Commodity Procurement': 'Therapeutic Commodity Procurement',
  OTHER: 'OTHER',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n, d = 0) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtUsd = (n, d = 2) => `${fmtNum(n, d)} $`;
const fmtSigned = (n, d = 2) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNum(Math.abs(n), d)} $`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const newScenario = (name, data = defaultScenarioData()) => ({ id: uid(), name, updatedAt: new Date().toISOString(), data });

const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.scenarios) && s.scenarios.length) {
        const scenarios = s.scenarios.map((x) => ({ ...x, data: normalizeScenarioData(x.data) }));
        return { activeId: scenarios.some((x) => x.id === s.activeId) ? s.activeId : scenarios[0].id, scenarios };
      }
    }
  } catch { /* stockage indisponible ou corrompu : on repart des valeurs par défaut */ }
  const first = newScenario('Scénario de référence');
  return { activeId: first.id, scenarios: [first] };
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Rôles de couleur (preset CHEMONICS)
const POS = { text: 'text-chem-darkgreen2', bg: 'bg-chem-green2-20', border: 'border-chem-green2-40', icon: 'text-chem-green2' };
const NEG = { text: 'text-chem-eggplant', bg: 'bg-chem-orange2-15', border: 'border-chem-orange2/40', icon: 'text-chem-orange2' };
const role = (n) => (n >= 0 ? POS : NEG);

// ─── Composants de base ─────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <section className={`bg-white p-3 rounded-2xl border border-chem-gray1-20 shadow-sm ${className}`}>{children}</section>
);

const SectionHeader = ({ icon: Icon, title, subtitle, color = 'text-chem-darkblue', help, action }) => {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <div className={`flex items-center justify-between mb-1.5 border-b border-chem-gray1-10 pb-1 ${color}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon w={14} />
          <div className="min-w-0">
            <h3 className="text-[12px] font-bold uppercase tracking-wider truncate">{title}</h3>
            {subtitle && <p className="text-[9px] font-medium text-chem-gray2 italic truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {action}
          {help && (
            <button type="button" onClick={() => setShowHelp((v) => !v)} aria-label={`Aide — ${title}`} aria-expanded={showHelp}
              className={`p-1 rounded-lg transition-all ${showHelp ? 'text-chem-darkblue bg-chem-blue-10' : 'text-chem-gray1-40 hover:text-chem-darkblue'}`}>
              <Info w={11} />
            </button>
          )}
        </div>
      </div>
      {showHelp && (
        <div className="mb-2 px-2.5 py-2 bg-chem-blue-10 rounded-xl border border-chem-blue-20 text-[9px] text-chem-darkblue font-medium leading-relaxed">{help}</div>
      )}
    </>
  );
};

/** Champ numérique : brouillon texte local (virgule acceptée), valeur numérique remontée. */
const NumInput = ({ value, onChange, className = '', disabled, ariaLabel }) => {
  const [draft, setDraft] = useState(null);
  const empty = value === '' || value === null || value === undefined;
  // Hors saisie : format fr-FR (séparateur de milliers) ; en saisie : valeur brute.
  const shown = draft ?? (empty ? '' : (Number(value) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 4 }));
  return (
    <input type="text" inputMode="decimal" aria-label={ariaLabel} disabled={disabled}
      value={shown}
      onFocus={(e) => {
        const el = e.target;
        setDraft(empty ? '' : String(value).replace('.', ','));
        // Le passage au format brut fait perdre la sélection : on resélectionne tout,
        // pour qu'une frappe remplace la valeur au lieu de s'y ajouter.
        requestAnimationFrame(() => { if (document.activeElement === el) el.select(); });
      }}
      onChange={(e) => { setDraft(e.target.value); onChange(num(e.target.value)); }}
      onBlur={() => setDraft(null)}
      className={`bg-white border border-chem-gray1-20 rounded-md px-1.5 py-0.5 text-[12px] font-normal text-right text-chem-gray1 focus:outline-none focus:border-chem-darkblue disabled:bg-chem-gray1-10 disabled:text-chem-gray1-40 disabled:cursor-not-allowed ${className}`} />
  );
};

const ModeBadge = ({ mode }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full border ${mode === 'air' ? 'bg-chem-blue-10 text-chem-darkblue border-chem-blue-20' : 'bg-white text-chem-darkaqua border-chem-aqua/40'}`}>
    {mode === 'air' ? <Plane w={10} /> : <Waves w={10} />} {MODE_LABEL[mode]}
  </span>
);

const SyncIndicator = ({ status }) => {
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-chem-gray2">
      <span className="w-2 h-2 bg-chem-blue rounded-full animate-pulse" /> Synchronisation…
    </span>
  );
  if (status === 'error') return (
    <span className={`flex items-center gap-1.5 ${NEG.text} ${NEG.bg} px-2 py-0.5 rounded-full border ${NEG.border} text-[10px] font-semibold uppercase`}>
      <AlertTriangle w={12} /> Erreur sync
    </span>
  );
  return (
    <span className={`flex items-center gap-1.5 ${POS.text} ${POS.bg} px-2 py-0.5 rounded-full border ${POS.border} text-[10px] font-semibold uppercase`} title="Données enregistrées dans ce navigateur">
      <CloudCheck w={12} /> Sauvegardé
    </span>
  );
};

// ─── Application ─────────────────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(loadStore);
  const [sync, setSync] = useState('saved');
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'error' | 'info', text }
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(() => Object.fromEntries(YEARS.map((y) => [y, true])));
  const fileRef = useRef(null);
  const jsonRef = useRef(null);
  const firstRender = useRef(true);

  const scenario = store.scenarios.find((s) => s.id === store.activeId) || store.scenarios[0];
  const data = scenario.data;

  // ─── Sauvegarde automatique (debounce 1,5 s) ───
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setSync('saving');
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...store })); setSync('saved'); }
      catch { setSync('error'); }
    }, 1500);
    return () => clearTimeout(t);
  }, [store]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.kind === 'error' ? 12000 : 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // ─── Mutations ───
  const updateData = useCallback((fn) => {
    setStore((s) => ({
      ...s,
      scenarios: s.scenarios.map((x) => (x.id === s.activeId ? { ...x, updatedAt: new Date().toISOString(), data: fn(x.data) } : x)),
    }));
  }, []);

  const updateField = (id, field, value) =>
    updateData((d) => ({ ...d, commodities: { ...d.commodities, [id]: { ...d.commodities[id], [field]: value } } }));
  const updateManualQty = (year, id, value) =>
    updateData((d) => ({ ...d, manualQtys: { ...d.manualQtys, [year]: { ...d.manualQtys[year], [id]: Math.max(0, Math.floor(value)) } } }));
  const updateAccruals = (field, value) => updateData((d) => ({ ...d, accruals: { ...d.accruals, [field]: value } }));
  const setMode = (year, mode) => updateData((d) => ({ ...d, logistics: { ...d.logistics, [year]: mode } }));
  const setBudget = (year, value) => updateData((d) => ({ ...d, budgets: { ...d.budgets, [year]: value } }));
  const setReserve = (year, value) => updateData((d) => ({ ...d, reserves: { ...d.reserves, [year]: Math.max(0, value) } }));
  const setMethod = (year, method) => updateData((d) => ({ ...d, methods: { ...d.methods, [year]: method } }));
  const setMaximize = (year, on) => updateData((d) => ({ ...d, maximize: { ...d.maximize, [year]: on } }));
  const setYearQty = (key, year, id, value) =>
    updateData((d) => ({ ...d, [key]: { ...d[key], [year]: { ...d[key][year], [id]: Math.max(0, Math.floor(value)) } } }));
  // Pré-remplit les quantités manuelles d'un exercice (source : quantification brute,
  // quantification ajustée au budget, split FY25 ou zéro), puis passe en méthode manuelle.
  const fillRegularQtys = (year, source) => updateData((d) => {
    const residual = simulate(d).years[year].residual;
    const qtys = source === 'zero' ? Object.fromEntries(REGULAR.map((c) => [c.id, 0]))
      : source === 'need' ? { ...d.quantification[year] }
      : quantitiesFor(d, year, source, residual).qtys;
    return { ...d, methods: { ...d.methods, [year]: 'manual' }, regularQtys: { ...d.regularQtys, [year]: qtys } };
  });

  const addScenario = (name, scData) => {
    const sc = newScenario(name, scData);
    setStore((s) => ({ activeId: sc.id, scenarios: [...s.scenarios, sc] }));
    return sc;
  };
  const uniqueName = (base) => {
    const names = new Set(store.scenarios.map((s) => s.name));
    if (!names.has(base)) return base;
    let i = 2; while (names.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  };
  const renameScenario = (id, name) => setStore((s) => ({ ...s, scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, name } : x)) }));
  const deleteScenario = (sc) => {
    if (store.scenarios.length <= 1) return;
    if (!window.confirm(`Supprimer le scénario « ${sc.name} » ?\nToutes ses données seront perdues.`)) return;
    setStore((s) => {
      const scenarios = s.scenarios.filter((x) => x.id !== sc.id);
      return { activeId: s.activeId === sc.id ? scenarios[0].id : s.activeId, scenarios };
    });
  };

  // ─── Calculs mémoïsés ───
  const simulationData = useMemo(() => simulate(data), [data]);
  const split = useMemo(() => splitStatus(data.commodities), [data.commodities]);

  // ─── Handlers données ───
  const applyImported = (buffer, label) =>
    importWorkbook(buffer, data).then(({ data: imported, found }) => {
      if (!found) throw new Error('Aucun intrant reconnu : le fichier doit contenir un tableau avec une colonne « Intrant » et les colonnes Split, Prix EXW, Fret Air, Fret Mer, Qté FY26.');
      addScenario(uniqueName(label), imported);
      setNotice({ kind: 'ok', text: `${found} intrant(s) importé(s) dans le nouveau scénario « ${label} ».` });
    });

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('import');
    try {
      await applyImported(await file.arrayBuffer(), file.name.replace(/\.(xlsx|xls)$/i, ''));
    } catch (err) {
      setNotice({ kind: 'error', text: `Import impossible : ${err.message || 'fichier illisible.'}` });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = ''; // permet de recharger le même fichier
    }
  };

  const handleDriveImport = async () => {
    setBusy('drive');
    try {
      const res = await fetch(DRIVE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await applyImported(await res.arrayBuffer(), 'Google Drive');
    } catch (err) {
      const cors = err instanceof TypeError;
      setNotice({
        kind: 'error',
        text: cors
          ? 'Google Drive bloque la lecture directe depuis le navigateur (sécurité CORS). Téléchargez le fichier depuis Drive, puis chargez-le avec l’option B « Fichier local ».'
          : `Lecture Google Drive impossible (${err.message}). Utilisez l’option B « Fichier local ».`,
      });
    } finally { setBusy(null); }
  };

  const handleReset = () => {
    if (!window.confirm(`Remettre à zéro le scénario « ${scenario.name} » ?\nPrix, taux, splits, quantités et accruals passent à 0 (budgets et logistique conservés).`)) return;
    updateData((d) => zeroedScenarioData(d));
    setNotice({ kind: 'info', text: 'Scénario remis à zéro. Rechargez un fichier (option A ou B) ou créez un scénario par défaut.' });
  };

  const handleExport = async (sc = scenario) => {
    setBusy(`xlsx-${sc.id}`);
    try { await exportScenarioXlsx(sc); }
    catch (err) { setNotice({ kind: 'error', text: `Export Excel impossible : ${err.message}` }); }
    finally { setBusy(null); }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...store }, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `planificateur-paludisme-scenarios_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed.scenarios) ? parsed.scenarios : parsed.data ? [parsed] : null;
      if (!list?.length) throw new Error('aucun scénario trouvé dans le fichier.');
      const names = new Set(store.scenarios.map((s) => s.name));
      const added = list.map((x) => {
        let name = x.name || 'Scénario importé';
        if (names.has(name)) name = `${name} (import)`;
        names.add(name);
        return { id: uid(), name, updatedAt: x.updatedAt || new Date().toISOString(), data: normalizeScenarioData(x.data) };
      });
      setStore((s) => ({ activeId: added[0].id, scenarios: [...s.scenarios, ...added] }));
      setNotice({ kind: 'ok', text: `${added.length} scénario(s) importé(s) depuis le fichier JSON.` });
    } catch (err) {
      setNotice({ kind: 'error', text: `Fichier JSON invalide : ${err.message}` });
    } finally {
      if (jsonRef.current) jsonRef.current.value = '';
    }
  };

  const { surplus, bonus } = simulationData;

  // ─── Rendu ───
  return (
    <div className="min-h-screen bg-chem-gray1-5 text-chem-gray1 p-2 md:p-3 font-sans text-[13px]">
      <div className="max-w-[1600px] mx-auto space-y-3">
        {/* ─── En-tête ─── */}
        <header className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
          <div className="flex flex-wrap justify-between items-center p-2 px-4 gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-wrap">
              <img src="./assets/logo-state.webp" alt="U.S. Department of State" className="h-6 md:h-7 w-auto" />
              <div className="border-l border-chem-gray1-20 pl-4 min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-chem-gray1 flex items-center gap-1.5">
                  <ShieldCheck w={14} className="text-chem-blue" /> Planificateur Budgétaire Intrants Paludisme FY26-FY30
                </h1>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-chem-gray2 flex items-center gap-1 flex-wrap">
                  <Landmark w={10} className="text-chem-darkblue" />
                  GHSC-PSM · Bureau of Global Health Security and Diplomacy · Department of State
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SyncIndicator status={sync} />
              <a href="./guide.html" target="_blank" rel="noopener"
                className="flex items-center gap-1 px-2 py-1 bg-chem-blue-10 border border-chem-blue-20 rounded-xl font-semibold text-[10px] text-chem-darkblue hover:bg-chem-blue-20 uppercase transition-all">
                <BookOpen w={11} /> Guide
              </a>
              <button type="button" onClick={() => jsonRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 bg-chem-gray1-10 rounded-xl font-semibold text-[10px] uppercase hover:bg-chem-gray1-20 transition-all">
                <Upload w={11} /> Import JSON
              </button>
              <input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJson} />
              <button type="button" onClick={handleExportJson}
                className="flex items-center gap-1 px-2 py-1 bg-chem-gray1-10 rounded-xl font-semibold text-[10px] uppercase hover:bg-chem-gray1-20 transition-all">
                <Download w={11} /> Export JSON
              </button>
              <button type="button" onClick={() => handleExport()} disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-chem-darkblue text-white rounded-xl font-semibold text-[10px] uppercase hover:bg-chem-gray1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-wait">
                {busy === `xlsx-${scenario.id}` ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet w={12} />}
                Exporter Excel
              </button>
            </div>
          </div>
          <div className="h-1 bg-chem-green1" aria-hidden="true" />
        </header>

        {notice && (
          <div role="status" className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium ${
            notice.kind === 'error' ? `${NEG.bg} ${NEG.border} ${NEG.text}` : notice.kind === 'ok' ? `${POS.bg} ${POS.border} ${POS.text}` : 'bg-chem-blue-10 border-chem-blue-20 text-chem-darkblue'}`}>
            {notice.kind === 'error' ? <AlertTriangle w={14} /> : <CheckCircle2 w={14} />}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fermer le message" className="text-[10px] font-semibold uppercase opacity-70 hover:opacity-100">Fermer</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* ─── Volet gauche : configuration ─── */}
          <aside className="lg:col-span-3 space-y-3">
            {/* Gestion des données */}
            <Card>
              <SectionHeader icon={Database} title="Gestion des données" subtitle={`Scénario actif : ${scenario.name}`}
                help="Les options A et B créent un nouveau scénario à partir du fichier Excel (le scénario actif n’est pas écrasé). Le fichier attendu est celui exporté par l’application (feuille « Paramètres ») ou tout classeur contenant un tableau avec une colonne « Intrant ». L’option C remet le scénario actif à zéro." />
              <div className="space-y-2">
                <div className={`p-2 rounded-xl border ${POS.bg} ${POS.border}`}>
                  <p className={`text-[10px] font-semibold uppercase ${POS.text} flex items-center gap-1`}><Cloud w={11} /> A · Cloud Google Drive</p>
                  <p className="text-[9px] text-chem-gray2 mt-0.5">Fichier de référence partagé (ID {DRIVE_FILE_ID.slice(0, 8)}…)</p>
                  <button type="button" onClick={handleDriveImport} disabled={!!busy}
                    className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-white border border-chem-green2-40 rounded-xl font-semibold text-[10px] uppercase text-chem-darkgreen2 hover:bg-chem-green2-20 transition-all disabled:opacity-60 disabled:cursor-wait">
                    {busy === 'drive' ? <span className="w-3 h-3 border-2 border-chem-green2-40 border-t-chem-darkgreen2 rounded-full animate-spin" /> : <Download w={11} />} Charger depuis Drive
                  </button>
                </div>
                <div className="p-2 rounded-xl border bg-chem-blue-10 border-chem-blue-20">
                  <p className="text-[10px] font-semibold uppercase text-chem-darkblue flex items-center gap-1"><FileSpreadsheet w={11} /> B · Fichier local (.xlsx)</p>
                  <label className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-white border border-chem-blue-20 rounded-xl font-semibold text-[10px] uppercase text-chem-darkblue hover:bg-chem-blue-20 transition-all cursor-pointer">
                    {busy === 'import' ? <span className="w-3 h-3 border-2 border-chem-blue-20 border-t-chem-darkblue rounded-full animate-spin" /> : <Upload w={11} />} Choisir un fichier
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleImport} />
                  </label>
                </div>
                <div className={`p-2 rounded-xl border ${NEG.bg} ${NEG.border}`}>
                  <p className={`text-[10px] font-semibold uppercase ${NEG.text} flex items-center gap-1`}><RotateCcw w={11} /> C · Remise à zéro</p>
                  <button type="button" onClick={handleReset}
                    className={`mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-white border ${NEG.border} rounded-xl font-semibold text-[10px] uppercase ${NEG.text} hover:bg-chem-orange2-15 transition-all`}>
                    <RotateCcw w={11} /> Remettre à zéro
                  </button>
                </div>
              </div>
            </Card>

            {/* Configuration des intrants */}
            <Card>
              <SectionHeader icon={Package} title="Configuration des intrants" subtitle="Split FY25, prix EXW, taux de fret, quantités FY26"
                help="Le split FY25 répartit la valeur EXW (et non le coût landed) des intrants réguliers en FY27-FY30 ; il est normalisé, mais doit totaliser 100 %. Les taux de fret sont en % du prix EXW. Les MILDA voyagent uniquement par mer : leur taux Air est désactivé et leurs quantités se saisissent directement dans les tableaux annuels." />
              <div className={`flex items-center gap-2 px-2 py-1.5 mb-2 rounded-xl border-2 ${split.ok ? `${POS.bg} border-chem-green2` : `${NEG.bg} border-chem-orange2`}`}>
                {split.ok ? <CheckCircle2 w={16} className={POS.icon} /> : <AlertTriangle w={16} className={NEG.icon} />}
                <div className={`flex-1 ${split.ok ? POS.text : NEG.text}`}>
                  <p className="text-[10px] font-semibold uppercase">Split FY25 {split.ok ? 'valide' : 'à corriger'}</p>
                  <p className="text-[9px]">Total : {fmtNum(split.total, 2)} %{split.ok ? '' : ` (écart ${fmtSigned(split.total - 100, 2).replace(' $', ' pt')})`}</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {COMMODITIES.map((c) => {
                  const p = data.commodities[c.id];
                  return (
                    <div key={c.id} className="p-2 rounded-xl border bg-chem-gray1-5 border-chem-gray1-10">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase truncate" title={c.name}>{c.name}</p>
                        {c.isMilda
                          ? <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-white text-chem-darkaqua border border-chem-aqua/40">Mer seule</span>
                          : (
                            <label className="flex items-center gap-1 text-[9px] font-semibold uppercase text-chem-gray2">
                              Split <NumInput value={p.split} onChange={(v) => updateField(c.id, 'split', v)} ariaLabel={`Split FY25 — ${c.name}`} className="w-14" /> %
                            </label>
                          )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mt-1">
                        <label className="text-[9px] font-semibold uppercase text-chem-gray2">Prix EXW $
                          <NumInput value={p.price} onChange={(v) => updateField(c.id, 'price', v)} ariaLabel={`Prix EXW — ${c.name}`} className="w-full block mt-0.5" />
                        </label>
                        <label className="text-[9px] font-semibold uppercase text-chem-gray2">Air %
                          <NumInput value={c.isMilda ? '' : p.air} disabled={c.isMilda} onChange={(v) => updateField(c.id, 'air', v)} ariaLabel={`Taux fret air — ${c.name}`} className="w-full block mt-0.5" />
                        </label>
                        <label className="text-[9px] font-semibold uppercase text-chem-gray2">Mer %
                          <NumInput value={p.sea} onChange={(v) => updateField(c.id, 'sea', v)} ariaLabel={`Taux fret mer — ${c.name}`} className="w-full block mt-0.5" />
                        </label>
                      </div>
                      {!c.isMilda && (
                        <label className="flex items-center justify-between gap-2 mt-1 text-[9px] font-semibold uppercase text-chem-gray2">
                          Qté FY26
                          <NumInput value={p.qty26} onChange={(v) => updateField(c.id, 'qty26', Math.max(0, v))} ariaLabel={`Quantité FY26 — ${c.name}`} className="w-28" />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Paramètres annuels */}
            <Card>
              <SectionHeader icon={Repeat} title="Paramètres annuels" subtitle="Fret, budget, réserve d’assistance et méthode"
                help="Mode Air ou Mer : taux de fret appliqués ; en Mer, les MILDA deviennent éligibles (saisie dans le tableau de l’exercice). Budget total : budget brut de l’exercice. Réserve d’assistance : montant réservé à l’assistance technique, à l’entreposage et à la distribution, déduit du budget total. Méthode (FY27-FY30) : Split FY25, Split quantification (répartition selon les quantités demandées par le Niger, réduites au prorata si le budget ne suffit pas ; si le budget dépasse les besoins, la case « Maximiser le budget » répartit aussi le surplus dans les mêmes proportions, sinon les quantités sont plafonnées aux besoins) ou Quantités manuelles (saisie directe dans le tableau de l’exercice)." />
              <div className="space-y-1.5">
                {YEARS.map((y) => {
                  const yr = simulationData.years[y];
                  return (
                    <div key={y} className="p-2 rounded-xl bg-chem-gray1-5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase w-14">FY {y}</span>
                        <div className="flex rounded-xl border border-chem-gray1-20 overflow-hidden" role="group" aria-label={`Mode logistique FY ${y}`}>
                          {['air', 'sea'].map((m) => {
                            const active = data.logistics[y] === m;
                            return (
                              <button key={m} type="button" onClick={() => setMode(y, m)} aria-pressed={active}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase transition-all ${active ? 'bg-chem-darkblue text-white' : 'bg-white text-chem-gray2 hover:bg-chem-blue-10'}`}>
                                {m === 'air' ? <Plane w={11} /> : <Waves w={11} />} {MODE_LABEL[m]}
                              </button>
                            );
                          })}
                        </div>
                        {y !== '2026' && (
                          <select value={data.methods[y]} onChange={(e) => setMethod(y, e.target.value)} aria-label={`Méthode de calcul FY ${y}`}
                            className="flex-1 min-w-0 bg-white border border-chem-gray1-20 rounded-md px-1 py-0.5 text-[10px] font-semibold text-chem-darkblue focus:outline-none focus:border-chem-darkblue">
                            {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
                          </select>
                        )}
                      </div>
                      {y !== '2026' && data.methods[y] === 'quantif' && (
                        <label className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-chem-gray2 cursor-pointer"
                          title="Coché : tout le budget est réparti selon la quantification, même au-delà des besoins. Décoché : plafonné aux besoins.">
                          <input type="checkbox" checked={!!data.maximize[y]} onChange={(e) => setMaximize(y, e.target.checked)}
                            className="accent-chem-darkblue w-3.5 h-3.5" />
                          Maximiser le budget (au-delà des besoins)
                        </label>
                      )}
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="text-[9px] font-semibold uppercase text-chem-gray2">Budget total $
                          <NumInput value={data.budgets[y]} onChange={(v) => setBudget(y, v)} ariaLabel={`Budget total FY ${y}`} className="w-full block mt-0.5" />
                        </label>
                        <label className="text-[9px] font-semibold uppercase text-chem-gray2">Réserve assistance $
                          <NumInput value={data.reserves[y]} onChange={(v) => setReserve(y, v)} ariaLabel={`Réserve d’assistance FY ${y}`} className="w-full block mt-0.5" />
                        </label>
                      </div>
                      <p className="text-[9px] text-chem-gray2 text-right">
                        Budget intrants {y === '2026' ? '' : '(report inclus) '}: <span className="text-chem-gray1">{fmtUsd(yr.available, 0)}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </aside>

          {/* ─── Volet principal : tableaux annuels ─── */}
          <main className="lg:col-span-7 space-y-3">
            <QuantificationCard data={data} sim={simulationData} onChange={(y, id, v) => setYearQty('quantification', y, id, v)} />
            {YEARS.map((y) => (
              <YearTable key={y} yr={simulationData.years[y]} isOpen={open[y]} onToggle={() => setOpen((o) => ({ ...o, [y]: !o[y] }))}
                data={data} updateAccruals={updateAccruals} updateManualQty={updateManualQty}
                updateRegularQty={(id, v) => setYearQty('regularQtys', y, id, v)} fillRegularQtys={(src) => fillRegularQtys(y, src)} />
            ))}
          </main>

          {/* ─── Volet droit : KPI & scénarios ─── */}
          <aside className="lg:col-span-2 space-y-3">
            <div className={`p-4 rounded-[1.5rem] border shadow-lg ${role(surplus).bg} ${role(surplus).border}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-tighter ${role(surplus).text} flex items-center gap-1`}><TrendingUp w={12} /> Surplus FY2026</p>
              <p className={`text-3xl font-normal tracking-tight ${role(surplus).text} mt-1 break-words`}>{fmtSigned(surplus, 0)}</p>
              <p className="text-[9px] text-chem-gray2 mt-1">Budget FY26 − réserve d’assistance − dépenses FY26 (accruals inclus)</p>
            </div>
            <Card>
              <p className="text-[10px] font-semibold uppercase tracking-tighter text-chem-gray2 flex items-center gap-1"><Layers w={12} className="text-chem-blue" /> Report annuel lissé</p>
              <p className={`text-base font-normal mt-1 ${role(bonus).text}`}>{fmtSigned(bonus, 0)}</p>
              <p className="text-[9px] text-chem-gray2">Surplus FY26 / 4, ajouté à FY27, FY28, FY29 et FY30</p>
            </Card>

            <ScenarioList store={store} busy={busy}
              onSelect={(id) => setStore((s) => ({ ...s, activeId: id }))}
              onRename={renameScenario}
              onNew={() => addScenario(uniqueName('Nouveau scénario'))}
              onDuplicate={(sc) => addScenario(uniqueName(`${sc.name} (copie)`), JSON.parse(JSON.stringify(sc.data)))}
              onDelete={deleteScenario}
              onExport={handleExport} />
          </aside>
        </div>

        {/* ─── Synthèse pluriannuelle ─── */}
        <Synthesis sim={simulationData} />

        <footer className="text-center text-[9px] text-chem-gray2 py-2">
          U.S. Government Global Health Supply Chain Program — Procurement and Supply Management (GHSC-PSM) · Données enregistrées localement dans ce navigateur
        </footer>
      </div>
    </div>
  );
}

// ─── Quantification Niger (besoins FY27-FY30) ────────────────────────────────
function QuantificationCard({ data, sim, onChange }) {
  const [isOpen, setIsOpen] = useState(() => REGULAR.some((c) => FUTURE_YEARS.some((y) => num(data.quantification[y][c.id]) > 0)));
  const td = 'px-1.5 py-1 text-right';
  return (
    <section className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen} className="flex items-center gap-2 flex-1 text-left">
          {isOpen ? <ChevronDown w={16} className="text-chem-darkblue" /> : <ChevronRight w={16} className="text-chem-gray1-40" />}
          <span className={`text-[13px] font-bold tracking-tight ${isOpen ? 'text-chem-darkblue' : ''}`}>Quantification Niger</span>
          <span className="text-[9px] font-medium italic text-chem-gray2">quantités demandées au gouvernement américain, FY27-FY30</span>
        </button>
      </div>
      {isOpen && (
        <div className="border-t border-chem-gray1-10 overflow-x-auto">
          <p className="px-3 py-1.5 text-[9px] text-chem-darkblue bg-chem-blue-10 border-b border-chem-blue-20">
            Ces besoins servent à la méthode « Split quantification » et au pré-remplissage des quantités manuelles ; leur couverture s’affiche dans chaque tableau annuel.
          </p>
          <table className="w-full min-w-[600px] tabular-nums">
            <thead>
              <tr className="bg-chem-gray1-5 text-chem-gray2 border-b border-chem-gray1-20 text-[10px] font-semibold uppercase">
                <th className="px-2 py-1.5 text-left">Intrant</th>
                <th className="px-1.5 py-1.5 text-right">Prix EXW</th>
                {FUTURE_YEARS.map((y) => <th key={y} className="px-1.5 py-1.5 text-right">FY {y}</th>)}
              </tr>
            </thead>
            <tbody>
              {REGULAR.map((c) => (
                <tr key={c.id} className="border-b border-chem-gray1-10 text-[11px]">
                  <td className="px-2 py-1 font-semibold">{c.name}</td>
                  <td className={`${td} text-chem-gray2`}>{fmtUsd(data.commodities[c.id].price)}</td>
                  {FUTURE_YEARS.map((y) => (
                    <td key={y} className={td}>
                      <NumInput value={data.quantification[y][c.id]} onChange={(v) => onChange(y, c.id, v)} ariaLabel={`Quantification ${c.name} FY ${y}`} className="w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="text-[10px]">
              <tr className="border-t border-chem-gray1-20">
                <td className="px-2 py-1 font-semibold uppercase text-chem-gray2" colSpan={2}>Coût landed de la quantification</td>
                {FUTURE_YEARS.map((y) => <td key={y} className={td}>{fmtUsd(sim.years[y].needLanded, 0)}</td>)}
              </tr>
              <tr>
                <td className="px-2 py-1 font-semibold uppercase text-chem-gray2" colSpan={2}>Budget résiduel (après MILDA)</td>
                {FUTURE_YEARS.map((y) => <td key={y} className={td}>{fmtUsd(sim.years[y].residual, 0)}</td>)}
              </tr>
              <tr>
                <td className="px-2 py-1 font-semibold uppercase text-chem-gray2" colSpan={2}>Couverture possible</td>
                {FUTURE_YEARS.map((y) => {
                  const yr = sim.years[y];
                  if (!yr.needLanded) return <td key={y} className={`${td} text-chem-gray2`}>—</td>;
                  const cov = Math.max(0, yr.residual) / yr.needLanded;
                  return <td key={y} className={`${td} ${cov >= 1 ? POS.text : NEG.text}`}>{fmtNum(Math.min(cov, 9.99) * 100, 0)} %</td>;
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Tableau d'un exercice ───────────────────────────────────────────────────
function YearTable({ yr, isOpen, onToggle, data, updateAccruals, updateManualQty, updateRegularQty, fillRegularQtys }) {
  const r = role(yr.balance);
  const manual = yr.method === 'manual';
  const hasNeed = yr.lines.some((l) => l.need > 0);
  const chip = 'flex items-center gap-1 text-[9px] font-semibold uppercase text-chem-darkblue bg-white border border-chem-blue-20 rounded-full px-2 py-0.5 hover:bg-chem-blue-10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const th = 'px-2 py-1.5 text-[10px] font-semibold uppercase';
  const td = 'px-2 py-1 text-[11px] font-normal text-right tabular-nums whitespace-nowrap';
  return (
    <section className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={isOpen}
        className={`w-full flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-left transition-all ${isOpen ? 'bg-chem-blue-10/40' : 'hover:bg-chem-gray1-5'}`}>
        {isOpen ? <ChevronDown w={16} className="text-chem-darkblue" /> : <ChevronRight w={16} className="text-chem-gray1-40" />}
        <span className={`text-[13px] font-bold tracking-tight ${isOpen ? 'text-chem-darkblue' : ''}`}>FY {yr.year}</span>
        <ModeBadge mode={yr.mode} />
        {yr.year !== '2026' && (
          <span className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full border ${manual ? 'bg-chem-yellow/20 text-chem-gray1 border-chem-yellow' : 'bg-chem-gray1-10 text-chem-gray2 border-chem-gray1-20'}`}>
            {METHOD_LABEL[yr.method]}{yr.maximize ? ' · budget maximisé' : ''}
          </span>
        )}
        <span className="ml-auto flex items-end gap-4">
          <span className="text-right text-[11px]">
            <span className="block text-[9px] font-semibold uppercase tracking-tighter text-chem-gray2">Budget intrants</span>
            {fmtUsd(yr.available)}
          </span>
          <span className="text-right text-[11px]">
            <span className="block text-[9px] font-semibold uppercase tracking-tighter text-chem-gray2">Solde final</span>
            <span className={`text-[16px] ${r.text} inline-flex items-center gap-1`}>
              {yr.balance >= 0 ? <CheckCircle2 w={12} /> : <AlertTriangle w={12} />}{fmtSigned(yr.balance)}
            </span>
          </span>
        </span>
      </button>
      {isOpen && manual && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-chem-gray1-10 bg-chem-yellow/10">
          <span className="text-[9px] font-semibold uppercase text-chem-gray2 mr-1">Pré-remplir :</span>
          <button type="button" className={chip} disabled={!hasNeed} onClick={() => fillRegularQtys('need')} title="Copie les quantités demandées par le Niger">Quantification</button>
          <button type="button" className={chip} disabled={!hasNeed} onClick={() => fillRegularQtys('quantif')} title="Quantification réduite au prorata pour tenir dans le budget">Quantification ajustée au budget</button>
          <button type="button" className={chip} onClick={() => fillRegularQtys('split')} title="Quantités calculées selon le split FY25">Split FY25</button>
          <button type="button" className={chip} onClick={() => { if (window.confirm(`Remettre à zéro les quantités FY ${yr.year} ?`)) fillRegularQtys('zero'); }}>Zéro</button>
          <span className={`ml-auto text-[10px] ${r.text}`}>{yr.balance >= 0 ? 'Reste à engager' : 'Dépassement'} : {fmtUsd(Math.abs(yr.balance))}</span>
        </div>
      )}
      {isOpen && (
        <div className="border-t border-chem-gray1-10 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-chem-gray1-5 text-chem-gray2 border-b border-chem-gray1-20">
                <th className={`${th} text-left`}>Intrant</th>
                <th className={`${th} text-right`}>Quantité</th>
                <th className={`${th} text-right`}>Total EXW</th>
                <th className={`${th} text-right`}>Fret</th>
                <th className={`${th} text-right`}>Total Landed</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => {
                const lines = yr.lines.filter((l) => l.category === cat);
                if (!lines.length) return null;
                return [
                  <tr key={cat} className="bg-chem-gray1-10">
                    <td colSpan={5} className="px-2 py-1 text-[10px] font-semibold italic text-chem-gray1">{CAT_LABEL[cat]}</td>
                  </tr>,
                  ...lines.map((l) => (
                    <tr key={`${cat}-${l.id}`} className={`border-b border-chem-gray1-10 ${l.isMilda ? 'bg-chem-aqua/5' : l.isAccrual ? 'bg-chem-yellow/10' : ''}`}>
                      <td className="px-2 py-1 text-[11px] font-semibold text-left">
                        {l.isAccrual ? (
                          <div className="flex flex-col gap-0.5">
                            <input value={data.accruals.desc} onChange={(e) => updateAccruals('desc', e.target.value)} aria-label="Intitulé des accruals"
                              className="bg-transparent border-b border-dashed border-chem-gray1-40 p-0 text-[11px] font-semibold focus:outline-none focus:border-chem-darkblue w-full" />
                            <input value={data.accruals.refs} onChange={(e) => updateAccruals('refs', e.target.value)} placeholder="Références (facultatif)" aria-label="Références des accruals"
                              className="bg-transparent border-none p-0 text-[9px] font-normal text-chem-gray2 focus:outline-none w-full" />
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {l.name}
                            {l.isMilda && <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-chem-blue-10 text-chem-darkblue border border-chem-blue-20">Saisie manuelle</span>}
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        {l.isMilda
                          ? <NumInput value={data.manualQtys[yr.year][l.id]} onChange={(v) => updateManualQty(yr.year, l.id, v)} ariaLabel={`Quantité ${l.name} FY ${yr.year}`} className="w-28" />
                          : l.isAccrual ? <span className="text-chem-gray2">—</span>
                          : manual ? <NumInput value={data.regularQtys[yr.year][l.id]} onChange={(v) => updateRegularQty(l.id, v)} ariaLabel={`Quantité ${l.name} FY ${yr.year}`} className="w-28" />
                          : fmtNum(l.qty)}
                        {l.need > 0 && (
                          <span className={`block text-[9px] ${l.coverage >= 0.995 ? 'text-chem-darkgreen2' : 'text-chem-gray2'}`} title="Quantification Niger (besoin) et taux de couverture">
                            besoin {fmtNum(l.need)} · {fmtNum(l.coverage * 100, 0)} %
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        {l.isAccrual
                          ? <NumInput value={data.accruals.amount} onChange={(v) => updateAccruals('amount', v)} ariaLabel="Montant EXW des accruals" className="w-32" />
                          : fmtUsd(l.exw)}
                      </td>
                      <td className={td}>
                        {l.isAccrual ? (
                          <span className="inline-flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase text-chem-gray2">
                              <Plane w={10} /> <NumInput value={data.accruals.freightPct} onChange={(v) => updateAccruals('freightPct', v)} ariaLabel="Taux de fret aérien des accruals (%)" className="w-20" /> %
                            </span>
                            {fmtUsd(l.freight)}
                          </span>
                        ) : (
                          <span title={`Taux ${fmtNum(l.rate, 2)} %`}>{fmtUsd(l.freight)}</span>
                        )}
                      </td>
                      <td className={`${td} text-chem-gray1`}>{fmtUsd(l.landed)}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
            <tfoot className="bg-chem-darkblue text-white">
              <tr className="text-[10px]">
                <td className="px-2 pt-2 pb-0.5 font-semibold uppercase text-left">Budget de base</td>
                <td /><td /><td />
                <td className="px-2 pt-2 pb-0.5 text-right tabular-nums">{fmtUsd(yr.base)}</td>
              </tr>
              {yr.reserve > 0 && (
                <tr className="text-[10px]">
                  <td className="px-2 py-0.5 font-semibold uppercase text-left" colSpan={4}>Réserve assistance (AT, entreposage, distribution)</td>
                  <td className="px-2 py-0.5 text-right tabular-nums">{fmtSigned(-yr.reserve)}</td>
                </tr>
              )}
              {yr.year !== '2026' && (
                <tr className="text-[10px]">
                  <td className="px-2 py-0.5 font-semibold uppercase text-left">Report annuel lissé</td>
                  <td /><td /><td />
                  <td className="px-2 py-0.5 text-right tabular-nums">{fmtSigned(yr.bonus)}</td>
                </tr>
              )}
              <tr className="text-[10px]">
                <td className="px-2 py-0.5 font-semibold uppercase text-left" colSpan={4}>Budget disponible pour les intrants</td>
                <td className="px-2 py-0.5 text-right tabular-nums">{fmtUsd(yr.available)}</td>
              </tr>
              <tr className="text-[11px] border-t border-white/20">
                <td className="px-2 py-1.5 font-semibold uppercase text-left">Total dépenses estimées</td>
                <td />
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(yr.totalExw)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(yr.totalFreight)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtUsd(yr.total)}</td>
              </tr>
              <tr className="text-[12px] border-t border-white/20">
                <td className="px-2 py-2 font-bold uppercase text-left" colSpan={4}>Solde final (Budget − Dépenses)</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${yr.balance >= 0 ? 'bg-chem-green2-20 text-chem-darkgreen2' : 'bg-chem-orange2-15 text-chem-eggplant'}`}>
                    {yr.balance >= 0 ? <CheckCircle2 w={11} /> : <AlertTriangle w={11} />}{fmtSigned(yr.balance)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
          {yr.year !== '2026' && yr.residual !== undefined && (
            <p className="px-3 py-1.5 text-[9px] text-chem-gray2 italic bg-chem-gray1-5 border-t border-chem-gray1-10">
              Budget intrants {fmtUsd(yr.available)}{yr.mildaCost ? ` − MILDA ${fmtUsd(yr.mildaCost)}` : ''} = budget résiduel {fmtUsd(yr.residual)}
              {yr.method === 'split' && <>, réparti selon le split FY25 sur base EXW (EXW total cible {fmtUsd(yr.eTot)}), quantités arrondies à l’unité inférieure.</>}
              {yr.method === 'quantif' && <>, réparti selon la quantification Niger sur base EXW, {yr.maximize ? 'en utilisant tout le budget, au-delà des besoins si possible' : 'plafonné aux besoins'} (coût landed de la quantification : {fmtUsd(yr.needLanded)}).</>}
              {yr.method === 'manual' && <> ; quantités des intrants réguliers saisies manuellement.</>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Liste des scénarios ─────────────────────────────────────────────────────
function ScenarioList({ store, busy, onSelect, onRename, onNew, onDuplicate, onDelete, onExport }) {
  return (
    <Card>
      <SectionHeader icon={Layers} title="Scénarios" subtitle={`${store.scenarios.length} enregistré(s)`}
        help="Chaque scénario est un jeu complet de paramètres, enregistré automatiquement dans ce navigateur. Cliquez sur un scénario pour l’activer, sur son nom pour le renommer. L’icône tableur exporte le scénario en Excel ; « Export JSON » (en-tête) sauvegarde tous les scénarios dans un fichier, à réimporter sur un autre poste."
        action={
          <button type="button" onClick={onNew} aria-label="Ajouter — Scénarios" title="Nouveau scénario (valeurs par défaut)"
            className="p-1 rounded-lg text-chem-darkblue hover:bg-chem-blue-10 transition-all"><Plus w={12} /></button>
        } />
      <div className="space-y-1.5">
        {store.scenarios.map((sc) => {
          const active = sc.id === store.activeId;
          return (
            <div key={sc.id} className={`p-2 rounded-xl border transition-all ${active ? 'bg-chem-blue-10 border-chem-blue-20 shadow-inner' : 'bg-chem-gray1-5 border-transparent'}`}>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => onSelect(sc.id)} aria-label={`Activer ${sc.name}`} aria-pressed={active}>
                  {active ? <CheckCircle2 w={16} className="text-chem-darkblue" /> : <Circle w={16} className="text-chem-gray1-40" />}
                </button>
                <input value={sc.name} onChange={(e) => onRename(sc.id, e.target.value)} onFocus={() => onSelect(sc.id)} aria-label="Nom du scénario"
                  className="bg-transparent border-none p-0 text-[10px] font-semibold flex-1 min-w-0 uppercase truncate focus:outline-none" />
              </div>
              <div className="flex items-center justify-between mt-1 pl-6">
                <span className="text-[9px] text-chem-gray2">{fmtDate(sc.updatedAt)}</span>
                <span className="flex items-center">
                  <button type="button" onClick={() => onExport(sc)} disabled={!!busy} aria-label={`Exporter ${sc.name} en Excel`} title="Exporter en Excel"
                    className="p-1 rounded-lg text-chem-gray1-60 hover:text-chem-darkgreen2 hover:bg-chem-green2-20 transition-all disabled:opacity-50"><FileSpreadsheet w={12} /></button>
                  <button type="button" onClick={() => onDuplicate(sc)} aria-label={`Dupliquer ${sc.name}`} title="Dupliquer"
                    className="p-1 rounded-lg text-chem-gray1-60 hover:text-chem-darkblue hover:bg-chem-blue-10 transition-all"><Copy w={12} /></button>
                  {store.scenarios.length > 1 && (
                    <button type="button" onClick={() => onDelete(sc)} aria-label={`Supprimer ${sc.name}`} title="Supprimer"
                      className="p-1 rounded-lg text-chem-gray1-60 hover:text-chem-eggplant hover:bg-chem-orange2-15 transition-all"><Trash2 w={12} /></button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Synthèse pluriannuelle ──────────────────────────────────────────────────
function Synthesis({ sim }) {
  const rows = YEARS.map((y) => sim.years[y]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.available, r.total)));
  const totals = rows.reduce((t, r) => ({ base: t.base + r.base, reserve: t.reserve + r.reserve, total: t.total + r.total }), { base: 0, reserve: 0, total: 0 });
  const totalBalance = totals.base - totals.reserve - totals.total;
  return (
    <section className="bg-white p-4 md:p-6 rounded-[2rem] border border-chem-gray1-20 shadow-sm overflow-hidden">
      <SectionHeader icon={Calculator} title="Synthèse FY26-FY30" subtitle="Budget disponible, dépenses et solde par exercice"
        help="Barre claire : budget disponible pour les intrants (budget total − réserve d’assistance, + report lissé pour FY27-FY30). Barre foncée : dépenses estimées (landed). Le solde pluriannuel = budgets totaux − réserves − dépenses (le report lissé ne fait que déplacer le surplus FY26)." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20">
              <th className="px-2 py-1.5 text-left">Exercice</th>
              <th className="px-2 py-1.5 text-left">Logistique</th>
              <th className="px-2 py-1.5 text-right">Budget total</th>
              <th className="px-2 py-1.5 text-right">Réserve</th>
              <th className="px-2 py-1.5 text-right">Report lissé</th>
              <th className="px-2 py-1.5 text-right">Budget intrants</th>
              <th className="px-2 py-1.5 text-right">Dépenses</th>
              <th className="px-2 py-1.5 text-right">Solde final</th>
              <th className="px-2 py-1.5 w-[22%]"><span className="sr-only">Graphique</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-chem-gray1-10 text-[11px] tabular-nums">
                <td className="px-2 py-1.5 font-semibold">FY {r.year}</td>
                <td className="px-2 py-1.5"><ModeBadge mode={r.mode} /></td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(r.base, 0)}</td>
                <td className="px-2 py-1.5 text-right">{r.reserve ? fmtSigned(-r.reserve, 0) : '—'}</td>
                <td className="px-2 py-1.5 text-right">{r.year === '2026' ? '—' : fmtSigned(r.bonus, 0)}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(r.available, 0)}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(r.total, 0)}</td>
                <td className={`px-2 py-1.5 text-right ${role(r.balance).text}`}>{fmtSigned(r.balance, 0)}</td>
                <td className="px-2 py-1.5">
                  <div className="space-y-0.5" aria-hidden="true">
                    <div className="h-1.5 rounded-full bg-chem-blue-40" style={{ width: `${Math.max(0, (r.available / max) * 100)}%` }} />
                    <div className="h-1.5 rounded-full bg-chem-darkblue" style={{ width: `${Math.max(0, (r.total / max) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-[12px] tabular-nums">
              <td className="px-2 py-2 font-bold uppercase" colSpan={2}>Total FY26-FY30</td>
              <td className="px-2 py-2 text-right">{fmtUsd(totals.base, 0)}</td>
              <td className="px-2 py-2 text-right">{totals.reserve ? fmtSigned(-totals.reserve, 0) : '—'}</td>
              <td /><td />
              <td className="px-2 py-2 text-right">{fmtUsd(totals.total, 0)}</td>
              <td className={`px-2 py-2 text-right ${role(totalBalance).text}`}>{fmtSigned(totalBalance, 0)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

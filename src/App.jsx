// ─── MOU Niger — Planificateur des intrants paludisme FY2026-FY2030 ─────────
// GHSC-PSM — MOU Niger. Preset couleurs : CHEMONICS (DESIGN_SYSTEM.md).
// Trois vues : 1. Budget (paramètres budgétaires), 2. Paramètres logistiques
// (coûts par intrant, PSN 2027-2031), 3. Scénarios (quantités à commander).
// Données : JSON dans le navigateur (localStorage), plusieurs scénarios enregistrés,
// sauvegarde automatique ; export Excel par scénario ; téléchargement / chargement d'un
// scénario (fichier .json, pour le transférer sur un autre poste).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FUTURE_YEARS, REGULAR, defaultScenarioData, normalizeScenarioData, quantitiesFor, simulate,
} from './model.js';
import { exportScenarioXlsx } from './excel.js';
import { NEG, POS, fmtDate, fmtUsd } from './ui.jsx';
import BudgetView from './BudgetView.jsx';
import LogisticsView from './LogisticsView.jsx';
import ScenariosView from './ScenariosView.jsx';
import {
  AlertTriangle, BookOpen, CheckCircle2, CloudCheck, Copy, Download, FileSpreadsheet, Layers, ListChecks,
  Package, Plus, ShieldCheck, Trash2, Upload, Wallet,
} from './icons.jsx';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ghsc-psm-planificateur-paludisme-v1';
const TAB_KEY = 'ghsc-psm-planificateur-paludisme-onglet'; // onglet affiché, propre au navigateur
const TABS = [
  { id: 'budget', n: 1, icon: Wallet, label: 'Budget', hint: 'budgets du MOU et clôture FY2026' },
  { id: 'logistics', n: 2, icon: Package, label: 'Paramètres logistiques', hint: 'coûts par intrant et PSN 2027-2031' },
  { id: 'scenarios', n: 3, icon: ListChecks, label: 'Scénarios', hint: 'quantités à commander FY2027-FY2030' },
];

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
  const [tab, setTabState] = useState(() => { try { return localStorage.getItem(TAB_KEY) || 'budget'; } catch { return 'budget'; } });
  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* préférence non conservée */ } window.scrollTo({ top: 0 }); };
  const today = useMemo(() => new Date(), []);
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
  // Accruals au 30/09/2026 : liste de lignes (ajout, modification, suppression)
  const setMode = (year, mode) => updateData((d) => ({ ...d, logistics: { ...d.logistics, [year]: mode } }));
  const setBudget = (year, value) => updateData((d) => ({ ...d, budgets: { ...d.budgets, [year]: value } }));
  const setReserve = (year, value) => updateData((d) => ({ ...d, reserves: { ...d.reserves, [year]: Math.max(0, value) } }));
  const setMethod = (year, method) => updateData((d) => ({ ...d, methods: { ...d.methods, [year]: method } }));
  const setYearQty = (key, year, id, value) =>
    updateData((d) => ({ ...d, [key]: { ...d[key], [year]: { ...d[key][year], [id]: Math.max(0, Math.floor(value)) } } }));
  // Pré-remplit les quantités manuelles d'un exercice (source : quantification brute,
  // quantification ajustée au budget, quantités actuelles ou zéro), puis passe en méthode manuelle.
  const fillRegularQtys = (year, source) => updateData((d) => {
    const residual = simulate(d).years[year].residual;
    const qtys = source === 'zero' ? Object.fromEntries(REGULAR.map((c) => [c.id, 0]))
      : source === 'need' ? { ...d.quantification[year] }
      : quantitiesFor(d, year, source === 'current' ? d.methods[year] : source, residual).qtys;
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

  // ─── Handlers données ───
  const handleExport = async (sc = scenario) => {
    setBusy(`xlsx-${sc.id}`);
    try { await exportScenarioXlsx(sc); }
    catch (err) { setNotice({ kind: 'error', text: `Export Excel impossible : ${err.message}` }); }
    finally { setBusy(null); }
  };

  const handleExportJson = () => {
    // Scénario actif uniquement (le chargement accepte aussi les fichiers à plusieurs scénarios).
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), activeId: scenario.id, scenarios: [scenario] }, null, 2)], { type: 'application/json' });
    const slug = scenario.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scenario';
    downloadBlob(blob, `MOU-Niger_scenario_${slug}_${new Date().toISOString().slice(0, 10)}.json`);
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
      setNotice({ kind: 'ok', text: added.length > 1 ? `${added.length} scénarios chargés.` : `Scénario « ${added[0].name} » chargé.` });
    } catch (err) {
      setNotice({ kind: 'error', text: `Ce fichier n’est pas un scénario téléchargé depuis l’application (${err instanceof SyntaxError ? 'fichier illisible' : err.message}).` });
    } finally {
      if (jsonRef.current) jsonRef.current.value = '';
    }
  };

  const sim = simulationData;
  const tabHint = {
    budget: `solde FY2026 ${fmtUsd(sim.totalBalance, 0)}`,
    logistics: `PSN saisi : ${FUTURE_YEARS.filter((y) => REGULAR.some((c) => Number(data.quantification[y][c.id]) > 0)).length}/4 années du MOU`,
    scenarios: `reste FY2027 ${fmtUsd(sim.years['2027'].balance, 0)}`,
  };

  // ─── Rendu ───
  return (
    <div className="min-h-screen bg-chem-gray1-5 text-chem-gray1 p-2 md:p-3 font-sans text-[13px]">
      <div className="max-w-[1400px] mx-auto space-y-3">
        {/* ─── En-tête ─── */}
        <header className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
          <div className="flex flex-wrap justify-between items-center p-2 px-4 gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-wrap">
              <img src="./assets/logo-state.webp" alt="U.S. Department of State" className="h-6 md:h-7 w-auto" />
              <div className="border-l border-chem-gray1-20 pl-4 min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-chem-gray1 flex items-center gap-1.5">
                  <ShieldCheck w={14} className="text-chem-blue" /> MOU Niger — Planificateur des intrants paludisme
                </h1>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-chem-gray2">GHSC-PSM · MOU Niger · FY2026-FY2030</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SyncIndicator status={sync} />
              <a href="./guide.html" target="_blank" rel="noopener"
                className="flex items-center gap-1 px-2 py-1 bg-chem-blue-10 border border-chem-blue-20 rounded-xl font-semibold text-[10px] text-chem-darkblue hover:bg-chem-blue-20 uppercase transition-all">
                <BookOpen w={11} /> Guide
              </a>
              <button type="button" onClick={() => handleExport()} disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-chem-darkblue text-white rounded-xl font-semibold text-[10px] uppercase hover:bg-chem-gray1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-wait">
                {busy === `xlsx-${scenario.id}` ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet w={12} />}
                Exporter Excel
              </button>
            </div>
          </div>
          <div className="h-1 bg-chem-green1" aria-hidden="true" />
          {/* ─── Scénario enregistré actif ─── */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-1.5 bg-chem-gray1-5 border-t border-chem-gray1-10 text-[10px]">
            <Layers w={12} className="text-chem-darkblue" />
            <label className="flex items-center gap-1.5 text-chem-gray2">
              Scénario
              <select value={store.activeId} onChange={(e) => setStore((s) => ({ ...s, activeId: e.target.value }))} aria-label="Scénario enregistré"
                className="bg-white border border-chem-gray1-20 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-chem-gray1 focus:outline-none focus:border-chem-darkblue max-w-[220px]">
                {store.scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </label>
            <input value={scenario.name} onChange={(e) => renameScenario(scenario.id, e.target.value)} aria-label="Renommer le scénario"
              className="bg-transparent border-b border-dashed border-chem-gray1-40 px-0.5 text-[11px] text-chem-gray1 focus:outline-none focus:border-chem-darkblue w-44" />
            <span className="text-chem-gray2">modifié le {fmtDate(scenario.updatedAt)}</span>
            <span className="flex items-center gap-1 ml-auto">
              <button type="button" onClick={() => addScenario(uniqueName('Nouveau scénario'))} className={barBtn} title="Nouveau scénario (valeurs par défaut)"><Plus w={11} /> Nouveau</button>
              <button type="button" onClick={() => addScenario(uniqueName(`${scenario.name} (copie)`), JSON.parse(JSON.stringify(scenario.data)))} className={barBtn} title="Dupliquer pour comparer"><Copy w={11} /> Dupliquer</button>
              {store.scenarios.length > 1 && <button type="button" onClick={() => deleteScenario(scenario)} className={barBtn} title="Supprimer ce scénario"><Trash2 w={11} /> Supprimer</button>}
              <span className="w-px h-4 bg-chem-gray1-20 mx-1" aria-hidden="true" />
              <button type="button" onClick={() => jsonRef.current?.click()} className={barBtn} title="Charger un scénario téléchargé précédemment (par exemple depuis un autre ordinateur)"><Upload w={11} /> Charger un scénario</button>
              <input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJson} />
              <button type="button" onClick={handleExportJson} className={barBtn} title="Télécharger le scénario actif dans un fichier, pour le sauvegarder ou le transférer"><Download w={11} /> Télécharger le scénario</button>
            </span>
          </div>
        </header>

        {notice && (
          <div role="status" className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium ${
            notice.kind === 'error' ? `${NEG.bg} ${NEG.border} ${NEG.text}` : notice.kind === 'ok' ? `${POS.bg} ${POS.border} ${POS.text}` : 'bg-chem-blue-10 border-chem-blue-20 text-chem-darkblue'}`}>
            {notice.kind === 'error' ? <AlertTriangle w={14} /> : <CheckCircle2 w={14} />}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Fermer le message" className="text-[10px] font-semibold uppercase opacity-70 hover:opacity-100">Fermer</button>
          </div>
        )}

        {/* ─── Onglets ─── */}
        <nav className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="tablist" aria-label="Sections">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-left transition-all ${active ? 'bg-chem-darkblue border-chem-darkblue text-white shadow-sm' : 'bg-white border-chem-gray1-20 text-chem-gray1 hover:border-chem-darkblue'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${active ? 'bg-white text-chem-darkblue' : 'bg-chem-darkblue text-white'}`}>{t.n}</span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold uppercase">{t.label}</span>
                  <span className={`block text-[10px] truncate ${active ? 'text-white/80' : 'text-chem-gray2'}`}>{t.hint} · {tabHint[t.id]}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <main>
          {tab === 'budget' && (
            <BudgetView data={data} sim={sim} today={today} updateData={updateData}
              setBudget={setBudget} setReserve={setReserve} />
          )}
          {tab === 'logistics' && (
            <LogisticsView data={data} updateField={updateField} updateData={updateData}
              setPsnQty={(y, id, v) => setYearQty('quantification', y, id, v)} />
          )}
          {tab === 'scenarios' && (
            <ScenariosView scenario={scenario} data={data} sim={sim} today={today} busy={busy} onExport={() => handleExport()}
              setMode={setMode} setMethod={setMethod} setYearQty={setYearQty}
              fillRegularQtys={fillRegularQtys} goToLogistics={() => setTab('logistics')} />
          )}
        </main>

        {/* Navigation entre les étapes */}
        <div className="flex justify-between gap-2">
          {TABS.findIndex((t) => t.id === tab) > 0
            ? <button type="button" onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) - 1].id)} className={navBtn}>← {TABS[TABS.findIndex((t) => t.id === tab) - 1].label}</button>
            : <span />}
          {TABS.findIndex((t) => t.id === tab) < TABS.length - 1 && (
            <button type="button" onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) + 1].id)} className={`${navBtn} !bg-chem-darkblue !text-white !border-chem-darkblue`}>{TABS[TABS.findIndex((t) => t.id === tab) + 1].label} →</button>
          )}
        </div>

        <footer className="text-center text-[9px] text-chem-gray2 py-2">
          GHSC-PSM — MOU Niger · Données enregistrées localement dans ce navigateur
        </footer>
      </div>
    </div>
  );
}

const barBtn = 'flex items-center gap-1 px-2 py-0.5 bg-white border border-chem-gray1-20 rounded-lg font-semibold text-[10px] text-chem-gray1 hover:border-chem-darkblue hover:text-chem-darkblue transition-all';
const navBtn = 'px-3 py-1.5 rounded-xl border border-chem-gray1-20 bg-white text-[11px] font-semibold uppercase text-chem-darkblue hover:border-chem-darkblue transition-all';

// ─── Composants et helpers d'interface partagés (preset CHEMONICS) ──────────
import { useState } from 'react';
import { num } from './model.js';
import { Info, Plane, Waves } from './icons.jsx';

export const MODE_LABEL = { air: 'Air', sea: 'Mer' };
export const MODE_PLAIN = { air: 'Avion', sea: 'Bateau + route' };

export const fmtNum = (n, d = 0) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtUsd = (n, d = 2) => `${fmtNum(n, d)} $`;
export const fmtSigned = (n, d = 2) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNum(Math.abs(n), d)} $`;
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');
// Rôles de couleur (preset CHEMONICS)
export const POS = { text: 'text-chem-darkgreen2', bg: 'bg-chem-green2-20', border: 'border-chem-green2-40', icon: 'text-chem-green2' };
export const NEG = { text: 'text-chem-eggplant', bg: 'bg-chem-orange2-15', border: 'border-chem-orange2/40', icon: 'text-chem-orange2' };
export const role = (n) => (n >= 0 ? POS : NEG);

// ─── Composants de base ─────────────────────────────────────────────────────
export const Card = ({ children, className = '' }) => (
  <section className={`bg-white p-3 rounded-2xl border border-chem-gray1-20 shadow-sm ${className}`}>{children}</section>
);

export const SectionHeader = ({ icon: Icon, title, subtitle, color = 'text-chem-darkblue', help, action }) => {
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
export const NumInput = ({ value, onChange, className = '', disabled, ariaLabel }) => {
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

export const ModeBadge = ({ mode }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full border ${mode === 'air' ? 'bg-chem-blue-10 text-chem-darkblue border-chem-blue-20' : 'bg-white text-chem-darkaqua border-chem-aqua/40'}`}>
    {mode === 'air' ? <Plane w={10} /> : <Waves w={10} />} {MODE_LABEL[mode]}
  </span>
);


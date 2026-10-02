// ─── Éléments partagés par les trois vues (budget, logistique, scénarios) ────
import { fiscalYear } from './logistics.js';
import { CheckCircle2, Plane, Truck } from './icons.jsx';
import { Card, MODE_PLAIN, fmtNum, fmtUsd } from './ui.jsx';

export const fyPeriod = (y) => {
  const { start, end } = fiscalYear(y);
  return `${start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
};

/** Carte de section : titre, sous-titre, contenu. */
export const Section = ({ icon: Icon, title, subtitle, children, action, className = '' }) => (
  <Card className={className}>
    <div className="flex items-start gap-2 mb-2 border-b border-chem-gray1-10 pb-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-chem-darkblue flex items-center gap-1.5"><Icon w={14} /> {title}</h2>
        {subtitle && <p className="text-[11px] text-chem-gray2 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

export const Segmented = ({ options, value, onChange, label }) => (
  <div className="inline-flex flex-wrap rounded-xl border border-chem-gray1-20 overflow-hidden" role="radiogroup" aria-label={label}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-all ${active ? 'bg-chem-darkblue text-white' : 'bg-white text-chem-gray2 hover:bg-chem-blue-10'}`}>
          {active ? <CheckCircle2 w={11} /> : null}{o.icon}{o.label}
        </button>
      );
    })}
  </div>
);

export const ModeIcon = ({ mode, w = 11 }) => (mode === 'air' ? <Plane w={w} /> : <Truck w={w} />);

/** Texte prêt à coller dans un e-mail pour un exercice. */
export const emailText = (scenarioName, yr) => {
  const lines = [];
  lines.push(`MOU Niger — Quantités commandables FY${yr.year}, ajustées au budget disponible (scénario « ${scenarioName} »)`);
  const parts = [`budget ${fmtUsd(yr.base, 0)}`];
  if (yr.reserve) parts.push(`− réserve assistance ${fmtUsd(yr.reserve, 0)}`);
  if (yr.bonus) parts.push(`${yr.bonus >= 0 ? '+' : '−'} report reçu ${fmtUsd(Math.abs(yr.bonus), 0)}`);
  if (yr.accruals) parts.push(`− accruals ${fmtUsd(yr.accruals, 0)}`);
  lines.push(`Budget disponible pour les produits : ${fmtUsd(yr.available, 0)} (${parts.join(' ')})`);
  if (yr.assistance) lines.push(`Assistance disponible (assistance technique, entreposage, distribution) : ${fmtUsd(yr.assistance, 0)}`);
  lines.push(`Transport : ${MODE_PLAIN[yr.mode].toLowerCase()}`);
  lines.push('');
  for (const l of yr.lines.filter((x) => x.qty > 0)) {
    lines.push(`- ${l.plain} [${l.name}] : ${fmtNum(l.qty)} × ${l.unit} — ${fmtUsd(l.landed, 0)}${l.need > 0 ? ` (prévu pour l’USG, quantification PSN 2027-2031 : ${fmtNum(l.need)}, écart ${Math.round((l.coverage - 1) * 100) > 0 ? '+' : ''}${Math.round((l.coverage - 1) * 100)} %)` : ''}`);
  }
  lines.push('');
  lines.push(`Total estimé (produits + transport) : ${fmtUsd(yr.total, 0)}`);
  lines.push(`${yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget'} : ${fmtUsd(Math.abs(yr.balance), 0)}`);
  return lines.join('\n');
};

export const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignoré */ }
    ta.remove(); return ok;
  }
};

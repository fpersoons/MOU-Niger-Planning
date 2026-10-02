// ─── Éléments partagés par les trois vues (budget, logistique, scénarios) ────
import { useState } from 'react';
import { STATUS_LABEL, fiscalYear, fmtDay, fmtMonth } from './logistics.js';
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronRight, Plane, Truck } from './icons.jsx';
import { Card, MODE_PLAIN, NEG, POS, fmtNum, fmtUsd } from './ui.jsx';

export const STATUS_STYLE = {
  ok: `${POS.bg} ${POS.border} ${POS.text}`,
  risk: 'bg-chem-yellow/15 border-chem-yellow text-chem-gray1',
  late: `${NEG.bg} ${NEG.border} ${NEG.text}`,
  closed: 'bg-chem-gray1-10 border-chem-gray1-20 text-chem-gray2',
};

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

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${STATUS_STYLE[status]}`}>
    {status === 'ok' ? <CheckCircle2 w={10} /> : status === 'closed' ? <Calendar w={10} /> : <AlertTriangle w={10} />}
    {STATUS_LABEL[status]}
  </span>
);

export const ModeIcon = ({ mode, w = 11 }) => (mode === 'air' ? <Plane w={w} /> : <Truck w={w} />);

export const deliverySentence = (a, mode) => {
  const how = mode === 'air' ? 'par avion' : 'par bateau puis par la route';
  if (a.status === 'ok') return `Pour une arrivée au Niger en ${fmtMonth(a.need)}, commander ${how} au plus tard le ${fmtDay(a.orderBy)} (délai prudent de ${a.max} mois).`;
  if (a.status === 'risk') return `Une commande passée aujourd'hui ${how} arriverait entre ${fmtMonth(a.arrivalMin)} et ${fmtMonth(a.arrivalMax)} : à temps pour ${fmtMonth(a.need)} seulement si tout se passe bien. Commander sans attendre.`;
  return `Une commande passée aujourd'hui ${how} arriverait entre ${fmtMonth(a.arrivalMin)} et ${fmtMonth(a.arrivalMax)}, après la date souhaitée (${fmtMonth(a.need)}). Prévoir un retard de couverture ou ajuster le plan d'approvisionnement.`;
};

/** Texte prêt à coller dans un e-mail pour un exercice. */
export const emailText = (scenarioName, yr, a, data) => {
  const lines = [];
  lines.push(`MOU Niger — Quantités proposées FY${yr.year} (scénario « ${scenarioName} »)`);
  const parts = [`budget ${fmtUsd(yr.base, 0)}`];
  if (yr.reserve) parts.push(`− réserve assistance ${fmtUsd(yr.reserve, 0)}`);
  if (yr.bonus) parts.push(`${yr.bonus >= 0 ? '+' : '−'} report du solde FY2026 ${fmtUsd(Math.abs(yr.bonus), 0)}`);
  lines.push(`Budget disponible pour les produits : ${fmtUsd(yr.available, 0)} (${parts.join(' ')})`);
  if (yr.assistance) lines.push(`Assistance disponible (assistance technique, entreposage, distribution) : ${fmtUsd(yr.assistance, 0)}${yr.assistCarry ? ` (réserve ${fmtUsd(yr.reserve, 0)} + report du solde d'assistance FY2026 ${fmtUsd(yr.assistCarry, 0)})` : ''}`);
  lines.push(`Transport : ${MODE_PLAIN[yr.mode].toLowerCase()} — ${deliverySentence(a, yr.mode)}`);
  lines.push('');
  for (const l of yr.lines.filter((x) => x.qty > 0)) {
    lines.push(`- ${l.plain} [${l.name}] : ${fmtNum(l.qty)} unités — ${fmtUsd(l.landed, 0)}${l.need > 0 ? ` (PSN ${fmtNum(l.need)}, couverture ${fmtNum(l.coverage * 100, 0)} %)` : ''}`);
  }
  lines.push('');
  lines.push(`Total estimé (produits + transport) : ${fmtUsd(yr.total, 0)}`);
  lines.push(`${yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget'} : ${fmtUsd(Math.abs(yr.balance), 0)}`);
  lines.push('');
  lines.push(`Délais estimés : avion ${data.leadTimes.air.min}-${data.leadTimes.air.max} mois, bateau + route via Lomé ${data.leadTimes.sea.min}-${data.leadTimes.sea.max} mois (hypothèses à confirmer avec GHSC-PSM).`);
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

// ─── Lexique ─────────────────────────────────────────────────────────────────
const TERMS = [
  ['Année fiscale (FY)', 'Année budgétaire américaine, du 1er octobre au 30 septembre. FY2027 = 1er octobre 2026 – 30 septembre 2027.'],
  ['Réserve d’assistance', 'Partie du budget réservée à l’assistance technique, à l’entreposage et à la distribution ; elle ne sert pas à acheter des produits.'],
  ['Accruals', 'Montants engagés au 30 septembre 2026 sur le budget FY2026 ; ils sont déduits avant de calculer le solde.'],
  ['Solde FY2026', 'Budget FY2026 non utilisé au 30 septembre 2026 (produits et assistance), reporté sur FY2027 ou lissé sur les autres années du MOU.'],
  ['Prix EXW', 'Prix « départ usine » : prix du produit seul, avant transport.'],
  ['Coût livré (landed)', 'Prix du produit + transport jusqu’au Niger, par unité, selon le mode : bateau + route via Lomé, ou avion.'],
  ['PSN', 'Quantités de produits financées par l’USG dans le PSN 2027-2031, par année.'],
  ['Split', 'Part de chaque produit dans la valeur (prix EXW × quantité) des quantités PSN de l’année ; il sert à répartir le budget.'],
  ['Couverture', 'Quantité commandée ÷ quantité PSN de l’année. 100 % = quantité PSN entièrement couverte.'],
  ['CPS', 'Chimioprévention du paludisme saisonnier : AQ + SP pour les jeunes enfants, en général de juillet à octobre.'],
  ['TPIg', 'Traitement préventif intermittent du paludisme chez la femme enceinte (SP).'],
  ['CTA / AL', 'Combinaison thérapeutique à base d’artémisinine ; AL = artéméther-luméfantrine, traitement du paludisme simple, par tranche de poids.'],
  ['TDR (RDT)', 'Test de diagnostic rapide du paludisme.'],
  ['MILDA', 'Moustiquaire imprégnée d’insecticide à longue durée d’action (PBO, IG2 : zones de résistance aux insecticides). Transport par bateau uniquement.'],
];

export function Glossary() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2 text-left">
        {open ? <ChevronDown w={14} className="text-chem-darkblue" /> : <ChevronRight w={14} className="text-chem-gray1-40" />}
        <BookOpen w={14} className="text-chem-darkblue" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-chem-darkblue">Lexique</span>
        <span className="text-[10px] text-chem-gray2">les termes techniques expliqués simplement</span>
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
          {TERMS.map(([t, d]) => (
            <div key={t} className="text-[11px]">
              <dt className="font-semibold text-chem-gray1">{t}</dt>
              <dd className="text-chem-gray2 leading-relaxed">{d}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

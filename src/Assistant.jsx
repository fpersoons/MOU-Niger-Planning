// ─── Assistant pas à pas ─────────────────────────────────────────────────────
// Vue destinée aux non-spécialistes (ex. personnel de l'ambassade) : on part des
// budgets disponibles dans le cadre du MOU pour arriver aux quantités à commander, en
// langage courant, avec les délais d'acheminement réalistes vers le Niger.

import { useMemo, useState } from 'react';
import {
  CARRYOVER_LABEL, FUTURE_YEARS, MILDA, REGULAR, num, simulate,
} from './model.js';
import { STATUS_LABEL, addMonths, assessDelivery, fmtDay, fmtMonth, fiscalYear } from './logistics.js';
import QuantificationCard from './Quantification.jsx';
import {
  AlertTriangle, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Compass,
  FileSpreadsheet, ListChecks, Plane, Plus, Sliders, Trash2, Truck, Wallet,
} from './icons.jsx';
import { Card, MODE_PLAIN, NEG, NumInput, POS, fmtNum, fmtUsd, role } from './ui.jsx';

export const METHOD_PLAIN = {
  quantif: 'Selon la quantification PSN',
  manual: 'Je fixe les quantités',
};
const METHOD_HELP = {
  quantif: 'Le budget est réparti dans les mêmes proportions que les quantités de la quantification PSN. Si le budget ne suffit pas, chaque produit est réduit du même pourcentage.',
  manual: 'Vous saisissez vous-même les quantités de chaque produit ; le reste du budget (ou le dépassement) se met à jour en direct.',
};

const STATUS_STYLE = {
  ok: `${POS.bg} ${POS.border} ${POS.text}`,
  risk: 'bg-chem-yellow/15 border-chem-yellow text-chem-gray1',
  late: `${NEG.bg} ${NEG.border} ${NEG.text}`,
  closed: 'bg-chem-gray1-10 border-chem-gray1-20 text-chem-gray2',
};

const fyPeriod = (y) => {
  const { start, end } = fiscalYear(y);
  return `${start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
};

// ─── Petits composants ───────────────────────────────────────────────────────
const Step = ({ n, icon: Icon, title, subtitle, children, id }) => (
  <Card className="scroll-mt-3" >
    <div id={id} className="flex items-start gap-2 mb-2 border-b border-chem-gray1-10 pb-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-chem-darkblue text-white text-[12px] font-bold shrink-0">{n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-chem-darkblue flex items-center gap-1.5"><Icon w={14} /> {title}</h2>
        {subtitle && <p className="text-[11px] text-chem-gray2 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </Card>
);

const Segmented = ({ options, value, onChange, label, size = 'sm' }) => (
  <div className="inline-flex flex-wrap rounded-xl border border-chem-gray1-20 overflow-hidden" role="radiogroup" aria-label={label}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
          className={`flex items-center gap-1 ${size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]'} font-semibold transition-all ${active ? 'bg-chem-darkblue text-white' : 'bg-white text-chem-gray2 hover:bg-chem-blue-10'}`}>
          {active ? <CheckCircle2 w={11} /> : null}{o.icon}{o.label}
        </button>
      );
    })}
  </div>
);

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${STATUS_STYLE[status]}`}>
    {status === 'ok' ? <CheckCircle2 w={10} /> : status === 'closed' ? <Calendar w={10} /> : <AlertTriangle w={10} />}
    {STATUS_LABEL[status]}
  </span>
);

const ModeIcon = ({ mode, w = 11 }) => (mode === 'air' ? <Plane w={w} /> : <Truck w={w} />);

const deliverySentence = (a, mode) => {
  const how = mode === 'air' ? 'par avion' : 'par bateau puis par la route';
  if (a.status === 'ok') return `Pour une arrivée au Niger en ${fmtMonth(a.need)}, commander ${how} au plus tard le ${fmtDay(a.orderBy)} (délai prudent de ${a.max} mois).`;
  if (a.status === 'risk') return `Une commande passée aujourd'hui ${how} arriverait entre ${fmtMonth(a.arrivalMin)} et ${fmtMonth(a.arrivalMax)} : à temps pour ${fmtMonth(a.need)} seulement si tout se passe bien. Commander sans attendre.`;
  return `Une commande passée aujourd'hui ${how} arriverait entre ${fmtMonth(a.arrivalMin)} et ${fmtMonth(a.arrivalMax)}, après la date souhaitée (${fmtMonth(a.need)}). Prévoir un retard de couverture ou ajuster le plan d'approvisionnement.`;
};

// ─── Texte à copier dans un e-mail ───────────────────────────────────────────
const emailText = (scenarioName, yr, a, data) => {
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
    lines.push(`- ${l.plain} [${l.name}] : ${fmtNum(l.qty)} unités — ${fmtUsd(l.landed, 0)}${l.need > 0 ? ` (quantification PSN ${fmtNum(l.need)}, couverture ${fmtNum(l.coverage * 100, 0)} %)` : ''}`);
  }
  lines.push('');
  lines.push(`Total estimé (produits + transport) : ${fmtUsd(yr.total, 0)}`);
  lines.push(`${yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget'} : ${fmtUsd(Math.abs(yr.balance), 0)}`);
  lines.push('');
  lines.push(`Délais estimés : avion ${data.leadTimes.air.min}-${data.leadTimes.air.max} mois, bateau + route via Lomé ${data.leadTimes.sea.min}-${data.leadTimes.sea.max} mois (hypothèses à confirmer avec GHSC-PSM).`);
  return lines.join('\n');
};

const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignoré */ }
    ta.remove(); return ok;
  }
};

// ─── Vue principale ──────────────────────────────────────────────────────────
export default function Assistant({
  scenario, data, sim, today, busy, onExport, updateData, setBudget, setReserve, setMethod, setMaximize, setMode,
  setYearQty, fillRegularQtys, accrualHandlers,
}) {
  const [copied, setCopied] = useState(null);
  const lt = data.leadTimes;
  const y26 = sim.years['2026'];

  const deliveries = useMemo(() => Object.fromEntries(FUTURE_YEARS.map((y) => [y,
    assessDelivery({ year: y, mode: data.logistics[y], leadTimes: lt, needMonth: data.needDates[y], today })])), [data.logistics, data.needDates, lt, today]);

  // Effet d'un changement de transport : simulation avec le mode inverse.
  const altSims = useMemo(() => Object.fromEntries(FUTURE_YEARS.map((y) => {
    const other = data.logistics[y] === 'air' ? 'sea' : 'air';
    return [y, { mode: other, yr: simulate({ ...data, logistics: { ...data.logistics, [y]: other } }).years[y] }];
  })), [data]);

  const setLead = (mode, k, v) => updateData((d) => ({ ...d, leadTimes: { ...d.leadTimes, [mode]: { ...d.leadTimes[mode], [k]: Math.max(0, v) } } }));
  const setNeed = (y, v) => updateData((d) => ({ ...d, needDates: { ...d.needDates, [y]: v } }));

  const doCopy = async (y) => {
    const ok = await copyText(emailText(scenario.name, sim.years[y], deliveries[y], data));
    setCopied(ok ? y : 'error');
    setTimeout(() => setCopied(null), 3000);
  };

  const airEarliest = addMonths(today, num(lt.air.min));
  const seaEarliest = addMonths(today, num(lt.sea.min));
  const totalAvailable = FUTURE_YEARS.reduce((s, y) => s + sim.years[y].available, 0);

  return (
    <div className="space-y-3">
      {/* ─── Introduction ─── */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[260px]">
            <h2 className="text-[15px] font-bold text-chem-gray1 flex items-center gap-2"><Compass w={18} className="text-chem-blue" /> Préparer une commande en 3 étapes</h2>
            <p className="text-[12px] text-chem-gray2 mt-1 leading-relaxed">
              À partir des budgets disponibles dans le cadre du MOU, l’outil calcule les quantités de produits antipaludiques que l’on peut commander
              pour le Niger, et indique quand elles pourraient arriver. Aucune connaissance en logistique n’est nécessaire :
              les valeurs techniques (prix, coûts de transport) sont déjà renseignées. Tout est enregistré automatiquement.
            </p>
          </div>
          <ol className="flex flex-wrap gap-2 text-[11px]">
            {[['etape-budget', '1', 'Budget'], ['etape-repartition', '2', 'Répartition et transport'], ['etape-quantites', '3', 'Quantités à commander']].map(([id, n, t]) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-chem-blue-20 bg-chem-blue-10 text-chem-darkblue font-semibold hover:bg-chem-blue-20 transition-all">
                  <span className="w-4 h-4 rounded-full bg-chem-darkblue text-white text-[9px] flex items-center justify-center">{n}</span>{t}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* ─── Contexte logistique ─── */}
      <section className="rounded-2xl border-2 border-chem-yellow bg-chem-yellow/10 p-3" aria-labelledby="contexte-titre">
        <h2 id="contexte-titre" className="text-[12px] font-bold uppercase tracking-wider text-chem-gray1 flex items-center gap-1.5">
          <AlertTriangle w={14} className="text-chem-orange1" /> À savoir avant de commander — acheminement vers le Niger
        </h2>
        <ul className="mt-1.5 space-y-1 text-[11px] text-chem-gray1 leading-relaxed list-disc pl-5">
          <li>La frontière entre le Bénin et le Niger reste fermée. Les produits envoyés par bateau arrivent au port de <strong>Lomé (Togo)</strong>, puis traversent le <strong>Burkina Faso</strong> par la route jusqu’au Niger : délais imprévisibles, risques de sécurité et de blocage importants.</li>
          <li>Une commande passée aujourd’hui n’arriverait pas avant <strong>{fmtMonth(airEarliest)}</strong> par avion, ni avant <strong>{fmtMonth(seaEarliest)}</strong> par bateau. Les besoins prévus au plan d’approvisionnement pour fin 2026 et début 2027 ne pourront donc pas être couverts à temps par de nouvelles commandes.</li>
          <li>L’avion évite le corridor routier et arrive plus vite, mais le transport coûte plus cher : <strong>à budget égal, on achète moins de produits</strong>. Les moustiquaires (MILDA) ne peuvent voyager que par bateau.</li>
          <li>La chimioprévention saisonnière (CPS, produits AQ + SP) se déroule en général de juillet à octobre : ces produits doivent être au Niger avant le début de la campagne.</li>
        </ul>
        <LeadTimeEditor lt={lt} setLead={setLead} />
      </section>

      {/* ─── Étape 1 : budgets du MOU ─── */}
      <Step n="1" id="etape-budget" icon={Wallet} title="Budgets disponibles dans le cadre du MOU"
        subtitle="Saisissez le budget disponible pour chaque année fiscale (du 1er octobre au 30 septembre), y compris FY2026, et la part réservée à l’assistance.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[11px] tabular-nums">
            <thead>
              <tr className="text-[9px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20">
                <th className="px-2 py-1.5 text-left">Année fiscale</th>
                <th className="px-2 py-1.5 text-right">Budget disponible (MOU)</th>
                <th className="px-2 py-1.5 text-right" title="Assistance technique, entreposage, distribution">Réserve assistance<span className="block normal-case font-normal">(assistance technique, entreposage, distribution)</span></th>
                <th className="px-2 py-1.5 text-right">Report du solde FY2026<span className="block normal-case font-normal">(produits + assistance)</span></th>
                <th className="px-2 py-1.5 text-right">= Budget pour les produits</th>
                <th className="px-2 py-1.5 text-right">= Assistance disponible</th>
              </tr>
            </thead>
            <tbody>
              {['2026', ...FUTURE_YEARS].map((y) => {
                const yr = sim.years[y];
                const fy = fiscalYear(y);
                const current = today >= fy.start && today <= fy.end;
                const closed = today > fy.end;
                return (
                  <tr key={y} className={`border-b border-chem-gray1-10 ${closed ? 'bg-chem-gray1-5' : ''}`}>
                    <td className="px-2 py-1.5">
                      <span className="font-semibold">FY{y}</span>
                      {current && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-chem-blue-10 text-chem-darkblue border border-chem-blue-20">en cours</span>}
                      {closed && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-chem-gray1-10 text-chem-gray2 border border-chem-gray1-20">clos</span>}
                      <span className="block text-[9px] text-chem-gray2">{fyPeriod(y)}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right"><NumInput value={data.budgets[y]} onChange={(v) => setBudget(y, v)} ariaLabel={`Budget disponible FY${y}`} className="w-32" /></td>
                    <td className="px-2 py-1.5 text-right"><NumInput value={data.reserves[y]} onChange={(v) => setReserve(y, v)} ariaLabel={`Réserve assistance FY${y}`} className="w-32" /></td>
                    {y === '2026' ? (
                      <td className="px-2 py-1.5 text-right text-[10px] text-chem-gray2" colSpan={3}>
                        Solde au 30/09/2026 : <span className={`text-[12px] ${role(sim.totalBalance).text}`}>{fmtUsd(sim.totalBalance, 0)}</span>
                        <span className="block text-[9px]">voir la clôture ci-dessous</span>
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-right text-chem-gray2">
                          {yr.bonus || yr.assistCarry ? (
                            <>
                              {`${yr.bonus + yr.assistCarry >= 0 ? '+' : '−'} ${fmtUsd(Math.abs(yr.bonus + yr.assistCarry), 0)}`}
                              {yr.assistCarry ? <span className="block text-[9px]">dont assistance {fmtUsd(yr.assistCarry, 0)}</span> : null}
                            </>
                          ) : '—'}
                        </td>
                        <td className={`px-2 py-1.5 text-right text-[13px] ${yr.available < 0 ? NEG.text : 'text-chem-gray1'}`}>{fmtUsd(yr.available, 0)}</td>
                        <td className="px-2 py-1.5 text-right text-chem-gray2">{fmtUsd(yr.assistance, 0)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-[11px]">
                <td className="px-2 py-1.5 font-semibold uppercase text-chem-gray2" colSpan={4}>Total FY2027-FY2030</td>
                <td className="px-2 py-1.5 text-right text-[13px]">{fmtUsd(totalAvailable, 0)}</td>
                <td className="px-2 py-1.5 text-right text-chem-gray2">{fmtUsd(FUTURE_YEARS.reduce((t, y) => t + sim.years[y].assistance, 0), 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Clôture FY2026 : accruals et traitement du solde */}
        <div className="mt-3 rounded-xl border border-chem-gray1-20 bg-chem-gray1-5 p-2.5">
          <p className="text-[12px] font-bold text-chem-gray1 flex items-center gap-1.5"><Calendar w={13} className="text-chem-darkblue" /> Clôture de FY2026 au 30 septembre 2026</p>

          <p className="mt-2 text-[10px] font-semibold uppercase text-chem-gray2">Accruals (montants engagés au 30/09/2026)</p>
          <div className="mt-1 space-y-1">
            {data.accruals.items.length === 0 && <p className="text-[10px] italic text-chem-gray2">Aucun accrual — cliquez sur « Ajouter un accrual ».</p>}
            {data.accruals.items.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-chem-gray1-20 px-2 py-1">
                <input value={a.desc} onChange={(e) => accrualHandlers.updateAccrual(a.id, 'desc', e.target.value)} placeholder="Intitulé (ex. TDR — RO)" aria-label="Intitulé de l’accrual"
                  className="flex-1 min-w-[160px] bg-transparent border-none p-0 text-[11px] font-semibold focus:outline-none" />
                <input value={a.refs} onChange={(e) => accrualHandlers.updateAccrual(a.id, 'refs', e.target.value)} placeholder="Références (facultatif)" aria-label="Références de l’accrual"
                  className="w-36 bg-transparent border-none p-0 text-[10px] text-chem-gray2 focus:outline-none" />
                <NumInput value={a.amount} onChange={(v) => accrualHandlers.updateAccrual(a.id, 'amount', v)} ariaLabel={`Montant — ${a.desc || 'accrual'}`} className="w-32" />
                <span className="text-[10px] text-chem-gray2">$</span>
                <button type="button" onClick={() => { if (window.confirm(`Supprimer l’accrual « ${a.desc || 'sans intitulé'} » ?`)) accrualHandlers.removeAccrual(a.id); }}
                  aria-label={`Supprimer l’accrual ${a.desc}`} className="p-1 rounded-lg text-chem-gray1-40 hover:text-chem-eggplant hover:bg-chem-orange2-15 transition-all"><Trash2 w={12} /></button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={accrualHandlers.addAccrual}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-chem-blue-20 rounded-xl font-semibold text-[10px] uppercase text-chem-darkblue hover:bg-chem-blue-10 transition-all">
                <Plus w={11} /> Ajouter un accrual
              </button>
              <span className="text-[10px] text-chem-gray2">Total des accruals : <span className="text-[12px] text-chem-gray1">{fmtUsd(y26.accrualsLanded, 0)}</span></span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-chem-gray2">Autres commandes FY2026 (hors accruals) :</span>
            <Segmented label="Autres commandes FY2026" value={data.fy26Spending}
              onChange={(v) => updateData((d) => ({ ...d, fy26Spending: v }))}
              options={[{ value: 'unspent', label: 'Aucune' }, { value: 'planned', label: 'Selon les quantités FY26 de la vue détaillée' }]} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-chem-gray2">Assistance (AT, entreposage, distribution) engagée au 30/09/2026, sur la réserve de {fmtUsd(y26.reserve, 0)} :</span>
            <NumInput value={data.fy26AssistanceSpent} onChange={(v) => updateData((d) => ({ ...d, fy26AssistanceSpent: Math.max(0, v) }))} ariaLabel="Assistance engagée au 30/09/2026" className="w-32" />
            <span className="text-[10px] text-chem-gray2">$</span>
          </div>

          <dl className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] tabular-nums">
            <div className="rounded-lg bg-white border border-chem-gray1-20 px-2 py-1.5">
              <dt className="text-[9px] font-semibold uppercase text-chem-gray2">Solde produits</dt>
              <dd className="text-[10px] text-chem-gray2">
                {fmtUsd(y26.base - y26.reserve, 0)} (budget − réserve) − accruals {fmtUsd(y26.accrualsLanded, 0)}
                {data.fy26Spending === 'planned' ? ` − commandes ${fmtUsd(y26.total - y26.accrualsLanded, 0)}` : ''}
              </dd>
              <dd className={`text-[13px] ${role(sim.surplus).text}`}>{fmtUsd(sim.surplus, 0)}</dd>
            </div>
            <div className="rounded-lg bg-white border border-chem-gray1-20 px-2 py-1.5">
              <dt className="text-[9px] font-semibold uppercase text-chem-gray2">Solde assistance</dt>
              <dd className="text-[10px] text-chem-gray2">réserve {fmtUsd(y26.reserve, 0)} − engagé {fmtUsd(y26.assistanceSpent, 0)}</dd>
              <dd className={`text-[13px] ${role(sim.assistanceBalance).text}`}>{fmtUsd(sim.assistanceBalance, 0)}</dd>
            </div>
            <div className="rounded-lg bg-white border border-chem-gray1-20 px-2 py-1.5">
              <dt className="text-[9px] font-semibold uppercase text-chem-gray2">Solde total FY2026 à reporter</dt>
              <dd className="text-[10px] text-chem-gray2">chaque solde reste dans son enveloppe</dd>
              <dd className={`text-[15px] ${role(sim.totalBalance).text}`}>{fmtUsd(sim.totalBalance, 0)}</dd>
            </div>
          </dl>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-chem-gray2">Traitement du solde FY2026 :</span>
            <Segmented label="Traitement du solde FY2026" value={data.carryover}
              onChange={(v) => updateData((d) => ({ ...d, carryover: v }))}
              options={[{ value: 'fy27', label: 'Reporté en totalité sur FY2027' }, { value: 'smooth', label: 'Lissé sur les autres années du MOU (FY2027-FY2030)' }]} />
          </div>
        </div>
      </Step>

      {/* ─── Étape 2 : répartition et transport ─── */}
      <Step n="2" id="etape-repartition" icon={Sliders} title="Répartition du budget et transport"
        subtitle="Pour chaque année, choisissez comment répartir le budget entre les produits, et le mode de transport.">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {['quantif', 'manual'].map((m) => (
            <div key={m} className="rounded-xl border border-chem-gray1-20 p-2">
              <dt className="text-[11px] font-semibold text-chem-darkblue">{METHOD_PLAIN[m]}</dt>
              <dd className="text-[10px] text-chem-gray2 mt-0.5 leading-relaxed">{METHOD_HELP[m]}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2">
          {FUTURE_YEARS.map((y) => {
            const yr = sim.years[y];
            const a = deliveries[y];
            const alt = altSims[y];
            const altA = assessDelivery({ year: y, mode: alt.mode, leadTimes: lt, needMonth: data.needDates[y], today });
            const needEmpty = !REGULAR.some((c) => num(data.quantification[y][c.id]) > 0);
            const metric = yr.method === 'manual' ? 'total' : 'totalExw';
            const diff = alt.yr[metric] - yr[metric];
            const mildaQty = MILDA.reduce((s, m) => s + num(data.manualQtys[y][m.id]), 0);
            return (
              <div key={y} className="rounded-xl border border-chem-gray1-20 p-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-[12px] font-bold w-16">FY{y}</span>
                  <label className="flex flex-col gap-0.5 text-[9px] font-semibold uppercase text-chem-gray2">
                    Répartition
                    <select value={yr.method} onChange={(e) => setMethod(y, e.target.value)} aria-label={`Répartition FY${y}`}
                      className="bg-white border border-chem-gray1-20 rounded-md px-1.5 py-1 text-[11px] font-semibold normal-case text-chem-darkblue focus:outline-none focus:border-chem-darkblue">
                      {['quantif', 'manual'].map((m) => <option key={m} value={m}>{METHOD_PLAIN[m]}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-col gap-0.5 text-[9px] font-semibold uppercase text-chem-gray2">
                    Transport
                    <Segmented label={`Transport FY${y}`} value={yr.mode} onChange={(v) => setMode(y, v)}
                      options={[{ value: 'air', label: MODE_PLAIN.air, icon: <Plane w={11} /> }, { value: 'sea', label: MODE_PLAIN.sea, icon: <Truck w={11} /> }]} />
                  </div>
                  <label className="flex flex-col gap-0.5 text-[9px] font-semibold uppercase text-chem-gray2">
                    Produits attendus au Niger en
                    <input type="month" value={data.needDates[y]} onChange={(e) => e.target.value && setNeed(y, e.target.value)} aria-label={`Date de besoin FY${y}`}
                      className="bg-white border border-chem-gray1-20 rounded-md px-1.5 py-0.5 text-[11px] font-normal normal-case text-chem-gray1 focus:outline-none focus:border-chem-darkblue" />
                  </label>
                  <span className="ml-auto"><StatusBadge status={a.status} /></span>
                </div>
                {yr.method === 'quantif' && (
                  <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-chem-gray1 cursor-pointer">
                    <input type="checkbox" checked={!!data.maximize[y]} onChange={(e) => setMaximize(y, e.target.checked)} className="accent-chem-darkblue w-3.5 h-3.5" />
                    Si le budget dépasse la quantification PSN, utiliser le reste pour commander davantage (mêmes proportions)
                  </label>
                )}
                {(yr.method === 'quantif' || yr.method === 'manual') && needEmpty && (
                  <p className={`mt-1.5 text-[10px] ${yr.method === 'quantif' ? NEG.text : 'text-chem-gray2'} flex items-center gap-1`}>
                    <AlertTriangle w={11} /> La quantification PSN pour FY{y} n’est pas encore saisie (tableau ci-dessous){yr.method === 'quantif' ? ' : aucune quantité ne peut être calculée.' : '.'}
                  </p>
                )}
                {yr.mode === 'air' && mildaQty > 0 && (
                  <p className="mt-1.5 text-[10px] text-chem-gray2">Les {fmtNum(mildaQty)} moustiquaires prévues ne sont pas comptées : elles ne peuvent voyager que par bateau.</p>
                )}
                <p className="mt-1.5 text-[10px] text-chem-gray1 leading-relaxed flex items-start gap-1.5"><Calendar w={11} className="mt-0.5 text-chem-darkblue" /> {deliverySentence(a, yr.mode)}</p>
                <p className="mt-1 text-[10px] text-chem-gray2 leading-relaxed flex items-start gap-1.5">
                  <ModeIcon mode={alt.mode} />
                  {MODE_PLAIN[alt.mode]} plutôt : arrivée {fmtMonth(altA.arrivalMin)} – {fmtMonth(altA.arrivalMax)} pour une commande aujourd’hui
                  {Math.abs(diff) >= 1 && (yr.method === 'manual'
                    ? `, coût ${diff > 0 ? 'supérieur' : 'inférieur'} de ${fmtUsd(Math.abs(diff), 0)} pour les mêmes quantités.`
                    : `, ${diff > 0 ? 'davantage' : 'moins'} de produits achetés (${diff > 0 ? '+' : '−'} ${fmtUsd(Math.abs(diff), 0)} de valeur de produits).`)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <QuantificationCard data={data} sim={sim} onChange={(y, id, v) => setYearQty('quantification', y, id, v)}
            subtitle="saisissez les quantités par produit et par année ; le split (part de chaque produit dans le budget) se calcule automatiquement"
            defaultOpen />
          <p className="mt-2 text-[11px] text-chem-gray2 flex items-center gap-1.5">
            Les quantités à commander qui en résultent s’affichent à l’étape 3 :
            <a href="#etape-quantites" className="font-semibold text-chem-darkblue hover:underline">voir les quantités à commander</a>
          </p>
        </div>
      </Step>

      {/* ─── Étape 3 : quantités à commander ─── */}
      <Step n="3" id="etape-quantites" icon={ListChecks} title="Quantités à commander"
        subtitle="Résultat à communiquer : quantités par produit, coût estimé livré au Niger (produit + transport) et couverture de la quantification PSN.">
        {copied && (
          <p role="status" className={`mb-2 px-2.5 py-1.5 rounded-xl border text-[11px] ${copied === 'error' ? `${NEG.bg} ${NEG.border} ${NEG.text}` : `${POS.bg} ${POS.border} ${POS.text}`}`}>
            {copied === 'error' ? 'Copie impossible dans ce navigateur : utilisez l’export Excel.' : `Texte FY${copied} copié : collez-le dans votre e-mail.`}
          </p>
        )}
        <div className="space-y-3">
          {FUTURE_YEARS.map((y) => (
            <OrderCard key={y} yr={sim.years[y]} a={deliveries[y]} data={data}
              onCopy={() => doCopy(y)}
              onQty={(id, v) => setYearQty('regularQtys', y, id, v)}
              onMildaQty={(id, v) => setYearQty('manualQtys', y, id, v)}
              onAdjust={() => fillRegularQtys(y, 'current')}
              onFill={(src) => fillRegularQtys(y, src)} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onExport()} disabled={!!busy}
            className="flex items-center gap-1.5 px-3 py-2 bg-chem-darkblue text-white rounded-xl font-semibold text-[11px] uppercase hover:bg-chem-gray1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-wait">
            <FileSpreadsheet w={13} /> Exporter le scénario en Excel
          </button>
          <span className="text-[10px] text-chem-gray2">Le fichier contient une feuille « Quantités à commander » prête à transmettre, et le détail des calculs.</span>
        </div>
      </Step>

      <Glossary />
    </div>
  );
}

// ─── Délais (hypothèses) ─────────────────────────────────────────────────────
function LeadTimeEditor({ lt, setLead }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase text-chem-darkblue hover:underline">
        {open ? <ChevronDown w={12} /> : <ChevronRight w={12} />} Hypothèses de délais utilisées (modifiables)
      </button>
      {open && (
        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-2">
          {[['air', 'Avion', 'fabrication et préparation de la commande (3 à 5 mois) + vol et dédouanement à Niamey (1 à 2 mois)'],
            ['sea', 'Bateau + route via Lomé', 'fabrication (3 à 5 mois) + traversée jusqu’à Lomé (1 à 2 mois) + port et route Togo – Burkina Faso – Niger (2 à 6 mois, très variable)']].map(([m, label, detail]) => (
            <div key={m} className="rounded-xl bg-white border border-chem-gray1-20 p-2">
              <p className="text-[11px] font-semibold flex items-center gap-1"><ModeIcon mode={m} /> {label}</p>
              <p className="text-[9px] text-chem-gray2 mt-0.5">{detail}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-chem-gray2">
                de <NumInput value={lt[m].min} onChange={(v) => setLead(m, 'min', v)} ariaLabel={`Délai minimum ${label} (mois)`} className="w-12" />
                à <NumInput value={lt[m].max} onChange={(v) => setLead(m, 'max', v)} ariaLabel={`Délai maximum ${label} (mois)`} className="w-12" /> mois
              </div>
            </div>
          ))}
          <p className="md:col-span-2 text-[9px] text-chem-gray2 italic">Valeurs indicatives à confirmer avec l’équipe GHSC-PSM ; elles ne changent que les dates, pas les quantités.</p>
        </div>
      )}
    </div>
  );
}

// ─── Carte « quantités à commander » d'un exercice ──────────────────────────
function OrderCard({ yr, a, data, onCopy, onQty, onMildaQty, onAdjust, onFill }) {
  const manual = yr.method === 'manual';
  const hasNeed = yr.lines.some((l) => l.need > 0);
  const r = role(yr.balance);
  const chip = 'text-[10px] font-semibold text-chem-darkblue bg-white border border-chem-blue-20 rounded-full px-2 py-0.5 hover:bg-chem-blue-10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const [showAll, setShowAll] = useState(false);
  // Hors saisie manuelle, on masque les produits sans quantité ni demande (lisibilité).
  const hidden = manual ? [] : yr.lines.filter((l) => !l.isMilda && l.qty === 0 && !(l.need > 0));
  const lines = showAll ? yr.lines : yr.lines.filter((l) => !hidden.includes(l));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <section className="rounded-2xl border border-chem-gray1-20 overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-chem-blue-10/50 border-b border-chem-gray1-20">
        <h3 className="text-[13px] font-bold text-chem-darkblue">FY{yr.year}</h3>
        <span className="text-[10px] text-chem-gray2 flex items-center gap-1"><ModeIcon mode={yr.mode} /> {MODE_PLAIN[yr.mode]} · {METHOD_PLAIN[yr.method]}</span>
        <StatusBadge status={a.status} />
        <span className="ml-auto text-right text-[11px]">
          <span className="block text-[9px] font-semibold uppercase text-chem-gray2">{yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget'}</span>
          <span className={`text-[14px] ${r.text}`}>{fmtUsd(Math.abs(yr.balance), 0)}</span>
        </span>
      </header>
      <p className="px-3 py-1.5 text-[11px] text-chem-gray1 border-b border-chem-gray1-10">
        Avec <strong>{fmtUsd(yr.available, 0)}</strong> disponibles pour les produits, on peut commander pour <strong>{fmtUsd(yr.total, 0)}</strong> (livré au Niger, transport compris).
        <span className="mt-0.5 text-[10px] text-chem-gray2 flex items-start gap-1"><Calendar w={11} className="mt-0.5" /> {deliverySentence(a, yr.mode)}</span>
      </p>
      {yr.method === 'quantif' && !hasNeed && (
        <p className={`px-3 py-1.5 text-[11px] ${NEG.text} ${NEG.bg} border-b border-chem-gray1-10 flex items-center gap-1.5`}>
          <AlertTriangle w={12} /> Aucune quantité calculée : saisissez la quantification PSN de FY{yr.year} à l’étape 2
          <a href="#etape-repartition" className="font-semibold underline">(aller à l’étape 2)</a>.
        </p>
      )}
      {manual ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-chem-yellow/10 border-b border-chem-gray1-10">
          <span className="text-[10px] text-chem-gray2">Partir de :</span>
          <button type="button" className={chip} disabled={!hasNeed} onClick={() => onFill('need')}>la quantification PSN</button>
          <button type="button" className={chip} disabled={!hasNeed} onClick={() => onFill('quantif')}>la quantification ajustée au budget</button>
          <span className="text-[10px] text-chem-gray2">puis modifiez les quantités : le reste du budget se met à jour.</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-chem-gray1-10">
          <button type="button" className={chip} onClick={onAdjust}>Ajuster ces quantités à la main</button>
          <span className="text-[10px] text-chem-gray2">reprend les quantités ci-dessous et passe en « {METHOD_PLAIN.manual} ».</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[11px] tabular-nums">
          <thead>
            <tr className="text-[9px] font-semibold uppercase text-chem-gray2 bg-chem-gray1-5 border-b border-chem-gray1-20">
              <th className="px-2 py-1.5 text-left">Produit</th>
              <th className="px-2 py-1.5 text-right">Quantité à commander</th>
              <th className="px-2 py-1.5 text-right">Coût estimé livré</th>
              <th className="px-2 py-1.5 text-right">Quantification PSN</th>
              <th className="px-2 py-1.5 text-right">Couverture</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className={`border-b border-chem-gray1-10 ${l.qty > 0 || manual || l.isMilda ? '' : 'text-chem-gray2'}`}>
                <td className="px-2 py-1">
                  <span className="font-semibold">{l.plain}</span>
                  <span className="block text-[9px] text-chem-gray2">{cap(l.use)} · réf. {l.name}</span>
                </td>
                <td className="px-2 py-1 text-right">
                  {l.isMilda
                    ? <NumInput value={data.manualQtys[yr.year][l.id]} onChange={(v) => onMildaQty(l.id, v)} ariaLabel={`Quantité ${l.plain} FY${yr.year}`} className="w-28" />
                    : manual
                      ? <NumInput value={data.regularQtys[yr.year][l.id]} onChange={(v) => onQty(l.id, v)} ariaLabel={`Quantité ${l.plain} FY${yr.year}`} className="w-28" />
                      : fmtNum(l.qty)}
                </td>
                <td className="px-2 py-1 text-right">{fmtUsd(l.landed, 0)}</td>
                <td className="px-2 py-1 text-right text-chem-gray2">{l.need > 0 ? fmtNum(l.need) : '—'}</td>
                <td className="px-2 py-1 text-right">
                  {l.need > 0 ? (
                    <span className={`inline-flex items-center gap-1 ${l.coverage >= 0.995 ? POS.text : 'text-chem-gray1'}`}>
                      <span className="inline-block w-10 h-1.5 rounded-full bg-chem-gray1-10 overflow-hidden" aria-hidden="true">
                        <span className={`block h-full ${l.coverage >= 0.995 ? 'bg-chem-green2' : 'bg-chem-blue'}`} style={{ width: `${Math.min(100, l.coverage * 100)}%` }} />
                      </span>
                      {fmtNum(l.coverage * 100, 0)} %
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {hidden.length > 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-1 text-[10px] text-chem-gray2">
                  <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="text-chem-darkblue font-semibold hover:underline">
                    {showAll ? 'Masquer' : 'Afficher'} les {hidden.length} produit(s) sans quantité
                  </button>
                </td>
              </tr>
            )}
            <tr className="text-[11px] border-t border-chem-gray1-20">
              <td className="px-2 py-1.5 font-semibold uppercase text-chem-gray2">Total</td>
              <td />
              <td className="px-2 py-1.5 text-right text-[12px]">{fmtUsd(yr.total, 0)}</td>
              <td colSpan={2} className="px-2 py-1.5 text-right text-[10px] text-chem-gray2">sur {fmtUsd(yr.available, 0)} disponibles</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-chem-gray1-5 border-t border-chem-gray1-10">
        <button type="button" onClick={onCopy}
          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-chem-blue-20 rounded-xl font-semibold text-[10px] uppercase text-chem-darkblue hover:bg-chem-blue-10 transition-all">
          <Clipboard w={11} /> Copier pour un e-mail
        </button>
        <span className="text-[10px] text-chem-gray2">Coût estimé livré = prix du produit + transport jusqu’au Niger, en dollars américains.</span>
      </div>
    </section>
  );
}

// ─── Lexique ─────────────────────────────────────────────────────────────────
const TERMS = [
  ['Année fiscale (FY)', 'Année budgétaire du gouvernement américain, du 1er octobre au 30 septembre. FY2027 = 1er octobre 2026 – 30 septembre 2027.'],
  ['Réserve d’assistance', 'Partie du budget réservée à l’assistance technique, à l’entreposage et à la distribution ; elle ne sert pas à acheter des produits.'],
  ['Solde FY2026', 'Budget FY2026 non utilisé au 30 septembre 2026 (après réserve et accruals), reporté sur FY2027 ou lissé sur les autres années du MOU.'],
  ['Accruals', 'Montants engagés au 30 septembre 2026 sur le budget FY2026 (commandes en cours de comptabilisation) ; ils sont déduits avant de calculer le solde.'],
  ['Quantification PSN', 'Quantités de produits établies par la quantification du PSN pour chaque année ; elles servent de base pour répartir le budget entre les produits.'],
  ['Couverture', 'Quantité commandée ÷ quantité de la quantification PSN. 100 % = la quantification est entièrement couverte.'],
  ['Coût estimé livré (landed)', 'Prix du produit à la sortie d’usine (EXW) + coût du transport jusqu’au Niger.'],
  ['EXW', 'Prix « départ usine » : prix du produit seul, avant transport.'],
  ['Fret', 'Coût du transport, exprimé en pourcentage du prix du produit ; plus élevé par avion que par bateau.'],
  ['CPS', 'Chimioprévention du paludisme saisonnier : distribution d’AQ + SP aux jeunes enfants pendant la saison des pluies (en général juillet-octobre).'],
  ['TPIg', 'Traitement préventif intermittent du paludisme chez la femme enceinte (SP).'],
  ['CTA / AL', 'Combinaison thérapeutique à base d’artémisinine ; AL = artéméther-luméfantrine, traitement du paludisme simple, par tranche de poids.'],
  ['TDR (RDT)', 'Test de diagnostic rapide du paludisme.'],
  ['MILDA', 'Moustiquaire imprégnée d’insecticide à longue durée d’action. PBO et IG2 : moustiquaires plus efficaces là où les moustiques résistent aux insecticides. Transport par bateau uniquement.'],
  ['GHSC-PSM', 'Programme d’achat et d’approvisionnement en produits de santé du gouvernement américain, qui passe les commandes.'],
];

function Glossary() {
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

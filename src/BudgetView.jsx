// ─── Vue 1 : paramètres budgétaires ──────────────────────────────────────────
// Budgets du MOU par année fiscale (FY2026-FY2030), réserve d'assistance, et
// clôture de FY2026 au 30/09/2026 : accruals, assistance engagée, report du solde.

import { FUTURE_YEARS } from './model.js';
import { fiscalYear } from './logistics.js';
import { Calendar, Plus, Trash2, Wallet } from './icons.jsx';
import { NEG, NumInput, fmtUsd, role } from './ui.jsx';
import { Section, Segmented, fyPeriod } from './common.jsx';

export default function BudgetView({ data, sim, today, updateData, setBudget, setReserve, accrualHandlers }) {
  const y26 = sim.years['2026'];
  const totalAvailable = FUTURE_YEARS.reduce((s, y) => s + sim.years[y].available, 0);
  return (
      <Section icon={Wallet} title="Budgets disponibles dans le cadre du MOU"
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

          {data.fy26Spending === 'planned' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-chem-gray2">Autres commandes FY2026 (hors accruals) :</span>
            <Segmented label="Autres commandes FY2026" value={data.fy26Spending}
              onChange={(v) => updateData((d) => ({ ...d, fy26Spending: v }))}
              options={[{ value: 'unspent', label: 'Aucune' }, { value: 'planned', label: 'Selon les quantités FY26 saisies' }]} />
          </div>
          )}

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
      </Section>
  );
}

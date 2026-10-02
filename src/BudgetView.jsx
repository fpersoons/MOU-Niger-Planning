// ─── Vue 1 : paramètres budgétaires ──────────────────────────────────────────
// Un seul tableau par année fiscale (FY2026-FY2030) : budget du MOU, réserve
// d'assistance, accruals, report reçu, budget produits et règle de report du solde.

import { CARRY_LABEL, CARRY_RULES, CARRY_YEARS, YEARS } from './model.js';
import { fiscalYear } from './logistics.js';
import { Info, Wallet } from './icons.jsx';
import { NEG, NumInput, fmtUsd, role } from './ui.jsx';
import { Section, fyPeriod } from './common.jsx';

export default function BudgetView({ data, sim, today, updateData, setBudget, setReserve }) {
  const setAccruals = (y, v) => updateData((d) => ({ ...d, yearAccruals: { ...d.yearAccruals, [y]: Math.max(0, v) } }));
  const setRule = (y, v) => updateData((d) => ({ ...d, carryRules: { ...d.carryRules, [y]: v } }));
  const sum = (k) => YEARS.reduce((s, y) => s + (Number(sim.years[y][k]) || 0), 0);

  return (
    <Section icon={Wallet} title="Budgets disponibles dans le cadre du MOU"
      subtitle="Pour chaque année fiscale (1er octobre – 30 septembre) : budget, réserve d’assistance, accruals et traitement du solde.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[11px] tabular-nums">
          <thead>
            <tr className="text-[9px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20 bg-chem-gray1-5">
              <th className="px-2 py-1.5 text-left">Année fiscale</th>
              <th className="px-2 py-1.5 text-right">Budget MOU</th>
              <th className="px-2 py-1.5 text-right" title="Assistance technique, entreposage, distribution">Réserve assistance<span className="block normal-case font-normal">(AT, entreposage, distribution)</span></th>
              <th className="px-2 py-1.5 text-right">Accruals<span className="block normal-case font-normal">(montants engagés)</span></th>
              <th className="px-2 py-1.5 text-right">Report reçu</th>
              <th className="px-2 py-1.5 text-right">= Budget produits</th>
              <th className="px-2 py-1.5 text-left">Report du solde</th>
            </tr>
          </thead>
          <tbody>
            {YEARS.map((y) => {
              const yr = sim.years[y];
              const fy = fiscalYear(y);
              const closed = today > fy.end;
              const current = today >= fy.start && today <= fy.end;
              return (
                <tr key={y} className={`border-b border-chem-gray1-10 ${closed ? 'bg-chem-gray1-5' : ''}`}>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold">FY{y}</span>
                    {current && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-chem-blue-10 text-chem-darkblue border border-chem-blue-20">en cours</span>}
                    {closed && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-chem-gray1-10 text-chem-gray2 border border-chem-gray1-20">clos</span>}
                    <span className="block text-[9px] text-chem-gray2">{fyPeriod(y)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right"><NumInput value={data.budgets[y]} onChange={(v) => setBudget(y, v)} ariaLabel={`Budget MOU FY${y}`} className="w-28" /></td>
                  <td className="px-2 py-1.5 text-right">
                    {y === '2026'
                      ? <span className="text-[10px] text-chem-gray2" title="Exercice clos : seuls les accruals sont déduits ; la réserve non engagée fait partie du solde">—</span>
                      : <NumInput value={data.reserves[y]} onChange={(v) => setReserve(y, v)} ariaLabel={`Réserve assistance FY${y}`} className="w-28" />}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <NumInput value={data.yearAccruals[y]} onChange={(v) => setAccruals(y, v)} ariaLabel={`Accruals FY${y}`} className="w-28" />
                    {y === '2026' && <span className="block text-[9px] text-chem-gray2">au 30/09/2026</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-chem-gray2">{yr.bonus ? `${yr.bonus > 0 ? '+' : '−'} ${fmtUsd(Math.abs(yr.bonus), 0)}` : '—'}</td>
                  <td className={`px-2 py-1.5 text-right text-[13px] ${yr.available < 0 ? NEG.text : 'text-chem-gray1'}`}>
                    {y === '2026'
                      ? <><span className={role(yr.balance).text}>{fmtUsd(yr.balance, 0)}</span><span className="block text-[9px] text-chem-gray2">solde au 30/09/2026</span></>
                      : <>{fmtUsd(yr.available, 0)}{yr.balance > 0.5 && <span className="block text-[9px] text-chem-gray2">dont non utilisé : {fmtUsd(yr.balance, 0)}</span>}</>}
                  </td>
                  <td className="px-2 py-1.5">
                    {CARRY_YEARS.includes(y) ? (
                      <select value={data.carryRules[y]} onChange={(e) => setRule(y, e.target.value)} aria-label={`Report du solde FY${y}`}
                        className="bg-white border border-chem-gray1-20 rounded-md px-1.5 py-1 text-[11px] font-semibold text-chem-darkblue focus:outline-none focus:border-chem-darkblue">
                        {CARRY_RULES.map((r) => <option key={r} value={r}>{CARRY_LABEL[r]}</option>)}
                      </select>
                    ) : <span className="text-[10px] text-chem-gray2">dernière année du MOU</span>}
                    {yr.carryOut ? <span className="block text-[9px] text-chem-gray2 mt-0.5">reporte {fmtUsd(yr.carryOut, 0)}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-[11px] border-t border-chem-gray1-20">
              <td className="px-2 py-1.5 font-semibold uppercase text-chem-gray2">Total</td>
              <td className="px-2 py-1.5 text-right">{fmtUsd(sum('base'), 0)}</td>
              <td className="px-2 py-1.5 text-right">{fmtUsd(sum('reserve'), 0)}</td>
              <td className="px-2 py-1.5 text-right">{fmtUsd(sum('accruals'), 0)}</td>
              <td />
              <td className="px-2 py-1.5 text-right text-[10px] text-chem-gray2" colSpan={2}>
                Total MOU pour les produits (budgets − réserves − accruals) : <span className="text-[13px] text-chem-gray1">{fmtUsd(sum('base') - sum('reserve') - sum('accruals'), 0)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-chem-gray2 leading-relaxed flex items-start gap-1.5">
        <Info w={12} className="mt-0.5 text-chem-darkblue" />
        <span>
          <strong>Budget produits</strong> = budget MOU + report reçu − réserve d’assistance − accruals.
          {' '}<strong>Solde</strong> d’une année : pour FY2026 (clos), budget − accruals (la réserve non engagée fait partie du solde) ;
          pour les années suivantes, la part du budget produits non utilisée dans les scénarios.
          {' '}Le solde est reporté sur l’<strong>année suivante</strong>, <strong>lissé</strong> à parts égales sur toutes les années suivantes du MOU, ou non reporté.
        </span>
      </p>
    </Section>
  );
}

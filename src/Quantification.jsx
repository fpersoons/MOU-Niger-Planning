// ─── Quantification PSN : quantités de référence par produit, FY27-FY30 ──────
import { useState } from 'react';
import { FUTURE_YEARS, REGULAR, num } from './model.js';
import { ChevronDown, ChevronRight } from './icons.jsx';
import { NEG, NumInput, POS, fmtNum, fmtUsd } from './ui.jsx';

export default function QuantificationCard({ data, sim, onChange, title = 'Quantification PSN', subtitle = 'quantités par produit et par année fiscale, FY27-FY30', defaultOpen }) {
  const [isOpen, setIsOpen] = useState(() => defaultOpen ?? REGULAR.some((c) => FUTURE_YEARS.some((y) => num(data.quantification[y][c.id]) > 0)));
  const td = 'px-1.5 py-1 text-right';
  // Split de chaque année = part de chaque produit dans la valeur EXW de la quantification.
  const totals = Object.fromEntries(FUTURE_YEARS.map((y) => [y,
    REGULAR.reduce((s, c) => s + num(data.quantification[y][c.id]) * num(data.commodities[c.id].price), 0)]));
  const share = (y, c) => (totals[y] > 0 ? (num(data.quantification[y][c.id]) * num(data.commodities[c.id].price)) / totals[y] : 0);
  return (
    <section className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen} className="flex items-center gap-2 flex-1 text-left">
          {isOpen ? <ChevronDown w={16} className="text-chem-darkblue" /> : <ChevronRight w={16} className="text-chem-gray1-40" />}
          <span className={`text-[13px] font-bold tracking-tight ${isOpen ? 'text-chem-darkblue' : ''}`}>{title}</span>
          <span className="text-[9px] font-medium italic text-chem-gray2">{subtitle}</span>
        </button>
      </div>
      {isOpen && (
        <div className="border-t border-chem-gray1-10 overflow-x-auto">
          <p className="px-3 py-1.5 text-[9px] text-chem-darkblue bg-chem-blue-10 border-b border-chem-blue-20">
            Saisissez ici les quantités de la quantification PSN. Le split de chaque produit (sa part dans la valeur totale de l’année) se calcule automatiquement et sert à répartir le budget ; les quantités à commander et leur couverture s’affichent dans chaque tableau annuel.
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
                  <td className="px-2 py-1">
                    <span className="font-semibold">{c.name}</span>
                    <span className="block text-[9px] text-chem-gray2">{c.plain}</span>
                  </td>
                  <td className={`${td} text-chem-gray2`}>{fmtUsd(data.commodities[c.id].price)}</td>
                  {FUTURE_YEARS.map((y) => (
                    <td key={y} className={td}>
                      <NumInput value={data.quantification[y][c.id]} onChange={(v) => onChange(y, c.id, v)} ariaLabel={`Quantification ${c.name} FY ${y}`} className="w-24" />
                      <span className="block text-[9px] text-chem-gray2" title="Split : part du produit dans la valeur de la quantification de l’année">
                        {totals[y] > 0 ? `split ${fmtNum(share(y, c) * 100, 1)} %` : '\u00a0'}
                      </span>
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


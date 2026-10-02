// ─── Vue 2 : paramètres logistiques ──────────────────────────────────────────
// Coûts unitaires par intrant (EXW, livré bateau + route, livré avion), quantités
// financées par l'USG dans le PSN 2027-2031 (d'où le split en %).

import { COMMODITIES, PSN_YEARS, REGULAR, freightRate, num, psnSplit, referenceCosts } from './model.js';
import { Layers, Package, RotateCcw, Truck } from './icons.jsx';
import { NumInput, fmtNum, fmtUsd } from './ui.jsx';
import { ModeIcon, Section } from './common.jsx';

export default function LogisticsView({ data, updateField, setPsnQty, updateData }) {
  // Split sur l'ensemble 2027-2031 (part de chaque intrant dans la valeur EXW totale).
  const totalQty = (id) => PSN_YEARS.reduce((s, y) => s + num(data.quantification[y][id]), 0);
  const totalValue = REGULAR.reduce((s, c) => s + totalQty(c.id) * num(data.commodities[c.id].price), 0);
  const yearValue = (y) => REGULAR.reduce((s, c) => s + num(data.quantification[y][c.id]) * num(data.commodities[c.id].price), 0);
  const splits = Object.fromEntries(PSN_YEARS.map((y) => [y, psnSplit(data, y)]));

  return (
    <div className="space-y-3">
      {/* ─── Coûts par intrant ─── */}
      <Section icon={Package} title="Coûts par intrant"
        subtitle="Coût par unité d’achat, en dollars : prix départ usine (EXW) et coût livré au Niger (landed) selon le mode de transport. Par défaut : coût livré maritime du fichier MOU 27 Niger (Commodity calculator, colonne F) ; prix EXW = livré maritime ÷ 1,5 (fret maritime 50 %) ; livré avion = EXW + fret aérien de référence."
        action={(
          <button type="button" title="Remplacer les coûts par ceux du fichier MOU 27 Niger"
            onClick={() => { if (window.confirm('Rétablir les coûts de référence (MOU 27) ?\nLes prix EXW et coûts livrés saisis seront remplacés.')) updateData((d) => ({ ...d, commodities: Object.fromEntries(Object.entries(d.commodities).map(([id, p]) => [id, { ...p, ...referenceCosts()[id] }])) })); }}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-chem-blue-20 rounded-xl font-semibold text-[10px] uppercase text-chem-darkblue hover:bg-chem-blue-10 transition-all">
            <RotateCcw w={11} /> Coûts de référence MOU 27
          </button>
        )}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[11px] tabular-nums">
            <thead>
              <tr className="text-[9px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20 bg-chem-gray1-5">
                <th className="px-2 py-1.5 text-left">Intrant</th>
                <th className="px-2 py-1.5 text-right">Prix EXW ($/unité)</th>
                <th className="px-2 py-1.5 text-right"><span className="inline-flex items-center gap-1"><Truck w={10} /> Livré bateau + route ($/unité)</span></th>
                <th className="px-2 py-1.5 text-right"><span className="inline-flex items-center gap-1"><ModeIcon mode="air" w={10} /> Livré avion ($/unité)</span></th>
              </tr>
            </thead>
            <tbody>
              {COMMODITIES.map((c) => {
                const p = data.commodities[c.id];
                const fr = (mode) => {
                  const r = freightRate(p, mode);
                  return num(p.price) > 0 ? <span className="block text-[9px] text-chem-gray2">transport + {fmtNum(r, 0)} %</span> : null;
                };
                return (
                  <tr key={c.id} className="border-b border-chem-gray1-10">
                    <td className="px-2 py-1">
                      <span className="font-semibold">{c.name}</span>
                      <span className="block text-[9px] text-chem-gray2">{c.plain} · {c.unit}</span>
                    </td>
                    <td className="px-2 py-1 text-right"><NumInput value={p.price} onChange={(v) => updateField(c.id, 'price', Math.max(0, v))} ariaLabel={`Prix EXW — ${c.name}`} className="w-24" /></td>
                    <td className="px-2 py-1 text-right">
                      <NumInput value={p.landedSea} onChange={(v) => updateField(c.id, 'landedSea', Math.max(0, v))} ariaLabel={`Coût livré bateau + route — ${c.name}`} className="w-24" />
                      {fr('sea')}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.isMilda
                        ? <span className="text-[10px] text-chem-gray2">bateau uniquement</span>
                        : <><NumInput value={p.landedAir} onChange={(v) => updateField(c.id, 'landedAir', Math.max(0, v))} ariaLabel={`Coût livré avion — ${c.name}`} className="w-24" />{fr('air')}</>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── PSN 2027-2031 ─── */}
      <Section icon={Layers} title="Quantités financées par l’USG — PSN 2027-2031"
        subtitle="Saisissez les quantités par intrant et par année. Le split (part de chaque intrant dans la valeur de l’année) se calcule automatiquement et sert à répartir le budget dans les scénarios.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[11px] tabular-nums">
            <thead>
              <tr className="text-[9px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20 bg-chem-gray1-5">
                <th className="px-2 py-1.5 text-left">Intrant</th>
                {PSN_YEARS.map((y) => <th key={y} className="px-1.5 py-1.5 text-right">{y}{y === '2031' && <span className="block normal-case font-normal">(hors MOU)</span>}</th>)}
                <th className="px-2 py-1.5 text-right">Total 2027-2031</th>
              </tr>
            </thead>
            <tbody>
              {REGULAR.map((c) => {
                const tq = totalQty(c.id);
                const ts = totalValue > 0 ? (tq * num(data.commodities[c.id].price)) / totalValue : 0;
                return (
                  <tr key={c.id} className="border-b border-chem-gray1-10">
                    <td className="px-2 py-1">
                      <span className="font-semibold">{c.name}</span>
                      <span className="block text-[9px] text-chem-gray2">{c.plain}</span>
                    </td>
                    {PSN_YEARS.map((y) => (
                      <td key={y} className="px-1.5 py-1 text-right">
                        <NumInput value={data.quantification[y][c.id]} onChange={(v) => setPsnQty(y, c.id, v)} ariaLabel={`PSN ${c.name} ${y}`} className="w-24" />
                        <span className="block text-[9px] text-chem-gray2">{yearValue(y) > 0 ? `split ${fmtNum(splits[y][c.id] * 100, 1)} %` : ' '}</span>
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right">
                      {fmtNum(tq)}
                      <span className="block text-[9px] text-chem-gray2">{totalValue > 0 ? `split ${fmtNum(ts * 100, 1)} %` : ' '}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-[10px] border-t border-chem-gray1-20">
                <td className="px-2 py-1.5 font-semibold uppercase text-chem-gray2">Valeur EXW</td>
                {PSN_YEARS.map((y) => <td key={y} className="px-1.5 py-1.5 text-right">{fmtUsd(yearValue(y), 0)}</td>)}
                <td className="px-2 py-1.5 text-right">{fmtUsd(totalValue, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-chem-gray2">Le MOU couvre FY2027-FY2030 : l’année 2031 du PSN est indiquée pour information. Les moustiquaires (MILDA) se saisissent directement dans les scénarios (bateau uniquement).</p>
      </Section>

    </div>
  );
}

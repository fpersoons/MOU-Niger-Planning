// ─── Vue 2 : paramètres logistiques ──────────────────────────────────────────
// Coûts unitaires par intrant (EXW, livré bateau + route, livré avion), quantités
// financées par l'USG dans le PSN 2027-2031 (d'où le split en %), délais d'acheminement.

import { useState } from 'react';
import { COMMODITIES, PSN_YEARS, REGULAR, freightRate, num, psnSplit } from './model.js';
import { addMonths, fmtMonth } from './logistics.js';
import { AlertTriangle, ChevronDown, ChevronRight, Layers, Package, Truck } from './icons.jsx';
import { NumInput, fmtNum, fmtUsd } from './ui.jsx';
import { ModeIcon, Section } from './common.jsx';

export default function LogisticsView({ data, today, updateField, setPsnQty, updateData }) {
  // Split sur l'ensemble 2027-2031 (part de chaque intrant dans la valeur EXW totale).
  const totalQty = (id) => PSN_YEARS.reduce((s, y) => s + num(data.quantification[y][id]), 0);
  const totalValue = REGULAR.reduce((s, c) => s + totalQty(c.id) * num(data.commodities[c.id].price), 0);
  const yearValue = (y) => REGULAR.reduce((s, c) => s + num(data.quantification[y][c.id]) * num(data.commodities[c.id].price), 0);
  const splits = Object.fromEntries(PSN_YEARS.map((y) => [y, psnSplit(data, y)]));

  return (
    <div className="space-y-3">
      {/* ─── Coûts par intrant ─── */}
      <Section icon={Package} title="Coûts par intrant"
        subtitle="Coût unitaire en dollars : prix départ usine (EXW) et coût livré au Niger (landed) selon le mode de transport.">
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
                      <span className="block text-[9px] text-chem-gray2">{c.plain}</span>
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

      <LeadTimes data={data} today={today} updateData={updateData} />
    </div>
  );
}

// ─── Délais et contexte d'acheminement ──────────────────────────────────────
function LeadTimes({ data, today, updateData }) {
  const [open, setOpen] = useState(false);
  const lt = data.leadTimes;
  const setLead = (mode, k, v) => updateData((d) => ({ ...d, leadTimes: { ...d.leadTimes, [mode]: { ...d.leadTimes[mode], [k]: Math.max(0, v) } } }));
  return (
    <section className="rounded-2xl border-2 border-chem-yellow bg-chem-yellow/10 p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-1.5 text-left">
        <AlertTriangle w={14} className="text-chem-orange1" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-chem-gray1">Délais d’acheminement vers le Niger</span>
        <span className="text-[10px] text-chem-gray2">avion {lt.air.min}-{lt.air.max} mois · bateau + route {lt.sea.min}-{lt.sea.max} mois</span>
        <span className="ml-auto">{open ? <ChevronDown w={14} /> : <ChevronRight w={14} />}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1 text-[11px] text-chem-gray1 leading-relaxed list-disc pl-5">
            <li>La frontière entre le Bénin et le Niger reste fermée : par bateau, les produits arrivent au port de <strong>Lomé (Togo)</strong> puis traversent le <strong>Burkina Faso</strong> par la route. Délais imprévisibles, risques de sécurité et de blocage importants.</li>
            <li>Une commande passée aujourd’hui n’arriverait pas avant <strong>{fmtMonth(addMonths(today, num(lt.air.min)))}</strong> par avion, ni avant <strong>{fmtMonth(addMonths(today, num(lt.sea.min)))}</strong> par bateau.</li>
            <li>L’avion évite la route mais coûte plus cher : à budget égal, on achète moins. Les moustiquaires ne voyagent que par bateau.</li>
            <li>Les produits de la CPS (AQ + SP) doivent être au Niger avant la campagne (en général juillet-octobre).</li>
          </ul>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[['air', 'Avion', 'fabrication (3 à 5 mois) + vol et dédouanement à Niamey (1 à 2 mois)'],
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
          </div>
          <p className="text-[9px] text-chem-gray2 italic">Hypothèses à confirmer avec l’équipe GHSC-PSM ; elles ne changent que les dates, pas les quantités.</p>
        </div>
      )}
    </section>
  );
}

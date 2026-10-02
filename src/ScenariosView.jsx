// ─── Vue 3 : scénarios ───────────────────────────────────────────────────────
// Par année fiscale FY2027-FY2030 : quantités générées automatiquement selon le
// split PSN (tout le budget), ou quantités maximales achetables ajustées à la main.
// Transport (avion / bateau + route) et quantités à commander.

import { useState } from 'react';
import { CARRY_LABEL, FUTURE_YEARS, REGULAR, num, psnSplit } from './model.js';
import { fiscalYear } from './logistics.js';
import { AlertTriangle, Calculator, Clipboard, FileSpreadsheet, Info, ListChecks, Plane, RotateCcw, Truck } from './icons.jsx';
import { MODE_PLAIN, NEG, NumInput, POS, fmtNum, fmtUsd, role } from './ui.jsx';
import { Section, Segmented, copyText, emailText } from './common.jsx';

export default function ScenariosView({
  scenario, data, sim, today, busy, onExport, setMode, setMethod, setYearQty, fillRegularQtys, goToLogistics,
}) {
  const [copied, setCopied] = useState(null);
  // Année à venir : première année du MOU qui n'est pas encore terminée.
  const nextYear = FUTURE_YEARS.find((y) => today <= fiscalYear(y).end);
  const doCopy = async (y) => {
    const ok = await copyText(emailText(scenario.name, sim.years[y]));
    setCopied(ok ? y : 'error');
    setTimeout(() => setCopied(null), 3000);
  };

  return (
    <div className="space-y-3">
      {copied && (
        <p role="status" className={`px-2.5 py-1.5 rounded-xl border text-[11px] ${copied === 'error' ? `${NEG.bg} ${NEG.border} ${NEG.text}` : `${POS.bg} ${POS.border} ${POS.text}`}`}>
          {copied === 'error' ? 'Copie impossible dans ce navigateur : utilisez l’export Excel.' : `Texte FY${copied} copié : collez-le dans votre e-mail.`}
        </p>
      )}
      {FUTURE_YEARS.map((y) => (
        <YearScenario key={y} yr={sim.years[y]} data={data} upcoming={y === nextYear}
          onMode={(m) => setMode(y, m)}
          onMethod={(m) => (m === 'manual' ? fillRegularQtys(y, 'current') : setMethod(y, m))}
          onQty={(id, v) => setYearQty('regularQtys', y, id, v)}
          onMildaQty={(id, v) => setYearQty('manualQtys', y, id, v)}
          onFill={(src) => fillRegularQtys(y, src)}
          onCopy={() => doCopy(y)}
          goToLogistics={goToLogistics} />
      ))}
      <Summary sim={sim} busy={busy} onExport={onExport} />
    </div>
  );
}

// ─── Scénario d'une année ────────────────────────────────────────────────────
function YearScenario({ yr, data, upcoming, onMode, onMethod, onQty, onMildaQty, onFill, onCopy, goToLogistics }) {
  const [showAll, setShowAll] = useState(false);
  const manual = yr.method === 'manual';
  const split = psnSplit(data, yr.year);
  const hasPsn = REGULAR.some((c) => num(data.quantification[yr.year][c.id]) > 0);
  const r = role(yr.balance);
  const hidden = manual ? [] : yr.lines.filter((l) => !l.isMilda && l.qty === 0 && !(l.need > 0));
  const lines = showAll ? yr.lines : yr.lines.filter((l) => !hidden.includes(l));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const chip = 'flex items-center gap-1 text-[10px] font-semibold text-chem-darkblue bg-white border border-chem-blue-20 rounded-full px-2 py-0.5 hover:bg-chem-blue-10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <section className="bg-white rounded-2xl border border-chem-gray1-20 shadow-sm overflow-hidden">
      {/* En-tête : réglages de l'année */}
      <header className="px-3 py-2 bg-chem-blue-10/50 border-b border-chem-gray1-20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="text-[14px] font-bold text-chem-darkblue">FY{yr.year}</h3>
          <Segmented label={`Calcul FY${yr.year}`} value={yr.method} onChange={onMethod}
            options={[{ value: 'quantif', label: 'Automatique (split PSN)' }, { value: 'manual', label: 'Ajusté manuellement' }]} />
          <Segmented label={`Transport FY${yr.year}`} value={yr.mode} onChange={onMode}
            options={[{ value: 'air', label: MODE_PLAIN.air, icon: <Plane w={11} /> }, { value: 'sea', label: MODE_PLAIN.sea, icon: <Truck w={11} /> }]} />
          <span className="ml-auto text-right text-[11px] tabular-nums">
            <span className="block text-[9px] font-semibold uppercase text-chem-gray2">{yr.balance >= 0 ? 'Reste non utilisé' : 'Dépassement du budget'}</span>
            <span className={`text-[15px] ${r.text}`}>{fmtUsd(Math.abs(yr.balance), 0)}</span>
            {yr.carryOut > 0.5 && <span className="block text-[9px] text-chem-gray2">reporté : {CARRY_LABEL[yr.carryRule].toLowerCase()}</span>}
          </span>
        </div>
      </header>

      <div className="px-3 py-2 border-b border-chem-gray1-10 text-[11px] text-chem-gray1 space-y-1">
        <p>
          Budget pour les produits : <strong>{fmtUsd(yr.available, 0)}</strong>{yr.bonus ? <span className="text-chem-gray2"> (dont report reçu {fmtUsd(yr.bonus, 0)})</span> : null} · commandé : <strong>{fmtUsd(yr.total, 0)}</strong> (livré au Niger, transport compris)
          {manual ? ' · quantités ajustées à la main' : ' · tout le budget est réparti selon le split PSN'}.
        </p>
        {upcoming && (
          <p className={`text-[10px] flex items-start gap-1.5 ${yr.mode === 'air' ? 'text-chem-gray2' : NEG.text}`}>
            <Info w={11} className="mt-0.5" /> Année à venir : transport par avion recommandé pour respecter le plan d’approvisionnement.
          </p>
        )}
      </div>

      {!hasPsn && (
        <p className={`px-3 py-1.5 text-[11px] ${NEG.text} ${NEG.bg} border-b border-chem-gray1-10 flex flex-wrap items-center gap-1.5`}>
          <AlertTriangle w={12} /> Pas de quantités PSN pour {yr.year} : le split ne peut pas être calculé.
          <button type="button" onClick={goToLogistics} className="font-semibold underline">Saisir le PSN (paramètres logistiques)</button>
        </p>
      )}

      {manual && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-chem-yellow/10 border-b border-chem-gray1-10">
          <span className="text-[10px] text-chem-gray2">Modifiez les quantités ci-dessous ; le reste du budget se met à jour.</span>
          <button type="button" className={chip} disabled={!hasPsn} onClick={() => onFill('quantif')}><RotateCcw w={10} /> Repartir des quantités maximales selon le budget</button>
          <button type="button" className={chip} disabled={!hasPsn} onClick={() => onFill('need')}>Reprendre les quantités initiales du PSN</button>
        </div>
      )}

      <p className="px-3 py-1.5 text-[10px] text-chem-darkblue bg-chem-blue-10 border-b border-chem-blue-20">
        Les <strong>quantités commandables</strong> sont les quantités initialement prévues au PSN pour l’USG, <strong>ajustées pour rester dans le budget disponible</strong> de FY{yr.year}.
        Le pourcentage indique la part des quantités initiales du PSN que ce budget permet de couvrir.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[11px] tabular-nums">
          <thead>
            <tr className="text-[9px] font-semibold uppercase text-chem-gray2 bg-chem-gray1-5 border-b border-chem-gray1-20">
              <th className="px-2 py-1.5 text-left">Produit</th>
              <th className="px-2 py-1.5 text-right">Split PSN</th>
              <th className="px-2 py-1.5 text-right">Quantité commandable<span className="block normal-case font-normal">ajustée au budget disponible</span></th>
              <th className="px-2 py-1.5 text-right">Coût livré</th>
              <th className="px-2 py-1.5 text-right">Quantité initiale PSN {yr.year}<span className="block normal-case font-normal">prévue pour l’USG</span></th>
              <th className="px-2 py-1.5 text-right">% du PSN couvert<span className="block normal-case font-normal">par le budget disponible</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className={`border-b border-chem-gray1-10 ${l.qty > 0 || manual || l.isMilda ? '' : 'text-chem-gray2'}`}>
                <td className="px-2 py-1">
                  <span className="font-semibold">{l.plain}</span>
                  <span className="block text-[9px] text-chem-gray2">{cap(l.use)} · réf. {l.name} · unité : {l.unit}</span>
                </td>
                <td className="px-2 py-1 text-right text-chem-gray2">{l.isMilda ? '—' : `${fmtNum((split[l.id] || 0) * 100, 1)} %`}</td>
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
                <td colSpan={6} className="px-2 py-1 text-[10px]">
                  <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="text-chem-darkblue font-semibold hover:underline">
                    {showAll ? 'Masquer' : 'Afficher'} les {hidden.length} produit(s) sans quantité
                  </button>
                </td>
              </tr>
            )}
            <tr className="text-[11px] border-t border-chem-gray1-20">
              <td className="px-2 py-1.5 font-semibold uppercase text-chem-gray2" colSpan={3}>Total</td>
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
        <span className="text-[10px] text-chem-gray2">Coût livré = prix du produit + transport jusqu’au Niger, en dollars américains.</span>
      </div>
    </section>
  );
}

// ─── Synthèse FY2027-FY2030 ──────────────────────────────────────────────────
function Summary({ sim, busy, onExport }) {
  const rows = FUTURE_YEARS.map((y) => sim.years[y]);
  const tot = rows.reduce((t, r) => ({ available: t.available + r.available, total: t.total + r.total, balance: t.balance + r.balance }), { available: 0, total: 0, balance: 0 });
  return (
    <Section icon={Calculator} title="Synthèse FY2027-FY2030"
      action={(
        <button type="button" onClick={onExport} disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-chem-darkblue text-white rounded-xl font-semibold text-[10px] uppercase hover:bg-chem-gray1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-wait">
          <FileSpreadsheet w={12} /> Exporter en Excel
        </button>
      )}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-[11px] tabular-nums">
          <thead>
            <tr className="text-[9px] font-semibold uppercase text-chem-gray2 border-b border-chem-gray1-20">
              <th className="px-2 py-1.5 text-left">Année</th>
              <th className="px-2 py-1.5 text-left">Calcul · transport</th>
              <th className="px-2 py-1.5 text-right">Budget produits</th>
              <th className="px-2 py-1.5 text-right">Commandé</th>
              <th className="px-2 py-1.5 text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-chem-gray1-10">
                <td className="px-2 py-1.5 font-semibold">FY{r.year}</td>
                <td className="px-2 py-1.5 text-chem-gray2">{r.method === 'manual' ? 'Ajusté' : 'Automatique'} · {MODE_PLAIN[r.mode]}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(r.available, 0)}</td>
                <td className="px-2 py-1.5 text-right">{fmtUsd(r.total, 0)}</td>
                <td className={`px-2 py-1.5 text-right ${role(r.balance).text}`}>{fmtUsd(r.balance, 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-[11px]">
              <td className="px-2 py-1.5 font-bold uppercase" colSpan={2}>Total</td>
              <td className="px-2 py-1.5 text-right">{fmtUsd(tot.available, 0)}</td>
              <td className="px-2 py-1.5 text-right">{fmtUsd(tot.total, 0)}</td>
              <td className={`px-2 py-1.5 text-right ${role(tot.balance).text}`}>{fmtUsd(tot.balance, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-chem-gray2 flex items-center gap-1"><ListChecks w={11} /> L’export Excel contient une feuille « Quantités à commander » prête à transmettre et le détail des calculs.</p>
    </Section>
  );
}

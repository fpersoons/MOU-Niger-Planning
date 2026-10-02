// ─── Délais d'acheminement et calendrier de commande ────────────────────────
// Module pur : à partir des délais (mois) par mode de transport, de la date de
// besoin au Niger et de la date du jour, indique quand commander et si une
// commande passée aujourd'hui peut arriver à temps.

export const FY_MONTHS = ['oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.'];

/** Début (1er octobre de l'année précédente) et fin (30 septembre) d'un exercice fiscal américain. */
export const fiscalYear = (year) => ({
  start: new Date(Number(year) - 1, 9, 1),
  end: new Date(Number(year), 8, 30),
});

export const addMonths = (date, months) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const whole = Math.floor(months);
  d.setMonth(d.getMonth() + whole);
  const frac = months - whole;
  if (frac) d.setDate(d.getDate() + Math.round(frac * 30));
  return d;
};

/** « 2027-01 » -> 1er janvier 2027 (date locale). */
export const parseMonth = (s) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : null;
};

export const fmtMonth = (d) => (d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—');
export const fmtDay = (d) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

export const STATUS_LABEL = {
  closed: 'Exercice clos',
  ok: 'Dans les temps',
  risk: 'Risque de retard',
  late: 'Arrivée tardive',
};

/**
 * Évalue le calendrier d'un exercice.
 * - orderBy : dernière date de commande pour arriver à temps même dans le pire cas (besoin − délai max) ;
 * - orderByRisky : dernière date pour arriver à temps dans le meilleur cas (besoin − délai min) ;
 * - arrivalMin / arrivalMax : fenêtre d'arrivée d'une commande passée aujourd'hui ;
 * - status : closed (exercice terminé), ok (on peut encore commander à temps),
 *   risk (à temps seulement si tout se passe bien), late (arrivera après la date de besoin).
 */
export const assessDelivery = ({ year, mode, leadTimes, needMonth, today = new Date() }) => {
  const fy = fiscalYear(year);
  const lt = leadTimes?.[mode] || { min: 0, max: 0 };
  const min = Math.max(0, Number(lt.min) || 0);
  const max = Math.max(min, Number(lt.max) || 0);
  const need = parseMonth(needMonth) || fy.start;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const orderBy = addMonths(need, -max);
  const orderByRisky = addMonths(need, -min);
  const arrivalMin = addMonths(day, min);
  const arrivalMax = addMonths(day, max);
  let status;
  if (day > fy.end) status = 'closed';
  else if (day <= orderBy) status = 'ok';
  else if (day <= orderByRisky) status = 'risk';
  else status = 'late';
  // Retard possible (mois) d'une commande passée aujourd'hui par rapport à la date de besoin.
  const monthsLate = Math.max(0, (arrivalMax - need) / (1000 * 60 * 60 * 24 * 30.44));
  return { fy, need, min, max, orderBy, orderByRisky, arrivalMin, arrivalMax, status, monthsLate };
};

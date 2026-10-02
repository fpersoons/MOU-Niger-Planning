// ─── Années fiscales ─────────────────────────────────────────────────────────

/** Début (1er octobre de l'année précédente) et fin (30 septembre) d'un exercice fiscal américain. */
export const fiscalYear = (year) => ({
  start: new Date(Number(year) - 1, 9, 1),
  end: new Date(Number(year), 8, 30),
});

export const fmtDay = (d) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

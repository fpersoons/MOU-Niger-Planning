# Planificateur Intrants Paludisme — consignes projet

@../design-system/DESIGN_SYSTEM.md
Preset couleurs : CHEMONICS

- Cahier des charges fonctionnel : `docs/Specifications_Developpement_Application.md` (règles de calcul §3, parsing §5, export §6).
- Écarts assumés au cahier des charges, imposés par le design system : icônes SVG maison (pas de `lucide-react`), en-tête blanc et palette Chemonics (pas de bleu `#000066` dans l'UI — il reste utilisé dans l'export Excel), pas de Firebase (JSON en `localStorage` + import/export JSON), ExcelJS/SheetJS en dépendances npm chargées à la demande (pas de CDN).
- Spécificités Niger (au-delà du cahier des charges) : réserve d'assistance par exercice déduite du budget, quantification Niger, méthodes FY27-30 `split` / `quantif` / `manual` (voir le guide développeur).
- Le moteur de calcul est dans `src/model.js` (pur, testé) ; l'Excel dans `src/excel.js`. Toute modification de règle de calcul s'accompagne d'un test dans `tests/model.test.js` (`npm test`).
- Références internes toujours relatives (servi sous `/MOU-Niger-Planning/` par le portail ChemLink).
- Mettre à jour les guides `.md` et `public/guide.html` avant chaque déploiement.

# Planificateur Intrants Paludisme — consignes projet

@../design-system/DESIGN_SYSTEM.md
Preset couleurs : CHEMONICS

- Cahier des charges fonctionnel : `docs/Specifications_Developpement_Application.md` (règles de calcul §3, parsing §5, export §6).
- Écarts assumés au cahier des charges, imposés par le design system : icônes SVG maison (pas de `lucide-react`), en-tête blanc et palette Chemonics (pas de bleu `#000066`, ni dans l'UI ni dans l'export Excel, qui reprend la palette de l'application), pas de Firebase (JSON en `localStorage` + import/export JSON), ExcelJS/SheetJS en dépendances npm chargées à la demande (pas de CDN).
- Spécificités Niger (au-delà du cahier des charges) : réserve d'assistance par exercice déduite du budget, quantification Niger, méthodes FY27-30 `quantif` (automatique : tout le budget selon le split PSN) / `manual` (quantités maximales ajustées à la main) — pas de split FY25 ; coûts par intrant saisis en $ (EXW, livré bateau + route, livré avion).
- Interface en 3 onglets (Budget, Paramètres logistiques, Scénarios), légère et utilisable par des non-spécialistes : langage courant, une section à la fois.
- Pas de délais d'acheminement ni de lexique (simplification demandée) ; transport par avion par défaut pour l'année à venir (FY2027). Valeurs par défaut (coûts, budgets, réserves, report, PSN 2027) : scénario de référence validé le 02/10/2026 (`DEFAULT_PARAMS`, `DEFAULT_RESERVES`, `DEFAULT_PSN_2027`…).
- Le moteur de calcul est dans `src/model.js` (pur, testé) ; l'Excel dans `src/excel.js`. Toute modification de règle de calcul s'accompagne d'un test dans `tests/model.test.js` (`npm test`).
- Références internes toujours relatives (servi sous `/MOU-Niger-Planning/` par le portail ChemLink).
- Mettre à jour les guides `.md` et `public/guide.html` avant chaque déploiement.

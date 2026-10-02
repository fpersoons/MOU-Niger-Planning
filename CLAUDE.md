# Planificateur Intrants Paludisme — consignes projet

@../design-system/DESIGN_SYSTEM.md
Preset couleurs : CHEMONICS

- Cahier des charges fonctionnel : `docs/Specifications_Developpement_Application.md` (règles de calcul §3, parsing §5, export §6).
- Écarts assumés au cahier des charges, imposés par le design system : icônes SVG maison (pas de `lucide-react`), en-tête blanc et palette Chemonics (pas de bleu `#000066` dans l'UI — il reste utilisé dans l'export Excel), pas de Firebase (JSON en `localStorage` + import/export JSON), ExcelJS/SheetJS en dépendances npm chargées à la demande (pas de CDN).
- Spécificités Niger (au-delà du cahier des charges) : réserve d'assistance par exercice déduite du budget, quantification Niger, méthodes FY27-30 `quantif` (quantification PSN) / `manual` — pas de répartition selon le split FY25 (voir le guide développeur).
- Public cible de l'assistant (`src/Assistant.jsx`) : non-spécialistes (personnel d'ambassade). Langage courant, termes techniques expliqués (lexique), pas de jargon sans définition. La vue détaillée reste destinée aux spécialistes.
- Contexte logistique (oct. 2026) : frontière Bénin–Niger fermée, corridor Lomé – Burkina Faso – Niger ; délais par défaut dans `DEFAULT_LEAD_TIMES` (hypothèses à valider avec GHSC-PSM).
- Le moteur de calcul est dans `src/model.js` (pur, testé) ; l'Excel dans `src/excel.js`. Toute modification de règle de calcul s'accompagne d'un test dans `tests/model.test.js` (`npm test`).
- Références internes toujours relatives (servi sous `/MOU-Niger-Planning/` par le portail ChemLink).
- Mettre à jour les guides `.md` et `public/guide.html` avant chaque déploiement.

# Guide développeur — Planificateur Intrants Paludisme FY26-FY30

## Stack

React 18 + Vite 5 + Tailwind CSS 3 (preset CHEMONICS), ExcelJS (export) chargé par
`import()` dynamique ; SheetJS (`xlsx`) en dépendance de développement (tests). Pas de backend, pas de Firebase.

## Arborescence

```
index.html            page Vite (Montserrat, favicon SVG)
src/main.jsx          montage React
src/App.jsx           en-tête, barre des scénarios enregistrés, onglets, import/export
src/BudgetView.jsx    onglet 1 : budgets du MOU, réserve, clôture FY2026 (accruals, assistance, report)
src/LogisticsView.jsx onglet 2 : coûts par intrant (EXW, livré bateau, livré avion), PSN 2027-2031
src/ScenariosView.jsx onglet 3 : scénarios par année (automatique / ajusté), transport, synthèse
src/common.jsx        éléments partagés (Section, Segmented, texte e-mail)
src/ui.jsx            helpers de format et composants de base (Card, NumInput…)
src/icons.jsx         icônes SVG maison (DESIGN_SYSTEM §6)
src/model.js          constantes, valeurs par défaut, parseVal, simulate() — pur
src/logistics.js      années fiscales (dates de début et de fin)
src/excel.js          buildWorkbook / exportScenarioXlsx (+ parseWorkbookRows : relecture de la feuille Paramètres, utilisée par les tests)
tests/model.test.js   tests node:test (npm test)
docs/                 cahier des charges d'origine
```

## État et persistance

`localStorage['ghsc-psm-planificateur-paludisme-v1']` :

```json
{ "version": 1, "activeId": "…", "scenarios": [
  { "id": "…", "name": "…", "updatedAt": "ISO",
    "data": {
      "budgets":     { "2026": 13321800, … },
      "reserves":    { "2026": 0, …, "2030": 0 },            // réserve d'assistance
      "methods":     { "2027": "quantif" | "manual", … },     // ancien "split" → "quantif"
      "fy26Spending": "unspent" | "planned",                  // FY26 clos : accruals seules / + quantités FY26
      "yearAccruals": { "2026": 1106690, "2027": 0, … },       // accruals par année
      "carryRules":  { "2026": "next" | "smooth" | "none", …, "2029": … },  // report du solde
      "commodities": { "1": { "price": 13.79, "landedSea": 20.685, "landedAir": 22.2584, "qty26": 15000 }, … },  // coûts unitaires $
      // ancien format { price, air (%), sea (%) } converti automatiquement en coûts livrés
      "logistics":   { "2026": "air", …, "2030": "sea" },
      "manualQtys":  { "2026": { "11": 0, "12": 0, "13": 0 }, … },   // MILDA
      "quantification": { "2027": { "1": 0, …, "10": 0 }, …, "2031": {…} },  // PSN 2027-2031
      "regularQtys":    { "2027": { "1": 0, …, "10": 0 }, … }         // méthode manual
    } } ] }
```

Pourcentages en échelle 0-100. Écriture avec un debounce de 1,5 s. L'export JSON
reprend la même structure ; `normalizeScenarioData()` complète tout fichier partiel.

## Moteur de calcul (`simulate`)

- FY26 (clos) : solde = budget − accruals (− commandes FY26 si `fy26Spending = "planned"`,
  anciens scénarios) ; la réserve FY26 n'est pas déduite.
- Report : chaque année FY26-FY29 transmet son solde selon `carryRules[y]` — `next`
  (année suivante), `smooth` (parts égales sur toutes les années suivantes), `none`.
  Le report reçu s'ajoute au budget produits. Les anciens scénarios (liste d'accruals,
  assistance engagée, `carryover`) sont convertis sans changer leur résultat.
- FY27-30 : `dispo = budget + report reçu − réserve − accruals` ; solde = dispo − commandes ; `résiduel = dispo − coût landed MILDA`.
  Quantités des intrants réguliers (`quantitiesFor`) selon `methods[y]` :
  - `quantif` (« Automatique (split PSN) ») : `w_i = Qq_i P_i / Σ Qq_j P_j`
    (split = poids EXW du PSN de l'année) ; `r_i = landed_i / P_i − 1` selon le
    mode ; `E_tot = résiduel / Σ w_i (1 + r_i)` ; `Q_i = ⌊E_tot × w_i / P_i⌋` — tout
    le budget est utilisé (quantités maximales, sans plafond PSN) ;
  - `manual` : `Q_i = regularQtys[y][i]`, solde éventuellement négatif.
  Si le résiduel est négatif ou nul, les méthodes calculées donnent des quantités nulles.
- Le pré-remplissage des quantités manuelles réutilise `quantitiesFor` sur le résiduel courant.

## Coûts de référence

`MOU27_LANDED_SEA` (model.js) : coût livré maritime (TLC) du fichier
« Malaria_MOU_27-Niger.xlsx », onglet Commodity calculator, colonne F, pour les
références retenues par le Niger. En conservant les pourcentages de référence
(`REFERENCE_PARAMS.sea` = 50 %, `.air` par produit) : EXW = livré ÷ (1 + % mer),
livré avion = EXW × (1 + % air). `referenceCosts()` alimente le bouton
« Coûts de référence MOU 27 ».

## Excel

- Export : feuille *Quantités à commander* (langage courant, unités d'achat, à
  transmettre), feuille *Simulation* (Arial 11, en-têtes `#000066` blanc gras centré,
  catégories `#F1F5F9` gras italique fusionnées A-E, `"$"#,##0.00`, `#,##0`,
  solde vert/rouge) et feuille *Paramètres* (pourcentages écrits en fractions Excel).
- Pas d'import Excel dans l'interface : les scénarios se transfèrent par « Télécharger / Charger un scénario » (fichier .json). `parseWorkbookRows` relit la feuille *Paramètres* (test d'aller-retour).

## Écarts au cahier des charges

Ajouts Niger (MOU) : réserve d'assistance par exercice, quantification Niger et
méthodes de calcul FY27-FY30 (quantification PSN, quantités manuelles ; la répartition
selon le split FY25 du cahier des charges a été retirée à la demande du projet) ;
colonnes « Quantification (besoin) » et « Couverture » dans l'export Excel.

Imposés par le design system : icônes maison au lieu de `lucide-react`, en-tête blanc
et palette Chemonics dans l'UI, grille 3/7/2. Demandés : JSON local au lieu de
Firebase, gestion multi-scénarios avec export Excel par scénario (le nom du fichier
reçoit le nom du scénario en suffixe).

## Déploiement

Push sur `main` → Netlify (`npm run build`, `dist/`). Vérifier `npm test` et
`npm run build` avant de pousser ; mettre à jour les guides.

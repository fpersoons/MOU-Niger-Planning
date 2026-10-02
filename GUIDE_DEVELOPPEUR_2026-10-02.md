# Guide développeur — Planificateur Intrants Paludisme FY26-FY30

## Stack

React 18 + Vite 5 + Tailwind CSS 3 (preset CHEMONICS), ExcelJS (export) et SheetJS
(import) chargés par `import()` dynamique. Pas de backend, pas de Firebase.

## Arborescence

```
index.html            page Vite (Montserrat, favicon SVG)
src/main.jsx          montage React
src/App.jsx           interface : en-tête, volets, tableaux, scénarios, synthèse
src/icons.jsx         icônes SVG maison (DESIGN_SYSTEM §6)
src/model.js          constantes, valeurs par défaut, parseVal, simulate() — pur
src/excel.js          buildWorkbook / exportScenarioXlsx / importWorkbook
src/index.css         directives Tailwind + bloc accessibilité
public/assets/        logo U.S. Department of State
public/guide.html     guide utilisateur en ligne
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
      "commodities": { "1": { "split": 4.41, "price": 13.79, "air": 61.41, "sea": 50, "qty26": 15000 }, … },
      "logistics":   { "2026": "air", …, "2030": "sea" },
      "accruals":    { "amount": 1106690, "desc": "mRDTs (RO Accruals)", "refs": "", "freightPct": 0 },
      "manualQtys":  { "2026": { "11": 0, "12": 0, "13": 0 }, … }
    } } ] }
```

Pourcentages en échelle 0-100. Écriture avec un debounce de 1,5 s. L'export JSON
reprend la même structure ; `normalizeScenarioData()` complète tout fichier partiel.

## Moteur de calcul (`simulate`)

- FY26 : `Landed = Q × P × (1 + r)` avec r selon le mode FY26 ; MILDA comptées
  uniquement en mode Mer ; accruals `EXW × (1 + taux)`. Surplus = budget − total ;
  bonus = surplus / 4.
- FY27-30 : `dispo = budget + bonus` ; `résiduel = dispo − coût landed MILDA` ;
  `w_i = split_i / Σsplit` ; `E_tot = résiduel / Σ w_i (1 + r_i)` ;
  `Q_i = ⌊E_tot × w_i / P_i⌋`. Si le résiduel est négatif ou nul, les quantités
  régulières sont nulles (le solde négatif signale le dépassement dû aux MILDA).

## Excel

- Export : feuille *Simulation* (Arial 11, en-têtes `#000066` blanc gras centré,
  catégories `#F1F5F9` gras italique fusionnées A-E, `"$"#,##0.00`, `#,##0`,
  solde vert/rouge) et feuille *Paramètres* (pourcentages écrits en fractions Excel).
- Import : feuille *Paramètres* si elle existe, sinon toutes les feuilles. Repère le
  tableau des intrants par une colonne « Intrant » (+ Split ou Prix), le tableau des
  exercices par « Exercice », et les lignes « Accruals — … ». Valeurs lues par
  `parseVal` (heuristique du cahier des charges §5).

## Écarts au cahier des charges

Imposés par le design system : icônes maison au lieu de `lucide-react`, en-tête blanc
et palette Chemonics dans l'UI, grille 3/7/2. Demandés : JSON local au lieu de
Firebase, gestion multi-scénarios avec export Excel par scénario (le nom du fichier
reçoit le nom du scénario en suffixe).

## Déploiement

Push sur `main` → Netlify (`npm run build`, `dist/`). Vérifier `npm test` et
`npm run build` avant de pousser ; mettre à jour les guides.

# Guide développeur — Planificateur Intrants Paludisme FY26-FY30

## Stack

React 18 + Vite 5 + Tailwind CSS 3 (preset CHEMONICS), ExcelJS (export) et SheetJS
(import) chargés par `import()` dynamique. Pas de backend, pas de Firebase.

## Arborescence

```
index.html            page Vite (Montserrat, favicon SVG)
src/main.jsx          montage React
src/App.jsx           en-tête, onglets (assistant / vue détaillée), vue détaillée, scénarios
src/Assistant.jsx     assistant pas à pas (non-spécialistes) : budget, répartition, quantités
src/Quantification.jsx tableau « Demande du Niger » (quantification), partagé
src/ui.jsx            helpers de format et composants de base (Card, NumInput…)
src/logistics.js      délais d'acheminement, statut de livraison — pur
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
      "reserves":    { "2026": 0, …, "2030": 0 },            // réserve d'assistance
      "methods":     { "2027": "split" | "quantif" | "manual", … },
      "maximize":    { "2027": false, … },                    // quantif sans plafond
      "fy26Spending": "unspent" | "planned",                  // FY26 clos : rien commandé / quantités FY26
      "carryover":   "fy27" | "smooth",                       // report du non-dépensé FY26
      "leadTimes":   { "air": { "min": 4, "max": 7 }, "sea": { "min": 6, "max": 13 } },  // mois
      "needDates":   { "2027": "2027-01", … },                // produits attendus au Niger
      "commodities": { "1": { "split": 4.41, "price": 13.79, "air": 61.41, "sea": 50, "qty26": 15000 }, … },
      "logistics":   { "2026": "air", …, "2030": "sea" },
      "accruals":    { "amount": 1106690, "desc": "mRDTs (RO Accruals)", "refs": "", "freightPct": 0 },
      "manualQtys":  { "2026": { "11": 0, "12": 0, "13": 0 }, … },   // MILDA
      "quantification": { "2027": { "1": 0, …, "10": 0 }, … },        // besoins Niger
      "regularQtys":    { "2027": { "1": 0, …, "10": 0 }, … }         // méthode manual
    } } ] }
```

Pourcentages en échelle 0-100. Écriture avec un debounce de 1,5 s. L'export JSON
reprend la même structure ; `normalizeScenarioData()` complète tout fichier partiel.

## Moteur de calcul (`simulate`)

- FY26 : `Landed = Q × P × (1 + r)` avec r selon le mode FY26 ; MILDA comptées
  uniquement en mode Mer ; accruals `EXW × (1 + taux)`.
  Avec `fy26Spending = "unspent"`, seules les accruals sont comptées.
  Surplus = budget − réserve − total ; report `carry[y]` = surplus en FY27 (`fy27`)
  ou surplus / 4 par année (`smooth`). Les scénarios sans ces champs gardent
  `planned` + `smooth` (comportement d'origine).
- FY27-30 : `dispo = budget − réserve + carry[y]` ; `résiduel = dispo − coût landed MILDA`.
  Quantités des intrants réguliers (`quantitiesFor`) selon `methods[y]` :
  - `split` : `w_i = split_i / Σsplit` ; `E_tot = résiduel / Σ w_i (1 + r_i)` ;
    `Q_i = ⌊E_tot × w_i / P_i⌋` ;
  - `quantif` : mêmes formules avec `w_i = Qq_i P_i / Σ Qq_j P_j` (poids EXW de la
    quantification), `E_tot` plafonné à `Σ Qq_j P_j` et `Q_i ≤ Qq_i` (jamais au-delà
    du besoin) : couverture uniforme, ≤ 100 % ; avec `maximize[y] = true`, pas de
    plafond (tout le résiduel est réparti, couverture uniforme pouvant dépasser 100 %) ;
  - `manual` : `Q_i = regularQtys[y][i]`, solde éventuellement négatif.
  Si le résiduel est négatif ou nul, les méthodes calculées donnent des quantités nulles.
- Le pré-remplissage des quantités manuelles réutilise `quantitiesFor` sur le résiduel courant.

## Délais (`logistics.js`)

`assessDelivery({ year, mode, leadTimes, needMonth, today })` : `orderBy = besoin − max`,
`orderByRisky = besoin − min`, fenêtre d'arrivée d'une commande du jour
`[today + min, today + max]` ; statut `closed` (exercice terminé), `ok`
(aujourd'hui ≤ orderBy), `risk` (≤ orderByRisky), `late`. Les délais par défaut sont
des hypothèses (corridor Lomé – Burkina Faso – Niger, frontière Bénin fermée).

## Excel

- Export : feuille *Quantités à commander* (langage courant, délais et statut par
  exercice, à transmettre), feuille *Simulation* (Arial 11, en-têtes `#000066` blanc gras centré,
  catégories `#F1F5F9` gras italique fusionnées A-E, `"$"#,##0.00`, `#,##0`,
  solde vert/rouge) et feuille *Paramètres* (pourcentages écrits en fractions Excel).
- Import : feuille *Paramètres* si elle existe, sinon toutes les feuilles. Repère le
  tableau des intrants par une colonne « Intrant » (+ Split ou Prix), le tableau des
  exercices par « Exercice », et les lignes « Accruals — … ». Valeurs lues par
  `parseVal` (heuristique du cahier des charges §5).

## Écarts au cahier des charges

Ajouts Niger (MOU) : réserve d'assistance par exercice, quantification Niger et
méthodes de calcul FY27-FY30 (split FY25, split quantification, quantités manuelles) ;
colonnes « Quantification (besoin) » et « Couverture » dans l'export Excel.

Imposés par le design system : icônes maison au lieu de `lucide-react`, en-tête blanc
et palette Chemonics dans l'UI, grille 3/7/2. Demandés : JSON local au lieu de
Firebase, gestion multi-scénarios avec export Excel par scénario (le nom du fichier
reçoit le nom du scénario en suffixe).

## Déploiement

Push sur `main` → Netlify (`npm run build`, `dist/`). Vérifier `npm test` et
`npm run build` avant de pousser ; mettre à jour les guides.

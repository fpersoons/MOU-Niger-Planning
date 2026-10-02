# Guide développeur — MOU Niger : planificateur des intrants paludisme

L'installation, le cycle de modification et la publication sont décrits dans
[SETUP-LOCAL.md](SETUP-LOCAL.md). Ce guide décrit le fonctionnement interne.

## Stack

- **Interface** : React 18, Vite 5 (`base: './'`) et Tailwind CSS 3 (palette
  CHEMONICS, couleurs `chem-*`, police Montserrat).
- **Export** : ExcelJS, chargé à la demande par `import()` dynamique.
- **Outils de développement** :
  - SheetJS (`xlsx`), pour relire l'export dans les tests ;
  - HyperFormula, pour recalculer les formules de l'export (`npm run verify:excel`).
- **Données** : pas de backend, pas de base de données, pas de Firebase. Le stockage
  se fait dans le `localStorage` du navigateur.

## Arborescence

```
index.html              page Vite (Montserrat, favicon SVG)
netlify.toml            build Netlify (npm run build → dist/, Node 20) et en-têtes de sécurité
vite.config.js          base './' (chemins relatifs), seuil de taille des chunks
tailwind.config.js      palette CHEMONICS (chem-*) et police
public/guide.html       aide en ligne (bouton « Guide »), à tenir à jour avec le guide utilisateur
public/assets/          logo U.S. Department of State
src/main.jsx            montage React
src/index.css           directives Tailwind et styles de base
src/App.jsx             en-tête, barre du scénario (nom, Réinitialiser, Charger / Télécharger),
                        onglets, sauvegarde automatique, export Excel
src/BudgetView.jsx      onglet 1 : budgets MOU, réserves, accruals, report reçu,
                        budget produits, règle de report
src/LogisticsView.jsx   onglet 2 : coûts par intrant (EXW, livré bateau, livré avion), case MILDA,
                        quantités USG du PSN 2027-2031 et split contribution USG
src/ScenariosView.jsx   onglet 3 : par année, méthode (automatique / ajustée), transport,
                        tableau des quantités, écart, copie e-mail, synthèse FY2027-FY2030
src/common.jsx          éléments partagés : Section, Segmented, ModeIcon, fyPeriod,
                        texte pour e-mail, copie dans le presse-papiers
src/ui.jsx              formats (fmtUsd, fmtNum…), Card, NumInput, rôles de couleur POS / NEG
src/icons.jsx           icônes SVG maison (DESIGN_SYSTEM §6)
src/model.js            catalogue, valeurs par défaut, normalisation, simulate() — module pur, sans React
src/logistics.js        années fiscales (1er octobre – 30 septembre)
src/excel.js            buildWorkbook / exportScenarioXlsx, plus parseWorkbookRows (relecture, tests)
tests/model.test.js     tests node:test (npm test)
scripts/verify-excel-formulas.mjs   vérification des formules Excel (npm run verify:excel)
docs/                   cahier des charges d'origine
```

## Catalogue des intrants

`COMMODITIES` (`src/model.js`) contient 13 références. Chacune a un `id` fixe, utilisé
comme clé dans toutes les données, ainsi que `name`, `category`, `unit` (unité
d'achat), `plain` (nom en langage courant) et `use` (usage).

- **Intrants réguliers** (`REGULAR`), ids 1 à 10 : SP, AQ-SP, TDR, AL et artésunate.
- **MILDA** (`MILDA`, `isMilda: true`), ids 11 à 13 : moustiquaires, hors MOU. Elles
  sont masquées par défaut, saisies à la main et transportées par bateau uniquement.

Ajouter un intrant demande cinq modifications :
1. une entrée dans `COMMODITIES` ;
2. ses coûts dans `DEFAULT_PARAMS` ;
3. ses taux dans `REFERENCE_PARAMS` (conversion des anciens formats) ;
4. sa quantité PSN 2027 éventuelle dans `DEFAULT_PSN_2027` ;
5. une mise à jour des tests qui comptent les références (`found`, nombre de lignes).

## Valeurs par défaut : où les changer

Toutes les valeurs par défaut sont dans `src/model.js` et reprennent le scénario de
référence validé le 02/10/2026.

| Élément | Constante | Valeur actuelle |
| --- | --- | --- |
| Budgets MOU FY2026-FY2030 | `DEFAULT_BUDGETS` | 13 321 800 · 10 947 300 · 9 142 167 · 8 034 067 · 7 400 000 |
| Réserves d'assistance | `DEFAULT_RESERVES` | 1 800 000 (FY2026, indicative) · 1 500 000 · 1 300 000 · 1 000 000 · 800 000 |
| Accruals par année | `DEFAULT_YEAR_ACCRUALS` | 0 partout |
| Report du solde | `DEFAULT_CARRY_RULES` | FY2026 lissé (`smooth`), puis aucun report (`none`) |
| Mode de transport | `DEFAULT_LOGISTICS` | avion en FY2026-FY2027, bateau ensuite |
| Méthode FY27-30 | `DEFAULT_METHODS` | `quantif` (automatique) partout |
| Coûts par intrant | `DEFAULT_PARAMS` | EXW, livré bateau, livré avion, qty26 |
| Quantités USG PSN 2027 | `DEFAULT_PSN_2027` | quantités 2027 ; 2028-2031 à saisir |
| MILDA visibles | `includeMilda` (`defaultScenarioData`) | `false` |

Le bouton « Coûts par défaut » (onglet 2) rétablit les coûts via `referenceCosts()`.
Le bouton « Réinitialiser » (barre du scénario) rétablit l'ensemble via
`defaultScenarioData()`. Si vous modifiez les valeurs par défaut, mettez aussi à jour
les tests qui les vérifient (« coûts livrés : taux implicite… » et « PSN non saisi… »).

## État et persistance

`localStorage['ghsc-psm-planificateur-paludisme-v1']`. C'est le même format que le
fichier produit par « Télécharger le scénario » (`MOU-Niger_scenario_<nom>_<date>.json`) :

```json
{ "version": 2, "scenario":
  { "id": "…", "name": "Scénario de référence", "updatedAt": "ISO",
    "data": {
      "budgets":      { "2026": 13321800, …, "2030": 7400000 },
      "reserves":     { "2026": 1800000, …, "2030": 800000 },        // réserve d'assistance
      "yearAccruals": { "2026": 0, …, "2030": 0 },                   // accruals (engagé)
      "carryRules":   { "2026": "next" | "smooth" | "none", …, "2029": … },  // report du solde
      "logistics":    { "2026": "air" | "sea", …, "2030": … },       // mode de transport
      "methods":      { "2027": "quantif" | "manual", …, "2030": … },
      "commodities":  { "1": { "price": 13.14, "landedSea": 16.03, "landedAir": 21.2093, "qty26": 15000 }, … },
      "quantification": { "2027": { "1": 46560, …, "10": 15519 }, …, "2031": {…} },  // quantités USG du PSN
      "regularQtys":  { "2027": { "1": 0, …, "10": 0 }, … },         // quantités de la méthode manual
      "manualQtys":   { "2026": { "11": 0, "12": 0, "13": 0 }, … },  // MILDA
      "includeMilda": false,
      "fy26Spending": "unspent" | "planned"                          // anciens scénarios : commandes FY26 déduites
    } } }
```

- L'onglet affiché est mémorisé sous `ghsc-psm-planificateur-paludisme-onglet`.
- **Sauvegarde** : écriture avec un délai de 1,5 s après la dernière modification
  (pastille « Sauvegardé » ou « Synchronisation… »).
- **Formats acceptés à l'ouverture et au chargement** (`pickScenario`, `App.jsx`) :
  - `{ scenario }`, la version 2 actuelle ;
  - `{ activeId, scenarios: [...] }`, l'ancienne version 1 à plusieurs scénarios :
    le scénario actif est repris ;
  - un objet `{ name, data }` seul.
- **Normalisation** (`normalizeScenarioData`) : elle complète les champs manquants et
  convertit les anciens formats sans changer les résultats. Elle traite :
  - les taux de fret en %, convertis en coûts livrés ;
  - la liste d'accruals et le champ `carryover`, convertis en `yearAccruals` et
    `carryRules` ;
  - l'ancien champ `fy26AssistanceSpent`, ajouté aux accruals FY2026 ;
  - la méthode `split`, devenue `quantif`.

## Moteur de calcul (`simulate`, `src/model.js`)

**FY2026 (clos)**
- Solde = budget − accruals.
- Pour les anciens scénarios avec `fy26Spending = "planned"`, on déduit aussi les
  commandes FY26 (`qty26` × coût livré du mode FY2026).
- La réserve FY2026 n'est pas déduite, car les accruals comprennent déjà tout l'engagé.

**Report du solde (FY2026-FY2029)**
- Chaque année transmet son solde (positif ou négatif) selon `carryRules[y]` :
  - `next` : en totalité sur l'année suivante ;
  - `smooth` : à parts égales sur toutes les années suivantes du MOU ;
  - `none` : pas de report.
- FY2030 ne reporte rien.

**FY2027-FY2030**
- `dispo = budget + report reçu − réserve − accruals`.
- `résiduel = dispo − coût livré des MILDA`. Les MILDA ne comptent que si elles sont
  incluses et que le mode est le bateau.
- Les quantités des intrants réguliers (`quantitiesFor`) dépendent de `methods[y]` :
  - **`quantif`** — automatique (split contribution USG) :
    - `w_i = Q_i P_i / Σ Q_j P_j`, où `Q` est la quantité USG du PSN de l'année et `P`
      le prix EXW ;
    - `E_tot = résiduel / Σ w_j × (landed_j / P_j)`, où `landed` est le coût livré **du
      mode de l'année** (avion ou bateau) ;
    - `qté_i = ⌊E_tot × w_i / P_i⌋`.

    Forme équivalente, utilisée dans l'export Excel :
    `qté_i = ⌊résiduel × Q_i / Σ Q_j × landed_j⌋`.

    Tout le budget est utilisé, sans plafond aux quantités prévues : l'écart peut donc
    être positif. Si le résiduel est nul ou négatif, ou si aucune quantité PSN n'est
    saisie, les quantités sont nulles.
  - **`manual`** : `qté_i = regularQtys[y][i]`. Le solde peut être négatif
    (dépassement).
- `solde = dispo − total livré`. Chaque ligne porte `need` (la quantité PSN) et
  `coverage` (qté / need). L'écart affiché vaut `coverage − 1`.
- Les boutons de la méthode manuelle pré-remplissent les quantités :
  - « Repartir des quantités maximales » utilise `quantitiesFor('quantif')` ;
  - « Reprendre les quantités initialement prévues » reprend les quantités PSN.

## Export Excel (`src/excel.js`)

Le fichier s'appelle `GHSC-PSM_Budget_Prospective_MM_DD_YY_<scénario>.xlsx`. Il est
recalculé à l'ouverture (`fullCalcOnLoad`) et contient aussi en cache les valeurs
calculées par l'application.

### Feuille « Quantités et coûts »

- **Bloc FY2026** : budget, accruals et solde.
- **Un bloc par année FY2027-FY2030** :
  - un bandeau d'en-tête, en formule (mode et méthode) ;
  - une ligne par intrant : quantité commandable, prix unitaire livré, total livré,
    quantité prévue pour l'USG (PSN) et écart ;
  - les lignes de budget : total commandé, budget MOU, report reçu, réserve,
    accruals, budget disponible et reste.
- **Total commandé FY2027-FY2030**, en bas de feuille.
- **Tout est en formules** :
  - quantité : la quantité manuelle ou la formule automatique, selon la méthode ;
  - prix : selon le mode (`Air` ou `Mer`) ;
  - report reçu : il dépend du libellé de la règle de report des années précédentes.

### Feuille « Paramètres »

- **Cellules modifiables** (fond bleu clair) : coûts, budgets, réserves, accruals,
  quantités PSN et quantités manuelles.
- **Listes déroulantes** : mode (`Air` / `Mer`), méthode (libellés `METHOD_LABEL`) et
  report (libellés `CARRY_LABEL`).
- **Valeurs calculées** : fret en % et split contribution USG.

### Mise en forme

Les couleurs reprennent la palette de l'application :
- en-têtes gris clair (`#F5F7F8`) ;
- bandeaux bleu foncé (`#005D83`) ;
- totaux sur fond bleu très clair ;
- écarts et restes colorés par mise en forme conditionnelle : vert `#377225` sur
  `#EBF1D5` si positif, aubergine `#7B0046` sur `#FDE0D8` si négatif.

### Vérification

`npm run verify:excel` recalcule toutes les formules avec HyperFormula pour cinq
scénarios, et après des modifications de la feuille « Paramètres ». Il exige 0 écart
avec `simulate()`. Il faut le relancer après toute modification de `model.js` ou
`excel.js`.

### Pas d'import Excel

Il n'y a pas d'import Excel dans l'interface. `parseWorkbookRows` relit la feuille
« Paramètres » uniquement pour le test d'aller-retour.

## Tests

`npm test` lance 21 tests (`node --test`), qui couvrent :
- le solde et le report FY2026 (année suivante, lissé) ;
- les règles de report par année ;
- les accruals et les réserves ;
- le split contribution USG (budget saturé, insuffisant, supérieur au PSN) ;
- le mode de transport (coût livré avion ou bateau) ;
- les quantités manuelles ;
- les MILDA ;
- les valeurs par défaut ;
- la reprise des anciens formats ;
- les années fiscales ;
- le nom du fichier ;
- l'aller-retour Excel ;
- la présence des formules et des couleurs dans l'export.

## Décisions du projet (historique)

Décisions prises avec le commanditaire, par ordre chronologique :

1. **Hébergement** :
   - dépôt séparé `MOU-Niger-Planning`, publié par Netlify et accessible depuis
     l'onglet Niger de chemlink.app ;
   - données en JSON dans le navigateur, sans Firebase.
2. **Institutions** : aucune mention de « siège », de DOS ni de GHSD.
3. **Budget** :
   - les budgets MOU se saisissent par année, FY2026 compris ;
   - accruals et règle de report pour chaque année ;
   - le solde FY2026 est reporté ou lissé, quelle que soit l'enveloppe concernée.
4. **Répartition** :
   - automatique selon la **quantification PSN 2027-2031**, sans split FY25 ;
   - ou quantités maximales ajustables à la main.
5. **Simplification** :
   - interface en 3 onglets, en langage courant ;
   - suppression du lexique et des délais d'acheminement ;
   - avion par défaut pour l'année à venir, pour respecter le plan d'approvisionnement.
6. **Coûts** :
   - coût livré maritime du fichier « Malaria_MOU_27-Niger.xlsx » (Commodity
     calculator, colonne F) ;
   - coût avion calculé à partir du prix EXW et du taux de fret aérien de référence ;
   - plus tard, remplacés par le scénario de référence du 02/10/2026.
7. **MILDA** : hors MOU, donc masquées par défaut.
8. **FY2026** :
   - le champ « assistance dépensée » a été supprimé ;
   - les accruals couvrent tout l'engagé, produits et assistance.
9. **Libellés** :
   - « quantité commandable », ajustée au budget disponible ;
   - « quantité initialement prévue pour l'USG » ;
   - **écart** en % (−4 % = 4 % de moins que prévu) plutôt qu'une couverture ;
   - libellé complet des quantités PSN partout (`PSN_LABEL`) ;
   - « split contribution USG » au lieu de « split PSN ».
10. **Excel** :
    - export uniquement, sans import ;
    - quantités, prix livrés et totaux, sans synthèse ;
    - entièrement en formules, aux couleurs de l'application.
11. **Fichiers** :
    - libellés « Télécharger le scénario » et « Charger un scénario », au lieu de
      « JSON » ;
    - un seul scénario de travail : « Réinitialiser » remplace
      Nouveau / Dupliquer / Supprimer.
12. **Valeurs par défaut** : scénario de référence du 02/10/2026, exporté depuis
    l'application.

### Écarts au cahier des charges d'origine

`docs/Specifications_Developpement_Application.md` n'est plus suivi sur les points
suivants :
- le split FY25 et le surplus FY26 ÷ 4 ont été remplacés par les règles de report par
  année ;
- les taux de fret en % ont été remplacés par des coûts livrés en $ ;
- il n'y a plus de vue détaillée ni de gestion de plusieurs scénarios ;
- l'en-tête est blanc, la palette est Chemonics et les icônes sont maison, à la place
  de `lucide-react`.

## Publication

Push ou fusion sur `main` → Netlify (`npm run build`, `dist/`) →
`mou-niger-planning.netlify.app` → `www.chemlink.app/MOU-Niger-Planning/`.

Avant de publier :
- `npm test` ;
- `npm run verify:excel` ;
- `npm run build` ;
- mise à jour des guides (`GUIDE_UTILISATEUR_*.md`, `public/guide.html`, ce fichier).

# MOU Niger Planning — consignes projet

@../design-system/DESIGN_SYSTEM.md
Preset couleurs : CHEMONICS

Application React + Vite publiée par Netlify (`mou-niger-planning.netlify.app`) et
servie sous `https://www.chemlink.app/MOU-Niger-Planning/` par le portail ChemLink.
Voir `SETUP-LOCAL.md` pour l'installation et la publication, et
`GUIDE_DEVELOPPEUR_2026-10-02.md` pour l'architecture et les règles de calcul.

## Règles du projet (décisions validées)

- **Public** : personnel non spécialiste. Langage courant, interface simple en
  3 onglets (Budget, Paramètres logistiques, Scénarios). Pas de lexique et pas de
  délais d'acheminement.
- **Institutions** : ne jamais mentionner « siège », DOS ni GHSD, ni dans l'interface,
  ni dans l'export, ni dans les guides.
- **Quantités PSN** : toujours préciser qu'il s'agit des « quantités prévues d'être
  couvertes par le Gouvernement américain (USG) dans la quantification du Plan
  stratégique 2027-2031 (PSN) ». Utiliser les constantes `PSN_LABEL` et `PSN_SHORT`
  (`src/model.js`).
- **Split** : parler de **split contribution USG**, jamais de « split PSN ». Il n'y a
  pas de split FY25.
- **Méthodes FY27-30** :
  - `quantif`, « Automatique (split contribution USG) » : tout le budget est réparti,
    sans plafond aux quantités prévues ;
  - `manual`, « Ajusté manuellement ».
- **Transport** : l'avion est proposé par défaut pour l'année à venir (FY2027).
  Les quantités sont toujours calculées avec le coût livré du mode choisi.
- **FY2026** (clos) : solde = budget − accruals. Les accruals couvrent tout l'engagé,
  produits et assistance. La réserve FY2026 est indicative.
- **MILDA** : hors MOU, masquées par défaut (`includeMilda`).
- **Scénarios** : un seul scénario de travail. Les boutons sont « Réinitialiser »,
  « Télécharger le scénario » et « Charger un scénario » (fichier .json, sans jamais
  écrire « JSON » dans l'interface). Pas de « Nouveau », « Dupliquer » ni « Supprimer ».
- **Excel** : export uniquement, sans import. Il contient les quantités, les prix livrés
  et les totaux, **entièrement en formules** liées à la feuille « Paramètres », aux
  couleurs de l'application. Il ne contient pas de synthèse.
- **Valeurs par défaut** : scénario de référence validé le 02/10/2026
  (`DEFAULT_PARAMS`, `DEFAULT_BUDGETS`, `DEFAULT_RESERVES`, `DEFAULT_YEAR_ACCRUALS`,
  `DEFAULT_CARRY_RULES`, `DEFAULT_PSN_2027`, `DEFAULT_LOGISTICS` dans `src/model.js`).

## Conventions techniques

- Moteur de calcul pur dans `src/model.js`, et export dans `src/excel.js`. Toute
  modification d'une règle de calcul s'accompagne d'un test dans `tests/model.test.js`.
  Si le calcul ou l'export change, les formules Excel doivent rester identiques à
  `simulate()` : `npm run verify:excel`.
- Les anciens scénarios et fichiers restent lisibles : `normalizeScenarioData` convertit
  sans changer les résultats.
- Les références internes sont toujours relatives (`base: './'`), car l'application
  est servie sous un préfixe.
- Écarts assumés au cahier des charges :
  - icônes SVG maison (pas de `lucide-react`) ;
  - palette Chemonics, sans le bleu `#000066` ;
  - pas de Firebase ;
  - ExcelJS chargé à la demande, sans CDN.
- **Avant chaque publication** :
  - lancer `npm test`, `npm run verify:excel` et `npm run build` ;
  - mettre à jour `GUIDE_UTILISATEUR_*.md`, `public/guide.html`,
    `GUIDE_DEVELOPPEUR_*.md` et ce fichier.

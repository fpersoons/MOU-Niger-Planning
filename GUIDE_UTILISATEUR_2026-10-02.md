# Guide utilisateur — MOU Niger : planificateur des intrants paludisme

L'application traduit les **budgets disponibles dans le cadre du MOU** en
**quantités d'intrants à commander** pour le Niger (FY2027-FY2030). Elle s'organise
en **trois onglets**, à remplir dans l'ordre ; les boutons en bas de page passent à
l'onglet suivant. Tout est enregistré automatiquement dans le navigateur
(pastille « Sauvegardé »).

## 1. Budget

Un seul tableau, une ligne par année fiscale **FY2026 à FY2030** (1er octobre – 30
septembre) :

| Colonne | Contenu |
| --- | --- |
| Budget MOU | budget disponible dans le cadre du MOU |
| Réserve assistance | assistance technique, entreposage, distribution ; pour FY2026 : montant prévu, pour information |
| Accruals | montants engagés, produits et assistance (pour FY2026 : au 30/09/2026) |
| Report reçu | soldes reportés depuis les années précédentes (calculé) |
| = Budget produits | budget MOU + report reçu − réserve − accruals (calculé) |
| Report du solde | *Année suivante*, *Lissé sur les années suivantes* ou *Aucun report* |

Le **solde** d'une année est, pour **FY2026** (clos), budget − accruals,
les accruals comprenant tout ce qui a été engagé (produits et assistance). Pour les années suivantes, c'est la part du
budget produits non utilisée dans les scénarios. Il est reporté selon le choix de la
dernière colonne : en totalité sur l'année suivante, ou à parts égales sur toutes les
années suivantes du MOU.

## 2. Paramètres logistiques

- **Coûts par intrant**, en dollars par **unité d'achat** (boîte, kit, flacon,
  moustiquaire) : **prix EXW**, **coût livré bateau + route** et **coût livré
  avion**. Les valeurs par défaut sont celles du scénario de référence du 02/10/2026
  (coût livré maritime du fichier *Malaria MOU 27 Niger* ; coût avion = prix EXW +
  fret aérien de référence). Le bouton « Coûts par défaut » les rétablit. Dans les
  scénarios, les quantités sont calculées avec le coût livré **du mode de transport
  choisi** pour l'année (avion ou bateau + route).
- **Quantités USG — quantification du PSN 2027-2031** : quantités prévues d'être
  couvertes par le Gouvernement américain (USG) dans la quantification du Plan
  stratégique 2027-2031 (PSN). Saisissez-les par intrant et par année. Le **split** (part de chaque intrant dans la valeur EXW de
  l'année) se calcule automatiquement ; 2031 est hors MOU (pour information).
- Les **moustiquaires (MILDA)**, non prévues dans le MOU, sont masquées ; la case
  « Inclure les moustiquaires » les réaffiche si besoin.

## 3. Scénarios

Pour chaque année FY2027-FY2030 :

- **Automatique (split PSN)** : tout le budget pour les produits est réparti selon le
  split PSN de l'année.
- **Ajusté manuellement** : on part des **quantités maximales** achetables, puis on
  les modifie ; le reste du budget (ou le dépassement) se met à jour en direct.
- **Transport** : avion ou bateau + route. Pour l'année à venir (FY2027), l'avion
  est retenu par défaut pour respecter le plan d'approvisionnement ; l'équipe
  choisit ensuite selon les dates du plan.
- Par produit : **split contribution USG**, **quantité commandable** (en unités d'achat) — c'est-à-dire
  la quantité initialement prévue pour l'USG dans la quantification du PSN 2027-2031,
  **ajustée pour rester dans le budget disponible** —, coût livré, **quantité
  initialement prévue pour l'USG** et **écart** par rapport
  à cette quantité (−4 % = 4 % de moins que prévu).
- **Copier pour un e-mail** et **synthèse FY2027-FY2030**.
- **Exporter Excel** (en-tête), aux couleurs de l'application :
  - feuille « Quantités et coûts » : par année, quantité commandable, prix unitaire
    livré, total livré, quantité prévue pour l'USG (PSN) et écart, puis total commandé,
    budget, report reçu, réserve, accruals, budget disponible et reste ;
  - feuille « Paramètres » : les hypothèses, dans des **cellules bleu clair
    modifiables** (budgets, réserves, accruals, règles de report, mode de transport,
    méthode, coûts, quantités PSN et manuelles).
  - **Tout est calculé par formules** : en modifiant une cellule bleu clair, Excel
    recalcule les quantités, les coûts, les reports et les restes comme l'application.

## Enregistrer son scénario

L'application s'ouvre avec les valeurs par défaut ; dès qu'on les modifie, on
construit son scénario, enregistré automatiquement dans le navigateur. La barre sous
l'en-tête permet de :

- **nommer** le scénario (le nom figure dans l'export Excel et le texte pour e-mail) ;
- **Réinitialiser** : revenir aux valeurs par défaut ;
- **Télécharger le scénario** : l'enregistrer dans un fichier, pour le conserver ou le
  transmettre ;
- **Charger un scénario** : reprendre un fichier téléchargé (il remplace les valeurs
  actuelles). Pour comparer deux hypothèses, téléchargez la première, modifiez, puis
  rechargez-la si besoin.

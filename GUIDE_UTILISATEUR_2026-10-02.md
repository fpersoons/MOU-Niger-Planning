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
| Réserve assistance | assistance technique, entreposage, distribution (sans objet pour FY2026, clos) |
| Accruals | montants engagés (pour FY2026 : au 30/09/2026) |
| Report reçu | soldes reportés depuis les années précédentes (calculé) |
| = Budget produits | budget MOU + report reçu − réserve − accruals (calculé) |
| Report du solde | *Année suivante*, *Lissé sur les années suivantes* ou *Aucun report* |

Le **solde** d'une année est, pour **FY2026** (clos), budget − accruals : la réserve
d'assistance non engagée en fait partie. Pour les années suivantes, c'est la part du
budget produits non utilisée dans les scénarios. Il est reporté selon le choix de la
dernière colonne : en totalité sur l'année suivante, ou à parts égales sur toutes les
années suivantes du MOU.

## 2. Paramètres logistiques

- **Coûts par intrant**, en dollars par **unité d'achat** (boîte, kit, flacon,
  moustiquaire) : **prix EXW**, **coût livré bateau + route** et **coût livré
  avion**. Les valeurs par défaut viennent du fichier *Malaria MOU 27 Niger*
  (prix de référence et coût livré total maritime) ; le coût avion est une
  estimation. Le bouton « Coûts de référence MOU 27 » rétablit ces valeurs.
- **Quantités financées par l'USG — PSN 2027-2031** : saisissez les quantités par
  intrant et par année. Le **split** (part de chaque intrant dans la valeur EXW de
  l'année) se calcule automatiquement ; 2031 est hors MOU (pour information).

## 3. Scénarios

Pour chaque année FY2027-FY2030 :

- **Automatique (split PSN)** : tout le budget pour les produits est réparti selon le
  split PSN de l'année.
- **Ajusté manuellement** : on part des **quantités maximales** achetables, puis on
  les modifie ; le reste du budget (ou le dépassement) se met à jour en direct.
- **Transport** : avion ou bateau + route. Pour l'année à venir (FY2027), l'avion
  est retenu par défaut pour respecter le plan d'approvisionnement ; l'équipe
  choisit ensuite selon les dates du plan.
- Par produit : split PSN, **quantité à commander** (en unités d'achat), coût livré,
  quantité PSN et **couverture**. Les moustiquaires se saisissent directement
  (années en bateau).
- **Copier pour un e-mail**, **synthèse FY2027-FY2030** et **Exporter en Excel**.

## Scénarios enregistrés

La barre sous l'en-tête permet de choisir le scénario actif, de le renommer, d'en
créer un nouveau, de le **dupliquer** (pour comparer deux hypothèses, par exemple
avion et bateau) ou de le supprimer. **Importer Excel** crée un scénario à partir
d'un fichier exporté par l'application ; **JSON** sauvegarde ou recharge tous les
scénarios (pour changer d'ordinateur).

# Guide utilisateur — Planificateur Intrants Paludisme FY26-FY30

## 1. Principe

L'outil simule les achats d'intrants antipaludiques de FY2026 à FY2030 :

1. **Budget intrants** = budget total de l'exercice − **réserve d'assistance**
   (assistance technique, entreposage, distribution). Exemple : 10 000 000 $ avec une
   réserve de 1 600 000 $ laissent 8 400 000 $ pour les intrants.
2. **FY2026** : vous saisissez les quantités. Les dépenses (EXW + fret + accruals)
   sont déduites du budget intrants ; le reste est le **surplus FY26**.
3. Le surplus est divisé par 4 (**report annuel lissé**) et ajouté aux budgets
   intrants FY27 à FY30.
4. **FY2027 à FY2030** : le coût des MILDA (exercice en mode Mer) est retiré, puis le
   budget restant est réparti entre les 10 intrants réguliers selon la **méthode**
   choisie pour l'exercice :
   - **Split FY25** : répartition selon le split FY25 appliqué à la valeur EXW, en
     utilisant le maximum du budget, fret compris, sans le dépasser ;
   - **Split quantification** : répartition selon les quantités demandées par le
     Niger (quantification). Si le budget ne suffit pas, toutes les quantités sont
     réduites dans la même proportion ; s'il suffit, la quantification est achetée
     en entier (jamais au-delà) et le reste apparaît dans le solde ;
   - **Quantités manuelles** : vous saisissez les quantités dans le tableau de
     l'exercice et le solde se met à jour en direct, pour « jouer » avec les
     quantités et rester dans le budget.

## 2. L'écran

- **En-tête** : indicateur de sauvegarde, lien vers ce guide, Import / Export JSON,
  bouton **Exporter Excel** (scénario actif).
- **Colonne de gauche**
  - *Gestion des données* : A — charger le fichier de référence Google Drive ;
    B — charger un fichier Excel local ; C — remettre le scénario à zéro.
  - *Configuration des intrants* : split FY25 (doit totaliser 100 % : badge vert,
    sinon rouge), prix EXW, taux de fret Air et Mer (en % du prix EXW), quantité FY26.
  - *Paramètres annuels* : pour chaque exercice, mode Air ou Mer, budget total,
    réserve d'assistance et (FY27-FY30) méthode de calcul.
- **Colonne centrale**
  - *Quantification Niger* (dépliable) : quantités demandées par intrant pour FY27 à
    FY30, avec leur coût landed, le budget disponible et la couverture possible.
  - Un tableau par exercice (cliquer sur l'en-tête pour le replier). Sous chaque
    quantité figurent le besoin de la quantification et le taux de couverture.
    En méthode *Quantités manuelles*, une barre « Pré-remplir » propose :
    *Quantification* (copie des besoins), *Quantification ajustée au budget*,
    *Split FY25* ou *Zéro* ; elle affiche le reste à engager ou le dépassement. En FY26, la ligne *Accruals* permet de modifier l'intitulé, le montant
  EXW et le taux de fret aérien (au centième près, pour caler le montant landed sur
  MFS). En mode Mer, les trois lignes MILDA apparaissent avec un champ de quantité.
- **Colonne de droite** : surplus FY26, report annuel lissé, liste des scénarios.
- **Bas de page** : synthèse pluriannuelle.

Les montants se saisissent avec une virgule ou un point décimal. Tout est enregistré
automatiquement (pastille « Sauvegardé »).

## 3. Scénarios

- **+** : nouveau scénario aux valeurs par défaut du cahier des charges.
- Cliquer sur le rond à gauche d'un scénario pour l'activer ; cliquer sur son nom
  pour le renommer.
- Icônes : exporter en Excel, dupliquer, supprimer.
- Un import Excel (option A ou B) crée toujours un **nouveau** scénario.

Les scénarios restent dans le navigateur utilisé. Pour les sauvegarder ou les
retrouver sur un autre ordinateur : **Export JSON**, puis **Import JSON**.

## 4. Export Excel

Le fichier `GHSC-PSM_Budget_Prospective_MM_JJ_AA_<scénario>.xlsx` contient :

- la feuille **Simulation** : un tableau par exercice (méthode indiquée dans le titre ;
  intrants par catégorie, quantités, EXW, fret, landed, besoin et couverture), puis
  budget de base, réserve d'assistance, report lissé, budget disponible pour les
  intrants, total dépenses et solde final (vert si positif, rouge si négatif) ;
- la feuille **Paramètres** : tous les réglages du scénario (y compris réserves,
  méthodes, quantification et quantités manuelles). Ce fichier peut être
  rechargé tel quel avec l'option B.

## 5. Option A — Google Drive

Google Drive refuse en général la lecture directe depuis une page web (sécurité
« CORS »). Dans ce cas un message l'indique : ouvrir le fichier dans Drive, le
télécharger (Fichier → Télécharger → .xlsx), puis le charger avec l'option B.

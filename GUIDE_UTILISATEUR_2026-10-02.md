# Guide utilisateur — Planificateur Intrants Paludisme FY26-FY30

## 1. Principe

L'outil simule les achats d'intrants antipaludiques de FY2026 à FY2030 :

1. **FY2026** : vous saisissez les quantités. Les dépenses (EXW + fret + accruals)
   sont déduites du budget ; le reste est le **surplus FY26**.
2. Le surplus est divisé par 4 (**report annuel lissé**) et ajouté aux budgets FY27 à FY30.
3. **FY2027 à FY2030** : l'outil calcule lui-même les quantités. Il retire d'abord le
   coût des MILDA (si l'exercice est en mode Mer), puis répartit le budget restant
   entre les 10 intrants réguliers selon le **split FY25 appliqué à la valeur EXW**,
   en utilisant le maximum du budget, fret compris, sans le dépasser.

## 2. L'écran

- **En-tête** : indicateur de sauvegarde, lien vers ce guide, Import / Export JSON,
  bouton **Exporter Excel** (scénario actif).
- **Colonne de gauche**
  - *Gestion des données* : A — charger le fichier de référence Google Drive ;
    B — charger un fichier Excel local ; C — remettre le scénario à zéro.
  - *Configuration des intrants* : split FY25 (doit totaliser 100 % : badge vert,
    sinon rouge), prix EXW, taux de fret Air et Mer (en % du prix EXW), quantité FY26.
  - *Logistique annuelle* : mode Air ou Mer et budget initial de chaque exercice.
- **Colonne centrale** : un tableau par exercice (cliquer sur l'en-tête pour le
  replier). En FY26, la ligne *Accruals* permet de modifier l'intitulé, le montant
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

- la feuille **Simulation** : un tableau par exercice (intrants par catégorie,
  quantités, EXW, fret, landed), puis budget de base, report lissé, budget
  disponible, total dépenses et solde final (vert si positif, rouge si négatif) ;
- la feuille **Paramètres** : tous les réglages du scénario. Ce fichier peut être
  rechargé tel quel avec l'option B.

## 5. Option A — Google Drive

Google Drive refuse en général la lecture directe depuis une page web (sécurité
« CORS »). Dans ce cas un message l'indique : ouvrir le fichier dans Drive, le
télécharger (Fichier → Télécharger → .xlsx), puis le charger avec l'option B.

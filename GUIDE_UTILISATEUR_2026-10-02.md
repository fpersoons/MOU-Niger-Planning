# Guide utilisateur — MOU Niger Planning (intrants paludisme FY2027-FY2030)

Ce guide s'adresse à toute personne qui doit traduire un **budget communiqué par le
siège** en **quantités de produits à commander** pour le Niger, sans être
spécialiste de la logistique ou de la quantification (par exemple, le personnel de
l'ambassade).

L'application propose deux vues (onglets sous l'en-tête) :

- **Assistant pas à pas** (par défaut) : trois étapes en langage courant ;
- **Vue détaillée** : tous les paramètres et calculs, pour les spécialistes.

Tout est enregistré automatiquement dans le navigateur (pastille « Sauvegardé »).

## Avant de commencer : l'acheminement vers le Niger

L'encadré jaune en haut de l'assistant rappelle la situation (octobre 2026) :

- la frontière Bénin–Niger est fermée ; par bateau, les produits arrivent à **Lomé
  (Togo)** puis traversent le **Burkina Faso** par la route : délais imprévisibles,
  risques de sécurité et de blocage ;
- une commande passée aujourd'hui n'arrivera pas avant plusieurs mois (environ 4 à
  7 mois par avion, 6 à 13 mois par bateau + route — hypothèses modifiables) : les
  besoins de fin 2026 – début 2027 ne peuvent plus être couverts par une nouvelle
  commande ;
- l'avion évite la route mais coûte plus cher : à budget égal, on achète moins de
  produits. Les moustiquaires (MILDA) ne voyagent que par bateau ;
- les produits de la chimioprévention saisonnière (CPS, AQ + SP) doivent être au
  Niger avant la campagne (en général juillet–octobre).

Le lien « Hypothèses de délais utilisées » permet d'ajuster ces délais (ils ne
changent que les dates, pas les quantités).

## Étape 1 — Budget communiqué par le siège

1. **FY2026** (1er octobre 2025 – 30 septembre 2026) est terminé. Indiquez si son
   budget a servi à passer des commandes :
   - *Non, rien n'a été commandé* : seules les sommes déjà engagées (accruals) sont
     comptées ; le reste est **non dépensé** ;
   - *Oui* : les quantités FY26 saisies dans la vue détaillée sont comptées.
2. Choisissez où reporter le montant non dépensé : **en totalité sur FY2027**
   (l'exercice en cours, commencé le 1er octobre 2026) ou réparti sur FY2027-FY2030.
3. Pour chaque année fiscale FY2027-FY2030, saisissez le **budget annoncé par le
   siège** et la **réserve d'assistance** (assistance technique, entreposage,
   distribution). La dernière colonne donne le **budget pour les produits**.

## Étape 2 — Répartition du budget et transport

Pour chaque année :

- **Répartition** :
  - *Selon la demande du Niger* : le budget suit les quantités demandées par le
    Niger (tableau « Demande du Niger » juste en dessous, à remplir). Si le budget
    ne suffit pas, chaque produit est réduit du même pourcentage. S'il reste de
    l'argent, une case permet de l'utiliser pour commander davantage ;
  - *Selon la répartition habituelle (FY25)* : le budget suit les parts de chaque
    produit dans les achats de FY25 ;
  - *Je fixe les quantités* : vous saisissez les quantités à l'étape 3.
- **Transport** : *Avion* ou *Bateau + route*. Sous chaque année, l'outil indique
  l'effet de l'autre choix (date d'arrivée et quantité de produits achetables).
- **Produits attendus au Niger en** : le mois où les produits doivent être
  disponibles selon le plan d'approvisionnement. L'outil en déduit un statut :
  - *Dans les temps* : commander au plus tard à la date indiquée ;
  - *Risque de retard* : à temps seulement si tout se passe bien ; commander sans
    attendre ;
  - *Arrivée tardive* : même commandés aujourd'hui, les produits arriveront après
    la date souhaitée.

## Étape 3 — Quantités à commander

Pour chaque année : la liste des produits (nom courant, usage et référence),
la **quantité à commander**, le **coût estimé livré** (produit + transport, en
dollars américains), la **demande du Niger** et la **couverture** (pourcentage de
la demande couvert). Les produits sans quantité sont masqués (lien pour les
afficher).

- **Ajuster ces quantités à la main** : reprend les quantités calculées et passe en
  saisie libre ; le reste du budget (ou le dépassement) se met à jour en direct.
  Les boutons « Partir de… » proposent la demande du Niger, la demande ajustée au
  budget ou la répartition habituelle.
- **Copier pour un e-mail** : copie un texte prêt à coller (budget, transport,
  délais, quantités, total, reste).
- **Exporter le scénario en Excel** : fichier avec une feuille « Quantités à
  commander » prête à transmettre, plus le détail des calculs.

## Scénarios

Colonne de droite : **+** crée un scénario aux valeurs par défaut ; cliquer sur le
rond pour l'activer, sur le nom pour le renommer ; icônes pour exporter en Excel,
dupliquer, supprimer. Pour comparer deux hypothèses (par exemple avion et bateau),
dupliquez le scénario et modifiez la copie.

Les scénarios restent dans le navigateur utilisé : pour les sauvegarder ou les
transférer, **Export JSON** puis **Import JSON** (en-tête).

## Vue détaillée (spécialistes)

Prix EXW, taux de fret Air/Mer, split FY25, quantités FY26, accruals, MILDA,
import Excel (Google Drive ou fichier local), remise à zéro, et un tableau complet
par exercice (EXW, fret, landed). L'option A (Google Drive) est souvent bloquée par
le navigateur : télécharger le fichier depuis Drive puis utiliser l'option B.

## Lexique

Un lexique est disponible en bas de l'assistant (année fiscale, réserve
d'assistance, couverture, coût livré, CPS, TDR, MILDA…).

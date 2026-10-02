# Guide utilisateur — MOU Niger : planificateur des intrants paludisme

L'application traduit les **budgets disponibles dans le cadre du MOU** en
**quantités d'intrants à commander** pour le Niger (FY2027-FY2030). Elle s'organise
en **trois onglets**, à remplir dans l'ordre ; les boutons en bas de page passent à
l'onglet suivant. Tout est enregistré automatiquement dans le navigateur
(pastille « Sauvegardé »).

## 1. Budget

- Pour chaque année fiscale **FY2026 à FY2030** (1er octobre – 30 septembre) :
  **budget disponible** du MOU et **réserve d'assistance** (assistance technique,
  entreposage, distribution).
- **Clôture de FY2026 au 30 septembre 2026** :
  - une ligne par **accrual** (intitulé, références, montant engagé) — « Ajouter un
    accrual », corbeille pour supprimer ;
  - **assistance engagée** au 30/09/2026 sur la réserve FY2026 ;
  - l'outil calcule le **solde produits** (budget − réserve − accruals) et le
    **solde assistance** (réserve − assistance engagée) ;
  - **traitement du solde** : *reporté en totalité sur FY2027* ou *lissé sur les
    autres années du MOU*. Chaque solde reste dans son enveloppe : le tableau montre,
    par année, le **budget pour les produits** et l'**assistance disponible**.

## 2. Paramètres logistiques

- **Coûts par intrant**, en dollars par unité : **prix EXW** (départ usine), **coût
  livré bateau + route** et **coût livré avion** (produit + transport jusqu'au
  Niger). Le pourcentage de transport correspondant s'affiche sous chaque coût. Les
  moustiquaires (MILDA) ne voyagent que par bateau.
- **Quantités financées par l'USG — PSN 2027-2031** : saisissez les quantités par
  intrant et par année. Le **split** (part de chaque intrant dans la valeur EXW de
  l'année) se calcule automatiquement ; la colonne « Total 2027-2031 » donne le
  split sur l'ensemble de la période. 2031 est hors MOU (pour information).
- **Délais d'acheminement** (encadré jaune, à déplier) : frontière Bénin–Niger
  fermée, route Lomé – Burkina Faso – Niger ; délais par mode (hypothèses
  modifiables, à confirmer avec GHSC-PSM).

## 3. Scénarios

Pour chaque année FY2027-FY2030 :

- **Automatique (split PSN)** : tout le budget pour les produits est réparti selon le
  split PSN de l'année ; les quantités se recalculent dès qu'un paramètre change.
- **Ajusté manuellement** : on part des **quantités maximales** achetables avec le
  budget (celles du calcul automatique), puis on modifie librement les quantités ;
  le reste du budget (ou le dépassement) se met à jour en direct. Boutons
  « Repartir des quantités maximales » et « Reprendre les quantités PSN ».
- **Transport** (avion / bateau + route) et mois où les produits sont **attendus au
  Niger** : l'outil indique le statut (*Dans les temps*, *Risque de retard*,
  *Arrivée tardive*), la date limite de commande ou la période d'arrivée d'une
  commande passée aujourd'hui, et l'effet de l'autre mode de transport.
- Le tableau donne, par produit : split PSN, **quantité à commander**, coût livré,
  quantité PSN de l'année et **couverture** (quantité commandée ÷ quantité PSN).
- Les moustiquaires se saisissent directement (années en bateau).
- **Copier pour un e-mail** : texte prêt à coller.
- **Synthèse FY2027-FY2030** en bas, avec **Exporter en Excel** (feuille
  « Quantités à commander » prête à transmettre + détail des calculs).

## Scénarios enregistrés

La barre sous l'en-tête permet de choisir le scénario actif, de le renommer, d'en
créer un nouveau, de le **dupliquer** (pour comparer deux hypothèses, par exemple
avion et bateau) ou de le supprimer. **Importer Excel** crée un scénario à partir
d'un fichier exporté par l'application ; **JSON** sauvegarde ou recharge tous les
scénarios (pour changer d'ordinateur).

## Lexique

En bas de chaque page : année fiscale, accruals, prix EXW, coût livré, PSN, split,
couverture, CPS, TDR, MILDA…

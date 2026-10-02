# Cahier des Charges & Spécifications Techniques : Planificateur Budgétaire Intrants Paludisme (FY26-FY30)

Ce document fournit l'ensemble des spécifications fonctionnelles, règles de calcul, modèles de données, directives ergonomiques et exigences techniques pour reproduire l'application dans un environnement React (par exemple un Claude Artifact ou une application standalone).

---

## 1. Contexte & Identité Institutionnelle

- **Programme** : *U.S. Government Global Health Supply Chain Program - Procurement and Supply Management (GHSC-PSM)*
- **Tutelle** : *U.S. Department of State | Bureau of Global Health Security and Diplomacy (GHSD)*
- **Intitulé de l'outil** : *Planificateur Budgétaire Intrants Paludisme FY26-FY30*
- **Finalité** : Simuler et optimiser les acquisitions prospectives d'intrants antipaludiques sur 5 années fiscales (FY2026 à FY2030), calculer le report lissé d'un excédent initial (Surplus FY26 lissé sur FY27-FY30) et arbitrer entre modes de fret (Air vs Mer) tout en intégrant des achats manuels de moustiquaires (MILDA).

---

## 2. Données Initiales & Paramétrage par Défaut

### 2.1 Enveloppes Budgétaires Initiales
Chaque année fiscale dispose d'un budget brut contractuel :
- **FY 2026** : `$13,321,800`
- **FY 2027** : `$10,947,300`
- **FY 2028** : `$9,142,167`
- **FY 2029** : `$8,034,067`
- **FY 2030** : `$7,400,000`

### 2.2 Catégories Institutionnelles
Les intrants sont regroupés dans 4 catégories :
1. `Prevention Commodity Procurement`
2. `Diagnostic Commodity Procurement`
3. `Therapeutic Commodity Procurement`
4. `OTHER` (réservé aux écritures comptables d'engagements / Accruals)

### 2.3 Liste des Intrants et Propriétés de Référence
L'application gère 13 références réparties en deux groupes (intrants réguliers sous split, et intrants conditionnels MILDA) :

| ID | Intrant | Catégorie | Type | Split FY25 (%) | Prix EXW ($) | Fret Air (%) | Fret Mer (%) | Quantité FY26 initiale |
|---|---|---|---|---|---|---|---|---|
| 1 | `SP 500/25mg` | Prevention | Régulier | 4.41% | $13.79 | 61.41% | 50.00% | 15,000 |
| 2 | `AQ-SP 76.5/262.5mg (3-11m)` | Prevention | Régulier | 8.18% | $12.00 | 54.04% | 50.00% | 31,959 |
| 3 | `AQ-SP 153/525MG (12-59M)` | Prevention | Régulier | 33.21% | $12.64 | 46.93% | 50.00% | 124,442 |
| 4 | `RDT` | Diagnostic | Régulier | 10.67% | $5.00 | 100.00% | 50.00% | 0 |
| 5 | `AL6` | Therapeutic | Régulier | 3.76% | $6.30 | 58.20% | 50.00% | 28,000 |
| 6 | `AL12` | Therapeutic | Régulier | 7.02% | $10.80 | 42.90% | 50.00% | 30,480 |
| 7 | `AL18` | Therapeutic | Régulier | 4.72% | $14.70 | 60.00% | 50.00% | 15,000 |
| 8 | `AL24` | Therapeutic | Régulier | 9.12% | $16.10 | 51.20% | 50.00% | 26,552 |
| 9 | `Inj 60 mg` | Therapeutic | Régulier | 18.72% | $1.35 | 109.50% | 50.00% | 650,000 |
| 10 | `AS 100mg SUPPO` | Therapeutic | Régulier | 0.19% | $0.90 | 174.00% | 50.00% | 10,000 |
| 11 | `MILDA Régulière` | Prevention | MILDA (`isMilda: true`) | *(N/A)* | $2.00 | *(Désactivé)* | 50.00% | *(N/A)* |
| 12 | `MILDA PBO` | Prevention | MILDA (`isMilda: true`) | *(N/A)* | $2.30 | *(Désactivé)* | 50.00% | *(N/A)* |
| 13 | `MILDA IG2` | Prevention | MILDA (`isMilda: true`) | *(N/A)* | $3.00 | *(Désactivé)* | 50.00% | *(N/A)* |

### 2.4 Accruals (Engagements Reportés / RO) pour FY 2026
- Montant EXW par défaut : `$1,106,690.00`
- Intitulé par défaut : `mRDTs (RO Accruals)`
- Taux de fret aérien réglable : par défaut `0.00%` (permet un ajustement fin décimal pour caler le montant Landed sur le système comptable MFS).
- Catégorie d'affichage : `OTHER`

### 2.5 Choix Logistiques par Défaut
- FY 2026 : `Air`
- FY 2027 : `Air`
- FY 2028 : `Mer`
- FY 2029 : `Mer`
- FY 2030 : `Mer`

---

## 3. Modèle Mathématique & Moteur de Calcul

### 3.1 Définitions Fondamentales
Pour chaque intrant $i$ :
- $P_i$ : Prix unitaire EXW (Ex-Works).
- $Q_i$ : Quantité d'unités commandées.
- $r_i$ : Taux de fret applicable selon le mode de transport retenu pour l'exercice ($r_{i,\text{air}}$ ou $r_{i,\text{mer}}$).
- $\text{EXW}_i = Q_i \times P_i$
- $\text{Fret}_i = \text{EXW}_i \times r_i$
- $\text{Landed}_i = \text{EXW}_i + \text{Fret}_i = Q_i \times P_i \times (1 + r_i)$

---

### 3.2 Modélisation de l'Exercice FY 2026

1. **Intrants Réguliers (1 à 10)** : Les quantités $Q_{i,2026}$ proviennent de la saisie manuelle (champ *Qté FY26*).
2. **MILDA** : Masquées et exclues si le mode est `Air`. Si le mode est basculé sur `Mer`, elles deviennent éligibles.
3. **Accruals (RO)** :
   $$\text{EXW}_{\text{acc}} = \text{Montant saisi}$$
   $$\text{Fret}_{\text{acc}} = \text{EXW}_{\text{acc}} \times r_{\text{acc}}$$
   $$\text{Landed}_{\text{acc}} = \text{EXW}_{\text{acc}} + \text{Fret}_{\text{acc}}$$
4. **Total Dépenses & Surplus** :
   $$\text{Total Dépenses}_{2026} = \sum_{i=1}^{10} \text{Landed}_{i,2026} + \text{Landed}_{\text{acc}}$$
   $$\text{Surplus}_{2026} = \text{Budget Initial}_{2026} - \text{Total Dépenses}_{2026}$$
5. **Bonus Annuel Lissé (Carry-over)** :
   $$\text{Bonus} = \frac{\text{Surplus}_{2026}}{4}$$
   *Ce bonus est injecté à parts égales pour abonder les exercices 2027, 2028, 2029 et 2030.*

---

### 3.3 Modélisation des Exercices FY 2027 à FY 2030

Pour chaque année $Y \in \{2027, 2028, 2029, 2030\}$ :

#### Étape A : Budget Global Disponible
$$\text{Budget Dispo}_Y = \text{Budget Initial}_Y + \text{Bonus}$$

#### Étape B : Prélèvement Prioritaire des MILDA (si Mer)
- Les MILDA ne peuvent voyager que par **Mer**.
- Si le mode logistique de l'année est `Air`, les 3 lignes MILDA sont invisibles et leur quantité forcée à 0.
- Si le mode est `Mer`, les 3 lignes MILDA apparaissent avec un champ de saisie manuelle $Q_{m,Y}$ pour chacune.
- Le coût débarqué des MILDA est immédiatement calculé :
  $$\text{Coût Landed MILDA}_Y = \sum_{m \in \{\text{Rég, PBO, IG2}\}} \left[ Q_{m,Y} \times P_m \times (1 + r_{m,\text{mer}}) \right]$$

#### Étape C : Budget Résiduel pour les Intrants Réguliers
$$\text{Budget Résiduel}_Y = \text{Budget Dispo}_Y - \text{Coût Landed MILDA}_Y$$

#### Étape D : Répartition Proportionnelle sur Base EXW (Règle Métier Critique)
> **Principe fondamental :** Le split historique de FY25 s'applique **exclusivement sur la base de la valeur EXW relative**, et non sur le coût Landed. Pourtant, le scénario doit respecter l'enveloppe budgétaire globale Landed (fret inclus).

1. Normalisation des parts de split saisies (sur les 10 intrants réguliers) :
   $$S_{\text{tot}} = \sum_{i=1}^{10} \text{Split}_i$$
   $$w_i = \frac{\text{Split}_i}{S_{\text{tot}}}$$

2. Détermination du facteur d'échelle Landed / EXW :
   Soit $E_{\text{tot}}$ la valeur EXW totale théorique à attribuer à l'ensemble des intrants réguliers.
   La valeur EXW cible pour chaque produit est :
   $$\text{EXW}_i = w_i \times E_{\text{tot}}$$
   Le coût Landed induit est :
   $$\text{Landed}_i = \text{EXW}_i \times (1 + r_{i,Y}) = w_i \times E_{\text{tot}} \times (1 + r_{i,Y})$$
   En sommant sur tous les intrants :
   $$\text{Coût Landed Total} = E_{\text{tot}} \times \sum_{i=1}^{10} \left[ w_i \times (1 + r_{i,Y}) \right]$$
   Pour saturer au maximum le budget résiduel sans le dépasser :
   $$E_{\text{tot}} = \frac{\text{Budget Résiduel}_Y}{\sum_{i=1}^{10} \left[ w_i \times (1 + r_{i,Y}) \right]}$$

3. Déduction des quantités entières :
   Pour chaque intrant régulier $i$ :
   $$\text{Cible EXW}_i = E_{\text{tot}} \times w_i$$
   $$Q_{i,Y} = \left\lfloor \frac{\text{Cible EXW}_i}{P_i} \right\rfloor$$
   $$\text{EXW}_{i,Y} = Q_{i,Y} \times P_i$$
   $$\text{Fret}_{i,Y} = \text{EXW}_{i,Y} \times r_{i,Y}$$
   $$\text{CostTotal}_{i,Y} = \text{EXW}_{i,Y} + \text{Fret}_{i,Y}$$

4. Dépenses totales et solde :
   $$\text{Total Dépenses}_Y = \sum_{i=1}^{10} \text{CostTotal}_{i,Y} + \text{Coût Landed MILDA}_Y$$
   $$\text{Solde Final}_Y = \text{Budget Dispo}_Y - \text{Total Dépenses}_Y$$

---

## 4. Spécifications Fonctionnelles & Ergonomiques

### 4.1 En-tête Institutionnel
- Fond bleu profond (`#000066`), typographie contrastée, arrondis modernes (`rounded-3xl`), ombre marquée (`shadow-2xl`).
- Logos/icônes Lucide : `ShieldCheck`, `Landmark`, `Cloud`, `FileSpreadsheet`.
- Titres institutionnels complets en majuscules (GHSC-PSM, Bureau of Global Health Security and Diplomacy, Department of State).
- Indicateur de synchronisation Cloud en temps réel.
- Bouton proéminent d'exportation Excel.

### 4.2 Volet Latéral Gauche (Configuration & Gestion)
Divisé en 3 cartes distinctes :

#### 1. Carte "Gestion des Données" (3 options visuelles distinctes)
- **Option A : Cloud Google Drive**
  - Bloc vert (`bg-emerald-50`, `border-emerald-100`).
  - Déclenche un fetch sur l'ID public Google Drive prédéfini (`1e2J9WXyNFNI4DYm1JX4V5H1jVxMLoFnQ`).
  - Gestion gracieuse du blocage CORS avec message explicatif orientant vers l'Option B.
- **Option B : Fichier Local (.xlsx)**
  - Bloc bleu (`bg-blue-50`, `border-blue-100`).
  - Input file stylisé acceptant `.xlsx` et `.xls`.
  - **Important** : Nettoyer impérativement la valeur de l'élément input (`inputRef.current.value = ""`) après chaque lecture afin de permettre le rechargement immédiat d'un même fichier après reset.
- **Option C : Remise à Zéro**
  - Bloc rouge (`bg-red-50`, `border-red-100`).
  - Réinitialise tous les champs aux valeurs neutres (0.00 / 0) et met à jour le Cloud.

#### 2. Carte "Configuration des Intrants"
- **Badge dynamique de validation du Split FY25** :
  - Somme des splits des intrants non-MILDA.
  - Si $|\sum \text{Split} - 100| < 0.1\%$ : Affichage vert émeraude (`bg-emerald-50`, `border-emerald-400`), icône `CheckCircle`.
  - Si écart $\ge 0.1\%$ : Affichage rouge alerte (`bg-red-50`, `border-red-400`), icône `AlertTriangle`.
- **Liste déroulante des intrants** :
  - Titre, champ Split % (éditable sauf pour les MILDA).
  - Grille à 3 colonnes : Prix EXW, Taux Air %, Taux Mer %.
  - Champ Quantité FY26 (affiché pour les intrants non-MILDA).
  - Taux Air désactivé pour les 3 types de MILDA.

#### 3. Carte "Logistique Annuelle"
- Sélecteur à bascule (Toggle) pour chaque exercice (FY 2026 à FY 2030) entre `Air` (icône `Plane`) et `Mer` (icône `Waves`).
- Le basculement recalcule instantanément tous les tableaux et l'affichage des MILDA.

### 4.3 Volet Principal Droit (Tableaux de Simulation)
1. **Tuiles KPI en en-tête** :
   - *Surplus FY2026* : Affichage dynamique du surplus résiduel.
   - *Report Annuel Lissé* : Affichage dynamique du quart du surplus ajouté aux exercices 2027-2030.
2. **Tableaux Annuels (FY2026 à FY2030)** :
   - En-tête : Exercice, Budget Total Disponible, Badge Logistique (Air/Mer), Solde Final (en vert si positif, en rouge si négatif).
   - Table par catégories :
     - En-têtes de catégorie stylisés (bandeaux gris clair italiques).
     - Lignes intrants : Nom, Quantité, Total EXW, Fret, Total Landed.
     - Ligne spéciale Accruals en FY26 : Description éditable, saisie du montant EXW et saisie du taux de fret aérien.
     - Lignes MILDA (si Mer) : Badge "Saisie Manuelle" et champ numérique d'édition directe de la quantité.
   - Pied de tableau (TFoot) en bleu institutionnel :
     - Ligne "Total Dépenses Estimées".
     - Ligne "SOLDE FINAL (Budget - Dépenses)".

---

## 5. Règle Critique de Parsing Numérique (Robustesse Excel)

Lors de l'importation de fichiers Excel, les pourcentages peuvent être convertis par SheetJS sous forme décimale (ex. `0.6141` pour 61.41% ou `1.74` pour 174.00%) ou sous forme de chaînes de caractères (ex. `"174%"`, `"174,00%"`).

La fonction de parsing doit obligatoirement respecter l'heuristique suivante :
```javascript
const parseVal = (v, isPct = false) => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') {
    // Si la valeur est un nombre et qu'on attend un pourcentage,
    // Excel a souvent transformé x% en x/100.
    // Un seuil de 20.0 permet de couvrir jusqu'à 2000% de fret (ex: 1.74 -> 174%)
    // tout en évitant d'altérer les entiers déjà saisis en échelle 0-100.
    return (isPct && v <= 20.0) ? v * 100 : v;
  }
  let s = String(v).trim().replace(/\s/g, '').replace(/[$/]/g, '').replace(',', '.');
  const hasPct = s.includes('%');
  s = s.replace('%', '');
  let n = parseFloat(s) || 0;
  if (isPct && !hasPct && n > 0 && n <= 20) n = n * 100;
  return n;
};
```

---

## 6. Spécifications d'Exportation Excel (.xlsx)

- **Moteur requis** : Utiliser la bibliothèque `ExcelJS` (et non de simples fichiers XML ou CSV renommés en `.xlsx`) afin d'assurer l'ouverture sans avertissement de corruption sous Microsoft Excel.
- **Nom du fichier** : 
  `GHSC-PSM_Budget_Prospective_MM_DD_YY.xlsx` (date du jour au format américain à deux chiffres).
- **Formatage strict** :
  - **Police de caractères** : Uniforme sur toutes les cellules de données à **11 points** (`font: { size: 11, name: 'Arial' }`).
  - **En-têtes de colonnes** : Fond bleu foncé (`#000066`), texte blanc gras centré.
  - **Lignes de catégories** : Fond gris clair (`#F1F5F9`), texte gras italique avec fusion de cellules de colonnes 1 à 5.
  - **Format monétaire** : Format natif Excel `numFmt = '"$"#,##0.00'` pour les montants EXW, Fret, Landed et totaux.
  - **Format quantités** : Format numérique `numFmt = '#,##0'`.
  - **Totaux et soldes** : Lignes de bas de tableau intégrant le *Budget de Base*, le *Report Annuel Lissé* (pour FY27-30), le *Budget Disponible Total*, le *Total Dépenses* et le *Solde Final (Reste)* avec couleur conditionnelle verte ou rouge.

---

## 7. Structure Recommandée du Code React (Single-File)

Pour déployer l'application dans un Artifact Claude, tout le code doit résider dans un unique fichier `App.jsx` comprenant :

1. **Imports** : React, hooks (`useState`, `useMemo`, `useEffect`, `useRef`), icônes de `lucide-react`.
2. **CDN Loader** : Fonction chargeant dynamiquement `xlsx.full.min.js` et `exceljs.min.js` dans le `document.head` dès le montage du composant.
3. **Gestion d'État Firebase / Local** :
   - `commodities` : Dictionnaire indexé par ID intrant contenant `{ price, air, sea, qty26, split }`.
   - `logistics` : Objet `{ "2026": 'air', "2027": 'air', "2028": 'sea', ... }`.
   - `accruals` : Objet `{ amount, desc, refs, freightPct }`.
   - `manualQtys` : Objet imbriqué `{ "2027": { 11: "0", ... }, ... }` pour les quantités manuelles de MILDA.
4. **Calculs Mémoïsés** (`useMemo`) : Génération du dictionnaire `simulationData` contenant pour chaque année les listes complètes d'intrants avec coûts EXW, Fret, Landed, totaux et soldes.
5. **Handlers Événements** : `handleImport`, `handleDriveImport`, `handleReset`, `handleExport`, `updateField`, `updateManualQty`.
6. **Mise en page Tailwind CSS** : Architecture responsive en grille `grid-cols-1 lg:grid-cols-12` avecaside (4 colonnes) et main (8 colonnes).
# Reprendre le projet sur un autre ordinateur

Ce document décrit tout ce qu'il faut pour modifier et republier l'application
depuis un nouveau poste. Rien n'est stocké en dehors des dépôts GitHub et de Netlify :
il n'y a ni base de données, ni variable d'environnement, ni secret.

## 1. Où vit quoi

| Élément | Emplacement | Rôle |
| --- | --- | --- |
| Code de l'application | GitHub `fpersoons/MOU-Niger-Planning`, branche `main` | Source de vérité. |
| Hébergement | Netlify, projet `mou-niger-planning` → `mou-niger-planning.netlify.app` | Construit et publie chaque push sur `main`. |
| Portail | GitHub `fpersoons/chemlink-portail` → `www.chemlink.app` | Lien dans l'onglet Niger et réécriture `/MOU-Niger-Planning/*` vers Netlify (`netlify.toml` du portail). |
| Charte graphique | GitHub `fpersoons/design-system` (`DESIGN_SYSTEM.md`, preset CHEMONICS) | Référencée par `CLAUDE.md`. |
| Données des utilisateurs | `localStorage` de chaque navigateur | Rien côté serveur. Les fichiers « Télécharger le scénario » (.json) servent de sauvegarde. |

## 2. Prérequis

- **Git** et un accès en écriture aux dépôts GitHub ci-dessus.
- **Node.js 20 ou plus récent**, avec npm (`node -v`). Netlify construit avec Node 20
  (`netlify.toml`).
- Un navigateur récent (Chrome, Edge, Firefox ou Safari).
- Facultatif : **Claude Code**. `CLAUDE.md` lui donne les consignes du projet.
- Facultatif : un compte Netlify ayant accès au projet `mou-niger-planning`, pour
  consulter les journaux de build.

## 3. Installation

Clonez les dépôts côte à côte. `CLAUDE.md` importe `../design-system/DESIGN_SYSTEM.md` :

```sh
mkdir chemonics && cd chemonics
git clone https://github.com/fpersoons/MOU-Niger-Planning.git mou-niger-planning
git clone https://github.com/fpersoons/design-system.git design-system
git clone https://github.com/fpersoons/chemlink-portail.git chemlink-portail   # seulement pour modifier le portail
cd mou-niger-planning
npm install
```

`npm install` installe aussi les outils de test (SheetJS, HyperFormula). Ils ne sont
pas inclus dans l'application publiée.

## 4. Commandes

```sh
npm run dev            # serveur de développement : http://localhost:5173 (rechargement à chaud)
npm test               # 21 tests : moteur de calcul, reprise des anciens formats, export Excel
npm run verify:excel   # recalcule toutes les formules de l'export avec un moteur de tableur
                       # et les compare aux résultats de l'application (« 0 écart » attendu)
npm run build          # build de production dans dist/
npm run preview        # sert dist/ sur http://localhost:4173 (vérifier le build avant publication)
```

## 5. Cycle d'une modification

1. **Mettre à jour** : `git checkout main && git pull`.
2. **Créer une branche** : `git checkout -b ma-modification`.
3. **Modifier** :
   - règles de calcul et valeurs par défaut : `src/model.js` ;
   - export Excel : `src/excel.js` ;
   - écrans : `src/*View.jsx` et `src/App.jsx`.

   Le guide développeur indique où se trouve chaque élément.
4. **Vérifier** :
   - `npm test` ;
   - `npm run verify:excel`, si le calcul ou l'export a changé ;
   - `npm run build` ;
   - un essai dans le navigateur avec `npm run dev`.
5. **Mettre à jour la documentation** :
   - `GUIDE_UTILISATEUR_2026-10-02.md` et `public/guide.html` (l'aide en ligne) ;
   - `GUIDE_DEVELOPPEUR_2026-10-02.md` ;
   - `CLAUDE.md`, si une règle du projet change.
6. **Pousser la branche et ouvrir une pull request** vers `main`. Netlify publie une
   **prévisualisation** : `https://deploy-preview-<n°>--mou-niger-planning.netlify.app`
   (lien dans la PR).
7. **Fusionner la PR**. Netlify reconstruit `main` et l'application est en ligne en
   une à deux minutes, sur Netlify comme sur chemlink.app.

Pour une correction mineure, il est possible de pousser directement sur `main` :
la publication est immédiate, mais sans prévisualisation.

## 6. Publication (Netlify)

Le projet Netlify existe déjà ; il ne faut le recréer que s'il est perdu.
**Add new project → Import an existing project → GitHub →
`fpersoons/MOU-Niger-Planning`**, avec les réglages suivants :

| Réglage | Valeur |
| --- | --- |
| Branch to deploy | `main` |
| Build command | `npm run build` (lu dans `netlify.toml`) |
| Publish directory | `dist` (lu dans `netlify.toml`) |
| Project name | `mou-niger-planning` |

Le nom du projet détermine l'adresse `mou-niger-planning.netlify.app`, qui figure dans
la réécriture du portail. Si ce nom n'est plus disponible, choisissez-en un autre et
mettez à jour le `netlify.toml` de `chemlink-portail`. Aucune variable d'environnement
n'est nécessaire.

## 7. Portail ChemLink

Dans `chemlink-portail` :

- **`netlify.toml`** : la réécriture rend l'application disponible sous
  `www.chemlink.app/MOU-Niger-Planning/` :
  ```toml
  [[redirects]]
    from = "/MOU-Niger-Planning/*"
    to = "https://mou-niger-planning.netlify.app/:splat"
    status = 200
  ```
- **Onglet Niger** : l'entrée « MOU Niger Planning » pointe vers `/MOU-Niger-Planning/`.
- **Documentation** : `docs/deploiement-mou-niger-planning.md`.

Toutes les références internes de l'application doivent rester **relatives** :
`base: './'` dans `vite.config.js`, `./assets/…`, `./guide.html`. Un chemin absolu
(`/assets/…`) fonctionnerait sur Netlify mais casserait l'application sous chemlink.app.

## 8. Données des utilisateurs

- Le scénario est stocké dans le navigateur (`localStorage`, clé
  `ghsc-psm-planificateur-paludisme-v1`) et l'onglet affiché sous
  `ghsc-psm-planificateur-paludisme-onglet`.
- Le stockage dépend de l'adresse : `chemlink.app` et `mou-niger-planning.netlify.app`
  ne partagent pas les données. Communiquez toujours l'adresse chemlink.app.
- Pour changer d'ordinateur ou de navigateur, ou pour garder une hypothèse : utilisez
  **Télécharger le scénario**, puis **Charger un scénario** sur l'autre poste.
- Une nouvelle version de l'application ne touche pas aux scénarios déjà enregistrés.
  Les nouvelles valeurs par défaut s'appliquent après **Réinitialiser**. Les anciens
  formats sont convertis à l'ouverture (`normalizeScenarioData`).

## 9. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| Page blanche ou erreurs 404 sous chemlink.app, mais pas sur Netlify | Chemin absolu introduit | Remettre des chemins relatifs (`./…`) et vérifier `base: './'`. |
| Le build Netlify échoue | Erreur de compilation ou dépendance | Lancer `npm run build` en local et lire le journal du déploiement dans Netlify. |
| `npm run verify:excel` signale des écarts | Une formule Excel ne reproduit plus `simulate()` | Corriger `src/excel.js`, ou `src/model.js` si c'est la règle qui a changé. |
| Un utilisateur ne voit pas les nouvelles valeurs par défaut | Son scénario est déjà enregistré | Lui faire cliquer sur « Réinitialiser » (après avoir téléchargé son scénario s'il veut le garder). |
| `npm install` échoue | Node trop ancien | Installer Node 20 ou plus récent. |

# Installation locale et mise en ligne

## Prérequis

Node.js 20 ou plus récent (`node -v`).

## Développement

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur de calcul et de l'aller-retour Excel
npm run build      # build de production dans dist/
npm run preview    # sert dist/ sur http://localhost:4173
```

## Mise en ligne sur Netlify (une seule fois)

Dans Netlify : **Add new project → Import an existing project → GitHub →
`fpersoons/MOU-Niger-Planning`**.

| Réglage | Valeur |
| --- | --- |
| Branch to deploy | `main` |
| Build command | `npm run build` (lu dans `netlify.toml`) |
| Publish directory | `dist` (lu dans `netlify.toml`) |
| Project name | `mou-niger-planning` |

Le nom du projet détermine `mou-niger-planning.netlify.app`, adresse
inscrite dans la réécriture du portail ChemLink. S'il est déjà pris, en choisir un
autre et mettre à jour `netlify.toml` du dépôt `chemlink-portail`.

Ensuite, chaque push sur `main` déclenche un build et un déploiement automatiques.
Aucune variable d'environnement n'est nécessaire.

## Données

Aucune base de données : les scénarios sont stockés en JSON dans le `localStorage`
du navigateur (clé `ghsc-psm-planificateur-paludisme-v1`). Ils sont donc propres à
un navigateur et à un poste. Pour les transférer ou les sauvegarder : **Export JSON**
dans l'en-tête, puis **Import JSON** sur l'autre poste.

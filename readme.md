# MOU Niger Planning — Planificateur des intrants paludisme FY2026-FY2030

Application web (GHSC-PSM) qui traduit les **budgets disponibles dans le cadre du MOU
Niger** en **quantités d'intrants antipaludiques commandables** pour FY2027-FY2030.
Elle est destinée à des non-spécialistes.

- **Adresse** : <https://www.chemlink.app/MOU-Niger-Planning/>, onglet **Niger** du
  portail ChemLink. Le site Netlify d'origine est `mou-niger-planning.netlify.app`.
- **Trois onglets** :
  1. **Budget** : budgets MOU, réserve d'assistance, accruals et report du solde.
  2. **Paramètres logistiques** : coûts EXW, livré bateau et livré avion, puis
     quantités prévues pour l'USG dans la quantification du PSN 2027-2031.
  3. **Scénarios** : quantités commandables par année, en mode automatique
     (split contribution USG) ou ajusté à la main, par avion ou par bateau.
- **Un seul scénario de travail**, enregistré automatiquement dans le navigateur
  (JSON, sans base de données). Trois boutons le gèrent : « Réinitialiser » (valeurs
  par défaut), « Télécharger le scénario » et « Charger un scénario » (fichier .json).
- **Export Excel** (.xlsx) aux couleurs de l'application, **entièrement en formules**
  liées à une feuille « Paramètres » modifiable.

## Démarrage rapide (développeur)

```sh
git clone https://github.com/fpersoons/MOU-Niger-Planning.git mou-niger-planning
cd mou-niger-planning
npm install
npm run dev            # http://localhost:5173
npm test               # tests du moteur de calcul et de l'export
npm run verify:excel   # recalcule les formules Excel et les compare à l'application
npm run build          # build de production (dist/)
```

Un push sur `main` publie automatiquement l'application (Netlify).

## Documentation

| Fichier | Pour qui | Contenu |
| --- | --- | --- |
| [SETUP-LOCAL.md](SETUP-LOCAL.md) | Mainteneur | Reprendre le projet sur un autre ordinateur : prérequis, installation, cycle de modification, publication, portail, dépannage. |
| [GUIDE_DEVELOPPEUR_2026-10-02.md](GUIDE_DEVELOPPEUR_2026-10-02.md) | Développeur | Architecture, modèle de données, règles de calcul, export Excel, valeurs par défaut, décisions du projet. |
| [GUIDE_UTILISATEUR_2026-10-02.md](GUIDE_UTILISATEUR_2026-10-02.md) | Utilisateur | Mode d'emploi, aussi en ligne : `public/guide.html`, bouton « Guide » de l'application. |
| [CLAUDE.md](CLAUDE.md) | Claude Code | Consignes du projet, chargées automatiquement par Claude Code. |
| [docs/Specifications_Developpement_Application.md](docs/Specifications_Developpement_Application.md) | Historique | Cahier des charges d'origine. L'application s'en écarte sur plusieurs points, listés dans le guide développeur. |

Style : preset **CHEMONICS** du dépôt `fpersoons/design-system` (`DESIGN_SYSTEM.md`).

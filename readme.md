# MOU Niger Planning — Planificateur Budgétaire Intrants Paludisme FY26-FY30

Outil de simulation des acquisitions d'intrants antipaludiques sur cinq années
fiscales (FY2026-FY2030) dans le cadre du MOU Niger (programme **GHSC-PSM**).

- Report lissé du surplus FY26 sur FY27-FY30 (surplus / 4).
- Arbitrage du fret Air / Mer par exercice ; MILDA uniquement par mer, en saisie manuelle.
- Répartition FY27-FY30 selon la **quantification PSN** (split calculé sur base EXW) ou quantités saisies.
- Plusieurs scénarios, enregistrés automatiquement dans le navigateur (JSON, sans base de données).
- Export Excel (.xlsx, ExcelJS) de chaque scénario ; téléchargement / chargement d'un scénario.

## Publication

Source de vérité : le dépôt GitHub `fpersoons/MOU-Niger-Planning`.
Netlify construit (`npm run build`) et publie (`dist/`) chaque push sur `main` vers
`mou-niger-planning.netlify.app`, que le portail ChemLink proxifie sous
`https://www.chemlink.app/MOU-Niger-Planning/`.

L'application étant servie sous un préfixe de chemin, toutes les références internes
sont relatives (`base: './'` dans `vite.config.js`, `./assets/…`, `./guide.html`).

## Documentation

- [SETUP-LOCAL.md](SETUP-LOCAL.md) — installation, développement local, mise en ligne Netlify.
- [GUIDE_UTILISATEUR_2026-10-02.md](GUIDE_UTILISATEUR_2026-10-02.md) — utilisation (aussi en ligne : `guide.html`).
- [GUIDE_DEVELOPPEUR_2026-10-02.md](GUIDE_DEVELOPPEUR_2026-10-02.md) — architecture, modèle de calcul, formats.
- Cahier des charges : [docs/Specifications_Developpement_Application.md](docs/Specifications_Developpement_Application.md).

Style : preset **CHEMONICS** de `fpersoons/design-system` (`DESIGN_SYSTEM.md`).

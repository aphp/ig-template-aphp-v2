# ig-template-aphp-v2

Template pour les guides d'implémentation FHIR publiés par l'AP-HP.

- Package : `aphp.fhir.template`, version **1.3.0** (voir `package/package.json` et `package-list.json`)
- Base : [template FHIR de base](https://github.com/HL7/ig-template-fhir) (`fhir.base.template`, version `current`)

Le template ajoute à la base HL7 la charte graphique AP-HP, une navigation latérale hiérarchisée, une table des matières par page, un comportement responsive et plusieurs outils de rendu (coloration FSH/FML, Mermaid, navigation dans les diagrammes SVG).

## Fonctionnalités

**Navigation**

- Sidebar hiérarchisée, générée en Liquid depuis `site.data.pages` (profondeur déduite des labels du publisher)
- Sous-pages d'onglets (`-definitions`, `-mappings`, `-examples`, représentations XML/JSON/TTL, etc.) masquées dans la sidebar
- Table des matières « Sur cette page » (h2, h3, h4) avec scroll spy, reconstruite à chaque changement d'onglet
- Drawer hamburger en tablette et mobile (conforme WAI-ARIA)

**Mise en forme**

- Charte AP-HP via variables CSS (`:root` de `aphp-ig.css`)
- Police Inter auto-hébergée (200, 400, 700 en WOFF2), sans dépendance externe
- Onglets des pages ressources stylisés (Content, Definitions, Mappings, etc.)
- Publish-box repositionnée en pleine largeur
- Tables de structure lisibles : retour à la ligne des cellules longues, colonnes Name/Flags/Card. sans coupure
- Icône sur les liens externes du contenu (désactivable avec l'attribut `data-no-external`)
- Permaliens d'ancres (`#`) visibles au survol et au focus des titres

**Rendu de contenu**

- Coloration syntaxique Prism, avec les langages FSH et FML
- Diagrammes Mermaid : les blocs ` ```mermaid ` sont rendus automatiquement (`securityLevel: 'sandbox'`)
- Zoom et déplacement dans les diagrammes SVG (D3)
- Onglets pour les exemples de code (`div.code-sample`)

## Installation

Dans le `ig.ini` de votre projet IG, deux façons de référencer le template :

1. **Référence distante** : pointer directement vers ce dépôt :

   ```ini
   [IG]
   ig = fsh-generated/resources/ImplementationGuide-mon-ig.json
   template = https://github.com/aphp/ig-template-aphp-v2
   ```

2. **Copie locale** : le publisher n'accepte un template local que s'il se trouve **sous la racine de l'IG**. Copier les dossiers et fichiers du template (`content/`, `includes/`, `package/`, `package-list.json`, `ig.ini`) dans un dossier de l'IG, puis le référencer avec le préfixe `#` :

   ```ini
   [IG]
   ig = fsh-generated/resources/ImplementationGuide-mon-ig.json
   template = #ig-template-aphp
   ```

## Structure

```
.
├── content/assets/
│   ├── css/
│   │   ├── aphp-ig.css               Styles principaux (charte, sidebar, TOC, responsive)
│   │   ├── code-sample-tabs.css      Onglets des exemples de code
│   │   ├── prism.css                 Thème Prism
│   │   └── prism-lang-{fsh,fml}.min.css
│   ├── fonts/inter-{200,400,700}.woff2
│   ├── ico/favicon.png
│   ├── images/aphp-logo.png
│   └── js/
│       ├── sidebar-nav.js            Navigation, TOC, drawer, scroll spy
│       ├── anchor-hover.js           Permaliens anchor.js au survol
│       ├── code-sample-tabs.js       Onglets des exemples de code
│       ├── mermaid.js, mermaid-init.js
│       ├── d3.min.js, d3-init.js     Zoom / déplacement des SVG
│       └── prism.js, prism-lang-{fsh,fml}.min.js
├── includes/
│   ├── fragment-pagebegin.html       <head>, header, navbar, sidebar (Liquid)
│   ├── fragment-pageend.html         Footer, chargement des scripts
│   ├── _append.fragment-css.html     CSS supplémentaires
│   ├── _append.fragment-header.html  Logo AP-HP
│   ├── _append.fragment-footer.html  Mention de licence CC0
│   ├── fragment-intro.html           Introductions de ressources
│   └── img.html                      Helper image
├── package/package.json              Métadonnées du template (id, version, base)
├── package-list.json                 Historique des versions publiées
├── ig.ini                            Vide (requis par le publisher pour un template)
├── tests/                            Tests Playwright (hors template, voir « Tests »)
│   ├── e2e/                          template.spec.ts (IG DM), tls.spec.ts (IG TLS)
│   ├── scripts/build-ig.sh           Build d'un IG avec le template local
│   ├── scripts/sync-assets.sh        Recopie rapide des CSS/JS dans un output existant
│   └── playwright.config.ts
└── docs/agents/                      Conventions pour les agents (tracker, labels, docs de domaine)
```

Seuls `content/`, `includes/`, `package/`, `package-list.json` et `ig.ini` font partie du template ; `tests/` et `docs/` servent au développement.

## Personnalisation

Les couleurs de la charte sont définies dans les variables CSS de `aphp-ig.css` (section `:root`) et peuvent être adaptées pour un autre établissement.

La sidebar est construite en Liquid à partir de `site.data.pages` ; la hiérarchie est déduite des labels attribués par le publisher. La détection de la page active et l'ouverture du groupe correspondant sont faites côté client, ce qui réduit le temps de build sur les IG volumineux.

## Synchronisation avec le template upstream

Si le template AP-HP d'origine ([aphp/ig-template-aphp](https://github.com/aphp/ig-template-aphp)) est mis à jour :

```bash
git remote add upstream https://github.com/aphp/ig-template-aphp.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories
```

Résoudre les conflits en conservant nos fichiers modifiés (`fragment-pagebegin.html`, `fragment-pageend.html`, `aphp-ig.css`, `sidebar-nav.js`).

## Tests

Les tests de bout en bout (Playwright, Firefox et Chromium) s'exécutent sur des IG réels construits avec la version locale du template : IG-fhir-dm et fig-tls.

Prérequis côté IG : `input-cache/publisher.jar` présent et SUSHI déjà exécuté (le script lance le publisher avec `-no-sushi`).

```bash
# 1. Construire les IG de référence avec le template local
tests/scripts/build-ig.sh ../../aphp/IG-fhir-dm
tests/scripts/build-ig.sh ../../msd/fig-tls

# 2. Lancer les tests
cd tests && npm install && npx playwright install chromium firefox
npm test
```

`build-ig.sh` copie le template dans `<ig>/.local-template` et génère un `<ig>/ig-local.ini` pour ne pas toucher au `ig.ini` de l'IG ; ces deux chemins sont à ignorer côté IG. Le script échoue si la sortie du publisher signale un échec (le publisher renvoie 0 même en cas d'erreur).

Pour itérer sur `aphp-ig.css` ou `sidebar-nav.js` sans relancer le publisher (~7 min), recopier les assets dans un output existant :

```bash
tests/scripts/sync-assets.sh ../../aphp/IG-fhir-dm           # depuis le working tree
tests/scripts/sync-assets.sh ../../aphp/IG-fhir-dm 15a5b2c   # depuis un commit de référence
```

Toute modification Liquid (`includes/`) exige un rebuild.

Les outputs sont servis sur les ports 8081 (DM) et 8082 (TLS). Leurs chemins par défaut supposent l'arborescence du workspace `fig` et se surchargent avec `IG_DM_OUTPUT` et `IG_TLS_OUTPUT`.

## Contribuer

Les issues sont suivies dans [GitHub Issues](https://github.com/aphp/ig-template-aphp-v2/issues). Les labels de triage sont décrits dans `docs/agents/triage-labels.md`.

## Licence

CC0-1.0

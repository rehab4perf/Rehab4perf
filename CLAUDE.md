# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

Deployment is fully automatic: `git push origin main` triggers a Netlify build. There is no build step — this is a static site served as-is. Never use `netlify deploy` manually unless Netlify CI is broken.

## JS syntax check

After editing any JS file, run:
```bash
node --check js/bilan.js
node --check js/prog-data.js
node --check js/prog-main.js
```

## Étapes du builder — l'ordre vit dans `blocs`

```bash
node qualite/etapes-cas.js
```

Deux séparateurs cohabitent dans `blocs` : `{id, type:'etape'}` ouvre une étape
nommée, `{type:'libre'}` ouvre une zone qui n'appartient à aucune.
L'appartenance d'un bloc est **positionnelle** — c'est le dernier séparateur
rencontré avant lui. Conséquence à ne jamais perdre de vue : tout bloc poussé
derrière un séparateur d'étape est **absorbé** par elle. C'est pourquoi une
flèche de bloc ne franchit pas une frontière (on change d'étape par le
sélecteur), et pourquoi sortir un bloc de son étape ouvre une zone libre juste
après elle au lieu de l'expédier en tête de séance.

`_compacterMarqueurs()` supprime les marqueurs libres devenus inutiles ; sans
lui ils s'accumulent à chaque sortie. `bloc.etapeId` est recalculé par
`_syncEtapeIds()` : ce n'est pas la source de vérité, il n'est écrit que parce
que `athlete.html` groupe avec — et `athlete.html` doit filtrer **les deux**
types de séparateurs.

## Échelle typographique (OBLIGATOIRE après toute taille de police ajoutée)

```bash
node qualite/check-echelle.js            # contrôle (exit 1 si nouveauté)
node qualite/check-echelle.js --write    # entériner après conversion
```

Neuf pas en jetons `--fs-*` dans `athlete.html` et `programme.html`. Ces deux
fichiers comptaient 37 et 50 tailles distinctes, avec des voisines
indiscernables (`.64` / `.65` / `.66` / `.67` / `.68`). Le contrôle n'échoue
que sur une taille **nouvelle** : le compteur ne doit que baisser.

`outils.html` est exclu — sa racine est à `14px`, les mêmes `rem` n'y donnent
pas les mêmes pixels. Ne jamais y recopier les valeurs de l'échelle.

## Typographie et socle commun

Une seule famille pour tout le produit : `var(--font-sans)`, Figtree, servie
depuis `fonts/fonts.css`. `athlete.html` la chargeait sans l'utiliser — le
patient voyait une autre typographie que le praticien.

Chaque page porte en fin de première feuille un bloc « Socle commun » :
chiffres à chasse fixe, anneau `:focus-visible` (en `!important`, seul moyen
de passer devant les dizaines d'`outline:none` plus spécifiques), et respect
de `prefers-reduced-motion`.

L'anneau utilise `--focus`, **jamais `--accent2`** : ce nom vaut un bleu clair
dans le builder et l'espace athlète, mais le navy foncé dans le bilan et les
outils — l'anneau y devenait un gros cadre noir. Même piège que `--card` : un
nom qui existe partout sans valoir la même chose.

Sur un bouton, `:focus-visible` ne se déclenche qu'au clavier ; sur un **champ
de texte il se déclenche aussi au clic**, la spécification considérant qu'on va
y taper. Les champs sont donc **exclus de l'anneau** : ils ont déjà leur propre
marque de focus (fond teinté, bordure d'accent), et l'anneau faisait doublon à
chaque clic. Il reste sur tout le reste — boutons, liens, onglets, contrôles
sur mesure — où rien d'autre ne signale où l'on se trouve au clavier.

Conséquence à connaître : un champ dont le seul style de focus serait
`outline:none`, sans remplacement, n'a plus aucune indication. Si un tel champ
apparaît, lui donner sa propre bordure ou son propre fond au focus — ne pas
rétablir l'anneau global.

## Couleurs (OBLIGATOIRE après toute couleur ajoutée)

```bash
node qualite/check-couleurs.js            # contrôle (exit 1 si nouveauté)
node qualite/check-couleurs.js --write    # entériner après absorption
```

**Plus aucune couleur anonyme** dans `athlete.html`, `programme.html`,
`bilan.html` et `outils.html` : le compteur est à zéro partout. Il était à 347.
C'était la raison de fond pour laquelle `--card` est passé inaperçu — quand
presque toute la couleur est écrite à côté des jetons, plus personne ne regarde
les jetons. Toute couleur nouvelle fait désormais échouer le contrôle : il faut
la nommer dans le `:root` du fichier concerné.

Une couleur peut être **exclue des fusions sans être anonyme**. Les couleurs
cliniques ont chacune leur jeton — `--obj-*`, `--douleur-0..6`, `--cote-d/g/bi`,
`--zone-*`, `--acwr-*`, `--strava`. Elles ne se fondent pas, mais elles portent
un nom : une couleur sans nom finit toujours par être recopiée de travers.

Le blanc et le noir ne sont pas comptés : `#fff` est tantôt une surface,
tantôt du texte sur fond navy.

**Rampe d'états** (`programme.html`) : `--ok`, `--warn`, `--alerte`, chacune
en cinq paliers — `-d` texte foncé, teinte pleine, `-b` bordure claire, `-l`
fond, `-xl` lavis. Ces trois familles existaient en 79 teintes dans ce seul
fichier : trois générations de palettes superposées disant la même chose.

L'ambre d'avertissement est **volontairement distinct** de l'ambre des étapes,
sur décision du praticien : un ACWR élevé ne doit pas se confondre avec une
étape ambre.

**Jamais fondus** — les couleurs qui portent une information clinique :
objectifs de bloc (endurance, puissance, hypertrophie, force max), zones
d'allure, couleurs de cycle, jauge ACWR, et l'orange de marque Strava
(`#FC4C02`). Les sélecteurs correspondants sont exclus des conversions
automatiques.

**Piège à ne jamais réintroduire** : toute conversion automatique doit masquer
les `<script>` d'abord. Ils contiennent des chaînes où figurent littéralement
`<style>` et `</style>` — une regex naïve entre donc dans des documents
autonomes (exports, impressions) où les jetons n'existent pas, et la
déclaration y devient invalide, ignorée en silence.

## Variables CSS (OBLIGATOIRE après toute règle CSS ajoutée)

```bash
node qualite/check-css-vars.js
```

Une variable CSS non définie ne provoque **aucune erreur** : la déclaration
entière devient invalide et le navigateur l'ignore en silence. `background:
var(--card)` dans un fichier dont la palette est `--surface` ne donne pas un
mauvais fond, il ne donne **aucun** fond — le défaut n'est visible que là où
l'élément passe sur une zone colorée. Chaque page a sa propre palette dans son
`:root` : ne jamais recopier un nom de variable d'un fichier à l'autre sans
vérifier qu'il y existe.

## Catalogue TESTS{} — append-only (OBLIGATOIRE si TESTS modifié)

L'identité d'un test = son index dans `TESTS[tbody].items` (les ids `sel-`/`note-` des bilans sauvegardés en dérivent). Ne JAMAIS insérer au milieu, réordonner ou supprimer — toujours ajouter en fin de liste. Vérification :
```bash
node qualite/check-catalogue.js            # contrôle (exit 1 si violation)
node qualite/check-catalogue.js --write    # après ajout légitime en fin de liste
```
L'ordre d'AFFICHAGE est découplé de l'identité (`_blTestDisplayOrder` dans bilan.js) — pour placer visuellement un test ailleurs, passer par la disposition, pas par le catalogue.

For changes to `bilan.html` (inline script), extract the script block first:
```bash
# Lines vary — identify the <script src="js/bilan.js"> predecessor block
sed -n '<start>,<end>p' bilan.html > /tmp/check.js && node --check /tmp/check.js
```

## Validate bilan.html after changes

Run this Python snippet to catch duplicate IDs and `TESTS{}` entries missing a `<tbody>`:

```python
import re
from collections import Counter
with open('bilan.html', encoding='utf-8') as f:
    content = f.read()
all_ids = re.findall(r'(?<![-\w])id=["\']([^"\']+)["\']', content)  # exclut data-block-id (partagé par les paires single/bilateral)
dups = {k:v for k,v in Counter(all_ids).items() if v > 1}
print('Dups:', dups or 'Aucun ✓')
tests = re.findall(r"'(tb-[\w-]+)'\s*:\s*\{type:", content)
tbodies = set(re.findall(r'<tbody\s+id=["\']([^"\']+)["\']', content))
missing = [t for t in tests if t not in tbodies]
print('TESTS sans tbody:', missing or 'Aucun ✓')
```

## Empreinte de séance du builder

```bash
node qualite/hash-cas.js
```

`_sessionHash()` pilote trois signaux : le badge « non sauvegardé »,
l'avertissement de fermeture d'onglet et celui de fermeture du builder. Tout
ce qu'elle ne couvre pas peut donc être modifié puis perdu **sans aucun
signal**.

Elle était écrite comme une liste de champs tenue à la main, et cette liste
avait dérivé : ni `perCote`, ni le contenu des blocs cardio, texte, AMRAP et
EMOM n'y figuraient. Elle sérialise désormais le contenu entier, en écartant
les clés préfixées `_` — état d'interface, pas contenu. **Ne jamais revenir à
une liste explicite** : un champ ajouté au modèle doit être couvert d'office.

Corollaire : un champ purement transitoire posé sur un bloc ou un exercice
doit être préfixé `_`, sinon il allumera le badge tout seul.

## Pliométrie qualitative — critère partagé

Le groupe `plioq` illustre un cas à connaître avant d'ajouter un critère
qualitatif : **tous ne s'observent pas côté par côté**. La symétrie de hauteur
compare les deux côtés — il n'existe pas « un déficit de hauteur du côté
sain ». Elle est donc rendue sur **une seule case** et exclue du score de
chaque côté, via deux champs de la définition du groupe :

- `partage:[1]` — l'index est rendu sur une seule ligne, stocké sur `prefixB` ;
- `scoreIdx:[0,2]` — seuls ces index comptent dans le score par côté.

Les libellés sont formulés **positivement** (« Contact au sol bref et
élastique »), jamais en « Absence de… ». Deux raisons : la double négation
oblige à cocher ce qu'on ne voit pas, et surtout inverser le sens d'une case
réinterpréterait à l'envers tous les bilans déjà enregistrés — une case cochée
a toujours voulu dire « bon ».

**Assumé** : ajouter un critère change le dénominateur. Un bilan ancien noté
2/2 se relit 1/2, la fatigabilité n'y ayant jamais été évaluée. Décision du
praticien : les anciens bilans sont incomplets sur ce test, on ne rétro-note
pas.

## Asymétrie affichée (bilan)

```bash
node qualite/lsi-cas.js
```

Le LSI est **toujours calculé** comme avant — `min/max` en bilatéral,
`atteint/sain` en unilatéral. Seul l'affichage bascule : `asymTxt(lsi)` montre
`100 − LSI`. 80 % de symétrie s'affiche « 20 % ».

**Les seuils de couleur n'ont pas changé** : `lsiClass()` lit toujours le LSI.
C'est ce qui rend la bascule sûre — une seule chose change, le nombre affiché.
Ne jamais y passer une valeur d'asymétrie.

En unilatéral le LSI peut dépasser 100 % : l'asymétrie devient alors négative
et le signe porte l'information (côté atteint supérieur au sain). Une valeur
qui arrondit à zéro ne s'affiche jamais « -0 ».

## Motifs de bilan — onglet Patients

```bash
node qualite/motifs-cas.js
```

`R4P_MOTIF_KEYWORDS` dans `js/patients-data.js` classe le champ « motif » en
groupes. Ce que l'onglet appelle **non reconnu** n'est pas une faute de saisie :
c'est un motif que la table ne sait pas ranger. Le taux se réduit en couvrant
ce que le praticien écrit vraiment, **fautes de frappe comprises** — `isquios`
se rencontre autant que `ischios`.

Deux mécanismes, à connaître avant d'ajouter un groupe :

- Un alias peut être une **liste** : tous ses termes doivent être présents.
  C'est ce qui permet d'exiger la nature *et* le site (`['tendinopathie',
  'ischio']`). Sans ça, « lésion musculaire des ischio-jambiers » serait rangée
  en tendinopathie — le site seul ne dit rien de la lésion.
- Un groupe **générique** s'efface devant un groupe précis de sa famille
  (`{generique:'tendinopathie'}` contre `{famille:'tendinopathie'}`). Sinon le
  patient compte deux fois et les deux barres sont fausses.

Un alias de moins de 5 caractères est cherché entre frontières de mot ; à
partir de 5, en sous-chaîne. D'où les commentaires du fichier expliquant
pourquoi `rotulien`, `carpien`, `instabilite` et `tendon` seuls ont été retirés.

Un alias **préfixé de `=`** exige le mot entier quelle que soit sa longueur.
Nécessaire dès qu'un terme se cache dans un mot courant : `butee` se trouve
dans « dé**butée** », et « rééducation débutée » basculait en chirurgie
d'épaule.

**Piège récurrent** : un alias multi-mots est une expression **contiguë**. Un
seul mot intercalé le casse — « rupture PARTIELLE du tendon d'Achille »,
« instabilité ANTÉRIEURE d'épaule ». Écrire ces alias en listes
(`['rupture', 'achille']`) plutôt qu'en phrases.

## Générateur CAP (retour à la course)

Les règles cliniques sont dans `SPEC-CAP.md` — **à lire avant toute
modification** du moteur CAP dans `js/prog-main.js`. Elles font foi : quand le
code diverge, c'est le code qui a tort.

Les cas de référence partent du formulaire réel (défauts lus dans
`programme.html`), pas d'un profil écrit à la main :

```bash
node qualite/cap-cas.js
```

Le fichier couvre la **génération** (six situations de saisie) et la
**régression sur douleur** (proposition, application, semaines déjà vécues).

Ordre obligatoire : écrire ou corriger le cas attendu **d'abord**, modifier le
moteur ensuite, puis vérifier que le test repasse au vert.

## Pre-deploy checklist

See `TESTS_AVANT_DEPLOY.md` — mandatory before any push. If a test fails, do not push. On regression: `git revert HEAD`, fix, re-test, push fix.

---

## Architecture

**Static site** — no build toolchain, no bundler, no framework. Vanilla JS + Supabase SDK loaded from CDN.

### Shell + iframes

`index.html` is the application shell. It renders a top nav with tab buttons and four persistent `<iframe>` elements. Only the active iframe is `display:block`; the others stay loaded.

| iframe id | src | purpose |
|---|---|---|
| `frame-bilan` | `bilan.html` | Clinical assessment (bilan clinique) |
| `frame-outils` | `outils.html` | PRO tools + CR médecin config |
| `frame-prescription` | `programme.html` | Exercise programme builder |
| `frame-account` | `account.html` | User profile |

`auth.html` is a standalone page (not an iframe) for login/signup/reset.

### Authentication

Supabase Auth (email/password). `index.html` holds the session, guards the app, and **broadcasts the auth token to all iframes** via `postMessage` on session init and `TOKEN_REFRESHED` events. Iframes recreate their own Supabase client with the received token.

### Cross-iframe messaging

All messages use `postMessage` with `window.location.origin` as target. `index.html` acts as a relay hub. Message types are prefixed `r4p-`:

| type | direction | meaning |
|---|---|---|
| `r4p-patient-selected` | parent → iframes | Patient switched in topnav |
| `r4p-cancel-patient-switch` | bilan → parent | Bilan has unsaved data, roll back |
| `r4p-profile` | parent → bilan/outils | Practitioner profile propagated |
| `r4p-profile-updated` | account → parent | Profile saved, re-broadcast |
| `r4p-outils-save` | outils → parent → bilan | Score saved, update bilan live |
| `r4p-patient-reset` | bilan → parent | Deselect patient in topnav |
| `r4p-logout-done` | account → parent | Trigger full logout |
| `r4p-token-refreshed` | parent → iframes | Fresh access token |

### localStorage

Both `bilan.js` and `prog-data.js` each define a local `R4P_KEYS` constant — the single source of truth for all storage key strings within their respective module. Never hardcode key strings directly.

---

## bilan.html / bilan.js

The largest module. `bilan.html` contains only HTML+CSS (3 500 lines); all JS is in `js/bilan.js` (5 400 lines), loaded at the bottom.

**Page structure** — each clinical section is a `<div class="page" id="page-xxx">`. Active page toggled via nav clicks. Current pages:
- `page-infos` — patient info
- `page-epaule`, `page-rachis`, `page-hanche`, `page-genou`, `page-pied`, `page-lma` — body region assessments
- `page-fonctionnels`, `page-fonctionnelsMS`, `page-fonctionnelsRachis` — functional tests
- `page-cr-tf` — CR Tests (generated report)
- `page-cr` — CR Complet (generated report)

**Test tables** — each `<tbody id="tb-xx">` inside a page has a corresponding entry in `TESTS{}` in bilan.js. When adding a new `<tbody>`:
1. Add `<tbody id="tb-xx">` in the right `<div class="page-content">`
2. Add `'tb-xx': { type: 'ortho'|'fonc', items: [...] }` to `TESTS` in bilan.js
3. Reference it in both `buildCR()` (line ~4145) and `buildCRTF()` (line ~4745)

**Absolute rules for bilan.html:**
- New content always goes inside `<div class="page-content">` of an existing page — never outside `<main>`
- Never touch anything after `</main>` (modal + toast zone only)
- Never alter the open/close structure of `.page` divs

**Network**: `_sbRetry()` wraps all Supabase SDK calls with exponential backoff (max 2 retries) on 5xx/429.

---

## programme.html / prog-data.js / prog-main.js

Exercise programme builder. HTML+CSS in `programme.html` (2 846 lines). JS split into:
- `js/prog-data.js` (3 953 lines) — `R4P_KEYS`, `LIBRARY` (exercise catalogue), `_fetchRetry()`, data helpers, calendar/cycles
- `js/prog-main.js` (6 937 lines) — UI logic: builder, sidebar, templates, protocols, sessions

**Network**: `_fetchRetry()` wraps raw `fetch()` calls with backoff. POST on 5xx is NOT retried (non-idempotent).

---

## outils.html

All-in-one file (7 125 lines, no external JS). Contains PRO questionnaires, functional scoring tools, and the **CR médecin configurator** — a UI to edit `config/cr-config.json`-equivalent data that is stored in Supabase `templates` table. Changes made in outils.html's CR config editor are synced to Supabase and relayed to `bilan.html` on save.

---

## config/cr-config.json

Defines pathologies (`pathoConfig`), articulations with their ROM measurements (`ampConfig`), and clinical signs (`signConfig`) used to populate the CR médecin dropdowns in `bilan.html`. The bilan reads this config to render its forms; outils.html provides the editor UI.

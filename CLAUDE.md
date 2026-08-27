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

## Cache — tout ce qui est servi doit porter un numéro

Les scripts JS sont versionnés (`js/bilan.js?v=20260806j`), **et les pages
d'iframe le sont aussi** depuis qu'elles ont manqué de l'être :
`index.html` charge `outils.html?v=…`, `bilan.html?v=…`, etc.

Sans ce numéro, le navigateur garde sa copie et **une correction déployée
reste invisible** — y compris pendant les tests. Le piège a coûté deux fausses
pistes : des fonctions qu'on venait d'écrire n'existaient pas dans la page
chargée, et l'on a cherché le défaut dans du code correct.

Après modification d'un de ces fichiers, incrémenter le numéro dans
`index.html` **et** bumper `CACHE` dans `sw-pro.js`.

Le service worker sert les iframes en **réseau d'abord** (`req.mode ===
'navigate'`) : ce n'est donc pas lui qui périme, mais son repli hors ligne
cherche l'URL exacte. D'où le `caches.match(req, { ignoreSearch: true })` —
sans lui, une page versionnée ne correspond à rien de préchargé et l'on
retombe sur la coquille.

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

## Templates — on ajoute, on ne remplace jamais

```bash
node qualite/templates-cas.js
```

Un template s'**ajoute** à la séance en cours, quel que soit son contenu —
séance, étape ou phase de protocole. « Vider » est un geste séparé : c'est lui
qu'on emploie pour repartir du template seul. Un seul verbe, donc aucune
destruction silencieuse, et aucune confirmation à poser.

Les imports d'un contenu **entier** passent par `_injecterTemplate()` :
« Ajouter tous les blocs », les phases d'un protocole, la bibliothèque publiée
et le chargement d'un template. Ne jamais réécrire un import à la main.

**Un bloc pioché seul est l'exception, et il le doit** — il passe par
`_ajouterBlocPioche()`. Une étape est un découpage de la SÉANCE, pas une
propriété du bloc : on prend le contenu, jamais le contenant. La copie perd
son `etapeId`, que `_syncEtapeIds()` recalcule depuis la position — le bloc
rejoint donc l'étape ouverte en fin de séance, exactement comme un bloc créé
par « + Ajouter ».

Repasser un bloc seul par `_injecterTemplate()` est le piège : sans séparateur
dans un tableau d'un seul élément, ce moteur se rabat sur `etapeId` et
**recrée l'étape source**. Chaque clic étant un appel séparé avec un `genId()`
neuf, deux blocs de la même étape donnaient deux étapes du même nom.

**Le picker filtre les séparateurs à l'affichage** — sinon ils apparaissent
comme des blocs avec un « + » qui ajoute une étape vide. Il conserve l'**indice
d'origine** dans `donnees.blocs` : réindexer sur la liste filtrée est
exactement l'erreur qui avait mal attribué les retours patients.

**Le piège qu'elle referme** : l'ancienne `_importEtapes()` écrivait `etapeId`
sur les blocs importés sans poser de séparateur. Comme l'appartenance est
positionnelle, `_syncEtapeIds()` réécrivait ce champ depuis la position — le
contenu importé se faisait absorber par la dernière étape en place, et l'étape
importée restait orpheline. `_injecterTemplate` pose de vrais séparateurs, et
un marqueur `libre` quand le template n'a pas d'étape mais qu'une étape est
ouverte en fin de séance.

Deux formats de template coexistent et sont tous deux lus : avec séparateurs
(enregistrés après la refonte) et avec `etapeId` seul (avant).

**Le lien `_builderFromTemplate`** — celui qui transforme le bouton en « Mettre
à jour le template » — ne s'établit que si la séance était **vide** avant
l'injection. Ajouté par-dessus autre chose, on compose une nouvelle séance : la
mettre à jour écraserait le template avec un contenu qui n'est plus le sien.

`loadSeance` fait exception et remplace : charger une séance enregistrée est un
autre geste, et il confirme.

**Ouvrir un modèle depuis l'agenda vaut « + Séance »** : `_sidebarLoadProg`
remet le builder à zéro avant d'injecter. Sans ça, le modèle s'ajoutait au
contenu resté en mémoire — y compris une séance **planifiée** ouverte depuis
une chip. `_currentSeanceId` n'étant effacé par aucune fermeture du builder, le
bouton restait en « Enregistrer la séance » et l'enregistrement faisait un
PATCH : on modifiait la séance déjà chez le patient, sans le moindre signal.
`openBuilderNew()` avait le même oubli.

## Mode template — un plan de travail emprunté

```bash
node qualite/templates-cas.js
```

Composer un template se fait dans le builder — c'est le seul outil de
composition. Mais le builder tient peut-être déjà une séance : **ouvrir un
builder neuf ne doit jamais vouloir dire effacer ce qui s'y trouve.**
`_stashSeance()` met la séance de côté, `_restoreSeance()` la rend à
l'identique. Un second emprunt est **refusé** — il écraserait la première
séance mise de côté, qui serait perdue sans le moindre signal.

C'était le défaut d'`addPhaseToGroup`, qui posait `blocs = []` sans rien
demander. Elle passe désormais par `nouveauTemplate({groupId})` : une phase
n'est rien d'autre qu'un template rangé dans un protocole.

**L'objet se déclare à l'entrée, pas à la sortie.** `openSaveDest` posait la
question — « programme patient ou template ? » — après le travail, et tout ce
qui précédait était en forme de séance. En mode template, `_updateBuilderTitle`
et `_refreshSaveBtn` sortent tôt avec leur propre décor : ces deux fonctions
sont appelées depuis trop d'endroits pour qu'on puisse corriger l'affichage
après coup.

Les repères de séance — `_currentProgId`, `_currentSeanceId`, `_builderDate` —
sont **effacés**, pas seulement masqués : `_refreshSaveBtn` lit `_builderDate`
pour écrire « Enregistrer — 6 août ». Les laisser en place afficherait une date
sur un objet qui n'en a pas.

Le brouillon suit le mode (`_draftKey()`) : sans ça, composer un template
écraserait celui d'une séance laissée en plan.

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

**Le fichier de cas contient aussi un garde-fou textuel** : il échoue si une
ligne de `js/bilan.js` fabrique un pourcentage depuis une variable nommée
`lsi…` sans passer par `asymTxt`. Les cas vérifiaient la conversion, pas
**qui l'appelle** — et c'était le trou : `calcEpForce`, `calcPiCIM` et
`calcLunge` écrivaient `lsi.toFixed(0) + '%'` en direct, si bien que
26 cellules affichaient encore la symétrie sous une colonne intitulée
« Asym. % ».

## Lignes de résultat du CR — `_crMesTab`

Un test à deux côtés ne s'écrit plus en phrase (`CS=100 kg CA=80 kg
Asym.=20%`) mais en **mini-tableau** : une colonne par côté, une par mesure,
`Asym.` en dernier. Toutes les lignes passent par `_crMesTab(rows, labelA,
labelB, opts)` — ne jamais reconstruire une chaîne à la main, c'est la seule
façon de garder l'alignement.

```bash
node qualite/cr-lignes-cas.js
```

Quatre règles portées par la fonction elle-même :

- **L'ordre des colonnes se normalise DANS `_crMesTab`, pas dans les appels.**
  « Droit » ne passe jamais avant « Gauche », ni « Atteint » avant « Sain ».
  Les appels ne s'accordaient pas : la plupart passent (sain, atteint), la
  Contraction Flash passe l'inverse, et le libellé de chacun dépend du côté
  atteint du patient — un même CR affichait « DROIT | GAUCHE » sur une ligne
  et « GAUCHE | DROIT » sur la suivante. Le piège mortel : échanger les
  en-têtes **sans** échanger les valeurs inverserait les deux côtés du
  patient en silence. Les deux bougent ensemble, l'asymétrie ne bouge pas.
  Un couple mixte (« Droit | Atteint ») ne déclenche rien.

- La colonne **« Mesure » n'apparaît qu'à partir de deux lignes**. Sur un test
  à une seule mesure, la clé de la ligne de CR la nomme déjà et l'unité est
  sur la valeur : « Force / 100 N » sous « Rotateurs lat. RE1 » n'ajoute rien.
  Trente-sept lignes sur trente-huit sont dans ce cas.
- Cette colonne se désigne par **`.lbl`, jamais `:first-child`** : quand elle
  disparaît, la première colonne de chiffres hériterait sinon de son
  alignement à gauche.
- Les colonnes de valeurs ont une **largeur fixe** (86 px, 76 px sous 640 px).
  Sans elle chaque tableau se dimensionne sur son propre contenu et deux
  lignes consécutives n'alignent plus leurs colonnes — « 100 N » et
  « 100 rép » décalaient tout le bloc des break tests.

`asymTxt` n'affiche **aucune décimale** par défaut. Elle en mettait une, et
la moitié des appels passaient explicitement `0` : le même CR affichait
« 20% » sur les tests de force et « 20.0% » sur les tests fonctionnels. Le
défaut porte la règle, sinon chaque appel écrit demain la retranche à nouveau.

**Le CSS existe en deux exemplaires** : dans `bilan.html` (~1200) pour le CR à
l'écran, et dans la chaîne `var css = \`…\`` de `js/bilan.js` (~8150) pour
l'export autonome. Une règle ajoutée d'un seul côté ne se voit pas — l'export
est le document que reçoit le médecin.

Deux pièges à connaître avant de toucher à ces fonctions :

- **Tous les pourcentages ne sont pas des LSI.** `fmtRatio()` dans
  `calcPiCIM` rend l'**effondrement 2 → 1 appui**, un rapport interne à un
  seul côté — d'où sa colonne « Asym. » vide. Ne jamais l'inclure dans une
  conversion d'asymétrie : il ne compare pas les deux côtés.
- **Le seuil s'énonce dans l'unité affichée.** Un statut « ≥ 90 % » sous une
  colonne d'asymétrie est faux : il devient « ≤ 10 % ».

## Webhook Strava — un « ok » rendu à tort perd l'activité

```bash
npx esbuild supabase/functions/strava-webhook/index.ts --bundle=false --outfile=/dev/null
```

**Strava ne rejoue jamais un événement acquitté.** Toute sortie en `200` qui
n'a pas fait le travail perd l'activité définitivement — sans trace nulle part.
Le webhook en comptait trois : l'écriture n'était pas vérifiée, une lecture
d'activité en échec rendait `ok` quel qu'en soit le motif, et l'événement
`delete` n'était pas traité.

La règle : **`200` seulement pour ce qui est fait ou définitivement sans objet**
(athlète non relié, activité `404`). Tout ce qui peut réussir plus tard —
limite de débit, panne Strava, écriture refusée — rend un `500`, et Strava
repasse.

`delete` compte autant que `create`. Supprimer un doublon depuis Strava est
exactement le geste qu'on demande à l'athlète : sans ce traitement, l'activité
disparaissait chez lui et **restait chez le praticien**, où elle continuait de
fausser l'ACWR.

`refreshIfNeeded` est **recopiée dans trois fonctions** — `strava-webhook`,
`strava-sync-history`, `strava-enrich-activity`. Elle ne regardait pas
`res.ok` : sur un refresh_token révoqué, Strava répond `400` sans `expires_at`,
et `new Date(undefined * 1000).toISOString()` levait une `RangeError` non
capturée. On ne voyait qu'un 500 nu, jamais le motif. Elle échoue désormais
explicitement, et **sans écrire** — un corps partiel aurait remplacé un
refresh_token encore valide par `undefined`, ce qui délie l'athlète pour de bon.
Toute correction ici est à porter **dans les trois**.

`.single()` lève quand aucune ligne ne correspond. Sur une table où l'absence
est un cas normal — un athlète non relié — c'est `.maybeSingle()` qu'il faut.

**`git push` ne déploie PAS les fonctions** : Netlify ne sert que le statique.
Elles passent par `supabase functions deploy <nom>`, séparément.

## La date du bilan — elle se lit, elle ne se saisit pas

La sauvegarde écrit **toujours** `today` dans la colonne `date`, et une
correction passe par « Bilans précédents ». Le champ « Date du bilan »
(`f-date`) ne pilotait donc **rien** — mais tout l'affichage le lisait :
en-têtes de page, en-tête de CR, export autonome.

Deux mensonges en résultaient. Il valait « aujourd'hui » pendant qu'on éditait
un bilan de juin (il est posé à la date du jour à l'init, au reset et à la
création d'un suivi). Et il restait **figé** quand la date était corrigée depuis
l'historique : le CR annonçait alors une date que la base ne portait plus.

Le champ est retiré du formulaire. `_bilanDateEffective()` rend
`_currentBilanDate`, ou le jour même si aucun bilan n'est chargé — c'est la
source unique. `_majDateSidebar()` est appelée après **chaque** affectation de
`_currentBilanDate` (huit sites) et depuis `updateAll`.

`f-date` **subsiste comme clé des donnees**, mais dérivée : `_serializeBilan`
l'écrit depuis la date effective. `outils.html` la lit dans le brouillon
(`athletik-bilan`) pour préremplir le début de prise en charge du CR médecin, et
tous les bilans déjà enregistrés la portent. La supprimer aurait cassé les deux.

La pastille `.sb-bilan-date` la montre en permanence sous le nom du patient, et
passe en ambre (`.passe`) dès que le bilan consulté n'est pas celui du jour. La
date a été **retirée de `sb-meta`** au passage : deux fois la même, dont une
sans étiquette, ne disait rien de plus.

## Un bilan antérieur ne montre jamais l'avenir

```bash
node qualite/bilan-anterieur-cas.js
```

Le bilan **le plus récent est une synthèse** : il reprend tout l'historique,
avec les mentions de réévaluation et les dates. Un bilan **antérieur ne le peut
pas** — il porte ce qui a été mesuré ce jour-là, plus ce qui le précède, et rien
de ce qui a été mesuré après.

`loadBilan` chargeait la bonne vue, bornée au bilan consulté. Puis
`_enterReadOnlyMode`, appelée deux lignes plus bas, **l'écrasait** avec
`_buildMergedDonnees(_allBilans)` — l'historique ENTIER, bilans postérieurs
compris. Un bilan de juin affichait donc les valeurs d'août.

`_bilanNeedsRefresh` n'étant vrai qu'**après une sauvegarde**, le défaut
n'apparaissait qu'une fois sur deux : c'est ce qui le rendait insaisissable.
Et enregistrer depuis cette vue écrivait les valeurs récentes **dans** le bilan
ancien.

**Borner la source ne suffisait pas.** `_deserializeBilan` n'ÉCRIT que les clés
qu'on lui passe — elle n'efface **jamais**. Tout champ absent du bilan consulté
gardait donc à l'écran la valeur du bilan précédemment affiché, c'est-à-dire
celle d'un bilan POSTÉRIEUR quand on venait de la vue courante. La source était
propre, le résidu restait. `loadBilan` et `_enterReadOnlyMode` appellent
`_resetBilanFields()` avant de charger — ce que `_editBilanConfirm` faisait déjà.

Corollaire : `_ctMergeNamesFromAllBilans` est rejouée après l'effacement, pour
que les tests personnalisés des autres bilans restent visibles **valeurs vides**.
Un nom de test n'est pas une mesure ; les masquer ferait croire que le test n'a
jamais existé.

Toute fusion destinée au formulaire passe désormais par
`_mergedDuBilanCourant()`. Sur le plus récent l'indice vaut 0, donc `slice(0)` :
son comportement ne change pas d'un iota. La comparaison d'id s'y fait en
`String()` — le SDK Supabase livre les `bigint` tantôt en nombre, tantôt en
chaîne, et un `===` strict retombait sur l'indice 0, c'est-à-dire précisément
sur la synthèse.

Le CR suit sans rien de plus : il se construit depuis le formulaire.

**Le fichier de cas porte aussi un garde-fou textuel.** Les cas vérifient la
fonction, pas **qui l'appelle** — et le défaut était exactement là : une
seconde fusion, non bornée, écrasant la première. Il échoue si
`_enterReadOnlyMode` ou `loadBilan` réintroduit un
`_buildMergedDonnees(_allBilans)`.

## Marquage du retest — le CR ne devine plus, il lit une marque

```bash
node qualite/retest-cas.js
```

Le CR décidait « frais ou ancien » en **comparant les valeurs**. Un test refait
dont le résultat n'a pas bougé — un Lachman toujours négatif à huit semaines —
se retrouvait donc daté du bilan précédent. C'est faux, et c'est justement
l'information la plus forte du suivi.

La question posée est désormais « ai-je refait ce test ? ». Elle ne se déduit
d'aucune donnée : elle se **marque**, par bloc, dans `donnees._reeval`. La
marque se pose **seule** dès qu'un champ du bloc est touché — `isTrusted`
écarte les écritures programmatiques, sans quoi ouvrir un bilan ancien le
marquerait entièrement. Le praticien ne clique que dans le seul cas où la
machine ne peut pas savoir : test refait, résultat identique.

C'est la généralisation de `_afTouched`, qui traitait déjà ce problème pour les
seules cases de l'Analyse Fonctionnelle. Les deux coexistent : l'AF est rendue
en JS hors de tout `.block[data-block-id]`.

Le grain est le **bloc**. Marquer une page déclarerait réévalués dix tests qu'on
n'a pas refaits ; marquer le champ redemanderait ce que l'interaction dit déjà.
Corollaire assumé et refermé dans le code : dans un bloc marqué, un champ resté
**vide** reste « ancien » — la marque porte sur le bloc, l'affirmation sur le
champ.

**Une première mesure ne porte AUCUNE mention** — règle du praticien : ce qui
n'est pas marqué « réévalué » en est une, et un libellé de plus dirait ce que
l'absence dit déjà. L'état reste néanmoins **distingué en interne** : sans lui,
une première mesure serait annoncée « réévaluée », ce qui est faux. Ne pas
« simplifier » en supprimant l'état — c'est le libellé qui a été retiré, pas la
distinction.

**Une première mesure n'est pas une réévaluation.** Le mot « réévalué » sur un
test fait pour la première fois est faux, et le médecin le lit comme un suivi.
`_crDejaEvalue` répond « ce test avait-il déjà été évalué ? » par deux indices,
car aucun ne suffit seul : une marque sur ce bloc dans un bilan antérieur, ou
une vraie valeur dans la fusion des antérieurs.

« Vraie » **exclut `false`** : `_serializeBilan` parcourt tout le formulaire,
donc chaque bilan enregistre chaque case, cochée ou non. Une case à `false` en
juin ne dit pas que le test a été fait ce jour-là — elle est indiscernable de
« jamais évaluée », exactement le raisonnement posé pour `_afTouched`. Sans
cette exclusion, **aucun bloc à cases ne serait jamais reconnu comme initial**.

**La question « déjà évalué ? » se pose AUSSI dans le repli.** `_crDejaEvalue`
n'était consulté que pour les bilans portant une marque — or aucune base n'en
portait encore. On passait donc toujours par l'ancienne comparaison de valeurs,
qui répondait « réévalué » sans jamais se demander si le test existait avant :
une première mesure y était annoncée comme un contrôle de suivi. Le repli
tranche désormais lui aussi entre `initial` et `neuf`.

**Tout chemin d'enregistrement doit écrire `_reeval`.** Le Suivi rapide
construit ses `donnees` à la main (`merged`) au lieu de passer par
`_serializeBilan` : il écrivait `_meta` et `_blCustom` mais jamais `_reeval`.
La marque s'y **déduit du delta** — les champs saisis désignent leurs blocs via
`_reevalMap` — et s'unit à celles que portait déjà le bilan du jour. Un cas de
référence compte les écritures de `_reeval` et les tampons `_meta` : le jour où
un troisième chemin apparaîtra, il échouera.

**`null` et `[]` ne veulent pas dire la même chose.** `_reevalLire` rend `null`
quand la clé est absente : bilan enregistré avant le mécanisme, on retombe sur
l'ancienne comparaison de valeurs. `[]` veut dire « rien n'a été réévalué ».
Confondre les deux griserait entièrement tous les bilans anciens.

**Une marque ne se perd pas.** `_reevalBlocsPourSauvegarde` réunit les marques
de la session à celles que portait déjà le bilan édité. Rouvrir un bilan pour
corriger une faute de frappe l'aurait sinon vidé de ce qu'il disait, sans le
moindre signal.

`_crCtx()` remplace le calcul en dur sur `_allBilans[0]` : `_crInSuiviMode`
répondait `false` dès qu'on consultait un bilan qui n'était pas le plus récent,
et **tout un CR ancien s'affichait sans distinction**. Le contexte se calcule
depuis le bilan **consulté** — `_crPrevMerged(start)` porte donc `start` dans sa
clé de cache, faute de quoi passer d'un bilan à l'autre rendrait la mauvaise
fusion.

**Le CSS d'export ne contenait aucune de ces règles.** `.cr-item--carried`,
`--fresh` et `.cr-date-badge` étaient émis par le HTML mais absents de la chaîne
`var css = \`…\`` : le marquage était **totalement invisible dans le document
envoyé au médecin**. Même piège que d'habitude — une règle ajoutée d'un seul
côté ne se voit pas là où le document est lu.

## Un test de force se lit en symétrie, pas en « positif / négatif »

```bash
node qualite/prehension-cas.js
```

Un test de force ne cherche pas un signe clinique : il **compare deux côtés**.
`Positif` s'y lisait comme un test provoquant une douleur, et le même écart de
5 % se disait « Négatif » sur un dynamomètre et « Symétrique » sur un test
fonctionnel — **dans le même courrier**.

`_statForce(lsi)` rend les trois paliers déjà employés partout ailleurs
(`statOf2`) : **Symétrique** (LSI ≥ 90, soit ≤ 10 % d'asymétrie), **Asymétrie
modérée** (≥ 80), **Asymétrie significative** en deçà. Le calcul n'a pas
changé — `lsi < 90` était déjà exactement le seuil de 10 %.

**Deux exceptions, et elles sont voulues** :

- Le **dentelé antérieur** (`ep-dent`) a un seuil ABSOLU de 20 répétitions.
  Deux côtés égaux mais tous deux sous la norme sont symétriques *et*
  insuffisants : le seuil absolu prime et porte son propre mot,
  « Insuffisant ».
- La **GIRD** est un vrai signe clinique à 15° d'écart, pas une mesure de
  symétrie. Elle garde « Positif / Négatif ».

Les branches « **appréciation** » gardent aussi Positif/Négatif : le praticien
a littéralement choisi ce mot dans une liste déroulante, le CR le rapporte.

**Un LSI supérieur à 100 % reste « Symétrique »** — côté atteint plus fort que
le sain. C'est la convention de toute l'application (voir l'asymétrie affichée),
et c'est une décision clinique : ne pas la changer sans le praticien.

## Quel côté le CR nomme — une résolution par région

```bash
node qualite/cr-cotes-cas.js
```

Le formulaire résout le côté atteint **par région** : les colonnes de la page
Épaule lisent la zone douloureuse `epaule`, celles du Genou la zone `genou`
(`_updateSideLabels` → `_applyLabels`). Le CR, lui, lisait le champ **global**
`f-cote` et le traduisait en « Gauche »/« Droit ».

Or `f-cote` ne reflète que la **première zone douloureuse saisie** — c'est
écrit noir sur blanc dans `_ctIsBilat`, qui avait déjà été corrigé pour cette
raison. Sur un patient « genou droit + épaule gauche », `f-cote` vaut DROIT :
le CR plaçait donc le côté atteint de l'ÉPAULE à droite. Le formulaire
affichait « Sain 78 / Atteint 55 », le CR écrivait « Gauche 78 | Droit 55 ».
**Un compte-rendu envoyé au médecin désignait le mauvais membre.**

**Pas de côté connu vaut gauche/droite — partout, sans exception.** La Hanche
en faisait une : `_updateSideLabels` y traitait « aucune zone » comme un côté
atteint à DROITE, et `_crLabelsForCote` portait un second paramètre pour la
suivre. Sur un patient sans latéralité renseignée, ses adducteurs se lisaient
donc en « Côté sain / Côté atteint » pendant que son quadriceps se lisait en
« Gauche / Droit » — deux conventions dans le même tableau, sans rien pour le
justifier.

La règle est alignée **côté formulaire**, et le CR n'a plus d'exception à
porter : `_crLabelsForCote` a perdu son second paramètre.

**Effet sur les données déjà saisies** : les valeurs ne bougent pas — elles
restent dans `-cs` et `-ca`. Seuls les intitulés changent, et uniquement sur les
patients dont la latéralité n'est pas renseignée. Sur ceux-là, « côté sain » ne
désignait déjà rien.

La règle retenue : **le CR ne traduit plus**. `_crLabelsForCote(cote)` rend
« Côté sain / Côté atteint » dès qu'un côté atteint est connu, et
« Gauche / Droit » sinon — exactement ce qu'affiche le formulaire. Pas de
traduction, donc pas de traduction fausse.

Chaque entrée de `orthoSections` porte ses `zones:`, et les blocs fonctionnels
MS et Rachis résolvent le leur. Le membre inférieur le faisait déjà — il était
le seul, et c'est ce qui masquait le défaut.

Second piège refermé au passage : en bilatéral, `_applyLabels` nomme l'entrée
`-cs` **« Gauche »** et `-ca` **« Droit »**. Le CR faisait l'inverse. Deux
conventions contradictoires dans le même fichier, donc des côtés inversés sur
tout patient bilatéral.

`romCrTable` (amplitudes) construit ses propres colonnes sans passer par
`_crMesTab` : elle affichait « Droit » avant « Gauche ». En-têtes et valeurs
ont été échangés **ensemble** — les dissocier inverserait les deux côtés.

## Effondrement 2 → 1 appui — le mot disait l'inverse du chiffre

`fmtRatio()` affichait le pourcentage **conservé** sous un intitulé qui
annonce une perte : 83 % se lisait « 83 % d'effondrement » alors qu'il n'y en
avait que 17. Elle montre désormais `100 − ratio`.

Même garde-fou que le LSI : **la couleur continue de lire le ratio**, donc
aucun seuil ne bouge — `val >= 90 ? good : val >= 80 ? warn : bad` reste
écrit sur le ratio, et le statut « Test positif » (`eff < 90`) aussi. Ne
jamais passer une perte à cette fonction.

Le 1 appui peut dépasser le 2 appuis : la perte devient négative et le signe
porte l'information. Une perte qui arrondit à zéro ne s'écrit jamais « -0 ».

**Les deux légendes du formulaire font partie du lot** — celle du bloc
« Tests Cliniques » et le sous-titre de la ligne. Elles énonçaient la formule
du rapport brut et le seuil « positif si < 90 % » ; sous une colonne de perte
ils sont faux. `qualite/lsi-cas.js` échoue si l'un des deux réapparaît.

## La force remonte du bilan, elle ne se saisit plus

Le CR médecin portait un bloc « Force musculaire » à saisie manuelle,
**prérempli depuis la Contraction Flash** (`cf-q-ca` / `cf-q-cs`). Le courrier
annonçait donc « Bilan de force — Quadriceps 42 / 42 » à partir d'une mesure de
qualité de contraction, qui n'est pas un test de force. Le bloc est **retiré**.

La force emprunte désormais le canal des tests fonctionnels — `_crMedResumeTests`
→ `r4p-cr-med-tests` → bloc « Tests du bilan » d'`outils.html`. Rien à écrire
côté outils : un test ajouté au bilan demain y apparaît tout seul.

Le filtre a dû changer de nature. Il matchait le TITRE de section
(`/Tests Fonctionnels/i`) — or **les tests de force ne forment pas une section
du CR** : ils sont rendus DANS le Bilan Orthopédique, mêlés aux tests de la même
région. Ils étaient donc entièrement invisibles. On filtre maintenant **ligne à
ligne sur `data-pages`**, l'information que `crItem` pose déjà.

**La ZONE ne peut pas être le titre de section.** Elle l'était, si bien qu'un
dynamomètre à « Ischio-jambiers 32,6 / 35,2 kg » s'annonçait sous « BILAN
ORTHOPÉDIQUE » — un intitulé qui ne correspond pas à l'examen. `CR_MED_ZONES`
donne aux pages de force leur propre intitulé ; la page d'origine dit vrai là où
le titre de section ment.

**Le regroupement se fait à la source.** Les deux consommateurs — la liste à
cocher et le courrier — ouvrent un intertitre dès que la zone CHANGE. Les tests
de force étant dispersés dans chaque section articulaire (Épaule, force, Genou,
force…), « Tests de force » se serait répété à chaque région. `_crMedResumeTests`
regroupe une fois, en conservant l'ordre de **première apparition** — celui du
bilan.

**Toutes les lignes ne sont pas des mesures à deux côtés.** « Conditions »,
« Cadence », « Zone d'attaque » n'ont qu'une valeur en toutes lettres : le bilan
la range dans `valeur`, sans `cellules`. Le tableau du courrier ne lisait **que**
les cellules — ces lignes s'affichaient avec leur intitulé et des colonnes vides,
**la valeur perdue en route**. Elles occupent désormais toute la largeur des
colonnes de mesure (`colspan`, jamais `0` : il faut au moins une colonne pour y
loger le texte).

`CR_MED_PAGES` est la **source unique** : `_neGarderQueTF` (CR Tests) la
réutilise. Les deux listes existaient en double, dans un ordre d'écriture
différent — une page ajoutée à l'une aurait manqué à l'autre en silence.

## Intitulés des tests — le lexique complète, il ne remplace pas

`CR_MED_LEXIQUE` traduisait le nom du test **en le supprimant** : « Overhead
squat » devenait « Contrôle moteur global », qui ne dit ni quel membre ni quel
mouvement. Le médecin ne pouvait ni juger si le test répondait à sa question, ni
le refaire, ni en discuter.

Chaque entrée porte désormais **quatre champs** —
`[clé, fonction, protocole, geste]` :

- la **fonction** ouvre l'intitulé : elle se comprend sans jargon ;
- le **protocole** suit entre parenthèses, pour qui le reconnaît. Vide quand il
  ne dirait rien de plus (endurances cervicales, déficits au dynamomètre) ;
- le **geste** part en petit sous l'intitulé, là où figure déjà « Repère
  EIAS-sol : 45 cm ». Sur la même ligne il doublait la hauteur de la colonne.
  Vide quand la fonction le porte déjà — « Capacité de saut en longueur sur un
  pied » n'a rien à ajouter.

Le tri du plus long au plus court est **conservé** : sans lui « Drop Jump H »
serait attrapé par « Drop Jump — RSI », et « Pliométrie verticale
(qualitative) » par « Pliométrie verticale ». Ce qui suit le motif est gardé —
« SEBT — Antérieur » rend « … — direction antérieure (SEBT) », protocole après
le suffixe.

Un test **hors lexique garde son nom d'origine** : la table peut rester
incomplète sans jamais rien casser.

**Le membre est nommé** dans l'intertitre de l'analyse fonctionnelle : elle ne
porte que sur le membre inférieur (`AF_PAGES`), et rien dans le courrier ne le
disait.

## Générateur de CR — deux destinataires, une seule donnée

```bash
node qualite/cr-colonnes-cas.js
```

L'onglet « CR Médecin » est devenu **Générateur de CR** : le premier geste est
le choix du destinataire, `crAudience` (`medecin` par défaut).

**Les données ne changent pas.** Mêmes tests, mêmes tableaux, mêmes chiffres,
même conclusion — le praticien n'écrit qu'un texte. Seuls l'ouverture, l'objet
et la clôture changent. Vouvoiement dans les deux cas, sur décision du
praticien ; les intitulés de tests restent ceux traduits pour le médecin.

**Le défaut revient à `medecin` à chaque remise à zéro.** Un courrier au patient
parti chez un médecin se remarque tout de suite ; l'inverse — un patient qui
reçoit « Bonjour Docteur » suivi de son propre dossier — passe beaucoup moins
bien. Le défaut protège du second cas.

Les coordonnées du médecin sont **masquées, jamais vidées** : basculer d'un
destinataire à l'autre ne doit rien faire perdre.

`crSetAudience` **régénère** le courrier affiché. Le laisser à l'écran avec le
ton de l'ancien destinataire ferait croire qu'il a suivi la bascule.

### Deux conventions de côté ne partagent pas un tableau

Le bilan résout le côté **par région** : une hanche à côté atteint connu rend
« Côté sain / Côté atteint », un genou bilatéral rend « Gauche / Droit ».
Réunies dans une même section — « Tests de force » les mélange — elles donnaient
**cinq colonnes dont deux restaient vides sur chaque ligne**.

`_lotsParConvention` sépare : un tableau par convention, sous le même
intertitre. On ne **traduit** pas — le CR a cessé de le faire après avoir
désigné le mauvais membre dans un courrier.

`courant` démarre sur la **première convention rencontrée**, jamais sur la
chaîne vide : sinon l'analyse de course se scinde en deux, « Conditions » et
« Cadence » n'ayant pas de côté et ouvrant un premier lot avant « Zone
d'attaque ».

### Un examen parfait doit se lire

Sans case cochée ni observation, la ligne d'analyse fonctionnelle **n'apparaît
pas** au CR — indiscernable d'un test non fait. Or « je l'ai regardé et il n'y
avait rien » est une information clinique.

Deux cases « Inclure au CR » (`af-mi-ohs-cr`, `af-mi-sls-cr`) forcent
l'apparition de la ligne. C'est le mécanisme déjà en place pour les tests
fonctionnels — `rec-cr-toggle`, `plioq-cr-toggle` — repris à l'identique plutôt
que réinventé.

Trois endroits devaient suivre, et **chacun aurait suffi à faire disparaître la
ligne** :

- la condition d'affichage dans `_buildAllTestsHtml` ;
- le statut de l'Overhead squat, qui rendait « 0 compensations » ;
- `_crMedResumeTests`, qui jetait toute ligne sans valeur texte — or une
  analyse fonctionnelle vide n'a pas de texte, son statut porte tout.

### Deux grilles, deux modes — `data-af-mode`

La même forme de grille sert à deux choses opposées, et les confondre dit le
contraire de ce qu'on observe :

- **`compensation`** (défaut, Overhead squat et Squat unipodal) : une pastille
  signale un DÉFAUT. Seules les lignes marquées sortent — une compensation
  absente ne se dit pas. Pastille **rouge**, statut en nombre de compensations,
  section « Analyse fonctionnelle ».
- **`critere`** (Test de Réception) : une pastille signale une RÉUSSITE.
  TOUTES les lignes sortent, validées ou non — un critère non acquis est une
  information, et « 5/5 » disait l'ampleur sans dire lequel manque. Pastille
  **verte**, statut d'origine conservé (« Acquis » / « Incomplet »), et le test
  **reste dans sa section** : il emprunte la grille, il ne devient pas une
  analyse fonctionnelle.

**Les libellés de côté se relisent, ils ne se supposent pas.** La grille du
squat unipodal dit « G / D », celle de la réception « Côté sain / Côté
atteint ». `_crMedAnalyseFonc` remonte les deux dans `cotes`, et le rendu place
les pastilles dans CES colonnes. Les figer sur Gauche/Droit inverserait les
côtés du patient sur la seconde — le défaut que `cr-cotes-cas.js` a déjà eu à
refermer.

Les abréviations sont **développées** : la grille écrit « G » parce qu'elle est
étroite, le courrier a la place. « (g et d) » se lit mal dans une phrase.

### `v.af` présent, MÊME VIDE, veut dire « analyse fonctionnelle »

La condition exigeait au moins une compensation. Un patient **sans aucune
compensation** gardait donc son score « G 0/7 · D 0/7 », restait dans la section
des tests chiffrés, et voyait ses observations par côté entassées dans la
colonne des mesures. **Le seul bilan à rester laid était le meilleur.** Le même
piège existait des deux côtés — dans `_crMedResumeTests` et dans le rendu.

`synthese` est une **liste**, jamais une phrase : « Gauche : parfait » et
« Droit : pied vers l'extérieur » sont deux constats, et collés on lit deux fois
avant de voir où l'un finit. Le transport se fait par `[].concat(…)` et non
`.slice()` — sur une chaîne, `.slice()` rend une chaîne, que le rendu
parcourrait caractère par caractère.

### Une colonne n'existe qu'à partir de la moitié des lignes

Le tableau du courrier n'affiche une colonne que si **la moitié au moins** des
lignes du groupe la remplit — la règle déjà posée dans le bilan pour la colonne
« Mesure ».

Le cas qui l'a motivée : l'analyse de course à pied. « Conditions », « Cadence »,
« Temps de contact » n'ont pas deux côtés ; seule « Zone d'attaque » en a. Les
en-têtes « Gauche / Droit » coiffaient cinq lignes dont une seule s'y rapportait.

**La moitié, et non « au moins deux »** : un groupe d'UN SEUL test à deux côtés
— un dynamomètre isolé — garde ses colonnes, ce qui est juste. Ce seuil est la
chose à ne pas « simplifier » : le porter à 2 prive le test de force unique de
ses colonnes, l'abaisser à 1 ramène le défaut d'origine.

Une cellule **vide ne compte pas**, sans quoi une colonne entièrement vide
survivrait — des en-têtes au-dessus de rien. Sans colonne de côté, celle qui
reste se nomme « Observation » et s'aligne à gauche : ce ne sont plus des
chiffres.

**`zone` peut manquer.** `r4p-cr-med-tests` est un contenu de `localStorage`, et
celui d'un praticien peut avoir été écrit par une version antérieure du bilan.
Sans repli, `b.txt.toUpperCase()` levait une exception et **aucun courrier ne se
générait** — le formulaire restait muet, sans dire pourquoi.

## Courrier au médecin — mise en page du document imprimé

Le CR médecin est un **courrier**, pas une page web : il est lu sur papier ou
en PDF, et sa mise en page doit tenir la coupure de page.

**Une case grise orpheline, deux fois le même mécanisme.** Le fond gris d'une
grille sert à dessiner les filets entre champs (`gap:1px`) — une dernière ligne
incomplète le laisse donc voir à nu. C'est arrivé dans `.lt-pat` (CR médecin,
nombre impair de champs) **et** dans `.form-grid` du bilan, où le retrait de
« Date du bilan » a laissé une grille `triple` avec deux champs. La classe a été
corrigée, et une règle générale couvre désormais tous les cas : la dernière
case d'une ligne incomplète s'étend jusqu'au bord. Le contrôle à faire en
ajoutant ou retirant un champ : le nombre de `.field` doit rester un multiple
du nombre de colonnes de la classe.

**La cellule grise vide.** `.lt-pat` est une grille à deux colonnes dont le
fond gris sert à dessiner les filets (`gap:1px`). Avec un nombre **impair** de
champs, la dernière case ne remplit qu'une colonne et le gris apparaît à nu
dans l'autre : une cellule vide, grise, sans intitulé. On ne peut pas inventer
un champ manquant — la dernière case prend donc toute la largeur
(`:last-child:nth-child(odd){grid-column:1/-1}`).

**Conclusion et plan sont deux propos distincts.** Le plan sortait en
paragraphes nus juste sous l'encadré de conclusion : le lecteur ne voyait plus
où finissait l'une et où commençait l'autre. Ce sont deux encadrés **jumeaux**
(`.lt-bloc` + `.lt-concl` / `.lt-plan`), chacun avec son intitulé. L'un dit où
en est le patient, l'autre ce qui va être fait.

**Rien ne se coupe au milieu.** `break-inside:avoid` sur la grille patient, les
encadrés, les tableaux et leurs lignes ; `break-after:avoid` sur `.lt-sec` —
un intertitre seul en pied de page annonce une section qui commence ailleurs.
Le pied de lettre est groupé dans `.lt-fin`, sans quoi la signature se
retrouvait seule en tête de page suivante.

**La marge haute était à zéro sur TOUTES les pages**, pour que le bandeau navy
morde le bord en tête de document. À la page 2, le texte repartait donc collé
au bord supérieur. Seule la première page garde ce bord à bord :
`@page{margin:16mm 0 14mm}` + `@page :first{margin-top:0}`.

**Les listes sont des listes.** Amplitudes, signes cliniques et tests cliniques
sortaient en PARAGRAPHES — un par item, chacun avec sa marge basse : le bloc le
plus haut du document pour l'information la plus brève. En `<ul>` sur deux
colonnes, la même chose tient dans **moins de la moitié** de la hauteur (mesuré :
355 px → 175 px). Une liste d'un seul item repasse sur une colonne — sinon le
lecteur cherche ce qui manque dans la colonne vide.

**Le pied courant ne numérote pas, il identifie.** Un `position:fixed` se répète
sur chaque page imprimée ; c'est le seul moyen d'obtenir un pied de page. Les
boîtes de marge `@page`, seules à savoir compter les pages, **ne sont pas
implémentées par les navigateurs** — « 2 / 3 » n'est pas atteignable en CSS
d'impression. Le pied porte donc patient, date et praticien : une feuille
détachée reste rattachable.

**L'analyse fonctionnelle n'est pas un tableau de mesures** mais une GRILLE de
pastilles — une ligne par compensation, une pastille par côté. Lue en
`textContent`, elle rendait « Compensation observeeGDTronc — inclinaison ou
rotation••Genou — valgus•• » : en-têtes collés aux libellés, pastilles devenues
puces, illisible. `_crMedAnalyseFonc` la relit — seules les compensations
PRÉSENTES, chacune avec ses côtés, puis les phrases de synthèse. Même traitement
pour la liste à puces de l'Overhead squat, où seules les croix comptent.

Elle sort en **sous-lignes** : une compensation par ligne, indentée sous le test,
avec sa pastille dans la colonne du côté. C'est la grille du bilan rendue dans le
tableau du courrier.

**Deux conventions ne cohabitent pas dans un tableau.** L'analyse fonctionnelle
se lit en GAUCHE / DROITE — ce sont des côtés anatomiques. Les tests chiffrés de
la même section se lisent souvent en CÔTÉ SAIN / CÔTÉ ATTEINT
(`_crLabelsForCote`, dès qu'un côté atteint est connu). Aucune mise en forme ne
les réconcilie : l'analyse fonctionnelle reçoit donc sa **propre zone**, donc son
propre intertitre et son propre tableau, où « Gauche » veut dire gauche.

C'est aussi ce qui rend `_cotesSurs` vrai par construction dans ce tableau. Le
repli — nommer le côté en toutes lettres quand les en-têtes ne sont pas
Gauche/Droit — **reste en place** : il couvre le cas où une ligne d'analyse
fonctionnelle atterrirait ailleurs. Ne pas le retirer en croyant nettoyer du code
mort ; sans lui, les côtés du patient s'inverseraient en silence dans un document
médical (voir `qualite/cr-cotes-cas.js`).

L'alternative écartée : traduire gauche/droite en sain/atteint. C'est
précisément ce que le CR a **cessé** de faire après avoir désigné le mauvais
membre dans un courrier.

**Le score sur sept ne sort pas du cabinet — à DEUX endroits.** Il figure dans le
statut (« G 2/7 · D 2/7 ») *et* en tête de la phrase de synthèse (« Gauche 2/7 ·
Droite 2/7 — mêmes compensations des deux côtés »). Corriger le premier seul
laissait le second en italique sous le tableau. Ce qui SUIT le score est la vraie
information clinique et reste ; un décompte sans dénominateur — « 3 communes » —
reste aussi, il se comprend seul.

**Le score « G 2/7 · D 2/7 » ne sort pas du cabinet.** Le dénominateur — sept
critères possibles — ne dit rien à qui ne le connaît pas. `_crMedResumeTests`
réécrit le statut en NOMBRE de compensations (« 2 compensations », ou
« 1 à gauche · 2 à droite » quand les côtés diffèrent). Le CR interne du bilan,
lui, garde le score : c'est le praticien qui le lit.

**Trois rendus, une seule source.** `_crBlocsHtml` (écran + PDF) et
`_crBlocsTexte` (copie, mail) lisent les mêmes blocs. Un type de bloc ajouté
d'un seul côté disparaît de l'autre sans le moindre signal.

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

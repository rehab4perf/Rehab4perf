---
name: builder-programme
description: Builder de séances et programmes de Rehab4Perf — programme.html, js/prog-data.js et js/prog-main.js : blocs et exercices, étapes, templates et protocoles, empreinte de séance, cycles de l'espace athlète, générateur CAP. À utiliser dès qu'il est question du builder, d'une séance, d'un bloc, d'un exercice, d'un template ou d'un modèle, d'un protocole, d'une phase, d'un cycle, de l'agenda, du programme d'un patient, ou de l'espace athlète.
---

# Builder et programmes

Composer et planifier. Deux règles de fond traversent tout le domaine : un
template s'**ajoute**, il ne remplace jamais ; et l'appartenance d'un bloc à une
étape est **positionnelle**, donnée par le dernier séparateur rencontré.

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

## Un modèle ouvert reste l'objet du travail

```bash
node qualite/modele-ouvert-cas.js
```

Ouvrir une phase depuis la barre latérale, c'est déclarer « je travaille sur ce
modèle ». Ce mode tient jusqu'à ce qu'on en sorte : vider, charger un autre
contenu, recomposer — tout cela porte sur le modèle.

Il ne tenait pas. **`_loadProg` coupait le lien sans exception** et adoptait au
passage l'identité du programme chargé. Le praticien qui ouvrait sa phase, la
vidait, chargeait la séance d'une patiente et enregistrait ne modifiait donc pas
son modèle : **il réécrivait le programme de la patiente**, en silence, derrière
un bouton qui disait « Sauvegarder ».

Trois choses tiennent la règle, et en perdre une ramène le défaut :

- le lien survit au chargement (`_gardeModele`) ;
- **l'identité du programme chargé n'est PAS adoptée** — `_currentProgId` et
  `_currentSeanceId` restent nuls, si bien que le programme du patient ne peut
  plus être écrit par ce chemin. C'est le point qui rendait l'erreur dangereuse
  plutôt que seulement décevante ;
- **le bouton PRINCIPAL met à jour le modèle, et le nomme.** La mise à jour
  n'était offerte que par un bouton secondaire, facile à ne pas voir ; le
  principal proposait « Sauvegarder », qui ne disait pas ce qui serait écrit.
  Le secondaire est masqué dans cet état — deux boutons pour un seul geste
  laissent croire qu'ils font des choses différentes.

**Le nom d'un modèle est son IDENTITÉ**, et il ne se change que par
« Modifier », dans le menu « … ». La mise à jour n'envoie que le contenu — elle
lisait le champ de nom du builder, qui nomme une **séance** : charger la séance
d'un patient dans un modèle ouvert renommait donc la phase au gré du contenu
chargé, et le nom officiel était perdu sans le moindre signal.

Deux verrous, car corriger l'un sans l'autre laisse le défaut : `_loadProg`
n'écrase plus le champ quand un modèle est ouvert, **et** `_doUpdateTemplate`
n'envoie plus la colonne `nom` du tout. Ne pas écrire une colonne qu'on ne
possède pas est la seule façon sûre de ne jamais la corrompre — et cela a rendu
inutile le repli « champ vide → nom déjà enregistré », qui a été retiré.

**Ouvrir une séance planifiée depuis l'agenda reste une sortie du modèle** —
c'est un geste d'agenda. Mais elle se **déclare** (`_loadProg(…, true)`) après
confirmation nommant le modèle : sortir en silence perdrait le travail en cours.

**L'aperçu d'une phase doit décrire ses blocs cardio.** Un bloc cardio n'a pas
d'exercices : `_renderTmplCardTree` n'affichait donc que son **titre**. Un titre
comme « Bloc raise » ne dit ni le sport ni la durée — le praticien voyait une
ligne suivie de rien et croyait le bloc vide, alors que l'en-tête annonçait
« 1 cardio ».

`_cardioResume(bloc)` rend ce qui le décrit : le sport (libellé de
`CARDIO_SPORTS`), la **forme** du fractionné plutôt qu'un total — « 8 × 30s /
30s » dit ce qu'on va faire, « 8 min » ne le dit pas — puis la durée et la
distance.

**L'emoji du sélecteur ne passe pas dans l'aperçu.** Les libellés de
`CARDIO_SPORTS` en portent un parce qu'ils servent d'abord au **sélecteur** du
builder ; une liste de répertoire n'en veut pas. On coupe **avant la première
lettre** plutôt que de lister les emojis — « ❄️ Ski Erg » en porte deux, dont un
sélecteur de variante invisible qu'une liste laisserait derrière.

Le titre ne survit que s'il a été **saisi** : il porte alors l'intention. Un
titre automatique n'apporte rien à côté du sport, et **la forme du titre doit
suffire à le reconnaître** — les blocs enregistrés avant `_titreAuto` n'ont pas
le drapeau, et afficheraient « Bloc E » sans le repli sur `/^Bloc( [A-Z])?$/`.

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

## Cycles de l'espace athlète — deux voies, pas une file

```bash
node qualite/cycles-paralleles-cas.js
```

Un cycle à **critères** n'a pas de date : il dure tant qu'il n'est pas validé.
Un cycle **daté** vit sa fenêtre de calendrier. Ce sont deux natures, pas deux
étapes — le tendon se poursuit sur critères pendant que le bloc de force tourne
sur ses dates, et **les deux sont vrais en même temps**.

L'espace athlète n'en montrait qu'un. Deux verrous, à deux endroits, et
corriger l'un sans l'autre n'aurait rien changé :

- `_cycleIsCurrent` faisait bloquer un cycle à critères par **tout**
  prédécesseur non terminé, y compris d'une autre nature ;
- le bandeau s'arrêtait au premier trouvé (`break`), et la liste du plan lisait
  ce seul indice (`i === curIdx`) au lieu de recalculer par ligne.

**Chaque voie garde son ordre interne** : un cycle à critères attend que le
précédent À CRITÈRES soit validé. C'est le blocage **croisé** qui a sauté.

**Ce qu'on accepte en échange** — et c'était la raison écrite de la règle
précédente : un cycle daté peut désormais s'afficher « en cours » alors qu'un
cycle à critères placé avant lui n'est pas terminé. C'est exactement ce qu'on
veut voir.

**Les cycles TERMINÉS ne sont plus listés** dans le plan de l'athlète : il
regarde ce qu'il a à faire, pas ce qu'il a déjà fait. Rien n'est supprimé — ils
restent dans les données, teintent toujours leurs journées passées sur le
calendrier, et reparaissent si leur état change. L'accordéon a perdu le mot
« complet », qui serait devenu faux.

**Les indices restent ceux du tableau entier.** `_cycleIsCurrent` lit les
cycles qui précèdent pour ordonner la voie critères : réindexer sur la liste
filtrée lui ferait perdre de vue les cycles terminés, c'est-à-dire exactement
ceux qui débloquent le suivant. `_restants` porte donc des **indices**, pas des
cycles.

Le fond de journée du calendrier (`_dayCycleBg`) garde la **première** couleur
qui couvre la date — décision du praticien : un chevauchement ne se voit pas
sur la grille, et une bande par cycle l'aurait chargée.

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

## Rangée d'exercice sur téléphone — alignée par le HAUT

`align-items:end` collait les cellules au bas de leur rangée. La cellule
« Reps » porte un troisième élément — la bascule `/côté` — donc elle est plus
haute : alignée par le bas, **son champ se retrouvait rehaussé de 30 px** par
rapport à ceux de Durée et Séries. Alignées par le haut, les intitulés se posent
sur une même ligne, donc les champs aussi, et la bascule pend sous sa colonne.

La bascule prend la largeur de son texte (`align-self:start`) : étirée, elle se
déguisait en second champ de saisie.

## Consignes d'exercice du builder — un `<textarea>` sans `rows` vaut DEUX lignes

```bash
node qualite/builder-consignes-cas.js
```

Le champ de consigne n'en veut qu'**une** — son `min-height:24px` le dit, et
`autoResizeTa` le fait grandir dès qu'on écrit. Sans l'attribut, il ouvrait à
deux lignes : sous **chaque** exercice, une ligne entière de vide. Sur
téléphone, où la ligne d'exercice fait déjà ~300 px, c'est ce qui la faisait
« descendre pour rien » — mesuré : rangée de 48 px pour un champ de 26.

**Et le champ ne se mesure plus du tout.** `autoResizeTa()` écrivait une hauteur
en pixels, mesurée à la largeur qu'avait le champ **à cet instant**, puis plus
rien ne la recalculait. Panneau du builder encore replié ou en cours d'ouverture
quand la passe tirait : mesure sur quelques pixels de large, hauteur figée
absurde. **Mesuré : un champ de 16 px de large donne 972 px de haut** — sur
téléphone, la consigne devenait un pavé vide occupant tout l'écran.

Le champ vit désormais dans `.exo-consigne-grow` : un pseudo-élément portant le
même texte (`data-repl`) occupe le **flux normal** et impose la hauteur, le
champ étant posé **par-dessus en absolu**.

**Ne jamais revenir à la grille d'une seule cellule** — c'était la première
version, plus courte. La largeur de la doublure dépendait alors du
dimensionnement de la **piste** de grille, que WebKit peut calculer sur le
contenu minimal : la doublure se repliait sur quelques caractères, une vingtaine
de lignes au lieu de cinq, pendant que le champ gardait sa pleine largeur. Sur
iPhone, un pavé vide sous un texte de cinq lignes — invisible sur navigateur de
bureau, où la mesure était juste. Dans le flux normal, la largeur de la doublure
est celle du conteneur et aucune piste n'intervient. Aucune mesure,
donc aucune dépendance à un `requestAnimationFrame`, à la visibilité de
l'onglet, ni à la largeur au moment du rendu — et la hauteur suit toute rotation
ou tout changement de largeur, gratuitement. Vérifié : la même consigne fait
98 px à 320 px de large et 26 px à 1280, sans une ligne de JavaScript.

**Les deux boîtes doivent rester identiques** — police, interligne, marge
intérieure, bordure, `box-sizing`. Elles partagent une seule déclaration, et le
fichier de cas échoue si l'une d'elles s'en détache : une divergence d'un seul
pixel fausse la hauteur.

**`data-repl` se met à jour EN PREMIER dans le `oninput`.** Placé en fin de
chaîne, la moindre exception dans `updateField` figerait la hauteur en silence
et le champ cesserait de grandir à la frappe — reproduit sur un banc où
`updateField` n'existait pas.

**`requestAnimationFrame` ne se déclenche PAS dans un onglet ou une iframe
masqués.** Les autres zones extensibles (`.texte-ta`, `.cardio-txt`, les notes)
dépendent encore de la mesure et gardent donc cette fragilité. Ce n'est pas un
risque observé — `renderSession()` ne tourne que sur interaction dans un builder
visible — mais c'est aussi la raison pour laquelle un banc d'essai dans un volet
en arrière-plan montre ces zones coupées alors que l'application est correcte.
Ne pas « corriger » le produit sur cette foi.

**Le retrait de 34 px est annulé sur téléphone.** Il alignait la consigne sous le
NOM, après la colonne des flèches monter/descendre — colonne masquée en dessous
de 700 px (`nth-child(1){display:none}`). Il ne calait donc plus rien et ne
faisait que rétrécir le champ de 38 px.

**L'ordre des enfants de `.exo-row` porte toute la grille mobile** : chaque
cellule s'y place au `nth-child`. Un enfant inséré au milieu décale tout ce qui
suit, en silence. Le fichier de cas reconstruit le balisage depuis les littéraux
concaténés et compte les ouvertures **à la profondeur zéro** — compter les
`html += '<…'` ne suffit pas, le contenu imbriqué de chaque cellule est émis de
la même façon.

## Calculateur de 1RM — le défaut est UNE répétition

```bash
node qualite/calculateur-rm-cas.js
```

Le champ ouvrait sur **5** répétitions. Le praticien qui vient de faire tester un
maximum devait donc corriger le champ **avant** de pouvoir lire le résultat — et
une valeur fausse s'affichait entre-temps, sur un écran qui a l'air d'un
résultat.

À une répétition, les six formules rendent le **poids lui-même** : le
calculateur ne calcule plus rien, il rend ce qu'on a soulevé. C'est ce qui rend
ce défaut légitime, et c'est vérifié formule par formule — si l'une cessait de
le faire, l'ouverture afficherait un 1RM différent du poids saisi.

## Bande d'échéances — la distance, pas la date

```bash
node qualite/echeances-cas.js
```

Le repère 🎯 sur la case du jour existait déjà (`_dayObjectifLabelHtml`), mais il
n'apparaît qu'en **naviguant jusqu'au mois concerné** : une échéance à douze mois
y est invisible, puisqu'il faudrait savoir qu'elle existe pour aller la chercher.

La bande vit **entre l'en-tête et la grille** — le seul emplacement qui reste à
l'écran quel que soit le mois affiché — et porte le **J-N**. C'est la distance
qui gouverne la planification : elle donne le budget de semaines pour caler les
cycles, ce que la date seule ne dit pas.

**Une échéance passée quitte la bande dès le lendemain.** Une bande qui garde des
dates dépassées cesse d'être lue en quelques semaines.

**La bande et la grille parlent la même langue** : ambre et 🎯. La même échéance
présentée sous deux identités selon l'endroit où on la regarde ferait douter que
ce soit la même. Le filet bleu et le ⚑ sont réservés à ce qui portera
`source:'praticien'` — aujourd'hui rien ne le porte.

Elle se redessine à **quatre moments** : rendu de la grille, arrivée des
objectifs, patient vidé, patient absent. En perdre un laisse à l'écran les
échéances du patient précédent.

Seuls les objectifs **datés** y figurent — `_patientObjectifs` les filtre déjà.
Un objectif sans date n'a rien à dire à un agenda et reste dans le bilan.
**C'est la seule condition pour qu'un objectif du bilan apparaisse** : il vit
dans `f-objectifs` du dernier bilan **enregistré**, et le champ de date de la
page Infos patient est facultatif.

### Deux échéances le même jour : les DEUX se voient

**Ne jamais les fondre automatiquement.** Un premier jet le faisait — même jour,
deux sources, une seule puce — et c'est l'inverse de ce qu'il faut : deux
échéances le même jour sont souvent deux choses **différentes**, et les fondre
les cachait toutes les deux derrière un libellé unique, sans aucun moyen de voir
ce qu'il y avait dessous.

Seul le praticien sait si c'est un doublon. La bande **montre les deux**, et
propose de fusionner uniquement quand la configuration s'y prête : deux
échéances, même jour, **deux sources**. Le bouton n'apparaît que sur celle de
l'athlète — c'est sa ligne que la fusion réécrit.

**Le bouton vit HORS de la puce.** Un `<button>` imbriqué dans un `<button>`
n'est pas cliquable, et le balisage est invalide.

**Fusionner écrit dans `athlete_objectifs`** : le libellé prend celui du
praticien — le nom officiel, celui qui part au courrier — et `repris_at` marque
la prise en compte. Deux conséquences voulues : le garde-fou `texte|date` les
confond ensuite **d'office**, sur ce poste comme sur les autres et sans qu'aucune
colonne soit ajoutée ; et l'athlète voit que sa déclaration a été acceptée.

**Le libellé de l'athlète est remplacé, donc perdu** : la confirmation le nomme
et le dit. Un praticien doit pouvoir refuser en connaissance de cause plutôt que
de découvrir après coup que le mot de son patient a disparu. Et rien n'est écrit
si le libellé du praticien manque — fusionner vers rien effacerait l'échéance
sans la remplacer.

**On n'annonce que ce qui est fait** : un refus du serveur laisse les deux
échéances en place, il ne se dit pas fusionné.

## Échéances déclarées par l'athlète — table dédiée, migration non appliquée

L'athlète est identifié par un simple `?patient=<id>` dans l'URL, avec la clé
anonyme, et n'écrit aujourd'hui que dans `athlete_feedback`. **Lui ouvrir
`patients` en écriture** — la table qui porte nom, prénom et date de naissance —
pour qu'il déclare une date de course serait un très mauvais échange. D'où
`athlete_objectifs`, qui isole exactement ce qu'il a le droit d'écrire.

`supabase/migrations/20260829_athlete_objectifs.sql` est **écrite mais NON
appliquée** — décision du praticien, et elle touche à la sécurité juste avant
la migration HDS. Le code est donc écrit pour vivre sans elle : requête en
échec = section athlète entièrement masquée, agenda inchangé. Une section à
moitié affichée serait pire que pas de section.

C'est aussi la **première politique RLS versionnée** du dépôt : l'audit HDS
avait relevé qu'elles n'existaient nulle part dans le code.

**`repris_at` est le pivot.** Non nul = le praticien a pris l'échéance en
compte ; la base refuse alors toute écriture de l'athlète, parce que des cycles
sont calés dessus et que la date ne doit plus bouger sous les pieds du
praticien. L'athlète ne peut pas se déclarer « pris en compte » lui-même —
ce serait s'auto-valider et supprimer le filtre qui protège la planification
d'une date fantaisiste.

**Une échéance reprise est souvent recopiée dans le bilan** : sans le garde-fou
`texte|date`, elle s'afficherait deux fois, une par source.

**Exposition résiduelle assumée et écrite dans la migration** : sans identité
côté athlète, la lecture anonyme ne peut pas être restreinte par ligne. C'est
déjà la posture des tables `athlete_*` ; le correctif est un jeton par patient
dans le lien de partage, qui dépasse cette table.

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

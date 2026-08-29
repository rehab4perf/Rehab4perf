---
name: bilan-clinique
description: Bilan clinique de Rehab4Perf — bilan.html et js/bilan.js : mobilités actif/passif et end-feel, tests de force et leur lecture en symétrie, asymétrie affichée, bilans de suivi et bilans antérieurs, date du bilan, pliométrie qualitative, motifs de bilan. À utiliser dès qu'il est question d'un examen, d'un test clinique ou fonctionnel, d'amplitudes, d'un score, d'un LSI ou d'une asymétrie, d'un bilan de suivi, d'un côté atteint ou sain, ou d'ajouter/modifier un test dans le catalogue TESTS.
---

# Bilan clinique

L'examen lui-même : ce que le praticien mesure et ce que l'application en
déduit. Les décisions consignées ici sont cliniques avant d'être techniques —
un seuil, un vocabulaire ou une convention de côté ne se change pas sans le
praticien.

## Mobilités actif / passif — un mécanisme, trois segments

```bash
node qualite/mob-actif-passif-cas.js
```

Le différentiel actif/passif situe l'origine d'une limitation : actif limité et
passif libre, c'est la commande ; les deux limités, c'est la structure. Il
n'existait que sur l'épaule ; le coude et le poignet l'ont désormais.

`MOB_AP` range les mouvements **par segment** et une seule fonction —
`_mobApRefresh(seg, key)` — les interprète tous. Recopier la fonction par région
aurait fait dériver l'interprétation d'un segment à l'autre.

Les identifiants gardent la forme `<seg>-mob-<clé>-act|pas|obs|interp`, et
**ceux de l'épaule ne bougent pas d'un caractère** : les bilans enregistrés les
retrouvent tels quels.

`_mobApVerdict(actif, passif, endFeel)` rend **quatre** valeurs : libellé, ton,
phrase courte, détail. La phrase courte s'affiche sous le verdict *et* part au
compte-rendu ; le détail reste en infobulle. Le vocabulaire vient du tableau
« Lire l'écart actif vs passif » du praticien — **Limitation articulaire**,
**Limitation musculaire**, **Pathologie tendineuse**, **Artefact ou laxité** —
et c'est lui qui permet à l'explication de tenir en une ligne. « Conservée »
n'en porte aucune : un verdict bien nommé rend l'explication superflue.

**L'end-feel requalifie le verdict**, il ne s'y ajoute pas : *dur* → Butée
osseuse, *mou* → Œdème ou laxité, *ferme-élastique* → le verdict de base.
**Le vide prime sur tout le reste** — ce n'est pas une raideur mais un arrêt par
la douleur avant toute butée. Le subordonner à l'état de l'actif le ferait
disparaître là où il compte le plus.

La fin de course ne se demande **qu'en passif** : sans lui elle n'a pas d'objet,
et une valeur restée là ferait basculer en drapeau rouge un mouvement non testé.
Le menu est donc désactivé et vidé, pas masqué — le masquer changerait la
largeur des colonnes d'une ligne à l'autre.

**Deux verrous empêchaient le profil atypique de sortir**, à deux étages :
`a === 'libre'` court-circuitait la comparaison AVANT elle, et `_mobApRefresh`
**effaçait** le passif dès que l'actif était libre. Corriger l'un sans l'autre
n'aurait rien changé — et l'effacement supprimait au passage une saisie du
praticien sans le moindre signal. Actif libre avec passif limité est le profil
atypique ; actif libre avec passif douloureux désigne une structure non
contractile.

**Le câblage se vérifie dans les deux sens.** Un `onchange` qui désigne une
autre clé que celle de sa ligne ne casse rien de visible — la colonne
« Interprétation » reste muette. Et un mouvement déclaré dans `MOB_AP` sans
ligne dans la page n'est ni interprété, ni remonté au CR. Le fichier de cas
contrôle les deux.

**La hanche s'examine toujours des DEUX côtés** : le côté entre dans la clé
(`g-flex`, `d-flex`…), ce qui donne `ha-mob-g-flex-act` — la forme des
identifiants de degrés qu'elle portait, prolongée d'un suffixe. Les mouvements
sont rangés par mouvement PUIS par côté : c'est l'ordre du tableau, où le
libellé coiffe ses deux lignes. Le CR nomme le côté en toutes lettres
(« Flexion — Gauche ») ; ce sont des côtés **anatomiques**, la grille les lit
tels quels et le CR ne traduit pas.

**Les degrés de hanche ont disparu de la page** — décision du praticien : noter
six angles par côté à chaque bilan est trop lourd, et l'amplitude se précise
dans le marqueur quand elle compte. Conséquence assumée : les six mesures par
côté ne sont plus collectées. **Les 13 suivis d'Évolution restent définis** et
leurs points déjà enregistrés restent tracés — `_getMetricVal` lit les
`donnees`, pas la page. Les supprimer effacerait cet historique de l'écran.

**Les observations par côté de la hanche sont CONSERVÉES** (`ha-mob-g-obs`,
`ha-mob-d-obs`) : rien dans le nouveau tableau ne les remplace — le marqueur est
par mouvement — et le CR les lit.

**`_mobApRefreshAll()` doit être rejouée après tout chargement**, et **chaque
appel a SON `try`**. Elle ne l'était qu'à l'ouverture de la page : rouvrir un
bilan laissait la colonne à « — » alors que les deux menus étaient renseignés.

Le second défaut est plus sournois. La cellule d'interprétation est un `<td>` :
aucune des boucles de vidage de `_resetBilanFields` — inputs, textareas,
selects, cases — ne l'atteint. Elle ne se nettoie **que** par cet appel. Rangé
en fin d'un `try` partagé avec `updateAll`, `calcRec`, `calcPlioq` et
`_epFoncRefresh`, un voisin qui échoue le sautait : au changement de patient,
les champs repartaient vides et **les verdicts du précédent restaient à
l'écran** — une interprétation clinique attachée à personne. Reproduit, puis
refermé en isolant l'appel. Quatre points de nettoyage : ouverture de la page,
`_resetBilanFields`, `_deserializeBilan`, `loadFromStorage`.

**La page COUDE n'avait AUCUNE section au CR.** Douze tableaux au catalogue
TESTS, une grille de mobilité dans la page, et rien de tout cela n'était lu : on
pouvait remplir la page entière sans qu'une seule ligne n'apparaisse au
compte-rendu. Exactement le manque déjà refermé pour le Poignet. `zones:['coude']`
et rien d'autre — reprendre la liste de l'ÉPAULE laisserait une douleur d'épaule
décider du côté nommé pour le coude.

**Le tableau REMPLACE les lignes de statut** — décision du praticien : deux
façons de dire la mobilité dans le même bloc se lisaient comme un doublon.
`mob-co-*` et `mob-po-*` ne sont plus dans la page ; leurs valeurs restent en
base mais ne sont ni affichées ni reportées, et c'est assumé.

Les appels `_crMobTable(…, 'co')` et `(…, 'po')` sont partis **avec** les
champs : laissés en place, ils chercheraient des identifiants inexistants sans
rien rendre — du code mort qui fait croire que la mobilité remonte deux fois.
Le Rachis garde les siennes : il n'a pas d'équivalent actif/passif.

La forme `[clé, libellé]` de `_crMobTable` ne servait qu'au poignet. Elle a été
retirée avec lui : un mécanisme qui ne sert plus est un piège pour la lecture
suivante.

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

Les branches « **appréciation** » — le menu par côté, quand il n'y a pas de
dynamomètre — ne disaient pas mieux : « Positif » y voulait dire l'inverse de
ce qu'il dit sur un Laslett, et le même mot rouge couvrait une baisse discrète
et un déficit franc. Elles suivent maintenant le testing manuel, en trois
paliers : **Force normale**, **Légèrement diminuée**, **Nettement diminuée**,
plus **Non testé**.

```bash
node qualite/appreciation-force-cas.js
```

**Les VALEURS n'ont pas bougé, et ne doivent jamais bouger.** Ces 46 menus
s'écrivaient `<option>Positif</option>`, sans attribut `value` : le texte
affiché ÉTAIT la valeur enregistrée. `Positif`, `Négatif` et `N/A` sont donc
écrits en clair dans les `donnees` de tous les bilans déjà en base. `APPR_FORCE`
associe à chacune son libellé, sa couleur et sa sévérité ; le palier ajouté
porte la valeur neuve `Légère`. Même règle que le catalogue TESTS{} : on ajoute,
on ne réécrit jamais l'identité.

**Le trou était dans les appelants, pas dans la table.** Cinq lignes de CR et
neuf lignes de plan de traitement comparaient `csA === 'Positif'` en direct :
un palier ajouté à la table ne les aurait pas atteintes, et une force
légèrement diminuée serait sortie du plan sans le moindre signal. Tout passe
désormais par `_statAppreciation` (le côté le plus atteint des deux),
`_apprTxt` (libellé au CR), `_apprUi` (couleur du menu) et `_apprDeficit`
(plan de traitement). Le fichier de cas échoue si une comparaison en dur
réapparaît.

**Un déficit léger reste à renforcer.** Le palier a été ajouté pour le
distinguer d'un déficit franc, non pour cesser de le traiter.

**Un test non fait n'est pas un test normal** : deux côtés à « Non testé » ou
vides ne produisent aucune ligne de CR. Sans cette distinction, un test jamais
réalisé s'annoncerait « Force normale » au médecin.

Les **vrais tests cliniques** — Laslett, Ottawa, ULNT, flexion debout/assis —
gardent Positif/Négatif : eux cherchent bien un signe.

**Un LSI supérieur à 100 % reste « Symétrique »** — côté atteint plus fort que
le sain. C'est la convention de toute l'application (voir l'asymétrie affichée),
et c'est une décision clinique : ne pas la changer sans le praticien.

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

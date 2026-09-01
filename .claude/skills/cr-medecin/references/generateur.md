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

### Deux types de courrier, et deux seulement

`crTemplate` vaut `debut` ou `suivi`. Il y en avait quatre : « Fin / RTS » et
« Avis » produisaient **exactement le même courrier** que « Suivi » — seul
l'objet auto-rempli changeait. Quatre gros boutons en tête de formulaire pour
une ligne de sujet.

**Seul `debut` est un vrai type** : il a son propre constructeur
(`crBuildDebutLetter`), sa propre ouverture, et il est le seul à rendre le bloc
Protocole. « Fin / RTS » ouvrait ce bloc dans le formulaire sans que le
courrier ne le lise : on remplissait trois champs dont rien ne sortait.
`showProto` ne regarde donc plus que `debut`.

**Changer de type doit régénérer le courrier.** `crSetTemplate` change de
CONSTRUCTEUR, et `crAutoFillObjet` écrit le champ par programme, donc sans
événement : l'écoute à la frappe ne voit rien. Le bouton « Générer » masquait
ce trou — on cliquait dessus juste après. Depuis sa disparition, la bascule ne
se voyait plus nulle part.

### L'aperçu se compose seul — plus de bouton « Générer »

```bash
node qualite/cr-apercu-vivant-cas.js
```

Le bouton ne validait rien : il rafraîchissait une vue. Et son oubli avait un
coût réel — `Copier`, `PDF` et `Mail` ne lisent pas le formulaire mais
`_crTexteCourant` / `_crHtmlCourant`, figés au dernier clic. Une correction
faite après coup partait chez le médecin sans y figurer, et rien ne le
signalait.

**Le point de vigilance tient en une phrase : ces deux variables doivent être
réécrites SUR LE MÊME CHEMIN que l'aperçu**, c'est-à-dire dans
`_crRefreshLettre`. Les recalculer ailleurs ramènerait la péremption de l'écran
vers le PDF — où personne ne peut plus la voir. Un cas de référence échoue s'il
existe une seconde écriture.

Les **graphiques** sont à part (`_crRefreshGraphiques`) : les redessiner à
chaque frappe serait du gâchis, et ils ne dépendent que de leurs propres cases.
`crGenerate` fait les deux et reste le point d'entrée quand il faut tout
refaire — bascule de destinataire, cases de graphiques.

**La composition INITIALE est inconditionnelle**, et vit dans
`_outilsOngletInitial` — appelée à `DOMContentLoaded`, donc après que tout le
script inline a fini de s'exécuter. Elle avait d'abord été accrochée à
`_crTenterImport`, qui ne s'exécute QUE si un import est en attente : à
l'arrivée ordinaire sur la page, rien ne composait l'aperçu. Il restait vide
jusqu'au premier clic, lequel déclenchait l'écoute à la frappe et donnait
l'illusion que le mécanisme fonctionnait.

**Une écriture programmatique n'émet aucun événement**, donc l'écoute déléguée
ne la voit pas. Quatre endroits appellent `_crMajDifferee()` à la main :
association des infos patient, arrivée des tests du bilan (au chargement et sur
`storage`), et remise à zéro. Sans eux, l'aperçu resterait sur le patient
précédent — le défaut même que le bouton causait.

**« Associer les infos patient » RESTE.** L'association est déjà automatique au
changement de patient ; ce bouton est la voie de rattrapage, et elle a une
raison d'être : l'association ne s'exécute qu'une fois, exprès, pour ne pas
écraser une correction manuelle. La rendre continue réécrirait la saisie du
praticien en direct.

**La clé `G:` a quitté `_crSignature`.** Elle disait « un courrier a été
généré » : c'est désormais toujours vrai, la valeur serait constante, et elle
ferait passer le CR pour entamé dès l'ouverture.

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

### Le ton d'une ligne n'invente pas de jugement

« Aucune compensation » — le meilleur résultat possible — sortait en **orange**.
Deux causes, à deux étages, et corriger l'une seule n'aurait rien réglé :

- le bilan ne colore pas cette ligne : son ton est `muted`, ce qui veut dire
  « rien à signaler », pas « attention ». `niveau` arrivait donc **vide** ;
- `_crTagClasse` retombait alors sur son défaut, et **ce défaut était l'ambre**.

`_crMedResumeTests` pose désormais `niveau:'ok'` en même temps que le statut
« Aucune compensation », et le défaut de `_crTagClasse` est un ton **neutre**.
L'ambre est un jugement : le rendre par défaut signalait au médecin une alerte
que le praticien n'avait pas posée.

La classe `neutre` a son style dans les **deux** rendus — `.lt-chip` du courrier
et `.cr-tf-tag` de la liste à cocher. Écrite d'un seul côté, la pastille perd
son fond sans que rien ne le signale.

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
  **verte**, et le test **reste dans sa section** : il emprunte la grille, il
  ne devient pas une analyse fonctionnelle.

### Critères conditionnants — le courrier tranche, le bilan détaille

```bash
node qualite/reception-acquis-cas.js
```

Un critère marqué `acquis:true` dans `CRITERIA_REC` **conditionne la réussite**
du test ; les autres sont observés à titre indicatif. Le courrier n'énumère plus
les conditionnants — leur détail n'apprend rien au médecin, qui veut savoir si
le test est passé : `_crMedCriteres` les remplace par **« Acquis » / « Non
acquis »** et ne laisse en sous-lignes que les indicatifs (valgus dynamique,
contrôle du tronc), qui eux orientent le travail.

**Le rôle est porté par le critère, jamais par sa position.** « Les trois
premiers » cesserait d'être vrai le jour où un critère serait inséré, et le
verdict changerait sans que personne ne s'en aperçoive.

**Les DEUX côtés comptent** — décision du praticien. Un conditionnant manque
d'un côté ou de l'autre, et le test n'est pas acquis : il se passe sur chaque
jambe. Le badge du bilan, lui, ne lit que le côté atteint ; ne pas l'aligner
sans le praticien.

**Un critère indicatif VALIDÉ ne se dit pas non plus.** Le courrier énonce ce
qui fait défaut, pas ce qui va bien — la règle des compensations, appliquée
ici. Ne sortent donc que les indicatifs qui manquent d'au moins un côté.

**Les côtés sont INVERSÉS au passage.** Dans la grille, une pastille marque un
critère *réussi* ; dans le courrier, la ligne n'existe que parce qu'il manque,
et la pastille doit désigner le côté **où il manque**. La transmettre telle
quelle la poserait sur le côté sain. `afMode` bascule donc en `compensation` :
c'est ce que ces lignes disent désormais, et c'est ce qui leur donne la
pastille rouge du défaut plutôt que la verte de la réussite.

**Le libellé suit** (`defaut:` sur le critère) : « Contrôle du tronc (TSB) »
sous une pastille rouge ne dit pas si le contrôle est présent ou absent. Il
devient « Contrôle du tronc insuffisant ».

**La zone se décide sur `v.af.mode`, pas sur `_entree.afMode`** — ce dernier
décrit ce que les lignes transmises veulent dire, et `_crMedCriteres` le
bascule. La section du Test de Réception dépend de sa GRILLE, pas de ce qu'on
en tire.

**Le NIVEAU suit le verdict, pas le décompte.** Il venait de la pastille du
bilan — « 3/5 » y vaut `warn`, donc un badge ambre — alors que le courrier
n'annonce plus « incomplet » mais « non acquis » : un verdict binaire ne se
nuance pas en orange.

**La synthèse chiffrée part avec eux.** « Côté sain 5/5 » compte cinq critères
alors que le courrier n'en montre plus qu'un ou deux — souvent aucun.

**L'attribut voyage entre deux fonctions** : la grille écrit `data-crit`,
`_crMedAnalyseFonc` le relit. Un nom qui diverge ne casse rien — plus aucun
critère n'est conditionnant, et le test est déclaré « Acquis » quoi qu'il
arrive. Un cas de référence fait le trajet complet.

Le bilan garde sa grille entière et son score : c'est le praticien qui la lit.
Même partage que le score sur sept de l'analyse fonctionnelle.

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

**Une grille d'analyse fonctionnelle n'impose ses colonnes que si elle est
SEULE.** Un groupe qui n'est que de l'AF n'a aucune cellule de mesure : le
filtre rendrait un tableau sans colonne et les pastilles n'auraient nulle part
où se poser — d'où la substitution par les libellés relus de la grille. Mais
elle s'appliquait dès qu'UNE ligne du groupe portait une grille : le Test de
Réception emprunte celle-ci tout en restant parmi les tests chiffrés, et sa
seule présence faisait passer « Gauche | Droit | Asym. » à « Côté sain | Côté
atteint ». L'asymétrie disparaissait de tout le groupe, et les valeurs mesurées
se retrouvaient sous des intitulés qui ne les décrivent pas — un côté nommé de
travers dans un document médical. La substitution est donc conditionnée à
l'absence totale de mesure dans le lot.

Une cellule **vide ne compte pas**, sans quoi une colonne entièrement vide
survivrait — des en-têtes au-dessus de rien. Sans colonne de côté, celle qui
reste se nomme « Observation » et s'aligne à gauche : ce ne sont plus des
chiffres.

**`zone` peut manquer.** `r4p-cr-med-tests` est un contenu de `localStorage`, et
celui d'un praticien peut avoir été écrit par une version antérieure du bilan.
Sans repli, `b.txt.toUpperCase()` levait une exception et **aucun courrier ne se
générait** — le formulaire restait muet, sans dire pourquoi.


## Les champs qui grandissent ne se MESURENT pas

```bash
node qualite/cr-champs-texte-cas.js
```

`crAutoExpand` écrivait une hauteur en pixels — `el.style.height =
el.scrollHeight + 'px'` — mesurée à la largeur qu'avait le champ **à cet
instant**, puis plus rien ne la recalculait. Une fenêtre élargie ensuite, un
panneau pas encore dimensionné, une iframe masquée au moment de la passe : la
hauteur figée n'a plus de rapport avec le texte, et la Synthèse clinique comme
le Plan de traitement deviennent des pavés vides. Ils portent
`overflow-y:hidden` et `resize:none` — rien ne permet de rattraper à la main.

Exactement le défaut des consignes du builder, refermé de la **même** façon :
`.cr-ta-grow` porte un pseudo-élément avec le même texte (`data-repl`) dans le
**flux normal**, et le champ se pose **par-dessus en absolu**. Aucune mesure,
donc aucune dépendance à la largeur du moment, et la hauteur suit tout
redimensionnement gratuitement.

**Les deux boîtes doivent rester identiques** — police, corps, interligne,
marge intérieure, largeur de bordure, `box-sizing`. Elles partagent une seule
déclaration, et le fichier de cas échoue si l'une s'en détache : un pixel
d'écart fausse la hauteur.

**Seule la COULEUR de la bordure est neutralisée sur la doublure**, jamais la
bordure entière. En `border-box` elle mange la largeur du contenu : la retirer
replierait le texte une colonne plus loin que dans le champ. Et écrire `border:`
en bloc effacerait la bordure visible du champ — `.cr-fg textarea` et
`.cr-ta-grow > textarea` ont la **même spécificité**, seul l'ordre les
départage.

**`data-repl` se met à jour EN PREMIER dans le `oninput`.** Placé après
`crAutoExpand`, une exception dans ce qui précède figerait la hauteur en
silence et le champ cesserait de grandir à la frappe.

Le nom `crAutoExpand` est conservé : trois `oninput` et la remise à zéro
l'appellent, et un appel programmatique doit continuer de synchroniser la
doublure.


## L'EVA doit dire son nom

```bash
node qualite/cr-eva-cas.js
```

La note de douleur est rangée sous **« Signes cliniques »**. Le préremplissage
depuis le bilan écrit « EVA repos : 4/10 » et se lit très bien ; mais **saisie
à la main** la valeur arrive nue — « 4 » — et devient un signe clinique **sans
nom** : le médecin voit un chiffre, et rien qui dise ce qu'il mesure.

Elle est nommée **à la source**, dans `_crEvaRetenue`, jamais aux deux endroits
qui la posent dans le courrier — médecin et patient sont construits par deux
fonctions distinctes, et une règle écrite d'un seul côté disparaît de l'autre
sans le moindre signal. Le fichier de cas échoue si l'un des deux se met à
nommer l'EVA de son côté.

**Le préfixe ne se met que s'il manque** (`/eva/i`) : le doubler donnerait
« EVA : EVA repos : 4/10 ».

**Un nombre SEUL devient une note sur dix** — c'est ce que dit le champ
(« EVA repos : …/10 ») et l'échelle n'en admet pas d'autre. Tout le reste est
**nommé sans être réécrit** : « 4/10 », « 3-4 », « 4 au repos, 7 en charge » et
« 12 » gardent leur forme. La virgule décimale française est acceptée.


## La configuration globale — lire et écrire la MÊME ligne

```bash
node qualite/cr-config-globale-cas.js
```

Les articulations réglées à la main — les amplitudes actives et passives de
l'épaule — disparaissaient puis revenaient, **sans qu'aucune erreur ne
s'affiche**.

La lecture demandait `templates?nom=eq.__cr_config__&is_public=eq.true&limit=1`
**sans tri**. Postgres ne promet alors aucun ordre, et celui-ci **change dès
qu'une ligne est réécrite** — un PATCH la déplace dans le tas. L'écriture, elle,
visait l'identifiant mémorisé dans le navigateur (`r4p-cr-config-sid`).

Dès qu'il existe **deux** lignes de configuration, on relit donc tantôt l'une
tantôt l'autre en écrivant toujours dans la même.

Trois choses ferment le trou, et il en faut trois :

- un **ordre stable** (`order=id.asc`) et toutes les lignes, pas une au hasard ;
- **le même choix pour tous les postes** — `rows[0]` après tri. Préférer « la
  ligne où ce navigateur écrit » est tentant, et c'est l'erreur : pour une
  configuration **globale**, chaque poste retiendrait sa ligne et deux appareils
  afficheraient durablement deux configurations différentes ;
- `_crConfigSupaId` **réaligné** sur la ligne lue, ce qui fait converger la
  lecture et l'écriture.

**Les doublons cessent d'être muets** : leur présence s'annonce en console avec
l'identifiant retenu. Ils ne sont **pas supprimés** — effacer une configuration
qu'on n'a pas lue serait pire que la laisser dormir.

**Une seule ligne est insérée**, et seulement faute de ligne connue : chaque
sauvegarde qui insérerait créerait un doublon de plus, c'est-à-dire la cause.


### Le repli local ne doit pas se faire en silence

Quand aucune ligne n'existe en base, la configuration retombe sur
`localStorage`. C'est un **repli**, pas un mode de fonctionnement :
`localStorage` est propre à une **origine** *et* à un **appareil**. La même
application vue sur `app.rehab4perf.com` et sur `rehab4perf.netlify.app` n'a pas
le même stockage, et un iPad n'a pas celui d'un Mac.

Deux postes affichent alors durablement deux configurations différentes — c'est
ce qui s'est vu : l'iPad montrait les amplitudes actives et passives de l'épaule
et douze articulations, le Mac les cinq mesures par défaut.

La **sauvegarde** prévenait déjà par un toast quand elle ne pouvait pas se
synchroniser ; la **lecture** ne prévenait de rien. Elle le dit maintenant en
console, avec le geste qui répare : ouvrir la configuration du CR et
l'enregistrer une fois, en étant connecté.


### On n'annonce que ce qui est FAIT

« Config sauvegardée pour tous les utilisateurs » s'affichait **même quand rien
n'avait été écrit**, et de deux façons :

- l'**insertion** posait le message hors de tout `r.ok` : une ligne refusée se
  disait enregistrée ;
- la **mise à jour** se contentait de `r.ok`, or PostgREST rend `204` quand
  l'identifiant ne correspond à **aucune** ligne. Un identifiant périmé dans le
  navigateur, et la configuration partait dans le vide, annoncée comme sauvée.

**Constaté** : la table ne contenait **aucune** ligne `__cr_config__` alors que
la sauvegarde s'était dite réussie. C'est la même faute que le webhook Strava,
où un `200` rendu à tort perd l'activité.

`return=representation` sur les **deux** verbes rend les lignes touchées : leur
nombre est la seule preuve du travail. Zéro ligne sur une mise à jour veut dire
que la ligne visée n'existe plus — on insère alors, **une seule fois**, après
avoir oublié l'identifiant périmé. Sans cet oubli, chaque sauvegarde suivante
repartirait dans le vide.

Un refus donne le **statut** dans le message et le **motif** en console : sans
lui, il ne reste rien à quoi se raccrocher.


## Un clic n'émet ni `input` ni `change`

```bash
node qualite/cr-patho-apercu-cas.js
```

Une pathologie choisie n'apparaissait **jamais** dans le courrier. Deux choses
se combinaient, et il fallait les deux :

- la délégation qui reconstruit l'aperçu écoute `input` et `change` dans
  `#panel-cr`. **Un bouton n'émet aucun des deux** — ajouter une articulation,
  en retirer une, basculer une pathologie sont des clics ;
- la fonction que ces trois gestes appelaient, `crUpdateBlocks`, avait un
  **corps vide**. Elle montrait ou cachait des blocs du formulaire selon la
  pathologie ; le dernier de ces blocs a été retiré, et elle est restée — nom,
  appelants et commentaire intacts, effet nul.

C'est la forme la plus discrète de code mort : une fonction qui **garde son nom
et ses appelants en perdant sa raison d'être**. Rien n'échoue, rien ne se voit ;
les cinq points d'appel continuent de l'appeler dans le vide.

Elle s'appelle désormais `crUpdateAfterChange` et refait le courrier. Le nom dit
ce qui reste à faire, et le fichier de cas échoue si son corps redevient vide —
la panne étant précisément qu'un corps vide ne se remarque pas.

**Corollaire pour la suite** : tout geste du CR qui n'est pas une frappe doit
appeler cette fonction. La délégation ne rattrapera ni un clic, ni une écriture
programmatique — c'est le même piège que les cases des graphiques d'évolution.

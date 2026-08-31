---
name: graphiques-evolution
description: Graphiques d'Évolution de Rehab4Perf — les trois constructeurs SVG de js/bilan.js, l'en-tête chiffré des cartes, le placement des étiquettes, et la récolte de ces graphiques par le courrier au médecin. À utiliser dès qu'il est question de l'onglet Évolution, d'une courbe, d'un graphique, d'une sparkline, du suivi d'une mesure dans le temps, de la progression d'un patient, ou d'inclure des graphiques dans le CR.
---

# Graphiques d'Évolution

Une carte d'Évolution porte un chiffre puis une courbe. Le point à ne jamais
perdre de vue : **le CR du médecin ne redessine rien, il recopie le SVG de la
carte** — toute correction faite ici part directement dans le courrier.

## Graphiques d'Évolution — une carte, un chiffre puis une courbe

```bash
node qualite/evolution-graphiques-cas.js
```

**Le CR du médecin ne redessine rien : il RECOPIE le SVG de la carte.**
`_crGetEvoSectionHtml` (`outils.html`) prend `.evo-chart-kpis`, puis
`card.querySelector('svg')` — **le premier `<svg>` de la carte**. Deux
conséquences à ne jamais perdre de vue : toute correction apportée aux
constructeurs part directement dans le courrier, et **l'en-tête chiffré doit
rester du HTML**. Une sparkline glissée avant le graphique priverait le médecin
de ses axes et de ses dates, sans le moindre signal. Le fichier de cas vérifie
qu'aucun des trois helpers d'en-tête n'émet de `<svg>`.

**L'en-tête chiffré remplace l'ancienne ligne plate.** Une mesure prise quatre à
huit fois en six mois n'est pas une série temporelle : c'est une valeur courante
et un sens. `_evoStatSingle` rend le chiffre du jour en grand, l'écart depuis le
premier bilan et la valeur de départ ; `_evoStatDual` rend trois figures — les
deux côtés et l'asymétrie. Quatre chemins les appellent (groupes standards,
tests qualitatifs, tests personnalisés simples et doubles) : ne pas reconstruire
une chaîne à la main, c'est la seule façon de garder la même lecture partout.

**La FLÈCHE dit le sens de la VALEUR, la COULEUR dit si c'est un PROGRÈS.** Une
EVA qui passe de 7 à 1 s'écrit « ▼ −6 » en vert. Les confondre donne « ▲ −6 »,
qui se lit de travers — c'est l'erreur du premier jet, et un cas de référence la
tient.

**Les étiquettes ne se posent plus sur le tracé.** Elles étaient placées
inconditionnellement au-dessus du point (`p.y - 9`, `p.y - 12`) : sur une courbe
qui monte, celle du premier point tombe SUR la ligne. `_evoLabelDy` suit
désormais la pente locale, et `EVO_HALO` pose un liseré blanc qui détache le
texte de la courbe comme de la grille.

**Suivre la pente ne suffisait pas, et corriger l'un sans l'autre échange une
collision contre une autre.** Un point posé au bas du cadre envoie son étiquette
DANS la rangée des dates ; posé en haut, il l'envoie hors du cadre. Le bord la
renvoie donc de l'autre côté — d'où les bornes `PAD.top` / `VH-PAD.bottom`
passées à chaque appel. Le fichier de cas échoue sur un appel sans bornes.

**Les étiquettes extrêmes s'ancrent VERS L'INTÉRIEUR** — et les dates aussi.
Centrée sur le premier point, une étiquette empiète sur la gouttière des
graduations : la graduation la plus basse chevauchait la première date dans
**les trois** graphiques. Centrée sur le dernier, elle sort du cadre.

**Trois constructeurs, pas un.** `_buildChartB` (une série), `_buildChartD`
(deux séries) et `_buildQualChart` (scores qualitatifs) portaient les mêmes
défauts. Le troisième n'est apparu que parce que le patch comptait ses
occurrences : une correction appliquée à deux d'entre eux passe inaperçue.

**Dans le graphique qualitatif, les DEUX séries écrivaient au même endroit,
dans la même encre.** Sur un score entier 0..5 les deux côtés valent souvent la
même chose : les deux libellés se superposaient exactement. Le côté A écrit
désormais au-dessus, le côté B en dessous ; l'en-tête de carte nomme les deux
côtés dans leur couleur.

**Le texte porte un jeton d'encre, jamais la couleur de la série** — c'est la
pastille voisine qui porte l'identité. La légende de `_buildChartD` était écrite
dans la couleur de sa courbe.

**Les bézier ont disparu.** `_buildChartD` traçait droit, `_buildChartB` et
`_buildQualChart` traçaient en courbe : deux grammaires pour la même donnée. Et
une bézier invente entre deux bilans une courbure qui n'a jamais été mesurée.

**Trois feuilles de style, jamais une seule** : `bilan.html` (l'application),
la chaîne `var css` de `js/bilan.js` (l'export du bilan) et celle
d'`outils.html` (le courrier au médecin). Une règle écrite d'un seul côté ne se
voit pas là où le document est lu. Le fichier de cas contrôle les trois.

**Toutes les courbes sont cochées à l'ouverture** (`checked`, plus de
`evo-unselected` au rendu). Le CR n'en est pas affecté : `_crGetEvoCards`
renvoie toutes les cartes, sélection ou non.

**Le panneau « Inclure les graphiques d'évolution » du courrier ne se masque
plus.** Il se cachait quand le patient n'avait pas deux bilans — et masquer est
**indiscernable d'une panne** : le praticien ne peut pas savoir si la fonction a
disparu ou si elle ne s'applique pas à ce patient. Il reste en place, la case
désactivée et la raison écrite, comme le fait déjà `cr-pevo-status`.

**Sa visibilité n'était calculée QU'au changement de sous-onglet.** Le seul
appelant de `_crUpdateEvoPanel` était le crochet de `showTab` — donc une seule
fois en pratique, à `DOMContentLoaded`, quand l'iframe du bilan n'a encore
chargé aucun bilan. Sélectionner un patient ensuite ne la rejouait jamais : le
panneau restait vide tant qu'on ne quittait pas l'onglet pour y revenir. Quatre
moments l'appellent désormais — crochet de sous-onglet, arrivée de l'import,
arrivée des tests par `storage`, changement de patient — et le fichier de cas
échoue si l'un d'eux disparaît.

**Cocher une courbe doit la faire APPARAÎTRE — et ce chemin n'existait pas.**
L'aperçu se recompose à la frappe (`_crMajDifferee` → `_crRefreshLettre`), mais
les graphiques ont volontairement leur propre chemin : ils ne dépendent que de
leurs cases, et les redessiner à chaque caractère serait du gâchis. Le
gestionnaire délégué écartait donc `cr-evo-toggle` et `cr-pevo-toggle` par un
`return`, sous un commentaire affirmant que leur `onchange` appelait
`crGenerate`. **C'était faux** : ni `_crOnEvoToggle` ni `crOnPevoToggle` ne
l'appelaient. Tant que le bouton « Générer » existait, on cliquait dessus juste
après et le trou ne se voyait pas ; depuis sa disparition, cocher une courbe ne
faisait plus rien du tout. Même piège que la bascule de type de courrier et que
la composition initiale, refermés au même endroit.

La délégation porte maintenant sur **les deux panneaux entiers**
(`#cr-evo-panel, #cr-pevo-panel`), pas sur deux identifiants : une case ajoutée
au sélecteur demain est couverte d'office.

**Et une écriture programmatique n'émet aucun événement**, donc la délégation ne
la voit pas. Quatre chemins appellent `_crRefreshGraphiques()` à la main :
`_crEvoCheckAll`, `_crPevoCheckAll`, `_crOnEvoToggle`, et `_crBuildPevoSelector`
— ce dernier parce que les cartes du programme arrivent du parent par
`postMessage`, bien après le clic. Le fichier de cas exécute le **vrai** corps du
gestionnaire délégué, pas une copie, et vérifie les quatre appels manuels.

**Le courrier part VIDE de graphiques.** Les deux sélecteurs — courbes du bilan
et graphiques du programme — arrivaient tout cochés. Un patient suivi longtemps
porte plusieurs dizaines de courbes : le courrier au médecin les emportait
toutes, c'est-à-dire plus rien de lisible. Le sens de l'action est inversé : on
**choisit ce qu'on joint**, on ne retranche pas d'un tout. `prev` reste consulté
dans `_crBuildEvoPicker` — rebâtir le sélecteur ne doit pas défaire un choix
déjà fait.

À ne pas confondre avec l'onglet **Évolution du bilan**, où toutes les cartes
sont cochées d'office : là, c'est le praticien qui regarde son propre écran, et
il veut tout voir. Ici, c'est un document qui part chez un tiers.

**Les règles de la section « graphiques » n'existaient QUE pour le PDF.** Les
dix-neuf règles `.cr-evo-*` et `.evo-*` vivaient dans la chaîne CSS de la
fenêtre d'export, et nulle part ailleurs : **l'aperçu à l'écran rendait cette
section sans aucun style**. Le défaut était invisible tant que l'en-tête portait
ses couleurs en `style=` inline ; dès que la mise en page a dépendu des classes,
tout s'est écrasé sur une ligne — « Atteint24rép+71%Sain23rép… ».

Elles vivent désormais dans **`CR_LETTRE_CSS`**, déjà injecté dans les DEUX
rendus (`crInjecterCssLettre` pour l'écran, concaténation pour l'export). Une
seule définition : ce trou-là ne peut plus se rouvrir, et le fichier de cas
échoue si une copie réapparaît dans la chaîne d'export.

**`.cr-evo-svg` ne doit jamais porter `overflow:hidden`** — il le portait. Les
étiquettes de valeur débordent du `viewBox` par construction (`overflow:visible`
sur le SVG), et rogner couperait le chiffre du dernier point.

## Toute mesure fonctionnelle doit avoir sa courbe

```bash
node qualite/evolution-couverture-cas.js
```

Le Heel Rise n'était dans **aucun** des deux catalogues : ni `CHART_GROUPS`
(courbes de l'Évolution **et** blocs du Suivi rapide), ni `TRACKED_METRICS`
(deltas du bilan de suivi). Il ne manquait pas seul — **onze mesures** étaient
dans le même cas : Side Hop, Figure-of-8, temps de contact du Drop Jump, SEBT
postéro-latéral, Single-Leg Stance, mCKCUEST, PDSLRT, Shirado.

Une absence de ce genre est **indiscernable d'un patient sans données** : la
carte n'apparaît pas, et rien ne dit pourquoi. Deux catalogues tenus à la main,
alimentés par un formulaire qui grandit ailleurs — la dérive était inévitable.

Le contrôle part donc du **formulaire**, pas du catalogue : il lit les champs
chiffrés des trois pages de tests fonctionnels et échoue sur tout champ sans
courbe. Un test ajouté demain sans son groupe fait échouer le contrôle.

**Les ids lus par un `compute` sont récoltés en le FAISANT TOURNER** sur un
mouchard qui note chaque clé lue. Les lister à la main dans le contrôle
rouvrirait exactement le trou qu'il ferme.

**Les onglets de force sont couverts au même titre.** Vingt-huit champs
chiffrés n'avaient pas de courbe : préhension, trapèze inférieur, dentelé
antérieur, coude, force du rachis cervical et lombaire, et les six mesures
isocinétiques (quadriceps et ischios, force / puissance / résistance, en Nm).

**Le menu d'appréciation à côté des kg n'est PAS une courbe.** Chaque ligne de
force porte un `<select>` `-apr-ca` / `-apr-cs` qui dit la qualité du test.
C'est du texte : le praticien veut la **comparaison chiffrée des deux côtés**,
rien d'autre. Le contrôle relève tous les `<select>` de ces pages et échoue si
l'un devient source d'une courbe.

**À ne pas confondre avec les tests fonctionnels qualitatifs.** Réception et
Pliométrie qualitative sont des scores de critères cochés — des tests à part
entière, pas la colonne d'appréciation d'une mesure. Décision du praticien :
ils **gardent** leurs cartes d'Évolution, et le contrôle échoue si elles
disparaissent.

**Ce qui est volontairement hors courbe** — et nommé dans le contrôle, jamais
implicite : conditions de passation (hauteur de boîte, charge du PSET),
longueurs de membre qui servent à normaliser (mSEBT, UQYBT, envergure du
mCKCUEST), et essais individuels moyennés ailleurs (ULRT, mCKCUEST S0/S1/S4).

**Un sous-score absent ne vaut pas zéro.** Le SLST se lit en nombre d'erreurs :
un bilan où le test n'a pas été passé rendrait `0` — un score parfait inventé,
et le meilleur point de la courbe. Les deux `compute` rendent `NaN` tant
qu'aucune des six lignes n'est renseignée.

**Le premier graphique double « moins = mieux ».** Les 41 graphiques doubles
existants étaient tous en `dir:'up'`, et l'asymétrie s'écrit `atteint / sain`.
Sur un test **chronométré** — Figure-of-8, temps de contact — le côté atteint
est plus **lent** : 3,0 s contre 2,5 s donnait 120 %, au-dessus du seuil de 90,
donc **affiché en vert** pendant que le patient est 20 % plus lent du côté lésé.
Le rapport s'inverse pour `dir:'down'`. Le cas exécute le vrai calcul.

**Le Suivi rapide injectait le temps de contact à la main**, faute de graphique
— avec un commentaire qui le disait. Il en a un désormais : garder l'injection
poserait **deux champs portant le même id** dans le formulaire, dont un seul
serait relu. Toute mesure qui gagne son groupe doit perdre son injection.

**Point ouvert, non corrigé** : `_robustFence` (MAD × 10) écarte du tracé toute
valeur qu'elle juge aberrante. Sur une série stable, la MAD est minuscule — et
une VRAIE dégradation disparaît de la courbe. Mesuré : `[45, 44, 46, 45, 44,
20]` écarte le 20, soit une perte de 55 % rendue invisible, dans l'onglet
Évolution **et** dans le courrier. C'est une décision clinique : ne pas la
changer sans le praticien.

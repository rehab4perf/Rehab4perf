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

**Synthèse et plan sont deux propos distincts.** Le plan sortait en paragraphes
nus juste sous l'encadré de conclusion : le lecteur ne voyait plus où finissait
l'une et où commençait l'autre. Ce sont deux encadrés **jumeaux** (`.lt-bloc` +
`.lt-concl` / `.lt-plan`), chacun avec son intitulé. L'un dit où en est le
patient, l'autre ce qui va être fait.

Le premier s'appelle **« Synthèse clinique »** — « Conclusion » ne disait pas de
quoi. Ce nom existe en **deux exemplaires**, le rendu HTML (écran et PDF) et le
rendu texte (copie, mail) : changé d'un seul côté, il ne se voit pas là où
l'autre est lu. Un cas de référence tient les deux.

**Le filet vertical demeure, l'aplat de fond est parti** — décision du
praticien. Sur papier, un aplat gris est ce qui vieillit le plus mal, et il
alourdissait deux blocs déjà signalés par leur filet et leur intitulé. Deux
filets horizontaux très fins les bornent à la place. Chaque bloc garde SA
couleur de filet et de titre : c'est ce qui les distingue l'un de l'autre.

**Une SECTION entière ne se coupe pas.** Le titre d'intertitre et ses tableaux
sont **frères** dans le balisage, pas imbriqués : `break-after:avoid` sur le
titre le retient avec la première ligne qui suit, mais rien ne retenait la
section entière — un bloc « Tests de force » pouvait commencer en bas d'une
page et finir sur la suivante. `_crBlocsHtml` enveloppe donc chaque intertitre
**avec son contenu** dans un `.lt-grp`, fermé au suivant, avant le pied de
lettre, et en fin de courrier.

Contrepartie assumée : une section plus haute qu'une page est reportée en
entier, laissant un blanc en bas de la précédente ; le navigateur la coupera
quand même si elle ne tient sur aucune page. **Un blanc se lit mieux qu'un
tableau coupé.** Le pied de lettre est explicitement sorti du groupe — il a
déjà `.lt-fin`, et l'y enfermer le collerait à des mesures.

**L'export doit imprimer la même chose sur iPad et sur ordinateur.** Trois
manques faisaient diverger les deux, et ils se cumulaient :

- **Aucune balise `viewport`** : Safari iOS suppose alors une page de 980 px et
  met **cette** largeur à l'échelle du papier — le contenu, large de 680 px,
  n'occupait que ~69 % de la feuille.
- **Aucun `-webkit-text-size-adjust`** : iOS gonfle de lui-même les tailles
  quand il juge la page étroite. Or la boucle d'ajustement **fixe** une taille
  en pixels puis mesure la hauteur obtenue — le facteur appliqué par-dessus
  rendait la mesure sans rapport avec ce qui est imprimé.
- **La boucle avançait par `requestAnimationFrame`**, qui ne se déclenche pas
  dans un onglet en arrière-plan — et sur iPad l'onglet d'export s'y ouvre
  souvent. Elle s'arrêtait à mi-chemin, ou n'appelait jamais l'impression. Elle
  garde le rAF quand il répond et retombe sur un `setTimeout` sinon, avec une
  butée de quarante tours : une boucle d'ajustement ne doit jamais pouvoir
  tourner sans fin sur un contenu qui ne rétrécit plus.

```bash
node qualite/cr-coupures-cas.js
```

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

**Le pied courant ne s'imprime PAS sur iOS.** `position:fixed` n'est répété sur
chaque page que par les moteurs de **bureau**. WebKit mobile pose l'élément une
seule fois, là où il tombe — observé : une ligne grise en travers d'un tableau
de mesures, au milieu de la page 2 du CR d'un patient.

Il n'existe aucun test de fonctionnalité pour « ce moteur d'impression
répète-t-il les éléments fixes ». On identifie donc la plateforme, et sur iOS le
pied **n'est pas émis du tout** — pas seulement masqué : un élément masqué reste
dans le document, et une règle d'impression peut le ramener. iPadOS se déclare
« Macintosh » depuis la version 13, d'où le second test sur `maxTouchPoints`.

Compromis assumé : une feuille sans identification vaut mieux qu'une ligne grise
en travers des résultats.

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


## Le filet de fin d'une analyse fonctionnelle

```bash
node qualite/reception-cotes-cas.js
```

Une ligne d'analyse fonctionnelle est un **groupe** : un parent
(`tr.lt-af-par`) suivi de ses sous-lignes (`tr.lt-af-sub`). Ni l'un ni les
autres ne portent de filet — c'est ce qui les rattache visuellement. Le filet
qui **ferme** le groupe est porté par la ligne **suivante** :
`tr.lt-af-sub + tr:not(.lt-af-sub) td { border-top }`.

**Un parent sans aucune sous-ligne n'est donc jamais fermé.** Cette règle ne
s'applique pas — il n'y a pas de `.lt-af-sub` avant — et le test se colle au
suivant, sans séparation. C'est exactement le cas de la Qualité de réception
dès qu'aucun critère indicatif ne fait défaut, c'est-à-dire **quand tout va
bien** : le bon résultat était le seul mal rendu.

`tr.lt-af-par:not(:has(+ tr.lt-af-sub))` rend le filet **et** la marge basse —
rognée à 1 px pour coller le parent à ses sous-lignes, elle plaquait le texte
contre le filet en leur absence. Un moteur sans `:has()` ignore la règle et
retrouve le rendu d'avant : jamais pire.

**Ne jamais poser ce filet sur `tr.lt-af-par` tout court** : le groupe se
couperait en deux, et deux filets se superposeraient à sa fin.


## Le pied courant mord sur le texte — il faut lui réserver sa bande

```bash
node qualite/cr-pied-lettre-cas.js
```

La salutation et la signature disparaissaient du PDF. Le texte, lui, était bien
là : l'aperçu et l'export lisent la **même** chaîne (`_crHtmlCourant`), et le
pied de lettre en sort correctement fermé, **hors de tout groupe insécable** —
le fichier de cas le vérifie en exécutant le vrai constructeur, pas en lisant le
code.

La perte se joue à la **mise en page imprimée**. `#cr-runfoot` est
`position:fixed` : en impression paginée son bloc de référence est la **zone de
contenu**, pas la feuille. `bottom:4mm` le pose donc 4 mm au-dessus du bas du
**texte**, dans le flux, sur chaque page.

Et la règle d'impression mettait `#cr-page` à `padding:0!important` — elle
annulait les 40 px de marge basse de l'écran **sans rien remettre**. La bande
occupée par le pied courant n'était réservée par personne : les dernières lignes
s'y retrouvaient recouvertes, et là où elles tombaient sur la frontière,
chassées de la page.

`padding: 0 0 12mm` la réserve — les 4 mm de décalage, la ligne de 7,5 pt, et de
quoi ne pas la frôler.

**Vérifié par lecture et par exécution, pas par une impression réelle** : je ne
peux pas lancer d'impression depuis ce poste. Si le défaut persistait, la
question qui départage : la salutation manque-t-elle **déjà dans l'aperçu de la
fenêtre d'export**, ou seulement dans le PDF produit ?

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

**La Course interne du mollet a changé de page.** Elle était saisie sur la page
Pied, parmi les tests orthopédiques : le filtre par page l'écartait du CR
médecin, et rien ne la suivait dans l'Évolution. C'est pourtant une mesure de
hauteur de montée sur pointes comparée entre les deux côtés — de même nature
que le Heel Rise. Elle vit désormais dans **Tests Fonctionnels MI**, juste
après lui, et remonte donc par le filtre ordinaire.

Une liste explicite (`CR_MED_CLES`) avait d'abord été posée pour la faire
remonter depuis la page Pied. Le déplacement l'a rendue inutile : elle a été
**retirée**, un mécanisme qui ne sert plus étant un piège pour la lecture
suivante.

**Les identifiants de champ n'ont PAS changé** (`pi-cim*`) : les bilans
enregistrés la retrouvent telle quelle. C'est la seule chose à ne jamais
toucher en déplaçant un test.

`qualite/lsi-cas.js` découpait sa tranche entre `pied--cliniques` et
« Navicular Drop Test ». Après le déplacement, cette tranche était **vide** et
les deux garde-fous passaient à vide — un test vert qui ne teste plus rien. Il
borne désormais sur `fonctionnels--cim`, et vérifie d'abord que la tranche
contient bien le test.

**Un test à plusieurs mesures sort en sous-lignes.** `_crMedValeur` ne remontait
que la PREMIÈRE ligne du tableau : la Course interne du mollet en a trois —
2 appuis, 1 appui, effondrement — et les deux dernières se perdaient en
silence, dont celle qui porte le verdict. Chaque mesure devient une sous-ligne
avec ses valeurs, et les colonnes du groupe sont l'**union** de ce que les
lignes remplissent.

`CR_MED_PAGES` est la **source unique** : `_neGarderQueTF` (CR Tests) la
réutilise. Les deux listes existaient en double, dans un ordre d'écriture
différent — une page ajoutée à l'une aurait manqué à l'autre en silence.
## Intitulés des tests — le lexique complète, il ne remplace pas

`CR_MED_LEXIQUE` traduisait le nom du test **en le supprimant** : « Overhead
squat » devenait « Contrôle moteur global », qui ne dit ni quel membre ni quel
mouvement. Le médecin ne pouvait ni juger si le test répondait à sa question, ni
le refaire, ni en discuter.

Chaque entrée porte **deux champs utiles** — `[clé, fonction, geste]` :

- la **fonction** ouvre l'intitulé : elle se comprend sans jargon ;
- le **geste** part en petit sous l'intitulé, là où figure déjà « Repère
  EIAS-sol : 45 cm ». Sur la même ligne il doublait la hauteur de la colonne.
  Vide quand la fonction le porte déjà — « Capacité de saut en longueur sur un
  pied » n'a rien à ajouter.

Une colonne **protocole** a existé, qui suivait entre parenthèses : « Force
fonctionnelle du membre inférieur (SLS) ». Décision du praticien — elle
alourdissait l'intitulé sans rien apprendre au médecin. Elle est partie **avec
son unique usage** : un champ que plus personne ne lit finit par être recopié
de travers.

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

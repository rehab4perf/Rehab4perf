---
name: cr-medecin
description: Compte-rendu médecin de Rehab4Perf — le Générateur de CR d'outils.html, la lettre et son export PDF, les tableaux de mesures, le côté nommé, le marquage « réévalué », le lexique des tests et la mise en page du document imprimé. À utiliser dès qu'il est question du CR, du compte-rendu, du courrier au médecin ou au patient, de la lettre, du PDF envoyé, de ce que le médecin reçoit, des tests qui y remontent, de la synthèse clinique ou du plan de traitement — y compris pour une simple retouche de libellé ou de mise en page.
---

# Compte-rendu médecin

Ce que le praticien envoie au médecin ou au patient. Le CR est un document qui
sort du cabinet : une erreur de côté ou un test annoncé « réévalué » à tort y a
des conséquences réelles.

Trois rendus lisent les mêmes données — l'aperçu à l'écran, l'export PDF, et la
copie texte. Une règle écrite d'un seul côté ne se voit pas là où le document
est lu : c'est le piège qui revient le plus souvent dans ce domaine.

## Où lire quoi

Les deux sections ci-dessous mordent sur **toute** modification du CR — les lire
d'abord. Le reste se consulte quand on touche à la zone concernée.

| Fichier | Quand le lire |
|---|---|
| `references/generateur.md` | Le générateur : destinataire, type de courrier, aperçu vivant, colonnes et lots |
| `references/mise-en-page.md` | La mise en page du document imprimé : encadrés, listes, coupures de page, pied courant |
| `references/retest.md` | Le marquage « réévalué » : d'où il vient, ce qu'il change, et ce qu'il ne dit pas |
| `references/tests-remontes.md` | Quels tests remontent du bilan, et sous quels intitulés |

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

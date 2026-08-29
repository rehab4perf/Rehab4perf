---
name: verif-visuelle
description: Vérifier une mise en page de Rehab4Perf par la MESURE plutôt qu'à l'œil — banc d'essai construit sur les vraies fonctions et le vrai CSS du dépôt, rendu à 320/375/414/1280 px, détection chiffrée des chevauchements, débordements et hauteurs aberrantes. À utiliser dès qu'il s'agit d'un problème d'affichage, de mise en page, de responsive, de mobile ou de téléphone, d'éléments qui se chevauchent, débordent, sont coupés, mal alignés ou trop hauts, d'un graphique SVG, ou quand l'utilisateur envoie une capture d'écran d'un défaut visuel.
---

# Vérifier par la mesure

Un défaut de mise en page se juge mal à l'œil : un chevauchement de deux pixels
ne se voit pas sur une capture, et une capture ne dit pas si une hauteur est
figée en dur ou calculée. Toutes les corrections d'affichage de ce dépôt qui ont
tenu du premier coup sont venues d'un chiffre, pas d'un coup d'œil.

## Construire le banc sur le vrai code

`scripts/banc.js` extrait les feuilles de style et les fonctions **du dépôt**.
Recopier à la main le balisage qu'on veut tester revient à tester sa propre
copie : le banc reste vert pendant que le produit est cassé, et il ne voit pas
la correction qu'on vient d'écrire. C'est arrivé — un patch qui n'appliquait
rien est passé inaperçu parce que la maquette portait le code recopié.

```js
var B = require('./.claude/skills/verif-visuelle/scripts/banc.js');
var F = B.fns('js/bilan.js', '/* ── Détection outliers', 'function _buildQualGrid',
              ['_buildChartB', '_evoStatSingle']);
B.page('/tmp/banc.html', { css: B.css('programme.html'), corps: '…' });
```

`banc.js` échoue bruyamment si une borne a bougé, plutôt que de rendre une
tranche vide. `corpsDe()` extrait le **corps** d'un gestionnaire pour l'exécuter
avec des doublures — plutôt que d'en réécrire la logique, qui passerait au vert
quoi qu'il arrive.

Quand le balisage vient d'une fonction de rendu, la faire produire par cette
fonction, pas à la main.

## Servir et piloter

```bash
cd <dossier du banc> && nohup python3 -m http.server 8099 >/dev/null 2>&1 &
```

Puis `preview_start` sur `http://127.0.0.1:8099/banc.html`, `resize_window`
pour la largeur voulue, et `javascript_tool` pour mesurer. Ajouter `?v=N` à
chaque rechargement : le volet garde sa copie.

## Mesurer, pas regarder

`scripts/mesures.js` rend la liste des défauts : chevauchements texte/texte,
texte/tracé (testés au point, pas seulement par boîtes englobantes),
débordement horizontal. Sur son premier passage il a trouvé **dix**
chevauchements dont aucun ne se voyait sur une capture.

Pour un élément suspect, remonter la chaîne des parents en relevant largeur,
`display`, `flex` et `grid-template-columns` : c'est ce qui distingue « la
hauteur est fausse » de « la largeur est fausse et la hauteur en découle ».

Les mesures qui tranchent le plus souvent :

- `style.height` non vide → une hauteur **figée** par du JS, qui ne se
  recalculera pas ;
- `scrollHeight > clientHeight` → contenu **coupé** ;
- largeur de l'élément ≠ largeur du parent → le problème est en amont ;
- `documentElement.scrollWidth > innerWidth` → débordement de page.

## Les largeurs à couvrir

**320** (iPhone SE), **375** (iPhone standard), **414**, **1280**. Un défaut
n'apparaît souvent qu'à une seule : la barre du haut débordait de 29 px à 375 et
de 34 px à 320, avec deux causes distinctes, l'une masquant l'autre.

## Deux limites du volet, à connaître avant de conclure

**`requestAnimationFrame` ne se déclenche pas** — le volet est `hidden` du point
de vue de la page. Tout ce qui dépend d'un rAF y paraît cassé alors que
l'application est correcte. Vérifier `document.visibilityState` avant
d'incriminer le produit, et appeler la fonction directement pour tester sa
logique.

**Le recalcul de mise en page peut ne pas suivre** un `style.width` posé par
script. Préférer `resize_window`, qui provoque une vraie remise en page.

## Ce que ce banc ne voit pas

Il tourne sur un moteur de bureau. **Un défaut propre à WebKit mobile n'y
apparaît pas** : une doublure de hauteur posée dans une grille d'une seule
cellule s'y mesurait juste, alors que sur iPhone la piste se repliait sur
quelques caractères — un pavé vide sous un texte de cinq lignes. Deux
allers-retours ont été perdus à chercher une version périmée.

Donc : quand un défaut est signalé **sur téléphone** et que le banc ne le
reproduit pas, ne pas conclure que la correction est bonne. Faire d'abord lire
le numéro de version affiché en bas du Centre d'aide. S'il est à jour, chercher
une **divergence de moteur** — les suspects habituels sont le dimensionnement
intrinsèque (pistes de grille, `min-content`, éléments de formulaire) et tout ce
qui dépend d'une largeur calculée. Préférer alors une technique qui ne repose
pas sur le calcul suspect : un bloc dans le flux normal se comporte pareil
partout, une piste de grille non.

Le simulateur iOS supprimerait cet angle mort. Il exige Xcode complet, puis
`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` — commande que
seul l'utilisateur peut lancer.

## Après la correction

Mesurer de nouveau aux quatre largeurs, et fixer le résultat dans un cas de
référence (skill `cas-de-reference`) : la mesure prouve l'instant, le cas
protège la suite.

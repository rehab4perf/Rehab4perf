#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Lisibilité des courbes d'Évolution — deux réglages, TROIS constructeurs

   1. LA GRILLE PASSE AU SECOND PLAN. Quatre graduations pleines, dans le même
      gris que le cadre, pèsent autant que la courbe qu'elles servent. Deux
      graduations à 55 % d'opacité suffisent — l'axe porte déjà les chiffres.

   2. UN SEUL VERT DE SÉRIE. Le graphique DOUBLE traçait « Sain » en
      `var(--green)`, le QUALITATIF en `#16A34A` : deux cartes du même bilan
      dessinaient le même côté dans deux verts différents. Et c'est le plus
      employé des deux qui mesurait le plus mal.

      Mesuré par `validate_palette.js`, face au bleu du côté atteint :
        var(--green) #2D6A4F — plancher de chroma ÉCHOUÉ (il se lit gris),
                               écart 15,0 (deutan) mais 3,7 en TRITANOPIE :
                               les deux courbes s'y confondent.
        #16A34A               — tous les contrôles passent, 25,9 et 14,5.

      La correction n'est donc pas de renoncer au vert, c'est d'unifier sur
      celui qui mesure bien. Le praticien garde son habitude de lecture.

   3. `_buildQualChart` RECEVAIT `colorA`/`colorB` ET LES IGNORAIT — il les
      réécrivait en dur à sa première ligne. Une correction de couleur faite
      chez les appelants ne l'aurait jamais atteint, sans le moindre signal.

   Une seule constante porte cette couleur. Un LITTÉRAL, pas une variable CSS :
   ces SVG sont recopiés tels quels dans le courrier au médecin et dans l'export
   autonome, qui n'ont pas les mêmes feuilles. Un `var()` non résolu rend
   l'attribut invalide — et une courbe sans trait.

     node qualite/evo-lisibilite-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}

/* On exécute les VRAIS constructeurs — une correction appliquée à deux d'entre
   eux passerait inaperçue, c'est déjà arrivé sur ce même trio. */
var d = src.indexOf('function _robustFence(');
var f = src.indexOf('function _buildQualGrid(');
if (d < 0 || f < d) { console.error('Bornes des constructeurs introuvables.'); process.exit(1); }
var api = new Function('document',
  src.slice(d, f) + '\nreturn {B:_buildChartB, D:_buildChartD, Q:_buildQualChart, SERIE_B:EVO_SERIE_B};')(
  { getElementById: function () { return null; } });

var DATES = ['12/03', '28/04', '16/06', '04/08', '06/09'];
var rendus = {
  B: api.B([18, 22, 26, 29, 32], DATES, { chartId: 'x1', unit: ' km', labelA: 'Distance' }),
  D: api.D([55, 62, 68, 74, 79], [88, 89, 90, 91, 92], DATES,
           { chartId: 'x2', unit: ' kg', labelA: 'Atteint', labelB: 'Sain' }),
  Q: api.Q([2, 3, 4, 4, 5], [4, 4, 5, 5, 5], DATES,
           { chartId: 'x3', labelA: 'Atteint', labelB: 'Sain', maxVal: 5 })
};

function traits(h) { return (h.match(/<line[^>]*stroke="var\(--border\)"/g) || []).length; }
function enRetrait(h) { return (h.match(/<line[^>]*stroke-opacity="0\.55"/g) || []).length; }

/* ── Réglage 1 ────────────────────────────────────────────────────────────── */
console.log('\nLa grille passe au second plan');

Object.keys(rendus).forEach(function (k) {
  var h = rendus[k];
  ok('constructeur ' + k + ' — il rend quelque chose', !!h && h.indexOf('<svg') === 0);
  /* TOUT trait de grille est en retrait : un seul oublié et la trame reprend
     le dessus sur ce graphique-là seulement, ce qui se voit encore plus mal
     qu'une trame uniformément trop lourde. */
  egal('constructeur ' + k + ' — tous les traits sont en retrait',
       traits(h), enRetrait(h));
  ok('constructeur ' + k + ' — il en reste au moins un', traits(h) >= 1);
});

/* Le nombre de graduations : le graphique QUALITATIF garde les siennes — son
   échelle est fixe de 0 à 5, la diviser n'aurait pas de sens. */
ok('le graphique simple s\'allège', traits(rendus.B) <= 4, traits(rendus.B) + ' traits');
ok('le graphique double aussi', traits(rendus.D) <= 4, traits(rendus.D) + ' traits');
ok('le qualitatif garde son échelle fixe', traits(rendus.Q) >= 4, traits(rendus.Q) + ' traits');

/* ── Réglage 2 ────────────────────────────────────────────────────────────── */
console.log('\nUn seul vert de série, et il est LU depuis les options');

egal('la constante existe', '#16A34A', api.SERIE_B);
ok('le vert terne a quitté les séries', !/stroke="var\(--green\)"/.test(rendus.D + rendus.Q),
   (rendus.D + rendus.Q).match(/stroke="var\(--green\)"/g));
ok('le double emploie le vert franc', rendus.D.indexOf('#16A34A') > 0);
ok('le qualitatif aussi', rendus.Q.indexOf('#16A34A') > 0);

/* Le défaut de fond : le qualitatif ignorait ce qu'on lui passait. On le
   prouve en lui passant AUTRE CHOSE — s'il l'ignore encore, ce cas rougit. */
var qForce = api.Q([2, 3, 4, 4, 5], [4, 4, 5, 5, 5], DATES,
                   { chartId: 'x4', labelA: 'A', labelB: 'B', maxVal: 5,
                     colorA: '#111111', colorB: '#222222' });
ok('il lit `colorA` qu\'on lui donne', qForce.indexOf('#111111') > 0);
ok('… et `colorB` aussi', qForce.indexOf('#222222') > 0);
ok('… sans garder l\'ancienne en dur', qForce.indexOf('#16A34A') < 0);

/* Et le repli, quand l'appelant ne dit rien — c'est le cas de tous les
   appelants actuels du qualitatif. */
ok('sans option, il retombe sur la constante', rendus.Q.indexOf('#16A34A') > 0);

/* ── Le littéral, pas la variable CSS ─────────────────────────────────────── */
console.log('\nUne couleur de série ne passe jamais par une variable CSS');
/* Ces SVG sont RECOPIÉS dans le courrier au médecin et dans l'export autonome,
   qui ne servent pas les mêmes feuilles. Un `var()` non résolu rend l'attribut
   invalide : la courbe perd son trait, sans erreur ni signal. */
ok('aucune série ne se peint avec var(--green)',
   !/(colorA|colorB)\s*[:=]\s*'var\(--green\)'/.test(src));
/* Le REPLI compte autant que les appels : un appelant qui oublie `colorB`
   retombait sur le vert terne, et le reglage n'aurait tenu que tant que tous
   les appels restent explicites. On verifie les deux constructeurs. */
var replis = (src.match(/colorB\s*=\s*opts\.colorB\s*\|\|\s*([^,;\n]+)/g) || []);
ok('les deux constructeurs ont un repli', replis.length === 2, replis.join(' | '));
ok('… et aucun ne retombe sur le vert terne',
   !replis.some(function (r) { return /--green/.test(r); }), replis.join(' | '));

/* L'en-tête chiffré de la carte doit porter LA MÊME couleur que la courbe,
   sans quoi la pastille et le trait se contredisent. */
console.log('\nL\'en-tête de carte et la courbe s\'accordent');
ok('la figure du côté B emploie la constante',
   /_evoFig\(grp\.labelB\s*,\s*EVO_SERIE_B/.test(src),
   (src.match(/_evoFig\(grp\.labelB[^)]*/g) || []).join(' | '));
ok('… et plus aucune couleur en dur dans ces figures',
   !/_evoFig\(grp\.labelB\s*,\s*'#/.test(src));

/* ── L'en-tête reste du HTML ──────────────────────────────────────────────── */
console.log('\nCe que les réglages ne doivent PAS casser');
/* Le courrier prend le PREMIER <svg> de la carte : un SVG glissé dans l'en-tête
   chiffré priverait le médecin des axes et des dates. */
['_evoStatSingle', '_evoFig', '_evoStatDual'].forEach(function (fn) {
  var i = src.indexOf('function ' + fn + '(');
  var corps = src.slice(i, src.indexOf('\n}', i));
  ok(fn + ' n\'émet aucun SVG', corps.indexOf('<svg') < 0);
});
/* L'aire ne peut pas devenir opaque : la grille est tracée AVANT elle. */
ok('les aires restent translucides',
   !/fill-opacity="1"/.test(rendus.B + rendus.D + rendus.Q));
ok('aucun dégradé n\'est réapparu', !/<linearGradient/.test(rendus.B + rendus.D + rendus.Q));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Lisibilité des courbes : tous les cas passent.');

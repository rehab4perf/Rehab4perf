/* Banc d'essai visuel — fabrique une page qui utilise le VRAI code du depot.
 *
 * Recopier a la main le balisage ou le CSS que l'on veut tester revient a
 * tester sa propre copie : le banc reste vert alors que le produit est casse,
 * et il ne voit pas la correction qu'on vient d'ecrire. Tout part donc des
 * fichiers du depot.
 *
 *   var B = require('./banc.js');
 *   var css = B.css('programme.html');
 *   var F   = B.fns('js/bilan.js', '/* ── Détection outliers', 'function _buildQualGrid',
 *                   ['_buildChartB', '_buildChartD']);
 *   B.page('/tmp/banc.html', { css: css, corps: '<div>…</div>' });
 */
'use strict';
var fs = require('fs');

/* Toutes les feuilles d'une page, dans l'ordre du document. */
function css(fichier) {
  var s = fs.readFileSync(fichier, 'utf8'), out = '', i = 0;
  for (;;) {
    var a = s.indexOf('<style>', i); if (a < 0) break;
    var b = s.indexOf('</style>', a);
    out += s.slice(a + 7, b) + '\n'; i = b + 8;
  }
  if (!out) throw new Error('Aucun <style> dans ' + fichier);
  return out;
}

/* Les vraies fonctions du depot, executables. `debut` et `fin` bornent la
   tranche ; `noms` liste ce qu'on veut recuperer. Si une borne a bouge, on
   echoue bruyamment plutot que de rendre une tranche vide. */
function fns(fichier, debut, fin, noms) {
  var s = fs.readFileSync(fichier, 'utf8');
  var a = s.indexOf(debut), b = s.indexOf(fin);
  if (a < 0) throw new Error('Borne de debut introuvable dans ' + fichier + ' : ' + debut);
  if (b <= a) throw new Error('Borne de fin introuvable ou avant le debut dans ' + fichier);
  var code = s.slice(a, b);
  noms.forEach(function (n) {
    if (code.indexOf(n) < 0) throw new Error('« ' + n + ' » absent de la tranche — bornes a revoir');
  });
  /* eslint-disable no-new-func */
  return new Function(code + '\nreturn {' + noms.map(function (n) { return n + ':' + n; }).join(',') + '};')();
}

/* Le CORPS d'une fonction du depot, pour executer un vrai gestionnaire avec
   des doublures plutot que d'en reecrire la logique. */
function corpsDe(fichier, ancre, finLigne) {
  var s = fs.readFileSync(fichier, 'utf8');
  var d = s.indexOf(ancre);
  if (d < 0) throw new Error('Ancre introuvable : ' + ancre);
  var o = s.indexOf('{', d + ancre.length - 1);
  var f = s.indexOf(finLigne, o);
  if (f < 0) throw new Error('Fin de corps introuvable apres : ' + ancre);
  return s.slice(o + 1, f);
}

var POLICES = '/Users/antoineperonnaud/Documents/REHAB4PERF/fonts/fonts.css';

function page(sortie, o) {
  fs.writeFileSync(sortie,
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="stylesheet" href="' + (o.polices || POLICES) + '">' +
    '<style>' + (o.css || '') + '\n' + (o.cssSup || 'body{margin:0}') + '</style>' +
    (o.corps || '') +
    (o.script ? '<script>' + o.script + '<\/script>' : ''));
  return sortie;
}

module.exports = { css: css, fns: fns, corpsDe: corpsDe, page: page };

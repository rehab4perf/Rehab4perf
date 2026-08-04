#!/usr/bin/env node
/* Cas de référence — affichage de l'asymétrie.
 *
 * Le LSI reste calculé exactement comme avant. Ce qui change est l'AFFICHAGE :
 * on montre l'écart au lieu de la ressemblance. 80 % de symétrie devient 20 %
 * d'asymétrie, et les couleurs, qui lisent toujours le LSI, ne bougent pas —
 * c'est ce qui rend ce changement sûr.
 *
 * Deux points méritent des cas dédiés :
 *
 *   - En unilatéral, le LSI peut dépasser 100 % : le côté atteint est alors
 *     MEILLEUR que le sain. L'asymétrie devient négative, et le signe porte
 *     l'information — la valeur absolue la perdrait.
 *   - Le Drop Jump ratio suit la logique inverse (plus c'est bas, mieux
 *     c'est) : un LSI de 110 % y reste vert, donc une asymétrie de −10 %.
 *
 *   node qualite/lsi-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');
var deb = src.indexOf('/* ── Asymétrie affichée');
var fin = src.indexOf('function setLSI');
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes introuvables dans js/bilan.js.');
  console.error('Le test extrait la zone entre le commentaire « Asymétrie affichée »');
  console.error('et `function setLSI`. Corriger les bornes si elles ont bouge.');
  process.exit(1);
}
var api = new Function(src.slice(deb, fin) +
  '\nreturn { asymPct: asymPct, asymTxt: asymTxt, lsiClass: lsiClass };')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── Conversion ──────────────────────────────────────────────────────────── */

console.log('\nConversion — l\'écart, pas la ressemblance');
verifie('LSI 80 % → 20 % d\'asymétrie', '20.0%', api.asymTxt(80));
verifie('LSI 92 % → 8 %', '8.0%', api.asymTxt(92));
verifie('LSI 100 % → 0 %', '0.0%', api.asymTxt(100));
verifie('LSI 74,5 % → 25,5 %', '25.5%', api.asymTxt(74.5));
verifie('valeur absente → chaîne vide', '', api.asymTxt(NaN));
verifie('arrondi à l\'entier sur demande', '20%', api.asymTxt(80, 0));

/* ── Côté atteint meilleur que le sain ───────────────────────────────────── */

console.log('\nUnilatéral — le côté atteint peut dépasser le sain');
verifie('LSI 108 % → -8 %, le signe dit le sens', '-8.0%', api.asymTxt(108));
verifie('LSI 120 % → -20 %', '-20.0%', api.asymTxt(120));
// 100,04 arrondit à 0,0 : pas de « -0.0% », qui n'aurait aucun sens.
verifie('un écart nul ne s\'affiche jamais négatif', '0.0%', api.asymTxt(100.04));

/* ── Couleurs : elles lisent le LSI, elles ne changent pas ───────────────── */

console.log('\nCouleurs — inchangées, elles lisent toujours le LSI');
verifie('LSI 92 % → vert', 'good', api.lsiClass(92));
verifie('LSI 90 % → vert (borne incluse)', 'good', api.lsiClass(90));
verifie('LSI 85 % → orange', 'warn', api.lsiClass(85));
verifie('LSI 80 % → orange (borne incluse)', 'warn', api.lsiClass(80));
verifie('LSI 79,9 % → rouge', 'bad', api.lsiClass(79.9));
verifie('LSI 108 % → vert (atteint meilleur)', 'good', api.lsiClass(108));

console.log('\nDrop Jump — logique inverse, plus c\'est bas mieux c\'est');
verifie('LSI 105 % → vert', 'good', api.lsiClass(105, false));
verifie('LSI 110 % → vert (borne incluse)', 'good', api.lsiClass(110, false));
verifie('LSI 111 % → rouge', 'bad', api.lsiClass(111, false));
verifie('affichage du Drop Jump à 110 % → -10 %', '-10.0%', api.asymTxt(110));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

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
verifie('LSI 80 % → 20 % d\'asymétrie', '20%', api.asymTxt(80));
verifie('LSI 92 % → 8 %', '8%', api.asymTxt(92));
verifie('LSI 100 % → 0 %', '0%', api.asymTxt(100));
verifie('LSI 74,5 % → 26 % (arrondi)', '26%', api.asymTxt(74.5));
verifie('une décimale reste possible sur demande', '25.5%', api.asymTxt(74.5, 1));
verifie('valeur absente → chaîne vide', '', api.asymTxt(NaN));
verifie('l\'entier est le défaut, pas une option', '20%', api.asymTxt(80, 0));

/* ── Côté atteint meilleur que le sain ───────────────────────────────────── */

console.log('\nUnilatéral — le côté atteint peut dépasser le sain');
verifie('LSI 108 % → -8 %, le signe dit le sens', '-8%', api.asymTxt(108));
verifie('LSI 120 % → -20 %', '-20%', api.asymTxt(120));
// 100,04 arrondit à 0,0 : pas de « -0.0% », qui n'aurait aucun sens.
verifie('un écart nul ne s\'affiche jamais négatif', '0%', api.asymTxt(100.04));

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
verifie('affichage du Drop Jump à 110 % → -10 %', '-10%', api.asymTxt(110));

/* ══════════════════════════════════════════════════════════════════════════
   Garde-fou : personne ne fabrique un pourcentage depuis un LSI a la main.

   Les cas ci-dessus verifient la CONVERSION. Ils ne verifiaient pas QUI
   l'appelle — et c'etait precisement le trou : asymPct/asymTxt etaient
   justes, mais trois fonctions de calcul (calcEpForce, calcPiCIM, calcLunge)
   ecrivaient `lsi.toFixed(0) + '%'` en direct. Vingt-six cellules affichaient
   donc la symetrie sous une colonne intitulee « Asym. % ».

   Ce controle est textuel a dessein : il attrape la faute a la source, dans
   n'importe quelle fonction, y compris celles qui n'existent pas encore.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nAucun pourcentage fabriqué depuis un LSI sans passer par asymTxt');

var pourcentDepuisLsi = [
  /\b\w*lsi\w*\s*\.\s*toFixed\s*\([^)]*\)\s*\+\s*'%'/i,
  /Math\.round\s*\(\s*\w*lsi\w*\s*\)\s*\+\s*'%'/i
];

var fautes = [];
src.split('\n').forEach(function (ligne, i) {
  var t = ligne.trim();
  if (!t || t.indexOf('//') === 0 || t.indexOf('*') === 0) return;
  if (/asymTxt|asymPct/.test(ligne)) return;   // la conversion est faite
  if (pourcentDepuisLsi.some(function (re) { return re.test(ligne); })) {
    fautes.push('    js/bilan.js:' + (i + 1) + '  ' + t.slice(0, 88));
  }
});

if (fautes.length) {
  nbKo++;
  console.log('    ✗ ' + fautes.length + ' endroit(s) affichent encore la symétrie :');
  fautes.forEach(function (f) { console.log(f); });
} else {
  nbOk++;
  console.log('    ✓ aucun');
}

/* ══════════════════════════════════════════════════════════════════════════
   Effondrement 2 → 1 appui — meme bascule, autre grandeur.

   Ce chiffre n'a JAMAIS ete un LSI : c'est le rapport 1 appui / 2 appuis a
   l'interieur d'un meme cote, pas une comparaison entre les deux cotes. Sa
   colonne « Asym. » est vide, et c'est normal.

   Mais la ligne s'appelle « Effondrement » et affichait le pourcentage
   CONSERVE : 83 % se lisait « 83 % d'effondrement » alors qu'il n'y en avait
   que 17. Le mot et le chiffre disaient l'inverse l'un de l'autre.

   Comme pour le LSI, une seule chose bascule — le nombre affiche. Le ratio
   continue de piloter la couleur et le statut du test, ce qui rend le
   changement sur : un seuil « ≥ 90 % » devient « ≤ 10 % » sans qu'aucune
   decision clinique ne change.
   ══════════════════════════════════════════════════════════════════════════ */

var debE = src.indexOf('function fmtRatio');
// Cherché APRÈS fmtRatio : `_isBilateralForZones` apparaît aussi plus haut,
// dans une autre fonction — sans le décalage, la borne de fin précède le début.
var finE = src.indexOf('var bilateral = _isBilateralForZones', debE);
if (debE < 0 || finE < 0 || finE <= debE) {
  console.error('Bornes de fmtRatio introuvables dans js/bilan.js (calcPiCIM).');
  process.exit(1);
}
var eff = new Function(
  'var el = { textContent: "", className: "" };' +
  src.slice(debE, finE) +
  '\nreturn function (val) { fmtRatio(el, val); return el; };')();

console.log('\nEffondrement 2 → 1 appui — la perte, pas ce qui reste');
verifie('ratio 83 % → 17 % d\'effondrement', '17%', eff(82.6).textContent);
verifie('ratio 78 % → 22 %', '22%', eff(78.3).textContent);
verifie('ratio 100 % → 0 %, aucune perte', '0%', eff(100).textContent);
verifie('valeur absente → tiret', '—', eff(NaN).textContent);
// Le 1 appui peut depasser le 2 appuis : la perte est alors negative.
verifie('ratio 104 % → -4 %, le signe dit le sens', '-4%', eff(104).textContent);
verifie('une perte nulle ne s\'affiche jamais négative', '0%', eff(100.4).textContent);

console.log('\nCouleurs de l\'effondrement — elles lisent toujours le ratio');
verifie('ratio 92 % (8 % de perte) → vert', 'measure-stat good', eff(92).className);
verifie('ratio 90 % (10 %, borne incluse) → vert', 'measure-stat good', eff(90).className);
verifie('ratio 85 % (15 %) → orange', 'measure-stat warn', eff(85).className);
verifie('ratio 80 % (20 %, borne incluse) → orange', 'measure-stat warn', eff(80).className);
verifie('ratio 79 % (21 %) → rouge', 'measure-stat bad', eff(79).className);

/* Le seuil ne peut plus s'enoncer « ≥ 90 % » sous une colonne qui affiche une
   perte. Les deux legendes du formulaire doivent parler dans l'unite affichee. */
console.log('\nLes légendes s\'énoncent dans l\'unité affichée');
var html = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
/* La Course interne du mollet a quitte la page Pied pour les Tests
   Fonctionnels MI. Sans ce changement de borne, la tranche etait VIDE et les
   deux gardes passaient a vide — un test vert qui ne teste plus rien. */
var _debCim = html.indexOf('data-block-id="fonctionnels--cim"');
var zoneCim = html.slice(_debCim, html.indexOf('data-block-id=', _debCim + 40));
if (_debCim < 0 || !zoneCim.trim()) {
  console.error('Bloc « fonctionnels--cim » introuvable dans bilan.html.');
  process.exit(1);
}
verifie('la tranche contient bien le test', true, /pi-cim1-cs/.test(zoneCim));
verifie('aucun seuil « positif si < 90% » ne subsiste', false, /positif si\s*&lt;\s*90/.test(zoneCim));
verifie('aucune légende ne décrit encore le rapport brut', false,
        /\(1 appui \/ 2 appuis\) × 100, par côté/.test(zoneCim));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

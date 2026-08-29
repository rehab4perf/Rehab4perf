#!/usr/bin/env node
/* Cas de référence — la barre du haut sur écran étroit.
 *
 * Les trois contrôles — patient, cloche, centre d'aide — portaient tous
 * `flex-shrink:0`. Aucun ne pouvant se réduire, le dernier était POUSSÉ HORS
 * de la barre : mesuré, 29 px au-delà du bord droit à 375 px de large.
 *
 * C'est le NOM DU PATIENT qui cède : il est le seul des trois à pouvoir se
 * tronquer sans perdre son sens, puisqu'il est répété juste en dessous. Un
 * bouton d'aide réduit à une icône n'apprendrait plus rien à qui ne le
 * connaît pas — c'était déjà la décision inscrite dans la feuille.
 *
 * Sous 360 px le nom atteint son plancher et il manque encore 34 px : c'est
 * alors le mot-symbole du logo qui part, le sigle identifiant déjà
 * l'application.
 *
 *   node qualite/topbar-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

function bloc(requete) {
  var d = src.indexOf('@media (max-width:' + requete + 'px)');
  if (d < 0) return '';
  return src.slice(d, src.indexOf('\n}', d));
}

console.log('\nLe centre d\'aide ne sort plus de la barre');
var m700 = bloc(700);
ok('la règle des écrans étroits existe', !!m700);
ok('le bouton patient peut se réduire',
   /\.patient-btn \{[^}]*flex-shrink:1/.test(m700));
ok('… mais jamais jusqu\'à rien', /\.patient-btn \{[^}]*min-width:\d+px/.test(m700));

/* Les trois partagent `flex-shrink:0` dans la règle commune : c'est
   volontaire, et c'est précisément pour cela que la dérogation ci-dessus doit
   exister. La retirer de la règle commune ferait rétrécir la cloche et le
   libellé d'aide, qui sont indivisibles. */
var commune = src.slice(src.indexOf('.patient-btn, .notif-bell, .help-btn {'));
commune = commune.slice(0, commune.indexOf('}'));
ok('la règle commune garde flex-shrink:0', /flex-shrink:0/.test(commune));

console.log('\nLe libellé d\'aide reste écrit');
ok('le bouton porte bien son libellé',
   />Centre d'aide<\/div>/.test(src) || src.indexOf(">Centre d'aide</div>") > 0);
ok('il n\'est jamais masqué sur écran étroit',
   !/\.help-btn \{[^}]*display:none/.test(m700 + bloc(600) + bloc(360)));

console.log('\nSous 360 px, c\'est le mot-symbole qui cède');
var m360 = bloc(360);
ok('la règle des très petits écrans existe', !!m360);
ok('le mot-symbole s\'efface', /\.logo-w \{[^}]*display:none/.test(m360));
ok('le sigle, lui, reste', !/\.logo svg \{[^}]*display:none/.test(m360) &&
   !/\.logo \{[^}]*display:none/.test(m360));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Barre du haut : tous les cas passent.');

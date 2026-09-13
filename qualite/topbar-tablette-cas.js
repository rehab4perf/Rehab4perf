#!/usr/bin/env node
/* Cas de référence — la barre du haut sur tablette (701 à 900 px).
 *
 * Entre 701 et 900 px, la barre porte TOUT : sigle et mot-symbole, quatre
 * onglets, patient, cloche, Aide, et le bloc « Mon compte » sur deux lignes
 * (praticien, puis cabinet, en nowrap). Rien n'y cède avant 700 px, où les
 * onglets partent en bas. Mesuré au banc (vrai CSS, cloche visible, patient
 * « BEN YAHMED Zied », cabinet « Cabinet de Kinésithérapie du Parc ») :
 *     900 px : 0      820 px : 57 px de trop      768 px : 109      701 : 176
 * Sur iPad en portrait, « Cabinet de Ki… » sortait de l'écran.
 *
 * « Mon compte » ne peut pas partir : sur ordinateur c'est le SEUL accès au
 * compte (sous 700 px, la barre du bas a son onglet Compte). Ce qui cède,
 * dans l'ordre :
 *   - la ligne du CABINET (701–880 px) : le nom suffit à reconnaître le compte ;
 *   - le NOM DU PATIENT peut se réduire à 96 px (701–880 px) — il est répété
 *     juste en dessous, c'est déjà la règle sous 700 px (topbar-cas.js) ;
 *   - le MOT-SYMBOLE (701–760 px) : le sigle identifie l'application, même
 *     décision que sous 340 px ;
 *   - en filet, à toutes les largeurs, « Mon compte » se tronque au lieu de
 *     sortir de la barre (un nom très long).
 *
 *   node qualite/topbar-tablette-cas.js
 */
'use strict';
var fs = require('fs'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function bloc(entete) {
  var d = src.indexOf(entete);
  return d < 0 ? '' : src.slice(d, src.indexOf('\n}', d));
}

console.log('\nLa barre tient sur tablette');
ok('le cabinet s\'écrit dans sa propre classe (plus de style en ligne)',
   /'<br><span class="nav-cab">' \+ cab \+ '<\/span>'/.test(src) && !/font-size:\.65rem;opacity:\.7">' \+ cab/.test(src));
ok('… qui porte son style', /\n\.nav-cab \{ font-size:\.65rem; opacity:\.7; \}/.test(src));
ok('« Mon compte » se tronque au lieu de sortir de la barre', /\n\.topnav-right \{ min-width:0; overflow:hidden; text-overflow:ellipsis; \}/.test(src));
var t880 = bloc('@media (min-width:701px) and (max-width:880px) {');
ok('701–880 px : la ligne du cabinet s\'efface', /\.topnav-right \.nav-cab \{ display:none; \}/.test(t880), t880 || 'bloc absent');
ok('… et le nom du patient peut se réduire, avec un plancher', /\.patient-btn \{ flex-shrink:1; min-width:96px; \}/.test(t880));
var t760 = bloc('@media (min-width:701px) and (max-width:760px) {');
ok('701–760 px : le mot-symbole s\'efface, le sigle reste', /\.logo-w \{ display:none; \}/.test(t760), t760 || 'bloc absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Barre du haut : elle tient de 701 à 900 px, « Mon compte » compris.');

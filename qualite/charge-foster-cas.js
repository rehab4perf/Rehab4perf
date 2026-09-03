#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Charge d'entraînement — méthode de Foster « au carré »

       UA = RPE² × durée (min)          au lieu de RPE × durée

   Le session-RPE est LINÉAIRE en intensité : 100 min à RPE 1 et 10 min à
   RPE 10 valent tous deux 100 UA. Physiologiquement c'est faux — la séance
   dure coûte bien davantage. Décision du praticien, prise en connaissance des
   deux réserves : les seuils affichés (ACWR 0,8–1,3, monotonie, contrainte)
   viennent du sRPE linéaire, et aucune borne n'est publiée pour cette
   variante.

   UNE SEULE RÈGLE, PARTOUT. La carte de charge mêle deux origines — RPE
   déclaré et RPE estimé depuis la fréquence cardiaque. Élever au carré d'un
   seul côté rendrait les deux moitiés incomparables dans la même carte, et
   l'ACWR mélangerait deux échelles.

   On exécute la VRAIE fonction.
   ════════════════════════════════════════════════════════════════════════════ */
var fs = require('fs'), path = require('path');
var echecs = 0;
function verifie(nom, attendu, obtenu){
  var ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  console.log('    ' + (ok ? '✓' : '✗') + ' ' + nom
    + (ok ? '' : '\n        attendu : ' + JSON.stringify(attendu)
             + '\n        obtenu  : ' + JSON.stringify(obtenu)));
  if (!ok) echecs++;
}
var R = path.join(__dirname, '..');
var js   = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
var aide = fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8');

var a = js.indexOf('function _uaFoster');
var b = js.indexOf('\nfunction _stravaChargeEstimate', a);
if (a < 0 || b < a) { console.error('Bornes de _uaFoster introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
var ua = new Function(js.slice(a, b) + '\nreturn _uaFoster;')();

console.log('\n  L\'intensité pèse au carré');
verifie('45 min à RPE 7', 2205, ua(7, 45));
/* Le cas qui motive tout : a charge lineaire egale, la seance dure doit
   ressortir bien au-dessus. */
verifie('10 min à RPE 10 dépassent largement…', 1000, ua(10, 10));
verifie('… 100 min à RPE 1, que Foster classique égalait', 100, ua(1, 100));
verifie('un RPE doublé quadruple la charge', 4 * ua(3, 30), ua(6, 30));
/* La duree, elle, reste LINEAIRE : c'est l'intensite qu'on repondere. */
verifie('une durée doublée double la charge', 2 * ua(6, 30), ua(6, 60));

console.log('\n  Les valeurs impossibles ne produisent pas de charge');
verifie('sans RPE', null, ua(null, 45));
verifie('RPE nul', null, ua(0, 45));
verifie('durée nulle', null, ua(7, 0));
verifie('durée absente', null, ua(7, undefined));
verifie('valeur non numérique', null, ua('abc', 45));
/* Le RPE est BORNE a 10 : une intensite implicite aberrante, deduite d'une
   charge Strava pre-calculee, ne doit pas exploser au carre. */
verifie('un RPE aberrant est ramené à 10', ua(10, 30), ua(37, 30));

console.log('\n  La même règle des deux côtés de la carte');
var c0 = js.indexOf('function _stravaChargeEstimate');
var c1 = js.indexOf('\n}', c0);
var st = js.slice(c0, c1);
/* Strava estime deja un RPE depuis la FC : c'est ce RPE-la qu'on eleve au
   carre, par la MEME fonction. */
verifie('l\'estimation FC passe par la même fonction', true, /_uaFoster\(rpe, durMin\)/.test(st));
/* La charge pre-calculee (suffer score) n'est pas un produit RPE × duree : on
   en deduit l'intensite implicite et l'on reapplique la regle. Sans cela, elle
   resterait lineaire au milieu d'une carte quadratique. */
verifie('… la charge pré-calculée aussi', true, /_uaFoster\(act\.charge \/ durMin, durMin\)/.test(st));
verifie('… et plus rien n\'y est linéaire', false, /Math\.round\(rpe\s*\*\s*durMin\)/.test(st));

var m0 = js.indexOf('function _buildUaMap');
var m1 = js.indexOf('\n}', js.indexOf('return map;', m0));
var mp = js.slice(m0, m1);
verifie('le retour athlète passe par la même fonction', true,
  /_uaFoster\(fb\.rpe, fb\.duree_min\)/.test(mp));
verifie('… et plus par le produit linéaire', false, /fb\.rpe \* fb\.duree_min/.test(mp));

console.log('\n  Ce que l\'écran doit dire');
/* Les UA n'ont plus la meme grandeur : un chiffre releve avant le changement,
   ou lu dans un autre outil, ne se compare plus au notre. */
verifie('la formule est nommée sous le titre', true, /UA = RPE² × durée \(min\) — Foster au carré/.test(js));
verifie('… et stylée', true, /\.bilan-foster-formule\s*\{/.test(html));
/* Afficher les bornes sans dire d'ou elles viennent les ferait passer pour
   validees sur cette echelle. */
verifie('les bornes ACWR disent leur origine', true, /Bornes issues du sRPE linéaire/.test(js));
verifie('… et la note est stylée', true, /\.bilan-acwr-note\s*\{/.test(html));

console.log('\n  Le centre d\'aide suit le même lot');
/* Une aide qui decrit une formule qui n'existe plus est pire que pas d'aide. */
verifie('l\'article donne la nouvelle formule', true, /UA = RPE² × durée/.test(aide));
verifie('… avec le calcul détaillé', true, /7 × 7 × 45 = 2205/.test(aide));
verifie('la FAQ aussi', true, /45 min à RPE 7 = 2205 UA/.test(aide));
verifie('… et prévient sur les seuils', true, /aucune borne n\\'a été publiée pour la\s*variante au carré|calibrés sur le Foster classique/.test(aide));
verifie('plus aucune mention de l\'ancienne formule', false, /45 min à RPE 7 = 315 UA/.test(aide));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 24 attentes vérifiées');

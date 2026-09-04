#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Charge d'entraînement — méthode de Foster

       UA = RPE × durée (min)

   LA VARIANTE « AU CARRÉ » A ÉTÉ ESSAYÉE PUIS RETIRÉE. L'intuition était
   bonne : le session-RPE est linéaire en intensité, si bien que 100 min à
   RPE 1 et 10 min à RPE 10 valent tous deux 100 UA — physiologiquement faux.

   Mais « Foster au carré » n'est pas une méthode publiée, et tous les seuils
   dont vit ce bilan — zone favorable ACWR 0,8–1,3, monotonie, contrainte —
   sont calibrés sur la formule linéaire. Entre une intuition juste et un
   modèle validé, le praticien garde le modèle validé.

   Ce fichier veille donc à ce que le carré ne revienne pas par inadvertance.

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

console.log('\n  La formule publiée : RPE × durée');
verifie('45 min à RPE 7', 315, ua(7, 45));
/* Le produit est LINEAIRE des deux cotes — c'est la propriete meme de la
   methode, avec sa limite connue : ces deux seances pesent pareil. */
verifie('un RPE doublé double la charge', 2 * ua(3, 30), ua(6, 30));
verifie('une durée doublée aussi', 2 * ua(6, 30), ua(6, 60));
verifie('10 min à RPE 10 valent 100 UA…', 100, ua(10, 10));
verifie('… autant que 100 min à RPE 1 — la limite assumée', 100, ua(1, 100));
/* Le garde qui compte : que le carre ne revienne pas sans decision. */
verifie('la charge n\'est PAS quadratique', false, /r \* r \* durMin/.test(js));

console.log('\n  Les valeurs impossibles ne produisent pas de charge');
verifie('sans RPE', null, ua(null, 45));
verifie('RPE nul', null, ua(0, 45));
verifie('durée nulle', null, ua(7, 0));
verifie('durée absente', null, ua(7, undefined));
verifie('valeur non numérique', null, ua('abc', 45));
/* Le RPE est BORNE a 10 : une intensite implicite aberrante, deduite d'une
   charge Strava pre-calculee, ne doit pas exploser au carre. */
/* Le RPE reste borne a 10 : la charge Strava de repli n'est pas un produit
   RPE x duree, on en deduit l'intensite implicite, et une valeur aberrante ne
   doit pas passer telle quelle. */
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
verifie('la formule est nommée sous le titre', true, /UA = RPE × durée \(min\) — méthode de Foster/.test(js));
verifie('… et stylée', true, /\.bilan-foster-formule\s*\{/.test(html));
/* La note qui prevenait de l'echelle n'a plus d'objet : les bornes affichees
   sont de nouveau celles de la formule employee. */
verifie('plus de mise en garde sur l\'échelle', false, /Bornes issues du sRPE linéaire/.test(js));

console.log('\n  Le centre d\'aide suit le même lot');
/* Une aide qui decrit une formule qui n'existe plus est pire que pas d'aide. */
verifie('l\'article donne la formule publiée', true, /UA = RPE × durée/.test(aide));
verifie('la FAQ aussi', true, /45 min à RPE 7 = 315 UA/.test(aide));
/* Plus aucune trace de la variante : une aide qui decrirait une formule qui
   n'est pas celle du calcul est pire que pas d'aide. */
verifie('plus aucune mention du carré', false, /RPE² × durée|au carré/.test(aide));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 21 attentes vérifiées');

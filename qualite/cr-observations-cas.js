#!/usr/bin/env node
/* Cas de référence — les observations de tests de force dans le courrier.
 *
 * Quand un groupe de tests n'a AUCUNE colonne de mesure, le tableau du
 * courrier titre son unique colonne « Observation ». C'est là qu'atterrissent
 * les observations des tests de force — celles du rachis, la préhension : du
 * texte libre, souvent long, écrit à la taille du corps du document.
 *
 * Posées côte à côte avec les lignes de chiffres, elles prenaient le pas sur
 * elles : le regard tombait sur la prose avant les mesures. Elles se traitent
 * désormais comme les observations de l'analyse fonctionnelle (`lt-af-sy`) —
 * plus petites, en italique, dans un gris qui recule.
 *
 * LE PIÈGE À NE PAS ROUVRIR : viser `.lt-libre` seul. La même classe porte
 * « Cadence 172 spm » dans un tableau QUI a des colonnes de mesure, et cette
 * valeur-là est une mesure, pas une observation. La règle est donc portée par
 * le TABLEAU (`lt-t--obs`), posé seulement quand il n'y a pas d'en-tête de
 * mesure.
 *
 *   node qualite/cr-observations-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── La marque n'est posée que sur le bon tableau ─────────────────────────── */

console.log('\nLa marque suit l\'absence de colonnes de mesure');

var d = src.indexOf("h += '<table class=\"lt-t");
if (d < 0) { console.error('Ouverture du tableau du courrier introuvable'); process.exit(1); }
var ouverture = src.slice(d, src.indexOf('</thead><tbody>', d));

verifie('la marque existe', 'true', /lt-t--obs/.test(ouverture));
verifie('… et elle est conditionnée aux en-têtes', 'true',
        /entetes\.length\s*\?\s*''\s*:\s*' lt-t--obs'/.test(ouverture));
verifie('la colonne « Observation » n\'apparaît qu\'alors', 'true',
        /entetes\.length[\s\S]*th class="obs">Observation/.test(ouverture));

/* On rejoue l'expression telle qu'elle est ECRITE DANS LE FICHIER, extraite
   par lecture. La premiere version la reconstruisait de memoire dans le cas
   lui-meme : elle ne prouvait alors que ma propre paraphrase, et une classe
   posee a l'envers dans outils.html serait passee inapercue. */
var expr = (ouverture.match(/'<table class="(lt-t[^']*)'\s*\+\s*\(([^)]*)\)/) || [])[0];
if (!expr) { console.error('Expression de classe du tableau introuvable'); process.exit(1); }
var m = ouverture.match(/'<table class="lt-t'\s*\+\s*\(([^)]*)\)/);
var classeDe = new Function('entetes', "return 'lt-t' + (" + m[1] + ');');
verifie('sans colonne de mesure → marquée', 'lt-t lt-t--obs', classeDe([]));
verifie('avec colonnes de mesure → non marquée', 'lt-t',
        classeDe(['Côté sain', 'Côté atteint']));

/* ── Le style ne mord que là ──────────────────────────────────────────────── */

console.log('\nLe style vise le tableau d\'observations, jamais les mesures');

var regleObs = (src.match(/'table\.lt-t--obs td\.lt-libre\{[^']*\}'/) || [])[0] || '';
verifie('la règle existe', 'true', String(!!regleObs));
verifie('… et elle réduit la taille', 'true', /font-size:\.7[0-9]?rem/.test(regleObs));
verifie('… et elle met en italique', 'true', /font-style:italic/.test(regleObs));

/* Une règle sur `.lt-libre` NON qualifiée par `lt-t--obs` atteindrait aussi
   « Cadence 172 spm ». Elle ne doit pas exister. */
var reglesLibre = src.match(/'table\.lt-t[^']*td\.lt-libre\{[^']*\}'/g) || [];
var nonQualifiees = reglesLibre.filter(function (r) {
  return r.indexOf('lt-t--obs') < 0 && /font-size/.test(r);
});
verifie('aucune règle de taille ne frappe toutes les valeurs libres', '0',
        String(nonQualifiees.length));

/* La déclaration d'origine de `.lt-libre` doit rester : elle porte
   l'alignement à gauche et la chasse normale, qui valent dans les deux cas. */
verifie('la déclaration commune de .lt-libre subsiste', 'true',
        /table\.lt-t td\.lt-libre\{text-align:left/.test(src));

/* ── Un seul jeu de styles pour l'écran et le PDF ──────────────────────────── */

console.log('\nÉcran et PDF lisent la même feuille');
/* Le piège le plus frequent de ce domaine : une regle ecrite d'un seul cote ne
   se voit pas la ou le document est LU. Ici les deux rendus partagent le meme
   tableau de chaines — on verifie qu'il n'en est pas apparu un second. */
var nbBlocs = (src.match(/'table\.lt-t\{width:100%/g) || []).length;
verifie('une seule déclaration de table.lt-t', '1', String(nbBlocs));

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

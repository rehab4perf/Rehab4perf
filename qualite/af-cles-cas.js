#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Analyse fonctionnelle — les CLÉS sont l'identité, jamais les libellés

   Chaque critère porte une clé courte (`piedsext`, `pronation`…) qui entre
   dans l'identifiant du champ : `af-<page>-ohs-<clé>`. C'est ce que les bilans
   enregistrent. Renommer une clé n'orpheline pas bruyamment les données — la
   case repart simplement vide, et l'ancienne valeur reste en base sans plus
   personne pour la lire.

   Un LIBELLÉ, lui, se corrige librement : « Pieds tournent en extérieur » est
   devenu « Pied en supination » sans qu'aucun bilan ne bouge.

   Même règle que le catalogue TESTS{} — on ajoute en fin de liste, on ne
   réécrit pas l'identité. Ce fichier fige donc les clés, pas les libellés.

   Ajouter un critère : l'écrire EN FIN de son groupe, puis l'ajouter ici.
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
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

/* Les VRAIS catalogues, evalues — jamais une copie des listes. */
function bornes(nom, fin){
  var a = src.indexOf('var ' + nom);
  var b = src.indexOf(fin, a);
  if (a < 0 || b < a) { console.error('Bornes de ' + nom + ' introuvables.'); process.exit(1); }
  return src.slice(a, b);
}
/* eslint-disable no-new-func */
var CAT = new Function(
  bornes('AF_OHS_GROUPS', '\n// Orientation clinique')
  + bornes('AF_SLS_ITEMS', '\nvar AF_TONE')
  + '\nreturn { ohs: AF_OHS_GROUPS, sls: AF_SLS_ITEMS };')();

console.log('\n  Les clés de l\'Overhead Squat');
var clesOhs = [];
CAT.ohs.forEach(function(g){ g.items.forEach(function(it){ clesOhs.push(it[0]); }); });
/* Liste FIGÉE. Un ajout se fait en fin de groupe et se déclare ici ; toute
   autre différence est une identité réécrite. */
verifie('elles sont exactement celles enregistrées en base', [
  'thorax', 'femur',                                        // critères de réussite
  'lordose', 'cyphose', 'bras', 'talons', 'dissoc',         // plan sagittal
  'piedsext', 'valgus', 'varus',                            // plan frontal antérieur
  'pronation', 'asym',                                      // plan frontal postérieur
  'douleur', 'shift'                                        // autres
], clesOhs);
/* Deux criteres portant la meme cle ecriraient dans le meme champ. */
verifie('aucune clé n\'est en double', clesOhs.length,
  clesOhs.filter(function(c, i){ return clesOhs.indexOf(c) === i; }).length);

console.log('\n  Les clés du Single Leg Squat');
var clesSls = CAT.sls.map(function(it){ return it[0]; });
verifie('elles sont exactement celles enregistrées en base',
  ['tronc', 'bassin', 'hanche', 'valgus', 'neuro', 'pied', 'douleur'], clesSls);
verifie('aucune clé n\'est en double', clesSls.length,
  clesSls.filter(function(c, i){ return clesSls.indexOf(c) === i; }).length);

console.log('\n  Les libellés, eux, se corrigent');
function libelle(cle){
  var t = null;
  CAT.ohs.forEach(function(g){ g.items.forEach(function(it){ if (it[0] === cle) t = it[1]; }); });
  return t;
}
/* Decision du praticien : deux formulations pour un meme couple d'observations
   du pied, l'une descriptive et l'autre en jargon. */
verifie('le pied en supination se dit ainsi', 'Pied en supination', libelle('piedsext'));
verifie('… et le pied en pronation aussi', 'Pied en pronation', libelle('pronation'));
/* Ils restent dans leur groupe : la supination s'observe de FACE, la pronation
   de DOS. Les reunir demanderait de changer d'ou l'on regarde. */
function groupeDe(cle){
  var t = null;
  CAT.ohs.forEach(function(g){ g.items.forEach(function(it){ if (it[0] === cle) t = g.title; }); });
  return t;
}
verifie('la supination s\'observe de face', 'Compensations — plan frontal antérieur',
  groupeDe('piedsext'));
verifie('la pronation s\'observe de dos', 'Compensations — plan frontal postérieur',
  groupeDe('pronation'));

console.log('\n  Chaque clé porte son orientation clinique');
var theme = new Function(bornes('AF_OHS_THEME', '\n// [clé, libellé complet')
  + '\nreturn AF_OHS_THEME;')();
/* La synthese dit vers quoi chercher. Une cle sans theme n'y apparait pas —
   silencieusement. `thorax` et `femur` sont des criteres de REUSSITE, pas des
   compensations : ils n'orientent rien, et le groupe qui les porte le dit
   (`type:'ok'`). On le lit dans le catalogue plutot que de les nommer ici — une
   liste tenue a la main vieillirait au premier critere ajoute. */
var clesKo = [];
CAT.ohs.forEach(function(g){
  if (g.type !== 'ko') return;
  g.items.forEach(function(it){ clesKo.push(it[0]); });
});
verifie('toute compensation a son thème', [],
  clesKo.filter(function(c){ return !theme[c]; }));
verifie('… et aucun critère de réussite n\'en porte', [],
  clesOhs.filter(function(c){ return clesKo.indexOf(c) < 0 && theme[c]; }));
/* Le theme du pied en supination reste celui de la dorsiflexion : le renommage
   ne portait que sur le libelle. A revoir AVEC le praticien si la supination
   doit desormais orienter vers le controle du pied. */
verifie('la supination oriente encore vers la dorsiflexion',
  'dorsiflexion de cheville', theme['piedsext']);
verifie('la pronation oriente vers le contrôle du pied',
  'contrôle du pied', theme['pronation']);

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 12 attentes vérifiées');

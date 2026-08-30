#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Calculateur de 1RM — le défaut est UNE répétition

   Le champ ouvrait sur 5 répétitions : le praticien qui vient de faire tester
   un maximum devait donc corriger le champ AVANT de lire le résultat, et une
   valeur fausse s'affichait entre-temps. À une répétition, le calculateur ne
   calcule plus rien — il rend le poids soulevé — ce qui est exactement ce
   qu'on attend d'un test à vide.

   Ce cas exécute les VRAIES formules du fichier de données.
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

var html = fs.readFileSync(path.join(__dirname, '..', 'programme.html'), 'utf8');
var data = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

console.log('\n  Calculateur de 1RM');

/* Le défaut est dans le balisage : c'est lui qui s'affiche avant toute frappe. */
var champ = html.match(/<input[^>]*id="p-rm-reps"[^>]*>/);
verifie('le champ Répétitions existe', true, !!champ);
verifie('… et ouvre sur 1 répétition', 'value="1"',
  (champ ? champ[0].match(/value="\d+"/) || [''] : [''])[0]);

/* La raison pour laquelle ce défaut est légitime : à une répétition, les six
   formules rendent le poids lui-même. Si l'une cessait de le faire, le
   calculateur afficherait un 1RM différent du poids saisi dès l'ouverture. */
var d0 = data.indexOf('var _pFORMULAS'), d1 = data.indexOf('var _pCHARGES');
if (d0 < 0 || d1 < d0) { console.error('Bornes de _pFORMULAS introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
var FORMULES = new Function(data.slice(d0, d1) + '\nreturn _pFORMULAS;')();
verifie('les six formules sont là', 6, FORMULES.length);
FORMULES.forEach(function(f){
  verifie('à 1 rép., ' + f.name + ' rend le poids soulevé', 100, f.fn(100, 1));
});

/* Le plancher protège d'une saisie vidée : `||1` rend 1, jamais 0. */
verifie('un champ vidé retombe sur 1, pas sur 0', 1,
  Math.min(parseInt('') || 1, 30));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ ' + (3 + FORMULES.length + 1) + ' attentes vérifiées');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   outils.html — un gestionnaire en attribut ne voit que `window`

   Tout le code du Générateur de CR vit dans l'IIFE `initCR`. Une fonction qui y
   est simplement déclarée n'existe PAS pour un `onclick="…"` ou un
   `onchange="…"` : l'attribut est évalué au niveau global, et le geste lève une
   ReferenceError.

   `crUpdateBlocks` était dans ce cas depuis longtemps, sans que rien ne se
   voie : la fonction ne faisait rien, et l'événement `change` de la case
   remontait de toute façon jusqu'à la délégation qui reconstruit l'aperçu. Le
   défaut était réel et invisible — jusqu'à ce que la fonction ait quelque chose
   à faire.

   Ce contrôle relève TOUS les gestionnaires écrits en attribut et vérifie que
   chacun est atteignable : soit posé sur `window`, soit déclaré hors de
   l'IIFE — la convention du fichier étant que ce qui y vit est indenté.
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
var s = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

console.log('\n  Tous les gestionnaires en attribut sont atteignables');
/* Les attributs vivent dans le HTML de la page ET dans les chaines que le
   script injecte : les deux sont evalues au niveau global une fois posees. On
   attrape les deux formes, guillemets echappes compris. */
var noms = {};
(s.match(/\bon[a-z]+=\\?"([A-Za-z_$][\w$]*)\(/g) || []).forEach(function (m) {
  noms[m.replace(/.*"/, '').replace('(', '')] = 1;
});
verifie('des gestionnaires en attribut existent', true, Object.keys(noms).length > 10);

var captifs = Object.keys(noms).filter(function (n) {
  /* Pose sur `window` : atteignable, quel que soit l'endroit. */
  if (new RegExp('window\\.' + n + '\\s*=').test(s)) return false;
  /* Declare en COLONNE ZERO : hors de l'IIFE, donc global de plein droit.
     C'est la convention du fichier — ce qui vit dans `initCR` est indente. */
  if (new RegExp('^function ' + n + '\\s*\\(', 'm').test(s)) return false;
  /* Declare INDENTE et jamais expose : captif. */
  if (new RegExp('^\\s+function ' + n + '\\s*\\(', 'm').test(s)) return true;
  /* Ni declare ni expose ici : hors sujet (fonction d'une autre page). */
  return false;
});
verifie('aucun n\'est captif de l\'IIFE', [], captifs);

console.log('\n  Le cas qui a fait le défaut');
/* La case « Douleur (EVA) » appelle la reconstruction par un attribut. */
verifie('la case EVA appelle bien la reconstruction', true,
  /id="cr-eva-inc"[^>]*onchange="crUpdateAfterChange\(\)"/.test(s));
verifie('… et la fonction est posée sur window', true,
  /window\.crUpdateAfterChange = crUpdateAfterChange;/.test(s));
/* Elle reste declaree A L'INTERIEUR de l'IIFE : ses quatre autres appelants y
   sont, et les deplacer hors de l'IIFE leur ferait perdre `_crMajDifferee`. */
verifie('… tout en restant déclarée dans l\'IIFE', true,
  /^  function crUpdateAfterChange\s*\(/m.test(s));

console.log('\n  L\'IIFE existe bien, et c\'est ce qui rend la règle nécessaire');
verifie('le Générateur de CR vit dans initCR', true, /\(function initCR\(\) \{/.test(s));
/* Sans elle, une declaration suffirait et ce controle n'aurait pas d'objet. */
var iife = s.indexOf('(function initCR() {');
verifie('… et la fonction y est bien après son ouverture', true,
  s.indexOf('function crUpdateAfterChange') > iife);

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 7 attentes vérifiées');

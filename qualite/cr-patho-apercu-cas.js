#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   CR — une pathologie choisie doit apparaître dans le courrier

   Elle n'apparaissait jamais. `crUpdateBlocks` montrait ou cachait des blocs du
   formulaire selon la pathologie ; le dernier de ces blocs a été retiré et la
   fonction est restée — **corps vide**, cinq appelants intacts.

   Or ces appelants sont exactement les moments où le courrier doit être
   reconstruit. Et aucun n'est une frappe : ce sont des clics de BOUTON, quand
   la délégation qui rafraîchit l'aperçu n'écoute que `input` et `change`. Un
   bouton n'en émet aucun.

   Une fonction qui garde son nom et ses appelants en perdant son effet.
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
var outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

console.log('\n  Le geste qui suit un clic refait le courrier');
var i = outils.indexOf('function crUpdateAfterChange');
if (i < 0) { console.error('crUpdateAfterChange introuvable.'); process.exit(1); }
var f = outils.slice(i, outils.indexOf('\n  function ', i + 10));
verifie('elle rafraîchit l\'aperçu', true, /_crMajDifferee\(\)/.test(f));
/* Un corps vide est exactement ce qui s'etait produit : la fonction survit a
   sa raison d'etre, et personne ne s'en apercoit. */
verifie('… et son corps n\'est pas vide', false, /function crUpdateAfterChange\(\)\s*\{\s*\}/.test(outils));
/* Une exception dans la reconstruction ne doit pas emporter le clic. */
verifie('… sans qu\'une erreur emporte le geste', true, /try \{[\s\S]{0,120}catch/.test(f));
/* Le nom ne doit plus annoncer des blocs : il n'en cache ni n'en montre aucun. */
verifie('l\'ancien nom trompeur a disparu', false, /crUpdateBlocks\(/.test(outils));

console.log('\n  Les trois gestes à la souris l\'appellent');
function corps(nom, fin){
  var a = outils.indexOf(nom);
  if (a < 0) { console.error(nom + ' introuvable.'); process.exit(1); }
  return outils.slice(a, outils.indexOf(fin, a));
}
verifie('ajouter une articulation et sa pathologie', true,
  /crUpdateAfterChange\(\)/.test(corps('window.crAddArticu = function', '/* Retirer une articulation')));
verifie('en retirer une', true,
  /crUpdateAfterChange\(\)/.test(corps('window.crRemoveArticu = function', 'function crUpdateAfterChange')));
verifie('basculer une pathologie', true,
  /crUpdateAfterChange\(\)/.test(corps('var idx = crPathos.indexOf(key);', 'function crUpdateAfterChange')));

console.log('\n  Pourquoi l\'appel explicite est nécessaire');
/* La delegation ne voit passer ni les clics de bouton, ni les ecritures
   programmatiques : c'est ce qui oblige a rappeler la reconstruction a la main
   apres un geste qui n'est pas une frappe. */
var d = outils.slice(outils.indexOf("['input', 'change'].forEach"),
                     outils.indexOf('var _crTexteCourant'));
verifie('elle n\'écoute que la frappe et le changement', ['input', 'change'],
  (d.match(/'(input|change)'/g) || []).slice(0, 2).map(function(x){ return x.slice(1, -1); }));
verifie('… et seulement dans le panneau du CR', true, /getElementById\('panel-cr'\)[\s\S]{0,120}contains\(e\.target\)/.test(d));
verifie('aucun `click` n\'y est écouté', false, /'click'/.test(d));

console.log('\n  La pathologie entre bien dans le courrier');
/* On execute le VRAI constructeur du diagnostic. */
var g = outils.indexOf('function _crDiagnostic');
var h = outils.indexOf('function _crAntecedent', g);
if (g < 0 || h < g) { console.error('Bornes de _crDiagnostic introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
function diag(pathos, detail, articus){
  return new Function('crPathosLabel', 'crV', 'crArticuList', 'crAmpConfig',
    outils.slice(g, h) + '\nreturn _crDiagnostic();')(
    function(){ return pathos; },
    function(){ return detail; },
    articus,
    { epaule: { label: 'Épaule' }, genou: { label: 'Genou' } });
}
verifie('pathologie et articulation se rejoignent', 'Latarjet — Épaule',
  diag('Latarjet', '', ['epaule']));
verifie('le détail s\'intercale entre les deux', 'Latarjet — reconstruction — Épaule',
  diag('Latarjet', 'reconstruction', ['epaule']));
/* Deux articulations se lisent ensemble : un patient peut en avoir deux. */
verifie('deux articulations sont jointes', 'Latarjet — Épaule + Genou',
  diag('Latarjet', '', ['epaule', 'genou']));
/* Sans pathologie nommee, l'articulation seule vaut mieux que rien. */
verifie('l\'articulation seule suffit', 'Épaule', diag('', '', ['epaule']));
/* Rien a dire ne doit rien ecrire : une ligne « Pathologie : » vide au medecin
   vaut moins que pas de ligne du tout. */
verifie('rien à dire n\'écrit rien', '', diag('', '', []));
/* Et la ligne du courrier ne se pose que si le diagnostic existe. */
verifie('la ligne n\'est posée que s\'il y a un diagnostic', true,
  /if \(_diag\) _patChamps\.push\(\['Pathologie', _diag\]\)/.test(outils));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 16 attentes vérifiées');

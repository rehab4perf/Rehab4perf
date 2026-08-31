#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   CR médecin — la Synthèse clinique et le Plan de traitement ne se MESURENT pas

   `crAutoExpand` écrivait une hauteur en pixels, calculée à la largeur qu'avait
   le champ À CET INSTANT, puis plus rien ne la recalculait. Panneau du CR
   encore replié, iframe pas encore dimensionnée, fenêtre redimensionnée
   ensuite : la mesure porte sur quelques pixels de large, le texte s'y replie
   sur des dizaines de lignes, et la hauteur figée devient un pavé vide — « trop
   gros, des fois ».

   Exactement le défaut des consignes du builder, refermé de la même façon :
   une doublure dans le flux normal porte la hauteur, le champ se pose dessus.

   On lit le VRAI fichier — aucune copie du balisage ni du CSS.
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
var html = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

console.log('\n  Plus aucune mesure de hauteur');
/* La signature du defaut : `scrollHeight` ecrit dans une hauteur. */
verifie('la hauteur n\'est plus lue dans le DOM', false,
  /style\.height\s*=\s*\w+\.scrollHeight/.test(html));
verifie('… ni posée en pixels', false, /crAutoExpand[\s\S]{0,200}style\.height\s*=/.test(html));

console.log('\n  Les deux champs signalés sont enveloppés');
/* Synthese clinique = `cr-commentaire`, Plan de traitement = `cr-plan`
   (voir les blocs `concl` et `plan` de la lettre). */
['cr-commentaire', 'cr-plan', 'cr-proto-objectifs'].forEach(function(id){
  var re = new RegExp('<div class="cr-ta-grow" data-repl="[^"]*"><textarea id="' + id + '"');
  verifie(id + ' vit dans une doublure', true, re.test(html));
});
/* `data-repl` se met a jour EN PREMIER : place en fin de chaine, la moindre
   exception dans ce qui suit figerait la hauteur en silence, et le champ
   cesserait de grandir a la frappe. */
var oninputs = html.match(/oninput="[^"]*crAutoExpand\(this\)[^"]*"/g) || [];
verifie('trois champs appellent l\'agrandissement', 3, oninputs.length);
verifie('… et tous posent data-repl EN PREMIER', [], oninputs.filter(function(o){
  return !/oninput="this\.parentNode\.dataset\.repl=/.test(o);
}));

console.log('\n  Les deux boîtes sont identiques');
/* Un pixel d'ecart entre la doublure et le champ fausse la hauteur : elles
   partagent une seule declaration. Le fichier echoue si l'une s'en detache. */
var i = html.indexOf('.cr-ta-grow::after,\n.cr-ta-grow > textarea {');
verifie('la déclaration partagée existe', true, i > 0);
var part = html.slice(i, html.indexOf('}', i));
['box-sizing: border-box', 'padding: 7px 9px', 'font-size: .83rem',
 'line-height: 1.5', 'font-family: inherit', 'border-width: 1.5px'].forEach(function(p){
  verifie('… elle fixe ' + p, true, part.indexOf(p) >= 0);
});
/* La bordure de la doublure mange la largeur en `border-box` : sans elle le
   texte se replierait une colonne plus loin que dans le champ. Seule sa
   COULEUR est neutralisee — poser `border` en bloc ecraserait la bordure
   visible du champ, les deux selecteurs ayant la meme specificite. */
verifie('la doublure garde sa bordure, invisible', true,
  /\.cr-ta-grow::after \{ border-color: transparent; \}/.test(html));
verifie('… et n\'écrase pas celle du champ', false,
  /\.cr-ta-grow[^{]*\{[^}]*border:\s*1\.5px solid transparent/.test(html));

/* La doublure occupe le FLUX, le champ se pose dessus : c'est ce qui supprime
   toute dependance a la largeur du moment. */
verifie('la doublure occupe le flux', true,
  /\.cr-ta-grow::after \{[\s\S]{0,200}display: block;/.test(html));
verifie('… et le champ est posé par-dessus', true,
  /\.cr-ta-grow > textarea \{ position: absolute;[^}]*height: 100%/.test(html));
/* Sans repli, un mot plus long que la colonne deborderait la doublure sans
   deborder le champ : les deux hauteurs divergeraient. */
verifie('un mot trop long se coupe dans la doublure', true,
  /\.cr-ta-grow::after \{[\s\S]{0,200}word-break: break-word/.test(html));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 18 attentes vérifiées');

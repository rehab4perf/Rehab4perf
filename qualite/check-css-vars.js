#!/usr/bin/env node
/* Variables CSS utilisees mais jamais definies.
 *
 * Pourquoi ce controle existe : une variable CSS absente ne provoque aucune
 * erreur. La declaration entiere devient invalide et le navigateur l'ignore en
 * silence. Un `background: var(--card)` sur une palette qui n'a que --surface
 * ne donne pas un fond gris ou rouge : il ne donne AUCUN fond. L'element
 * devient transparent, et le defaut ne se voit que sur les zones colorees.
 *
 * C'est exactement ce qui est arrive au menu d'ajout du builder : invisible sur
 * la page blanche, illisible des qu'il passait sur l'en-tete d'un bloc.
 *
 * Un var(--x, repli) n'est pas signale : le repli couvre le cas.
 *
 *   node qualite/check-css-vars.js     (sortie 1 si violation)
 */
'use strict';

var fs = require('fs');
var path = require('path');

var racine = path.join(__dirname, '..');
var fichiers = fs.readdirSync(racine).filter(function(f) {
  return /\.html$/.test(f);
});

var total = 0;

fichiers.forEach(function(nom) {
  var src = fs.readFileSync(path.join(racine, nom), 'utf8');

  // Definitions : `--nom :` hors d'un var(...).
  var definies = {};
  var reDef = /(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g;
  var m;
  while ((m = reDef.exec(src))) definies[m[2]] = true;

  // Usages sans repli : var(--nom) ferme immediatement, pas de virgule.
  var manquantes = {};
  var reUse = /var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g;
  while ((m = reUse.exec(src))) {
    if (!definies[m[1]]) manquantes[m[1]] = (manquantes[m[1]] || 0) + 1;
  }

  var noms = Object.keys(manquantes);
  if (!noms.length) return;

  total += noms.length;
  console.error(nom + ' :');
  noms.sort().forEach(function(v) {
    console.error('  ' + v + '  (' + manquantes[v] + ' usage' +
      (manquantes[v] > 1 ? 's' : '') + ', declaration ignoree)');
  });
});

if (total) {
  console.error('\n' + total + ' variable(s) CSS utilisee(s) sans definition.');
  console.error('Definir la variable dans le :root du fichier, ou ecrire var(--x, repli).');
  process.exit(1);
}

console.log('Variables CSS : aucune utilisation sans definition.');

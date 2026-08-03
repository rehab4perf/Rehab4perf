#!/usr/bin/env node
/* Couleurs écrites en dur — empêcher la dérive de repartir.
 *
 * Le constat : la palette de programme.html compte 17 jetons, et le fichier
 * emploie 196 couleurs qui n'en font pas partie. C'est la raison de fond pour
 * laquelle `--card` est passé inaperçu — quand presque toute la couleur est
 * écrite à côté des jetons, plus personne ne regarde les jetons.
 *
 * Comme pour l'échelle typographique, le contrôle n'échoue que sur une
 * couleur NOUVELLE : le compteur ne peut que baisser.
 *
 * Le blanc et le noir ne sont pas comptés. `#fff` est tantôt une surface,
 * tantôt du texte sur fond navy — le remplacer par un jeton unique serait
 * faux la moitié du temps.
 *
 * Seules les feuilles de style sont lues, pour la même raison que
 * check-echelle.js : le JS construit des documents autonomes où les jetons
 * n'existent pas.
 *
 *   node qualite/check-couleurs.js            controle (sortie 1 si nouveaute)
 *   node qualite/check-couleurs.js --write    accepter l'etat courant
 */
'use strict';

var fs = require('fs');
var path = require('path');

var racine = path.join(__dirname, '..');
var empreinte = path.join(__dirname, 'couleurs-empreinte.json');

var FICHIERS = ['athlete.html', 'programme.html', 'bilan.html', 'outils.html'];
var TRIVIALES = { '#fff': 1, '#ffffff': 1, '#000': 1, '#000000': 1 };

function feuilles(src) {
  // Masquer les <script> AVANT d'extraire les feuilles : leurs chaines
  // contiennent litteralement <style> et </style>, pour des documents
  // autonomes ou les jetons n'existent pas. Les compter ici reviendrait a
  // reclamer une conversion qu'il ne faut surtout pas faire.
  var sans = src.replace(/<script[\s\S]*?<\/script>/g, '');
  var out = [], re = /<style[^>]*>([\s\S]*?)<\/style>/g, m;
  while ((m = re.exec(sans))) out.push(m[1]);
  return out.join('\n');
}

/* Les jetons de couleur, lus dans le :root — la palette déclarée. */
function palette(css) {
  var root = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!root) return { jetons: {}, bloc: '' };
  var jetons = {}, re = /(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*;/g, m;
  while ((m = re.exec(root[1]))) {
    var v = m[2].toLowerCase();
    (jetons[v] = jetons[v] || []).push(m[1]);
  }
  return { jetons: jetons, bloc: root[0] };
}

var etat = {};
FICHIERS.forEach(function (nom) {
  var css = feuilles(fs.readFileSync(path.join(racine, nom), 'utf8'));
  var p = palette(css);
  var hors = {};
  var re = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g, m;
  var corps = css.replace(p.bloc, '');
  while ((m = re.exec(corps))) {
    var v = m[0].toLowerCase();
    if (TRIVIALES[v]) continue;
    if (p.jetons[v]) continue;          // une valeur de la palette, écrite en dur
    hors[v] = (hors[v] || 0) + 1;
  }
  etat[nom] = Object.keys(hors).sort();
});

if (process.argv.indexOf('--write') >= 0) {
  fs.writeFileSync(empreinte, JSON.stringify(etat, null, 2) + '\n');
  FICHIERS.forEach(function (n) {
    console.log(n + ' : ' + etat[n].length + ' couleur(s) hors palette enregistree(s)');
  });
  console.log('\nEmpreinte ecrite. Chaque absorption doit faire BAISSER ces nombres.');
  process.exit(0);
}

var ref;
try { ref = JSON.parse(fs.readFileSync(empreinte, 'utf8')); }
catch (e) {
  console.error('Empreinte absente. Lancer : node qualite/check-couleurs.js --write');
  process.exit(1);
}

var nouveautes = 0;
FICHIERS.forEach(function (nom) {
  var connues = {};
  (ref[nom] || []).forEach(function (v) { connues[v] = true; });
  var neuves = etat[nom].filter(function (v) { return !connues[v]; });
  if (!neuves.length) return;
  nouveautes += neuves.length;
  console.error(nom + ' : couleur(s) hors palette introduite(s) — ' + neuves.join(', '));
});

if (nouveautes) {
  console.error('\nUtiliser un jeton existant, ou en ajouter un au :root du fichier');
  console.error('si le besoin est reel — puis --write pour l\'entériner.');
  process.exit(1);
}

var reste = FICHIERS.map(function (n) { return n + ' ' + etat[n].length; }).join(' · ');
console.log('Couleurs : aucune nouvelle valeur hors palette. Reste a absorber — ' + reste);

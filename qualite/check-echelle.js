#!/usr/bin/env node
/* Échelle typographique — empêcher la dérive de repartir.
 *
 * Le constat qui a motivé ce contrôle : athlete.html employait 37 tailles de
 * police distinctes, programme.html 50. On y trouvait .64, .65, .66, .67 et
 * .68rem dans le même fichier. À ce niveau ce ne sont plus des décisions, et
 * c'est précisément ce qui fait qu'une interface semble « presque juste »
 * sans que personne ne puisse dire pourquoi.
 *
 * Le contrôle ne casse pas l'existant : il enregistre les valeurs hors
 * échelle déjà en place dans une empreinte, et n'echoue que si une NOUVELLE
 * apparaît. Chaque conversion fait donc baisser le compteur, jamais monter.
 *
 *   node qualite/check-echelle.js            controle (sortie 1 si nouveaute)
 *   node qualite/check-echelle.js --write    accepter l'etat courant
 */
'use strict';

var fs = require('fs');
var path = require('path');

var racine = path.join(__dirname, '..');
var empreinte = path.join(__dirname, 'echelle-empreinte.json');

/* Les fichiers dotés de l'échelle. outils.html en est exclu : sa racine est à
   14 px, les mêmes rem n'y donnent pas les mêmes pixels. */
var FICHIERS = ['athlete.html', 'programme.html'];

/* Seules les feuilles de style sont controlees. Les declarations ecrites dans
   du JS construisent parfois des documents autonomes (exports, impressions)
   ou les jetons --fs-* n'existent pas : y mettre var(--fs-…) rendrait la
   declaration invalide, et le navigateur l'ignorerait en silence. */
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

function pasDeLEchelle(src) {
  var pas = {};
  var re = /--fs-[a-z0-9]+\s*:\s*([0-9.]+rem)/g;
  var m;
  while ((m = re.exec(src))) pas[m[1]] = true;
  return pas;
}

/* Les valeurs littérales, hors définition des jetons eux-mêmes. */
function litterales(src) {
  var sansJetons = src.replace(/--fs-[a-z0-9]+\s*:\s*[0-9.]+rem/g, '');
  var vues = {};
  var re = /font-size:\s*([0-9.]+rem)/g;
  var m;
  while ((m = re.exec(sansJetons))) vues[m[1]] = (vues[m[1]] || 0) + 1;
  return vues;
}

var etat = {};
FICHIERS.forEach(function (nom) {
  var src = feuilles(fs.readFileSync(path.join(racine, nom), 'utf8'));
  var pas = pasDeLEchelle(src);
  var vues = litterales(src);
  var hors = Object.keys(vues).filter(function (v) { return !pas[v]; });
  hors.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
  etat[nom] = hors;
});

if (process.argv.indexOf('--write') >= 0) {
  fs.writeFileSync(empreinte, JSON.stringify(etat, null, 2) + '\n');
  FICHIERS.forEach(function (n) {
    console.log(n + ' : ' + etat[n].length + ' valeur(s) hors echelle enregistree(s)');
  });
  console.log('\nEmpreinte ecrite. Chaque conversion doit faire BAISSER ces nombres.');
  process.exit(0);
}

var ref;
try { ref = JSON.parse(fs.readFileSync(empreinte, 'utf8')); }
catch (e) {
  console.error('Empreinte absente. Lancer : node qualite/check-echelle.js --write');
  process.exit(1);
}

var nouveautes = 0;
FICHIERS.forEach(function (nom) {
  var connues = {};
  (ref[nom] || []).forEach(function (v) { connues[v] = true; });
  var neuves = etat[nom].filter(function (v) { return !connues[v]; });
  if (!neuves.length) return;
  nouveautes += neuves.length;
  console.error(nom + ' : taille(s) hors echelle introduite(s) — ' + neuves.join(', '));
});

if (nouveautes) {
  console.error('\nUtiliser un pas existant (var(--fs-…)), ou ajouter le pas a');
  console.error('l\'echelle si le besoin est reel — puis --write pour l\'entériner.');
  process.exit(1);
}

var reste = FICHIERS.map(function (n) { return n + ' ' + etat[n].length; }).join(' · ');
console.log('Echelle typographique : aucune nouvelle taille. Reste a convertir — ' + reste);

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   L'icône d'un protocole est TOUJOURS un SVG du jeu de l'app

   Les protocoles s'affichent avec les icônes SVG des onglets du bilan
   (`PROTO_ICONS` : épaule, genou, pied…). La bibliothèque intégrée
   (`PROTOCOLS_REF`) portait pourtant encore des ÉMOJIS — 🦵 pour LCA,
   Réparation méniscale et LCM, 🦶 pour la flexion dorsale. Un compte NEUF, qui
   reçoit sa liste copiée de cette bibliothèque, les affichait ; les comptes
   anciens, eux, gardaient l'icône choisie à la main. Chaque nouveau client
   démarrait donc avec des émojis — relevé sur le compte de démo.

   Deux étages, et il faut les deux :
     1. la bibliothèque ne porte que des CLÉS du jeu d'icônes ;
     2. `_resolveProtoIcon` ne renvoie JAMAIS la valeur brute : une icône
        inconnue retombe sur l'articulation du protocole, puis sur l'émoji
        reconnu, puis sur « Autre ». C'est ce qui répare les listes déjà
        enregistrées avec un émoji, sans toucher à leurs données.

     node qualite/protocoles-icones-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* On EXÉCUTE la vraie bibliothèque, le vrai jeu d'icônes et la vraie fonction. */
const dR = src.indexOf('var PROTOCOLS_REF = [');
const fR = src.indexOf('\n];', dR);
const dI = src.indexOf('var PROTO_ICONS = [');
const fI = src.indexOf('function _buildProtoIconPicker', dI);
if (dR < 0 || fR < 0 || dI < 0 || fI < 0) { console.log('  ✗ bornes introuvables dans js/prog-main.js'); process.exit(1); }
const M = new Function(src.slice(dR, fR + 3) + '\n' + src.slice(dI, fI)
  + '; return { REF: PROTOCOLS_REF, ICONES: PROTO_ICONS, resoudre: _resolveProtoIcon };')();
const cles = M.ICONES.map(x => x.key);

console.log('\nLa bibliothèque intégrée ne porte que des clés du jeu d\'icônes');
M.REF.forEach(p => ok(p.name + ' : « ' + p.icon + ' » est une clé connue', cles.indexOf(p.icon) >= 0));
/* Le fichier SVG de chaque clé existe : une clé sans fichier donnerait une
   image cassée, pas une icône. */
M.ICONES.forEach(i => ok('le fichier ' + i.src + ' existe', fs.existsSync(path.join(R, i.src))));

console.log('\nL\'affichage ne renvoie jamais la valeur brute');
const svg = (v, j) => M.resoudre(v, 28, j);
ok('une clé donne son SVG', /icon-genou\.svg/.test(svg('genou')));
/* L'ARTICULATION d'abord — avec un émoji qui n'est dans aucune table, pour que
   ce soit bien elle qui décide. */
ok('une icône inconnue retombe sur l\'articulation', /icon-genou\.svg/.test(svg('⭐', 'Genou')));
ok('… accents et casse compris', /icon-epaule/.test(svg('', 'Épaule')));
/* Puis l'émoji reconnu, quand aucune articulation n'est déclarée — c'est le
   cas de la flexion dorsale, rangée en « Mobilité ». */
ok('🦶 sans articulation donne le pied', /icon-pied/.test(svg('🦶', '')));
ok('🦵 sans articulation donne le genou', /icon-genou/.test(svg('🦵', '')));
/* Et jamais la valeur brute : au pire, « Autre ». */
ok('une valeur inconnue sans rien d\'autre donne « Autre »', /icon-dossier\.svg/.test(svg('🤷', '')));
['🦵', '🦶', '⭐', '🤷', '', 'n\'importe quoi'].forEach(v =>
  ok('« ' + v + ' » rend une image, pas du texte', /^<img /.test(svg(v, ''))));

console.log('\nLes deux cartes de protocole transmettent l\'articulation');
const appels = (src.match(/_resolveProtoIcon\(proto\.icon,\s*28,\s*proto\.joint\)/g) || []).length;
const tous = (src.match(/_resolveProtoIcon\(/g) || []).length - 1;          // moins la définition
ok('chaque appel transmet proto.joint', appels === tous && tous >= 2, appels + ' sur ' + tous);

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Icônes des protocoles : tous les cas passent.');

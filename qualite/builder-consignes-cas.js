#!/usr/bin/env node
/* Cas de référence — la consigne d'un exercice du builder.
 *
 * Un `<textarea>` SANS attribut `rows` vaut DEUX lignes. Celui des consignes
 * n'en veut qu'une — son `min-height:24px` le dit, et `autoResizeTa` le fait
 * grandir dès qu'on écrit. Vide, il occupait donc une ligne entière de vide
 * sous CHAQUE exercice. Sur téléphone, où la ligne d'exercice fait déjà
 * ~300 px, c'est ce qui la faisait « descendre pour rien » : mesuré, 48 px de
 * rangée de consigne pour un champ de 26.
 *
 * Le retrait de 34 px alignait la consigne sous le NOM, après la colonne des
 * flèches monter/descendre. Sur téléphone cette colonne est masquée
 * (`nth-child(1){display:none}`) : il ne cale plus rien et ne fait que
 * rétrécir le champ.
 *
 * L'ordre des enfants de `.exo-row` porte toute la grille mobile — elle se
 * place au `nth-child`. Un enfant inséré au milieu la décale en silence.
 *
 *   node qualite/builder-consignes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var data = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
var prog = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

console.log('\nUne seule ligne au repos');
var deb = data.indexOf("html += '<div class=\"exo-consigne-row\">'");
var bloc = data.slice(deb, data.indexOf("html += '</div>';", deb));
ok('le champ de consigne porte rows="1"', /<textarea rows="1" class="exo-consigne-ta/.test(bloc),
   bloc.indexOf('<textarea') > 0 ? 'sans rows : deux lignes par defaut' : 'textarea introuvable');
ok('… et grandit à la frappe', bloc.indexOf('autoResizeTa(this)') > 0);
ok('min-height d\'une ligne dans la feuille',
   /\.exo-consigne-ta \{[^}]*min-height:24px/.test(prog.replace(/\n/g, ' ')));

/* Le champ rempli doit être ré-agrandi AU RENDU, sinon il rouvre à une seule
   ligne et coupe son contenu. */
var raf = data.indexOf('requestAnimationFrame');
var bloRaf = raf > 0 ? data.slice(raf, raf + 700) : '';
ok('les consignes remplies sont ré-agrandies au rendu',
   bloRaf.indexOf('.exo-consigne-ta.has-value') > 0 &&
   bloRaf.indexOf('autoResizeTa(ta)') > 0,
   raf < 0 ? 'aucun requestAnimationFrame' : 'la passe ne vise plus les consignes');

console.log('\nPas de retrait mort sur téléphone');
var mob = prog.slice(prog.indexOf('@media (max-width:700px)'));
mob = mob.slice(0, mob.indexOf('/* ── Phase 1 : agenda mobile'));
ok('la colonne des flèches est bien masquée',
   /nth-child\(1\) \{ display:none/.test(mob));
ok('… donc le retrait de 34 px est annulé',
   /\.builder-body \.exo-consigne-row \{[^}]*padding-left:0/.test(mob));

console.log('\nL\'ordre des enfants de .exo-row porte la grille mobile');
/* La grille mobile place chaque cellule au nth-child : un enfant insere au
   milieu decale tout ce qui suit, en silence. On verifie que la consigne est
   bien le DIXIEME et dernier. */
var ordre = ['exo-move-btns', 'exo-name-cell', 'reps-wrap', 'cell-wrap',
             'cell-wrap', 'chain-recup-wrap', 'cell-wrap', 'cible-cell',
             'exo-del-btn', 'exo-consigne-row'];
var rowDeb = data.indexOf("html += '<div class=\"exo-row\">'");
var rowFin = data.indexOf("html += '</div>';", data.indexOf('exo-consigne-row', rowDeb));
var corps = data.slice(rowDeb, rowFin);
/* On RECONSTRUIT le balisage de la ligne depuis les littéraux concaténés,
   puis on descend les balises avec un compteur de profondeur : seules les
   ouvertures à la profondeur 0 sont des cellules de la grille. Compter les
   `html += '<…'` ne suffit pas — le contenu imbriqué de chaque cellule est
   émis de la même façon. */
var VOID = { br:1, hr:1, img:1, input:1, meta:1, link:1, path:1, circle:1,
             rect:1, line:1, polyline:1, polygon:1, stop:1, use:1, source:1 };
var brut = (corps.match(/'(?:[^'\\]|\\.)*'/g) || [])
  .join('')
  .replace(/'/g, '')
  .replace(/\+[^+]*\+/g, '');
var prof = 0, cellules = [];
(brut.match(/<\/?([a-zA-Z][\w-]*)[^>]*>/g) || []).forEach(function (t) {
  var nom = (t.match(/<\/?([a-zA-Z][\w-]*)/) || [])[1];
  if (!nom) return;
  if (t.charAt(1) === '/') { prof--; return; }
  if (VOID[nom.toLowerCase()] || /\/>$/.test(t)) { if (prof === 1) cellules.push(t); return; }
  if (prof === 1) cellules.push(t);   /* profondeur 1 = enfant de .exo-row */
  prof++;
});

/* La première cellule est émise par DEUX branches exclusives — case à cocher
   du mode « méthode », ou flèches monter/descendre — qui portent la même
   classe. Les littéraux les contiennent toutes les deux : on replie les
   doublons consécutifs de même classe. */
cellules = cellules.filter(function (t, i) {
  if (i === 0) return true;
  var c = function (x) { return (x.match(/class="([\w-]+)/) || [, ''])[1]; };
  return !(c(t) === c(cellules[i - 1]) && c(t) === 'exo-move-btns');
});

ok('la ligne compte exactement dix cellules', cellules.length === 10,
   cellules.length + ' : ' + cellules.map(function (t) {
     return (t.match(/class="([\w-]+)/) || [, '?'])[1];
   }).join(' · '));

var noms = cellules.map(function (t) { return (t.match(/class="([\w-]+)/) || [, ''])[1]; });
ok('… dans l\'ordre que la grille mobile suppose',
   noms.join(',') === ordre.join(','), noms.join(','));
ok('la consigne est la dixième, ciblée par nth-child(10)',
   noms[9] === 'exo-consigne-row' &&
   /nth-child\(10\)\{ ?grid-column:1 \/ -1;/.test(mob.replace(/> \*:/g, '')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Consignes du builder : tous les cas passent.');

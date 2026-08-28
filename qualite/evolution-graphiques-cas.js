#!/usr/bin/env node
/* Cas de référence — graphiques d'Évolution.
 *
 * Deux choses tiennent ici, et elles ne se voient pas au même endroit.
 *
 * 1. LES ÉTIQUETTES NE DOIVENT PAS TOMBER SUR LE TRACÉ. Elles étaient posées
 *    inconditionnellement au-dessus du point (`p.y - 9`, `p.y - 12`) : sur une
 *    courbe qui monte, l'étiquette du premier point se retrouve SUR la ligne.
 *    Elles suivent désormais la pente locale (`_evoLabelDy`) et portent un
 *    liseré blanc (`EVO_HALO`).
 *
 * 2. LE CR DU MÉDECIN RECOPIE CE SVG TEL QUEL. `_crGetEvoSectionHtml`
 *    (outils.html) prend `.evo-chart-kpis` puis `card.querySelector('svg')` —
 *    LE PREMIER `<svg>` de la carte. C'est pourquoi l'en-tête chiffré est du
 *    HTML et non une sparkline : une sparkline glissée avant le graphique
 *    priverait le courrier de ses axes et de ses dates sans le moindre signal.
 *    C'est le cas le plus important du fichier.
 *
 *   node qualite/evolution-graphiques-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var bilanJs   = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var bilanHtml = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var outils    = fs.readFileSync(path.join(R, 'outils.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Tranche des trois constructeurs de courbes. */
var deb = bilanJs.indexOf('function _evoFleche');
var fin = bilanJs.indexOf('function _buildQualGrid');
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes introuvables : _evoFleche … _buildQualGrid.');
  process.exit(1);
}
var CH = bilanJs.slice(deb, fin);

/* ── 1. Les étiquettes fuient le tracé ───────────────────────────── */
console.log('\nPlacement des étiquettes');

ok('helper _evoLabelDy présent', /function _evoLabelDy\s*\(/.test(CH));
ok('liseré EVO_HALO défini', /var EVO_HALO\s*=\s*' stroke="#fff"[^']*paint-order="stroke"/.test(CH));

/* Aucune étiquette du graphique B ne doit garder un décalage figé. */
var figees = CH.match(/y="'\+\(p\.y-\d+\)\.toFixed\(1\)\+'"[^>]*text-anchor="middle"/g) || [];
ok('aucune étiquette au décalage figé', figees.length === 0,
   figees.length + ' restante(s) : ' + figees.slice(0, 2).join(' | '));

/* Chaque appel doit designer la pente ET transmettre les bornes du cadre :
   sans elles, l'etiquette poussee vers le bas atterrit dans la rangee des
   dates — une collision echangee contre une autre. */
var appels = CH.match(/_evoLabelDy\(pts,\s*i,\s*-?\d+,\s*-?\d+,\s*PAD\.top,\s*VH-PAD\.bottom\)/g) || [];
ok('trois étiquettes du graphique B suivent la pente, bornes comprises',
   appels.length === 3, appels.length + ' appel(s) borne(s)');
ok('aucun appel sans bornes',
   (CH.match(/_evoLabelDy\(/g) || []).length === appels.length + 1);

/* Les etiquettes extremes s'ancrent vers l'interieur du cadre. */
ok('l\'etiquette du premier point s\'ancre a droite',
   /text-anchor="start" font-size="9"/.test(CH));
ok('l\'etiquette du dernier point s\'ancre a gauche',
   /text-anchor="end" font-size="10"/.test(CH));

/* Le liseré doit être posé sur TOUTES les étiquettes de valeur. */
var halos = (CH.match(/\+EVO_HALO\+/g) || []).length;
ok('liseré sur les étiquettes de valeur (>= 10)', halos >= 10, halos + ' pose(s)');

/* ── 2. Plus de couleur anonyme dans les axes ────────────────────── */
console.log('\nGrammaire du tracé');
ok('plus de gris anonyme #C0BDB8', CH.indexOf('#C0BDB8') < 0);
ok('plus de grille #EBEBEB', CH.indexOf('#EBEBEB') < 0);
ok('plus de grille en pointillé', CH.indexOf('stroke-dasharray="3,3"') < 0);
ok('aucune bezier résiduelle dans les courbes',
   (CH.match(/lp\+=' C '/g) || []).length === 0);

/* ── 3. Le sens et le jugement sont deux encodages distincts ─────── */
console.log('\nFlèche et couleur');
/* On execute les vraies fonctions, jamais une copie : un cas qui reecrit la
   fonction qu'il teste passe au vert quoi qu'il arrive dans le produit. */
/* eslint-disable no-new-func */
var f = new Function(
  CH.slice(CH.indexOf('function _evoFleche'), CH.indexOf('function _evoFig')) +
  '\nreturn [_evoFleche, _evoStatSingle];')();
var _evoFleche = f[0], _evoStatSingle = f[1];

ok('une hausse porte une flèche montante', _evoFleche(5) === '▲');
ok('une baisse porte une flèche descendante', _evoFleche(-5) === '▼');

/* Une EVA qui passe de 7 à 1 : la valeur BAISSE, et c'est un PROGRÈS. */
var eva = _evoStatSingle(1, 7, '/10', 0, 0, 'down');
ok('EVA 7 → 1 : flèche descendante', eva.indexOf('▼') >= 0, eva);
ok('EVA 7 → 1 : couleur de progrès', /class="evo-kpi evo-pos"/.test(eva), eva);

/* Une force qui baisse : flèche descendante ET couleur de recul. */
var force = _evoStatSingle(90, 120, ' N', 0, 0, 'up');
ok('force 120 → 90 : flèche descendante', force.indexOf('▼') >= 0);
ok('force 120 → 90 : couleur de recul', /class="evo-kpi evo-neg"/.test(force));

/* ── 4. Toutes les courbes cochées à l'ouverture ─────────────────── */
console.log('\nSélection par défaut');
ok('aucune carte rendue désélectionnée',
   bilanJs.indexOf('evo-chart-card evo-unselected') < 0);
ok('les trois cases sont cochées',
   (bilanJs.match(/class="evo-chart-check no-print" checked/g) || []).length === 3);

/* ── 5. Ce que le CR du médecin récolte ──────────────────────────
 * Le courrier prend le PREMIER <svg> de la carte. L'en-tête chiffré doit
 * donc rester du HTML : aucun <svg> ne doit être émis avant le graphique. */
console.log('\nCe que le courrier récolte');
ok('le courrier lit bien le premier <svg> de la carte',
   /card\.querySelector\('svg'\)/.test(outils));
['_evoStatSingle', '_evoStatDual', '_evoFig'].forEach(function (nom) {
  var d = bilanJs.indexOf('function ' + nom + '(');
  var corps = bilanJs.slice(d, bilanJs.indexOf('\n}', d));
  ok(nom + ' n\'émet aucun <svg>', d > 0 && corps.indexOf('<svg') < 0);
});

/* ── 6. Trois feuilles de style, jamais une seule ────────────────
 * Une règle écrite d'un seul côté ne se voit pas là où le document est lu. */
console.log('\nLes trois feuilles');
['evo-stat-val', 'evo-stat-unit', 'evo-stat-from', 'evo-fig-lbl', 'evo-fig-val']
.forEach(function (cls) {
  ok(cls + ' — application, export et courrier',
     bilanHtml.indexOf('.' + cls) >= 0 &&
     bilanJs.indexOf('.' + cls + '{') >= 0 &&
     outils.indexOf('.' + cls + '{') >= 0);
});

/* ── 7. Le panneau du courrier ne disparaît pas en silence ───────
 * Il se masquait quand le patient n'avait pas deux bilans — indiscernable
 * d'une panne. Et sa visibilité n'était calculée QU'au changement de
 * sous-onglet, donc une seule fois, à DOMContentLoaded, quand l'iframe du
 * bilan n'a encore chargé aucun bilan : sélectionner un patient ensuite ne
 * la rejouait jamais. */
console.log('\nLe panneau du courrier');
var mkPanel = outils.slice(outils.indexOf('id="cr-evo-panel"'),
                           outils.indexOf('id="cr-pevo-panel"'));
ok('le panneau n\'est pas masqué dans le balisage',
   !/id="cr-evo-panel"\s+style="display:none/.test(outils));
ok('il porte une ligne d\'état', mkPanel.indexOf('id="cr-evo-status"') > 0);

var fn = outils.slice(outils.indexOf('window._crUpdateEvoPanel = function'));
fn = fn.slice(0, fn.indexOf('\n  };'));
ok('la fonction ne masque plus le panneau',
   !/panel\.style\.display\s*=\s*ok\s*\?/.test(fn) &&
   fn.indexOf("panel.style.display = '';") > 0);
ok('elle désactive la case au lieu de la faire disparaître',
   /toggle\.disabled\s*=\s*!ok/.test(fn));
ok('elle écrit la raison',
   /stat\.textContent\s*=\s*ok\s*\?\s*''\s*:\s*'[^']+'/.test(fn) &&
   /stat\.style\.display\s*=\s*ok\s*\?/.test(fn));

var appels = (outils.match(/window\._crUpdateEvoPanel\(\)/g) || []).length;
/* Quatre moments : crochet de sous-onglet, arrivee de l'import, arrivee des
   tests par `storage`, changement de patient. En perdre un remet le panneau
   dans l'etat qu'il avait au chargement de la page — vide. */
ok('la visibilité se réévalue aux quatre moments', appels >= 4,
   appels + ' appel(s)');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Graphiques d\'evolution : tous les cas passent.');

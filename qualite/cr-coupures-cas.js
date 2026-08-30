#!/usr/bin/env node
/* Cas de référence — coupures de page et export PDF du CR médecin.
 *
 * DEUX SUJETS, une même cause : le document imprimé n'est pas rendu comme
 * l'aperçu, et ce qui n'est pas dit explicitement diverge.
 *
 * 1. UNE SECTION NE SE COUPE PAS EN DEUX. Le titre d'intertitre et ses
 *    tableaux sont FRÈRES dans le balisage, pas imbriqués : `break-after`
 *    sur le titre le retenait avec la première ligne qui suit, mais rien ne
 *    retenait la section entière. Un bloc « Tests de force » pouvait
 *    commencer en bas d'une page et finir sur la suivante.
 *
 * 2. L'APERÇU DIFFÉRAIT ENTRE ORDINATEUR ET iPAD. Sans balise `viewport`,
 *    Safari iOS suppose une page de 980 px et met CETTE largeur à l'échelle
 *    du papier — le contenu de 680 px n'occupait que ~69 % de la feuille. Il
 *    gonflait en outre les tailles de texte, faussant la boucle
 *    d'ajustement ; et cette boucle avançait par `requestAnimationFrame`,
 *    qui ne se déclenche pas dans un onglet en arrière-plan.
 *
 *   node qualite/cr-coupures-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* ── On exécute la VRAIE fonction, avec des doublures ─────────────── */
var d0 = src.indexOf('  function _crBlocsHtml(blocs) {');
var d1 = src.indexOf('\n  /* La case « Pathologie »', d0);
if (d0 < 0 || d1 < d0) { console.error('Bornes de _crBlocsHtml introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
var construire = new Function('_crEsc', '_crEstBloc', '_crMesTab', 'asymTxt', 'crV',
  src.slice(d0, d1) + '\nreturn _crBlocsHtml;')(
  function (x) { return String(x == null ? '' : x).replace(/[&<>]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); },
  function (b) { return !!b && typeof b === 'object' && typeof b.t === 'string'; },
  function () { return '<table class="lt-t"><tr><td>x</td></tr></table>'; },
  function (v) { return v + '%'; }, function () { return ''; });

var VOID = { br:1, hr:1, img:1, input:1, meta:1, link:1, col:1 };
function equilibre(html) {
  var prof = 0, pile = [];
  var tags = html.match(/<\/?([a-zA-Z][\w-]*)[^>]*>/g) || [];
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i], nom = (t.match(/<\/?([a-zA-Z][\w-]*)/) || [])[1].toLowerCase();
    if (VOID[nom] || /\/>$/.test(t)) continue;
    if (t.charAt(1) === '/') { prof--; if (pile.pop() !== nom) return false; }
    else { pile.push(nom); prof++; }
  }
  return prof === 0 && pile.length === 0;
}

console.log('\nUne section reste d\'un seul tenant');
var CAS = [
  ['sections successives', [{ t:'sec', txt:'Amplitudes' }, { t:'ligne', cle:'A', rows:[['','1']] },
    { t:'sec', txt:'Force' }, { t:'ligne', cle:'B', rows:[['','2']] },
    { t:'fin', lignes:['Cordialement,'] }], 2],
  ['aucune section', [{ t:'patient', champs:[['Nom','X']] }, 'texte libre',
    { t:'fin', lignes:['Cordialement,'] }], 0],
  ['section en toute fin, sans pied', [{ t:'sec', txt:'Tests' }, { t:'ligne', cle:'A', rows:[['','1']] }], 1],
  ['blocs de texte dans des sections', [{ t:'sec', txt:'Contexte' }, { t:'concl', txt:'Synthèse' },
    { t:'sec', txt:'Plan' }, { t:'plan', txt:'Le plan' }], 2],
  ['liste dans une section', [{ t:'sec', txt:'Signes' },
    { t:'liste', titre:'Signes', items:[{ ic:'✓', txt:'A' }] }, { t:'fin', lignes:['Cordialement,'] }], 1],
  ['courrier vide', [], 0]
];
CAS.forEach(function (c) {
  var h;
  try { h = construire(c[1]); } catch (e) { ok(c[0], false, 'exception : ' + e.message); return; }
  var grp = (h.match(/<div class="lt-grp">/g) || []).length;
  /* Un groupe par intertitre, ni plus ni moins : en oublier un laisse une
     section coupable, en ouvrir un de trop imbrique les sections. */
  ok(c[0] + ' — ' + c[2] + ' groupe(s), balises équilibrées',
     grp === c[2] && equilibre(h), grp + ' groupe(s)');
});

/* Le pied de lettre a deja son propre groupe : l'enfermer dans la derniere
   section le collerait a des mesures. */
var hf = construire([{ t:'sec', txt:'Tests' }, { t:'ligne', cle:'A', rows:[['','1']] },
                     { t:'fin', lignes:['Cordialement,'] }]);
/* On compte la PROFONDEUR : un `</div>` avant le pied ne prouve rien — celui
   du tableau ou de l'intertitre en ferme un autre. Il faut que le groupe soit
   revenu a zero au moment ou le pied commence. */
var iFin = hf.indexOf('lt-fin');
var iGrp = hf.lastIndexOf('<div class="lt-grp">', iFin);
var profAuPied = 0;
if (iGrp >= 0) {
  var entre = hf.slice(iGrp, iFin).match(/<\/?div[^>]*>/g) || [];
  entre.forEach(function (t) { profAuPied += t.charAt(1) === '/' ? -1 : 1; });
}
ok('le pied de lettre est hors du groupe de section', iGrp < 0 || profAuPied <= 0,
   'profondeur ' + profAuPied + ' au début du pied');

ok('la règle de coupure existe',
   /'\.lt-grp\{break-inside:avoid;page-break-inside:avoid\}'/.test(src));

console.log('\nL\'export imprime la même chose partout');
/* Sans viewport, iOS suppose 980 px et met CETTE largeur a l'echelle du
   papier : le contenu n'occupe alors qu'une fraction de la feuille. */
/* Cette ouverture de document existe DEUX fois — l'export des PROMs a la
   meme. On borne sur ce qui est propre au CR, sinon on lit le mauvais export
   et les assertions echouent sans rapport avec ce qu'elles verifient. */
var _e0 = src.indexOf("'<title>CR — '");
var _e1 = src.indexOf('var w = window.open', _e0);
if (_e0 < 0 || _e1 < _e0) { console.error('Bornes de l\'export CR introuvables.'); process.exit(1); }
/* On remonte jusqu'au debut de la construction du document. */
var expo = src.slice(src.lastIndexOf('var html =', _e0), _e1);
ok('le document d\'export déclare son viewport',
   /<meta name="viewport" content="width=device-width,initial-scale=1">/.test(expo));
ok('iOS ne recalcule plus les tailles de texte',
   /-webkit-text-size-adjust:100%/.test(expo));
/* La boucle FIXE une taille puis mesure : un facteur applique par-dessus
   rendrait la mesure sans rapport avec ce qui est imprime. */
ok('la boucle d\'ajustement a un repli sans requestAnimationFrame',
   /function suivant\(f\)\{var t=setTimeout\(f,32\);/.test(expo) &&
   /if\(window\.requestAnimationFrame\)/.test(expo));
ok('… et elle ne peut pas tourner sans fin', /\+\+tours>40/.test(expo));
ok('l\'impression reste déclenchée au bout', /window\.print\(\);\},350\)/.test(expo));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Coupures et export du CR : tous les cas passent.');

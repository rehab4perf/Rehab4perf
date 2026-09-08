#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Sélecteur d'exercices de l'Évolution des charges

   Vingt-six pastilles à plat, huit rangées de même poids : l'œil n'a aucun
   point d'entrée, et rien ne dit lesquels ont assez de séances pour donner une
   courbe intéressante. Le signal existait pourtant déjà —
   `points.length`, le nombre de séances où l'exercice apparaît — et n'était
   affiché nulle part.

   La liste porte désormais ce nombre, une micro-courbe tirée des MÊMES points,
   et se range par zone de travail.

   LA RÈGLE QUI COMPTE : le regroupement ne s'applique QUE s'il regroupe. Les
   zones viennent de `LIBRARY`, où la bibliothèque du praticien est fusionnée —
   mais un exercice créé à la main peut n'avoir aucune zone. Ranger vingt
   exercices sur vingt-six sous « Non classé » serait pire que de ne pas
   grouper du tout : on retomberait sur le mur, avec un titre en plus.

   En dessous de la moitié d'exercices classés, la liste reste PLATE, triée par
   nombre de séances. C'est la même vue, sans le mensonge d'un rangement qui
   n'en est pas un.

     node qualite/pevo-selecteur-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
var html  = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}
function tranche(deb, fin) {
  var d = pdata.indexOf(deb), f = pdata.indexOf(fin, d + 1);
  if (d < 0 || f < d) { console.error('Bornes introuvables : ' + deb); process.exit(1); }
  return pdata.slice(d, f);
}

/* On exécute le VRAI constructeur du sélecteur, avec une bibliothèque de
   doublure : c'est le classement qu'on teste, pas le contenu de LIBRARY. */
var d0 = pdata.indexOf('function _pevoZoneIndex(');
if (d0 < 0) { console.log('  ✗ `_pevoZoneIndex` introuvable dans js/prog-data.js'); process.exit(1); }
var code = tranche('function _pevoZoneIndex(', 'function _pevoToggle(');

function api(bibli) {
  return new Function('LIBRARY', '_norm', 'escH',
    code + '\nreturn { zones:_pevoZoneIndex, groupes:_pevoGrouper, html:_pevoSelecteurHtml };')(
    bibli,
    function (s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); },
    function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); });
}

var BIBLI = [
  { name: 'Back squat',   zone: 'GENOU' },
  { name: 'Fentes',       zone: 'GENOU' },           // MEME zone que Back squat
  { name: 'Hip thrust',   zone: 'HANCHE' },
  { name: 'Calf raise',   zone: 'CHEVILLE' },
  { name: 'Bench press',  zone: 'ÉPAULE, COUDE' },   // multi-zone
  { name: 'Roue Abdos',   zone: '' }                 // sans zone
];
function exos(liste) {
  var o = {};
  liste.forEach(function (e) {
    o[e[0].toLowerCase()] = { label: e[0], points: new Array(e[1]).fill(0).map(function (_, i) {
      return { date: '2026-0' + (i % 9 + 1) + '-01', rm1: 50 + i }; }) };
  });
  return o;
}

/* ── La zone d'un exercice ────────────────────────────────────────────────── */
console.log('\nLa zone vient de la bibliothèque');

var A = api(BIBLI);
var idx = A.zones();
egal('un exercice classé rend sa zone', 'GENOU', idx['back squat']);
/* Une zone multiple — « ÉPAULE, COUDE » — ne fabrique pas deux groupes : on
   retient la PREMIERE, sans quoi le meme exercice apparaitrait deux fois. */
egal('une zone multiple se réduit à la première', 'ÉPAULE', idx['bench press']);
egal('une zone vide ne classe rien', undefined, idx['roue abdos']);
egal('un exercice absent de la bibliothèque non plus', undefined, idx['exercice inventé']);

/* ── Le regroupement, et sa condition ─────────────────────────────────────── */
console.log('\nLe regroupement ne s\'applique que s\'il regroupe');

var beaucoup = A.groupes(exos([
  ['Back squat', 34], ['Hip thrust', 31], ['Calf raise', 28], ['Bench press', 24]
]), idx);
ok('assez d\'exercices classés → des groupes', beaucoup.grouper === true);
egal('… un groupe par zone', 4, beaucoup.groupes.length);

var peu = A.groupes(exos([
  ['Back squat', 34], ['Roue Abdos', 12], ['Exercice A', 9], ['Exercice B', 7], ['Exercice C', 5]
]), idx);
/* Un seul classé sur cinq : quatre exercices sous « Non classé » et un groupe
   d'un seul element, c'est le mur avec des titres. */
ok('trop peu de classés → liste plate', peu.grouper === false);
egal('… un seul groupe, sans titre', 1, peu.groupes.length);

/* ── Le tri ───────────────────────────────────────────────────────────────── */
console.log('\nLe tri dit ce qui vaut une courbe');

/* Le jeu d'essai est DESORDONNE, et deux exercices partagent une zone. Sans ce
   second point, chaque groupe n'avait qu'un element : il etait trivialement
   trie, et supprimer le tri laissait le cas au vert. */
var t = A.groupes(exos([
  ['Calf raise', 5], ['Back squat', 12], ['Hip thrust', 34], ['Fentes', 30], ['Bench press', 21]
]), idx);
var genou = t.groupes.filter(function (g) { return g.zone === 'GENOU'; })[0];
egal('la zone à deux exercices existe', 2, genou ? genou.exos.length : 0);
egal('… et le plus travaillé y passe devant', 'Fentes', genou.exos[0].label);
var tousTries = t.groupes.every(function (g) {
  return g.exos.every(function (e, i) {
    return i === 0 || g.exos[i-1].n >= e.n;
  });
});
ok('chaque groupe trie du plus travaillé au moins', tousTries);
/* Et les GROUPES eux-memes se rangent par volume : la zone ou le patient a le
   plus travaille se lit en premier. */
var volumes = t.groupes.map(function (g) {
  return g.exos.reduce(function (a, e) { return a + e.n; }, 0); });
ok('les groupes aussi', volumes.every(function (v, i) { return i === 0 || volumes[i-1] >= v; }),
   volumes.join(' > '));

/* Un exercice non classe n'est jamais en tete : ce qui n'est pas range se lit
   apres ce qui l'est. */
/* « Non classé » porte ici le PLUS GROS volume : s'il se rangeait par volume
   comme les autres, il passerait en tete. Un `if` autour de cette verification
   la rendait facultative — elle ne l'est pas. */
var m = A.groupes(exos([['Roue Abdos', 99], ['Back squat', 3], ['Hip thrust', 8],
                        ['Calf raise', 5], ['Bench press', 6]]), idx);
ok('le jeu d\'essai groupe bien', m.grouper === true);
egal('« Non classé » ferme la marche malgré son volume',
     'Non classé', m.groupes[m.groupes.length - 1].zone);
/* L'ordre COMPLET, pas seulement la derniere place : c'est la seule facon de
   voir qu'un comparateur a moitie corrige n'a pas suffi. */
egal('… et l\'ordre complet le montre', 'HANCHE,ÉPAULE,CHEVILLE,GENOU,Non classé',
     m.groupes.map(function (g) { return g.zone; }).join(','));

/* ── Ce que le HTML porte ─────────────────────────────────────────────────── */
console.log('\nCe que la liste affiche');

var h = A.html(exos([['Back squat', 34], ['Hip thrust', 31], ['Calf raise', 5]]),
               new Set(['back squat']), idx);
ok('le nombre de séances est écrit', /34 séances/.test(h), h.slice(0, 200));
ok('une micro-courbe accompagne chaque ligne', (h.match(/pevo-spark/g) || []).length >= 3);
ok('la sélection remonte en chips', /pevo-chip/.test(h));
ok('… et chaque chip se retire', /_pevoToggle/.test(h));
ok('un champ de recherche existe', /pevo-rech/.test(h));
ok('les zones sont repliables', /aria-expanded/.test(h));
/* L'ancien mur ne doit pas subsister a cote : deux selecteurs pour la meme
   chose, et l'on ne sait plus lequel fait foi. */
ok('le mur de pastilles a disparu', pdata.indexOf('pevo-exo-pills" id="pevoPills"') < 0);
/* Les TROIS listes — repetitions, duree, cardio — passent par le meme
   selecteur. Un selecteur ecrit trois fois aurait diverge des la premiere
   correction, et c'est exactement ce qui s'est produit : la duree et le cardio
   etaient restes en pastilles. */
egal('les trois listes emploient le même sélecteur', 3,
     (pdata.match(/_pevoSelecteurHtml\(/g) || []).length - 1);
ok('… avec chacune sa bascule',
   /_pevoToggleDuree'\)/.test(pdata) && /_pevoToggleCardio'\)/.test(pdata));
/* Le CARDIO n'est pas fait d'exercices : le grouper par zone du corps n'a pas
   de sens, on lui passe un index VIDE. */
ok('le cardio reste plat par construction',
   /_pevoSelecteurHtml\(_pevoCardioData, cardioSel, \{\}/.test(pdata));
/* Une regle CSS qui ne sert plus fait croire a un balisage qui n'existe pas. */
ok('le style du mur ne subsiste pas',
   !/\n\s*\.pevo-pill\s*\{/.test(html), 'regle .pevo-pill encore definie');

/* Les trois listes ne rangent pas leur valeur sous le meme nom : `rm1`,
   `secs`, `km`. Lire `rm1` seul rendait une micro-courbe PLATE — donc fausse —
   sur deux listes sur trois. */
var dv = pdata.indexOf('function _pevoValeurPoint(');
ok('la valeur d\'un point est lue quel que soit son nom', dv > 0);
if (dv > 0) {
  var val = new Function(pdata.slice(dv, pdata.indexOf('\n}', dv) + 2) +
                         '\nreturn _pevoValeurPoint;')();
  egal('répétitions', 62, val({ rm1: 62 }));
  egal('durée', 45, val({ secs: 45 }));
  egal('cardio', 12, val({ km: 12 }));
  egal('rien de connu → zéro, pas NaN', 0, val({ autre: 3 }));
  egal('point absent → zéro', 0, val(null));
}

/* Un exercice a UN seul point n'a pas de courbe — il n'arrive de toute facon
   pas jusqu'ici (`pts.length >= 2`), mais la liste ne doit pas le promettre. */
var seul = A.html(exos([['Back squat', 2]]), new Set(), idx);
ok('deux séances s\'annoncent au pluriel', /2 séances/.test(seul), seul);

/* ── La feuille ───────────────────────────────────────────────────────────── */
console.log('\nLa feuille de style');
/* Une SOUS-CHAINE ne prouve rien : `.pevo-spark` se retrouve dans
   `.pevo-spark-x`, et renommer le selecteur laissait le cas au vert. On exige
   une frontiere — accolade, espace ou virgule. */
['.pevo-liste', '.pevo-li', '.pevo-spark', '.pevo-chip', '.pevo-rech', '.pevo-grp'].forEach(function (c) {
  /* On exige une regle dont le selecteur COMMENCE par cette classe. Chercher
     la classe n'importe ou laissait passer le renommage : `.pevo-spark`
     subsiste dans `.pevo-li.on .pevo-spark span`, une regle descendante qui ne
     definit pas l'element. */
  /* La regle doit avoir cette classe pour selecteur COMPLET. « Commence par »
     ne suffisait pas : `.pevo-spark span { … }` satisfaisait le controle, et
     renommer la regle de base passait au vert. */
  var re = new RegExp('(^|[\\n;}])\\s*' + c.replace('.', '\\.') + '\\s*\\{');
  ok(c + ' est défini par sa propre règle', re.test(html),
     (html.match(new RegExp(c.replace('.', '\\.') + '[\\w-]*', 'g')) || []).slice(0, 3).join(' '));
});

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Sélecteur d\'exercices : tous les cas passent.');

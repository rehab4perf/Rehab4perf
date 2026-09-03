#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution — toute mesure fonctionnelle doit avoir sa courbe

   Le Heel Rise n'était dans AUCUN des deux catalogues : ni `CHART_GROUPS`
   (courbes de l'onglet Évolution et blocs du Suivi rapide), ni
   `TRACKED_METRICS` (deltas affichés en bilan de suivi). Il ne manquait pas
   tout seul — dix mesures étaient dans le même cas.

   Une absence de ce genre est INDISCERNABLE d'un patient sans données : la
   carte n'apparaît pas, et rien ne dit pourquoi. D'où ce contrôle, qui part du
   FORMULAIRE et non du catalogue : un test ajouté demain sans courbe échoue.

   On exécute les VRAIS catalogues et les VRAIS calculs.
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

var R = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var src  = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

/* ── Les VRAIS catalogues, evalues ─────────────────────────────────────── */
var t0 = src.indexOf('var TRACKED_METRICS');
var t1 = src.indexOf('/* ── Configuration des graphiques');
var g0 = src.indexOf('var CHART_GROUPS');
var g1 = src.indexOf('\n/* ── Helper : lire la valeur', g0);
if (t0 < 0 || t1 < t0 || g0 < 0 || g1 < g0) {
  console.error('Bornes des catalogues introuvables.'); process.exit(1);
}
/* eslint-disable no-new-func */
var CAT = new Function(src.slice(t0, t1) + src.slice(g0, g1)
  + '\nreturn {suivi:TRACKED_METRICS, groupes:CHART_GROUPS};')();

console.log('\n  Évolution — couverture des tests fonctionnels');
verifie('les deux catalogues sont bien lus', true,
  CAT.suivi.length > 100 && CAT.groupes.length > 50);

/* ── Ce que CHART_GROUPS couvre : ids directs ET ids lus par un compute ── */
var couvert = {};
CAT.groupes.forEach(function(g){
  if (g.idA) couvert[g.idA] = true;
  if (g.idB) couvert[g.idB] = true;
  /* Un compute ne declare pas ses ids : on les recolte en le FAISANT TOURNER
     sur un mouchard qui note chaque cle lue. Lister les ids a la main ici
     rouvrirait exactement le trou que ce fichier ferme. */
  ['computeA', 'computeB'].forEach(function(k){
    if (typeof g[k] !== 'function') return;
    var mouchard = new Proxy({}, { get: function(_, cle){
      if (typeof cle === 'string') couvert[cle] = true;
      return '1';
    }});
    try { g[k](mouchard); } catch (e) { /* le calcul importe peu, les cles oui */ }
  });
});

/* Champs qui ne sont PAS des mesures : conditions de passation, longueurs de
   membre servant a normaliser, essais individuels moyennes ailleurs. */
var PARAMETRES = {
  'dj-hauteur-boite':'hauteur de boîte', 'pset-poids-reel':'charge du test',
  'sebt-longueur-ca':'longueur de membre', 'sebt-longueur-cs':'longueur de membre',
  'uqybt-sl-d':'longueur de membre', 'uqybt-sl-g':'longueur de membre',
  'ckc-env-d':'envergure (espacement)', 'ckc-env-g':'envergure (espacement)',
  'ckc-s0':'familiarisation', 'ckc-s1':'essai', 'ckc-s4':'sert au MEI',
  'ulrt-d1':'essai moyenné', 'ulrt-d2':'essai moyenné', 'ulrt-d3':'essai moyenné',
  'ulrt-g1':'essai moyenné', 'ulrt-g2':'essai moyenné', 'ulrt-g3':'essai moyenné'
};

var PAGES = ['page-fonctionnels', 'page-fonctionnelsMS', 'page-fonctionnelsRachis',
             'page-force-ms', 'page-force-mi', 'page-force-rachis', 'page-musculaires'];
var orphelins = [];
PAGES.forEach(function(pg){
  var i = html.indexOf('<div class="page" id="' + pg + '"');
  if (i < 0) { console.error('Page ' + pg + ' introuvable.'); process.exit(1); }
  /* Borner la lecture : sans cette borne on deborde sur les pages suivantes,
     et le controle passerait au vert en couvrant autre chose. */
  var j = html.indexOf('<div class="page" id="', i + 10);
  if (j < 0) j = html.indexOf('</main>', i);
  if (j < 0) { console.error('Fin de ' + pg + ' introuvable.'); process.exit(1); }
  (html.slice(i, j).match(/<input[^>]*>/g) || []).forEach(function(tag){
    if (!/type="number"/.test(tag)) return;
    var id = (tag.match(/id="([^"]+)"/) || [])[1];
    if (!id || couvert[id] || PARAMETRES[id]) return;
    orphelins.push(pg + ' → ' + id);
  });
});
verifie('aucune mesure sans courbe', [], orphelins);

/* ── Les menus d'appreciation ne sont PAS des courbes ─────────────────── */
/* A cote de chaque force en kg, un menu deroulant dit la qualite du test
   (douleur, faiblesse, appréhension). C'est du texte : il n'a pas de sens sur
   une courbe, et le praticien veut la comparaison CHIFFREE des deux cotes. */
var selects = [];
PAGES.forEach(function(pg){
  var i = html.indexOf('<div class="page" id="' + pg + '"');
  var j = html.indexOf('<div class="page" id="', i + 10);
  if (j < 0) j = html.indexOf('</main>', i);
  (html.slice(i, j).match(/<select[^>]*id="([^"]+)"/g) || []).forEach(function(tag){
    selects.push(tag.match(/id="([^"]+)"/)[1]);
  });
});
verifie('des menus d\'appréciation existent bien', true, selects.length > 20);
verifie('… et aucun n\'alimente une courbe', [],
  selects.filter(function(id){ return couvert[id]; }));
/* Le chemin des tests personnalises lit `valA`/`valB` en `parseFloat` : c'est
   la seule autre porte d'entree d'une courbe, et elle est chiffree par nature. */
verifie('les tests personnalisés n\'entrent que par un nombre', true,
  /parseFloat\(t\.valA\)/.test(src) && /parseFloat\(t\.valB\)/.test(src));

/* ── Les tests fonctionnels QUALITATIFS gardent leurs cartes ──────────── */
/* Reception et Pliometrie qualitative sont des scores de criteres coches :
   ce sont des tests a part entiere, pas la colonne d'appreciation d'une force.
   Decision du praticien : ils restent dans l'Evolution. */
var q0 = src.indexOf('var QUAL_GROUPS');
verifie('les tests qualitatifs ont toujours leur catalogue', true, q0 > 0);
verifie('… et sont toujours dessinés dans l\'Évolution', true,
  /QUAL_GROUPS\.forEach/.test(src) && /_buildQualChart\(scoresA/.test(src));

/* ── Le Heel Rise, nommement : c'est par lui que le trou s'est vu ─────── */
verifie('la préhension a sa courbe', true, !!(couvert['ms-grip-ca'] && couvert['ms-grip-cs']));
/* La Contraction Flash vit sur une page CLINIQUE, que le balayage ci-dessus ne
   couvre pas : sans cette attente nommement, son absence repasserait inapercue.
   Elle compte des REPETITIONS — la meme unite que le courrier, corrigee au
   meme moment. */
verifie('la Contraction Flash a sa courbe', true, !!(couvert['cf-q-ca'] && couvert['cf-q-cs']));
var _cf = CAT.groupes.filter(function(g){ return g.idA === 'cf-q-ca'; })[0];
verifie('… en répétitions, jamais en kilos', 'rép', _cf && _cf.unit);
verifie('… et son delta en bilan de suivi', true, !!(function(){
  var m = {}; CAT.suivi.forEach(function(x){ m[x.id] = 1; });
  return m['cf-q-ca'] && m['cf-q-cs'];
})());
verifie('l\'isocinétique a ses courbes', true, !!(couvert['q-f-ca'] && couvert['ij-r-cs']));
verifie('le Heel Rise a sa courbe', true, !!(couvert['hr-ca'] && couvert['hr-cs']));
var suiviIds = {}; CAT.suivi.forEach(function(m){ suiviIds[m.id] = m; });
verifie('… et son delta en bilan de suivi', true, !!suiviIds['hr-ca']);

/* ── Les calculs des groupes agreges, executes ────────────────────────── */
var slst = CAT.groupes.filter(function(g){ return /Single-Leg Stance/.test(g.title || ''); })[0];
verifie('le SLST est un groupe', true, !!slst);
if (slst) {
  /* Six sous-scores : c'est leur SOMME qui a un sens clinique. */
  verifie('le SLST somme ses six lignes', 9,
    slst.computeA({'slst-ca-1':'2','slst-ca-2':'0','slst-ca-3':'3',
                   'slst-ca-4':'1','slst-ca-5':'3','slst-ca-6':'0'}));
  /* Un bilan ou le test n'a pas ete passe ne doit pas valoir ZERO erreur —
     ce serait un score parfait invente, et le meilleur point de la courbe. */
  verifie('… et vaut NaN si le test n\'a pas été passé', true,
    isNaN(slst.computeB({})));
  verifie('moins d\'erreurs = mieux', 'down', slst.dir);
}
var ckc = CAT.groupes.filter(function(g){ return /mCKCUEST/.test(g.title || ''); })[0];
verifie('le mCKCUEST est un groupe', true, !!ckc);
if (ckc) {
  verifie('son score est la moyenne des essais 2 et 3', 20,
    ckc.computeA({'ckc-s2':'19','ckc-s3':'21','ckc-s0':'5','ckc-s4':'40'}));
  verifie('… et tient sur un seul essai', 19, ckc.computeA({'ckc-s2':'19'}));
  verifie('… mais pas sur aucun', true, isNaN(ckc.computeA({'ckc-s0':'5'})));
}

/* ── L'asymetrie d'un test CHRONOMETRE ────────────────────────────────── */
console.log('\n  Asymétrie d\'un test chronométré');
var chronos = CAT.groupes.filter(function(g){ return g.type === 'dual' && g.dir === 'down'; });
verifie('des graphiques doubles sont chronométrés', true, chronos.length >= 2);

/* On execute le VRAI calcul, decoupe dans _renderEvolutionPage. */
var e0 = src.indexOf('var _evoBilat = _isBilateral()');
var e1 = src.indexOf('if(!isNaN(lsiVal))', e0);
if (e0 < 0 || e1 < e0) { console.error('Bornes du calcul d\'asymétrie introuvables.'); process.exit(1); }
var calcLsi = new Function('lastA', 'lastB_val', 'grp', '_isBilateral',
  src.slice(e0, e1) + '\nreturn lsiVal;');
var bilatNon = function(){ return false; };

/* Figure-of-8 : le cote atteint met 3,0 s la ou le sain met 2,5 s. Le rapport
   atteint/sain vaut 120 % — au-dessus de 90, donc VERT, alors que le patient
   est 20 % plus lent du cote lese. Le rapport doit s'inverser. */
verifie('un côté atteint plus LENT donne une asymétrie basse', 83,
  calcLsi(3.0, 2.5, {dir:'down', labelA:'Atteint', labelB:'Sain'}, bilatNon));
verifie('… et deux côtés égaux donnent 100', 100,
  calcLsi(2.5, 2.5, {dir:'down', labelA:'Atteint', labelB:'Sain'}, bilatNon));
/* Un test ou le plus est le mieux garde son sens d'origine. */
verifie('un test « plus = mieux » n\'est pas touché', 80,
  calcLsi(20, 25, {dir:'up', labelA:'Atteint', labelB:'Sain'}, bilatNon));

/* ── Le Suivi rapide ne doit pas poser deux champs pour un meme id ────── */
console.log('\n  Suivi rapide');
var s0 = src.indexOf('function _renderSuiviRapide');
var s1 = src.indexOf('\nfunction ', s0 + 10);
if (s0 < 0 |
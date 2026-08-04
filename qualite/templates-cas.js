#!/usr/bin/env node
/* Cas de référence — injection d'un template dans la séance.
 *
 * Un template s'AJOUTE toujours, il ne remplace jamais. « Vider » est un geste
 * séparé : le praticien l'utilise quand il veut repartir du template seul.
 * Il n'y a donc qu'un seul verbe, et aucune destruction silencieuse.
 *
 * Le piège central est celui du modèle d'étapes : l'ordre vit dans `blocs`, et
 * l'appartenance est positionnelle. Écrire `etapeId` sur un bloc importé ne
 * suffit pas — `_syncEtapeIds()` le réécrira depuis la position. Il faut poser
 * de vrais séparateurs, sans quoi le contenu importé est absorbé par la
 * dernière étape en place.
 *
 *   node qualite/templates-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

function zone(src, depuis, jusqua) {
  var a = src.indexOf(depuis), b = src.indexOf(jusqua);
  if (a < 0 || b < 0 || b <= a) {
    console.error('Bornes introuvables : « ' + depuis + ' » .. « ' + jusqua + ' ».');
    process.exit(1);
  }
  var ouvert = src.lastIndexOf('/*', b);
  if (ouvert > a && src.indexOf('*/', ouvert) > b) b = ouvert;
  return src.slice(a, b);
}

var data = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');
var main = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-main.js'), 'utf8');

var moteur =
  zone(data, 'function _estMarqueur', 'function addExoFromLib') + '\n' +
  // Borne de fin : la fonction qui suit _injecterTemplate dans prog-main.js.
  // Si elle est renommee ou deplacee, corriger ici — le test le dira.
  zone(main, 'function _injecterTemplate', 'function _addBlocFromPicker');

var prelude = [
  'var blocs = [], etapes = [], activeBloc = null;',
  'var ETAPE_COLORS = ["#F59E0B","#2563EB","#0D9488"];',
  'var _n = 0;',
  'function genId(){ return "_id" + (++_n); }',
  'function getEtape(id){ return etapes.find(function(e){ return e.id === id; }); }',
  'function renderSession(){}',
  'var document = { querySelector:function(){return null;}, querySelectorAll:function(){return [];} };'
].join('\n');

var api = new Function(
  prelude + '\n' + moteur + '\n' +
  'return { injecter: _injecterTemplate,' +
  '         set: function(b, e){ blocs = b; etapes = e; },' +
  '         blocs: function(){ return blocs; },' +
  '         etapes: function(){ return etapes; },' +
  '         sync: _syncEtapeIds };'
)();

var nbOk = 0, nbKo = 0;
/* On lit les TITRES, pas les identifiants : ceux-ci sont régénérés à chaque
   injection et leur numérotation est incidente. */
function lire() {
  return api.blocs().map(function (b) {
    if (b.type === 'etape') return '|' + (getTitre(b.id) || b.id);
    if (b.type === 'libre') return '|';
    return b.title || b.id;
  }).join(' ');
}
function getTitre(id) {
  var e = api.etapes().find(function (x) { return x.id === id; });
  return e ? e.title : null;
}
function appartenances() {
  api.sync();
  return api.blocs().filter(function (b) { return b.type !== 'etape' && b.type !== 'libre'; })
    .map(function (b) { return (b.title||b.id) + '→' + (getTitre(b.etapeId) || 'aucune'); }).join(' ');
}
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

function bloc(nom) { return { id: nom, title: nom, exos: [] }; }
function sep(id) { return { id: id, type: 'etape' }; }

/* Un template enregistré APRÈS la refonte : il porte ses séparateurs. */
var tmplAvecSeparateurs = {
  etapes: [{ id: 'E9', title: 'Échauffement', color: '#F59E0B' }],
  blocs: [sep('E9'), bloc('T1'), bloc('T2')]
};
/* Un template enregistré AVANT : pas de séparateur, seulement des etapeId. */
var tmplAncien = {
  etapes: [{ id: 'E8', title: 'Renfo', color: '#2563EB' }],
  blocs: [ { id: 'A1', title: 'A1', exos: [], etapeId: 'E8' },
           { id: 'A2', title: 'A2', exos: [], etapeId: 'E8' } ]
};

/* ── Injection dans une séance vide ──────────────────────────────────────── */

console.log('\nSéance vide — le template s\'installe tel quel');
api.set([], []);
api.injecter(tmplAvecSeparateurs);
verifie('l\'étape et ses blocs arrivent avec leur séparateur',
  '|Échauffement T1 T2', lire());
verifie('les blocs appartiennent bien à l\'étape importée',
  'T1→Échauffement T2→Échauffement', appartenances());

/* ── Le piège : ne pas se faire absorber par l'étape en place ────────────── */

console.log('\nSéance déjà remplie — le contenu importé garde son étape');
api.set([sep('EX'), bloc('X1')], [{ id: 'EX', title: 'Existante', color: '#0D9488' }]);
api.injecter(tmplAvecSeparateurs);
verifie('un séparateur est posé, l\'étape en place n\'absorbe rien',
  '|Existante X1 |Échauffement T1 T2', lire());
verifie('X1 reste à l\'existante, les importés à la leur',
  'X1→Existante T1→Échauffement T2→Échauffement', appartenances());

/* ── Un template sans étape, injecté sous une étape ouverte ──────────────── */

console.log('\nTemplate sans étape — il ne rejoint pas l\'étape ouverte');
api.set([sep('EY'), bloc('Y1')], [{ id: 'EY', title: 'Ouverte', color: '#0D9488' }]);
api.injecter({ etapes: [], blocs: [bloc('L1'), bloc('L2')] });
verifie('une zone libre s\'ouvre avant les blocs importés',
  '|Ouverte Y1 | L1 L2', lire());
verifie('les blocs importés n\'appartiennent à aucune étape',
  'Y1→Ouverte L1→aucune L2→aucune', appartenances());

/* ── Compatibilité : un template enregistré avant la refonte ─────────────── */

console.log('\nAncien format — regroupé par etapeId, sans séparateur');
api.set([], []);
api.injecter(tmplAncien);
verifie('les séparateurs sont reconstruits depuis etapeId',
  '|Renfo A1 A2', lire());
verifie('l\'appartenance est retrouvée',
  'A1→Renfo A2→Renfo', appartenances());

/* ── Indépendance des copies ─────────────────────────────────────────────── */

console.log('\nIndépendance — deux injections du même template ne se mélangent pas');
api.set([], []);
api.injecter(tmplAvecSeparateurs);
api.injecter(tmplAvecSeparateurs);
var ids = api.blocs().filter(function (b) { return !b.type; }).map(function (b) { return b.id; });
verifie('quatre blocs, tous d\'identifiants distincts',
  '4 / 4', ids.length + ' / ' + new Set(ids).size);
var sepIds = api.blocs().filter(function (b) { return b.type === 'etape'; }).map(function (b) { return b.id; });
verifie('deux étapes distinctes, pas une seule partagée',
  '2 / 2', sepIds.length + ' / ' + new Set(sepIds).size);
verifie('le template source n\'a pas été modifié',
  'E9', tmplAvecSeparateurs.blocs[0].id);

/* ── Rien à injecter ─────────────────────────────────────────────────────── */

console.log('\nCas limites');
api.set([sep('EZ'), bloc('Z1')], [{ id: 'EZ', title: 'Intacte', color: '#F59E0B' }]);
api.injecter({ blocs: [], etapes: [] });
verifie('un template vide ne touche à rien', '|Intacte Z1', lire());
api.injecter(null);
verifie('une donnée absente ne casse rien', '|Intacte Z1', lire());

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

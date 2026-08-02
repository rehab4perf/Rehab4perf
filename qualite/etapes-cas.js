#!/usr/bin/env node
/* Cas de référence — ordre des étapes dans le builder.
 *
 * Le modèle : l'ordre de la séance vit dans `blocs` et nulle part ailleurs. Un
 * séparateur est une entrée `{id, type:'etape'}`, et l'appartenance d'un bloc à
 * une étape est POSITIONNELLE — le dernier séparateur rencontré avant lui.
 *
 * D'où le piège central, vérifié ici : tout bloc poussé derrière un séparateur
 * est absorbé par l'étape correspondante. Les blocs placés avant la première
 * étape n'appartiennent à aucune ; un déplacement d'étape ne doit jamais les
 * faire passer sous un séparateur.
 *
 *   node qualite/etapes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

/* ── Chargement du module ────────────────────────────────────────────────── */

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');
var debut = src.indexOf('function _estMarqueur');
var fin = src.indexOf('function addExoFromLib');
if (debut < 0 || fin < 0 || fin <= debut) {
  console.error('Bornes introuvables dans js/prog-data.js.');
  console.error('Le test extrait la zone entre `function _estMarqueur` et');
  console.error('`function addExoFromLib`. Si ces fonctions ont ete renommees ou');
  console.error('deplacees, corriger les bornes ci-dessus.');
  process.exit(1);
}

var prelude = [
  'var blocs = [], etapes = [], activeBloc = null;',
  'var ETAPE_COLORS = ["#F59E0B","#2563EB","#0D9488"];',
  'var _n = 0;',
  'function genId(){ return "_id" + (++_n); }',
  'function getEtape(id){ return etapes.find(function(e){ return e.id === id; }); }',
  // Le rendu et la sauvegarde ne sont pas testes ici : seul l'ordre l'est.
  'function renderSession(){}',
  'var document = { querySelector: function(){ return null; },',
  '                 querySelectorAll: function(){ return []; } };'
].join('\n');

var api = new Function(
  prelude + '\n' + src.slice(debut, fin) + '\n' +
  'return { setEtat: function(b, e){ blocs = b; etapes = e; },' +
  '         etat: function(){ return blocs; },' +
  '         addEtape: addEtape, moveEtape: moveEtape,' +
  '         dissolveEtape: dissolveEtape, syncEtapeIds: _syncEtapeIds,' +
  '         groupes: _groupBlocsForRender };'
)();

/* ── Utilitaires de lecture ──────────────────────────────────────────────── */

var nbOk = 0, nbKo = 0;

function bloc(nom) { return { id: nom, title: nom, exos: [] }; }
function sep(nom) { return { id: nom, type: 'etape' }; }

/* Une séance se lit « E1 [ A B ] E2 [ C ] », les blocs hors étape en tête. */
function lire() {
  return api.etat().map(function(b) {
    return b.type === 'etape' ? '|' + b.id : b.id;
  }).join(' ');
}

function verifier(intitule, attendu, obtenu) {
  if (attendu === obtenu) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

function appartenances() {
  api.syncEtapeIds();
  return api.etat().filter(function(b) { return b.type !== 'etape'; })
    .map(function(b) { return b.id + '→' + (b.etapeId || 'aucune'); }).join(' ');
}

/* ── Cas 1 : deux étapes pleines s'échangent avec leur contenu ───────────── */

console.log('\nCas 1 — permuter deux étapes emporte leurs blocs');
api.setEtat(
  [sep('E1'), bloc('A'), bloc('B'), sep('E2'), bloc('C')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.moveEtape('E2', -1);
verifier('E2 et son bloc passent devant E1',
  '|E2 C |E1 A B', lire());
verifier('chaque bloc suit son étape',
  'C→E2 A→E1 B→E1', appartenances());

api.moveEtape('E2', 1);
verifier('le mouvement inverse restitue l\'ordre initial',
  '|E1 A B |E2 C', lire());

/* ── Cas 2 : les blocs hors étape ne sont jamais avalés ──────────────────── */

console.log('\nCas 2 — les blocs placés avant toute étape restent hors étape');
api.setEtat(
  [bloc('LIBRE'), sep('E1'), bloc('A'), sep('E2'), bloc('B')],
  [{ id: 'E1' }, { id: 'E2' }]
);
verifier('au départ, LIBRE n\'appartient à aucune étape',
  'LIBRE→aucune A→E1 B→E2', appartenances());

api.moveEtape('E1', -1);
verifier('E1 est déjà la première étape : rien ne bouge',
  'LIBRE |E1 A |E2 B', lire());

api.moveEtape('E2', -1);
verifier('E2 remonte devant E1 sans passer devant LIBRE',
  'LIBRE |E2 B |E1 A', lire());
verifier('LIBRE n\'a pas été absorbé',
  'LIBRE→aucune B→E2 A→E1', appartenances());

/* ── Cas 3 : une étape vide se déplace ───────────────────────────────────── */

console.log('\nCas 3 — une étape vide se place avant d\'être remplie');
api.setEtat(
  [sep('E1'), bloc('A'), sep('E2')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.moveEtape('E2', -1);
verifier('E2, vide, remonte en première position',
  '|E2 |E1 A', lire());
verifier('le bloc de E1 reste à E1',
  'A→E1', appartenances());

/* ── Cas 4 : les bornes ne débordent pas ─────────────────────────────────── */

console.log('\nCas 4 — aux extrémités, le déplacement est sans effet');
api.setEtat(
  [sep('E1'), bloc('A'), sep('E2'), bloc('B')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.moveEtape('E1', -1);
verifier('monter la première étape ne change rien',
  '|E1 A |E2 B', lire());
api.moveEtape('E2', 1);
verifier('descendre la dernière étape ne change rien',
  '|E1 A |E2 B', lire());
api.moveEtape('INCONNUE', 1);
verifier('une étape inexistante est ignorée',
  '|E1 A |E2 B', lire());

/* ── Cas 5 : trois étapes, l'ordre relatif des autres est préservé ───────── */

console.log('\nCas 5 — sur trois étapes, seules deux voisines permutent');
api.setEtat(
  [sep('E1'), bloc('A'), sep('E2'), bloc('B'), sep('E3'), bloc('C')],
  [{ id: 'E1' }, { id: 'E2' }, { id: 'E3' }]
);
api.moveEtape('E3', -1);
verifier('E3 permute avec E2, E1 ne bouge pas',
  '|E1 A |E3 C |E2 B', lire());
api.moveEtape('E1', 1);
verifier('E1 descend d\'un cran',
  '|E3 C |E1 A |E2 B', lire());

/* ── Cas 6 : dissoudre une étape ne perd aucun bloc ──────────────────────── */

console.log('\nCas 6 — dissoudre rend les blocs à l\'étape précédente');
api.setEtat(
  [sep('E1'), bloc('A'), sep('E2'), bloc('B')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.dissolveEtape('E2');
verifier('le séparateur disparaît, les blocs restent en place',
  '|E1 A B', lire());
verifier('B rejoint l\'étape qui le précède désormais',
  'A→E1 B→E1', appartenances());

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

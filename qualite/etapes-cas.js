#!/usr/bin/env node
/* Cas de référence — ordre des étapes dans le builder.
 *
 * Le modèle : l'ordre de la séance vit dans `blocs` et nulle part ailleurs.
 * Deux séparateurs y cohabitent — `{id, type:'etape'}` ouvre une étape nommée,
 * `{type:'libre'}` ouvre une zone qui n'appartient à aucune. L'appartenance
 * d'un bloc est POSITIONNELLE : c'est le dernier séparateur avant lui.
 *
 * D'où le piège central, vérifié ici : tout bloc poussé derrière un séparateur
 * d'étape est absorbé par elle. C'est pour ça qu'un déplacement d'étape ne
 * traverse pas les zones libres, qu'une flèche de bloc ne franchit pas une
 * frontière, et que sortir un bloc d'une étape ouvre une zone libre au lieu de
 * l'expédier en tête de séance.
 *
 *   node qualite/etapes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

/* ── Chargement du module ────────────────────────────────────────────────── */

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

/* Deux zones a extraire : les helpers d'etape, et moveBloc qui vit ailleurs. */
function zone(depuis, jusqua) {
  var a = src.indexOf(depuis), b = src.indexOf(jusqua);
  if (a < 0 || b < 0 || b <= a) {
    console.error('Bornes introuvables dans js/prog-data.js : « ' + depuis +
      ' » .. « ' + jusqua + ' ».');
    console.error('Si ces fonctions ont ete renommees ou deplacees, corriger les');
    console.error('bornes en tete de ce fichier.');
    process.exit(1);
  }
  // Reculer sur un commentaire ouvert juste avant la borne : le tronquer
  // laisserait un /* jamais fermé dans le code extrait.
  var ouvert = src.lastIndexOf('/*', b);
  if (ouvert > a && src.indexOf('*/', ouvert) > b) b = ouvert;
  return src.slice(a, b);
}

var moteur = zone('function _estMarqueur', 'function addExoFromLib') + '\n' +
             zone('function moveBloc', '   TEMPS ESTIMÉ');

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
  prelude + '\n' + moteur + '\n' +
  'return { setEtat: function(b, e){ blocs = b; etapes = e; },' +
  '         etat: function(){ return blocs; },' +
  '         addEtape: addEtape, moveEtape: moveEtape, moveBloc: moveBloc,' +
  '         assignBlocEtape: assignBlocEtape,' +
  '         dissolveEtape: dissolveEtape, syncEtapeIds: _syncEtapeIds,' +
  '         premierDuGroupe: _estPremierDuGroupe,' +
  '         dernierDuGroupe: _estDernierDuGroupe,' +
  '         groupes: _groupBlocsForRender };'
)();

/* ── Utilitaires de lecture ──────────────────────────────────────────────── */

var nbOk = 0, nbKo = 0;

function bloc(nom) { return { id: nom, title: nom, exos: [] }; }
function sep(nom) { return { id: nom, type: 'etape' }; }

/* Une séance se lit « |E1 A B |E2 C ». `|X` ouvre l'étape X, `|` seul ouvre
   une zone hors étape. */
function lire() {
  return api.etat().map(function(b) {
    if (b.type === 'etape') return '|' + b.id;
    if (b.type === 'libre') return '|';
    return b.id;
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
  return api.etat().filter(function(b) { return b.type !== 'etape' && b.type !== 'libre'; })
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

/* ── Cas 7 : sortir un bloc d'une étape ne le renvoie pas en tête ────────── */

console.log('\nCas 7 — « Sans étape » sort le bloc sur place, pas en tête de séance');
api.setEtat(
  [sep('E1'), bloc('A'), bloc('B'), bloc('C')],
  [{ id: 'E1' }]
);
api.assignBlocEtape('B', '');
verifier('B sort de E1 et se pose juste après elle',
  '|E1 A C | B', lire());
verifier('A et C restent dans E1, B n\'appartient à aucune',
  'A→E1 C→E1 B→aucune', appartenances());

api.setEtat(
  [sep('E1'), bloc('A'), bloc('B')],
  [{ id: 'E1' }]
);
api.assignBlocEtape('B', '');
verifier('le dernier bloc d\'une étape ne bouge pas du tout',
  '|E1 A | B', lire());

/* ── Cas 8 : les séparateurs libres redondants disparaissent ─────────────── */

console.log('\nCas 8 — pas de zone libre inutile qui s\'accumule');
api.setEtat(
  [sep('E1'), bloc('A'), bloc('B'), bloc('C')],
  [{ id: 'E1' }]
);
api.assignBlocEtape('C', '');
api.assignBlocEtape('B', '');
// B sort après C mais se pose au début de la zone libre, donc devant lui :
// les deux blocs gardent l'ordre relatif qu'ils avaient dans l'étape.
verifier('deux sorties de suite ne créent qu\'une seule zone libre',
  '|E1 A | B C', lire());

api.setEtat([bloc('A'), sep('E1'), bloc('B')], [{ id: 'E1' }]);
api.assignBlocEtape('A', '');
verifier('un bloc déjà hors étape n\'ouvre pas de zone',
  'A |E1 B', lire());

/* ── Cas 9 : un bloc rejoint une étape ───────────────────────────────────── */

console.log('\nCas 9 — rattacher un bloc le place à la fin de l\'étape visée');
api.setEtat(
  [bloc('LIBRE'), sep('E1'), bloc('A'), sep('E2'), bloc('B')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.assignBlocEtape('LIBRE', 'E2');
verifier('LIBRE rejoint la fin de E2',
  '|E1 A |E2 B LIBRE', lire());
verifier('il appartient bien à E2',
  'A→E1 B→E2 LIBRE→E2', appartenances());

/* ── Cas 10 : les flèches d'un bloc ne franchissent pas une étape ────────── */

console.log('\nCas 10 — un bloc ne change pas d\'étape avec les flèches');
api.setEtat(
  [sep('E1'), bloc('A'), sep('E2'), bloc('B'), bloc('C')],
  [{ id: 'E1' }, { id: 'E2' }]
);
api.moveBloc(3, -1);   // B, premier de E2, vers le haut
verifier('B ne saute pas dans E1',
  '|E1 A |E2 B C', lire());
verifier('la flèche du premier bloc du groupe est désactivée',
  'true', String(api.premierDuGroupe(3)));

api.moveBloc(4, -1);   // C passe devant B, dans la même étape
verifier('à l\'intérieur d\'une étape, le bloc se déplace normalement',
  '|E1 A |E2 C B', lire());
verifier('les deux restent dans E2',
  'A→E1 C→E2 B→E2', appartenances());

api.moveBloc(4, 1);    // B, dernier de E2, vers le bas
verifier('le dernier bloc de la séance ne sort pas de son étape',
  '|E1 A |E2 C B', lire());
verifier('la flèche du dernier bloc du groupe est désactivée',
  'true', String(api.dernierDuGroupe(4)));

/* ── Cas 11 : dissoudre une étape rend sa zone libre inutile ─────────────── */

console.log('\nCas 11 — pas de séparateur libre orphelin après dissolution');
api.setEtat(
  [sep('E1'), bloc('A'), { type: 'libre' }, bloc('B')],
  [{ id: 'E1' }]
);
verifier('au départ, B est hors étape et A dedans',
  'A→E1 B→aucune', appartenances());
api.dissolveEtape('E1');
verifier('E1 dissoute, le séparateur libre ne sert plus à rien',
  'A B', lire());
verifier('les deux blocs sont hors étape',
  'A→aucune B→aucune', appartenances());

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

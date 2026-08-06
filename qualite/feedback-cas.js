#!/usr/bin/env node
/* Cas de référence — attribution des retours athlète à leur exercice.
 *
 * La clé de feedback est POSITIONNELLE : « b1e0 » veut dire « premier
 * exercice du deuxième bloc », comptés sur la liste que l'athlète avait sous
 * les yeux — donc SANS les séparateurs d'étape, qui ne s'affichent pas comme
 * des blocs. Le nom, lui, était stocké à côté, et a pu être calculé sur la
 * liste non filtrée : c'est ce décalage qui attribuait le commentaire d'un
 * squat à l'exercice d'à côté.
 *
 * D'où la règle vérifiée ici : on ne fait jamais confiance au nom stocké, on
 * le recalcule depuis la clé. Trois lecteurs en dépendent — le panneau
 * Feedback du builder, le journal, et les courbes de douleur par exercice —
 * et chacun doit passer les blocs de SA séance : le journal affiche des
 * retours de plusieurs séances à la suite, la globale `blocs` du builder y
 * donnerait une seconde mauvaise attribution.
 *
 *   node qualite/feedback-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');
var deb = src.indexOf("/* Retrouve le nom d'un exercice depuis la cle de feedback");
var fin = src.indexOf('/* Extrait les données NRS');
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes introuvables dans js/prog-data.js.');
  console.error('Le test extrait _nomDepuisCleFeedback entre son commentaire et');
  console.error('celui de _extractExoNRS. Corriger les bornes si elles ont bougé.');
  process.exit(1);
}
var nomDepuisCle = new Function(src.slice(deb, fin) +
  '\nreturn _nomDepuisCleFeedback;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* Une séance telle qu'elle est réellement enregistrée : deux étapes nommées,
   donc deux séparateurs intercalés entre les blocs. C'est exactement la forme
   qui provoquait le décalage. */
var seance = [
  { id: 'e1', type: 'etape', title: 'Échauffement' },
  { type: 'exo', exos: [ { name: 'Vélo' }, { name: 'Mobilité hanche' } ] },
  { id: 'e2', type: 'etape', title: 'Renforcement' },
  { type: 'exo', exos: [ { name: 'Squat jump (départ assis)' }, { name: 'Fente bulgare' } ] },
  { type: 'cardio', sport: 'Rameur' }
];

/* ── Les séparateurs ne comptent pas ─────────────────────────────────────── */

console.log('\nIndex sur la liste vue par l\'athlète, séparateurs exclus');
verifie('b0e0 → premier exercice du premier bloc réel', 'Vélo', nomDepuisCle('b0e0', seance));
verifie('b0e1 → second exercice du même bloc', 'Mobilité hanche', nomDepuisCle('b0e1', seance));
verifie('b1e0 → le bloc suivant, pas le séparateur',
        'Squat jump (départ assis)', nomDepuisCle('b1e0', seance));
verifie('b1e1 → dernier exercice', 'Fente bulgare', nomDepuisCle('b1e1', seance));

/* Le cas qui a été signalé : si les séparateurs étaient comptés, b1e0
   désignerait le séparateur « Renforcement » — sans exos — et le nom
   retomberait sur celui stocké, faux. */
console.log('\nLe décalage qui attribuait le retour au mauvais exercice');
verifie('un nom stocké faux est corrigé, pas conservé',
        'Squat jump (départ assis)', nomDepuisCle('b1e0', seance) || 'Mobilité hanche');

/* ── Blocs cardio ────────────────────────────────────────────────────────── */

console.log('\nCardio — la clé porte le sport');
verifie('cardio-2 → le sport du bloc', 'Rameur', nomDepuisCle('cardio-2', seance));
verifie('sport absent → libellé générique', 'Cardio',
        nomDepuisCle('cardio-0', [ { type: 'cardio' } ]));

/* ── Refus explicite : mieux vaut le nom stocké que le mauvais ───────────── */

console.log('\nQuand la clé ne correspond à rien, on rend la main');
verifie('séance absente → chaîne vide, on garde le nom stocké', '', nomDepuisCle('b0e0', null));
verifie('séance vide → chaîne vide', '', nomDepuisCle('b0e0', []));
verifie('clé illisible → chaîne vide', '', nomDepuisCle('vieille-cle', seance));
verifie('bloc au-delà de la séance → chaîne vide', '', nomDepuisCle('b9e0', seance));
verifie('exercice au-delà du bloc → chaîne vide', '', nomDepuisCle('b0e9', seance));
// Un bloc cardio n'a pas d'exos : une clé d'exercice pointant dessus ne doit
// pas lever, seulement renoncer.
verifie('clé d\'exercice sur un bloc cardio → chaîne vide', '', nomDepuisCle('b2e0', seance));

/* ── Zone libre ──────────────────────────────────────────────────────────── */

// Le marqueur `libre` est l'autre séparateur : il n'apparaît pas davantage
// chez l'athlète, et doit donc être écarté du même mouvement.
console.log('\nLe marqueur de zone libre s\'exclut comme l\'étape');
var avecLibre = [
  { type: 'exo', exos: [ { name: 'Gainage' } ] },
  { type: 'libre' },
  { type: 'exo', exos: [ { name: 'Pont fessier' } ] }
];
verifie('b1e0 saute le marqueur libre', 'Pont fessier', nomDepuisCle('b1e0', avecLibre));

console.log('\n' + (nbKo ? '✗ ' + nbKo + ' cas en échec, ' + nbOk + ' au vert'
                         : '✓ ' + nbOk + ' cas au vert'));
process.exit(nbKo ? 1 : 0);

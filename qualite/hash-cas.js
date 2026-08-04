#!/usr/bin/env node
/* Cas de référence — l'empreinte de séance du builder.
 *
 * `_sessionHash()` sert à deux choses : allumer le badge « non sauvegardé »
 * et déclencher l'avertissement à la fermeture. Tout ce qu'elle ne couvre pas
 * peut donc être modifié puis perdu sans le moindre signal.
 *
 * Elle était écrite comme une LISTE DE CHAMPS tenue à la main, et cette liste
 * avait dérivé : ni le « /côté », ni le contenu des blocs cardio, texte,
 * AMRAP et EMOM n'y figuraient. Elle lit désormais le contenu entier, en
 * écartant les clés techniques préfixées « _ » — un champ ajouté au modèle
 * est couvert d'office.
 *
 *   node qualite/hash-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-main.js'), 'utf8');
var deb = src.indexOf('function _sessionHash');
if (deb < 0) {
  console.error('`function _sessionHash` introuvable dans js/prog-main.js.');
  process.exit(1);
}
var fin = src.indexOf('\n}', deb) + 2;

var api = new Function(
  'var _notes = "", etapes = [], blocs = [];\n' +
  src.slice(deb, fin) +
  '\nreturn { hash: _sessionHash,' +
  '         set: function(n, e, b){ _notes = n; etapes = e; blocs = b; } };'
)();

var nbOk = 0, nbKo = 0;
function change(intitule, avant, apres) {
  if (avant !== apres) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule + ' — l\'empreinte n\'a pas bougé');
}
function identique(intitule, avant, apres) {
  if (avant === apres) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule + ' — l\'empreinte a bougé alors qu\'elle ne devait pas');
}

/* Une séance qui contient un exemplaire de chaque type de bloc. */
function seance() {
  return [
    { id:'b1', title:'Bloc A', objectif:'libre', methode:'',
      exos:[{ id:'e1', name:'Squat', reps:'8', series:'3', duree:'', recup:'',
              tempo:'', cibles:[], chained:false, consigne:'', perCote:false, nrs:null }] },
    { id:'b2', type:'cardio', title:'Rameur', sport:'rameur', effort_type:'continu',
      duree_totale:'20', distance:'', cibles:[{type:'zone FC', min:'Z2', max:''}], consignes:'' },
    { id:'b3', type:'texte', title:'Consigne', contenu:'Bien s\'échauffer' },
    { id:'b4', type:'amrap', title:'Finisher', duree:'10', toursCible:'',
      exos:[{ id:'e2', name:'Burpees', reps:'10', perCote:false }] },
    { id:'b5', type:'emom', title:'EMOM', dureeTotale:'10', intervalle:'1',
      exos:[{ id:'e3', name:'Kettlebell', reps:'12', perCote:false }] }
  ];
}
function empreinte(mut) {
  var b = seance();
  if (mut) mut(b);
  api.set('', [], b);
  return api.hash();
}

var ref = empreinte(null);

/* ── Le défaut signalé ───────────────────────────────────────────────────── */

console.log('\nLe « /côté » — le défaut signalé');
change('basculer perCote sur un exercice',
       ref, empreinte(function(b){ b[0].exos[0].perCote = true; }));
change('basculer perCote dans un AMRAP',
       ref, empreinte(function(b){ b[3].exos[0].perCote = true; }));

/* ── Les blocs que l'ancienne liste ignorait entièrement ─────────────────── */

console.log('\nLes blocs oubliés par l\'ancienne liste de champs');
change('durée d\'un bloc cardio',
       ref, empreinte(function(b){ b[1].duree_totale = '30'; }));
change('cible d\'un bloc cardio',
       ref, empreinte(function(b){ b[1].cibles[0].min = 'Z3'; }));
change('texte d\'un bloc de texte libre',
       ref, empreinte(function(b){ b[2].contenu = 'Autre consigne'; }));
change('durée d\'un AMRAP',
       ref, empreinte(function(b){ b[3].duree = '15'; }));
change('tours visés d\'un AMRAP',
       ref, empreinte(function(b){ b[3].toursCible = '6'; }));
change('intervalle d\'un EMOM',
       ref, empreinte(function(b){ b[4].intervalle = '2'; }));

/* ── Non-régression : ce qui marchait doit continuer ─────────────────────── */

console.log('\nNon-régression — ce que l\'ancienne empreinte couvrait déjà');
change('répétitions d\'un exercice',
       ref, empreinte(function(b){ b[0].exos[0].reps = '12'; }));
change('titre d\'un bloc',
       ref, empreinte(function(b){ b[0].title = 'Bloc renommé'; }));
change('objectif d\'un bloc',
       ref, empreinte(function(b){ b[0].objectif = 'forcemax'; }));
change('suppression d\'un exercice',
       ref, empreinte(function(b){ b[0].exos.length = 0; }));

/* ── Ce qui ne doit PAS déclencher le badge ──────────────────────────────── */

console.log('\nÉtat d\'interface — ne doit pas compter comme une modification');
identique('une clé technique préfixée « _ »',
          ref, empreinte(function(b){ b[0].exos[0]._methChecked = true; }));
identique('une clé technique sur le bloc',
          ref, empreinte(function(b){ b[0]._ouvert = true; }));
identique('deux lectures de suite, sans rien changer',
          ref, empreinte(null));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

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

/* Le plan de travail emprunte et l'empreinte de seance, extraits a part : ils
   servent la seconde moitie du fichier (mode template). L'empreinte est ce qui
   permet de verifier « rendue a l'identique » sans comparer champ par champ —
   une liste de champs tenue a la main derive, c'est deja arrive. */
var atelier =
  zone(main, '/* ── Plan de travail emprunté', '/* ── fin du plan de travail emprunté') + '\n' +
  // Borne de fin avec la parenthese : « function _draftSave » seul tombe sur
  // _draftSaveLazy, qui la precede.
  zone(main, 'function _sessionHash', 'function _draftSave(){');

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

/* Second bac d'essai, avec les globales de seance que le mode template met de
   cote. Separe du premier : _injecterTemplate n'a rien a voir avec elles. */
var atl = new Function(
  'var blocs = [], etapes = [], _notes = "";\n' +
  'var _currentProgId = null, _currentSeanceId = null, _builderDate = "";\n' +
  'var _builderFromTemplate = null, _builderSaved = true, _lastSavedHash = "";\n' +
  'var _activeGroupId = null, _activeGroupNom = "", _activePhaseOrdre = 1;\n' +
  atelier + '\n' +
  'return { stash: _stashSeance, restore: _restoreSeance, hash: _sessionHash,' +
  '         mode: function(){ return _builderMode; },' +
  '         poser: function(o){ blocs = o.blocs; etapes = o.etapes; _notes = o.notes||"";' +
  '           _currentProgId = o.progId||null; _currentSeanceId = o.seanceId||null;' +
  '           _builderDate = o.date||""; _builderFromTemplate = o.fromTemplate||null;' +
  '           _builderSaved = !!o.saved; },' +
  '         lire: function(){ return { blocs: blocs, etapes: etapes, notes: _notes,' +
  '           progId: _currentProgId, seanceId: _currentSeanceId, date: _builderDate,' +
  '           fromTemplate: _builderFromTemplate, saved: _builderSaved }; } };'
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

/* ══════════════════════════════════════════════════════════════════════════
   Mode template — un plan de travail EMPRUNTÉ, jamais volé.

   Composer un template se fait dans le builder : c'est le seul outil de
   composition, en écrire un second serait absurde. Mais le builder tient
   peut-être déjà une séance. « Ouvrir un builder neuf » ne doit donc jamais
   vouloir dire « effacer ce qui s'y trouve » — c'était exactement le défaut
   d'addPhaseToGroup, qui faisait `blocs = []` sans rien demander.

   La séance est mise de côté à l'entrée, rendue à l'identique à la sortie.

   Les repères de séance — programme, séance planifiée, date — sont effacés
   PENDANT le mode template, et pas seulement masqués : _refreshSaveBtn lit
   `_builderDate` pour écrire « Enregistrer — 6 août ». Les laisser en place
   afficherait une date sur un objet qui n'en a pas.
   ══════════════════════════════════════════════════════════════════════════ */

/* Une séance en cours, avec ses repères : elle est planifiée le 6 août, elle
   vient d'un programme, et elle n'est pas enregistrée. Le cas le plus exposé —
   c'est là qu'une perte serait invisible et définitive. */
function seanceEnCours() {
  return {
    blocs: [ { id:'b1', title:'Échauffement', exos:[{ id:'e1', name:'Vélo', reps:'' }] },
             { id:'b2', title:'Renfo',        exos:[{ id:'e2', name:'Squat', reps:'8' }] } ],
    etapes: [ { id:'E1', title:'Mise en route', color:'#F59E0B' } ],
    notes: 'Attention au genou droit',
    progId: 'p-42', seanceId: 's-7', date: '2026-08-06',
    fromTemplate: 't-9', saved: false
  };
}

console.log('\nEmprunter — la séance est mise de côté, pas effacée');
atl.poser(seanceEnCours());
var empreinteAvant = atl.hash();
verifie('on démarre en mode séance', 'seance', atl.mode());
verifie('l\'emprunt est accordé', 'true', String(atl.stash()));
verifie('le mode a basculé', 'template', atl.mode());
verifie('le plan de travail est vide', '0 blocs / 0 étapes',
  atl.lire().blocs.length + ' blocs / ' + atl.lire().etapes.length + ' étapes');
verifie('les notes de la séance ne débordent pas sur le template', '', atl.lire().notes);

console.log('\nLes repères de séance sont effacés, pas seulement masqués');
verifie('aucune date — sinon le bouton afficherait « Enregistrer — 6 août »',
  '', atl.lire().date);
verifie('aucun programme rattaché', 'null', String(atl.lire().progId));
verifie('aucune séance planifiée rattachée', 'null', String(atl.lire().seanceId));
verifie('aucun lien vers un template chargé', 'null', String(atl.lire().fromTemplate));

console.log('\nComposer un template ne touche pas à la séance mise de côté');
atl.poser({ blocs:[{ id:'t1', title:'Bloc du template', exos:[] }], etapes:[], notes:'Notes du template' });
verifie('la restitution est accordée', 'true', String(atl.restore()));
verifie('retour en mode séance', 'seance', atl.mode());
verifie('la séance est rendue à l\'identique', empreinteAvant, atl.hash());
verifie('rien du template n\'a fui dans la séance', 'Échauffement Renfo',
  atl.lire().blocs.map(function(b){ return b.title; }).join(' '));

console.log('\nLes repères de séance reviennent avec elle');
var apres = atl.lire();
verifie('la date de planification', '2026-08-06', apres.date);
verifie('le programme', 'p-42', String(apres.progId));
verifie('la séance planifiée', 's-7', String(apres.seanceId));
verifie('le lien au template chargé', 't-9', String(apres.fromTemplate));
// Une séance non enregistrée qui revient « enregistrée » perdrait son badge :
// le praticien croirait son travail à l'abri alors qu'il ne l'est pas.
verifie('l\'état « non enregistrée » est conservé', 'false', String(apres.saved));

console.log('\nDouble emprunt — la séance mise de côté ne s\'écrase jamais');
atl.poser(seanceEnCours());
var refDouble = atl.hash();
atl.stash();
atl.poser({ blocs:[{ id:'x1', title:'Brouillon de template', exos:[] }], etapes:[], notes:'' });
verifie('un second emprunt est refusé', 'false', String(atl.stash()));
verifie('le mode reste template', 'template', atl.mode());
atl.restore();
verifie('la séance rendue est bien la vraie, pas le brouillon', refDouble, atl.hash());

console.log('\nRestitution sans emprunt — refus franc, aucun dégât');
atl.poser(seanceEnCours());
var refSeule = atl.hash();
verifie('la restitution est refusée', 'false', String(atl.restore()));
verifie('le mode est inchangé', 'seance', atl.mode());
verifie('la séance est intacte', refSeule, atl.hash());

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

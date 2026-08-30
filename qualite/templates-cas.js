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
  '         piocher: _ajouterBlocPioche,' +
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

/* ══════════════════════════════════════════════════════════════════════════
   Piocher UN bloc — l'etape ne suit pas.

   Une etape est un decoupage de la SEANCE, pas une propriete du bloc : le
   modele le dit deja, l'appartenance est positionnelle et `bloc.etapeId` n'est
   qu'un champ recalcule. Piocher un bloc, c'est prendre son CONTENU.

   L'ancienne version passait par _injecterTemplate en lui donnant toutes les
   etapes du repertoire source. Sans separateur dans un tableau d'un seul bloc,
   le moteur se rabattait sur `etapeId` — renseigne sur le bloc enregistre — et
   recreait l'etape. Chaque clic etant un appel separe avec un genId() neuf,
   deux blocs de la meme etape source donnaient DEUX etapes du meme nom.

   Le bloc pioche se comporte desormais comme n'importe quel bloc ajoute par
   « + Ajouter » : il arrive au point d'insertion et suit la regle positionnelle
   de la seance qu'on compose.
   ══════════════════════════════════════════════════════════════════════════ */

/* Un bloc tel qu'il est ENREGISTRE dans un repertoire : il porte etapeId,
   ecrit par _syncEtapeIds au moment de la sauvegarde. C'est ce champ qui
   faisait revenir l'etape. */
function blocEnregistre(titre, etapeId) {
  return { id: 'src-' + titre, title: titre, objectif: 'libre', methode: '',
           etapeId: etapeId || null,
           exos: [{ id: 'e-' + titre, name: 'Exercice ' + titre, reps: '10' }] };
}

console.log('\nPiocher un bloc — aucune étape importée');
api.set([], []);
api.piocher(blocEnregistre('B1', 'E-SOURCE'));
verifie('séance vide : le bloc arrive seul, sans étape', 'B1', lire());
verifie('aucune étape créée', '0', String(api.etapes().length));

console.log('\nDeux blocs de la même étape source — plus de doublon d\'étape');
api.set([], []);
api.piocher(blocEnregistre('B1', 'E-SOURCE'));
api.piocher(blocEnregistre('B2', 'E-SOURCE'));
verifie('les deux blocs se suivent, sans séparateur entre eux', 'B1 B2', lire());
// Le defaut signale : deux etapes du meme nom apparaissaient ici.
verifie('toujours aucune étape', '0', String(api.etapes().length));

console.log('\nLe bloc pioché suit la règle positionnelle de LA séance composée');
api.set([sep('E1'), bloc('Deja la')], [{ id: 'E1', title: 'Échauffement', color: '#F59E0B' }]);
api.piocher(blocEnregistre('B1', 'E-SOURCE'));
verifie('il rejoint l\'étape ouverte en fin de séance, comme « + Ajouter »',
  '|Échauffement Deja la B1', lire());
verifie('l\'étape de la séance n\'a pas été dupliquée', '1', String(api.etapes().length));
verifie('son titre n\'a pas été remplacé par celui de la source',
  'Échauffement', api.etapes()[0].title);

console.log('\nLe bloc source n\'est jamais modifié');
api.set([], []);
var src = blocEnregistre('B1', 'E-SOURCE');
api.piocher(src);
verifie('l\'original garde son identifiant', 'src-B1', src.id);
verifie('l\'original garde son etapeId', 'E-SOURCE', String(src.etapeId));
verifie('la copie a reçu un nouvel identifiant', 'true',
  String(api.blocs()[0].id !== 'src-B1'));
verifie('la copie n\'emporte pas etapeId — il est positionnel', 'undefined',
  String(api.blocs()[0].etapeId));

/* ══════════════════════════════════════════════════════════════════════════
   Le nom d'un repertoire ne se perd pas en route.

   Ouvrir un repertoire dans le builder n'affichait pas son nom : le champ de
   nom restait vide. Or c'est CE champ que « Mettre a jour » renvoie au
   serveur — le repertoire se retrouvait donc sans nom des la premiere
   modification, et devenait introuvable dans la liste.

   Deux verrous, parce qu'un seul ne suffit pas : le champ est rempli a
   l'ouverture, ET une valeur vide ne s'ecrit jamais par-dessus le nom connu.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nLe nom d\'un modèle survit à son ouverture et à sa mise à jour');

var mainSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-main.js'), 'utf8');

/* `loadTemplate` est definie APRES `_doUpdateTemplate` dans le fichier : une
   borne de fin prise a l'aveugle donnerait une tranche vide. */
var _dl = mainSrc.indexOf('function loadTemplate');
var zoneLoad = mainSrc.slice(_dl, mainSrc.indexOf('\nfunction ', _dl + 10));
verifie('l\'ouverture renseigne le champ de nom', true,
  /getElementById\('patientName'\)[\s\S]{0,200}=\s*t\.nom/.test(zoneLoad));

var zoneMaj = mainSrc.slice(mainSrc.indexOf('function _doUpdateTemplate'),
                            mainSrc.indexOf('function duplicateTemplate'));
/* CE QUI A CHANGE, et pourquoi l'ancienne attente etait juste en son temps.
   Elle exigeait que la mise a jour RETOMBE sur le nom deja enregistre quand le
   champ etait vide — un repli qui protegeait d'un renommage en « sans nom ».
   Le champ restait donc la source du nom, et c'etait le defaut de fond : il
   nomme une SEANCE, si bien que charger la seance d'un patient dans un modele
   ouvert renommait la phase au gre du contenu charge.

   Decision du praticien : le nom d'un modele est son IDENTITE et ne se change
   que par « Modifier », dans le menu « … ». La mise a jour n'envoie donc plus
   que le contenu — ne pas ecrire une colonne qu'on ne possede pas est la seule
   facon sure de ne jamais la corrompre, et le repli n'a plus d'objet. */
verifie('la mise à jour n\'envoie que le contenu', true,
  /body: JSON\.stringify\(\{ donnees: donnees \}\)/.test(zoneMaj));
verifie('elle ne touche plus du tout au nom', false,
  /nom:\s*nomProg|nom:\s*\(document/.test(zoneMaj));
verifie('le repli devenu inutile a été retiré', false, /_tRefNom/.test(zoneMaj));

/* ══════════════════════════════════════════════════════════════════════════
   Planifier un repertoire ne pre-coche aucun jour.

   `_builderDate` survit a la fermeture du builder. « Cocher les jours sur
   l'agenda » lance depuis une carte de repertoire le prenait pour le jour
   d'origine et cochait une date au hasard — on croyait avoir valide une
   journee par megarde en touchant l'option. Le meme defaut avait deja ete
   corrige pour le menu d'une seance de l'agenda ; ce chemin-la l'avait
   conserve.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nPlanifier depuis une carte de modèle ne pré-coche pas de jour');

var _dp = mainSrc.indexOf('function _switchToCalendarPlanMode');
var zonePlan = mainSrc.slice(_dp, mainSrc.indexOf('\nfunction ', _dp + 10));
verifie('la planification par carte n\'est pas prise pour un départ du builder', true,
  /var depuisBuilder = !_touchSheetData && !_planOverrideProgId;/.test(zonePlan));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════════════════
   L'APERCU D'UNE PHASE DOIT DECRIRE SES BLOCS CARDIO

   Un bloc cardio n'a pas d'exercices : l'apercu de la barre laterale
   n'affichait donc que son TITRE. Un titre comme « Bloc raise » ne dit ni le
   sport ni la duree — le praticien voyait une ligne suivie de rien et croyait
   le bloc vide, alors que l'en-tete annoncait « 1 cardio ».

   On execute le VRAI resume, avec la VRAIE table des sports.
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  Aperçu d\'un bloc cardio dans la barre latérale');
{
  var dataSrcC = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');
  var _sp = dataSrcC.slice(dataSrcC.indexOf('var CARDIO_SPORTS'),
                           dataSrcC.indexOf('var CARDIO_EFFORT_TYPES'));
  var _c0 = mainSrc.indexOf('function _cardioResume');
  var _c1 = mainSrc.indexOf('function _renderTmplCardTree');
  if (_c0 < 0 || _c1 < _c0) { console.error('Bornes de _cardioResume introuvables.'); process.exit(1); }
  /* eslint-disable no-new-func */
  var resume = new Function(_sp + '\n' + mainSrc.slice(_c0, _c1) + '\nreturn _cardioResume;')();

  verifie('le sport est nommé', '🚴 Vélo · 45 min',
    resume({ sport:'velo', effort_type:'continu', duree_totale:'45', title:'Bloc C', _titreAuto:true }));
  /* Un titre SAISI porte l'intention du praticien : on le garde. */
  verifie('un titre saisi est conservé', 'Bloc raise — 🚴 Vélo · 20 min',
    resume({ sport:'velo', effort_type:'continu', duree_totale:'20', title:'Bloc raise' }));
  /* Un titre automatique n'apporte rien a cote du sport. */
  verifie('un titre automatique s\'efface', '🏃 Course à pied · 50 min · 8 km',
    resume({ sport:'course', effort_type:'continu', duree_totale:'50', distance:'8',
             title:'Bloc A', _titreAuto:true }));
  /* Les blocs enregistres AVANT `_titreAuto` n'ont pas le drapeau : la forme
     du titre doit suffire a les reconnaitre, sinon « Bloc E » s'afficherait. */
  verifie('… même sans le drapeau, sur un bloc ancien', '🚶 Marche · 30 min',
    resume({ sport:'marche', effort_type:'continu', duree_totale:'30', title:'Bloc E' }));
  /* Un fractionne se decrit par sa FORME : « 8 min » ne dit pas ce qu'on fait. */
  verifie('un fractionné donne sa forme', '🏃 Course à pied · 8 × 30s / 30s',
    resume({ sport:'course', effort_type:'fractionne', repetitions:'8',
             duree_effort:'30s', duree_recup:'30s', title:'Bloc B', _titreAuto:true }));
  verifie('un bloc sans mesure reste lisible', '🏊 Natation',
    resume({ sport:'natation', effort_type:'continu', title:'Bloc D', _titreAuto:true }));
  verifie('un sport vide ne casse pas la ligne', 'Cardio · 12 min',
    resume({ sport:'', effort_type:'continu', duree_totale:'12', title:'Bloc' }));

  var zoneTree = mainSrc.slice(_c1, mainSrc.indexOf('\nfunction ', _c1 + 10));
  verifie('l\'aperçu lit bien ce résumé', true, /_cardioResume\(bloc\)/.test(zoneTree));
  verifie('… et n\'affiche plus le seul titre', false,
    /bloc\.title\|\|bloc\.sport\|\|'Cardio'/.test(zoneTree));
}

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

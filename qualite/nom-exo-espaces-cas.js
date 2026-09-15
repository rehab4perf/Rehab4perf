#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Exercices — un nom se compare nettoyé, partout

   Signalé par le praticien (2026-09-15), séance de Jean Berto-Salles créée
   par duplication : « pas de ligne d'évolution de charge sous l'exercice
   alors que je l'ai déjà fait ». La duplication n'y était pour rien.

   Mesuré dans ses données : la séance du 9 sept. porte « Cycliste squat␣ »,
   ESPACE FINALE comprise. L'historique rangeait l'exercice sous son nom
   nettoyé (trim) — « cycliste squat » — et la ligne du builder le cherchait
   TEL QUEL — « cycliste squat␣ ». Ils ne se rencontraient jamais.

   L'espace venait de la bibliothèque COMMUNE : au moins dix exercices
   d'exercices_library la portent (Cycliste squat, A raise, Neurodynamie
   SLUMP, Landmine rotations…), recopiée dans chaque séance qui les ajoute.
   Aucun n'avait jamais de ligne « Dernière séance », chez aucun patient ; et
   dans Évolution, l'index des zones les rangeait en « Non classé ».

   Trois verrous :
     1. une seule clé, _cleExo : minuscules, sans accent, sans espace en trop
        — pour l'historique, le %1RM, les durées, la douleur, le clic vers la
        courbe et les zones d'Évolution. Les séances déjà enregistrées, espace
        comprise, retrouvent leur historique ;
     2. la bibliothèque est nettoyée au CHARGEMENT : les prochains ajouts
        n'emportent plus d'espace ;
     3. l'éditeur de la bibliothèque nettoie à l'ENREGISTREMENT (la modale
        « Ajouter mon exercice » le faisait déjà).

     node qualite/nom-exo-espaces-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const pdata = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fd = n => { const d = pdata.indexOf('\nfunction ' + n + '('); if (d < 0) return '';
  const fl = pdata.indexOf('\n', d + 1), l = pdata.slice(d, fl); const o = (l.match(/\{/g) || []).length, c = (l.match(/\}/g) || []).length;
  return (o && o === c) ? l + '\n' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };

console.log('\nUne clé nettoyée');
const c = vm.createContext({
  _builderDate: '2026-09-16', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-15',
  escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
});
try {
  vm.runInContext(['_norm', '_cleExo', '_1rm', '_parseDuree', '_formatDuree', '_extractExoLoads', '_extractExoDurations', '_rm1Ref',
    '_histExoCourant', '_histDureeHtml', '_histExoHtml', '_cibleKgHtml'].map(fd).join('\n') + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
const cle = s => { try { return c._cleExo(s); } catch (e) { return 'ERREUR ' + e.message; } };
ok('« Cycliste squat␣ » et « Cycliste squat » : la même clé', cle('Cycliste squat ') === 'cycliste squat' && cle('Cycliste squat') === 'cycliste squat', JSON.stringify(cle('Cycliste squat ')));
ok('… espaces doublés, casse et accents aussi', cle('  Élévation   antérieure ') === 'elevation anterieure', JSON.stringify(cle('  Élévation   antérieure ')));

console.log('\nLa séance de Jean, rejouée');
const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const SEANCES = [
  prog('2026-09-09', [{ name: 'Cycliste squat ', reps: '20', series: '3', cibles: [{ type: 'kg', min: '5', max: '' }] }, { name: 'Gainage ', reps: '', series: '3', duree: '45s', cibles: [] }]),
  prog('2026-09-16', [{ name: 'Cycliste squat ', reps: '15', series: '3', cibles: [{ type: 'kg', min: '10', max: '' }] }])
];
try { c._histExos.map = c._extractExoLoads(SEANCES, 1); c._histExos.durees = c._extractExoDurations(SEANCES, 1); } catch (e) {}
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };
const l = ligne('Cycliste squat ', { name: 'Cycliste squat ', reps: '15', series: '3', cibles: [{ type: 'kg', min: '10', max: '' }] });
ok('l\'exercice au nom suivi d\'une espace retrouve sa dernière séance', /^Dernière séance \(9 sept\.\) : 3 × 20 à 5 kg/.test(l), l || '(vide)');
ok('… et la compare à celle qu\'on compose', / → aujourd’hui 1RM est\. /.test(l), l);
let kgTxt = ''; try { kgTxt = c._cibleKgHtml({ name: 'Cycliste squat ' }, { type: '%1RM', min: '80', max: '' }).replace(/<[^>]+>/g, ''); } catch (e) { kgTxt = 'ERREUR ' + e.message; }
ok('le poids d\'un %1RM le retrouve aussi', /^≈ \d/.test(kgTxt), kgTxt || '(vide)');
ok('une durée aussi (« Gainage␣ »)', /^Dernière séance \(9 sept\.\) : 3 × 45s/.test(ligne('Gainage ', { name: 'Gainage ', reps: '', duree: '' })), ligne('Gainage ', { name: 'Gainage ', reps: '', duree: '' }));

console.log('\nPartout la même clé');
ok('plus aucune clé d\'exercice fabriquée sans nettoyage', !/_norm\((nom|name|e\.name)\)\.replace\(\/\\s\+\/g/.test(pdata),
   (pdata.match(/_norm\((nom|name|e\.name)\)\.replace\(\/\\s\+\/g[^\n]*/g) || []).join(' | '));
ok('les zones d\'Évolution aussi (sinon « Non classé »)', /idx\[_cleExo\(e\.name\)\] = z;/.test(fd('_pevoZoneIndex')));
ok('le clic vers la courbe aussi', /var cle = _cleExo\(nom\);/.test(fd('_histVoirCourbe')));

console.log('\nNe plus en fabriquer');
ok('la bibliothèque est nettoyée au chargement (deux chemins)', (pdata.match(/return \{ id: ?e\.id, name: ?String\(e\.name\|\|''\)\.trim\(\), zone:/g) || []).length === 2);
ok('l\'éditeur nettoie à l\'enregistrement', /name: String\(ex\.name\|\|''\)\.trim\(\),/.test(fd('saveEditor')));
ok('« Ajouter mon exercice » nettoyait déjà', /getElementById\('myExoName'\)\.value\.trim\(\)/.test(fd('saveMyExo')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Exercices : un nom se compare nettoyé, et la bibliothèque n\'en fabrique plus d\'autres.');

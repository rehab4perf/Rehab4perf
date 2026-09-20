#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — une charge se compare à la dernière séance CHARGÉE

   Signalé par le praticien (2026-09-15), séance de Jeanne Berto-Salles :
   « ça ne s'actualise pas avec la charge ». Cycliste squat, 15 reps à 10 kg :
   la ligne restait « Dernière séance (10 sept.) : 15 poids du corps », sans
   comparaison. La séance la plus récente (EMOM du 10) était au poids du corps,
   et la ligne ne comparait que deux séances du même mode — elle se taisait.

   Règle : dès qu'on prescrit une CHARGE, la comparaison se fait avec la
   dernière séance chargée — « Dernière séance chargée (9 sept.) : 3 × 20 à
   5 kg · 1RM est. 10,6 kg → aujourd'hui 1RM est. 16,4 kg ↗ +55 % ». Sans
   séance chargée avant : « (première charge) ». Tant qu'aucune charge n'est
   posée, rien ne change : la ligne ne devine pas ce qu'on compose.

     node qualite/historique-mode-cas.js
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

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const SEANCES = [   // la séance de Jeanne, rejouée
  prog('2026-09-09', [{ name: 'Cycliste squat ', reps: '20', series: '3', cibles: [{ type: 'kg', min: '5', max: '' }] },
                      { name: 'Marche sur pointes', reps: '5', series: '3', cibles: [] }]),
  prog('2026-09-10', [{ name: 'Cycliste squat ', reps: '15', series: '', cibles: [{ type: 'kg', min: '', max: '' }] }])
];
const c = vm.createContext({
  _builderDate: '2026-09-16', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-15',
  escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
});
try {
  vm.runInContext(['_norm', '_cleExo', '_repsUnite', '_1rm', '_extractExoLoads', '_rm1Ref', '_histExoCourant', '_histExoHtml'].map(fd).join('\n')
    + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
  c._histExos.map = c._extractExoLoads(SEANCES, 1);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };
const exo = (reps, kg) => ({ name: 'Cycliste squat ', reps: String(reps), series: '3', cibles: [{ type: 'kg', min: kg ? String(kg) : '', max: '' }] });

console.log('\nUne charge, contre la dernière séance chargée');
const l10 = ligne('Cycliste squat ', exo(15, 10));
ok('15 reps à 10 kg : comparées au 9 sept. (3 × 20 à 5 kg), pas à l\'EMOM au poids du corps du 10',
   l10 === 'Dernière séance chargée (9 sept.) : 3 × 20 à 5 kg · 1RM est. 10,6 kg → aujourd’hui 1RM est. 16,4 kg ↗ +55 %', l10);
/* Un écart de CHARGE se dit en POURCENTAGE depuis le 2026-09-20
   (qualite/historique-pourcent-cas.js). Le kilo reste écrit juste avant. */
ok('… et elle suit la frappe : 5 kg', / → aujourd’hui 1RM est\. 8,2 kg ↘ −23 %$/.test(ligne('Cycliste squat ', exo(15, 5))), ligne('Cycliste squat ', exo(15, 5)));
const lm = ligne('Marche sur pointes', { name: 'Marche sur pointes', reps: '5', series: '3', cibles: [{ type: 'kg', min: '4', max: '' }] });
ok('jamais chargé avant : « (première charge) », avec le 1RM du jour', lm === 'Dernière séance (9 sept.) : 3 × 5 poids du corps → aujourd’hui 1RM est. 4,5 kg (première charge)', lm);

console.log('\nSans charge : rien ne change');
ok('au poids du corps, contre la dernière au poids du corps', ligne('Cycliste squat ', exo(12)) === 'Dernière séance (10 sept.) : 15 poids du corps → aujourd’hui 12 reps ↘ −3 reps', ligne('Cycliste squat ', exo(12)));
ok('répétitions pas encore saisies : la ligne d\'avant', ligne('Cycliste squat ', exo('')) === 'Dernière séance (10 sept.) : 15 poids du corps', ligne('Cycliste squat ', exo('')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : une charge se compare à la dernière séance chargée.');

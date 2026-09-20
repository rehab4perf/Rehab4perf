#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — « 5m » dans la case Reps garde son unité

   Signalé par le praticien (2026-09-15) : « Marche sur pointes de pieds »,
   Reps « 5m », s'affichait « 3 × 5 poids du corps » — cinq mètres lus comme
   cinq répétitions. Sa règle : « tant que l'unité est la même, ça ne change
   rien ». L'unité est donc GARDÉE, pas ignorée :
     - affichée : « 3 × 5m », « 3 × 20m à 24 kg » ;
     - comparée à unité égale : « → aujourd'hui 8m ↗ +3m » ; en charge, les
       kilos d'abord (« 30 kg ↗ +25 % » depuis le 2026-09-20), la quantité
       sinon ;
     - pas de comparaison si l'unité change (5m contre 10 répétitions) ;
     - pas de 1RM estimé : il n'a pas de sens sur une distance.
   Sans unité, rien ne change (historique-exo, -vivant, -mode, -duree).
   Évolution n'est pas touchée.

     node qualite/historique-unite-cas.js
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

const c = vm.createContext({
  _builderDate: '2026-09-16', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-15',
  escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
});
try {
  vm.runInContext(['_norm', '_cleExo', '_repsUnite', '_1rm', '_extractExoLoads', '_rm1Ref', '_histExoCourant', '_histExoHtml'].map(fd).join('\n')
    + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
} catch (e) { ok('les fonctions se chargent', false, e.message); }

console.log('\nL\'unité d\'un champ Reps');
const un = r => { try { return c._repsUnite(r); } catch (e) { return 'ERREUR'; } };
const table = [['5m', 'm'], ['30 s', 's'], ['1min', 'min'], ["2'", 'min'], ['45sec', 's'], ['1km', 'km'], ['12', ''], ['8-12', ''], ['10/côté', '']];
ok('m, s, min, km reconnus ; un nombre de répétitions n\'en a pas', table.every(([r, u]) => un(r) === u), table.map(([r]) => r + '→' + JSON.stringify(un(r))).join(' '));

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const x = (name, reps, kg) => ({ name, reps, series: '3', cibles: kg ? [{ type: 'kg', min: String(kg), max: '' }] : [] });
const SEANCES = [
  prog('2026-09-02', [x('Marche sur pointes', '4m'), x('Farmer walk', '20m', 20)]),
  prog('2026-09-09', [x('Marche sur pointes', '5m'), x('Farmer walk', '20m', 24)])
];
try { c._histExos.map = c._extractExoLoads(SEANCES, 1); } catch (e) {}
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (err) { return 'ERREUR ' + err.message; } };

console.log('\nAu poids du corps, en mètres');
ok('« 3 × 5m », et l\'écart à la précédente en mètres', ligne('Marche sur pointes') === 'Dernière séance (9 sept.) : 3 × 5m ↗ +1m', ligne('Marche sur pointes'));
ok('comparée à ce qu\'on prescrit, à unité égale', ligne('Marche sur pointes', x('Marche sur pointes', '8m')) === 'Dernière séance (9 sept.) : 3 × 5m → aujourd’hui 8m ↗ +3m', ligne('Marche sur pointes', x('Marche sur pointes', '8m')));
ok('… identique : le dit', / → aujourd’hui : identique$/.test(ligne('Marche sur pointes', x('Marche sur pointes', '5m'))), ligne('Marche sur pointes', x('Marche sur pointes', '5m')));
ok('unité différente (10 répétitions) : pas de comparaison', ligne('Marche sur pointes', x('Marche sur pointes', '10')) === 'Dernière séance (9 sept.) : 3 × 5m ↗ +1m', ligne('Marche sur pointes', x('Marche sur pointes', '10')));
ok('une première charge sur une distance', ligne('Marche sur pointes', x('Marche sur pointes', '5m', 4)) === 'Dernière séance (9 sept.) : 3 × 5m → aujourd’hui 4 kg (première charge)', ligne('Marche sur pointes', x('Marche sur pointes', '5m', 4)));

console.log('\nEn charge, en mètres');
const fw = ligne('Farmer walk');
/* Un écart de CHARGE se dit en POURCENTAGE depuis le 2026-09-20
   (qualite/historique-pourcent-cas.js). Le kilo reste écrit juste avant. */
ok('« 3 × 20m à 24 kg », sans 1RM, et l\'écart en pourcentage', fw === 'Dernière séance (9 sept.) : 3 × 20m à 24 kg ↗ +20 %' && !/1RM/.test(fw), fw);
ok('plus lourd : la charge, en pourcentage', ligne('Farmer walk', x('Farmer walk', '20m', 30)) === 'Dernière séance (9 sept.) : 3 × 20m à 24 kg → aujourd’hui 30 kg ↗ +25 %', ligne('Farmer walk', x('Farmer walk', '20m', 30)));
ok('plus loin, même charge : la distance', ligne('Farmer walk', x('Farmer walk', '30m', 24)) === 'Dernière séance (9 sept.) : 3 × 20m à 24 kg → aujourd’hui 30m ↗ +10m', ligne('Farmer walk', x('Farmer walk', '30m', 24)));
ok('identique : le dit', / → aujourd’hui : identique$/.test(ligne('Farmer walk', x('Farmer walk', '20m', 24))));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : « 5m » garde son unité, et ne se compare qu\'à la même.');

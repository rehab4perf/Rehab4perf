#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — un écart de CHARGE se dit en pourcentage

   Demandé par le praticien (2026-09-20) : « sur les variations de charge dans
   le builder, je préférerais les voir en pourcentage plutôt qu'en kilos (ici
   8,1 kg) ».

   « +49 % » se lit d'un exercice à l'autre ; « +8,1 kg » non — il dépend de ce
   qu'on soulevait. La valeur absolue n'est pas perdue : la ligne vient de
   l'écrire juste avant (« 1RM est. 24,5 kg »).

   Répétitions, durées et distances gardent leur unité : ce ne sont pas des
   charges, et un pourcentage de secondes ne dit rien de plus que les
   secondes.

     node qualite/historique-pourcent-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fd = n => { const d = pdata.indexOf('\nfunction ' + n + '('); if (d < 0) return '';
  const fl = pdata.indexOf('\n', d + 1), l = pdata.slice(d, fl);
  const o = (l.match(/\{/g) || []).length, c = (l.match(/\}/g) || []).length;
  return (o && o === c) ? l + '\n' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'S', donnees: { blocs: [{ exos }] } } });
const kg = (n, reps, poids, series) => ({ name: n, reps: String(reps), series: String(series || 3),
  cibles: poids ? [{ type: 'kg', min: String(poids), max: String(poids) }] : [] });
const SEANCES = [
  prog('2026-09-04', [kg('Presse', 15, 8), kg('Pistol', 8, 0), kg('Farmer walk', '20m', 20)]),
  prog('2026-09-11', [kg('Presse', 15, 10), kg('Pistol', 10, 0), kg('Farmer walk', '20m', 24)]),
  prog('2026-09-21', [])
];
const c = vm.createContext({ _builderDate: '2026-09-21', _builderMode: 'seance', _builderFromTemplate: null,
  _currentSeanceId: null, _currentProgId: null, _pevoAujourdhuiIso: () => '2026-09-21',
  escH: s => String(s || '') });
try {
  vm.runInContext(['_nbFr', '_norm', '_cleExo', '_repsUnite', '_1rm', '_parseDuree', '_formatDuree', '_extractExoLoads',
    '_extractExoDurations', '_rm1Ref', '_histExoCourant', '_histDureeHtml', '_histExoHtml'].map(fd).join('\n')
    + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
  c._histExos.map = c._extractExoLoads(SEANCES, 1);
  c._histExos.durees = c._extractExoDurations(SEANCES, 1);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };

console.log('\nUne charge : en pourcentage');
ok('l\'écart entre les deux dernières séances', / ↗ \+\d+ %$/.test(ligne('Presse')), ligne('Presse'));
ok('… et celui de ce qu\'on prescrit', / → aujourd’hui 1RM est\. [\d,]+ kg ↗ \+\d+ %$/.test(ligne('Presse', kg('Presse', 15, 14))), ligne('Presse', kg('Presse', 15, 14)));
ok('… à la baisse aussi', / ↘ −\d+ %$/.test(ligne('Presse', kg('Presse', 15, 6))), ligne('Presse', kg('Presse', 15, 6)));
ok('le kilo reste écrit juste avant : rien n\'est perdu', /1RM est\. [\d,]+ kg ↗ \+/.test(ligne('Presse', kg('Presse', 15, 14))), ligne('Presse', kg('Presse', 15, 14)));
ok('en charge sur une distance, le pourcentage aussi', / → aujourd’hui 30 kg ↗ \+25 %$/.test(ligne('Farmer walk', kg('Farmer walk', '20m', 30))), ligne('Farmer walk', kg('Farmer walk', '20m', 30)));

console.log('\nCe qui n\'est pas une charge garde son unité');
ok('les répétitions au poids du corps', / ↗ \+2 reps$/.test(ligne('Pistol')), ligne('Pistol'));
ok('… même comparées à ce qu\'on prescrit', / → aujourd’hui 14 reps ↗ \+4 reps$/.test(ligne('Pistol', kg('Pistol', 14, 0))), ligne('Pistol', kg('Pistol', 14, 0)));
ok('une distance à charge égale', / → aujourd’hui 30m ↗ \+10m$/.test(ligne('Farmer walk', kg('Farmer walk', '30m', 24))), ligne('Farmer walk', kg('Farmer walk', '30m', 24)));

console.log('\nLes garde-fous du calcul');
ok('aucune référence (base nulle) : on retombe sur les kilos, jamais sur ∞',
   !/Infinity|NaN/.test(ligne('Presse')) && !/Infinity|NaN/.test(ligne('Presse', kg('Presse', 15, 14))));
ok('un écart qui arrondit à 0 % montre les kilos plutôt que « +0 % »',
   !/\+0 %|−0 %/.test(ligne('Presse', kg('Presse', 15, 10.02))), ligne('Presse', kg('Presse', 15, 10.02)));
ok('la durée ne devient pas un pourcentage', !/%/.test(fd('_histDureeHtml')), 'la ligne des durées a changé');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : un écart de charge se dit en pourcentage, le reste garde son unité.');

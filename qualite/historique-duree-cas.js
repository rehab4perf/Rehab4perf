#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — les exercices en DURÉE ont aussi leur « Dernière séance »
   et « Évolution » quitte le menu ··· du builder

   Décidé par le praticien (2026-09-15, « 3 + 5 ») :
   3. Gainage, chaise isométrique… n'avaient pas de ligne : l'historique ne
      lisait que les exercices à répétitions. Même données qu'Évolution
      (_extractExoDurations), un seul passage suffit ici, et la ligne compare
      ce qu'on prescrit à la dernière fois : « 3 × 45s → aujourd'hui 1min
      ↗ +15s ». Un clic ouvre la carte de DURÉE de l'exercice.
   5. « Évolution » était revenu dans le menu ··· du builder « le temps de
      juger » la ligne sous chaque exercice (historique-exo-cas). Elle suffit :
      il repart. Évolution reste sur la carte Charge de l'agenda, et la ligne
      ouvre directement la courbe de l'exercice.

     node qualite/historique-duree-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fd = fnDe(pdata), fm = fnDe(pmain);

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const tenu = (n, duree) => ({ name: n, reps: '', series: '3', duree, cibles: [] });
const SEANCES = [
  prog('2026-08-31', [tenu('Chaise isométrique', '30s')]),
  prog('2026-09-07', [tenu('Chaise isométrique', '45s'), tenu('Gainage ventral', "1'30")]),
  prog('2026-09-14', [tenu('Chaise isométrique', '60s')])     // la séance qu'on compose : ne compte pas
];
const c = vm.createContext({
  _builderDate: '2026-09-14', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-13',
  escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
});
try {
  vm.runInContext(['_norm', '_1rm', '_parseDuree', '_formatDuree', '_extractExoLoads', '_extractExoDurations', '_rm1Ref',
    '_histExoCourant', '_histDureeHtml', '_histExoHtml'].map(fd).join('\n') + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
  c._histExos.map = c._extractExoLoads(SEANCES, 1);
  c._histExos.durees = c._extractExoDurations(SEANCES, 1);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };

console.log('\n3 — la dernière séance d\'un exercice en durée');
ok('la dernière durée AVANT celle qu\'on compose, et son écart à la précédente', ligne('Chaise isométrique') === 'Dernière séance (7 sept.) : 3 × 45s ↗ +15s', ligne('Chaise isométrique'));
ok('… comparée à ce qu\'on prescrit', ligne('Chaise isométrique', tenu('Chaise isométrique', '1min')) === 'Dernière séance (7 sept.) : 3 × 45s → aujourd’hui 1min ↗ +15s', ligne('Chaise isométrique', tenu('Chaise isométrique', '1min')));
ok('… même durée : dit « même durée »', / → aujourd’hui : même durée$/.test(ligne('Chaise isométrique', tenu('Chaise isométrique', '45s'))));
ok('… plus courte : ↘', / → aujourd’hui 30s ↘ −15s$/.test(ligne('Chaise isométrique', tenu('Chaise isométrique', '30s'))), ligne('Chaise isométrique', tenu('Chaise isométrique', '30s')));
ok('un seul passage suffit (1\'30 → « 1m30s », sans tendance)', ligne('Gainage ventral') === 'Dernière séance (7 sept.) : 3 × 1m30s', ligne('Gainage ventral'));
ok('rien pour un exercice jamais fait', ligne('Planche latérale') === '');
{
  let e2 = {};
  try { e2 = c._extractExoDurations(SEANCES); } catch (e) {}
  ok('Évolution ne change pas : toujours deux passages pour une courbe', !!e2[c._norm('Chaise isométrique') + '__duree'] && !e2[c._norm('Gainage ventral') + '__duree'], Object.keys(e2).join(', '));
}
ok('la ligne ouvre la carte de DURÉE', /_histVoirCourbe\(this, \\'duree\\'\)/.test(fd('_histDureeHtml')));
{
  let ouvert = 0; const sd = new Set(); const c2 = vm.createContext({ _progPatient: { id: 'p1' }, _pevoFocusCle: null,
    _pevoGetSel: () => new Set(), _pevoSaveSel: () => {}, _pevoGetDureeSel: () => sd, _pevoSaveDureeSel: () => {}, openChargesEvo: () => { ouvert++; } });
  try { vm.runInContext(fd('_norm') + fd('_histVoirCourbe'), c2); c2._histVoirCourbe({ closest: () => ({ getAttribute: () => 'Chaise Isométrique' }) }, 'duree'); } catch (e) { ok('_histVoirCourbe se charge', false, e.message); }
  ok('… ajoutée à la sélection des durées, et amenée à l\'écran', sd.has(c._norm('Chaise Isométrique') + '__duree') && c2._pevoFocusCle === c._norm('Chaise Isométrique') + '__duree' && ouvert === 1, JSON.stringify([...sd]) + ' ' + c2._pevoFocusCle);
}
ok('… les cartes de durée portent leur clé', /dureeChartsHtml \+= '<div class="pevo-card" data-cle="'\+escH\(key\)\+'">'/.test(fd('_renderPevoCharts')));
ok('l\'historique charge aussi les durées, un passage suffisant', /_histExos\.durees = Array\.isArray\(data\) \? _extractExoDurations\(data, 1\) : \{\};/.test(fd('_histExosCharger')));
ok('taper une durée recalcule la ligne', /field === 'reps' \|\| field === 'duree'/.test(fd('updateField')));

console.log('\n5 — « Évolution » quitte le menu ··· du builder');
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 9000);
ok('le bouton est parti', !/id="moreMenuEvo"/.test(html) && !/openChargesEvo\(\)/.test(menu));
ok('… et sa règle d\'affichage', !/moreMenuEvo/.test(fm('_toggleMoreMenu')));
ok('« Programmes du patient » reste, builder seulement', /_prog\.style\.display = \(_bp && _bp\.classList\.contains\('open'\)\) \? '' : 'none'/.test(fm('_toggleMoreMenu')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : les durées ont leur ligne ; Évolution s\'ouvre depuis la ligne et la carte Charge.');

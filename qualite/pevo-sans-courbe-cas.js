#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution — un exercice à une seule séance se DIT, il ne disparaît pas

   Signalé par le praticien (2026-09-20) : « Presse C0/L2 n'apparaît pas dans
   Évolution, pourquoi ? »

   Parce qu'il faut DEUX points pour tracer une courbe : le builder appelle
   _extractExoLoads avec minPoints=1 — un passage suffit pour la ligne grise —
   mais Évolution l'appelle sans argument, et le défaut est 2.

   L'exercice disparaissait alors de la liste sans un mot. Masquer est
   indiscernable d'une panne — c'est la règle que le produit s'applique
   ailleurs (les panneaux du CR se désactivent en écrivant pourquoi). Il reste
   donc listé, grisé, non cochable, avec ce qui lui manque.

   Les DURÉES suivent la même règle et avaient le même trou.

     node qualite/pevo-sans-courbe-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fd = n => { const d = pdata.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'S', donnees: { blocs: [{ exos }] } } });
const kg = (n, reps, poids) => ({ name: n, reps: String(reps), series: '3',
  cibles: poids ? [{ type: 'kg', min: String(poids), max: String(poids) }] : [] });
const SEANCES = [
  prog('2026-09-04', [kg('Presse C2/L2', 15, 8), kg('Presse C0/L2', 15, 10)]),
  prog('2026-09-11', [kg('Presse C2/L2', 15, 10)])
];
const c = vm.createContext({ escH: s => String(s || ''), PEVO_NON_CLASSE: 'Non classé' });
try {
  vm.runInContext(['_norm', '_cleExo', '_repsUnite', '_1rm', '_extractExoLoads', '_pevoSansCourbe',
    '_pevoValeurPoint', '_pevoSpark', '_pevoLigneHtml', '_pevoGrouper', '_pevoSelecteurHtml'].map(fd).join('\n'), c);
} catch (e) { ok('le code se charge', false, e.message); }

console.log('\nCe qui manque à la courbe');
let complet = {}, partiel = {}, manquants = [];
try {
  complet = c._extractExoLoads(SEANCES);       // Évolution : deux points
  partiel = c._extractExoLoads(SEANCES, 1);    // le builder : un seul
  manquants = c._pevoSansCourbe(complet, partiel);
} catch (e) { ok('_pevoSansCourbe tourne', false, e.message); }
ok('la courbe garde celui qui a deux séances', Object.keys(complet).join(',') === 'presse c2/l2', Object.keys(complet).join(','));
ok('… et celui qui n\'en a qu\'une est RETROUVÉ, pas perdu',
   manquants.length === 1 && manquants[0].label === 'Presse C0/L2' && manquants[0].n === 1, JSON.stringify(manquants));
ok('rien à signaler quand tout a sa courbe', (() => {
  try { return c._pevoSansCourbe(partiel, partiel).length === 0; } catch (e) { return false; }
})());
ok('une donnée absente ne casse rien', (() => {
  try { return c._pevoSansCourbe(null, null).length === 0 && c._pevoSansCourbe({}, null).length === 0; } catch (e) { return false; }
})());

console.log('\nCe que la liste en montre');
let h = '';
try { h = c._pevoSelecteurHtml(complet, new Set(), {}, '_pevoToggle', manquants); } catch (e) { ok('le sélecteur tourne', false, e.message); }
ok('l\'exercice est nommé', h.indexOf('Presse C0/L2') > -1, h.slice(-300));
ok('… avec ce qui lui manque, en clair', /1 séance/.test(h) && /courbe/i.test(h), h.slice(-300));
ok('… et il n\'est PAS cochable : rien à tracer', (() => {
  const i = h.indexOf('pevo-sc');
  return i > -1 && h.slice(i).indexOf('<input') === -1;
})(), 'une case à cocher traîne dans le bloc');
ok('il ne se mélange pas aux exercices tracés', (h.match(/class="pevo-li[ "]/g) || []).length === 1,
   (h.match(/class="pevo-li[ "]/g) || []).length + ' lignes cochables');
ok('rien du tout quand il n\'y a rien à signaler', c._pevoSelecteurHtml(complet, new Set(), {}, '_pevoToggle', []).indexOf('pevo-sc') === -1);
ok('le bloc a son style', /\.pevo-sc\b/.test(html), 'CSS absent');

console.log('\nLa recherche le voit aussi');
ok('les lignes grisées portent le même repère de nom', /pevo-li-nom/.test(h.slice(h.indexOf('pevo-sc'))), 'le filtre ne les trouverait pas');

console.log('\nLes deux listes, pas une');
ok('les charges ET les durées ont leur relevé à un point',
   /_pevoData1\s*=\s*_extractExoLoads\(\w+, 1\)/.test(pdata) && /_pevoDureeData1\s*=\s*_extractExoDurations\(\w+, 1\)/.test(pdata),
   (pdata.match(/_pevoD\w*1\s*=\s*_extract\w+\([^)]*\)/g) || []).join(' | '));
ok('… relevés aux DEUX endroits qui chargent les séances',
   (pdata.match(/_pevoData1\s*=/g) || []).length >= 3, (pdata.match(/_pevoData1\s*=/g) || []).length + ' affectations');
ok('… et remis à zéro avec les autres', /_pevoData1 = null/.test(fd('_pevoVider')) || /_pevoData1 = null/.test(pdata));
ok('les deux sélecteurs reçoivent leur liste', (pdata.match(/_pevoSansCourbe\(/g) || []).length >= 3,
   (pdata.match(/_pevoSansCourbe\(/g) || []).length + ' appels');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution : un exercice sans courbe reste visible, et dit ce qui lui manque.');

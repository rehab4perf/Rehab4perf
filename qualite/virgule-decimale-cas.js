#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — une charge saisie « 7,5 » vaut 7,5, pas 7

   Signalé par le praticien (2026-09-24) : « 8 reps à 7,5 kg ; la séance
   suivante me dit que j'ai fait 8 reps à 7 kg ».

   Les champs de cible sont des `type="text"` — le praticien y tape la virgule
   décimale française. `parseFloat('7,5')` s'arrête à la virgule et rend 7 :
   le demi-kilo est perdu SILENCIEUSEMENT, à la lecture, jamais à la saisie.
   La valeur reste juste en base ; c'est tout ce qui la relit qui ment.

   Ce n'est donc pas la ligne grise qui est en cause : elle affiche bien ce
   qu'on lui donne (`kgFr` garde une décimale). C'est l'extraction. Et la même
   lecture nourrit la courbe d'Évolution, le 1RM estimé, le poids d'une cible
   en %1RM et la durée estimée du bloc — le défaut avait quatre autres visages.

   `_nbFr(v)` lit un nombre tapé à la main, virgule ou point. Elle ne RÉÉCRIT
   rien : ce que le praticien a tapé reste tel quel en base.

     node qualite/virgule-decimale-cas.js
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

const c = vm.createContext({ escH: s => String(s || ''), _builderDate: '2026-09-24',
  _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-24' });
try {
  vm.runInContext(['_nbFr', '_norm', '_cleExo', '_repsUnite', '_1rm', '_parseDuree', '_formatDuree',
    '_extractExoLoads', '_extractExoDurations', '_rm1Ref', '_histExoCourant', '_histDureeHtml',
    '_histExoHtml', 'parseMin', 'parseNum'].map(fd).join('\n')
    + '\nvar _histExos = { pid:"x", map:null, durees:null, enCours:false };', c);
} catch (e) { ok('le code se charge', false, e.message); }

console.log('\nLire un nombre tapé à la main');
const N = v => { try { return c._nbFr(v); } catch (e) { return 'ERREUR ' + e.message; } };
ok('la virgule décimale française', N('7,5') === 7.5, String(N('7,5')));
ok('le point aussi — rien de ce qui marchait ne casse', N('7.5') === 7.5 && N('12') === 12);
ok('un nombre déjà numérique passe', N(7.5) === 7.5);
ok('vide, texte, null : NaN, jamais 0 déguisé', [N(''), N(null), N(undefined), N('abc')].every(v => isNaN(v)),
   JSON.stringify([N(''), N(null), N('abc')]));
ok('les espaces ne gênent pas', N(' 7,5 ') === 7.5 && N('7 , 5') === 7.5, String(N('7 , 5')));

console.log('\nLa charge de la séance passée');
const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'S', donnees: { blocs: [{ exos }] } } });
const exo = (n, reps, kgTxt) => ({ name: n, reps: String(reps), series: '3',
  cibles: kgTxt ? [{ type: 'kg', min: kgTxt, max: '' }] : [] });
const SEANCES = [prog('2026-09-10', [exo('Presse', 8, '7,5'), exo('Curl', 10, '5,25')]),
                 prog('2026-09-17', [exo('Presse', 8, '10,5'), exo('Curl', 10, '6')])];
let map = {};
try { map = c._extractExoLoads(SEANCES, 1); } catch (e) { ok('_extractExoLoads tourne', false, e.message); }
ok('7,5 reste 7,5 dans le relevé', (((map['presse'] || {}).points || [])[0] || {}).kg === 7.5,
   JSON.stringify(((map['presse'] || {}).points || []).map(p => p.kg)));
ok('… et la fourchette « 5,25 » ne se tronque pas non plus', (((map['curl'] || {}).points || [])[0] || {}).kg === 5.25,
   JSON.stringify(((map['curl'] || {}).points || []).map(p => p.kg)));
{
  c._histExos.map = map;
  const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };
  ok('la ligne sous l\'exercice écrit le demi-kilo', /3 × 8 à 10,5 kg/.test(ligne('Presse')), ligne('Presse'));
}

console.log('\nCe que la même lecture nourrissait aussi');
ok('le 1RM estimé', (() => { try { return c._1rm('7,5', 1) === 7.5; } catch (e) { return false; } })(),
   (() => { try { return String(c._1rm('7,5', 1)); } catch (e) { return 'ERREUR'; } })());
ok('la charge de la séance qu\'on compose', (() => {
  try { return c._histExoCourant(exo('Presse', 8, '7,5')).kg === 7.5; } catch (e) { return false; }
})(), (() => { try { return String(c._histExoCourant(exo('Presse', 8, '7,5')).kg); } catch (e) { return 'ERREUR'; } })());
ok('une fourchette 7,5 – 12,5 donne sa moyenne', (() => {
  try { return c._histExoCourant({ name: 'x', reps: '8', cibles: [{ type: 'kg', min: '7,5', max: '12,5' }] }).kg === 10; }
  catch (e) { return false; }
})());
ok('la durée estimée : « 1,5 min » ne vaut pas 1 min', (() => {
  try { return c.parseMin('1,5min') === 1.5; } catch (e) { return false; }
})(), (() => { try { return String(c.parseMin('1,5min')); } catch (e) { return 'ERREUR'; } })());
ok('… et un nombre seul « 2,5 » non plus', (() => {
  try { return c.parseNum('2,5') === 2.5; } catch (e) { return false; }
})(), (() => { try { return String(c.parseNum('2,5')); } catch (e) { return 'ERREUR'; } })());

console.log('\nLa saisie n\'est jamais réécrite');
ok('_nbFr ne touche pas à ce qui est stocké', (() => {
  const e = exo('Presse', 8, '7,5');
  try { c._histExoCourant(e); } catch (x) {}
  return e.cibles[0].min === '7,5';
})(), 'la valeur tapée a changé');
ok('plus aucun parseFloat sur une cible saisie à la main',
   !/parseFloat\((?:c|kgCible)\.(?:min|max)\)/.test(pdata),
   (pdata.match(/parseFloat\((?:c|kgCible)\.(?:min|max)\)/g) || []).join(' | '));
ok('… ni sur les répétitions d\'un exercice',
   !/parseFloat\((?:e|exo)\.reps\)/.test(pdata), (pdata.match(/parseFloat\((?:e|exo)\.reps\)/g) || []).join(' | '));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : une charge saisie à la virgule garde ses décimales, partout où on la relit.');

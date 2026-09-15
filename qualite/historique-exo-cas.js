#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — ce que l'exercice a fait la dernière fois

   Signalé par le praticien (2026-09-13), après le retrait d'« Évolution » du
   menu ··· : « quand je suis dans le builder, j'aime avoir accès à l'évolution
   de mes charges pour mettre le bon poids sur mon exercice. »

   A — « Évolution » revient dans le menu ···, dans le BUILDER seulement (sur
       l'agenda, la carte Charge y mène). Provisoire : si B suffit, il repart.
   B — sous chaque exercice, dans la cellule de son nom : la dernière séance
       AVANT celle qu'on compose, « 4 × 8 à 75 kg · 1RM est. 93,1 kg ↗ +6,2 kg »,
       ou « 3 × 10 poids du corps ↗ +2 reps ». Mêmes données qu'Évolution —
       les charges PRESCRITES des séances passées (_extractExoLoads), un seul
       point suffit ici (Évolution en exige deux pour tracer une courbe).
       Chargées une fois par patient à l'ouverture du builder ; les lignes se
       remplissent en place, sans redessiner la séance (la saisie en cours ne
       se perd pas). Rien sur un modèle : il n'est à personne.

     node qualite/historique-exo-cas.js
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

/* ── A : Évolution dans le menu ···, builder seulement ───────────────────── */
console.log('\nA — Évolution dans le builder');
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 7000);
/* Retiré le 2026-09-15 (« 3 + 5 ») : la ligne sous chaque exercice suffit, et
   un clic dessus ouvre la courbe (historique-vivant-cas, historique-duree-cas). */
ok('A retiré : le menu ··· ne porte plus « Évolution »', !/moreMenuEvo/.test(menu) && !/openChargesEvo\(\)/.test(menu));
ok('… ni sa règle d\'affichage', !/_evo\.style/.test(fm('_toggleMoreMenu')));

/* ── B : la ligne d'historique ───────────────────────────────────────────── */
console.log('\nB — la dernière séance, sous l\'exercice');
const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const kg = (n, reps, series, charge) => ({ name: n, reps: String(reps), series: String(series), cibles: charge ? [{ type: 'kg', min: String(charge), max: '' }] : [] });
const SEANCES = [
  prog('2026-08-31', [kg('Back squat', 8, 4, 70), kg('Pistol squat box', 8, 3), kg('Fentes', 10, 3, 20)]),
  prog('2026-09-07', [kg('Back Squat', 8, 4, 75), kg('Pistol squat box', 10, 3), { name: 'Rameur', reps: '', series: '1' }]),
  prog('2026-09-14', [kg('Back squat', 8, 4, 80)])     // la séance qu'on compose : ne compte pas
];
function contexte(etat) {
  const c = vm.createContext(Object.assign({
    _builderDate: '2026-09-14', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
    _pevoAujourdhuiIso: () => '2026-09-13',
    escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }, etat));
  vm.runInContext(['_norm', '_1rm', '_extractExoLoads', '_rm1Ref', '_histExoCourant', '_histExoHtml'].map(fd).join('\n') + '\nvar _histExos = { pid:"x", map:null, enCours:false };', c);
  return c;
}
const c = contexte({});
let carte = {};
try { carte = c._extractExoLoads(SEANCES, 1); c._histExos.map = carte; } catch (e) { ok('l\'extraction se charge', false, e.message); }
const ligne = (nom, ctx) => { try { return (ctx || c)._histExoHtml(nom).replace(/<[^>]+>/g, ''); } catch (e) { return 'ERREUR ' + e.message; } };
const bs = ligne('Back squat');
ok('la dernière séance AVANT celle qu\'on compose (7 sept., pas le 14)', /^Dernière séance \(7 sept\.\) : /.test(bs), bs);
ok('… séries × répétitions, à la charge prescrite', /4 × 8 à 75 kg/.test(bs), bs);
ok('… le 1RM estimé, et sa tendance depuis la séance d\'avant', /1RM est\. 93,1 kg/.test(bs) && /↗ \+6,2 kg/.test(bs), bs);
ok('au poids du corps : les répétitions, et leur tendance', ligne('Pistol squat box') === 'Dernière séance (7 sept.) : 3 × 10 poids du corps ↗ +2 reps', ligne('Pistol squat box'));
ok('une seule séance passée suffit (sans tendance)', /^Dernière séance \(31 août\) : 3 × 10 à 20 kg · 1RM est\. [\d,]+ kg$/.test(ligne('Fentes')), ligne('Fentes'));
ok('le nom se reconnaît sans tenir compte de la casse', ligne('back SQUAT') === bs);
ok('un exercice jamais fait, ou sans répétitions : rien', ligne('Soulevé de terre') === '' && ligne('Rameur') === '');
ok('sur un modèle : rien (il n\'est à personne)', ligne('Back squat', Object.assign(contexte({ _builderFromTemplate: 't1' }), {})) === '' || (() => { const m = contexte({ _builderFromTemplate: 't1' }); m._histExos.map = carte; return m._histExoHtml('Back squat') === ''; })());
{
  const m = contexte({ _builderFromTemplate: 't1' }); m._histExos.map = carte;
  const t = contexte({ _builderMode: 'template' }); t._histExos.map = carte;
  ok('… ni sur un nouveau modèle en composition', m._histExoHtml('Back squat') === '' && t._histExoHtml('Back squat') === '');
}
{
  const d = contexte({}); let e2 = {};
  try { e2 = d._extractExoLoads(SEANCES); } catch (e) {}
  ok('Évolution ne change pas : toujours deux points pour une courbe', !!e2['back squat'] && !e2['fentes'], Object.keys(e2).join(', '));
  ok('les points gardent le nombre de séries', carte['back squat'] && carte['back squat'].points[0].series === '4');
}

console.log('\nDans le builder');
const rs = fd('renderSession');
ok('la ligne vit DANS la cellule du nom, avant ses vignettes (la grille de la ligne ne bouge pas)',
   /* data-exo : la ligne se recalcule en place à la frappe (historique-vivant-cas) */
   /html \+= '<div class="exo-hist" data-hist="' \+ escH\(e\.name\|\|''\) \+ '" data-exo="' \+ b\.id \+ '\|' \+ e\.id \+ '">' \+ _histExoHtml\(e\.name, e\) \+ '<\/div>';\n\s*html \+= '<div class="exo-sub">';/.test(rs));
ok('l\'historique se charge à l\'ouverture du builder', /_histExosCharger\(/.test(fm('_enterBuilderMode'))   /* forcé à chaque ouverture : historique-vivant-cas */);
const ch = fd('_histExosCharger');
ok('… une fois par patient, avec la requête d\'Évolution', /_histExos\.pid === pid && \(_histExos\.map \|\| _histExos\.enCours\)/.test(ch) && /programmes\(nom,donnees\)/.test(ch) && /_extractExoLoads\(data, 1\)/.test(ch));
ok('… une réponse arrivée après un changement de patient est ignorée', /if\(_histExos\.pid !== pid\) return;/.test(ch));
ok('… et les lignes se remplissent en place, sans redessiner la séance', /querySelectorAll\('\.exo-hist\[data-hist\]'\)/.test(fd('_histExosRemplir')) && !/renderSession/.test(ch));
ok('une ligne vide ne prend pas de place', /\.exo-hist:empty \{ display:none; \}/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : la dernière séance de chaque exercice, sous son nom.');

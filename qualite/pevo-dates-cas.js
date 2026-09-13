#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution du programme — des dates qu'on peut lire sous une longue courbe

   Signalé par le praticien (2026-09-13), capture à l'appui : le pistol squat
   de Zied, une vingtaine de séances, et sous la courbe « 31/0701/0803/0804/08… »
   — une date par point, bord à bord, illisibles.

   Les quatre constructeurs (charge, durée, cardio, douleur) écrivaient chacun
   une date par séance. Ils passent tous par `_pevoDatesX` :
     - une date par séance tant qu'elles tiennent, puis une sur deux, sur
       trois… — l'écart minimal est en unités du viewBox, comme la police, il
       tient donc à toute largeur ;
     - la première et la dernière toujours, ancrées vers l'intérieur (la
       première ne déborde plus à gauche, la dernière ne mord plus l'axe) ;
     - le détail d'un point reste dans sa bulle.

     node qualite/pevo-dates-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const src = n => fnDe(pdata)(n) || fnDe(pmain)(n);
const ECART = 34;

const ctx = vm.createContext({ escH: s => String(s) });
const code = ['_pevoBandeIdx', '_pevoBandeSvg', '_formatDuree', '_formatDureeMin', '_formatCardioIntensity', '_pevoDatesX',
  '_buildPevoChart', '_buildPevoDureeChart', '_buildPevoCardioChart', '_buildPevoNrsChart'].map(src).join('\n');
const constante = (pdata.match(/\nvar PEVO_DATE_ECART = [^;]+;/) || [''])[0];
try { vm.runInContext(constante + code, ctx); } catch (e) { ok('les constructeurs se chargent', false, e.message); }
['_formatDuree', '_formatDureeMin', '_formatCardioIntensity'].forEach(n => { if (typeof ctx[n] !== 'function') ctx[n] = v => String(v); });

/* n séances, un jour sur deux à partir du 31 juillet. */
function seances(n) {
  const out = [], d = new Date(Date.UTC(2026, 6, 31));
  for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 2); }
  return out;
}
const jjmm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);
function rendre(nom, n) {
  const iso = seances(n);
  try {
    if (nom === 'charge') return ctx._buildPevoChart(iso.map((_, i) => 8 + (i % 3)), iso.map(jjmm), 'c' + n,
      iso.map((d, i) => ({ bw: true, reps: 8 + (i % 3), date: d })), iso.map(() => 0), null, null);
    if (nom === 'durée') return ctx._buildPevoDureeChart(iso.map((d, i) => ({ date: d, secs: 30 + i })), 'd' + n, null, null);
    if (nom === 'cardio') return ctx._buildPevoCardioChart(iso.map((d, i) => ({ date: d, duree: 20 + i, km: null, intensite: null })), 'k' + n, null, false, null);
    if (nom === 'douleur') return ctx._buildPevoNrsChart(iso.map((d, i) => ({ date: d, nrs: i % 4 })), 'n' + n, null);
  } catch (e) { return 'ERREUR ' + e.message; }
}
/* Les dates posées sous l'axe : leur position, leur ancrage, leur texte. */
const dates = svg => [...String(svg).matchAll(/<text[^>]*?x="([\d.]+)"[^>]*?text-anchor="(\w+)"[^>]*>(\d\d\/\d\d)<\/text>/g)]
  .map(m => ({ x: +m[1], ancre: m[2], t: m[3] }));

['charge', 'durée', 'cardio', 'douleur'].forEach(nom => {
  console.log('\nCourbe « ' + nom + ' »');
  const s20 = rendre(nom, 20), d20 = dates(s20), iso = seances(20);
  ok('20 séances : pas 20 dates, mais assez pour se repérer', d20.length >= 5 && d20.length <= 14, d20.length + ' dates · ' + String(s20).slice(0, 80));
  const ecarts = d20.slice(1).map((d, i) => d.x - d20[i].x);
  ok('… jamais plus proches que ' + ECART + ' unités (une date et un espace)', ecarts.length && Math.min(...ecarts) >= ECART, 'écart min = ' + (ecarts.length ? Math.min(...ecarts).toFixed(1) : '—'));
  ok('… la première et la dernière séance toujours datées', d20.length && d20[0].t === jjmm(iso[0]) && d20[d20.length - 1].t === jjmm(iso[19]), d20.map(d => d.t).join(' '));
  ok('… ancrées vers l\'intérieur', d20.length && d20[0].ancre === 'start' && d20[d20.length - 1].ancre === 'end', d20.length ? d20[0].ancre + ' … ' + d20[d20.length - 1].ancre : '');
  const d5 = dates(rendre(nom, 5));
  ok('5 séances : toutes datées, comme avant', d5.length === 5, d5.map(d => d.t).join(' '));
});

console.log('\nUne seule façon de poser les dates');
['_buildPevoChart', '_buildPevoDureeChart', '_buildPevoCardioChart', '_buildPevoNrsChart'].forEach(n =>
  ok(n + ' passe par _pevoDatesX', /_pevoDatesX\(/.test(src(n)) && !/shownD/.test(src(n))));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution du programme : des dates lisibles, même sous vingt séances.');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution du programme — des valeurs qui ne se chevauchent plus

   Signalé sur la même capture que les dates (pistol squat de Zied, 13/09) :
     - « 10reps PdC », centrée sur le dernier point, mordait l'échelle douleur
       de droite : on lisait « 10reps 1PdC » ;
     - « 8reps PdC », centrée sur le premier point, débordait à gauche ;
     - « 0/10 », la dernière douleur, posée AU-DESSUS de son point, tombait
       sur la courbe verte de la charge.

   La règle, dans les quatre constructeurs (charge, durée, cardio, douleur) :
     - la première valeur s'ancre à gauche, la dernière à droite
       (`_pevoValEtiq`) — la même règle que les dates et que les courbes du
       bilan ;
     - un liseré blanc (`PEVO_HALO`) détache chaque valeur de ce qu'elle
       croise ;
     - la dernière douleur d'une courbe double se pose À CÔTÉ de son point,
       vers l'intérieur : au-dessus, c'est là que passe l'autre courbe.

     node qualite/pevo-etiquettes-cas.js
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
const vars = ['PEVO_DATE_ECART', 'PEVO_HALO'].map(v => (pdata.match(new RegExp('\\nvar ' + v + ' = [^;]+;')) || [''])[0]).join('\n');

const ctx = vm.createContext({ escH: s => String(s) });
try {
  vm.runInContext(vars + '\n' + ['_pevoBandeIdx', '_pevoBandeSvg', '_formatDuree', '_formatDureeMin', '_formatCardioIntensity',
    '_pevoDatesX', '_pevoValEtiq', '_pevoDouleurEtiq', '_buildPevoChart', '_buildPevoDureeChart', '_buildPevoCardioChart', '_buildPevoNrsChart'].map(src).join('\n'), ctx);
} catch (e) { ok('les constructeurs se chargent', false, e.message); }
['_formatDuree', '_formatDureeMin', '_formatCardioIntensity'].forEach(n => { if (typeof ctx[n] !== 'function') ctx[n] = v => String(v); });

const iso = []; { const d = new Date(Date.UTC(2026, 6, 31)); for (let i = 0; i < 12; i++) { iso.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 3); } }
const jj = s => s.slice(8, 10) + '/' + s.slice(5, 7);
/* Les étiquettes de valeur : tout <text> qui n'est pas une date, une graduation ou « Auj. ». */
const valeurs = svg => [...String(svg).matchAll(/<text([^>]*)>([^<]*)<\/text>/g)]
  .map(m => ({ attrs: m[1], t: m[2], x: +((m[1].match(/ x="([\d.-]+)"/) || [])[1]), y: +((m[1].match(/ y="([\d.-]+)"/) || [])[1]),
               ancre: (m[1].match(/text-anchor="(\w+)"/) || [])[1] }))
  .filter(e => !/pevo-date/.test(e.attrs) && !/^(\d{1,2}|Auj\.)$/.test(e.t) && e.t !== '' && !/text-anchor="end" font-size="9"/.test(e.attrs));

function verifier(nom, svg, premier, dernier) {
  console.log('\nCourbe « ' + nom + ' »');
  const v = valeurs(svg);
  const p = v.find(e => e.t === premier), d = v.filter(e => e.t === dernier).pop();
  ok('la première valeur s\'ancre à gauche (elle ne déborde plus du cadre)', p && p.ancre === 'start', p ? p.ancre + ' · ' + p.t : 'absente · ' + v.map(e => e.t).join(' | '));
  ok('la dernière valeur s\'ancre à droite (elle ne mord plus l\'échelle)', d && d.ancre === 'end', d ? d.ancre + ' · ' + d.t : 'absente');
  ok('… chacune avec son liseré blanc', p && d && /paint-order="stroke"/.test(p.attrs) && /paint-order="stroke"/.test(d.attrs));
  return v;
}

/* Charge + douleur : le cas de la capture. La douleur s'arrête au 8e point. */
let s = '';
try {
  s = ctx._buildPevoChart(iso.map((_, i) => i < 11 ? 8 : 10), iso.map(jj), 'c', iso.map((d, i) => ({ bw: true, reps: i < 11 ? 8 : 10, date: d })),
    iso.map((_, i) => i < 8 ? 0 : null), null, null);
} catch (e) { s = 'ERREUR ' + e.message; }
const vc = verifier('charge', s, '8reps PdC', '10reps PdC');
{
  const dl = vc.filter(e => e.t === '0/10').pop();
  const pt = [...s.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4\.5" fill="#7C3AED"\/>/g)].pop();
  ok('la dernière douleur se pose À CÔTÉ de son point, pas au-dessus (là passe la charge)',
     dl && pt && Math.abs(dl.x - +pt[1]) >= 5 && Math.abs(dl.y - (+pt[2] + 3)) < 1 && /paint-order="stroke"/.test(dl.attrs),
     dl ? JSON.stringify({ x: dl.x, y: dl.y, ancre: dl.ancre }) + ' point ' + (pt ? pt[1] + ',' + pt[2] : '?') : 'absente');
}

try { s = ctx._buildPevoDureeChart(iso.map((d, i) => ({ date: d, secs: 30 + i * 5 })), 'd', iso.map((_, i) => i % 3), null); } catch (e) { s = 'ERREUR ' + e.message; }
verifier('durée', s, ctx._formatDuree(30), ctx._formatDuree(85));

try { s = ctx._buildPevoCardioChart(iso.map((d, i) => ({ date: d, duree: 20 + i, km: null, intensite: null })), 'k', null, false, null); } catch (e) { s = 'ERREUR ' + e.message; }
verifier('cardio', s, ctx._formatDureeMin(20), ctx._formatDureeMin(31));

try { s = ctx._buildPevoNrsChart(iso.map((d, i) => ({ date: d, nrs: [2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1][i] })), 'n', null); } catch (e) { s = 'ERREUR ' + e.message; }
verifier('douleur', s, '2/10', '1/10');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution du programme : les valeurs ne se chevauchent plus.');

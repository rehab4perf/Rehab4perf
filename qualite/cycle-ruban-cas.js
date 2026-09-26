#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Agenda — le cycle s'écrit une fois par semaine, en ruban

   Retenu par le praticien sur le prototype du 2026-09-13 : le nom du cycle
   était écrit dans CHAQUE case du mois — trente fois « Endurance de force ».
   Il s'écrit désormais une fois par semaine, au-dessus de ses jours, avec
   l'avancement (« sem. 3/6 »). Un cycle qui change en cours de semaine donne
   deux segments, chacun au-dessus de ses jours.

   La teinte de fond des cases reste : elle dit l'étendue du cycle d'un coup
   d'œil, et c'est le changement le plus petit possible.

   Au passage : `grid-auto-rows:88px` donnait 88 px à TOUTES les rangées de la
   grille du mois — y compris celle des noms de jours, d'où le grand vide entre
   « Lun … Dim » et la première semaine. La hauteur passe sur les cases.

     node qualite/cycle-ruban-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');   // comme escH (prog-data.js)

const ctx = vm.createContext({ escH: esc, _cycleColors: {}, _cycles: [] });
/* `_cycleDuJour` s'appuie sur `_cyclesDuJour` depuis le 2026-09-26 : la carte
   de la barre latérale les montre TOUS (qualite/cycles-sidebar-cas.js). */
try { vm.runInContext(fm('_cyclesDuJour') + fm('_cycleDuJour') + fm('_cycleRubanHtml'), ctx); }
catch (e) { ok('les fonctions se chargent', false, e.message); }
const jour = iso => { const d = new Date(iso + 'T00:00:00'); d.setHours(0, 0, 0, 0); return d; };
const semaine = lundi => { const out = [], d = jour(lundi); for (let i = 0; i < 7; i++) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out; };
const ruban = jours => { try { return ctx._cycleRubanHtml(jours); } catch (e) { return 'ERREUR ' + e.message; } };
const segs = h => [...String(h).matchAll(/<div class="cal-cycle-seg" style="grid-column:(\d+) \/ (\d+);[^"]*"[^>]*><b>([^<]*)<\/b>(?:<span>([^<]*)<\/span>)?/g)]
  .map(m => ({ de: +m[1], a: +m[2], nom: m[3], sem: m[4] || '' }));

console.log('\nUn ruban par semaine');
ctx._cycles = [
  { nom: 'Puissance', startDate: '2026-08-24', duree: 2, color: '#C0392B' },
  { nom: 'Endurance de force', startDate: '2026-09-07', duree: 6, color: '#2B5FA6' }
];
let s = segs(ruban(semaine('2026-08-31')));
ok('semaine pleine d\'un cycle : un seul segment, sur les 7 jours', s.length === 1 && s[0].de === 1 && s[0].a === 8 && s[0].nom === 'Puissance', JSON.stringify(s));
ok('… qui dit où on en est : « sem. 2/2 »', s[0] && s[0].sem === 'sem. 2/2', s[0] && s[0].sem);
s = segs(ruban(semaine('2026-09-07')));
ok('le cycle suivant commence : « Endurance de force », sem. 1/6', s.length === 1 && s[0].nom === 'Endurance de force' && s[0].sem === 'sem. 1/6', JSON.stringify(s));
s = segs(ruban(semaine('2026-09-21')));
ok('deux semaines plus loin : sem. 3/6', s.length === 1 && s[0].sem === 'sem. 3/6', JSON.stringify(s));

console.log('\nUn cycle qui change en cours de semaine');
ctx._cycles = [
  { nom: 'Reprise', startDate: '2026-09-03', endDate: '2026-09-09', color: '#1D9E75' },
  { nom: 'Force', startDate: '2026-09-10', duree: 4, color: '#7C3AED' }
];
s = segs(ruban(semaine('2026-09-07')));
ok('deux segments, chacun au-dessus de ses jours (lun.–mer., jeu.–dim.)', s.length === 2 && s[0].de === 1 && s[0].a === 4 && s[1].de === 4 && s[1].a === 8, JSON.stringify(s));
ok('… un cycle démarré en milieu de semaine compte ses semaines de 7 jours', s[1] && s[1].sem === 'sem. 1/4' && s[0].sem === 'sem. 1/1', JSON.stringify(s));

console.log('\nCas limites');
ctx._cycles = [{ nom: 'Charge <b>', startDate: '2026-09-07', duree: 1, color: '#2B5FA6' }];
const h = ruban(semaine('2026-09-07'));
ok('le nom est échappé', /Charge &lt;b&gt;/.test(h) && !/Charge <b>/.test(h), h.slice(0, 160));
ok('une semaine sans cycle : pas de ruban', ruban(semaine('2026-10-05')) === '');
ok('les jours hors du mois (null) ne portent pas de segment', segs(ruban([null, null].concat(semaine('2026-09-07').slice(2)))).every(x => x.de >= 3));
ctx._cycles = [{ nom: 'Court', startDate: '2026-09-12', duree: 1, color: '#2B5FA6' }];   // samedi : 2 jours dans la rangée
s = segs(ruban(semaine('2026-09-07')));
ok('un segment de moins de 3 jours garde le nom, sans « sem. » (pas la place)', s.length === 1 && s[0].sem === '' && s[0].de === 6, JSON.stringify(s));

console.log('\nL\'agenda');
ok('le nom du cycle n\'est plus écrit dans chaque case (mois et semaine)', !/_dayCycleLabelHtml\(/.test(pmain) && !/cal-day-cycle-lbl|cal-week-cycle-lbl/.test(html));
ok('la vue Mois pose un ruban par semaine', /_cycleRubanHtml\(jours\)/.test(fm('_renderCalendarUI')));
ok('la vue Semaine aussi, avec sa rangée en plus', /_cycleRubanHtml\(/.test(fm('_renderWeekUI')) && /\.cal-week-grid\.avec-ruban \{ grid-template-rows:auto auto 1fr; \}/.test(html));
ok('la teinte de fond des cases reste', /_dayCycleStyle\(cellDate\)/.test(fm('_renderCalendarUI')));
ok('la hauteur est celle des CASES, plus celle de toutes les rangées (noms de jours compris)',
   !/\.cal-grid \{[^}]*grid-auto-rows/.test(html) && /\.cal-grid > \.cal-day \{ height:88px; \}/.test(html) && /\.cal-grid > \.cal-day \{ height:62px; \}/.test(html));
ok('le ruban est défini', /\.cal-cycle-ruban \{/.test(html) && /\.cal-cycle-seg \{/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Agenda : le cycle s\'écrit une fois par semaine.');

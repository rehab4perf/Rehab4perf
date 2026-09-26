#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Agenda — un cycle à critères prend sa vraie forme : un début, pas de fin

   Décidé avec le praticien (2026-09-26, proposition D). Le ruban ne montrait
   que le cycle DATÉ : un cycle à critères n'ayant pas de bornes, rien ne le
   posait sur une semaine. Trois ajouts, à hauteur de ruban inchangée :

   - le ruban se PARTAGE : le cycle daté à gauche avec sa semaine, le cycle à
     critères à droite avec sa phase ;
   - « depuis le JJ/MM » : la date de début existe dans le cycle et n'était
     affichée nulle part ;
   - une flèche « → » dit fin INCONNUE, au lieu de faire semblant de couvrir
     une plage.

   Et le jalon : chaque critère coché stocke sa date (`checkedAt`), donc on
   sait le jour où une phase a basculé. C'est un événement daté et vrai — la
   seule chose que l'agenda peut dire et que la barre latérale ne dira jamais,
   elle qui donne où l'on en est, pas quand on y est arrivé.

     node qualite/cycle-criteres-agenda-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };

const ph = (nom, textes, dates) => ({ id: 'p' + nom, nom, criteria: textes,
  checks: Object.fromEntries(textes.map((_, i) => [i, dates[i] ? { checked: true, checkedAt: dates[i] } : { checked: false }])) });
const TENDON = { id: 'cy1', nom: 'Tendon', mode: 'criteres', startDate: '2026-08-24', color: '#C0392B',
  phases: [ ph('Phase 1', ['a', 'b'], ['2026-09-21T09:00:00.000Z', '2026-09-23T15:00:00.000Z']),
            ph('Phase 2', ['c'], [null]) ] };
const DATE = { id: 'cy2', nom: 'Endurance de force', startDate: '2026-08-24', endDate: '2026-10-03', color: '#2B5FA6' };

const c = vm.createContext({ _cycles: [TENDON, DATE], _cycleColors: {}, escH: s => String(s || '') });
try {
  vm.runInContext(['_cyclePhases', '_cyclePhaseIsDone', '_cyclePhaseCurrentIndex', '_cycleComputeEndDate',
    '_cycleIsDone', '_cycleIsCurrent', '_cyclesEnCours', '_cyclePhaseValideeLe', '_cycleJalonsDuJour',
    '_fmtDateShort'].map(fm).join('\n'), c);
} catch (e) { ok('le code se charge', false, e.message); }

console.log('\nQuand une phase a basculé');
const V = p => { try { return c._cyclePhaseValideeLe(p); } catch (e) { return 'ERREUR ' + e.message; } };
ok('la date du DERNIER critère coché, pas du premier', V(TENDON.phases[0]) === '2026-09-23', V(TENDON.phases[0]));
ok('une phase inachevée n\'a pas de date', V(TENDON.phases[1]) === null, String(V(TENDON.phases[1])));
ok('une phase sans critère non plus', V({ criteria: [], checks: {} }) === null);
ok('un critère coché avant que la date existe ne fabrique rien',
   V({ criteria: ['x'], checks: { 0: { checked: true } } }) === null,
   String(V({ criteria: ['x'], checks: { 0: { checked: true } } })));

console.log('\nLe jalon sur le jour');
const J = d => { try { return c._cycleJalonsDuJour(d); } catch (e) { return 'ERREUR ' + e.message; } };
ok('le 23 septembre porte « Phase 1 »', J('2026-09-23').length === 1 && /Phase 1/.test(J('2026-09-23')[0].texte),
   JSON.stringify(J('2026-09-23')));
ok('… avec la couleur de son cycle', (J('2026-09-23')[0] || {}).color === '#C0392B');
ok('un autre jour n\'en porte aucun', J('2026-09-24').length === 0 && J('2026-09-21').length === 0,
   JSON.stringify([J('2026-09-24').length, J('2026-09-21').length]));
ok('le calendrier les pose dans la case du jour', /_cycleJalonsDuJour\(/.test(fm('_buildDayChips')), 'aucun jalon dans les chips');
ok('… et ils ont leur style', /\.cal-jalon\b/.test(html), 'CSS du jalon absent');

console.log('\nLe ruban partagé');
{
  const rub = fm('_cycleRubanHtml');
  ok('le cycle à critères y entre', /_cyclesEnCours\(|mode === 'criteres'/.test(rub), rub.slice(0, 300));
  ok('… « depuis le » quand la date de début existe', /depuis le /.test(rub), 'la date de début reste cachée');
  ok('… une flèche dit fin inconnue', /→/.test(rub), 'rien ne dit que la fin est inconnue');
  ok('… et sa phase', /Ph\. |[Pp]hase/.test(rub));
  ok('le cycle daté garde sa semaine', /sem\. /.test(rub));
  ok('la hauteur du ruban ne change pas : une seule ligne', !/cal-cycle-ruban2|ruban-bas/.test(html) && /\.cal-cycle-ruban\b/.test(html));
}

console.log('\nLa frise du planificateur');
{
  const tl = fm('renderCycleTimeline');
  ok('un cycle à critères n\'est plus enfermé dans 60 px', !/[^-]width:'\+minW\+'px/.test(tl),
     (tl.match(/[^-]width:'\+minW\+'px[^;]*/g) || []).join(''));
  ok('… il prend la largeur de son contenu, avec un plancher', /min-width:/.test(tl), tl.slice(tl.indexOf("mode === 'criteres'"), tl.indexOf("mode === 'criteres'") + 500));
  ok('… et ses lignes ne débordent plus', (() => {
    const bloc = tl.slice(tl.indexOf("mode === 'criteres'"), tl.indexOf('return;', tl.indexOf("mode === 'criteres'")));
    return (bloc.match(/overflow:hidden/g) || []).length >= 2;
  })(), 'une ligne en nowrap sans overflow déborde de son bloc');
}

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Agenda : le cycle à critères dit depuis quand il court, et le jour où sa phase a basculé.');

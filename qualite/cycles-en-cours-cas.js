#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Cycles en cours — la même réponse partout, critères compris

   Signalé par le praticien (2026-09-26), capture à l'appui : le planificateur
   marque « Tendon EN COURS » (un cycle à CRITÈRES) pendant que la carte de la
   barre latérale annonce « Endurance de force » (un cycle DATÉ). Deux écrans,
   deux réponses à la même question.

   La cause : la carte lisait les DATES (`_cyclesDuJour`), donc elle ne pouvait
   pas voir un cycle à critères — il n'en a pas. Le planificateur, lui, lit
   `_cycleIsCurrent`, qui connaît les deux natures.

   Une seule lecture désormais : `_cyclesEnCours`, bâtie sur `_cycleIsCurrent`.

   Et `_cycleIsCurrent` s'aligne sur la règle déjà décidée côté athlète : un
   cycle à critères attend les précédents À CRITÈRES, pas un cycle daté encore
   en route. Le blocage croisé avait sauté là-bas et pas ici — c'est ce qui
   faisait diverger les deux écrans (qualite/cycles-paralleles-cas.js).

     node qualite/cycles-en-cours-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const ath = fs.readFileSync(path.join(R, 'athlete.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };

/* La situation de la capture : des vacances terminées, un cycle à critères en
   route, et un cycle daté qui tourne en même temps. */
const critere = (nom, phases) => ({ nom, mode: 'criteres', phases });
const phase = (nom, n, faits) => ({ id: 'p' + nom, nom,
  criteria: Array.from({ length: n }, (_, i) => 'c' + i),
  checks: Object.fromEntries(Array.from({ length: faits }, (_, i) => [i, { checked: true }])) });
const CYCLES = [
  { nom: 'Vacances', startDate: '2026-07-31', endDate: '2026-08-23' },
  critere('Tendon', [phase('Phase 1', 3, 0), phase('Phase 2', 2, 0)]),
  { nom: 'Endurance de force', startDate: '2026-08-24', endDate: '2026-10-03', color: '#2B5FA6' }
];
const c = vm.createContext({ _cycles: CYCLES });
try {
  vm.runInContext(['_cyclePhases', '_cyclePhaseIsDone', '_cyclePhaseCurrentIndex', '_cycleComputeEndDate',
    '_cycleIsDone', '_cycleIsCurrent', '_cycleCurrentIndex', '_cyclesDuJour', '_cycleDuJour', '_cyclesEnCours']
    .map(fm).join('\n'), c);
} catch (e) { ok('le code se charge', false, e.message); }
const AUJ = new Date('2026-09-26T00:00:00');

console.log('\nLes deux natures répondent ensemble');
let L = [];
try { L = c._cyclesEnCours(AUJ); } catch (e) { ok('_cyclesEnCours tourne', false, e.message); }
ok('le cycle à CRITÈRES et le cycle DATÉ sont tous deux en cours',
   L.map(x => x.cy.nom).join('|') === 'Tendon|Endurance de force', L.map(x => x.cy.nom).join('|'));
ok('… dans l\'ordre de la séquence', L.length === 2 && L[0].i === 1 && L[1].i === 2, JSON.stringify(L.map(x => x.i)));
ok('un cycle terminé n\'y est pas', !L.some(x => x.cy.nom === 'Vacances'));
ok('le cycle daté garde ses bornes', (() => {
  const e = L.find(x => x.cy.nom === 'Endurance de force');
  return e && typeof e.deb.getTime === 'function' && typeof e.fin.getTime === 'function';
})(), JSON.stringify(L.map(x => ({ n: x.cy.nom, deb: x.deb ? String(x.deb).slice(4, 11) : null }))));
ok('… et le cycle à critères n\'en invente pas', (() => {
  const t = L.find(x => x.cy.nom === 'Tendon');
  return t && t.deb === null && t.fin === null;
})(), JSON.stringify(L.find(x => x.cy.nom === 'Tendon')));

console.log('\nLa même règle que l\'espace athlète');
ok('un cycle daté encore en route ne bloque PAS un cycle à critères',
   /cycles\[i\]\.mode !== 'criteres'\) continue/.test(fm('_cycleIsCurrent')), fm('_cycleIsCurrent'));
ok('… exactement comme athlete.html', /mode !== 'criteres'\) continue/.test(ath), 'la règle a divergé');
{
  /* Un cycle daté NON terminé, placé avant un cycle à critères. */
  const c2 = vm.createContext({ _cycles: [
    { nom: 'Daté en route', startDate: '2026-09-01', endDate: '2026-12-31' },
    critere('Tendon', [phase('P1', 2, 0)]) ] });
  vm.runInContext(['_cyclePhases', '_cyclePhaseIsDone', '_cycleComputeEndDate', '_cycleIsDone',
    '_cycleIsCurrent', '_cyclesEnCours'].map(fm).join('\n'), c2);
  ok('les deux voies avancent en parallèle', c2._cyclesEnCours(AUJ).map(x => x.cy.nom).join('|') === 'Daté en route|Tendon',
     c2._cyclesEnCours(AUJ).map(x => x.cy.nom).join('|'));
}
{
  /* Deux cycles à critères : l'ordre interne de la voie tient toujours. */
  const c3 = vm.createContext({ _cycles: [
    critere('Premier', [phase('P1', 2, 0)]), critere('Second', [phase('P1', 2, 0)]) ] });
  vm.runInContext(['_cyclePhases', '_cyclePhaseIsDone', '_cycleComputeEndDate', '_cycleIsDone',
    '_cycleIsCurrent', '_cyclesEnCours'].map(fm).join('\n'), c3);
  ok('un cycle à critères attend le précédent À CRITÈRES',
     c3._cyclesEnCours(AUJ).map(x => x.cy.nom).join('|') === 'Premier', c3._cyclesEnCours(AUJ).map(x => x.cy.nom).join('|'));
}

console.log('\nCe que la carte montre');
{
  const carte = pmain.slice(pmain.indexOf("var h = '';\n  // Le cycle"), pmain.indexOf("pp-carte pp-ech"));
  ok('elle lit _cyclesEnCours, plus les dates seules', /_cyclesEnCours\(/.test(carte) && !/_cyclesDuJour\(/.test(carte),
     carte.slice(0, 260));
  ok('un cycle daté dit sa semaine', /Semaine /.test(carte));
  ok('un cycle à critères dit sa PHASE, pas une semaine inventée', /Phase /.test(carte) && /_cyclePhaseCurrentIndex\(/.test(carte),
     carte.slice(0, 700));
  ok('… et sa barre suit les phases validées', /phases/.test(carte) && /pp-barre/.test(carte));
}

console.log('\nLe planificateur marque tous les cycles en cours');
ok('le badge « EN COURS » ne se limite plus au premier',
   !/idx === _cycleCurrentIndex\(_cycles\)/.test(pmain), (pmain.match(/idx === _cycleCurrentIndex[^;]*/g) || []).join(''));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Cycles : la même réponse partout, critères et dates ensemble.');

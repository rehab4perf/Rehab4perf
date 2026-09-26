#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Barre latérale du Programme — plusieurs cycles en cours, pas un seul

   Demandé par le praticien (2026-09-26) : « il faudrait qu'on puisse
   visionner plusieurs cycles en cours dans l'onglet Programme sur la sidebar ».

   `_cycleDuJour` rend le PREMIER cycle qui couvre la date et s'arrête là. La
   carte n'en montrait donc qu'un — et c'est exactement l'angle mort déjà
   refermé côté athlète : un cycle à critères et un cycle daté peuvent être
   vrais EN MÊME TEMPS (qualite/cycles-paralleles-cas.js). Le praticien voyait
   le premier de sa liste, sans savoir qu'un autre tournait.

   `_cyclesDuJour` les rend TOUS, dans l'ordre de la liste. `_cycleDuJour` reste
   le premier : le ruban du calendrier n'a pas la place d'en empiler plusieurs,
   et cette décision-là n'a pas été prise.

     node qualite/cycles-sidebar-cas.js
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

/* Deux cycles qui se chevauchent — le cas que la carte ne montrait pas. */
const CYCLES = [
  { nom: 'Reprise tendon', startDate: '2026-09-01', endDate: '2026-10-31', color: '#2B5FA6' },
  { nom: 'Bloc de force',  startDate: '2026-09-21', duree: 4,              color: '#D4600A' },
  { nom: 'Terminé en août', startDate: '2026-08-01', endDate: '2026-08-31' },
  { nom: 'Sans date' }
];
const c = vm.createContext({ _cycles: CYCLES });
try { vm.runInContext([ '_cyclesDuJour', '_cycleDuJour' ].map(fm).join('\n'), c); }
catch (e) { ok('le code se charge', false, e.message); }
const AUJ = new Date('2026-09-26T00:00:00');

console.log('\nTous les cycles qui couvrent la date');
let L = [];
try { L = c._cyclesDuJour(AUJ); } catch (e) { ok('_cyclesDuJour tourne', false, e.message); }
ok('les deux cycles parallèles sont rendus', L.length === 2, L.map(x => x.cy.nom).join(' | '));
ok('… dans l\'ordre de la liste', L.map(x => x.cy.nom).join('|') === 'Reprise tendon|Bloc de force', L.map(x => x.cy.nom).join('|'));
ok('un cycle terminé n\'y est pas', !L.some(x => x.cy.nom === 'Terminé en août'));
ok('… ni un cycle sans date de début', !L.some(x => x.cy.nom === 'Sans date'));
/* `instanceof Date` ne traverse pas les realms d'un contexte vm : on vérifie
   ce que la date SAIT FAIRE, pas de quelle fabrique elle vient. */
ok('chacun porte son début, sa fin et son rang',
   L.every(x => typeof x.deb.getTime === 'function' && typeof x.fin.getTime === 'function' && typeof x.i === 'number'),
   JSON.stringify(L.map(x => ({ i: x.i, deb: String(x.deb).slice(4, 15) }))));
ok('une fin calculée par la durée quand endDate manque',
   (L[1] && String(L[1].fin).indexOf('Oct 18') > -1) || (L[1] && L[1].fin > new Date('2026-10-17T00:00:00')),
   String(L[1] && L[1].fin));
ok('aucun cycle : liste vide, jamais null', (() => {
  try { return c._cyclesDuJour(new Date('2027-01-01T00:00:00')).length === 0; } catch (e) { return false; }
})());

console.log('\nLe ruban du calendrier ne change pas');
ok('_cycleDuJour rend toujours le PREMIER', (() => {
  try { const u = c._cycleDuJour(AUJ); return u && u.cy.nom === 'Reprise tendon'; } catch (e) { return false; }
})());
ok('… et il s\'appuie sur la même lecture, pas sur une copie', /_cyclesDuJour\(/.test(fm('_cycleDuJour')), fm('_cycleDuJour'));
ok('le ruban continue de l\'employer', /_cycleDuJour\(d\)/.test(fm('_cycleRubanHtml')), 'le ruban a changé de source');

console.log('\nCe que la carte montre');
{
  const carte = pmain.slice(pmain.indexOf("var h = '';\n  // Le cycle"), pmain.indexOf("pp-carte pp-ech"));
  ok('elle parcourt TOUS les cycles', /_cyclesDuJour\(/.test(carte) && /forEach/.test(carte), carte.slice(0, 300));
  ok('le titre s\'accorde au nombre', /Cycles? en cours/.test(carte) && /length > 1/.test(carte), carte.slice(0, 400));
  ok('chacun garde sa semaine et sa couleur', (carte.match(/pp-barre/g) || []).length >= 1 && /cy\.color/.test(carte));
  ok('aucun cycle : le message reste', /Aucun cycle en cours/.test(carte));
  ok('« + Nouveau cycle » reste le seul accès à la création', /_ppNouveauCycle\(\)/.test(carte));
}
ok('deux cycles ne se collent pas l\'un à l\'autre', /\.pp-cycle\b/.test(html), 'CSS de séparation absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Barre latérale : tous les cycles en cours se lisent, pas seulement le premier.');

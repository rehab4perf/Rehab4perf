#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Barre latérale — cocher les critères sans ouvrir de fenêtre

   Demandé par le praticien (2026-09-26) : « pour les cycles à critères,
   j'aimerais voir les critères dans la sidebar et pouvoir les cocher
   directement. Pour les personnes avec un protocole en cours, avoir le
   protocole en cours dans la sidebar avec les éléments à cocher aussi. »

   Deux mécanismes DISTINCTS, et c'est le piège : les critères d'un CYCLE
   vivent dans `_cycles` (locaux, enregistrés par _saveCyclesToCloud) ; ceux
   d'un PROTOCOLE vivent en base, dans protocol_criteria_checks. On ne les
   fusionne pas — on branche chacun sur sa propre bascule, déjà écrite.

   Seule la phase EN COURS est affichée : lister les phases suivantes ferait
   cocher à l'avance des critères qui n'ont pas encore de sens.

     node qualite/sidebar-criteres-cas.js
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

const ph = (nom, textes, coches) => ({ id: 'p' + nom, nom, criteria: textes,
  checks: Object.fromEntries(textes.map((_, i) => [i, { checked: !!coches[i] }])) });
const TENDON = { id: 'cy1', nom: 'Tendon', mode: 'criteres', startDate: '2026-08-24',
  phases: [ ph('Phase 1', ['Marche sans boiterie', 'Calf raise à 100 %'], [true, false]),
            ph('Phase 2', ['Course 10 min'], [false]) ] };

const c = vm.createContext({ escH: s => String(s || '').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
  escJS: s => String(s || '').replace(/'/g, "\\'"), _cycles: [TENDON], _cycleColors: {} });
try {
  vm.runInContext(['_cyclePhases', '_cyclePhaseIsDone', '_cyclePhaseCurrentIndex',
    '_ppCritereLigneHtml', '_ppCycleCriteresHtml', '_ppProtoHtml'].map(fm).join('\n')
    + '\nvar _ppProto = null;', c);
} catch (e) { ok('le code se charge', false, e.message); }

console.log('\nLes critères du cycle, dans la carte');
let h = '';
try { h = c._ppCycleCriteresHtml(TENDON); } catch (e) { ok('_ppCycleCriteresHtml tourne', false, e.message); }
ok('les deux critères de la phase EN COURS', /Marche sans boiterie/.test(h) && /Calf raise/.test(h), h.slice(0, 200));
ok('… et pas ceux des phases suivantes', !/Course 10 min/.test(h), 'une phase future est cochable');
ok('le critère déjà validé est coché', (h.match(/checked/g) || []).length === 1, (h.match(/checked/g) || []).length + ' cochés');
ok('un clic appelle la bascule des CYCLES, avec sa phase',
   /_cycleToggleCriterion\('cy1',0,0\)/.test(h.replace(/\s/g, '')), (h.match(/_cycleToggleCriterion\([^)]*\)/g) || []).join(' '));
const CH = x => { try { return c._ppCycleCriteresHtml(x); } catch (e) { return 'ERREUR ' + e.message; } };
ok('toutes les phases faites : rien à cocher, et on le dit', (() => {
  const t = CH({ id: 'z', nom: 'Fini', mode: 'criteres', phases: [ph('P1', ['a'], [true])] });
  return /valid/i.test(t) && !/type="checkbox"/.test(t);
})(), CH({ id: 'z', nom: 'F', mode: 'criteres', phases: [ph('P1', ['a'], [true])] }));
ok('un cycle sans critère ne produit rien', CH({ id: 'v', mode: 'criteres', phases: [] }) === '');
ok('un cycle daté non plus', CH({ id: 'd', nom: 'Daté', startDate: '2026-01-01' }) === '');

console.log('\nCocher rafraîchit la carte');
ok('_cycleToggleCriterion redessine la barre latérale', /_renderPanneauPatient\(/.test(fm('_cycleToggleCriterion')),
   'la case reste cochée à l\'ancien état');
ok('… et les vues du planificateur ne cassent pas quand il est fermé',
   /if\(!tl \|\| !tot\) return;/.test(fm('renderCycleTimeline')),
   'renderCycleTimeline écrit dans un élément qu\'il ne vérifie pas');

console.log('\nLe protocole en cours');
{
  const s = fm('_ppProtoHtml');
  ok('la carte existe', !!s, '_ppProtoHtml introuvable');
  ok('rien à afficher sans protocole : pas de carte vide', /return ''/.test(s), s.slice(0, 200));
  ok('elle nomme le protocole ET la phase', /proto\.name|\.nom/.test(s) && /phase/i.test(s));
  ok('les critères passent par la bascule des PROTOCOLES', /_protoCheckboxChange\(|_protoSetCheck\(/.test(s),
     'la mauvaise bascule est employée');
}
ok('la sortie de secours : _protoSetCheck ne perd plus le coche faute de cache',
   /_protoPatientData\[protoId\] = /.test(fm('_protoSetCheck')),
   'un coche depuis la barre latérale est ignoré si le panneau Protocoles n\'a jamais été ouvert');
{
  const l = fm('_ppChargerProto');
  ok('un chargement propre à la barre, sans ouvrir le panneau', !!l && /patient_protocols/.test(l), l.slice(0, 200));
  ok('… rien pour un modèle ou sans patient', /_builderMode === 'template'|!_progPatient/.test(l), l.slice(0, 300));
  ok('… et il redessine quand la réponse arrive', /_renderPanneauPatient\(/.test(l));
  ok('… une réponse pour un AUTRE patient est ignorée', /_ppProto(\.pid|Pid)/.test(l) || /pid !== /.test(l), l.slice(0, 400));
}
/* Vu en ligne le 2026-09-26 : deux critères cochés, la carte annonçait
   « 1 / 4 ». Le compteur ne bougeait qu'au rechargement, parce que rien ne
   redessinait la barre après un coche de PROTOCOLE — et parce que la carte
   lisait SA copie des cases (_ppProto.checks) au lieu du cache partagé que
   _protoSetCheck met à jour. Corriger l'un sans l'autre laisse le décalage :
   redessiner une copie périmée n'affiche rien de neuf. */
console.log('\nLe compteur suit le clic');
ok('_protoSetCheck redessine la barre latérale', /_renderPanneauPatient\(/.test(fm('_protoSetCheck')),
   'le compteur reste sur l\'état d\'avant le clic');
ok('la carte lit le cache PARTAGÉ, pas sa propre copie', (() => {
  const k = vm.createContext({ escH: x => String(x || ''), escJS: x => String(x || ''),
    _protoPatientData: { lca: { checks: { p1: { 0: true, 1: true } } } },
    /* la copie de la carte est restée en arrière : c'est l'état d'après un clic */
    _ppProto: { proto: { id: 'lca', name: 'LCA' }, phase: { id: 'p1', name: 'Phase 1', criteria: ['a', 'b', 'c', 'd'] },
                checks: { p1: { 0: true } } } });
  vm.runInContext([fm('_ppCritereLigneHtml'), fm('_ppProtoHtml')].join('\n'), k);
  const t = k._ppProtoHtml();
  return /2 \/ 4 critères/.test(t) && (t.match(/ checked/g) || []).length === 2;
})(), (() => { const k = vm.createContext({ escH: x => String(x || ''), escJS: x => String(x || ''),
    _protoPatientData: { lca: { checks: { p1: { 0: true, 1: true } } } },
    _ppProto: { proto: { id: 'lca', name: 'LCA' }, phase: { id: 'p1', name: 'Phase 1', criteria: ['a','b','c','d'] }, checks: { p1: { 0: true } } } });
  vm.runInContext([fm('_ppCritereLigneHtml'), fm('_ppProtoHtml')].join('\n'), k);
  return (k._ppProtoHtml().match(/\d+ \/ \d+ critères/) || ['?'])[0]; })());

ok('la carte est posée dans la colonne', /_ppProtoHtml\(\)/.test(fm('_panneauPatientHtml')), 'la carte n\'est pas rendue');
ok('le style des critères existe', /\.pp-crit\b/.test(html), 'CSS absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Barre latérale : les critères se cochent sur place, chacun sur sa propre bascule.');

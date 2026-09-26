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

/* Demande du praticien (2026-09-26) : « une fois tous les critères validés,
   un petit bouton discret pour passer à la phase suivante serait bien ».
   Un cycle à critères bascule SEUL quand sa phase est validée ; un protocole,
   non — c'est une décision clinique, et le praticien la prend. Le bouton
   n'existe donc que lorsqu'il n'y a plus rien à cocher. */
console.log('\nPasser à la phase suivante');
{
  const proto = { id: 'lca', name: 'LCA', phases: [
    { id: 'p1', name: 'Phase 1', exitCriteria: ['a', 'b'] },
    { id: 'p2', name: 'Phase 2 — Renforcement', exitCriteria: ['c'] } ] };
  const carte = (coches, phaseId) => {
    const k = vm.createContext({ escH: x => String(x || ''), escJS: x => String(x || ''),
      _protoPatientData: { lca: { checks: { [phaseId]: coches } } },
      _ppProto: { proto: proto, phase: proto.phases.find(p => p.id === phaseId) } });
    vm.runInContext([fm('_ppCritereLigneHtml'), fm('_ppNomPhase'), fm('_ppProtoHtml')].join('\n'), k);
    return k._ppProtoHtml();
  };
  ok('rien à voir tant qu\'un critère manque', !/_ppPhaseSuivante/.test(carte({ 0: true }, 'p1')),
     'le bouton apparaîtrait sur une phase non terminée');
  const fini = carte({ 0: true, 1: true }, 'p1');
  ok('tous validés : le bouton paraît', /_ppPhaseSuivante\(/.test(fini), fini.slice(-260));
  ok('… et il NOMME la phase où il mène', /Phase 2/.test(fini), fini.slice(-260));
  ok('sur la DERNIÈRE phase, rien à proposer', !/_ppPhaseSuivante/.test(carte({ 0: true }, 'p2')),
     'un bouton qui ne mène nulle part');
  ok('… mais on dit que le protocole est au bout', /derni/i.test(carte({ 0: true }, 'p2')),
     carte({ 0: true }, 'p2').slice(-200));
}
{
  const f = fm('_ppPhaseSuivante');
  ok('la bascule existe', !!f, '_ppPhaseSuivante introuvable');
  ok('elle DEMANDE avant : changer de phase est une décision clinique',
     /r4pConfirmer\(/.test(f), 'un clic suffirait à faire avancer le protocole');
  ok('… et passe par la bascule déjà écrite, qui journalise', /_protoUpdatePhase\(/.test(f),
     'une seconde écriture de phase divergerait de l\'historique');
  /* IL FALLAIT CLIQUER DEUX FOIS (vu par le praticien, 2026-09-26). La
     première version relisait la base juste après avoir lancé le PATCH :
     une course, que la relecture gagnait presque toujours — elle rapportait
     donc l'ANCIENNE phase, et le clic semblait sans effet.

     La carte se met désormais à jour SUR PLACE, sans attendre le réseau :
     les cases de toutes les phases sont déjà en cache (_ppChargerProto lit
     protocol_criteria_checks pour le protocole entier, pas pour une phase),
     il n'y a donc rien à aller chercher. */
  ok('… et NE RELIT PAS la base dans la foulée : c\'est la course qui coûtait un clic',
     !/_ppChargerProto\(/.test(f), 'la relecture double le clic');
  ok('la carte bascule sur place, d\'après le cache',
     /\bphase *= *suiv\b/.test(f) && /_renderPanneauPatient\(/.test(f), f.slice(0, 400));
  ok('… et le cache partagé suit, sinon la fenêtre Protocoles diverge',
     /current_phase_id *=/.test(f), f);
  ok('si l\'écriture échoue, on REVIENT en arrière et on le dit',
     /catch\(/.test(f) && /_showToast\(/.test(f), 'l\'écran annoncerait une phase que la base ignore');
}
/* Pour que l'appelant puisse savoir si l'ecriture a abouti, la bascule doit
   rendre sa promesse. Sans elle, il n'y a aucun moyen de revenir en arriere. */
ok('_protoUpdatePhase rend sa promesse', /return _fetchRetry\(/.test(fm('_protoUpdatePhase')),
   'impossible de savoir si le changement de phase a été écrit');

/* LE CHEMIN INVERSE, signalé par le praticien (2026-09-26) : la phase se
   change aussi depuis la FENÊTRE Protocoles, et la barre latérale gardait
   la sienne — deux endroits annonçaient deux phases différentes du même
   protocole, celui du même patient, sur le même écran.

   La mise à jour appartient à _protoUpdatePhase, pas à ses appelants : c'est
   le point de passage UNIQUE de tout changement de phase. Posée dans le
   bouton de la fenêtre, elle aurait manqué chaque autre chemin. */
console.log('\nLa fenêtre et la barre disent la même phase');
{
  /* On EXÉCUTE _protoUpdatePhase : une attente textuelle passerait au vert sur
     un code désactivé par un `if(false)` — essayé, elle ne voyait rien. */
  const PROTO = { id: 'lca', name: 'LCA', phases: [
    { id: 'p1', name: 'Phase 1' }, { id: 'p2', name: 'Phase 2' }, { id: 'p3', name: 'Phase 3' } ] };
  function majPhase(phaseId, opts) {
    opts = opts || {};
    let rendus = 0;
    const k = vm.createContext({
      SUPA_URL_P: '', _sbHeaders: () => ({}), _showToast: () => {}, renderProtocols: () => {},
      _getAllProtocols: () => [PROTO],
      _protoPatientData: { lca: { pp: { id: 'pp1', current_phase_id: 'p1', history: [] } } },
      _ppProto: opts.ppProto === undefined
        ? { pid: 'x', proto: PROTO, phase: PROTO.phases[0], pp: { id: 'pp1', current_phase_id: 'p1' } }
        : opts.ppProto,
      _renderPanneauPatient: () => { rendus++; },
      _fetchRetry: () => Promise.resolve({ ok: opts.ok !== false, status: opts.ok === false ? 500 : 204 })
    });
    vm.runInContext(fm('_protoUpdatePhase'), k);
    return k._protoUpdatePhase('lca', phaseId)
      .catch(() => {})
      .then(() => ({ phase: k._ppProto && k._ppProto.phase, pp: k._ppProto && k._ppProto.pp, rendus }));
  }
  return majPhase('p3').then(r => {
    ok('la barre suit le changement fait depuis la fenêtre',
       r.phase && r.phase.id === 'p3', JSON.stringify(r.phase));
    ok('… et redessine', r.rendus === 1, r.rendus + ' rendu(s)');
    ok('… la ligne du patient suit aussi', r.pp && r.pp.current_phase_id === 'p3', JSON.stringify(r.pp));
    return majPhase(null);
  }).then(r => {
    /* Une phase remise à null, c'est un protocole qu'on sort de sa phase : la
       carte ne peut plus montrer de critères, et garder les anciens serait
       pire que de ne rien montrer. */
    ok('une phase vidée vide aussi la carte', r.phase === null, JSON.stringify(r.phase));
    return majPhase('p3', { ok: false });
  }).then(r => {
    ok('écriture en échec : la barre ne bouge pas',
       r.phase && r.phase.id === 'p1' && r.rendus === 0,
       'la barre annoncerait une phase que la base ignore');
    return majPhase('p3', { ppProto: { pid: 'x', proto: { id: 'autre', phases: [] }, phase: { id: 'z' } } });
  }).then(r => {
    ok('un AUTRE protocole ne la touche pas', r.phase && r.phase.id === 'z' && r.rendus === 0,
       'la barre suivrait le changement d\'un protocole qu\'elle n\'affiche pas');
    return suite();
  });
}
function suite() {
/* Même famille : ASSIGNER un protocole depuis la fenêtre. La barre garde en
   mémoire « ce patient n'a pas de protocole » (_ppProto = {pid}) et ne
   rechargerait jamais — la carte ne serait apparue qu'au prochain changement
   de patient. Ici on RELIT, contrairement au changement de phase : la barre
   n'a pas la ligne `patient_protocols` qui vient d'être créée. */
{
  const a = fm('_protoAssign') || fm('assignProtocol') || fm('_protoAssignToPatient');
  ok('assigner un protocole fait apparaître la carte',
     !!a && /_ppProto = null/.test(a) && /_ppChargerProto\(/.test(a),
     a ? a.slice(-500) : 'fonction d\'assignation introuvable');
  const d = fm('_protoUnassign');
  ok('… et la désassignation la fait disparaître',
     /_ppProto = null/.test(d) && /_ppChargerProto\(/.test(d),
     'la carte resterait sur un protocole que le patient n\'a plus');
}

ok('la carte est posée dans la colonne', /_ppProtoHtml\(\)/.test(fm('_panneauPatientHtml')), 'la carte n\'est pas rendue');
ok('le style des critères existe', /\.pp-crit\b/.test(html), 'CSS absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Barre latérale : les critères se cochent sur place, chacun sur sa propre bascule.');
}

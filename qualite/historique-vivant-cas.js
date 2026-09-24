#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — la ligne « Dernière séance » suit ce qu'on compose

   Demandé par le praticien (2026-09-15) : « la mise à jour se fait un peu
   lentement : quand je modifie mon exercice, cette ligne reste tant que je
   n'ai pas enregistré, quitté le builder et rouvert ».

   Trois figements, trois corrections :
     1. changer d'exercice ne changeait pas la ligne — updateExoName ne
        touchait que le nom en mémoire ;
     2. la ligne ne disait rien de ce qu'on prescrit : son écart comparait les
        DEUX séances précédentes. Dès qu'une charge est posée (cible kg, ou
        %1RM), elle compare CETTE séance à la dernière : « → aujourd'hui 1RM
        est. 99,3 kg ↗ +7 % » ; au poids du corps, les répétitions ;
     3. l'historique n'était chargé qu'une fois par patient : une séance
        enregistrée n'y entrait qu'au changement de patient. Il se recharge à
        chaque ouverture du builder (l'ancien reste affiché en attendant).
   Tout se recalcule EN PLACE : redessiner la séance ferait perdre la saisie.
   « Aujourd'hui » se lit comme l'historique et Évolution (_extractExoLoads) :
   même charge, mêmes répétitions, même _1rm.

     node qualite/historique-vivant-cas.js
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
const fd = fnDe(pdata), fm = fnDe(pmain);

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const kg = (n, reps, series, charge) => ({ name: n, reps: String(reps), series: String(series), cibles: charge ? [{ type: 'kg', min: String(charge), max: '' }] : [] });
const SEANCES = [
  prog('2026-08-31', [kg('Back squat', 8, 4, 70), kg('Pistol squat box', 8, 3)]),
  prog('2026-09-07', [kg('Back Squat', 8, 4, 75), kg('Pistol squat box', 10, 3)])
];
const c = vm.createContext({
  _builderDate: '2026-09-14', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
  _pevoAujourdhuiIso: () => '2026-09-13',
  escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
});
try {
  vm.runInContext(['_nbFr', '_norm', '_cleExo', '_repsUnite', '_1rm', '_extractExoLoads', '_rm1Ref', '_histExoCourant', '_histExoHtml'].map(fd).join('\n')
    + '\nvar _histExos = { pid:"x", map:null, enCours:false };', c);
  c._histExos.map = c._extractExoLoads(SEANCES, 1);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
const ligne = (nom, e) => { try { return c._histExoHtml(nom, e).replace(/<[^>]+>/g, ''); } catch (x) { return 'ERREUR ' + x.message; } };
const exo = (n, reps, cibles) => ({ name: n, reps: String(reps), series: '4', cibles: cibles || [] });

console.log('\nCette séance, contre la dernière');
const l80 = ligne('Back squat', exo('Back squat', 8, [{ type: 'kg', min: '80', max: '' }]));
/* Un écart de CHARGE se dit en POURCENTAGE depuis le 2026-09-20
   (qualite/historique-pourcent-cas.js). Le kilo reste écrit juste avant. */
ok('en charge : le 1RM de CETTE séance et son écart à la dernière', /1RM est\. 93,1 kg → aujourd’hui 1RM est\. 99,3 kg ↗ \+7 %$/.test(l80), l80);
const l75 = ligne('Back squat', exo('Back squat', 8, [{ type: 'kg', min: '75', max: '' }]));
ok('même charge : dit « même charge », pas une fausse flèche', /→ aujourd’hui : même charge$/.test(l75), l75);
const lpc = ligne('Back squat', exo('Back squat', 8, [{ type: '%1RM', min: '80', max: '' }]));
ok('une cible %1RM donne sa charge (≈ 74,5 kg à 8 reps : 1RM ≈ 92,5)', /→ aujourd’hui 1RM est\. 92,5 kg ↘ −1 %$/.test(lpc), lpc);
const lbw = ligne('Pistol squat box', exo('Pistol squat box', 12));
ok('au poids du corps : les répétitions', /→ aujourd’hui 12 reps ↗ \+2 reps$/.test(lbw), lbw);

console.log('\nSans prescription : la ligne d\'avant');
ok('répétitions vides : l\'écart entre les deux séances précédentes, inchangé', ligne('Pistol squat box', exo('Pistol squat box', '')) === 'Dernière séance (7 sept.) : 3 × 10 poids du corps ↗ +2 reps', ligne('Pistol squat box', exo('Pistol squat box', '')));
/* Changé le 2026-09-15 (historique-mode-cas) : une charge posée se compare à la
   dernière séance chargée ; s'il n'y en a pas, la ligne le dit. */
ok('une première charge sur un exercice fait au poids du corps : dite « première charge »', ligne('Pistol squat box', exo('Pistol squat box', 10, [{ type: 'kg', min: '10', max: '' }])) === 'Dernière séance (7 sept.) : 3 × 10 poids du corps → aujourd’hui 1RM est. 13,3 kg (première charge)', ligne('Pistol squat box', exo('Pistol squat box', 10, [{ type: 'kg', min: '10', max: '' }])));
ok('sans exercice passé (appel d\'avant) : identique', ligne('Back squat') === 'Dernière séance (7 sept.) : 4 × 8 à 75 kg · 1RM est. 93,1 kg ↗ +7 %' || /Dernière séance \(7 sept\.\) : 4 × 8 à 75 kg · 1RM est\. 93,1 kg ↗ \+/.test(ligne('Back squat')), ligne('Back squat'));

console.log('\nEn place, à la frappe');
const rs = fd('renderSession');
ok('la ligne connaît son exercice (data-exo) et ce qu\'on y prescrit', /html \+= '<div class="exo-hist" data-hist="' \+ escH\(e\.name\|\|''\) \+ '" data-exo="' \+ b\.id \+ '\|' \+ e\.id \+ '">' \+ _histExoHtml\(e\.name, e\) \+ '<\/div>';/.test(rs));
ok('changer d\'exercice la recalcule', /_histExoMaj\(blocId, exoId\)/.test(fd('updateExoName')));
ok('changer les répétitions aussi', /_histExoMaj\(blocId, exoId\)/.test(fd('updateField')) && /field === 'reps'/.test(fd('updateField')));
ok('changer une cible aussi (kg ou %1RM)', /_histExoMaj\(blocId, exoId\)/.test(fd('updateCible')));
const mj = fd('_histExoMaj');
ok('… sans redessiner la séance : la ligne et ses poids, en place', /\.exo-hist\[data-exo="/.test(mj) && /setAttribute\('data-hist'/.test(mj) && /_cibleKgMaj\(/.test(mj) && !/renderSession/.test(mj));
ok('l\'arrivée de l\'historique remplit avec l\'exercice', /data-exo/.test(fd('_histExosRemplir')) && /_histExoHtml\(el\.getAttribute\('data-hist'\), e\)/.test(fd('_histExosRemplir')));

console.log('\nUne séance enregistrée entre dans l\'historique');
ok('l\'historique se recharge à chaque ouverture du builder', /_histExosCharger\(!_dejaOuvert\)/.test(fm('_enterBuilderMode')));
const ch = fd('_histExosCharger');
ok('… l\'ancien reste affiché pendant le chargement (pas de clignotement)', /function _histExosCharger\(forcer\)/.test(ch) && /if\(!forcer && _histExos\.pid === pid/.test(ch) && /map:\s*\(_histExos\.pid === pid \? _histExos\.map : null\)/.test(ch));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : la dernière séance, comparée à ce qu\'on compose, à la frappe.');

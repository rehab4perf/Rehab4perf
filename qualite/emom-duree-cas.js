#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — taper la durée d'un EMOM ne fait plus sortir du champ

   Constaté par le praticien : dans un bloc EMOM, au PREMIER chiffre tapé dans
   « Durée totale », le curseur quittait le champ.

   Cause : `updateChronoField` appelait `renderSession()` à CHAQUE frappe pour
   `dureeTotale` et `intervalle` — le temps de remettre à jour la ligne
   « N intervalles — chaque exercice revient X fois ». Redessiner la séance
   remplace tous les champs par des neufs : celui qu'on tapait disparaissait,
   et le focus avec lui. « Intervalle » avait le même défaut.

   La ligne de résumé se met désormais à jour SUR PLACE, dans son propre
   conteneur, et la séance n'est plus redessinée pendant la frappe.

   Exécute les VRAIES `updateChronoField` et `_renderChronoBloc`.

     node qualite/emom-duree-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = nom => { const d = src.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };

function banc() {
  const els = {};
  let rendus = 0, brouillons = 0;
  const bloc = { id: 'E1', type: 'emom', title: 'EMOM', dureeTotale: '10', intervalle: '1', commentaire: '',
                 exos: [{ id: 'x1', name: 'Burpees' }, { id: 'x2', name: 'Squat' }] };
  const vide = { id: 'E2', type: 'emom', title: 'EMOM', dureeTotale: '10', intervalle: '1', exos: [] };
  const amrap = { id: 'A1', type: 'amrap', title: 'AMRAP', duree: '12', exos: [] };
  const document = { getElementById: id => els[id] || (els[id] = { id, innerHTML: '', textContent: '', hidden: false, _vu: true }) };
  const code = ['_emomTours', '_emomResumeHtml', 'updateChronoField', '_renderChronoExos', '_renderChronoBloc'].map(fn).join('\n');
  const api = new Function('document', 'blocs', 'escH', 'renderSession', '_draftSaveLazy', 'activeBloc',
    '_estPremierDuGroupe', '_estDernierDuGroupe', '_selectEtape', '_ytThumbHtml',
    code + '\nreturn { maj: updateChronoField, rendu: _renderChronoBloc };')(
    document, [bloc, vide, amrap], s => String(s == null ? '' : s),
    () => { rendus++; }, () => { brouillons++; }, null,
    () => true, () => true, () => '', () => null);
  return { api, bloc, vide, amrap, els, rendus: () => rendus, brouillons: () => brouillons };
}

console.log('\nTaper dans « Durée totale » ou « Intervalle » ne redessine plus la séance');
let b = banc();
b.api.maj('E1', 'dureeTotale', '1');
ok('premier chiffre de la durée : la séance n\'est PAS redessinée', b.rendus() === 0, b.rendus() + ' rendu(s)');
ok('… la valeur est prise', b.bloc.dureeTotale === '1');
ok('… et le brouillon est enregistré', b.brouillons() >= 1);
b.api.maj('E1', 'dureeTotale', '12');
const res = b.els['emom-resume-E1'] || {};
ok('le résumé se met à jour SUR PLACE', /12 intervalles/.test(res.innerHTML || res.textContent || ''), JSON.stringify(res.innerHTML || res.textContent));
ok('… avec le bon nombre de passages (12 / 2 exercices = 6)', /revient 6 fois/.test(res.innerHTML || ''), res.innerHTML);
b.api.maj('E1', 'intervalle', '2');
ok('l\'intervalle non plus ne redessine pas', b.rendus() === 0, b.rendus() + ' rendu(s)');
ok('… et recalcule le résumé (12 / 2 = 6 intervalles)', /6 intervalles/.test((b.els['emom-resume-E1'] || {}).innerHTML || ''), (b.els['emom-resume-E1'] || {}).innerHTML);
b.api.maj('E1', 'commentaire', 'x');
ok('les autres champs ne redessinent pas non plus', b.rendus() === 0);

console.log('\nLe bloc porte le conteneur que la frappe met à jour');
b = banc();
let h = b.api.rendu(b.bloc, 0);
ok('un EMOM avec exercices a son résumé, identifié', /id="emom-resume-E1"/.test(h) && /10 intervalles/.test(h), (h.match(/<div class="chrono-resume"[^>]*>[^<]*/) || ['absent'])[0]);
h = b.api.rendu(b.vide, 1);
ok('un EMOM sans exercice a son conteneur, vide et masqué', /id="emom-resume-E2"[^>]*hidden/.test(h) || /hidden[^>]*id="emom-resume-E2"/.test(h),
  (h.match(/<div[^>]*emom-resume-E2[^>]*>/) || ['absent'])[0]);
h = b.api.rendu(b.amrap, 2);
ok('un AMRAP n\'en a pas', !/emom-resume/.test(h));
ok('les deux champs de l\'EMOM passent par updateChronoField',
  /updateChronoField\('E1','dureeTotale'/.test(b.api.rendu(b.bloc, 0).replace(/\\'/g, "'")) && /updateChronoField\('E1','intervalle'/.test(b.api.rendu(b.bloc, 0).replace(/\\'/g, "'")));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('EMOM : la durée se tape sans quitter le champ.');

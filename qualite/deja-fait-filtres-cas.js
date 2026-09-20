#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   « Déjà fait » — les filtres objectif / articulation s'y appliquent

   Demandé par le praticien (2026-09-20) : « dans la colonne "déjà fait" du
   builder, serait-ce possible d'y appliquer les filtres ? »

   Mesuré sur la démo avant d'écrire : 11 des 13 exercices déjà prescrits
   retrouvent leur entrée de bibliothèque, donc leur objectif et leur
   articulation. Le filtre a donc de quoi mordre.

   Les DEUX autres sont ceux tapés à la main — précisément ceux que ce filtre
   existe pour retrouver. Ils ne portent ni objectif ni articulation : un
   filtre actif ne peut pas les garder. Ils ne disparaissent donc pas en
   silence, leur nombre est DIT sous la liste.

   Le prédicat de filtrage n'est pas recopié : `_libFiltreOk` est extrait de
   renderLib et les deux listes s'en servent. Deux copies dériveraient, et
   « Déjà fait » se mettrait à filtrer autrement que la bibliothèque.

     node qualite/deja-fait-filtres-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fd = n => { const d = pdata.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };

/* Une bibliothèque réduite, mais de la même forme que la vraie. */
const LIB = [
  { id: 'g1', name: 'Chaise 1 jambe isométrique', type: 'renfo', zone: 'GENOU', patterns: ['Triple flexion'], url: 'https://youtu.be/LIBaaaaaaaa' },
  { id: 'h1', name: 'Clamshell (couché latéral)', type: 'renfo', zone: 'HANCHE', patterns: [] },
  { id: 'c1', name: 'Dorsiflexion de cheville contre mur', type: 'warmup', zone: 'CHEVILLE', patterns: [] },
  { id: 'r1', name: 'Exercice renommé depuis', type: 'renfo', zone: 'HANCHE', patterns: [] }
];
const FAITS = [
  { cle: 'chaise 1 jambe isometrique', label: 'Chaise 1 jambe isométrique', date: '2026-09-08', libId: null },
  { cle: 'clamshell (couche lateral)', label: 'Clamshell (couché latéral)', date: '2026-09-08', libId: 'h1' },
  { cle: 'dorsiflexion de cheville contre mur', label: 'Dorsiflexion de cheville contre mur', date: '2026-09-08', libId: null },
  { cle: 'double leg landing', label: 'Double leg landing', date: '2026-09-08', libId: null, url: 'https://youtu.be/MANbbbbbbbb' },
  { cle: 'exercice sans video', label: 'Exercice sans video', date: '2026-09-08', libId: null, url: '' },
  { cle: 'ancien nom de l exercice', label: 'Ancien nom de l exercice', date: '2026-09-08', libId: 'r1' }
];
function banc() {
  const el = { searchInput: { value: '' }, filterType: { value: '' }, filterSub: { value: '' }, filterSub2: { value: '' } };
  const ctx = vm.createContext({
    LIBRARY: LIB, blocs: [], _progPatient: { id: 'p1' }, _builderMode: 'seance',
    _histExos: { pid: 'p1', faits: FAITS },
    escH: s => String(s || ''), escJS: s => String(s || ''), _isTouchDevice: false,
    getTypeClass: t => String(t || ''), getTypeLabel: t => ({renfo:'Renforcement', warmup:'Warm-up / Mobilité'}[t] || String(t || '')),
    document: { getElementById: id => el[id] || null }
  });
  try {
    vm.runInContext(['_norm', '_cleExo', '_dateCourteFr', '_ytId', '_ytThumbHtml', '_libFiltreOk', '_dejaFaitLibDe', '_dejaFaitHtml'].map(fd).join('\n'), ctx);
  } catch (e) { ok('le code se charge', false, e.message); }
  return ctx;
}
const c = banc();
const H = (q, t, s1, s2) => { try { return c._dejaFaitHtml(q, t, s1, s2); } catch (e) { return 'ERREUR ' + e.message; } };
const noms = h => (String(h).match(/class="lib-item-name">([^<]*)</g) || []).map(x => x.replace(/.*name">/, '').replace(/<$/, ''));

console.log('\nUn seul prédicat, pas deux');
ok('_libFiltreOk existe', !!fd('_libFiltreOk'), 'absent');
ok('… renderLib s\'en sert', /_libFiltreOk\(/.test(fd('renderLib')), 'renderLib garde sa copie');
ok('… et « Déjà fait » aussi', /_libFiltreOk\(/.test(fd('_dejaFaitHtml')), '_dejaFaitHtml garde sa copie');

console.log('\nLes filtres mordent sur la liste');
ok('sans filtre, tout est là — manuscrits compris', noms(H('')).length === 6 && noms(H('')).indexOf('Double leg landing') > -1, noms(H('')).join(' | '));
ok('objectif « renfo » : les warmup sortent', (() => {
  const n = noms(H('', 'renfo'));
  return n.indexOf('Dorsiflexion de cheville contre mur') === -1 && n.indexOf('Chaise 1 jambe isométrique') > -1;
})(), noms(H('', 'renfo')).join(' | '));
ok('articulation HANCHE : le genou sort', (() => {
  const n = noms(H('', '', 'HANCHE'));
  return n.indexOf('Clamshell (couché latéral)') > -1 && n.indexOf('Chaise 1 jambe isométrique') === -1;
})(), noms(H('', '', 'HANCHE')).join(' | '));
ok('les deux ensemble se cumulent', noms(H('', 'renfo', '', 'GENOU')).join('|') === 'Chaise 1 jambe isométrique', noms(H('', 'renfo', '', 'GENOU')).join(' | '));
ok('la recherche reste sur le nom TAPÉ, pas sur celui du catalogue',
   noms(H('ancien nom')).join('|') === 'Ancien nom de l exercice', noms(H('ancien nom')).join(' | '));

console.log('\nL\'identifiant prime sur le nom');
ok('un exercice renommé depuis garde son entrée', (() => {
  const n = noms(H('', 'renfo', '', ''));
  return n.indexOf('Ancien nom de l exercice') > -1;
})(), noms(H('', 'renfo')).join(' | '));

console.log('\nCe qu\'un filtre ne peut pas garder se DIT');
{
  const h = H('', 'renfo');
  ok('un manuscrit sort sous un filtre', noms(h).indexOf('Double leg landing') === -1);
  ok('… mais leur nombre est écrit sous la liste', /tap[ée]s? à la main/i.test(h) && /\b2\b/.test(h), h.slice(-260));
  ok('… et rien n\'est dit quand aucun filtre n\'est actif', !/tap[ée]s? à la main/i.test(H('')));
  /* La note ne parle que de ce que CE filtre écarte : si la recherche a déjà
     retiré le manuscrit, il n'y a rien à signaler. */
  ok('… ni quand le filtre n\'écarte aucun manuscrit', !/tap[ée]s? à la main/i.test(H('clamshell', 'renfo')), H('clamshell', 'renfo').slice(-200));
}

console.log('\nLa vignette de la vidéo');
{
  const h = H('');
  ok('celle de la BIBLIOTHÈQUE quand l\'exercice y est', h.indexOf('LIBaaaaaaaa') > -1, 'vignette absente');
  ok('celle de la SÉANCE pour un exercice tapé à la main', h.indexOf('MANbbbbbbbb') > -1, 'un manuscrit peut porter une vidéo');
  ok('rien quand il n\'y a pas de vidéo — pas de cadre vide', (h.match(/yt-thumb-wrap/g) || []).length === 2,
     (h.match(/yt-thumb-wrap/g) || []).length + ' vignettes pour 6 exercices');
  ok('l\'aperçu au survol ne s\'arme que sur une entrée de bibliothèque',
     (h.match(/_showLibPreviewDelayed/g) || []).length === 4, (h.match(/_showLibPreviewDelayed/g) || []).length + ' aperçus');
}

console.log('\nLe filtre reste allumé quand on choisit un objectif');
ok('choisir un objectif ne sort plus de « Déjà fait »', !/_dejaFaitFilter = false/.test(fd('applyFilters')), 'applyFilters l\'éteint encore');
ok('… et renderLib lui passe les filtres', /_dejaFaitHtml\(q, typeFilter, subFilter, subFilter2\)/.test(fd('renderLib')), fd('renderLib').slice(0, 700));
ok('… résolus AVANT le renvoi anticipé, sinon les menus seraient ignorés', (() => {
  const s = fd('renderLib');
  return s.indexOf('typeFilter  = typeFilter') < s.indexOf('if(_dejaFaitFilter)');
})(), 'le renvoi passe avant la résolution des menus');
ok('« Tous » les éteint toujours tous', /_dejaFaitFilter = false/.test(fd('setFilterAll')));

console.log('\nL\'objectif se lit sur chaque carte');
ok('la pastille d\'objectif accompagne la date', /lib-tag/.test(H('')) && /getTypeLabel\(/.test(fd('_dejaFaitHtml')), H('').slice(0, 300));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('« Déjà fait » : les filtres s\'y appliquent, et ce qu\'ils écartent se dit.');

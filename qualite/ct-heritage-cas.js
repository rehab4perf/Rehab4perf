#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Tests personnalisés — la valeur du bilan précédent en gris, comme partout

   Dans un bilan de suivi, chaque champ non retesté montre l'ancienne valeur en
   gris italique : un placeholder, jamais enregistré, effacé à la première
   frappe (`_blShowInheritedHints`, voir qualite/valeur-heritee-cas.js).

   LES TESTS PERSONNALISÉS EN ÉTAIENT PRIVÉS. La marque vise les champs par
   leur `id` ; eux vivent dans un JSON (`ct-data-<page>`) et leurs champs,
   rendus par `_ctRender`, n'ont pas d'id. Le suivi reportait bien les NOMS
   — avec des valeurs vides — et rien d'autre : le praticien voyait « Squat
   jump » sans savoir d'où il partait.

   La valeur héritée se range désormais par page et par NOM de test
   (`_ctPoserHeritage`, appelé par `_blShowInheritedHints` : suivi et
   « Modifier » passent tous deux par là), et `_ctRender` la pose à CHAQUE
   rendu. Elle survit donc à tout re-rendu — ajout d'un test, changement de
   type, changement de côté — là où une marque posée une fois disparaîtrait.

   Exécute le VRAI module des tests personnalisés et la VRAIE
   `_blShowInheritedHints` sur un DOM minimal.

     node qualite/ct-heritage-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* ── Le module, borné à son IIFE ─────────────────────────────────────────── */
const d0 = src.indexOf('TESTS PERSONNALISÉS — section en bas de chaque page clinique');
const d1 = src.indexOf('(function(){', d0);
const f1 = src.indexOf("window.addEventListener('load', _ctInit);\n})();", d1);
if (d0 < 0 || d1 < 0 || f1 < 0) { console.error('Bornes du module des tests personnalisés introuvables.'); process.exit(1); }
const moduleCt = src.slice(d1, f1 + "window.addEventListener('load', _ctInit);\n})();".length);

/* ── Un DOM minimal : ce que le module touche, rien de plus ──────────────── */
function El(tag) {
  const cl = [];
  this.tagName = String(tag).toUpperCase(); this.children = []; this.style = {}; this.dataset = {};
  this.value = ''; this.placeholder = ''; this._html = ''; this._ecoute = {};
  this.classList = {
    add: (...c) => c.forEach(x => { if (!cl.includes(x)) cl.push(x); }),
    remove: (...c) => c.forEach(x => { const i = cl.indexOf(x); if (i >= 0) cl.splice(i, 1); }),
    contains: c => cl.includes(c), _l: cl
  };
}
El.prototype.appendChild = function (n) { this.children.push(n); return n; };
El.prototype.setAttribute = function (k, v) { this['@' + k] = v; };
El.prototype.addEventListener = function (t, fn) { (this._ecoute[t] = this._ecoute[t] || []).push(fn); };
El.prototype.removeEventListener = function () {};
El.prototype.removeAttribute = function () {};
Object.defineProperty(El.prototype, 'innerHTML', {
  get() { return this._html; },
  set(v) { this._html = v; if (v === '') this.children = []; }
});
Object.defineProperty(El.prototype, 'style', { get() { return this._s || (this._s = {}); }, set(v) { this._s = v; } });
El.prototype.querySelector = function () { return null; };
El.prototype.querySelectorAll = function () { return []; };

function banc() {
  const els = {};
  const conteneur = new El('div'), cache = new El('input');
  cache.id = 'ct-data-genou'; cache.value = '[]';
  els['ct-rows-genou'] = conteneur; els['ct-data-genou'] = cache;
  const document = {
    getElementById: id => els[id] || null,
    createElement: t => new El(t),
    querySelector: () => null, querySelectorAll: () => ({ forEach() {} })
  };
  const window = { addEventListener() {} };
  new Function('window', 'document', '_painZones', 'asymTxt', '_bilanModified',
    moduleCt)(window, document, [{ zone: 'genou', cote: 'DROIT' }], l => Math.round(100 - l) + '%', false);
  return { window, cache, conteneur };
}

/* Le bilan précédent : deux tests, dont un de performance, avec observations. */
const PREC = {
  'ct-data-genou': JSON.stringify([
    { name: 'Squat jump', type: 'comparison', valA: '28', valB: '34', obsA: 'réception raide', obsB: '' },
    { name: 'Chaise', type: 'perf', valA: '95', valB: '', obsA: 'tremblements' },
    { name: 'Jamais mesuré', type: 'comparison', valA: '', valB: '' }
  ])
};
/* Ce que le suivi met dans le champ caché : les NOMS, valeurs vides. */
const NOMS = JSON.stringify([
  { name: 'Squat jump', type: 'comparison', valA: '', valB: '' },
  { name: 'Chaise', type: 'perf', valA: '', valB: '' },
  { name: 'Jamais mesuré', type: 'comparison', valA: '', valB: '' }
]);

/* Les champs chiffrés d'une rangée, lus dans le HTML émis. */
function champs(rang) {
  return [...rang.innerHTML.matchAll(/<input class="ct-val-inp[^"]*"[^>]*>/g)].map(m => {
    const t = m[0], a = n => { const x = t.match(new RegExp(n + '="([^"]*)"')); return x ? x[1] : ''; };
    const cle = (t.match(/_ctUpdate\([^,]+,\d+,'(val[AB])'/) || [])[1];
    return { cle, classe: a('class'), placeholder: a('placeholder'), value: a('value'), oninput: a('oninput') };
  });
}
const parCle = (rang, cle) => champs(rang).find(c => c.cle === cle) || {};

console.log('\nUn bilan de suivi : les tests reportés portent l\'ancienne valeur en gris');
let b = banc();
ok('le module expose de quoi poser l\'héritage', typeof b.window._ctPoserHeritage === 'function');
b.cache.value = NOMS; b.window._ctRestoreAll();
try { b.window._ctPoserHeritage(PREC); } catch (e) { ok('_ctPoserHeritage s\'exécute', false, e.message); }
let rangs = b.conteneur.children.filter(c => /ct-row/.test(c.className || ''));
const sj = rangs.find(r => /Squat jump/.test(r.innerHTML)), ch = rangs.find(r => /Chaise/.test(r.innerHTML)),
      jm = rangs.find(r => /Jamais mesuré/.test(r.innerHTML));
ok('trois rangées rendues', rangs.length === 3, String(rangs.length));
let c = parCle(sj || { innerHTML: '' }, 'valA');
ok('Squat jump, côté atteint : « 28 » en placeholder', c.placeholder === '28', JSON.stringify(c));
ok('… marqué comme valeur héritée', /\bbl-inherited-ghost\b/.test(c.classe || ''), c.classe);
ok('… et JAMAIS en valeur (rien ne s\'enregistre)', c.value === '', c.value);
c = parCle(sj || { innerHTML: '' }, 'valB');
ok('Squat jump, côté sain : « 34 »', c.placeholder === '34' && /bl-inherited-ghost/.test(c.classe || ''), JSON.stringify(c));
c = parCle(ch || { innerHTML: '' }, 'valA');
ok('Chaise (performance) : « 95 »', c.placeholder === '95' && /bl-inherited-ghost/.test(c.classe || ''), JSON.stringify(c));
c = parCle(jm || { innerHTML: '' }, 'valA');
ok('un test jamais mesuré garde son tiret, sans marque', c.placeholder === '—' && !/bl-inherited-ghost/.test(c.classe || ''), JSON.stringify(c));
c = parCle(sj || { innerHTML: '' }, 'valA');
ok('la première frappe retire la marque', /classList\.remove\('bl-inherited-ghost'\)/.test(c.oninput || ''), c.oninput);

/* Les observations : des textarea créés à la main, lus sur l'objet. */
const zones = b.conteneur.children.filter(c => !/ct-row|ct-sub-hdr/.test(c.className || ''));
const tas = [];
zones.forEach(z => z.children.forEach(k => { if (k.tagName === 'TEXTAREA') tas.push(k); else (k.children || []).forEach(t => { if (t.tagName === 'TEXTAREA') tas.push(t); }); }));
const obsSJ = tas.find(t => t.placeholder === 'réception raide');
ok('l\'observation héritée s\'affiche en gris dans sa zone', !!obsSJ && obsSJ.classList.contains('bl-inherited-ghost'), tas.map(t => t.placeholder).join(' | '));
ok('… jamais en valeur', !!obsSJ && obsSJ.value === '');
ok('… et part à la première frappe', !!obsSJ && (obsSJ._ecoute.input || []).length >= 2);

console.log('\nElle survit aux re-rendus — et ne ressuscite jamais sur un autre patient');
b.window._ctAdd('genou', 'comparison');
rangs = b.conteneur.children.filter(c => /ct-row/.test(c.className || ''));
c = parCle(rangs.find(r => /Squat jump/.test(r.innerHTML)) || { innerHTML: '' }, 'valA');
ok('ajouter un test ne fait pas perdre l\'ombre des autres', c.placeholder === '28', JSON.stringify(c));
b.window._ctUpdate('genou', 0, 'valA', '31'); b.window._ctRefreshLabels();
rangs = b.conteneur.children.filter(c => /ct-row/.test(c.className || ''));
c = parCle(rangs.find(r => /Squat jump/.test(r.innerHTML)) || { innerHTML: '' }, 'valA');
ok('une valeur saisie s\'affiche EN VALEUR, sans marque', c.value === '31' && !/bl-inherited-ghost/.test(c.classe || ''), JSON.stringify(c));
b.window._ctResetAll(); b.cache.value = NOMS; b.window._ctRestoreAll();
rangs = b.conteneur.children.filter(c => /ct-row/.test(c.className || ''));
c = parCle(rangs.find(r => /Squat jump/.test(r.innerHTML)) || { innerHTML: '' }, 'valA');
ok('changement de patient : l\'héritage du précédent est oublié', !/bl-inherited-ghost/.test(c.classe || '') && c.placeholder === '—', JSON.stringify(c));

/* ── La fusion des bilans : c'est ELLE qui fournit l'héritage en vrai ───────
   Le suivi ne passe pas `PREC` tel quel : il passe `_prevMergedFrom`, qui
   repose sur `_buildMergedDonnees`. Celle-ci reconstruisait chaque test
   personnalisé à partir de son nom, de ses valeurs et de son type — et JETAIT
   les observations. Constaté en ligne : les valeurs grisées s'affichaient,
   les observations jamais. La même fusion alimente la vue en lecture : les
   observations y disparaissaient aussi, y compris du bilan qui les porte. */
console.log('\nLa fusion des bilans garde les observations');
const m0 = src.indexOf('function _buildMergedDonnees(');
const m1 = src.indexOf('\n}\n', m0);
const fusion = new Function('window', src.slice(m0, m1 + 2) + '; return _buildMergedDonnees;')({ _CT_PAGES: ['genou'] });
const ancien = { donnees: { 'ct-data-genou': JSON.stringify([
  { name: 'Squat jump', type: 'comparison', valA: '28', valB: '34', obsA: 'réception raide', obsB: 'RAS' }]) } };
const recent = { donnees: { 'ct-data-genou': JSON.stringify([
  { name: 'Squat jump', type: 'comparison', valA: '30', valB: '', obsA: '', obsB: '' }]) } };
const lu = m => { try { return JSON.parse(m['ct-data-genou'])[0] || {}; } catch (e) { return {}; } };
let t = lu(fusion([recent, ancien]));   // du plus récent au plus ancien, comme _allBilans
ok('deux bilans : la valeur la plus récente l\'emporte', t.valA === '30' && t.valB === '34', JSON.stringify(t));
ok('… et l\'observation d\'un bilan antérieur survit', t.obsA === 'réception raide' && t.obsB === 'RAS', JSON.stringify(t));
t = lu(fusion([ancien]));
ok('un seul bilan garde ses propres observations (vue en lecture)', t.obsA === 'réception raide', JSON.stringify(t));
const recentObs = { donnees: { 'ct-data-genou': JSON.stringify([
  { name: 'Squat jump', type: 'comparison', valA: '30', valB: '33', obsA: 'meilleure réception', obsB: '' }]) } };
t = lu(fusion([recentObs, ancien]));
ok('une observation plus récente remplace l\'ancienne', t.obsA === 'meilleure réception' && t.obsB === 'RAS', JSON.stringify(t));
/* De bout en bout : la fusion, puis la marque. */
b = banc(); b.cache.value = JSON.stringify([{ name: 'Squat jump', type: 'comparison', valA: '', valB: '' }]); b.window._ctRestoreAll();
b.window._ctPoserHeritage(fusion([recent, ancien]));
const tas2 = [];
b.conteneur.children.filter(c => !/ct-row|ct-sub-hdr/.test(c.className || ''))
  .forEach(z => z.children.forEach(k => (k.children || []).forEach(x => { if (x.tagName === 'TEXTAREA') tas2.push(x); })));
ok('de bout en bout : l\'observation fusionnée s\'affiche en gris', tas2.some(x => x.placeholder === 'réception raide' && x.classList.contains('bl-inherited-ghost')),
  tas2.map(x => x.placeholder).join(' | '));

console.log('\nLe câblage : suivi ET « Modifier » passent par _blShowInheritedHints');
const h0 = src.indexOf('function _blShowInheritedHints');
const h1 = src.indexOf('\nfunction ', h0 + 10);
let recu = 'jamais appelé';
const doc = { getElementById: () => null, querySelectorAll: () => ({ forEach() {} }) };
const win = { _ctPoserHeritage: m => { recu = m; } };
const hints = new Function('document', 'window', src.slice(h0, h1) + '; return _blShowInheritedHints;')(doc, win);
hints(PREC);
ok('les valeurs héritées sont transmises aux tests personnalisés', recu === PREC, typeof recu === 'string' ? recu : 'objet différent');
hints(null);
ok('… et un appel sans héritage les efface', recu === null, String(recu));
ok('le suivi appelle bien _blShowInheritedHints APRÈS avoir reporté les noms',
  (() => { const s = src.indexOf('function _newBilanSuiviConfirm'), e = src.indexOf('\nfunction ', s + 10), corps = src.slice(s, e);
    return corps.indexOf('_ctRestoreAll()') > 0 && corps.indexOf('_blShowInheritedHints(_prevDonnees)') > corps.indexOf('_ctRestoreAll()'); })());

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Tests personnalisés : la valeur héritée s\'affiche comme partout.');

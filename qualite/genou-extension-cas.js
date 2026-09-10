#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Genou — l'extension se teste en UN seul endroit

   La page Genou posait l'extension deux fois :
   - dans « Mobilités Flexion / Extension » : Extension passive, Extension active ;
   - après les contractions flash, dans le bloc AMI, une section « Extension du
     Genou — Tests Fonctionnels » : Extension passive, Extension active sur
     table, Extension active en charge.
   Les deux premières lignes faisaient doublon. Décision du praticien :
   « Extension active en charge » rejoint le premier bloc, et la section du
   bloc AMI quitte la page.

   Deux règles rendent le geste sûr, et le cas les tient :
   1. L'identité d'un test est son INDEX dans `TESTS[tbody].items` (les ids
      `sel-<tbody>-<i>` des bilans enregistrés en dérivent). La nouvelle ligne
      s'AJOUTE en fin de liste — index 2 — sans toucher aux deux premières.
   2. Une table du catalogue ne se supprime JAMAIS : des bilans enregistrés y
      rattachent des valeurs. `tb-ge-ext*` restent donc au catalogue, au CR et
      au registre des blocs ; seule leur section quitte la page. Leurs valeurs
      restent en base, sans être affichées — comme `mob-co-*` avant elles.

     node qualite/genou-extension-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Le vrai catalogue, exécuté comme le fait qualite/check-catalogue.js. */
const d = js.indexOf('const TESTS = {');
const f = js.indexOf('\n};', d);
const sb = {}; vm.createContext(sb);
vm.runInContext(js.slice(d, f + 3) + '\nthis.T = TESTS;', sb);
const T = sb.T;
const libelle = s => String(s).replace(/<[^>]+>.*$/s, '').trim();

console.log('\nLe premier bloc porte l\'extension active en charge');
['tb-ge-mob-ext', 'tb-ge-mob-ext-g', 'tb-ge-mob-ext-d'].forEach(tb => {
  const it = (T[tb] || {}).items || [];
  ok(tb + ' : les deux premières lignes n\'ont pas bougé', libelle(it[0]) === 'Extension passive' && libelle(it[1]) === 'Extension active',
    it.slice(0, 2).map(libelle).join(' | '));
  ok(tb + ' : « Extension active en charge » AJOUTÉE en fin (index 2)', libelle(it[2]) === 'Extension active en charge' && it.length === 3,
    it.map(libelle).join(' | '));
});

console.log('\nLa section en doublon a quitté la page');
const s = html.indexOf('id="page-genou"');
const e = html.indexOf('<div class="page" id="page-', s + 10);
const genou = html.slice(s, e > 0 ? e : undefined);
['tb-ge-ext', 'tb-ge-ext-g', 'tb-ge-ext-d'].forEach(tb =>
  ok('plus de table ' + tb + ' dans la page', genou.indexOf('id="' + tb + '"') < 0));
ok('… ni de ses conteneurs single / bilatéral', !/id="ge-(single|bilateral)-ext"/.test(genou));
ok('le bloc AMI garde sa contraction flash', /data-block-id="genou--ami"/.test(genou) && /id="cf-q-ca"/.test(genou));
ok('l\'en-tête « Extension du Genou — Tests Fonctionnels » a disparu', genou.indexOf('Extension du Genou — Tests Fonctionnels') < 0);

console.log('\nLes données déjà enregistrées ne sont pas orphelines');
['tb-ge-ext', 'tb-ge-ext-g', 'tb-ge-ext-d'].forEach(tb =>
  ok(tb + ' reste au catalogue (des bilans y rattachent des valeurs)', !!T[tb] && T[tb].items.length === 3));

console.log('\nL\'extension en charge ne s\'affiche qu\'une fois');
const tbodies = [...genou.matchAll(/<tbody id="(tb-[\w-]+)"/g)].map(m => m[1]);
const porteurs = tbodies.filter(tb => ((T[tb] || {}).items || []).some(x => /^Extension active en charge/.test(libelle(x))));
ok('seules les tables du premier bloc la portent', porteurs.sort().join(',') === 'tb-ge-mob-ext,tb-ge-mob-ext-d,tb-ge-mob-ext-g', porteurs.join(','));
ok('la bascule bilatérale ne vise plus des conteneurs disparus',
  (() => { const a = js.indexOf('function _updateGenouBilateral'); const b = js.indexOf('\n}\n', a); return !/'ext'/.test(js.slice(a, b)); })());

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Genou : l\'extension se teste en un seul endroit.');

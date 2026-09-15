#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Tests personnalisés — chaque côté sous son nom, dans le même ordre partout

   Signalé par le praticien (2026-09-15), bilan d'Alice Murat : « le côté droit
   se retrouve à gauche et vice versa, avec des résultats inversés dans le CR ».

   Deux défauts, tous deux récurrents (toute comparaison, tout patient) :

   1. LES ÉCARTS DE SUIVI SOUS LE MAUVAIS CÔTÉ. Le formulaire posait valB dans
      la PREMIÈRE case et valA dans la seconde ; les écarts « +6 (+4 %) »
      s'accrochaient par POSITION : l'écart de valA dans la première case, celui
      de valB dans la seconde. Chez Alice, « +6 (+4 %) » sous DROIT 120 était
      l'écart du GAUCHE (160 contre 154) ; « +22 (+22 %) » sous GAUCHE 160,
      celui du DROIT (120 contre 98). Chaque case porte désormais le nom de sa
      valeur (data-champ), et l'écart la cherche par ce nom.

   2. DROIT AVANT GAUCHE — seul endroit de l'application. Le formulaire
      affichait B puis A : « Sain | Atteint » (juste) mais « Droit | Gauche »
      en bilatéral, quand les tableaux du bilan et le CR disent Gauche puis
      Droit. Lu de gauche à droite, le CR semblait inverser les chiffres. Une
      seule règle, _ctOrdre : Gauche avant Droit, Sain avant Atteint — pour le
      formulaire, les observations et le tableau « CR Tests » (qui disait,
      lui, « Atteint | Sain »).

   valA / valB ne bougent pas : aucune donnée enregistrée n'est touchée, seul
   l'ordre d'AFFICHAGE change, en-têtes et valeurs ensemble.

     node qualite/ct-cotes-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
/* Les fonctions du module des tests personnalisés sont indentées de deux espaces. */
const fi = n => { const d = src.indexOf('\n  function ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n  }\n', d) + 4); };
const fw = n => { const d = src.indexOf('\n  window.' + n + ' = function'); return d < 0 ? '' : src.slice(d, src.indexOf('\n  };\n', d) + 5); };

console.log('\nUne règle d\'ordre');
function ordre(zones, cote) {
  const c = vm.createContext({ _painZones: zones, document: { getElementById: () => ({ value: cote || '' }) } });
  try { vm.runInContext(fi('_ctIsBilat') + fi('_ctLabels') + fi('_ctOrdre') + '\nthis.o = _ctOrdre();', c); return c.o; }
  catch (e) { return 'ERREUR ' + e.message; }
}
const bi = ordre([{ cote: 'DROIT' }, { cote: 'GAUCHE' }]), un = ordre([{ cote: 'DROIT' }]);
const vue = o => Array.isArray(o) ? o.map(c => c.lbl + ':' + c.champ + '/' + c.obs).join(' | ') : String(o);
ok('bilatéral : Gauche (valA) puis Droit (valB)', vue(bi) === 'Gauche:valA/obsA | Droit:valB/obsB', vue(bi));
ok('un côté atteint : Sain (valB) puis Atteint (valA)', vue(un) === 'Sain:valB/obsB | Atteint:valA/obsA', vue(un));
ok('… les étiquettes restent celles de _ctLabels (valA = Gauche ou Atteint)', /Gauche:valA/.test(vue(bi)) && /Atteint:valA/.test(vue(un)));

console.log('\nLe formulaire');
const rd = fi('_ctRender');
ok('l\'en-tête suit la règle', /'<span class="sh-left">Comparaison<\/span><span>'\+o\[0\]\.lbl\+'<\/span><span>'\+o\[1\]\.lbl\+'<\/span><span>Asym\.<\/span>'/.test(rd));
ok('… plus d\'en-tête écrit B puis A', !/lbl\.b\+'<\/span><span>'\+lbl\.a/.test(rd));
ok('chaque case porte le nom de sa valeur', (rd.match(/class="ct-cell" data-champ="/g) || []).length >= 2 && /data-champ="valA"/.test(rd));
ok('les observations suivent la même règle', /_ctOrdre\(\)/.test(fi('_mkObsZone')) && !/\[\['obsB',lbl\.b\],\['obsA',lbl\.a\]\]/.test(fi('_mkObsZone')));

console.log('\nLes écarts de suivi');
const d0 = src.indexOf('function _ctDeltaBadge(curV, prevV, cell)'), bloc = src.slice(d0 - 600, d0 + 1400);
ok('l\'écart de chaque valeur va dans SA case, cherchée par son nom', /\.ct-cell\[data-champ="'\+ch\+'"\]/.test(bloc) && /_ctDeltaBadge\(t\.valA, prev\.valA, cellDe\('valA'\)\)/.test(bloc) && /_ctDeltaBadge\(t\.valB, prev\.valB, cellDe\('valB'\)\)/.test(bloc));
ok('… plus jamais par sa position', !/cells\[0\]/.test(bloc) && !/cells\[1\]/.test(bloc));

console.log('\nLe CR');
const cr = fw('_ctBuildCRHtml');
ok('« CR Tests » : Gauche avant Droit, Sain avant Atteint', /_ctOrdre\(\)/.test(cr) && !/'\+lbl\.a\+'<\/th>'\+\s*'<th[^']*'\+lbl\.b/.test(cr));
ok('« CR Complet » passe par _crMesTab, qui normalise déjà', /_crMesTab\(\[\{ a:\(t\.valA/.test(fw('_ctBuildSectionHtml')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Tests personnalisés : chaque côté sous son nom, Gauche avant Droit, Sain avant Atteint.');

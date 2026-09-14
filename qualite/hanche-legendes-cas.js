#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Bilan hanche — les légendes de FABER et d'AB-HEER suivent la référence

   Signalé par le praticien (2026-09-14), captures de son support de cours à
   l'appui : « petit écrit en gris sous les tests pas clair ». Les légendes
   tenaient en une phrase serrée, et celle d'AB-HEER décrivait un AUTRE geste
   (hyperextension + RE résistée, « instabilité postérieure ») que le test de
   la référence : ABD 30° + RE, poussée antérieure sur le grand trochanter,
   l'appréhension signant l'instabilité et la douleur le labrum.

   Une légende en lignes : le geste, le critère, l'hypothèse. Le NOM du test ne
   bouge pas — le courrier ne lit que lui (les <span> sont retirées), et
   l'index reste le même (catalogue append-only, qualite/check-catalogue.js).

     node qualite/hanche-legendes-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const d = src.indexOf('const TESTS = {'), f = src.indexOf('\n};', d);
const bac = {}; vm.createContext(bac);
vm.runInContext(src.slice(d, f + 3) + '\nthis.T = TESTS;', bac);
const items = bac.T['tb-ha-hanche'].items;
const nom = s => String(s).replace(/<span[\s\S]*?<\/span>/gi, '').replace(/<[^>]*>/g, '').trim();   // ce que lit le courrier
const legende = s => { const m = String(s).match(/display:block">([\s\S]*?)<\/span>/); return m ? m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') : ''; };

console.log('\nFABER');
const fa = items[6] || '', lf = legende(fa);
ok('même place, même nom pour le courrier', nom(fa) === 'FABER', nom(fa));
ok('le geste : pied au-dessus de la patella controlatérale, ABD majorée bassin stabilisé', /patella controlatérale/.test(lf) && /stabilisant le bassin/.test(lf), lf);
ok('le critère : douleur / amplitude', /Critère : douleur \/ amplitude/.test(lf), lf);
ok('l\'hypothèse selon la localisation', /antérieure : coxarthrose, FAI, labrum/.test(lf) && /latérale : GTPS/.test(lf) && /postérieure : sacro-iliaque/.test(lf), lf);

console.log('\nAB-HEER');
const ab = items[7] || '', la = legende(ab);
ok('même place, même nom pour le courrier', nom(ab) === 'AB-HEER Test', nom(ab));
ok('le geste de la référence : ABD 30° + RE, poussée antérieure sur le grand trochanter', /ABD 30°/.test(la) && /grand trochanter vers l’avant/.test(la), la);
ok('le critère : douleur / appréhension', /Critère : douleur \/ appréhension/.test(la), la);
ok('l\'hypothèse : appréhension → instabilité, douleur → labrum', /appréhension : instabilité/.test(la) && /douleur : atteinte du labrum/.test(la), la);
ok('plus d\'« instabilité postérieure » (un autre test)', !/postérieure/i.test(ab), ab);

console.log('\nLa forme');
ok('une ligne par idée (geste, critère, hypothèse)', (fa.match(/<br>/g) || []).length >= 3 && (ab.match(/<br>/g) || []).length >= 3);
ok('aucune <span> imbriquée : le courrier retirerait mal la légende', [fa, ab].every(s => (s.match(/<span/g) || []).length === 2));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Hanche : FABER et AB-HEER disent le geste, le critère et l\'hypothèse de la référence.');

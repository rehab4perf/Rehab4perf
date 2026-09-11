#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Lien athlète — revenir d'un jour, et lire ce que vaut une barre

   Signalé par le praticien sur le lien de Guillaume :
     1. Taper un jour du calendrier ouvre la vue Jour — et rien pour revenir :
        il fallait retrouver « Mois » dans la barre. Le geste retour du
        téléphone ne ramenait nulle part non plus.
     2. Les petites barres du volume d'entraînement : impossible de savoir
        qu'une barre vaut un JOUR (vue Semaine) ou une SEMAINE (vue Mois). Et
        seule la dernière était pleine, même sur une période passée — une mise
        en valeur qui ne voulait rien dire.

   La règle :
     1. la vue Jour atteinte par un jour garde la vue d'où l'on vient :
        « ← Retour au mois / à la semaine », et le retour du téléphone y ramène ;
     2. une légende « Une barre = un jour / une semaine / un mois », un repère
        sous chaque barre, aujourd'hui en gras, une bulle par barre, et toutes
        les barres pleines. Le code est partagé : le praticien en profite.

     node qualite/volume-axe-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const vs = fs.readFileSync(path.join(R, 'js', 'volume-sport.js'), 'utf8');
const ath = fs.readFileSync(path.join(R, 'athlete.html'), 'utf8');
const prog = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };

/* ── 2. Les barres ───────────────────────────────────────────────────────── */
const ctx = vm.createContext({ escH: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') });
vm.runInContext(vs, ctx);
ctx._pevoAujourdhuiIso = () => '2026-09-11';
const cel = (km) => ({ dist: km * 1000, duree: km * 300, charge: km * 10, n: 1 });
function semaine(debut, parJour) {
  const pj = [0, 1, 2, 3, 4, 5, 6].map(i => parJour[i] ? cel(parJour[i]) : { dist: 0, duree: 0, charge: 0, n: 0 });
  const t = pj.reduce((a, p) => ({ dist: a.dist + p.dist, duree: a.duree + p.duree, charge: a.charge + p.charge, n: a.n + p.n }), { dist: 0, duree: 0, charge: 0, n: 0 });
  t.parJour = pj; return { debut, sports: { course: t } };
}
const V = { sports: ctx.R4P_SPORTS.concat([ctx.R4P_SPORT_AUTRE]), jourCourant: 4,
  semaines: [semaine('2026-08-24', { 1: 8 }), semaine('2026-08-31', { 0: 10, 3: 6 }), semaine('2026-09-07', { 0: 12, 2: 5, 4: 9 })] };
const rendu = (u) => { const per = ctx._pevoPeriode(u, 0, '2026-09-11'); per.sousUnite = null; return ctx._volHtml(V, per); };
const axe = h => [...h.matchAll(/<div class="vol-axe">([\s\S]*?)<\/div>/g)].map(m => [...m[1].matchAll(/<span( class="auj")?>([^<]*)<\/span>/g)].map(s => (s[1] ? '*' : '') + s[2]));

console.log('\nVue Semaine : une barre = un jour');
let h = '';
try { h = rendu('semaine'); } catch (e) { h = 'ERREUR ' + e.message; }
ok('la légende le dit', /Une barre = un jour/.test(h), (h.match(/vol-axe-leg[^<]*<[^<]*/) || ['absent'])[0]);
const a1 = axe(h)[0] || [];
ok('un repère sous chaque barre : L 7 … D 13', a1.join(' ') === 'L 7 M 8 M 9 J 10 *V 11 S 12 D 13', a1.join(' '));
ok('… aujourd\'hui en gras (vendredi 11)', a1.indexOf('*V 11') === 4);
ok('toutes les barres sont pleines (plus de « seule la dernière »)', !/opacity="0\.4"/.test(h));
ok('chaque barre porte sa bulle : le jour et la valeur', /<title>lun\. 7 sept\. · 12 km<\/title>/.test(h), (h.match(/<title>[^<]*<\/title>/) || ['aucune'])[0]);

console.log('\nVue Mois : une barre = une semaine');
try { h = rendu('mois'); } catch (e) { h = 'ERREUR ' + e.message; }
ok('la légende le dit', /Une barre = une semaine/.test(h));
const a2 = axe(h)[0] || [];
ok('un repère par semaine : 1–6 · 7–13 · 14–20 · 21–27 · 28–30', a2.join(' ') === '1–6 *7–13 14–20 21–27 28–30', a2.join(' '));
ok('la bulle nomme la semaine', /<title>du 7 au 13 sept\. · 26 km<\/title>/.test(h), (h.match(/<title>[^<]*<\/title>/g) || []).slice(0, 2).join(' '));

console.log('\nVue Année : une barre = un mois');
try { h = rendu('annee'); } catch (e) { h = 'ERREUR ' + e.message; }
ok('la légende le dit, et douze repères', /Une barre = un mois/.test(h) && (axe(h)[0] || []).length === 12, (axe(h)[0] || []).join(' '));

console.log('\nLa feuille');
[['athlete.html', ath], ['programme.html', prog]].forEach(([n, s]) =>
  ok(n + ' définit le repère, aujourd\'hui et la légende', /\.vol-axe \{/.test(s) && /\.vol-axe span\.auj \{/.test(s) && /\.vol-axe-leg \{/.test(s)));

/* ── 1. Revenir d'un jour ────────────────────────────────────────────────── */
console.log('\nRevenir d\'un jour');
const fa = fnDe(ath);
ok('entrer dans un jour mémorise la vue d\'où l\'on vient', /_calVuePrec = \{/.test(fa('jumpToDay')), fa('jumpToDay').slice(0, 200));
ok('… et pose une entrée d\'historique (le retour du téléphone y ramène)', /history\.pushState\(/.test(fa('jumpToDay')));
ok('le retour du téléphone est écouté', /addEventListener\('popstate'/.test(ath));
ok('changer de vue à la main oublie la vue mémorisée', /_calVuePrec = null/.test(fa('setCalView')));
const nav = vm.createContext({ escH: s => String(s), _calView: 'day', _calVuePrec: { vue: 'month' } });
let n1 = '';
try { vm.runInContext(fa('_buildCalNav'), nav); n1 = nav._buildCalNav('Mardi 8 sep 2026'); } catch (e) { n1 = 'ERREUR ' + e.message; }
ok('la vue Jour montre « ← Retour au mois »', /onclick="retourVue\(\)"[^>]*>← Retour au mois</.test(n1), n1.slice(0, 200));
nav._calVuePrec = { vue: 'week' };
try { n1 = nav._buildCalNav('x'); } catch (e) {}
ok('… ou « ← Retour à la semaine »', /← Retour à la semaine/.test(n1));
nav._calVuePrec = null;
try { n1 = nav._buildCalNav('x'); } catch (e) {}
ok('… et rien quand on est venu par le bouton « Jour »', !/retourVue/.test(n1));
ok('le bouton est stylé', /\.cal-retour-btn \{/.test(ath));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Lien athlète : on revient d\'un jour, et une barre dit ce qu\'elle vaut.');

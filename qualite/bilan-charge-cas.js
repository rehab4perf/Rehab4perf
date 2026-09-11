#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Bilan de charge sous l'agenda — deux semaines sur UNE échelle, et la
   tendance qui explique l'ACWR

   Ce que montrait l'ancien bilan, relevé sur l'écran du praticien :
     - chaque semaine avait SA hauteur maximale : 585 UA dessinait une barre
       aussi haute que 760 UA la semaine d'avant — deux semaines empilées qu'on
       ne pouvait pas comparer ;
     - la couleur suivait des seuils fixes par jour (150 / 300 UA) : chez un
       athlète qui s'entraîne, presque tout était rouge, et le rouge n'alertait
       plus sur rien ;
     - les jours à venir avaient l'air de jours de repos ;
     - « Prog. −43 % » comparait cinq jours à sept, rangé sous « Moy. / jour » ;
     - l'ACWR était un point sur un dégradé, sans rien pour dire d'où il venait.

   Décision du praticien (maquettes A + B) :
     A — les 14 jours sur une même échelle, valeur au-dessus de chaque barre,
         jours à venir en pointillé ; en tête, charge 7 jours, semaine en
         cours À JOUR ÉGAL, monotonie ;
     B — l'ACWR et, à côté, 8 semaines en barres avec la charge chronique et la
         bande favorable (0,8–1,3 × chronique) : une semaine hors bande se voit,
         et c'est la couleur d'ÉTAT qui la signale, pas celle du jour.

     node qualite/bilan-charge-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const vs = fs.readFileSync(path.join(R, 'js', 'volume-sport.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = nom => { const d = pmain.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };
const NOMS = ['_dateStr', '_getMondayOf', '_foster7', '_calcWeekStats', '_calcACWR', '_monBadge', '_acwrBadge', '_progBadge',
              '_bcFmt', '_bcPct', '_bcSomme', '_bcReference', '_bcJoursHtml', '_bcTendance', '_bilanChargeHtml'];
const manquent = NOMS.filter(n => !fn(n));
ok('les fonctions du bilan existent', !manquent.length, manquent.join(', '));

const ctx = vm.createContext({ console });
vm.runInContext(vs, ctx);
try { vm.runInContext(NOMS.map(fn).join('\n'), ctx); } catch (e) { ok('elles se chargent', false, e.message); }

/* Jeu d'essai : cinq semaines calmes (5 × 300 UA), puis la semaine du 31 août
   (pic : 3 148 UA), puis la semaine en cours jusqu'au vendredi 11 septembre. */
const UA = {};
const pose = (lundi, vals) => vals.forEach((v, i) => { if (v) UA[vm.runInContext('_pevoPlus', ctx)(lundi, i)] = v; });
['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'].forEach(l => pose(l, [300, 300, 0, 300, 300, 300, 0]));
pose('2026-08-31', [460, 260, 260, 760, 260, 460, 688]);
pose('2026-09-07', [380, 200, 380, 250, 585]);
const rendre = (ref, auj) => { try { return ctx._bilanChargeHtml(UA, ref, auj, '') || ''; } catch (e) { return 'ERREUR ' + e.message; } };
const h = rendre('2026-09-11', '2026-09-11');

/* ── A : 14 jours, une échelle ───────────────────────────────────────────── */
console.log('\nA — deux semaines sur une même échelle');
const barres = [...h.matchAll(/class="bc-barre"[^>]*data-ua="(\d+)"[^>]*style="height:([\d.]+)px/g)].map(m => ({ ua: +m[1], px: +m[2] }));
ok('les jours chargés ont une barre (7 + 5)', barres.length === 12, barres.length + ' barres');
const r = barres.map(b => b.px / b.ua);
ok('UNE échelle pour les deux semaines : hauteur ∝ charge', barres.length && Math.max(...r) - Math.min(...r) < 0.003,
   barres.map(b => b.ua + '→' + b.px).join(' '));
const b760 = barres.find(b => b.ua === 760), b585 = barres.find(b => b.ua === 585);
ok('… 585 UA est plus bas que 760 UA', b760 && b585 && b585.px < b760.px);
ok('chaque barre écrit sa valeur', /class="bc-val">760</.test(h) && /class="bc-val">585</.test(h));
ok('samedi et dimanche à venir sont en pointillé, pas des jours de repos',
   (h.match(/class="bc-avenir"/g) || []).length === 2 && /à venir/.test(h));
ok('aujourd\'hui est repéré', /bc-lbl auj/.test(h));
ok('plus aucune couleur par seuil de jour', !/#27AE60|#E67E22|bilan-day-bar/.test(h));
ok('chaque semaine porte son total', /3\s?148 UA/.test(h) && /1\s?795 UA/.test(h), (h.match(/bc-sem-tete[^]*?<\/div>/g) || []).join(' | '));

console.log('\nA — les chiffres de tête');
ok('la charge 7 jours (5 → 11 sept. : 460 + 688 + 1 795)', /Charge 7 jours/.test(h) && /2\s?943/.test(h));
/* 1 795 contre 2 000 (lundi → vendredi de la semaine d'avant) : −10 %, pas −43 %. */
ok('la semaine en cours se compare À JOUR ÉGAL : −10 %, pas −43 %', /[−-]10 %/.test(h) && !/43 %/.test(h),
   (h.match(/Semaine en cours[^]{0,400}/) || [''])[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160));
ok('… et le dit', /à jour égal/.test(h));
ok('la monotonie porte sur les 7 derniers jours', /Monotonie/.test(h) && /7 derniers jours/.test(h));

/* ── B : la tendance ─────────────────────────────────────────────────────── */
console.log('\nB — la tendance qui explique l\'ACWR');
/* 2 943 contre une chronique de 8 243 ÷ 4 = 2 061 : 1,43. */
ok('l\'ACWR est affiché, à la française', /bc-ratio[^>]*>1,43</.test(h), (h.match(/bc-ratio[^>]*>[^<]*/) || ['absent'])[0]);
ok('huit semaines en barres', (h.match(/class="bc-b[ "]/g) || []).length === 8, (h.match(/class="bc-b[ "]/g) || []).length + ' barres');
/* Sans 28 jours d'historique, pas de bande : le 20/7, le 27/7 et le 3/8 n'en ont pas (premier jour chargé : 20 juillet). */
ok('… une bande favorable par semaine qui a 28 jours d\'historique (5 sur 8)', (h.match(/class="bc-bande"/g) || []).length === 5,
   (h.match(/class="bc-bande"/g) || []).length + ' bandes');
ok('… et pas de couleur d\'état sur une reprise sans historique', (h.match(/class="bc-b risque"/g) || []).length === 1);
ok('… et la charge chronique en ligne', /class="bc-chro"/.test(h));
/* Vu en ligne sur le compte de démo : une séance cette semaine, une autre il y
   a un an. La chronique n'est faite que de la semaine jugée — l'ACWR dit
   « données insuffisantes », la bande ne doit pas prétendre le contraire. */
const UA2 = { '2025-09-01': 300, '2026-09-08': 325 };
let h2 = ''; try { h2 = ctx._bilanChargeHtml(UA2, '2026-09-11', '2026-09-11', ''); } catch (e) { h2 = 'ERREUR ' + e.message; }
ok('pas de bande quand la chronique ne tient qu\'à la semaine elle-même', !/class="bc-bande"/.test(h2) && /Données insuffisantes/.test(h2),
   (h2.match(/class="bc-bande"/g) || []).length + ' bande(s)');
/* Semaine du 31 août : 3 148 contre une chronique de (4 × 1 500 … ) — ratio > 1,5. */
ok('la semaine du pic sort de la bande, en couleur d\'état', /class="bc-b risque"/.test(h) || /class="bc-b prud"/.test(h));
ok('la semaine en cours est marquée comme telle', /class="bc-b encours"/.test(h));

/* ── Ce qui ne doit plus revenir ─────────────────────────────────────────── */
console.log('\nLangage');
ok('aucun emoji dans le bilan', !/[☀-➿]|[\u{1F300}-\u{1FAFF}]/u.test(h), (h.match(/[☀-➿]|[\u{1F300}-\u{1FAFF}]/u) || [''])[0]);
ok('la formule reste nommée', /méthode de Foster/.test(h));
ok('« Strain » n\'est plus une formule sans lecture', !/Charge × Mono\./.test(h));

/* ── Un mois passé : lu à la fin de ce mois ──────────────────────────────── */
console.log('\nUn mois passé');
const hp = rendre('2026-08-30', '2026-09-11');
ok('rien « à venir » ni « en cours » quand la référence est passée', !/bc-avenir|encours|Semaine en cours/.test(hp), hp.slice(0, 120));
ok('… et l\'écran dit à quelle date il lit', /au 30 août/.test(hp));
const refDe = (a, m) => { try { return ctx._bcReference(a, m, '2026-09-11'); } catch (e) { return e.message; } };
ok('un mois passé se lit à son dernier dimanche (août 2026 → 30 août)', refDe(2026, 7) === '2026-08-30', refDe(2026, 7));
ok('le mois en cours se lit aujourd\'hui', refDe(2026, 8) === '2026-09-11', refDe(2026, 8));
ok('un mois à venir aussi (rien à lire plus tard)', refDe(2026, 9) === '2026-09-11', refDe(2026, 9));
const vide = (() => { try { return ctx._bilanChargeHtml({}, '2026-09-11', '2026-09-11', ''); } catch (e) { return 'ERREUR ' + e.message; } })();
ok('sans aucune charge : le bilan le dit, sans graphique', /En attente des retours/.test(vide) && !/bc-barre/.test(vide), vide.slice(0, 120));

/* ── La feuille ──────────────────────────────────────────────────────────── */
console.log('\nLa feuille');
['.bc-kpis', '.bc-jours', '.bc-barre', '.bc-avenir', '.bc-bande', '.bc-chro', '.bc-b.risque', '.bc-b.encours'].forEach(c =>
  ok(c + ' est défini', html.indexOf(c + ' {') > 0 || html.indexOf(c + ',') > 0));
ok('l\'ancien bilan hebdomadaire a quitté la feuille', !/\.bilan-week-card\s*\{|\.bilan-day-bars\s*\{|\.bilan-acwr-bar-wrap\s*\{/.test(html));
ok('et le code', !/bilan-week-card|bilan-day-bar|bilan-acwr-marker/.test(pmain));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bilan de charge : une échelle, un état, une tendance.');

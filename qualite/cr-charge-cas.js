#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Générateur de CR — la charge d'entraînement, à cocher

   Décision du praticien (2026-09-13), en retirant l'export de l'onglet
   Évolution : le courrier recevait les courbes d'exercices du programme, mais
   rien de la charge — ni volume par sport, ni charge UA, ni ACWR. Pour un
   courrier de reprise sportive, c'est pourtant ce que le médecin veut lire.

   Le bloc « Charge d'entraînement », à cocher comme les courbes :
     - volume par sport sur les 28 derniers jours (tableau : volume, séances,
       charge, part), le total ;
     - l'ACWR du jour, sa zone EN FRANÇAIS (pas « Sweet spot » dans un courrier
       au médecin), la charge aiguë et la chronique ;
     - la charge par semaine sur 8 semaines, avec la bande favorable ;
     - la méthode nommée (Foster).
   Mêmes calculs que le bilan de charge de l'agenda. Le bloc porte son propre
   style, en couleurs FIXES : le courrier et son PDF n'ont pas les variables
   CSS du programme — une couleur en var() y disparaît sans un mot.

     node qualite/cr-charge-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const vs = fs.readFileSync(path.join(R, 'js', 'volume-sport.js'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const outils = fs.readFileSync(path.join(R, 'outils.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain);

/* ── Le bloc, construit par le programme ─────────────────────────────────── */
console.log('\nLe bloc « Charge d\'entraînement »');
ok('le programme sait le construire', !!fm('_crChargeHtml'));
const ctx = vm.createContext({ escH: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') });
vm.runInContext(vs, ctx);
try { vm.runInContext(['_dateStr', '_calcACWR', '_acwrBadge', '_bcFmt', '_bcPct', '_bcSomme', '_bcTendance', '_crChargeHtml'].map(fm).join('\n'), ctx); }
catch (e) { ok('ses fonctions se chargent', false, e.message); }

/* Six semaines calmes puis la semaine du pic, en UA par jour ; et le volume :
   course et vélo sur les 28 derniers jours (au 13 septembre). */
const UA = {};
const plus = ctx._pevoPlus;
['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07'].forEach(l =>
  [0, 1, 3, 4, 5].forEach(i => { UA[plus(l, i)] = 300; }));
const cel = (km, ua) => ({ dist: km * 1000, duree: km * 300, charge: ua, n: 1 });
function semaine(debut, jours) {
  const sp = {};
  Object.keys(jours).forEach(cle => {
    const pj = [0, 1, 2, 3, 4, 5, 6].map(i => jours[cle][i] ? cel(jours[cle][i][0], jours[cle][i][1]) : { dist: 0, duree: 0, charge: 0, n: 0 });
    const t = pj.reduce((a, p) => ({ dist: a.dist + p.dist, duree: a.duree + p.duree, charge: a.charge + p.charge, n: a.n + p.n }), { dist: 0, duree: 0, charge: 0, n: 0 });
    t.parJour = pj; sp[cle] = t;
  });
  return { debut, sports: sp };
}
const VOL = { sports: ctx.R4P_SPORTS.concat([ctx.R4P_SPORT_AUTRE]), jourCourant: 6, semaines: [
  semaine('2026-08-10', { course: { 0: [8, 300] } }),
  semaine('2026-08-17', { course: { 0: [10, 300] }, velo: { 3: [40, 300] } }),
  semaine('2026-08-24', { course: { 1: [12, 300] } }),
  semaine('2026-08-31', { velo: { 3: [50, 300] } }),
  semaine('2026-09-07', { course: { 0: [9, 300] } })] };
let h = '';
try { h = ctx._crChargeHtml(UA, VOL, '2026-09-13'); } catch (e) { h = 'ERREUR ' + e.message; }
ok('il annonce la fenêtre : les 28 derniers jours, datés', /28 derniers jours/.test(h) && /17 août/.test(h) && /13 sept\./.test(h), h.slice(0, 200));
ok('un tableau par sport : course 31 km, vélo 90 km', /Course à pied[\s\S]{0,200}31 km/.test(h) && /Vélo[\s\S]{0,200}90 km/.test(h),
   (h.match(/<tr>[\s\S]*?<\/tr>/g) || []).slice(1, 3).join(' | ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
ok('… avec le total', /Total/.test(h));
ok('l\'ACWR du jour, en français', /ACWR/.test(h) && /zone favorable|sous-charge|prudence|zone à risque|données insuffisantes/i.test(h) && !/Sweet spot/i.test(h),
   (h.match(/ACWR[^<]{0,120}/) || ['absent'])[0]);
ok('… avec la charge aiguë et la chronique', /aiguë/.test(h) && /chronique/.test(h));
ok('la charge par semaine, avec la bande favorable', /class="bc-bande"/.test(h) && /class="bc-chro"/.test(h));
ok('la méthode est nommée', /Foster/.test(h));
ok('il porte son propre style…', /<style>[\s\S]*\.crc[\s\S]*<\/style>/.test(h));
const style = (h.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
ok('… en couleurs fixes : aucune variable CSS du programme (absente du courrier)', style && !/var\(--/.test(style) && !/var\(--/.test(h.replace(/<style>[\s\S]*?<\/style>/, '')),
   (h.match(/var\(--[a-z-]+\)/g) || []).slice(0, 4).join(' '));
/* Vu en ligne sur la démo : une seule semaine de charge, et le courrier
   écrivait « ACWR — — données insuffisantes ». Sans ratio, pas de tiret-valeur. */
let court = '';
try { court = ctx._crChargeHtml({ '2026-09-10': 325 }, VOL, '2026-09-13'); } catch (e) { court = 'ERREUR ' + e.message; }
ok('historique trop court : « ACWR : données insuffisantes », sans double tiret',
   /données insuffisantes/.test(court) && !/ACWR —<\/b> —/.test(court) && /ACWR<\/b> : données insuffisantes/.test(court),
   (court.match(/crc-acwr">[\s\S]{0,140}/) || ['absent'])[0]);
/* Vu sur le PDF du praticien : tableau étalé sur toute la largeur, colonnes
   très espacées. Colonnes de chiffres à largeur fixe, comme les tableaux de
   mesures du courrier (_crMesTab, 86 px). */
ok('le tableau se resserre : largeur au contenu, chiffres sur 86 px',
   /\.crc-t\{width:auto/.test(style) && /\.crc-t \.n\{[^}]*width:86px/.test(style), (style.match(/\.crc-t[^}]*\}/g) || []).join(' '));
let vide = 'x';
try { vide = ctx._crChargeHtml({}, { sports: VOL.sports, semaines: [] }, '2026-09-13'); } catch (e) { vide = 'ERREUR ' + e.message; }
ok('sans aucune charge : rien (le générateur le dit)', vide === '', vide.slice(0, 80));

/* ── Le programme l'envoie, même sans courbe d'exercice ──────────────────── */
console.log('\nLe programme l\'envoie au générateur');
const rep = pdata.slice(pdata.indexOf("if(e.data && e.data.type==='r4p-pevo-request'){"), pdata.indexOf("if(e.data && e.data.type==='r4p-pevo-request'){") + 3200);
ok('la réponse transporte la charge (dans le message envoyé)', /postMessage\(\{type:'r4p-pevo-response',contentHTML:contentHTML,chargeHTML:charge\}/.test(rep));
ok('… et « rien » ne se dit que si ni courbe ni charge', /!contentHTML && !charge/.test(rep));

/* ── Le générateur ───────────────────────────────────────────────────────── */
console.log('\nLe générateur');
ok('une case « Inclure la charge d\'entraînement »', /id="cr-charge-panel"[\s\S]{0,700}id="cr-charge-toggle"[^>]*onchange="crOnChargeToggle\(\)"/.test(outils));
/* Le PDF n'a pas de marge latérale (@page … 0) : seul #cr-body en porte une.
   Les sections de graphiques touchaient le bord de la feuille. */
ok('dans le PDF, les sections de graphiques prennent la marge du texte (28 px)',
   /'#cr-body\{line-height:1\.6;padding:0 28px\}'/.test(outils) && /'#cr-page > \.cr-evo-section\{margin-left:28px;margin-right:28px\}'/.test(outils));
ok('la section entre dans la lettre, après les courbes', /_crGetPevoSectionHtml\(\)\s*\n\s*\+ _crGetChargeSectionHtml\(\)/.test(outils));
const refr = fnDe(outils)('_crRefreshGraphiques') || (outils.match(/function _crRefreshGraphiques\(\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('… et dans l\'aperçu', /_crGetChargeSectionHtml\(\)/.test(refr), refr.slice(0, 160));
ok('cocher la case redessine (écoute déléguée sur le panneau)', /closest\('[^']*#cr-charge-panel[^']*'\)/.test(outils));
ok('changer de patient la décoche et l\'oublie', /function _crViderPevo\(\)\{[\s\S]{0,700}_crChargeHTML = null[\s\S]{0,400}cr-charge-toggle/.test(outils));
ok('la réponse est rangée', /_crChargeHTML = e\.data\.chargeHTML/.test(outils));
ok('les courbes ne s\'affichent que si leur propre case est cochée', /if\s*\(\s*tog2 && tog2\.checked\s*\)\s*_crBuildPevoSelector\(\)/.test(outils));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('CR : la charge d\'entraînement, à cocher, lisible dans le PDF.');

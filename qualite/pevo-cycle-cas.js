#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution des charges — étape 3 : l'unité « Cycle », et des écarts qui
   comparent ce qui est comparable

   1. CHIFFRES DE TÊTE D'UNE COURBE DE CHARGE. Un point au poids du corps vaut
      0,1 kg pour le 1RM (`_1rm`). Quand un exercice passe du poids du corps à
      une charge, « début → actuel » soustrayait l'un de l'autre : « 12 reps
      PdC → 13,3 kg, +13,2 kg (> 999 %) ». Proposer « PdC = 1 kg » n'aurait
      rien réglé (+824 %) : ce sont deux MODES, ils ne se soustraient pas.
      Décision du praticien : on ne compare que la dernière série de séances
      du MÊME mode — des kg entre séances chargées, des répétitions entre
      séances au poids du corps — et la bascule se dit (« passage en charge le
      01/08 »). La courbe, elle, ne change pas.

   2. L'UNITÉ « CYCLE ». En rééducation, c'est souvent la vraie unité de
      lecture : la charge et la progression d'une phase, comparées à la phase
      précédente. Les flèches passent d'un cycle au suivant.
      - un cycle À DURÉE va de son début à sa fin (ou début + durée) ;
      - un cycle À CRITÈRES va de son début à la validation de son dernier
        critère (`checkedAt`), ou jusqu'à aujourd'hui s'il n'est pas validé ;
      - un cycle sans date de début, ou qui n'a pas commencé, n'est pas une
        période ;
      - deux cycles n'ont pas la même durée : la comparaison se fait RAMENÉE À
        LA MÊME DURÉE, et la phrase le dit.

     node qualite/pevo-cycle-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const pdata = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'volume-sport.js'), 'utf8');   // période et volume : fichier partagé

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = nom => { const d = pdata.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };
const AUJ = '2026-09-11';

/* ── 1. Des écarts entre séances du même mode ────────────────────────────── */
console.log('\n1. Les chiffres de tête ne comparent que des séances du même mode');
let K = null;
try { K = new Function(fn('_pevoKpiCharge') + '\nreturn _pevoKpiCharge;')(); } catch (e) { ok('_pevoKpiCharge existe', false, e.message); }
const L = (date, rm1) => ({ date, rm1, kg: rm1, reps: 5, bw: false });
const B = (date, reps) => ({ date, rm1: +(0.1 * 36 / (37 - reps)).toFixed(1), kg: 0, reps, bw: true });
if (K) {
  let k = K([L('2026-08-01', 11.6), L('2026-09-02', 13.3)]);
  ok('toujours chargé : des kg, sans mention', k.fLabel === '11.6kg' && k.lLabel === '13.3kg' && /^\+1\.7kg/.test(k.dLabel) && !k.note, JSON.stringify(k));
  k = K([B('2026-07-01', 12), B('2026-08-01', 15)]);
  ok('toujours au poids du corps : des RÉPÉTITIONS, pas un faux kg', k.fLabel === '12 reps PdC' && k.lLabel === '15 reps PdC' && k.dLabel === '+3 reps' && k.cls === 'pos', JSON.stringify(k));
  k = K([B('2026-07-01', 12), B('2026-07-15', 14), L('2026-08-01', 11.6), L('2026-09-02', 13.3)]);
  ok('passage en charge : l\'écart part de la PREMIÈRE séance chargée', k.fLabel === '11.6kg' && /^\+1\.7kg/.test(k.dLabel), JSON.stringify(k));
  ok('… et la bascule se dit, datée', k.note === 'passage en charge le 01/08', k.note);
  ok('… plus jamais « > 999 % »', !/999/.test(k.dLabel), k.dLabel);
  k = K([L('2026-08-01', 11.6), B('2026-09-02', 12)]);
  ok('retour au poids du corps, une seule séance depuis : pas d\'écart inventé', k.dLabel === '' && k.lLabel === '12 reps PdC' && k.note === 'retour au poids du corps le 02/09', JSON.stringify(k));
}
ok('la carte de charge s\'en sert', /_pevoKpiCharge\(kq\)/.test(fn('_renderPevoCharts')));

/* ── 2. L'unité « Cycle » ────────────────────────────────────────────────── */
console.log('\n2. L\'unité « Cycle »');
const fait = d => ({ checked: true, checkedAt: d });
const CYCLES = [
  { id: 'a', nom: 'Mobilité', mode: 'duree', startDate: '2026-06-01', duree: 4 },
  { id: 'b', nom: 'Force', mode: 'duree', startDate: '2026-06-29', endDate: '2026-08-09', duree: 6 },
  { id: 'c', nom: 'Retour course', mode: 'criteres', startDate: '2026-08-10',
    phases: [{ id: 'p1', nom: '', criteria: ['x', 'y'], checks: { 0: fait('2026-08-20T09:00:00Z'), 1: fait('2026-08-30T10:00:00Z') } }] },
  { id: 'd', nom: 'Plio', mode: 'duree', startDate: '2026-08-31', duree: 6 },
  { id: 'e', nom: 'Futur', mode: 'duree', startDate: '2026-10-12', duree: 3 },
  { id: 'f', nom: 'Sans date', mode: 'duree', duree: 3 }
];
const BASE = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoFmtCourt', '_pevoBuckets',
              '_pevoPeriodesCycles', '_pevoPeriodeCycle', '_pevoPeriode', '_pevoPeriodePerso', '_pevoPeriodeCourante',
              '_pevoAppliquerPeriode', '_pevoPrefCle', '_pevoSauverPref', 'setPevoUnite', 'pevoDecaler', '_renderPevoFilterBar'];
function banc(cycles, dec) {
  return new Function('_cycles', '_renderPevoCharts', '_pevoGetSel', '_progPatient', '_pevoData', 'escH',
    'var _pevoUnite = "cycle", _pevoDecalage = ' + (dec || 0) + ', _pevoFilterDays = null, _pevoFilterFrom = "", _pevoFilterTo = "",'
    + ' _pevoShowFuture = false, _pevoProgPortee = "tout";\n'
    + 'function _pevoAujourdhuiIso(){ return "' + AUJ + '"; }\n' + BASE.map(fn).join('\n')
    + '\nreturn { liste:function(){ return _pevoPeriodesCycles(_cycles, "' + AUJ + '"); }, per:function(d){ return _pevoPeriode("cycle", d, "' + AUJ + '"); },'
    + ' etat:function(){ return { u:_pevoUnite, d:_pevoDecalage, de:_pevoFilterFrom, a:_pevoFilterTo }; }, dec:pevoDecaler, unite:setPevoUnite,'
    + ' barre:_renderPevoFilterBar, appliquer:_pevoAppliquerPeriode };')(
    cycles, () => {}, () => new Set(), null, {}, s => String(s == null ? '' : s));
}
let C = null;
try { C = banc(CYCLES); } catch (e) { ok('les fonctions de cycle existent', false, e.message); }
if (C) {
  const li = C.liste();
  ok('seuls les cycles datés et commencés deviennent des périodes, dans l\'ordre', li.map(x => x.nom).join(',') === 'Mobilité,Force,Retour course,Plio', li.map(x => x.nom).join(','));
  ok('un cycle à durée sans date de fin va de son début + sa durée (4 sem. → 28 juin)', li[0] && li[0].fin === '2026-06-28', li[0] && li[0].fin);
  ok('un cycle à critères validé s\'arrête à son dernier critère coché (30 août)', li[2] && li[2].debut === '2026-08-10' && li[2].fin === '2026-08-30', li[2] && li[2].debut + '→' + li[2].fin);
  let p = C.per(0);
  ok('aujourd\'hui : le cycle EN COURS (Plio)', p && p.debut === '2026-08-31' && p.enCours === true, JSON.stringify(p && [p.debut, p.fin, p.enCours]));
  ok('… nommé en clair', p && /Plio/.test(p.libelle) && /en cours/.test(p.libelle), p && p.libelle);
  ok('… comparé au cycle précédent (Retour course, 10 → 30 août)', p && p.refDebut === '2026-08-10' && p.refFin === '2026-08-30', p && p.refDebut + '→' + p.refFin);
  ok('… RAMENÉ À LA MÊME DURÉE : 12 jours écoulés contre 21', p && Math.abs(p.echelle - 12 / 21) < 1e-9, p && p.echelle);
  ok('… et la phrase le dit', p && /Retour course/.test(p.compare) && /même durée/.test(p.compare), p && p.compare);
  ok('… une barre par semaine, qui ouvre la semaine', p && p.buckets.length >= 2 && p.sousUnite === 'semaine');
  p = C.per(-1);
  ok('‹ : Retour course, comparé à Force ramené à la même durée (21 j contre 42 → ½)', p && /Retour course/.test(p.libelle) && Math.abs(p.echelle - 0.5) < 1e-9, p && p.libelle + ' · ' + p.echelle);
  p = C.per(-3);
  ok('le premier cycle n\'a rien à comparer', p && /Mobilité/.test(p.libelle) && !p.refDebut && /premier cycle/i.test(p.compare), p && p.compare);
  ok('au-delà du premier cycle, plus de période', C.per(-4) === null);

  const enCours = banc([{ id: 'c2', nom: 'Genou', mode: 'criteres', startDate: '2026-08-20',
    phases: [{ id: 'p', nom: '', criteria: ['a', 'b'], checks: { 0: fait('2026-08-25T08:00:00Z') } }] }]);
  const pc = enCours.per(0);
  ok('un cycle à critères non validé court jusqu\'à aujourd\'hui', pc && pc.fin === AUJ && pc.enCours === true, pc && pc.fin);

  const nav = banc(CYCLES, -3); nav.appliquer();
  nav.dec(-1);
  ok('‹ ne recule pas avant le premier cycle', nav.etat().d === -3, JSON.stringify(nav.etat()));
  nav.dec(1);
  ok('› passe au cycle suivant, et les courbes suivent', nav.etat().d === -2 && nav.etat().de === '2026-06-29', JSON.stringify(nav.etat()));
  ok('la barre propose « Cycle » quand le patient en a', />Cycle</.test(nav.barre()));
  ok('… et ne le propose pas sinon', !/>Cycle</.test(banc([]).barre()));
}

/* Le volume : la référence est ramenée à la même durée. */
function tranche(src, deb, fin) { const d = src.indexOf(deb), f = src.indexOf(fin, d + 1); return d < 0 || f < d ? '' : src.slice(d, f); }
/* Les repères des barres (qualite/volume-axe-cas.js) lisent les dates : on
   joint les fonctions de période, tirées du vrai fichier. */
const codeVol = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoAujourdhuiIso', '_pevoFmtCourt'].map(fn).join('\n')
  + tranche(pdata, "/* ── Volume d'entrainement par sport — trois vues", "/* ── Fin de volume-sport.js");
const S = new Function(tranche(pdata, 'var R4P_SPORTS = [', "/* ── Période de l'Évolution") + '\nreturn { S:R4P_SPORTS, A:R4P_SPORT_AUTRE };')();
const pj = () => [0, 1, 2, 3, 4, 5, 6].map(() => ({ dist: 0, duree: 0, charge: 0, n: 0 }));
const sem = (debut, km) => { const p = pj(); p[1] = { dist: km * 1000, duree: 1800, charge: 100, n: 1 };
  return { debut, sports: { course: { dist: km * 1000, duree: 1800, charge: 100, n: 1, parJour: p } } }; };
const V = { sports: S.S.concat([S.A]), semaines: [sem('2026-08-31', 20), sem('2026-09-07', 10)] };
const PER = { unite: 'cycle', debut: '2026-09-07', fin: '2026-09-13', refDebut: '2026-08-31', refFin: '2026-09-06', echelle: 0.5,
              libelle: 'Cycle « Test »', compare: 'Comparé à « Avant », ramené à la même durée.', sousUnite: 'semaine',
              buckets: [{ debut: '2026-09-07', fin: '2026-09-13' }] };
let hV = '';
try { hV = new Function('escH', 'V', 'PER', codeVol + '\nreturn _volHtml(V, PER);')(s => String(s == null ? '' : s), V, PER); } catch (e) { ok('le volume accepte une échelle', false, e.message); }
ok('10 km contre 20 km ramenés à moitié : « = 0 % »', /vol-d plat"[^>]*>= 0 %/.test(hV), (hV.match(/vol-d [^>]*>[^<]*/) || ['absent'])[0]);

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution, étape 3 : l\'unité Cycle, et des écarts entre choses comparables.');

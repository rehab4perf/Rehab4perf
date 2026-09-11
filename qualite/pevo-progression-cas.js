#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution des charges — un sélecteur, deux lectures

   Le sélecteur de période (unité + flèches) a posé une question que la piste 1
   n'avait pas tranchée : que deviennent les COURBES de progression ?

   Chaque graphique n'était dessiné qu'avec deux points DANS la période, sinon
   il disparaissait sans un mot. Depuis l'ouverture sur « Mois », un exercice
   fait une fois en septembre n'avait plus de courbe — et la liste annonçait
   pourtant « 2 séances ». Même sort pour la charge UA « par semaine » en unité
   Semaine : il lui faut deux semaines.

   Décision du praticien — une seule période, deux lectures :
   - la CHARGE (volume, répartition, UA) est une quantité : elle suit la
     période ;
   - la PROGRESSION (charge estimée par exercice, durées, cardio, douleur CAP)
     est une trajectoire : ses courbes gardent TOUT l'historique, la période y
     est une bande, et les chiffres de tête (début → actuel) portent sur la
     période. « Période seule » reste possible, par un interrupteur.
   Et plus aucun graphique ne disparaît en silence : il dit pourquoi.

     node qualite/pevo-progression-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const pdata = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = nom => { const d = pdata.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };
const AUJ = '2026-09-11';
const PERIODE = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoFmtCourt', '_pevoBuckets',
                 '_pevoPeriode', '_pevoPeriodePerso', '_pevoPeriodeCourante', '_pevoAppliquerPeriode', '_renderPevoFilterBar', '_pevoFilterPts'];
const BANDE = ['_pevoBandeIdx', '_pevoBandeSvg', '_pevoBande', '_pevoProgTete', '_pevoPtsProg', '_pevoKpiPeu', '_pevoCarteVide'];

/* ── La bande : quels points tombent dans la période ─────────────────────── */
console.log('\nLa bande de période');
let B = null;
try { B = new Function(BANDE.slice(0, 2).map(fn).join('\n') + '\nreturn { idx:_pevoBandeIdx, svg:_pevoBandeSvg };')(); }
catch (e) { ok('les fonctions de bande existent', false, e.message); }
if (B) {
  const iso = ['2026-07-01', '2026-08-05', '2026-09-02', '2026-09-09'];
  const r = B.idx(iso, { de: '2026-09-01', a: '2026-09-30' });
  ok('septembre couvre les points 3 et 4', r && r.i0 === 2 && r.i1 === 3, JSON.stringify(r));
  ok('une période sans point n\'a pas de bande', B.idx(iso, { de: '2026-06-01', a: '2026-06-30' }) === null);
  const s = B.svg(i => 10 + i * 100, 4, 2, 3, 10, 310, 18, 80);
  ok('la bande couvre ses points, avec une demi-marge de chaque côté', /class="pevo-bande"/.test(s) && /x="160\.0"/.test(s) && /width="150\.0"/.test(s), s);
}

/* ── Le rendu du panneau, exécuté ────────────────────────────────────────── */
function banc(etat) {
  const corps = { innerHTML: '' };
  const code = 'var _pevoUnite = ' + JSON.stringify(etat.unite || 'mois') + ', _pevoDecalage = 0, _pevoFilterDays = null,'
    + ' _pevoFilterFrom = "", _pevoFilterTo = "", _pevoShowFuture = false, _pevoProgPortee = ' + JSON.stringify(etat.portee || 'tout') + ';\n'
    + 'var _pevoChartCtr = 0, _pevoUaMode = "seance";\n'
    + 'function _pevoAujourdhuiIso(){ return "' + AUJ + '"; }\n'
    + PERIODE.concat(BANDE, ['_pevoUneSeule', '_buildPevoChart', '_renderPevoCharts']).map(fn).join('\n')
    + '\nreturn function(ex, sel){ _renderPevoCharts(ex, sel); return document.getElementById("pevoBody").innerHTML; };';
  return new Function('document', '_pevoDureeData', '_pevoCardioData', '_pevoCapPainData', '_pevoNrsData', '_progPatient',
    '_pevoSelecteurHtml', '_pevoZoneIndex', '_attachPevoEvents', '_buildUaTrendSection', '_volFenetreSemaines', '_volHtml',
    '_volumeParSport', 'escH', '_pevoGetSel', '_pevoData', code)(
    { getElementById: () => corps }, null, null, null, null, null,
    () => '', () => ({}), () => {}, () => '', () => 52, () => '', () => ({}), s => String(s == null ? '' : s), () => new Set(), {});
}
const pt = (date, kg) => ({ date, rm1: kg, kg, reps: 5, bw: false });
const EXO = {
  squat: { label: 'Squat', points: [pt('2026-07-01', 60), pt('2026-08-05', 65), pt('2026-09-02', 70)] },
  fente: { label: 'Fente', points: [pt('2026-07-10', 20), pt('2026-09-03', 24), pt('2026-09-09', 26)] }
};
/* Une carte, isolée par son balisage EXACT : `<div class="pevo-card` seul
   attraperait aussi `pevo-card-header` et `pevo-card-kpis`. */
const carte = (h, nom) => {
  const i = h.indexOf('pevo-card-title">' + nom + '<'); if (i < 0) return '';
  const d = h.lastIndexOf('<div class="pevo-card">', i); const f = h.indexOf('<div class="pevo-card">', i);
  return h.slice(d < 0 ? 0 : d, f > 0 ? f : undefined);
};

console.log('\nProgression : tout l\'historique, la période en bande');
let h = '';
try { h = banc({ unite: 'mois', portee: 'tout' })(EXO, new Set(['squat', 'fente'])); } catch (e) { ok('le panneau se rend', false, e.message); }
let c = carte(h, 'Squat');
ok('un exercice fait UNE fois en septembre garde sa courbe', /<svg/.test(c), c.slice(0, 200) || 'carte absente');
ok('… sur tout son historique (trois points)', (c.match(/<circle[^>]*fill="#fff"|r="4\.5"/g) || []).length >= 3, (c.match(/<circle/g) || []).length + ' cercles');
ok('… avec la période en bande', /class="pevo-bande"/.test(c));
ok('… et ses chiffres de tête disent qu\'il n\'y a qu\'une séance sur la période', /1 séance sur la période/.test(c), (c.match(/pevo-card-kpis">.*?<\/div>/) || [''])[0]);
c = carte(h, 'Fente');
ok('deux séances en septembre : début → actuel PORTENT SUR LA PÉRIODE (24 → 26 kg)', /24\.0kg/.test(c) && /26\.0kg/.test(c) && !/Début : 20\.0kg/.test(c),
   (c.match(/pevo-card-kpis">.*?<\/div>/) || [''])[0]);
ok('l\'interrupteur « Toute la rééducation / Période seule » est proposé', /setPevoPortee\('tout'\)/.test(h) && /setPevoPortee\('periode'\)/.test(h));

console.log('\nProgression : période seule');
try { h = banc({ unite: 'mois', portee: 'periode' })(EXO, new Set(['squat', 'fente'])); } catch (e) { h = ''; ok('le panneau se rend', false, e.message); }
c = carte(h, 'Squat');
ok('une seule séance sur la période : la carte le DIT, au lieu de disparaître', /1 séance/.test(c) && !/<svg/.test(c), c.slice(0, 240) || 'carte absente');
ok('… et propose de revoir toute la rééducation', /setPevoPortee\('tout'\)/.test(c));
c = carte(h, 'Fente');
ok('deux séances sur la période : la courbe de la période', /<svg/.test(c) && !/class="pevo-bande"/.test(c));

console.log('\n« Tout » : pas de bande, pas d\'interrupteur');
try { h = banc({ unite: 'tout', portee: 'tout' })(EXO, new Set(['squat'])); } catch (e) { h = ''; ok('le panneau se rend', false, e.message); }
ok('ni bande ni interrupteur quand rien n\'est borné', !/pevo-bande/.test(h) && !/setPevoPortee/.test(h));
ok('… et début → actuel portent sur tout l\'historique', /Début : 60\.0kg/.test(carte(h, 'Squat')));

/* ── La charge UA ne disparaît plus ──────────────────────────────────────── */
console.log('\nLa charge UA');
function ua(unite, map, mode) {
  const code = 'var _pevoUnite = ' + JSON.stringify(unite) + ', _pevoDecalage = 0, _pevoFilterDays = null, _pevoFilterFrom = "", _pevoFilterTo = "",'
    + ' _pevoShowFuture = false, _pevoChartCtr = 0, _pevoUaMode = ' + JSON.stringify(mode) + ';\n'
    + 'function _pevoAujourdhuiIso(){ return "' + AUJ + '"; }\n'
    + PERIODE.map(fn).join('\n') + fn('_buildUaTrendSection')
    + '\n_pevoAppliquerPeriode(); return _buildUaTrendSection();';
  return new Function('_buildUaMap', '_getMondayOf', '_dateStr', '_buildUaWeekChart', '_buildUaSeanceChart', 'escH', code)(
    () => map, d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; },
    d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    () => '<svg id="par-semaine"></svg>', () => '<svg id="par-seance"></svg>', s => String(s));
}
let u = '';
try { u = ua('semaine', { '2026-09-08': 300, '2026-09-10': 200 }, 'semaine'); } catch (e) { ok('la section UA se rend', false, e.message); }
ok('en unité Semaine, « par semaine » passe d\'elle-même par séance', /par-seance/.test(u) && !/par-semaine/.test(u), u.slice(0, 200) || 'section absente');
try { u = ua('mois', { '2026-09-08': 300 }, 'seance'); } catch (e) { u = ''; }
ok('une seule séance notée sur la période : la section le DIT', /1 séance notée/.test(u), u.slice(0, 200) || 'section absente');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution : la charge suit la période, la progression garde son histoire.');

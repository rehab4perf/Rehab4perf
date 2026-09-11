#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution des charges — une période, c'est une unité et un décalage

   Les préréglages « 1 semaine, 1 mois, 3 mois, 6 mois, 1 an » ne donnaient
   qu'une fenêtre glissante qui finit AUJOURD'HUI : impossible de regarder
   mars, ou la semaine d'avant-hier. Et « 1 mois » valait en réalité cinq
   semaines. Décision du praticien (piste 1) :

   - une UNITÉ — Semaine, Mois, Trimestre, Année — et des flèches ‹ › pour
     reculer ou avancer d'une unité, jamais au-delà d'aujourd'hui ;
   - des périodes CALENDAIRES : septembre commence le 1er, pas au lundi de sa
     première semaine ;
   - l'écart se mesure contre la période PRÉCÉDENTE de même unité, coupée au
     même avancement si la période est en cours (1 → 11 sept. contre
     1 → 11 août), entière sinon ;
   - « Tout » et « Personnalisé » restent.

   Exécute les VRAIES fonctions, « aujourd'hui » étant fixé au vendredi
   11 septembre 2026.

     node qualite/pevo-periode-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'volume-sport.js'), 'utf8');   // période et volume : fichier partagé

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu), String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}
const fn = nom => { const d = pdata.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };
const AUJ = '2026-09-11';

/* ── Les périodes, calculées ─────────────────────────────────────────────── */
const noms = ['_pevoIso', '_pevoJour', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoFmtCourt', '_pevoBuckets',
              '_pevoPeriode', '_pevoPeriodePerso'];
let P = null;
try {
  P = new Function(noms.map(fn).join('\n') + '\nreturn { p:_pevoPeriode, perso:_pevoPeriodePerso };')();
} catch (e) { ok('les fonctions de période existent', false, e.message); }
const per = (u, d, auj) => { try { return P.p(u, d, auj || AUJ); } catch (e) { return { erreur: e.message }; } };

console.log('\nMois — calendaire, comparé au mois d\'avant au même jour');
let p = per('mois', 0);
egal('septembre commence le 1er', '2026-09-01', p.debut);
egal('… et finit le 30', '2026-09-30', p.fin);
ok('… il est en cours', p.enCours === true);
egal('… son nom', 'Septembre 2026', p.libelle);
egal('la référence : août, du 1er…', '2026-08-01', p.refDebut);
egal('… au 11, comme aujourd\'hui', '2026-08-11', p.refFin);
ok('la phrase de comparaison le dit', /août/.test(p.compare || '') && /11/.test(p.compare || ''), p.compare);
egal('des barres par semaine du mois, coupées au mois', 5, (p.buckets || []).length);
ok('… la première commence le 1er (un mardi), pas au lundi 31 août',
   p.buckets && p.buckets[0].debut === '2026-09-01' && p.buckets[0].fin === '2026-09-06', JSON.stringify(p.buckets && p.buckets[0]));
p = per('mois', -1);
egal('reculer d\'un mois : août', 'Août 2026', p.libelle);
ok('… période passée, non en cours', p.enCours === false);
ok('… comparée à juillet ENTIER', p.refDebut === '2026-07-01' && p.refFin === '2026-07-31' && /juillet entier/.test(p.compare || ''), p.refDebut + '→' + p.refFin + ' · ' + p.compare);
p = per('mois', 0, '2026-03-31');
egal('un 31 mars, la référence s\'arrête au 28 février', '2026-02-28', p.refFin);

console.log('\nSemaine — du lundi au dimanche');
p = per('semaine', 0);
ok('la semaine du 7 au 13 sept.', p.debut === '2026-09-07' && p.fin === '2026-09-13', p.debut + '→' + p.fin);
egal('… son nom', 'Semaine du 7 au 13 sept.', p.libelle);
ok('… comparée à lundi → vendredi de la précédente', p.refDebut === '2026-08-31' && p.refFin === '2026-09-04', p.refDebut + '→' + p.refFin);
ok('… et la phrase nomme le vendredi', /vendredi/.test(p.compare || ''), p.compare);
egal('… une barre par jour', 7, (p.buckets || []).length);
egal('un dimanche, la semaine est entière des deux côtés', '2026-09-06', per('semaine', 0, '2026-09-13').refFin);
egal('une semaine à cheval sur deux mois se nomme en entier', 'Semaine du 31 août au 6 sept.', per('semaine', -1).libelle);

console.log('\nTrimestre et année');
p = per('trimestre', 0);
ok('T3 2026 : 1er juillet → 30 septembre', p.debut === '2026-07-01' && p.fin === '2026-09-30' && /T3 2026/.test(p.libelle || ''), p.debut + '→' + p.fin + ' ' + p.libelle);
ok('… comparé au T2 arrêté au même avancement (72 jours → 12 juin)', p.refDebut === '2026-04-01' && p.refFin === '2026-06-12', p.refDebut + '→' + p.refFin);
egal('… une barre par semaine', 14, (p.buckets || []).length);
p = per('annee', 0);
ok('2026, comparée à 2025 au même jour', p.debut === '2026-01-01' && p.refDebut === '2025-01-01' && p.refFin === '2025-09-11', p.refDebut + '→' + p.refFin);
egal('… une barre par mois', 12, (p.buckets || []).length);
ok('… et la phrase s\'accorde : l\'année est « arrêtée »', /l'année 2025, arrêtée au même avancement/.test(p.compare || ''), p.compare);
ok('le trimestre, lui, est « arrêté »', /au T2 2026, arrêté au même avancement/.test(per('trimestre', 0).compare || ''), per('trimestre', 0).compare);
p = per('annee', -1);
ok('2025, comparée à 2024 entière', p.libelle === '2025' && p.refDebut === '2024-01-01' && p.refFin === '2024-12-31', p.libelle + ' ' + p.refDebut + '→' + p.refFin);

console.log('\nPersonnalisé et Tout');
let q = null; try { q = P.perso('2026-06-01', '2026-06-30'); } catch (e) { q = { erreur: e.message }; }
ok('une plage personnalisée se compare à la plage de même durée juste avant', q.refDebut === '2026-05-02' && q.refFin === '2026-05-31', q.refDebut + '→' + q.refFin);
ok('« Tout » n\'a pas de période bornée', per('tout', 0) === null);

/* ── La navigation ───────────────────────────────────────────────────────── */
console.log('\nLa navigation');
/* `setPevoUnite` retient l'unité (étape 2) : ses deux helpers viennent avec elle.
   Sans compte dans ce banc, ils n'écrivent rien. */
const nav = ['_pevoPrefCle', '_pevoSauverPref', '_pevoPeriodeCourante', '_pevoAppliquerPeriode', 'setPevoUnite', 'pevoDecaler', 'pevoRevenirAujourdhui', '_renderPevoFilterBar', '_pevoFilterPts'];
let N = null;
try {
  N = new Function('_renderPevoCharts', '_pevoGetSel', '_progPatient', '_pevoData', 'escH',
    'var _pevoUnite = "mois", _pevoDecalage = 0, _pevoFilterDays = null, _pevoFilterFrom = "", _pevoFilterTo = "", _pevoShowFuture = false;\n'
    + 'function _pevoAujourdhuiIso(){ return "' + AUJ + '"; }\n'
    + noms.map(fn).join('\n') + nav.map(fn).join('\n')
    + '\nreturn { etat:function(){ return { u:_pevoUnite, d:_pevoDecalage, de:_pevoFilterFrom, a:_pevoFilterTo }; },'
    + ' unite:setPevoUnite, dec:pevoDecaler, auj:pevoRevenirAujourdhui, barre:_renderPevoFilterBar, filtre:_pevoFilterPts,'
    + ' futur:function(v){ _pevoShowFuture = v; }, appliquer:_pevoAppliquerPeriode };')(
    () => {}, () => [], null, {}, s => String(s == null ? '' : s));
} catch (e) { ok('les fonctions de navigation existent', false, e.message); }
if (N) {
  N.appliquer();
  let e = N.etat();
  ok('par défaut : le mois en cours', e.u === 'mois' && e.d === 0 && e.de === '2026-09-01', JSON.stringify(e));
  N.dec(1); e = N.etat();
  ok('on n\'avance jamais au-delà d\'aujourd\'hui', e.d === 0, JSON.stringify(e));
  N.dec(-1); e = N.etat();
  ok('‹ recule d\'un mois, et les courbes suivent', e.d === -1 && e.de === '2026-08-01' && e.a === '2026-08-31', JSON.stringify(e));
  N.unite('semaine'); e = N.etat();
  ok('changer d\'unité revient à la période en cours', e.u === 'semaine' && e.d === 0 && e.de === '2026-09-07', JSON.stringify(e));
  N.dec(-2); N.auj(); e = N.etat();
  ok('« Aujourd\'hui » ramène à la période en cours', e.d === 0 && e.de === '2026-09-07', JSON.stringify(e));
  N.unite('tout'); e = N.etat();
  ok('« Tout » lève toutes les bornes', e.de === '' && e.a === '', JSON.stringify(e));

  N.unite('mois'); N.dec(-1);
  const h = N.barre();
  ['Semaine', 'Mois', 'Trimestre', 'Année', 'Tout', 'Personnalisé'].forEach(u =>
    ok('la barre propose « ' + u + ' »', new RegExp('>' + u + '<').test(h)));
  ok('… affiche la période en clair', /Août 2026/.test(h));
  ok('… porte les flèches ‹ ›', /pevoDecaler\(-1\)/.test(h) && /pevoDecaler\(1\)/.test(h));
  ok('… et « Aujourd\'hui » quand on a reculé', /pevoRevenirAujourdhui\(\)/.test(h));
  ok('les anciens préréglages ont disparu', !/1 mois<|3 mois<|6 mois<|setPevoFilter\(/.test(h));
  N.dec(1);
  ok('sur la période en cours, la flèche › est désactivée', /pevoDecaler\(1\)"[^>]*disabled|disabled[^>]*pevoDecaler\(1\)/.test(N.barre()));

  /* En « Programmé », une période PASSÉE ne montre pas les séances d'après. */
  N.dec(-1); N.futur(true);
  const pts = N.filtre([{ date: '2026-08-15' }, { date: '2026-09-02' }]);
  ok('en « Programmé », une période passée reste bornée', pts.length === 1 && pts[0].date === '2026-08-15', JSON.stringify(pts));
}

/* ── Le volume, sur la période exacte ────────────────────────────────────── */
console.log('\nLe volume suit la période exacte');
function tranche(src, deb, fin) { const d = src.indexOf(deb), f = src.indexOf(fin, d + 1); return d < 0 || f < d ? '' : src.slice(d, f); }
/* Les repères des barres (qualite/volume-axe-cas.js) lisent les dates : on
   joint les fonctions de période, tirées du vrai fichier. */
const codeVol = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoAujourdhuiIso', '_pevoFmtCourt'].map(fn).join('\n')
  + tranche(pdata, "/* ── Volume d'entrainement par sport — trois vues", "/* ── Fin de volume-sport.js");
const S = new Function(tranche(pdata, 'var R4P_SPORTS = [', "/* ── Période de l'Évolution") + '\nreturn { S:R4P_SPORTS, A:R4P_SPORT_AUTRE };')();
function semainesAvec(km) {                               // km : { 'AAAA-MM-JJ': km }
  const out = [];
  for (let d = new Date('2026-07-27T00:00:00'); d <= new Date('2026-09-07T00:00:00'); d.setDate(d.getDate() + 7)) {
    const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    const pj = [0, 1, 2, 3, 4, 5, 6].map(() => ({ dist: 0, duree: 0, charge: 0, n: 0 }));
    const c = { dist: 0, duree: 0, charge: 0, n: 0, parJour: pj };
    for (let j = 0; j < 7; j++) {
      const jour = new Date(d); jour.setDate(jour.getDate() + j);
      const k = km[iso(jour)]; if (!k) continue;
      pj[j] = { dist: k * 1000, duree: k * 300, charge: k * 10, n: 1 };
      c.dist += k * 1000; c.duree += k * 300; c.charge += k * 10; c.n += 1;
    }
    out.push({ debut: iso(d), sports: c.n ? { course: c } : {} });
  }
  return out;
}
/* 31 août : lundi de la 1re semaine de septembre, mais en AOÛT. 20 août : hors référence (1 → 11). */
const V = { sports: S.S.concat([S.A]), jourCourant: 4,
            semaines: semainesAvec({ '2026-08-05': 10, '2026-08-20': 10, '2026-08-31': 10, '2026-09-02': 10, '2026-09-10': 5 }) };
let h = '';
try {
  h = new Function('escH', 'V', 'PER', codeVol + '\nreturn _volHtml(V, PER);')(s => String(s == null ? '' : s), V, per('mois', 0));
} catch (e) { ok('_volHtml accepte une période', false, e.message); }
const val = ((h.match(/vol-t-val">([^<]*)/) || [])[1] || '').trim();
egal('septembre en cours : 10 + 5 km — le 31 août n\'y est pas', '15', val);
egal('… contre 1 → 11 août : 10 km — le 20 août n\'y est pas', '▲ +50 %', ((h.match(/vol-d [a-z]+"[^>]*>([^<]*)</) || [])[1] || '').trim());
ok('… le titre nomme la période', /Septembre 2026/.test(h), (h.match(/<div class="vol-titre">.*?<\/div>/) || ['absent'])[0]);
ok('… l\'écart dit à quoi il se compare', /title="[^"]*août[^"]*"/.test(h));
/* Seules les barres VISIBLES comptent : chacune porte aussi une zone cliquable
   transparente sur toute sa hauteur (étape 2 : une barre ouvre sa période). */
egal('… une barre par semaine du mois', 5, ((h.match(/<svg class="vol-spark"[\s\S]*?<\/svg>/) || [''])[0].match(/<rect(?![^>]*fill="transparent")/g) || []).length);
ok('… « 2 séances sur la période »', /2 séances sur la période/.test(h));
/* La semaine du 7 au 13 sept. ne porte qu'une sortie (le 10) : singulier. */
let h1 = '';
try { h1 = new Function('escH', 'V', 'PER', codeVol + '\nreturn _volHtml(V, PER);')(s => String(s == null ? '' : s), V, per('semaine', 0)); } catch (e) {}
ok('une seule séance s\'écrit au singulier', /1 séance sur la période/.test(h1) && !/1 séances/.test(h1),
   (h1.match(/\d+ séances? sur la période/) || ['absent'])[0]);

/* ── Le branchement ──────────────────────────────────────────────────────── */
console.log('\nLe branchement');
ok('le panneau passe la période au volume', /_volHtml\(_volumeParSport\(.+\), *_pevoPer\)/.test(pdata) || /_volHtml\(_volumeParSport\([^)]*\), *per\b/.test(pdata));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution des charges : les périodes se choisissent par unité et se comparent à la précédente.');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Évolution des charges — étape 2 : la période se lit, se retient, se parcourt

   Cinq améliorations validées par le praticien après la piste 1 :
   1. l'export HTML/PDF NOMME la période — il n'en disait rien, et c'est un
      document qui peut partir chez un médecin ;
   2. l'unité et l'étendue des courbes sont RETENUES, par compte : on rouvre sur
      sa vue, toujours sur la période en cours ;
   3. ← → au clavier et le glissement du doigt changent de période ;
   4. « Tout » couvre TOUT l'historique — il s'arrêtait à 52 semaines, sous
      l'ancienne phrase de comparaison ;
   5. un clic sur une barre OUVRE sa période (la semaine d'un mois, le mois
      d'une année).

   Exécute les VRAIES fonctions, « aujourd'hui » étant le vendredi
   11 septembre 2026.

     node qualite/pevo-etape2-cas.js
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
const BASE = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoFmtCourt', '_pevoBuckets',
              '_pevoPeriode', '_pevoPeriodePerso', '_pevoPeriodeTout', '_pevoPremiereDate', '_pevoPeriodeCourante',
              '_pevoAppliquerPeriode', '_pevoLibelleExport', '_pevoPrefCle', '_pevoSauverPref', '_pevoChargerPref',
              'setPevoUnite', 'setPevoPortee', 'pevoDecaler', 'pevoRevenirAujourdhui', 'pevoOuvrirPeriode',
              '_pevoClavier', '_pevoSensGlisse'];

function banc(opts) {
  opts = opts || {};
  const stock = new Map(Object.entries(opts.stock || {}));
  const appels = [];
  const code = 'var _pevoUnite = ' + JSON.stringify(opts.unite || 'mois') + ', _pevoDecalage = ' + (opts.decalage || 0) + ','
    + ' _pevoFilterDays = null, _pevoFilterFrom = "", _pevoFilterTo = "", _pevoShowFuture = false, _pevoProgPortee = '
    + JSON.stringify(opts.portee || 'tout') + ';\n'
    + 'function _pevoAujourdhuiIso(){ return "' + AUJ + '"; }\n'
    + BASE.map(fn).join('\n')
    + '\nreturn { etat:function(){ return { u:_pevoUnite, d:_pevoDecalage, p:_pevoProgPortee, de:_pevoFilterFrom, a:_pevoFilterTo }; },'
    + ' unite:setPevoUnite, portee:setPevoPortee, dec:pevoDecaler, auj:pevoRevenirAujourdhui, ouvrir:pevoOuvrirPeriode,'
    + ' charger:_pevoChargerPref, appliquer:_pevoAppliquerPeriode, export:_pevoLibelleExport, clavier:_pevoClavier,'
    + ' glisse:_pevoSensGlisse, tout:_pevoPeriodeTout, premiere:_pevoPremiereDate, courante:_pevoPeriodeCourante };';
  const api = new Function('R4P_KEYS', 'localStorage', '_cleCompte', '_renderPevoCharts', '_pevoGetSel', '_progPatient', '_pevoData',
    '_stravaActivities', '_cloudCalEvents', 'document', code)(
    { PEVO_PREF: 'r4p-pevo-pref' },
    { getItem: k => stock.has(k) ? stock.get(k) : null, setItem: (k, v) => stock.set(k, String(v)) },
    b => opts.sansCompte ? null : b + ':uid-demo', () => appels.push('rendu'), () => new Set(), null, {},
    opts.strava || [], opts.seances || [],
    { getElementById: id => id === 'pevoOverlay' ? { classList: { contains: () => opts.ouvert !== false } } : null });
  return { api, stock, appels };
}

/* ── 1. L'export nomme la période ────────────────────────────────────────── */
console.log('\n1. L\'export nomme la période');
let b = null;
try { b = banc(); b.api.appliquer(); } catch (e) { ok('les fonctions existent', false, e.message); }
if (b) {
  ok('le mois en cours, et ce que montrent les courbes', /Septembre 2026/.test(b.api.export()) && /toute la rééducation/.test(b.api.export()), b.api.export());
  b.api.portee('periode');
  ok('… « période seule » se dit aussi', /période seule/.test(b.api.export()), b.api.export());
  b.api.unite('tout');
  ok('« Tout » se dit « tout l\'historique »', /tout l'historique/i.test(b.api.export()), b.api.export());
}
ok('l\'export s\'en sert, dans son titre et sous le patient',
   (() => { const e = fn('_buildPevoExportHTML'); return (e.match(/_pevoLibelleExport\(\)/g) || []).length >= 1 && /<title>[^']*'\s*\+\s*_pevoPer|_pevoLibelleExport/.test(e); })());

/* ── 2. L'unité et l'étendue sont retenues, par compte ───────────────────── */
console.log('\n2. Retenues d\'une ouverture à l\'autre');
if (b) {
  b = banc(); b.api.unite('semaine'); b.api.portee('periode');
  const pref = b.stock.get('r4p-pevo-pref:uid-demo');
  ok('le choix est rangé sous la clé DU COMPTE', !!pref && /semaine/.test(pref) && /periode/.test(pref), String(pref));
  const b2 = banc({ stock: { 'r4p-pevo-pref:uid-demo': pref } });
  b2.api.charger(); let e = b2.api.etat();
  ok('à la réouverture : même unité, même étendue', e.u === 'semaine' && e.p === 'periode', JSON.stringify(e));
  ok('… et toujours la période EN COURS', e.d === 0 && e.de === '2026-09-07', JSON.stringify(e));
  const b3 = banc({ stock: { 'r4p-pevo-pref:uid-demo': JSON.stringify({ unite: 'perso', portee: 'tout' }) } });
  b3.api.charger();
  ok('une plage personnalisée ne se rouvre pas (ses dates sont d\'hier) : on repart sur le mois', b3.api.etat().u === 'mois');
  const b4 = banc({ sansCompte: true }); b4.api.unite('annee');
  ok('sans compte identifié, rien n\'est écrit', b4.stock.size === 0);
  const b5 = banc({ stock: { 'r4p-pevo-pref:uid-demo': '{pas du json' } });
  let casse = false; try { b5.api.charger(); } catch (x) { casse = true; }
  ok('une préférence illisible est ignorée', !casse && b5.api.etat().u === 'mois');
}

/* ── 3. Clavier et glissement ────────────────────────────────────────────── */
console.log('\n3. Clavier et glissement');
if (b) {
  b = banc({ decalage: -2 }); b.api.appliquer();
  const ev = (key, tag) => { const e = { key, target: { tagName: tag || 'DIV', isContentEditable: false }, arretee: false, preventDefault() { this.arretee = true; } }; b.api.clavier(e); return e; };
  let e = ev('ArrowLeft');
  ok('← recule d\'une période', b.api.etat().d === -3 && e.arretee, JSON.stringify(b.api.etat()));
  ev('ArrowRight'); ev('ArrowRight');
  ok('→ avance', b.api.etat().d === -1);
  ev('ArrowLeft', 'INPUT');
  ok('… mais jamais quand on tape dans un champ', b.api.etat().d === -1);
  const bf = banc({ ouvert: false }); bf.api.appliquer();
  bf.api.clavier({ key: 'ArrowLeft', target: { tagName: 'DIV' }, preventDefault() {} });
  ok('… ni quand l\'Évolution est fermée', bf.api.etat().d === 0);
  ok('glisser vers la droite = revenir en arrière', b.api.glisse(100, 200, 220, 210) === -1);
  ok('glisser vers la gauche = avancer', b.api.glisse(300, 200, 150, 190) === 1);
  ok('un glissement vertical ne change rien (c\'est un défilement)', b.api.glisse(100, 100, 150, 300) === 0);
  ok('un petit geste non plus', b.api.glisse(100, 100, 130, 105) === 0);
}

/* ── 4. « Tout » couvre tout l'historique ────────────────────────────────── */
console.log('\n4. « Tout » : tout l\'historique');
if (b) {
  const bt = banc({ unite: 'tout',
    strava: [{ date: '2026-04-20T08:00:00' }, { date: '2026-02-03T07:00:00' }],
    seances: [{ date: '2026-03-01' }, { date: '2027-01-01' }] });
  ok('la première date connue — Strava ou séance —, jamais le futur', bt.api.premiere() === '2026-02-03', bt.api.premiere());
  const t = bt.api.tout('2026-02-03', AUJ);
  ok('la période « Tout » va de la première activité à aujourd\'hui', t && t.debut === '2026-02-03' && t.fin === AUJ, JSON.stringify(t && [t.debut, t.fin]));
  ok('… se nomme depuis sa première date', t && /févr\. 2026/.test(t.libelle), t && t.libelle);
  ok('… une barre par mois (février → septembre)', t && t.buckets.length === 8, t && t.buckets.length);
  ok('… et n\'a pas de période de comparaison', t && !t.refDebut && /rien à comparer|pas de comparaison/i.test(t.compare), t && t.compare);
}
ok('le panneau passe « Tout » au volume, depuis la première date',
   /_pevoPeriodeTout\(_pevoPremiereDate\(\)/.test(fn('_renderPevoCharts')) || /_pevoPeriodeTout\(_prem/.test(fn('_renderPevoCharts')));
/* Le volume sans référence : aucun écart inventé. */
function tranche(src, deb, fin) { const d = src.indexOf(deb), f = src.indexOf(fin, d + 1); return d < 0 || f < d ? '' : src.slice(d, f); }
/* Les repères des barres (qualite/volume-axe-cas.js) lisent les dates : on
   joint les fonctions de période, tirées du vrai fichier. */
const codeVol = ['_pevoJour', '_pevoIso', '_pevoPlus', '_pevoLundi', '_pevoFinMois', '_pevoAujourdhuiIso', '_pevoFmtCourt'].map(fn).join('\n')
  + tranche(pdata, "/* ── Volume d'entrainement par sport — trois vues", "/* ── Fin de volume-sport.js");
const S = new Function(tranche(pdata, 'var R4P_SPORTS = [', "/* ── Période de l'Évolution") + '\nreturn { S:R4P_SPORTS, A:R4P_SPORT_AUTRE };')();
const pj = () => [0, 1, 2, 3, 4, 5, 6].map(() => ({ dist: 0, duree: 0, charge: 0, n: 0 }));
const semaine = (debut, jour, km) => { const p = pj(); p[jour] = { dist: km * 1000, duree: 1800, charge: 100, n: 1 };
  return { debut, sports: { course: { dist: km * 1000, duree: 1800, charge: 100, n: 1, parJour: p } } }; };
const V = { sports: S.S.concat([S.A]), semaines: [semaine('2026-08-31', 2, 10), semaine('2026-09-07', 3, 5)] };
let hT = '';
try { hT = new Function('escH', 'V', 'PER', codeVol + '\nreturn _volHtml(V, PER);')(s => String(s == null ? '' : s), V, banc().api.tout('2026-08-01', AUJ)); }
catch (e) { ok('le volume accepte la période « Tout »', false, e.message); }
ok('« Tout » : le volume compte tout (15 km), sans écart inventé', /vol-t-val">15</.test(hT) && /vol-d plat[^>]*>—/.test(hT), (hT.match(/vol-t-val">[^<]*|vol-d [^>]*>[^<]*/g) || []).join(' | '));

/* ── 5. Un clic sur une barre ouvre sa période ───────────────────────────── */
console.log('\n5. Une barre ouvre sa période');
if (b) {
  b = banc(); b.api.appliquer();
  b.api.ouvrir('semaine', '2026-08-12');
  let e = b.api.etat();
  ok('la barre d\'une semaine d\'août ouvre CETTE semaine (10 → 16 août)', e.u === 'semaine' && e.de === '2026-08-10' && e.a === '2026-08-16', JSON.stringify(e));
  b.api.ouvrir('mois', '2026-03-15'); e = b.api.etat();
  ok('la barre de mars ouvre mars', e.u === 'mois' && e.de === '2026-03-01' && e.a === '2026-03-31', JSON.stringify(e));
  b.api.ouvrir('mois', '2027-01-15'); e = b.api.etat();
  ok('… jamais au-delà d\'aujourd\'hui', e.d === 0 && e.de === '2026-09-01', JSON.stringify(e));
  ok('le mois se découpe en semaines, l\'année en mois', b.api.courante() && (() => {
    const bb = banc({ unite: 'annee' }); return banc().api.courante().sousUnite === 'semaine' && bb.api.courante().sousUnite === 'mois'; })());
}
let hC = '';
try { hC = new Function('escH', 'V', 'PER', codeVol + '\nreturn _volHtml(V, PER);')(s => String(s == null ? '' : s), V, banc().api.courante()); } catch (e) {}
ok('chaque barre du mois porte le lien vers sa semaine', /onclick="pevoOuvrirPeriode\('semaine','2026-09-01'\)"/.test(hC) && /onclick="pevoOuvrirPeriode\('semaine','2026-09-07'\)"/.test(hC),
   (hC.match(/onclick="pevoOuvrirPeriode[^"]*"/g) || ['aucun lien']).slice(0, 3).join(' '));
ok('… et dit ce qu\'elle ouvre, au survol', /<title>[^<]*semaine/i.test(hC));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Évolution, étape 2 : la période se lit, se retient et se parcourt.');

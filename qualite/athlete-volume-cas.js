#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Volume d'entraînement — aussi dans le lien athlète

   Demande du praticien : que l'athlète voie, dans son lien, la répartition de
   ses sports — le bloc « Volume d'entraînement » de l'Évolution des charges,
   et lui seul.

   Le bloc vivait dans `prog-data.js` (rendu) et `prog-main.js` (agrégation),
   que l'espace athlète ne charge pas. Le recopier dans `athlete.html` aurait
   donné deux calculs du même chiffre — et deux calculs finissent toujours par
   diverger : c'est la règle anti-double-comptage qui dérive en premier, puis
   la couleur. Il vit donc dans `js/volume-sport.js`, chargé par les deux pages
   — même principe que `protocoles-ref.js`.

   Ce que ce cas tient :
     - UNE définition de chaque fonction, dans le fichier partagé ;
     - le fichier chargé AVANT `prog-data.js` côté praticien, et côté athlète ;
     - l'athlète récupère ce que le calcul lit (liens Strava ↔ séance, douleur,
       type de programme) — sans quoi il compterait deux fois une séance notée ;
     - pour les mêmes données, l'athlète lit les MÊMES chiffres que le praticien ;
     - aucune commande du praticien dans le lien (ouvrir une période du panneau).

     node qualite/athlete-volume-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..');
const lire = f => { try { return fs.readFileSync(path.join(R, f), 'utf8'); } catch (e) { return ''; } };
const vs = lire('js/volume-sport.js');
const pdata = lire('js/prog-data.js');
const pmain = lire('js/prog-main.js');
const ath = lire('athlete.html');
const prog = lire('programme.html');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => nom => { const d = src.indexOf('\nfunction ' + nom + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };

/* ── Une seule définition ────────────────────────────────────────────────── */
console.log('\nUne seule définition, dans le fichier partagé');
ok('js/volume-sport.js existe', vs.length > 0);
['r4pSportDeType', '_pevoJour', '_pevoBuckets', '_pevoPeriode', '_uaFoster', '_stravaChargeEstimate',
 '_volumeParSport', '_fbIsCharge', '_evIsCap', '_volSomme', '_volHtml'].forEach(n => {
  const re = new RegExp('\\nfunction ' + n + '\\(');
  ok(n + ' y vit, et plus dans le programme', re.test(vs) && !re.test(pdata) && !re.test(pmain),
     (re.test(vs) ? '' : 'absente du fichier partagé ; ') + (re.test(pdata) || re.test(pmain) ? 'encore définie dans prog-*.js' : ''));
});
ok('la table des sports aussi', /var R4P_SPORTS = \[/.test(vs) && !/var R4P_SPORTS = \[/.test(pdata));

/* ── Chargé par les deux pages ───────────────────────────────────────────── */
console.log('\nChargé par les deux pages');
const iV = prog.indexOf('src="js/volume-sport.js?v='), iD = prog.indexOf('src="js/prog-data.js?v=');
ok('programme.html le charge AVANT prog-data.js', iV > 0 && iV < iD, 'volume-sport ' + iV + ', prog-data ' + iD);
ok('athlete.html le charge, versionné', /src="js\/volume-sport\.js\?v=\d{8}[a-z]"/.test(ath));

/* ── Ce que l'athlète récupère ───────────────────────────────────────────── */
console.log('\nL\'athlète récupère ce que le calcul lit');
const selS = (ath.match(/seances_planifiees\?patient_id[\s\S]{0,400}?select=([^&']+)/) || [])[1] || '';
const selA = (ath.match(/strava_activities\?patient_id[\s\S]{0,400}?select=([^&']+)/) || [])[1] || '';
ok('les activités Strava portent leur séance (sinon double comptage)', /(^|,)seance_id(,|$)/.test(selA), selA);
ok('les retours portent douleur et exo_data (retour de charge ou de douleur ?)',
   /athlete_feedback\([^)]*douleur/.test(selS) && /athlete_feedback\([^)]*exo_data/.test(selS), selS);
ok('le programme porte son type (séance CAP ?) sans rapatrier tout son contenu',
   /programmes\([^)]*donnees->>type/.test(selS) && !/programmes\([^)]*donnees[,)]/.test(selS), selS);

/* ── Mêmes données, mêmes chiffres ───────────────────────────────────────── */
console.log('\nMêmes données, mêmes chiffres que le praticien');
function lundiPlus(n) {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const escH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* Une séance notée liée à une course, une séance de renforcement notée, une
   séance CAP (sa charge vient de Strava), une sortie vélo libre — sur cette
   semaine et la précédente. Le type CAP arrive sous deux formes : le builder
   lit `donnees` entier, l'athlète n'en demande que `type`. */
const ACTS = [
  { strava_id: 1, date: lundiPlus(0), type: 'Run', distance_m: 10000, duree_s: 3000, charge: 200, seance_id: 's1' },
  { strava_id: 2, date: lundiPlus(0), type: 'Ride', distance_m: 30000, duree_s: 3600, charge: 180 },
  { strava_id: 3, date: lundiPlus(0), type: 'Run', distance_m: 8000, duree_s: 2700, charge: 150, seance_id: 's3' },
  { strava_id: 4, date: lundiPlus(-6), type: 'Ride', distance_m: 25000, duree_s: 3000, charge: 140 }
];
const seances = forme => [
  { id: 's1', date: lundiPlus(0), programmes: { nom: 'Séance 1' }, athlete_feedback: { rpe: 7, duree_min: 45 } },
  { id: 's2', date: lundiPlus(-4), programmes: { nom: 'Renfo' }, athlete_feedback: { rpe: 5, duree_min: 60 } },
  { id: 's3', date: lundiPlus(0), programmes: forme === 'athlete' ? { nom: 'Footing', type: 'cap' } : { nom: 'Footing', donnees: { type: 'cap' } },
    /* Un retour de CHARGE sur une séance CAP : c'est le type qui décide que la
       charge vient de Strava (150), pas du retour (6 × 40 = 240). */
    athlete_feedback: { rpe: 6, duree_min: 40, exo_data: {} } }
];
function contexte(globaux) {
  const ctx = vm.createContext(Object.assign({ console, escH }, globaux));
  try { vm.runInContext(vs, ctx); } catch (e) { ok('volume-sport.js s\'exécute seul', false, e.message); }
  return ctx;
}
const coeur = h => { const a = h.indexOf('<div class="vol-tuiles">'), b = h.indexOf('<div class="vol-cadres">'); return a < 0 || b < a ? '' : h.slice(a, b); };

/* Le praticien : les globales du builder, le rendu du panneau. */
const cP = contexte({ _stravaActivities: ACTS, _cloudCalEvents: seances('programme'), _progPatient: { id: 'p1' } });
/* L'athlète : ses propres globales, et SA fonction de rendu, tirée de la page. */
const athFn = fnDe(ath)('_volAthHtml');
ok('la page athlète a sa fonction de rendu', !!athFn);
const cA = contexte({ _stravaActs: ACTS, _calEvents: seances('athlete'), _volAthUnite: 'semaine', _volAthDec: 0 });
try { vm.runInContext(athFn, cA); } catch (e) { ok('… et elle se charge', false, e.message); }

['semaine', 'mois'].forEach(u => {
  let hP = '', hA = '';
  try {
    hP = vm.runInContext('(function(){ var auj = _pevoAujourdhuiIso(), per = _pevoPeriode("' + u + '", 0, auj);'
      + ' return _volHtml(_volumeParSport(_volNbSemaines(per, auj)), per); })()', cP);
  } catch (e) { hP = 'ERREUR ' + e.message; }
  try { cA._volAthUnite = u; hA = vm.runInContext('_volAthHtml(_pevoAujourdhuiIso())', cA); } catch (e) { hA = 'ERREUR ' + e.message; }
  const kP = coeur(hP), kA = coeur(hA);
  /* Pour CHAQUE unité : en Semaine les barres (des jours) ne s'ouvrent jamais,
     c'est en Mois qu'elles ouvrent une semaine du panneau praticien. */
  ok(u + ' : aucune commande du praticien dans le lien', hA && !/pevoOuvrirPeriode|setPevo|openChargesEvo/.test(hA),
     (hA.match(/onclick="[^"]*"/g) || []).filter(x => !/volAth/.test(x)).join(' '));
  ok(u + ' : les tuiles et la répartition sont identiques', kP && kP === kA,
     !kP ? 'rendu praticien : ' + hP.slice(0, 160) : 'athlète : ' + (kA.slice(0, 160) || hA.slice(0, 160)));
  if (u === 'semaine') {
    ok('… la course notée garde ses kilomètres (10 + 8 km)', /Course à pied/.test(kA) && />18<span class="vol-t-u">km/.test(kA), (kA.match(/>[\d,]+<span class="vol-t-u">km/) || ['absent'])[0]);
    ok('… la séance CAP est reconnue à son type : sa charge vient de Strava (315 + 150 + 180 = 645 UA)',
       />645<span class="vol-t-u">UA/.test(kA), (kA.match(/>\d+<span class="vol-t-u">UA/) || ['absent'])[0]);
    ok('l\'athlète choisit sa période : semaine, mois', /volAthUnite\('semaine'\)/.test(hA) && /volAthUnite\('mois'\)/.test(hA));
    ok('… recule d\'une période', /volAthDecaler\(-1\)/.test(hA));
    ok('… et ne dépasse pas aujourd\'hui', /volAthDecaler\(1\)"[^>]*disabled/.test(hA), (hA.match(/<button[^>]*volAthDecaler\(1\)[^>]*>/) || ['absent'])[0]);
  }
});
/* Le praticien garde ses barres cliquables : le fichier partagé ne les a pas perdues. */
let hPm = '';
try { hPm = vm.runInContext('(function(){ var auj = _pevoAujourdhuiIso(), per = _pevoPeriode("mois", 0, auj);'
  + ' return _volHtml(_volumeParSport(_volNbSemaines(per, auj)), per); })()', cP); } catch (e) {}
ok('le praticien garde ses barres qui ouvrent une période', /pevoOuvrirPeriode\('semaine'/.test(hPm));
let hRecul = '';
try { cA._volAthUnite = 'mois'; cA._volAthDec = -1; hRecul = vm.runInContext('_volAthHtml(_pevoAujourdhuiIso())', cA); } catch (e) { hRecul = 'ERREUR ' + e.message; }
ok('le mois précédent se rend, sans valeur absurde', /vol-bloc/.test(hRecul) && !/NaN|Infinity|undefined|ERREUR/.test(hRecul), hRecul.slice(0, 160));

/* ── Rien à montrer : le dire à l'athlète, pas au praticien ──────────────── */
console.log('\nRien à montrer');
const cV = contexte({ _stravaActs: [], _calEvents: [], _volAthUnite: 'semaine', _volAthDec: 0 });
let hV = '';
try { vm.runInContext(athFn, cV); hV = vm.runInContext('_volAthHtml(_pevoAujourdhuiIso())', cV); } catch (e) { hV = 'ERREUR ' + e.message; }
ok('le bloc reste et s\'explique', /vol-rien/.test(hV) && /Aucune activité/.test(hV), hV.slice(0, 200));
ok('… en s\'adressant à l\'athlète, pas au praticien', !/le patient|onglet Programme/.test(hV), (hV.match(/vol-rien">[\s\S]*?<\/div>/) || [''])[0]);
ok('… et garde de quoi changer de période', /volAthDecaler\(-1\)/.test(hV));

/* ── Posé sur la page, avec sa feuille ───────────────────────────────────── */
console.log('\nPosé sur la page');
const grille = fnDe(ath)('_renderCalGrid');
ok('le calendrier réserve sa place au volume', /id="volSection"/.test(grille) && /_volAthRendre\(\)/.test(grille), grille.slice(0, 200));
['.vol-bloc', '.vol-tuiles', '.vol-rep', '.vol-cadres', '.vol-tbl', '.vol-d.plat', '.vol-rien'].forEach(c => {
  ok(c + ' est défini dans athlete.html', ath.indexOf(c + ' {') > 0 || ath.indexOf(c + ' ') > 0);
});
const feuille = ath.slice(ath.indexOf('.vol-bloc'), ath.indexOf('.vol-rien span'));
ok('aucune couleur de sport recopiée dans la feuille (elles viennent des données)',
   feuille.length > 0 && !/#2B5FA6|#C2410C|#0891B2|#7B2DBF|#BE185D/i.test(feuille));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Volume d\'entraînement : le même calcul, pour le praticien et pour l\'athlète.');

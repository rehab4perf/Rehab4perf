#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Volume d'entraînement par sport — onglet Évolution

   Trois vues en tête de l'onglet : la semaine en chiffres, la répartition de
   l'effort, douze semaines cadre par cadre.

   LE BILAN NE LIT PAS `strava_activities`. Il le demande au Programme, comme le
   Générateur de CR lui demande déjà ses graphiques. La raison n'est pas
   doctrinale : la déduplication (`_dedoublonnerStrava`) vit là-bas, et une
   seconde requête d'ici la contournerait — comptant deux fois les sorties
   enregistrées sur deux appareils. C'est le défaut que le webhook Strava a
   coûté cher à refermer.

   TROIS PIÈGES, chacun fermé par un cas :

     - Le courrier au médecin collecte `.evo-chart-card`. Aucune des trois vues
       ne porte cette classe : le volume d'entraînement s'inviterait sinon tout
       seul dans un compte-rendu clinique.

     - `_renderEvolutionPage` réécrit `innerHTML` en ENTIER, y compris ses deux
       branches « pas assez de bilans ». Un bloc posé à côté disparaîtrait au
       rendu suivant, et le volume — qui ne dépend d'aucun bilan — serait
       invisible sur un patient qui n'en a qu'un.

     - Une semaine sans activité doit EXISTER et valoir zéro. Sans elle, la
       courbe saute par-dessus et donne à lire une continuité qui n'a pas eu
       lieu.

     node qualite/volume-sport-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var bilan = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
var pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
var shell = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
var html  = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}
function tranche(src, deb, fin) {
  var d = src.indexOf(deb), f = src.indexOf(fin, d + 1);
  if (d < 0 || f < d) { console.error('Bornes introuvables : ' + deb); process.exit(1); }
  return src.slice(d, f);
}

/* ── La table des sports ──────────────────────────────────────────────────── */
console.log('\nLa table des sports');

var T = new Function(tranche(pdata, 'var R4P_SPORTS = [', 'var CARDIO_EFFORT_TYPES') +
  '\nreturn {S:R4P_SPORTS, A:R4P_SPORT_AUTRE, f:r4pSportDeType};')();

egal('cinq sports nommés, pas un de plus', 5, T.S.length);
['Run', 'TrailRun', 'VirtualRun'].forEach(function (t) {
  egal(t + ' est de la course', 'course', T.f(t).cle);
});
egal('Ride est du vélo', 'velo', T.f('Ride').cle);
egal('WeightTraining est du renforcement', 'renfo', T.f('WeightTraining').cle);
/* Un type inconnu ne cree PAS une sixieme couleur : cinq series sont la limite
   de ce qu'un lecteur distingue, et c'est mesure. */
egal('un type inconnu tombe dans « Autre »', 'autre', T.f('Kitesurf').cle);
egal('… un type vide aussi', 'autre', T.f('').cle);
egal('… et une valeur absente', 'autre', T.f(undefined).cle);

/* L'ORDRE est celui sur lequel la palette a ete validee. Le trier par grandeur
   changerait les voisinages, donc les ecarts de couleur. */
egal('l\'ordre des sports est celui de la validation',
     'course,velo,natation,renfo,marche', T.S.map(function (s) { return s.cle; }).join(','));
var couleurs = T.S.map(function (s) { return s.couleur; });
egal('les couleurs validées, dans l\'ordre',
     '#2B5FA6,#C2410C,#0891B2,#7B2DBF,#BE185D', couleurs.join(','));
ok('« Autre » est gris, pas une sixième teinte', /^#8A96A0$/i.test(T.A.couleur), T.A.couleur);
ok('chaque sport porte son unité',
   T.S.every(function (s) { return s.unite === 'km' || s.unite === 'h'; }));

/* ── L'agrégation, exécutée ───────────────────────────────────────────────── */
console.log('\nL\'agrégation par semaine');

/* `seances` : les evenements planifies, avec leur retour d'athlete. C'est la
   moitie qui manquait — une seance de renforcement prescrite, faite, dont
   l'athlete a declare la duree, s'affichait « 0 min ». */
function agrege(activites, patient, seances) {
  var code = tranche(pmain, 'function _volLundi(', '/* ── Helpers sémantiques feedback');
  return new Function('_stravaActivities', '_cloudCalEvents', '_progPatient',
                      'R4P_SPORTS', 'R4P_SPORT_AUTRE', 'r4pSportDeType',
                      '_stravaChargeEstimate', '_fbIsCharge', '_evIsCap', '_uaFoster',
    code + '\nreturn _volumeParSport(4);')(
    activites, seances || [], patient, T.S, T.A, T.f,
    function () { return 0; },
    function (fb) { return !!(fb && fb.rpe != null && fb.duree_min != null && fb.duree_min > 10); },
    function () { return false; },
    function (rpe, min) { return Math.round((rpe || 0) * (min || 0)); });
}
/* Les dates du jeu d'essai sont calees sur le LUNDI de la semaine courante,
   jamais sur « aujourd'hui moins n » : un `jour(-2)` bascule dans la semaine
   precedente ou non selon le jour ou le controle tourne, et le cas se mettrait
   a echouer deux jours sur sept. */
function lundiPlus(n) {
  var d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}

var res = agrege([
  { date: lundiPlus(0),    type: 'Run',  distance_m: 12000, duree_s: 3600, charge: 300 },
  { date: lundiPlus(2),    type: 'Run',  distance_m:  8000, duree_s: 2400, charge: 200 },
  { date: lundiPlus(3),    type: 'Ride', distance_m: 40000, duree_s: 5400, charge: 250 },
  { date: lundiPlus(-14),  type: 'Run',  distance_m:  5000, duree_s: 1800, charge: 120 },
  { date: lundiPlus(-400), type: 'Run',  distance_m: 99000, duree_s: 9999, charge: 999 }
], { id: 'p1' });

egal('quatre semaines rendues', 4, res.semaines.length);
var der = res.semaines[3];
egal('la course de la semaine est cumulée', 20000, der.sports.course.dist);
egal('… ses deux sorties comptées', 2, der.sports.course.n);
egal('… et sa charge additionnée', 500, der.sports.course.charge);
ok('le vélo est rangé à part', der.sports.velo && der.sports.velo.dist === 40000);
/* Une activite hors fenetre ne doit pas se replier sur la premiere semaine :
   ce serait un pic invente au debut de chaque courbe. */
var total = res.semaines.reduce(function (a, sm) {
  return a + Object.keys(sm.sports).reduce(function (b, k) { return b + sm.sports[k].dist; }, 0);
}, 0);
egal('l\'activité d\'il y a un an est écartée', 65000, total);

var creux = agrege([{ date: lundiPlus(0), type: 'Run', distance_m: 5000, duree_s: 1200, charge: 100 }],
                   { id: 'p1' });
egal('une semaine sans activité existe quand même', 4, creux.semaines.length);
ok('… et elle est vide, pas absente',
   creux.semaines.slice(0, 3).every(function (sm) { return Object.keys(sm.sports).length === 0; }));

/* Les DEFINITIONS voyagent avec les chiffres : le bilan ne tient pas sa propre
   copie des noms et des couleurs — deux tables finiraient par diverger. */
egal('les définitions partent avec les données', 6, (res.sports || []).length);

/* ── Les séances prescrites comptent aussi ────────────────────────────────
   LE DÉFAUT SIGNALÉ : « 0 minute de séance de renforcement » alors que Strava
   a détecté les séances ET que l'athlète a déclaré leur durée.

   Deux causes, et la seconde était invisible :

     - Strava range dans `duree_s` le `moving_time`. Sur une séance de
       renforcement, il n'y a quasiment pas de temps « en mouvement » : la
       valeur y vaut souvent ZÉRO. L'activité existait, comptée, avec zéro
       minute.

     - Et surtout : les séances PLANIFIÉES, avec le retour de durée de
       l'athlète, n'étaient comptées NULLE PART. Le praticien prescrit, le
       patient déclare quarante-cinq minutes, et rien n'apparaissait.

   La règle anti-double-comptage est celle de `_buildUaMap`, jamais recopiée :
   un feedback de charge ABSORBE les activités Strava liées à sa séance. */

console.log('\nLes séances prescrites comptent, avec la durée déclarée');

var SEANCE = { id: 's1', date: lundiPlus(1),
               athlete_feedback: { rpe: 7, duree_min: 45 } };


var avecSeance = agrege([], { id: 'p1' }, [SEANCE]);
var derS = avecSeance.semaines[3];
ok('une séance prescrite crée du volume', !!derS.sports.renfo, JSON.stringify(derS.sports));
egal('… avec la durée DÉCLARÉE, en secondes', 45 * 60, derS.sports.renfo.duree);
egal('… et sa charge de Foster', 7 * 45, derS.sports.renfo.charge);
egal('… comptée pour une séance', 1, derS.sports.renfo.n);

/* Une seance SANS retour d'athlete n'invente aucune duree : on ne sait pas si
   elle a ete faite. */
var sansRetour = agrege([], { id: 'p1' }, [{ id: 's2', date: lundiPlus(1) }]);
ok('une séance sans retour ne compte pas',
   !sansRetour.semaines[3].sports.renfo, JSON.stringify(sansRetour.semaines[3].sports));

/* LE DOUBLE COMPTAGE : une activite Strava liee a une seance dont le feedback
   porte deja la charge serait comptee deux fois. Le feedback l'absorbe. */
var double = agrege(
  [{ date: lundiPlus(1), type: 'WeightTraining', distance_m: 0, duree_s: 0,
     charge: 200, seance_id: 's1' }],
  { id: 'p1' }, [SEANCE]);
egal('l\'activité liée est absorbée par le retour', 1, double.semaines[3].sports.renfo.n);
egal('… et sa durée nulle n\'écrase pas la déclarée', 45 * 60,
     double.semaines[3].sports.renfo.duree);

/* Une activite LIBRE — sans seance — compte normalement. */
var libre = agrege(
  [{ date: lundiPlus(2), type: 'Run', distance_m: 10000, duree_s: 3000, charge: 250 }],
  { id: 'p1' }, [SEANCE]);
egal('une activité libre compte à part', 10000, libre.semaines[3].sports.course.dist);
egal('… sans effacer la séance prescrite', 45 * 60, libre.semaines[3].sports.renfo.duree);

/* ── Le SPORT vient de Strava, la CHARGE du retour ─────────────────────────
   Une séance du programme n'a pas de sport : `_fbIsCharge` ne regarde que le
   RPE et la durée. Toute séance avec retour allait donc en « Renforcement »
   et y ABSORBAIT ses activités Strava liées — une sortie course prescrite,
   faite, notée RPE 7, perdait ses kilomètres et gonflait le renforcement.
   Décision du praticien : quand une activité Strava est liée, le sport, les
   kilomètres et la durée viennent d'elle ; la charge reste celle du retour
   (RPE × durée déclarée), partagée entre les activités liées au prorata de
   leur durée. Le total ne change pas : c'est toujours celui de l'ACWR. */
console.log('\nLe sport vient de Strava, la charge du retour');
var courseLiee = agrege(
  [{ date: lundiPlus(1), type: 'Run', distance_m: 10000, duree_s: 3000, charge: 200, seance_id: 's1' }],
  { id: 'p1' }, [SEANCE]);
var cL = courseLiee.semaines[3].sports;
egal('une course liée à une séance avec retour reste de la COURSE', 10000, cL.course && cL.course.dist);
egal('… avec la durée de Strava', 3000, cL.course && cL.course.duree);
egal('… et la charge du retour (7 × 45), pas celle de Strava', 315, cL.course && Math.round(cL.course.charge));
egal('… comptée pour une séance', 1, cL.course && cL.course.n);
ok('… sans gonfler le renforcement', !cL.renfo, JSON.stringify(cL.renfo));
var mixte = agrege(
  [{ date: lundiPlus(1), type: 'Ride', distance_m: 30000, duree_s: 1800, charge: 90, seance_id: 's1' },
   { date: lundiPlus(1), type: 'Run',  distance_m:  2000, duree_s:  600, charge: 40, seance_id: 's1' }],
  { id: 'p1' }, [SEANCE]);
var cM = mixte.semaines[3].sports;
egal('deux activités liées se partagent la charge au prorata de leur durée (vélo)', 236, cM.velo && Math.round(cM.velo.charge));
egal('… (course)', 79, cM.course && Math.round(cM.course.charge));
egal('… et le total reste celui du retour', 315, Math.round((cM.velo ? cM.velo.charge : 0) + (cM.course ? cM.course.charge : 0)));
var hT = rendre(courseLiee);
ok('le titre ne dit plus « Strava » seul', /Strava et retours de séance/.test(hT) && !/· Strava<\/span>/.test(hT),
   (hT.match(/<div class="vol-titre">.*?<\/div>/) || ['absent'])[0]);

/* Une seance liee SANS feedback de charge : ce sont les activites Strava qui
   parlent, pas une duree qu'on n'a pas. */
var lieeSansFb = agrege(
  [{ date: lundiPlus(1), type: 'WeightTraining', distance_m: 0, duree_s: 2700,
     charge: 180, seance_id: 's3' }],
  { id: 'p1' }, [{ id: 's3', date: lundiPlus(1) }]);
egal('sans retour, l\'activité liée compte seule', 2700,
     lieeSansFb.semaines[3].sports.renfo.duree);

/* ── Le rendu, exécuté ────────────────────────────────────────────────────── */

console.log('\nLes trois vues');

function rendre(volume) {
  var code = tranche(pdata, "/* ── Volume d'entrainement par sport", "/* ── Sélecteur d'exercices");
  return new Function('escH', 'V',
    code + '\nreturn _volHtml(V);')(
    function (x) { return String(x == null ? '' : x); }, volume);
}

var h = rendre(res);
ok('le bloc se rend', h.indexOf('vol-bloc') > 0, h.slice(0, 120));
ok('la semaine en chiffres est là', /vol-tuiles/.test(h));
/* TOUS les sports pratiques ont leur tuile. L'ordre etant fixe, ne montrer que
   les trois premiers prenait toujours les memes — et le renforcement, celui
   dont le praticien cherchait le volume, n'y figurait jamais.

   Il FAUT plus de trois sports pour que la troncature se voie : avec deux, un
   `slice(0,3)` rend exactement la meme chose et le controle passe au vert. */
var cinq = agrege([
  { date: lundiPlus(0), type: 'Run',   distance_m: 12000, duree_s: 3600, charge: 300 },
  { date: lundiPlus(1), type: 'Ride',  distance_m: 40000, duree_s: 5400, charge: 250 },
  { date: lundiPlus(2), type: 'Swim',  distance_m:  1800, duree_s: 2400, charge: 140 },
  { date: lundiPlus(3), type: 'Walk',  distance_m:  9000, duree_s: 5400, charge:  90 }
], { id: 'p1' }, [SEANCE]);
var h5 = rendre(cinq);
egal('cinq sports pratiqués → cinq tuiles, plus le total',
     6, (h5.match(/vol-tuile"/g) || []).length);
ok('… dont le renforcement', /Renforcement/.test(h5.slice(0, h5.indexOf('vol-rep'))), 'absent des tuiles');
ok('la répartition aussi', /vol-rep/.test(h));
ok('… et les cadres par sport', /vol-cadres/.test(h));
ok('un cadre par sport actif', (h.match(/vol-cadre"/g) || []).length === 2,
   (h.match(/vol-cadre"/g) || []).length + ' cadres');
/* Un sport sans AUCUNE activite sur la fenetre n'a pas de cadre : douze cadres
   vides diraient que le patient ne fait rien de neuf sports. */
ok('aucun cadre pour un sport jamais pratiqué', h.indexOf('Natation') < 0);

/* LE piege : le courrier au medecin collecte `.evo-chart-card`. */
ok('aucune vue ne porte la classe des cartes du courrier',
   h.indexOf('evo-chart-card') < 0);
ok('le bloc est exclu de l\'impression', /vol-bloc no-print/.test(h));

/* La couleur ne porte JAMAIS seule : pourcentage ecrit dans le segment, et une
   vue tableau pour qui ne distingue pas les teintes. */
ok('chaque segment écrit son pourcentage', /<span>\d+ %<\/span>/.test(h));
ok('une vue tableau existe', /vol-tbl/.test(h) && /<table>/.test(h));
ok('la légende nomme les sports', /vol-leg-i/.test(h));

/* ── Ce qui se passe quand il n'y a RIEN ──────────────────────────────────
   MASQUER EST INDISCERNABLE D'UNE PANNE — la regle est ecrite dans ce depot,
   et le premier jet l'a enfreinte : sans activite, le bloc ne rendait rien du
   tout. Le praticien ne pouvait pas savoir si la fonction avait disparu, si le
   patient n'etait pas relie a Strava, ou s'il n'avait simplement pas couru. */
var vide = rendre({ semaines: [{ debut: '2026-01-05', sports: {} }], sports: res.sports });
ok('aucune activité → le bloc reste et s\'explique', /vol-bloc/.test(vide), vide.slice(0, 90));
ok('… et il dit qu\'il n\'y a pas d\'activité', /aucune activité/i.test(vide), vide);
ok('… sans afficher de tuiles vides', !/vol-tuiles/.test(vide));

/* `null` ne veut PAS dire « aucune activite » : il veut dire « le programme ne
   tient pas ce patient ». Les confondre annoncerait un athlete inactif alors
   qu'on n'en sait rien. */
egal('données absentes → rien', '', rendre(null));

/* ── Le câblage ───────────────────────────────────────────────────────────── */
console.log('\nLe volume vit où vivent ses données');

/* Il a d'abord vecu dans l'onglet Evolution du bilan, alimente par un
   aller-retour entre deux iframes. Cet ecart a coute un relais, un repondeur,
   trois etats a distinguer et un garde-fou pour l'empecher de partir dans le
   courrier au medecin — et c'est lui qui rendait le bloc muet quand le
   programme n'avait pas encore le patient. Aucun de ces mecanismes ne doit
   revenir. */
ok('plus aucun message de transport', !/r4p-volume/.test(shell + pdata + bilan));
ok('le bilan ne connaît plus le volume', !/_vol[A-Z]|vol-hote/.test(bilan));
ok('le programme le rend directement', /_volHtml\(_volumeParSport\(_vn \* 2\), _vn\)/.test(pdata));

/* ── La fenêtre suit le sélecteur de temporalité ───────────────────────────
   La répartition portait sur la DERNIÈRE SEMAINE seule, sans que rien ne le
   dise : deux chiffres du même écran parlaient de deux périodes différentes.
   Elle suit désormais « 1 mois », « 3 mois »… et l'écart se mesure contre la
   période PRÉCÉDENTE de même longueur — comparer trois mois à la seule semaine
   d'avant n'aurait aucun sens. */
var dF = pmain.indexOf('function _volFenetreSemaines(');
ok('la fenêtre se calcule depuis le filtre', dF > 0);
var codeF = pmain.slice(dF, pmain.indexOf('function _volumeParSport(', dF));
function fenetre(jours, de, a) {
  return new Function('_pevoFilterDays', '_pevoFilterFrom', '_pevoFilterTo',
    codeF + '\nreturn { n:_volFenetreSemaines(), lbl:_volLibelleFenetre };')(
    jours, de || '', a || '');
}
egal('1 mois → 5 semaines', 5, fenetre(30).n);
egal('3 mois → 13 semaines', 13, fenetre(90).n);
egal('1 an → 53 semaines', 53, fenetre(365).n);
/* « Tout » est borne : au-dela, les barres hebdomadaires cessent d'etre
   lisibles. Le libelle dit la fenetre REELLE — un « tout » sur une fenetre
   bornee serait un mensonge. */
egal('« Tout » est borné à un an', 52, fenetre(null).n);
egal('une plage personnalisée est mesurée', 9,
     fenetre(null, '2026-01-01', '2026-03-01').n);
egal('… et bornée à deux ans', 104, fenetre(null, '2000-01-01', '2026-01-01').n);

var lbl = fenetre(null).lbl;
egal('le libellé dit la fenêtre, pas « 12 semaines »', '1 dernière année', lbl(52));
egal('… en mois quand c\'est rond', '3 derniers mois', lbl(12));
egal('… en semaines sinon', '5 dernières semaines', lbl(5));

/* ── « 1 semaine » ─────────────────────────────────────────────────────────
   Demandé par le praticien, à côté de « 1 mois », « 3 mois »… La fenêtre était
   plancher à DEUX semaines : « 1 semaine » en aurait montré deux, sous un
   bouton qui en annonce une — et `_volLibelleFenetre(1)` aurait écrit
   « 1 dernières semaines ». Une semaine se compare à la précédente, comme
   toute période à la sienne : rien n'imposait ce plancher. */
egal('1 semaine → 1 semaine (plus de plancher à deux)', 1, fenetre(7).n);
egal('… et son libellé est au singulier', 'dernière semaine', lbl(1));
var dP = pdata.indexOf('function _renderPevoFilterBar(');
var presetsTxt = dP > 0 ? pdata.slice(dP, pdata.indexOf('\n}\n', dP)) : '';
/* Les préréglages glissants ont laissé place aux unités calendaires
   (qualite/pevo-periode-cas.js) : la semaine se choisit par « Semaine ». */
ok('la barre propose la semaine, par unité et non plus en préréglage',
   /\['semaine','Semaine'\]/.test(presetsTxt) && !/var presets = \[/.test(presetsTxt),
   presetsTxt.slice(0, 160));
/* Le rendu, sur UNE semaine : sa référence est la semaine d'avant. */
var uneSem = { sports: res.sports, semaines: res.semaines.slice(-2) };
var h1 = rendre(uneSem);
ok('une semaine se rend, sans valeur absurde', h1.indexOf('vol-bloc') > 0 && !/NaN|Infinity|undefined/.test(h1),
   (h1.match(/.{40}(NaN|Infinity|undefined).{40}/) || [''])[0]);
ok('… avec ses tuiles et ses cadres par sport', /vol-tuiles/.test(h1) && /vol-cadre"/.test(h1));

/* ── L'écart se mesure À JOUR ÉGAL ─────────────────────────────────────────
   Les périodes sont des semaines calendaires, du lundi au dimanche, et la
   semaine en cours compte même inachevée. Un vendredi, « 1 semaine »
   comparait donc cinq jours à sept : −34 %, −42 %, −72 % sur la capture du
   praticien, le week-end — souvent le plus chargé — n'ayant pas encore eu
   lieu. Décision du praticien : comparer à parts égales. La référence est
   coupée au MÊME jour de la semaine que l'actuelle : lundi → vendredi contre
   lundi → vendredi. Les barres restent en semaines calendaires. */
console.log('\nL\'écart se mesure à jour égal');
var jourAuj = (new Date().getDay() + 6) % 7;
egal('l\'agrégation sait quel jour de la semaine on est', jourAuj, res.jourCourant);
var cSem = res.semaines[3].sports.course;
ok('… et range chaque activité par jour de la semaine',
   cSem && cSem.parJour && cSem.parJour.length === 7 && cSem.parJour[0].dist === 12000 && cSem.parJour[2].dist === 8000,
   cSem && cSem.parJour ? JSON.stringify(cSem.parJour.map(function (j) { return j.dist; })) : 'pas de parJour');

/* Des semaines écrites à la main : lundi = 0 … dimanche = 6. */
function cel(parJours) {
  var pj = [0, 1, 2, 3, 4, 5, 6].map(function () { return { dist: 0, duree: 0, charge: 0, n: 0 }; });
  var t = { dist: 0, duree: 0, charge: 0, n: 0, parJour: pj };
  Object.keys(parJours).forEach(function (j) {
    var km = parJours[j];
    pj[j] = { dist: km * 1000, duree: km * 300, charge: km * 10, n: 1 };
    t.dist += km * 1000; t.duree += km * 300; t.charge += km * 10; t.n += 1;
  });
  return t;
}
function ecart(V) {
  var hh = rendre(V);
  return ((hh.match(/vol-d [a-z]+"[^>]*>([^<]*)</) || [])[1] || 'absent').trim();
}
/* Semaine d'avant : 10 km le lundi, 20 km le samedi. Cette semaine : 10 km le lundi. */
var avant1 = { debut: 'a', sports: { course: cel({ 0: 10, 5: 20 }) } };
var cette1 = { debut: 'b', sports: { course: cel({ 0: 10 }) } };
egal('un vendredi : lundi → vendredi contre lundi → vendredi (10 km contre 10 km)', '= 0 %',
     ecart({ sports: res.sports, jourCourant: 4, semaines: [avant1, cette1] }));
egal('le dimanche, la semaine est complète : 10 km contre 30 km', '▼ -67 %',
     ecart({ sports: res.sports, jourCourant: 6, semaines: [avant1, cette1] }));
egal('sans détail par jour, rien ne change (comparaison entière)', '▼ -67 %',
     ecart({ sports: res.sports, semaines: [
       { debut: 'a', sports: { course: { dist: 30000, duree: 9000, charge: 300, n: 2 } } },
       { debut: 'b', sports: { course: { dist: 10000, duree: 3000, charge: 100, n: 1 } } }] }));
/* Sur plusieurs semaines, seule la DERNIÈRE semaine de la référence est coupée :
   les autres sont complètes des deux côtés. */
egal('sur deux semaines : seule la dernière de la référence est coupée', '= 0 %',
     ecart({ sports: res.sports, jourCourant: 4, semaines: [
       { debut: 'a', sports: { course: cel({ 0: 10 }) } }, avant1,
       { debut: 'c', sports: { course: cel({ 0: 10 }) } }, cette1] }));
var hJ = rendre({ sports: res.sports, jourCourant: 4, semaines: [avant1, cette1] });
ok('l\'écart dit ce qu\'il compare', /vol-d [a-z]+" title="[^"]*jour égal/.test(hJ),
   (hJ.match(/<span class="vol-d[^>]*>/) || ['absent'])[0]);
ok('plus aucun libellé ne dit « cette semaine »',
   !/cette semaine|Cette semaine|12 dernières semaines/.test(pdata),
   (pdata.match(/cette semaine|12 dernières semaines/gi) || []).join(' | '));
ok('… en tête du panneau des charges',
   /var parts = \[volSectionHtml, uaSectionHtml/.test(pdata));

/* ── La feuille ───────────────────────────────────────────────────────────── */
console.log('\nLa feuille de style');
['.vol-bloc', '.vol-tuiles', '.vol-rep', '.vol-cadres', '.vol-tbl'].forEach(function (c) {
  ok(c + ' est défini', html.indexOf(c + ' ') > 0 || html.indexOf(c + ' {') > 0);
});
/* Les couleurs de sport viennent des DONNEES : une seconde table dans la
   feuille finirait par diverger, et c'est la couleur qui derive en premier. */
ok('aucune couleur de sport n\'est recopiée dans la feuille',
   !/#2B5FA6|#C2410C|#0891B2|#7B2DBF|#BE185D/.test(
     html.slice(html.indexOf('.vol-bloc'), html.indexOf('.vol-tbl tr:last-child'))));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Volume par sport : tous les cas passent.');

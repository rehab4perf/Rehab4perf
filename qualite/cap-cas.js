#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   CAS DE RÉFÉRENCE DU GÉNÉRATEUR CAP

   Ce fichier part de la FICHE telle qu'un praticien la remplit — champs
   laissés vides compris — et non d'un profil écrit à la main. C'est tout
   l'intérêt : les défauts du formulaire (course continue à 0, charge
   chronique à 0, cible à 30) sont lus directement dans programme.html, si
   bien qu'un champ ajouté ou une valeur par défaut modifiée se répercute
   ici sans que personne ait à y penser.

   Les bugs remontés en usage réel venaient tous de cet écart : le moteur
   était testé avec des données cohérentes que le formulaire ne produit
   jamais.

   Les résultats attendus sont ceux dictés par le praticien, dans ses
   termes. Ils font foi : quand le code diverge, c'est le code qui a tort.

     node qualite/cap-cas.js            # rapport complet
     node qualite/cap-cas.js --court    # seulement les écarts
═══════════════════════════════════════════════════════════════════════ */

'use strict';
const fs = require('fs');
const path = require('path');
const RACINE = path.join(__dirname, '..');

/* ── 1. Charger le moteur ─────────────────────────────────────────────
   prog-main.js est un script de navigateur : on n'en évalue que la
   section CAP, délimitée par des repères stables du fichier. */
const DEBUT_CAP = 'var CAP_AXES = {';
const FIN_CAP   = '/* ── Pré-remplissage depuis Strava';

function chargerMoteur() {
  const src = fs.readFileSync(path.join(RACINE, 'js/prog-main.js'), 'utf8');
  const a = src.indexOf(DEBUT_CAP);
  const b = src.indexOf(FIN_CAP, a + 1);
  if (a === -1 || b === -1) {
    throw new Error('Section CAP introuvable dans prog-main.js (repère manquant : '
      + JSON.stringify(a === -1 ? DEBUT_CAP : FIN_CAP) + ').\n'
      + 'Le fichier a été réorganisé — mettre à jour les repères en tête de qualite/cap-cas.js.');
  }
  // Les fonctions d'affichage de cette tranche touchent au DOM, mais seulement
  // dans leur corps : les évaluer ne coûte rien tant qu'on ne les appelle pas.
  // Un `document` inerte suffit à couvrir un appel involontaire.
  const code = src.slice(a, b)
    + '\nmodule.exports = { CAP_AXES, CAP_PATHO_DB, CAP_SEUILS, _capBuildProgrammeV2,'
    + ' _capTrajectoire, _capVolumeCourse, _capIntensiteSemaine, _capVersMin,'
    + ' _capProposerRegression, _capAppliquerRegression,'
    // CAP_STATE est une variable de module : les cas de régression ont besoin
    // de l'écrire et de la relire.
    + ' setState: function(s) { CAP_STATE = s; }, getState: function() { return CAP_STATE; } };';
  const m = { exports: {} };
  const faux = { getElementById: () => null, querySelectorAll: () => [] };
  new Function('module', 'exports', 'document', 'window', 'localStorage', code)(
    m, m.exports, faux, {}, { getItem: () => null, setItem: () => {} });
  return m.exports;
}

/* ── 2. Lire les valeurs par défaut du VRAI formulaire ───────────────
   Un champ que le praticien ne touche pas garde la valeur du HTML. C'est
   exactement ce que le moteur reçoit, et c'est là que tout se joue :
   « course continue » vaut 0 par défaut, ce que le moteur interprète
   comme « ne court pas du tout ». */
function defautsFormulaire() {
  const html = fs.readFileSync(path.join(RACINE, 'programme.html'), 'utf8');
  const out = {};
  const re = /<input[^>]*id="(cap[A-Za-z0-9]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const balise = m[0];
    const val = /value="([^"]*)"/.exec(balise);
    out[m[1]] = val ? val[1] : '';        // pas de value= → champ vide
  }
  return out;
}

/* ── 3. Construire le profil comme le fait _capReadForm ─────────────── */
function fiche(saisie, defauts) {
  const ch = Object.assign({}, defauts, saisie);
  const nb = (v, d) => {
    const x = parseFloat(v);
    return isFinite(x) ? x : (d === undefined ? 0 : d);
  };
  const allure = (raw) => {
    const s = String(raw || '').trim().replace(',', '.');
    const mm = /^(\d+)\s*[:'']\s*(\d{1,2})$/.exec(s);
    if (mm) return parseInt(mm[1], 10) + parseInt(mm[2], 10) / 60;
    const v = parseFloat(s);
    return isFinite(v) && v > 0 ? v : null;
  };
  const { CAP_PATHO_DB } = MOTEUR;
  const pathos = [];
  if (ch.patho && CAP_PATHO_DB[ch.patho]) pathos.push(CAP_PATHO_DB[ch.patho]);
  const p1 = pathos[0] || CAP_PATHO_DB.aucune;

  const semaines = [nb(ch.capW4), nb(ch.capW3), nb(ch.capW2), nb(ch.capW1)];
  return {
    unite: ch.unite || 'km',
    chronique: Math.round(semaines.reduce((a, b) => a + b, 0) / 4 * 10) / 10,
    frequenceAct: nb(ch.capFreqAct),
    frequenceCible: Math.max(1, nb(ch.capFreqCible, 3)),
    plusLongueSortie: nb(ch.capSortieMax),
    courseContinueToleree: nb(ch.capContinu),
    cadenceSpontanee: nb(ch.capCadence, null) || null,
    allureFooting: allure(ch.capAllureG),
    patho: ch.patho || 'aucune',
    axe: ch.axe || p1.axe || 'charge',
    axes: [ch.axe || p1.axe || 'charge'],
    tissu: ch.tissu || p1.tissu || 'tendon',
    interdits: p1.interdits || [],
    cadenceCible: p1.cadenceCible || null,
    objectifBase: nb(ch.capObjBase, null) || null,
    cibleHebdo: Math.max(1, nb(ch.capCibleHebdo, 30)),
    cibleSortieLongue: nb(ch.capCibleLongue, null) || null,
    cibleIntensite: nb(ch.capCibleIntensite, null) || null,
    semaines: Math.max(1, nb(ch.capSemG, 12)),
    terrain: ['plat'], crossTraining: [],
    joursDispo: ch.joursDispo || [0, 2, 4],
  };
}

/* ── 4. Décrire ce que le plan produit, en termes de praticien ──────── */
function resume(p) {
  const r = MOTEUR._capBuildProgrammeV2(p);
  const parSem = {};
  r.seances.forEach((s) => { (parSem[s.week] = parSem[s.week] || []).push(s); });
  const allure = p.allureFooting || 6;
  const enUnite = (min) => (p.unite === 'km' ? min / allure : min);

  const semaines = Object.keys(parSem).map(Number).sort((a, b) => a - b).map((n) => {
    const sem = parSem[n];
    const volMin = sem.reduce((t, s) => t + MOTEUR._capVolumeCourse(s), 0);
    return {
      n,
      sorties: sem.length,
      volume: Math.round(enUnite(volMin) * 10) / 10,
      intensite: Math.round(MOTEUR._capIntensiteSemaine(sem)),
      marche: sem.some((s) => (s.segments || []).some((g) => g.recupZone === 'marche')),
      libelles: [...new Set(sem.map((s) => s.label))],
    };
  });
  const premiereQualite = semaines.find((s) => s.intensite > 0);
  return {
    semaines,
    nbSemaines: semaines.length,
    premiereQualite: premiereQualite ? premiereQualite.n : null,
    volumeMax: Math.max(...semaines.map((s) => s.volume)),
    intensiteMax: Math.max(...semaines.map((s) => s.intensite)),
  };
}

/* ═══ 5. LES CAS ═════════════════════════════════════════════════════
   `saisie`  : uniquement ce que le praticien tape. Tout le reste garde
               la valeur par défaut du formulaire.
   `attendu` : la règle clinique, dictée par le praticien.
═══════════════════════════════════════════════════════════════════════ */
const CAS = [
  {
    id: 1,
    titre: 'Charge — périostite, tolère 10 km à allure footing',
    contexte: 'Il court déjà. Au-delà de 10 km sur une sortie, ça fait mal.',
    saisie: { patho: 'periostite', capSortieMax: '10', capAllureG: '5:30',
              capFreqCible: '3', capCibleHebdo: '36' },
    /* Cycle 1 : le volume part 20 % sous la tolérance et remonte de 10 points
       par semaine — −20 %, −10 %, 0 % — pour être pile à la tolérance en S3.
       Aucune intensité pendant ce cycle : elle n'arrive qu'au cycle 2, et
       c'est elle le vrai danger. */
    attendu: [
      ['Aucune course/marche : il court déjà en continu',
        (r) => !r.semaines.some((s) => s.marche)],
      ['S1 à −20 % de la tolérance, soit 24 km',
        (r) => Math.abs(r.semaines[0].volume - 24) <= 1],
      ['S2 à −10 %, soit 27 km',
        (r) => Math.abs(r.semaines[1].volume - 27) <= 1],
      ['S3 pile à la tolérance, 30 km',
        (r) => Math.abs(r.semaines[2].volume - 30) <= 1],
      ['Aucune intensité pendant tout le cycle 1 (S1 à S3)',
        (r) => r.semaines.slice(0, 3).every((s) => s.intensite === 0)],
      ['Première allure élevée en S4, à l\'ouverture du cycle 2',
        (r) => r.premiereQualite === 4],
      ['Première dose : 4 min à allure élevée, pas plus',
        (r) => r.semaines[3].intensite === 4],
      ['Elle est insérée dans une sortie, pas dans une séance dédiée',
        (r) => r.semaines[3].sorties === 3],
      ['Le volume dépasse la tolérance et vise la cible (36 km)',
        (r) => r.volumeMax >= 35],
      ['Un seul levier bouge par semaine : jamais volume ET intensité ensemble',
        (r) => !r.semaines.some((s, i) => i > 0
          && s.volume > r.semaines[i - 1].volume + 0.6
          && s.intensite > r.semaines[i - 1].intensite)],
      ['Programme en cycles de 3 semaines',
        (r) => r.nbSemaines % 3 === 0],
    ],
  },
  {
    id: 2,
    titre: 'Répétition — bandelette, cible 1 h sans douleur',
    contexte: 'Il court déjà. C\'est le volume d\'un seul tenant qui blesse.',
    saisie: { patho: 'bit', unite: 'min', capSortieMax: '35', capAllureG: '5:00',
              capFreqCible: '4', capCibleHebdo: '240', capObjBase: '60',
              capW1: '150', capW2: '150', capW3: '150', capW4: '150',
              joursDispo: [0, 2, 4, 6] },
    attendu: [
      ['Les sorties sont découpées au départ, pas d\'un seul tenant',
        (r) => r.semaines[0].sorties >= 4],
      ['De l\'intensité dès la première semaine',
        (r) => r.premiereQualite === 1],
      ['Le volume progresse vers la cible',
        (r) => r.volumeMax >= 230],
      ['La plus longue sortie finit par atteindre 1 h d\'un tenant',
        (r) => r.semaines[r.semaines.length - 1].libelles.some((l) => /1h|6[0-9] min/.test(l))],
    ],
  },
  {
    id: 3,
    titre: 'Post-op LCA — ne court pas du tout',
    contexte: 'Validé en l\'état : course/marche progressive vers 30 min continu.',
    saisie: { patho: 'postop_genou', unite: 'min', capAllureG: '6:00',
              capFreqCible: '3', capCibleHebdo: '90', capObjBase: '30', capSemG: '12' },
    attendu: [
      ['Démarre en course/marche',
        (r) => r.semaines[0].marche],
      ['Le bout de course s\'allonge d\'une semaine à l\'autre',
        (r) => r.semaines[1].libelles[0] !== r.semaines[0].libelles[0]],
      ['3 sorties par semaine du début à la fin',
        (r) => r.semaines.every((s) => s.sorties === 3)],
      ['Arrive à 30 min continu',
        (r) => r.semaines[r.semaines.length - 1].libelles.some((l) => /30 min continu/.test(l))],
      ['Le délai demandé est tenu exactement',
        (r) => r.nbSemaines === 12],
    ],
  },
  {
    id: 4,
    titre: 'Faible volume — 8 km/sem, veut 20 km',
    contexte: 'Il court, peu. Départ à ce qu\'il tolère, puis montée du volume.',
    saisie: { patho: 'aucune', capAllureG: '6:00', capFreqCible: '3',
              capSortieMax: '3', capContinu: '18', capCibleHebdo: '20',
              capW1: '8', capW2: '8', capW3: '8', capW4: '8' },
    attendu: [
      ['Pas de course/marche : il court déjà 18 min d\'affilée',
        (r) => !r.semaines.some((s) => s.marche)],
      ['Semaine 1 à ce qu\'il tolère déjà (~8 km), pas en dessous',
        (r) => r.semaines[0].volume >= 7 && r.semaines[0].volume <= 9],
      ['Le volume progresse vers 20 km',
        (r) => r.volumeMax >= 19],
    ],
  },
  {
    id: 5,
    titre: 'Amplitude — travail technique uniquement',
    contexte: 'Volume légèrement réduit, uniquement de la technique, puis remontée.',
    saisie: { patho: 'claquage', capAllureG: '5:30', capFreqCible: '3',
              capSortieMax: '10', capContinu: '45', capCibleHebdo: '30',
              capW1: '30', capW2: '30', capW3: '30', capW4: '30' },
    attendu: [
      ['Semaine 1 sous le volume habituel',
        (r) => r.semaines[0].volume < 30],
      ['Aucune séance à allure élevée sur tout le programme',
        (r) => r.intensiteMax === 0],
      ['Une séance technique dès la première semaine',
        (r) => r.semaines[0].sorties >= 3],
      ['Le volume remonte à 30 km',
        (r) => r.volumeMax >= 29],
    ],
  },
  {
    id: 6,
    titre: 'Contradiction de saisie — 10 km tolérés, course continue laissée à 0',
    contexte: 'Le champ non rempli ne doit pas écraser le champ rempli.',
    saisie: { patho: 'periostite', capSortieMax: '10', capAllureG: '5:30',
              capFreqCible: '3', capCibleHebdo: '30' },
    attendu: [
      ['Aucune course/marche : 10 km tolérés implique de courir en continu',
        (r) => !r.semaines.some((s) => s.marche)],
      ['Le programme ne dépasse pas 12 semaines',
        (r) => r.nbSemaines <= 12],
    ],
  },
];

/* ── 6. Exécution ───────────────────────────────────────────────────── */
const MOTEUR = chargerMoteur();
const DEFAUTS = defautsFormulaire();
const court = process.argv.includes('--court');
let echecs = 0, total = 0;

console.log('\nCAS DE RÉFÉRENCE — GÉNÉRATEUR CAP');
console.log('Défauts du formulaire : ' + Object.keys(DEFAUTS).length + ' champs lus dans programme.html\n');

CAS.forEach((cas) => {
  const p = fiche(cas.saisie, DEFAUTS);
  let r, erreur = null;
  try { r = resume(p); } catch (e) { erreur = e; }

  const resultats = erreur ? [] : cas.attendu.map(([libelle, test]) => {
    let ok = false;
    try { ok = !!test(r); } catch (e) { ok = false; }
    return { libelle, ok };
  });
  const rates = resultats.filter((x) => !x.ok);
  total += cas.attendu.length;
  echecs += erreur ? cas.attendu.length : rates.length;

  if (court && !erreur && !rates.length) return;

  console.log('─'.repeat(72));
  console.log('CAS ' + cas.id + ' — ' + cas.titre);
  console.log('  ' + cas.contexte);
  if (erreur) { console.log('  ✗ ERREUR : ' + erreur.message + '\n'); return; }

  console.log('  produit : ' + r.nbSemaines + ' sem · volume max ' + r.volumeMax
    + ' · Z3+ max ' + r.intensiteMax + "'"
    + ' · 1re qualité ' + (r.premiereQualite ? 'S' + r.premiereQualite : 'jamais'));
  if (!court) {
    r.semaines.slice(0, 8).forEach((s) => {
      console.log('    S' + String(s.n).padStart(2) + '  ' + String(s.volume).padStart(6)
        + '  Z3+ ' + String(s.intensite).padStart(3) + "'  " + s.sorties + ' sorties  '
        + s.libelles.slice(0, 2).join(' | '));
    });
    if (r.semaines.length > 8) console.log('    …');
  }
  resultats.forEach((x) => console.log('  ' + (x.ok ? '✓' : '✗') + ' ' + x.libelle));
  console.log('');
});

/* ═══ 7. LA RÉGRESSION SUR DOULEUR ═══════════════════════════════════
   Même exigence que pour la génération : le résultat attendu est écrit
   avant le code, et il est rejoué à chaque modification. La régression
   est la partie qui compte le plus en consultation — c'est là que le
   plan rencontre le patient réel.
═══════════════════════════════════════════════════════════════════════ */

/* Monte un plan et le pose dans CAP_STATE, comme après une génération. */
function planPour(saisie) {
  const p = fiche(saisie, DEFAUTS);
  const r = MOTEUR._capBuildProgrammeV2(p);
  const state = { profile: p, sessions: r.seances, etats: r.etats };
  MOTEUR.setState(state);
  return state;
}

const nbSemaines = (st) => new Set(st.sessions.map((s) => s.week)).size;
const seanceOu = (st, sem, avecZ3) => st.sessions.findIndex(
  (s) => s.week === sem && (MOTEUR._capIntensiteSemaine([s]) > 0) === avecZ3);

const SAISIE_CHARGE = { patho: 'periostite', capSortieMax: '12', capAllureG: '5:30',
                        capFreqCible: '3', capCibleHebdo: '36', capContinu: '50',
                        capW1: '30', capW2: '30', capW3: '30', capW4: '30',
                        capSemG: '15' };
const SAISIE_AMPLITUDE = Object.assign({}, SAISIE_CHARGE, { patho: 'lombalgie', capContinu: '45' });

const CAS_REGRESSION = [
  {
    titre: 'Douleur sur une séance à allure élevée — l\'allure recule, le volume non',
    exec: () => {
      const st = planPour(SAISIE_CHARGE);
      const prop = MOTEUR._capProposerRegression(seanceOu(st, 10, true));
      return { st, prop };
    },
    attendu: [
      ['Le levier est l\'allure', ({ prop }) => prop.levier === 'intensite'],
      ['Les minutes de Z3+ reculent', ({ prop }) => prop.apres.intensite < prop.avant.intensite],
      ['Le volume ne bouge pas', ({ prop }) => Math.abs(prop.apres.volume - prop.avant.volume) < 0.5],
      ['Le recul est d\'un tour, pas un effondrement',
        ({ prop }) => prop.apres.intensite >= prop.avant.intensite * 0.6],
      ['Le repère EVA de la pathologie est fourni', ({ prop }) => prop.seuilPatho > 0],
    ],
  },
  {
    titre: 'Douleur sur un footing — décharge globale de 30 %',
    exec: () => {
      const st = planPour(SAISIE_CHARGE);
      const prop = MOTEUR._capProposerRegression(seanceOu(st, 10, false));
      return { st, prop };
    },
    attendu: [
      ['Le levier est global', ({ prop }) => prop.levier === 'global'],
      ['Le volume baisse de 30 %',
        ({ prop }) => Math.abs(prop.apres.volume - prop.avant.volume * 0.7) < 0.5],
      ['L\'allure baisse aussi',
        ({ prop }) => prop.apres.intensite < prop.avant.intensite],
    ],
  },
  {
    titre: 'Douleur sur une séance technique — décharge, et le geste est à reprendre',
    exec: () => {
      const st = planPour(SAISIE_AMPLITUDE);
      const idx = st.sessions.findIndex((s) => s.week === 8 && s.role === 'technique');
      return { st, prop: idx >= 0 ? MOTEUR._capProposerRegression(idx) : null, idx };
    },
    attendu: [
      ['Une séance technique existe sur l\'axe Amplitude', ({ idx }) => idx >= 0],
      ['Le levier est global', ({ prop }) => prop && prop.levier === 'global'],
      ['La reprise du geste est signalée', ({ prop }) => prop && prop.technique === true],
      ['La cadence cible est rappelée', ({ prop }) => prop && prop.cadenceCible > 0],
      ['Aucune Z3+ annoncée : cet axe n\'en prescrit jamais',
        ({ prop }) => prop && prop.avantAff.intensite === 0 && prop.apresAff.intensite === 0],
    ],
  },
  {
    titre: 'Appliquer — les semaines vécues ne sont jamais réécrites',
    exec: () => {
      const st = planPour(SAISIE_CHARGE);
      const avant = JSON.stringify(st.sessions.filter((s) => s.week <= 10).map((s) => s.label));
      const nAvant = nbSemaines(st);
      const prop = MOTEUR._capProposerRegression(seanceOu(st, 10, true));
      MOTEUR._capAppliquerRegression(prop, false);
      const apres = MOTEUR.getState();
      return {
        st: apres, prop, nAvant,
        identiques: avant === JSON.stringify(apres.sessions.filter((s) => s.week <= 10).map((s) => s.label)),
      };
    },
    attendu: [
      ['S1 à S10 strictement inchangées', ({ identiques }) => identiques],
      ['La durée est conservée', ({ st, nAvant }) => nbSemaines(st) === nAvant],
      ['Un état par semaine, toujours',
        ({ st }) => st.etats.length === nbSemaines(st)],
      ['Les états restent numérotés sans trou',
        ({ st }) => st.etats.every((e, i) => e.semaine === i + 1)],
      ['La suite repart sous le niveau douloureux',
        ({ st, prop }) => {
          const s11 = st.etats.filter((e) => e.semaine === 11)[0];
          return s11 && s11.prescrit.intensite <= prop.avant.intensite;
        }],
    ],
  },
  {
    titre: 'Appliquer en allongeant — le plan gagne un cycle',
    exec: () => {
      const st = planPour(SAISIE_CHARGE);
      const nAvant = nbSemaines(st);
      const prop = MOTEUR._capProposerRegression(seanceOu(st, 10, true));
      MOTEUR._capAppliquerRegression(prop, true);
      return { st: MOTEUR.getState(), nAvant };
    },
    attendu: [
      ['Le plan s\'allonge d\'un cycle',
        ({ st, nAvant }) => nbSemaines(st) === nAvant + MOTEUR.CAP_SEUILS.cycleProgression],
      ['Un état par semaine, toujours',
        ({ st }) => st.etats.length === nbSemaines(st)],
    ],
  },
];

console.log('─'.repeat(72));
console.log('RÉGRESSION SUR DOULEUR\n');

CAS_REGRESSION.forEach((cas) => {
  let ctx, erreur = null;
  try { ctx = cas.exec(); } catch (e) { erreur = e; }
  const resultats = erreur ? [] : cas.attendu.map(([libelle, test]) => {
    let ok = false;
    try { ok = !!test(ctx); } catch (e) { ok = false; }
    return { libelle, ok };
  });
  const rates = resultats.filter((x) => !x.ok);
  total += cas.attendu.length;
  echecs += erreur ? cas.attendu.length : rates.length;
  if (court && !erreur && !rates.length) return;

  console.log('  ' + cas.titre);
  if (erreur) { console.log('  ✗ ERREUR : ' + erreur.message + '\n'); return; }
  if (!court && ctx.prop) {
    console.log('    ' + ctx.prop.motif);
    console.log('    Z3+ ' + ctx.prop.avantAff.intensite + "' → " + ctx.prop.apresAff.intensite
      + "'   ·   volume " + ctx.prop.avantAff.volume + ' → ' + ctx.prop.apresAff.volume
      + ' ' + ctx.prop.unite);
  }
  resultats.forEach((x) => console.log('    ' + (x.ok ? '✓' : '✗') + ' ' + x.libelle));
  console.log('');
});

console.log('─'.repeat(72));
console.log(echecs === 0
  ? '✓ ' + total + ' attentes vérifiées'
  : '✗ ' + echecs + ' écart' + (echecs > 1 ? 's' : '') + ' sur ' + total + ' attentes');
process.exit(echecs === 0 ? 0 : 1);

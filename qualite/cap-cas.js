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

/* ── 3. Construire le profil comme le fait _capReadForm ───────────────
   La pathologie choisit le MODE, et le mode décide des champs qui comptent :

     volume   le volume monte, l'allure est maintenue à ce qu'il fait déjà
     allure   le volume est maintenu, les minutes de Z3+ montent
     amplitude  le volume monte, aucune allure de tout le plan
*/
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
  const { CAP_PATHO_DB, CAP_AXES } = MOTEUR;
  const p1 = (ch.patho && CAP_PATHO_DB[ch.patho]) || CAP_PATHO_DB.aucune;
  const axe = ch.axe || p1.axe || 'charge';
  const mode = (CAP_AXES[axe] || CAP_AXES.charge).mode;
  const freq = Math.max(1, nb(ch.capFreqCible, 3));

  return {
    unite: ch.unite || 'km',
    mode: mode,
    frequenceCible: freq,
    allureFooting: allure(ch.capAllureG),
    courseContinueToleree: nb(ch.capContinu),
    semaines: Math.max(1, nb(ch.capSemG, 12)),
    consolidation: ch.capConsolidation === '1' || ch.capConsolidation === true,

    // Mode volume : d'où l'on part, où l'on va. La tolérance et l'objectif se
    // saisissent par sortie OU par semaine — deux façons de dire la même chose.
    tolUnite:  ch.capTolUnite || 'semaine',
    tolVal:    nb(ch.capTolVal, null),
    objSortie: nb(ch.capObjSortie, null) || null,
    objHebdo:  nb(ch.capObjHebdo, null) || null,

    // Mode allure : le volume ne bouge pas, ce sont les minutes de Z3+ qui montent.
    volMaintenu:      nb(ch.capVolMaintenu, null) || null,
    qualiteActuelle:  nb(ch.capQualiteActuelle, null) || 0,
    qualiteCible:     nb(ch.capQualiteCible, null) || null,

    patho: ch.patho || 'aucune',
    axe: axe, axes: [axe],
    tissu: ch.tissu || p1.tissu || 'tendon',
    interdits: p1.interdits || [],
    cadenceCible: p1.cadenceCible || null,
    terrain: ['plat'], crossTraining: [],
    joursDispo: ch.joursDispo || [0, 2, 4],
  };
}

/* ── 4. Décrire ce que le plan produit, en termes de praticien ────────
   L'ACWR est calculé sur la grandeur QUI PROGRESSE : le volume en mode
   volume, les minutes de Z3+ en mode allure. Même formule, mêmes seuils,
   mêmes couleurs — seule la grandeur mesurée change. Le mesurer sur la
   charge pondérée totale afficherait 1,00 tout vert pendant que l'allure
   quintuple. */
function acwrSerie(valeurs) {
  return valeurs.map((v, i) => {
    const fen = valeurs.slice(Math.max(0, i - 3), i + 1);
    const chronique = fen.reduce((a, b) => a + b, 0) / fen.length;
    return chronique > 0 ? Math.round(v / chronique * 100) / 100 : 1;
  });
}

function resume(p) {
  const traj = MOTEUR._capTrajectoire(p);
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
      volumeMin: volMin,
      intensite: Math.round(MOTEUR._capIntensiteSemaine(sem)),
      technique: sem.some((s) => s.role === 'technique'),
      marche: sem.some((s) => (s.segments || []).some((g) => g.recupZone === 'marche')),
      libelles: [...new Set(sem.map((s) => s.label))],
    };
  });
  const suivie = semaines.map((s) => (p.mode === 'allure' ? s.intensite : s.volumeMin));
  const acwr = acwrSerie(suivie);
  const premiereQualite = semaines.find((s) => s.intensite > 0);

  return {
    semaines, acwr, traj,
    // Ce que la fiche annonce doit être ce que le plan délivre : sans cette
    // égalité, le praticien règle son curseur sur un chiffre qui ne se
    // réalise pas.
    fideleALaFiche: (() => {
      const annonce = (p.mode === 'allure' ? traj.intensites : traj.volumes).map((v) => Math.round(v));
      const produit = suivie.map((v) => Math.round(v));
      if (annonce.length !== produit.length) return false;
      return annonce.every((v, i) => Math.abs(v - produit[i]) <= Math.max(1, v * 0.03));
    })(),
    nbSemaines: semaines.length,
    acwrMax: Math.max(...acwr),
    premiereQualite: premiereQualite ? premiereQualite.n : null,
    volumeMax: Math.max(...semaines.map((s) => s.volume)),
    intensiteMax: Math.max(...semaines.map((s) => s.intensite)),
    // Croissance hebdomadaire moyenne de la grandeur suivie
    // Pente des semaines qui PROGRESSENT : une semaine de consolidation ne
    // fait pas partie de la rampe, la compter diluerait le rythme réel.
    pente: (() => {
      const a = suivie.find((v) => v > 0), b = suivie[suivie.length - 1];
      if (!a || !b) return 0;
      let pas = 0;
      for (let i = 1; i < suivie.length; i++) if (suivie[i] > suivie[i - 1] + 0.01) pas++;
      if (!pas) return 0;
      return Math.round((Math.pow(b / a, 1 / pas) - 1) * 1000) / 10;
    })(),
  };
}

/* ═══ 5. LES CAS ═════════════════════════════════════════════════════
   `saisie`  : uniquement ce que le praticien tape. Tout le reste garde
               la valeur par défaut du formulaire.
   `attendu` : la règle clinique, dictée par le praticien.

   Le générateur ne décide plus à la place du praticien : il trace une
   rampe de A à B sur le nombre de semaines choisi, et l'ACWR dit ce
   qu'elle coûte. C'est le praticien qui joue avec le curseur.
═══════════════════════════════════════════════════════════════════════ */
const COMMUN = { capAllureG: '5:30', capFreqCible: '3', capContinu: '50' };

const CAS = [
  {
    id: 1,
    titre: 'Volume — tolérance saisie par sortie',
    contexte: 'Bandelette. Tolère 8 km par sortie, 3 sorties. Objectif 12 km par sortie, en 10 semaines.',
    saisie: Object.assign({}, COMMUN, {
      patho: 'bit', capTolUnite: 'sortie', capTolVal: '8',
      capObjSortie: '12', capSemG: '10' }),
    attendu: [
      ['S1 à 24 km — trois sorties de 8', (r) => Math.abs(r.semaines[0].volume - 24) <= 0.6],
      ['S10 à 36 km — trois sorties de 12', (r) => Math.abs(r.volumeMax - 36) <= 0.6],
      ['Le volume monte sans jamais redescendre',
        (r) => r.semaines.every((s, i) => i === 0 || s.volume >= r.semaines[i - 1].volume - 0.3)],
      ['Aucune minute de Z3+ : le champ qualité est vide', (r) => r.intensiteMax === 0],
      ['Pente d\'environ +4,6 %/sem', (r) => Math.abs(r.pente - 4.6) <= 0.6],
      ['ACWR autour de 1,07 — vert', (r) => Math.abs(r.acwrMax - 1.07) <= 0.04],
      ['Trois sorties chaque semaine', (r) => r.semaines.every((s) => s.sorties === 3)],
      ['Dix semaines, ni plus ni moins', (r) => r.nbSemaines === 10],
      ['Le plan délivre la série annoncée par la fiche', (r) => r.fideleALaFiche],
    ],
  },
  {
    id: 2,
    titre: 'Volume — le même, saisi par semaine',
    contexte: '24 km/sem vers 36 km/sem. Doit produire exactement le même plan que le cas 1.',
    saisie: Object.assign({}, COMMUN, {
      patho: 'bit', capTolUnite: 'semaine', capTolVal: '24',
      capObjHebdo: '36', capSemG: '10' }),
    attendu: [
      ['S1 à 24 km', (r) => Math.abs(r.semaines[0].volume - 24) <= 0.6],
      ['S10 à 36 km', (r) => Math.abs(r.volumeMax - 36) <= 0.6],
      ['Même pente que le cas 1', (r) => Math.abs(r.pente - 4.6) <= 0.6],
      ['Même ACWR que le cas 1', (r) => Math.abs(r.acwrMax - 1.07) <= 0.04],
      ['Les deux unités disent la même chose',
        (r) => r.semaines.map((s) => s.volume).join() === REFERENCE_CAS1],
    ],
  },
  {
    id: 3,
    titre: 'Allure — le volume ne bouge pas, la qualité monte',
    contexte: 'Périostite. 30 km/sem à maintenir, aucune qualité aujourd\'hui, objectif 20 min de Z3+ en 12 semaines.',
    saisie: Object.assign({}, COMMUN, {
      patho: 'periostite', capVolMaintenu: '30',
      capQualiteActuelle: '', capQualiteCible: '20', capSemG: '12' }),
    attendu: [
      ['Le volume reste à 30 km toutes les semaines',
        (r) => r.semaines.every((s) => Math.abs(s.volume - 30) <= 0.8)],
      ['S1 porte déjà 4 min de Z3+ — le plancher',
        (r) => r.semaines[0].intensite === 4],
      ['Le fractionné est dans une sortie, pas en séance dédiée',
        (r) => r.semaines[0].sorties === 3],
      ['S12 à 20 min de Z3+', (r) => r.intensiteMax === 20],
      ['La qualité monte sans jamais redescendre',
        (r) => r.semaines.every((s, i) => i === 0 || s.intensite >= r.semaines[i - 1].intensite)],
      ['Pente annoncée d\'environ +15,8 %/sem sur la qualité',
        (r) => Math.abs(r.traj.pente - 15.8) <= 0.5],
      ['ACWR sur les minutes de Z3+, autour de 1,29 — orange',
        (r) => Math.abs(r.traj.acwr - 1.29) <= 0.04],
      ['Le plan délivre exactement la série annoncée par la fiche',
        (r) => r.fideleALaFiche],
    ],
  },
  {
    id: 4,
    titre: 'Course/marche — il ne court pas du tout',
    contexte: 'Post-op genou. Objectif 30 min continu, 3 sorties, 12 semaines.',
    saisie: { patho: 'postop_genou', unite: 'min', capAllureG: '6:00',
              capFreqCible: '3', capContinu: '0',
              capTolUnite: 'semaine', capTolVal: '', capObjHebdo: '90',
              capSemG: '12' },
    attendu: [
      ['S1 en course/marche', (r) => r.semaines[0].marche],
      ['S1 sur l\'échelle : 8×(1\'C / 1\'M)',
        (r) => r.semaines[0].libelles.some((l) => /8×\(1'C/.test(l))],
      ['Le bout de course s\'allonge d\'une semaine à l\'autre',
        (r) => r.semaines[1].libelles[0] !== r.semaines[0].libelles[0]],
      ['Trois sorties du début à la fin', (r) => r.semaines.every((s) => s.sorties === 3)],
      ['Arrive à 30 min continu',
        (r) => r.semaines[r.semaines.length - 1].libelles.some((l) => /30 min continu/.test(l))],
      ['Aucune qualité pendant la course/marche', (r) => r.intensiteMax === 0],
      ['Douze semaines', (r) => r.nbSemaines === 12],
    ],
  },
  {
    id: 5,
    titre: 'Amplitude — technique seule, aucune allure',
    contexte: 'Claquage. 30 km/sem vers 36 km, 10 semaines.',
    saisie: Object.assign({}, COMMUN, {
      patho: 'claquage', capTolUnite: 'semaine', capTolVal: '30',
      capObjHebdo: '36', capSemG: '10' }),
    attendu: [
      ['Une séance technique dès S1', (r) => r.semaines[0].technique],
      ['Une séance technique toutes les semaines', (r) => r.semaines.every((s) => s.technique)],
      ['Aucune minute de Z3+ sur tout le plan', (r) => r.intensiteMax === 0],
      ['Le volume monte de 30 à 36 km',
        (r) => Math.abs(r.semaines[0].volume - 30) <= 0.8 && Math.abs(r.volumeMax - 36) <= 0.8],
    ],
  },
  {
    id: 6,
    titre: 'Consolidation cochée — une semaine sur quatre ne progresse pas',
    contexte: 'Le cas 1, avec la case « semaine de consolidation toutes les 4 ».',
    saisie: Object.assign({}, COMMUN, {
      patho: 'bit', capTolUnite: 'sortie', capTolVal: '8',
      capObjSortie: '12', capSemG: '10', capConsolidation: '1' }),
    attendu: [
      ['S4 répète S3', (r) => Math.abs(r.semaines[3].volume - r.semaines[2].volume) <= 0.3],
      ['S8 répète S7', (r) => Math.abs(r.semaines[7].volume - r.semaines[6].volume) <= 0.3],
      ['S10 atteint quand même 36 km', (r) => Math.abs(r.volumeMax - 36) <= 0.6],
      ['La rampe se resserre sur les semaines qui restent : +6,0 %/sem',
        (r) => Math.abs(r.pente - 6.0) <= 0.8],
      ['Dix semaines', (r) => r.nbSemaines === 10],
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

let REFERENCE_CAS1 = null;

CAS.forEach((cas) => {
  const p = fiche(cas.saisie, DEFAUTS);
  let r, erreur = null;
  try { r = resume(p); } catch (e) { erreur = e; }

  const resultats = erreur ? [] : cas.attendu.map(([libelle, test]) => {
    let ok = false;
    try { ok = !!test(r); } catch (e) { ok = false; }
    return { libelle, ok };
  });
  if (!erreur && cas.id === 1) REFERENCE_CAS1 = r.semaines.map((x) => x.volume).join();
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

const SAISIE_CHARGE = { patho: 'periostite', capAllureG: '5:30', capFreqCible: '3',
                        capContinu: '50', capVolMaintenu: '30',
                        capQualiteCible: '20', capSemG: '15' };
const SAISIE_AMPLITUDE = { patho: 'lombalgie', capAllureG: '5:30', capFreqCible: '3',
                           capContinu: '45', capTolUnite: 'semaine', capTolVal: '30',
                           capObjHebdo: '36', capSemG: '15' };

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

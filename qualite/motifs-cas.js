#!/usr/bin/env node
/* Cas de référence — classement des motifs de bilan.
 *
 * Ce que l'onglet Patients appelle « motif non reconnu » n'est pas une erreur
 * de saisie : c'est un motif que la table de mots-clés ne sait pas ranger. Le
 * taux se réduit en couvrant ce que le praticien écrit VRAIMENT, fautes de
 * frappe comprises — « isquios » pour « ischios ».
 *
 * Deux mécanismes sont vérifiés ici :
 *
 *   1. Un alias peut être une LISTE : tous ses termes doivent être présents.
 *      « Tendinopathie des ischio-jambiers » exige donc à la fois la nature
 *      (tendinopathie) et le site (ischio). Sans ça, « lésion musculaire des
 *      ischio-jambiers » serait étiquetée tendinopathie.
 *
 *   2. Un groupe générique s'efface devant un groupe spécifique de la même
 *      famille. Un patient ne doit pas compter deux fois, en « Tendinopathie »
 *      et en « Tendinopathie des ischio-jambiers ».
 *
 *   node qualite/motifs-cas.js
 */
'use strict';

var path = require('path');
var m = require(path.join(__dirname, '..', 'js', 'patients-data.js'));

var nbOk = 0, nbKo = 0;

function attendu(motif, labels) {
  var obtenu = m.r4pMatchGroups(motif, m.R4P_MOTIF_KEYWORDS).sort();
  var vise = labels.slice().sort();
  if (JSON.stringify(obtenu) === JSON.stringify(vise)) {
    nbOk++; console.log('    ✓ ' + motif);
    return;
  }
  nbKo++;
  console.log('    ✗ ' + motif);
  console.log('        attendu : ' + (vise.join(' + ') || '(rien)'));
  console.log('        obtenu  : ' + (obtenu.join(' + ') || '(rien)'));
}

/* ── Hanche : la région était entièrement absente de la table ─────────────── */

console.log('\nHanche — la région n\'existait pas');
attendu('Conflit fémoro-acétabulaire hanche gauche', ['Conflit fémoro-acétabulaire']);
attendu('FAI type came', ['Conflit fémoro-acétabulaire']);
attendu('Syndrome du moyen fessier', ['Tendinopathie glutéale']);
attendu('Tendinopathie glutéale / grand trochanter', ['Tendinopathie glutéale']);
attendu('Tendinopathie du psoas', ['Tendinopathie du psoas']);

/* ── Tendinopathies par site : nature ET site exigés ──────────────────────── */

console.log('\nTendinopathies — le site compte, mais la nature doit y être');
attendu('Tendinopathie proximale des isquios jambiers droit',
        ['Tendinopathie des ischio-jambiers']);
attendu('Tendinopathie proximale des ischio-jambiers',
        ['Tendinopathie des ischio-jambiers']);
attendu('Tendinite du tibial postérieur', ['Tendinopathie du tibial postérieur']);
attendu('Tendinopathie rotulienne', ['Tendinopathie rotulienne']);
attendu('Tendinopathie achilléenne', ['Tendinopathie d\'Achille']);
// Le site seul ne suffit pas : sans la nature, ce n'est pas une tendinopathie.
attendu('Lésion musculaire des ischio-jambiers', ['Lésion musculaire']);
attendu('Désinsertion proximale ischio-jambiers droite', ['Lésion musculaire']);
// La rupture reste une rupture, pas une tendinopathie.
attendu('Rupture du tendon d\'Achille', ['Rupture du tendon d\'Achille']);
// Un mot insere entre « rupture » et « achille » cassait l'alias contigu.
attendu('Rupture partielle du tendon d\'Achille', ['Rupture du tendon d\'Achille']);
attendu('Rupture complète achilléen', ['Rupture du tendon d\'Achille']);
attendu('Rupture du tendon calcanéen', ['Rupture du tendon d\'Achille']);
attendu('Rupture achille gauche post op',
        ['Post-opératoire', 'Rupture du tendon d\'Achille']);
// Sans le mot « rupture », ce n'en est pas une.
attendu('Tendinopathie achilléenne', ['Tendinopathie d\'Achille']);
// Formulation vague : le groupe générique reste le filet.
attendu('Tendinopathie chronique', ['Tendinopathie']);
attendu('Problème de tendinite ancienne', ['Tendinopathie']);

/* ── Épaule : le motif le plus fréquent manquait ──────────────────────────── */

console.log('\nÉpaule — conflit et articulation acromio-claviculaire');
attendu('Conflit sous-acromial épaule droite', ['Conflit sous-acromial']);
attendu('Bursite sous-acromiale', ['Conflit sous-acromial']);
attendu('Disjonction acromio-claviculaire stade 2', ['Lésion acromio-claviculaire']);
// Latarjet, Bristow et « butée » designent la meme chirurgie de stabilisation :
// elles impliquent donc l'instabilite ET le contexte post-operatoire.
attendu('Post Latarjet', ['Post-opératoire', 'Instabilité d\'épaule']);
attendu('Butée d\'épaule', ['Post-opératoire', 'Instabilité d\'épaule']);
attendu('Buttée d\'épaule droite', ['Post-opératoire', 'Instabilité d\'épaule']);
attendu('Butée coracoïdienne', ['Post-opératoire', 'Instabilité d\'épaule']);
attendu('Bristow-Latarjet', ['Post-opératoire', 'Instabilité d\'épaule']);
// Un mot intercale cassait l'alias contigu « instabilite epaule ».
attendu('Instabilité antérieure d\'épaule opérée',
        ['Post-opératoire', 'Instabilité d\'épaule']);
attendu('Instabilité d\'épaule', ['Instabilité d\'épaule']);
// « instabilite » seul ne doit toujours pas basculer la cheville en epaule.
attendu('Instabilité chronique de cheville', ['Instabilité de cheville']);
// « butee » fait cinq caracteres, donc cherche en sous-chaine : il se trouve
// dans « deBUTEE ». Un alias prefixe de « = » exige le mot entier.
attendu('Rééducation débutée en janvier', []);
attendu('Reprise débutée après 6 semaines', []);

/* ── Rachis ───────────────────────────────────────────────────────────────── */

console.log('\nRachis');
attendu('Dorsalgie haute', ['Dorsalgie']);
attendu('Spondylolisthésis L5-S1', ['Spondylolyse / spondylolisthésis']);
attendu('Canal lombaire étroit', ['Canal lombaire étroit']);

/* ── Jambe et pied ────────────────────────────────────────────────────────── */

console.log('\nJambe et pied');
attendu('Syndrome des loges jambe droite', ['Syndrome des loges']);
attendu('Fracture de fatigue métatarsien', ['Fracture de fatigue']);
attendu('Névrome de Morton', ['Névrome de Morton']);
// Une fracture ordinaire ne bascule pas dans « fatigue ».
attendu('Fracture du 5e métatarsien', ['Fracture']);

/* ── Général ──────────────────────────────────────────────────────────────── */

console.log('\nGénéral');
attendu('Algodystrophie / SDRC', ['SDRC / algodystrophie']);
attendu('Commotion cérébrale', ['Commotion cérébrale']);
attendu('Préparation physique marathon', ['Préparation physique']);

/* ── Ce qui marchait doit continuer de marcher ────────────────────────────── */

console.log('\nNon-régression sur l\'existant');
attendu('Rupture LCA opérée', ['Post-opératoire', 'LCA']);
attendu('Syndrome rotulien bilatéral', ['Syndrome fémoro-patellaire']);
attendu('Périostite tibiale', ['Périostite tibiale']);
attendu('Lombalgie chronique avec sciatique', ['Lombalgie']);
attendu('Entorse de cheville', ['Entorse']);
attendu('Bilan initial de prévention', ['Prévention']);
attendu('', []);

/* ── Verdict ──────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

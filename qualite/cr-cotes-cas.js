#!/usr/bin/env node
/* Cas de référence — quel côté le CR nomme, et d'où il le tient.
 *
 * LE DÉFAUT QUE CE FICHIER FERME
 *
 * Le formulaire résout le côté atteint **par région** : les colonnes de la
 * page Épaule lisent la zone douloureuse « epaule », celles du Genou la zone
 * « genou ». Le CR, lui, lisait un unique champ global (« Côté » des Infos
 * Patient) et le traduisait en « Gauche »/« Droit ».
 *
 * Quand les deux divergent — un patient dont la fiche dit DROIT mais dont
 * l'épaule douloureuse est la GAUCHE — le CR annonçait le côté atteint sur le
 * mauvais côté. Le formulaire affichait « Sain 78 / Atteint 55 », le CR
 * écrivait « Gauche 78 | Droit 55 » : il plaçait les 55 répétitions du côté
 * atteint à DROITE alors que l'épaule atteinte est la GAUCHE. Un compte-rendu
 * envoyé au médecin désignait donc le mauvais membre.
 *
 * Second défaut, indépendant : en bilatéral, le formulaire nomme l'entrée
 * `-cs` « Gauche » et `-ca` « Droit » (voir `_applyLabels`). Le CR faisait
 * l'inverse — `-cs` devenait « Droit ». Deux conventions contradictoires dans
 * le même fichier.
 *
 * LA RÈGLE RETENUE
 *
 * Le CR cesse de traduire. Il dit ce que dit le formulaire :
 *   - un côté atteint connu  → « Côté sain » / « Côté atteint »
 *   - sinon (bilatéral)      → « Gauche » / « Droit »
 * Aucune traduction, donc aucune traduction fausse possible.
 *
 *   node qualite/cr-cotes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');
var deb = src.indexOf('function _crLabelsForCote');
var fin = src.indexOf('\n}', deb);
if (deb < 0 || fin < 0) {
  console.error('`function _crLabelsForCote` introuvable dans js/bilan.js.');
  process.exit(1);
}
var labels = new Function(src.slice(deb, fin + 2) + '\nreturn _crLabelsForCote;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}
function couple(r) { return r.cs + ' | ' + r.ca; }

/* ── La règle, alignée sur `_applyLabels` du formulaire ──────────────────── */

console.log('\nUn côté atteint connu — le CR ne traduit pas, il dit sain/atteint');
verifie('atteint à droite', 'Côté sain | Côté atteint', couple(labels('DROIT')));
verifie('atteint à gauche', 'Côté sain | Côté atteint', couple(labels('GAUCHE')));

console.log('\nBilatéral — les côtés se nomment, dans l\'ordre du formulaire');
verifie('zone bilatérale', 'Gauche | Droit', couple(labels('BILATÉRAL')));
verifie('aucune zone renseignée', 'Gauche | Droit', couple(labels('')));

/* `_applyLabels` écrit « Gauche » sur .sl-cs et « Droit » sur .sl-ca en
   bilatéral. Le CR faisait l'inverse : c'est ce cas qui l'attrape. */
console.log('\nEn bilatéral, `-cs` est la GAUCHE — comme dans le formulaire');
verifie('la colonne du côté sain porte Gauche', 'Gauche', labels('').cs);
verifie('la colonne du côté atteint porte Droit', 'Droit', labels('').ca);

/* La Hanche N'EST PLUS une exception. Elle traitait « aucune zone » comme un
   côté atteint à droite : sur un patient sans latéralité renseignée, ses
   adducteurs se lisaient en « Côté sain / Côté atteint » pendant que le
   quadriceps se lisait en « Gauche / Droit » — deux conventions dans le même
   tableau, sans que rien ne le justifie. La règle a été alignée côté
   formulaire (`_updateSideLabels`), et `_crLabelsForCote` n'a plus de second
   paramètre.

   Décision du praticien : pas de côté connu veut dire gauche/droite, partout. */
console.log('\nHanche — sans zone renseignée, elle est en gauche/droite comme les autres');
verifie('aucune zone hanche', 'Gauche | Droit', couple(labels('')));
verifie('hanche bilatérale explicite', 'Gauche | Droit', couple(labels('BILATÉRAL')));
verifie('hanche gauche atteinte', 'Côté sain | Côté atteint', couple(labels('GAUCHE')));

/* Garde-fou : le formulaire ne doit plus transformer « aucune zone » en DROIT
   sur la page Hanche. Les cas ci-dessus portent sur le CR ; celui-ci porte sur
   la source, car c'est elle qui décidait. */
{
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  verifie('plus de repli « \'\' → DROIT » sur la Hanche', 'false',
          String(/haCote \|\| 'DROIT'/.test(sansCom)));
  verifie('« aucune zone » rejoint la branche bilatérale', 'true',
          String(/haCote === 'BILATÉRAL' \|\| !haCote/.test(sansCom)));
}

/* ══════════════════════════════════════════════════════════════════════════
   Garde-fou : aucune section ne redevient aveugle a sa propre region.

   Le defaut venait d'un unique couple de libelles calcule une fois, depuis le
   champ global, puis reutilise par toutes les regions. Chaque section doit
   desormais resoudre SON cote.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nAucun libellé de côté dérivé du champ global');
var zone = src.slice(src.indexOf('function _buildAllTestsHtml'), src.indexOf('function _buildCRPatientHeaderHtml'));
var fautes = [];
zone.split('\n').forEach(function (ligne, i) {
  var t = ligne.trim();
  if (!t || t.indexOf('//') === 0 || t.indexOf('*') === 0) return;
  // « _labelCA = _cotePrimaire === 'DROIT' ? … » : la traduction globale.
  if (/_label(CS|CA)\s*=[^;]*_cotePrimaire/.test(ligne)) fautes.push('    ' + t.slice(0, 92));
});
if (fautes.length) {
  nbKo++;
  console.log('    ✗ ' + fautes.length + ' libellé(s) encore tirés du champ global :');
  fautes.forEach(function (f) { console.log(f); });
} else {
  nbOk++;
  console.log('    ✓ aucun');
}

/* Les tableaux d'amplitudes ne passent pas par `_crMesTab` : ils construisent
   leurs propres colonnes, et affichaient donc « Droit » avant « Gauche ». */
console.log('\nLes tableaux d\'amplitudes rangent aussi Gauche en premier');
var rom = src.slice(src.indexOf('function romCrTable'), src.indexOf('// 2. Bilan ortho'));
var iG = rom.indexOf('>Gauche</th>'), iD = rom.indexOf('>Droit</th>');
verifie('en-tête Gauche avant en-tête Droit', true, iG > -1 && iD > -1 && iG < iD);
var cG = rom.indexOf('gStr2'), cD = rom.indexOf("+'<td style=\"padding:3px 8px;font-size:.8rem;text-align:center\">'+dStr2");
verifie('la valeur gauche est écrite avant la droite', true, cG > -1 && cD > -1 && cG < cD);

console.log('\nChaque région déclare les zones dont elle dépend');
var attendues = {
  'EPAULE': "['epaule','coude','poignet']",
  'RACHIS CERVICAL': "['rachis-c','rachis-l']",
  'RACHIS LOMBAIRE': "['rachis-c','rachis-l']",
  'RACHIS': "['rachis-c','rachis-l']",
  'HANCHE': "['hanche']",
  'GENOU': "['genou']",
  'PIED / CHEVILLE': "['cheville','pied']"
};
Object.keys(attendues).forEach(function (label) {
  var re = new RegExp("label:'" + label.replace(/[/]/g, '\\/') + "'[\\s\\S]{0,400}?zones:\\s*(\\[[^\\]]*\\])");
  var m = zone.match(re);
  var got = m ? m[1].replace(/\s+/g, '') : 'absent';
  verifie(label, attendues[label].replace(/\s+/g, ''), got);
});

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

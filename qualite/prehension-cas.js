#!/usr/bin/env node
/* Cas de référence — Force de préhension (Tests de Force MS).
 *
 * CE QUE CE FICHIER PROTÈGE
 *
 * 1. La préhension est une mesure du MEMBRE, pas d'une articulation. Elle a
 *    donc son propre bloc et son propre groupe de CR, plutôt que d'être
 *    glissée sous « Épaule » où elle se lirait comme un test d'épaule.
 *
 * 2. La main dominante est ENREGISTRÉE et AFFICHÉE, jamais utilisée pour
 *    corriger l'asymétrie. La règle des 10 % — la main dominante serait plus
 *    forte d'environ 10 % — est souvent citée mais inconstante, notamment
 *    chez les gauchers. En bâtir un calcul reviendrait à affirmer plus que
 *    les données ne portent : c'est le praticien qui interprète.
 *
 * 3. `calcEpForce` déduit la zone à tester pour la bilatéralité depuis le
 *    PRÉFIXE de la clé. La branche du membre supérieur ne reconnaissait que
 *    `ep-` : les tests de coude (`co-f-`) tombaient donc dans la branche du
 *    membre inférieur et lisaient les zones de la jambe. Un patient à zone
 *    bilatérale au genou faisait basculer le calcul de ses tests de coude.
 *
 *   node qualite/prehension-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var SRC  = path.join(__dirname, '..', 'js', 'bilan.js');
var HTML = path.join(__dirname, '..', 'bilan.html');
var src  = fs.readFileSync(SRC, 'utf8');
var html = fs.readFileSync(HTML, 'utf8');

function ext(nom) {
  var d = src.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  var f = src.indexOf('\n}', d);
  return src.slice(d, f + 2);
}

var ok = 0, ko = 0;
function verifie(intitule, cond, detail) {
  if (cond) { ok++; console.log('    ✓ ' + intitule); }
  else { ko++; console.log('    ✗ ' + intitule + (detail ? '\n        ' + detail : '')); }
}

/* ── Le bloc existe dans la page, à sa place ────────────────────────────── */

console.log('\nLe bloc dans la page Tests de Force MS');
var iPage = html.indexOf('id="page-force-ms"');
var iFin  = html.indexOf('id="page-force-rachis"');
var page  = html.slice(iPage, iFin);
var iPreh = page.indexOf('data-block-id="force-ms--prehension"');
var iEp   = page.indexOf('data-block-id="force-ms--epaule"');
var iCo   = page.indexOf('data-block-id="force-ms--coude"');
verifie('le bloc Préhension existe', iPreh >= 0);
verifie('il précède Épaule et Coude', iPreh >= 0 && iPreh < iEp && iEp < iCo,
  'preh=' + iPreh + ' epaule=' + iEp + ' coude=' + iCo);
verifie('il porte ses quatre champs',
  ['ms-dom', 'ms-grip-cs', 'ms-grip-ca', 'ms-grip-obs'].every(function (id) {
    return page.indexOf('id="' + id + '"') >= 0;
  }));
/* `iPreh >= 0` d'abord : sans lui, un bloc absent (-1) satisferait la
   comparaison et le cas passerait à vide. */
verifie('il n\'est PAS dans le bloc Épaule',
  iPreh >= 0 && iPreh < iEp,
  'la préhension ne doit pas se lire comme un test d\'épaule');

/* ── La zone lue pour la bilatéralité ───────────────────────────────────── */

console.log('\nZone lue par calcEpForce — membre supérieur, pas la jambe');
/* Chercher APRÈS `function calcEpForce` : un autre `var zones` existe bien
   plus haut dans le fichier, et un match depuis zéro tombe dessus. */
var iCalc = src.indexOf('function calcEpForce(');
var zonesSrc = src.slice(iCalc).match(/var zones = [\s\S]{0,300}?;/);
verifie('la ligne de résolution existe', !!zonesSrc);
if (zonesSrc) {
  var re = zonesSrc[0].match(/\/\^\(?([^/]*?)\)?\/\.test\(key\)\s*\?\s*\['epaule'/);
  var motif = re ? re[1] : '';
  verifie('elle reconnaît le préfixe de l\'épaule', /ep-/.test(motif), 'motif : ' + motif);
  verifie('elle reconnaît celui du coude',        /co-f-/.test(motif), 'motif : ' + motif);
  verifie('elle reconnaît celui de la préhension', /ms-/.test(motif), 'motif : ' + motif);
}

/* ── La ligne de compte-rendu ───────────────────────────────────────────── */

var CH = {};
global.window = {};
global.document = {
  getElementById: function (id) {
    if (CH[id] === undefined) return null;
    return { value: CH[id], closest: function () { return { id: 'page-force-ms' }; } };
  }
};

/* Le bloc est un `if (...) { … }` : couper avant le crGroup laisserait une
   accolade ouverte. On va jusqu'à la fermeture qui suit. */
var deb = src.indexOf('  // ── Force de préhension');
var fin = src.indexOf("secRows += crGroup('Force de préhension', grRows);", deb);
if (fin >= 0) fin = src.indexOf('\n      }', fin) + 8;
if (deb < 0 || fin < 8) {
  console.log('\n    ✗ bloc CR « Force de préhension » introuvable dans js/bilan.js');
  console.log('\n' + '─'.repeat(64));
  console.log('✗ ' + (ko + 1) + ' échec(s)');
  process.exit(1);
}
var blocCR = src.slice(deb, fin);

var bi = src.indexOf('function crItem(key, val, tag, tagClass, fieldIds)');
var be = src.indexOf('\n  }', bi);
var gi = src.indexOf('  function crGroup(label, rows) {');
var ge = src.indexOf('\n  }', gi);

var mod = ext('_crMesTab') + '\n' + ext('asymPct') + '\n' + ext('asymTxt') + '\n'
  + 'function _crInSuiviMode(){ return false; }\n'
  + 'function _crMarquage(){ return { cls: "", badge: "" }; }\n'
  + src.slice(bi, be + 4) + '\n'
  + src.slice(gi, ge + 4) + '\n'
  + 'var _labelCS = "Côté sain", _labelCA = "Côté atteint";\n'
  + 'function ligneCR(){ var secRows = "";\n' + blocCR
  + '\n  return typeof grRows === "undefined" ? "" : grRows; }\n'
  + 'module.exports = ligneCR;';
var TMP = path.join(os.tmpdir(), '_r4p_prehension_mod.js');
fs.writeFileSync(TMP, mod);
var ligneCR = require(TMP);

console.log('\nLigne de CR — asymétrie marquée');
CH = { 'ms-grip-cs': '46', 'ms-grip-ca': '38', 'ms-dom': 'Droite' };
var h1 = ligneCR();
verifie('la force des deux côtés y figure', /46 kg/.test(h1) && /38 kg/.test(h1));
verifie('l\'asymétrie est affichée, pas la symétrie', /17\s*%/.test(h1),
  '38/46 = 82,6 % de symétrie → 17 % d\'asymétrie');
verifie('sous 90 %, la ligne est positive', /cr-tag bad">Positif</.test(h1));
verifie('la main dominante accompagne la mesure', /Main dominante : Droite/.test(h1));

console.log('\nLigne de CR — symétrie conservée');
CH = { 'ms-grip-cs': '46', 'ms-grip-ca': '44', 'ms-dom': 'Gauche' };
var h2 = ligneCR();
verifie('au-dessus de 90 %, la ligne est négative', /cr-tag ok">Négatif</.test(h2));
verifie('la dominante suit le champ, elle n\'est pas figée', /Main dominante : Gauche/.test(h2));

console.log('\nLa dominante ne corrige RIEN');
CH = { 'ms-grip-cs': '46', 'ms-grip-ca': '38', 'ms-dom': 'Droite' };
var asymD = (ligneCR().match(/(\d+)\s*%/) || [])[1];
CH = { 'ms-grip-cs': '46', 'ms-grip-ca': '38', 'ms-dom': 'Gauche' };
var asymG = (ligneCR().match(/(\d+)\s*%/) || [])[1];
verifie('même asymétrie quelle que soit la main dominante', asymD === asymG && !!asymD,
  'droite → ' + asymD + '% · gauche → ' + asymG + '%');

console.log('\nRien à dire, rien d\'écrit');
CH = {};
verifie('aucune ligne sans mesure', ligneCR().trim() === '');
CH = { 'ms-dom': 'Droite' };
verifie('la dominante seule ne fait pas une ligne', ligneCR().trim() === '');

/* ── Verdict ────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (ko) { console.log('✗ ' + ko + ' échec(s) sur ' + (ok + ko)); process.exit(1); }
console.log('✓ ' + ok + ' attentes vérifiées');

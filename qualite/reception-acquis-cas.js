#!/usr/bin/env node
/* Cas de référence — le Test de Réception au CR médecin.
 *
 * Le courrier n'énumère plus les critères qui CONDITIONNENT la réussite : leur
 * détail n'apprend rien au médecin, qui veut savoir si le test est passé. Ils
 * sont résumés par « Acquis » ou « Non acquis ». Les critères observés à titre
 * INDICATIF — valgus dynamique, contrôle du tronc — restent en sous-lignes :
 * eux orientent le travail.
 *
 * Deux pièges que ces cas referment :
 *
 *  1. Le rôle d'un critère est porté par le critère lui-même (`acquis:true`),
 *     jamais par sa position. « Les trois premiers » cesserait d'être vrai le
 *     jour où un critère serait inséré, et le verdict changerait en silence.
 *  2. L'attribut voyage entre DEUX fonctions — la grille l'écrit, la relecture
 *     le lit. Un nom qui diverge ne casse rien : plus aucun critère n'est
 *     conditionnant, et le test est déclaré « Acquis » quoi qu'il arrive.
 *
 *   node qualite/reception-acquis-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

function extrait(signature, finApres) {
  var d = js.indexOf(signature);
  var f = js.indexOf(finApres, d);
  if (d < 0 || f < 0) {
    console.error('Bornes introuvables pour : ' + signature);
    process.exit(1);
  }
  return js.slice(d, f);
}

var critRec = new Function(extrait('const CRITERIA_REC = [', '\n];') + '\n];\n return CRITERIA_REC;')();
var crit    = new Function(extrait('function _crMedCriteres(', '\nfunction _crMedResumeTests(') +
                           '\n return _crMedCriteres;')();
var relire  = new Function(extrait('function _crMedAnalyseFonc(', '\nfunction _crMedValeur(') +
                           '\n return _crMedAnalyseFonc;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── Le catalogue porte le rôle ──────────────────────────────────────────── */
console.log('\n  Quels critères conditionnent la réussite');
{
  verifie('cinq critères au total', 5, critRec.length);
  verifie('trois conditionnent', 3, critRec.filter(function (c) { return c.acquis; }).length);
  verifie('le talon à 80 % conditionne',       'true',      String(!!critRec[0].acquis));
  verifie('la descente fluide conditionne',    'true',      String(!!critRec[1].acquis));
  verifie('le maintien 3 s conditionne',       'true',      String(!!critRec[2].acquis));
  verifie('le valgus reste indicatif',         'undefined', String(critRec[3].acquis));
  verifie('le contrôle du tronc reste indicatif', 'undefined', String(critRec[4].acquis));
}

/* ── Le verdict ──────────────────────────────────────────────────────────── */
function grille(etats) {
  /* etats : [[g,d], …] dans l'ordre de CRITERIA_REC */
  return {
    af: critRec.map(function (c, i) {
      return { label: c.label.trim(), g: etats[i][0], d: etats[i][1], acquis: !!c.acquis };
    }),
    statut: 'Incomplet',
    notes: ['Côté sain 5/5 · Côté atteint 5/5']
  };
}
var TOUT = [[1,1],[1,1],[1,1],[1,1],[1,1]].map(function (p) { return [!!p[0], !!p[1]]; });

console.log('\n  Le verdict est binaire, et lit les DEUX côtés');
{
  var e = grille(TOUT); crit(e);
  verifie('tout validé → Acquis', 'Acquis', e.statut);

  [0, 1, 2].forEach(function (i) {
    var etats = TOUT.map(function (p) { return p.slice(); });
    etats[i][1] = false;                       // manque du côté droit
    var x = grille(etats); crit(x);
    verifie('critère conditionnant ' + (i + 1) + ' manquant à droite → Non acquis', 'Non acquis', x.statut);
    var etats2 = TOUT.map(function (p) { return p.slice(); });
    etats2[i][0] = false;                      // manque du côté gauche
    var y = grille(etats2); crit(y);
    verifie('critère conditionnant ' + (i + 1) + ' manquant à gauche → Non acquis', 'Non acquis', y.statut);
  });

  /* Décision du praticien : un critère indicatif n'a jamais fait basculer le
     verdict, et ne doit pas commencer. */
  [3, 4].forEach(function (i) {
    var etats = TOUT.map(function (p) { return p.slice(); });
    etats[i][0] = false; etats[i][1] = false;
    var z = grille(etats); crit(z);
    verifie('critère indicatif ' + (i + 1) + ' manquant → reste Acquis', 'Acquis', z.statut);
  });
}

console.log('\n  Ce que le courrier montre encore');
{
  var etats = TOUT.map(function (p) { return p.slice(); });
  etats[3][1] = false;                         // valgus non contrôlé à droite
  var e = grille(etats); crit(e);
  verifie('deux sous-lignes seulement', 2, e.af.length);
  verifie('le valgus reste',        'true', String(/valgus/i.test(e.af[0].label)));
  verifie('le contrôle du tronc reste', 'true', String(/tronc/i.test(e.af[1].label)));
  verifie('aucun critère conditionnant ne subsiste', 0,
          e.af.filter(function (l) { return l.acquis; }).length);
  verifie('les côtés du critère indicatif sont conservés', 'true,false',
          String(e.af[0].g) + ',' + String(e.af[0].d));
  /* « 5/5 » compterait cinq critères sous deux lignes affichées. */
  verifie('la synthèse chiffrée est retirée', 0, e.notes.length);
}

console.log('\n  Une grille sans critère conditionnant n\'est pas touchée');
{
  var e = { af: [{ label: 'Genou — valgus', g: true, d: false }], statut: 'Incomplet', notes: ['x'] };
  crit(e);
  verifie('statut inchangé', 'Incomplet', e.statut);
  verifie('lignes inchangées', 1, e.af.length);
  verifie('synthèse conservée', 1, e.notes.length);
}

/* ── Le rôle voyage bien de la grille à la relecture ─────────────────────── */
console.log('\n  L\'attribut traverse la grille HTML');
{
  /* Un DOM minimal : la grille est une suite de cellules — trois d'en-tête,
     puis trois par ligne. C'est exactement ce que `_crMedAnalyseFonc` parcourt. */
  function cell(txt, attrs) {
    return {
      textContent: txt,
      getAttribute: function (a) { return (attrs || {})[a] || null; },
      querySelector: function () { return null; }
    };
  }
  var cells = [cell('Critère'), cell('Côté sain'), cell('Côté atteint')];
  critRec.forEach(function (c, i) {
    cells.push(cell(c.label.trim(), c.acquis ? { 'data-crit': 'acquis' } : null));
    cells.push(cell(i === 3 ? '·' : '●'));
    cells.push(cell('●'));
  });
  var tbl = { getAttribute: function (a) { return a === 'data-af-mode' ? 'critere' : null; }, children: cells };
  var el = {
    querySelector: function (s) { return s === '.cr-af-tbl' ? tbl : null; },
    querySelectorAll: function () { return []; }
  };
  var lu = relire(el);
  verifie('les cinq lignes sont relues', 5, lu.lignes.length);
  verifie('trois portent le rôle conditionnant', 3,
          lu.lignes.filter(function (l) { return l.acquis; }).length);
  verifie('les libellés de côté sont relus', 'Côté sain,Côté atteint', (lu.cotes || []).join(','));

  /* Le round-trip complet : grille → relecture → verdict. Le valgus manque à
     gauche, mais il est indicatif : le test reste acquis. */
  var e = { af: lu.lignes, statut: 'Incomplet', notes: ['Côté sain 4/5 · Côté atteint 5/5'] };
  crit(e);
  verifie('verdict de bout en bout', 'Acquis', e.statut);
  verifie('deux sous-lignes de bout en bout', 2, e.af.length);
}

/* ── Garde-fous textuels ─────────────────────────────────────────────────── */
console.log('\n  Garde-fous — la règle doit être appelée');
{
  var sansCom = js.replace(/\/\*[\s\S]*?\*\//g, '');
  verifie('le résumé médecin invoque la règle', 'true',
          /_ng = -1; _nd = -1; _crMedCriteres\(_entree\);/.test(sansCom) + '');
  verifie('la grille écrit bien data-crit', 'true',
          /c\.acquis \? ' data-crit="acquis"' : ''/.test(sansCom) + '');
  verifie('la relecture lit bien data-crit', 'true',
          /getAttribute\('data-crit'\) === 'acquis'/.test(sansCom) + '');
  /* Le bilan garde sa grille entiere et son score : c'est le praticien qui la
     lit. Meme partage que le score sur sept de l'analyse fonctionnelle. */
  verifie('le CR du bilan garde ses cinq lignes', 'true',
          /CRITERIA_REC\.forEach\(function\(c, i\)\{/.test(sansCom) + '');
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

#!/usr/bin/env node
/* Cas de référence — un bilan antérieur ne montre jamais l'avenir.
 *
 * Le bilan le plus récent est une SYNTHÈSE : il reprend tout l'historique, avec
 * les mentions de réévaluation et les dates. Un bilan ANTÉRIEUR ne le peut pas.
 * Il porte ce qui a été mesuré ce jour-là, plus ce qui le précède, et rien de
 * ce qui a été mesuré après. Afficher une valeur d'août sur un bilan de juin,
 * c'est lui faire dire ce qu'il ne disait pas.
 *
 * Le défaut refermé : `loadBilan` chargeait la bonne vue bornée, puis
 * `_enterReadOnlyMode` la réécrasait avec une fusion sur `_allBilans` ENTIER.
 * `_bilanNeedsRefresh` n'étant vrai qu'après une sauvegarde, cela n'arrivait
 * qu'une fois sur deux. Et enregistrer depuis cette vue écrivait les valeurs
 * récentes DANS le bilan ancien.
 *
 *   node qualite/bilan-anterieur-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

function bloc(debut, fin) {
  var d = src.indexOf(debut);
  var f = src.indexOf(fin, d + 1);
  if (d < 0 || f < 0 || f <= d) {
    console.error('Bornes introuvables : « ' + debut + ' » … « ' + fin + ' »');
    process.exit(1);
  }
  return src.slice(d, f);
}

/* Les trois fonctions se suivent : `_prevMergedFrom`, `_mergedDuBilanCourant`,
   `_buildMergedDonnees`. On borne sur la définition qui les suit, jamais sur un
   nom seul — un appel plus haut dans le fichier déplacerait la borne. */
var code = bloc('function _prevMergedFrom(', 'function _getMetricVal(');

var api = new Function('etat', `
  var _allBilans = etat.bilans;
  var _currentBilanId = etat.courant;
  var window = { _CT_PAGES: [] };
  ${code}
  return { merge: _mergedDuBilanCourant, prev: _prevMergedFrom };
`);

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* Trois bilans, du plus récent au plus ancien — l'ordre de `_allBilans`.
   Chacun mesure une chose que les autres ne mesurent pas, plus le Lachman
   refait à chaque fois. */
var BILANS = [
  { id: 'B3', date: '2026-08-18', donnees: { lachman: 'Positif', force: '95', souplesse: '' } },
  { id: 'B2', date: '2026-07-18', donnees: { lachman: 'Négatif', force: '80', souplesse: '' } },
  { id: 'B1', date: '2026-06-18', donnees: { lachman: 'Négatif', force: '',   souplesse: '30' } }
];

console.log('\n  Le plus récent est une synthèse');
{
  var m = api({ bilans: BILANS, courant: 'B3' }).merge();
  verifie('sa propre valeur',                 'Positif', m.lachman);
  verifie('sa propre mesure',                 '95',      m.force);
  verifie('hérite du plus ancien',            '30',      m.souplesse);
}

console.log('\n  Un bilan antérieur ne voit jamais après lui');
{
  var m = api({ bilans: BILANS, courant: 'B2' }).merge();
  verifie('sa valeur du jour, pas celle d\'août', 'Négatif', m.lachman);
  verifie('sa mesure du jour, pas 95',            '80',      m.force);
  verifie('hérite du bilan de juin',              '30',      m.souplesse);
}

console.log('\n  Le tout premier ne porte que lui-même');
{
  var m = api({ bilans: BILANS, courant: 'B1' }).merge();
  verifie('sa valeur',                    'Négatif', m.lachman);
  verifie('rien à hériter → vide',        'undefined', String(m.force));
  verifie('sa propre mesure',             '30',      m.souplesse);
}

console.log('\n  Aucun bilan chargé — on retombe sur la synthèse');
{
  var m = api({ bilans: BILANS, courant: null }).merge();
  verifie('indice 0, comportement inchangé', 'Positif', m.lachman);
  // Un id inconnu ne doit pas vider le formulaire : indice 0 par défaut.
  var m2 = api({ bilans: BILANS, courant: 'INCONNU' }).merge();
  verifie('id introuvable → indice 0',       'Positif', m2.lachman);
}

console.log('\n  Les ids peuvent être numériques ou textuels');
{
  var num = [
    { id: 3, date: '2026-08-18', donnees: { lachman: 'Positif' } },
    { id: 2, date: '2026-07-18', donnees: { lachman: 'Négatif' } }
  ];
  /* `loadBilan` comparait en `===` strict. Supabase rend des `bigint` que le
     SDK peut livrer en nombre ou en chaîne selon le chemin : une comparaison
     stricte ratait le bilan et retombait sur l'indice 0 — c'est-à-dire sur la
     synthèse, donc exactement le défaut qu'on referme ici. */
  verifie('id numérique contre courant textuel', 'Négatif',
          api({ bilans: num, courant: '2' }).merge().lachman);
}

/* ── Garde-fou textuel ─────────────────────────────────────────────────────
   Les cas ci-dessus vérifient la fonction ; ils ne disent rien de QUI
   l'appelle. Le défaut était précisément là : une seconde fusion, non bornée,
   écrasait la première. */
console.log('\n  Garde-fou — aucune refusion non bornée dans la vue en lecture');
{
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  var d = sansCom.indexOf('function _enterReadOnlyMode');
  var f = sansCom.indexOf('function _exitReadOnlyMode');
  var corps = sansCom.slice(d, f);
  verifie('_enterReadOnlyMode ne fusionne plus sur _allBilans entier',
          'false', String(/_buildMergedDonnees\(\s*_allBilans\s*\)/.test(corps)));
  verifie('… elle passe par la fusion bornée',
          'true',  String(corps.indexOf('_mergedDuBilanCourant') !== -1));

  var dl = sansCom.indexOf('function loadBilan');
  var fl = sansCom.indexOf('function ', dl + 20);
  var corpsL = sansCom.slice(dl, fl);
  verifie('loadBilan ne fusionne pas non plus sur _allBilans entier',
          'false', String(/_buildMergedDonnees\(\s*_allBilans\s*\)/.test(corpsL)));

  /* Borner la source ne suffit pas : `_deserializeBilan` n'ECRIT que les clés
     qu'on lui passe, elle n'efface jamais. Sans remise à zéro préalable, tout
     champ absent du bilan consulté garde à l'écran la valeur du bilan
     précédemment affiché — donc celle d'un bilan POSTÉRIEUR quand on vient de
     la vue courante. La source était propre, le résidu restait. */
  function avantDeserialize(corps){
    var i = corps.indexOf('_deserializeBilan(_mergedDuBilanCourant()');
    if (i === -1) return 'appel introuvable';
    return corps.lastIndexOf('_resetBilanFields()', i) !== -1 ? 'reset' : 'sans reset';
  }
  verifie('loadBilan efface le formulaire avant de charger',
          'reset', avantDeserialize(corpsL));
  verifie('_enterReadOnlyMode aussi',
          'reset', avantDeserialize(corps));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

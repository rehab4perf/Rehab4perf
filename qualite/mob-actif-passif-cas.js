#!/usr/bin/env node
/* Cas de référence — les grilles de mobilité actif / passif.
 *
 * Le différentiel actif/passif situe l'origine d'une limitation : actif limité
 * mais passif libre, c'est la commande ; les deux limités, c'est la structure.
 * Il n'existait que sur l'épaule ; le coude et le poignet l'ont désormais.
 *
 * Ce que ces cas protègent :
 *
 *  1. Les identifiants de l'ÉPAULE ne bougent pas d'un caractère — les bilans
 *     enregistrés les retrouvent tels quels.
 *  2. Chaque mouvement déclaré a bien ses quatre champs dans la page, et chaque
 *     `onchange` désigne le mouvement de SA ligne. Une clé qui diverge ne casse
 *     rien de visible : la colonne « Interprétation » reste muette.
 *  3. La page COUDE n'avait AUCUNE section au compte-rendu — ni ses douze
 *     tableaux, ni sa grille. Lui ajouter une grille sans lui donner sa section
 *     aurait créé un second manque silencieux.
 *
 *   node qualite/mob-actif-passif-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var sansCom = js.replace(/\/\*[\s\S]*?\*\//g, '');

function extrait(sig, fin) {
  var d = js.indexOf(sig), f = js.indexOf(fin, d);
  if (d < 0 || f < 0) { console.error('Bornes introuvables : ' + sig); process.exit(1); }
  return js.slice(d, f);
}
var MOB_AP  = new Function(extrait('var MOB_AP = {', '\nvar EP_MOB_MOVEMENTS') + '\n return MOB_AP;')();
var verdict = new Function(extrait('function _epMobVerdict(a, p) {', '\nfunction _mobApRefresh') +
                           '\n return _epMobVerdict;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

console.log('\n  Les segments et leurs mouvements');
{
  verifie('trois segments', 'ep,co,po', Object.keys(MOB_AP).join(','));
  /* Les cles de l'EPAULE sont la partie des identifiants deja enregistree dans
     les bilans. Les renommer relirait ces bilans de travers, en silence. */
  verifie('l\'épaule garde ses clés', 'flex,abd,rl,rm,addh',
          MOB_AP.ep.map(function (m) { return m.key; }).join(','));
  verifie('le coude',   'flex,ext,pro,sup',
          MOB_AP.co.map(function (m) { return m.key; }).join(','));
  verifie('le poignet', 'flex,ext,pro,sup,incu,incr',
          MOB_AP.po.map(function (m) { return m.key; }).join(','));
}

console.log('\n  Chaque mouvement a ses quatre champs dans la page');
{
  var manquants = [], mauvaisCablage = [];
  Object.keys(MOB_AP).forEach(function (seg) {
    MOB_AP[seg].forEach(function (m) {
      var base = seg + '-mob-' + m.key;
      ['act', 'pas', 'obs', 'interp'].forEach(function (suf) {
        if (html.indexOf('id="' + base + '-' + suf + '"') === -1) manquants.push(base + '-' + suf);
      });
      /* Le `onchange` doit designer le mouvement de SA ligne. Une cle qui
         diverge ne casse rien de visible : la colonne reste muette. */
      var attendu = "_mobApRefresh('" + seg + "','" + m.key + "')";
      var bloc = html.split('id="' + base + '-act"')[1] || '';
      if (bloc.slice(0, 120).indexOf(attendu) === -1) mauvaisCablage.push(base);
    });
  });
  verifie('aucun champ manquant', '', manquants.join(','));
  verifie('chaque menu appelle sa propre clé', '', mauvaisCablage.join(','));

  /* L'inverse compte autant : une ligne dans la page qu'aucun segment ne
     declare ne serait ni interpretee, ni remontee au compte-rendu. */
  var declares = {};
  Object.keys(MOB_AP).forEach(function (seg) {
    MOB_AP[seg].forEach(function (m) { declares[seg + '-mob-' + m.key] = true; });
  });
  var orphelines = (html.match(/id="(\w+)-mob-(\w+)-act"/g) || [])
    .map(function (t) { return t.slice(4, -5); })
    .filter(function (b) { return !declares[b]; });
  verifie('aucune ligne orpheline dans la page', '', orphelines.join(','));
}

console.log('\n  L\'interprétation du différentiel');
{
  function v(a, p) { return verdict(a, p)[0] + '/' + verdict(a, p)[1]; }
  verifie('rien de saisi',                   '—/muted',                       v('', ''));
  verifie('passif seul',                     'Passif isolé/muted',            v('', 'lim'));
  verifie('actif libre',                     'Conservée/ok',                  v('libre', ''));
  verifie('actif anormal, passif non testé', 'À tester en passif/muted',      v('lim', ''));
  verifie('actif limité, passif libre',      'Déficit actif/warn',            v('lim', 'libre'));
  verifie('les deux limités',                'Restriction structurelle/bad',  v('lim', 'lim'));
  verifie('douleur en actif seul',           'Douleur contractile/warn',      v('doul', 'libre'));
  verifie('douleur des deux côtés',          'Structure inerte/bad',          v('doul', 'doul'));
  verifie('douloureux ET limité, passif libre', 'Déficit actif/warn',         v('doullim', 'libre'));
}

console.log('\n  Le compte-rendu lit les trois segments');
{
  ['ep', 'co', 'po'].forEach(function (seg) {
    verifie('_crMobApRows(\'' + seg + '\') est appelé', 'true',
            String(sansCom.indexOf("_crMobApRows('" + seg + "')") !== -1));
  });
  /* Une ligne n'existe que si l'ACTIF est renseigne : le verdict se lit sur la
     comparaison, « passif seul » ne dit rien au medecin. */
  verifie('pas de ligne sans actif', 'true',
          /var a = \(document\.getElementById\(base\+'-act'\)\|\|\{\}\)\.value\|\|'';\s*if \(!a\) return;/.test(sansCom));
}

console.log('\n  La page Coude a enfin sa section');
{
  /* Douze tableaux au catalogue TESTS, une grille de mobilite dans la page, et
     RIEN de tout cela n'etait lu : on pouvait remplir la page entiere sans
     qu'une seule ligne n'apparaisse au compte-rendu. Meme manque que le
     Poignet, decouvert en lui ajoutant sa grille actif/passif. */
  var d = sansCom.indexOf('var orthoSections = [');
  var sec = sansCom.slice(d, sansCom.indexOf('\n  ];', d));
  verifie('la section COUDE existe', 'true', String(/label:'COUDE'/.test(sec)));
  /* `zones:['coude']` et rien d'autre : reprendre la liste de l'EPAULE
     laisserait une douleur d'epaule decider du cote nomme pour le coude. */
  verifie('elle ne lit que la zone coude', 'true',
          String(/label:'COUDE', zones:\['coude'\]/.test(sec)));
  var absentes = ['tb-co-lat', 'tb-co-med', 'tb-co-ant', 'tb-co-post',
                  'tb-co-lat-g', 'tb-co-lat-d', 'tb-co-med-g', 'tb-co-med-d',
                  'tb-co-ant-g', 'tb-co-ant-d', 'tb-co-post-g', 'tb-co-post-d']
    .filter(function (t) { return sec.indexOf("'" + t + "'") === -1; });
  verifie('ses douze tableaux y figurent', '', absentes.join(','));
  verifie('sa grille de statut remonte aussi', 'true',
          String(/_crMobTable\('Mobilité du Coude', 'co'/.test(sansCom)));
}

console.log('\n  L\'interprétation se rejoue après chargement');
{
  /* Elle n'etait rejouee qu'au CHARGEMENT DE LA PAGE : rouvrir un bilan
     laissait la colonne a « — » alors que les deux menus etaient renseignes.
     Le defaut existait deja sur l'epaule. */
  verifie('appelée après désérialisation', 'true',
          /updateAll\(\); calcRec\(\); calcPlioq\(\); _epFoncRefresh\(\); _mobApRefreshAll\(\);/.test(sansCom) + '');
  verifie('appelée après restauration du brouillon', 'true',
          /_epFoncRefresh\(\);\s*try \{ _mobApRefreshAll\(\); \} catch/.test(sansCom) + '');
  verifie('la boucle couvre tout segment ajouté', 'true',
          /Object\.keys\(MOB_AP\)\.forEach/.test(sansCom) + '');
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

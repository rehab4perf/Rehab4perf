#!/usr/bin/env node
/* Cas de référence — quelles colonnes le tableau du courrier affiche.
 *
 * Une colonne n'existe que si la MOITIÉ AU MOINS des lignes du groupe la
 * remplit. C'est la règle déjà posée dans le bilan pour la colonne « Mesure » :
 * une colonne qu'une seule ligne utilise fait chercher au lecteur une lecture
 * qui n'a pas lieu.
 *
 * Le cas qui l'a motivée — l'analyse de course à pied. « Conditions »,
 * « Cadence », « Temps de contact » n'ont pas deux côtés ; seule « Zone
 * d'attaque » en a. Les en-têtes « Gauche / Droit » coiffaient donc cinq lignes
 * dont une seule s'y rapportait.
 *
 * La moitié, et non « au moins deux » : un groupe d'UN SEUL test à deux côtés —
 * un dynamomètre isolé — garde ses colonnes, ce qui est juste. Ce seuil est la
 * chose à ne pas « simplifier » : le porter à 2 ferait perdre ses colonnes au
 * test de force unique, l'abaisser à 1 ramènerait le défaut d'origine.
 *
 *   node qualite/cr-colonnes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

var deb = src.indexOf('      var compte = {}, ordre = [];');
var fin = src.indexOf('var _colspan', deb);
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes introuvables dans outils.html.');
  console.error('Le test extrait le calcul des en-têtes dans `fermerTable`.');
  process.exit(1);
}
var code = src.slice(deb, fin);

var colonnes = new Function('tampon', code + '\n return entetes;');

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

function ligne(cellules) {
  return { cellules: (cellules || []).map(function (c) { return { entete: c[0], valeur: c[1] }; }) };
}

console.log('\n  Analyse de course à pied — une ligne sur cinq a deux côtés');
{
  var course = [
    ligne([]),                                          // Conditions
    ligne([]),                                          // Cadence
    ligne([]),                                          // Temps de contact
    ligne([]),                                          // Position du pied
    ligne([['Gauche', 'Médio-pied'], ['Droit', 'Médio-pied']])  // Zone d'attaque
  ];
  verifie('les colonnes de côté disparaissent', '', colonnes(course).join(','));
}

console.log('\n  Tests fonctionnels — tout se lit par côté');
{
  var fonc = [
    ligne([['Côté sain', '19 rép.'], ['Côté atteint', '17 rép.'], ['Asym.', '11%']]),
    ligne([['Côté sain', '160 cm'], ['Côté atteint', '180 cm'], ['Asym.', '-13%']]),
    ligne([['Côté sain', '3/5'], ['Côté atteint', '1/5']])
  ];
  verifie('les colonnes restent, dans l\'ordre de rencontre',
          'Côté sain,Côté atteint,Asym.', colonnes(fonc).join(','));
}

console.log('\n  Un seul test à deux côtés garde ses colonnes');
{
  /* Un dynamomètre isolé dans « Tests de force ». Un seuil « au moins deux
     lignes » le priverait de ses colonnes et rendrait « Côté sain 32.6 kg ·
     Côté atteint 35.2 kg » en toutes lettres — moins lisible, pour rien. */
  var seul = [ligne([['Côté sain', '32.6 kg'], ['Côté atteint', '35.2 kg']])];
  verifie('1 ligne sur 1 → colonnes conservées',
          'Côté sain,Côté atteint', colonnes(seul).join(','));
}

console.log('\n  Le seuil exact — la moitié, bornes comprises');
{
  function groupe(avec, sans) {
    var l = [];
    for (var i = 0; i < avec; i++) l.push(ligne([['Gauche', 'x'], ['Droit', 'y']]));
    for (var j = 0; j < sans; j++) l.push(ligne([]));
    return l;
  }
  verifie('2 sur 4 (pile la moitié) → conservées', 'Gauche,Droit', colonnes(groupe(2, 2)).join(','));
  verifie('1 sur 3 (moins) → supprimées',          '',             colonnes(groupe(1, 2)).join(','));
  verifie('2 sur 3 (plus) → conservées',           'Gauche,Droit', colonnes(groupe(2, 1)).join(','));
  verifie('1 sur 2 (pile la moitié) → conservées', 'Gauche,Droit', colonnes(groupe(1, 1)).join(','));
}

console.log('\n  Une colonne peut tomber sans les autres');
{
  /* « Asym. » n'est calculée que quand les deux côtés existent : sur un groupe
     où la plupart des lignes n'ont qu'un côté, elle doit partir seule. */
  var mixte = [
    ligne([['Côté sain', '10'], ['Côté atteint', '9'], ['Asym.', '10%']]),
    ligne([['Côté sain', '12'], ['Côté atteint', '11']]),
    ligne([['Côté sain', '8'],  ['Côté atteint', '8']]),
    ligne([['Côté sain', '7'],  ['Côté atteint', '7']])
  ];
  verifie('les côtés restent, l\'asymétrie part',
          'Côté sain,Côté atteint', colonnes(mixte).join(','));
}

console.log('\n  Une cellule vide ne compte pas');
{
  /* Le bilan émet la cellule même sans valeur. La compter ferait survivre une
     colonne entièrement vide — des en-têtes au-dessus de rien. */
  var vides = [
    ligne([['Gauche', ''], ['Droit', '']]),
    ligne([['Gauche', ''], ['Droit', '']]),
    ligne([['Gauche', 'Médio-pied'], ['Droit', 'Médio-pied']])
  ];
  verifie('deux lignes vides sur trois → colonnes supprimées', '', colonnes(vides).join(','));
}


console.log('\n  Une grille dans un groupe de mesures ne lui vole pas ses colonnes');
{
  /* Le Test de Réception EMPRUNTE la grille de l'analyse fonctionnelle tout en
     restant parmi les tests chiffrés. Sa présence suffisait à écraser les
     en-têtes calculés du groupe entier : « Gauche | Droit | Asym. » devenait
     « Côté sain | Côté atteint ». L'asymétrie disparaissait de toutes les
     lignes, et les valeurs mesurées se retrouvaient sous des intitulés qui ne
     les décrivent pas — un côté nommé de travers dans un document médical. */
  function mesure(a, b, asym) {
    var c = [{ entete: 'Gauche', valeur: a }, { entete: 'Droit', valeur: b }];
    if (asym) c.push({ entete: 'Asym.', valeur: asym });
    return { cellules: c };
  }
  function grille(cotes) {
    return { cellules: [], af: [{ label: 'Valgus', g: false, d: true }], afCotes: cotes };
  }

  var melange = [mesure('43 rép.', '47 rép.', '9%'), mesure('180 cm', '175 cm', '3%'),
                 grille(['Côté sain', 'Côté atteint']),
                 mesure('11.5 cm', '11.5 cm', ''), mesure('11 cm', '9 cm', '18%')];
  verifie('les colonnes mesurées survivent à la grille', 'Gauche,Droit,Asym.',
          colonnes(melange).join(','));

  /* Un groupe qui n'est QUE de l'analyse fonctionnelle garde SES colonnes :
     ses lignes n'ont aucune cellule, le filtre rendrait un tableau sans
     colonne et les pastilles n'auraient nulle part où se poser. */
  verifie('une section 100 % fonctionnelle garde les siennes', 'Gauche,Droit',
          colonnes([grille(['Gauche', 'Droit'])]).join(','));
  verifie('… y compris en sain / atteint', 'Côté sain,Côté atteint',
          colonnes([grille(['Côté sain', 'Côté atteint'])]).join(','));
  /* Sans libellés relus, le repli Gauche/Droit reste. */
  verifie('sans libellés, le repli tient', 'Gauche,Droit',
          colonnes([{ cellules: [], af: [{ label: 'X', g: true, d: false }] }]).join(','));
}

/* ── Séparation des conventions de côté ────────────────────────────────────
   Le bilan résout le côté PAR RÉGION : une hanche à côté atteint connu rend
   « Côté sain / Côté atteint », un genou bilatéral rend « Gauche / Droit ».
   Réunis dans un seul tableau, les deux donnaient CINQ colonnes dont deux
   restaient vides sur chaque ligne. On ne traduit pas — le CR a cessé de le
   faire après avoir désigné le mauvais membre. On sépare. */
var debL = src.indexOf('    function _conventionCote(t) {');
var finL = src.indexOf('    function fermerTable() {', debL);
if (debL < 0 || finL < 0) {
  console.error('Bornes du partitionnement introuvables dans outils.html.');
  process.exit(1);
}
var lots = new Function('lst', src.slice(debL, finL) + '\n return _lotsParConvention(lst);');

function testCote(nom, entetes) {
  return { label: nom, cellules: (entetes || []).map(function (e) { return { entete: e, valeur: 'x' }; }) };
}

console.log('\n  Deux conventions de côté ne partagent pas un tableau');
{
  var mixte = [
    testCote('Adducteurs',      ['Côté sain', 'Côté atteint', 'Asym.']),
    testCote('Abducteurs',      ['Côté sain', 'Côté atteint', 'Asym.']),
    testCote('Quadriceps',      ['Gauche', 'Droit', 'Asym.']),
    testCote('Ischio-jambiers', ['Gauche', 'Droit', 'Asym.'])
  ];
  var r = lots(mixte);
  verifie('deux tableaux, pas cinq colonnes', '2', String(r.length));
  verifie('le premier garde sain/atteint', 'Adducteurs,Abducteurs',
          r[0].map(function (t) { return t.label; }).join(','));
  verifie('le second garde gauche/droit',  'Quadriceps,Ischio-jambiers',
          r[1].map(function (t) { return t.label; }).join(','));

  /* Une convention seule ne se coupe pas. */
  verifie('un groupe homogène reste entier', '1',
          String(lots([testCote('A', ['Gauche', 'Droit']), testCote('B', ['Gauche', 'Droit'])]).length));

  /* Une ligne SANS côté — « Conditions », « Cadence » — rejoint le lot en
     cours. Sans cela, chaque ligne en toutes lettres ouvrirait sa table. */
  var course = [
    testCote('Conditions', []),
    testCote('Cadence', []),
    testCote('Zone d\'attaque', ['Gauche', 'Droit'])
  ];
  verifie('les lignes sans côté ne fragmentent pas', '1', String(lots(course).length));

  /* L'ordre de PREMIÈRE apparition est conservé : le médecin lit les tests
     dans l'ordre où ils ont été réalisés. */
  var inverse = [
    testCote('Quadriceps', ['Gauche', 'Droit']),
    testCote('Adducteurs', ['Côté sain', 'Côté atteint'])
  ];
  verifie('l\'ordre suit le bilan', 'Quadriceps|Adducteurs',
          lots(inverse).map(function (l) { return l[0].label; }).join('|'));

  /* Garde-fou textuel : les cas ci-dessus vérifient la fonction, pas QUI
     l'appelle. C'est le trou où le défaut se loge à chaque fois — une règle
     juste que personne n'invoque. */
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '');
  verifie('fermerTable passe bien par le partitionnement', 'true',
          String(/_lotsParConvention\(tampon\)\.forEach\(_ecrireTable\)/.test(sansCom)));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

#!/usr/bin/env node
/* Cas de référence — affichage de l'asymétrie.
 *
 * Le LSI reste calculé exactement comme avant. Ce qui change est l'AFFICHAGE :
 * on montre l'écart au lieu de la ressemblance. 80 % de symétrie devient 20 %
 * d'asymétrie, et les couleurs, qui lisent toujours le LSI, ne bougent pas —
 * c'est ce qui rend ce changement sûr.
 *
 * Deux points méritent des cas dédiés :
 *
 *   - En unilatéral, le LSI peut dépasser 100 % : le côté atteint est alors
 *     MEILLEUR que le sain. L'asymétrie devient négative, et le signe porte
 *     l'information — la valeur absolue la perdrait.
 *   - Le Drop Jump ratio suit la logique inverse (plus c'est bas, mieux
 *     c'est) : un LSI de 110 % y reste vert, donc une asymétrie de −10 %.
 *
 *   node qualite/lsi-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');
/* Les quatre feuilles concernees, lues UNE fois et en tete : les cas de
   l'etiquette les comparent entre elles, et une lecture dispersee au fil du
   fichier faisait dependre l'ordre des cas de l'ordre des declarations. */
var outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');
var htmlB  = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
var _dC = outils.indexOf('var CR_LETTRE_CSS = [');
var _fC = outils.indexOf('].join', _dC);
if (_dC < 0 || _fC < _dC) { console.error('CR_LETTRE_CSS introuvable'); process.exit(1); }
var cssLettre = new Function(outils.slice(_dC, _fC + 1) + ';\nreturn CR_LETTRE_CSS.join("");')();
var deb = src.indexOf('/* ── Asymétrie affichée');
var fin = src.indexOf('function setLSI');
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes introuvables dans js/bilan.js.');
  console.error('Le test extrait la zone entre le commentaire « Asymétrie affichée »');
  console.error('et `function setLSI`. Corriger les bornes si elles ont bouge.');
  process.exit(1);
}
var api = new Function(src.slice(deb, fin) +
  '\nreturn { asymPct: asymPct, asymTxt: asymTxt, lsiClass: lsiClass };')();

/* Le libelle du verdict est LU dans la source, jamais recopie ici : le
   modifier ne doit pas obliger a retoucher le cas, et un cas qui porte sa
   propre copie du libelle cesse de verifier le produit. */
var VERDICT_COMPLET = (src.match(/var LSI_INVERSE_TXT = '([^']*)'/) || [])[1] || '';

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── Conversion ──────────────────────────────────────────────────────────── */

console.log('\nConversion — l\'écart, pas la ressemblance');
verifie('LSI 80 % → 20 % d\'asymétrie', '20%', api.asymTxt(80));
verifie('LSI 92 % → 8 %', '8%', api.asymTxt(92));
verifie('LSI 100 % → 0 %', '0%', api.asymTxt(100));
verifie('LSI 74,5 % → 26 % (arrondi)', '26%', api.asymTxt(74.5));
verifie('une décimale reste possible sur demande', '25.5%', api.asymTxt(74.5, 1));
verifie('valeur absente → chaîne vide', '', api.asymTxt(NaN));
verifie('l\'entier est le défaut, pas une option', '20%', api.asymTxt(80, 0));

/* ── Côté atteint meilleur que le sain ───────────────────────────────────── */

console.log('\nUnilatéral — le côté atteint peut dépasser le sain');
verifie('LSI 108 % → -8 %, le signe dit le sens', '-8%', api.asymTxt(108));
verifie('LSI 120 % → -20 %', '-20%', api.asymTxt(120));
// 100,04 arrondit à 0,0 : pas de « -0.0% », qui n'aurait aucun sens.
verifie('un écart nul ne s\'affiche jamais négatif', '0%', api.asymTxt(100.04));

/* ── Couleurs : elles lisent le LSI, elles ne changent pas ───────────────── */

console.log('\nCouleurs — inchangées, elles lisent toujours le LSI');
verifie('LSI 92 % → vert', 'good', api.lsiClass(92));
verifie('LSI 90 % → vert (borne incluse)', 'good', api.lsiClass(90));
verifie('LSI 85 % → orange', 'warn', api.lsiClass(85));
verifie('LSI 80 % → orange (borne incluse)', 'warn', api.lsiClass(80));
verifie('LSI 79,9 % → rouge', 'bad', api.lsiClass(79.9));
verifie('LSI 108 % → vert (atteint meilleur)', 'good', api.lsiClass(108));

console.log('\nDrop Jump — logique inverse, plus c\'est bas mieux c\'est');
verifie('LSI 105 % → vert', 'good', api.lsiClass(105, false));
verifie('LSI 110 % → vert (borne incluse)', 'good', api.lsiClass(110, false));
verifie('LSI 111 % → rouge', 'bad', api.lsiClass(111, false));
verifie('affichage du Drop Jump à 110 % → -10 %', '-10%', api.asymTxt(110));

/* ══════════════════════════════════════════════════════════════════════════
   Garde-fou : personne ne fabrique un pourcentage depuis un LSI a la main.

   Les cas ci-dessus verifient la CONVERSION. Ils ne verifiaient pas QUI
   l'appelle — et c'etait precisement le trou : asymPct/asymTxt etaient
   justes, mais trois fonctions de calcul (calcEpForce, calcPiCIM, calcLunge)
   ecrivaient `lsi.toFixed(0) + '%'` en direct. Vingt-six cellules affichaient
   donc la symetrie sous une colonne intitulee « Asym. % ».

   Ce controle est textuel a dessein : il attrape la faute a la source, dans
   n'importe quelle fonction, y compris celles qui n'existent pas encore.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nAucun pourcentage fabriqué depuis un LSI sans passer par asymTxt');

var pourcentDepuisLsi = [
  /\b\w*lsi\w*\s*\.\s*toFixed\s*\([^)]*\)\s*\+\s*'%'/i,
  /Math\.round\s*\(\s*\w*lsi\w*\s*\)\s*\+\s*'%'/i
];

var fautes = [];
src.split('\n').forEach(function (ligne, i) {
  var t = ligne.trim();
  if (!t || t.indexOf('//') === 0 || t.indexOf('*') === 0) return;
  if (/asymTxt|asymPct/.test(ligne)) return;   // la conversion est faite
  if (pourcentDepuisLsi.some(function (re) { return re.test(ligne); })) {
    fautes.push('    js/bilan.js:' + (i + 1) + '  ' + t.slice(0, 88));
  }
});

if (fautes.length) {
  nbKo++;
  console.log('    ✗ ' + fautes.length + ' endroit(s) affichent encore la symétrie :');
  fautes.forEach(function (f) { console.log(f); });
} else {
  nbOk++;
  console.log('    ✓ aucun');
}

/* ══════════════════════════════════════════════════════════════════════════
   Effondrement 2 → 1 appui — meme bascule, autre grandeur.

   Ce chiffre n'a JAMAIS ete un LSI : c'est le rapport 1 appui / 2 appuis a
   l'interieur d'un meme cote, pas une comparaison entre les deux cotes. Sa
   colonne « Asym. » est vide, et c'est normal.

   Mais la ligne s'appelle « Effondrement » et affichait le pourcentage
   CONSERVE : 83 % se lisait « 83 % d'effondrement » alors qu'il n'y en avait
   que 17. Le mot et le chiffre disaient l'inverse l'un de l'autre.

   Comme pour le LSI, une seule chose bascule — le nombre affiche. Le ratio
   continue de piloter la couleur et le statut du test, ce qui rend le
   changement sur : un seuil « ≥ 90 % » devient « ≤ 10 % » sans qu'aucune
   decision clinique ne change.
   ══════════════════════════════════════════════════════════════════════════ */

var debE = src.indexOf('function fmtRatio');
// Cherché APRÈS fmtRatio : `_isBilateralForZones` apparaît aussi plus haut,
// dans une autre fonction — sans le décalage, la borne de fin précède le début.
var finE = src.indexOf('var bilateral = _isBilateralForZones', debE);
if (debE < 0 || finE < 0 || finE <= debE) {
  console.error('Bornes de fmtRatio introuvables dans js/bilan.js (calcPiCIM).');
  process.exit(1);
}
var eff = new Function(
  'var el = { textContent: "", className: "" };' +
  src.slice(debE, finE) +
  '\nreturn function (val) { fmtRatio(el, val); return el; };')();

console.log('\nEffondrement 2 → 1 appui — la perte, pas ce qui reste');
verifie('ratio 83 % → 17 % d\'effondrement', '17%', eff(82.6).textContent);
verifie('ratio 78 % → 22 %', '22%', eff(78.3).textContent);
verifie('ratio 100 % → 0 %, aucune perte', '0%', eff(100).textContent);
verifie('valeur absente → tiret', '—', eff(NaN).textContent);
// Le 1 appui peut depasser le 2 appuis : la perte est alors negative.
verifie('ratio 104 % → -4 %, le signe dit le sens', '-4%', eff(104).textContent);
verifie('une perte nulle ne s\'affiche jamais négative', '0%', eff(100.4).textContent);

console.log('\nCouleurs de l\'effondrement — elles lisent toujours le ratio');
verifie('ratio 92 % (8 % de perte) → vert', 'measure-stat good', eff(92).className);
verifie('ratio 90 % (10 %, borne incluse) → vert', 'measure-stat good', eff(90).className);
verifie('ratio 85 % (15 %) → orange', 'measure-stat warn', eff(85).className);
verifie('ratio 80 % (20 %, borne incluse) → orange', 'measure-stat warn', eff(80).className);
verifie('ratio 79 % (21 %) → rouge', 'measure-stat bad', eff(79).className);

/* Le seuil ne peut plus s'enoncer « ≥ 90 % » sous une colonne qui affiche une
   perte. Les deux legendes du formulaire doivent parler dans l'unite affichee. */
console.log('\nLes légendes s\'énoncent dans l\'unité affichée');
var html = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
/* La Course interne du mollet a quitte la page Pied pour les Tests
   Fonctionnels MI. Sans ce changement de borne, la tranche etait VIDE et les
   deux gardes passaient a vide — un test vert qui ne teste plus rien. */
var _debCim = html.indexOf('data-block-id="fonctionnels--cim"');
var zoneCim = html.slice(_debCim, html.indexOf('data-block-id=', _debCim + 40));
if (_debCim < 0 || !zoneCim.trim()) {
  console.error('Bloc « fonctionnels--cim » introuvable dans bilan.html.');
  process.exit(1);
}
verifie('la tranche contient bien le test', true, /pi-cim1-cs/.test(zoneCim));
verifie('aucun seuil « positif si < 90% » ne subsiste', false, /positif si\s*&lt;\s*90/.test(zoneCim));
verifie('aucune légende ne décrit encore le rapport brut', false,
        /\(1 appui \/ 2 appuis\) × 100, par côté/.test(zoneCim));

/* ── Le côté atteint fait MIEUX ──────────────────────────────────────────── */

/* Le nombre disait deja la verite — « -30% », signe compris. C'est le MOT qui
   mentait : « Symetrique », en vert, sur un ecart de trente pour cent.

   Le critere de reussite est « LSI >= 90 % » : un cote atteint superieur le
   franchit largement, et le test EST valide. Mais au-dela de 110 % l'ecart est
   du meme ordre que celui qu'on appelle ailleurs « asymetrie significative »,
   simplement INVERSE — et rien, dans un vert uni, n'invite a se demander
   pourquoi le cote reference fait moins bien. C'est pourtant la question :
   cote sain deconditionne, dominance preexistante, ou conditions de mesure
   differentes d'un cote a l'autre.

   Ce cas ne peut se produire QU'AVEC une lateralite renseignee. Sans elle le
   LSI vaut min/max, donc jamais plus de 100. */

console.log('\nLe côté atteint peut faire mieux — et ce n\'est pas « symétrique »');

/* Les trois fonctions d'un bloc sont SOLIDAIRES — `lsiCls2` appelle
   `lsiVal2`, et `statOf2` lit la valeur qu'elle rend. Les extraire une par une
   les separait de leurs dependances : le cas levait une ReferenceError au lieu
   de mesurer quoi que ce soit. On prend la tranche entiere, du premier au
   dernier, avec le socle qui porte `lsiInverse`. */
function paireDe(bilatNom, bilat, borneApres) {
  var d = src.indexOf('lsiVal2 = function', borneApres || 0);
  if (d < 0) { console.error('« lsiVal2 » introuvable'); process.exit(1); }
  var dS = src.indexOf('statOf2 = function', d);
  var f = src.indexOf('\n  };', dS);
  if (dS < 0 || f < 0) { console.error('paire incomplète'); process.exit(1); }
  var tranche = src.slice(d, f + 4);
  /* `var` en tete : dans le fichier, le premier bloc les declare et le second
     les REASSIGNE. Sans ce prefixe la tranche du second bloc ecrirait dans le
     global — et les deux blocs se marcheraient dessus d'un cas a l'autre. */
  return new Function(bilatNom, socle + '\nvar ' + tranche +
    '\nreturn { cls: lsiCls2, val: lsiVal2, stat: statOf2 };')(bilat);
}

/* _statForce : les tests de force du CR. */
var socle = src.slice(deb, fin);
var dSF = src.indexOf('function _statForce(');
var statForce = new Function(socle + '\n' + src.slice(dSF, src.indexOf('\n}', dSF) + 2) +
                             '\nreturn _statForce;')();
verifie('force — LSI 95 % reste symétrique', 'Symétrique', statForce(95).txt);
verifie('force — LSI 108 % reste symétrique (dans la bande)', 'Symétrique', statForce(108).txt);
verifie('force — LSI 130 % ne se dit plus symétrique', VERDICT_COMPLET, statForce(130).txt);
/* VERT, et c'est une decision : le critere « >= 90 % » EST atteint. Un ambre
   ferait lire un resultat a surveiller la ou le test est reussi. Ce qui
   distingue la ligne n'est pas sa couleur mais son second niveau de lecture. */
verifie('… et reste vert, le critère étant atteint', 'ok', statForce(130).cls);
verifie('force — LSI 85 % inchangé', 'Asymétrie modérée', statForce(85).txt);

/* Les deux blocs du CR ont leur propre paire lsiCls2 / statOf2 : celle des
   sections orthopediques, et celle des tests fonctionnels MI — c'est cette
   derniere qui porte le Hop Test. Les DEUX sont verifiees : une regle ecrite
   d'un seul cote ne se voit pas la ou le document est lu. */
[['ORTHO', '_isBilat', 0],
 ['MI', '_isBilatMI', src.indexOf('lsiVal2 = function',
                       src.indexOf('lsiVal2 = function') + 10)]].forEach(function (b) {
  var nom = b[0], bilatNom = b[1], borne = b[2];
  var p = paireDe(bilatNom, false, borne);
  var cls = p.cls, val = p.val, stat = p.stat;

  verifie(nom + ' — 130 % reste vert', 'good', cls(130, 100));
  verifie(nom + ' — 108 % reste vert', 'good', cls(108, 100));
  verifie(nom + ' — 95 % reste vert', 'good', cls(95, 100));
  verifie(nom + ' — le verdict dit l\'inversion', VERDICT_COMPLET,
          stat(cls(130, 100), val(130, 100)));
  verifie(nom + ' — 108 % garde son verdict habituel', 'true',
          String(stat(cls(108, 100), val(108, 100)) !== VERDICT_COMPLET));

  /* Sans lateralite, le LSI vaut min/max : l'inversion est arithmetiquement
     impossible et le libelle « Symetrique » reste juste. Si ce cas tombait,
     c'est que la regle s'est mise a mordre la ou elle n'a rien a faire. */
  var pB = paireDe(bilatNom, true, borne);
  var clsB = pB.cls, valB = pB.val, statB = pB.stat;
  verifie(nom + ' — bilatéral : le LSI ne dépasse jamais 100', 'true',
          String(valB(130, 100) <= 100));
  verifie(nom + ' — … donc jamais de verdict « inversé »', 'true',
          String(statB(clsB(130, 100), valB(130, 100)) !== VERDICT_COMPLET));
  verifie(nom + ' — bilatéral 100/100 reste symétrique', 'Symétrique',
          statB(clsB(100, 100), valB(100, 100)));
});

/* Le cablage : chaque appel doit transmettre la valeur, sinon `statOf2` ne
   peut pas voir l'inversion et le banc ci-dessus prouve une fonction que
   personne n'alimente. */
var appelsNus = (src.match(/statOf2\(lsiCls2\([^)]*\)\)/g) || []);
verifie('aucun appel ne laisse statOf2 sans la valeur', '0', String(appelsNus.length));
/* Les deux DEFINITIONS s'ecrivent « statOf2 = function », jamais
   « statOf2( » : elles ne sont pas comptees ici. Le nombre est celui des
   appels reels — treize lignes de CR plus le Drop Jump RSI. */
verifie('les quatorze appels sont là', '14', String((src.match(/statOf2\(/g) || []).length));

/* ── Observations des tests de force ──────────────────────────────────────── */

/* Chaque test de force porte un `<textarea>` d'observation dans le formulaire.
   Seul le RACHIS le faisait remonter : sur la hanche, le genou et le pied, le
   praticien ecrivait dans le vide — rien dans le CR, rien dans le courrier.

   Elle sort en `.cr-mt-note`, la forme deja employee pour les reperes
   (« Repère EIAS-sol : 45 cm ») : petite et grise. C'est aussi celle que
   `_crMedValeur` releve en `note`, que le courrier rend en `.lt-note` —
   petite et grise elle aussi. Un seul geste, les deux documents. */

console.log('\nL\'observation d\'un test de force atteint les deux documents');

var dObs = src.indexOf('function _crObsNote(');
if (dObs < 0) { console.error('_crObsNote introuvable'); process.exit(1); }
var champs = {};
var obsNote = new Function('document', '_blEsc',
  src.slice(dObs, src.indexOf('\n}', dObs) + 2) + '\nreturn _crObsNote;')(
  { getElementById: function (id) { return champs[id] ? { value: champs[id] } : null; } },
  function (x) { return String(x); });

champs['ge-f-quad-obs'] = '  Douleur en fin d\'amplitude  ';
verifie('elle sort en note grise', '<div class="cr-mt-note">Douleur en fin d\'amplitude</div>',
        obsNote('ge-f-quad'));
verifie('une observation vide ne pose rien', '', obsNote('ha-f-add'));
champs['pi-f-ev-obs'] = '   ';
verifie('… ni une observation faite d\'espaces', '', obsNote('pi-f-ev'));

/* Le CABLAGE : les huit appels de test de force doivent l'ajouter. Sans cette
   verification, la fonction serait juste et personne ne l'appellerait — le
   piege le plus frequent de ce depot. */
var appelsForce = src.match(/crItem\(ft\.label, (?:valStr|parts)[^;]*/g) || [];
verifie('les huit appels de force sont là', '8', String(appelsForce.length));
var sansObs = appelsForce.filter(function (a) { return a.indexOf('_crObsNote(ft.key)') < 0; });
verifie('aucun n\'oublie l\'observation', '0', String(sansObs.length), sansObs.join(' | '));

/* Et le RELEVE : `_crMedValeur` doit reconnaitre `.cr-mt-note` pour que le
   courrier la recoive en `note`. C'est la marche qui relie les deux documents. */
verifie('le courrier la reçoit par .cr-mt-note', 'true',
        /querySelector\('\.cr-mt-note'\)/.test(src));

/* ── Le verdict et sa nuance sont SEPARES ─────────────────────────────────── */

/* La pastille avait ete chargee de porter une explication : elle disait
   « Validé » ET « asymétrie inversée », sur deux lignes, dans un enclos
   colore. Trois corrections successives ont porte sur la mise en forme de ce
   pave sans jamais poser la vraie question — une pastille dit un ETAT, d'un
   mot ; une explication est une NOTE.

   Le tableau a deja une place pour les notes : sous le nom du test, la ou
   vivent le geste et le repere. La nuance y descend. La colonne « Résultat »
   redevient homogene, et l'avertissement gagne la place de dire ce qu'il veut
   vraiment dire.

   Ce qu'on accepte en echange, et c'etait l'argument du choix inverse : un
   lecteur qui ne parcourt que la colonne de droite ne verra pas la nuance. */

console.log('\nLe verdict tient en un mot, la nuance descend dans les notes');

verifie('le verdict porte encore sa nuance à la source', 'true',
        String(VERDICT_COMPLET.indexOf(' — ') > 0));

var dVN = src.indexOf('function _crVerdictNuance(');
if (dVN < 0) { console.error('_crVerdictNuance introuvable dans js/bilan.js'); process.exit(1); }
var vn = new Function(src.slice(dVN, src.indexOf('\n}', dVN) + 2) +
                      '\nreturn _crVerdictNuance;')();

verifie('la tête tient en un mot', 'Validé', vn(VERDICT_COMPLET).tete);
verifie('… et la nuance dit ce qu\'elle veut dire', 'true',
        String(vn(VERDICT_COMPLET).nuance.indexOf('côté atteint') > 0));
verifie('un verdict simple n\'a pas de nuance', '', vn('Symétrique').nuance);
verifie('… et ressort entier', 'Symétrique', vn('Symétrique').tete);
/* La coupe se fait sur le PREMIER « — » entoure d'espaces, jamais au-dela :
   la nuance peut en contenir un. */
verifie('la coupe ne se fait qu\'une fois', 'a', vn('a — b — c').tete);
verifie('… le reste appartenant à la nuance', 'b — c', vn('a — b — c').nuance);
verifie('un mot composé n\'est pas coupé', 'Sous-maximal', vn('Sous-maximal').tete);
verifie('une valeur absente ne lève pas', '', vn(null).tete);

console.log('\nLa ligne de CR place chacune à sa place');

var dCI = src.indexOf('function crItem(');
var crItem = new Function('_crVerdictNuance', '_blEsc', '_crMarquage', 'document',
  src.slice(dCI, src.indexOf('\n  }', dCI) + 4) + '\nreturn crItem;')(
  vn,
  function (x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
  function () { return { cls: '', badge: '' }; },
  { getElementById: function () { return null; } });

var ligne = crItem('Force fonctionnelle', '<table class="cr-mt"></table>', VERDICT_COMPLET, 'good', []);
verifie('la pastille ne porte que le verdict', 'true', String(ligne.indexOf('>Validé<') > 0));
verifie('… et plus aucune sous-ligne dedans', 'false', String(/cr-tag-sub/.test(ligne)));
verifie('la nuance rejoint les notes', 'true', String(/cr-mt-note/.test(ligne)));
verifie('… signalée comme un avertissement', 'true', String(/cr-mt-alerte/.test(ligne)));
verifie('… et placée hors de la pastille', 'true',
        String(ligne.indexOf('cr-mt-alerte') < ligne.indexOf('cr-tag ')));
/* La ligne doit aussi ECRIRE le transport. Sans ce cas, retirer `data-nuance`
   de `crItem` laissait tout au vert : le banc de lecture, plus bas, fabrique
   sa propre pastille et ne prouve donc rien de ce que `crItem` produit. */
verifie('la ligne écrit le transport de la nuance', 'true',
        String(ligne.indexOf('data-nuance="') > 0));
verifie('… et celui du verdict', 'true',
        String(ligne.indexOf('data-statut="Validé"') > 0));
verifie('un verdict simple n\'écrit aucune nuance', 'false',
        String(/data-nuance/.test(simple0)));

var simple0 = crItem('Capacité de saut', '135 cm', 'Symétrique', 'good', []);
var simple = simple0;
verifie('un verdict simple ne pose aucune note', 'false', String(/cr-mt-alerte/.test(simple)));

console.log('\nLe transport porte les deux, séparément');

var dR = src.indexOf('var tagEl = it.querySelector');
var lecture = src.slice(dR, src.indexOf('\n        var v =', dR));
var relire = new Function('it', lecture + '\nreturn { tag: tag, nuance: nuance };');
function pastille(statut, nuance, texte) {
  return { querySelector: function (sel) {
    if (sel !== '.cr-tag') return null;
    return { getAttribute: function (n) {
               return n === 'data-statut' ? statut : n === 'data-nuance' ? nuance : null; },
             textContent: texte,
             classList: { contains: function () { return false; } } };
  } };
}
var lu = relire(pastille('Validé', 'asymétrie inversée : le côté atteint dépasse le côté sain', 'Validé'));
verifie('le verdict arrive seul', 'Validé', lu.tag);
verifie('… et la nuance à côté', 'true', String(lu.nuance.indexOf('côté atteint') > 0));

/* Repli : un payload ecrit par une version anterieure porte encore la chaine
   entiere dans `statut`. Sans coupe a la relecture, la pastille du courrier
   afficherait tout d'un bloc. */
var dCV = outils.indexOf('function _crVerdict(');
if (dCV < 0) { console.error('_crVerdict introuvable dans outils.html'); process.exit(1); }
var crVerdict = new Function(
  outils.slice(dCV, outils.indexOf('\n  }', dCV) + 4) + '\nreturn _crVerdict;')();
verifie('outils coupe un ancien payload', 'Validé', crVerdict({ statut: VERDICT_COMPLET }).statut);
verifie('… et en tire la nuance', 'true',
        String(crVerdict({ statut: VERDICT_COMPLET }).nuance.indexOf('côté atteint') > 0));
verifie('un payload neuf passe tel quel', 'Validé',
        crVerdict({ statut: 'Validé', nuance: 'x' }).statut);
verifie('… en gardant sa nuance', 'x', crVerdict({ statut: 'Validé', nuance: 'x' }).nuance);

console.log('\nL\'étiquette perd sa bordure et son arrondi');
/* Option 5 : la pastille actuelle moins son enclos. Quatre feuilles portent la
   regle, et une seule oubliee suffit a rendre le document incoherent. */
[['aperçu — bilan.html', (htmlB.match(/\.cr-item \.cr-tag \{[^}]*\}/) || [''])[0]],
 ['export autonome',     (src.match(/\.cr-tag\{[^}]*\}/) || [''])[0]],
 ['courrier',            (cssLettre.match(/\.lt-chip\{[^}]*\}/) || [''])[0]],
 ['liste à cocher',      (outils.match(/\.cr-tf-tag \{[^}]*\}/) || [''])[0]]
].forEach(function (r) {
  verifie(r[0] + ' — angle refermé', 'true', String(/border-radius: ?4px/.test(r[1])), r[1]);
  verifie(r[0] + ' — plus de bordure', 'false', String(/border: ?1px solid/.test(r[1])), r[1]);
});

console.log('\nLa nuance s\'affiche sous le nom du test, dans les deux documents');

/* On RÉEND la lettre, plutot que de chercher une classe dans le fichier :
   `lt-alerte` existe aussi dans la feuille de style, si bien qu'un rendu qui
   cesserait de poser la nuance laissait le cas au vert. Le seul temoin fiable
   est le HTML produit. */
var dBH = outils.indexOf('function _crBlocsHtml');
var fBH = outils.indexOf('\n  function ', dBH + 10);
var dCV2 = outils.indexOf('function _crVerdict(');
if (dBH < 0 || fBH < dBH || dCV2 < 0) { console.error('Bornes du rendu de lettre introuvables'); process.exit(1); }
var blocsHtml = new Function('_crEsc', '_crEstBloc', '_crTagClasse', '_crStatutChips',
                             '_crStatutsParCote', '_afSousLignes',
  outils.slice(dCV2, outils.indexOf('\n  }', dCV2) + 4) + '\n' +
  outils.slice(dBH, fBH) + '\nreturn _crBlocsHtml;')(
  function (x) { return String(x == null ? '' : x); },
  function (x) { return x && typeof x === 'object' && x.t; },
  function () { return 'ok'; },
  function (t) { return '<span class="lt-chip">' + String((t && t.statut) || '') + '</span>'; },
  function () { return null; }, function () {});

var lettre = blocsHtml([
  { t: 'sec', txt: 'TESTS FONCTIONNELS' },
  { t: 'test', label: 'Force fonctionnelle du membre inférieur', valeur: '',
    cellules: [{ entete: 'Côté sain', valeur: '28 rép.' },
               { entete: 'Côté atteint', valeur: '34 rép.' }],
    statut: 'Validé', nuance: 'asymétrie inversée : le côté atteint dépasse le côté sain',
    niveau: 'ok' }
]);
verifie('le courrier affiche la nuance', 'true', String(/asymétrie inversée/.test(lettre)));
verifie('… dans la cellule de l\'intitulé', 'true', String(/lt-note lt-alerte/.test(lettre)));
/* Et surtout PAS dans la pastille : c'est tout l'objet du changement. */
var chipLettre = (lettre.match(/<span class="lt-chip">[^<]*<\/span>/) || [''])[0];
verifie('… et jamais dans la pastille', 'false', String(/asymétrie/.test(chipLettre)), chipLettre);
verifie('la nuance précède la pastille dans le balisage', 'true',
        String(lettre.indexOf('lt-alerte') < lettre.indexOf('lt-chip')));

verifie('la liste à cocher a sa règle', 'true', /cr-tf-alerte/.test(outils));
verifie('… et la pose au rendu', 'true', /cr-tf-val cr-tf-alerte/.test(outils));
verifie('la version texte du courrier la porte', 'true',
        /if \(_v\.nuance\) out\.push/.test(outils));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

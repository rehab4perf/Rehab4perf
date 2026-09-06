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
verifie('force — LSI 130 % ne se dit plus symétrique', 'Validé — asymétrie inversée',
        statForce(130).txt);
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
  verifie(nom + ' — le verdict dit l\'inversion', 'Validé — asymétrie inversée',
          stat(cls(130, 100), val(130, 100)));
  verifie(nom + ' — 108 % garde son verdict habituel', 'true',
          String(stat(cls(108, 100), val(108, 100)) !== 'Validé — asymétrie inversée'));

  /* Sans lateralite, le LSI vaut min/max : l'inversion est arithmetiquement
     impossible et le libelle « Symetrique » reste juste. Si ce cas tombait,
     c'est que la regle s'est mise a mordre la ou elle n'a rien a faire. */
  var pB = paireDe(bilatNom, true, borne);
  var clsB = pB.cls, valB = pB.val, statB = pB.stat;
  verifie(nom + ' — bilatéral : le LSI ne dépasse jamais 100', 'true',
          String(valB(130, 100) <= 100));
  verifie(nom + ' — … donc jamais de verdict « inversé »', 'true',
          String(statB(clsB(130, 100), valB(130, 100)) !== 'Validé — asymétrie inversée'));
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

/* ── La pastille se lit en deux temps ─────────────────────────────────────── */

/* « Validé — asymétrie inversée » sur une seule ligne obligeait a lire
   vingt-sept caracteres pour trouver « Validé », qui est l'essentiel. Le fait
   d'abord, la nuance dessous, plus petite.

   La convention est portee par la CHAINE — « verdict — nuance » — et non par un
   champ de plus : le libelle n'a qu'un seul endroit ou etre ecrit. Les rendus
   la coupent sur le tiret cadratin entoure d'espaces. Aucun autre verdict n'en
   contient : la coupe ne mord que la ou elle doit. */

console.log('\nLa pastille coupe le verdict de sa nuance');

var dTC = src.indexOf('function _crTagCorps(');
if (dTC < 0) { console.error('_crTagCorps introuvable dans js/bilan.js'); process.exit(1); }
var tagCorps = new Function(src.slice(dTC, src.indexOf('\n}', dTC) + 2) +
                            '\nreturn _crTagCorps;')();

verifie('le verdict reste en tête', 'true',
        /^Validé<span class="cr-tag-sub">/.test(tagCorps('Validé — asymétrie inversée')));
verifie('… et la nuance passe dessous', 'true',
        /<span class="cr-tag-sub">asymétrie inversée<\/span>$/
          .test(tagCorps('Validé — asymétrie inversée')));
verifie('un verdict sans tiret ressort intact', 'Symétrique', tagCorps('Symétrique'));
verifie('… y compris vide', '', tagCorps(''));
verifie('… et une valeur absente ne lève pas', '', tagCorps(null));
/* Un tiret NON entoure d'espaces — « Sous-maximal » — ne doit pas etre coupe :
   la convention porte sur le tiret cadratin isole, pas sur tout tiret. */
verifie('un mot composé n\'est pas coupé', 'Sous-maximal', tagCorps('Sous-maximal'));

console.log('\nLes trois rendus appliquent la coupe');
/* Le banc ci-dessus prouve la FONCTION. Sans ces verifications, un rendu qui
   ne l'appelle pas laisserait le cas au vert et la pastille sur une ligne —
   le piege du cablage muet, deja rencontre deux fois dans ce depot. */
verifie('les deux crItem de js/bilan.js l\'appellent', '2',
        String((src.match(/cr-tag ' \+ tagClass \+ '">' \+ _crTagCorps\(tag\)/g) || []).length));
verifie('les tests personnalisés aussi', 'true',
        /cr-tag '\+tagCls\+'">'\+_crTagCorps\(tag\)/.test(src));

var outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');
verifie('outils a sa propre coupe', 'true', /function _crChipCorps/.test(outils));
verifie('… et la lettre l\'emploie', 'true', /_crChipCorps\(t\.statut\)/.test(outils));
verifie('… y compris pour les mentions par côté', 'true', /_crChipCorps\(st\.txt\)/.test(outils));
verifie('plus aucune pastille n\'échappe à la coupe', '0',
        String((outils.match(/classe \+ '">' \+ _crEsc\(t\.statut\)/g) || []).length));

console.log('\nLe style existe dans les TROIS feuilles');
/* Une regle ecrite d'un seul cote ne se voit pas la ou le document est lu :
   l'apercu (bilan.html), l'export autonome (la chaine `var css` de bilan.js)
   et le courrier (outils.html) sont trois feuilles distinctes. */
var htmlB = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
verifie('aperçu — bilan.html', 'true', /\.cr-tag-sub \{[\s\S]{0,120}display: block/.test(htmlB));
verifie('export autonome — la chaîne css de bilan.js', 'true',
        /\.cr-tag-sub\{display:block/.test(src));
/* Le courrier compte pour DEUX feuilles, et c'est le piege de ce domaine.
   `CR_LETTRE_CSS` est la seule recopiee dans le document imprime ; le <style>
   de la page ne sert que l'ecran. Une premiere version posait la regle a cote,
   dans le <style> : l'apercu paraissait juste et la pastille se remettait sur
   une ligne dans le PDF — le document que recoit le medecin. Le cas passait.

   On EXECUTE ici la declaration telle qu'elle est ecrite, plutot que de la
   chercher a la regexp : elle est coupee en dizaines de chaines, et une regle
   a cheval sur deux d'entre elles echappe a toute recherche textuelle. */
var dC = outils.indexOf('var CR_LETTRE_CSS = [');
var fC = outils.indexOf('].join', dC);
if (dC < 0 || fC < dC) { console.error('CR_LETTRE_CSS introuvable'); process.exit(1); }
var cssLettre = new Function(outils.slice(dC, fC + 1) + ';\nreturn CR_LETTRE_CSS.join("");')();
verifie('courrier — la feuille recopiée dans le PDF', 'true',
        /\.lt-chip \.chip-sub\{display:block/.test(cssLettre));
verifie('… et elle est bien celle du courrier', 'true',
        /\.lt-chip\{display:inline-block/.test(cssLettre));
verifie('liste à cocher — le <style> de la page', 'true',
        /\.cr-tf-tag \.chip-sub \{[\s\S]{0,120}display:block/.test(outils));

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

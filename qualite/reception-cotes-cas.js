#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Réception — 80 % Hop Test : un verdict PAR JAMBE

   C'est un test de réception : il se passe sur chaque jambe, et chaque jambe a
   son résultat. Le verdict était pourtant fondu sur les deux — un critère
   conditionnant manquant d'un côté rendait « Non acquis » tout court. Le
   médecin apprenait que le test avait échoué sans apprendre OÙ, alors que
   c'est exactement ce qui oriente la rééducation.

   Trois des cinq critères CONDITIONNENT la réussite (`acquis:true`) ; les deux
   autres — valgus dynamique, contrôle du tronc — sont indicatifs et ne pèsent
   pas sur le verdict.

   On exécute la VRAIE fonction de verdict et la VRAIE table des critères.
   ════════════════════════════════════════════════════════════════════════════ */
var fs = require('fs'), path = require('path');
var echecs = 0;
function verifie(nom, attendu, obtenu){
  var ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  console.log('    ' + (ok ? '✓' : '✗') + ' ' + nom
    + (ok ? '' : '\n        attendu : ' + JSON.stringify(attendu)
             + '\n        obtenu  : ' + JSON.stringify(obtenu)));
  if (!ok) echecs++;
}
var R = path.join(__dirname, '..');
var src    = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var outils = fs.readFileSync(path.join(R, 'outils.html'), 'utf8');

/* ── La vraie table des criteres ───────────────────────────────────────── */
var c0 = src.indexOf('const CRITERIA_REC = [');
var c1 = src.indexOf('\n];', c0);
if (c0 < 0 || c1 < c0) { console.error('Bornes de CRITERIA_REC introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
var CRIT = new Function(src.slice(c0, c1 + 3) + '\nreturn CRITERIA_REC;')();

console.log('\n  Les critères conditionnants');
verifie('cinq critères en tout', 5, CRIT.length);
verifie('… dont trois conditionnent la réussite', 3,
  CRIT.filter(function(c){ return c.acquis; }).length);
/* Ce sont bien les TROIS PREMIERS : le praticien les designe par leur rang. */
verifie('… et ce sont les trois premiers', [true, true, true],
  CRIT.slice(0, 3).map(function(c){ return !!c.acquis; }));
/* Les deux derniers portent un libelle de DEFAUT : ils decrivent ce qui
   manque, pas ce qui conditionne. */
verifie('les deux autres sont indicatifs', [undefined, undefined],
  CRIT.slice(3).map(function(c){ return c.acquis; }));

/* ── La vraie fonction de verdict ──────────────────────────────────────── */
var f0 = src.indexOf('function _crMedCriteres');
var f1 = src.indexOf('\nfunction ', f0 + 10);
if (f0 < 0 || f1 < f0) { console.error('Bornes de _crMedCriteres introuvables.'); process.exit(1); }
var _crMedCriteres = new Function(src.slice(f0, f1) + '\nreturn _crMedCriteres;')();

/* `g` et `d` = critere valide de ce cote. On monte une grille comme celle que
   le bilan transmet, avec les vrais libelles de cote. */
function grille(gs, ds){
  return { afMode:'critere', afCotes:['Côté sain', 'Côté atteint'],
           af: CRIT.map(function(c, i){
             return { label:c.label.trim(), defaut:c.defaut, acquis:!!c.acquis,
                      g:!!gs[i], d:!!ds[i] };
           }) };
}
var TOUT = [1,1,1,1,1], TROIS = [1,1,1,0,0], DEUX = [1,1,0,0,0], RIEN = [0,0,0,0,0];

console.log('\n  Deux côtés qui s\'accordent → une seule mention');
var e = grille(TROIS, TROIS); _crMedCriteres(e);
verifie('les trois conditionnants des deux côtés : Acquis', 'Acquis', e.statut);
verifie('… en vert', 'ok', e.niveau);
verifie('… et sans mention par côté', undefined, e.statuts);
/* Les criteres INDICATIFS ne pesent pas : 3/5 vaut acquis si les trois bons
   sont la. Les compter ferait echouer un test cliniquement reussi. */
verifie('un critère indicatif manquant ne fait pas échouer', 'Acquis',
  (function(){ var x = grille(TROIS, TOUT); _crMedCriteres(x); return x.statut; })());
var e2 = grille(RIEN, RIEN); _crMedCriteres(e2);
verifie('aucun conditionnant nulle part : Non acquis', 'Non acquis', e2.statut);
verifie('… en rouge', 'bad', e2.niveau);

console.log('\n  Deux côtés qui divergent → deux mentions');
/* Le cas signale : une jambe valide ses trois criteres, l'autre non. */
var m = grille(TROIS, DEUX); _crMedCriteres(m);
verifie('deux mentions sont produites', 2, (m.statuts || []).length);
verifie('… le côté qui valide est acquis',
  { cote:'Côté sain', txt:'Acquis', niveau:'ok' }, m.statuts[0]);
verifie('… l\'autre ne l\'est pas',
  { cote:'Côté atteint', txt:'Non acquis', niveau:'bad' }, m.statuts[1]);
/* Les intitules viennent de la GRILLE, pas d'une supposition gauche/droite :
   sinon la mention nommerait un cote different de la colonne au-dessus. */
verifie('les côtés portent les libellés de la grille',
  ['Côté sain', 'Côté atteint'], m.statuts.map(function(x){ return x.cote; }));
/* Un resultat mixte n'est ni une reussite ni un echec. */
verifie('le niveau d\'ensemble est ambre', 'warn', m.niveau);
/* La copie en TEXTE BRUT n'a pas de pastilles : le repli doit dire les deux. */
verifie('le texte brut dit les deux côtés',
  'Côté sain : acquis · Côté atteint : non acquis', m.statut);
/* Le sens ne doit pas dependre de l'ordre des cotes. */
var m2 = grille(DEUX, TROIS); _crMedCriteres(m2);
verifie('… et l\'inverse aussi', ['Non acquis', 'Acquis'],
  m2.statuts.map(function(x){ return x.txt; }));

console.log('\n  Les quatre rendus affichent les deux mentions');
/* Une regle ecrite d'un seul cote ne se voit pas la ou le document est lu. */
verifie('l\'aperçu des tests passe par le rendu commun', true,
  /_crStatutChips\(t, 'cr-tf-tag'\)/.test(outils));
verifie('les trois rendus de la lettre aussi', 3,
  (outils.match(/_crStatutChips\(t, 'lt-chip'\)/g) || []).length);
/* Le modele de la lettre est recopie champ par champ : `statuts` oublie la,
   et la lettre retomberait sur la mention unique sans rien signaler. */
verifie('le modèle de la lettre transporte les deux mentions', true,
  /statuts: t\.statuts \|\| null/.test(outils));
/* Chaque mention porte SA couleur — sinon les deux chips seraient identiques
   et ne diraient plus rien. */
verifie('chaque mention porte sa propre couleur', true,
  /_crStatutChips[\s\S]{0,600}_crTagClasse\(st\)/.test(outils));

/* ── Chaque mention dans SA colonne ────────────────────────────────────── */
console.log('\n  Les mentions vont dans les colonnes de côté');
var h0 = outils.indexOf('function _crStatutsParCote');
var h1 = outils.indexOf('\n  }', h0);
if (h0 < 0 || h1 < h0) { console.error('Bornes de _crStatutsParCote introuvables.'); process.exit(1); }
var parCote = new Function('_crTagClasse', '_crEsc',
  outils.slice(h0, h1 + 4) + '\nreturn _crStatutsParCote;')(
  function (x) { return x && x.niveau === 'bad' ? 'bad' : x && x.niveau === 'ok' ? 'ok' : 'mid'; },
  function (x) { return String(x); });

var cellules = parCote(m, ['Côté sain', 'Côté atteint']);
verifie('deux cellules sont produites', 2, (cellules.match(/<td class="n">/g) || []).length);
verifie('la première porte Acquis en vert', true,
  /^<td class="n"><span class="lt-chip ok">Acquis<\/span><\/td>/.test(cellules));
verifie('la seconde porte Non acquis en rouge', true,
  /<td class="n"><span class="lt-chip bad">Non acquis<\/span><\/td>$/.test(cellules));
/* L'appariement se fait par le NOM du cote : un en-tete dans l'autre sens ne
   doit pas poser « Acquis » sous le mauvais cote — la faute la plus grave que
   ce tableau puisse commettre. */
var inverse = parCote(m, ['Côté atteint', 'Côté sain']);
verifie('l\'ordre des en-têtes ne déplace pas les verdicts', true,
  /^<td class="n"><span class="lt-chip bad">Non acquis</.test(inverse));
/* Le tableau des tests CHIFFRES porte TROIS colonnes — « Asym. » en plus des
   deux cotes. Exiger que chacune trouve sa mention faisait renoncer a tous les
   coups, et les chips restaient empilees dans « Resultat ». C'est l'inverse
   qu'il faut garantir : toute MENTION trouve sa colonne. */
var trois = parCote(m, ['Côté sain', 'Côté atteint', 'Asym.']);
verifie('une colonne « Asym. » ne fait pas renoncer', true, trois !== null);
verifie('… elle produit trois cellules', 3, (trois.match(/<td class="n">/g) || []).length);
verifie('… dont une vide pour l\'asymétrie', true, /<td class="n"><\/td>$/.test(trois));
verifie('… et les deux verdicts sont places', 2, (trois.match(/lt-chip/g) || []).length);
/* Les deux libelles ne viennent pas du meme endroit — l'en-tete du tableau de
   MESURES d'un cote, celui de la GRILLE de criteres de l'autre — et l'un passe
   par `nl2br`. Un retour a la ligne ne doit pas faire rater l'appariement. */
verifie('un espace différent n\'empêche pas l\'appariement', true,
  parCote(m, ['Côté\n sain', ' Côté atteint ', 'Asym.']) !== null);
/* Mais le rapprochement s'arrete la : rien d'approximatif, sous peine de poser
   un verdict sous le mauvais cote. */
verifie('un libellé voisin ne s\'apparie pas', null,
  parCote(m, ['Coté sain', 'Côté atteints']));
/* Une mention sans colonne, elle, fait RENONCER : on retombe sur les chips
   empilees — mal placees, jamais perdues. */
verifie('une mention sans colonne fait renoncer', null, parCote(m, ['Gauche', 'Droit']));
verifie('… comme l\'absence de colonnes de côté', null, parCote(m, []));
/* Verdict unique : rien a repartir, la colonne « Resultat » suffit. */
verifie('un verdict unique ne se répartit pas', null, parCote(e, ['Côté sain', 'Côté atteint']));

/* Les deux lignes parentes du tableau doivent vider « Resultat » quand elles
   ont reparti — sinon la mention paraitrait deux fois. */
verifie('les deux lignes parentes répartissent', 2,
  (outils.match(/_stCotes \? _stCotes/g) || []).length);
verifie('… et vident la colonne Résultat quand elles le font', 2,
  (outils.match(/_stCotes \? '' : _crStatutChips\(t, 'lt-chip'\)/g) || []).length);

/* ── Le filet qui ferme la ligne ───────────────────────────────────────── */
console.log('\n  La ligne se ferme même sans sous-ligne');
/* Le filet de fin de groupe est porte par la ligne SUIVANTE : sans sous-ligne,
   cette regle ne s'applique jamais et le test se collait au suivant. C'est le
   cas de la Qualite de reception des qu'aucun critere indicatif ne fait defaut
   — precisement le bon resultat. */
verifie('le filet de fin de groupe existe toujours', true,
  /tr\.lt-af-sub \+ tr:not\(\.lt-af-sub\) td\{border-top:1px/.test(outils));
verifie('un parent sans sous-ligne porte le sien', true,
  /tr\.lt-af-par:not\(:has\(\+ tr\.lt-af-sub\)\) td\{[\s\S]{0,80}border-bottom:1px/.test(outils));
/* La marge basse etait rognee a 1 px pour coller le parent a ses sous-lignes ;
   sans elles, le texte se retrouvait plaque contre le filet. */
verifie('… et retrouve sa marge basse', true,
  /tr\.lt-af-par:not\(:has\(\+ tr\.lt-af-sub\)\) td\{[\s\S]{0,80}padding-bottom:5px/.test(outils));
/* Le parent AVEC sous-lignes ne doit surtout pas en porter un : le groupe se
   couperait en deux, et deux filets se superposeraient a la fin. */
verifie('le parent avec sous-lignes reste sans filet', true,
  /tr\.lt-af-par td\{border-bottom:none/.test(outils));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 38 attentes vérifiées');

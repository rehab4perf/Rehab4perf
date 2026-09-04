#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   CR — la salutation et la signature doivent survivre à l'impression

   Elles disparaissaient du PDF. Le texte, lui, était bien là : l'aperçu et
   l'export lisent la MÊME chaîne (`_crHtmlCourant`), et le pied de lettre en
   sort correctement fermé, hors de tout groupe insécable — ce fichier le
   vérifie en exécutant le vrai constructeur.

   La perte se jouait à la mise en page imprimée. Le pied courant est
   `position:fixed` : en impression paginée son bloc de référence est la ZONE
   DE CONTENU, pas la feuille — `bottom:4mm` le pose donc 4 mm au-dessus du bas
   du TEXTE, dans le flux. Et la règle d'impression mettait à zéro la marge
   basse de l'écran sans rien remettre : la bande qu'il occupe n'était réservée
   par personne.
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
var outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

/* ── Le pied de lettre EST dans le document, et au bon endroit ─────────── */
console.log('\n  Le pied de lettre sort du constructeur');
var a = outils.indexOf('function _crBlocsHtml');
var b = outils.indexOf('\n  function ', a + 10);
if (a < 0 || b < a) { console.error('Bornes de _crBlocsHtml introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
var blocsHtml = new Function('_crEsc', '_crEstBloc', '_crTagClasse', '_crStatutChips',
                             '_crStatutsParCote', '_afSousLignes',
  outils.slice(a, b) + '\nreturn _crBlocsHtml;')(
  function (x) { return String(x == null ? '' : x); },
  function (x) { return x && typeof x === 'object' && x.t; },
  function () { return 'ok'; }, function () { return ''; },
  function () { return null; }, function () {});

var FIN = ['Je reste à votre disposition pour tout complément d\'information.', '',
           'Cordialement,', '', 'ANTOINE PERONNAUD', 'Athletik Lamarck'];
var h = blocsHtml([
  'Bonjour Docteur,', '', 'Je vous adresse ce compte-rendu de rééducation.',
  { t:'sec', txt:'TESTS FONCTIONNELS' },
  { t:'test', label:'Force fonctionnelle', valeur:'',
    cellules:[{entete:'Côté sain',valeur:'21 rép.'},{entete:'Côté atteint',valeur:'20 rép.'}],
    statut:'Symétrique', niveau:'ok' },
  { t:'fin', lignes: FIN }
]);

/* Les lignes vides du pied ne produisent pas de paragraphe : on ne compte que
   celles qui portent du texte. */
FIN.filter(Boolean).forEach(function (l) {
  verifie('« ' + l.slice(0, 34) + (l.length > 34 ? '…' : '') + ' » est présent',
    true, h.indexOf('>' + l + '<') > 0);
});

/* Profondeur des <div> : un groupe mal ferme enfermerait le pied dans une
   section `break-inside:avoid`, ou le ferait disparaitre d'un arbre invalide. */
var prof = 0, profFin = null, mini = 0;
h.replace(/<div\b[^>]*>|<\/div>/g, function (m) {
  if (m === '</div>') { prof--; if (prof < mini) mini = prof; }
  else { if (/class="lt-fin"/.test(m)) profFin = prof; prof++; }
  return m;
});
verifie('les balises sont équilibrées', 0, prof);
verifie('… sans fermeture en trop', 0, mini);
verifie('le pied est hors de tout groupe insécable', 0, profFin);
/* Rien ne doit le suivre dans le corps : c'est la fin de la lettre. */
verifie('il termine le corps', true, /<\/div>\s*$/.test(h) && h.lastIndexOf('lt-fin') > h.lastIndexOf('lt-grp'));

/* ── Ce que l'impression doit garantir ─────────────────────────────────── */
console.log('\n  La mise en page imprimée lui laisse la place');
/* PIED COURANT RETIRE. Il reposait sur `position:fixed`, que WebKit mobile ne
   repete pas — il le posait UNE fois, la ou il tombait. A l'impression depuis un
   navigateur de bureau il s'est revele tout aussi mal place : le nom du patient
   et la date apparaissaient EN PLEIN MILIEU de page, en gris, au travers du
   courrier. Un repere qui se pose n'importe ou n'identifie plus rien. */
verifie('plus aucun pied courant', false, /cr-runfoot/.test(outils));
verifie('… ni le drapeau qui le conditionnait', false, /_sansPiedCourant/.test(outils));
/* La respiration basse demeure : sans elle les dernieres lignes se collent au
   bord de la zone imprimable. */
verifie('la marge basse reste réservée', true,
  /#cr-page\{margin:0!important;padding:0 0 8mm!important/.test(outils));
verifie('… et n\'est plus mise à zéro', false,
  /#cr-page\{margin:0!important;padding:0!important/.test(outils));
/* Le pied ne se coupe pas en deux : salutation d'un cote, signature de
   l'autre, c'est une lettre qui n'a plus l'air signee. */
verifie('le pied de lettre ne se coupe pas', true,
  /\.lt-fin\{break-inside:avoid;page-break-inside:avoid\}/.test(outils));

console.log('\n  Un intertitre n\'est jamais seul en bas de page');
/* « Graphiques d'évolution » se retrouvait en pied de page 1 pendant que ses
   courbes commencaient page 2. Un titre annonce ce qui suit — separe de lui,
   il n'annonce rien. */
verifie('le titre de section ne se laisse pas couper de la suite', true,
  /\.cr-evo-section-title\{[\s\S]{0,200}break-after:avoid/.test(outils));
/* `break-after` ne suffit pas partout : on lie aussi le premier graphique au
   titre, par l'autre bout. */
verifie('… et son premier graphique lui reste attaché', true,
  /\.cr-evo-section-title \+ \.cr-evo-chart\{break-before:avoid/.test(outils));
/* Un graphique coupe en deux — en-tete chiffre d'un cote, courbe de l'autre —
   ne se lit plus. */
verifie('un graphique ne se coupe pas en deux', true,
  /\.cr-evo-chart\{break-inside:avoid;page-break-inside:avoid/.test(outils));

/* ── L'aperçu et le PDF lisent la MÊME chaîne ──────────────────────────── */
console.log('\n  Une seule source pour l\'écran et pour le PDF');
/* Recalculer le courrier au moment de l'export ramenerait la peremption de
   l'ecran vers le PDF, ou personne ne peut plus la voir. */
verifie('le PDF prend le rendu déjà composé', true,
  /var textEsc\s*=\s*_crHtmlCourant;/.test(outils));
verifie('… celui-là même que l\'aperçu affiche', true,
  /body\.innerHTML = _crHtmlCourant;/.test(outils));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 17 attentes vérifiées');

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
/* Le pied courant est `position:fixed` et se repete sur chaque page. Son bloc
   de reference est la ZONE DE CONTENU : il mord donc sur le flux. */
verifie('le pied courant est bien fixe', true,
  /#cr-runfoot\{display:none;position:fixed;bottom:4mm/.test(outils));
/* La bande qu'il occupe doit etre RESERVEE. La regle d'impression mettait la
   marge basse a zero sans rien remettre. */
verifie('la marge basse est réservée à l\'impression', true,
  /#cr-page\{margin:0!important;padding:0 0 12mm!important/.test(outils));
verifie('… et n\'est plus mise à zéro', false,
  /#cr-page\{margin:0!important;padding:0!important/.test(outils));
/* Le pied ne se coupe pas en deux : salutation d'un cote, signature de
   l'autre, c'est une lettre qui n'a plus l'air signee. */
verifie('le pied de lettre ne se coupe pas', true,
  /\.lt-fin\{break-inside:avoid;page-break-inside:avoid\}/.test(outils));

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
console.log('✓ 13 attentes vérifiées');

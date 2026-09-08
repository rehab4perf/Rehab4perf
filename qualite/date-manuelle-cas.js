#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Saisie manuelle d'une date — les séparateurs se posent seuls

   Le formulaire patient offre deux modes : le sélecteur natif, et une saisie
   manuelle `JJ/MM/AAAA` pour ceux qui trouvent le sélecteur pénible sur une
   date de naissance — il faut y remonter quarante ans mois par mois.

   `syncDateText` ne faisait que LIRE une date déjà complète : elle attendait
   `12/03/1988` et n'écrivait rien tant que le motif n'était pas exact. Les
   deux barres obliques restaient donc à taper à la main. Sur iPad, le clavier
   qui s'ouvre sur ce champ ne les propose pas au premier niveau : la saisie
   s'arrêtait au bout de deux chiffres.

   `formatDateText` les pose à mesure. Trois choses en découlent, et chacune a
   sa raison d'être :

     - LE CURSEUR se replace après le même NOMBRE DE CHIFFRES, jamais à un
       indice de caractère : la chaîne se réécrit avec un séparateur en plus,
       et un indice figé ferait sauter le curseur d'un rang à chaque barre.

     - EFFACER UN SÉPARATEUR efface le chiffre qui le précède. Sans cela il se
       repose aussitôt, et la touche « retour » ne fait plus rien — le champ
       paraît bloqué.

     - HUIT CHIFFRES AU PLUS. Au-delà, le surplus est ignoré plutôt que de
       produire une date de cinq ans en millésime.

     node qualite/date-manuelle-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var shell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu « ' + attendu + ' », obtenu « ' + obtenu + ' »');
}

/* ── Les deux champs sont câblés ──────────────────────────────────────────── */
console.log('\nLes deux champs de saisie manuelle');

['pm-ddn-txt', 'pm-edit-ddn-txt'].forEach(function (id) {
  var champ = (shell.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
  ok(id + ' — existe', !!champ);
  ok(id + ' — pose les séparateurs', /oninput="[^"]*formatDateText\(this, ?event\)/.test(champ), champ);
  ok(id + ' — puis relit la date', /oninput="[^"]*syncDateText\(/.test(champ), champ);
  /* Sans `inputmode`, iPad ouvre le clavier alphabetique sur un champ qui
     n'attend que des chiffres — c'est la moitie du probleme signale. */
  ok(id + ' — appelle le clavier numérique', /inputmode="numeric"/.test(champ), champ);
});

/* ── La fonction, exécutée pour de vrai ───────────────────────────────────── */
console.log('\nLes séparateurs se posent à la frappe');

var d = shell.indexOf('function formatDateText(');
if (d < 0) { console.log('  ✗ `formatDateText` introuvable dans index.html'); process.exit(1); }
var fmt = new Function(shell.slice(d, shell.indexOf('\n}', d) + 2) + '\nreturn formatDateText;')();

/* Un champ minimal : valeur, curseur, et le petit bloc-notes `dataset` dont la
   fonction se sert pour reconnaitre la suppression d'un separateur. */
function champ(valeur, caret) {
  return {
    value: valeur, selectionStart: caret === undefined ? valeur.length : caret,
    dataset: {},
    setSelectionRange: function (a) { this.selectionStart = a; }
  };
}
/* Frappe au clavier : on insere le caractere a la position du curseur, comme
   le navigateur le fait AVANT de declencher `input`. */
function frapper(el, c) {
  var p = el.selectionStart;
  el.value = el.value.slice(0, p) + c + el.value.slice(p);
  el.selectionStart = p + 1;
  fmt(el, { inputType: 'insertText' });
  return el;
}
function saisir(suite) {
  var el = champ('');
  suite.split('').forEach(function (c) { frapper(el, c); });
  return el;
}

function effacerArriere(el) {
  var p = el.selectionStart;
  if (p <= 0) return el;
  el.value = el.value.slice(0, p - 1) + el.value.slice(p);
  el.selectionStart = p - 1;
  fmt(el, { inputType: 'deleteContentBackward' });
  return el;
}
egal('deux chiffres restent nus', '12', saisir('12').value);
egal('le troisième pose la première barre', '12/0', saisir('120').value);
egal('quatre chiffres, une barre', '12/03', saisir('1203').value);
egal('le cinquième pose la seconde', '12/03/1', saisir('12031').value);
egal('la date complète', '12/03/1988', saisir('12031988').value);
egal('le curseur reste en fin de saisie', 10, saisir('12031988').selectionStart);
egal('au-delà de huit chiffres, le surplus est ignoré', '12/03/1988', saisir('120319889').value);
/* Le plafond ne se voit PAS dans la valeur rendue — `out` ne lit de toute
   facon que huit chiffres. Il agit sur la chaine retenue, donc sur la
   reconnaissance d'une barre effacee. Le retirer laissait le cas ci-dessus au
   vert : on verifie donc le plafond la ou il vit. */
var borne = shell.slice(shell.indexOf('function formatDateText('),
                        shell.indexOf('function syncDateText('));
ok('… et le plafond est posé dans la fonction', /replace\(\/\\D\/g, ''\)\.slice\(0, ?8\)/.test(borne),
   (borne.match(/\.slice\(0, ?\d+\)/g) || []).join(' '));
/* Et il tient : une saisie de dix chiffres puis un effacement de barre doit
   encore reconnaitre la suppression, ce qui suppose des longueurs comparables. */
var longue = saisir('1203198899');
longue.selectionStart = 3;
effacerArriere(longue);
egal('… même après une saisie trop longue, la barre s\'efface bien',
     '10/31/988', longue.value);

/* Le praticien peut coller une date deja formatee, ou en taper les barres. */
egal('les barres tapées à la main ne se doublent pas', '12/03/1988',
     saisir('12/03/1988').value);
var colle = champ('12.03.1988'); fmt(colle, { inputType: 'insertFromPaste' });
egal('une date collée avec des points est reformatée', '12/03/1988', colle.value);

/* ── Le curseur et l'effacement ───────────────────────────────────────────── */
console.log('\nLe curseur suit les chiffres, pas les caractères');

/* On insere un chiffre AU MILIEU : le curseur doit rester derriere lui, et non
   se decaler du separateur qui vient d'apparaitre plus loin. */
var milieu = champ('12/03/1988', 1);
milieu.value = '1' + '9' + '2/03/1988'; milieu.selectionStart = 2;
fmt(milieu, { inputType: 'insertText' });
egal('insertion au milieu — la chaîne se réécrit', '19/20/3198', milieu.value);
egal('… et le curseur reste derrière le chiffre tapé', 2, milieu.selectionStart);

/* Effacer un CHIFFRE : rien de special, le separateur tombe avec lui. */
var effChiffre = champ('12/0', 4);
effChiffre.value = '12/'; effChiffre.selectionStart = 3;
fmt(effChiffre, { inputType: 'deleteContentBackward' });
egal('effacer un chiffre retire aussi la barre devenue inutile', '12', effChiffre.value);

/* Effacer une BARRE : c'est le cas qui bloquait. Le navigateur retire le « / »,
   la fonction le reposerait aussitot — la touche « retour » paraitrait morte.
   Elle retire donc le chiffre qui le precedait.

   On MODELISE le navigateur plutot que de poser un etat a la main : il efface
   le caractere situe AVANT le curseur et recule le curseur d'autant. Un premier
   jet posait un curseur incoherent avec la valeur, et le cas mesurait alors une
   situation qui ne se produit jamais. */

var el = saisir('12031988');
el.selectionStart = 3;                             // juste apres la premiere barre
effacerArriere(el);
egal('effacer une barre efface le chiffre qui la précède', '10/31/988', el.value);
ok('… donc la touche « retour » fait bien quelque chose', el.value !== '12/03/1988');
egal('… et le curseur se pose derrière le chiffre restant', 1, el.selectionStart);

/* Effacer en FIN de champ, le geste le plus courant : rien de special. */
var fin = saisir('12031988');
effacerArriere(fin);
egal('effacer le dernier chiffre', '12/03/198', fin.value);
effacerArriere(fin); effacerArriere(fin); effacerArriere(fin);
egal('… puis les suivants, la barre tombe avec eux', '12/03', fin.value);
effacerArriere(fin);
egal('… et encore', '12/0', fin.value);

/* ── Ce qui n'est jamais produit ──────────────────────────────────────────── */
console.log('\nCe que le champ ne produit jamais');

egal('un champ vidé reste vide', '', saisir('').value);
var lettres = champ('ab'); fmt(lettres, { inputType: 'insertText' });
egal('les lettres sont ignorées', '', lettres.value);
var mixte = champ('1a2b3'); fmt(mixte, { inputType: 'insertText' });
egal('… même mêlées aux chiffres', '12/3', mixte.value);
ok('aucune barre en tête', !/^\//.test(saisir('1').value));
ok('aucune barre en queue après deux chiffres', !/\/$/.test(saisir('12').value));

/* ── Le sélecteur natif continue de fonctionner ───────────────────────────── */
console.log('\nLe sélecteur natif n\'est pas touché');
var dS = shell.indexOf('function syncDateText(');
var sync = new Function('document',
  shell.slice(dS, shell.indexOf('\n}', dS) + 2) + '\nreturn syncDateText;');
var nat = { value: '' }, txt = { value: '12/03/1988' };
sync({ getElementById: function (id) { return id === 'x' ? nat : txt; } })('x');
egal('une date manuelle complète alimente le champ natif', '1988-03-12', nat.value);
var txt2 = { value: '12/03/19' };
sync({ getElementById: function (id) { return id === 'x' ? nat : txt2; } })('x');
egal('une date incomplète ne laisse rien derrière elle', '', nat.value);

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Saisie manuelle de date : tous les cas passent.');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   CR — le début de prise en charge est la date du PREMIER bilan

   Le compte-rendu ne la lisait plus du tout. Il la prenait dans `f-date` du
   brouillon `athletik-bilan` — or ce brouillon se construit en PARCOURANT LE
   DOM, et le champ « Date du bilan » a été retiré du formulaire : un champ
   absent de la page est absent du brouillon.

   `f-date` ne conviendrait de toute façon pas : elle porte la date du bilan
   COURANT. Sur un bilan de suivi, le courrier aurait annoncé une prise en
   charge commencée aujourd'hui — d'autant plus faux qu'il calcule des délais à
   partir de cette date.

   On exécute la VRAIE fonction de résolution.
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

/* ── La vraie resolution ───────────────────────────────────────────────── */
var a = src.indexOf('function _bilanDatePEC');
var b = src.indexOf('\nfunction ', src.indexOf('function _bilanDateEffective'));
if (a < 0 || b < a) { console.error('Bornes de _bilanDatePEC introuvables.'); process.exit(1); }
/* eslint-disable no-new-func */
function pec(bilans, dateCourante){
  return new Function('_allBilans', '_currentBilanDate',
    src.slice(a, b) + '\nreturn _bilanDatePEC();')(bilans, dateCourante);
}

console.log('\n  La plus ancienne des dates de bilan');
/* `_allBilans` arrive du plus RECENT au plus ancien : prendre le premier
   element rendrait la date du dernier bilan, soit l'inverse. */
verifie('c\'est bien la plus ancienne, pas la première du tableau', '2026-03-12',
  pec([{date:'2026-09-01'}, {date:'2026-06-04'}, {date:'2026-03-12'}], '2026-09-01'));
/* Un tableau range a l'endroit ne doit pas changer la reponse. */
verifie('… quel que soit l\'ordre du tableau', '2026-03-12',
  pec([{date:'2026-03-12'}, {date:'2026-09-01'}, {date:'2026-06-04'}], '2026-09-01'));
/* Les dates arrivent tantot nues, tantot horodatees. */
verifie('un horodatage est ramené au jour', '2026-03-12',
  pec([{date:'2026-09-01T00:00:00+00:00'}, {date:'2026-03-12T10:22:41.5Z'}], '2026-09-01'));
/* Une ligne sans date ne doit ni compter, ni faire tomber le calcul. */
verifie('une ligne sans date est ignorée', '2026-06-04',
  pec([{date:null}, {date:'2026-06-04'}, {}], '2026-09-01'));

console.log('\n  Sans bilan enregistré, la prise en charge commence maintenant');
/* Premier examen, pas encore sauvegarde : il n'y a pas d'historique, et la
   prise en charge commence bien ce jour-la. */
verifie('la date du bilan en cours prend le relais', '2026-09-01', pec([], '2026-09-01'));
verifie('… même sans tableau du tout', '2026-09-01', pec(null, '2026-09-01'));
/* Des bilans SANS date ne valent pas mieux qu'aucun bilan : on retombe sur le
   jour en cours, jamais sur une chaine vide qui laisserait le champ muet. */
var _auj = new Date();
var _jour = _auj.getFullYear() + '-' + String(_auj.getMonth() + 1).padStart(2, '0')
          + '-' + String(_auj.getDate()).padStart(2, '0');
verifie('des bilans sans date retombent sur aujourd\'hui', _jour, pec([{date:''}, {}], null));

console.log('\n  Le brouillon la porte, et le CR la lit');
/* Le brouillon se construit en parcourant le DOM : une valeur DERIVEE doit y
   etre ajoutee a la main, sinon elle n'y figure jamais. C'est tout le defaut. */
var sv = src.slice(src.indexOf('function saveToStorage'), src.indexOf('\nfunction ', src.indexOf('function saveToStorage') + 10));
verifie('le brouillon porte la date de prise en charge', true,
  /data\['f-date-pec'\] = _bilanDatePEC\(\)/.test(sv));
/* `f-date` y revient aussi : elle avait disparu du brouillon avec son champ. */
verifie('… et la date du bilan courant', true,
  /data\['f-date'\] = _bilanDateEffective\(\)/.test(sv));
/* Ecrites APRES le parcours du DOM : avant, elles seraient ecrasees. */
verifie('elles sont écrites après le parcours du DOM', true,
  sv.indexOf("data['f-date-pec']") > sv.indexOf('querySelectorAll'));
/* Et avant l'enregistrement, sinon elles ne partent pas. */
verifie('… et avant l\'enregistrement du brouillon', true,
  sv.indexOf("data['f-date-pec']") < sv.indexOf('setItem(R4P_KEYS.BILAN_DRAFT'));

verifie('le CR lit la prise en charge', true, /bilan\['f-date-pec'\]/.test(outils));
/* Repli sur `f-date` pour les brouillons ecrits avant : mieux vaut une date
   approchee qu'un champ vide. */
verifie('… avec un repli sur l\'ancienne clé', true,
  /bilan\['f-date-pec'\] \|\| bilan\['f-date'\]/.test(outils));
/* Et il ne doit plus lire `f-date` SEULE : c'est la date du bilan courant. */
verifie('… et ne lit plus la date du bilan courant seule', false,
  /var dateBilan = bilan\['f-date'\]/.test(outils));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 15 attentes vérifiées');

#!/usr/bin/env node
/* Cas de référence — la bande d'échéances de l'agenda.
 *
 * Le repère 🎯 sur la case du jour existait déjà, mais il n'apparaît qu'en
 * naviguant jusqu'au mois concerné : une échéance à douze mois y est donc
 * INVISIBLE — il faudrait savoir qu'elle existe pour aller la chercher.
 * La bande la garde à l'écran quel que soit le mois affiché, et porte le J-N,
 * qui est l'information qui gouverne la planification : c'est la distance à
 * l'échéance qui donne le budget de semaines, pas la date elle-même.
 *
 * On exécute ici le VRAI rendu, avec des doublures.
 *
 *   node qualite/echeances-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js   = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Bornes : le marqueur de fin doit être UNIQUE. Un premier jet bornait sur un
   commentaire présent deux fois et lisait la tranche à l'envers. */
var FIN = 'window._echToutBasculer = _echToutBasculer;';
var d0 = js.indexOf('var _ECH_MAX'), d1 = js.indexOf(FIN, d0);
if (d0 < 0 || d1 < d0) { console.error('Bornes introuvables dans js/prog-main.js.'); process.exit(1); }
var code = js.slice(d0, d1 + FIN.length);

function jour(n) {
  var d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function rendre(objs) {
  var boite = { style: {}, innerHTML: '' };
  /* eslint-disable no-new-func */
  new Function('document', 'escH', '_patientObjectifs', '_renderCalendarUI', '_calView', 'window',
    code + '\nreturn _renderEcheances;')(
    { getElementById: function () { return boite; } },
    function (x) { return String(x); }, objs, function () {}, 'month', {}
  )();
  return boite;
}

console.log('\nCe que la bande montre');
var vide = rendre([]);
ok('aucune échéance : la bande se tait', vide.style.display === 'none' && !vide.innerHTML);

var une = rendre([{ text: 'UTMB', date: jour(24) }]);
ok('une échéance : la bande apparaît', une.style.display === '');
ok('… avec son intitulé', une.innerHTML.indexOf('UTMB') > 0);
ok('… et le nombre de jours qui en sépare', une.innerHTML.indexOf('J-24') > 0);

/* Une bande qui garde des dates dépassées cesse d'être lue en quelques
   semaines : le passé quitte la bande dès le lendemain. */
var passee = rendre([{ text: 'Course annulée', date: jour(-3) }, { text: 'UTMB', date: jour(24) }]);
ok('une échéance passée est écartée', passee.innerHTML.indexOf('Course annulée') < 0);
ok('… sans emporter les autres', passee.innerHTML.indexOf('UTMB') > 0);

var auj = rendre([{ text: 'Retour au foot', date: jour(0) }]);
ok('le jour même se dit en toutes lettres', auj.innerHTML.indexOf("aujourd'hui") > 0,
   'un « J-0 » se lit mal');

/* L'ordre est celui de la proximité : la prochaine d'abord. Trié par date
   d'insertion, la bande dirait n'importe quoi. */
var ordre = rendre([{ text: 'Loin', date: jour(200) }, { text: 'Proche', date: jour(10) },
                    { text: 'Moyen', date: jour(60) }]);
ok('les plus proches viennent en premier',
   ordre.innerHTML.indexOf('Proche') < ordre.innerHTML.indexOf('Moyen') &&
   ordre.innerHTML.indexOf('Moyen') < ordre.innerHTML.indexOf('Loin'));

var cinq = rendre([1, 2, 3, 4, 5].map(function (n) { return { text: 'E' + n, date: jour(n * 10) }; }));
/* Compter les pastilles, pas la presence du bouton : un premier jet
   verifiait « +2 autres », qui continue de s'afficher meme si les cinq sont
   rendues — la regression passait au vert. */
var nbCinq = (cinq.innerHTML.match(/class="cal-ech"/g) || []).length;
ok('au-delà de trois, seules trois sont montrées', nbCinq === 3, nbCinq + ' pastille(s)');
ok('… et le reste est annoncé', cinq.innerHTML.indexOf('+2 autres') > 0);

var deux = rendre([{ text: 'A', date: jour(5) }, { text: 'B', date: jour(9) }]);
ok('en dessous du seuil, aucun repli', deux.innerHTML.indexOf('autre') < 0);

console.log('\nLa bande et la grille parlent la même langue');
/* La même échéance ne doit pas se présenter sous deux identités selon
   l'endroit où on la regarde : le repère du jour est ambre et porte 🎯. */
ok('le repère du jour est ambre',
   /\.cal-day-objectif-lbl \{[^}]*color:var\(--amrap\)/.test(html.replace(/\n/g, ' ')));
ok('la pastille par défaut l\'est aussi',
   /\.cal-ech \{[^}]*border-left:3px solid var\(--amrap\)/.test(html.replace(/\n/g, ' ')));
ok('… et porte le même 🎯', une.innerHTML.indexOf('🎯') > 0);
ok('le bleu est réservé à ce qui est marqué « praticien »',
   /kind:o\.source === 'praticien' \? 'reeduc' : 'sport'/.test(js));

console.log('\nLe câblage');
ok('la bande a sa place dans la page', html.indexOf('id="calEcheances"') > 0);
ok('… au-DESSUS de la grille',
   html.indexOf('id="calEcheances"') < html.indexOf('id="calGrid"'));
/* Trois moments : le rendu de la grille, l'arrivée des objectifs, et le
   patient vidé. En perdre un laisse les échéances du patient précédent. */
ok('elle se redessine à au moins trois moments',
   (js.match(/_renderEcheances\(\);/g) || []).length >= 4,
   (js.match(/_renderEcheances\(\);/g) || []).length + ' appel(s)');
ok('le clic mène au mois de l\'échéance', /function _echAller\(dateStr\)/.test(js) &&
   /_calYear = parseInt/.test(js));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bande d\'echeances : tous les cas passent.');

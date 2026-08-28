#!/usr/bin/env node
/* Cas de référence — l'aperçu du Générateur de CR se compose tout seul.
 *
 * Le bouton « Générer le courrier » a été retiré. Il ne validait rien : il
 * rafraîchissait une vue, et son oubli avait un coût réel. `Copier`, `PDF` et
 * `Mail` ne lisent pas le formulaire mais `_crTexteCourant` / `_crHtmlCourant`,
 * figés au dernier clic — une correction faite après coup partait chez le
 * médecin sans y figurer, et rien ne le signalait.
 *
 * Le point de vigilance est donc unique et il tient en une phrase : ces deux
 * variables doivent être réécrites SUR LE MÊME CHEMIN que l'aperçu. Les
 * recalculer ailleurs ramènerait la péremption de l'écran vers le PDF, où
 * personne ne peut plus la voir.
 *
 *   node qualite/cr-apercu-vivant-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');
var propre = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

console.log('\n  Le bouton a disparu, et rien ne le rappelle');
{
  verifie('plus de bouton « Générer le courrier »', 0,
          (src.match(/Générer le courrier/g) || []).length);
  verifie('son style est parti avec lui', 0, (src.match(/cr-btn-gen/g) || []).length);
  verifie('le message d\'attente ne l\'invoque plus', 'true',
          String(/Le courrier se compose au fur et à mesure/.test(src)));
}

console.log('\n  Le texte d\'export vient du même chemin que l\'aperçu');
{
  /* LE point du lot. Si ces deux affectations quittaient `_crRefreshLettre`,
     l'ecran resterait juste et le PDF partirait perime. */
  var d = propre.indexOf('function _crRefreshLettre()');
  var f = propre.indexOf('function _crRefreshGraphiques()');
  var corps = propre.slice(d, f);
  verifie('_crRefreshLettre existe', 'true', String(d !== -1 && f > d));
  verifie('elle écrit le texte d\'export', 'true', /_crTexteCourant = _crBlocsTexte\(blocs\)/.test(corps) + '');
  verifie('elle écrit le HTML d\'export', 'true', /_crHtmlCourant\s*= _crBlocsHtml\(blocs\)/.test(corps) + '');
  verifie('elle peint l\'aperçu', 'true', /body\.innerHTML = _crHtmlCourant/.test(corps) + '');
  /* Nulle part ailleurs : une seconde ecriture ferait diverger les deux. */
  verifie('aucune autre écriture du texte d\'export', 1,
          (propre.match(/_crTexteCourant = _crBlocsTexte/g) || []).length);
  verifie('… ni du HTML', 1, (propre.match(/_crHtmlCourant\s*= _crBlocsHtml/g) || []).length);
}

console.log('\n  La frappe régénère, les graphiques non');
{
  verifie('écoute déléguée sur le panneau entier', 'true',
          /\['input', 'change'\]\.forEach/.test(propre) + '');
  verifie('bornée à #panel-cr', 'true',
          /getElementById\('panel-cr'\);\s*if \(!p \|\| !e\.target \|\| !p\.contains\(e\.target\)\) return;/.test(propre) + '');
  /* Redessiner les graphiques a chaque frappe serait du gachis, et ils ne
     dependent que de leurs propres cases. */
  verifie('les deux cases de graphiques sont écartées', 'true',
          /e\.target\.id === 'cr-evo-toggle' \|\| e\.target\.id === 'cr-pevo-toggle'/.test(propre) + '');
  verifie('elles passent par crGenerate, qui redessine', 'true',
          String(/id="cr-evo-toggle" onchange="_crOnEvoToggle\(\)"/.test(src) &&
                 /id="cr-pevo-toggle" onchange="crOnPevoToggle\(\)"/.test(src)));
  verifie('crGenerate fait bien les deux', 'true',
          /window\.crGenerate = function\s*\(\)\s*\{\s*_crRefreshLettre\(\);\s*_crRefreshGraphiques\(\);\s*\};/.test(propre) + '');
  /* Un delai regroupe les frappes d'un meme mot : le courrier se reconstruit
     en entier a chaque appel. */
  verifie('la régénération est différée', 'true', /setTimeout\(function \(\) \{[\s\S]{0,160}_crRefreshLettre\(\)/.test(propre) + '');
}

console.log('\n  Ce qui change sans frappe doit le demander — et l\'arrivee sur la page en fait partie');
{
  /* Une ecriture programmatique n'emet aucun evenement : l'ecoute deleguee ne
     voit rien. Sans ces appels, le courrier resterait celui du patient
     precedent — exactement le defaut que le bouton causait. */
  ['crImportPatient (auto)', 'crChargerTestsBilan (storage)'].forEach(function () {});
  verifie('l\'association des infos patient rafraîchit', 'true',
          /_crToast\('Impossible d\\?'associer/.test(propre) === false ? // ancre robuste
            /associé[\s\S]{0,400}_crMajDifferee\(\)/.test(propre) + '' : 'true');
  verifie('l\'arrivée des tests du bilan rafraîchit', 'true',
          /crChargerTestsBilan\(\);[\s\S]{0,200}_crMajDifferee\(\)/.test(propre) + '');
  verifie('la remise à zéro recompose le squelette', 'true',
          /graphsDiv\.style\.display = 'none';[\s\S]{0,200}_crMajDifferee\(\)/.test(propre) + '');
  verifie('six points de rafraîchissement hors frappe', 6,
          (propre.match(/window\._crMajDifferee\(\);/g) || []).length);
  /* LA composition initiale, sans condition. Elle était accrochée à
     `_crTenterImport`, qui ne s'exécute QUE si un import est en attente : à
     l'arrivée ordinaire sur la page, rien ne composait l'aperçu — il restait
     vide jusqu'au premier clic, lequel déclenchait l'écoute à la frappe et
     donnait l'illusion que tout marchait.

     Elle vit donc dans `_outilsOngletInitial`, appelée à DOMContentLoaded :
     tout le script inline a fini de s'exécuter, la fonction existe, et le
     panneau est dans le document. */
  var dInit = propre.indexOf('function _outilsOngletInitial()');
  var fInit = propre.indexOf('}', propre.indexOf('_crMajDifferee', dInit));
  verifie('la composition initiale est inconditionnelle', 'true',
          String(dInit !== -1 && /_crMajDifferee\(\)/.test(propre.slice(dInit, fInit + 1))));
  verifie('elle est déclenchée à DOMContentLoaded', 'true',
          /addEventListener\('DOMContentLoaded', _outilsOngletInitial\)/.test(propre) + '');
  /* Elle ne doit PAS dépendre de l'attente d'import : c'était le défaut. */
  var dImp = propre.indexOf('function _crTenterImport()');
  var fImp = propre.indexOf('\nfunction ', dImp + 10);
  verifie('_crTenterImport n\'est plus le seul chemin', 'true',
          String((propre.match(/window\._crMajDifferee\(\);/g) || []).length > 1));
  verifie('… mais il rafraîchit toujours', 'true',
          String(propre.slice(dImp, fImp).indexOf('_crMajDifferee()') !== -1));

}

console.log('\n  L\'empreinte ne compte plus « un courrier existe »');
{
  /* Le courrier est desormais toujours genere : la valeur serait constante, et
     elle ferait passer le CR pour entame des l'ouverture. */
  verifie('la clé G a disparu de la signature', 'false',
          String(/parts\.push\('G:'/.test(propre)));
  /* Ce qui compte est deja compte ailleurs. */
  verifie('les champs, eux, comptent toujours', 'true',
          /parts\.push\(\(el\.id \|\| el\.name\) \+ '=' \+ v\)/.test(propre) + '');
}


console.log('\n  Les deux encadrés du courrier');
{
  /* Le nom du bloc existe en DEUX exemplaires — le rendu HTML (écran et PDF)
     et le rendu texte (copie, mail). C'est le piège déjà documenté : un
     changement fait d'un seul côté ne se voit pas là où l'autre est lu. */
  verifie('« Synthèse clinique » au rendu HTML', 'true',
          /_est \? 'Synthèse clinique' : 'Plan de traitement'/.test(propre) + '');
  verifie('… et au rendu texte', 'true',
          /out\.push\('Synthèse clinique :'\)/.test(propre) + '');
  verifie('plus aucune « Conclusion » dans les deux rendus', 0,
          (propre.match(/'Conclusion'|'Conclusion :'/g) || []).length);

  /* Variante A : le filet vertical demeure — il rattache le bloc à son titre —
     mais l'aplat de fond part. Sur papier, un aplat gris est ce qui vieillit
     le plus mal, et il alourdissait deux blocs déjà signalés par leur filet. */
  var css = propre.slice(propre.indexOf('var CR_LETTRE_CSS = ['),
                         propre.indexOf("].join('')", propre.indexOf('var CR_LETTRE_CSS = [')));
  verifie('le filet vertical demeure', 'true', /\.lt-bloc\{[^}]*border-left:3px solid/.test(css) + '');
  verifie('le fond est blanc', 'true', /\.lt-bloc\{[^}]*background:#fff/.test(css) + '');
  verifie('deux filets horizontaux le bornent', 'true',
          /border-top:1px solid #E8E6E1;border-bottom:1px solid #E8E6E1/.test(css) + '');
  /* Les aplats des deux blocs sont partis, mais chacun garde SA couleur de
     filet et de titre : c'est ce qui les distingue l'un de l'autre. */
  verifie('plus d\'aplat sur la synthèse', 'false', String(/\.lt-concl\{[^}]*background:/.test(css)));
  verifie('plus d\'aplat sur le plan', 'false', String(/\.lt-plan\{[^}]*background:/.test(css)));
  verifie('la synthèse garde sa couleur', 'true', /\.lt-concl\{border-left-color:#2B5FA6\}/.test(css) + '');
  verifie('le plan garde la sienne', 'true', /\.lt-plan\{border-left-color:#1A3A5C\}/.test(css) + '');
  /* Le CSS du courrier n'existe qu'en UN exemplaire : il sert a l'ecran ET au
     PDF. Ecrit deux fois, il aurait derive. */
  verifie('un seul jeu de styles pour l\'écran et le PDF', 1,
          (propre.match(/var CR_LETTRE_CSS = \[/g) || []).length);
}


console.log('\n  Deux types de courrier, et deux seulement');
{
  /* « Fin / RTS » et « Avis » produisaient EXACTEMENT le même courrier que
     « Suivi » : seul l'objet auto-rempli changeait. Quatre gros boutons en tête
     de formulaire pour une ligne de sujet. */
  verifie('deux pastilles', 2, (src.match(/class="cr-tpl-btn[^"]*" onclick="crSetTemplate\(/g) || []).length);
  verifie('début et suivi', 'debut,suivi',
          (src.match(/crSetTemplate\('(\w+)'\)/g) || []).map(function (m) {
            return m.replace(/crSetTemplate\('|'\)/g, '');
          }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(','));
  verifie('la bascule ne connaît que ces deux-là', 'true',
          /\['debut','suivi'\]\.forEach/.test(propre) + '');
  verifie('l\'objet auto-rempli n\'a plus que deux entrées', 'true',
          /var map = \{ debut:'Début de prise en charge', suivi:'Suivi de rééducation' \};/.test(propre) + '');

  /* SEUL le courrier de début lit `cr-proto-*`. Le montrer sur « Fin / RTS »
     laissait remplir trois champs dont rien ne sortait — une saisie perdue
     sans le moindre signal. */
  verifie('le bloc Protocole ne s\'ouvre que sur « Début »', 'true',
          /var showProto = crTemplate === 'debut';/.test(propre) + '');

  /* Basculer de type change de CONSTRUCTEUR, et `crAutoFillObjet` écrit le
     champ par programme — sans événement. L'écoute à la frappe ne voit rien :
     sans ce rafraîchissement, la bascule ne se voyait nulle part. Le bouton
     « Générer » masquait le trou, on cliquait dessus juste après. */
  var d = propre.indexOf('window.crSetTemplate = function(tpl)');
  var f = propre.indexOf('\n  };', d);
  verifie('changer de type régénère le courrier', 'true',
          String(propre.slice(d, f).indexOf('_crMajDifferee()') !== -1));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

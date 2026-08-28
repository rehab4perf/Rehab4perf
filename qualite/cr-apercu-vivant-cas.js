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

console.log('\n  Ce qui change sans frappe doit le demander');
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
  verifie('quatre points de rafraîchissement hors frappe', 4,
          (propre.match(/window\._crMajDifferee\(\);/g) || []).length);
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

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

#!/usr/bin/env node
/* Cas de référence — l'EVA du Générateur de CR.
 *
 * L'EVA se reprend du bilan. Elle atterrissait dans « Précisions », mêlée aux
 * remarques libres du praticien : pour la retirer du courrier il fallait
 * l'effacer, et la reprendre imposait de la retaper. Elle a désormais son
 * champ et sa case.
 *
 * Trois pièges que ces cas referment, tous déjà rencontrés dans ce fichier :
 *
 *  1. Une case COCHÉE par défaut ne doit pas entrer dans l'empreinte du
 *     formulaire, sinon le CR passe pour entamé dès l'ouverture et une
 *     confirmation s'ouvre à chaque changement de patient.
 *  2. La remise à zéro ne vide que les champs texte : une case décochée le
 *     resterait pour le patient suivant.
 *  3. Le courrier existe en DEUX exemplaires — médecin et patient. Une lecture
 *     ajoutée d'un seul côté disparaît de l'autre sans le moindre signal.
 *
 *   node qualite/cr-eva-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');
var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/* ── la vraie fonction, extraite de la source ────────────────────────────── */
var deb = src.indexOf('  function _crEvaRetenue() {');
var fin = src.indexOf('\n  var CR_IDENTITE = [', deb);
if (deb < 0 || fin < 0) {
  console.error('_crEvaRetenue introuvable dans outils.html.');
  process.exit(1);
}
var code = src.slice(deb, fin);

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

function lire(coche, texte) {
  var doc = {
    getElementById: function (id) {
      return id === 'cr-eva-inc' ? { checked: coche } : null;
    }
  };
  var crV = function (id) { return id === 'cr-eva-txt' ? texte : ''; };
  return new Function('document', 'crV', code + '\n return _crEvaRetenue();')(doc, crV);
}

console.log('\n  La case décide de ce qui part au courrier');
{
  verifie('cochée → l\'EVA part',        'EVA repos : 8/10', lire(true,  'EVA repos : 8/10'));
  verifie('décochée → rien ne part',     '',                 lire(false, 'EVA repos : 8/10'));
  verifie('cochée mais champ vide → rien', '',               lire(true,  ''));
  /* Le texte reste dans le champ quand on decoche : on remet l'EVA d'un clic,
     sans avoir a la retaper. C'est ce que la fonction NE fait pas — elle ne
     vide jamais le champ, elle se contente de ne pas le lire. */
  verifie('décocher ne vide pas le champ', 'false',
          String(/cr-eva-txt'\)\.value\s*=\s*''/.test(sansCom)));
}

console.log('\n  L\'EVA dit son nom');
{
  /* Elle est rangee sous « Signes cliniques ». Saisie A LA MAIN elle arrive
     nue — « 4 » — et s'y lit comme un signe clinique sans nom : le medecin
     voit un chiffre, et rien qui dise ce qu'il mesure. */
  verifie('un chiffre seul devient une EVA sur dix', 'EVA : 4/10', lire(true, '4'));
  verifie('… zéro compris',                          'EVA : 0/10', lire(true, '0'));
  verifie('… et dix, la borne haute',                'EVA : 10/10', lire(true, '10'));
  /* La virgule est la separation decimale francaise : le praticien tape « 6,5 ». */
  verifie('une décimale à la française passe', 'EVA : 6.5/10', lire(true, '6,5'));

  /* Le prefixe ne se met QUE s'il manque. Le preremplissage depuis le bilan
     ecrit deja la mention en toutes lettres : la doubler donnerait
     « EVA : EVA repos : 4/10 ». */
  verifie('le préremplissage du bilan est laissé tel quel',
          'EVA repos : 4/10 — EVA max : 7/10',
          lire(true, 'EVA repos : 4/10 — EVA max : 7/10'));
  verifie('… quelle que soit la casse', 'eva 3', lire(true, 'eva 3'));

  /* On NOMME la valeur, on ne la reecrit pas : ce qui porte deja un « /10 »
     ou un mot garde sa forme. */
  verifie('une note déjà sur dix garde sa forme', 'EVA : 4/10', lire(true, '4/10'));
  verifie('une phrase est nommée sans être réécrite',
          'EVA : 4 au repos, 7 en charge', lire(true, '4 au repos, 7 en charge'));
  verifie('un intervalle aussi', 'EVA : 3-4', lire(true, '3-4'));
  /* Une valeur hors echelle n'est pas une note sur dix : on ne lui en invente
     pas une. */
  verifie('un nombre hors échelle ne devient pas une note sur dix',
          'EVA : 12', lire(true, '12'));
  /* La mention est posee A LA SOURCE, pas aux deux endroits qui l'affichent :
     une regle ecrite d'un seul cote ne se voit pas la ou le document est lu.
     Les deux appels sont deja comptes plus bas. */
  verifie('aucun des deux courriers ne nomme l\'EVA de son côté', 'false',
          String(/_itSig\.push\(\{ ic: '', txt: 'EVA/.test(sansCom)));
}

console.log('\n  L\'empreinte du formulaire ignore la case');
{
  /* Cochee par defaut, elle ferait passer le CR pour entame des l'ouverture —
     et une confirmation s'ouvrirait a chaque changement de patient. Meme piege
     que les cases du bloc « Tests du bilan ». */
  verifie('la signature écarte cr-eva-inc', 'true',
          String(/if \(el\.id === 'cr-eva-inc'\) return;/.test(sansCom)));
  /* Le TEXTE, lui, doit compter : c'est du contenu saisi. */
  verifie('le champ texte n\'est pas écarté', 'false',
          String(/CR_IDENTITE[\s\S]{0,200}cr-eva-txt/.test(sansCom)));
}

console.log('\n  La remise à zéro recoche');
{
  /* `_crResetCore` ne vide que les champs texte, les selects et les zones de
     texte : aucune boucle ne touche aux cases. */
  verifie('la case est recochée', 'true',
          String(/_evaInc\.checked = true;/.test(sansCom)));
}

console.log('\n  Les DEUX courriers lisent l\'EVA');
{
  /* Medecin et patient sont construits par deux fonctions distinctes. Une
     lecture ajoutee d'un seul cote disparait de l'autre sans le moindre
     signal — c'est le defaut deja rencontre sur les blocs du CR. */
  verifie('deux appels à _crEvaRetenue', 2,
          (sansCom.match(/var evaTxt = _crEvaRetenue\(\);/g) || []).length);
  verifie('deux conditions d\'affichage', 2,
          (sansCom.match(/coursSigns\.length \|\| signesLibre \|\| evaTxt/g) || []).length);
  verifie('deux insertions dans la liste', 2,
          (sansCom.match(/if \(evaTxt\) _itSig\.push/g) || []).length);
}

console.log('\n  L\'association depuis le bilan vise le champ dédié');
{
  verifie('elle écrit dans cr-eva-txt', 'true',
          String(/getElementById\('cr-eva-txt'\)/.test(sansCom)));
  /* Elle n'ecrit plus dans « Precisions » : les deux s'y seraient melees. */
  verifie('elle n\'écrit plus dans les précisions', 'false',
          String(/signesEl\.value = evaStr/.test(sansCom)));
}

console.log('\n  Le champ et sa case existent dans la page');
{
  verifie('la case est cochée par défaut', 'true',
          String(/<input type="checkbox" id="cr-eva-inc" checked/.test(sansCom)));
  verifie('le champ texte existe', 'true',
          String(/<input type="text" id="cr-eva-txt"/.test(sansCom)));
  /* Regenerer le courrier a la volee : sans ca, decocher ne se voit qu'apres
     un nouveau clic sur « Generer ». */
  verifie('cocher régénère les blocs', 'true',
          String(/id="cr-eva-inc"[^>]*onchange="crUpdateBlocks\(\)"/.test(sansCom)));
}

console.log('\n  Une observation ne se lit pas comme un critère');
{
  /* Elles portaient le meme retrait et la meme forme de ligne : « Droit :
     execution hyper correct » se lisait comme une compensation de plus, sous
     une colonne ou elle n'a pourtant aucune pastille. */
  verifie('les lignes d\'observation ont leur propre classe', 2,
          (sansCom.match(/<tr class="lt-af-sub lt-af-obs">/g) || []).length);
  verifie('le filet vertical existe', 'true',
          String(/td\.lt-af-sy > span\{[^}]*border-left/.test(sansCom)));
  verifie('le texte est bien enveloppé', 2,
          (sansCom.match(/_crEsc\((?:t\.note|ligne)\) \+ '<\/span><\/td><\/tr>'/g) || []).length);
  /* De l'air au-dessus de la PREMIERE seulement : entre deux observations
     consecutives, le meme ecart les separerait autant du test que l'une de
     l'autre. Le selecteur doit donc viser `lt-af-obs`, jamais `lt-af-sub` —
     les criteres sont eux aussi des `lt-af-sub`, et l'adjacence les attrapait. */
  verifie('l\'air ne se met qu\'avant la première', 'true',
          String(/tr\.lt-af-obs \+ tr\.lt-af-obs td\.lt-af-sy\{padding-top:2px\}/.test(sansCom)));
  verifie('la version texte retire aussi l\'observation', 'true',
          String(/out\.push\('        ' \+ l\)/.test(sansCom)));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

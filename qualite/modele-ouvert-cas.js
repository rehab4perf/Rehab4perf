#!/usr/bin/env node
/* Cas de référence — un modèle ouvert reste l'objet du travail.
 *
 * Ouvrir une phase depuis la barre latérale, c'est déclarer « je travaille sur
 * ce modèle ». Ce mode doit tenir jusqu'à ce qu'on en sorte : vider, charger
 * un autre contenu, recomposer — tout cela porte sur le modèle.
 *
 * Il ne tenait pas. `_loadProg` coupait le lien SANS EXCEPTION et adoptait au
 * passage l'identité du programme chargé. Le praticien qui ouvrait sa phase,
 * la vidait, chargeait la séance d'une patiente et enregistrait ne modifiait
 * donc PAS son modèle : il réécrivait le programme de la patiente, en silence,
 * derrière un bouton qui disait « Sauvegarder ».
 *
 * Trois choses tiennent ici, et perdre l'une des trois ramène le défaut :
 * le lien survit, l'identité du programme n'est PAS adoptée, et le bouton
 * principal met à jour le modèle en le nommant.
 *
 *   node qualite/modele-ouvert-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var data = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
var main = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* On exécute le VRAI corps de _loadProg jusqu'à la décision, avec des
   doublures : le réécrire ferait passer ce cas au vert quoi qu'il arrive. */
var d0 = data.indexOf('function _loadProg(');
var d1 = data.indexOf('var url = SUPA_URL_P', d0);
if (d0 < 0 || d1 < d0) { console.error('Bornes de _loadProg introuvables.'); process.exit(1); }
var tete = data.slice(data.indexOf('{', d0) + 1, d1);

function decider(lienModele, seanceId, quitter) {
  var etat = { _builderFromTemplate: lienModele, _currentSeanceId: 'ancien' };
  /* eslint-disable no-new-func */
  var f = new Function('etat', 'id', 'seanceId', 'quitterModele',
    'var _builderFromTemplate = etat._builderFromTemplate, _currentSeanceId;\n' +
    tete +
    '\nreturn { lien: _builderFromTemplate, seance: _currentSeanceId, garde: _gardeModele };');
  return f(etat, 'p1', seanceId, quitter);
}

console.log('\nLe modèle survit au chargement d\'un contenu');
var r1 = decider('t42', 's9', undefined);
ok('le lien vers le modèle est conservé', r1.lien === 't42', 'lien = ' + r1.lien);
/* Adopter l'identite de la seance ferait porter l'enregistrement sur ELLE. */
ok('l\'identité de la séance n\'est PAS adoptée', r1.seance === null, 'séance = ' + r1.seance);

var r2 = decider('t42', 's9', true);
ok('sortir du modèle se déclare, et alors le lien tombe', r2.lien === null);
ok('… et la séance est bien adoptée', r2.seance === 's9');

var r3 = decider(null, 's9', undefined);
ok('sans modèle ouvert, rien ne change au comportement', r3.lien === null && r3.seance === 's9');

/* L'identifiant du programme suit la meme regle, plus loin dans la fonction. */
ok('l\'identifiant du programme n\'est pas adopté non plus',
   /_currentProgId = _gardeModele \? null : d\.id;/.test(data));

console.log('\nOuvrir une séance de l\'agenda demande confirmation');
var chip = data.slice(data.indexOf('function _openChipInBuilder'));
chip = chip.slice(0, chip.indexOf('\n}'));
ok('un modèle ouvert fait poser la question', /if\(_builderFromTemplate\)\{[\s\S]{0,400}confirm\(/.test(chip));
ok('… en nommant le modèle concerné', /Vous modifiez le modèle/.test(chip));
ok('… et le refus n\'ouvre rien', /confirm\([\s\S]{0,300}\)\) return;/.test(chip));
ok('l\'ouverture déclare qu\'elle quitte le modèle', /_loadProg\(progId, seanceId, true\)/.test(chip));

console.log('\nLe bouton principal met à jour le modèle');
var clic = main.slice(main.indexOf('function _builderSaveBtnClick'));
clic = clic.slice(0, clic.indexOf('\n}'));
ok('le clic met à jour le modèle plutôt que de créer un programme',
   /if\(_builderFromTemplate && !_currentSeanceId && !_currentProgId\)\{ _doUpdateTemplate\(\); return; \}/.test(clic));
/* L'ordre compte : le mode template pur passe AVANT, il a son propre verbe. */
ok('… mais après le mode « nouveau modèle », qui a son propre verbe',
   clic.indexOf("_builderMode === 'template'") < clic.indexOf('_doUpdateTemplate'));

var btn = main.slice(main.indexOf('function _refreshSaveBtn'));
btn = btn.slice(0, btn.indexOf('\nfunction '));
ok('le libellé nomme le modèle', /Mettre à jour « ' \+/.test(btn));
/* Deux boutons pour un seul geste laissent croire qu'ils different. */
ok('le bouton secondaire ne fait pas doublon',
   /if\(_builderFromTemplate && !_currentSeanceId && !_currentProgId\)\{[\s\S]{0,700}if\(updBtn\) updBtn\.style\.display = 'none';[\s\S]{0,40}return;/.test(btn));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Modèle ouvert dans le builder : tous les cas passent.');

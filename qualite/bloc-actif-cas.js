#!/usr/bin/env node
/* Cas de référence — quel bloc reçoit le prochain exercice.
 *
 * Retirer un exercice DÉSIGNE son bloc : on vient d'y travailler, et le
 * suivant s'y ajoute presque toujours. Sans cela il fallait recliquer le bloc —
 * ou, plus souvent, ne pas y penser et voir l'exercice partir dans le dernier
 * bloc de la séance.
 *
 * L'écoute déléguée qui rend un bloc actif au clic ne peut pas s'en charger :
 * elle vit sur `document`, donc elle se déclenche APRÈS le `onclick` du bouton,
 * et celui-ci a déjà rebâti la zone. Sa garde `zone.contains(target)` tombe sur
 * un nœud détaché et abandonne. C'est le genre de défaut qui se corrige « en
 * ajoutant un écouteur » sans que rien ne change.
 *
 *   node qualite/bloc-actif-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var data = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');

function extrait(sig, fin) {
  var d = data.indexOf(sig);
  var f = data.indexOf(fin, d);
  if (d < 0 || f < 0) { console.error('Bornes introuvables : ' + sig); process.exit(1); }
  return data.slice(d, f);
}

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── banc : le vrai removeExo, avec juste ce qu'il touche ────────────────── */
/* Les doublures sont declarees DANS la meme portee que la fonction testee :
   `activeBloc` y est une variable partagee, comme la globale de l'application.
   Declarees dehors, elles lisaient une copie figee — et le cas « pose avant le
   rendu » passait au vert quel que soit l'ordre reel. */
function joue(blocsInit, actifInit, blocId, exoId) {
  var ctx = {
    blocs: blocsInit,
    ordre: [],
    activeBloc: null,
    document: { getElementById: function () { return { value: '' }; } }
  };
  var code = extrait('function removeExo(blocId, exoId){', '\nfunction updateField(');
  new Function('ctx',
    'var blocs = ctx.blocs, document = ctx.document;' +
    'var activeBloc = ' + JSON.stringify(actifInit) + ';' +
    'function renderSession(){ ctx.ordre.push("render:" + activeBloc); }' +
    'function setActiveBloc(id){ activeBloc = id; ctx.ordre.push("setActive:" + id); }' +
    'function renderLib(){}' +
    code +
    'removeExo(' + JSON.stringify(blocId) + ', ' + JSON.stringify(exoId) + ');' +
    'ctx.activeBloc = activeBloc;')(ctx);
  return ctx;
}

function seance() {
  return [
    { id: 'b1', exos: [{ id: 'e1' }, { id: 'e2' }] },
    { id: 'b2', exos: [{ id: 'e3' }] },
    { id: 'b3', exos: [{ id: 'e4' }] }
  ];
}

console.log('\n  Retirer un exercice sélectionne son bloc');
{
  var r = joue(seance(), 'b3', 'b1', 'e1');
  verifie('l\'exercice est retiré', 'e2', r.blocs[0].exos.map(function (e) { return e.id; }).join(','));
  verifie('le bloc devient actif',  'b1', r.activeBloc);
  /* Le bloc actif est pose AVANT le rendu — celui-ci lit `activeBloc` pour
     marquer l'en-tete — et confirme APRES, `updateTargetBlocSelect`
     reconstruisant le menu « Ajouter au bloc ». */
  verifie('posé avant le rendu, confirmé après', 'render:b1,setActive:b1', r.ordre.join(','));
}

console.log('\n  Vider un bloc le sélectionne aussi');
{
  /* C'est le cas qui motive la demande : on retire le dernier exercice pour en
     mettre un autre a la place. */
  var r = joue(seance(), 'b3', 'b2', 'e3');
  verifie('le bloc est vide', 0, r.blocs[1].exos.length);
  verifie('et reste sélectionné', 'b2', r.activeBloc);
}

console.log('\n  Un bloc inconnu ne change rien');
{
  var r = joue(seance(), 'b3', 'bX', 'e1');
  verifie('le bloc actif ne bouge pas', 'b3', r.activeBloc);
  verifie('aucun rendu déclenché', '', r.ordre.join(','));
  verifie('aucun exercice perdu', 2, r.blocs[0].exos.length);
}

console.log('\n  Un exercice inconnu : le bloc est quand même désigné');
{
  /* On a clique dans ce bloc : le designer est juste, meme si rien n'y a ete
     retire. Le contraire demanderait de distinguer deux cas que l'interface ne
     distingue pas. */
  var r = joue(seance(), 'b3', 'b1', 'eX');
  verifie('le bloc devient actif', 'b1', r.activeBloc);
  verifie('aucun exercice perdu',  2, r.blocs[0].exos.length);
}

/* ── Garde-fous textuels ─────────────────────────────────────────────────── */
console.log('\n  Garde-fous');
{
  var sansCom = data.replace(/\/\*[\s\S]*?\*\//g, '');
  var bloc = sansCom.slice(sansCom.indexOf('function removeExo(blocId, exoId){'),
                           sansCom.indexOf('function updateField('));
  verifie('activeBloc est posé dans removeExo', 'true',
          String(/activeBloc = blocId;/.test(bloc)));
  verifie('setActiveBloc est appelé après le rendu', 'true',
          String(bloc.indexOf('renderSession()') < bloc.indexOf('setActiveBloc(blocId)')));
  /* L'ecoute deleguee reste la voie normale pour un clic ordinaire dans un
     bloc : la retirer ferait passer ce cas pour couvert alors qu'il ne l'est
     que sur la suppression. */
  verifie('l\'écoute déléguée sur les blocs subsiste', 'true',
          String(/if \(id && id !== activeBloc\) setActiveBloc\(id\);/.test(sansCom)));
  /* Le menu « Ajouter au bloc » l'emporte sur `activeBloc` a l'ajout : les
     tenir alignes est ce qui rend la selection effective. */
  verifie('setActiveBloc aligne le menu « Ajouter au bloc »', 'true',
          String(/getElementById\('target-bloc-select'\)[\s\S]{0,220}sel\.value = id;/.test(sansCom)));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

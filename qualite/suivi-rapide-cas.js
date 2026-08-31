#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Suivi rapide — il doit rester saisissable en MODE LECTURE

   C'est sa raison d'être : mettre à jour un bilan qu'on est en train de
   consulter. Or le mode lecture verrouille `.page-content` — et le conteneur
   du Suivi rapide porte cette classe comme toutes les pages. Ses champs
   devenaient donc inertes dès qu'un patient avait un bilan enregistré, c'est-
   à-dire toujours.

   Le bouton, lui, est un `<button>` : il restait cliquable et répondait
   « Aucune modification à enregistrer », puisque rien n'avait pu être saisi.
   D'où le symptôme — « il n'enregistre pas les nouvelles données ».

   On exécute le VRAI calcul du delta et on lit la VRAIE feuille de style.
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
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var src  = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

console.log('\n  Le mode lecture ne verrouille pas le Suivi rapide');

/* Le conteneur porte bien `page-content` : c'est ce qui le faisait attraper
   par le verrou, et ce qui rend l'exclusion nécessaire. Si un jour il perdait
   cette classe, l'exclusion deviendrait un vestige — on le saurait ici. */
var cont = html.match(/<div class="([^"]*)" id="suivi-rapide-content">/);
verifie('le conteneur existe', true, !!cont);
verifie('… et porte bien `page-content`', true, !!cont && /\bpage-content\b/.test(cont[1]));

/* Toute règle du mode lecture qui vise `.page-content` doit l'exclure. On les
   parcourt TOUTES : une règle ajoutée demain sans l'exclusion rouvrirait le
   défaut, et c'est exactement ainsi qu'il est né. */
var sansExclusion = [];
html.split('}').forEach(function(bloc){
  var sel = bloc.slice(bloc.lastIndexOf('*/') + 1).split('{')[0];
  if (sel.indexOf('.bilan-readonly') < 0 || sel.indexOf('page-content') < 0) return;
  if (sel.indexOf('#suivi-rapide-content') < 0) {
    sansExclusion.push(sel.replace(/\s+/g, ' ').trim().slice(0, 90));
  }
});
verifie('toute règle de mode lecture exclut le Suivi rapide', [], sansExclusion);

/* ── Le VRAI calcul du delta ───────────────────────────────────────────── */
console.log('\n  Une valeur saisie produit bien un delta');

function Ctrl(mid, valeur, estCase){
  this.value = valeur; this.checked = !!estCase && valeur === true;
  this.tagName = 'INPUT';
  this.getAttribute = function(a){
    if (a === 'data-metric-id') return mid;
    if (a === 'data-is-cb') return estCase ? '1' : null;
    return null;
  };
}
var controles = [
  new Ctrl('hr-ca', '22'),        // retapé par-dessus l'ancien 18
  new Ctrl('hr-cs', '25'),        // inchangé
  new Ctrl('q-f-ca', '140'),      // saisi alors qu'il était vide
  new Ctrl('sls-ca', '')          // laissé vide
];
global.document = {
  getElementById: function(id){
    return id === 'suivi-rapide-content'
      ? { querySelectorAll: function(){ return controles; } }
      : null;
  }
};
global._suiviRapideInitial = { 'hr-ca':'18', 'hr-cs':'25', 'q-f-ca':'', 'sls-ca':'12' };

var d0 = src.indexOf('function _computeSuiviRapideDelta');
var d1 = src.indexOf('\n/*', d0);
if (d0 < 0 || d1 < d0) { console.error('Bornes de _computeSuiviRapideDelta introuvables.'); process.exit(1); }
/* eslint-disable no-eval */
eval(src.slice(d0, d1).replace(/_suiviRapideInitial/g, 'global._suiviRapideInitial'));

var delta = _computeSuiviRapideDelta();
verifie('une valeur retapée entre dans le delta', '22', delta['hr-ca']);
verifie('un champ vide qu\'on remplit y entre aussi', '140', delta['q-f-ca']);
verifie('une valeur inchangée n\'y entre pas', false, 'hr-cs' in delta);
/* Vider un champ chiffré n'est PAS une mesure : ce serait effacer un point de
   la courbe sans jamais l'avoir voulu. Seules les notes libres se vident. */
verifie('un champ qu\'on vide n\'efface rien', false, 'sls-ca' in delta);

/* ── Le côté partenaire suit, sinon les deux courbes se désalignent ────── */
/* On EXECUTE la boucle plutot que d'en chercher la forme : une regex sur du
   code teste sa mise en page, pas son effet. */
console.log('\n  Le côté partenaire d\'un test double');
var b0 = src.indexOf('  CHART_GROUPS.forEach(function(grp){\n    if(grp.type !== \'dual\'');
var b1 = src.indexOf('if(!Object.keys(delta).length){', b0);
if (b0 < 0 || b1 < b0) { console.error('Bornes de la boucle partenaire introuvables.'); process.exit(1); }

var champsDom = { 'hr-ca': { value:'22' }, 'hr-cs': { value:'25' },
                  'hop-ca': { value:'' },  'hop-cs': { value:'' } };
global.document.querySelector = function(sel){
  var m = sel.match(/data-metric-id="([^"]+)"/);
  return m && champsDom[m[1]] ? champsDom[m[1]] : null;
};
var CHART_GROUPS = [
  { type:'dual', idA:'hr-ca',  idB:'hr-cs'  },
  { type:'dual', idA:'hop-ca', idB:'hop-cs' },
  { type:'dual', idA:'x',      idB:'y', computeA:function(){} }
];
/* Seul le cote A du Heel Rise a ete retape. */
var delta2 = { 'hr-ca':'22' };
new Function('CHART_GROUPS', 'delta', 'document', src.slice(b0, b1))(CHART_GROUPS, delta2, global.document);

verifie('le côté partenaire rejoint le delta', '25', delta2['hr-cs']);
verifie('… avec sa valeur du formulaire, non celle du passé', 2, Object.keys(delta2).length);
/* Un test dont AUCUN cote n'a bouge ne doit rien ajouter : ce serait
   reenregistrer une mesure qu'on n'a pas refaite. */
verifie('un test non touché reste hors du delta', false, 'hop-ca' in delta2);

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 10 attentes vérifiées');

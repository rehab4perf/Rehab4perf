#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Une valeur héritée ne doit jamais avoir l'air d'une valeur saisie

   Elle n'est JAMAIS enregistrée — c'est un placeholder, effacé à la première
   frappe. Deux styles coexistaient pourtant : gris italique à la création d'un
   bilan de suivi, et NOIR en mode modification, au motif que la mise en page
   du reste de la page primait.

   Sur un bilan de suivi rouvert pour correction, seuls les blocs NON retestés
   ce jour-là portent une ombre — le Heel Rise et le Hop Test dans le cas
   signalé. Ils s'y lisaient donc comme des mesures du jour, en pleine encre,
   au milieu de vraies valeurs.

   On exécute la VRAIE fonction et on lit la VRAIE feuille de style.
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
var src  = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

/* ── Un DOM minimal : seulement ce que la fonction touche ──────────────── */
function Champ(id, type){
  this.id = id; this.type = type; this.tagName = 'INPUT';
  this.value = ''; this.placeholder = '—'; this.dataset = {}; this.checked = false;
  var cl = [];
  this.classList = {
    add:    function(){ [].forEach.call(arguments, function(c){ if (cl.indexOf(c) < 0) cl.push(c); }); },
    remove: function(){ [].forEach.call(arguments, function(c){ var i = cl.indexOf(c); if (i >= 0) cl.splice(i, 1); }); },
    contains: function(c){ return cl.indexOf(c) >= 0; },
    _l: cl
  };
  this.addEventListener = function(){}; this.removeEventListener = function(){};
  this.removeAttribute = function(){};
}
var champs = {};
['hr-ca', 'hr-cs', 'hop-ca', 'hop-cs', 'sls-ca'].forEach(function(id){
  champs[id] = new Champ(id, 'number');
});
/* Un champ SAISI aujourd'hui : il ne doit recevoir aucune marque. */
champs['sls-ca'].value = '14';

global.document = {
  getElementById: function(id){ return champs[id] || null; },
  querySelectorAll: function(){ return { forEach: function(){} }; }
};

var f0 = src.indexOf('function _blShowInheritedHints');
var f1 = src.indexOf('\nfunction ', f0 + 10);
if (f0 < 0 || f1 < f0) { console.error('Bornes de _blShowInheritedHints introuvables.'); process.exit(1); }
/* eslint-disable no-eval */
eval(src.slice(f0, f1));

console.log('\n  Marque d\'une valeur héritée');

/* La fonction ne prend plus de variante de style : le second parametre etait
   le seul moyen d'obtenir l'encre noire. */
verifie('la fonction n\'a plus de variante de style', true,
  /function _blShowInheritedHints\(mergedData\)\s*\{/.test(src));
verifie('… et la classe noire a disparu du script', false, /bl-ghost-grise/.test(src));
verifie('… comme de la feuille de style', false, /bl-ghost-grise/.test(html));

_blShowInheritedHints({ 'hr-ca':'18', 'hr-cs':'25', 'hop-ca':'140', 'hop-cs':'160', 'sls-ca':'12' });

verifie('le Heel Rise porte la marque', ['bl-inherited-ghost'], champs['hr-ca'].classList._l);
verifie('… et affiche l\'ancienne valeur', '18', champs['hr-ca'].placeholder);
verifie('le Hop Test porte la marque', ['bl-inherited-ghost'], champs['hop-ca'].classList._l);
/* Un champ deja saisi n'est pas une valeur heritee : la marque le ferait
   passer pour un rappel, et le praticien croirait n'avoir rien mesure. */
verifie('un champ saisi ne porte aucune marque', [], champs['sls-ca'].classList._l);
verifie('… et garde son propre texte d\'invite', '—', champs['sls-ca'].placeholder);

/* ── Le style, lu dans la feuille ──────────────────────────────────────── */
console.log('\n  Style de la marque');
var i = html.indexOf('input.bl-inherited-ghost::placeholder');
if (i < 0) { console.error('Règle de placeholder introuvable.'); process.exit(1); }
/* Borner : sans cette borne on lit les regles des cases a cocher, qui portent
   le meme selecteur et d'autres proprietes. */
var regle = html.slice(i, html.indexOf('}', i));
verifie('l\'encre est celle des textes secondaires', true, /color:\s*var\(--text3\)/.test(regle));
verifie('… et le texte est en italique', true, /font-style:\s*italic/.test(regle));
/* L'ancienne regle noire ne doit pas pouvoir revenir sous une autre forme. */
verifie('aucune règle ne rend l\'ombre à l\'encre pleine', false,
  /\.bl-inherited-ghost(::placeholder)?\s*\{[^}]*color:\s*var\(--text\)\s*[;}]/.test(html));

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 11 attentes vérifiées');

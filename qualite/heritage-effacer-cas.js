#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Bilan de suivi — effacer sa saisie rend l'ancienne valeur À SA MARQUE

   Signalé par le praticien (iPad, bilan de suivi de Guillaume) : un champ vide
   montre l'ancienne valeur en gris italique. On tape une valeur, on l'efface —
   « 21.8 » revient, mais en encre de saisie, plus en italique : il se lit
   comme une mesure du jour alors que RIEN ne sera enregistré.

   La cause : `_blShowInheritedHints` retirait la marque à la PREMIÈRE frappe
   et détachait son écouteur, mais laissait l'ancienne valeur dans le
   placeholder. Une fois le champ revidé, le placeholder réapparaissait sans la
   classe qui le dit hérité.

   La règle : la marque suit l'état du champ, à chaque frappe — vide, ombre
   héritée ; rempli, aucune marque. Même règle pour un menu revenu à son option
   vide et une case redécochée. Les écouteurs restent donc attachés : le
   nettoyage (changement de patient, nouveau suivi) doit les DÉTACHER, sans
   quoi un champ tapé puis vidé ressusciterait une ombre périmée.

     node qualite/heritage-effacer-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
var fs = require('fs'), path = require('path');
var R = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

var deb = src.indexOf('function _blShowInheritedHints(');
var fin = src.indexOf('\nfunction ', deb + 10);
if (deb < 0 || fin < deb) { console.error('_blShowInheritedHints introuvable.'); process.exit(1); }
var code = src.slice(deb, fin);

/* ── Un DOM minimal, mais qui GARDE ses écouteurs et les RETIRE vraiment ── */
function Champ(o) {
  this.id = o.id; this.tagName = o.tag || 'INPUT';
  this.type = o.type || (this.tagName === 'INPUT' ? 'text' : undefined);
  this.value = ''; this.checked = false; this.placeholder = o.placeholder || '';
  this.options = o.options || []; this.dataset = {}; this.title = undefined;
  var cl = {}; this._ec = [];
  this.classList = {
    add: function (c) { cl[c] = true; }, remove: function (c) { delete cl[c]; },
    contains: function (c) { return !!cl[c]; },
    toggle: function (c, f) { if (f === undefined ? !cl[c] : f) cl[c] = true; else delete cl[c]; }
  };
}
Champ.prototype.addEventListener = function (t, f) { this._ec.push([t, f]); };
Champ.prototype.removeEventListener = function (t, f) { this._ec = this._ec.filter(function (e) { return !(e[0] === t && e[1] === f); }); };
Champ.prototype.removeAttribute = function (a) { if (a === 'title') this.title = undefined; };
Champ.prototype.emet = function (t) { var s = this; this._ec.slice().forEach(function (e) { if (e[0] === t) e[1].call(s, { type: t }); }); };
Champ.prototype.ombre = function () { return this.classList.contains('bl-inherited-ghost'); };

var champs = [];
var doc = {
  getElementById: function (id) { return champs.filter(function (c) { return c.id === id; })[0] || null; },
  querySelectorAll: function (sel) { var cl = sel.replace('.', ''); return champs.filter(function (c) { return c.classList.contains(cl); }); }
};
var montrer = new Function('document', code + '\nreturn _blShowInheritedHints;')(doc);

/* ── Un champ chiffré ────────────────────────────────────────────────────── */
console.log('\nUn champ chiffré : taper, puis effacer');
var kg = new Champ({ id: 'add-ca', placeholder: '— kg' });
var sel = new Champ({ id: 'add-apr-ca', tag: 'SELECT', options: [{ value: '', textContent: '—', dataset: {} }, { value: 'Positif', textContent: 'Positif', dataset: {} }] });
sel.options[0].selected = false;
var cc = new Champ({ id: 'plioq-cs-0', type: 'checkbox' });
champs = [kg, sel, cc];
montrer({ 'add-ca': '21.8', 'add-apr-ca': 'Positif', 'plioq-cs-0': true });
ok('vide : l\'ancienne valeur, marquée', kg.ombre() && kg.placeholder === '21.8');
kg.value = '22'; kg.emet('input');
ok('une saisie retire la marque', !kg.ombre());
ok('… et l\'infobulle « Champ VIDE »', !kg.title, kg.title);
kg.value = ''; kg.emet('input');
ok('EFFACER rend la marque : 21.8 redevient une valeur héritée, pas une saisie', kg.ombre() && kg.placeholder === '21.8',
   'classe ' + kg.ombre() + ', placeholder « ' + kg.placeholder + ' »');
ok('… et son infobulle', /VIDE/.test(kg.title || ''));
kg.value = '2'; kg.emet('input'); kg.value = ''; kg.emet('input'); kg.value = '23'; kg.emet('input');
ok('… autant de fois qu\'on tape et efface', !kg.ombre());

console.log('\nUn menu d\'appréciation');
sel.value = 'Positif'; sel.emet('change');
ok('choisir une valeur retire la marque et rend « — » à l\'option vide', !sel.ombre() && sel.options[0].textContent === '—', sel.options[0].textContent);
sel.value = ''; sel.emet('change');
ok('revenir à l\'option vide rend l\'ancienne valeur, marquée', sel.ombre() && sel.options[0].textContent === 'Positif', sel.options[0].textContent);

console.log('\nUne case à cocher');
cc.checked = true; cc.emet('change');
ok('cocher retire l\'anneau', !cc.ombre());
cc.checked = false; cc.emet('change');
ok('décocher rend l\'anneau (elle était cochée au bilan précédent)', cc.ombre() && /VIDE/.test(cc.title || ''));

/* ── Le nettoyage détache ce qu'il a attaché ─────────────────────────────── */
console.log('\nChangement de patient : plus aucune ombre ne ressuscite');
kg.value = '24'; kg.emet('input');              // tapé : il n'a plus la classe
montrer(null);                                  // nettoyage (reset, autre patient)
ok('le placeholder d\'origine est rendu, même au champ tapé', kg.placeholder === '— kg', kg.placeholder);
kg.value = ''; kg.emet('input');
ok('vider ensuite ne fait PAS renaître l\'ombre de l\'ancien patient', !kg.ombre());
ok('aucun écouteur ne reste attaché', kg._ec.length === 0 && sel._ec.length === 0 && cc._ec.length === 0,
   kg._ec.length + ' / ' + sel._ec.length + ' / ' + cc._ec.length);
ok('le menu a retrouvé son « — »', sel.options[0].textContent === '—' && !sel.ombre());
montrer({ 'add-ca': '30' });
montrer({ 'add-ca': '31' });
ok('deux suivis de suite : un seul écouteur, sur la dernière valeur', kg._ec.length === 1 && kg.placeholder === '31', kg._ec.length + ' écouteur(s)');

/* ── Tests personnalisés : même règle ───────────────────────────────────────
   Leurs champs sont écrits en HTML (`oninput`) dans une fermeture : on lit la
   source, assumé — l'exécuter demanderait tout le rendu des tests perso. */
console.log('\nTests personnalisés');
var i0 = src.indexOf('function _ctAttrsVal('), attrs = src.slice(i0, src.indexOf('\n  }\n', i0));
ok('le champ chiffré bascule la marque selon qu\'il est vide', /rm:"this\.classList\.toggle\('bl-inherited-ghost', ?this\.value ?=== ?''/.test(attrs), (attrs.match(/rm:"[^"]*"/) || ['absent'])[0]);
var j0 = src.indexOf('function _ctOmbreObs('), obs = src.slice(j0, src.indexOf('\n  }\n', j0));
ok('l\'observation aussi, sans se détacher à la première frappe', /classList\.toggle\('bl-inherited-ghost', ?this\.value ?=== ?''\)/.test(obs) && !/removeEventListener/.test(obs));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bilan de suivi : vide, c\'est l\'ancienne valeur ; rempli, c\'est la saisie.');

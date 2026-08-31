#!/usr/bin/env node
/* Cas de référence — les valeurs héritées d'un bilan de suivi.
 *
 * Sur un bilan de suivi, tous les champs sont vides et la dernière valeur
 * connue s'affiche EN FOND, jamais en contenu : placeholder pour les champs
 * texte, texte de l'option vide pour les menus, anneau pointillé pour les
 * cases à cocher. Rien n'est enregistré tant que le praticien n'a pas saisi.
 *
 * Ce qui a motivé ces cas : les cases à cocher n'affichaient RIEN. Elles
 * étaient écartées deux fois — explicitement dans leur branche, et avant elle
 * par le garde `el.value !== ''`, car `value` vaut 'on' sur une case même
 * décochée. Les 45 cellules des grilles qualitatives (analyse fonctionnelle,
 * Test de Réception, pliométrie qualitative, SEBT) restaient donc muettes
 * pendant que tout le reste du formulaire s'affichait en italique.
 *
 *   node qualite/heritage-suivi-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');

/* ── le VRAI _blShowInheritedHints, extrait de la source ─────────────────── */
var deb = src.indexOf('function _blShowInheritedHints(');
var fin = src.indexOf('\nfunction ', deb + 10);
if (deb < 0 || fin < 0) {
  console.error('_blShowInheritedHints introuvable dans js/bilan.js.');
  process.exit(1);
}
var code = src.slice(deb, fin);

/* ── un DOM minimal : juste ce que la fonction touche ────────────────────── */
function Champ(o) {
  this.id = o.id;
  this.tagName = o.tag || 'INPUT';
  this.type = o.type || (this.tagName === 'INPUT' ? 'text' : undefined);
  this.value = o.value !== undefined ? o.value : '';
  this.checked = !!o.checked;
  this.placeholder = o.placeholder || '';
  this.options = o.options || [];
  this.dataset = {};
  this._cls = {};
  this._ecoute = {};
  var self = this;
  this.classList = {
    add: function () { [].forEach.call(arguments, function (c) { self._cls[c] = true; }); },
    remove: function () { [].forEach.call(arguments, function (c) { delete self._cls[c]; }); },
    contains: function (c) { return !!self._cls[c]; }
  };
}
Champ.prototype.addEventListener = function (t, f) { this._ecoute[t] = f; };
Champ.prototype.removeEventListener = function () {};
Champ.prototype.removeAttribute = function (a) { if (a === 'title') this.title = undefined; };
Champ.prototype.classes = function () { return Object.keys(this._cls).sort().join(' '); };

function faireDoc(champs) {
  var par = {};
  champs.forEach(function (c) { par[c.id] = c; });
  return {
    getElementById: function (id) { return par[id] || null; },
    querySelectorAll: function (sel) {
      var cl = sel.replace('.', '');
      return champs.filter(function (c) { return c.classList.contains(cl); });
    }
  };
}

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* La fonction ne prend plus de variante de style : une valeur heritee porte
   UNE marque, quel que soit le chemin par lequel on arrive. Voir
   `qualite/valeur-heritee-cas.js`. */
function joue(champs, donnees) {
  var doc = faireDoc(champs);
  new Function('document', code + '\n return _blShowInheritedHints;')(doc)(donnees);
  return champs;
}

/* ── Cases à cocher ──────────────────────────────────────────────────────── */
console.log('\n  Une case cochée au bilan précédent porte sa marque');
{
  /* `value` vaut 'on' sur une case décochée : c'est ce qui les écartait toutes
     avant même d'atteindre leur branche. Le cas le fixe explicitement. */
  var c = new Champ({ id: 'plioq-cs-0', type: 'checkbox', value: 'on' });
  joue([c], { 'plioq-cs-0': true });
  verifie('anneau posé, en gris', 'bl-inherited-ghost', c.classes());
  verifie('la case reste DÉCOCHÉE — rien ne sera enregistré', 'false', String(c.checked));
  verifie('une infobulle dit ce que la marque veut dire', 'true', String(!!c.title));

  var r = new Champ({ id: 'sebt-instab-oui', type: 'radio', value: 'oui' });
  joue([r], { 'sebt-instab-oui': 'true' });
  verifie('un radio à value non vide est traité aussi', 'true', String(r.classList.contains('bl-inherited-ghost')));
}

console.log('\n  Une case décochée ne dit rien — et ne doit rien dire');
{
  /* `_serializeBilan` enregistre CHAQUE case à chaque bilan, cochée ou non :
     un `false` est indiscernable de « jamais évaluée ». Le marquer baliserait
     les 45 cellules des grilles à chaque suivi, sans rien apprendre. */
  [false, 'false', '0', '', null, undefined].forEach(function (v) {
    var c = new Champ({ id: 'x', type: 'checkbox', value: 'on' });
    joue([c], { x: v });
    verifie('valeur ' + JSON.stringify(v) + ' → aucune marque', '', c.classes());
  });
}

console.log('\n  Une case déjà cochée par le praticien n\'est pas touchée');
{
  var c = new Champ({ id: 'y', type: 'checkbox', value: 'on', checked: true });
  joue([c], { y: true });
  verifie('pas de marque sur une vraie saisie', '', c.classes());
}

console.log('\n  La marque part au premier clic');
{
  var c = new Champ({ id: 'z', type: 'checkbox', value: 'on' });
  joue([c], { z: true });
  c.checked = true;
  c._ecoute.change();
  verifie('plus aucune classe', '', c.classes());
  verifie('plus d\'infobulle', 'undefined', String(c.title));
}

/* ── Les autres contrôles n'ont pas régressé ─────────────────────────────── */
console.log('\n  Champs texte et menus déroulants');
{
  var t = new Champ({ id: 'sls-obs-cs', tag: 'TEXTAREA' });
  joue([t], { 'sls-obs-cs': 'valgus dynamique' });
  verifie('la valeur passe en placeholder', 'valgus dynamique', t.placeholder);
  verifie('le champ reste vide', '', t.value);
  verifie('marqué en gris italique', 'bl-inherited-ghost', t.classes());

  var n = new Champ({ id: 'ha-f-flech-cs', type: 'number' });
  joue([n], { 'ha-f-flech-cs': 38 });
  verifie('un nombre s\'affiche aussi', '38', n.placeholder);

  var opt0 = { value: '', textContent: '—', dataset: {} };
  var sel = new Champ({ id: 'af-mi-ohs-corr', tag: 'SELECT', options: [opt0, { value: 'oui' }] });
  joue([sel], { 'af-mi-ohs-corr': 'oui' });
  verifie('l\'option vide porte la valeur héritée', 'oui', opt0.textContent);
  verifie('le select vaut toujours vide', '', sel.value);
}

console.log('\n  Un second appel efface les marques du premier');
{
  var c = new Champ({ id: 'a', type: 'checkbox', value: 'on' });
  var t = new Champ({ id: 'b', tag: 'TEXTAREA', placeholder: 'Observation…' });
  joue([c, t], { a: true, b: 'ancien' });
  joue([c, t], null);
  verifie('la case est nettoyée', '', c.classes());
  /* Le nettoyage a sa propre branche pour les cases : la classe part avant le
     `if`, mais l'infobulle non — sans cette assertion, neutraliser cette
     branche ne cassait aucun cas. */
  verifie('l\'infobulle héritée part avec elle', 'undefined', String(c.title));
  verifie('le placeholder d\'origine est rendu', 'Observation…', t.placeholder);
}

/* ── Garde-fous textuels ─────────────────────────────────────────────────── */
console.log('\n  Garde-fous — le garde d\'entrée et le style de la marque');
{
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '');
  verifie('« champ vide » se dit `checked` sur une case, pas `value`', 'true',
          String(/estCase \? el\.checked : el\.value !== ''/.test(sansCom)));

  var css = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
  verifie('l\'anneau pointillé existe en CSS', 'true',
          String(/input\[type=checkbox\]\.bl-inherited-ghost[\s\S]{0,200}outline:2px dashed/.test(css)));
  /* Le fond gris générique poserait un `background` sur la case elle-même :
     sans effet sur une case native, et trompeur pour la lecture suivante. */
  verifie('le fond gris générique exclut les cases', 'true',
          String(/input\.bl-inherited-ghost:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/.test(css)));
}

/* ── Ce qui se REPORTE d'un bilan de suivi, et ce qui doit être remesuré ──
 *
 * Les champs de la page Infos étaient TOUS pré-remplis avec de vraies valeurs.
 * La douleur en fait partie — or c'est un état du jour, pas une histoire.
 * Reportée puis sauvegardée sans y toucher, elle entrait dans le suivi comme
 * une mesure : `f-eva` et `f-eva-max` alimentent les courbes « Douleur EVA
 * (repos) » et « EVA max (7 jours) », où le report se lit comme un PLATEAU —
 * une douleur stable, alors que rien n'a été mesuré. Et la ligne « EVA repos »
 * part au médecin. Un faux signal clinique, qui sort du cabinet.
 *
 * On exécute ici le VRAI bloc de pré-remplissage, avec des doublures : le
 * réécrire ferait passer ce cas au vert quoi qu'il advienne du produit. */
console.log('\n  Ce qui se reporte au bilan de suivi');
{
  var d0 = src.indexOf('var A_REMESURER');
  var d1 = src.indexOf('_deserializeBilan(infoKeys);', d0);
  verifie('le bloc de pré-remplissage est identifiable', 'true', String(d0 > 0 && d1 > d0));

  var champs = [
    'f-nom', 'f-motif', 'f-date-accident', 'f-atcd', 'f-mecanisme',  // histoire
    'f-douleur', 'f-eva', 'f-eva-max', 'f-eva-obs',                  // état du jour
    'f-pain-zones', 'f-cote'                                          // portent le côté
  ];
  var recu = null;
  /* eslint-disable no-new-func */
  new Function('document', '_buildMergedDonnees', '_deserializeBilan', '_allBilans',
    src.slice(d0, d1) + '_deserializeBilan(infoKeys);')(
    { querySelectorAll: function () { return champs.map(function (id) { return { id: id }; }); } },
    function () { var o = {}; champs.forEach(function (c) { o[c] = 'ancienne valeur'; }); return o; },
    function (k) { recu = k; },
    []
  );

  verifie('la description de la douleur ne se reporte pas', 'false', String(recu.hasOwnProperty('f-douleur')));
  verifie('l\'EVA du jour ne se reporte pas',              'false', String(recu.hasOwnProperty('f-eva')));
  verifie('l\'EVA max 7 jours ne se reporte pas',          'false', String(recu.hasOwnProperty('f-eva-max')));
  verifie('les observations douleur ne se reportent pas',  'false', String(recu.hasOwnProperty('f-eva-obs')));

  /* Le reste de l'anamnèse est une histoire : la retaper à chaque séance
     serait absurde, et l'oublier appauvrirait le dossier. */
  ['f-nom', 'f-motif', 'f-date-accident', 'f-atcd', 'f-mecanisme'].forEach(function (id) {
    verifie(id + ' se reporte bien', 'true', String(recu.hasOwnProperty(id)));
  });

  /* Délibéré : les zones portent le côté atteint, que le CR nomme en toutes
     lettres. Les vider obligerait à redessiner à chaque séance. */
  verifie('les zones de douleur se reportent (elles portent le côté)', 'true',
          String(recu.hasOwnProperty('f-pain-zones')));
  verifie('le côté atteint se reporte', 'true', String(recu.hasOwnProperty('f-cote')));

  /* L'ancienne valeur doit rester VISIBLE, en gris : le praticien la retape,
     il ne la devine pas. L'ordre compte — le fond gris ne se pose que sur un
     champ vide, donc après le pré-remplissage. */
  var iPre = src.indexOf('_deserializeBilan(infoKeys);');
  var iFond = src.indexOf('_blShowInheritedHints(_prevDonnees)', iPre);
  verifie('le fond gris est posé APRÈS le pré-remplissage', 'true', String(iFond > iPre));

  /* Le motif de la règle : ces deux champs sont des métriques d'Évolution.
     S'ils cessaient de l'être, la règle mériterait d'être rediscutée. */
  verifie('f-eva est bien une métrique d\'Évolution', 'true',
          String(/\{id:'f-eva',[^}]*cat:'Douleur'\}/.test(src)));
  verifie('f-eva-max aussi', 'true',
          String(/\{id:'f-eva-max',[^}]*cat:'Douleur'\}/.test(src)));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

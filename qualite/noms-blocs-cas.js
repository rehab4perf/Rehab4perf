/* ─────────────────────────────────────────────────────────────────────────
   Le libellé d'un bloc de SCAN est écrit à DEUX endroits — et les deux
   s'affichent.

   `bilan.html` porte l'en-tête que voit le praticien dans la page ; le
   registre `BILAN_BLOCKS` de `js/bilan-blocks.js` porte le nom que voit la
   bibliothèque de blocs et le panneau de réorganisation. Rien ne les relie :
   renommer d'un côté seulement laisse la page dire « Scan orthopédique »
   pendant que la bibliothèque dit encore « Quick Scan Orthopédique ». Le
   praticien y voit deux blocs différents.

   Un même `data-block-id` couvre parfois DEUX en-têtes — la variante à un
   côté et la variante bilatérale, qui partagent l'identifiant (c'est écrit
   dans CLAUDE.md). Les deux doivent porter le même libellé.

   La règle ne vaut QUE pour les blocs de scan. Partout ailleurs les deux
   libellés divergent volontairement — la page numérote (« ① Force
   Fonctionnelle »), le registre développe (« Force Fonctionnelle — Single Leg
   Squat »). Exiger l'égalité partout ferait échouer trente-cinq blocs
   parfaitement corrects, et le cas serait desactive au premier passage.

   L'en-tête ajoute souvent une consigne de lecture après un tiret cadratin
   (« — Positif = ❌ »), que le registre ne porte pas : on ne compare donc que
   ce qui précède ce tiret.
   ───────────────────────────────────────────────────────────────────────── */
var fs = require('fs');
var path = require('path');
var RACINE = path.join(__dirname, '..');

var echecs = [];
function ok(titre, condition, detail) {
  if (!condition) echecs.push('  ✗ ' + titre + (detail ? ' — ' + detail : ''));
  else console.log('  ✓ ' + titre);
}

var html = fs.readFileSync(path.join(RACINE, 'bilan.html'), 'utf8');
var srcBlocks = fs.readFileSync(path.join(RACINE, 'js', 'bilan-blocks.js'), 'utf8');

/* On execute le VRAI fichier de registre, pas une copie de ses valeurs. */
var BILAN_BLOCKS = new Function(srcBlocks + '\nreturn BILAN_BLOCKS;')();
ok('le registre se charge et n\'est pas vide',
   BILAN_BLOCKS && Object.keys(BILAN_BLOCKS).length > 0);

/* Libelle affiche : tout ce qui precede le tiret cadratin, balises retirees. */
function libelle(brut) {
  return brut.replace(/<[^>]*>/g, '')
             .split('—')[0]
             .replace(/&nbsp;/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

/* Tous les en-tetes portes par un data-block-id donne, dans l'ordre du fichier. */
function entetes(id) {
  var trouves = [];
  var marque = 'data-block-id="' + id + '"';
  var d = 0;
  while ((d = html.indexOf(marque, d)) !== -1) {
    var h = html.indexOf('class="block-header', d);
    if (h !== -1) {
      var ouvre = html.indexOf('>', h);
      var ferme = html.indexOf('</div>', ouvre);
      /* On ne traverse pas le bloc suivant : un bloc sans en-tete ne doit pas
         emprunter celui d'un voisin, sinon le cas passe pour une mauvaise
         raison. */
      var suivant = html.indexOf('data-block-id=', d + 1);
      if (ferme !== -1 && (suivant === -1 || h < suivant)) {
        trouves.push(libelle(html.slice(ouvre + 1, ferme)));
      }
    }
    d += marque.length;
  }
  return trouves;
}

var compares = 0, orphelins = [], divergents = [], desaccords = [];

/* Un bloc de scan se reconnait a son libelle, des deux cotes — c'est le seul
   lien qui existe entre les deux fichiers. */
function estScan(t) { return /^scan\b/i.test(t); }

Object.keys(BILAN_BLOCKS).forEach(function (page) {
  (BILAN_BLOCKS[page] || []).forEach(function (b) {
    if (!b || !b.id || !b.name) return;
    var vus = entetes(b.id);
    if (!vus.length) { orphelins.push(page + '/' + b.id); return; }
    if (!estScan(b.name) && !vus.some(estScan)) return;
    vus.forEach(function (v) {
      if (v !== vus[0]) desaccords.push(b.id + ' : « ' + vus[0] + ' » vs « ' + v + ' »');
    });
    compares++;
    if (vus[0] !== b.name) {
      divergents.push(b.id + ' : page « ' + vus[0] + ' » vs registre « ' + b.name + ' »');
    }
  });
});

ok('les six blocs de scan sont comparés', compares === 6, compares + ' comparé(s)');
ok('chaque bloc du registre existe dans la page',
   orphelins.length === 0, orphelins.join(', '));
ok('les deux en-têtes d\'un même bloc s\'accordent',
   desaccords.length === 0, desaccords.join(' | '));
ok('page et registre nomment le scan pareil',
   divergents.length === 0, divergents.join(' | '));

/* Le renommage demande par le praticien : plus de « Quick Scan » nulle part.
   On balaie les trois fichiers qui en portaient, commentaires compris — un
   commentaire qui garde l'ancien nom envoie la prochaine recherche dans le
   vide. */
['bilan.html', 'js/bilan.js', 'js/bilan-blocks.js'].forEach(function (f) {
  var s = fs.readFileSync(path.join(RACINE, f), 'utf8');
  var restes = s.match(/quick[  -]?scan/gi) || [];
  ok('« Quick Scan » a disparu de ' + f, restes.length === 0,
     restes.length + ' occurrence(s)');
});

/* Le mot « Scan » seul ne dit pas de quel examen il s'agit : chaque bloc
   scan garde son qualificatif (orthopedique, fonctionnel, cervical…). */
var nus = [];
Object.keys(BILAN_BLOCKS).forEach(function (page) {
  (BILAN_BLOCKS[page] || []).forEach(function (b) {
    if (b && b.name && /^scan\s*$/i.test(b.name)) nus.push(page + '/' + b.id);
  });
});
ok('aucun bloc ne s\'appelle « Scan » tout court', nus.length === 0, nus.join(', '));

if (echecs.length) {
  console.log('\nNoms de blocs : ' + echecs.length + ' cas en échec');
  echecs.forEach(function (e) { console.log(e); });
  process.exit(1);
}
console.log('\nNoms de blocs : tous les cas passent.');

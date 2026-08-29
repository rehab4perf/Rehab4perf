#!/usr/bin/env node
/* Bump des numeros de version — d'apres les fichiers REELLEMENT modifies.
 *
 * Le piege que ce script existe pour fermer : un fichier JS est charge par une
 * page, qui est elle-meme chargee par le shell. Modifier `js/bilan.js` oblige
 * donc a bouger DEUX numeros — celui du script dans `bilan.html`, et celui de
 * `bilan.html` dans `index.html`. En oublier un laisse le navigateur sur son
 * ancienne copie : la correction est deployee mais invisible, y compris
 * pendant les tests. Cherchee a la main, cette erreur a deja coute plusieurs
 * heures.
 *
 *   node .claude/skills/deployer/scripts/bump-versions.js            # applique
 *   node .claude/skills/deployer/scripts/bump-versions.js --dry-run  # montre
 *   node .claude/skills/deployer/scripts/bump-versions.js --files a.js b.html
 */
'use strict';
var fs = require('fs');
var cp = require('child_process');

/* Qui charge quoi. La cle est le fichier modifie ; la valeur liste les
   references `?v=` a faire bouger, sous la forme `page::motif`. */
var CHAINE = {
  'js/bilan.js':        [['bilan.html', 'js/bilan.js'], ['index.html', 'bilan.html']],
  'js/bilan-blocks.js': [['bilan.html', 'js/bilan-blocks.js'], ['index.html', 'bilan.html']],
  'bilan.html':         [['index.html', 'bilan.html']],
  'js/prog-data.js':    [['programme.html', 'js/prog-data.js'], ['index.html', 'programme.html']],
  'js/prog-main.js':    [['programme.html', 'js/prog-main.js'], ['index.html', 'programme.html']],
  'programme.html':     [['index.html', 'programme.html']],
  'outils.html':        [['index.html', 'outils.html']],
  'js/patients-data.js':[['patients.html', 'js/patients-data.js'], ['index.html', 'patients.html']],
  'patients.html':      [['index.html', 'patients.html']],
  'account.html':       [['index.html', 'account.html']],
  'js/aide-content.js': [['index.html', 'js/aide-content.js'], ['aide.html', 'js/aide-content.js']],
  'js/r4p-erreurs.js':  [['index.html', 'js/r4p-erreurs.js'], ['bilan.html', 'js/r4p-erreurs.js'],
                         ['outils.html', 'js/r4p-erreurs.js'], ['programme.html', 'js/r4p-erreurs.js'],
                         ['patients.html', 'js/r4p-erreurs.js'], ['account.html', 'js/r4p-erreurs.js'],
                         ['athlete.html', 'js/r4p-erreurs.js']]
};
/* Le service worker praticien couvre tout sauf l'espace athlete, qui a le sien. */
var SW_PRO = 'sw-pro.js', SW_ATH = 'sw.js';

var args = process.argv.slice(2);
var dry = args.indexOf('--dry-run') >= 0;
var i = args.indexOf('--files');
var modifies = i >= 0 ? args.slice(i + 1).filter(function (a) { return a.charAt(0) !== '-'; })
  : cp.execSync('git status --porcelain', { encoding: 'utf8' })
      .split('\n').filter(Boolean)
      .map(function (l) { return l.slice(3).trim(); });

if (!modifies.length) { console.log('Aucun fichier modifie — rien a faire.'); process.exit(0); }

/* Le tampon du jour. On prend la lettre qui SUIT la plus avancee deja
   presente, jamais le premier trou libre : une lettre relachee ce matin puis
   remplacee reste dans le cache des navigateurs qui l'ont vue, et la
   reutiliser leur ferait servir l'ancienne copie. */
function tampon() {
  var d = new Date();
  var j = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  var vus = {};
  ['index.html', 'bilan.html', 'outils.html', 'programme.html', 'patients.html', 'account.html', 'aide.html', 'athlete.html']
    .forEach(function (f) {
      if (!fs.existsSync(f)) return;
      (fs.readFileSync(f, 'utf8').match(new RegExp('\\?v=' + j + '([a-z])', 'g')) || [])
        .forEach(function (m) { vus[m.slice(-1)] = 1; });
    });
  var max = 96;
  Object.keys(vus).forEach(function (l) { max = Math.max(max, l.charCodeAt(0)); });
  return j + String.fromCharCode(Math.min(max + 1, 122));
}

var neuf = tampon();
var aFaire = {};   // page -> [motifs]
var touchePro = false, toucheAth = false;

modifies.forEach(function (f) {
  if (CHAINE[f]) {
    CHAINE[f].forEach(function (p) { (aFaire[p[0]] = aFaire[p[0]] || []).push(p[1]); });
    touchePro = true;
  }
  if (f === 'athlete.html' || f.indexOf('js/athlete') === 0) toucheAth = true;
  /* Seul ce qui est SERVI au navigateur peut perimer un cache. Les fichiers
     d'outillage — controles qualite, skills, notes — n'y sont jamais servis :
     les compter ferait bouger le cache sans raison, et un bump gratuit fait
     retelecharger l'application entiere a chaque praticien. */
  var servi = /\.(html|js|css)$/.test(f) &&
              ['qualite/', '.claude/', 'docs/', 'supabase/'].every(function (d) { return f.indexOf(d) !== 0; }) &&
              f !== 'sw.js' && f !== 'sw-pro.js';
  if (servi) touchePro = true;
});

var lignes = [];
Object.keys(aFaire).forEach(function (page) {
  if (!fs.existsSync(page)) return;
  var s = fs.readFileSync(page, 'utf8'), avant = s;
  aFaire[page].filter(function (v, k, a) { return a.indexOf(v) === k; }).forEach(function (motif) {
    var re = new RegExp('(' + motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=)[\\w-]+', 'g');
    var n = (s.match(re) || []).length;
    if (!n) { lignes.push('  ! ' + page + ' : « ' + motif + '?v= » introuvable'); return; }
    s = s.replace(re, '$1' + neuf);
    lignes.push('  ' + page + ' — ' + motif + ' ×' + n);
  });
  if (s !== avant && !dry) fs.writeFileSync(page, s);
});

function bumpSW(f, prefixe) {
  if (!fs.existsSync(f)) return;
  var s = fs.readFileSync(f, 'utf8');
  var m = s.match(new RegExp("var CACHE = '" + prefixe + "-v(\\d+)'"));
  if (!m) { lignes.push('  ! ' + f + ' : CACHE introuvable'); return; }
  var n = parseInt(m[1], 10) + 1;
  if (!dry) fs.writeFileSync(f, s.replace(m[0], "var CACHE = '" + prefixe + "-v" + n + "'"));
  lignes.push('  ' + f + ' — cache v' + m[1] + ' → v' + n);
}
if (touchePro) bumpSW(SW_PRO, 'r4p-pro');
if (toucheAth) bumpSW(SW_ATH, 'r4p-athlete');

console.log((dry ? 'À FAIRE (rien écrit) — ' : 'Fait — ') + 'tampon ' + neuf);
console.log(lignes.length ? lignes.join('\n') : '  (aucune référence concernée)');
if (lignes.some(function (l) { return l.indexOf('  !') === 0; })) process.exit(1);

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Programme — des barres alignées, et « Partager » en vue

   Signalé par le praticien (2026-09-13) :
     1. « la partie Patient / Modèles n'est pas alignée avec le bloc blanc du
        mois ». Mesuré en ligne : onglets 32 px, en-tête de l'agenda 51 px,
        en-tête du builder 48 px. Une seule hauteur, --barre-h, pour les
        trois — sur ordinateur, où ils sont côte à côte.
     2. « un bouton pertinent à voir, sans qu'il soit caché dans les ···,
        c'est le partager au patient ». Le bouton existait déjà, MASQUÉ
        (#share-cal-btn, display:none) : il ne servait qu'à ancrer le menu.
        Il devient visible dans le groupe d'actions, et quitte le menu ···
        (une action, un endroit — qualite/doublons-cas.js).
   Au passage : le menu de partage se refermait mal. Le test « clic hors du
   menu » comparait e.target.id au bouton — un clic sur son ICÔNE (un <svg>)
   passait pour un clic extérieur, et l'écouteur se retirait après la
   première fermeture : plus rien ne refermait le menu ensuite.

     node qualite/partager-barres-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const aide = fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

console.log('\nUne hauteur pour les trois barres');
const root = html.slice(html.indexOf(':root {'), html.indexOf('}', html.indexOf(':root {')));
ok('--barre-h est défini dans le :root', /--barre-h\s*:\s*\d+px/.test(root));
const bloc = html.slice(html.indexOf('/* Barres alignées'), html.indexOf('/* Barres alignées') + 900);
ok('… et appliqué aux onglets ET aux deux en-têtes, sur ordinateur',
   /@media \(min-width:701px\) \{/.test(bloc)
   && /\.sb-tabs \{ min-height:var\(--barre-h\); \}/.test(bloc)
   && /\.cal-central-header, \.builder-header \{ min-height:var\(--barre-h\); box-sizing:border-box; \}/.test(bloc));

console.log('\n« Partager » en vue');
const grp = html.slice(html.indexOf('<div class="topbar-right">'), html.indexOf('</div>', html.indexOf('<div class="topbar-right">')));
const b = (grp.match(/<button[^>]*id="share-cal-btn"[^>]*>/) || [''])[0];
ok('le bouton est dans le groupe d\'actions (il suit l\'agenda comme le builder)', !!b);
ok('… visible, avec un libellé', b && !/display:none/.test(b) && /class="topbar-btn"/.test(b) && /<span class="btn-label"> Partager<\/span>/.test(grp));
ok('… avant le menu ···', grp.indexOf('id="share-cal-btn"') < grp.indexOf('id="topbarMoreBtn"'));
ok('l\'ancien bouton masqué a disparu de l\'en-tête', (html.match(/id="share-cal-btn"/g) || []).length === 1);
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 7000);
ok('le menu ··· ne porte plus « Partager le calendrier »', !/shareCalLink\(\)/.test(menu));
ok('un clic sur l\'icône du bouton n\'est pas un clic extérieur', (pmain.match(/e\.target\.closest && e\.target\.closest\('#share-cal-btn'\)/g) || []).length === 2
   && !/e\.target\.id !== 'share-cal-btn'/.test(pmain));
ok('… et le menu se referme à chaque fois (l\'écouteur ne se retire plus)', !/removeEventListener\('click', _closeMenu\)/.test(pmain));
ok('l\'aide dit où est le bouton', !/Menu ⋯ → « Partager le calendrier »/.test(aide) && /Bouton « Partager »/.test(aide));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Programme : trois barres de même hauteur ; « Partager » en vue.');

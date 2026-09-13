#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Programme — une seule barre

   Retenu par le praticien sur le prototype du 2026-09-13 : sous la barre de
   l'application, le programme avait sa propre barre — vidée de son logo et
   du nom du patient, il n'y restait que quatre boutons (Modèles, Journal,
   ···, + Séance) et une bande vide.

   Les boutons vivent désormais là où l'on travaille :
     - sur l'agenda, au bout de l'en-tête du calendrier ;
     - dans le builder, dans son en-tête — « Bibliothèque » et ··· seulement :
       Journal et « + Séance » n'y servent pas, et l'en-tête est déjà chargé ;
     - sur téléphone, la barre reste : les en-têtes n'ont pas la place, et la
       barre n'y laisse aucun vide.
   Ce sont les MÊMES boutons, déplacés : identifiants, actions, positionnement
   du menu ··· (calculé depuis son bouton) restent valables.

   La hauteur réservée à la barre (48 px) est rendue à la page sur ordinateur.

     node qualite/barre-unique-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain);

/* ── La vraie fonction, sur une fausse page ─────────────────────────────── */
function noeud(nom) {
  const n = { nom, enfants: [], parentNode: null, _cl: new Set() };
  const detacher = c => { if (c.parentNode) c.parentNode.enfants = c.parentNode.enfants.filter(x => x !== c); };
  n.classList = { contains: k => n._cl.has(k), add: k => n._cl.add(k), remove: k => n._cl.delete(k) };
  n.appendChild = c => { detacher(c); c.parentNode = n; n.enfants.push(c); };
  n.insertBefore = (c, ref) => { detacher(c); c.parentNode = n; const i = n.enfants.indexOf(ref); n.enfants.splice(i < 0 ? n.enfants.length : i, 0, c); };
  n.querySelector = s => n.enfants.find(e => '.' + e.nom === s) || null;
  return n;
}
const topbar = noeud('topbar'), groupe = noeud('topbar-right'), calHeader = noeud('cal-central-header'),
      builderHeader = noeud('builder-header'), actions = noeud('builder-header-actions'), panneau = noeud('builderPanel');
topbar.appendChild(groupe); builderHeader.appendChild(noeud('titre')); builderHeader.appendChild(actions);
const mq = { matches: false, addEventListener() {} };
const SEL = { '.topbar-right': groupe, '.topbar': topbar, '.cal-central-header': calHeader, '.builder-header': builderHeader };
const ctx = vm.createContext({
  window: { matchMedia: () => mq },
  document: { readyState: 'loading', querySelector: s => SEL[s] || null, getElementById: id => (id === 'builderPanel' ? panneau : null), addEventListener() {} }
});
const decl = (pmain.match(/\nvar _mqActionsMobile = [^\n]+/) || [''])[0];
try { vm.runInContext(decl + '\n' + fm('_placerActionsProgramme'), ctx); } catch (e) { ok('la fonction se charge', false, e.message); }
const placer = () => { try { ctx._placerActionsProgramme(); } catch (e) { return 'ERREUR ' + e.message; } };

console.log('\nLes boutons suivent le travail');
placer();
ok('sur l\'agenda : au bout de l\'en-tête du calendrier', groupe.parentNode === calHeader && calHeader.enfants[calHeader.enfants.length - 1] === groupe, groupe.parentNode && groupe.parentNode.nom);
panneau.classList.add('open'); placer();
ok('builder ouvert : dans son en-tête, avant ses propres actions', groupe.parentNode === builderHeader && builderHeader.enfants.indexOf(groupe) === builderHeader.enfants.indexOf(actions) - 1,
   builderHeader.enfants.map(e => e.nom).join(' | '));
panneau.classList.remove('open'); placer();
ok('builder refermé : retour à l\'agenda', groupe.parentNode === calHeader);
mq.matches = true; placer();
ok('sur téléphone : la barre reste, les boutons y reviennent', groupe.parentNode === topbar);
mq.matches = false; placer();
ok('… et en repassant sur un grand écran, ils en ressortent', groupe.parentNode === calHeader);

console.log('\nLes appels');
ok('ouvrir le builder les déplace', /classList\.add\('builder-mode'\);\n\s*_placerActionsProgramme\(\);/.test(fm('_enterBuilderMode')));
ok('le refermer aussi', /classList\.remove\('builder-mode'\);\n\s*_placerActionsProgramme\(\);/.test(fm('_exitBuilderMode')));
ok('au chargement, et à chaque changement de largeur', /_mqActionsMobile\.addEventListener\('change', _placerActionsProgramme\)/.test(pmain)
   && /document\.addEventListener\('DOMContentLoaded', _placerActionsProgramme\)/.test(pmain));

console.log('\nLa feuille');
ok('sur ordinateur, la barre du programme n\'est plus affichée', /\n\.topbar \{ display:none; \}/.test(html));
ok('… et ses 48 px sont rendus à la page', /\n\.app \{ display:flex; height:100%; overflow:hidden; \}/.test(html));
const mob = html.slice(html.indexOf('@media (max-width:700px) {\n'));
ok('sur téléphone, elle revient avec sa hauteur', /\n  \.topbar \{ display:flex; padding:0 8px; gap:6px; \}\n  \.app \{ height:calc\(100% - 48px\); \}/.test(mob));
ok('dans le builder : ni Journal ni « + Séance »', /\.builder-header #topbarJournalBtn, \.builder-header #topbarNewBtn \{ display:none; \}/.test(html));
ok('sur l\'agenda, les boutons prennent le style de l\'en-tête clair', /\.cal-central-header \.topbar-btn \{[^}]*background:var\(--surface\)/.test(html)
   && /\.cal-central-header \.topbar-btn\.primary \{[^}]*background:var\(--accent\)/.test(html));

/* Mesuré en ligne à 768 et 1024 px (iPad) : la colonne de gauche laisse 350 à
   600 px à l'agenda. Les quatre boutons en plus faisaient déborder son en-tête
   de 84 à 340 px, et celui du builder de 57 px à 768. */
console.log('\nÀ l\'étroit (iPad)');
ok('l\'en-tête de l\'agenda passe à la ligne au lieu de déborder, le groupe à droite',
   /div\.cal-central-header \{ flex-wrap:wrap; row-gap:6px; \}/.test(html) && /\.cal-central-header \.topbar-right \{ margin-left:auto;/.test(html));
ok('dans le builder, sous 1100 px, « Bibliothèque » et ··· se replient en icône',
   /@media \(max-width:1100px\) \{ \.builder-header \.topbar-right \.btn-label \{ display:none; \} \}/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Programme : une seule barre, les boutons là où l\'on travaille.');

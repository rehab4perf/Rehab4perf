#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Programme — une action, un endroit

   Demandé par le praticien (2026-09-13) : « les doublons des boutons qui font
   la même chose — le Journal est dans la barre latérale ET dans la barre du
   haut. » Inventaire fait, tableau validé :
     - Journal ............ la carte « Derniers retours » seulement ;
     - répertoire .......... l'onglet « Modèles » seulement (le bouton de
                             l'en-tête ne faisait que replier la colonne) ;
     - cycles .............. la carte Cycle, qui permet aussi d'en créer ;
     - Évolution ........... le lien de la carte Charge ;
     - + Séance ............ le bouton et le clic sur un jour — le « + Séance »
                             au survol des cases de la vue Semaine doublait
                             ce clic ;
     - menu ··· ............ Protocoles, Partager, générateurs, calculateurs.
   Sur téléphone la colonne est un tiroir : les boutons qui l'ouvrent restent.

   Replier la colonne SANS bouton : un clic sur l'onglet déjà actif la replie
   en un rail étroit, un clic sur un onglet du rail la rouvre sur lui. Même
   geste dans le builder (Exercices / Modèles), qui perd ainsi son bouton
   « Bibliothèque ». L'état est retenu.

     node qualite/doublons-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain);

console.log('\nUne action, un endroit');
ok('l\'en-tête de l\'agenda perd « Modèles » et « Journal » (sur ordinateur)',
   /\.cal-central-header #topbarBiblioBtn, \.cal-central-header #topbarJournalBtn, \.builder-header #topbarBiblioBtn \{ display:none; \}/.test(html));
ok('… le builder perd « Bibliothèque » : ses onglets se replient', /\.builder-header #topbarBiblioBtn/.test(html));
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 6000);
ok('le menu ··· ne porte plus Cycles ni Évolution', !/openCycles\(\)/.test(menu) && !/openChargesEvo\(\)/.test(menu));
ok('… Évolution s\'ouvre depuis la carte Charge', /onclick="openChargesEvo\(\)">Évolution<\/button>/.test(fm('_panneauPatientHtml')));
ok('la vue Semaine n\'a plus son « + Séance » au survol (le clic sur le jour suffit)', !/cal-week-add/.test(pmain) && !/\.cal-week-add \{/.test(html));

console.log('\nReplier la colonne sans bouton');
function page(mobile) {
  const cl = new Set();
  const sb = { classList: { contains: k => cl.has(k), toggle: (k, f) => (f ? cl.add(k) : cl.delete(k)), add: k => cl.add(k), remove: k => cl.delete(k) } };
  const onglets = {};
  ['stmpl-onglet-patient', 'stmpl-onglet-modeles', 'sb-tab-btn-lib', 'sb-tab-btn-picker'].forEach(id => {
    const c = new Set(); onglets[id] = { classList: { contains: k => c.has(k), add: k => c.add(k), remove: k => c.delete(k), _c: c } };
  });
  onglets['stmpl-onglet-patient'].classList.add('active'); onglets['sb-tab-btn-lib'].classList.add('active');
  const store = {}, trace = [];
  const ctx = vm.createContext({
    _mqActionsMobile: { matches: mobile }, R4P_KEYS: { COLONNE_REPLIEE: 'k' },
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    document: { querySelector: s => (s === '.sidebar' ? sb : null), getElementById: id => onglets[id] || null },
    _ongletColonne: o => { trace.push('onglet ' + o); ['stmpl-onglet-patient', 'stmpl-onglet-modeles'].forEach(id => onglets[id].classList.remove('active')); onglets[o === 'modeles' ? 'stmpl-onglet-modeles' : 'stmpl-onglet-patient'].classList.add('active'); },
    _switchSidebarTab: t => { trace.push('builder ' + t); ['sb-tab-btn-lib', 'sb-tab-btn-picker'].forEach(id => onglets[id].classList.remove('active')); onglets[t === 'picker' ? 'sb-tab-btn-picker' : 'sb-tab-btn-lib'].classList.add('active'); }
  });
  try { vm.runInContext(['_colonneRepliee', '_replierColonne', '_ongletClic', '_ongletClicBuilder'].map(fm).join('\n'), ctx); } catch (e) { ok('les fonctions se chargent', false, e.message); }
  return { ctx, sb, store, trace };
}
{
  const p = page(false), clic = (f, a) => { try { p.ctx[f](a); } catch (e) { p.trace.push('ERREUR ' + e.message); } };
  clic('_ongletClic', 'patient');
  ok('un clic sur l\'onglet DÉJÀ actif replie la colonne', p.sb.classList.contains('replie') && p.store.k === '1', p.trace.join(' | '));
  clic('_ongletClic', 'modeles');
  ok('un clic sur un onglet du rail la rouvre, sur lui', !p.sb.classList.contains('replie') && /onglet modeles/.test(p.trace.join()) && !p.store.k, p.trace.join(' | '));
  clic('_ongletClic', 'patient');
  ok('changer d\'onglet (colonne ouverte) ne replie rien', !p.sb.classList.contains('replie'));
  clic('_ongletClicBuilder', 'lib');
  ok('dans le builder, même geste : l\'onglet actif replie', p.sb.classList.contains('replie'), p.trace.join(' | '));
  clic('_ongletClicBuilder', 'picker');
  ok('… et un onglet du rail rouvre, sur lui', !p.sb.classList.contains('replie') && /builder picker/.test(p.trace.join()));
}
{
  const p = page(true);
  try { p.ctx._ongletClic('patient'); } catch (e) {}
  ok('sur téléphone, le geste ne replie rien (la colonne y est un tiroir)', !p.sb.classList.contains('replie'));
}
ok('l\'état replié est retenu, et restauré au chargement', /COLONNE_REPLIEE\s*:\s*'r4p-colonne-repliee'/.test(pdata)
   && /localStorage\.getItem\(R4P_KEYS\.COLONNE_REPLIEE\) === '1'/.test(fm('_restaurerRepli')));
ok('les onglets passent par ce geste (agenda et builder)',
   /id="stmpl-onglet-patient"[^>]*onclick="_ongletClic\('patient'\)"/.test(html) && /id="stmpl-onglet-modeles"[^>]*onclick="_ongletClic\('modeles'\)"/.test(html)
   && /id="sb-tab-btn-lib"[^>]*onclick="_ongletClicBuilder\('lib'\)"/.test(html) && /id="sb-tab-btn-picker"[^>]*onclick="_ongletClicBuilder\('picker'\)"/.test(html));
ok('« Partir d\'un modèle » rouvre la colonne si elle est repliée', /_replierColonne\(false\)/.test(fm('ouvrirModeles')));
const rail = html.slice(html.indexOf('/* Le rail'));
ok('le rail : 44 px, onglets verticaux, contenu masqué — sur ordinateur seulement',
   /@media \(min-width:701px\) \{/.test(rail) && /\.sidebar\.replie, \.app\.builder-mode \.sidebar\.replie \{ width:44px !important; min-width:44px !important; \}/.test(rail)
   && /writing-mode:vertical-rl/.test(rail));

console.log('\nFinition');
ok('les échéances vont jusqu\'au bord quand aucune n\'a de ⇄', /\.pp-ech \.cal-echeances:not\(:has\(\.cal-ech-fus\)\) \{ grid-template-columns:minmax\(0,1fr\); \}/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Programme : une action, un endroit ; la colonne se replie d\'un clic sur son onglet.');

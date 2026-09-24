#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — une barre du haut plus courte

   Demandé par le praticien (2026-09-13) : « tu as mis le bouton Partager aussi
   dans le builder, pas vraiment mon souhait. Il y a trop de boutons à mon goût
   dans la top barre. » Huit contrôles : ← Partager ··· Sauvegarder Feedback
   Planifier Programmes ✕. Retenu :
     - Partager ...... sur l'agenda seulement ;
     - ← et ✕ ........ faisaient la MÊME chose (closeBuilder) : ✕ part, ← reste
                       collé au titre ;
     - ordre ......... Feedback · Planifier · Sauvegarder · ··· — le geste
                       principal tout à droite, le menu en dernier ;
     - Programmes .... dans le menu ···, builder seulement. Le praticien s'en
                       sert pour importer une ancienne séance : même panneau,
                       un clic de plus.
   Feedback reste sur toute séance ENREGISTRÉE, retour ou non : la fenêtre
   permet aussi au praticien de SAISIR le ressenti (_feedbackSave) — le masquer
   sans retour supprimerait cette saisie. En revanche il s'affichait sur une
   séance NEUVE ouverte par « + Séance » : openBuilderNew ne remettait pas à
   zéro l'identifiant d'une séance CAP ou HSR ouverte plus tôt (le même oubli
   déjà refermé dans openBuilderForDate, qualite/builder-clarte-cas.js).

     node qualite/barre-builder-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain);

console.log('\nMoins de boutons');
ok('Partager ne s\'affiche pas dans le builder', /\.builder-header #topbarJournalBtn, \.builder-header #topbarNewBtn, \.builder-header #share-cal-btn \{ display:none; \}/.test(html));
const tete = html.slice(html.indexOf('<div class="builder-header">'), html.indexOf('<div class="builder-mode-row">'));
ok('✕ a disparu (il doublait ←)', !/class="builder-close"/.test(tete));
ok('… ← reste, et referme le builder', /<button class="btn-back" onclick="closeBuilder\(\)"/.test(tete));
const act = tete.slice(tete.indexOf('<div class="builder-header-actions"'));
ok('Programmes a quitté la barre', !/openProgHistory\(\)/.test(act));
const pos = id => act.indexOf('id="' + id + '"');
ok('ordre : Feedback · Planifier · (Utiliser) · (Mettre à jour) · Sauvegarder',
   pos('builder-feedback-btn') >= 0 && pos('builder-feedback-btn') < pos('builder-plan-btn') && pos('builder-plan-btn') < pos('builder-utiliser-btn')
   && pos('builder-utiliser-btn') < pos('prog-update-btn') && pos('prog-update-btn') < pos('prog-cloud-save-btn'),
   ['builder-feedback-btn', 'builder-plan-btn', 'builder-utiliser-btn', 'prog-update-btn', 'prog-cloud-save-btn'].map(pos).join(' '));
ok('… et le menu ··· en dernier : le groupe d\'actions se place APRÈS celles du builder',
   !/insertBefore\(grp/.test(fm('_placerActionsProgramme')) && /cible\.appendChild\(grp\);/.test(fm('_placerActionsProgramme')));

console.log('\nProgrammes, dans le menu ···');
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 9000);
ok('le menu porte « Programmes du patient »', /<button id="moreMenuProg" onclick="openProgHistory\(\);_closeMoreMenu\(\)"[^>]*>.*Programmes du patient<\/button>/.test(menu));
ok('… dans le builder seulement', /_prog\.style\.display = \(_bp && _bp\.classList\.contains\('open'\)\) \? '' : 'none'/.test(fm('_toggleMoreMenu')));

console.log('\nFeedback');
ok('« + Séance » efface la séance CAP ou HSR d\'avant : pas de Feedback sur une séance neuve',
   /_capBbSeanceId = null; _hsrBbSeanceId = null;/.test(fm('openBuilderNew')) && /_updateFeedbackBtn\(null\)/.test(fm('openBuilderNew')));
ok('… et reste sur une séance enregistrée, même sans retour (le praticien peut y saisir)',
   /btn\.style\.display = sid \? 'inline-flex' : 'none';/.test(fm('_updateFeedbackBtn')));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : ← Titre · Feedback · Planifier · Sauvegarder · ···');

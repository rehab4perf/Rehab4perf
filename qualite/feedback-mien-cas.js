#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Feedback — la pastille bleue signale un RETOUR D'ATHLÈTE, pas ma saisie

   Signalé par le praticien (2026-09-24) : « pas besoin de mettre en bleu le
   feedback comme feedback à lire alors que c'est moi qui l'ai renseigné », et
   « une fois le feedback enregistré, que la fenêtre se ferme ».

   La pastille se lisait « quelque chose est arrivé, va le voir ». Trois appels
   sur quatre l'allumaient sur la SEULE présence d'`exo_data` — or c'est là que
   vit la saisie du praticien (EVA, RPE, durée). Il s'allumait donc pour ce
   qu'on venait soi-même d'écrire.

   La règle tient en une fonction, `_fbRetourAthlete` : les colonnes de
   l'athlète, ou les retours qu'il a laissés par exercice. Ni l'EVA, ni le RPE,
   ni la durée du praticien.

     node qualite/feedback-mien-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };

const c = vm.createContext({});
try { vm.runInContext(['_fbDouleur', '_fbRetourAthlete'].map(fm).join('\n'), c); }
catch (e) { ok('le code se charge', false, e.message); }
const A = fb => { try { return c._fbRetourAthlete(fb); } catch (e) { return 'ERREUR ' + e.message; } };

console.log('\nCe qui allume la pastille');
ok('l\'athlète a envoyé son RPE', A({ rpe: 7, duree_min: 45, exo_data: {} }) === true);
ok('… ou sa douleur', A({ rpe: null, douleur: 4, exo_data: {} }) === true);
ok('… ou un retour par exercice', A({ rpe: null, exo_data: { exos: [{ key: 'b1|e1', pain: 3 }] } }) === true);

console.log('\nCe qui ne l\'allume PAS');
ok('ma propre EVA', A({ rpe: null, duree_min: null, exo_data: { eva_praticien: 5 } }) === false,
   String(A({ rpe: null, duree_min: null, exo_data: { eva_praticien: 5 } })));
ok('… mon RPE et ma durée de séance au cabinet',
   A({ rpe: null, duree_min: null, exo_data: { rpe_praticien: 6, duree_praticien: 30 } }) === false);
ok('… ni les trois ensemble',
   A({ rpe: null, duree_min: null, exo_data: { eva_praticien: 5, rpe_praticien: 6, duree_praticien: 30 } }) === false);
ok('une liste d\'exercices VIDE n\'est pas un retour', A({ rpe: null, exo_data: { exos: [] } }) === false);
ok('rien du tout', A(null) === false && A({}) === false && A({ exo_data: null }) === false);

console.log('\nUne seule règle, partout');
ok('plus aucun appel ne se contente d\'exo_data',
   !/_updateFeedbackBtn\(!!\(fb && \(fb\.exo_data \|\|/.test(pmain),
   (pmain.match(/_updateFeedbackBtn\(!!\(fb && \(fb\.exo_data[^\n]*/g) || []).length + ' appels laxistes');
ok('les quatre passent par la même fonction',
   (pmain.match(/_updateFeedbackBtn\(_fbRetourAthlete\(/g) || []).length >= 3
   && /_fbRetourAthlete\(fb\)/.test(fm('_feedbackRenderContent')),
   (pmain.match(/_updateFeedbackBtn\(_fbRetourAthlete\(/g) || []).length + ' appels');
ok('… et le panneau ne recopie plus la règle',
   !/fb\.exo_data && fb\.exo_data\.exos && fb\.exo_data\.exos\.length > 0/.test(fm('_feedbackRenderContent')),
   'la règle est encore écrite en double');

console.log('\nLa fenêtre se ferme après l\'enregistrement');
{
  const s = fm('_feedbackSave');
  ok('_closeFeedbackModal est appelée', /_closeFeedbackModal/.test(s), 'la fenêtre reste ouverte');
  /* Différée : une fermeture immédiate ne laisse pas voir le « ✓ Enregistré ». */
  ok('… différée, pour laisser voir la confirmation', /setTimeout\(_closeFeedbackModal, *\d{3}\)/.test(s),
     (s.match(/_closeFeedbackModal[^\n]*/) || [])[0]);
  ok('… après le « ✓ Enregistré », pas avant', (() => {
    const i = s.indexOf('✓ Enregistré'), j = s.indexOf('_closeFeedbackModal');
    return i > -1 && j > i;
  })(), 'la confirmation ne se voit pas');
  ok('… et seulement quand l\'écriture a réussi', (() => {
    const i = s.indexOf("_showToast('Erreur enregistrement.')"), j = s.indexOf('_closeFeedbackModal');
    return i > -1 && j > i;   /* la sortie d'erreur est AVANT, elle rend la main */
  })(), 'la fenêtre se ferme même sur erreur');
}

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Feedback : la pastille ne s\'allume que pour l\'athlète, et la fenêtre se ferme.');

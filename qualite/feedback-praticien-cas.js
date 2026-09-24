#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Feedback praticien — RPE et durée saisis au cabinet alimentent la charge

   Demandé par le praticien (2026-09-24) : « pour les séances faites au
   cabinet, rentrer moi-même RPE + durée. Il me faudrait EVA/10, rouge si
   EVA > 3/10, et le RPE + la durée qui alimenteraient le bilan de charge
   (méthode Foster). »

   Le point délicat : `rpe` et `duree_min` sont les colonnes de l'ATHLÈTE, et
   une SEULE ligne existe par séance, partagée. Y écrire écraserait son retour,
   ou serait écrasé par lui — c'est exactement pourquoi l'EVA praticien vivait
   déjà à part, dans `exo_data.eva_praticien`.

   La saisie du praticien reste donc dans `exo_data` (`rpe_praticien`,
   `duree_praticien`), et ce sont les LECTEURS de charge qui s'y replient quand
   l'athlète n'a rien envoyé. L'athlète garde la priorité : s'il répond, c'est
   son chiffre qui compte.

   Le seuil de 3/10 n'est pas choisi ici : l'application dit déjà « douleur
   légère » jusqu'à 3 et « modérée » au-delà (outils.html).

     node qualite/feedback-praticien-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(R, f), 'utf8');
const vol = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8') : lire('js/volume-sport.js');
const pmain = lire('js/prog-main.js'), bump = lire('.claude/skills/deployer/scripts/bump-versions.js');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fv = fnDe(vol), fm = fnDe(pmain);

const c = vm.createContext({});
try { vm.runInContext(['_fbRpe', '_fbDuree', '_fbIsCharge', '_uaFoster'].map(fv).join('\n'), c); }
catch (e) { ok('le code se charge', false, e.message); }

const ATHLETE = { rpe: 7, duree_min: 45, exo_data: {} };
const CABINET = { rpe: null, duree_min: null, exo_data: { rpe_praticien: 6, duree_praticien: 30 } };
const LES_DEUX = { rpe: 7, duree_min: 45, exo_data: { rpe_praticien: 6, duree_praticien: 30 } };

console.log('\nQui fournit le chiffre');
const Rp = fb => { try { return c._fbRpe(fb); } catch (e) { return 'ERREUR ' + e.message; } };
const Du = fb => { try { return c._fbDuree(fb); } catch (e) { return 'ERREUR ' + e.message; } };
ok('l\'athlète a répondu : c\'est son chiffre', Rp(ATHLETE) === 7 && Du(ATHLETE) === 45, Rp(ATHLETE) + ' / ' + Du(ATHLETE));
ok('séance au cabinet : la saisie du praticien prend le relais', Rp(CABINET) === 6 && Du(CABINET) === 30, Rp(CABINET) + ' / ' + Du(CABINET));
ok('les deux existent : l\'ATHLÈTE garde la priorité', Rp(LES_DEUX) === 7 && Du(LES_DEUX) === 45, Rp(LES_DEUX) + ' / ' + Du(LES_DEUX));
ok('rien du tout : null, jamais zéro déguisé', Rp(null) === null && Du({}) === null && Rp({ exo_data: {} }) === null,
   JSON.stringify([Rp(null), Du({}), Rp({ exo_data: {} })]));
ok('une valeur nulle ou vide ne fait pas une charge', Rp({ rpe: 0, exo_data: { rpe_praticien: 5 } }) === 5,
   String(Rp({ rpe: 0, exo_data: { rpe_praticien: 5 } })));

console.log('\nCe que la charge en fait');
const Ch = fb => { try { return c._fbIsCharge(fb); } catch (e) { return 'ERREUR'; } };
ok('une séance au cabinet COMPTE dans la charge', Ch(CABINET) === true, String(Ch(CABINET)));
ok('… et son UA suit Foster', (() => { try { return c._uaFoster(c._fbRpe(CABINET), c._fbDuree(CABINET)) === 180; } catch (e) { return false; } })(),
   (() => { try { return String(c._uaFoster(c._fbRpe(CABINET), c._fbDuree(CABINET))); } catch (e) { return 'ERREUR'; } })());
ok('une ligne sans rien ne compte pas', Ch({ rpe: null, duree_min: null, exo_data: {} }) === false);
ok('_fbIsCharge passe par les deux lecteurs', /_fbRpe\(/.test(fv('_fbIsCharge')) && /_fbDuree\(/.test(fv('_fbIsCharge')),
   fv('_fbIsCharge').slice(0, 200));
ok('plus aucun calcul de charge ne lit la colonne brute',
   !/_uaFoster\(fb\.rpe, fb\.duree_min\)/.test(pmain) && !/fb\.rpe\s*\*\s*fb\.duree_min/.test(pmain),
   (pmain.match(/_uaFoster\(fb\.rpe[^)]*\)|fb\.rpe\s*\*\s*fb\.duree_min/g) || []).join(' | '));

console.log('\nLa saisie du praticien');
{
  const s = fm('_feedbackRenderContent');
  ok('un RPE de 1 à 10', /fm-rpe-btns/.test(s) && /_feedbackSetRpe\(/.test(s), 'pas de RPE praticien');
  ok('une durée en minutes', /fm-duree/.test(s) && /_feedbackSetDuree\(/.test(s), 'pas de durée');
  ok('… et l\'UA se lit en direct', /fm-ua/.test(s), 'UA absente du panneau');
  ok('les valeurs déjà enregistrées reviennent', /rpe_praticien/.test(s) && /duree_praticien/.test(s), 'rien n\'est restauré');
}
{
  const s = fm('_feedbackSave');
  ok('l\'enregistrement range la saisie dans exo_data', /rpe_praticien/.test(s) && /duree_praticien/.test(s), s.slice(0, 300));
  ok('… et ne touche JAMAIS aux colonnes de l\'athlète',
     !/\brpe\s*:/.test(s) && !/duree_min\s*:/.test(s), (s.match(/\b(rpe|duree_min)\s*:/g) || []).join(' '));
  ok('l\'EVA seule reste enregistrable : la charge est facultative',
     !/_feedbackRpe === null.*return|Sélectionne.*RPE/i.test(s), 'la charge est devenue obligatoire');
}

console.log('\nLe rouge au-dessus de 3');
{
  ok('le seuil est celui de l\'application : légère jusqu\'à 3', /> ?3/.test(fm('_evaCouleur')), fm('_evaCouleur'));
  ok('… et une seule fonction le porte', /_evaCouleur\(/.test(fm('_feedbackSetEva')), 'la couleur est recopiée dans la bascule');
  const ctx = vm.createContext({ document: { querySelectorAll: () => [] } });
  let coul = null;
  try { vm.runInContext(fm('_evaCouleur'), ctx); coul = v => ctx._evaCouleur(v); } catch (e) {}
  if (coul) {
    ok('0 à 3 : pas de rouge', [0, 1, 2, 3].every(v => coul(v) !== coul(4)), [0, 1, 2, 3, 4].map(coul).join(' '));
    ok('4 et au-delà : rouge', [4, 7, 10].every(v => coul(v) === coul(4)), [4, 7, 10].map(coul).join(' '));
  } else ok('la couleur de l\'EVA vit dans sa propre fonction', false, '_evaCouleur introuvable');
}

console.log('\nLe fichier partagé garde sa chaîne de cache');
ok('volume-sport.js est chargé par le builder ET l\'espace athlète',
   /'js\/volume-sport\.js':\s*\[\['programme\.html'[\s\S]{0,140}athlete\.html/.test(bump), 'la chaîne a changé');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Feedback : le praticien peut saisir RPE et durée, sans jamais écraser l\'athlète.');

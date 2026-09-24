#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Feedback — le bouton devient un relevé : charge en UA et douleur

   Demandé par le praticien (2026-09-24) : « si un feedback est renseigné,
   remplacer Feedback par la charge en UA + EVA ».

   Le bouton occupe une place fixe dans la barre et ne disait rien la plupart
   du temps. Deux chiffres à cet endroit sont une information gratuite — et il
   garde son clic, qui ouvre le détail comme avant.

   Trois décisions :
   - la COULEUR ne va que sur la douleur. Une charge de 315 UA n'est pas un
     problème en soi — c'est l'ACWR qui en juge, pas la valeur brute ;
   - la PASTILLE bleue ne veut plus dire « il y a quelque chose » mais
     « l'athlète a répondu et vous ne l'avez pas encore ouvert » — le seul cas
     où il y a une action à faire (qualite/feedback-mien-cas.js) ;
   - le cas « douleur seule » garde sa place : la charge s'écrit « — » plutôt
     que de disparaître, sinon le bouton change de largeur d'une séance à
     l'autre et toute la barre bouge.

   La douleur affichée est celle de l'ATHLÈTE quand il en a donné une — c'est
   son ressenti qui compte —, la saisie du praticien sinon.

     node qualite/feedback-releve-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const vol = fs.readFileSync(path.join(R, 'js', 'volume-sport.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain), fv = fnDe(vol);

const c = vm.createContext({ escH: s => String(s || '') });
try {
  vm.runInContext(['_uaFoster', '_fbRpe', '_fbDuree'].map(fv).join('\n') + '\n'
    + ['_fbDouleur', '_fbRetourAthlete', '_evaAlerte', '_evaCouleur', '_evaClasse', '_fbEvaAffichee', '_fbReleveHtml', '_fbEnMemoire'].map(fm).join('\n'), c);
} catch (e) { ok('le code se charge', false, e.message); }

const RIEN     = null;
const CABINET  = { rpe: null, duree_min: null, exo_data: { eva_praticien: 3, rpe_praticien: 6, duree_praticien: 30 } };
const MAL      = { rpe: null, duree_min: null, exo_data: { eva_praticien: 6, rpe_praticien: 7, duree_praticien: 45 } };
const ATHLETE  = { rpe: 7, duree_min: 45, exo_data: { exos: [{ key: 'b|e', pain: 6 }, { key: 'b|f', pain: 2 }] } };
const EVA_SEULE = { rpe: null, duree_min: null, exo_data: { eva_praticien: 2 } };

console.log('\nQuelle douleur s\'affiche');
const E = fb => { try { return c._fbEvaAffichee(fb); } catch (e) { return 'ERREUR ' + e.message; } };
ok('la mienne, quand je suis seul à l\'avoir notée', E(CABINET).val === 3 && E(CABINET).source === 'praticien', JSON.stringify(E(CABINET)));
ok('celle de l\'ATHLÈTE quand il a répondu : c\'est son ressenti', E(ATHLETE).val === 6 && E(ATHLETE).source === 'athlete',
   JSON.stringify(E(ATHLETE)));
ok('… la plus forte de ses exercices, pas la première', E(ATHLETE).val === 6);
ok('rien à montrer : val nulle, jamais un zéro inventé', E(RIEN).val === null && E({ exo_data: {} }).val === null,
   JSON.stringify([E(RIEN), E({ exo_data: {} })]));

console.log('\nCe que le bouton écrit');
const H = fb => { try { return c._fbReleveHtml(fb); } catch (e) { return 'ERREUR ' + e.message; } };
ok('rien de saisi : pas de relevé, le libellé reste', H(RIEN) === '' && H({ exo_data: {} }) === '', JSON.stringify([H(RIEN), H({})]));
ok('ma saisie : la charge et la douleur', /180/.test(H(CABINET)) && /3/.test(H(CABINET)), H(CABINET));
ok('… la charge suit Foster', /180/.test(H(CABINET)) && /315/.test(H(ATHLETE)), H(ATHLETE));
ok('douleur seule : la charge s\'écrit « — », le bouton garde sa largeur',
   /—/.test(H(EVA_SEULE)) && /2/.test(H(EVA_SEULE)), H(EVA_SEULE));

console.log('\nLa couleur ne va que sur la douleur');
/* Le relevé vit sur la barre NAVY du builder : un hex sombre y est invisible.
   La CLASSE laisse la feuille choisir l'encre selon le fond — c'est ce qui
   manquait, « 300 UA | — /10 » sortait navy sur navy. */
ok('aucune couleur figée dans le balisage', !/style="color:/.test(H(CABINET)) && !/#[0-9A-Fa-f]{6}/.test(H(MAL)),
   (H(MAL).match(/style="[^"]*"|#[0-9A-Fa-f]{6}/g) || []).join(' '));
ok('douleur acceptable : la classe « ok »', /fb-eva ok/.test(H(CABINET)), H(CABINET));
ok('au-dessus de 3 : la classe « bad »', /fb-eva bad/.test(H(MAL)), H(MAL));
ok('… et la charge n\'en prend aucune', !/fb-ua[^>]*(ok|bad)/.test(H(MAL)), H(MAL));
ok('un seul seuil pour les deux rendus', /_evaAlerte\(/.test(fm('_evaCouleur')) && /_evaAlerte\(/.test(fm('_evaClasse')),
   fm('_evaCouleur') + fm('_evaClasse'));
ok('la feuille donne une encre CLAIRE aux deux classes',
   /\.fb-eva\.ok \{ ?color:var\(--ok-b\)/.test(html) && /\.fb-eva\.bad \{ ?color:var\(--alerte-b\)/.test(html),
   (html.match(/\.fb-eva\.(ok|bad)[^}]*\}/g) || []).join(' '));
ok('… et le reste du relevé prend l\'encre du bouton',
   /\.fb-ua \{ ?font-weight:700; ?color:inherit/.test(html), (html.match(/\.fb-ua[^}]*\}/) || [])[0]);

console.log('\nLe relevé s\'affiche sans attendre le réseau');
{
  const ctx = vm.createContext({ window: { _cloudCalEvents: [
    { id: 's1', athlete_feedback: { rpe: 7, duree_min: 45 } },
    { id: 's2', athlete_feedback: [{ rpe: 5, duree_min: 30 }] } ] } });
  vm.runInContext(fm('_fbEnMemoire'), ctx);
  ok('le feedback de l\'agenda est retrouvé', (ctx._fbEnMemoire('s1') || {}).rpe === 7, JSON.stringify(ctx._fbEnMemoire('s1')));
  ok('… qu\'il soit objet ou tableau', (ctx._fbEnMemoire('s2') || {}).rpe === 5, JSON.stringify(ctx._fbEnMemoire('s2')));
  ok('… une séance inconnue ne casse rien', ctx._fbEnMemoire('sX') === null && ctx._fbEnMemoire(null) === null);
}
ok('le bouton est peint AVANT la requête', (() => {
  const s = fm('_renderAthleteRetour');
  const i = s.indexOf('_updateFeedbackBtn(_fbEnMemoire('), j = s.indexOf('_fetchRetry(');
  return i > -1 && j > i;
})(), fm('_renderAthleteRetour').slice(0, 400));
ok('… et le panneau s\'ouvre sur ce qu\'on a déjà', /_fbEnMemoire\(sid\)/.test(fm('_openFeedbackModal')),
   'le panneau attend encore le réseau');

console.log('\nLe bouton reste un bouton');
ok('le libellé par défaut vit dans son propre bloc', /class="fb-def"/.test(html), 'le SVG et le libellé ne sont pas isolés');
ok('… et le relevé dans le sien', /id="fb-val"|class="fb-val"/.test(html), 'pas d\'emplacement pour le relevé');
{
  const s = fm('_updateFeedbackBtn');
  ok('un seul endroit décide de l\'affichage', /_fbReleveHtml\(/.test(s), '_updateFeedbackBtn ignore le relevé');
  ok('… la pastille reste réservée au retour d\'athlète', /_fbRetourAthlete\(/.test(s) && /has-retour/.test(s), s.slice(0, 300));
  /* Des appels passaient un booleen : ils ne doivent pas etre lus comme un
     feedback. Tolere ici plutot que traque partout. */
  ok('… et un ancien appel booléen ne se lit pas comme un feedback',
     /fb === true \|\| fb === false/.test(s), s.split('\n').slice(0, 6).join(' / '));
}
ok('les appelants passent le feedback, plus un booléen',
   !/_updateFeedbackBtn\(true\)/.test(pmain), (pmain.match(/_updateFeedbackBtn\((?:true)\)/g) || []).join(' '));
ok('le relevé ne disparaît pas sur écran étroit (il n\'est pas dans .btn-label)',
   !/class="btn-label"[^<]*<span class="fb-val"/.test(html) && /fb-val/.test(html));
ok('le style du relevé existe', /\.fb-val\b/.test(html) && /\.fb-def\b/.test(html), 'CSS absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Feedback : le bouton dit la charge et la douleur, et garde son clic.');

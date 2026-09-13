#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Confirmations — la fenêtre de l'application, pas celle du navigateur

   Demandé par le praticien (2026-09-13), capture à l'appui : « app.rehab4perf.com
   indique — Un compte-rendu médecin est en cours… », la boîte grise du
   navigateur. Vingt-deux `confirm()` natifs dans l'application.

   Le défaut n'est pas qu'esthétique. On change de patient depuis la barre du
   haut, souvent depuis un autre onglet : le CR (outils) et le bilan posaient
   alors leur question depuis une iframe CACHÉE. La boîte native s'en échappe ;
   la modale du bilan, elle, restait dans son iframe — invisible, et le
   changement de patient suspendu à une question que personne ne voyait.

   La règle (js/r4p-confirmer.js) :
     - `r4pConfirmer({titre, message, ok, annuler, danger})` rend une promesse ;
     - la COQUILLE affiche toujours : une iframe envoie sa question au parent,
       comme le piège à erreurs ; seule, une page affiche sur place ;
     - un geste destructeur met le focus sur « Annuler » ; Échap annule ;
     - le texte est échappé : un nom de patient ou d'exercice n'est pas du HTML.

     node qualite/confirmer-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(R, f), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

(async () => {
  console.log('\nPlus aucune boîte du navigateur');
  ['index.html', 'athlete.html', 'outils.html', 'bilan.html', 'programme.html', 'account.html', 'patients.html',
   'js/bilan.js', 'js/prog-main.js', 'js/prog-data.js'].forEach(f => {
    if (!fs.existsSync(path.join(R, f))) return;
    const n = (lire(f).match(/[^\w.$]confirm\(/g) || []).length;
    ok(f + ' : aucun confirm() natif', n === 0, n + ' restant(s)');
  });

  console.log('\nLe module');
  let mod = '';
  try { mod = lire('js/r4p-confirmer.js'); } catch (e) {}
  ok('js/r4p-confirmer.js existe', !!mod);
  ['index.html', 'bilan.html', 'outils.html', 'programme.html', 'athlete.html'].forEach(f =>
    ok(f + ' le charge, versionné', /<script src="js\/r4p-confirmer\.js\?v=\d{8}[a-z]"><\/script>/.test(lire(f))));
  ok('le déploiement connaît sa chaîne', /'js\/r4p-confirmer\.js':/.test(lire('.claude/skills/deployer/scripts/bump-versions.js')));

  /* Une iframe : la question part à la coquille, la réponse revient. */
  const envois = [], ecoute = [];
  const win = { location: { origin: 'https://app.test' }, top: {},
    parent: { postMessage: (m, o) => envois.push({ m, o }) },
    addEventListener: (t, f) => { if (t === 'message') ecoute.push(f); } };
  win.self = win;
  const ctx = vm.createContext({ window: win, document: {}, setTimeout, clearTimeout, Promise });
  try { vm.runInContext(mod, ctx); } catch (e) { ok('le module se charge', false, e.message); }
  const r4p = win.r4pConfirmer;
  ok('r4pConfirmer est exposé', typeof r4p === 'function');
  if (typeof r4p === 'function') {
    const p = r4p({ titre: 'Supprimer X ?', danger: true });
    const d = envois[0] || { m: {} };
    ok('dans une iframe, la question part à la coquille',
       envois.length === 1 && d.m.type === 'r4p-confirmer' && d.o === 'https://app.test' && d.m.opts && d.m.opts.titre === 'Supprimer X ?',
       JSON.stringify(d).slice(0, 160));
    const emettre = (data, origine) => ecoute.forEach(f => f({ origin: origine || 'https://app.test', data }));
    emettre({ type: 'r4p-confirmer-recu', id: d.m.id });
    emettre({ type: 'r4p-confirmer-reponse', id: d.m.id, ok: true }, 'https://ailleurs.test');
    emettre({ type: 'r4p-confirmer-reponse', id: d.m.id, ok: false });
    const rep = await Promise.race([p, new Promise(r => setTimeout(() => r('rien'), 300))]);
    ok('la réponse d\'une autre origine est ignorée ; celle de la coquille fait foi', rep === false, String(rep));

    const h = (r4p._html || (() => ''))({ titre: 'Supprimer <b>X</b> ?', message: 'Ligne 1\nsuite\n\nParagraphe 2', ok: 'Supprimer', danger: true });
    ok('le texte est échappé (un nom n\'est pas du HTML)', /Supprimer &lt;b&gt;X&lt;\/b&gt; \?/.test(h) && !/<b>X/.test(h), h.slice(0, 160));
    ok('deux paragraphes ; un retour simple devient <br>', (h.match(/<p>/g) || []).length === 2 && /Ligne 1<br>suite/.test(h));
    ok('le bouton principal porte le verbe, en rouge pour un geste destructeur', /class="r4pc-btn r4pc-ok r4pc-ok--danger">Supprimer</.test(h));
    ok('fenêtre accessible : alertdialog, modale, titrée', /role="alertdialog"/.test(h) && /aria-modal="true"/.test(h) && /aria-labelledby="r4pc-titre"/.test(h));
    const h2 = r4p._html ? r4p._html({ titre: 'Fusionner ?' }) : '';
    ok('sans message, pas de paragraphe vide', h2 && !/r4pc-msg/.test(h2));
    ok('geste non destructeur : ni rouge ni triangle', h2 && !/--danger/.test(h2));
  }
  ok('un geste destructeur met le focus sur « Annuler »', /\(o\.danger \? bAnn : bOk\)\.focus\(\)/.test(mod));
  ok('Échap annule', /'Escape'[\s\S]{0,120}fermer\(false\)/.test(mod));
  ok('la coquille accuse réception, puis répond', /r4p-confirmer-recu/.test(mod) && /r4p-confirmer-reponse/.test(mod));
  ok('sans coquille qui réponde, la page affiche elle-même', /afficherLocal\(o\)\.then\(resolve\)/.test(mod));
  ok('le mouvement se coupe si le système le demande', /prefers-reduced-motion/.test(mod));

  console.log('\nChanger de patient : la question se voit depuis n\'importe quel onglet');
  const outils = lire('outils.html');
  const o0 = outils.indexOf("e.data.type==='r4p-patient-selected'");
  const bloc = outils.slice(o0, outils.indexOf("e.data.type==='r4p-pevo-response'", o0));
  ok('le CR en cours pose sa question par la coquille', /r4pConfirmer\(\{[\s\S]{0,300}Changer de patient/.test(bloc));
  ok('… le refus rend la main au parent', /if\(!ok\)\{[\s\S]{0,300}r4p-cancel-patient-switch/.test(bloc));
  ok('… l\'accord bascule', /_crBasculer\(\);/.test(bloc));
  const bj = lire('js/bilan.js');
  const b0 = bj.indexOf("e.data.type==='r4p-patient-selected'");
  const bb = bj.slice(b0, b0 + 2600);
  ok('le bilan modifié aussi', /r4pConfirmer\(/.test(bb) && /r4p-cancel-patient-switch/.test(bb));
  ok('l\'ancienne modale, dans l\'iframe du bilan, a disparu',
     !/modal-confirm-switch/.test(lire('bilan.html')) && !/function _bilanConfirm\(/.test(bj));

  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Confirmations : la fenêtre de l\'application, visible depuis tout onglet.');
})();

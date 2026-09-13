#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Agenda — les échéances passent dans la colonne « Patient »

   Demandé par le praticien (2026-09-13) : sur le prototype, les échéances dans
   la colonne « déchargeaient l'agenda et lui donnaient plus d'espace ».

   C'est la MÊME bande, avec les mêmes actions — aller à la date, prendre en
   compte une échéance déclarée par l'athlète, fusionner, voir les autres, le
   panneau de fusion. `_renderEcheances` ne change pas : l'élément est déplacé.
     - sur ordinateur, dans la carte « Échéances » de la colonne, entre le
       cycle et la charge, empilée ;
     - sur téléphone la colonne est repliée : la bande reste au-dessus de
       l'agenda, là où on la voit.
   La colonne se réécrit entièrement à chaque rendu : la bande est mise à
   l'abri dans l'agenda AVANT, sinon elle partirait avec l'ancien contenu et
   `_renderEcheances` ne trouverait plus rien où écrire.

     node qualite/echeances-colonne-cas.js
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

/* ── Le déplacement, exécuté sur une fausse page ─────────────────────────── */
function noeud(id) {
  const n = { id, enfants: [], parentNode: null };
  n.appendChild = c => { if (c.parentNode) c.parentNode.enfants = c.parentNode.enfants.filter(x => x !== c); c.parentNode = n; n.enfants.push(c); };
  return n;
}
const parc = noeud('calEcheancesParc'), bande = noeud('calEcheances');
parc.appendChild(bande);
let slot = noeud('ppEchSlot');
const mq = { matches: false };
const ctx = vm.createContext({ _mqActionsMobile: mq,
  document: { getElementById: id => ({ calEcheances: bande, calEcheancesParc: parc, ppEchSlot: slot })[id] || null } });
try { vm.runInContext(fm('_garerEcheances') + fm('_placerEcheances'), ctx); } catch (e) { ok('les fonctions se chargent', false, e.message); }
const faire = f => { try { ctx[f](); } catch (e) { return 'ERREUR ' + e.message; } };

console.log('\nOù va la bande');
faire('_placerEcheances');
ok('sur ordinateur : dans la carte « Échéances » de la colonne', bande.parentNode === slot, bande.parentNode && bande.parentNode.id);
faire('_garerEcheances');
ok('avant de réécrire la colonne : à l\'abri dans l\'agenda', bande.parentNode === parc);
mq.matches = true; faire('_placerEcheances');
ok('sur téléphone : au-dessus de l\'agenda (la colonne y est repliée)', bande.parentNode === parc);
mq.matches = false; slot = null; faire('_placerEcheances');
ok('sans carte (pas de patient, onglet non rendu) : elle reste dans l\'agenda', bande.parentNode === parc);

console.log('\nLe rendu de la colonne');
const rp = fm('_renderPanneauPatient');
const i1 = rp.indexOf('_garerEcheances()'), i2 = rp.indexOf('innerHTML = _panneauPatientHtml()'), i3 = rp.indexOf('_placerEcheances()'), i4 = rp.indexOf('_renderEcheances()');
ok('la bande est mise à l\'abri AVANT la réécriture, replacée et redessinée APRÈS', i1 > 0 && i1 < i2 && i2 < i3 && i3 < i4, [i1, i2, i3, i4].join(' < '));
ok('la carte se place entre le cycle et la charge', /Nouveau cycle<\/button>';\n\s*h \+= '<\/div>';\n\s*h \+= '<div class="pp-carte pp-ech"><div class="pp-tete">Échéances<\/div><div id="ppEchSlot"><\/div><div class="pp-vide" id="ppEchVide">Aucune échéance à venir\.<\/div><\/div>';/.test(fm('_panneauPatientHtml')));
ok('sans échéance, la carte le dit (le rendu de la bande pilote le message)', /var _vide = document\.getElementById\('ppEchVide'\);\s*if\(_vide && _vide\.style\) _vide\.style\.display = liste\.length \? 'none' : '';/.test(fm('_renderEcheances')));
ok('au changement de largeur, la bande suit', /_mqActionsMobile\.addEventListener\('change', _placerEcheances\)/.test(pmain));

console.log('\nLa feuille et la page');
ok('la bande a son abri dans l\'agenda', /<div id="calEcheancesParc"><div class="cal-echeances" id="calEcheances" style="display:none"><\/div><\/div>/.test(html));
ok('dans la colonne, elle s\'empile (le ⇄ reste sur la ligne de son échéance)',
   /\.pp-ech \.cal-echeances \{ display:grid; grid-template-columns:minmax\(0,1fr\) auto;/.test(html) && /\.pp-ech \.cal-ech-fus \{ grid-column:2;/.test(html) && /\.pp-ech \.cal-ech \{ grid-column:1;/.test(html));
ok('… sans répéter son titre (la carte le porte)', /\.pp-ech \.cal-ech-lbl \{ display:none; \}/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Agenda : les échéances vivent dans la colonne, l\'agenda respire.');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Générateur de CR — joindre le profil isocinétique au courrier

   Demandé par le praticien (2026-09-18) : « possibilité d'inclure le graphique
   de l'onglet bilan du test iso dans le générateur de CR, au même titre qu'un
   graphique d'évolution ».

   Sa propre case, pas celle des courbes : « Inclure les graphiques
   d'évolution » annonce une évolution DANS LE TEMPS, et le profil est la photo
   d'UN examen. Rangé sous la case du même geste que la charge d'entraînement,
   dont il reprend la forme (un bloc entier, pas un choix carte par carte).

   Le profil est du HTML, pas du SVG : le courrier emporte donc ses styles avec
   lui. Les jetons de couleur n'existent pas dans la fenêtre d'impression — ils
   sont RÉSOLUS à l'export, comme le fait déjà _patchPevoCardForPdf. Une règle
   qui reste en var() ne donne pas une mauvaise couleur : elle rend la
   déclaration invalide, et le navigateur l'ignore en silence.

     node qualite/cr-iso-profil-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const outils = fs.readFileSync(path.join(R, 'outils.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = (s, n) => { const d = s.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : s.slice(d, s.indexOf('\n}\n', d) + 3); };
const fb = n => fn(src, n);
/* Dans outils.html les fonctions sont indentées de deux espaces : les
   chercher en colonne 0 les rendait toutes introuvables, et le cas passait
   au vert sur du vide. */
const fo = n => { const d = outils.indexOf('\n  function ' + n + '('); return d < 0 ? fn(outils, n) : outils.slice(d, outils.indexOf('\n  }\n', d) + 5); };
const fw = n => { const d = outils.indexOf('\n  window.' + n + ' = function'); return d < 0 ? '' : outils.slice(d, outils.indexOf('\n  };\n', d) + 5); };

/* Le même faux formulaire que qualite/iso-cas.js, plus les jetons de couleur
   que la page résout à l'export. */
const JETONS = { '--green': '#2D6A4F', '--orange': '#D4600A', '--border2': '#D3D1CB', '--text2': '#6B6860', '--text3': '#9D9B96' };
const DONNEES = { 'q-f-cs':155, 'q-f-ca':131, 'q-p-cs':66, 'q-p-ca':60, 'q-r-cs':146, 'q-r-ca':162,
                  'ij-f-cs':56, 'ij-f-ca':58, 'ij-p-cs':34, 'ij-p-ca':35, 'ij-r-cs':136, 'ij-r-ca':134 };
function monter(vals) {
  const els = {};
  const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', className: '', style: {} });
  Object.keys(vals).forEach(k => { el(k).value = String(vals[k]); });
  const ctx = vm.createContext({
    document: { getElementById: id => els[id] || null, documentElement: {} },
    getComputedStyle: () => ({ getPropertyValue: n => JETONS[n] || '' })
  });
  try {
    vm.runInContext(['ISO_MESURES', 'ISO_EXPORT_CSS'].map(n => {
      const i = src.indexOf('var ' + n + ' ='); return i < 0 ? '' : src.slice(i, src.indexOf(';\n', i)) + ';';
    }).join('\n') + '\n' + ['_isoVal', '_isoLire', '_isoJeton', '_blEsc', '_isoProfilHtml', '_isoProfilExport'].map(fb).join('\n'), ctx);
  } catch (e) { ok('le code du profil se charge', false, e.message); }
  return { ctx, els };
}

console.log('\nLe profil part avec ses styles');
{
  const p = monter(DONNEES);
  let ecran = '', pdf = '';
  try { ecran = p.ctx._isoProfilHtml(p.ctx._isoLire()); pdf = p.ctx._isoProfilExport(); } catch (e) { ok('l\'export tourne', false, e.message); }
  ok('à l\'écran, rien ne change : les classes de la page suffisent', !/<style/.test(ecran) && /var\(--/.test(ecran), ecran.slice(0, 80));
  ok('à l\'export, le fragment emporte sa feuille', /^<style>/.test(pdf) && /\.iso-profil/.test(pdf), pdf.slice(0, 60));
  ok('… et PLUS AUCUN jeton : ils n\'existent pas dans la fenêtre d\'impression',
     !/var\(--/.test(pdf), (pdf.match(/var\(--[\w-]+\)/g) || []).slice(0, 4).join(' '));
  ok('… les couleurs sont celles de la page, résolues', pdf.indexOf('#2D6A4F') > -1 && pdf.indexOf('#D4600A') > -1
     && pdf.indexOf('#D3D1CB') > -1 && pdf.indexOf('#9D9B96') > -1, 'couleurs manquantes');
  ok('les mêmes six lignes, les mêmes douze barres', (pdf.match(/class="iso-b"/g) || []).length === 12
     && (pdf.match(/class="iso-ligne"/g) || []).length === 6);
  ok('une ligne ne se coupe pas entre deux pages', /break-inside:avoid/.test(pdf));
  ok('aucun examen : rien à joindre', monter({})._isoProfilExport === undefined || (() => {
    const v = monter({}); return v.ctx._isoProfilExport() === '';
  })());
}

console.log('\nSa propre case dans le générateur');
ok('le panneau existe, avec sa bascule et son statut', /id="cr-iso-panel"/.test(outils)
   && /id="cr-iso-toggle" onchange="crOnIsoToggle\(\)"/.test(outils) && /id="cr-iso-status"/.test(outils));
ok('… et il ne se confond pas avec les courbes d\'évolution', (() => {
  const i = outils.indexOf('id="cr-iso-panel"');
  const bloc = outils.slice(i, i + 700);
  return !/évolution/i.test(bloc) && /isocin/i.test(bloc);
})(), outils.slice(outils.indexOf('id="cr-iso-panel"'), outils.indexOf('id="cr-iso-panel"') + 400));
ok('la case est décochée par défaut : le courrier ne s\'alourdit pas tout seul',
   !/id="cr-iso-toggle"[^>]*checked/.test(outils));

console.log('\nCe qu\'elle joint');
{
  const s = fo('_crGetIsoSectionHtml');
  ok('rien tant qu\'elle n\'est pas cochée', /toggle\.checked/.test(s) && /return ''/.test(s), s.slice(0, 200));
  ok('le bloc porte son titre, dans l\'habillage des autres', /cr-evo-section-title/.test(s) && /[Ii]socin/.test(s));
  ok('il vient du BILAN, pas d\'une copie', /_crIsoProfil\(\)/.test(s) || /_isoProfilExport/.test(s));
}
{
  const s = fo('_crIsoProfil');
  ok('… lu dans l\'iframe du bilan, comme les courbes', /frame-bilan/.test(s) && /_isoProfilExport/.test(s), s.slice(0, 200));
  ok('… et une iframe absente ne casse rien', /catch/.test(s) && /return ''/.test(s));
}

console.log('\nIl arrive dans les DEUX rendus');
ok('l\'aperçu à l\'écran', /_crGetIsoSectionHtml\(\)/.test(fo('_crRefreshGraphiques')), 'absent de _crRefreshGraphiques');
ok('… et le document imprimé', /\+ _crGetIsoSectionHtml\(\)/.test(outils.slice(outils.indexOf("+ _crGetEvoSectionHtml()"), outils.indexOf("+ _crGetEvoSectionHtml()") + 400)),
   'absent de la chaîne d\'impression');
ok('le panneau entier redessine au clic, comme les trois autres',
   /#cr-evo-panel, #cr-pevo-panel, #cr-charge-panel, #cr-iso-panel/.test(outils), 'sélecteur délégué');

console.log('\nIl se met à jour quand le patient change');
{
  const u = fw('_crUpdateIsoPanel');
  ok('le panneau se met à jour, il ne se masque pas', /style\.display = ''/.test(u) && /disabled/.test(u), u.slice(0, 200));
  ok('… et la raison s\'écrit quand il n\'y a rien à joindre', /status/.test(u) && /isocin/i.test(u), u.slice(0, 400));
  ok('… la case se décoche alors toute seule', /checked = false/.test(u));
}
ok('appelé partout où le panneau d\'évolution l\'est',
   (outils.match(/_crUpdateIsoPanel\(\)/g) || []).length >= 4,
   (outils.match(/_crUpdateIsoPanel\(\)/g) || []).length + ' appels');

console.log('\nLa note d\'un mini-tableau respire');
/* Mesure en ligne, 2026-09-18 : la note sortait a 1 px de marge. La regle
   `table.lt-t tr.lt-af-sub td{padding:1px 8px}` est PLUS SPECIFIQUE qu'un
   `table.lt-t td.lt-af-sy`, et son raccourci `padding` ecrasait le
   `padding-top`. La regle existait depuis toujours et n'avait jamais rien
   fait — une regle ecrasee ne previent pas plus qu'une regle invalide. */
ok('son selecteur porte tr.lt-af-sub, sinon le raccourci voisin l\'ecrase',
   /tr\.lt-af-sub td\.lt-af-sy\{[^}]*padding-top:\dpx/.test(outils),
   (outils.match(/[^']*td\.lt-af-sy\{[^}]*\}/g) || []).slice(0, 2).join(' | '));
ok('… et la derniere note d\'une suite respire aussi par le bas',
   /tr\.lt-af-sub\.lt-af-obs:not\(:has\(\+ tr\.lt-af-obs\)\) td\.lt-af-sy\{padding-bottom:\dpx\}/.test(outils));
ok('les trois feuilles disent la meme chose', /\.cr-mt-note \{[^}]*margin-top: 7px/.test(
     require('fs').readFileSync(require('path').join(R, 'bilan.html'), 'utf8'))
   && /\.cr-mt-note\{[^}]*margin-top:7px/.test(src));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('CR : le profil isocinétique se joint au courrier, avec ses styles.');

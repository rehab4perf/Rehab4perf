#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Tests isocinétiques — le poids qui recalcule, le CR complet, le graphique

   Demandé par le praticien (2026-09-18) :
   A. « quand je renseigne le poids de la patiente, le ratio se calcule
      automatiquement » — aujourd'hui il faut enregistrer le bilan. Cause :
      le champ Poids appelle updateAll(), qui n'appelait pas calcMusc().
   B. « fournir l'ensemble des infos du test iso dans le générateur et dans
      les tests » — le CR ne sortait que DEUX chiffres sur vingt-deux, glissés
      au milieu des tests fonctionnels, sans les Nm, sous des intitulés en
      franglais (« Quadriceps deficit »), avec « Normal / Deficit » là où tout
      le reste du produit dit Symétrique / Asymétrie modérée / significative.
   C. un graphique de l'examen, comme l'Ankle-GO. En BARRES, pas en radar :
      six axes dont trois sont des Nm à des vitesses différentes ne se
      comparent pas sur un même rayon.
   D. le pic/poids des DEUX côtés, le compte des critères atteints, et le
      rappel du poids sur la page.

   Le ratio fonctionnel (ischios excentriques / quadriceps concentrique) est
   VOLONTAIREMENT absent : sa valeur de référence dépend de l'appariement de
   vitesses, et l'onglet n'en mesure aucun d'apparié (Aagaard 1998). Un ratio
   affiché sous le mauvais seuil donne un vert ou un rouge à un médecin.

   Une seule table, ISO_MESURES, et une seule lecture, _isoLire() : les six
   déficits étaient calculés DEUX fois, dans calcMusc et dans le CR.

     node qualite/iso-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const bloc = (de, a) => { const i = src.indexOf(de), j = src.indexOf(a, i); return (i < 0 || j < 0) ? '' : src.slice(i, j); };

/* ── Un faux formulaire : les douze champs, le poids, et les cases de sortie ── */
function page(vals) {
  const els = {};
  const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', className: '', style: {}, classList: { add(){}, remove(){}, toggle(){} } });
  Object.keys(vals).forEach(k => { el(k).value = String(vals[k]); });
  ['q-f-def','q-p-def','q-r-def','ij-f-def','ij-p-def','ij-r-def','ratio-ca','ratio-cs','pic-q','pic-ij',
   'iso-chart','iso-criteres','iso-poids-rappel'].forEach(el);
  return {
    els,
    ctx: vm.createContext({
      document: { getElementById: id => els[id] || null, querySelectorAll: () => [] },
      window: {}, console
    })
  };
}
const DONNEES = { 'q-f-cs':155, 'q-f-ca':131, 'q-p-cs':66, 'q-p-ca':60, 'q-r-cs':146, 'q-r-ca':162,
                  'ij-f-cs':56, 'ij-f-ca':58, 'ij-p-cs':34, 'ij-p-ca':35, 'ij-r-cs':136, 'ij-r-ca':134 };
const CHARGER = ['ISO_MESURES','_isoVal','_isoLire','_isoRatios','_isoCriteres','_isoNb','_blEsc','_isoChartSvg','asymPct','asymTxt','lsiInverse','_statForce','LSI_INVERSE_TXT','calcMusc'];
function monter(vals) {
  const p = page(vals);
  const code = CHARGER.map(n => (n === 'ISO_MESURES' || n === 'LSI_INVERSE_TXT')
    ? bloc('var ' + n + ' =', ';\n') + ';' : fn(n)).join('\n');
  try { vm.runInContext(code, p.ctx); } catch (e) { ok('le code isocinétique se charge', false, e.message); }
  return p;
}

console.log('\nUne seule table, une seule lecture');
{
  const p = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
  let M = [];
  try { M = p.ctx._isoLire(); } catch (e) { ok('_isoLire tourne', false, e.message); }
  ok('les six mesures, dans l\'ordre de la page', M.length === 6
     && M.map(m => m.cle).join(',') === 'q-f,q-p,q-r,ij-f,ij-p,ij-r', M.map(m => m.cle).join(','));
  ok('chacune porte son groupe, son libellé et sa norme', M.length === 6 && M.every(m => m.grp && m.l && m.norme > 0)
     && M[0].grp === 'Quadriceps' && M[3].grp === 'Ischio-jambiers' && M[1].norme === 15, JSON.stringify(M[1] || null));
  ok('l\'asymétrie est celle déjà affichée : (1 − atteint/sain)', M.length === 6 && Math.abs(M[0].asym - 15.483870967741936) < 1e-9, String((M[0] || {}).asym));
  ok('… et le LSI est son inverse, pour les paliers partagés', M.length === 6 && Math.abs(M[0].lsi - (131 / 155 * 100)) < 1e-9);
  ok('une mesure non renseignée n\'invente rien', (() => {
    try { const q = monter({ 'q-f-cs': 155 }); const m = q.ctx._isoLire();
      return isNaN(m[0].lsi) && m[0].ca === '' && m[1].cs === ''; } catch (e) { return false; }
  })());
}

console.log('\nA — le poids recalcule, sans enregistrer');
ok('updateAll appelle calcMusc', /calcMusc\(\)/.test(fn('updateAll')), 'absent de updateAll');
{
  const p = monter(Object.assign({ 'f-poids': '' }, DONNEES));
  try { p.ctx.calcMusc(); } catch (e) { ok('calcMusc tourne sans poids', false, e.message); }
  const sansPoids = p.els['pic-q'].innerHTML + p.els['pic-q'].textContent;
  p.els['f-poids'].value = '55';
  try { p.ctx.calcMusc(); } catch (e) { ok('calcMusc tourne avec poids', false, e.message); }
  const avec = p.els['pic-q'].innerHTML + p.els['pic-q'].textContent;
  ok('le pic/poids apparaît dès que le poids est là', !/2,38|2\.38/.test(sansPoids) && /2,38/.test(avec), sansPoids + ' → ' + avec);
}

console.log('\nD — ce que la page dit en plus');
{
  const p = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
  try { p.ctx.calcMusc(); } catch (e) { ok('calcMusc tourne', false, e.message); }
  const picQ = p.els['pic-q'].innerHTML, picIJ = p.els['pic-ij'].innerHTML;
  ok('le pic/poids donne les DEUX côtés', /2,38/.test(picQ) && /2,82/.test(picQ), picQ);
  ok('… ischio-jambiers aussi', /1,05/.test(picIJ) && /1,02/.test(picIJ), picIJ);
  ok('le compte des critères atteints', />5<[^0-9]{0,30}6 /.test(p.els['iso-criteres'].innerHTML), p.els['iso-criteres'].innerHTML);
  ok('le poids est rappelé sur la page', /55/.test(p.els['iso-poids-rappel'].innerHTML), p.els['iso-poids-rappel'].innerHTML);
  const q = monter(DONNEES); try { q.ctx.calcMusc(); } catch (e) {}
  ok('… et son absence se DIT, plutôt que deux tirets muets', /renseign/i.test(q.els['iso-poids-rappel'].innerHTML), q.els['iso-poids-rappel'].innerHTML);
}
{
  const c = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
  let cr = {}; try { cr = c.ctx._isoCriteres(c.ctx._isoLire()); } catch (e) {}
  ok('un critère = une mesure dans sa norme, parmi celles RENSEIGNÉES', cr.total === 6 && cr.atteints === 5, JSON.stringify(cr));
  const d = monter({ 'q-f-cs': 155, 'q-f-ca': 131 });
  let cr2 = {}; try { cr2 = d.ctx._isoCriteres(d.ctx._isoLire()); } catch (e) {}
  ok('… une mesure non faite ne compte NI pour ni contre', cr2.total === 1 && cr2.atteints === 0, JSON.stringify(cr2));
}

console.log('\nB — la section du compte-rendu');
ok('elle existe, et porte son numéro', /addSec\('4\. Tests Isocinetiques', isoHtml\)/.test(src), 'addSec introuvable');
ok('… les sections suivantes sont renumérotées', /addSec\('5\. Tests Fonctionnels - Membres Superieurs'/.test(src)
   && /addSec\('6\. Tests Fonctionnels - Rachis'/.test(src) && /addSec\('7\. Analyse de Course a pied'/.test(src)
   && /addSec\('8\. Points a Travailler'/.test(src));
ok('les deux lignes en franglais ont disparu', !/crItem\('Quadriceps deficit'/.test(src) && !/crItem\('IJ deficit'/.test(src));
ok('… et le lexique ne les traduit plus', !/'Quadriceps deficit'/.test(bloc('var CR_MED_LEXIQUE', '/* ── Membre supérieur ── */')));
{
  const iso = bloc("var isoHtml = ''", "addSec('4. Tests Isocinetiques'");
  ok('les six mesures y passent, pas seulement la force', /_isoLire\(\)/.test(iso) && /forEach/.test(iso), iso.slice(0, 160));
  ok('les valeurs en Nm sont données, en mini-tableau', /_crMesTab\(/.test(iso) && /' Nm'/.test(iso), iso.slice(0, 400));
  ok('le statut suit les trois paliers du produit', /_statForce\(/.test(iso));
  ok('les colonnes prennent les libellés du membre inférieur', /_lblMI/.test(iso), iso.slice(0, 400));
  ok('les ratios et les pics rejoignent la section', /ratio-ca|ratioCA/.test(iso) && /pic/i.test(iso));
}

console.log('\nC — le graphique de l\'examen');
{
  const p = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
  let svg = ''; try { svg = p.ctx._isoChartSvg(p.ctx._isoLire()); } catch (e) { ok('_isoChartSvg tourne', false, e.message); }
  ok('un SVG, six paires de barres', /^<svg/.test(svg) && (svg.match(/<rect/g) || []).length >= 12, (svg.match(/<rect/g) || []).length + ' rect');
  ok('aucun NaN ni undefined n\'atteint le tracé', !/NaN|undefined/.test(svg), (svg.match(/NaN|undefined/g) || []).join(','));
  ok('les six libellés sont nommés', ['Force', 'Puissance', 'Résistance'].every(t => svg.indexOf(t) > -1));
  ok('aucun dégradé — l\'export PDF les perd', !/linearGradient|<defs/.test(svg));
  ok('les couleurs passent par les jetons', /var\(--/.test(svg) && !/#[0-9a-f]{3,6}/i.test(svg), (svg.match(/#[0-9a-f]{3,6}/ig) || []).join(','));
  ok('rien à tracer : rien n\'est tracé (pas de cadre vide)', (() => {
    try { const v = monter({}); return v.ctx._isoChartSvg(v.ctx._isoLire()) === ''; } catch (e) { return false; }
  })());
  try { p.ctx.calcMusc(); } catch (e) {}
  ok('calcMusc le pose dans la page', /^<svg/.test(p.els['iso-chart'].innerHTML), p.els['iso-chart'].innerHTML.slice(0, 40));
}
ok('la page porte ses trois nouveaux emplacements', /id="iso-chart"/.test(html) && /id="iso-criteres"/.test(html) && /id="iso-poids-rappel"/.test(html));
ok('aucun champ chiffré n\'a été ajouté à la page (chacun devrait sa courbe)',
   (html.slice(html.indexOf('id="page-musculaires"'), html.indexOf('id="page-force-ms"')).match(/<input type="number"/g) || []).length === 12,
   (html.slice(html.indexOf('id="page-musculaires"'), html.indexOf('id="page-force-ms"')).match(/<input type="number"/g) || []).length + ' champs');

console.log('\nLe ratio fonctionnel reste dehors');
ok('aucun rapport excentrique/concentrique n\'est affiché', !/ratio.{0,2}fonctionnel/i.test(src) && !/ratio.{0,2}fonctionnel/i.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Isocinétique : le poids recalcule, le CR reçoit tout, l\'examen se lit d\'un coup d\'œil.');

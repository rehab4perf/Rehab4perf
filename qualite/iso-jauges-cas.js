#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Isocinétique — les ratios entrent dans le profil, en jauges

   Demandé par le praticien (2026-09-22) : « faire apparaître les ratios du
   test iso dans le générateur de CR de manière plus visible, en les incluant
   dans le graphique généré, à la fois dans l'onglet et dans le CR. Améliorer
   aussi le visuel des ratios. »

   Ils vivaient dans quatre pastilles grises de la page, et n'allaient donc
   nulle part : le profil joint au courrier ne portait que les six barres.
   Ils rejoignent _isoProfilHtml — une seule fonction, donc l'onglet et le
   courrier montrent la MÊME chose, par construction.

   Un nombre nu ne dit pas la distance à la cible : 1,05 pour 1,7 se lit comme
   2,38 pour 2,4. Chaque ratio devient donc une JAUGE — la valeur, la cible
   marquée sur la piste, et la couleur des trois bandes déjà en place
   (qualite/iso-cas.js : vert, ambre à moins de 10 % du seuil, rouge en deçà).

     node qualite/iso-jauges-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const src = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                : fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };

const JETONS = { '--green': '#2D6A4F', '--orange': '#D4600A', '--red': '#C0392B',
                 '--border2': '#D3D1CB', '--text2': '#6B6860', '--text3': '#9D9B96', '--surface2': '#F1F0ED' };
const DONNEES = { 'q-f-cs':155, 'q-f-ca':131, 'q-p-cs':66, 'q-p-ca':60, 'q-r-cs':146, 'q-r-ca':162,
                  'ij-f-cs':56, 'ij-f-ca':58, 'ij-p-cs':34, 'ij-p-ca':35, 'ij-r-cs':136, 'ij-r-ca':134 };
function monter(vals) {
  const els = {};
  const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', className: '', style: {} });
  Object.keys(vals).forEach(k => { el(k).value = String(vals[k]); });
  ['iso-chart', 'iso-criteres', 'iso-poids-rappel'].forEach(el);
  const ctx = vm.createContext({
    document: { getElementById: id => els[id] || null, documentElement: {} },
    getComputedStyle: () => ({ getPropertyValue: n => JETONS[n] || '' })
  });
  try {
    vm.runInContext(['ISO_MESURES', 'ISO_EXPORT_CSS', 'ISO_APPROCHE'].map(n => {
      const i = src.indexOf('var ' + n + ' ='); return i < 0 ? '' : src.slice(i, src.indexOf(';\n', i)) + ';';
    }).join('\n') + '\n' + ['_isoVal', '_isoLire', '_isoRatios', '_isoCriteres', '_isoNb', '_isoJeton', '_blEsc',
      '_isoJaugeCouleur', '_isoJaugesHtml', '_isoProfilHtml', '_isoProfilExport', '_statForce', 'asymPct', 'asymTxt',
      'lsiInverse', '_isoStatutGroupe', 'calcMusc'].map(fn).join('\n'), ctx);
  } catch (e) { ok('le code se charge', false, e.message); }
  return { ctx, els };
}
const p = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
const profil = (() => { try { return p.ctx._isoProfilHtml(p.ctx._isoLire(), p.ctx._isoRatios(p.ctx._isoLire())); } catch (e) { return 'ERREUR ' + e.message; } })();

console.log('\nLes ratios entrent dans le profil');
ok('les quatre figures y sont', ['44,3', '36,1', '2,38', '1,05'].every(v => profil.indexOf(v) > -1),
   ['44,3', '36,1', '2,38', '1,05'].filter(v => profil.indexOf(v) === -1).join(' manque, '));
ok('… chacune avec sa cible écrite', /60 à 70/.test(profil) && /2,4/.test(profil) && /1,7/.test(profil), 'cibles absentes');
ok('… et le côté sain à côté de l\'atteint', profil.indexOf('2,82') > -1 && profil.indexOf('1,02') > -1);
ok('le poids accompagne les pics : sans lui ils ne veulent rien dire', /55 kg/.test(profil), 'poids absent du profil');
ok('la légende des barres voyage avec le profil', /côté sain/.test(profil) && /côté atteint/.test(profil), 'légende absente');
ok('sans poids, aucune jauge de pic — et pas de jauge vide', (() => {
  const q = monter(DONNEES);
  const h = q.ctx._isoProfilHtml(q.ctx._isoLire(), q.ctx._isoRatios(q.ctx._isoLire()));
  return h.indexOf('2,38') === -1 && !/NaN|undefined/.test(h) && h.indexOf('44,3') > -1;
})(), 'une jauge de pic subsiste sans poids');

console.log('\nUne jauge situe la valeur face à sa cible');
ok('une piste, une barre, un repère de cible', (profil.match(/class="iso-j-t"/g) || []).length === 4
   && (profil.match(/class="iso-j-b"/g) || []).length === 4 && (profil.match(/iso-j-m/g) || []).length >= 2,
   (profil.match(/class="iso-j-t"/g) || []).length + ' pistes');
ok('les largeurs restent dans la piste', (() => {
  const w = (profil.match(/width:([\d,.]+)%/g) || []).map(x => parseFloat(x.replace(/[^\d.]/g, '')));
  return w.length > 0 && w.every(v => v >= 0 && v <= 100);
})(), (profil.match(/width:[\d,.]+%/g) || []).join(' '));
ok('… les repères aussi', (() => {
  const l = (profil.match(/left:([\d.]+)%/g) || []).map(x => parseFloat(x.replace(/[^\d.]/g, '')));
  return l.length > 0 && l.every(v => v >= 0 && v <= 100);
})(), (profil.match(/left:[\d.]+%/g) || []).join(' '));
ok('aucun NaN ne passe', !/NaN|undefined|Infinity/.test(profil), (profil.match(/NaN|undefined|Infinity/g) || []).join(','));

console.log('\nLes mêmes trois bandes que partout');
{
  const C = (v, s) => { try { return p.ctx._isoJaugeCouleur(v, s); } catch (e) { return 'ERREUR'; } };
  ok('au-dessus de la cible : vert', /green/.test(C(2.6, 2.4)), C(2.6, 2.4));
  ok('à moins de 10 % : ambre', /orange/.test(C(2.38, 2.4)), C(2.38, 2.4));
  ok('en deçà : rouge', /red/.test(C(1.05, 1.7)), C(1.05, 1.7));
  ok('… le seuil de bascule est celui déjà en place', /ISO_APPROCHE/.test(fn('_isoJaugeCouleur')), 'un second seuil est né');
}
{
  const C = (v, min, max) => { try { return p.ctx._isoJaugeCouleur(v, min, max); } catch (e) { return 'ERREUR'; } };
  ok('une cible en FOURCHETTE : dedans, c\'est vert', /green/.test(C(65, 60, 70)), C(65, 60, 70));
  ok('… dehors, ce n\'est pas rouge — un ratio hors norme n\'est pas un déficit', !/red/.test(C(44.3, 60, 70)), C(44.3, 60, 70));
}

console.log('\nL\'onglet et le courrier montrent la MÊME chose');
ok('une seule fonction les rend', (src.match(/function _isoJaugesHtml\(/g) || []).length === 1
   && /_isoJaugesHtml\(/.test(fn('_isoProfilHtml')), 'les jauges sont écrites deux fois');
ok('la page ne garde plus ses pastilles', !/id="ratio-ca"/.test(html) && !/id="pic-q"/.test(html),
   'les score-pill sont encore là : deux rendus du même chiffre');
ok('… et calcMusc ne les remplit plus', !/setRatio|setPic/.test(fn('calcMusc')), 'calcMusc écrit encore dans les pastilles');
{
  const q = monter(Object.assign({ 'f-poids': 55 }, DONNEES));
  try { q.ctx.calcMusc(); } catch (e) { ok('calcMusc tourne', false, e.message); }
  ok('le profil de la page porte les jauges', /iso-jauges/.test(q.els['iso-chart'].innerHTML), q.els['iso-chart'].innerHTML.slice(0, 80));
}
{
  let pdf = ''; try { pdf = p.ctx._isoProfilExport(); } catch (e) {}
  ok('à l\'export, les jauges emportent leurs styles', /\.iso-j-t/.test(pdf) && /\.iso-jauges/.test(pdf), 'CSS des jauges absent de l\'export');
  ok('… et plus aucun jeton', !/var\(--/.test(pdf), (pdf.match(/var\(--[\w-]+\)/g) || []).slice(0, 3).join(' '));
  ok('… les quatre figures aussi', ['44,3', '36,1', '2,38', '1,05'].every(v => pdf.indexOf(v) > -1));
}
ok('la page porte le style des jauges', /\.iso-jauges/.test(html) && /\.iso-j-t/.test(html), 'CSS absent de bilan.html');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Isocinétique : les ratios sont dans le profil, en jauges, et le courrier les emporte.');

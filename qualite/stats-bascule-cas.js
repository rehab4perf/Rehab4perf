#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Onglet Patients — basculer entre le pourcentage et le nombre

   Demandé par le praticien (2026-09-24) : « j'ai le pourcentage des patients,
   j'aimerais au clic pouvoir changer entre le nombre et le pourcentage.
   Exemple : 18 % de LCA, au clic sur le 18 % ça se change en 24. »

   Deux décisions portées ici :

   - le clic bascule la COLONNE entière, pas la seule ligne cliquée. Une
     colonne où « 18 % » voisine « 24 » ne se compare plus — et comparer est
     tout ce qu'une liste de barres sert à faire ;
   - les deux nombres sont ÉCRITS dans le balisage. Rien ne se recalcule au
     clic : le dénominateur d'une carte n'est pas le total des patients (un
     patient compte dans plusieurs régions), et le retrouver au clic était le
     moyen sûr de le prendre faux.

   Le choix survit au redessin : filtrer par période rebâtit la page, et une
   vue qui se réinitialise à chaque filtre ne sert à rien.

     node qualite/stats-bascule-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const html = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                 : fs.readFileSync(path.join(R, 'patients.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = n => { const d = html.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : html.slice(d, html.indexOf('\n}\n', d) + 3); };

const c = vm.createContext({ document: { querySelectorAll: () => [] } });
try { vm.runInContext(['esc', 'barRows', '_statBascule'].map(fn).join('\n')
  + '\nvar _statVue = _statVue || {};\nthis.vue = function(){ return _statVue; };', c); }
catch (e) { ok('le code se charge', false, e.message); }

const ITEMS = [{ label: 'LCA', n: 24 }, { label: 'Entorse cheville', n: 12 }, { label: 'Épaule', n: 6 }];
const B = (items, opts) => { try { return c.barRows(items, opts); } catch (e) { return 'ERREUR ' + e.message; } };
const vals = h => (String(h).match(/class="bar-val[^"]*"[^>]*>([^<]*)</g) || []).map(x => x.replace(/.*>/, '').replace(/<$/, ''));

console.log('\nLes deux nombres sont écrits, aucun ne se recalcule');
{
  const h = B(ITEMS, { asPct: true, denom: 133, cle: 'motifs' });
  ok('chaque valeur porte son nombre ET son pourcentage',
     (h.match(/data-n="24"/g) || []).length === 1 && /data-pct="18"/.test(h), h.slice(0, 260));
  ok('… le pourcentage est arrondi à l\'entier', /data-pct="18"/.test(h) && !/data-pct="18\./.test(h));
  ok('la vue de départ suit asPct', vals(h).join('|') === '18 %|9 %|5 %', vals(h).join('|'));
  ok('… et sans asPct, ce sont les nombres', vals(B(ITEMS, { denom: 133, cle: 'x' })).join('|') === '24|12|6',
     vals(B(ITEMS, { denom: 133, cle: 'x' })).join('|'));
}
ok('sans dénominateur, aucun bouton : il n\'y a rien à convertir',
   !/bar-val-btn/.test(B(ITEMS, {})) && vals(B(ITEMS, {})).join('|') === '24|12|6', B(ITEMS, {}).slice(0, 200));
ok('un dénominateur nul ne produit ni NaN ni division par zéro',
   !/NaN|Infinity/.test(B(ITEMS, { asPct: true, denom: 0, cle: 'z' })), B(ITEMS, { asPct: true, denom: 0, cle: 'z' }).slice(0, 160));

console.log('\nLe clic bascule la COLONNE, pas la ligne');
{
  /* Un faux DOM : trois valeurs de la même carte, une d'une autre. */
  const faire = (cle, n, pct, vue) => ({ dataset: { n: String(n), pct: String(pct), cle: cle, vue: vue },
    textContent: vue === 'pct' ? pct + ' %' : String(n), title: '', setAttribute(k, v){ this.dataset[k.replace('data-', '')] = v; } });
  const col = [faire('motifs', 24, 18, 'pct'), faire('motifs', 12, 9, 'pct'), faire('motifs', 6, 5, 'pct')];
  const autre = [faire('regions', 30, 40, 'pct')];
  const tout = col.concat(autre);
  const ctx = vm.createContext({ document: { querySelectorAll: s => {
    const m = /data-cle="([^"]+)"/.exec(s); return m ? tout.filter(x => x.dataset.cle === m[1]) : tout; } } });
  try { vm.runInContext(fn('_statBascule') + '\nvar _statVue = {};\nthis.vue = function(){ return _statVue; };', ctx); }
  catch (e) { ok('_statBascule se charge', false, e.message); }
  try { ctx._statBascule(col[0]); } catch (e) { ok('_statBascule tourne', false, e.message); }
  ok('les trois valeurs de la carte passent au nombre', col.map(x => x.textContent).join('|') === '24|12|6',
     col.map(x => x.textContent).join('|'));
  ok('… et la carte voisine ne bouge pas', autre[0].textContent === '18 %' || autre[0].textContent === '40 %',
     autre[0].textContent);
  try { ctx._statBascule(col[0]); } catch (e) {}
  ok('un second clic revient au pourcentage', col.map(x => x.textContent).join('|') === '18 %|9 %|5 %',
     col.map(x => x.textContent).join('|'));
  ok('le choix est retenu par carte', (() => { const v = ctx.vue(); return typeof v.motifs === 'string'; })(),
     JSON.stringify(ctx.vue()));
}

console.log('\nLe choix survit au redessin');
ok('barRows lit la vue retenue', /_statVue\[/.test(fn('barRows')), 'barRows ignore l\'état retenu');
{
  const ctx2 = vm.createContext({});
  try {
    vm.runInContext(['esc', 'barRows'].map(fn).join('\n') + '\nvar _statVue = { motifs: "n" };', ctx2);
    const h = ctx2.barRows(ITEMS, { asPct: true, denom: 133, cle: 'motifs' });
    ok('… un redessin garde le nombre choisi', vals(h).join('|') === '24|12|6', vals(h).join('|'));
  } catch (e) { ok('… un redessin garde le nombre choisi', false, e.message); }
}

console.log('\nCe que le praticien voit');
{
  const h = B(ITEMS, { asPct: true, denom: 133, cle: 'motifs' });
  ok('la valeur est un vrai bouton, pas un mot cliquable au hasard', /<button[^>]*class="bar-val/.test(h), h.slice(120, 340));
  ok('… et il dit ce qu\'il fera', /title="[^"]*(nombre|pourcentage)/i.test(h), (h.match(/title="[^"]*"/g) || []).slice(0, 2).join(' '));
  ok('l\'infobulle de la ligne garde les deux lectures', /24 patients sur 133/.test(h), (h.match(/title="[^"]*"/g) || [])[0]);
}
ok('le bouton a son style', /\.bar-val-btn/.test(html), 'CSS absent');
ok('toutes les cartes de barres peuvent basculer',
   (html.match(/barRows\([^)]*cle:/g) || []).length >= 4, (html.match(/barRows\(/g) || []).length + ' appels, ' + (html.match(/cle:/g) || []).length + ' avec clé');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Patients : le pourcentage et le nombre se donnent la main, colonne par colonne.');

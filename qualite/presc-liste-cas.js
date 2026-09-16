#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Ordonnance — une prescription par ligne, précédée d'un tiret

   Demandé par le praticien (2026-09-16) : « que chaque prescription se mette
   à la ligne avec un tiret bien présenté ». Le texte libre était recopié
   centré, d'un bloc. Chaque ligne du texte devient une ligne de la liste :
   tiret, et retour à la ligne aligné sous le texte (pas sous le tiret). Un
   tiret déjà tapé n'est pas doublé ; les lignes vides disparaissent. Même
   rendu dans l'aperçu ET dans le document imprimé : une seule fonction.

     node qualite/presc-liste-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fo = n => { const d = outils.indexOf('\nfunction ' + n + '('); if (d < 0) return '';
  const fl = outils.indexOf('\n', d + 1), l = outils.slice(d, fl); const o = (l.match(/\{/g) || []).length, c = (l.match(/\}/g) || []).length;
  return (o && o === c) ? l + '\n' : outils.slice(d, outils.indexOf('\n}\n', d) + 3); };

const c = vm.createContext({});
try { vm.runInContext(fo('_prescEsc') + fo('_prescObjetHtml'), c); } catch (e) { ok('la fonction se charge', false, e.message); }
const H = t => { try { return c._prescObjetHtml(t); } catch (e) { return 'ERREUR ' + e.message; } };
const li = h => (String(h).match(/<li>([\s\S]*?)<\/li>/g) || []).map(x => x.replace(/<\/?li>/g, ''));

console.log('\nUne ligne, un tiret');
ok('trois lignes → trois prescriptions', li(H('2 PAIRES DE BAS\n1 TENS\nPARACÉTAMOL 1 G')).length === 3 && /^<ul class="presc-liste">/.test(H('A\nB')), H('2 PAIRES DE BAS\n1 TENS\nPARACÉTAMOL 1 G'));
ok('un tiret ou une puce déjà tapés ne sont pas doublés', li(H('- 1 TENS\n– 2 BAS\n• 3 CANNES\n* 4 COUSSINS')).join('|') === '1 TENS|2 BAS|3 CANNES|4 COUSSINS', li(H('- 1 TENS\n– 2 BAS\n• 3 CANNES\n* 4 COUSSINS')).join('|'));
ok('les lignes vides disparaissent', li(H('A\n\n  \nB\n')).length === 2);
ok('le texte est échappé', li(H('CLASSE <2> & TAILLE "M"'))[0] === 'CLASSE &lt;2&gt; &amp; TAILLE &quot;M&quot;', li(H('CLASSE <2> & TAILLE "M"'))[0]);
ok('rien à prescrire : « — »', H('') === '—' && H(' \n ') === '—');

console.log('\nLe même rendu partout');
ok('l\'aperçu utilise la liste', /getElementById\('presc-doc-objet'\)\.innerHTML = _prescObjetHtml\(obj\);/.test(fo('updatePrescDoc')));
ok('le document imprimé aussi', /var obj\s*= _prescObjetHtml\(/.test(fo('printPrescription')));
ok('aperçu : tiret, et retour à la ligne aligné sous le texte', /\.presc-liste li::before \{[^}]*content: ?'–'/.test(outils) && /\.presc-liste li \{[^}]*padding-left/.test(outils));
ok('impression : la même mise en forme', /\.pp-objet \.presc-liste li::before\{[^}]*content:\\'–\\'/.test(outils) && /\.pp-objet \.presc-liste li\{[^}]*padding-left/.test(outils));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Ordonnance : une prescription par ligne, précédée d\'un tiret.');

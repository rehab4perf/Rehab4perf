#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Le cluster de Wainner dans le Scan neurologique de l'épaule

   Demandé par le praticien (2026-09-26) : dépister une radiculopathie
   cervicale depuis le bilan d'épaule, après l'Arm Squeeze Test.

   CE QUE LE CLUSTER DIT, et c'est la seule chose qui compte ici :
     - ULNT médian NÉGATIF → 3 %. C'est l'usage le plus utile : il écarte.
       Wainner l'écrit lui-même — « Upper limb tension Test A was the most
       useful test for ruling out cervical radiculopathy » (Spine
       2003;28(1):52-62, doi:10.1097/00007632-200301010-00014).
     - 3 items sur 4 → 65 % · 4 sur 4 → 90 %.

   CE QUE CES POURCENTAGES NE SONT PAS : une propriété du test. Ce sont des
   probabilités POST-TEST, calculées sur une population chez qui l'on
   suspecte déjà une radiculopathie. L'écran doit le dire, sans quoi le
   chiffre part au courrier comme une affirmation sur CE patient.

   LES QUATRE ITEMS sont ajoutés en FIN de catalogue (append-only : l'index
   est l'identité, les bilans enregistrés en dérivent), et l'ORDRE
   D'AFFICHAGE les remet dans l'ordre clinique — l'ULNT médian d'abord,
   puisqu'un négatif dispense des trois autres.

     node qualite/cluster-wainner-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const bjs = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                : fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const bhtml = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = bjs.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : bjs.slice(d, bjs.indexOf('\n}\n', d) + 3); };

/* Le catalogue, extrait du vrai fichier. */
function catalogue() {
  const d = bjs.indexOf('const TESTS = {');
  const f = bjs.indexOf('\n};', d);
  const c = vm.createContext({});
  vm.runInContext(bjs.slice(d, f + 3) + '\nthis.__T = TESTS;', c);
  return c.__T;
}
const T = catalogue();
const propre = s => String(s).replace(/<span[\s\S]*?<\/span>/gi, '').replace(/<[^>]*>/g, '').trim();

console.log('\nLe bloc change de nom');
ok('« Scan neurologique » remplace « Scan Épaule Irritable »',
   /Scan neurologique/.test(bhtml) && !/Scan Épaule Irritable/.test(bhtml),
   'le CR reprend ce titre tel quel (_crNomDuBloc)');
ok('… des DEUX côtés : unilatéral et bilatéral',
   (bhtml.match(/Scan neurologique/g) || []).length >= 2,
   'un seul des deux en-têtes renommé, le CR dirait deux choses');
ok('l\'identifiant tb-ep-irrit ne bouge pas', /id="tb-ep-irrit"/.test(bhtml),
   'un id renommé orpheline tous les bilans enregistrés');

console.log('\nLes quatre items du cluster');
{
  const it = T['tb-ep-irrit'].items.map(propre);
  ok('l\'ULNT médian y était déjà — il n\'est pas dupliqué',
     it.filter(x => /ULNT médian \(ULNT 1\)/.test(x)).length === 1,
     it.filter(x => /ULNT 1/.test(x)).join(' | '));
  ok('la rotation cervicale est ajoutée', it.some(x => /[Rr]otation cervicale/.test(x)), it.join(' | '));
  ok('la distraction aussi', it.some(x => /[Dd]istraction/.test(x)));
  ok('le Spurling aussi', it.some(x => /Spurling/.test(x)));
  /* APPEND-ONLY : les trois nouveaux sont en FIN, les anciens n'ont pas
     bougé d'un index. C'est ce qui garde les bilans enregistrés lisibles. */
  ok('les cinq premiers index sont intacts',
     /Arm Squeeze/.test(it[0]) && /ULNT médian \(ULNT 1\)/.test(it[1])
     && /ULNT médian \(ULNT 2a\)/.test(it[2]) && /ULNT radial \(ULNT 2b\)/.test(it[3])
     && /ULNT ulnaire \(ULNT 3\)/.test(it[4]),
     it.slice(0, 5).join(' | '));
  ok('… et les nouveaux sont ajoutés APRÈS', it.length === 8, it.length + ' items');
  ['tb-ep-irrit-g', 'tb-ep-irrit-d'].forEach(k => {
    const b = T[k].items.map(propre);
    ok(k + ' suit, avec les mêmes tests', b.length === 8 && /Spurling/.test(b[7]), b.join(' | '));
  });
}

console.log('\nL\'ordre d\'AFFICHAGE, découplé de l\'identité');
{
  const o = fm('_blTestDisplayOrder');
  ok('un ordre par défaut existe pour ce bloc', /_BL_ORDRE_DEFAUT|_blOrdreDefaut/.test(o + bjs.slice(0, 3000)) || /_BL_ORDRE_DEFAUT/.test(bjs),
     'les nouveaux tests resteraient en fin, après les ULNT hors cluster');
  const m = bjs.match(/_BL_ORDRE_DEFAUT\s*=\s*\{[\s\S]*?\}\s*;/);
  /* L'ULNT médian FERME le cluster (décision du praticien) : il en est le
     quatrième item et le premier des quatre ULNT, donc il fait charnière —
     les quatre ULNT se suivent à l'écran. Sa place ne change rien à la
     règle : négatif, il écarte, quel que soit son rang. */
  ok('… l\'Arm Squeeze ouvre, et l\'ULNT médian ferme le cluster',
     !!m && /'tb-ep-irrit'\s*:\s*\[0\s*,\s*5\s*,\s*6\s*,\s*7\s*,\s*1\s*,/.test(m[0]),
     m ? m[0].slice(0, 220) : 'absent');
  ok('… et les quatre ULNT se suivent',
     !!m && /\[0, 5, 6, 7, 1, 2, 3, 4\]/.test(m[0]),
     'un ULNT séparé des trois autres');
  ok('… un ordre par défaut ne PERD aucun test',
     /all\.forEach/.test(o) || /seen\[i\]/.test(o),
     'un test absent de l\'ordre disparaîtrait de l\'écran');
}

/* Le VRAI calcul, exécuté. */
console.log('\nCe que le cluster conclut');
{
  const c = vm.createContext({});
  vm.runInContext([fm('_wainnerLire'), fm('_wainnerVerdict')].join('\n')
    + '\nvar EP_WAINNER = ' + (bjs.match(/var EP_WAINNER = \{[^}]*\}/) || ['{}'])[0].replace('var EP_WAINNER = ', '') + ';', c);
  const V = (ulnt, rot, dist, spur) => c._wainnerVerdict({ ulnt: ulnt, rot: rot, dist: dist, spur: spur });

  const neg = V('Négatif', 'Positif', 'Positif', 'Positif');
  ok('ULNT médian NÉGATIF : on écarte, quoi que disent les autres',
     neg.ecarte === true && /3\s*%/.test(neg.txt), JSON.stringify(neg));
  ok('… et c\'est un ton rassurant, pas une alerte', neg.cls === 'ok', neg.cls);

  const q4 = V('Positif', 'Positif', 'Positif', 'Positif');
  ok('4 / 4 : 90 %', q4.n === 4 && /90\s*%/.test(q4.txt), JSON.stringify(q4));
  const q3 = V('Positif', 'Positif', 'Positif', 'Négatif');
  ok('3 / 4 : 65 %', q3.n === 3 && /65\s*%/.test(q3.txt), JSON.stringify(q3));
  const q2 = V('Positif', 'Positif', 'Négatif', 'Négatif');
  ok('2 / 4 : aucun chiffre inventé', q2.n === 2 && !/%/.test(q2.txt), JSON.stringify(q2));
  const rien = V('', '', '', '');
  ok('rien de renseigné : rien à conclure', rien.vide === true, JSON.stringify(rien));
  /* Le piège : un cluster incomplet ne doit pas se lire comme un cluster
     négatif. Trois items positifs sur trois RENSEIGNÉS n'est pas 3/4. */
  const part = V('Positif', 'Positif', '', '');
  ok('… et un cluster incomplet le dit', part.incomplet === true && !/%/.test(part.txt), JSON.stringify(part));

  console.log('\nLes pourcentages disent d\'où ils viennent');
  ok('le verdict porte sa condition', /suspect|avant examen|pré-test|pre-test/i.test(q3.note || ''),
     'un pourcentage nu se lirait comme une affirmation sur CE patient');
}

console.log('\nLe plan de traitement');
{
  const t = bjs.slice(bjs.indexOf('// ── ULNT épaule'), bjs.indexOf('// ── ULNT épaule') + 2200);
  ok('à partir de 3 / 4, une ligne d\'orientation', /_wainner/.test(t) && /avis médical|orientation|radiculopathie/i.test(t),
     t.slice(0, 400));
  ok('… et la mobilisation neurale des ULNT reste', /Mobilisation neurale/.test(t));
  /* Les items du cluster ne portent pas « ULNT » dans leur libellé : ils ne
     peuvent donc pas déclencher « mobilisation neurale » par erreur. */
  ok('Spurling et la distraction ne passent pas pour des ULNT',
     !/Spurling/.test(propre(T['tb-ep-irrit'].items[7] || '').replace(/.*/, '')) &&
     T['tb-ep-irrit'].items.slice(5).every(x => !/ULNT/.test(propre(x))),
     T['tb-ep-irrit'].items.slice(5).map(propre).join(' | '));
}

/* LE RACHIS CERVICAL A DEJA CE CLUSTER (_calcWainnerCerv). Il comptait ses
   items avec sa propre regle : pas de pourcentage, et surtout PAS la regle
   d'ecartement de l'ULNT median. Deux ecrans auraient rendu deux verdicts
   differents du meme examen — le defaut deja rencontre sur les phases de
   protocole. La REGLE est desormais partagee ; seule la LECTURE differe,
   parce que les deux pages ne rangent pas leurs tests pareil. */
console.log('\nLe rachis et l\'épaule disent la même chose');
{
  const c = fm('_calcWainnerCerv');
  ok('le rachis passe par la règle partagée', /_wainnerVerdict\(/.test(c),
     'deux implémentations du même verdict divergeront');
  ok('… et son alerte reste déclenchée à partir de 3 items',
     />= *3|n >= 3/.test(c), c.slice(-400));
  ok('la règle ne lit AUCUN champ : elle reçoit les quatre valeurs',
     !/getElementById/.test(fm('_wainnerVerdict')),
     'une règle qui lit le DOM ne peut pas servir deux pages');
}

console.log('\nLe verdict s\'affiche');
{
  const r = fm('_epWainnerRefresh');
  ok('les trois tables ont leur verdict', /tb-ep-irrit-g/.test(r) && /tb-ep-irrit-d/.test(r), r.slice(0, 200));
  ok('… masqué tant que rien n\'est renseigné', /w\.vide/.test(r) && /hidden = true/.test(r),
     'une case de verdict permanente ferait croire à un résultat');
  ok('… et le texte libre est échappé', /_objEsc\(/.test(r), 'injection possible via une observation');
  ok('le conteneur existe dans la page', /id="wainner-tb-ep-irrit"/.test(bhtml));
  ok('… masqué par défaut', /id="wainner-tb-ep-irrit" hidden/.test(bhtml));
  ok('son style aussi', /\.wainner-verdict/.test(bhtml));
  /* Les jetons de couleur sont ceux de CE fichier : une variable non definie
     rend la declaration entiere invalide, en silence. */
  /* Les COMMENTAIRES sont retirés d'abord : celui qui explique la règle cite
     justement le jeton qu'elle interdit — le garde-fou échouait sur sa propre
     explication. Même piège que dans echeance-praticien-cas.js. */
  const cssW = bhtml.slice(bhtml.indexOf('.wainner-verdict'), bhtml.indexOf('.wainner-verdict') + 900)
                    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok('… avec les jetons de bilan.html, pas ceux d\'un autre fichier',
     !/--amrap|--accent-ll|--surface\b/.test(cssW),
     'un nom de variable emprunté à programme.html — la déclaration serait ignorée en silence');
  ok('il se relit au changement d\'un item', /wainnerEp\[tableId\]/.test(bjs),
     'le verdict ne bougerait qu\'au rechargement');
  ok('… et après tout chargement de bilan',
     (bjs.match(/_epWainnerRefresh\(\)/g) || []).length >= 3,
     'un bilan rouvert montrerait un verdict vide');
}

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Scan neurologique : le cluster écarte, oriente, et dit d\'où viennent ses chiffres.');

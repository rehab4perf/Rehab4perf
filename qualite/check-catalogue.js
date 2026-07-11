/* ═══════════════════════════════════════════════════════════════════
   Contrôle append-only du catalogue TESTS{} de js/bilan.js.

   L'identité d'un test est son index dans TESTS[tbody].items : les ids
   des champs sauvegardés (sel-<tbody>-<i>, note-<tbody>-<i>) en dérivent.
   Réordonner ou insérer AU MILIEU d'une liste décalerait les données de
   tous les bilans déjà sauvegardés (valeurs rattachées aux mauvais tests).

   Règle vérifiée ici : chaque liste committée est un PRÉFIXE de la liste
   courante — modifier le libellé d'un test existant est autorisé tant
   qu'il reste le même test (le hash porte sur le libellé : un changement
   de libellé demande une mise à jour volontaire du manifeste via --write,
   après avoir vérifié qu'il s'agit bien d'une reformulation, pas d'un
   remplacement).

   Usage :
     node qualite/check-catalogue.js           → contrôle (exit 1 si violation)
     node qualite/check-catalogue.js --write   → régénère le manifeste
═══════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const MANIFEST = path.join(__dirname, 'tests-manifest.json');

function extractTests() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');
  const start = src.indexOf('const TESTS = {');
  if (start === -1) throw new Error('const TESTS introuvable dans js/bilan.js');
  const end = src.indexOf('\n};', start);
  if (end === -1) throw new Error('fin du bloc TESTS introuvable');
  const code = src.slice(start, end + 3);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.__TESTS = TESTS;', sandbox);
  return sandbox.__TESTS;
}

function buildManifest(tests) {
  const m = {};
  Object.keys(tests).forEach(k => {
    m[k] = tests[k].items.map(s =>
      crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12));
  });
  return m;
}

const current = buildManifest(extractTests());

if (process.argv.includes('--write')) {
  fs.writeFileSync(MANIFEST, JSON.stringify(current, null, 1) + '\n');
  const n = Object.keys(current).length;
  const t = Object.values(current).reduce((s, a) => s + a.length, 0);
  console.log(`Manifeste régénéré : ${n} tbodies, ${t} tests.`);
  process.exit(0);
}

if (!fs.existsSync(MANIFEST)) {
  console.error('✗ qualite/tests-manifest.json absent — lancer avec --write pour l\'initialiser.');
  process.exit(1);
}

const frozen = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const errors = [];

Object.keys(frozen).forEach(tbody => {
  const cur = current[tbody];
  if (!cur) { errors.push(`${tbody} : tbody SUPPRIMÉ du catalogue (interdit — les bilans sauvegardés y référencent des données).`); return; }
  if (cur.length < frozen[tbody].length) {
    errors.push(`${tbody} : ${frozen[tbody].length - cur.length} test(s) SUPPRIMÉ(S) en fin de liste (interdit).`);
  }
  const n = Math.min(cur.length, frozen[tbody].length);
  for (let i = 0; i < n; i++) {
    if (cur[i] !== frozen[tbody][i]) {
      errors.push(`${tbody}[${i}] : test modifié ou déplacé — l'identité par index est rompue. Si c'est une simple reformulation du libellé, régénérer le manifeste avec --write ; sinon, ANNULER (ajouter en fin de liste à la place).`);
      break; // un seul rapport par tbody, les suivants découlent du décalage
    }
  }
});

if (errors.length) {
  console.error('✗ CATALOGUE TESTS{} — violation append-only :\n' + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
const added = Object.keys(current).filter(k => !frozen[k]);
const grown = Object.keys(frozen).filter(k => current[k] && current[k].length > frozen[k].length);
let note = '';
if (added.length) note += ` · ${added.length} nouveau(x) tbody (penser à --write + BILAN_BLOCKS)`;
if (grown.length) note += ` · ${grown.length} tbody étendu(s) en fin de liste (penser à --write)`;
console.log('✓ Catalogue TESTS{} conforme append-only' + note);

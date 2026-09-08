#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   La date de naissance est écrite à DEUX endroits — il faut qu'elle soit LA
   MÊME.

   `patients.ddn` est le registre : c'est lui que montre la liste des patients,
   et c'est de lui que découlent l'âge et les normes qui en dépendent. Le champ
   « Date de naissance » de la page Infos du bilan en est une COPIE, remplie
   par `_autofillPatientFields` — et seulement si elle est vide, donc jamais
   réécrite ensuite.

   Corriger la date dans le bilan ne corrigeait donc rien ailleurs : les deux
   valeurs divergeaient en silence, et la liste des patients continuait
   d'afficher l'ancienne. Une donnée d'identité qui dit deux choses selon
   l'écran où on la regarde est une donnée qu'on ne peut plus croire.

   LE SENS DE LA CORRECTION : bilan → registre. Une date de naissance est un
   fait, pas une mesure du jour ; la corriger est une correction, et elle vaut
   partout. L'inverse — le registre écrasant le bilan — n'est PAS fait : un
   bilan enregistré est un document daté, et réécrire ses données parce que la
   fiche a changé le falsifierait.

   TROIS GARDES-FOUS, et chacun ferme un vrai risque :
     - vider le champ n'efface JAMAIS la date du registre ;
     - sans patient sélectionné, rien n'est écrit ;
     - une valeur identique ne déclenche aucune écriture.

   L'écriture elle-même est faite par `index.html`, qui possède déjà la table
   `patients`, son cache et le rendu de la liste. Le bilan se contente de
   signaler la correction : deux endroits qui écrivent dans la même table
   finissent toujours par diverger.

     node qualite/ddn-patient-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js    = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html  = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var shell = fs.readFileSync(path.join(R, 'index.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom + (String(attendu) === String(obtenu) ? '' : ''),
     String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}

/* ── Le champ appelle vraiment la synchronisation ─────────────────────────── */
console.log('\nLe champ du bilan est câblé');

var champ = (html.match(/<input[^>]*id="f-dob"[^>]*>/) || [''])[0];
ok('le champ existe', !!champ);
ok('… et il signale sa correction', /onchange="[^"]*_blSyncDdnPatient\(\)/.test(champ), champ);
/* `oninput` recalcule l'age a chaque frappe ; `onchange` ne part qu'une fois la
   date COMPLETE. Ecrire en base a chaque frappe produirait des dates
   intermediaires absurdes — un « 2 » devenant l'an 2. */
ok('… sur `change`, jamais sur `input`',
   !/oninput="[^"]*_blSyncDdnPatient/.test(champ), champ);

/* ── La fonction, exécutée pour de vrai ───────────────────────────────────── */
console.log('\nCe que la correction envoie');

var d = js.indexOf('function _blSyncDdnPatient(');
if (d < 0) { console.log('  ✗ `_blSyncDdnPatient` introuvable dans js/bilan.js'); process.exit(1); }
var corps = js.slice(d, js.indexOf('\n}', d) + 2);

function lancer(valeurChamp, patient) {
  var envoyes = [], toasts = [];
  var pat = patient ? JSON.parse(JSON.stringify(patient)) : null;
  var f = new Function('document', 'window', '_bilanPatient', 'showToast', 'poser',
    corps + '\nvar _r = _blSyncDdnPatient();\nposer(_bilanPatient);\nreturn _r;');
  var res = f(
    { getElementById: function (id) { return id === 'f-dob' ? { value: valeurChamp } : null; } },
    { parent: { postMessage: function (m) { envoyes.push(m); } },
      location: { origin: 'https://x' } },
    pat,
    function (m) { toasts.push(m); },
    function (p) { pat = p; });
  return { rendu: res, envoyes: envoyes, toasts: toasts, patient: pat };
}

var PAT = { id: 'uuid-1', nom: 'DEMO', ddn: '1992-11-07' };

var corrige = lancer('1992-11-08', PAT);
egal('une date corrigée part vers le registre', 1, corrige.envoyes.length);
egal('… avec le bon type', 'r4p-patient-ddn', (corrige.envoyes[0] || {}).type);
egal('… le bon patient', 'uuid-1', (corrige.envoyes[0] || {}).patientId);
egal('… et la nouvelle date', '1992-11-08', (corrige.envoyes[0] || {}).ddn);
ok('… et le praticien en est averti', corrige.toasts.length === 1, corrige.toasts.join(' | '));
/* Sans cette mise a jour locale, chaque `change` suivant reposterait la meme
   correction : la comparaison se fait contre `_bilanPatient.ddn`. */
egal('le patient courant retient la correction', '1992-11-08', (corrige.patient || {}).ddn);

var inchange = lancer('1992-11-07', PAT);
egal('une date identique n\'écrit rien', 0, inchange.envoyes.length);
ok('… et ne dit rien', inchange.toasts.length === 0);

/* Le garde-fou qui compte le plus : le champ vidé — par une frappe malheureuse,
   ou par un reset de formulaire — ne doit pas effacer l'identité du patient. */
var vide = lancer('', PAT);
egal('vider le champ n\'efface jamais le registre', 0, vide.envoyes.length);
var espaces = lancer('   ', PAT);
egal('… ni un champ fait d\'espaces', 0, espaces.envoyes.length);

var sansPatient = lancer('1992-11-08', null);
egal('sans patient sélectionné, rien n\'est écrit', 0, sansPatient.envoyes.length);
var patSansId = lancer('1992-11-08', { nom: 'X' });
egal('… ni sur un patient sans identifiant', 0, patSansId.envoyes.length);

/* Un patient dont la date n'etait pas renseignee : la premiere saisie la pose. */
var premiere = lancer('1992-11-07', { id: 'uuid-2', nom: 'NEUF' });
egal('une date absente du registre s\'y inscrit', 1, premiere.envoyes.length);

/* ── La coquille écrit, et rafraîchit tout ce qui montre la date ──────────── */
console.log('\nLa coquille applique la correction');

var dH = shell.indexOf("'r4p-patient-ddn'");
ok('le message est écouté', dH > 0);
var bloc = dH > 0 ? shell.slice(dH, dH + 1600) : '';

ok('la table patients est mise à jour', /from\('patients'\)[\s\S]{0,120}update\(\{ ?ddn/.test(bloc), bloc.slice(0, 160));
ok('… sur le bon patient', /\.eq\('id',/.test(bloc));
/* Trois vues montrent cette date, et une seule oubliee suffit a faire croire
   que la correction n'a pas pris. */
ok('la liste en mémoire suit', /_allPatients/.test(bloc));
ok('le patient courant suit', /_currentPatient/.test(bloc));
ok('la liste est redessinée', /renderPatients\(/.test(bloc));
ok('… et le cache local aussi', /R4P_KEYS\.PATIENT/.test(bloc));
/* Les autres onglets tiennent leur propre copie du patient : sans re-diffusion,
   le programme et les outils garderaient l'ancienne date. */
ok('les autres onglets sont prévenus', /_broadcastPatient\(/.test(bloc));
ok('une erreur d\'écriture ne passe pas sous silence', /res\.error/.test(bloc));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Date de naissance : tous les cas passent.');

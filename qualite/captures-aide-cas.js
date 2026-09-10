#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Captures du centre d'aide — la garde du compte de démo

   Les images de aide/img/ sont PUBLIQUES. Un patient de démo ne suffit pas à
   les protéger : « Vue d'ensemble » et « Liste » montrent TOUS les patients du
   compte, « Mon compte » la vraie signature et le vrai tampon. Seul un compte
   séparé protège chaque écran — et le script refuse d'écrire la moindre image
   si la session n'est pas la sienne.

   On EXÉCUTE la vraie décision (`refusCompte`) et la vraie lecture de la liste
   (`attendues`), et l'on lance le vrai script pour la garde du profil.

     node qualite/captures-aide-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const R = path.join(__dirname, '..');
const SCRIPT = path.join(R, '.claude', 'skills', 'captures-aide', 'scripts', 'captures.js');
let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

if (!fs.existsSync(SCRIPT)) { console.log('  ✗ script de capture introuvable'); process.exit(1); }
const C = require(SCRIPT);
if (typeof C.refusCompte !== 'function' || typeof C.attendues !== 'function') {
  console.log('  ✗ le script n\'expose plus refusCompte / attendues — la garde n\'est plus vérifiable');
  process.exit(1);
}

console.log('\nLa garde : aucune image hors du compte de démo');
ok('le compte de démo passe', C.refusCompte('demo@exemple.fr', 'demo@exemple.fr') === '');
ok('… quelle que soit la casse de l\'adresse',
   C.refusCompte('Demo@Exemple.FR', 'demo@exemple.fr') === '');
/* LE CAS POUR LEQUEL LA GARDE EXISTE : le praticien est resté connecté sur son
   vrai compte. Chaque écran montrerait ses vrais patients. */
ok('le vrai compte du praticien est REFUSÉ',
   C.refusCompte('ap.kine92@gmail.com', 'demo@exemple.fr') !== '');
/* Une session absente ou expirée : l'app retomberait sur la connexion. */
ok('une session absente est refusée', C.refusCompte('', 'demo@exemple.fr') !== '');
/* Sans compte de démo déclaré, rien ne dit ce qui est autorisé : on refuse
   tout, plutôt que d'accepter n'importe quelle session. */
ok('sans compte de démo déclaré, tout est refusé',
   C.refusCompte('demo@exemple.fr', '') !== '' && C.refusCompte('', '') !== '');
/* Un préfixe ou un suffixe ne vaut pas égalité : « demo@exemple.fr.evil »
   ne doit pas passer pour le compte de démo. */
ok('une adresse qui ne fait que CONTENIR la démo est refusée',
   C.refusCompte('demo@exemple.fr.autre', 'demo@exemple.fr') !== ''
   && C.refusCompte('x-demo@exemple.fr', 'demo@exemple.fr') !== '');

/* UNE FONCTION JUSTE QUE PERSONNE N'APPELLE ne protège rien — le piège vécu
   deux fois cette semaine. `captures()` doit consulter la garde AVANT toute
   écriture, et s'arrêter sur son refus. Contrôle de TEXTE, assumé comme tel :
   l'exécuter demande un vrai Chrome et le réseau, trop fragile pour la suite.
   La preuve d'exécution se fait à la main (voir SKILL.md, « Vérifier la
   garde »). */
const src = fs.readFileSync(SCRIPT, 'utf8');
const dC = src.indexOf('async function captures(');
const corps = dC > 0 ? src.slice(dC, src.indexOf('\n}\n', dC)) : '';
const iGarde = corps.indexOf('refusCompte(');
const iEcrit = corps.indexOf('.screenshot(');
ok('captures() consulte la garde avant la première écriture',
   iGarde > 0 && iEcrit > 0 && iGarde < iEcrit, 'garde ' + iGarde + ', écriture ' + iEcrit);
ok('… et s\'arrête sur son refus', /if \(refus\) \{[^}]*stop\(/.test(corps));
ok('connexion() la consulte aussi', /refusCompte\(email, demo\)/.test(src));

console.log('\nLa liste attendue est lue dans le contenu réel');
const att = C.attendues();
/* Recompter indépendamment dans js/aide-content.js : si les deux divergent,
   une capture serait oubliée en silence. */
const vm = require('vm');
const ctx = { window: {} }; ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8')
  + ';this.__A=(typeof R4P_AIDE!=="undefined"?R4P_AIDE:window.R4P_AIDE);', ctx);
let n = 0;
ctx.__A.sections.forEach(s => (s.articles || []).forEach(a => (a.etapes || []).forEach(e => { if (e && e.img) n++; })));
ok('autant de captures que d\'étapes marquées img', att.length === n, att.length + ' contre ' + n);
/* Le nom doit être EXACTEMENT celui que le centre d'aide cherche : un écart
   d'un caractère et l'image existe sans jamais s'afficher. */
const aide = fs.readFileSync(path.join(R, 'aide.html'), 'utf8');
ok('le centre d\'aide cherche bien aide/img/<section>-<article>-<n>.png',
   /'aide\/img\/'\s*\+\s*secId\s*\+\s*'-'\s*\+\s*artId\s*\+\s*'-'\s*\+\s*n\s*\+\s*'\.png'/.test(aide));
ok('les noms suivent ce motif', att.every(c => /^[a-z0-9-]+-[a-z0-9-]+-\d+\.png$/.test(c.fichier)));
ok('aucun nom en double', new Set(att.map(c => c.fichier)).size === att.length);

console.log('\nLa session ne vit jamais dans le dépôt');
/* Netlify publie la RACINE : un profil Chrome rangé dans le dépôt servirait
   le jeton de session à tout le monde. On lance le VRAI script. */
const dansDepot = path.join(R, '.garde-cas');
const r = spawnSync(process.execPath, [SCRIPT, '--liste'], { env: Object.assign({}, process.env, { HOME: dansDepot }), encoding: 'utf8' });
ok('un profil qui tomberait dans le dépôt fait refuser le démarrage', r.status === 1, 'code ' + r.status);
ok('… sans rien y créer', !fs.existsSync(dansDepot));
/* Et node_modules ne doit jamais partir en ligne. */
const gi = fs.readFileSync(path.join(R, '.gitignore'), 'utf8');
ok('les dépendances des skills sont exclues du dépôt', /^\.claude\/skills\/\*\/node_modules\/$/m.test(gi));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Captures du centre d\'aide : tous les cas passent.');

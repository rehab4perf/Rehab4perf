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

console.log('\nLes options de lancement sont acceptables par Playwright');
/* La premiere version passait `deviceScaleFactor` a la fenetre de CONNEXION,
   de taille libre (`viewport: null`). Playwright refuse les deux ensemble et
   levait AVANT d'ouvrir la fenetre : le mode connexion n'a jamais tourne, et
   aucun contrôle ne l'a vu — seuls les chemins sans fenetre avaient ete
   essayes. On verifie la combinaison, sans lancer Chrome. */
if (typeof C.optionsLancement !== 'function') {
  ok('le script expose optionsLancement', false);
} else {
  const co = C.optionsLancement(false), ca = C.optionsLancement(true);
  ok('connexion : fenêtre visible, de taille libre', co.headless === false && co.viewport === null);
  ok('… et SANS deviceScaleFactor, que Playwright refuse avec une taille libre',
     !('deviceScaleFactor' in co), JSON.stringify(co));
  ok('captures : taille fixe 1280×800', ca.viewport && ca.viewport.width === 1280 && ca.viewport.height === 800);
  ok('… en Retina ×2', ca.deviceScaleFactor === 2);
  ok('les deux pilotent le Chrome installé', co.channel === 'chrome' && ca.channel === 'chrome');
}

console.log('\nLes captures ne peuvent RIEN écrire');
/* Une recette clique dans l'app : un clic de trop sur « Sauvegarder » ou
   « Envoyer » modifierait le compte de démo. Toute écriture vers Supabase est
   coupée au réseau ; seuls passent les lectures et le rafraîchissement du
   jeton, sans lequel la session expirerait en cours de route. */
if (typeof C.ecritureInterdite !== 'function') {
  ok('le script expose ecritureInterdite', false);
} else {
  const B = 'https://sxdobjodxkwexaspepdm.supabase.co';
  const E = C.ecritureInterdite;
  ok('une lecture passe',                         !E('GET', B + '/rest/v1/patients?select=*'));
  ok('un insert est coupé',                        E('POST', B + '/rest/v1/bilans'));
  ok('une mise à jour est coupée',                 E('PATCH', B + '/rest/v1/patients?id=eq.1'));
  ok('une suppression est coupée',                 E('DELETE', B + '/rest/v1/calendar_events?id=eq.1'));
  ok('un appel de fonction est coupé',             E('POST', B + '/functions/v1/notify-athlete'));
  ok('la casse de la méthode ne change rien',      E('post', B + '/rest/v1/bilans'));
  /* Et dans l'autre sens : une LECTURE en minuscules doit passer. Sans mise en
     majuscules elle serait coupée — trop bloquer est le sens sûr, mais une
     capture privée de ses données se tromperait d'écran sans le dire. */
  ok('une lecture en minuscules passe',            !E('get', B + '/rest/v1/patients?select=*'));
  /* Sans lui, la session expire en plein lancement et l'on capture la page de
     connexion à la place de l'étape. */
  ok('le rafraîchissement du jeton passe',        !E('POST', B + '/auth/v1/token?grant_type=refresh_token'));
  /* Mais pas une autre route d'authentification : se déconnecter, changer de
     mot de passe, c'est écrire. */
  ok('une autre écriture d\'authentification est coupée', E('POST', B + '/auth/v1/logout'));
  /* Une URL signée de fichier se demande en POST mais ne modifie rien : sans
     elle, logo, signature et tampon manquent aux captures. */
  ok('une URL signée de fichier passe',            !E('POST', B + '/storage/v1/object/sign/praticien-profil/u/logo.png'));
  /* … mais PAS le téléversement ni la suppression d'un fichier. */
  ok('téléverser un fichier est coupé',            E('POST', B + '/storage/v1/object/praticien-profil/u/logo.png'));
  ok('supprimer un fichier est coupé',             E('DELETE', B + '/storage/v1/object/praticien-profil/u/logo.png'));
  ok('« sign » ailleurs dans l\'adresse ne suffit pas', E('POST', B + '/rest/v1/sign/x'));
  /* Un hôte qui ne fait que CONTENIR « supabase.co » n'est pas Supabase. */
  ok('un faux hôte n\'est pas pris pour Supabase',   !E('POST', 'https://supabase.co.exemple.fr/rest/v1/x'));
  ok('les fichiers de l\'app ne sont pas touchés',   !E('GET', 'https://app.rehab4perf.com/js/bilan.js'));
  /* Posée AVANT le premier chargement : une écriture déclenchée à l'ouverture
     de l'app passerait sinon avant la coupure. Contrôle de texte, assumé ; la
     preuve d'exécution se fait en lançant une vraie capture. */
  const dCa = src.indexOf('async function captures(');
  const cCa = src.slice(dCa, src.indexOf('\n}\n', dCa));
  const iRoute = cCa.indexOf('ctx.route('), iGoto = cCa.indexOf('page.goto(');
  ok('la coupure est posée avant le premier chargement', iRoute > 0 && iGoto > 0 && iRoute < iGoto,
     'route ' + iRoute + ', chargement ' + iGoto);
}

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

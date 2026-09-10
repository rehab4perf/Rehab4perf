#!/usr/bin/env node
/* Captures du centre d'aide — voir ../SKILL.md
   La regle qui passe avant tout : ces images sont PUBLIQUES. Le script refuse
   d'ecrire la moindre image si la session n'est pas celle du compte de demo. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const DEPOT   = path.resolve(__dirname, '..', '..', '..', '..');
const SORTIE  = path.join(DEPOT, 'aide', 'img');
const RACINE  = path.join(os.homedir(), '.rehab4perf-captures');
const PROFIL  = path.join(RACINE, 'profil');
const CONFIG  = path.join(RACINE, 'config.json');
const APP     = 'https://app.rehab4perf.com/';
const CLE_SESSION = 'sb-sxdobjodxkwexaspepdm-auth-token';
const VUE     = { width: 1280, height: 800 };

function stop(msg) { console.error('\n  ✗ ' + msg + '\n'); process.exit(1); }

/* La session contient un jeton d'acces. Netlify publie la RACINE du depot :
   un profil range dedans serait servi a tout le monde. */
if (PROFIL.startsWith(DEPOT + path.sep)) stop('le profil Chrome tomberait dans le dépôt — refus.');

/* ── La liste attendue est LUE dans le contenu reel ─────────────────────────
   Jamais tenue a la main : une capture ajoutee au centre d'aide doit
   apparaitre d'office, pas etre oubliee en silence. */
function attendues() {
  const ctx = { window: {} }; ctx.self = ctx.window; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DEPOT, 'js', 'aide-content.js'), 'utf8')
    + ';this.__A = (typeof R4P_AIDE !== "undefined" ? R4P_AIDE : window.R4P_AIDE);', ctx);
  const out = [];
  ctx.__A.sections.forEach(s => (s.articles || []).forEach(a => (a.etapes || []).forEach((e, i) => {
    if (e && e.img) out.push({ fichier: `${s.id}-${a.id}-${i + 1}.png`, ou: `${s.titre} › ${a.titre}`, etape: e.t });
  })));
  return out;
}

/* LA GARDE, en une fonction pour qu'un fichier de cas puisse l'EXECUTER.
   Rend '' si la session est celle du compte de demo, sinon la raison du refus.
   Egalite STRICTE apres mise en minuscules : « contient » laisserait passer
   « x-demo@… » ou « demo@….autre ». Sans compte declare, tout est refuse —
   rien ne dit alors ce qui est autorise. */
function refusCompte(email, demo) {
  email = String(email || '').trim().toLowerCase();
  demo  = String(demo  || '').trim().toLowerCase();
  if (!demo)  return 'aucun compte de démo déclaré';
  if (!email) return 'aucune session ouverte (expirée ?)';
  if (email !== demo) return 'session ouverte en ' + email + ', qui n\'est PAS le compte de démo ' + demo;
  return '';
}

function lireConfig() { try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { return {}; } }

async function emailSession(page) {
  try {
    return await page.evaluate(k => {
      try { return (JSON.parse(localStorage.getItem(k)).user.email || '').toLowerCase(); }
      catch (e) { return ''; }
    }, CLE_SESSION);
  } catch (e) { return ''; }                       // page en cours de navigation
}

function lancer(headless) {
  const { chromium } = require('playwright-core');
  fs.mkdirSync(PROFIL, { recursive: true, mode: 0o700 });
  return chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless,
    viewport: headless ? VUE : null, deviceScaleFactor: 2
  });
}

/* ── connexion : le praticien se connecte LUI-MEME ──────────────────────── */
async function connexion(demo) {
  if (!demo || !/@/.test(demo)) stop('indiquer le compte de démo : connexion --demo adresse@exemple.fr');
  demo = demo.toLowerCase();
  const ctx = await lancer(false);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(APP);
  console.log('\n  Connecte-toi avec le compte de DÉMO (' + demo + ') dans la fenêtre Chrome.');
  console.log('  J\'attends jusqu\'à 10 minutes…\n');
  let email = '';
  /* Boucle cote Node, pas `waitForFunction` : la connexion traverse une
     navigation auth.html → index.html, qui detruit le contexte d'execution. */
  for (let t = 0; t < 400 && !email; t++) {
    email = await emailSession(page);
    if (!email) await new Promise(r => setTimeout(r, 1500));
  }
  await ctx.close();
  if (!email) stop('aucune connexion détectée.');
  const refus = refusCompte(email, demo);
  if (refus) stop(refus + '. Rien n\'est enregistré comme compte de capture.');
  fs.mkdirSync(RACINE, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG, JSON.stringify({ demo }, null, 2), { mode: 0o600 });
  console.log('  ✓ Session de démo enregistrée hors du dépôt (' + RACINE + ').\n');
}

/* ── --liste : l'etat, sans navigateur ──────────────────────────────────── */
function liste() {
  const R = require('./recettes');
  const tout = attendues();
  let faites = 0, pretes = 0;
  tout.forEach(c => {
    const la = fs.existsSync(path.join(SORTIE, c.fichier));
    const rec = !!R.RECETTES[c.fichier];
    if (la) faites++; else if (rec) pretes++;
    console.log((la ? '  ✓ ' : rec ? '  ○ ' : '  · ') + c.fichier.padEnd(44) + c.etape);
  });
  console.log(`\n  ${faites} / ${tout.length} capturées · ${pretes} recette(s) prête(s) · `
    + `${tout.length - faites - pretes} sans recette\n  (✓ fichier présent · ○ recette prête · · sans recette)\n`);
}

/* ── captures ────────────────────────────────────────────────────────────── */
async function captures(seule) {
  const R = require('./recettes');
  const cfg = lireConfig();
  if (!cfg.demo) stop('aucun compte de démo enregistré : lancer d\'abord « connexion --demo … ».');
  let cibles = attendues();
  if (seule) {
    cibles = cibles.filter(c => c.fichier === seule);
    if (!cibles.length) stop(seule + ' n\'est pas une capture attendue par le centre d\'aide.');
  }
  const ctx = await lancer(true);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(APP, { waitUntil: 'networkidle' });

  /* LA GARDE. Une seule fois par lancement suffit — le compte ne change pas
     en cours de route — mais elle est absolue : aucune image sans elle. */
  const refus = refusCompte(await emailSession(page), cfg.demo);
  if (refus) { await ctx.close(); stop(refus + '. AUCUNE image écrite — relancer « connexion --demo ' + cfg.demo + ' » si la session a expiré.'); }

  fs.mkdirSync(SORTIE, { recursive: true });
  const bilan = { ok: [], sans: [], echec: [] };
  for (const c of cibles) {
    const rec = R.RECETTES[c.fichier];
    if (!rec) { bilan.sans.push(c.fichier); continue; }
    try {
      await page.goto(APP, { waitUntil: 'networkidle' });   // chaque recette part d'un etat connu
      const cible = await rec(R.outils(page));
      /* Une session expiree en cours de route ramene sur la connexion : on
         capturerait l'ecran de login a la place de l'etape. */
      if (/auth\.html/.test(page.url())) throw new Error('retombé sur auth.html — session expirée');
      const tmp = path.join(SORTIE, '.' + c.fichier + '.tmp.png');
      if (cible) await cible.screenshot({ path: tmp });
      else await page.screenshot({ path: tmp });
      fs.renameSync(tmp, path.join(SORTIE, c.fichier));    // jamais d'image a moitie ecrite
      bilan.ok.push(c.fichier);
      console.log('  ✓ ' + c.fichier);
    } catch (e) {
      bilan.echec.push(c.fichier + ' — ' + e.message.split('\n')[0]);
      console.log('  ✗ ' + c.fichier + ' — ' + e.message.split('\n')[0]);
    }
  }
  await ctx.close();
  console.log(`\n  ${bilan.ok.length} capturée(s) · ${bilan.echec.length} en échec · ${bilan.sans.length} sans recette\n`);
  if (bilan.echec.length) process.exit(1);
}

module.exports = { refusCompte, attendues };

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  (async () => {
    if (a[0] === 'connexion') return connexion(opt('--demo'));
    if (a.includes('--liste')) return liste();
    return captures(opt('--seule'));
  })().catch(e => stop(e.message));
}

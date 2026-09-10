#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Illustrations du centre d'aide — schémas dessinés (`svg:` dans aide-content)

   Un schéma remplace une capture quand la capture exigerait des données
   qu'on ne peut pas montrer : les étapes Strava auraient demandé un compte
   Strava réel, dont le tracé GPS aurait fini sur une page publique.

   Trois règles, et la troisième est MESURÉE, pas décrétée :

   1. Chaque schéma est BIEN FORMÉ — il est injecté tel quel dans la page
      (`.aide-svg`) et dans le tiroir (`.help-svg`). Une balise mal fermée
      avale la suite de l'article, sans erreur.
   2. Chaque schéma est ACCESSIBLE : `role="img"` et un `aria-label` qui dit ce
      qu'il montre — un lecteur d'écran ne lit pas un dessin.
   3. Chaque schéma est LISIBLE DANS LE TIROIR. Le tiroir fait 380 px, soit
      ~348 px de contenu : un schéma de 600 unités y est réduit à 58 %. Le
      premier jet mettait le badge « S 4.7km 30min » — l'information même de
      l'illustration — à 7 px. Plancher : 8 px une fois réduit.

     node qualite/aide-illustrations-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const R = path.join(__dirname, '..');
const LARGEUR_TIROIR = 348;          // 380 px moins les marges du corps du tiroir
const PLANCHER_PX = 8;

/* Exceptions CONNUES, nommées — jamais implicites. Elles ne doivent que
   disparaître : un schéma ajouté demain n'y entre pas. */
const EXCEPTIONS_LISIBILITE = {
  /* Antérieure à la règle : 15 pathologies placées sur une pyramide, trop
     dense pour 348 px. À reprendre en version tiroir, ou à réserver à la page
     complète. */
  'Pyramide de La Clinique du Coureur': 'antérieure à la règle — à reprendre'
};

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

const ctx = { window: {} }; ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8')
  + ';this.__A=(typeof R4P_AIDE!=="undefined"?R4P_AIDE:window.R4P_AIDE);', ctx);
const A = ctx.__A;

const schemas = [];
A.sections.forEach(s => (s.articles || []).forEach(a => (a.etapes || []).forEach((e, i) => {
  if (e && e.svg) schemas.push({ ou: `${s.id}/${a.id} étape ${i + 1}`, svg: e.svg, img: !!e.img });
})));

/* Contrôle de bonne formation, sans dépendance : pile des balises ouvertes. */
function bienForme(svg) {
  const pile = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, ferme, nom, , auto] = m;
    if (auto) continue;
    if (!ferme) { pile.push(nom); continue; }
    if (pile.pop() !== nom) return 'fermeture </' + nom + '> inattendue';
  }
  return pile.length ? 'balise <' + pile[pile.length - 1] + '> jamais fermée' : '';
}

/* Plus petite police du schéma, HÉRITAGE COMPRIS : un <text> sans taille prend
   celle du <g> qui l'enveloppe. Ignorer l'héritage laisserait passer un groupe
   entier en petit corps. */
function plusPetitePolice(svg) {
  const pile = [], tailles = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, ferme, nom, attrs, auto] = m;
    if (ferme) { pile.pop(); continue; }
    const fs = /font-size="([\d.]+)"/.exec(attrs);
    const herite = fs ? parseFloat(fs[1]) : (pile.length ? pile[pile.length - 1] : null);
    if (nom === 'text') tailles.push(herite == null ? 16 : herite);   // 16 : défaut navigateur
    if (!auto) pile.push(herite);
  }
  return tailles.length ? Math.min(...tailles) : null;
}

console.log('\nChaque schéma est bien formé, accessible et lisible dans le tiroir');
ok('le contenu porte des schémas', schemas.length > 0);
schemas.forEach(c => {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(c.svg);
  const label = (/aria-label="([^"]*)"/.exec(c.svg) || [])[1] || '';
  const err = bienForme(c.svg);
  ok(c.ou + ' : bien formé', !err, err);
  ok(c.ou + ' : role="img" et aria-label', /role="img"/.test(c.svg) && label.length > 20, label || 'aucun');
  ok(c.ou + ' : viewBox déclaré', !!vb);
  const exc = Object.keys(EXCEPTIONS_LISIBILITE).find(k => label.indexOf(k) === 0);
  if (vb && !exc) {
    const px = plusPetitePolice(c.svg) * LARGEUR_TIROIR / parseFloat(vb[1]);
    ok(c.ou + ' : lisible dans le tiroir (≥ ' + PLANCHER_PX + ' px)', px >= PLANCHER_PX - 1e-9,
       'plus petite police ' + px.toFixed(1) + ' px');
  }
  /* Une étape porte un schéma OU une capture : les deux à la fois afficheraient
     l'image « Capture à venir » sous un schéma qui la rend inutile. */
  ok(c.ou + ' : pas de capture en plus du schéma', !c.img);
});

console.log('\nLes étapes Strava sont illustrées, pas capturées');
/* Elles auraient exigé un compte Strava réel — et son tracé GPS sur une page
   publique. La connexion, elle, reste une vraie capture : elle ne montre que
   le menu de l'app. */
const strava = A.sections.find(s => s.id === 'strava');
const etape = (art, n) => ((strava.articles.find(a => a.id === art) || {}).etapes || [])[n - 1] || {};
[['liaison-auto', 1], ['lier-manuel', 1], ['panneau-strava', 1]].forEach(([art, n]) => {
  const e = etape(art, n);
  ok(`strava/${art} étape ${n} : un schéma`, !!e.svg);
  ok(`strava/${art} étape ${n} : plus de capture attendue`, !e.img);
});
ok('strava/connecter-strava étape 1 : reste une vraie capture', !!etape('connecter-strava', 1).img);

console.log('\nLa charge, l\'ACWR et les courbes sont illustrées');
/* Des captures réelles auraient demandé des semaines de retours d'athlète dans
   le compte de démo ; avec deux retours, l'ACWR aurait affiché un « risque »
   fabriqué. Décision du praticien : schémas, comme pour Strava. */
const sec = id => A.sections.find(s => s.id === id);
const et = (sid, art, n) => (((sec(sid) || {}).articles || []).find(a => a.id === art) || {}).etapes?.[n - 1] || {};
[['charges', 'bilan-charge', 1], ['charges', 'acwr', 2], ['programme', 'journal-evolution', 2]].forEach(([sid, art, n]) => {
  const e = et(sid, art, n);
  ok(`${sid}/${art} étape ${n} : un schéma`, !!e.svg);
  ok(`${sid}/${art} étape ${n} : plus de capture attendue`, !e.img);
});

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Illustrations du centre d\'aide : tous les cas passent.');

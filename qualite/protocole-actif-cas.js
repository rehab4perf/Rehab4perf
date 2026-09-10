#!/usr/bin/env node
/* Cas de référence — « Mon protocole » dans l'espace athlète.
 *
 * `_loadActiveProto()` (athlete.html) résolvait le protocole actif du patient
 * UNIQUEMENT dans la ligne `templates` `__r4p_protocols_meta__` du praticien.
 * Or cette ligne n'est créée qu'à la PREMIÈRE ouverture du panneau Protocoles
 * dans le builder, qui la sème depuis la bibliothèque intégrée. Tant que le
 * praticien ne l'avait pas ouvert, la section restait vide — alors que le
 * builder, lui, retombe déjà sur `PROTOCOLS_REF`. Rien ne le signalait :
 * pas d'erreur, une section simplement absente.
 *
 * Constaté le 2026-09-10 sur le compte de démo : protocole `lca` / phase `p1`
 * affecté à 08:22, ligne meta créée à 09:15. Entre les deux, le patient ne
 * voyait pas son protocole.
 *
 * La bibliothèque vit désormais dans `js/protocoles-ref.js`, chargé par les
 * deux pages. La meta garde la priorité (c'est là que vivent les versions
 * modifiées par le praticien) ; la bibliothèque ne sert que pour un protocole
 * que la meta n'a pas.
 *
 * Le cas exécute le VRAI `_loadActiveProto`, le vrai `_entetes` et le vrai
 * `_buildProtoBanner` d'athlete.html, avec la vraie bibliothèque, contre un
 * faux PostgREST. Aucune requête ne part vers la vraie base.
 *
 *   node qualite/protocole-actif-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var R = path.join(__dirname, '..');
function lire(f) { return fs.readFileSync(path.join(R, f), 'utf8'); }

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function conclure() {
  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Protocole actif de l\'athlète : tous les cas passent.');
}
function tranche(src, debut, fin, nom) {
  var a = src.indexOf(debut);
  var b = a < 0 ? -1 : src.indexOf(fin, a + debut.length);
  if (a < 0 || b < 0) { console.error('Bornes introuvables : ' + nom); process.exit(1); }
  return src.slice(a, b);
}

var athlete = lire('athlete.html');
var programme = lire('programme.html');
var main = lire('js/prog-main.js');

console.log('\nUne seule bibliothèque, chargée par les deux pages');
var REF_JS = 'js/protocoles-ref.js';
var existe = fs.existsSync(path.join(R, REF_JS));
ok('la bibliothèque intégrée vit dans ' + REF_JS, existe, 'fichier absent');
if (!existe) conclure();
ok('prog-main.js ne la définit plus (une seule source)', main.indexOf('var PROTOCOLS_REF') < 0);
var iAth = athlete.indexOf('<script src="' + REF_JS + '?v=');
ok('athlete.html la charge, avec un numéro de version', iAth >= 0);
ok('… avant le script qui résout le protocole actif',
   iAth >= 0 && iAth < athlete.indexOf('function _loadActiveProto'));
var iProg = programme.indexOf('<script src="' + REF_JS + '?v=');
ok('programme.html la charge, avec un numéro de version', iProg >= 0);
ok('… avant prog-main.js', iProg >= 0 && iProg < programme.indexOf('<script src="js/prog-main.js'));

/* Le vrai script de bump, à blanc : il doit connaître ce maillon, sans quoi
   une modification de la bibliothèque resterait dans le cache des deux pages. */
var bump = '';
try {
  bump = cp.execFileSync('node', [path.join(R, '.claude/skills/deployer/scripts/bump-versions.js'),
    '--dry-run', '--files', REF_JS], { cwd: R, encoding: 'utf8' });
} catch (e) { bump = String(e.stdout || '') + String(e.stderr || ''); }
['programme.html — ' + REF_JS, 'athlete.html — ' + REF_JS, 'index.html — programme.html', 'sw-pro.js', 'sw.js']
  .forEach(function (l) { ok('bump-versions.js fait bouger « ' + l + ' »', bump.indexOf(l) >= 0, bump.trim().split('\n').join(' | ')); });

/* ── Le vrai code d'athlete.html ── */
var srcEntetes = tranche(athlete, 'function _entetes(extra){', '\n}', '_entetes') + '\n}';
var srcProto = tranche(athlete, 'function _loadActiveProto(){', '/* ── Bandeau cycle actuel', 'protocole actif');
var srcRef = lire(REF_JS);

function escH(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function page(fetch, document) {
  /* eslint-disable no-new-func */
  return new Function('fetch', 'document', 'escH',
    'var SUPA_URL = "https://base.test", SUPA_KEY = "cle-publique";\n' +
    'var _patientId = "pat-1", _progId = "", _pratId = "prat-1";\n' +
    'var _activeProtoData = null;\n' +
    srcRef + '\n' + srcEntetes + '\n' + srcProto + '\n' +
    'return { charger: _loadActiveProto, donnees: function(){ return _activeProtoData; },\n' +
    '  ref: function(){ return PROTOCOLS_REF; }, sansPrat: function(){ _pratId = ""; } };'
  )(fetch, document, escH);
}

/* ── Faux PostgREST ── */
function serveur(o) {
  var s = { appels: [] };
  function rep(status, corps) {
    return Promise.resolve({ ok: status < 300, status: status,
      json: function () { return Promise.resolve(JSON.parse(JSON.stringify(corps))); } });
  }
  s.fetch = function (url, opts) {
    var u = new URL(url);
    s.appels.push({ chemin: u.pathname, q: u.searchParams, entetes: (opts && opts.headers) || {} });
    if (u.pathname === '/rest/v1/patient_protocols') return rep(200, o.pp ? [o.pp] : []);
    if (u.pathname === '/rest/v1/templates') {
      if (o.metaRefusee) return rep(401, { code: '42501', message: 'permission denied for table templates' });
      if (!o.meta) return rep(200, []);
      return rep(200, [{ donnees: o.metaEnChaine ? JSON.stringify(o.meta) : o.meta }]);
    }
    if (u.pathname === '/rest/v1/protocol_criteria_checks') return rep(200, o.checks || []);
    return rep(404, {});
  };
  return s;
}

function attendre() { return new Promise(function (r) { setTimeout(r, 20); }); }

async function scenario(o) {
  var srv = serveur(o);
  var slot = { rendus: 0, _h: '' };
  Object.defineProperty(slot, 'innerHTML', {
    get: function () { return this._h; }, set: function (v) { this._h = v; this.rendus++; } });
  var P = page(srv.fetch, { getElementById: function (id) { return id === 'proto-banner-slot' ? slot : null; } });
  if (o.sansPrat) P.sansPrat();
  var erreur = null;
  try { P.charger(); await attendre(); } catch (e) { erreur = e; }
  return { d: P.donnees(), html: slot.innerHTML, rendus: slot.rendus, srv: srv, erreur: erreur };
}

(async function () {
  var REF = page(function () {}, {}).ref();
  var lca = REF.find(function (p) { return p.id === 'lca'; });
  var p1 = lca && (lca.phases || []).find(function (ph) { return ph.id === 'p1'; });
  if (!lca || !p1 || !(p1.exitCriteria || []).length) {
    console.error('Bibliothèque : protocole lca / phase p1 (avec critères) introuvable'); process.exit(1);
  }
  var crit0 = p1.exitCriteria[0];
  var pp = { id: 7, patient_id: 'pat-1', praticien_id: 'prat-1', protocol_id: 'lca',
             current_phase_id: 'p1', status: 'active' };
  var checks = [{ phase_id: 'p1', criteria_index: 0, checked: true },
                { phase_id: 'p0', criteria_index: 1, checked: true }];   // autre phase : ignorée

  /* La version du cabinet : LCA modifié par le praticien. */
  var lcaCabinet = JSON.parse(JSON.stringify(lca));
  lcaCabinet.name = 'LCA — version du cabinet'; lcaCabinet.userModified = true; delete lcaCabinet.isBuiltin;
  lcaCabinet.phases.forEach(function (ph) { if (ph.id === 'p1') ph.exitCriteria = ['Critère maison du cabinet']; });
  var autre = REF.find(function (p) { return p.id !== 'lca'; });

  console.log('\nPas encore de ligne meta : la bibliothèque intégrée prend le relais');
  var r = await scenario({ pp: pp, checks: checks });
  ok('le protocole actif est résolu', !!(r.d && r.d.proto && r.d.proto.id === 'lca'), JSON.stringify(r.d));
  ok('… avec sa phase en cours', !!(r.d && r.d.phase && r.d.phase.id === 'p1'));
  ok('la section « Mon protocole » s\'affiche', r.html.indexOf('Mon protocole') >= 0, r.html.slice(0, 80) || '(vide)');
  ok('… avec les critères de la phase', r.html.indexOf(escH(crit0)) >= 0);
  ok('… et les cases cochées de CETTE phase seulement',
     r.html.indexOf('1 / ' + p1.exitCriteria.length) >= 0, (r.html.match(/\d+ \/ \d+/) || ['(aucun compteur)'])[0]);

  r = await scenario({ pp: pp, checks: checks, meta: { protocols: [autre] } });
  ok('meta présente mais sans ce protocole : la bibliothèque prend le relais',
     !!(r.d && r.d.proto.id === 'lca' && r.d.phase.id === 'p1'));

  r = await scenario({ pp: pp, checks: checks, metaRefusee: true });
  ok('lecture de la meta refusée : la bibliothèque prend le relais',
     !!(r.d && r.d.proto.id === 'lca') && r.html.indexOf('Mon protocole') >= 0);

  r = await scenario({ pp: pp, checks: checks, sansPrat: true });
  ok('praticien inconnu (aucune meta possible) : la bibliothèque prend le relais',
     !!(r.d && r.d.proto.id === 'lca'));

  console.log('\nLa ligne meta existe : sa version l\'emporte');
  var parForme = [{ lib: 'jsonb décodé', enChaine: false }, { lib: 'jsonb en chaîne', enChaine: true }];
  for (var k = 0; k < parForme.length; k++) {
    r = await scenario({ pp: pp, checks: checks, meta: { protocols: [autre, lcaCabinet] }, metaEnChaine: parForme[k].enChaine });
    ok('la version du cabinet est retenue (' + parForme[k].lib + ')',
       !!(r.d && r.d.proto.name === 'LCA — version du cabinet' && r.d.proto.userModified === true),
       r.d ? r.d.proto.name : 'rien');
    ok('… ce sont ses critères qui s\'affichent, pas ceux de la bibliothèque',
       r.html.indexOf('Critère maison du cabinet') >= 0 && r.html.indexOf(escH(crit0)) < 0);
  }
  var sansP1 = JSON.parse(JSON.stringify(lcaCabinet));
  sansP1.phases = sansP1.phases.filter(function (ph) { return ph.id !== 'p1'; });
  r = await scenario({ pp: pp, checks: checks, meta: { protocols: [sansP1] } });
  ok('la meta fait foi même quand sa version n\'a plus la phase — pas de mélange avec la bibliothèque',
     r.d === null && r.html === '', r.d ? r.d.proto.name + ' / ' + r.d.phase.id : '');

  console.log('\nProtocole inconnu des deux : rien, sans erreur');
  var inconnu = Object.assign({}, pp, { protocol_id: 'protocole-disparu' });
  r = await scenario({ pp: inconnu });
  ok('sans meta : aucune section', r.d === null && r.html === '', JSON.stringify(r.d));
  ok('… et la section a bien été rendue (vide), sans exception', r.rendus >= 1 && !r.erreur, r.erreur && r.erreur.message);
  r = await scenario({ pp: inconnu, meta: { protocols: [lcaCabinet] } });
  ok('avec meta : aucune section', r.d === null && r.html === '');
  r = await scenario({ pp: Object.assign({}, pp, { current_phase_id: 'p-disparue' }) });
  ok('phase inconnue de la bibliothèque : aucune section', r.d === null && r.html === '');
  r = await scenario({ pp: null });
  ok('aucun protocole actif : aucune section, et pas de lecture de la meta',
     r.d === null && r.html === '' && !r.srv.appels.some(function (a) { return a.chemin === '/rest/v1/templates'; }));

  console.log('\nTout appel passe par _entetes() (RLS : x-r4p-patient)');
  r = await scenario({ pp: pp, checks: checks, meta: { protocols: [lcaCabinet] } });
  var nus = r.srv.appels.filter(function (a) { return a.entetes['x-r4p-patient'] !== 'pat-1' || a.entetes.apikey !== 'cle-publique'; });
  ok('les ' + r.srv.appels.length + ' appels REST portent l\'en-tête du lien', r.srv.appels.length === 3 && !nus.length,
     nus.map(function (a) { return a.chemin; }).join(', ') || r.srv.appels.length + ' appel(s)');
  var tpl = r.srv.appels.filter(function (a) { return a.chemin === '/rest/v1/templates'; })[0];
  ok('la meta lue est celle du praticien du protocole',
     !!tpl && tpl.q.get('nom') === 'eq.__r4p_protocols_meta__' && tpl.q.get('praticien_id') === 'eq.prat-1');

  conclure();
})();

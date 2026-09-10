#!/usr/bin/env node
/* Cas de référence — un compte Strava, un seul lien.
 *
 * Le callback OAuth rangeait le jeton par `upsert(..., { onConflict:
 * 'patient_id' })` : la clé de conflit était le PATIENT, pas le compte Strava.
 * Rien n'empêchait donc le même `strava_athlete_id` d'être relié à deux fiches
 * — fiche créée en double, lien de connexion envoyé à deux fiches.
 *
 * Le webhook, lui, cherche le patient par `.eq('strava_athlete_id', …)
 * .maybeSingle()`. Avec deux lignes, `maybeSingle()` rend une ERREUR : le
 * webhook répondait `500 token lookup failed`, Strava relançait puis
 * abandonnait. Chaque activité du compte était perdue, pour les deux fiches,
 * sans rien chez le praticien : le badge Strava restait allumé sur les deux.
 *
 * Règle retenue avec le praticien :
 *   - chez le MÊME praticien, le dernier relié l'emporte et l'ancien lien est
 *     retiré — c'est la correction naturelle d'une fiche en double, et
 *     l'application n'a aucun bouton « délier Strava » ;
 *   - chez un AUTRE praticien, refus, avec un message lisible par l'athlète
 *     (`?status=taken`) — on ne retire pas en silence le lien d'un confrère.
 *
 * Le webhook ne renvoie plus de 500 sur un doublon résiduel (base où la
 * contrainte n'est pas encore posée) : un doublon ne se résout jamais tout
 * seul, rejouer ne sert à rien. Il prend le lien le plus récent — la même
 * règle que le callback — et le signale dans les journaux.
 *
 * On exécute les VRAIES fonctions Deno : types retirés par Node, client
 * Supabase remplacé par une base en mémoire qui se comporte comme PostgREST
 * (`maybeSingle()` sur deux lignes → erreur, index uniques → violation).
 *
 *   node qualite/strava-lien-unique-cas.js
 */
'use strict';
process.removeAllListeners('warning'); // stripTypeScriptTypes est « expérimental » : bruit
var fs = require('fs'), path = require('path');
var stripTypeScriptTypes = require('module').stripTypeScriptTypes;
var RACINE = path.join(__dirname, '..');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* ── Base en mémoire, au comportement de PostgREST ─────────────────────── */
function fausseBase(tables, uniques, pannes) {
  uniques = uniques || {}; pannes = pannes || {};
  function from(nomTable) {
    var op = 'select', filtres = [], charge = null, conflit = null, tri = null;
    var rows = tables[nomTable] || (tables[nomTable] = []);
    function correspond(r) { return filtres.every(function (f) { return f(r); }); }
    function executer(mode) {
      if (pannes[nomTable + ':' + op]) {
        return Promise.resolve({ data: null, error: { message: 'panne simulée' } });
      }
      if (op === 'select') {
        var res = rows.filter(correspond).map(function (r) { return Object.assign({}, r); });
        if (tri) {
          res.sort(function (a, b) {
            var va = a[tri[0]], vb = b[tri[0]];
            if (va == null && vb == null) return 0;
            if (va == null) return 1;           // nullsFirst:false
            if (vb == null) return -1;
            return (va < vb ? -1 : va > vb ? 1 : 0) * (tri[1] ? 1 : -1);
          });
        }
        if (mode === 'maybeSingle' || mode === 'single') {
          if (res.length > 1) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } });
          if (!res.length && mode === 'single') return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
          return Promise.resolve({ data: res[0] || null, error: null });
        }
        return Promise.resolve({ data: res, error: null });
      }
      if (op === 'delete') {
        for (var i = rows.length - 1; i >= 0; i--) if (correspond(rows[i])) rows.splice(i, 1);
        return Promise.resolve({ data: null, error: null });
      }
      if (op === 'update') {
        rows.filter(correspond).forEach(function (r) { Object.assign(r, charge); });
        return Promise.resolve({ data: null, error: null });
      }
      if (op === 'upsert') {
        var lot = Array.isArray(charge) ? charge : [charge];
        for (var k = 0; k < lot.length; k++) {
          var neuf = lot[k];
          var cible = conflit ? rows.find(function (r) { return String(r[conflit]) === String(neuf[conflit]); }) : null;
          var fusion = Object.assign({}, cible || {}, neuf);
          var viol = (uniques[nomTable] || []).find(function (col) {
            return rows.some(function (r) { return r !== cible && String(r[col]) === String(fusion[col]); });
          });
          if (viol) return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint (' + viol + ')' } });
          if (cible) Object.assign(cible, neuf); else rows.push(fusion);
        }
        return Promise.resolve({ data: null, error: null });
      }
    }
    var b = {
      select: function () { return b; },
      eq:  function (c, v) { filtres.push(function (r) { return String(r[c]) === String(v); }); return b; },
      neq: function (c, v) { filtres.push(function (r) { return String(r[c]) !== String(v); }); return b; },
      in:  function (c, vs) { vs = vs.map(String); filtres.push(function (r) { return vs.indexOf(String(r[c])) >= 0; }); return b; },
      order: function (c, o) { tri = [c, !(o && o.ascending === false)]; return b; },
      limit: function () { return b; },
      delete: function () { op = 'delete'; return b; },
      update: function (p) { op = 'update'; charge = p; return b; },
      upsert: function (p, o) { op = 'upsert'; charge = p; conflit = o && o.onConflict; return b; },
      maybeSingle: function () { return executer('maybeSingle'); },
      single: function () { return executer('single'); },
      then: function (res, rej) { return executer().then(res, rej); },
    };
    return b;
  }
  return { from: from };
}

/* ── Charger une vraie fonction Deno ────────────────────────────────────── */
function chargerFonction(relatif, base, reponsesFetch) {
  var ts = fs.readFileSync(path.join(RACINE, relatif), 'utf8');
  var js = stripTypeScriptTypes(ts).replace(/^\s*import\s*\{\s*createClient\s*\}\s*from\s*['"][^'"]+['"]\s*;?/m, '');
  var handler = null, appels = [], journaux = [];
  var Deno = {
    env: { get: function (k) { return { APP_URL: 'https://app.test', SUPABASE_URL: 'https://sb.test' }[k] || 'x'; } },
    serve: function (h) { handler = h; },
  };
  function fetchFactice(url, init) {
    appels.push(String(url));
    var r = reponsesFetch(String(url), init);
    return Promise.resolve(new Response(JSON.stringify(r.corps || {}), { status: r.status || 200 }));
  }
  var consoleFactice = {
    log: function () {}, warn: function () {},
    error: function () { journaux.push(Array.prototype.join.call(arguments, ' ')); },
  };
  new Function('createClient', 'Deno', 'fetch', 'console', js)(
    function () { return base; }, Deno, fetchFactice, consoleFactice);
  if (!handler) throw new Error(relatif + ' : Deno.serve jamais appelé');
  return { handler: handler, appels: appels, journaux: journaux };
}

var FUTUR = Math.floor(Date.now() / 1000) + 6 * 3600;
function stravaOAuth(athleteId) {
  return function (url) {
    if (url.indexOf('strava.com/oauth/token') >= 0) {
      return { corps: { athlete: { id: athleteId }, access_token: 'acc-neuf', refresh_token: 'ref-neuf', expires_at: FUTUR, scope: 'read,activity:read_all' } };
    }
    return { corps: {} }; // strava-sync-history, lancée sans attendre
  };
}
function lancerCallback(tables, uniques, pannes, athleteId, patientId, praticienId) {
  var base = fausseBase(tables, uniques, pannes);
  var f = chargerFonction('supabase/functions/strava-oauth-callback/index.ts', base, stravaOAuth(athleteId));
  var req = new Request('https://sb.test/functions/v1/strava-oauth-callback?code=abc&state=' + encodeURIComponent(patientId + ':' + praticienId));
  return f.handler(req).then(function (res) {
    var loc = res.headers.get('location') || '';
    return { status: new URL(loc, 'https://x').searchParams.get('status'), res: res, f: f };
  });
}
function jeton(id, athlete, patient, praticien, maj) {
  return { id: id, strava_athlete_id: athlete, patient_id: patient, praticien_id: praticien,
           access_token: 'acc-' + id, refresh_token: 'ref-' + id,
           expires_at: new Date(FUTUR * 1000).toISOString(), updated_at: maj };
}

(async function () {

  /* ══ 1. Callback OAuth ══════════════════════════════════════════════════ */
  console.log('\nCallback — relier un compte déjà relié');

  // Les deux configurations de base : contrainte d'unicité posée, ou pas encore.
  var configs = [
    ['sans contrainte en base', {}],
    ['avec l\'index unique sur strava_athlete_id', { strava_tokens: ['patient_id', 'strava_athlete_id'] }],
  ];
  for (var c = 0; c < configs.length; c++) {
    var lib = configs[c][0], uniq = configs[c][1];
    var t = { strava_tokens: [jeton(1, 777, 'fiche-A', 'prat-1', '2026-08-01T10:00:00Z')] };
    var r = await lancerCallback(t, uniq, {}, 777, 'fiche-B', 'prat-1');
    var lignes = t.strava_tokens.filter(function (x) { return String(x.strava_athlete_id) === '777'; });
    ok('même praticien, ' + lib + ' : la nouvelle fiche l\'emporte',
      r.status === 'ok' && lignes.length === 1 && lignes[0].patient_id === 'fiche-B',
      'statut ' + r.status + ', lignes : ' + JSON.stringify(lignes.map(function (x) { return x.patient_id; })));
    ok('même praticien, ' + lib + ' : l\'ancienne fiche perd son lien',
      !t.strava_tokens.some(function (x) { return x.patient_id === 'fiche-A'; }));
  }

  {
    var t2 = { strava_tokens: [jeton(1, 777, 'fiche-X', 'prat-2', '2026-08-01T10:00:00Z')] };
    var r2 = await lancerCallback(t2, {}, {}, 777, 'fiche-B', 'prat-1');
    ok('autre praticien : refus, statut « taken » pour l\'athlète', r2.status === 'taken', 'statut ' + r2.status);
    ok('autre praticien : le lien du confrère reste intact',
      t2.strava_tokens.length === 1 && t2.strava_tokens[0].patient_id === 'fiche-X' && t2.strava_tokens[0].access_token === 'acc-1',
      JSON.stringify(t2.strava_tokens.map(function (x) { return x.patient_id + '/' + x.access_token; })));
    ok('autre praticien : aucune synchronisation lancée',
      !r2.f.appels.some(function (u) { return u.indexOf('strava-sync-history') >= 0; }), r2.f.appels.join(', '));
  }

  {
    var t3 = { strava_tokens: [] };
    var r3 = await lancerCallback(t3, {}, {}, 555, 'fiche-C', 'prat-1');
    ok('première liaison : ok, une ligne, synchronisation lancée',
      r3.status === 'ok' && t3.strava_tokens.length === 1 && t3.strava_tokens[0].patient_id === 'fiche-C'
        && r3.f.appels.some(function (u) { return u.indexOf('strava-sync-history?patient_id=fiche-C') >= 0; }),
      'statut ' + r3.status + ', ' + t3.strava_tokens.length + ' ligne(s)');
  }

  {
    var t4 = { strava_tokens: [jeton(1, 777, 'fiche-A', 'prat-1', '2026-08-01T10:00:00Z')] };
    var r4 = await lancerCallback(t4, { strava_tokens: ['patient_id', 'strava_athlete_id'] }, {}, 777, 'fiche-A', 'prat-1');
    ok('reconnexion de la même fiche : jeton renouvelé, toujours une ligne',
      r4.status === 'ok' && t4.strava_tokens.length === 1 && t4.strava_tokens[0].access_token === 'acc-neuf',
      'statut ' + r4.status + ', ' + JSON.stringify(t4.strava_tokens));
  }

  {
    var t5 = { strava_tokens: [jeton(1, 777, 'fiche-A', 'prat-1', '2026-08-01T10:00:00Z')] };
    var r5 = await lancerCallback(t5, {}, { 'strava_tokens:select': true }, 777, 'fiche-B', 'prat-1');
    ok('lecture des liens en échec : erreur, rien d\'écrit ni de retiré',
      r5.status === 'error' && t5.strava_tokens.length === 1 && t5.strava_tokens[0].patient_id === 'fiche-A',
      'statut ' + r5.status + ', ' + JSON.stringify(t5.strava_tokens.map(function (x) { return x.patient_id; })));
  }

  /* ══ 2. Page d'arrivée de l'athlète ════════════════════════════════════ */
  console.log('\nPage d\'arrivée — le refus se lit');
  {
    var html = fs.readFileSync(path.join(RACINE, 'strava-connected.html'), 'utf8');
    var script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
    var ids = {};
    (html.match(/id="(status\w+)"/g) || []).forEach(function (m) { ids[m.slice(4, -1)] = { style: { display: 'none' } }; });
    function afficher(statut) {
      Object.keys(ids).forEach(function (k) { ids[k].style.display = 'none'; });
      new Function('window', 'document', 'URLSearchParams', script)(
        { location: { search: '?status=' + statut } },
        { getElementById: function (id) { return ids[id] || { style: {} }; } },
        URLSearchParams);
      return Object.keys(ids).filter(function (k) { return ids[k].style.display === 'block'; });
    }
    var vus = afficher('taken');
    ok('« taken » affiche un bloc dédié, pas « Strava connecté »',
      vus.length === 1 && vus[0] !== 'statusOk' && vus[0] !== 'statusError', 'affiché : ' + vus.join(','));
    var bloc = vus[0] ? html.slice(html.indexOf('id="' + vus[0] + '"'), html.indexOf('</div>\n    </div>', html.indexOf('id="' + vus[0] + '"'))) : '';
    ok('le message dit que le compte est déjà relié ailleurs', /déjà relié/.test(bloc), bloc.replace(/\s+/g, ' ').slice(0, 160));
    ok('« ok » affiche toujours la confirmation', afficher('ok').join() === 'statusOk');
  }

  /* ══ 3. Webhook — doublon résiduel ═════════════════════════════════════ */
  console.log('\nWebhook — un doublon résiduel ne perd plus les activités');

  function stravaActivite(url) {
    if (url.indexOf('/api/v3/activities/') >= 0) {
      return { corps: { id: 9001, name: 'Footing', sport_type: 'Run', start_date_local: '2026-09-09T07:00:00Z', distance: 10000, moving_time: 3000 } };
    }
    return { status: 500 };
  }
  function lancerWebhook(tables, pannes, aspect) {
    var base = fausseBase(tables, {}, pannes);
    var f = chargerFonction('supabase/functions/strava-webhook/index.ts', base, stravaActivite);
    var req = new Request('https://sb.test/functions/v1/strava-webhook', {
      method: 'POST', body: JSON.stringify({ object_type: 'activity', aspect_type: aspect, owner_id: 777, object_id: 9001 }),
    });
    return f.handler(req).then(function (res) { return { code: res.status, f: f }; });
  }
  function deuxLiens() {
    return [jeton(1, 777, 'fiche-A', 'prat-1', '2026-08-01T10:00:00Z'),
            jeton(2, 777, 'fiche-B', 'prat-1', '2026-09-01T10:00:00Z'),
            jeton(3, 777, 'fiche-Z', 'prat-1', null)];
  }

  {
    var w1 = { strava_tokens: deuxLiens(), strava_activities: [] };
    var rw1 = await lancerWebhook(w1, {}, 'create');
    ok('création avec trois liens : 200, pas de 500 rejoué indéfiniment', rw1.code === 200, 'code ' + rw1.code);
    ok('l\'activité va au lien le plus récent', w1.strava_activities.length === 1 && w1.strava_activities[0].patient_id === 'fiche-B',
      JSON.stringify(w1.strava_activities.map(function (a) { return a.patient_id; })));
    ok('le doublon est signalé dans les journaux, fiches nommées',
      rw1.f.journaux.some(function (l) { return /doublon/i.test(l) && l.indexOf('fiche-A') >= 0 && l.indexOf('fiche-B') >= 0; }),
      rw1.f.journaux.join(' | ') || 'aucun journal');
  }

  {
    var w2 = { strava_tokens: deuxLiens(), strava_activities: [
      { strava_id: 9001, patient_id: 'fiche-A' }, { strava_id: 9002, patient_id: 'fiche-A' }] };
    var rw2 = await lancerWebhook(w2, {}, 'delete');
    ok('suppression avec deux liens : 200', rw2.code === 200, 'code ' + rw2.code);
    ok('l\'activité est retirée même rangée sous l\'ancienne fiche',
      !w2.strava_activities.some(function (a) { return a.strava_id === 9001; }) && w2.strava_activities.length === 1,
      JSON.stringify(w2.strava_activities));
  }

  {
    var w3 = { strava_tokens: [jeton(1, 777, 'fiche-A', 'prat-1', '2026-08-01T10:00:00Z')], strava_activities: [] };
    var rw3 = await lancerWebhook(w3, {}, 'create');
    ok('cas ordinaire, un lien : 200 et activité écrite, sans alerte',
      rw3.code === 200 && w3.strava_activities.length === 1 && !rw3.f.journaux.length,
      'code ' + rw3.code + ', ' + w3.strava_activities.length + ' activité(s), ' + rw3.f.journaux.join(' | '));
  }

  {
    var w4 = { strava_tokens: [], strava_activities: [] };
    var rw4 = await lancerWebhook(w4, {}, 'create');
    ok('athlète non relié : 200, rien d\'écrit', rw4.code === 200 && !w4.strava_activities.length, 'code ' + rw4.code);
  }

  {
    var w5 = { strava_tokens: deuxLiens(), strava_activities: [] };
    var rw5 = await lancerWebhook(w5, { 'strava_tokens:select': true }, 'create');
    ok('lecture des liens en panne : 500, Strava repassera', rw5.code === 500, 'code ' + rw5.code);
  }

  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Strava — lien unique : tous les cas passent.');
})().catch(function (e) { console.error('\n  ✗ exécution impossible — ' + e.stack); process.exit(1); });

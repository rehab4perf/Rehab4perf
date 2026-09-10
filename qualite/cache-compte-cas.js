#!/usr/bin/env node
/* Cas de référence — un cache local appartient à UN compte.
 *
 * Les protocoles personnalisés et les favoris d'exercices vivaient sous des
 * clés localStorage COMMUNES à tous les comptes (`r4p-custom-protocols`,
 * `r4p-fav-exos`, et leurs `-sid`), qu'aucune déconnexion ne vide. Le
 * praticien B qui se connectait dans un navigateur où A avait travaillé :
 *
 *   - voyait la liste de protocoles de A, versions modifiées et protocoles
 *     maison compris ;
 *   - n'obtenait JAMAIS sa propre ligne `__r4p_protocols_meta__` : la synchro
 *     trouvait l'id de la ligne de A dans le `-sid` commun et faisait un PATCH
 *     dessus. La politique RLS le refuse sans erreur — 200, zéro ligne — et le
 *     code ne regardait pas le résultat. Tout ce que B modifiait restait dans
 *     ce navigateur, et l'espace athlète de ses patients (qui ne résout le
 *     protocole QUE dans cette ligne) restait vide ;
 *   - recevait dans SA ligne de favoris l'union avec ceux de A.
 *
 * Rien ne se voyait : aucune erreur, et la liste affichée était plausible.
 *
 * Le cas exécute les VRAIES fonctions de prog-data.js et prog-main.js contre
 * un faux serveur qui applique les politiques RLS relevées en base le
 * 2026-09-10, après 20260911 (templates : SELECT ses lignes ou les publiques
 * hors lignes meta ; UPDATE et INSERT propriétaire seulement). La base ne
 * laisse donc plus LIRE la ligne de A à B — mais le cache local la lui
 * servait sans rien demander, et le PATCH refusé passait pour réussi.
 * Aucune requête ne part vers la vraie base.
 *
 *   node qualite/cache-compte-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var data = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
var main = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

function tranche(src, debut, fin, nom) {
  var a = src.indexOf(debut);
  var b = a < 0 ? -1 : src.indexOf(fin, a + debut.length);
  if (a < 0 || b < 0) { console.error('Bornes introuvables : ' + nom); process.exit(1); }
  return src.slice(a, b);
}

/* Le vrai code, par tranches. Les clés et ce qui les suit jusqu'au helper
   réseau (où vit la purge des anciennes clés communes), le catalogue intégré,
   le panneau et la synchro des protocoles, les favoris. */
var srcCles   = tranche(data, 'var R4P_KEYS', '/* ================================================================\n   NETWORK HELPER', 'R4P_KEYS');
var srcFavs   = tranche(data, '/* ── FAVORITES ── */', 'var _favFilter', 'favoris');
var srcRef    = tranche(main, 'var PROTOCOLS_REF = [', '\n];', 'PROTOCOLS_REF') + '\n];';
var srcIcons  = tranche(main, 'var PROTO_ICONS = [', '\n];', 'PROTO_ICONS') + '\n];';
var srcProtos = tranche(main, 'function openProtoPanel', '/* ── Éditeur visuel de phases', 'protocoles');

/* ── Faux localStorage (partagé entre pages : c'est le navigateur) ── */
function navigateur() {
  var m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    cles: function () { return Object.keys(m); }
  };
}

/* ── Faux PostgREST + RLS de `templates` ── */
function serveur() {
  var s = { templates: [], journal: [], enPanne: false, n: 0 };
  function rep(status, corps) {
    return Promise.resolve({ ok: status < 300, status: status,
      json: function () { return Promise.resolve(JSON.parse(JSON.stringify(corps))); } });
  }
  s.fetch = function (url, opts, uid) {
    if (s.enPanne) return Promise.reject(new TypeError('Failed to fetch'));
    var methode = ((opts && opts.method) || 'GET').toUpperCase();
    var u = new URL(url);
    if (u.pathname !== '/rest/v1/templates') return rep(404, {});
    var q = u.searchParams;
    var eq = function (champ) { var v = q.get(champ); return v && v.indexOf('eq.') === 0 ? v.slice(3) : null; };
    if (methode === 'GET') {
      var lignes = s.templates.filter(function (t) {
        // RLS SELECT (r4p_praticien_lecture, 20260911) : ses lignes, ou les
        // publiques — jamais les lignes meta d'autrui, même publiques.
        if (t.praticien_id !== uid &&
            (!t.is_public || /^__r4p_(favs|protocols)_meta__$/.test(t.nom))) return false;
        if (eq('nom') && t.nom !== eq('nom')) return false;
        if (eq('praticien_id') && t.praticien_id !== eq('praticien_id')) return false;
        return true;
      });
      if (q.get('limit')) lignes = lignes.slice(0, +q.get('limit'));
      return rep(200, lignes);
    }
    if (methode === 'PATCH') {
      var corps = JSON.parse(opts.body);
      var visees = s.templates.filter(function (t) { return t.id === eq('id'); });
      var touchees = visees.filter(function (t) { return t.praticien_id === uid; }); // RLS UPDATE (USING)
      if (touchees.length && corps.praticien_id && corps.praticien_id !== uid) return rep(403, {}); // WITH CHECK
      touchees.forEach(function (t) { Object.assign(t, corps); });
      s.journal.push({ methode: 'PATCH', uid: uid, id: eq('id'), touchees: touchees.length });
      return rep(200, touchees);                  // 200 même à zéro ligne : c'est le piège
    }
    if (methode === 'POST') {
      var neuf = JSON.parse(opts.body);
      if (neuf.praticien_id !== uid) return rep(403, {});           // RLS INSERT
      neuf.id = 'ligne-' + (++s.n);
      s.templates.push(neuf);
      s.journal.push({ methode: 'POST', uid: uid, id: neuf.id });
      return rep(201, [neuf]);
    }
    if (methode === 'DELETE') {
      s.templates = s.templates.filter(function (t) { return !(t.id === eq('id') && t.praticien_id === uid); });
      return rep(204, []);
    }
    return rep(405, {});
  };
  return s;
}

/* ── Une page programme.html : un chargement du script, dans un navigateur ── */
function page(ls, srv) {
  /* eslint-disable no-new-func */
  var f = new Function('localStorage', 'srv',
    'var _progToken = null, _progUid = null;\n' +
    'var SUPA_URL_P = "https://base.test";\n' +
    'function _sbHeaders(){ return { "Authorization":"Bearer "+_progToken, "Prefer":"return=representation" }; }\n' +
    'function _fetchRetry(url, opts){ return srv.fetch(url, opts, _progUid); }\n' +
    'var document = { getElementById: function(){ return { classList:{ add:function(){}, remove:function(){} }, value:"" }; } };\n' +
    'var _rendus = 0; function renderProtocols(){ _rendus++; } function renderLib(){}\n' +
    'var _PE_COLORS = [{color:"#EFF6FF",borderColor:"#3B82F6"}];\n' +
    srcCles + '\n' + srcFavs + '\n' + srcRef + '\n' + srcIcons + '\n' + srcProtos + '\n' +
    'return {\n' +
    '  connecter: function(uid){ _progUid = uid; _progToken = uid ? "jwt-" + uid : null; },\n' +
    '  ouvrirPanneau: function(){ openProtoPanel(); },\n' +
    '  liste: function(){ return _getAllProtocols(); },\n' +
    '  ref: function(){ return PROTOCOLS_REF; },\n' +
    '  chargerFavs: function(){ _fetchFavsFromSupabase(); },\n' +
    '  favs: function(){ return Array.from(getFavs()); },\n' +
    '  basculerFav: function(id){ toggleFav(id); }\n' +
    '};');
  return f(ls, srv);
}

function attendre() { return new Promise(function (r) { setTimeout(r, 30); }); }
function meta(srv, uid, nom) {
  return srv.templates.filter(function (t) { return t.praticien_id === uid && t.nom === nom; });
}
function contenu(ligne, champ) {
  var d = ligne.donnees;
  if (typeof d === 'string') d = JSON.parse(d);
  return (d && d[champ]) || [];
}
var PROTOS = '__r4p_protocols_meta__', FAVS = '__r4p_favs_meta__';

(async function () {
  var ls = navigateur(), srv = serveur();

  /* La base : A a personnalisé LCA et créé un protocole maison. */
  var ref = page(navigateur(), serveur()).ref();
  var lcaA = JSON.parse(JSON.stringify(ref.find(function (p) { return p.id === 'lca'; })));
  lcaA.name = 'LCA — version de A'; lcaA.userModified = true; delete lcaA.isBuiltin;
  var listeA = ref.filter(function (p) { return p.id !== 'lca'; })
    .map(function (p) { var c = JSON.parse(JSON.stringify(p)); delete c.isBuiltin; c.isCustom = true; return c; })
    .concat([lcaA, { id: 'perso-A', name: 'Protocole maison de A', isCustom: true, phases: [] }]);
  var donneesA = JSON.stringify({ protocols: listeA });
  srv.templates.push({ id: 'meta-A', praticien_id: 'A', nom: PROTOS, type: '__meta__', is_public: true, donnees: donneesA });
  srv.templates.push({ id: 'favs-A', praticien_id: 'A', nom: FAVS, type: '__meta__', is_public: true, donnees: JSON.stringify({ favs: ['exo-de-A'] }) });

  console.log('\nA travaille dans ce navigateur');
  var pA = page(ls, srv);
  pA.connecter('A'); pA.ouvrirPanneau(); pA.chargerFavs(); await attendre();
  var l = pA.liste();
  ok('A voit son protocole maison', l.some(function (p) { return p.id === 'perso-A'; }));
  ok('A voit sa version de LCA', l.some(function (p) { return p.name === 'LCA — version de A'; }));
  ok('A retrouve ses favoris', pA.favs().indexOf('exo-de-A') >= 0, pA.favs().join(','));

  console.log('\nB se connecte ensuite dans le même navigateur');
  srv.journal = [];
  var pB = page(ls, srv);
  pB.connecter('B'); pB.ouvrirPanneau(); await attendre();
  l = pB.liste();
  ok('B ne voit pas le protocole maison de A', !l.some(function (p) { return p.id === 'perso-A'; }));
  ok('B ne voit pas la version de LCA modifiée par A',
     !l.some(function (p) { return p.name === 'LCA — version de A'; }));
  var viseA = srv.journal.filter(function (j) { return j.uid === 'B' && /-A$/.test(j.id || ''); });
  ok('aucune écriture de B ne vise une ligne de A', !viseA.length,
     viseA.map(function (j) { return j.methode + ' ' + j.id + ' (' + j.touchees + ' ligne)'; }).join(', '));
  var mB = meta(srv, 'B', PROTOS);
  ok('B obtient sa propre ligne de protocoles', mB.length === 1, mB.length + ' ligne(s)');
  var protosB = mB.length ? contenu(mB[0], 'protocols') : [];
  ok('… qui ne contient que la bibliothèque intégrée',
     protosB.length === ref.length && !protosB.some(function (p) { return p.userModified || p.id === 'perso-A'; }),
     protosB.map(function (p) { return p.id + (p.userModified ? '*' : ''); }).join(','));
  ok('la ligne de A est intacte',
     srv.templates.some(function (t) { return t.id === 'meta-A' && t.praticien_id === 'A' && t.donnees === donneesA; }));

  pB.chargerFavs(); await attendre();
  var fB = meta(srv, 'B', FAVS);
  var favsB = fB.length ? contenu(fB[0], 'favs') : [];
  ok('les favoris de A n\'entrent pas dans la ligne de B', favsB.indexOf('exo-de-A') < 0, favsB.join(','));
  ok('B ne voit pas les favoris de A', pB.favs().indexOf('exo-de-A') < 0, pB.favs().join(','));

  console.log('\nLe compte change sans rechargement de la page');
  var pC = page(ls, srv);
  pC.connecter('A'); pC.ouvrirPanneau(); await attendre();
  /* C n'a encore AUCUNE ligne : c'est là que l'id de A, resté en mémoire,
     serait repris par la synchro. B en a déjà une depuis la section
     précédente, et la masquerait. */
  pC.connecter('C');              // jeton rafraîchi pour un autre compte
  ok('la liste de A restée en mémoire n\'est pas servie à C',
     !pC.liste().some(function (p) { return p.id === 'perso-A'; }));
  srv.journal = [];
  pC.ouvrirPanneau(); await attendre();
  ok('… ni après réouverture du panneau', !pC.liste().some(function (p) { return p.id === 'perso-A'; }));
  viseA = srv.journal.filter(function (j) { return j.uid === 'C' && /-A$/.test(j.id || ''); });
  ok('l\'id de la ligne de A resté en mémoire n\'est pas réutilisé par C', !viseA.length,
     viseA.map(function (j) { return j.methode + ' ' + j.id; }).join(', '));
  ok('C obtient sa propre ligne de protocoles', meta(srv, 'C', PROTOS).length === 1,
     meta(srv, 'C', PROTOS).length + ' ligne(s)');

  console.log('\nUne réponse arrivée après le changement de compte');
  var lsE = navigateur();
  var pE = page(lsE, srv);
  pE.connecter('A'); pE.ouvrirPanneau();   // la lecture de A est en vol…
  pE.connecter('B');                        // … quand le compte change
  await attendre();
  var pE2 = page(lsE, srv);                 // B recharge la page
  pE2.connecter('B'); srv.enPanne = true; pE2.ouvrirPanneau(); await attendre(); srv.enPanne = false;
  ok('la liste de A n\'est pas rangée dans le cache de B',
     !pE2.liste().some(function (p) { return p.id === 'perso-A'; }));

  console.log('\nA revient : rien de son travail n\'est perdu');
  var pA2 = page(ls, srv);
  pA2.connecter('A'); pA2.ouvrirPanneau(); await attendre();
  ok('A retrouve son protocole maison', pA2.liste().some(function (p) { return p.id === 'perso-A'; }));
  srv.enPanne = true;
  var pA3 = page(ls, srv);
  pA3.connecter('A'); pA3.ouvrirPanneau(); await attendre();
  srv.enPanne = false;
  ok('base injoignable : A garde son propre cache en repli',
     pA3.liste().some(function (p) { return p.id === 'perso-A'; }));
  var pAnon = page(ls, srv);
  pAnon.connecter(null); pAnon.ouvrirPanneau(); await attendre();
  ok('sans compte identifié, aucun cache de compte n\'est lu',
     !pAnon.liste().some(function (p) { return p.id === 'perso-A'; }));

  console.log('\nUne écriture qui ne touche aucune ligne ne passe pas pour faite');
  srv.templates = srv.templates.filter(function (t) { return t.id !== 'meta-A'; }); // ligne disparue
  var pA4 = page(ls, srv);
  pA4.connecter('A'); pA4.ouvrirPanneau(); await attendre();
  var mA = meta(srv, 'A', PROTOS);
  ok('la ligne de A est recréée depuis son cache', mA.length === 1 &&
     contenu(mA[0], 'protocols').some(function (p) { return p.id === 'perso-A'; }), mA.length + ' ligne(s)');
  /* Même piège côté favoris : la page garde l'id de sa ligne, la ligne disparaît. */
  var pF = page(ls, srv);
  pF.connecter('A'); pF.chargerFavs(); await attendre();
  srv.templates = srv.templates.filter(function (t) { return t.id !== 'favs-A'; });
  pF.basculerFav('exo-nouveau'); await attendre();
  var fA = meta(srv, 'A', FAVS);
  ok('la ligne de favoris de A est recréée au lieu d\'un PATCH dans le vide',
     fA.length === 1 && contenu(fA[0], 'favs').indexOf('exo-nouveau') >= 0, fA.length + ' ligne(s)');

  console.log('\nLes anciennes clés communes ne servent plus');
  var ls2 = navigateur();
  ls2.setItem('r4p-custom-protocols', JSON.stringify(listeA));
  ls2.setItem('r4p-custom-protocols-sid', 'meta-A');
  ls2.setItem('r4p-fav-exos', JSON.stringify(['exo-de-A']));
  ls2.setItem('r4p-fav-exos-sid', 'favs-A');
  var pD = page(ls2, srv);
  var restes = ['r4p-custom-protocols', 'r4p-custom-protocols-sid', 'r4p-fav-exos', 'r4p-fav-exos-sid']
    .filter(function (k) { return ls2.getItem(k) !== null; });
  ok('elles sont effacées au chargement', !restes.length, restes.join(', '));
  pD.connecter('B'); pD.ouvrirPanneau(); await attendre();
  ok('une liste laissée sous l\'ancienne clé n\'est pas servie',
     !pD.liste().some(function (p) { return p.id === 'perso-A'; }));

  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Cache par compte : tous les cas passent.');
})();

/* ══════════════════════════════════════════════════════════════════════
   PIÈGE À ERREURS — rendre visible ce qui cassait en silence
   ══════════════════════════════════════════════════════════════════════
   L'application n'avait AUCUN gestionnaire d'erreur : ni `window.onerror`, ni
   `unhandledrejection`, nulle part. Une exception non rattrapée laissait donc
   l'interface à moitié construite — une liste jamais rendue, un gestionnaire
   qui ne se rebranche pas, un voile jamais refermé — sans le moindre message.
   Le seul recours était de recharger, sans jamais savoir pourquoi.

   Ce fichier ne corrige aucune cause. Il transforme une panne muette en
   information : un bandeau discret le dit, et l'erreur est CONSERVÉE pour
   survivre au rechargement — sans quoi elle disparaît au moment précis où
   l'on voudrait la rapporter.

   Il est chargé par la coquille ET par chaque iframe. Dans une iframe, les
   erreurs ne remontent pas au parent : chacune renvoie donc la sienne par
   `postMessage`, et seule la coquille affiche.

   Volontairement sans dépendance et sans rien supposer de la page : c'est le
   dernier filet, il doit tenir même quand le reste est cassé. */
(function () {
  'use strict';

  var CLE = 'r4p-dernieres-erreurs';
  var MAX = 10;
  var estCoquille = (window.top === window.self);
  var page = (location.pathname.split('/').pop() || 'index.html');
  var derniere = '';        // anti-répétition : une boucle peut émettre en rafale
  var dernierT = 0;

  function enregistrer(err) {
    try {
      var liste = JSON.parse(localStorage.getItem(CLE) || '[]');
      liste.unshift(err);
      localStorage.setItem(CLE, JSON.stringify(liste.slice(0, MAX)));
    } catch (e) { /* quota plein ou stockage refusé : on n'insiste pas */ }
  }

  /* Le bandeau ne bloque rien et ne se met jamais en travers : l'interface est
     peut-être encore utilisable, c'est au praticien d'en juger. */
  function afficher(err) {
    if (document.getElementById('r4p-err-bandeau')) return;
    if (!document.body) return;
    var d = document.createElement('div');
    d.id = 'r4p-err-bandeau';
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;'
      + 'max-width:520px;margin:0 auto;background:#7f1d1d;color:#fff;border-radius:10px;'
      + 'box-shadow:0 8px 28px rgba(0,0,0,.28);padding:11px 13px;'
      + 'font-family:Figtree,-apple-system,"Helvetica Neue",sans-serif;font-size:.8rem;'
      + 'line-height:1.45;display:flex;gap:10px;align-items:flex-start;';
    d.innerHTML =
        '<div style="flex:1;min-width:0;">'
      +   '<div style="font-weight:700;margin-bottom:2px;">Une erreur est survenue</div>'
      +   '<div style="opacity:.9;">Si l\'application ne répond plus, rechargez la page. '
      +     'Le détail est conservé pour le signaler.</div>'
      +   '<div style="opacity:.72;font-size:.7rem;margin-top:4px;word-break:break-word;">'
      +     (String(err.msg || '').slice(0, 160)) + ' — ' + err.page + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">'
      +   '<button type="button" id="r4p-err-recharger" style="background:#fff;color:#7f1d1d;'
      +     'border:0;border-radius:6px;padding:5px 10px;font-weight:700;font-size:.74rem;'
      +     'cursor:pointer;font-family:inherit;">Recharger</button>'
      +   '<button type="button" id="r4p-err-fermer" style="background:transparent;color:#fff;'
      +     'border:1px solid rgba(255,255,255,.45);border-radius:6px;padding:5px 10px;'
      +     'font-size:.74rem;cursor:pointer;font-family:inherit;">Ignorer</button>'
      + '</div>';
    document.body.appendChild(d);
    var r = document.getElementById('r4p-err-recharger');
    var f = document.getElementById('r4p-err-fermer');
    if (r) r.onclick = function () { location.reload(); };
    if (f) f.onclick = function () { d.remove(); };
  }

  function signaler(msg, source, pile) {
    var m = String(msg || 'Erreur inconnue');
    var maintenant = Date.now();
    /* Une même erreur émise en rafale (boucle de rendu, gestionnaire rappelé à
       chaque événement) ne doit pas noyer l'historique ni clignoter à l'écran. */
    if (m === derniere && maintenant - dernierT < 4000) return;
    derniere = m; dernierT = maintenant;

    var err = {
      msg: m,
      source: String(source || '').slice(0, 200),
      pile: String(pile || '').slice(0, 900),
      page: page,
      quand: new Date().toISOString()
    };

    if (estCoquille) { enregistrer(err); afficher(err); return; }
    /* Dans une iframe : la coquille enregistre et affiche. On tente quand même
       l'enregistrement local — même origine, donc même stockage — au cas où le
       message n'arriverait pas. */
    enregistrer(err);
    try {
      window.parent.postMessage({ type: 'r4p-erreur', erreur: err }, window.location.origin);
    } catch (e) { /* parent inaccessible : l'enregistrement local suffira */ }
  }

  window.addEventListener('error', function (e) {
    /* Les erreurs de CHARGEMENT de ressource (img, script) remontent aussi ici,
       mais sans `error` : elles ne cassent pas l'interface, on les ignore. */
    if (!e) return;
    if (!e.error && !e.message) return;
    signaler(e.message || (e.error && e.error.message),
             (e.filename || '') + ':' + (e.lineno || ''),
             e.error && e.error.stack);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    signaler((r && (r.message || r)) || 'Promesse rejetée sans motif',
             'promesse', r && r.stack);
  });

  if (estCoquille) {
    window.addEventListener('message', function (e) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.type !== 'r4p-erreur' || !e.data.erreur) return;
      var err = e.data.erreur;
      if (err.msg === derniere && Date.now() - dernierT < 4000) return;
      derniere = err.msg; dernierT = Date.now();
      afficher(err);
    });
  }

  /* Console d'appoint : `r4pErreurs()` rend l'historique conservé, pour le
     copier-coller dans un signalement après un rechargement. */
  window.r4pErreurs = function () {
    try { return JSON.parse(localStorage.getItem(CLE) || '[]'); }
    catch (e) { return []; }
  };
  window.r4pErreursVider = function () {
    try { localStorage.removeItem(CLE); } catch (e) {}
    return 'historique vidé';
  };
})();

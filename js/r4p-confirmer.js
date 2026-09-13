/* ═══════════════════════════════════════════════════════════════════════════
   CONFIRMATION — la fenêtre de l'application, pas celle du navigateur
   ═══════════════════════════════════════════════════════════════════════════
   L'application posait ses questions par `confirm()` : la boîte grise du
   navigateur, « app.rehab4perf.com indique », au milieu d'une interface qui a
   sa propre identité. Vingt-deux fois.

   Le défaut n'était pas qu'esthétique. On change de patient depuis la barre du
   haut, souvent depuis un AUTRE onglet : le CR (outils.html) et le bilan
   posaient alors leur question depuis une iframe cachée (display:none). La
   boîte native s'en échappe ; la modale du bilan, elle, restait dans son
   iframe — invisible, et le changement de patient suspendu à une question que
   personne ne voyait.

   D'où la règle, calquée sur r4p-erreurs.js : la COQUILLE affiche. Une iframe
   envoie sa question au parent et attend la réponse ; une page ouverte seule
   (espace athlète, page chargée hors coquille) affiche sur place.

     r4pConfirmer({ titre, message, ok, annuler, danger })  →  Promise<boolean>

   `danger` : geste destructeur — bouton rouge, et le focus va sur « Annuler » :
   Entrée par réflexe ne supprime rien. Échap et un clic hors de la fenêtre
   annulent. Le texte est échappé : un nom de patient n'est pas du HTML.

   Sans dépendance, couleurs fixes : le module ne suppose rien de la palette de
   la page qui l'accueille (chaque page a la sienne, et les mêmes noms n'y
   valent pas la même chose). Voir qualite/confirmer-cas.js. */
(function () {
  'use strict';

  var estCoquille = (window.top === window.self);
  var ORIG = window.location.origin;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var ICONES = {
    danger: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>'
      + '<path d="M12 9v4"/><path d="M12 17h.01"/>',
    question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>'
      + '<path d="M12 17h.01"/>'
  };

  function normaliser(o) {
    o = (typeof o === 'string') ? { titre: o } : (o || {});
    return {
      titre: String(o.titre || 'Confirmer ?'),
      message: String(o.message || ''),
      ok: String(o.ok || 'Confirmer'),
      annuler: String(o.annuler || 'Annuler'),
      danger: !!o.danger
    };
  }

  /* Le balisage seul, sans DOM : c'est lui que vérifie le fichier de cas.
     Un double saut de ligne ouvre un paragraphe, un simple passe à la ligne. */
  function html(o) {
    o = normaliser(o);
    var paras = o.message ? o.message.split(/\n\s*\n/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('') : '';
    return '<div class="r4pc-carte" role="alertdialog" aria-modal="true" aria-labelledby="r4pc-titre"'
      + (paras ? ' aria-describedby="r4pc-msg"' : '') + '>'
      + '<div class="r4pc-tete">'
      +   '<span class="r4pc-ico' + (o.danger ? ' r4pc-ico--danger' : '') + '" aria-hidden="true">'
      +     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"'
      +     ' stroke-linecap="round" stroke-linejoin="round">' + (o.danger ? ICONES.danger : ICONES.question) + '</svg>'
      +   '</span>'
      +   '<h2 class="r4pc-titre" id="r4pc-titre">' + esc(o.titre) + '</h2>'
      + '</div>'
      + (paras ? '<div class="r4pc-msg" id="r4pc-msg">' + paras + '</div>' : '')
      + '<div class="r4pc-actions">'
      +   '<button type="button" class="r4pc-btn r4pc-annuler">' + esc(o.annuler) + '</button>'
      +   '<button type="button" class="r4pc-btn r4pc-ok' + (o.danger ? ' r4pc-ok--danger' : '') + '">'
      +     esc(o.ok) + '</button>'
      + '</div>'
      + '</div>';
  }

  var CSS = ''
    + '.r4pc-voile{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;'
    +   'justify-content:center;padding:16px;background:rgba(15,30,48,.42);'
    +   '-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:r4pc-fondu .14s ease-out}'
    + '.r4pc-carte{width:100%;max-width:420px;background:#fff;border-radius:14px;padding:22px 22px 18px;'
    +   'box-shadow:0 24px 64px rgba(15,30,48,.28),0 2px 6px rgba(15,30,48,.08);'
    +   'font-family:Figtree,-apple-system,"Helvetica Neue",Arial,sans-serif;color:#1A1917;'
    +   'animation:r4pc-entree .18s cubic-bezier(.2,.8,.2,1)}'
    + '.r4pc-tete{display:flex;align-items:center;gap:12px}'
    + '.r4pc-ico{flex:none;width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;'
    +   'justify-content:center;background:#EEF3FB;color:#2B5FA6}'
    + '.r4pc-ico--danger{background:#FDECEA;color:#B91C1C}'
    + '.r4pc-titre{margin:0;font-size:1rem;font-weight:700;line-height:1.35;letter-spacing:-.01em;'
    +   'color:#1A1917;text-wrap:balance}'
    + '.r4pc-msg{margin:10px 0 0 48px;font-size:.875rem;line-height:1.55;color:#4A4843}'
    + '.r4pc-msg p{margin:0 0 8px}.r4pc-msg p:last-child{margin:0}'
    + '.r4pc-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}'
    + '.r4pc-btn{font:inherit;font-size:.86rem;font-weight:600;min-height:40px;padding:0 16px;border-radius:8px;'
    +   'cursor:pointer;border:1px solid transparent;transition:background-color .12s,border-color .12s}'
    + '.r4pc-annuler{background:#fff;border-color:#D9D6CF;color:#1A1917}'
    + '.r4pc-annuler:hover{background:#F4F3F0}'
    + '.r4pc-ok{background:#2B5FA6;color:#fff}'
    + '.r4pc-ok:hover{background:#234E8A}'
    + '.r4pc-ok--danger{background:#B91C1C}'
    + '.r4pc-ok--danger:hover{background:#991B1B}'
    + '.r4pc-btn:focus-visible{outline:2px solid #2B5FA6;outline-offset:2px}'
    + '.r4pc-ok--danger:focus-visible{outline-color:#B91C1C}'
    /* Téléphone : boutons pleine largeur, le verbe au-dessus, sous le pouce. */
    + '@media (max-width:480px){.r4pc-msg{margin-left:0}.r4pc-actions{flex-direction:column-reverse}'
    +   '.r4pc-btn{width:100%;min-height:44px}}'
    + '@keyframes r4pc-fondu{from{opacity:0}}'
    + '@keyframes r4pc-entree{from{opacity:0;transform:translateY(6px) scale(.98)}}'
    + '@media (prefers-reduced-motion:reduce){.r4pc-voile,.r4pc-carte{animation:none}}';

  function injecterStyle() {
    if (document.getElementById('r4pc-style')) return;
    var s = document.createElement('style');
    s.id = 'r4pc-style';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* Une question à la fois : deux iframes peuvent demander ensemble (bilan
     modifié ET CR en cours au même changement de patient). */
  var file = [], ouverte = false;

  function afficherLocal(o) {
    return new Promise(function (resolve) {
      file.push({ o: o, resolve: resolve });
      suivante();
    });
  }

  function suivante() {
    if (ouverte || !file.length) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', suivante, { once: true }); return; }
    var d = file.shift();
    var o = normaliser(d.o);
    ouverte = true;
    injecterStyle();
    var avant = document.activeElement;
    var voile = document.createElement('div');
    voile.className = 'r4pc-voile';
    voile.innerHTML = html(o);
    document.body.appendChild(voile);
    var bAnn = voile.querySelector('.r4pc-annuler');
    var bOk = voile.querySelector('.r4pc-ok');

    function fermer(rep) {
      document.removeEventListener('keydown', clavier, true);
      if (voile.parentNode) voile.parentNode.removeChild(voile);
      ouverte = false;
      try { if (avant && avant.focus) avant.focus(); } catch (e) {}
      d.resolve(rep);
      suivante();
    }
    function clavier(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(false); }
      else if (e.key === 'Tab') {
        /* Deux boutons : le focus ne quitte pas la fenêtre. */
        e.preventDefault();
        (document.activeElement === bOk ? bAnn : bOk).focus();
      }
    }
    document.addEventListener('keydown', clavier, true);
    bAnn.addEventListener('click', function () { fermer(false); });
    bOk.addEventListener('click', function () { fermer(true); });
    voile.addEventListener('mousedown', function (e) { if (e.target === voile) fermer(false); });
    (o.danger ? bAnn : bOk).focus();
  }

  /* ── Côté iframe : la question part à la coquille ─────────────────────── */
  var attente = {}, compteur = 0;

  function demanderAuParent(o) {
    return new Promise(function (resolve) {
      var id = 'c' + (++compteur) + '-' + Date.now();
      var d = { resolve: resolve, recu: false, minuteur: null };
      attente[id] = d;
      try {
        window.parent.postMessage({ type: 'r4p-confirmer', id: id, opts: normaliser(o) }, ORIG);
      } catch (e) {
        delete attente[id];
        afficherLocal(o).then(resolve);
        return;
      }
      /* Personne n'accuse réception (page chargée hors coquille) : on affiche
         sur place plutôt que d'attendre une réponse qui ne viendra pas. */
      d.minuteur = setTimeout(function () {
        if (attente[id] && !attente[id].recu) {
          delete attente[id];
          afficherLocal(o).then(resolve);
        }
      }, 1200);
    });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIG || !e.data) return;
    var t = e.data.type, id = e.data.id;
    /* ── Côté coquille : afficher pour l'iframe, puis lui répondre ── */
    if (t === 'r4p-confirmer' && estCoquille && e.source) {
      var src = e.source;
      try { src.postMessage({ type: 'r4p-confirmer-recu', id: id }, ORIG); } catch (x) {}
      afficherLocal(e.data.opts).then(function (rep) {
        try { src.postMessage({ type: 'r4p-confirmer-reponse', id: id, ok: rep }, ORIG); } catch (x) {}
      });
      return;
    }
    if (t === 'r4p-confirmer-recu' && attente[id]) {
      attente[id].recu = true;
      clearTimeout(attente[id].minuteur);
      return;
    }
    if (t === 'r4p-confirmer-reponse' && attente[id]) {
      var d = attente[id];
      delete attente[id];
      clearTimeout(d.minuteur);
      d.resolve(!!e.data.ok);
    }
  });

  window.r4pConfirmer = function (o) { return estCoquille ? afficherLocal(o) : demanderAuParent(o); };
  window.r4pConfirmer._html = html;
})();

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Lien athlète révocable — un jeton par patient

   Jusqu'ici l'uuid du patient était le secret du lien (20260912) : impossible
   à deviner, mais un lien transféré ouvrait le patient POUR TOUJOURS. Décidé
   avec le praticien le 2026-09-13 : un jeton par patient, « Régénérer le lien »
   coupe l'ancien, et la bascule se fait PATIENT PAR PATIENT — l'ancien lien
   d'un patient marche jusqu'au premier jeton émis pour lui.

   Ce que ce cas tient :
     1. la migration : une table sans suppression ni lecture anonyme, un seul
        jeton actif, et deux fonctions de lien qui ne se replient JAMAIS sur
        l'uuid une fois un jeton émis ;
     2. le praticien : un jeton aléatoire, créé AU PARTAGE et seulement là —
        ouvrir le menu ne fait que lire, sans quoi ouvrir « Partager » par
        curiosité tuerait l'ancien lien du patient ; repli sur l'ancien lien
        tant que la migration n'est pas appliquée ; un refus silencieux de la
        base (200, []) n'est jamais pris pour un jeton ;
     3. l'athlète : ?j= se lit, se mémorise pour l'appli installée, part en
        en-tête, et un lien remplacé le DIT au lieu d'afficher un calendrier
        vide.

     node qualite/lien-jeton-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const lire = f => { try { return fs.readFileSync(path.join(R, f), 'utf8'); } catch (e) { return ''; } };
const sql = lire('supabase/migrations/20260914_lien_jeton.sql');
const pdata = lire('js/prog-data.js'), pmain = lire('js/prog-main.js'), ath = lire('athlete.html'), rls = lire('qualite/rls-cas.js');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fd = fnDe(pdata), fm = fnDe(pmain);
const fonctionSql = n => { const d = sql.indexOf('FUNCTION public.' + n + '()'); return d < 0 ? '' : sql.slice(d, sql.indexOf('$$;', d)); };

/* ── 1. La migration ─────────────────────────────────────────────────────── */
console.log('\nLa migration');
ok('une table de jetons, un jeton bien formé, rattaché à un patient', /CREATE TABLE IF NOT EXISTS public\.patient_liens/.test(sql)
   && /jeton\s+text PRIMARY KEY CHECK \(jeton ~ '\^\[A-Za-z0-9_-\]\{32,64\}\$'\)/.test(sql) && /REFERENCES public\.patients\(id\) ON DELETE CASCADE/.test(sql));
ok('… un seul lien actif par patient', /CREATE UNIQUE INDEX IF NOT EXISTS patient_liens_un_actif\s+ON public\.patient_liens \(patient_id\) WHERE revoque_at IS NULL/.test(sql));
ok('… RLS activée', /ALTER TABLE public\.patient_liens ENABLE ROW LEVEL SECURITY/.test(sql));
ok('… jamais lue ni écrite par la clé anonyme', /AS RESTRICTIVE FOR ALL TO anon USING \(false\) WITH CHECK \(false\)/.test(sql) && /REVOKE ALL ON public\.patient_liens FROM anon/.test(sql));
ok('… jamais supprimée (effacer les jetons ferait revivre l\'ancien lien)', /AS RESTRICTIVE FOR DELETE TO authenticated USING \(false\)/.test(sql));
ok('… une seule modification : révoquer, sans retour en arrière', /AS RESTRICTIVE FOR UPDATE TO authenticated\s+USING \(revoque_at IS NULL\) WITH CHECK \(revoque_at IS NOT NULL\)/.test(sql)
   && /GRANT UPDATE \(revoque_at\) ON public\.patient_liens TO authenticated/.test(sql) && /REVOKE UPDATE ON public\.patient_liens FROM authenticated/.test(sql));
const flp = fonctionSql('r4p_lien_patient');
ok('r4p_lien_patient lit la table pour la clé anonyme (SECURITY DEFINER)', /SECURITY DEFINER SET search_path = ''/.test(flp));
ok('… le jeton passe AVANT l\'uuid', flp.indexOf("'x-r4p-jeton'") > 0 && flp.indexOf("'x-r4p-jeton'") < flp.indexOf("'x-r4p-patient'"));
ok('… un jeton révoqué ou inconnu n\'ouvre rien, sans repli sur l\'uuid', /WHERE l\.jeton = j AND l\.revoque_at IS NULL;\s*RETURN p;\s*END IF;/.test(flp));
ok('… l\'ancien lien meurt dès le premier jeton du patient (bascule patient par patient)',
   /IF EXISTS \(SELECT 1 FROM public\.patient_liens l WHERE l\.patient_id = v::uuid\) THEN\s*RETURN NULL;/.test(flp));
const fpr = fonctionSql('r4p_lien_prog');
ok('l\'ancien lien d\'un programme suit son patient', /SECURITY DEFINER/.test(fpr) && /JOIN public\.patient_liens l ON l\.patient_id = pr\.patient_id/.test(fpr));
ok('rls-cas connaît la table : bornée au praticien, jamais anonyme',
   /TABLES_PATIENT = \[[^\]]*'patient_liens'/.test(rls) && /JAMAIS_ANONYME = \[[^\]]*'patient_liens'/.test(rls));

/* ── 2. Le praticien ─────────────────────────────────────────────────────── */
console.log('\nLe praticien');
function banc(reponses) {
  const appels = [];
  const ctx = vm.createContext({
    crypto: require('crypto').webcrypto, btoa: s => Buffer.from(s, 'binary').toString('base64'),
    SUPA_URL_P: 'https://base', _sbHeaders: () => ({ Prefer: 'return=representation' }),
    window: { location: { origin: 'https://app.x', pathname: '/programme.html' } },
    _shareNomParam: () => '&nom=Thomas%20Martin', encodeURIComponent,
    _fetchRetry: (url, o) => {
      appels.push({ url, methode: o.method, corps: o.body ? JSON.parse(o.body) : null });
      const r = reponses.shift() || { status: 200, json: [] };
      return Promise.resolve({ ok: r.status < 300, status: r.status, json: () => Promise.resolve(r.json) });
    }
  });
  try { vm.runInContext(['_jetonAleatoire', '_lienJetonLire', '_lienJeton', '_revoquerLien', '_urlAthlete'].map(fd).join('\n') + '\nvar _liensJeton = {};', ctx); }
  catch (e) { ok('les fonctions se chargent', false, e.message); }
  return { ctx, appels };
}
(async () => {
  {
    const { ctx } = banc([]);
    let a = '', b = '';
    try { a = ctx._jetonAleatoire(); b = ctx._jetonAleatoire(); } catch (e) {}
    ok('un jeton aléatoire de 32 caractères, lisible dans une URL', /^[A-Za-z0-9_-]{32}$/.test(a) && a !== b, a);
  }
  {
    const { ctx, appels } = banc([{ status: 200, json: [] }]);
    const v = await ctx._lienJetonLire('p1').catch(e => 'ERREUR ' + e.message);
    ok('ouvrir le menu ne fait que LIRE : pas de jeton, rien de créé', v === null && appels.length === 1 && appels[0].methode === 'GET', JSON.stringify(appels));
  }
  {
    const { ctx, appels } = banc([{ status: 200, json: [] }, { status: 201, json: [{ jeton: 'J'.repeat(32) }] }]);
    const j = await ctx._lienJeton('p1').catch(e => 'ERREUR ' + e.message);
    const post = appels.find(x => x.methode === 'POST');
    ok('partager crée le jeton du patient', j === 'J'.repeat(32) && post && post.corps.patient_id === 'p1' && /^[A-Za-z0-9_-]{32}$/.test(post.corps.jeton), JSON.stringify(appels));
    const n = appels.length; const j2 = await ctx._lienJeton('p1');
    ok('… une seule fois : le second partage le reprend', j2 === j && appels.length === n);
  }
  {
    const { ctx, appels } = banc([{ status: 200, json: [{ jeton: 'K'.repeat(32) }] }]);
    const j = await ctx._lienJeton('p2');
    ok('un jeton déjà actif est repris, jamais remplacé en silence', j === 'K'.repeat(32) && !appels.some(x => x.methode === 'POST'));
  }
  {
    const { ctx } = banc([{ status: 404, json: { message: 'relation "patient_liens" does not exist' } }]);
    const j = await ctx._lienJeton('p3').catch(() => 'LEVÉE');
    const b2 = banc([{ status: 404, json: {} }]);
    const l = await b2.ctx._lienJetonLire('p3').catch(() => 'LEVÉE');
    ok('migration pas encore appliquée : aucun jeton, aucune erreur (repli sur l\'ancien lien)', j === null && l === undefined, j + ' / ' + l);
  }
  {
    const { ctx } = banc([{ status: 200, json: [] }, { status: 200, json: [] }, { status: 200, json: [] }]);
    const j = await ctx._lienJeton('p4');
    ok('un refus silencieux de la base (200, []) n\'est jamais pris pour un jeton', j === null, String(j));
  }
  {
    const { ctx } = banc([]);
    const u = (a, b, c) => { try { return ctx._urlAthlete(a, b, c); } catch (e) { return 'ERREUR ' + e.message; } };
    ok('le lien porte le jeton', u('p1', 'J'.repeat(32)) === 'https://app.x/athlete.html?j=' + 'J'.repeat(32) + '&nom=Thomas%20Martin', u('p1', 'J'.repeat(32)));
    ok('… un programme aussi, par le jeton de son patient', u('p1', 'J'.repeat(32), 'pr9') === 'https://app.x/athlete.html?j=' + 'J'.repeat(32) + '&prog=pr9&nom=Thomas%20Martin');
    ok('… et sans jeton, l\'ancien lien (migration non appliquée)', u('p1', null) === 'https://app.x/athlete.html?patient=p1&nom=Thomas%20Martin' && u('p1', null, 'pr9') === 'https://app.x/athlete.html?prog=pr9&nom=Thomas%20Martin');
  }
  {
    const { ctx, appels } = banc([{ status: 200, json: [{ jeton: 'K'.repeat(32), revoque_at: 'x' }] }]);
    ctx._liensJeton.p5 = 'K'.repeat(32);
    const r = await ctx._revoquerLien('p5');
    const p = appels[0] || {};
    ok('révoquer : le lien ACTIF reçoit sa date de révocation', r === true && p.methode === 'PATCH' && /patient_id=eq\.p5/.test(p.url) && /revoque_at=is\.null/.test(p.url) && !!(p.corps && p.corps.revoque_at), JSON.stringify(p));
    ok('… et le jeton quitte le cache de la session', !ctx._liensJeton.p5);
    const b3 = banc([{ status: 200, json: [] }]);
    ok('… une révocation qui n\'a rien écrit ne se dit pas réussie', (await b3.ctx._revoquerLien('p6')) === false);
  }

  /* Le jeton ne se crée qu'au partage : ouvrir le menu, sélectionner un
     patient ou ouvrir le builder n'en créent jamais. */
  const tout = pdata + '\n' + pmain, sites = [];
  let re = /_lienJeton\(/g, m;
  while ((m = re.exec(tout))) {
    if (tout.slice(m.index - 9, m.index) === 'function ') continue;
    const av = tout.lastIndexOf('\nfunction ', m.index), nom = (tout.slice(av + 10).match(/^(\w+)/) || [])[1];
    sites.push(nom);
  }
  ok('le jeton ne se crée qu\'au partage (_doShare, _copyLink, _regenererLien)', sites.length >= 3 && sites.every(n => ['_doShare', '_copyLink', '_regenererLien', '_lienJeton'].includes(n)), sites.join(', '));
  const v2 = pmain.slice(pmain.indexOf('  shareCalLink = function(){'), pmain.indexOf('  };\n})();', pmain.indexOf('  shareCalLink = function(){')));
  ok('ouvrir le menu Partager ne fait que lire le jeton', /_lienJetonLire\(/.test(v2) && !/_lienJeton\(/.test(v2));
  ok('… et propose « Régénérer le lien » quand un jeton existe', /_regenererLien\(\)/.test(v2) && /Régénérer le lien/.test(v2));
  const rg = fm('_regenererLien');
  ok('régénérer : confirmé (danger), l\'ancien révoqué, un NOUVEAU copié', /r4pConfirmer\(\{[^}]*danger:true/.test(rg) && /_revoquerLien\(/.test(rg) && /j === ancien/.test(rg) && /_copierLienAsync\(|_copierTexte\(/.test(rg));
  ok('le lien se copie même quand le jeton arrive après le clic (Safari)', /new ClipboardItem\(/.test(fd('_copierLienAsync')) && /_copierLienAsync\(/.test(fm('_doShare')) && /_copierLienAsync\(/.test(fd('_copyLink')));

  /* ── 3. L'athlète ──────────────────────────────────────────────────────── */
  console.log('\nL\'espace athlète');
  ok('?j= est un lien personnel : l\'appli installée le garde', /p\.get\('patient'\) \|\| p\.get\('prog'\) \|\| p\.get\('j'\)/.test(ath));
  const init = ath.slice(ath.indexOf('\nfunction init(){'), ath.indexOf('\nfunction refresh(){'));
  ok('… il se lit, se mémorise et se restaure', /_jeton\s*= params\.get\('j'\)\s*\|\| ''/.test(init) && /j:_jeton/.test(init) && /_jeton = ctx\.j\|\|''/.test(init));
  ok('… il part en en-tête sur chaque appel', /if\(_jeton\)\s+h\['x-r4p-jeton'\] = _jeton;/.test(ath));
  const rs = ath.slice(ath.indexOf('\nfunction _resoudreLien('), ath.indexOf('\n}\n', ath.indexOf('\nfunction _resoudreLien(')) + 3);
  ok('la page demande à la base quel patient ouvre le jeton', /\/rest\/v1\/rpc\/r4p_lien_patient/.test(rs) && /headers:\s*_entetes\(\)/.test(rs) && /_patientId = String\(pid\)/.test(rs));
  ok('… un lien remplacé le DIT, au lieu d\'un calendrier vide', /pid === null/.test(rs) && /showError\('Lien remplacé'/.test(rs));
  ok('… hors ligne, la page fait comme avant', /\.catch\(function\(\)\{\s*suite\(\);\s*\}\)/.test(rs));
  ok('init attend la réponse avant de choisir sa vue', /_resoudreLien\(_demarrer\);/.test(init));
  ok('notifications et guide d\'installation relancés après la réponse', /_maybeOfferPush\(\)/.test(rs) && /_maybeOfferInstallGuide\(\)/.test(rs));

  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Lien athlète : un jeton par patient, révocable, bascule patient par patient.');
})();

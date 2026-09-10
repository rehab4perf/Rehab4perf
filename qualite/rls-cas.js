#!/usr/bin/env node
/* Cas de référence — cloisonnement des lignes (RLS) entre praticiens, et
 * pour l'espace athlète.
 *
 * Mesuré le 2026-09-10, par comptages seuls (`count=exact`, aucune ligne
 * lue) : un praticien de démo tout neuf voyait 868 programmes, 15 réglages de
 * cycles, 10 protocoles et 2 messages — il en possédait 3, 0, 0 et 0. Et la
 * clé PUBLIQUE, écrite en clair dans athlete.html, voyait exactement les
 * mêmes chiffres, plus 275 notes cliniques, 975 séances planifiées, 395
 * activités Strava et 110 retours d'athlète.
 *
 * Pourquoi ça ne se voyait pas : chaque requête du produit filtre elle-même
 * par `patient_id=eq.` ou `praticien_id=eq.`. L'application n'affichait donc
 * jamais les lignes d'autrui — c'est la BASE qui les rendait à quiconque les
 * demandait sans filtre. Et les politiques en place ne sont pas dans le
 * dépôt : rien, en lisant le code, ne permettait de le savoir.
 *
 * Ce cas vérifie l'état FINAL des migrations versionnées — politiques créées
 * puis supprimées, dans l'ordre des fichiers — et le code qui doit les
 * accompagner :
 *   1. un praticien connecté est borné à SES lignes par une politique
 *      RESTRICTIVE : elle s'ajoute en ET aux politiques déjà en base, que le
 *      dépôt ne connaît pas, et aucune politique large ne peut la contourner ;
 *   2. la clé anonyme n'ouvre que le patient désigné par l'en-tête du lien,
 *      n'écrit que ce que l'athlète écrit, et n'ouvre JAMAIS les notes
 *      cliniques ;
 *   3. athlete.html envoie cet en-tête sur CHAQUE appel REST — sans quoi
 *      l'espace athlète serait vide dès la migration appliquée ;
 *   4. le builder ne lit plus de donnée patient sous la clé anonyme — la
 *      même migration l'aurait privé des cycles du patient.
 *
 * Une branche de OU non bornée suffit à tout rouvrir (`… OR true`) : chaque
 * branche est donc contrôlée, pas seulement la présence d'`auth.uid()`.
 *
 *   node qualite/rls-cas.js            # migrations + code (hors ligne)
 *   node qualite/rls-cas.js --live     # + comptages réels (après application)
 *     R4P_PATIENT=<uuid d'un patient de démo>   l'en-tête n'ouvre que lui
 *     R4P_JWT=<access_token du compte de démo>  le praticien ne voit que ses lignes
 */
'use strict';
var fs = require('fs'), path = require('path');
var RACINE = path.join(__dirname, '..');
function lire(f) { return fs.readFileSync(path.join(RACINE, f), 'utf8'); }

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Tables qui portent une donnée d'un patient. `athlete_feedback` et
   `protocol_criteria_checks` n'ont pas de colonne patient : elles se
   rattachent par jointure. */
var TABLES_PATIENT = ['programmes', 'seances_planifiees', 'patient_settings',
  'patient_protocols', 'protocol_criteria_checks', 'patient_messages',
  'clinical_notes', 'strava_activities', 'athlete_feedback', 'athlete_objectifs'];
/* Bibliothèque : ses lignes publiques sont faites pour être partagées. */
var TABLES_BIBLIO = ['templates', 'template_groups'];
/* Ce que l'athlète écrit réellement depuis athlete.html. Tout le reste lui est
   fermé en écriture. */
var ECRITURES_ATHLETE = {
  athlete_feedback: ['INSERT', 'UPDATE'],            // upsert merge-duplicates
  athlete_objectifs: ['INSERT', 'UPDATE', 'DELETE']
};
/* Jamais par un lien, quel qu'il soit. */
var JAMAIS_ANONYME = ['clinical_notes', 'template_groups'];
var COMMANDES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/* ── Lecture du SQL ─────────────────────────────────────────────────────── */

/* Découpe en instructions, commentaires retirés. Les commentaires de ces
   fichiers contiennent des apostrophes (« l'athlète ») : il faut les retirer
   AVANT de suivre les chaînes, sinon le découpage part de travers. */
function instructions(sql) {
  var out = [], cur = '', i = 0, n = sql.length;
  while (i < n) {
    var c = sql[i], d = sql.substr(i, 2);
    if (d === '--') { var e = sql.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (d === '/*') { var e2 = sql.indexOf('*/', i + 2); i = e2 < 0 ? n : e2 + 2; cur += ' '; continue; }
    if (c === "'") {
      var j = i + 1;
      while (j < n) { if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } break; } j++; }
      cur += sql.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '$') {
      var m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i, i + 40));
      if (m) {
        var f = sql.indexOf(m[0], i + m[0].length);
        f = f < 0 ? n : f + m[0].length;
        cur += sql.slice(i, f); i = f; continue;
      }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.replace(/\s+/g, ' ').trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.replace(/\s+/g, ' ').trim());
  return out;
}

function entreParentheses(s, from) {
  var prof = 0, q = false;
  for (var k = from; k < s.length; k++) {
    var ch = s[k];
    if (ch === "'") { q = !q; continue; }
    if (q) continue;
    if (ch === '(') prof++;
    else if (ch === ')') { prof--; if (!prof) return s.slice(from + 1, k); }
  }
  return null;
}

function lirePolitique(st) {
  var m = /^CREATE POLICY "?(\w+)"? ON (?:public\.)?"?(\w+)"?\s*([\s\S]*)$/i.exec(st);
  if (!m) return null;
  var reste = m[3];
  var tete = reste.split(/\bUSING\s*\(|\bWITH CHECK\s*\(/i)[0];
  var p = { nom: m[1], table: m[2], restrictive: /\bAS RESTRICTIVE\b/i.test(tete),
            cmd: 'ALL', roles: ['public'], using: null, check: null };
  var f = /\bFOR (ALL|SELECT|INSERT|UPDATE|DELETE)\b/i.exec(tete);
  if (f) p.cmd = f[1].toUpperCase();
  var t = /\bTO ([\w\s,]+)$/i.exec(tete.trim());
  if (t) p.roles = t[1].split(',').map(function (s) { return s.trim().toLowerCase(); });
  var u = reste.search(/\bUSING\s*\(/i);
  if (u >= 0) p.using = entreParentheses(reste, reste.indexOf('(', u));
  var w = reste.search(/\bWITH CHECK\s*\(/i);
  if (w >= 0) p.check = entreParentheses(reste, reste.indexOf('(', w));
  return p;
}

/* Rejoue les migrations dans l'ordre et rend l'état final. */
function etatFinal(dossier) {
  var fichiers = fs.readdirSync(dossier).filter(function (f) { return /\.sql$/.test(f); }).sort();
  var pol = {}, fn = {}, rlsCoupee = {};
  fichiers.forEach(function (f) {
    instructions(fs.readFileSync(path.join(dossier, f), 'utf8')).forEach(function (st) {
      var p = lirePolitique(st);
      if (p) { pol[p.table + '.' + p.nom] = p; return; }
      var d = /^DROP POLICY (?:IF EXISTS )?"?(\w+)"? ON (?:public\.)?"?(\w+)"?/i.exec(st);
      if (d) { delete pol[d[2] + '.' + d[1]]; return; }
      var a = /^ALTER POLICY "?(\w+)"? ON (?:public\.)?"?(\w+)"?/i.exec(st);
      if (a) { pol[a[2] + '.' + a[1]] = { nom: a[1], table: a[2], altere: true, roles: [], cmd: 'ALL' }; return; }
      var c = /^CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?"?(\w+)"?\s*\(/i.exec(st);
      if (c) { fn[c[1].toLowerCase()] = st; return; }
      var df = /^DROP FUNCTION (?:IF EXISTS )?(?:public\.)?"?(\w+)"?/i.exec(st);
      if (df) { delete fn[df[1].toLowerCase()]; return; }
      var r = /^ALTER TABLE (?:IF EXISTS )?(?:ONLY )?(?:public\.)?"?(\w+)"? (ENABLE|DISABLE) ROW LEVEL SECURITY/i.exec(st);
      if (r) rlsCoupee[r[1]] = r[2].toUpperCase() === 'DISABLE';
    });
  });
  return { politiques: Object.keys(pol).map(function (k) { return pol[k]; }), fonctions: fn,
           rlsCoupee: rlsCoupee, fichiers: fichiers };
}

/* ── Bornage d'une expression ───────────────────────────────────────────── */

/* Découpe au premier niveau de parenthèses, hors chaînes. */
function decoupe(e, mot) {
  var parts = [], prof = 0, q = false, deb = 0, re = new RegExp('^\\s' + mot + '\\s', 'i');
  for (var k = 0; k < e.length; k++) {
    var ch = e[k];
    if (ch === "'") { q = !q; continue; }
    if (q) continue;
    if (ch === '(') prof++;
    else if (ch === ')') prof--;
    else if (!prof && re.test(e.slice(k, k + mot.length + 2))) {
      parts.push(e.slice(deb, k)); deb = k + mot.length + 1;
    }
  }
  parts.push(e.slice(deb));
  return parts.map(function (s) { return s.trim(); });
}
function deballe(e) {
  e = e.trim();
  while (e[0] === '(' && entreParentheses(e, 0) !== null && entreParentheses(e, 0).length === e.length - 2) {
    e = e.slice(1, -1).trim();
  }
  return e;
}

/* Une fonction « porte l'identité du praticien » si son corps compare une
   colonne à auth.uid(). « porte le lien » si elle lit un en-tête x-r4p-… de
   la requête, ou appelle une fonction qui le fait. */
var RE_UID = /(=\s*\(?\s*(select\s+)?auth\.uid\(\)|auth\.uid\(\)\s*\)?\s*=)/i;
function fonctionPorte(etat, nom, genre, vu) {
  vu = vu || {};
  if (vu[nom]) return false; vu[nom] = true;
  var corps = etat.fonctions[nom.toLowerCase()];
  if (!corps) return false;
  if (genre === 'praticien') return RE_UID.test(corps);
  if (/request\.headers/i.test(corps) && /'x-r4p-[\w-]+'/i.test(corps)) return true;
  var appels = corps.match(/r4p_lien_\w+(?=\s*\()/gi) || [];
  return appels.some(function (a) { return a.toLowerCase() !== nom.toLowerCase() && fonctionPorte(etat, a, genre, vu); });
}

/* genre : 'praticien' | 'lien'. permises : feuilles acceptées en plus
   (ex. `is_public` pour lire la bibliothèque). */
function borne(etat, e, genre, permises) {
  if (e == null) return false;
  e = deballe(e);
  var ou = decoupe(e, 'or');
  if (ou.length > 1) return ou.every(function (b) { return borne(etat, b, genre, permises); });
  var et = decoupe(e, 'and');
  if (et.length > 1) return et.some(function (b) { return borne(etat, b, genre, permises); });
  if (/^false$/i.test(e)) return true;
  if (/^exists\s*\(/i.test(e)) {
    var dedans = entreParentheses(e, e.indexOf('(')) || '';
    var ou_ = dedans.search(/\bwhere\b/i);
    return ou_ >= 0 && borne(etat, dedans.slice(ou_ + 5), genre, permises);
  }
  if ((permises || []).some(function (re) { return re.test(e); })) return true;
  if (genre === 'praticien' && RE_UID.test(e)) return true;
  var appel = /(?:^|[=\s(])(?:public\.)?(r4p_\w+)\s*\(/i.exec(e);
  if (appel) {
    if (genre === 'praticien') return fonctionPorte(etat, appel[1], 'praticien');
    return /^r4p_lien_/i.test(appel[1]) && fonctionPorte(etat, appel[1], 'lien') && /=/.test(e);
  }
  return false;
}

/* Expressions qui bornent une commande donnée, selon les règles de Postgres. */
function expressions(p, cmd) {
  if (cmd === 'SELECT' || cmd === 'DELETE') return [p.using];
  if (cmd === 'INSERT') return [p.check != null ? p.check : p.using];
  return [p.using, p.check != null ? p.check : p.using];
}
function sapplique(p, role, cmd) {
  return (p.roles.indexOf(role) >= 0 || p.roles.indexOf('public') >= 0) &&
         (p.cmd === 'ALL' || p.cmd === cmd);
}
function estFaux(p, cmd) {
  return expressions(p, cmd).every(function (x) { return x != null && /^false$/i.test(deballe(x)); });
}
/* Une commande est bornée pour un rôle s'il existe AU MOINS UNE politique
   restrictive qui la couvre avec des expressions bornées — les restrictives
   se combinent en ET, une seule suffit donc à fermer. */
function bornee(etat, table, role, cmd, genre, permises) {
  return etat.politiques.some(function (p) {
    return p.table === table && p.restrictive && !p.altere && sapplique(p, role, cmd) &&
           expressions(p, cmd).every(function (x) { return borne(etat, x, genre, permises); });
  });
}
function fermee(etat, table, role, cmd) {
  return etat.politiques.some(function (p) {
    return p.table === table && p.restrictive && sapplique(p, role, cmd) && estFaux(p, cmd);
  });
}

/* ═══ 1. Le praticien connecté ═══════════════════════════════════════════ */

var DOSSIER = process.env.R4P_MIGRATIONS || path.join(RACINE, 'supabase', 'migrations');
var etat = etatFinal(DOSSIER);

console.log('\nUn praticien connecté ne lit et n\'écrit que SES lignes');
TABLES_PATIENT.concat(TABLES_BIBLIO).forEach(function (t) {
  var biblio = TABLES_BIBLIO.indexOf(t) >= 0;
  ok(t + ' : lecture bornée' + (biblio ? ' (siennes + bibliothèque publique)' : ''),
     bornee(etat, t, 'authenticated', 'SELECT', 'praticien', biblio ? [/^is_public( is true| = true)?$/i] : []),
     'aucune politique RESTRICTIVE pour authenticated dont chaque branche porte auth.uid()');
  var ecr = ['INSERT', 'UPDATE', 'DELETE'].filter(function (c) {
    return !bornee(etat, t, 'authenticated', c, 'praticien', []);
  });
  ok(t + ' : écriture bornée — jamais sur une ligne publique d\'autrui', !ecr.length,
     'non borné : ' + ecr.join(', '));
});
ok('le rattachement au patient compare bien le praticien à auth.uid()',
   fonctionPorte(etat, 'r4p_patient_du_praticien', 'praticien'),
   'r4p_patient_du_praticien absente, ou son corps ne compare rien à auth.uid()');

/* ═══ 2. La clé anonyme ══════════════════════════════════════════════════ */

console.log('\nLa clé anonyme n\'ouvre que le patient désigné par le lien');
TABLES_PATIENT.concat(TABLES_BIBLIO).forEach(function (t) {
  if (JAMAIS_ANONYME.indexOf(t) >= 0) {
    ok(t + ' : jamais lisible par un lien', fermee(etat, t, 'anon', 'SELECT'),
       'aucune politique restrictive `false` pour anon');
    return;
  }
  var permises = t === 'templates' ? [/^nom = '__cr_config__'$/i, /^is_public( is true| = true)?$/i] : [];
  ok(t + ' : lecture bornée à l\'en-tête du lien',
     bornee(etat, t, 'anon', 'SELECT', 'lien', permises),
     'aucune politique restrictive pour anon comparant à r4p_lien_…()');
  var autorisees = ECRITURES_ATHLETE[t] || [];
  var fautes = ['INSERT', 'UPDATE', 'DELETE'].filter(function (c) {
    return autorisees.indexOf(c) >= 0 ? !bornee(etat, t, 'anon', c, 'lien', []) : !fermee(etat, t, 'anon', c);
  });
  ok(t + ' : ' + (autorisees.length ? 'n\'écrit que ' + autorisees.join('/') + ', pour son patient'
                                    : 'aucune écriture anonyme'), !fautes.length,
     'ouvert : ' + fautes.join(', '));
});
var athlete = lire('athlete.html');
ok('la méta de protocoles reste lisible (athlete.html la lit en anonyme)',
   etat.politiques.some(function (p) {
     return p.table === 'templates' && sapplique(p, 'anon', 'SELECT') && p.restrictive &&
            /__r4p_protocols_meta__/.test(p.using || '');
   }) || athlete.indexOf('__r4p_protocols_meta__') < 0);
var outils = lire('outils.html');
var iCR = outils.indexOf("/rest/v1/templates?nom=eq.' + CR_SUPA_NOM");
var crAnonyme = iCR >= 0 && !/Authorization|_crSbHeaders/.test(outils.slice(iCR, iCR + 400));
ok('la configuration CR globale reste lisible (outils.html la lit en anonyme)',
   !crAnonyme || etat.politiques.some(function (p) {
     return p.table === 'templates' && sapplique(p, 'anon', 'SELECT') && p.restrictive &&
            /__cr_config__/.test(p.using || '');
   }));
Object.keys(etat.rlsCoupee).forEach(function (t) {
  ok(t + ' : la RLS n\'est coupée par aucune migration', !etat.rlsCoupee[t]);
});

/* ═══ 3. athlete.html envoie l'en-tête ═══════════════════════════════════ */

console.log('\nL\'espace athlète envoie l\'en-tête du lien sur chaque appel');
function extraire(src, sig) {
  var d = src.indexOf(sig);
  if (d < 0) return null;
  var f = src.indexOf('\nfunction ', d + sig.length);
  return src.slice(d, f < 0 ? undefined : f);
}
var srcEnt = extraire(athlete, 'function _entetes(');
var srcKine = extraire(athlete, 'function _entetesKine(');
ok('_entetes() existe', !!srcEnt);
ok('_entetesKine() existe', !!srcKine);
var entetes = function () { return {}; }, kine = function () { return {}; };
function fabrique(patient, prog, stockage) {
  var ls = { getItem: function (k) { return stockage && stockage[k] != null ? stockage[k] : null; } };
  return new Function('SUPA_KEY', '_patientId', '_progId', 'localStorage',
    (srcEnt || '') + '\n' + (srcKine || '') +
    '\nreturn [typeof _entetes==="function"?_entetes:null, typeof _entetesKine==="function"?_entetesKine:null];'
  )('cle-publique', patient, prog, ls);
}
if (srcEnt) {
  var cal = fabrique('11111111-2222-4333-8444-555555555555', '', null)[0]({ Prefer: 'return=minimal' });
  ok('lien calendrier : x-r4p-patient porte le patient', cal['x-r4p-patient'] === '11111111-2222-4333-8444-555555555555',
     JSON.stringify(cal));
  ok('… avec la clé publique et les en-têtes demandés en plus', cal.apikey === 'cle-publique' && cal.Prefer === 'return=minimal');
  ok('… et sans jeton praticien (l\'athlète n\'en a pas)', !cal.Authorization);
  var prg = fabrique('', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', null)[0]();
  ok('lien programme : x-r4p-prog porte le programme', prg['x-r4p-prog'] === 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
     JSON.stringify(prg));
  ok('… et n\'invente pas de patient vide', !('x-r4p-patient' in prg));

  /* Les noms d'en-tête lus par la base doivent être ceux qu'envoie la page :
     une faute de frappe d'un côté vide l'espace athlète en silence. */
  var lus = {};
  Object.keys(etat.fonctions).forEach(function (n) {
    (etat.fonctions[n].match(/'x-r4p-[\w-]+'/gi) || []).forEach(function (h) { lus[h.slice(1, -1).toLowerCase()] = 1; });
  });
  var envoyes = Object.keys(cal).concat(Object.keys(prg)).map(function (h) { return h.toLowerCase(); });
  var orphelins = Object.keys(lus).filter(function (h) { return envoyes.indexOf(h) < 0; });
  ok('chaque en-tête lu par la base est envoyé par la page', Object.keys(lus).length && !orphelins.length,
     Object.keys(lus).length ? 'jamais envoyé : ' + orphelins.join(', ') : 'aucun en-tête lu par les migrations');
}
if (srcKine) {
  var sess = {}; sess['sb-sxdobjodxkwexaspepdm-auth-token'] = JSON.stringify({ access_token: 'jwt-du-praticien' });
  var k1 = fabrique('11111111-2222-4333-8444-555555555555', '', sess)[1]();
  ok('mode kiné : les notes cliniques partent sous le jeton du praticien', k1.Authorization === 'Bearer jwt-du-praticien',
     JSON.stringify(k1));
  var k2 = fabrique('11111111-2222-4333-8444-555555555555', '', {})[1]();
  ok('… et sans session, pas de jeton inventé', !k2.Authorization);
}

/* Aucune clé publique écrite à la main hors des deux fabriques : c'est ce
   qui garantit que tout appel REST passe par elles. Seule exception, l'appel
   à une Edge Function, dont le CORS est géré par la fonction elle-même. */
var sansFab = athlete.replace(srcEnt || ' ', '').replace(srcKine || ' ', '');
var litteraux = [], re = /'apikey'\s*:/g, mm;
while ((mm = re.exec(sansFab))) {
  var avant = sansFab.slice(Math.max(0, mm.index - 260), mm.index);
  if (!/\/functions\/v1\//.test(avant)) litteraux.push(sansFab.slice(0, mm.index).split('\n').length);
}
ok('aucun appel REST d\'athlete.html n\'écrit ses en-têtes à la main', !litteraux.length,
   litteraux.length + ' littéral(aux) — ligne(s) ~' + litteraux.join(', ') + ' (numérotation hors fabriques)');
var iNotes = athlete.indexOf('/rest/v1/clinical_notes');
ok('les notes cliniques passent par _entetesKine()', iNotes < 0 || /_entetesKine\(/.test(athlete.slice(iNotes, iNotes + 300)));

/* ═══ 4. Le builder ne lit rien sous la clé anonyme ══════════════════════ */

console.log('\nLe builder lit les données patient sous le jeton du praticien');
['js/prog-main.js', 'js/prog-data.js'].forEach(function (f) {
  var s = lire(f), r2 = /\{\s*'apikey'\s*:\s*SUPA_KEY_P[^}]*\}/g, m2, fautes = [];
  while ((m2 = r2.exec(s))) {
    if (/Authorization/.test(m2[0])) continue;
    /* Toléré : la branche « pas de jeton » d'un ternaire dont l'autre branche
       porte le jeton — sans session, il n'y a rien à lire de toute façon. */
    var av = s.slice(Math.max(0, m2.index - 300), m2.index);
    if (/_progToken\s*\?[\s\S]*Authorization[\s\S]*:\s*$/.test(av)) continue;
    fautes.push(s.slice(0, m2.index).split('\n').length);
  }
  ok(f + ' : aucune lecture sous la seule clé publique', !fautes.length, 'ligne(s) ' + fautes.join(', '));
});

/* ═══ 5. En base (optionnel) ═════════════════════════════════════════════ */

function fin() {
  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Cloisonnement RLS : tous les cas passent.');
}

if (process.argv.indexOf('--live') < 0) { fin(); }
else {
  var URL_ = /var SUPA_URL\s*=\s*'([^']+)'/.exec(athlete)[1];
  var CLE = /var SUPA_KEY\s*=\s*'([^']+)'/.exec(athlete)[1];
  var compte = function (table, ent, filtre) {
    return fetch(URL_ + '/rest/v1/' + table + '?select=*' + (filtre || ''), {
      method: 'HEAD', headers: Object.assign({ apikey: CLE, Prefer: 'count=exact' }, ent || {})
    }).then(function (r) {
      if (!r.ok) return 'HTTP ' + r.status;
      return Number((r.headers.get('content-range') || '/?').split('/')[1]);
    });
  };
  (async function () {
    console.log('\nEn base — clé publique SANS en-tête : rien ne doit sortir');
    for (var t of TABLES_PATIENT.concat(TABLES_BIBLIO)) {
      var n = await compte(t);
      if (t === 'templates') {
        var cr = await compte(t, null, '&nom=eq.__cr_config__');
        ok('templates : seule la configuration CR globale est lisible', n === cr, n + ' visibles, dont ' + cr + ' config CR');
      } else ok(t + ' : 0 ligne', n === 0, n + ' visibles');
    }
    var P = process.env.R4P_PATIENT;
    if (P) {
      console.log('\nEn base — en-tête du patient ' + P.slice(0, 8) + '… : lui seul');
      for (var t2 of ['programmes', 'seances_planifiees', 'patient_settings', 'patient_protocols',
                      'patient_messages', 'strava_activities', 'athlete_objectifs']) {
        var tous = await compte(t2, { 'x-r4p-patient': P });
        var siens = await compte(t2, { 'x-r4p-patient': P }, '&patient_id=eq.' + P);
        ok(t2 + ' : ' + tous + ' visible(s), toutes à ce patient', tous === siens, siens + ' à lui');
      }
      var notes = await compte('clinical_notes', { 'x-r4p-patient': P });
      ok('clinical_notes : 0, même avec l\'en-tête', notes === 0, notes + ' visibles');
    }
    var J = process.env.R4P_JWT;
    if (J) {
      var uid = JSON.parse(Buffer.from(J.split('.')[1], 'base64url').toString()).sub;
      var auth = { Authorization: 'Bearer ' + J };
      var ids = await fetch(URL_ + '/rest/v1/patients?select=id', { headers: Object.assign({ apikey: CLE }, auth) })
        .then(function (r) { return r.json(); }).then(function (a) { return a.map(function (x) { return x.id; }); });
      var liste = (ids.length ? ids : ['00000000-0000-0000-0000-000000000000']).join(',');
      console.log('\nEn base — praticien ' + uid.slice(0, 8) + '… (' + ids.length + ' patients) : ses lignes seulement');
      var filtres = {
        programmes: '&or=(praticien_id.eq.' + uid + ',patient_id.in.(' + liste + '))',
        seances_planifiees: '&or=(praticien_id.eq.' + uid + ',patient_id.in.(' + liste + '))',
        patient_protocols: '&or=(praticien_id.eq.' + uid + ',patient_id.in.(' + liste + '))',
        patient_messages: '&or=(praticien_id.eq.' + uid + ',patient_id.in.(' + liste + '))',
        clinical_notes: '&or=(praticien_id.eq.' + uid + ',patient_id.in.(' + liste + '))',
        patient_settings: '&patient_id=in.(' + liste + ')',
        strava_activities: '&patient_id=in.(' + liste + ')',
        athlete_objectifs: '&patient_id=in.(' + liste + ')',
        templates: '&or=(praticien_id.eq.' + uid + ',and(is_public.is.true,nom.not.in.(__r4p_favs_meta__,__r4p_protocols_meta__)))',
        template_groups: '&or=(praticien_id.eq.' + uid + ',is_public.is.true)'
      };
      for (var t3 of Object.keys(filtres)) {
        var vis = await compte(t3, auth), a_lui = await compte(t3, auth, filtres[t3]);
        ok(t3 + ' : ' + vis + ' visible(s) = ' + a_lui + ' à lui', vis === a_lui);
      }
      for (var t4 of ['protocol_criteria_checks', 'athlete_feedback']) {
        console.log('  · ' + t4 + ' : ' + (await compte(t4, auth)) + ' visible(s) (jointure — pas de filtre direct)');
      }
    }
    fin();
  })().catch(function (e) { console.error(e); process.exit(1); });
}

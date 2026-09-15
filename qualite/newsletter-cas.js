#!/usr/bin/env node
/* Cas de référence — newsletter « Le Vestiaire » : deux clés, chacun la sienne.
 *
 * Le praticien PROPOSE la newsletter (`active`), l'athlète l'ACCEPTE
 * (`consentement`) et choisit format et sujets. La RLS dit QUI touche une
 * ligne ; elle ne dit pas QUOI. Sans droits par colonne, la clé anonyme —
 * écrite en clair dans athlete.html — pouvait allumer `active`, et le
 * praticien cocher le consentement à la place de l'athlète. rls-cas.js
 * contrôle le cloisonnement des lignes ; ce cas-ci contrôle les colonnes, le
 * rendu de l'espace athlète et ce que la fonction d'export laisse sortir.
 *
 * On exécute le VRAI rendu d'athlete.html, avec des doublures.
 *
 *   node qualite/newsletter-cas.js
 */
'use strict';
var fs = require('fs'), path = require('path');
var R = path.join(__dirname, '..');
function lire(f) { return fs.readFileSync(path.join(R, f), 'utf8'); }

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function memes(a, b) { return !!a && a.slice().sort().join(',') === b.slice().sort().join(','); }

/* ═══ 1. La base ═════════════════════════════════════════════════════════ */

/* Toutes les migrations de la newsletter, dans l'ordre : un droit accordé
   plus tard s'ajoute aux premiers, une fonction redéfinie remplace l'autre. */
var sql = ['20260913_newsletter_vestiaire.sql', '20260914_newsletter_email.sql']
  .map(function (f) { return lire('supabase/migrations/' + f); }).join('\n').replace(/--[^\n]*/g, '');
function colonnes(priv, table, role) {
  var re = new RegExp('GRANT\\s+' + priv + '\\s*\\(([^)]*)\\)\\s*ON\\s+public\\.' + table + '\\s+TO\\s+' + role + '\\s*;', 'gi');
  var m, cols = null;
  while ((m = re.exec(sql))) cols = (cols || []).concat(m[1].split(',').map(function (s) { return s.trim(); }));
  return cols;
}
/* Seule la DERNIÈRE définition du déclencheur compte en base. */
var iFn = sql.lastIndexOf('CREATE OR REPLACE FUNCTION public.r4p_newsletter_horodatage');
var iCorps = iFn >= 0 ? sql.indexOf('$$', iFn) : -1;
var declencheur = iCorps >= 0 ? sql.slice(iCorps, sql.indexOf('$$', iCorps + 2)) : '';

console.log('\nLa base : chacun n\'écrit que sa clé');
var iRevoke = sql.search(/REVOKE ALL ON public\.athlete_newsletter FROM anon, authenticated/i);
var iGrant = sql.search(/GRANT [^;]*ON public\.athlete_newsletter/i);
ok('les droits par défaut sont retirés AVANT d\'être rendus colonne par colonne',
   iRevoke >= 0 && iGrant > iRevoke, 'sans ce REVOKE, le GRANT ALL par défaut de Supabase rend toute restriction inutile');
var majAnon = colonnes('UPDATE', 'athlete_newsletter', 'anon');
ok('l\'athlète ne met à jour que consentement, format, sujets et e-mail',
   memes(majAnon, ['consentement', 'format', 'sujets', 'email']), JSON.stringify(majAnon));
ok('… jamais `active`, qui est au praticien', !!majAnon && majAnon.indexOf('active') < 0);
ok('l\'athlète ne reçoit aucun droit d\'insertion ni de suppression',
   !/GRANT\s+[^;]*\b(INSERT|DELETE|ALL)\b[^;]*ON\s+public\.athlete_newsletter\s+TO\s+[^;]*\banon\b/i.test(sql));
ok('le praticien ne met à jour que `active`',
   memes(colonnes('UPDATE', 'athlete_newsletter', 'authenticated'), ['active']));
ok('… et ne crée la ligne qu\'avec patient_id et active',
   memes(colonnes('INSERT', 'athlete_newsletter', 'authenticated'), ['patient_id', 'active']));
ok('à la création, le déclencheur remet consentement et e-mail à zéro',
   /TG_OP\s*=\s*'INSERT'[\s\S]*?NEW\.consentement\s*:=\s*false[\s\S]*?NEW\.email\s*:=\s*NULL[\s\S]*?RETURN NEW/i.test(declencheur),
   'un praticien pourrait sinon créer une ligne déjà « consentie », adresse comprise');
ok('l\'horodatage de l\'accord est posé par la base, pas par le client',
   /NEW\.consenti_at\s*:=\s*CASE WHEN NEW\.consentement THEN now\(\)/i.test(declencheur) &&
   !(majAnon || []).some(function (c) { return /_at$/.test(c); }));
ok('pas d\'accord, pas d\'adresse : l\'e-mail est effacé dès que le consentement est faux',
   /IF NOT NEW\.consentement THEN\s+NEW\.email\s*:=\s*NULL/i.test(declencheur),
   'retirer son accord doit effacer l\'adresse — et aucune ne doit s\'enregistrer avant');
ok('une adresse mal formée est refusée par la base', /athlete_newsletter_email_check[\s\S]*?CHECK\s*\(\s*email IS NULL OR/i.test(sql));
ok('le praticien sait s\'il est inscrit sans jamais lire l\'empreinte du secret',
   memes(colonnes('SELECT', 'newsletter_praticiens', 'authenticated'), ['praticien_id']));
ok('aucune écriture de newsletter_praticiens depuis l\'application',
   !/GRANT\s+[^;]*\b(INSERT|UPDATE|DELETE|ALL)\b[^;]*ON\s+public\.newsletter_praticiens/i.test(sql));
ok('créer ou modifier une ligne exige d\'être inscrit',
   /CREATE POLICY athlete_newsletter_praticiens?\b[\s\S]*?WITH CHECK[\s\S]*?newsletter_praticiens/i.test(sql));
/* Les fonctions r4p_lien_*() appartiennent au jeton par patient
   (20260914_lien_jeton). Une migration de la newsletter qui les recrée,
   même « à l'identique » de 20260912, les ramène à l'uuid seul si on la
   rejoue après le jeton : les liens fermés se rouvrent, sans aucune erreur. */
ok('aucune migration de la newsletter ne redéfinit une fonction r4p_lien_*',
   !/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?"?r4p_lien_/i.test(sql),
   'la rejouer après 20260914_lien_jeton rouvrirait les liens athlète par l\'uuid');

/* ═══ 2. L'espace athlète ════════════════════════════════════════════════ */

console.log('\nL\'espace athlète');
var ath = lire('athlete.html');
var d0 = ath.indexOf('var NL_SUJETS'), d1 = ath.indexOf('function _nlRendre(');
var escLigne = /function escH\(s\)\{[^\n]*\}/.exec(ath);
if (d0 < 0 || d1 < d0 || !escLigne) { console.error('Bornes introuvables dans athlete.html.'); process.exit(1); }
/* eslint-disable no-new-func */
var nlApi = new Function('_echDateLisibleAth',
  escLigne[0] + '\n' + ath.slice(d0, d1) + '\nreturn { html:_nlHtml, corps:_nlCorps, sujets:NL_SUJETS, emailRe:NL_EMAIL_RE };'
)(function (d) { return 'le ' + d; });

ok('rien de proposé : la section se tait', nlApi.html(null, null, false) === '');
ok('désactivée par le praticien : la section se tait, même si l\'athlète avait accepté',
   nlApi.html({ active: false, consentement: true }, null, false) === '');

var attente = nlApi.html({ active: true, consentement: false, sujets: [] }, null, false);
ok('proposée : l\'athlète choisit oui ou non', /Oui, je la veux/.test(attente) && /Non merci/.test(attente));
ok('… « Non merci » est l\'état tant qu\'il n\'a pas accepté',
   /aria-pressed="true" onclick="_nlConsentir\(false\)"/.test(attente) &&
   /aria-pressed="false" onclick="_nlConsentir\(true\)"/.test(attente));
ok('… et aucune préférence n\'est demandée avant l\'accord', attente.indexOf('nlFormat') < 0);

var accord = nlApi.html({ active: true, consentement: true, format: '70.3', sujets: ['sommeil', 'renforcement'] }, null, false);
var boutons = accord.match(/class="nl-sujet"/g) || [];
ok('acceptée : format et sujets deviennent modifiables', accord.indexOf('id="nlFormat"') > 0 && boutons.length === nlApi.sujets.length,
   boutons.length + ' sujet(s)');
var presses = (accord.match(/aria-pressed="true" onclick="_nlSujet\('(\w+)'\)/g) || [])
  .map(function (s) { return /'(\w+)'/.exec(s)[1]; });
ok('… les sujets enregistrés sont enfoncés, et eux seuls', memes(presses, ['sommeil', 'renforcement']), presses.join(','));

var saisie = nlApi.html({ active: true, consentement: true, format: '70.3', sujets: [] }, { format: 'Trail', sujets: ['nutrition'] }, false);
ok('une saisie en cours survit au re-rendu', /value="Trail"/.test(saisie) &&
   /aria-pressed="true" onclick="_nlSujet\('nutrition'\)"/.test(saisie));

var piege = nlApi.html({ active: true, consentement: true, format: '"><img src=x onerror=alert(1)>', sujets: [] }, null, false);
ok('le format saisi est échappé', piege.indexOf('<img') < 0);

ok('acceptée : l\'e-mail est demandé, et celui enregistré est repris',
   /id="nlEmail"[^>]*value="a@b\.fr"/.test(nlApi.html({ active: true, consentement: true, email: 'a@b.fr', sujets: [] }, null, false)));
ok('… jamais avant l\'accord', attente.indexOf('nlEmail') < 0);
ok('… et une adresse en cours de saisie survit au re-rendu',
   /id="nlEmail"[^>]*value="en@cours\.fr"/.test(nlApi.html({ active: true, consentement: true, email: 'a@b.fr', sujets: [] },
     { email: 'en@cours.fr', format: '', sujets: [] }, false)));
var piegeMail = nlApi.html({ active: true, consentement: true, email: '"><script>x</script>', sujets: [] }, null, false);
ok('l\'e-mail est échappé', piegeMail.indexOf('<script>') < 0);
ok('une adresse mal formée est refusée avant l\'envoi, comme en base',
   nlApi.emailRe.test('prenom@club.fr') && !nlApi.emailRe.test('prenom@club') && !nlApi.emailRe.test('pas un mail'));

var kine = nlApi.html({ active: true, consentement: false, sujets: [] }, null, true);
ok('mode kiné : lecture seule — le praticien ne consent pas à la place de l\'athlète',
   kine.indexOf('<button') < 0 && kine.indexOf('<input') < 0 && /Vue praticien/.test(kine));

var c = nlApi.corps({ consentement: true, active: true, patient_id: 'x', consenti_at: 'hier', format: 'a', sujets: [], email: 'a@b.fr' });
ok('une écriture de l\'athlète ne porte que ses colonnes', memes(Object.keys(c), ['consentement', 'format', 'sujets', 'email']),
   Object.keys(c).join(','));
ok('… et n\'invente pas les colonnes absentes', memes(Object.keys(nlApi.corps({ consentement: false })), ['consentement']));

var sqlSujets = /ARRAY\[([^\]]+)\]::text\[\]/.exec(sql);
var listeSql = sqlSujets ? sqlSujets[1].match(/'(\w+)'/g).map(function (s) { return s.slice(1, -1); }) : [];
ok('les sujets proposés sont exactement ceux que la base accepte',
   memes(nlApi.sujets.map(function (s) { return s[0]; }), listeSql), listeSql.join(','));

var iCharge = ath.indexOf("_nlCharger();");
ok('la section est chargée avec l\'agenda', iCharge > 0 && ath.indexOf('<div id="nlSection"></div>') > 0);
var appels = ath.slice(d0).match(/fetch\(SUPA_URL[^;]*?\{\s*(?:method:'\w+',\s*)?headers:\s*(\w+)\(/g) || [];
ok('chaque appel de la section passe par _entetes()', appels.length >= 2 &&
   appels.every(function (a) { return /headers:\s*_entetes\(/.test(a); }), appels.length + ' appel(s)');

/* ═══ 3. Ce qui sort de la fonction d'export ═════════════════════════════ */

console.log('\nLa fonction d\'export ne laisse sortir que le nécessaire');
var fx = lire('supabase/functions/newsletter-export/index.ts').replace(/\/\/[^\n]*/g, '');
ok('un secret est exigé, et comparé par son empreinte',
   /x-newsletter-secret/.test(fx) && /\.from\('newsletter_praticiens'\)[\s\S]*?\.eq\('secret_sha256',\s*await sha256Hex\(secret\)\)/.test(fx));
ok('seuls les athlètes activés ET consentants sortent',
   /\.eq\('active',\s*true\)\s*\.eq\('consentement',\s*true\)/.test(fx));
ok('… et seulement ceux du praticien du secret', /\.eq\('praticien_id',\s*prat\.praticien_id\)/.test(fx));
var selPat = /\.from\('patients'\)\s*\.select\('([^']*)'\)/.exec(fx);
var colsPat = selPat ? selPat[1].split(',').map(function (s) { return s.trim(); }) : [];
ok('patients : ni le nom, ni la fiche, ni rien d\'autre que le nécessaire',
   memes(colsPat, ['id', 'prenom', 'sport', 'niveau', 'ddn', 'sexe']), colsPat.join(', '));
ok('aucune donnée clinique n\'est seulement lue', !/clinical_notes|\bbilans\b|\.from\('fiche/.test(fx));
var iPush = fx.indexOf('athletes.push(');
var sortie = iPush >= 0 ? fx.slice(iPush, fx.indexOf('\n    })', iPush)) : '';
ok('la date de naissance ne sort pas — seulement la tranche d\'âge', !!sortie && !/\bddn\s*:/.test(sortie) && /tranche_age/.test(sortie));
ok('l\'uuid du patient (secret du lien athlète) ne sort pas', !!sortie && !/\b(id|patient_id)\s*:/.test(sortie) && /\bref\s*:/.test(sortie));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Newsletter : tous les cas passent.');

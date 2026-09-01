#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   CR — la configuration globale : lire et écrire la MÊME ligne

   Les articulations réglées à la main — les amplitudes actives et passives de
   l'épaule — disparaissaient puis revenaient, sans qu'aucune erreur ne
   s'affiche.

   La lecture demandait `nom=__cr_config__ & is_public=true` avec `limit=1` et
   SANS TRI. Postgres ne promet alors aucun ordre, et celui-ci change dès
   qu'une ligne est réécrite : un PATCH la déplace dans le tas. L'écriture,
   elle, visait l'identifiant mémorisé dans le navigateur.

   Dès qu'il existe DEUX lignes, on relit donc tantôt l'une tantôt l'autre en
   écrivant toujours dans la même.
   ════════════════════════════════════════════════════════════════════════════ */
var fs = require('fs'), path = require('path');
var echecs = 0;
function verifie(nom, attendu, obtenu){
  var ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  console.log('    ' + (ok ? '✓' : '✗') + ' ' + nom
    + (ok ? '' : '\n        attendu : ' + JSON.stringify(attendu)
             + '\n        obtenu  : ' + JSON.stringify(obtenu)));
  if (!ok) echecs++;
}
var outils = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

console.log('\n  La lecture est déterministe');
/* Borner : la chaine de requete est la seule chose qu'on veuille lire ici. */
var i = outils.indexOf("/rest/v1/templates?nom=eq.' + CR_SUPA_NOM");
if (i < 0) { console.error('Requête de configuration introuvable.'); process.exit(1); }
var req = outils.slice(i, outils.indexOf("', {", i));
verifie('elle demande un ordre stable', true, /order=id\.asc/.test(req));
/* `limit=1` sans tri est exactement le defaut : il rend UNE ligne, laquelle
   n'est pas promise. */
verifie('… et ne se contente plus d\'une ligne au hasard', false, /limit=1(&|$)/.test(req));
verifie('… tout en restant bornée', true, /limit=20/.test(req));

console.log('\n  Lecture et écriture convergent');
var z = outils.slice(i, outils.indexOf('_crInitUI();', i));
/* Le choix ne doit PAS dependre du poste. Preferer « la ligne ou ce navigateur
   ecrit » etait tentant — elle contient ce qu'on vient d'y mettre — mais c'est
   l'inverse de ce qu'il faut pour une configuration GLOBALE : chaque poste
   retiendrait sa ligne, et deux appareils afficheraient durablement deux
   configurations differentes. C'est exactement ce qui se voyait entre un Mac et
   un iPad. */
verifie('la ligne retenue est la première du tri', true, /var _choisie = rows\[0\];/.test(z));
/* Memoriser l'identifiant retenu est legitime ; le LIRE pour choisir ne l'est
   pas. On ne cherche donc que la lecture. */
verifie('… et le choix ne lit pas le stockage du navigateur', false,
  /getItem\('r4p-cr-config-sid'\)/.test(z));
/* Realigner l'identifiant est ce qui ferme la boucle : la prochaine
   sauvegarde ira dans la ligne qu'on vient de lire. */
verifie('l\'identifiant d\'écriture est réaligné', true,
  /_crConfigSupaId = _choisie\.id;/.test(z));
verifie('… et mémorisé pour la prochaine ouverture', true,
  /setItem\('r4p-cr-config-sid', String\(_choisie\.id\)\)/.test(z));
verifie('la configuration appliquée est celle retenue', true,
  /_crApplyConfig\(_choisie\.donnees\)/.test(z));
/* Aucune ligne ne doit etre lue par son indice brut : c'etait la faute. */
verifie('plus rien ne lit rows[0] à l\'aveugle', false, /_crApplyConfig\(rows\[0\]\.donnees\)/.test(z));

console.log('\n  Un doublon ne reste pas muet');
verifie('la présence de plusieurs lignes est signalée', true,
  /if \(rows\.length > 1\)[\s\S]{0,120}console\.warn/.test(z));
/* On ne SUPPRIME pas : effacer une configuration qu'on n'a pas lue serait pire
   que la laisser dormir. */
verifie('… mais aucune n\'est supprimée', false, /method: *'DELETE'/.test(z));

console.log('\n  Le repli local ne se fait pas en silence');
/* `localStorage` est propre a une ORIGINE et a un APPAREIL : la meme
   application vue sur `app.rehab4perf.com` et sur `rehab4perf.netlify.app` n'a
   pas le meme stockage, et un iPad n'a pas celui d'un Mac. Sans avertissement,
   deux postes affichent durablement deux configurations differentes. */
verifie('l\'absence de configuration en base est signalée', true,
  /aucune configuration globale en base/.test(z));
verifie('… et le repli lit bien le navigateur', true,
  /getItem\('crAmpConfig'\)/.test(z));
/* La sauvegarde prevenait deja quand elle ne pouvait pas se synchroniser. */
verifie('la sauvegarde non synchronisée le dit aussi', true,
  /Config sauvegardee localement/.test(outils));

console.log('\n  On n\'annonce que ce qui est FAIT');
/* « Sauvegardee pour tous les utilisateurs » s'affichait meme quand rien
   n'avait ete ecrit — constate : la table ne contenait AUCUNE ligne
   `__cr_config__` alors que la sauvegarde s'etait dite reussie. Meme faute que
   le webhook Strava, ou un `200` rendu a tort perd l'activite. */
var sv = outils.slice(outils.indexOf('function crSaveGlobalConfig'),
                      outils.indexOf('\n  // ── Bootstrap'));
verifie('un refus est annoncé comme tel', true,
  /if \(!res\.ok\)[\s\S]{0,300}Config NON synchronisee — erreur ' \+ res\.status/.test(sv));
verifie('… avec le motif en console', true,
  /console\.error\('cr-config : ecriture refusee/.test(sv));
/* Le succes ne se dit qu'apres une LIGNE rendue : c'est la seule preuve du
   travail. Une insertion refusee se disait enregistree parce que le message
   etait pose hors de tout `r.ok`. */
verifie('le succès suit une ligne rendue', true,
  /function _crRetenirLigne\(ligne\) \{[\s\S]{0,300}Config sauvegardee pour tous les utilisateurs/.test(sv));
verifie('… et il n\'est annoncé qu\'à cet endroit', 1,
  (sv.match(/Config sauvegardee pour tous les utilisateurs/g) || []).length);

/* PostgREST rend 204 quand l'identifiant ne correspond a AUCUNE ligne : `r.ok`
   ne prouve donc rien sur une mise a jour. `return=representation` rend les
   lignes touchees, et leur nombre est la preuve. */
verifie('les deux verbes demandent les lignes touchées', true,
  /'Prefer': 'return=representation'/.test(sv));
verifie('une mise à jour sans ligne repart en insertion', true,
  /n\\'existe plus\. Insertion[\s\S]{0,300}_crInsererConfig\(\)/.test(sv));
/* Et l'identifiant perime est OUBLIE, sinon la sauvegarde suivante repartirait
   dans le vide. */
verifie('… après avoir oublié l\'identifiant périmé', true,
  /removeItem\('r4p-cr-config-sid'\)/.test(sv));
/* « Aucune ligne » doit valoir RIEN, litteralement : rendre un objet vide au
   lieu de `null` ferait repasser le cas pour une reussite, et les gardes
   ci-dessus resteraient verts. */
verifie('… et zéro ligne rendue vaut « rien »', true,
  /siEcrit\(lignes && lignes\.length \? lignes\[0\] : null\)/.test(sv));
/* Une insertion acceptee mais sans ligne rendue n'est pas un succes non plus. */
verifie('une insertion muette n\'est pas un succès', true,
  /insertion acceptee mais aucune ligne rendue/.test(sv));

console.log('\n  L\'écriture vise toujours un identifiant explicite');
var j = outils.indexOf('function crSaveGlobalConfig');
var k = outils.indexOf('\n  // ── Bootstrap', j);
if (j < 0 || k < j) { console.error('Bornes de crSaveGlobalConfig introuvables.'); process.exit(1); }
var w = outils.slice(j, k);
verifie('elle met à jour la ligne connue', true, /templates\?id=eq\.' \+ _crConfigSupaId/.test(w));
/* Et n'insere QUE s'il n'y en a aucune — sinon chaque sauvegarde creerait un
   doublon de plus, c'est-a-dire la cause du va-et-vient. */
verifie('… et n\'insère que faute de ligne connue', true,
  /if \(_crConfigSupaId\) \{[\s\S]{0,900}\} else \{\s*_crInsererConfig\(\);\s*\}/.test(w));
/* Une seule insertion dans tout le fichier : deux chemins d'insertion, et l'on
   recreerait des doublons sans le vouloir. */
verifie('… et il n\'existe qu\'un seul chemin d\'insertion', 1,
  (w.match(/_crEcrireConfig\('POST'/g) || []).length);

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 26 attentes vérifiées');

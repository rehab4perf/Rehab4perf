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
/* La sauvegarde prevenait deja quand elle ne
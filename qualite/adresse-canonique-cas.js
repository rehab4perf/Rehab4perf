#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Une seule adresse, une seule application

   Le site répond sur deux adresses : `app.rehab4perf.com`, liée depuis le site
   vitrine, et `rehab4perf.netlify.app`, l'adresse de création. Elles servent le
   MÊME code — mais pas le même état : session, configuration du CR, brouillons
   et cache de service worker sont propres à une ORIGINE.

   Deux adresses, deux stockages qui ne se voient pas : c'est ce qui faisait
   afficher à un iPad une configuration d'amplitudes que le Mac ignorait.

   L'adresse de création renvoie donc vers l'adresse canonique.
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
var toml = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');

/* Borner la lecture au bloc de redirection : le fichier porte aussi quatre
   blocs d'en-tetes, et chercher dans tout le fichier passerait au vert sur une
   valeur trouvee ailleurs. */
var i = toml.indexOf('[[redirects]]');
if (i < 0) { console.error('Aucun bloc [[redirects]] dans netlify.toml.'); process.exit(1); }
var j = toml.indexOf('[[', i + 13);
var bloc = toml.slice(i, j < 0 ? toml.length : j);
/* Les commentaires expliquent la regle ; ils ne doivent pas la prouver. */
var regle = bloc.split('\n').filter(function (l) {
  return l.trim() && l.trim().charAt(0) !== '#';
}).join('\n');

console.log('\n  L\'adresse de création renvoie vers l\'adresse canonique');
verifie('la source est l\'adresse de création', true,
  /from = "https:\/\/rehab4perf\.netlify\.app\/\*"/.test(regle));
verifie('la destination est l\'adresse canonique', true,
  /to = "https:\/\/app\.rehab4perf\.com\/:splat"/.test(regle));
/* 301 : permanent. Un 302 laisserait les navigateurs et les moteurs continuer
   d'interroger l'ancienne adresse indefiniment. */
verifie('la redirection est permanente', true, /status = 301/.test(regle));
/* `force` est INDISPENSABLE : sans lui la regle ne s'applique que lorsqu'aucun
   fichier ne correspond — or `/index.html` existe, donc elle ne partirait
   jamais. */
verifie('elle s\'applique malgré les fichiers existants', true, /force = true/.test(regle));

console.log('\n  Chemin et paramètres sont conservés');
/* `:splat` reprend tout ce qui suit. Sans lui, chaque page profonde
   retomberait sur l'accueil — et le `?v=` de cache-busting serait perdu. */
verifie('le chemin est repris', true, /:splat/.test(regle));
verifie('… et la source capture bien tout', true, /netlify\.app\/\*"/.test(regle));

console.log('\n  Les déploiements de branche ne sont pas touchés');
/* `dev--rehab4perf.netlify.app` porte un autre nom d'hote. La regle nomme
   l'hote EXACTEMENT : aucun joker avant le chemin, sinon elle avalerait aussi
   la preproduction et l'on perdrait le seul endroit ou l'on teste avant la
   mise en ligne. */
var hote = (regle.match(/from = "https:\/\/([^/"]+)/) || [])[1];
verifie('l\'hôte source est nommé exactement', 'rehab4perf.netlify.app', hote);
verifie('… sans joker dans le nom d\'hôte', false, /\*/.test(hote || '*'));
verifie('la préproduction porte un autre hôte', false,
  'dev--rehab4perf.netlify.app' === hote);

console.log('\n  Le reste de la configuration est intact');
/* Une redirection mal placee peut faire disparaitre des en-tetes : la CSP, le
   cache court des services workers, le type MIME des manifests. */
verifie('les quatre blocs d\'en-têtes sont là', 4, (toml.match(/\[\[headers\]\]/g) || []).length);
verifie('la CSP est intacte', true, /Content-Security-Policy = "default-src 'self'/.test(toml));
verifie('les services workers gardent leur cache court', 2,
  (toml.match(/Cache-Control = "public, max-age=0, must-revalidate"/g) || []).length);
verifie('une seule redirection est déclarée', 1, (toml.match(/\[\[redirects\]\]/g) || []).length);

console.log('\n' + '─'.repeat(64));
if (echecs) { console.log('✗ ' + echecs + ' attente(s) en échec'); process.exit(1); }
console.log('✓ 13 attentes vérifiées');

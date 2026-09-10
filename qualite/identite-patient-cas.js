#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   L'identité du patient est écrite à DEUX endroits — il faut qu'elle soit LA
   MÊME, partout.

   `patients` est le registre : nom, prénom, sexe et date de naissance. C'est
   lui que montre la liste, et de lui que découlent l'âge et les normes qui en
   dépendent. Les champs de la page Infos du bilan en sont des COPIES, posées
   par `_autofillPatientFields` — et seulement si elles sont vides, donc jamais
   réécrites ensuite.

   Corriger une de ces valeurs dans le bilan ne corrigeait rien ailleurs. Une
   donnée d'identité qui dit deux choses selon l'écran où on la regarde est une
   donnée qu'on ne peut plus croire.

   POURQUOI LA CORRECTION REMONTE AUSSI DANS LES BILANS PASSÉS — décision du
   praticien : un nom, un prénom, un sexe ou une date de naissance qui change
   ne peut venir que d'une ERREUR DE SAISIE. Les vrais changements d'état civil
   sont assez rares pour ne pas gouverner la règle. Une faute laissée dans les
   bilans anciens ressortirait au premier compte-rendu tiré de l'un d'eux.

   C'est l'inverse exact de ce qu'on fait des MESURES : un bilan est un
   document daté, et sa mesure ne se réécrit jamais. L'identité n'est pas une
   mesure.

   CINQ GARDES-FOUS, et chacun ferme un vrai risque :
     - vider un champ n'efface JAMAIS le registre ;
     - sans patient sélectionné, rien n'est écrit ;
     - une valeur identique après normalisation ne déclenche aucune écriture ;
     - la coquille n'accepte QUE les quatre colonnes d'identité — un message
       forgé ne peut pas atteindre une autre colonne de la table.
     - un CHARGEMENT de bilan ne corrige jamais la fiche : seule une saisie
       réelle du praticien (`event.isTrusted`) le fait. `_deserializeBilan`
       émet `change` sur chaque champ qu'il remplit ; sans ce garde-fou, ouvrir
       un bilan réécrivait la fiche avec SA valeur et la propageait à tous les
       autres — une correction faite depuis la liste des patients revenait à
       l'ancienne, en silence.

     node qualite/identite-patient-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js    = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html  = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var shell = fs.readFileSync(path.join(R, 'index.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}

/* ── Les quatre champs sont câblés ────────────────────────────────────────── */
console.log('\nLes quatre champs d\'identité signalent leur correction');

[['f-nom', 'nom'], ['f-prenom', 'prénom'], ['f-sexe', 'sexe'], ['f-dob', 'date de naissance']]
  .forEach(function (c) {
    var re = new RegExp('<(?:input|select)[^>]*id="' + c[0] + '"[^>]*>');
    var champ = (html.match(re) || [''])[0];
    ok(c[1] + ' — le champ existe', !!champ);
    ok(c[1] + ' — il signale sa correction',
       new RegExp('onchange="[^"]*_blSyncIdentite\\(\'' + c[0] + '\',\\s*event\\)').test(champ), champ);
    /* L'événement est TRANSMIS : c'est lui qui dit si la saisie vient du
       praticien (`isTrusted`) ou du code qui remplit le formulaire. */
    /* `oninput` capitalise et recalcule a chaque frappe ; `onchange` ne part
       qu'une fois la saisie finie. Ecrire a chaque frappe propagerait « G »,
       « Ge », « Gen »… dans tous les bilans du patient. */
    ok(c[1] + ' — sur `change`, jamais sur `input`',
       !new RegExp('oninput="[^"]*_blSyncIdentite').test(champ), champ);
  });

/* ── La fonction, exécutée pour de vrai ───────────────────────────────────── */
console.log('\nCe que la correction envoie');

var dT = js.indexOf('var _BL_IDENTITE');
var dF = js.indexOf('function _blSyncIdentite(');
if (dT < 0 || dF < 0) { console.log('  ✗ `_BL_IDENTITE` ou `_blSyncIdentite` introuvable'); process.exit(1); }
var corps = js.slice(dT, js.indexOf('\n}', dF) + 2);

function lancer(champ, valeur, patient, ev) {
  /* Par défaut, une vraie saisie du praticien. Les cas de CHARGEMENT passent
     explicitement leur événement — `undefined` compris. */
  if (arguments.length < 4) ev = { isTrusted: true };
  var envoyes = [], toasts = [], propages = [];
  var pat = patient ? JSON.parse(JSON.stringify(patient)) : null;
  var f = new Function('document', 'window', '_bilanPatient', 'showToast',
                       '_capName', '_blPropagerIdentite', 'poser', 'champ', 'valeur', 'ev',
    corps +
    '\nvar _r = _blSyncIdentite(champ, ev);\nposer(_bilanPatient);\nreturn _r;');
  var res = f(
    { getElementById: function (id) { return id === champ ? { value: valeur } : null; } },
    { parent: { postMessage: function (m) { envoyes.push(m); } },
      location: { origin: 'https://x' } },
    pat,
    function (m) { toasts.push(m); },
    function (v) { return String(v || '').toLowerCase().replace(/(^|[\s\-])([\wÀ-ÿ])/g,
                     function (m, s, c) { return s + c.toUpperCase(); }); },
    function (cle, v) { propages.push([cle, v]); return { then: function () {} }; },
    function (p) { pat = p; },
    champ, valeur, ev);
  return { rendu: res, envoyes: envoyes, toasts: toasts, propages: propages, patient: pat };
}

var PAT = { id: 'uuid-1', nom: 'GENTET-RAVASCO', prenom: 'Fanny', sexe: 'F', ddn: '1992-11-07' };

/* Le NOM se range en capitales dans le registre, alors que le bilan l'affiche
   capitalise. Sans normalisation, chaque ouverture de bilan aurait reecrit la
   fiche en « Gentet-Ravasco » — et surtout, une valeur en realite IDENTIQUE
   aurait declenche une ecriture a chaque fois. */
var memeNom = lancer('f-nom', 'Gentet-Ravasco', PAT);
egal('le nom capitalisé du bilan vaut le nom du registre', 0, memeNom.envoyes.length);

var nom = lancer('f-nom', 'Gentet-Ravasko', PAT);
egal('un nom corrigé part vers le registre', 1, nom.envoyes.length);
egal('… avec le bon type', 'r4p-patient-identite', (nom.envoyes[0] || {}).type);
egal('… la bonne colonne', 'nom', (nom.envoyes[0] || {}).colonne);
egal('… et en CAPITALES', 'GENTET-RAVASKO', (nom.envoyes[0] || {}).valeur);
egal('… tandis que les bilans gardent la forme affichée', 'Gentet-Ravasko',
     (nom.propages[0] || [])[1]);
egal('… propagée sous la bonne clé', 'f-nom', (nom.propages[0] || [])[0]);

var prenom = lancer('f-prenom', 'fanny-claire', PAT);
egal('un prénom corrigé est capitalisé', 'Fanny-Claire', (prenom.envoyes[0] || {}).valeur);
egal('… sur la bonne colonne', 'prenom', (prenom.envoyes[0] || {}).colonne);

var sexe = lancer('f-sexe', 'H', PAT);
egal('le sexe part tel quel', 'H', (sexe.envoyes[0] || {}).valeur);
egal('… sur la bonne colonne', 'sexe', (sexe.envoyes[0] || {}).colonne);

var ddn = lancer('f-dob', '1992-11-08', PAT);
egal('la date de naissance part telle quelle', '1992-11-08', (ddn.envoyes[0] || {}).valeur);
egal('… sur la colonne du registre', 'ddn', (ddn.envoyes[0] || {}).colonne);
ok('… et le praticien en est averti', ddn.toasts.length === 1, ddn.toasts.join(' | '));
/* Sans mise a jour de la copie locale, chaque `change` suivant reposterait la
   meme correction : la comparaison se fait contre elle. */
egal('le patient courant retient la correction', '1992-11-08', (ddn.patient || {}).ddn);

/* ── Les garde-fous ───────────────────────────────────────────────────────── */
console.log('\nCe que la correction n\'envoie jamais');

['f-nom', 'f-prenom', 'f-sexe', 'f-dob'].forEach(function (c) {
  egal('vider ' + c + ' n\'efface rien', 0, lancer(c, '', PAT).envoyes.length);
  egal('… ni un ' + c + ' fait d\'espaces', 0, lancer(c, '   ', PAT).envoyes.length);
});
egal('sans patient sélectionné, rien n\'est écrit', 0, lancer('f-nom', 'X', null).envoyes.length);
egal('… ni sur un patient sans identifiant', 0, lancer('f-nom', 'X', { nom: 'Y' }).envoyes.length);
egal('un champ inconnu ne déclenche rien', 0, lancer('f-taille', '175', PAT).envoyes.length);

/* ── La propagation dans les bilans ───────────────────────────────────────── */
console.log('\nUn chargement de bilan ne corrige jamais la fiche');
{
  /* LE CAS POUR LEQUEL CE GARDE-FOU EXISTE — constaté en ligne, un PATCH
     `{"nom":"MARTIN"}` partant à la simple ouverture de l'app. La fiche a été
     corrigée depuis la liste des patients (1992-11-07) ; le bilan ouvert porte
     encore l'ancienne date. `_deserializeBilan` remplit le champ et émet
     `change` : un événement du CODE, `isTrusted` à faux. */
  var ouverture = lancer('f-dob', '1992-11-01', PAT, { isTrusted: false });
  egal('ouvrir un bilan n\'écrit rien dans la fiche', 0, ouverture.envoyes.length);
  egal('… ne propage rien aux autres bilans', 0, ouverture.propages.length);
  egal('… et la fiche garde SA valeur', '1992-11-07', (ouverture.patient || {}).ddn);
  egal('… sans avertir d\'une correction qui n\'a pas eu lieu', 0, ouverture.toasts.length);
  /* Un appel sans événement ne vaut pas saisie : dans le doute, on n'écrit pas. */
  egal('un appel sans événement n\'écrit rien', 0, lancer('f-dob', '1992-11-01', PAT, undefined).envoyes.length);
  /* Et la vraie saisie, elle, passe toujours — sinon le garde-fou aurait
     simplement tué la fonction. */
  egal('une saisie réelle corrige toujours la fiche', 1,
       lancer('f-dob', '1992-11-01', PAT, { isTrusted: true }).envoyes.length);
}

console.log('\nLa correction descend dans les bilans déjà enregistrés');

var dP = js.indexOf('function _blPropagerIdentite(');
if (dP < 0) { console.log('  ✗ `_blPropagerIdentite` introuvable'); process.exit(1); }
var corpsP = js.slice(dP, js.indexOf('\n}', dP) + 2);

function propager(cle, valeur, bilans) {
  var maj = [], toasts = [];
  var memoire = JSON.parse(JSON.stringify(bilans));
  var faux = {
    from: function () {
      return {
        select: function () {
          return { eq: function () {
            return { then: function (cb) { cb({ data: JSON.parse(JSON.stringify(bilans)) }); return { catch: function () {} }; } };
          } };
        },
        update: function (patch) {
          return { eq: function (_c, id) {
            maj.push({ id: id, donnees: patch.donnees });
            return { then: function (cb) { cb({ error: null }); return { catch: function () {} }; } };
          } };
        }
      };
    }
  };
  new Function('sbB', '_sbRetry', '_allBilans', 'showToast', '_bilanPatient', 'cle', 'valeur',
    corpsP + '\n_blPropagerIdentite(cle, valeur);')(
    faux, function (fn) { return fn(); }, memoire,
    function (m) { toasts.push(m); }, { id: 'uuid-1' }, cle, valeur);
  return { maj: maj, toasts: toasts, memoire: memoire };
}

var BILANS = [
  { id: 1, donnees: { 'f-nom': 'Gentet-Ravasko', 'f-eva': '3' } },
  { id: 2, donnees: { 'f-nom': 'Gentet-Ravasco', 'f-eva': '5' } },   // déjà juste
  { id: 3, donnees: { 'f-eva': '2' } },                              // ne porte pas la clé
  { id: 4, donnees: { 'f-nom': 'Gentet-Ravasko' } }
];
var pr = propager('f-nom', 'Gentet-Ravasco', BILANS);
egal('seuls les bilans divergents sont réécrits', 2, pr.maj.length);
egal('… et ce sont les bons', '1,4', pr.maj.map(function (m) { return m.id; }).join(','));
egal('la valeur corrigée y est posée', 'Gentet-Ravasco', (pr.maj[0] || {}).donnees['f-nom']);
/* Le RESTE du bilan ne doit pas bouger : on corrige une identite, pas une
   mesure. Un `update` qui remplacerait `donnees` en entier perdrait tout ce
   que la requete de lecture n'a pas rapporte. */
egal('le reste du bilan est intact', '3', (pr.maj[0] || {}).donnees['f-eva']);
egal('un bilan qui ne porte pas la clé n\'est pas touché', -1,
     pr.maj.map(function (m) { return m.id; }).indexOf(3));
/* Sans mise a jour en memoire, « Bilans precedents » et la fusion des donnees
   continueraient d'afficher l'ancienne valeur jusqu'au prochain rechargement. */
egal('la mémoire du bilan suit', 'Gentet-Ravasco', pr.memoire[0].donnees['f-nom']);
ok('le praticien sait combien de bilans ont été corrigés',
   pr.toasts.some(function (t) { return /2/.test(t); }), pr.toasts.join(' | '));

var rien = propager('f-nom', 'Gentet-Ravasco', [{ id: 9, donnees: { 'f-nom': 'Gentet-Ravasco' } }]);
egal('aucun bilan divergent → aucune écriture', 0, rien.maj.length);
ok('… et aucun message inutile', rien.toasts.length === 0, rien.toasts.join(' | '));

/* ── La coquille écrit, et n'accepte que l'identité ───────────────────────── */
console.log('\nLa coquille applique la correction');

var dH = shell.indexOf("'r4p-patient-identite'");
ok('le message est écouté', dH > 0);
var bloc = dH > 0 ? shell.slice(dH, dH + 2000) : '';

/* Le message porte un NOM DE COLONNE. Sans liste blanche, un message forge
   atteindrait n'importe quelle colonne de `patients` — `praticien_id` compris.
   C'est le seul endroit du dépôt où un postMessage nomme une colonne. */
ok('seules les colonnes d\'identité sont acceptées',
   /\['nom', ?'prenom', ?'sexe', ?'ddn'\]/.test(bloc), bloc.slice(0, 200));
ok('… et une colonne hors liste est refusée', /indexOf\([\s\S]{0,40}< 0\) return/.test(bloc));
ok('la table patients est mise à jour', /from\('patients'\)[\s\S]{0,140}update\(/.test(bloc));
ok('… sur le bon patient', /\.eq\('id',/.test(bloc));
ok('la liste en mémoire suit', /_allPatients/.test(bloc));
ok('le patient courant suit', /_currentPatient/.test(bloc));
ok('la liste est redessinée', /renderPatients\(/.test(bloc));
ok('… et le cache local aussi', /R4P_KEYS\.PATIENT/.test(bloc));
ok('les autres onglets sont prévenus', /_broadcastPatient\(/.test(bloc));
ok('une erreur d\'écriture ne passe pas sous silence', /res\.error/.test(bloc));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Identité du patient : tous les cas passent.');

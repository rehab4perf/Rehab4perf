/* Strava n'envoie pas qu'un `create` : il envoie un `update` à chaque
   modification du titre, de l'équipement ou de la description, et parfois pour
   son propre traitement différé. L'upsert du webhook ne précisait aucune cible
   de conflit — il retombait sur la clé primaire et INSÉRAIT une ligne neuve à
   chaque événement. Une seule sortie pouvait produire trois lignes.

   `_buildUaMap()` additionne la charge de chaque ligne : trois lignes, c'est
   trois fois la charge, et l'ACWR part au rouge sans raison.

   Usage : node qualite/strava-doublons-cas.js */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'js', 'prog-main.js');
const src = fs.readFileSync(SRC, 'utf8');

/* On extrait la fonction réelle plutôt que d'en recopier une version : une
   copie divergerait du produit sans que rien ne le signale. */
const debut = src.indexOf('function _dedoublonnerStrava');
if (debut < 0) { console.error('\n  _dedoublonnerStrava introuvable\n'); process.exit(1); }
const fin = src.indexOf('\n}', debut) + 2;
const _dedoublonnerStrava = new Function(
  src.slice(debut, fin) + '\nreturn _dedoublonnerStrava;'
)();

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nStrava — doublons et charge\n');

/* ── 1. L'ordre chronologique doit survivre ──
   Le piège : `strava_id` est numérique. Reconstruire depuis un objet indexé
   trierait les clés par valeur croissante, et l'agenda comme les courbes se
   retrouveraient dans l'ordre des identifiants Strava. */
{
  const entree = [
    { strava_id: 9000000002, date: '2026-08-01' },
    { strava_id: 1000000001, date: '2026-08-05' },
    { strava_id: 5000000003, date: '2026-08-10' },
  ];
  const dates = _dedoublonnerStrava(entree).map(a => a.date);
  verifier('l\'ordre de la requête (date.asc) est conservé',
    dates.join(',') === '2026-08-01,2026-08-05,2026-08-10',
    'obtenu : ' + dates.join(','));
}

/* ── 2. Trois lignes pour une sortie → une seule ── */
{
  const s = _dedoublonnerStrava([
    { strava_id: 42, date: '2026-08-12', charge: 300 },
    { strava_id: 42, date: '2026-08-12', charge: 300 },
    { strava_id: 42, date: '2026-08-12', charge: 300 },
  ]);
  verifier('trois copies → une seule ligne', s.length === 1, 'obtenu : ' + s.length);
  verifier('la charge n\'est plus comptée trois fois',
    s.reduce((t, a) => t + a.charge, 0) === 300);
}

/* ── 3. Le lien vers une séance prime ──
   Perdre `seance_id` casserait le panneau « Réalisée avec Strava » ET ferait
   recompter l'activité comme libre — donc en double d'une autre façon. */
{
  const avant = _dedoublonnerStrava([
    { strava_id: 7, date: '2026-08-12', seance_id: 'S1' },
    { strava_id: 7, date: '2026-08-12', seance_id: null },
  ]);
  verifier('lien conservé quand il arrive en premier', avant[0].seance_id === 'S1');

  const apres = _dedoublonnerStrava([
    { strava_id: 7, date: '2026-08-12', seance_id: null },
    { strava_id: 7, date: '2026-08-12', seance_id: 'S1' },
  ]);
  verifier('lien conservé quand il arrive en second', apres[0].seance_id === 'S1');
}

/* ── 4. À lien égal, la dernière reçue gagne (la plus à jour) ── */
{
  const s = _dedoublonnerStrava([
    { strava_id: 8, date: '2026-08-12', nom: 'Sortie' },
    { strava_id: 8, date: '2026-08-12', nom: 'Sortie longue renommée' },
  ]);
  verifier('à lien égal, la version la plus récente est gardée',
    s[0].nom === 'Sortie longue renommée', 'obtenu : ' + s[0].nom);
}

/* ── 5. Ne rien perdre ── */
{
  verifier('liste vide → liste vide', _dedoublonnerStrava([]).length === 0);
  verifier('entrées nulles ignorées sans planter',
    _dedoublonnerStrava([null, { strava_id: 1, date: 'x' }, undefined]).length === 1);
  /* Sans identifiant on ne peut pas dédoublonner : mieux vaut garder deux
     lignes que d'en perdre une porteuse de charge réelle. */
  const sansId = _dedoublonnerStrava([
    { strava_id: null, date: '2026-08-01' },
    { strava_id: null, date: '2026-08-02' },
  ]);
  verifier('activités sans strava_id toutes conservées', sansId.length === 2);
  verifier('aucune activité distincte fusionnée par erreur',
    _dedoublonnerStrava([
      { strava_id: 1, date: '2026-08-01' },
      { strava_id: 2, date: '2026-08-01' },
    ]).length === 2);
}

/* ── 6. Le dédoublonnage est branché sur la LECTURE ──
   S'il ne l'était que dans `_buildUaMap`, l'agenda afficherait encore trois
   chips pour une sortie. */
verifier('appliqué au chargement des activités',
  /_stravaActivities\s*=\s*_dedoublonnerStrava\(/.test(src));

/* ── 7. La suppression existe et borne sa portée au patient ──
   Sans `patient_id`, une activité partagée entre deux dossiers disparaîtrait
   des deux. */
{
  const i = src.indexOf('function _stravaSupprimer');
  verifier('_stravaSupprimer existe', i >= 0);
  const zone = src.slice(i, i + 1400);
  verifier('la suppression est bornée au patient', /patient_id=eq\./.test(zone));
  verifier('la suppression demande confirmation', /confirm\(/.test(zone));
  verifier('la liste locale est purgée sans rechargement',
    /_stravaActivities\s*=\s*_stravaActivities\.filter/.test(zone));
}

/* ── 8. Signalement de doublon probable ──
   Cas tirés des données RÉELLES du praticien (requête du 17/08/2026). Une
   règle inventée en chambre passerait à côté : ce sont ces lignes-là qu'il
   faut savoir classer. */
{
  const zoneDet = ['_stravaNomNorm', '_stravaDureesProches', '_stravaDoublonsMap', '_stravaJumeaux']
    .map(n => {
      const i = src.indexOf('function ' + n);
      return i < 0 ? '' : src.slice(i, src.indexOf('\n}', i) + 2);
    }).join('\n');
  const consts = (src.match(/var CAP_DOUBLON_ECART_REL[^\n]*\n[^\n]*CAP_DOUBLON_ECART_ABS_S[^\n]*/) || [''])[0];

  const bac = new Function('activites',
    'var _stravaActivities = activites;\n' + consts + '\n' + zoneDet +
    '\nreturn _stravaDoublonsMap();')

  const flagues = (acts) => {
    const m = bac(acts);
    return acts.filter(a => (m['k' + a.strava_id] || []).length).map(a => a.strava_id);
  };

  /* Le vrai doublon vu en production : même nom, 108 vs 107 min, 53,2 vs 53,1 km. */
  verifier('Sunset biking club (108 vs 107 min) → signalé',
    flagues([
      { strava_id: 19700575646, date: '2026-08-10', nom: 'Sunset biking club 💆‍♂️', duree_s: 108 * 60, distance_m: 53200 },
      { strava_id: 19700765306, date: '2026-08-10', nom: 'Sunset biking club 💆‍♂️', duree_s: 107 * 60, distance_m: 53100 },
    ]).length === 2);

  /* 19 vs 18 min : 5,3 % d'écart. Une bande de 5 % l'aurait raté. */
  verifier('Entraînement en soirée (19 vs 18 min) → signalé',
    flagues([
      { strava_id: 19204804470, date: '2026-07-06', nom: 'Entraînement en soirée', duree_s: 19 * 60 },
      { strava_id: 19205098236, date: '2026-07-06', nom: 'Entraînement en soirée', duree_s: 18 * 60 },
    ]).length === 2);

  /* Deux efforts RÉELS le même jour : noms différents, rien à signaler. */
  verifier('renfo + footing (noms différents) → non signalé',
    flagues([
      { strava_id: 1, date: '2026-08-15', nom: 'RUN 🥵', duree_s: 28 * 60, distance_m: 5000 },
      { strava_id: 2, date: '2026-08-15', nom: 'RENFO', duree_s: 17 * 60 },
    ]).length === 0);

  /* Même nom mais 31 min contre 5 min : deux efforts distincts, la clause des
     deux minutes ne doit PAS les rapprocher. */
  verifier('même nom, 31 vs 5 min → non signalé',
    flagues([
      { strava_id: 1, date: '2026-07-27', nom: 'ALTERNER FOOTING & RENFO', duree_s: 31 * 60, distance_m: 4400 },
      { strava_id: 2, date: '2026-07-27', nom: 'ALTERNER FOOTING & RENFO', duree_s: 5 * 60 },
    ]).length === 0);

  /* 4 vs 3 min : 25 % d'écart mais une seule minute. Sur des activités courtes
     c'est la clause absolue qui doit prendre le relais. */
  verifier('même nom, 4 vs 3 min → signalé (clause des 2 minutes)',
    flagues([
      { strava_id: 1, date: '2026-07-27', nom: 'ALTERNER FOOTING & RENFO', duree_s: 4 * 60 },
      { strava_id: 2, date: '2026-07-27', nom: 'ALTERNER FOOTING & RENFO', duree_s: 3 * 60 },
    ]).length === 2);

  /* Deux jours différents ne se comparent jamais, même nom identique. */
  verifier('même nom mais jours différents → non signalé',
    flagues([
      { strava_id: 1, date: '2026-08-10', nom: 'Muscu', duree_s: 60 * 60 },
      { strava_id: 2, date: '2026-08-11', nom: 'Muscu', duree_s: 60 * 60 },
    ]).length === 0);

  /* Emoji, accents et casse ne doivent pas séparer deux lignes jumelles :
     Strava renomme parfois d'un téléversement à l'autre. */
  verifier('nom normalisé (emoji, accents, casse) → signalé',
    flagues([
      { strava_id: 1, date: '2026-08-10', nom: 'Résidence d’été 🌶️', duree_s: 55 * 60 },
      { strava_id: 2, date: '2026-08-10', nom: 'RESIDENCE D ETE', duree_s: 55 * 60 },
    ]).length === 2);

  /* Sans nom, aucun rapprochement fiable : on se tait plutôt que d'inventer. */
  verifier('activités sans nom → non signalées',
    flagues([
      { strava_id: 1, date: '2026-08-10', nom: '', duree_s: 30 * 60 },
      { strava_id: 2, date: '2026-08-10', nom: null, duree_s: 30 * 60 },
    ]).length === 0);

  /* Une durée manquante ne doit pas produire un rapprochement par défaut. */
  verifier('durée absente → non signalée',
    flagues([
      { strava_id: 1, date: '2026-08-10', nom: 'Muscu', duree_s: 0 },
      { strava_id: 2, date: '2026-08-10', nom: 'Muscu', duree_s: 0 },
    ]).length === 0);
}

/* ── 9. Le signalement est branché, et recalculé après suppression ── */
verifier('signalement calculé au chargement',
  /_stravaDoublons\s*=\s*_stravaDoublonsMap\(\)/.test(src));
{
  const i = src.indexOf('function _stravaSupprimer');
  verifier('signalement recalculé après suppression',
    /_stravaDoublons\s*=\s*_stravaDoublonsMap\(\)/.test(src.slice(i, i + 1600)));
}
verifier('la chip groupée porte la marque', /_grpDouble/.test(src));

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

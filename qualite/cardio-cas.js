/* Les sports du bloc cardio existent en DEUX exemplaires : `CARDIO_SPORTS` dans
   js/prog-data.js pour le builder, et une table dans athlete.html — document
   séparé qui ne peut pas importer le premier.

   Tant qu'elles n'étaient pas synchronisées, l'athlète lisait la CLÉ BRUTE :
   « velo », « natation », « rameur », « ski_erg », et toujours sous une icône
   de coureur, parce que seul `course` était traduit. Un sport ajouté côté
   praticien arrivait donc chez le patient sous sa clé technique.

   Ce fichier échoue si les deux listes divergent.

   Usage : node qualite/cardio-cas.js */

const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(racine, 'js', 'prog-data.js'), 'utf8');
const ath  = fs.readFileSync(path.join(racine, 'athlete.html'), 'utf8');

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nBloc cardio — le praticien et l\'athlète voient la même liste\n');

/* ── Côté builder ── */
const blocData = (data.match(/var CARDIO_SPORTS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || '';
const sportsData = [...blocData.matchAll(/\{\s*val:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*\}/g)]
  .map(m => ({ val: m[1], label: m[2] }));

verifier('CARDIO_SPORTS est lisible', sportsData.length > 0,
  'trouvés : ' + sportsData.length);

/* ── Côté athlète ── */
const blocAth = (ath.match(/CARDIO_SPORTS_ATH\s*=\s*\{([\s\S]*?)\};/) || [])[1] || '';
const sportsAth = {};
[...blocAth.matchAll(/(\w+)\s*:\s*'([^']+)'/g)].forEach(m => { sportsAth[m[1]] = m[2]; });

verifier('la table de l\'espace athlète est lisible', Object.keys(sportsAth).length > 0,
  'trouvés : ' + Object.keys(sportsAth).length);

/* ── Aucune clé ne doit manquer d'un côté ni de l'autre ── */
{
  const valsData = sportsData.map(s => s.val);
  const valsAth  = Object.keys(sportsAth);
  const manqueAth  = valsData.filter(v => !valsAth.includes(v));
  const enTropAth  = valsAth.filter(v => !valsData.includes(v));

  verifier('tout sport du builder est traduit côté athlète',
    manqueAth.length === 0,
    manqueAth.length ? 'absents de athlete.html : ' + manqueAth.join(', ') : '');
  verifier('aucun sport fantôme côté athlète',
    enTropAth.length === 0,
    enTropAth.length ? 'inconnus du builder : ' + enTropAth.join(', ') : '');
}

/* ── Les libellés doivent être identiques, icône comprise ──
   Le titre du bloc n'ajoute plus d'icône fixe : elle vient du libellé. Deux
   libellés divergents donneraient au patient un autre mot que celui choisi. */
{
  const divergents = sportsData
    .filter(s => sportsAth[s.val] && sportsAth[s.val] !== s.label)
    .map(s => s.val + ' : « ' + s.label + ' » vs « ' + sportsAth[s.val] + ' »');
  verifier('les libellés sont identiques des deux côtés',
    divergents.length === 0,
    divergents.join(' | '));
}

/* ── Chaque libellé porte son icône ──
   Puisque le titre du bloc ne la fournit plus, un libellé sans icône laisserait
   le bloc nu chez l'athlète. */
{
  const sansIcone = sportsData
    .filter(s => /^[A-Za-zÀ-ÿ]/.test(s.label))
    .map(s => s.val);
  verifier('chaque libellé commence par son icône',
    sansIcone.length === 0,
    sansIcone.length ? 'sans icône : ' + sansIcone.join(', ') : '');
}

/* ── Le titre du bloc ne réimpose plus une icône ──
   C'était la cause : `'<div class="bloc-title">🏃 '+sport` collait un coureur
   sur un bloc de natation. */
verifier('le titre du bloc cardio n\'impose plus d\'icône fixe',
  !/bloc-title">🏃 '\+escH\(sport\)/.test(ath));

/* ── La marche est bien là, et en tête ──
   L'ordre de la liste est l'ordre de progression : la marche est le premier
   palier de remise en charge, avant la course. */
{
  verifier('« marche » existe côté builder',
    sportsData.some(s => s.val === 'marche'));
  verifier('« marche » est traduite côté athlète',
    !!sportsAth.marche, JSON.stringify(sportsAth.marche));
  const iM = sportsData.findIndex(s => s.val === 'marche');
  const iC = sportsData.findIndex(s => s.val === 'course');
  verifier('la marche précède la course dans la liste',
    iM >= 0 && iC >= 0 && iM < iC,
    'marche à ' + iM + ', course à ' + iC);
}

/* ── Les clés sont enregistrées dans les séances : on ajoute, on ne renomme pas ──
   Renommer une clé rendrait illisibles les séances déjà envoyées aux patients. */
{
  const historiques = ['course', 'velo', 'natation', 'rameur', 'ski_erg'];
  const perdues = historiques.filter(v => !sportsData.some(s => s.val === v));
  verifier('aucune clé historique renommée ni supprimée',
    perdues.length === 0,
    perdues.length ? 'disparues : ' + perdues.join(', ') : '');
}

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

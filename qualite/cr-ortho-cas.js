#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   L'examen orthopédique dans le générateur de CR

   Les signes orthopédiques n'avaient AUCUN chemin vers le courrier : le filtre
   `CR_MED_PAGES` ne laissait passer que les huit pages fonctionnelles et de
   force. Ils remontent désormais — mais dans un bloc à part, et c'est le fond
   du sujet :

   1. LE DÉFAUT DE SÉLECTION S'INVERSE. 560 lignes au catalogue, 126 tableaux ;
      un bilan de genou renseigné en produit une quarantaine, en écrasante
      majorité normales. Les cocher toutes, comme les mesures, noierait le
      courrier. Seuls les ANORMAUX sont pré-posés.

   2. LE FILTRE PORTE SUR LE NIVEAU, JAMAIS SUR LE MOT. Sur les six tableaux
      fonctionnels « Positif » veut dire RÉUSSI ; sur les mobilités c'est
      « Réduit » qui alerte, sur le DN4 c'est « Oui ». Un filtre écrit sur le
      mot désignerait le contraire de ce qu'il croit. Le niveau clinique
      voyage déjà depuis le bilan : on le lit.

   3. UN BLOC MUET N'EST PAS UN BLOC SANS PARTICULARITÉ. Le résumé de fin ne
      porte que sur les blocs ENTIÈREMENT normaux. Un bloc qui porte un signe
      et dont rien n'est retenu ne s'annonce pas « sans particularité » — ce
      serait un contresens médical, dans un document qui sort du cabinet.

     node qualite/cr-ortho-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(R, 'outils.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  var bon = String(attendu) === String(obtenu);
  if (bon) { console.log('  ✓ ' + nom); return; }
  ko++;
  console.log('  ✗ ' + nom + '\n      attendu : ' + attendu + '\n      obtenu  : ' + obtenu);
}

/* ── On exécute le VRAI code, pas une copie ──────────────────────────────── */
var d = html.indexOf('function _crOrthoAnormal');
var f = html.indexOf('function _crEsc', d);
if (d < 0 || f < 0) {
  console.error('Bornes introuvables dans outils.html — le moteur orthopédique a bougé.');
  process.exit(1);
}
var code = html.slice(d, f);

function banc(tests, coches, opts) {
  opts = opts || {};
  var doc = {
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  return new Function('document', 'TESTS', 'COCHES', 'OPTS', `
    var _crTestsOrtho = TESTS, _crOrthoCoches = COCHES;
    var _crOrthoFiltre = OPTS.filtre || 'anormaux';
    var _crOrthoResume = OPTS.resume !== false;
    var _crOrthoPlies  = {};
    var window = {};
    function _crEsc(v){ return String(v == null ? '' : v); }
    function _crMajDifferee(){}
    function _crStatutChips(){ return ''; }
    /* La vraie fonction sépare le verdict de sa nuance sur le premier tiret
       cadratin — on la reprend telle quelle, elle n'est pas l'objet du test. */
    function _crVerdict(t){
      var s = String(t.statut == null ? '' : t.statut);
      var i = s.indexOf(' — ');
      return i < 0 ? { statut: s, nuance: t.nuance || '' }
                   : { statut: s.slice(0, i), nuance: s.slice(i + 3) };
    }
    ${code}
    var lignes = [];
    _crAppendTestsOrtho(lignes);
    return { lignes: lignes, groupes: _crOrthoGroupes(_crTestsOrtho),
             anormal: _crOrthoAnormal, filtrer: window.crFiltreOrtho,
             coches: _crOrthoCoches };
  `)(doc, tests, coches, opts);
}

function t(cle, label, statut, niveau, zone, bloc, valeur) {
  return { cle: cle, label: label, statut: statut, niveau: niveau,
           zone: zone, bloc: bloc, valeur: valeur || '', nuance: '' };
}

/* ── 1. Le filtre lit le NIVEAU, jamais le mot ───────────────────────────── */
console.log('\nLe filtre porte sur le niveau clinique, pas sur le mot');
{
  var jeu = [
    /* Sur un tableau ORTHOPÉDIQUE, « Positif » est le signe. */
    t('a', 'Test de Lachman', 'Positif', 'bad', 'GENOU', 'LCA / LCP'),
    /* Sur un tableau FONCTIONNEL, le même mot veut dire RÉUSSI — niveau ok. */
    t('b', 'Appui unipodal', 'Positif', 'ok', 'GENOU', 'Fonctionnels'),
    /* Une mobilité : c'est « Réduit » qui alerte, pas « Positif ». */
    t('c', 'Extension passive', 'Réduit', 'bad', 'GENOU', 'Mobilités'),
    /* Un DN4 : c'est « Oui ». */
    t('d', 'Brûlure', 'Oui', 'bad', 'RACHIS', 'DN4')
  ];
  var b = banc(jeu, {});
  egal('un « Positif » orthopédique est anormal', 'true',  String(!!b.anormal(jeu[0])));
  egal('un « Positif » fonctionnel ne l\'est pas', 'false', String(!!b.anormal(jeu[1])));
  egal('un « Réduit » l\'est',                     'true',  String(!!b.anormal(jeu[2])));
  egal('un « Oui » de DN4 aussi',                  'true',  String(!!b.anormal(jeu[3])));
  /* Le doute clinique compte comme un signe : « Acceptable » n'est pas normal,
     et le taire priverait le médecin d'une réserve que le praticien a posée. */
  egal('un « warn » compte comme anormal', 'true',
       String(!!b.anormal(t('e', 'Appley', 'Acceptable', 'warn', 'GENOU', 'Ménisques'))));
}

/* ── 2. Le regroupement se fait par BLOC ─────────────────────────────────── */
console.log('\nLe grain de regroupement est le bloc, pas la section');
{
  var jeu = [
    t('a', 'Lachman',   'Positif', 'bad', 'GENOU', 'LCA / LCP'),
    t('b', 'Tiroir post', 'Négatif', 'ok', 'GENOU', 'LCA / LCP'),
    t('c', 'Varus 0°',  'Négatif', 'ok', 'GENOU', 'Ligaments latéraux'),
    t('d', 'Neer',      'Négatif', 'ok', 'ÉPAULE', 'Conflit')
  ];
  var g = banc(jeu, {}).groupes;
  egal('un groupe par bloc, pas par section', 3, g.length);
  egal('le titre nomme les deux', 'GENOU — LCA / LCP', g[0].titre);
  egal('l\'ordre du bilan est conservé',
       'GENOU — LCA / LCP|GENOU — Ligaments latéraux|ÉPAULE — Conflit',
       g.map(function (x) { return x.titre; }).join('|'));
  egal('le compte d\'anormaux est par bloc', '1|0|0',
       g.map(function (x) { return x.anormaux; }).join('|'));
  /* Un contenu écrit AVANT que le bloc ne voyage n'en a pas. Sa section fait
     alors office de bloc — tout regrouper sous un titre vide serait pire. */
  var sansBloc = banc([t('x', 'Ancien', 'Négatif', 'ok', 'GENOU', '')], {}).groupes;
  egal('sans bloc, la section fait office de titre', 'GENOU', sansBloc[0].titre);
}

/* ── 3. Le courrier — rendu B ────────────────────────────────────────────── */
console.log('\nLe courrier : les blocs qui parlent gardent leur détail');
{
  var jeu = [
    t('a', 'Test de Lachman', 'Positif', 'bad', 'GENOU', 'LCA / LCP', 'Arrêt mou'),
    t('b', 'Tiroir postérieur', 'Négatif', 'ok', 'GENOU', 'LCA / LCP'),
    t('c', 'Pivot shift',       'Négatif', 'ok', 'GENOU', 'LCA / LCP'),
    t('d', 'Varus 0°',   'Négatif', 'ok', 'GENOU', 'Ligaments latéraux'),
    t('e', 'Valgus 0°',  'Négatif', 'ok', 'GENOU', 'Ligaments latéraux')
  ];
  /* Sélection par défaut : les anormaux seuls, plus deux normaux cochés à la
     main dans le bloc qui parle. */
  var r = banc(jeu, { a: true, b: true, c: true, d: false, e: false });
  var listes = r.lignes.filter(function (l) { return l && l.t === 'liste'; });
  egal('un seul bloc détaillé', 1, listes.length);
  egal('… c\'est celui qui porte le signe', 'GENOU — LCA / LCP', listes[0].titre);
  egal('le signe garde sa ligne, avec son observation',
       'Test de Lachman — positif : Arrêt mou', listes[0].items[0].txt);
  /* Les normaux d'un bloc qui parle se rassemblent sur UNE ligne : les
     énumérer un par un rendrait au signe le bruit qu'on vient de lui ôter. */
  egal('les normaux retenus tiennent en une ligne', 2, listes[0].items.length);
  egal('… et sont nommés', 'Sans anomalie : Tiroir postérieur, Pivot shift',
       listes[0].items[1].txt);

  var texte = r.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('le bloc muet est résumé en une ligne',
     /Également examinés, sans particularité[\s\S]*Ligaments latéraux \(2 tests\)/.test(texte), texte);
  ok('… et le bloc détaillé n\'y figure pas', texte.indexOf('LCA') < 0, texte);
  ok('la section s\'ouvre', r.lignes.some(function (l) { return l && l.t === 'sec'; }));
}

/* ── 4. LA RÈGLE QUI PROTÈGE ─────────────────────────────────────────────── */
console.log('\nUn bloc muet n\'est pas un bloc sans particularité');
{
  /* Le praticien a décoché un signe POSITIF. Le bloc ne dit plus rien — mais
     il n'est pas normal pour autant. L'annoncer « sans particularité » serait
     un contresens médical dans un document qui part chez un tiers. */
  var jeu = [
    t('a', 'Test de Lachman', 'Positif', 'bad', 'GENOU', 'LCA / LCP'),
    t('b', 'Tiroir postérieur', 'Négatif', 'ok', 'GENOU', 'LCA / LCP'),
    t('c', 'Varus 0°', 'Négatif', 'ok', 'GENOU', 'Ligaments latéraux')
  ];
  var r = banc(jeu, { a: false, b: false, c: false });
  var texte = r.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('un bloc porteur d\'un signe non retenu reste hors du résumé',
     texte.indexOf('LCA') < 0, texte);
  ok('… et le bloc réellement normal y figure',
     /Ligaments latéraux/.test(texte), texte);
  /* Rien de retenu, rien de normal à dire : pas de section vide. */
  var vide = banc([t('a', 'Lachman', 'Positif', 'bad', 'GENOU', 'LCA / LCP')], { a: false });
  egal('aucune section quand il n\'y a rien à écrire', 0, vide.lignes.length);
  /* L'interrupteur retire le résumé sans toucher au détail. */
  var sans = banc(jeu, { a: true, b: false, c: false }, { resume: false });
  var txt2 = sans.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('l\'interrupteur retire la ligne de résumé', txt2.indexOf('sans particularité') < 0, txt2);
  ok('… et laisse le détail en place',
     sans.lignes.some(function (l) { return l && l.t === 'liste'; }));
}

/* ── 5. Le lot ───────────────────────────────────────────────────────────── */
console.log('\nLes trois lots');
{
  var jeu = [
    t('a', 'Lachman', 'Positif', 'bad', 'GENOU', 'LCA / LCP'),
    t('b', 'Tiroir',  'Négatif', 'ok',  'GENOU', 'LCA / LCP')
  ];
  var b = banc(jeu, {});
  b.filtrer('tout');
  egal('« Tout » retient les deux', 'true,true',
       [b.coches.a, b.coches.b].join(','));
  b.filtrer('aucun');
  egal('« Aucun » n\'en retient aucun', 'false,false',
       [b.coches.a, b.coches.b].join(','));
  b.filtrer('anormaux');
  egal('« Anormaux » ne retient que le signe', 'true,false',
       [b.coches.a, b.coches.b].join(','));
}

/* ── 6. La feuille de style ──────────────────────────────────────────────── */
console.log('\nLes règles de style existent');
['.cr-or-chip', '.cr-or-bloc', '.cr-or-hd', '.cr-or-nom', '.cr-or-corps', '.cr-or-resume']
  .forEach(function (c) {
    var re = new RegExp('(^|[\\n;}])\\s*' + c.replace('.', '\\.') + '\\s*[,{]');
    ok(c + ' est défini', re.test(html));
  });
/* `_crOrthoGroupes` fabrique des objets NEUFS a chaque appel : chercher le
   groupe courant par `indexOf` dans un tableau reconstruit rend -1 pour tous,
   et les blocs porteraient le meme identifiant. */
ok('l\'identifiant de bloc vient de l\'indice de boucle, pas d\'un indexOf',
   /var idCase = 'cr-or-b-' \+ iG;/.test(html)
   && !/indexOf\(g\)/.test(html));

/* L'état INTERMÉDIAIRE n'est pas un attribut HTML : sans la pose en
   JavaScript, un bloc à moitié retenu s'afficherait décoché — donc faux. */
ok('un bloc à moitié retenu se marque en indéterminé',
   /\.indeterminate\s*=\s*true/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Examen orthopédique du CR : tous les cas passent.');

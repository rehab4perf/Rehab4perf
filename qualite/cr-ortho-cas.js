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

/* ── 3. Le courrier — rendu B, dans la mise en page des autres tests ───── */
console.log('\nLe courrier emprunte le tableau des autres tests');
{
  var jeu = [
    t('a', 'Test de Lachman', 'Positif', 'bad', 'Genou', 'LCA / LCP', 'Arrêt mou'),
    t('b', 'Tiroir postérieur', 'Négatif', 'ok', 'Genou', 'LCA / LCP'),
    t('c', 'Pivot shift',       'Négatif', 'ok', 'Genou', 'LCA / LCP'),
    t('d', 'Varus 0°',   'Négatif', 'ok', 'Genou', 'Ligaments latéraux'),
    t('e', 'Valgus 0°',  'Négatif', 'ok', 'Genou', 'Ligaments latéraux')
  ];
  var r = banc(jeu, { a: true, b: true, c: true, d: false, e: false });
  var typ = function (x) { return r.lignes.filter(function (l) { return l && l.t === x; }); };

  /* LE POINT DE LA REPRISE : plus aucune liste a puces. Les signes sortent en
     `t:'test'`, donc dans le MEME tableau, avec les memes colonnes et les
     memes pastilles que les mesures. Deux grammaires dans un seul courrier,
     c'etait une divergence de plus a entretenir. */
  egal('aucune liste à puces ne subsiste', 0, typ('liste').length);
  egal('les signes sortent en lignes de tableau', 2, typ('test').length);
  egal('le signe garde son observation', 'Arrêt mou', typ('test')[0].valeur);
  egal('… et son verdict, pour la pastille', 'Positif', typ('test')[0].statut);
  /* Les normaux retenus tiennent sur UNE ligne, groupes par verdict :
     « Négatif » et « Normal » ne disent pas la meme chose. */
  egal('les normaux retenus tiennent en une ligne',
       'Tiroir postérieur, Pivot shift', typ('test')[1].label);
  egal('… sous leur propre verdict', 'Négatif', typ('test')[1].statut);

  /* La REGION ouvre la section — une barre bleue par membre, comme pour les
     tests fonctionnels. Le titre ne redit plus « Bilan Orthopedique ». */
  egal('une seule section, nommée par la région', 1, typ('sec').length);
  egal('… et elle nomme le membre', 'Examen orthopédique — Genou', typ('sec')[0].txt);
  /* Le BLOC la subdivise d'un intertitre discret : une barre par bloc en
     donnerait six sur un seul genou. */
  egal('le bloc est un intertitre, pas une section', 1, typ('ssec').length);
  egal('… nommé comme dans le bilan', 'LCA / LCP', typ('ssec')[0].txt);

  var texte = r.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('le bloc muet est résumé en une ligne',
     /Également examinés, sans particularité[\s\S]*Ligaments latéraux \(2 tests\)/.test(texte), texte);
  ok('… et le bloc détaillé n\'y figure pas', texte.indexOf('LCA') < 0, texte);
}

console.log('\nUne section par région, jamais une par bloc');
{
  var jeu = [
    t('a', 'Lachman', 'Positif', 'bad', 'Genou',  'LCA / LCP'),
    t('b', 'Appley',  'Positif', 'bad', 'Genou',  'Ménisques'),
    t('c', 'Neer',    'Positif', 'bad', 'Épaule', 'Conflit')
  ];
  var r = banc(jeu, { a: true, b: true, c: true });
  var secs = r.lignes.filter(function (l) { return l && l.t === 'sec'; });
  egal('deux régions, deux sections', 2, secs.length);
  egal('… dans l\'ordre du bilan', 'Examen orthopédique — Genou|Examen orthopédique — Épaule',
       secs.map(function (x) { return x.txt; }).join('|'));
  egal('trois blocs, trois intertitres', 3,
       r.lignes.filter(function (l) { return l && l.t === 'ssec'; }).length);
}

/* ── 4. LA RÈGLE QUI PROTÈGE ─────────────────────────────────────────────── */
console.log('\nUn bloc muet n\'est pas un bloc sans particularité');
{
  /* Le praticien a décoché un signe POSITIF. Le bloc ne dit plus rien — mais
     il n'est pas normal pour autant. L'annoncer « sans particularité » serait
     un contresens médical dans un document qui part chez un tiers. */
  var jeu = [
    t('a', 'Test de Lachman', 'Positif', 'bad', 'Genou', 'LCA / LCP'),
    t('b', 'Tiroir postérieur', 'Négatif', 'ok', 'Genou', 'LCA / LCP'),
    t('c', 'Varus 0°', 'Négatif', 'ok', 'Genou', 'Ligaments latéraux')
  ];
  var r = banc(jeu, { a: false, b: false, c: false });
  var texte = r.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('un bloc porteur d\'un signe non retenu reste hors du résumé',
     texte.indexOf('LCA') < 0, texte);
  ok('… et le bloc réellement normal y figure',
     /Ligaments latéraux/.test(texte), texte);
  /* Rien de detaille : la phrase de resume a tout de meme sa barre, sinon elle
     flotterait apres les mesures sans rien qui la rattache a l'examen. */
  ok('le résumé seul garde sa section',
     r.lignes.some(function (l) { return l && l.t === 'sec' && l.txt === 'Examen orthopédique'; }));
  /* Rien de retenu, rien de normal à dire : pas de section vide. */
  var vide = banc([t('a', 'Lachman', 'Positif', 'bad', 'Genou', 'LCA / LCP')], { a: false });
  egal('aucune section quand il n\'y a rien à écrire', 0, vide.lignes.length);
  /* L'interrupteur retire le résumé sans toucher au détail. */
  var sans = banc(jeu, { a: true, b: false, c: false }, { resume: false });
  var txt2 = sans.lignes.filter(function (l) { return typeof l === 'string' && l; }).join(' ');
  ok('l\'interrupteur retire la ligne de résumé', txt2.indexOf('sans particularité') < 0, txt2);
  ok('… et laisse le détail en place',
     sans.lignes.some(function (l) { return l && l.t === 'test'; }));
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
/* L'intertitre de bloc vit dans CR_LETTRE_CSS — la feuille injectee A LA FOIS
   dans l'apercu et dans le PDF. Ecrite dans le `<style>` de la page, la regle
   manquerait au document que recoit le medecin ; ecrite dans la chaine
   d'export, elle manquerait a l'ecran. Le piege s'est deja referme ici. */
{
  var dCss = html.indexOf('var CR_LETTRE_CSS');
  var fCss = html.indexOf('];', dCss);
  var feuille = dCss > 0 ? html.slice(dCss, fCss) : '';
  ok('.lt-ssec vit dans la feuille du courrier', /\.lt-ssec\{/.test(feuille));
  ok('… et nulle part ailleurs',
     html.split('.lt-ssec{').length - 1 === 1,
     (html.split('.lt-ssec{').length - 1) + ' définition(s)');
  /* Il ferme la table en cours — chaque bloc a la sienne — mais PAS le groupe :
     une coupure de page le separerait de sa section. */
  var dR = html.indexOf("if (b.t === 'ssec') {", html.indexOf('function _crBlocsHtml') > 0
                        ? html.indexOf('function _crBlocsHtml') : 0);
  var corpsR = dR > 0 ? html.slice(dR, dR + 400) : '';
  ok('l\'intertitre ferme la table', /fermerTable\(\)/.test(corpsR));
  ok('… et ne ferme pas le groupe', !/fermerGroupe\(\)/.test(corpsR), corpsR.slice(0, 200));
  /* Le rendu TEXTE — la copie et le mail — doit le connaitre aussi : une
     structure rendue d'un seul cote, c'est la divergence qu'on vient d'oter. */
  ok('le rendu texte connaît l\'intertitre',
     /b\.t === 'ssec'/.test(html.slice(html.indexOf('function _crBlocsTexte'),
                                       html.indexOf('function _crBlocsTexte') + 2500)));
}

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

#!/usr/bin/env node
/* Cas de référence — ce que le bilan transmet au CR médecin.
 *
 * `_crMedResumeTests` remplit `r4p-cr-med-tests`, que lit le bloc « Tests du
 * bilan » d'`outils.html`. Trois règles s'y jouent, et chacune a déjà produit
 * un défaut visible dans un courrier envoyé au médecin :
 *
 *   - LE FILTRE. Il portait sur le TITRE de section (« Tests Fonctionnels »).
 *     Or les tests de force ne forment pas une section du CR : ils sont rendus
 *     DANS le Bilan Orthopédique, mêlés aux tests de la même région. Ils
 *     étaient donc entièrement invisibles. On filtre sur `data-pages`.
 *
 *   - LA ZONE. Elle valait le titre de section, si bien qu'un dynamomètre
 *     s'annonçait sous « BILAN ORTHOPÉDIQUE ». Un test de force n'est pas un
 *     examen orthopédique — la page d'origine, elle, dit vrai.
 *
 *   - LE REGROUPEMENT. Les deux consommateurs ouvrent un intertitre dès que la
 *     zone change. Les tests de force étant dispersés dans chaque section
 *     articulaire, « Tests de force » se serait répété à chaque région.
 *
 *   node qualite/cr-med-tests-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

function bloc(debut, fin) {
  var d = src.indexOf(debut);
  var f = src.indexOf(fin, d + 1);
  if (d < 0 || f < 0 || f <= d) {
    console.error('Bornes introuvables : « ' + debut + ' » … « ' + fin + ' »');
    process.exit(1);
  }
  return src.slice(d, f);
}

var code = bloc('var CR_MED_PAGES', 'var _SAVE_ICON');

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* DOM minimal. `_buildAllTestsHtml` est remplacée par des sections fabriquées :
   ce qu'on teste est le TRI, pas la construction du CR. */
function lancer(sections) {
  var faux = {
    createElement: function () {
      return {
        set innerHTML(h) { this._h = h; },
        querySelectorAll: function () { return (this._items || []); }
      };
    }
  };
  return new Function('sections', 'document', `
    function _buildAllTestsHtml(){ return sections; }
    function _crMedLabel(c){ return 'MED:' + c; }
    function _crMedValeur(el){ return { texte: el._val, cellules: el._cell || [], note: '' }; }
    ${code}
    return _crMedResumeTests();
  `)(sections, faux);
}

/* Une ligne de CR telle que `crItem` la produit : un intitulé, une valeur, et
   la ou les pages dont elle lit les champs. */
function ligne(cle, val, pages, tag, perso) {
  return {
    getAttribute: function (n) {
      if (n === 'data-pages') return pages;
      if (n === 'data-cr-perso') return perso ? '1' : null;
      if (n === 'data-bloc') return this._bloc || null;
      return null;
    },
    querySelector: function (sel) {
      if (sel === '.cr-key') return { textContent: cle };
      /* La vraie pastille porte `data-statut` — le verdict BRUT — en plus de
         son texte affiche, que `_crMedResumeTests` ne lit plus qu'en repli.
         Une doublure sans `getAttribute` faisait lever la lecture, le
         try/catch avalait l'exception, et le tri rendait un tableau VIDE : les
         cas tombaient tous, sans dire pourquoi. */
      if (sel === '.cr-tag') return tag ? {
        textContent: tag,
        getAttribute: function (n) { return n === 'data-statut' ? tag : null; },
        classList: { contains: function () { return false; } }
      } : null;
      if (sel === '.cr-val') return { _val: val };
      return null;
    }
  };
}

/* Meme ligne, avec son BLOC — « LCA / LCP ». C'est le grain de regroupement
   des signes orthopediques dans le courrier. */
function ligneBloc(cle, val, pages, tag, nomBloc) {
  var l = ligne(cle, val, pages, tag);
  l._bloc = nomBloc;
  return l;
}

function section(titre, lignes) {
  return { title: titre, html: '', _lignes: lignes };
}

/* Le faux `document.createElement` doit rendre les lignes de la section
   courante — on le branche à l'appel. */
function lancerAvec(sections) {
  var courant = null;
  var faux = {
    createElement: function () {
      return {
        set innerHTML(h) {},
        querySelectorAll: function () { return courant._lignes; }
      };
    }
  };
  return new Function('sections', 'document', 'poser', `
    function _buildAllTestsHtml(){
      return sections.map(function(s){ return { title: s.title, html: '', _s: s }; });
    }
    function _crMedLabel(c){ return c; }
    /* _crMedResumeTests appelle aussi le geste : sans ce stub elle levait, le
       try/catch avalait l'exception et rendait un tableau VIDE — les cas
       tombaient sur undefined sans dire pourquoi. Pas d'accent grave ici : on
       est DANS un gabarit, il le refermerait. */
    function _crMedGeste(){ return ''; }
    function _crMedValeur(el){ return { texte: el._val, cellules: [], note: '' }; }
    var _origForEach = Array.prototype.forEach;
    ${code.replace('_buildAllTestsHtml().forEach(function (sec) {',
                   '_buildAllTestsHtml().forEach(function (sec) { poser(sec._s);')}
    return _crMedResumeTests();
  `)(sections, faux, function (s) { courant = s; });
}

/* Un test FONCTIONNEL est place ENTRE les deux tests de force, et dans une
   autre section. C'est la seule disposition qui met le regroupement a
   l'epreuve : sans lui, la zone « Tests de force » s'ouvrirait deux fois. Un
   jeu d'essai ou les forces se suivent deja ne prouve rien. */
var SECTIONS = [
  section('1. BILAN ORTHOPÉDIQUE — ÉPAULE', [
    ligne('Neer', 'Négatif', 'page-epaule', 'Négatif'),
    ligne('Rotateurs lat. RE1', '12 / 14 kg', 'page-force-ms', 'Déficit')
  ]),
  section('2. TESTS FONCTIONNELS — MEMBRES SUPÉRIEURS', [
    ligne('Y-Balance MS', '88 / 91 %', 'page-fonctionnelsMS', 'Symétrique')
  ]),
  section('3. BILAN ORTHOPÉDIQUE — GENOU', [
    ligne('Lachman', 'Négatif', 'page-genou', 'Négatif'),
    ligne('Ischio-jambiers', '32.6 / 35.2 kg', 'page-force-mi', 'Négatif')
  ]),
  section('4. TESTS FONCTIONNELS — MEMBRES INFÉRIEURS', [
    ligne('SLS', '19 / 17 rép.', 'page-fonctionnels', 'Asymétrie modérée')
  ]),
  section('5. ANALYSE DE COURSE À PIED', [
    ligne('Cadence', '172 spm', 'page-course', '')
  ])
];

var res = lancerAvec(SECTIONS);

/* LA REGLE A CHANGE, sciemment. Les signes orthopediques ne sont plus ecartes :
   ils remontent dans une FAMILLE a part. Ce sont des verdicts binaires, cinq a
   dix fois plus nombreux que les mesures — 560 lignes au catalogue — et normaux
   la plupart du temps. Les cocher par defaut, comme les tests fonctionnels,
   noierait le courrier : c'est `outils.html` qui tranche, a partir de
   `famille`. Le bilan, lui, transmet tout et ne decide rien. */
console.log('\n  Le filtre — deux familles, plus une exclusion');
{
  var cles = res.map(function (t) { return t.cle; });
  var fam = {}; res.forEach(function (t) { fam[t.cle] = t.famille; });
  verifie('Neer (orthopédique) remonte',       'true',  String(cles.indexOf('Neer') >= 0));
  verifie('… dans la famille orthopédique',    'ortho', fam['Neer']);
  verifie('Lachman remonte aussi',             'true',  String(cles.indexOf('Lachman') >= 0));
  verifie('un test de force est de l\'autre famille', 'fonc', fam['Ischio-jambiers']);
  verifie('un test fonctionnel aussi',         'fonc', fam['SLS']);
  verifie('un test de force remonte',          'true',  String(cles.indexOf('Ischio-jambiers') >= 0));
  verifie('un test fonctionnel remonte',       'true',  String(cles.indexOf('SLS') >= 0));
  verifie('une ligne de course remonte',       'true',  String(cles.indexOf('Cadence') >= 0));
}

/* La Course interne du mollet a QUITTE la page Pied pour les Tests Fonctionnels
   MI. Elle remonte donc par le filtre ordinaire, et la liste explicite qui la
   nommait — `CR_MED_CLES` — a ete retiree : un mecanisme qui ne sert plus a
   rien est un piege pour la lecture suivante.

   Les identifiants de champ n'ont PAS bouge : les bilans enregistres la
   retrouvent telle quelle. C'est ce que verifie le premier cas. */
console.log('\n  La Course interne du mollet vient des Tests Fonctionnels MI');
{
  var srcHtml = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
  var iCim = srcHtml.indexOf('data-block-id="fonctionnels--cim"');
  verifie('le bloc existe', 'true', String(iCim > 0));
  verifie('il est sur la page Tests Fonctionnels MI', 'true',
          String(srcHtml.lastIndexOf('id="page-fonctionnels"', iCim)
                 > srcHtml.lastIndexOf('id="page-pied"', iCim)));
  /* Les identifiants sont l'identite des donnees : les changer perdrait tous
     les bilans deja enregistres. */
  ['pi-cim2-cs','pi-cim2-ca','pi-cim1-cs','pi-cim1-ca'].forEach(function (id) {
    verifie('champ ' + id + ' conservé', 'true',
            String(srcHtml.indexOf('id="' + id + '"') > 0));
  });
  verifie('plus de liste explicite CR_MED_CLES', 'false',
          String(/CR_MED_CLES/.test(src)));

  var res2 = lancerAvec([
    section('1. TESTS FONCTIONNELS — MEMBRES INFÉRIEURS', [
      ligne('Course interne mollet', '12 / 10 cm', 'page-fonctionnels', 'Test positif')
    ])
  ]);
  verifie('elle remonte par le filtre ordinaire', 'true',
          String(res2.map(function (t) { return t.cle; }).indexOf('Course interne mollet') >= 0));
}

console.log('\n  La zone — un test de force n\'est pas un bilan orthopédique');
{
  function zoneDe(cle) {
    var t = res.filter(function (x) { return x.cle === cle; })[0];
    return t ? t.zone : '(absent)';
  }
  verifie('force MI → Tests de force', 'Tests de force', zoneDe('Ischio-jambiers'));
  verifie('force MS → Tests de force', 'Tests de force', zoneDe('Rotateurs lat. RE1'));
  /* Une ligne fonctionnelle garde le titre de sa section : il est juste. */
  verifie('fonctionnel → titre de section',
          'TESTS FONCTIONNELS — MEMBRES INFÉRIEURS', zoneDe('SLS'));
  verifie('course → titre de section',
          'ANALYSE DE COURSE À PIED', zoneDe('Cadence'));
}

console.log('\n  Le regroupement — un intertitre par zone, jamais répété');
{
  /* Les deux tests de force viennent de sections DIFFÉRENTES (Épaule, Genou).
     Sans regroupement, « Tests de force » s'ouvrirait deux fois. */
  var zones = [];
  res.forEach(function (t) { if (zones[zones.length - 1] !== t.zone) zones.push(t.zone); });
  var doublons = zones.filter(function (z, i) { return zones.indexOf(z) !== i; });
  verifie('aucune zone ouverte deux fois', '', doublons.join(','));
  verifie('les deux forces sont côte à côte', 'Tests de force,Tests de force',
          res.filter(function (t) { return t.zone === 'Tests de force'; })
             .map(function (t) { return t.zone; }).join(','));
  /* L'ordre de PREMIÈRE apparition est celui du bilan : le médecin lit les
     régions dans l'ordre où elles ont été examinées. */
  /* Un signe orthopedique prend sa REGION pour zone. La section du CR les
     rassemble toutes sous « Bilan Orthopedique » : ce titre unique ne dit pas
     de quel membre on parle, et le courrier annoncait « Bilan Orthopedique —
     Approche Globale », ou la moitie du titre double l'intitule de section. */
  verifie('ordre de première apparition conservé',
          'Épaule|Tests de force|TESTS FONCTIONNELS — MEMBRES SUPÉRIEURS|'
          + 'Genou|TESTS FONCTIONNELS — MEMBRES INFÉRIEURS|'
          + 'ANALYSE DE COURSE À PIED',
          zones.join('|'));
  verifie('la région remplace le titre de section', 'Épaule',
          res.filter(function (t) { return t.cle === 'Neer'; })[0].zone);
}

console.log('\n  Le lexique complète le nom du test, il ne le remplace plus');
{
  /* « Contrôle moteur global » ne disait ni quel membre, ni quel mouvement :
     le nom technique n'avait pas été traduit, il avait été SUPPRIMÉ. */
  var codeLex = bloc('var CR_MED_LEXIQUE', 'function _crMedValeurLisible');
  var lex = new Function(codeLex + '\n return { l: _crMedLabel, g: _crMedGeste, t: CR_MED_LEXIQUE };')();

  /* Décision du praticien : le nom du protocole entre parenthèses alourdissait
     l'intitulé sans rien apprendre au médecin. Seule la FONCTION reste en tête,
     le GESTE la précise en petit dessous. La colonne « protocole » est partie
     avec son unique usage — un champ que plus personne ne lit finit par être
     recopié de travers. */
  verifie('la table n\'a plus que trois colonnes', 'true',
          String(lex.t.every(function (e) { return e.length === 3; })));
  verifie('plus aucune parenthèse de protocole', 'true',
          String(lex.t.every(function (e) { return lex.l(e[0]).indexOf('(') === -1; })));

  verifie('la fonction seule', 'Contrôle moteur global', lex.l('Overhead squat'));
  verifie('… et le geste part à côté', 'squat bras levés', lex.g('Overhead squat'));

  verifie('le squat unipodal se nomme',
          'Contrôle du membre inférieur', lex.l('Squat unipodal — qualité'));
  verifie('… avec son geste', 'squat sur une jambe', lex.g('Squat unipodal — qualité'));

  /* Ce qui suit le motif est conservé : les déclinaisons gardent leur suffixe. */
  verifie('une déclinaison garde son suffixe',
          'Contrôle postural dynamique — direction antérieure', lex.l('SEBT — Antérieur'));

  verifie('les cervicales aussi', 'Endurance des extenseurs du cou',
          lex.l('Endurance Extenseurs Cervicaux'));
  verifie('… sans geste inventé', '', lex.g('Endurance Extenseurs Cervicaux'));

  /* Geste vide quand la fonction le porte déjà. */
  verifie('le Hop Test n\'a rien à ajouter', '', lex.g('Hop Test'));

  /* Hors lexique : le nom d'origine, jamais rien de perdu. */
  verifie('un test inconnu garde son nom', 'Machin inconnu', lex.l('Machin inconnu'));

  /* Le tri du plus long au plus court retire la dependance a l'ordre
     d'ecriture : « Drop Jump H » ne doit pas etre attrape par « Drop Jump ». */
  /* Le tri du plus long au plus court reste indispensable : sans lui,
     « Pliométrie verticale (qualitative) » serait attrapé par la clé
     « Pliométrie verticale », et « Drop Jump — RSI » par « Drop Jump H ». */
  verifie('la clé la plus longue gagne',
          'Qualité de rebond', lex.l('Pliométrie verticale (qualitative)'));
  verifie('… et la plus courte ne la vole pas',
          'Indice de raideur réactive', lex.l('Drop Jump — RSI'));
}

console.log('\n  Lecture de la grille — seules les compensations OBSERVÉES');
{
  /* Ces cas portent sur `_crMedAnalyseFonc`, la fonction qui relit la grille.
     Les suivants stubbent `_crMedValeur` et ne la traversent donc pas : sans
     ce bloc, retirer le filtre des critères non observés passerait inaperçu. */
  var codeAF = bloc('function _crMedAnalyseFonc', 'function _crMedValeur');
  /* `getAttribute` : la relecture interroge `data-crit` sur la cellule de
     libelle — le role d'un critere (conditionnant ou indicatif) y voyage. */
  function cel(txt, attrs) {
    return { textContent: txt, getAttribute: function (a) { return (attrs || {})[a] || null; } };
  }
  function grille(rangs, synth, mode, cotes) {
    var c = cotes || ['G', 'D'];
    var enfants = [cel('Compensation observée'), cel(c[0]), cel(c[1])];
    rangs.forEach(function (r) {
      enfants.push(cel(r[0]), cel(r[1] ? '●' : '·'), cel(r[2] ? '●' : '·'));
    });
    var el = {
      querySelector: function (sel) {
        return sel === '.cr-af-tbl'
          ? { children: enfants, getAttribute: function (n) { return n === 'data-af-mode' ? (mode || null) : null; } }
          : null;
      },
      querySelectorAll: function (sel) {
        if (sel === '.cr-af-sy') return (synth || []).map(function (t) { return cel(t); });
        return [];
      }
    };
    return new Function('el', codeAF + '\n return _crMedAnalyseFonc(el);')(el);
  }

  var r = grille([['Tronc — inclinaison', 1, 1],
                  ['Genou — valgus',      0, 1],
                  ['Hanche — adduction',  0, 0]], ['Mêmes compensations.']);
  verifie('un critère sans pastille est écarté', '2', String(r.lignes.length));
  verifie('les côtés sont lus',                  'true,false',
          String(r.lignes[0].g) + ',' + String(r.lignes[1].g));
  verifie('la phrase nomme les côtés',
          'Tronc — inclinaison (gauche et droite) · Genou — valgus (droite) — Mêmes compensations.',
          r.texte);
  /* Une LISTE, jamais une phrase : « Gauche : parfait » et « Droit : pied vers
     l'extérieur » sont deux constats. Collés, on lit deux fois avant de voir
     où l'un finit. */
  verifie('la synthèse est une liste', '1', String(r.synthese.length));
  verifie('… et son contenu est intact', 'Mêmes compensations.', r.synthese[0]);

  var deux = grille([['Tronc', 1, 0]], ['Gauche : parfait', 'Droit : pied vers l\'extérieur']);
  verifie('deux observations restent deux lignes', '2', String(deux.synthese.length));

  var vide = grille([['Hanche — adduction', 0, 0]], []);
  verifie('aucune compensation → aucune ligne', '0', String(vide.lignes.length));

  /* ── Grille de CRITÈRES — le Test de Réception ────────────────────────
     « 5/5 » dit l'ampleur, pas la nature : le médecin ne sait pas QUEL critère
     manque. La grille les liste tous, validés ou non — un critère non acquis
     est une information, là où une compensation absente ne se dit pas. */
  var crit = grille([['Talon au repère 80 %', 1, 1],
                     ['Descente fluide à 90°', 1, 0],
                     ['Maintien 3 s à 90°',    0, 0]],
                    ['Côté sain 2/3 · Côté atteint 1/3'],
                    'critere', ['Côté sain', 'Côté atteint']);
  verifie('toutes les lignes sont gardées', '3', String(crit.lignes.length));
  verifie('un critère acquis nulle part reste visible', 'Maintien 3 s à 90°',
          crit.lignes[2].label);

  /* Les côtés portent les VRAIS libellés de la grille. Supposer gauche/droite
     ici inverserait les côtés du patient dans un document médical. */
  verifie('les côtés sont ceux de la grille', 'Côté sain,Côté atteint', crit.cotes.join(','));
  verifie('la phrase les reprend',
          'Talon au repère 80 % (côté sain et côté atteint) · '
          + 'Descente fluide à 90° (côté sain) · '
          + 'Maintien 3 s à 90° (non acquis) — Côté sain 2/3 · Côté atteint 1/3',
          crit.texte);

  /* Les abréviations se développent : la grille peut écrire « G », pas la
     phrase d'un courrier. */
  var abrev = grille([['Tronc', 1, 1]], [], null, ['G', 'D']);
  verifie('« G » devient « gauche » dans la phrase', 'Tronc (gauche et droite)', abrev.texte);
  /* Et « Gauche / Droit » en en-tête de colonne : la grille abrège parce
     qu'elle est étroite, le courrier a la place. */
  verifie('… et « Gauche / Droit » en colonne', 'Gauche,Droit', abrev.cotes.join(','));

  /* La phrase de synthese s'ouvre sur le meme score sur sept que le statut.
     Il ne sort pas du cabinet — mais ce qui SUIT est la vraie information
     clinique et doit rester. */
  var sc = grille([['Tronc', 1, 1]], ['Gauche 2/7 · Droite 2/7 — mêmes compensations des deux côtés']);
  verifie('le score disparaît, la phrase reste',
          'Mêmes compensations des deux côtés', sc.synthese.join(' '));

  var diff = grille([['Tronc', 1, 0]],
    ['Gauche 3/7 · Droite 4/7 · 3 communes — profils différents (droite seulement : hanche)']);
  /* « 3 communes » n'a pas de denominateur : il se comprend seul, il reste. */
  verifie('un décompte sans dénominateur survit',
          '3 communes — profils différents (droite seulement : hanche)', diff.synthese.join(' '));

  var libre = grille([['Tronc', 1, 1]], ['Talons surélevés : amélioration nette']);
  verifie('une observation libre n\'est pas touchée',
          'Talons surélevés : amélioration nette', libre.synthese.join(' '));
}

console.log('\n  Analyse fonctionnelle — le score sur 7 ne sort pas du cabinet');
{
  /* `_crMedResumeTests` reecrit le statut quand la ligne porte des
     compensations : « G 2/7 · D 2/7 » ne dit rien a qui ignore le
     denominateur — sept criteres possibles. Le courrier annonce un NOMBRE. */
  var code2 = bloc('var CR_MED_PAGES', 'var _SAVE_ICON');
  function statutDe(lignes, tagInitial, mode) {
    var fauxEl = {
      getAttribute: function () { return 'page-fonctionnels'; },
      querySelector: function (sel) {
        if (sel === '.cr-key') return { textContent: 'Squat unipodal — qualité' };
        /* Meme doublure que plus haut : `data-statut` porte le verdict brut,
           et sans `getAttribute` la lecture leve. */
        if (sel === '.cr-tag') return {
          textContent: tagInitial,
          getAttribute: function (n) { return n === 'data-statut' ? tagInitial : null; },
          classList: { contains: function () { return false; } }
        };
        if (sel === '.cr-val') return {};
        return null;
      }
    };
    var doc = { createElement: function () {
      return { set innerHTML(h) {}, querySelectorAll: function () { return [fauxEl]; } }; } };
    var res = new Function('document', 'lignes', 'mode', `
      function _buildAllTestsHtml(){ return [{ title:'TESTS FONCTIONNELS', html:'' }]; }
      function _crMedLabel(c){ return c; }
    /* _crMedResumeTests appelle aussi le geste : sans ce stub elle levait, le
       try/catch avalait l'exception et rendait un tableau VIDE — les cas
       tombaient sur undefined sans dire pourquoi. Pas d'accent grave ici : on
       est DANS un gabarit, il le refermerait. */
    function _crMedGeste(){ return ''; }
      function _crMedValeur(el){
        return { texte:'…', cellules:[],
                 af:{ lignes: lignes, synthese:['Mêmes compensations.'], mode: mode || 'compensation' } };
      }
      ${code2}
      return _crMedResumeTests();
    `)(doc, lignes, mode);
    return res[0];
  }

  var sym = statutDe([{ label:'Tronc', g:true, d:true }, { label:'Genou', g:true, d:true }], 'G 2/7 · D 2/7');
  /* L'analyse fonctionnelle se lit en GAUCHE / DROITE ; les tests chiffres de
     la meme section souvent en COTE SAIN / COTE ATTEINT. Deux conventions dans
     un meme tableau ne se reconcilient pas — elle prend donc sa propre zone,
     donc son propre tableau. */
  /* Le MEMBRE est nomme : l'analyse fonctionnelle ne porte que sur le membre
     inferieur, et rien dans le courrier ne le disait. */
  verifie('elle quitte la section des tests chiffrés, membre nommé',
          'Analyse fonctionnelle du membre inférieur — qualité du mouvement', sym.zone);
  verifie('deux compensations des deux côtés', '2 compensations', sym.statut);
  verifie('plus aucun « /7 »', 'false', String(/\/\d/.test(sym.statut)));
  /* `note` est vide : la synthèse voyage désormais dans `notes`, une ligne par
     observation, pour que le rendu en produise autant de sous-lignes. */
  verifie('la synthèse passe en notes', 'Mêmes compensations.', (sym.notes || []).join(' '));
  verifie('… et `note` reste vide', '', sym.note);
  verifie('les compensations sont transmises', '2', String((sym.af || []).length));

  var asym = statutDe([{ label:'Tronc', g:true, d:true }, { label:'Genou', g:false, d:true }], 'G 1/7 · D 2/7');
  verifie('côtés inégaux → les deux nombres', '1 à gauche · 2 à droite', asym.statut);

  var une = statutDe([{ label:'Tronc', g:true, d:true }], 'G 1/7 · D 1/7');
  verifie('une seule → singulier', '1 compensation', une.statut);

  /* LE CAS QUI A ECHAPPE : un patient SANS aucune compensation. La condition
     exigeait au moins une ligne, si bien qu'un bilan parfait gardait son score
     « G 0/7 · D 0/7 », restait dans la section des tests chiffres, et voyait
     ses observations par cote entassees dans la colonne des mesures. Le seul
     bilan a rester laid etait le meilleur. */
  /* Une grille de CRITERES garde son statut d'origine et SA section. « Acquis »
     dit deja le resultat ; le remplacer par « 2 compensations » compterait a
     l'envers, une pastille y etant un critere REUSSI. Et le Test de Reception
     reste un test fonctionnel : le deplacer sous « Analyse fonctionnelle » le
     sortirait de la section ou le medecin l'attend. */
  var critMode = statutDe([{ label:'Talon', g:true, d:true },
                           { label:'Descente', g:true, d:false }], 'Incomplet', 'critere');
  verifie('grille de critères → statut d\'origine', 'Incomplet', critMode.statut);
  verifie('… et section d\'origine', 'TESTS FONCTIONNELS', critMode.zone);

  var zero = statutDe([], 'G 0/7 · D 0/7');
  verifie('aucune compensation → statut en clair', 'Aucune compensation', zero.statut);
  verifie('… et elle rejoint quand même sa section',
          'Analyse fonctionnelle du membre inférieur — qualité du mouvement', zero.zone);
  verifie('… et reste reconnue comme analyse fonctionnelle', 'true',
          String(Array.isArray(zero.af)));

  /* L'Overhead squat n'a pas de côtés : ses compensations sortent sans g ni d.
     Sans ce cas, le compte tomberait a zero et le statut serait vide. */
  var ohs = statutDe([{ label:'Excès de lordose', g:false, d:false },
                      { label:'Talons décollés',  g:false, d:false }], '2 compensations');
  verifie('sans côtés → le nombre malgré tout', '2 compensations', ohs.statut);
}

console.log('\n  Une seule liste de pages pour les deux lecteurs');
{
  /* `_neGarderQueTF` (CR Tests) et `_crMedResumeTests` filtraient sur deux
     listes identiques écrites séparément. Une page ajoutée à l'une aurait
     manqué à l'autre en silence. */
  verifie('PAGES_TF réutilise CR_MED_PAGES', 'true',
          String(/var PAGES_TF = CR_MED_PAGES;/.test(src)));
  verifie('aucune seconde liste littérale', 'false',
          String(/PAGES_TF\s*=\s*\[/.test(src)));
}


console.log('\n  « Aucune compensation » est un bon résultat');
{
  /* Le bilan laisse cette ligne sans ton — « muted » veut dire « rien à
     signaler », pas « attention ». Sans niveau explicite, le courrier
     retombait sur son défaut et annonçait en orange le meilleur résultat
     possible. */
  var propre = src.replace(/\/\*[\s\S]*?\*\//g, "");
  var d = propre.indexOf("_entree.statut = 'Aucune compensation';");
  verifie('le statut existe', 'true', String(d !== -1));
  verifie('et il porte son niveau', 'true',
          String(propre.slice(d, d + 220).indexOf("_entree.niveau = 'ok';") !== -1));
}


console.log('\n  Les tests personnalisés du praticien sont proposés');
{
  /* Le praticien peut créer ses propres tests dans le bilan. Ils n'étaient
     JAMAIS proposés dans le CR — pas même ceux créés sur une page de tests
     fonctionnels, qui passent pourtant le filtre de pages.

     La cause n'est pas dans le tri mais dans ce qui l'alimente :
     `_ctBuildSectionHtml` émettait `<div class="cr-item">` NU, sans
     `data-pages`. Le filtre lit cet attribut, ne trouve rien, et écarte la
     ligne. Une fonction correcte en aval d'un câblage muet — le piège qui
     revient le plus souvent dans ce dépôt.

     Le filtre par page ne peut pas non plus s'appliquer à eux tel quel : un
     test personnalisé créé sur la page Épaule n'a AUCUN autre chemin vers le
     courrier (les tests orthopédiques y passent par les signes cliniques, pas
     par cette liste). Le praticien qui a pris la peine de nommer un test veut
     pouvoir le proposer, quelle que soit la page. Ils portent donc une marque
     propre, et le filtre les laisse passer. */

  var perso = lancerAvec([
    section('1. BILAN ORTHOPÉDIQUE — ÉPAULE', [
      ligne('Neer', 'Négatif', 'page-epaule', 'Négatif'),
      ligne('Mon test épaule', '12 / 14', 'page-epaule', '', true)
    ]),
    section('2. TESTS FONCTIONNELS — MEMBRES INFÉRIEURS', [
      ligne('SLS', '19 / 17 rép.', 'page-fonctionnels', ''),
      ligne('Mon test genou', '30 / 28', 'page-fonctionnels', '', true)
    ])
  ]);
  var cles = perso.map(function (t) { return t.cle; });

  verifie('un test perso sur une page fonctionnelle est proposé', 'true',
          String(cles.indexOf('Mon test genou') >= 0));
  verifie('un test perso sur une page orthopédique l\'est aussi', 'true',
          String(cles.indexOf('Mon test épaule') >= 0));
  /* Un test PERSO pose sur une page orthopedique reste dans la famille des
     mesures, avec les autres persos : le praticien qui a pris la peine de le
     creer et de le nommer veut le proposer, et le deplacer aujourd'hui vers
     l'examen orthopedique le ferait disparaitre de la ou il le cherche. */
  var famP = {}; perso.forEach(function (t) { famP[t.cle] = t.famille; });
  verifie('un perso orthopédique reste dans la famille des mesures', 'fonc',
          famP['Mon test épaule']);
  verifie('le test natif orthopédique, lui, est orthopédique', 'ortho',
          famP['Neer']);
  verifie('le test natif fonctionnel reste proposé', 'true',
          String(cles.indexOf('SLS') >= 0));

  var zones = {};
  perso.forEach(function (t) { zones[t.cle] = t.zone; });
  verifie('les deux persos partagent une zone', zones['Mon test épaule'],
          zones['Mon test genou']);
  verifie('… nommée comme dans le bilan', 'Tests personnalisés',
          zones['Mon test épaule']);

  /* Le regroupement final rassemble une zone dispersée. Les deux persos sont
     séparés par un test natif dans l'ordre d'entrée : s'ils ne se rejoignent
     pas, l'intertitre « Tests personnalisés » s'ouvrirait deux fois. */
  var iA = cles.indexOf('Mon test épaule'), iB = cles.indexOf('Mon test genou');
  verifie('… et ils se suivent après regroupement', '1', String(Math.abs(iA - iB)));
}

console.log('\n  Le CR Tests applique la même exception');
{
  /* `_neGarderQueTF` filtre le document « CR Tests » avec la MEME liste de
     pages — PAGES_TF vaut CR_MED_PAGES, unifiees pour qu'elles ne derivent
     plus. Laisser passer les tests personnalises d'un seul cote rouvrirait
     exactement cette divergence : le praticien les verrait proposes dans le
     courrier, et disparus du document de tests. */
  var d = src.indexOf('function _neGarderQueTF(');
  verifie('_neGarderQueTF existe', 'true', String(d !== -1));
  var corps = src.slice(d, src.indexOf('\n  }\n', d));
  verifie('elle lit la marque de test personnalisé', 'true',
          String(/data-cr-perso/.test(corps)));
  verifie('… et la marque suffit à garder la ligne', 'true',
          String(/garde\s*=\s*it\.getAttribute\('data-cr-perso'\)\s*===\s*'1'/.test(corps)));
}

console.log('\n  … et le câblage qui les alimente pose bien la marque');
{
  /* Le banc ci-dessus fabrique ses lignes : il prouve le TRI, pas l'émission.
     Sans ces deux vérifications, retirer l'attribut de `_ctBuildSectionHtml`
     laisserait les cas au vert et le défaut reviendrait entier. */
  var d = src.indexOf('window._ctBuildSectionHtml = function');
  verifie('_ctBuildSectionHtml existe', 'true', String(d !== -1));
  var corps = src.slice(d, src.indexOf('\n  };', d));
  verifie('la ligne perso porte sa page', 'true',
          String(/data-pages="page-'\s*\+\s*pk\s*\+\s*'"/.test(corps)));
  verifie('… et sa marque de test personnalisé', 'true',
          String(/data-cr-perso="1"/.test(corps)));

  /* Second câblage : les tests ajoutés dans un tableau existant ou dans un
     bloc personnalisé passent par `crItem`, pas par `_ctBuildSectionHtml`. */
  var c = src.indexOf('function crItem(');
  var corpsItem = src.slice(c, src.indexOf('\n  }', c));
  verifie('crItem sait poser la marque', 'true',
          String(/data-cr-perso/.test(corpsItem)));
  verifie('… et le rendu des lignes custom la lui passe', 'true',
          String(/crItem\(tname, noteVal \|\| '-', tag, tagCls, \[selEl\.id\]\.filter\(Boolean\), isCustomRow\)/.test(src)));
}

/* ════════════════════════════════════════════════════════════════════════
   Le BLOC, et la fusion des deux cotes
   ════════════════════════════════════════════════════════════════════════ */
console.log('\n  Le bloc voyage avec la ligne orthopédique');
{
  var b = lancerAvec([
    section('1. BILAN ORTHOPÉDIQUE — GENOU', [
      ligneBloc('Test de Lachman', 'Arrêt mou', 'page-genou', 'Positif', 'LCA / LCP'),
      ligneBloc('Laxité en varus à 0°', '-', 'page-genou', 'Négatif', 'Ligaments latéraux')
    ])
  ]);
  var parCle = {}; b.forEach(function (t) { parCle[t.cle] = t; });
  verifie('le nom du bloc arrive au CR', 'LCA / LCP', parCle['Test de Lachman'].bloc);
  verifie('… et deux blocs de la même section restent distincts',
          'Ligaments latéraux', parCle['Laxité en varus à 0°'].bloc);
  /* Le tiret n'est qu'un remplissage exige par `crItem` pour ne pas jeter la
     ligne — le verdict est dans la pastille, et « - » n'apprend rien. */
  verifie('un « - » de remplissage ne devient pas une valeur', '',
          parCle['Laxité en varus à 0°'].valeur);
}

console.log('\n  Une ligne orthopédique sans verdict n\'est pas un test');
{
  /* « Marqueur », « Type », « McKenzie » sont des CHAMPS de section, rendus
     par le meme `crItem` que les tests. La pastille est le seul critere qui
     les separe — une liste de cles a exclure aurait vieilli au premier champ
     ajoute a une page. */
  var m = lancerAvec([
    section('1. BILAN ORTHOPÉDIQUE — GENOU', [
      ligneBloc('McKenzie', 'Préférence directionnelle en extension', 'page-genou', ''),
      ligneBloc('Test de Lachman', '-', 'page-genou', 'Positif', 'LCA / LCP')
    ])
  ]);
  var cm = m.map(function (t) { return t.cle; });
  /* « Marqueur » ne prouverait RIEN : il est deja exclu par la liste de cles
     (Conclusion, Marqueur, Notes). « McKenzie » ne l'est pas — c'est la
     pastille absente, et elle seule, qui doit l'ecarter. */
  verifie('un champ de section sans pastille est écarté', 'false',
          String(cm.indexOf('McKenzie') >= 0));
  verifie('… et le test voisin remonte', 'true',
          String(cm.indexOf('Test de Lachman') >= 0));
  /* Sur une page FONCTIONNELLE la regle ne s'applique pas : une ligne d'analyse
     de course — « Cadence : 172 spm » — n'a pas de verdict et reste porteuse. */
  var c = lancerAvec([
    section('1. ANALYSE DE COURSE À PIED', [ ligne('Cadence', '172 spm', 'page-course', '') ])
  ]);
  verifie('une mesure sans verdict reste, elle', 'true',
          String(c.map(function (t) { return t.cle; }).indexOf('Cadence') >= 0));
}

console.log('\n  Le nom du bloc se lit sur les TEXTES de l\'en-tête');
{
  /* L'en-tete porte deux ELEMENTS enfants — la pastille « réévalué » et la
     commande « 4 à renseigner · TOUT NÉGATIF ». Lire son `textContent`
     ramenerait ce texte dans le nom du bloc, jusque dans le courrier. */
  var codeNom = bloc('function _crNomDuBloc', 'function _buildAllTestsHtml');
  var nomDuBloc = new Function(codeNom + '; return _crNomDuBloc;')();
  function faireBloc(enfants) {
    var hd = { childNodes: enfants };
    return { querySelector: function (sel) { return sel === '.block-header' ? hd : null; } };
  }
  var TXT = function (v) { return { nodeType: 3, textContent: v }; };
  var EL  = function (v) { return { nodeType: 1, textContent: v }; };
  verifie('un en-tête simple donne son nom', 'LCA / LCP',
          nomDuBloc(faireBloc([TXT('LCA / LCP')])));
  verifie('la commande de bloc ne passe pas', 'LCA / LCP',
          nomDuBloc(faireBloc([TXT('LCA / LCP'), EL('4 à renseigner'), EL('TOUT NÉGATIF')])));
  verifie('la pastille « réévalué » non plus', 'Ménisques',
          nomDuBloc(faireBloc([TXT('Ménisques'), EL('réévalué le 12/03')])));
  /* Un pictogramme d'en-tete n'apprend rien au medecin. */
  verifie('le pictogramme est retiré', 'Imageries disponibles',
          nomDuBloc(faireBloc([TXT('📷 Imageries disponibles')])));
  verifie('un bloc absent ne casse rien', '', nomDuBloc(null));
}

console.log('\n  Les deux côtés ne fusionnent que s\'ils disent la même chose');
{
  /* Sur un patient bilateral le bilan double ses tableaux (-g / -d) : le meme
     test sort en DEUX lignes. Elles fusionnent en « Bilatéral » — mention qui
     n'est pas qu'un raccourci : sur un test de laxite, une positivite des deux
     cotes se lit comme une hyperlaxite CONSTITUTIONNELLE, pas comme une
     lesion. Le bilan l'ecrit lui-meme sous l'extension passive. */
  var f = lancerAvec([
    section('1. BILAN ORTHOPÉDIQUE — GENOU', [
      ligneBloc('Laxité en valgus — Gauche', '-', 'page-genou', 'Positif', 'Ligaments latéraux'),
      ligneBloc('Laxité en valgus — Droit',  '-', 'page-genou', 'Positif', 'Ligaments latéraux'),
      ligneBloc('Test de Lachman — Gauche', 'Arrêt mou', 'page-genou', 'Positif', 'LCA / LCP'),
      ligneBloc('Test de Lachman — Droit',  '-',         'page-genou', 'Positif', 'LCA / LCP')
    ])
  ]);
  var cl = f.map(function (t) { return t.cle; });
  verifie('deux côtés identiques n\'en font plus qu\'un', 'true',
          String(cl.indexOf('Laxité en valgus — Bilatéral') >= 0));
  verifie('… et aucun des deux ne subsiste', 'false',
          String(cl.indexOf('Laxité en valgus — Droit') >= 0
              || cl.indexOf('Laxité en valgus — Gauche') >= 0));
  /* LA REGLE QUI PROTEGE : le meme verdict avec une OBSERVATION differente ne
     fusionne pas. Fusionner perdrait l'observation d'un cote sans que rien ne
     le signale — et un compte-rendu part du cabinet. */
  verifie('une observation qui diffère garde les deux lignes', 'true',
          String(cl.indexOf('Test de Lachman — Gauche') >= 0
              && cl.indexOf('Test de Lachman — Droit') >= 0));
  verifie('… et n\'invente pas de mention bilatérale', 'false',
          String(cl.indexOf('Test de Lachman — Bilatéral') >= 0));
  /* L'ordre du bilan est celui dans lequel le medecin lit les regions : la
     ligne fusionnee prend la place du PREMIER cote rencontre. */
  verifie('la fusion prend la place du premier côté', 'Laxité en valgus — Bilatéral',
          cl[0]);
  verifie('rien d\'autre n\'est perdu', '3', String(cl.length));

  /* UN SEUL COTE RENSEIGNE : le patient n'a ete examine que d'un cote, ou
     l'autre n'a rien donne. Le declarer « bilatéral » affirmerait au medecin
     un examen qui n'a pas eu lieu. */
  var seul = lancerAvec([
    section('1. BILAN ORTHOPÉDIQUE — GENOU', [
      ligneBloc('Test de Lachman — Droit', '-', 'page-genou', 'Positif', 'LCA / LCP')
    ])
  ]);
  var cs = seul.map(function (t) { return t.cle; });
  verifie('un côté seul garde son côté', 'Test de Lachman — Droit', cs[0]);
  verifie('… et ne devient jamais bilatéral', 'false',
          String(cs.join('|').indexOf('Bilatéral') >= 0));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

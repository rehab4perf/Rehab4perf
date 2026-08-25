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
function ligne(cle, val, pages, tag) {
  return {
    getAttribute: function (n) { return n === 'data-pages' ? pages : null; },
    querySelector: function (sel) {
      if (sel === '.cr-key') return { textContent: cle };
      if (sel === '.cr-tag') return tag ? { textContent: tag, classList: { contains: function () { return false; } } } : null;
      if (sel === '.cr-val') return { _val: val };
      return null;
    }
  };
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

console.log('\n  Le filtre — les tests de force remontent, les orthopédiques non');
{
  var cles = res.map(function (t) { return t.cle; });
  verifie('Neer (orthopédique) écarté',        'false', String(cles.indexOf('Neer') >= 0));
  verifie('Lachman (orthopédique) écarté',     'false', String(cles.indexOf('Lachman') >= 0));
  verifie('un test de force remonte',          'true',  String(cles.indexOf('Ischio-jambiers') >= 0));
  verifie('un test fonctionnel remonte',       'true',  String(cles.indexOf('SLS') >= 0));
  verifie('une ligne de course remonte',       'true',  String(cles.indexOf('Cadence') >= 0));
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
  verifie('ordre de première apparition conservé',
          'Tests de force|TESTS FONCTIONNELS — MEMBRES SUPÉRIEURS|'
          + 'TESTS FONCTIONNELS — MEMBRES INFÉRIEURS|ANALYSE DE COURSE À PIED',
          zones.join('|'));
}

console.log('\n  Le lexique complète le nom du test, il ne le remplace plus');
{
  /* « Contrôle moteur global » ne disait ni quel membre, ni quel mouvement :
     le nom technique n'avait pas ete traduit, il avait ete SUPPRIME. */
  var codeLex = bloc('var CR_MED_LEXIQUE', 'function _crMedValeurLisible');
  var lex = new Function(codeLex + '\n return { l: _crMedLabel, g: _crMedGeste };')();

  verifie('le protocole suit la fonction',
          'Contrôle moteur global (Overhead Squat)', lex.l('Overhead squat'));
  verifie('… et le geste part à côté', 'squat bras levés', lex.g('Overhead squat'));

  verifie('le squat unipodal se nomme',
          'Contrôle du membre inférieur (Squat unipodal)', lex.l('Squat unipodal — qualité'));

  /* Ce qui suit le motif est conserve : les declinaisons gardent leur suffixe,
     et le protocole se place APRES lui. */
  verifie('une déclinaison garde son suffixe',
          'Contrôle postural dynamique — direction antérieure (SEBT)', lex.l('SEBT — Antérieur'));

  /* Protocole vide quand il ne dirait rien de plus que la fonction. */
  verifie('pas de parenthèse redondante',
          'Endurance des extenseurs du cou', lex.l('Endurance Extenseurs Cervicaux'));
  verifie('… ni de geste inventé', '', lex.g('Endurance Extenseurs Cervicaux'));

  /* Geste vide quand la fonction le porte deja. */
  verifie('le Hop Test n\'a rien à ajouter', '', lex.g('Hop Test'));

  /* Hors lexique : le nom d'origine, jamais rien de perdu. */
  verifie('un test inconnu garde son nom', 'Machin inconnu', lex.l('Machin inconnu'));

  /* Le tri du plus long au plus court retire la dependance a l'ordre
     d'ecriture : « Drop Jump H » ne doit pas etre attrape par « Drop Jump ». */
  verifie('la clé la plus longue gagne',
          'Qualité de rebond (Pliométrie verticale)', lex.l('Pliométrie verticale (qualitative)'));
}

console.log('\n  Lecture de la grille — seules les compensations OBSERVÉES');
{
  /* Ces cas portent sur `_crMedAnalyseFonc`, la fonction qui relit la grille.
     Les suivants stubbent `_crMedValeur` et ne la traversent donc pas : sans
     ce bloc, retirer le filtre des critères non observés passerait inaperçu. */
  var codeAF = bloc('function _crMedAnalyseFonc', 'function _crMedValeur');
  function cel(txt) { return { textContent: txt }; }
  function grille(rangs, synth) {
    var enfants = [cel('Compensation observée'), cel('G'), cel('D')];
    rangs.forEach(function (r) {
      enfants.push(cel(r[0]), cel(r[1] ? '●' : '·'), cel(r[2] ? '●' : '·'));
    });
    var el = {
      querySelector: function (sel) { return sel === '.cr-af-tbl' ? { children: enfants } : null; },
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
  verifie('la synthèse est isolée', 'Mêmes compensations.', r.synthese);

  var vide = grille([['Hanche — adduction', 0, 0]], []);
  verifie('aucune compensation → aucune ligne', '0', String(vide.lignes.length));

  /* La phrase de synthese s'ouvre sur le meme score sur sept que le statut.
     Il ne sort pas du cabinet — mais ce qui SUIT est la vraie information
     clinique et doit rester. */
  var sc = grille([['Tronc', 1, 1]], ['Gauche 2/7 · Droite 2/7 — mêmes compensations des deux côtés']);
  verifie('le score disparaît, la phrase reste',
          'Mêmes compensations des deux côtés', sc.synthese);

  var diff = grille([['Tronc', 1, 0]],
    ['Gauche 3/7 · Droite 4/7 · 3 communes — profils différents (droite seulement : hanche)']);
  /* « 3 communes » n'a pas de denominateur : il se comprend seul, il reste. */
  verifie('un décompte sans dénominateur survit',
          '3 communes — profils différents (droite seulement : hanche)', diff.synthese);

  var libre = grille([['Tronc', 1, 1]], ['Talons surélevés : amélioration nette']);
  verifie('une observation libre n\'est pas touchée',
          'Talons surélevés : amélioration nette', libre.synthese);
}

console.log('\n  Analyse fonctionnelle — le score sur 7 ne sort pas du cabinet');
{
  /* `_crMedResumeTests` reecrit le statut quand la ligne porte des
     compensations : « G 2/7 · D 2/7 » ne dit rien a qui ignore le
     denominateur — sept criteres possibles. Le courrier annonce un NOMBRE. */
  var code2 = bloc('var CR_MED_PAGES', 'var _SAVE_ICON');
  function statutDe(lignes, tagInitial) {
    var fauxEl = {
      getAttribute: function () { return 'page-fonctionnels'; },
      querySelector: function (sel) {
        if (sel === '.cr-key') return { textContent: 'Squat unipodal — qualité' };
        if (sel === '.cr-tag') return { textContent: tagInitial, classList: { contains: function () { return false; } } };
        if (sel === '.cr-val') return {};
        return null;
      }
    };
    var doc = { createElement: function () {
      return { set innerHTML(h) {}, querySelectorAll: function () { return [fauxEl]; } }; } };
    var res = new Function('document', 'lignes', `
      function _buildAllTestsHtml(){ return [{ title:'TESTS FONCTIONNELS', html:'' }]; }
      function _crMedLabel(c){ return c; }
    /* _crMedResumeTests appelle aussi le geste : sans ce stub elle levait, le
       try/catch avalait l'exception et rendait un tableau VIDE — les cas
       tombaient sur undefined sans dire pourquoi. Pas d'accent grave ici : on
       est DANS un gabarit, il le refermerait. */
    function _crMedGeste(){ return ''; }
      function _crMedValeur(el){
        return { texte:'…', cellules:[], af:{ lignes: lignes, synthese:'Mêmes compensations.' } };
      }
      ${code2}
      return _crMedResumeTests();
    `)(doc, lignes);
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
  verifie('la synthèse passe en note', 'Mêmes compensations.', sym.note);
  verifie('les compensations sont transmises', '2', String((sym.af || []).length));

  var asym = statutDe([{ label:'Tronc', g:true, d:true }, { label:'Genou', g:false, d:true }], 'G 1/7 · D 2/7');
  verifie('côtés inégaux → les deux nombres', '1 à gauche · 2 à droite', asym.statut);

  var une = statutDe([{ label:'Tronc', g:true, d:true }], 'G 1/7 · D 1/7');
  verifie('une seule → singulier', '1 compensation', une.statut);

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

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

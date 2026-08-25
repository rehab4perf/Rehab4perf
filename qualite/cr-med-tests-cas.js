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

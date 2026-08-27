#!/usr/bin/env node
/* Cas de référence — l'appréciation d'un test de force.
 *
 * Ce menu ne cherche pas un signe clinique : il qualifie la force d'UN côté
 * quand il n'y a pas de dynamomètre. « Positif » y disait donc le contraire de
 * ce qu'il dit sur un Laslett ou un Ottawa — et le même mot rouge couvrait
 * aussi bien une baisse discrète qu'un déficit franc, que le plan de traitement
 * ne pouvait pas distinguer.
 *
 * Ce que ces cas protègent avant tout : LES VALEURS ENREGISTRÉES. `Positif`,
 * `Négatif` et `N/A` sont écrits en clair dans `donnees` depuis toujours — les
 * menus n'ont jamais porté d'attribut `value`, le texte affiché ÉTAIT la
 * valeur. Renommer un libellé sans figer sa valeur relirait tous les bilans
 * déjà enregistrés de travers, en silence.
 *
 *   node qualite/appreciation-force-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

/* ── les vraies fonctions, extraites de la source ────────────────────────── */
var deb = js.indexOf('var APPR_FORCE = {');
var fin = js.indexOf('function _crLabelsForCote(', deb);
if (deb < 0 || fin < 0) {
  console.error('Table APPR_FORCE introuvable dans js/bilan.js.');
  process.exit(1);
}
var api = new Function(js.slice(deb, fin) +
  '\n return { APPR_FORCE:APPR_FORCE, txt:_apprTxt, ui:_apprUi, stat:_statAppreciation, def:_apprDeficit };')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* ── L'identité des valeurs ──────────────────────────────────────────────── */
console.log('\n  Les valeurs enregistrées ne bougent pas');
{
  /* Si ces trois clés disparaissent de la table, tout bilan enregistré avant
     ce jour se relit sans libellé — et le CR affiche la valeur brute. */
  ['Positif', 'Négatif', 'N/A'].forEach(function (v) {
    verifie('la valeur « ' + v +' » est toujours reconnue', 'true', String(!!api.APPR_FORCE[v]));
  });

  var sansCom = html.replace(/<!--[\s\S]*?-->/g, '');
  /* Portée au SEUL menu d'appréciation : les tests de flexion debout/assis
     (`rl-tfd-res`, `rl-tfa-res`) sont de vrais tests cliniques et gardent leurs
     options sans value — les inclure ferait échouer le cas pour rien. */
  var menusApr = sansCom.match(/<select[^>]*class="ep-apr-sel"[\s\S]*?<\/select>/g) || [];
  verifie('les 46 menus d\'appréciation sont bien tous trouvés', 46, menusApr.length);
  verifie('aucun d\'eux ne laisse une option sans value', 0,
          menusApr.filter(function (m) { return /<option>/.test(m); }).length);
  verifie('les 46 menus portent les 4 valeurs', 46,
          (sansCom.match(/<option value="Négatif">Force normale<\/option>/g) || []).length);
  verifie('le palier intermédiaire est posé partout', 46,
          (sansCom.match(/<option value="Légère">/g) || []).length);
}

console.log('\n  Un ancien bilan se relit avec le nouveau mot');
{
  verifie('« Positif » se lit « Nettement diminuée »', 'Nettement diminuée', api.txt('Positif'));
  verifie('« Négatif » se lit « Force normale »',      'Force normale',      api.txt('Négatif'));
  verifie('« N/A » se lit « Non testé »',              'Non testé',          api.txt('N/A'));
  verifie('« Légère » se lit « Légèrement diminuée »', 'Légèrement diminuée', api.txt('Légère'));
  /* Une valeur inconnue — bilan écrit par une version future, ou saisie
     manuelle en base — se rend telle quelle plutôt que de disparaître. */
  verifie('une valeur inconnue est rendue telle quelle', 'Bizarre', api.txt('Bizarre'));
  verifie('une valeur vide ne rend rien', '', api.txt(''));
}

console.log('\n  Le CR rapporte le côté le plus atteint');
{
  function st(a, b) { var r = api.stat(a, b); return r ? r.txt + '/' + r.cls : 'null'; }
  verifie('deux côtés normaux',              'Force normale/ok',        st('Négatif', 'Négatif'));
  verifie('un côté nettement diminué',       'Nettement diminuée/bad',  st('Négatif', 'Positif'));
  verifie('l\'ordre des côtés est indifférent', 'Nettement diminuée/bad', st('Positif', 'Négatif'));
  verifie('un côté légèrement diminué',      'Légèrement diminuée/warn', st('Négatif', 'Légère'));
  /* Le plus atteint prime : une baisse légère d'un côté ne doit pas masquer
     un déficit franc de l'autre. */
  verifie('nette l\'emporte sur légère',     'Nettement diminuée/bad',  st('Légère', 'Positif'));
  verifie('un seul côté renseigné suffit',   'Force normale/ok',        st('Négatif', ''));
}

console.log('\n  Un test non fait n\'est pas un test normal');
{
  /* La ligne ne doit PAS apparaître au CR : sans cette distinction, un test
     jamais réalisé s'annoncerait « Force normale » au médecin. */
  verifie('les deux côtés vides → aucune ligne',   'null', String(api.stat('', '')));
  verifie('« Non testé » des deux côtés → aucune ligne', 'null', String(api.stat('N/A', 'N/A')));
  verifie('« Non testé » d\'un côté seul ne compte pas', 'Force normale',
          api.stat('N/A', 'Négatif').txt);
}

console.log('\n  Le plan de traitement retient les deux paliers de déficit');
{
  /* Le palier a été ajouté pour DISTINGUER une baisse légère d'un déficit
     franc, pas pour cesser de la traiter. */
  verifie('nettement diminuée → à renforcer', 'true',  String(api.def('Positif')));
  verifie('légèrement diminuée → à renforcer aussi', 'true', String(api.def('Légère')));
  verifie('force normale → rien à renforcer', 'false', String(api.def('Négatif')));
  verifie('non testé → rien à renforcer',     'false', String(api.def('N/A')));
  verifie('valeur vide → rien à renforcer',   'false', String(api.def('')));
}

console.log('\n  La couleur du menu suit le palier');
{
  verifie('normale → vert',   'negatif-ortho', api.ui('Négatif'));
  verifie('légère → ambre',   'attenue-ortho', api.ui('Légère'));
  verifie('nette → rouge',    'positif-ortho', api.ui('Positif'));
  verifie('non testé → neutre', '',            api.ui('N/A'));
  verifie('la classe ambre existe en CSS', 'true',
          String(/\.ep-apr-sel\.attenue-ortho\s*\{[^}]*var\(--orange\)/.test(html)));
}

/* ── Garde-fous textuels ─────────────────────────────────────────────────── */
console.log('\n  Garde-fous — plus aucune comparaison en dur');
{
  /* Les cas vérifient la table, pas QUI la consulte. Cinq lignes de CR et neuf
     lignes de plan de traitement comparaient `csA === 'Positif'` en direct :
     un palier ajouté à la table n'y aurait rien changé, en silence. */
  var sansCom = js.replace(/\/\*[\s\S]*?\*\//g, '');
  verifie('aucun `csA === \'Positif\'` résiduel', 'false',
          String(/(csA|caA)\s*===\s*'Positif'/.test(sansCom)));
  verifie('aucun `anyPos` résiduel', 'false', String(/anyPos/.test(sansCom)));
  verifie('le CR passe par _statAppreciation', 'true',
          String(/_ap = _statAppreciation\(csA, caA\)/.test(sansCom)));
  verifie('le CR affiche le libellé, pas la valeur', 'true',
          String(/a: ?_apprTxt\(csA\), b: ?_apprTxt\(caA\)/.test(sansCom)));
  verifie('la coloration passe par la table', 'true',
          String(/_apprUi\(sel\.value\)/.test(sansCom) && /_apprUi\(el\.value\)/.test(sansCom)));
  verifie('les vrais tests cliniques gardent Positif/Négatif', 'true',
          String(/opts:\s*\['Positif','Négatif','N\/A'\]/.test(sansCom)));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

#!/usr/bin/env node
/* Cas de référence — marquage du retest dans le CR.
 *
 * Le CR décidait « frais ou ancien » en comparant les valeurs. Un test refait
 * dont le résultat n'a pas bougé — un Lachman toujours négatif à huit semaines —
 * se retrouvait donc daté du bilan précédent. C'est faux, et c'est justement
 * l'information la plus forte du suivi.
 *
 * La question posée est désormais « ai-je refait ce test ? », et elle ne se
 * déduit d'aucune donnée : elle se marque, par bloc. Quatre états en sortent.
 *
 * Ce que ce fichier tient :
 *
 *   - Les quatre états, dont `inchange` et `initial` qui n'existaient pas.
 *   - « Réévalué » sur une PREMIÈRE mesure est faux : le médecin le lit comme
 *     un suivi. Une case à `false` dans un bilan ancien ne prouve rien — tout
 *     le formulaire est sérialisé à chaque enregistrement.
 *   - Le repli sur l'ancienne règle pour les bilans enregistrés AVANT la
 *     marque (`_reeval` absent). On ne réinvente pas un passé qu'on ignore :
 *     `null` et `[]` ne veulent PAS dire la même chose.
 *   - Un bloc marqué dont un test précis est resté vide : la marque porte sur
 *     le bloc, l'affirmation reste au champ.
 *   - Le contexte de lecture : un bilan HISTORIQUE porte le même marquage que
 *     le plus récent. `_crInSuiviMode` répondait `false` dès qu'on consultait
 *     un bilan antérieur, et tout un CR ancien paraissait frais.
 *
 *   node qualite/retest-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');

/* ── Extraction ────────────────────────────────────────────────────────────
   On borne sur des DÉFINITIONS (`function X`), jamais sur un nom seul : un
   appel ou un commentaire mentionnant la fonction apparaît plus haut dans le
   fichier, et la borne se poserait avant le code visé. */
function bloc(debut, fin) {
  var d = src.indexOf(debut);
  var f = src.indexOf(fin, d + 1);
  if (d < 0 || f < 0 || f <= d) {
    console.error('Bornes introuvables : « ' + debut + ' » … « ' + fin + ' »');
    console.error('Corriger qualite/retest-cas.js si le code a été déplacé.');
    process.exit(1);
  }
  return src.slice(d, f);
}

var codeReeval = bloc('function _reevalSerialiser()', 'var AF_OHS_GROUPS');
var codeCr     = bloc('function _crCtx()', 'function _crPrevMerged(');

/* Environnement minimal. Le CR lit le DOM pour un suivi non encore enregistré ;
   les cas ci-dessous portent tous sur des bilans ENREGISTRÉS, où les valeurs
   viennent des `donnees`. `document` n'a donc qu'à ne pas faire tomber le code. */
var api = new Function('etat', `
  var _allBilans = etat.bilans;
  var _currentBilanId = etat.courant;
  var _bilanIsSuivi = false, _suiviSnapshot = null;
  var _reevalBlocs = etat.reevalVif || {};
  var _reevalMap = etat.map || {};
  var _reevalChamps = etat.champs || {};
  var document = { getElementById: function(){ return null; } };
  function _prevMergedFrom(list, start){
    var out = {};
    for (var i = list.length - 1; i >= start; i--) {
      var d = list[i].donnees || {};
      Object.keys(d).forEach(function(k){
        var v = d[k];
        if (v !== undefined && v !== null && String(v) !== '') out[k] = v;
      });
    }
    return out;
  }
  var _crPrevMergedCache = null, _crPrevMergedKey = '';
  function _crPrevMerged(start){
    if (start === undefined) start = 1;
    return _prevMergedFrom(_allBilans, start) || {};
  }
  ${codeReeval}
  ${codeCr}
  return { etat: _crEtat, suivi: _crInSuiviMode, lire: _reevalLire, ctx: _crCtx };
`);

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* Deux blocs, deux tests chacun. `bl-lig` porte le Lachman, `bl-amp` la flexion. */
var MAP = { 'sel-lig-0': 'bl-lig', 'sel-lig-1': 'bl-lig', 'sel-amp-0': 'bl-amp' };
var CHAMPS = { 'bl-lig': ['sel-lig-0', 'sel-lig-1'], 'bl-amp': ['sel-amp-0'] };

function scene(donneesRecent, reeval, donneesAncien) {
  var d = Object.assign({}, donneesRecent);
  if (reeval !== undefined) d._reeval = JSON.stringify(reeval);
  return {
    bilans: [
      { id: 'B2', date: '2026-08-18', donnees: d },
      { id: 'B1', date: '2026-06-18', donnees: donneesAncien }
    ],
    courant: 'B2', map: MAP, champs: CHAMPS
  };
}

var ANCIEN = { 'sel-lig-0': 'Négatif', 'sel-lig-1': 'Négatif', 'sel-amp-0': '130' };

console.log('\n  Les trois états');
{
  // Bloc ligamentaire rouvert : un test change, l'autre pas. Le bloc « amplitudes »
  // n'a pas été touché du tout.
  var a = api(scene({ 'sel-lig-0': 'Positif', 'sel-lig-1': 'Négatif' }, ['bl-lig'], ANCIEN));
  verifie('valeur nouvelle → neuf',                'neuf',     a.etat(['sel-lig-0']));
  verifie('résultat identique → inchange',         'inchange', a.etat(['sel-lig-1']));
  verifie('bloc non réévalué → ancien',            'ancien',   a.etat(['sel-amp-0']));
}

console.log('\n  Une PREMIÈRE évaluation n\'est pas une réévaluation');
{
  /* Le mot « réévalué » sur un test fait pour la première fois est faux, et le
     médecin le lit comme un suivi alors que c'est une mesure initiale. */
  var a = api(scene({ 'sel-amp-0': '140' }, ['bl-amp'], { 'sel-lig-0': 'Négatif' }));
  verifie('aucune valeur antérieure → initial', 'initial', a.etat(['sel-amp-0']));

  var b = api(scene({ 'sel-amp-0': '140' }, ['bl-amp'], { 'sel-amp-0': '130' }));
  verifie('une valeur antérieure existe → neuf', 'neuf', b.etat(['sel-amp-0']));

  /* `_serializeBilan` parcourt TOUT le formulaire : chaque bilan enregistre
     chaque case, cochée ou non. Une case à `false` en juin ne dit pas que le
     test a été fait — elle est indiscernable de « jamais évaluée ». Sans cette
     exclusion, aucun bloc à cases ne serait jamais reconnu comme initial. */
  var c = api(scene({ 'sel-amp-0': 'true' }, ['bl-amp'], { 'sel-amp-0': false }));
  verifie('case à false en juin → toujours initial', 'initial', c.etat(['sel-amp-0']));

  // Case cochée en juin, décochée aujourd'hui : le test AVAIT été fait.
  var d = api(scene({ 'sel-amp-0': false }, ['bl-amp'], { 'sel-amp-0': true }));
  verifie('case à true en juin → déjà évalué', 'neuf', d.etat(['sel-amp-0']));
  // Et si le résultat n'a pas bougé, c'est « inchangé », jamais « 1re évaluation ».
  var d2 = api(scene({ 'sel-amp-0': true }, ['bl-amp'], { 'sel-amp-0': true }));
  verifie('case à true des deux côtés → inchange', 'inchange', d2.etat(['sel-amp-0']));

  /* Second indice : le bilan antérieur portait la MARQUE sur ce bloc. Il l'a
     donc bien évalué, même si toutes ses cases sont à false. */
  var e = api({
    bilans: [
      { id: 'B2', date: '2026-08-18', donnees: { 'sel-amp-0': 'true', _reeval: '["bl-amp"]' } },
      { id: 'B1', date: '2026-06-18', donnees: { 'sel-amp-0': false,  _reeval: '["bl-amp"]' } }
    ], courant: 'B2', map: MAP, champs: CHAMPS
  });
  verifie('marque antérieure sur le bloc → déjà évalué', 'neuf', e.etat(['sel-amp-0']));
}

/* Garde-fou — TOUT chemin d'enregistrement doit ecrire la marque.
   Le Suivi rapide construit ses `donnees` a la main (`merged`) au lieu de
   passer par `_serializeBilan` : il ecrivait `_meta` et `_blCustom` mais
   jamais `_reeval`. Un bilan cree par ce chemin ne portait donc aucune marque,
   et le CR retombait en silence sur l'ancienne comparaison de valeurs. */
console.log('\n  Tous les chemins d\'enregistrement écrivent la marque');
{
  var sansC = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  var nbMeta   = (sansC.match(/_meta = JSON\.stringify\(\{ catalogueVersion/g) || []).length;
  var nbReeval = (sansC.match(/_reeval = JSON\.stringify|_reeval = _reevalSerialiser/g) || []).length;
  verifie('autant d\'écritures de _reeval que de tampons _meta',
          String(nbMeta), String(nbReeval));
}

/* La regle du praticien : ce qui n'est pas marque « reevalue » EST une premiere
   evaluation. L'etat reste donc distingue en interne — sans lui la ligne serait
   annoncee « reevaluee », ce qui est faux — mais il ne rend AUCUNE mention. */
console.log('\n  Une première évaluation ne porte aucune mention');
{
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  var d = sansCom.indexOf('function _crMarquage');
  var f = sansCom.indexOf('function _crLegendeMarquage');
  var corps = sansCom.slice(d, f);
  var i = corps.indexOf("et === 'initial'");
  verifie('l\'état initial est bien traité', 'true', String(i !== -1));
  verifie('… et il ne rend pas de badge', 'true',
          String(/et === 'initial'\)\s*return\s*\{[^}]*badge:\s*''/.test(corps)));
  verifie('aucun libellé « 1re évaluation » ne subsiste', 'false',
          String(/1<sup>re<\/sup>/.test(src)));
}

console.log('\n  Un test resté vide dans un bloc marqué');
{
  /* Le bloc a été rouvert, mais CE test-là n'a pas été refait. La marque porte
     sur le bloc ; l'affirmation « réévalué » reste au champ. Sans ce garde-fou
     un bloc de huit tests dont on en refait deux en déclarerait huit. */
  var a = api(scene({ 'sel-lig-0': 'Positif', 'sel-lig-1': '' }, ['bl-lig'], ANCIEN));
  verifie('champ vide dans un bloc marqué → ancien', 'ancien', a.etat(['sel-lig-1']));
  verifie('le champ rempli du même bloc → neuf',     'neuf',   a.etat(['sel-lig-0']));
}

console.log('\n  Bilan enregistré AVANT la marque');
{
  /* `_reeval` absent : on retombe sur l'ancienne comparaison de valeurs. Le
     Lachman identique y repasse « ancien » — c'est le défaut d'origine, et
     c'est assumé : on ne sait pas si le test a été refait ce jour-là. */
  var a = api(scene({ 'sel-lig-0': 'Positif', 'sel-lig-1': 'Négatif' }, undefined, ANCIEN));
  verifie('valeur nouvelle → neuf',        'neuf',   a.etat(['sel-lig-0']));
  verifie('valeur identique → ancien',     'ancien', a.etat(['sel-lig-1']));

  /* LE TROU QUI RESTAIT. `_crDejaEvalue` n'était consulté que dans la branche
     des bilans MARQUÉS. Or aucune base n'en portait encore : on passait donc
     toujours par ce repli, qui répondait « réévalué » sans jamais se demander
     si le test existait avant. Une première mesure y était annoncée comme un
     contrôle de suivi — exactement ce qui se voyait à l'écran. */
  var b = api(scene({ 'sel-amp-0': '140' }, undefined, { 'sel-lig-0': 'Négatif' }));
  verifie('sans marque, première mesure → initial', 'initial', b.etat(['sel-amp-0']));
  var c = api(scene({ 'sel-amp-0': '140' }, undefined, { 'sel-amp-0': '130' }));
  verifie('sans marque, valeur déjà connue → neuf', 'neuf',    c.etat(['sel-amp-0']));
}

console.log('\n  `null` et `[]` ne veulent pas dire la même chose');
{
  verifie('clé absente → null (ancienne règle)', 'null',
          String(api(scene({}, undefined, ANCIEN)).lire({})));
  verifie('tableau vide → [] (rien réévalué)',   '',
          String(api(scene({}, [], ANCIEN)).lire({ _reeval: '[]' })));
  /* Confondre les deux serait un défaut silencieux : `[]` traité comme `null`
     ferait rejouer la comparaison de valeurs sur un bilan qui a répondu, et
     `null` traité comme `[]` griserait entièrement tous les bilans anciens. */
  var vide = api(scene({ 'sel-lig-0': 'Positif' }, [], ANCIEN));
  verifie('avec [] : un champ modifié reste ancien', 'ancien', vide.etat(['sel-lig-0']));
}

console.log('\n  Contexte de lecture — le bilan consulté, jamais le plus récent');
{
  var trois = {
    bilans: [
      { id: 'B3', date: '2026-08-18', donnees: { 'sel-lig-0': 'Négatif', _reeval: '["bl-lig"]' } },
      { id: 'B2', date: '2026-07-18', donnees: { 'sel-lig-0': 'Positif', _reeval: '["bl-lig"]' } },
      { id: 'B1', date: '2026-06-18', donnees: { 'sel-lig-0': 'Négatif' } }
    ],
    courant: 'B2', map: MAP, champs: CHAMPS
  };
  var a = api(trois);
  /* `_crInSuiviMode` répondait `false` dès que le bilan consulté n'était pas
     `_allBilans[0]` : un CR ancien s'affichait entièrement sans marquage. */
  verifie('un bilan historique reste en mode suivi', 'true', String(a.suivi()));
  verifie('il se compare à SON antérieur, pas au dernier', 'neuf', a.etat(['sel-lig-0']));

  trois.courant = 'B1';
  var b = api(trois);
  verifie('le tout premier bilan n\'a rien à marquer', 'false', String(b.suivi()));
  verifie('… et ses lignes sont sans état',            '',      b.etat(['sel-lig-0']));

  trois.courant = 'B3';
  var c = api(trois);
  // B3 « Négatif » contre la fusion des antérieurs, dont B2 « Positif » est le plus récent.
  verifie('le plus récent se compare à la fusion sous lui', 'neuf', c.etat(['sel-lig-0']));
}

console.log('\n  Un champ hors de tout bloc');
{
  /* Conclusion, marqueur, valeur calculée : rien ne les rattache à un bloc.
     Sans repli ils passeraient « ancien » pour toujours, sans rien pour le
     signaler — on retombe donc sur la comparaison de valeurs. */
  var a = api(scene({ 'f-conclusion': 'Reprise course autorisée' }, ['bl-lig'],
                    { 'f-conclusion': 'Poursuite du renforcement' }));
  verifie('champ inconnu de l\'index → ancienne règle', 'neuf', a.etat(['f-conclusion']));
}

/* ── La pastille se cache, le marquage continue ────────────────────────────
   Deux choses distinctes, et les confondre casserait le mécanisme : sur un
   PREMIER bilan « Réévalué » ne veut rien dire — il n'y a rien à réévaluer —
   mais ce qu'on y évalue doit être enregistré, sinon le bilan SUIVANT ne
   saura pas que ces tests existaient déjà (`_crDejaEvalue`). */
console.log('\n  La pastille se cache quand elle ne peut pas servir');
{
  var sansCom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  var dV = sansCom.indexOf('function _reevalMajVisibilite');
  var fV = sansCom.indexOf('function _reevalEcouter');
  var corpsV = sansCom.slice(dV, fV);
  verifie('la visibilité existe',            'true', String(dV > 0));
  verifie('… et suit le contexte de suivi',  'true', String(/_crInSuiviMode\(\)/.test(corpsV)));

  /* Le marquage ne doit RIEN savoir de la visibilité. S'il la consultait, un
     premier bilan n'enregistrerait aucune marque — et le second annoncerait
     « réévalué » sur des tests faits pour la première fois. */
  var dE = sansCom.indexOf('function _reevalEcouter');
  var fE = sansCom.indexOf('document.addEventListener(\'input\'', dE);
  var corpsE = sansCom.slice(dE, fE);
  verifie('le marquage ignore la visibilité', 'false',
          String(/_reevalVisible|_reevalMajVisibilite|_crInSuiviMode/.test(corpsE)));
  verifie('… et garde son garde-fou isTrusted', 'true',
          String(/isTrusted === false/.test(corpsE)));

  /* La sérialisation non plus : ce qui est marqué part en base, visible ou non. */
  var dS = sansCom.indexOf('function _reevalBlocsPourSauvegarde');
  var fS = sansCom.indexOf('function _reevalChampsMarques');
  verifie('l\'enregistrement ignore la visibilité', 'false',
          String(/_reevalVisible/.test(sansCom.slice(dS, fS))));
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

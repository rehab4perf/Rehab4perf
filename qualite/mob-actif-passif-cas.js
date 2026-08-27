#!/usr/bin/env node
/* Cas de référence — les grilles de mobilité actif / passif.
 *
 * Le différentiel actif/passif situe l'origine d'une limitation : actif limité
 * mais passif libre, c'est la commande ; les deux limités, c'est la structure.
 * Il n'existait que sur l'épaule ; le coude et le poignet l'ont désormais.
 *
 * Ce que ces cas protègent :
 *
 *  1. Les identifiants de l'ÉPAULE ne bougent pas d'un caractère — les bilans
 *     enregistrés les retrouvent tels quels.
 *  2. Chaque mouvement déclaré a bien ses quatre champs dans la page, et chaque
 *     `onchange` désigne le mouvement de SA ligne. Une clé qui diverge ne casse
 *     rien de visible : la colonne « Interprétation » reste muette.
 *  3. La page COUDE n'avait AUCUNE section au compte-rendu — ni ses douze
 *     tableaux, ni sa grille. Lui ajouter une grille sans lui donner sa section
 *     aurait créé un second manque silencieux.
 *
 *   node qualite/mob-actif-passif-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');
var sansCom = js.replace(/\/\*[\s\S]*?\*\//g, '');

function extrait(sig, fin) {
  var d = js.indexOf(sig), f = js.indexOf(fin, d);
  if (d < 0 || f < 0) { console.error('Bornes introuvables : ' + sig); process.exit(1); }
  return js.slice(d, f);
}
var MOB_AP  = new Function(extrait('var MOB_AP = {', '\nvar EP_MOB_MOVEMENTS') + '\n return MOB_AP;')();
var verdict = new Function(extrait('function _mobApVerdict(a, p, e) {', '\nfunction _mobApRefresh') +
                           '\n return _mobApVerdict;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

console.log('\n  Les segments et leurs mouvements');
{
  verifie('quatre segments', 'ep,co,po,ha', Object.keys(MOB_AP).join(','));
  /* Les cles de l'EPAULE sont la partie des identifiants deja enregistree dans
     les bilans. Les renommer relirait ces bilans de travers, en silence. */
  verifie('l\'épaule garde ses clés', 'flex,abd,rl,rm,addh',
          MOB_AP.ep.map(function (m) { return m.key; }).join(','));
  verifie('le coude',   'flex,ext,pro,sup',
          MOB_AP.co.map(function (m) { return m.key; }).join(','));
  verifie('le poignet', 'flex,ext,pro,sup,incu,incr',
          MOB_AP.po.map(function (m) { return m.key; }).join(','));
}

console.log('\n  Chaque mouvement a ses quatre champs dans la page');
{
  var manquants = [], mauvaisCablage = [];
  Object.keys(MOB_AP).forEach(function (seg) {
    MOB_AP[seg].forEach(function (m) {
      var base = seg + '-mob-' + m.key;
      ['act', 'pas', 'ef', 'obs', 'interp'].forEach(function (suf) {
        if (html.indexOf('id="' + base + '-' + suf + '"') === -1) manquants.push(base + '-' + suf);
      });
      /* Le `onchange` doit designer le mouvement de SA ligne. Une cle qui
         diverge ne casse rien de visible : la colonne reste muette. */
      var attendu = "_mobApRefresh('" + seg + "','" + m.key + "')";
      var bloc = html.split('id="' + base + '-act"')[1] || '';
      if (bloc.slice(0, 120).indexOf(attendu) === -1) mauvaisCablage.push(base);
    });
  });
  verifie('aucun champ manquant', '', manquants.join(','));
  verifie('chaque menu appelle sa propre clé', '', mauvaisCablage.join(','));

  /* L'inverse compte autant : une ligne dans la page qu'aucun segment ne
     declare ne serait ni interpretee, ni remontee au compte-rendu. */
  var declares = {};
  Object.keys(MOB_AP).forEach(function (seg) {
    MOB_AP[seg].forEach(function (m) { declares[seg + '-mob-' + m.key] = true; });
  });
  var orphelines = (html.match(/id="(\w+)-mob-(\w+)-act"/g) || [])
    .map(function (t) { return t.slice(4, -5); })
    .filter(function (b) { return !declares[b]; });
  verifie('aucune ligne orpheline dans la page', '', orphelines.join(','));
}

console.log('\n  L\'interprétation du différentiel');
{
  /* Vocabulaire repris du tableau « Lire l'écart actif vs passif » : les mots
     que le praticien lit dans sa formation sont ceux qu'il retrouve ici — et
     c'est ce qui permet à l'explication de tenir en une ligne. */
  function v(a, p, e) { var r = verdict(a, p, e); return r[0] + '/' + r[1]; }
  verifie('rien de saisi',                    '—/muted',                     v('', '', ''));
  verifie('passif seul',                      'Passif isolé/muted',          v('', 'lim', ''));
  verifie('actif libre, passif non testé',    'Conservée/ok',                v('libre', '', ''));
  verifie('actif anormal, passif non testé',  'À tester en passif/muted',    v('lim', '', ''));
  verifie('actif = passif limités',           'Limitation articulaire/bad',  v('lim', 'lim', ''));
  verifie('actif < passif',                   'Limitation musculaire/warn',  v('lim', 'libre', ''));
  verifie('douleur active seule',             'Pathologie tendineuse/warn',  v('doul', 'libre', ''));
  verifie('douleur active et passive',        'Structure non contractile/bad',        v('doul', 'doul', ''));
  verifie('douleur passive seule',            'Structure non contractile/bad',        v('libre', 'doul', ''));
  /* Le libellé se dit sans supposer Cyriax connu : le courrier part chez un
     médecin. Et l'os a été retiré de la liste — il figure dans l'inventaire
     théorique des structures inertes, mais une douleur osseuse ne se reproduit
     quasiment jamais par une mise en tension passive. Le ligament, lui, est le
     premier candidat et manquait. */
  verifie('le mot « inerte » ne sort plus', 'false',
          String(/Structure inerte/.test(js.replace(/\/\*[\s\S]*?\*\//g, ''))));
  verifie('l\'os a quitté la liste', 'Capsule, ligament ou bourse.',
          verdict('libre', 'doul', '')[2]);
  verifie('les deux libres',                  'Conservée/ok',                v('libre', 'libre', ''));
  verifie('douloureux ET limité vs passif libre', 'Limitation musculaire/warn', v('doullim', 'libre', ''));
}

console.log('\n  Le profil atypique — celui qui ne sortait jamais');
{
  /* Deux verrous l'empêchaient, à deux étages :
     `a === 'libre'` court-circuitait la comparaison AVANT elle, et
     `_mobApRefresh` EFFAÇAIT le passif dès que l'actif était libre. Corriger
     l'un sans l'autre n'aurait rien changé — et l'effacement supprimait au
     passage une saisie du praticien sans le moindre signal. */
  var r = verdict('libre', 'lim', '');
  verifie('actif libre, passif limité', 'Artefact ou laxité/warn', r[0] + '/' + r[1]);
  var propre = js.replace(/\/\*[\s\S]*?\*\//g, '');
  verifie('le passif n\'est plus effacé', 'false',
          String(/if \(a\.value === 'libre'\) p\.value = '';/.test(propre)));
  verifie('le raccourci « actif libre » est borné au passif vide', 'true',
          String(/if \(!p\) return a === 'libre'/.test(propre)));
}

console.log('\n  L\'end-feel requalifie, et prime quand il est vide');
{
  function v(a, p, e) { var r = verdict(a, p, e); return r[0] + '/' + r[1]; }
  verifie('ferme-élastique → verdict de base', 'Limitation articulaire/bad', v('lim', 'lim', 'ferme'));
  verifie('dur → butée osseuse',               'Butée osseuse/bad',          v('lim', 'lim', 'dur'));
  verifie('mou → œdème ou laxité',             'Œdème ou laxité/warn',       v('lim', 'lim', 'mou'));
  /* Le vide prime sur TOUT : il ne décrit pas une raideur mais un arrêt par la
     douleur avant toute butée. Le subordonner au reste de la ligne le ferait
     disparaître là où il compte le plus. */
  verifie('vide sur un actif limité',  'Arrêt sur douleur/bad', v('lim', 'lim', 'vide'));
  verifie('vide sur un actif libre',   'Arrêt sur douleur/bad', v('libre', 'libre', 'vide'));
  verifie('vide sans actif du tout',   'Arrêt sur douleur/bad', v('', '', 'vide'));
  /* Sans passif, la fin de course n'a pas d'objet : une valeur restée là ferait
     basculer en drapeau rouge un mouvement qu'on n'a pas testé. */
  verifie('elle se vide quand le passif s\'efface', 'true',
          String(/if \(!actif\) e\.value = '';/.test(js)));
}

console.log('\n  La phrase d\'explication reste courte');
{
  verifie('« Conservée » n\'en porte aucune', '', verdict('libre', '', '')[2]);
  verifie('« Limitation articulaire » tient en une ligne',
          'Capsulite, arthrose, raideur post-immobilisation.', verdict('lim', 'lim', '')[2]);
  verifie('chaque verdict garde son détail en infobulle', 'true',
          String([['lim','lim',''],['lim','libre',''],['doul','libre',''],['libre','lim','']]
            .every(function (t) { return !!verdict(t[0], t[1], t[2])[3]; })));
}


console.log('\n  La hanche — les deux côtés, systématiquement');
{
  /* La hanche s'examine toujours des deux côtés : le côté entre dans la clé,
     ce qui donne `ha-mob-g-flex-act` — la forme des identifiants de degrés
     qu'elle portait, prolongée d'un suffixe. */
  verifie('douze lignes', 12, (MOB_AP.ha || []).length);
  verifie('six mouvements, deux côtés', 'G,D,G,D,G,D,G,D,G,D,G,D',
          MOB_AP.ha.map(function (m) { return m.cote; }).join(','));
  verifie('rangés par mouvement puis par côté', 'Flexion,Flexion,Extension,Extension',
          MOB_AP.ha.slice(0, 4).map(function (m) { return m.label; }).join(','));
  /* Les degrés ont disparu de la page : le praticien note l'amplitude en clair
     dans le marqueur s'il veut préciser. Leurs valeurs déjà enregistrées
     restent lisibles dans l'Évolution, qui lit les `donnees`, pas la page. */
  verifie('plus aucun champ de degré', 0,
          (html.match(/id="ha-mob-[gd]-(?:flex|ext|ri|re|abd|add)"/g) || []).length);
  verifie('le CR ne rend plus le tableau de degrés', 'false',
          String(/romCrTable\('Amplitudes Articulaires — Hanche/.test(js)));
  verifie('il rend le différentiel', 'true', String(/_crMobApRows\('ha'\)/.test(js)));
  /* Les observations par côté sont CONSERVÉES : rien dans le nouveau tableau
     ne les remplace — le marqueur est par mouvement — et le CR les lit. */
  verifie('les observations par côté subsistent', 'true',
          String(/id="ha-mob-g-obs"/.test(html) && /id="ha-mob-d-obs"/.test(html)));
  /* Le côté est nommé en toutes lettres au courrier : ce sont des côtés
     ANATOMIQUES, la grille les lit tels quels et le CR ne traduit pas. */
  verifie('le courrier nomme le côté', 'true',
          String(/m\.cote \? m\.label \+ ' — ' \+ \(m\.cote === 'G' \? 'Gauche' : 'Droit'\)/.test(js)));
}

console.log('\n  Le libellé « Vide »');
{
  /* « Vide » cohabitait avec le « — » du menu non renseigné : les deux se
     lisaient pareil au premier coup d'œil. Le terme canonique reste en tête,
     la formulation du praticien le précise. */
  verifie('vingt-sept menus le portent', 27,
          (html.match(/<option value="vide">Vide \(arrêt sur douleur\)<\/option>/g) || []).length);
  verifie('aucun « Vide » nu ne subsiste', 0,
          (html.match(/<option value="vide">Vide<\/option>/g) || []).length);
  /* LA VALEUR ne bouge pas : elle est la clé des bilans enregistrés. */
  verifie('la valeur reste « vide »', 27, (html.match(/value="vide"/g) || []).length);
  verifie('le verdict suit la même formulation', 'Arrêt sur douleur', verdict('', '', 'vide')[0]);
}

console.log('\n  Le compte-rendu lit les quatre segments');
{
  ['ep', 'co', 'po', 'ha'].forEach(function (seg) {
    verifie('_crMobApRows(\'' + seg + '\') est appelé', 'true',
            String(sansCom.indexOf("_crMobApRows('" + seg + "')") !== -1));
  });
  /* Une ligne n'existe que si l'ACTIF est renseigne : le verdict se lit sur la
     comparaison, « passif seul » ne dit rien au medecin. */
  verifie('la fin de course figure au courrier', 'true',
          /Fin de course : '\+\(EP_MOB_EF_LABELS\[e\]\|\|e\)/.test(sansCom) + '');
  /* La phrase COURTE part au courrier, jamais le détail : le médecin lit un
     verdict et sa raison en une ligne. C'est ce qui a rendu le vocabulaire du
     verdict décisif. */
  verifie('la phrase courte part au courrier', 'true',
          /\(v\[2\] \? ' · '\+v\[2\] : ''\)/.test(sansCom) + '');
  verifie('la fin de course compte comme champ réévalué', 'true',
          /base\+'-act', base\+'-pas', base\+'-ef', base\+'-obs'/.test(sansCom) + '');
  verifie('pas de ligne sans actif', 'true',
          /var a = \(document\.getElementById\(base\+'-act'\)\|\|\{\}\)\.value\|\|'';\s*if \(!a\) return;/.test(sansCom));
}

console.log('\n  Le balisage des trois tableaux');
{
  verifie('vingt-sept menus de fin de course', 27, (html.match(/id="[\w-]+-mob-[\w-]+-ef"/g) || []).length);
  /* Bornée aux tableaux actif/passif : « Observation » reste un en-tête
     légitime ailleurs — les répétitions du rachis lombaire en portent un. */
  var entetes = (html.match(/<thead><tr>[\s\S]*?<\/tr><\/thead>\s*<tbody id="[\w-]*mob-tbody">/g) || []);
  verifie('quatre tableaux actif/passif', 4, entetes.length);
  verifie('chacun a ses colonnes', 4, entetes.filter(function (t) {
    return ['Mouvement', 'Actif', 'Passif', 'End-feel', 'Marqueur / observations', 'Interprétation']
      .every(function (c) { return t.indexOf('>' + c + '<') !== -1; });
  }).length);
  /* La hanche en a une de plus : elle s'examine des deux côtés, toujours. */
  verifie('la hanche ajoute la colonne « Côté »', 1,
          entetes.filter(function (t) { return t.indexOf('>Côté<') !== -1; }).length);
  var menusPas = html.match(/<select id="[\w-]+-mob-[\w-]+-pas"[\s\S]*?<\/select>/g) || [];
  verifie('vingt-sept menus passif', 27, menusPas.length);
  verifie('tous acceptent « doul. + lim. »', 27,
          menusPas.filter(function (m) { return m.indexOf('value="doullim"') !== -1; }).length);
}

console.log('\n  La page Coude a enfin sa section');
{
  /* Douze tableaux au catalogue TESTS, une grille de mobilite dans la page, et
     RIEN de tout cela n'etait lu : on pouvait remplir la page entiere sans
     qu'une seule ligne n'apparaisse au compte-rendu. Meme manque que le
     Poignet, decouvert en lui ajoutant sa grille actif/passif. */
  var d = sansCom.indexOf('var orthoSections = [');
  var sec = sansCom.slice(d, sansCom.indexOf('\n  ];', d));
  verifie('la section COUDE existe', 'true', String(/label:'COUDE'/.test(sec)));
  /* `zones:['coude']` et rien d'autre : reprendre la liste de l'EPAULE
     laisserait une douleur d'epaule decider du cote nomme pour le coude. */
  verifie('elle ne lit que la zone coude', 'true',
          String(/label:'COUDE', zones:\['coude'\]/.test(sec)));
  var absentes = ['tb-co-lat', 'tb-co-med', 'tb-co-ant', 'tb-co-post',
                  'tb-co-lat-g', 'tb-co-lat-d', 'tb-co-med-g', 'tb-co-med-d',
                  'tb-co-ant-g', 'tb-co-ant-d', 'tb-co-post-g', 'tb-co-post-d']
    .filter(function (t) { return sec.indexOf("'" + t + "'") === -1; });
  verifie('ses douze tableaux y figurent', '', absentes.join(','));
}

console.log('\n  Le tableau REMPLACE les lignes de statut, il ne s\'y ajoute pas');
{
  /* Decision du praticien : deux facons de dire la mobilite dans le meme bloc
     se lisaient comme un doublon. Les champs `mob-co-*` / `mob-po-*` ne sont
     plus dans la page — leurs valeurs restent en base mais ne sont ni
     affichees ni reportees, et c'est assume. */
  verifie('plus aucune ligne de statut au coude', 0,
          (html.match(/id="mob-co-\w+-(st|nt)"/g) || []).length);
  verifie('plus aucune ligne de statut au poignet', 0,
          (html.match(/id="mob-po-\w+-(st|nt)"/g) || []).length);
  /* Les appels de CR doivent partir AVEC les champs : laisses en place ils
     chercheraient des identifiants qui n'existent plus, sans rien rendre — du
     code mort qui fait croire que la mobilite remonte deux fois. */
  verifie('le CR n\'appelle plus la grille du coude', 'false',
          String(/_crMobTable\([^)]*'co'/.test(sansCom)));
  verifie('le CR n\'appelle plus la grille du poignet', 'false',
          String(/_crMobTable\([^)]*'po'/.test(sansCom)));
  /* Le rachis, lui, garde ses grilles de statut : elles n'ont pas d'equivalent
     actif/passif. */
  verifie('le rachis garde les siennes', 'true',
          String(/_crMobTable\('Mobilité Cervicale',  'cerv'\)/.test(sansCom)));
  /* La forme [cle, libelle] ne servait qu'au poignet. Un mecanisme qui ne sert
     plus est un piege pour la lecture suivante. */
  verifie('la forme [clé, libellé] a été retirée', 'false',
          String(/Array\.isArray\(m\)/.test(sansCom)));
}

console.log('\n  L\'interprétation se rejoue après chargement');
{
  /* Elle n'etait rejouee qu'au CHARGEMENT DE LA PAGE : rouvrir un bilan
     laissait la colonne a « — » alors que les deux menus etaient renseignes.
     Le defaut existait deja sur l'epaule. */
  verifie('appelée après désérialisation', 'true',
          /updateAll\(\); calcRec\(\); calcPlioq\(\); _epFoncRefresh\(\); _mobApRefreshAll\(\);/.test(sansCom) + '');
  verifie('appelée après restauration du brouillon', 'true',
          /_epFoncRefresh\(\);\s*try \{ _mobApRefreshAll\(\); \} catch/.test(sansCom) + '');
  verifie('la boucle couvre tout segment ajouté', 'true',
          /Object\.keys\(MOB_AP\)\.forEach/.test(sansCom) + '');
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

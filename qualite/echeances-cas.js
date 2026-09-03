#!/usr/bin/env node
/* Cas de référence — la bande d'échéances de l'agenda.
 *
 * Le repère 🎯 sur la case du jour existait déjà, mais il n'apparaît qu'en
 * naviguant jusqu'au mois concerné : une échéance à douze mois y est donc
 * INVISIBLE — il faudrait savoir qu'elle existe pour aller la chercher.
 * La bande la garde à l'écran quel que soit le mois affiché, et porte le J-N,
 * qui est l'information qui gouverne la planification : c'est la distance à
 * l'échéance qui donne le budget de semaines, pas la date elle-même.
 *
 * On exécute ici le VRAI rendu, avec des doublures.
 *
 *   node qualite/echeances-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var js   = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Bornes : le marqueur de fin doit être UNIQUE. Un premier jet bornait sur un
   commentaire présent deux fois et lisait la tranche à l'envers. */
var FIN = 'window._echToutBasculer = _echToutBasculer;';
var d0 = js.indexOf('var _ECH_MAX'), d1 = js.indexOf(FIN, d0);
if (d0 < 0 || d1 < d0) { console.error('Bornes introuvables dans js/prog-main.js.'); process.exit(1); }
var code = js.slice(d0, d1 + FIN.length);

function jour(n) {
  var d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function rendre(objs) {
  var boite = { style: {}, innerHTML: '' };
  /* eslint-disable no-new-func */
  new Function('document', 'escH', '_patientObjectifs', '_renderCalendarUI', '_calView', 'window',
    code + '\nreturn _renderEcheances;')(
    { getElementById: function () { return boite; } },
    function (x) { return String(x); }, objs, function () {}, 'month', {}
  )();
  return boite;
}

console.log('\nCe que la bande montre');
var vide = rendre([]);
ok('aucune échéance : la bande se tait', vide.style.display === 'none' && !vide.innerHTML);

var une = rendre([{ text: 'UTMB', date: jour(24) }]);
ok('une échéance : la bande apparaît', une.style.display === '');
ok('… avec son intitulé', une.innerHTML.indexOf('UTMB') > 0);
ok('… et le nombre de jours qui en sépare', une.innerHTML.indexOf('J-24') > 0);

/* Une bande qui garde des dates dépassées cesse d'être lue en quelques
   semaines : le passé quitte la bande dès le lendemain. */
var passee = rendre([{ text: 'Course annulée', date: jour(-3) }, { text: 'UTMB', date: jour(24) }]);
ok('une échéance passée est écartée', passee.innerHTML.indexOf('Course annulée') < 0);
ok('… sans emporter les autres', passee.innerHTML.indexOf('UTMB') > 0);

var auj = rendre([{ text: 'Retour au foot', date: jour(0) }]);
ok('le jour même se dit en toutes lettres', auj.innerHTML.indexOf("aujourd'hui") > 0,
   'un « J-0 » se lit mal');

/* L'ordre est celui de la proximité : la prochaine d'abord. Trié par date
   d'insertion, la bande dirait n'importe quoi. */
var ordre = rendre([{ text: 'Loin', date: jour(200) }, { text: 'Proche', date: jour(10) },
                    { text: 'Moyen', date: jour(60) }]);
ok('les plus proches viennent en premier',
   ordre.innerHTML.indexOf('Proche') < ordre.innerHTML.indexOf('Moyen') &&
   ordre.innerHTML.indexOf('Moyen') < ordre.innerHTML.indexOf('Loin'));

var cinq = rendre([1, 2, 3, 4, 5].map(function (n) { return { text: 'E' + n, date: jour(n * 10) }; }));
/* Compter les pastilles, pas la presence du bouton : un premier jet
   verifiait « +2 autres », qui continue de s'afficher meme si les cinq sont
   rendues — la regression passait au vert. */
var nbCinq = (cinq.innerHTML.match(/class="cal-ech"/g) || []).length;
ok('au-delà de trois, seules trois sont montrées', nbCinq === 3, nbCinq + ' pastille(s)');
ok('… et le reste est annoncé', cinq.innerHTML.indexOf('+2 autres') > 0);

var deux = rendre([{ text: 'A', date: jour(5) }, { text: 'B', date: jour(9) }]);
ok('en dessous du seuil, aucun repli', deux.innerHTML.indexOf('autre') < 0);

console.log('\nLa bande et la grille parlent la même langue');
/* La même échéance ne doit pas se présenter sous deux identités selon
   l'endroit où on la regarde : le repère du jour est ambre et porte 🎯. */
ok('le repère du jour est ambre',
   /\.cal-day-objectif-lbl \{[^}]*color:var\(--amrap\)/.test(html.replace(/\n/g, ' ')));
ok('la pastille par défaut l\'est aussi',
   /\.cal-ech \{[^}]*border-left:3px solid var\(--amrap\)/.test(html.replace(/\n/g, ' ')));
ok('… et porte le même 🎯', une.innerHTML.indexOf('🎯') > 0);
/* La distinction ne porte PAS sur qui a saisi — une fois l'échéance
   acceptée, la source ne change plus rien — mais sur ce qui reste à faire. */
ok('toutes les échéances portent la même identité', /kind:'sport'/.test(js));
var neuve = rendre([{ text:'UTMB', date:jour(24), source:'athlete', echId:7, repris:false }]);
ok('une échéance déclarée et non reprise est marquée', neuve.innerHTML.indexOf('nouveau') > 0);
ok('… et son clic la prend en compte, identifiant quoté',
   neuve.innerHTML.indexOf("_echPrendreEnCompte('7'") > 0,
   'un uuid non quoté casserait l\'appel');
var reprise = rendre([{ text:'UTMB', date:jour(24), source:'athlete', echId:7, repris:true }]);
ok('une fois reprise, plus aucune marque', reprise.innerHTML.indexOf('nouveau') < 0);
ok('… et son clic navigue comme les autres', reprise.innerHTML.indexOf('_echAller') > 0);
ok('un objectif du bilan n\'est jamais marqué', une.innerHTML.indexOf('nouveau') < 0);

console.log('\nLe câblage');
ok('la bande a sa place dans la page', html.indexOf('id="calEcheances"') > 0);
ok('… au-DESSUS de la grille',
   html.indexOf('id="calEcheances"') < html.indexOf('id="calGrid"'));
/* Trois moments : le rendu de la grille, l'arrivée des objectifs, et le
   patient vidé. En perdre un laisse les échéances du patient précédent. */
ok('elle se redessine à au moins trois moments',
   (js.match(/_renderEcheances\(\);/g) || []).length >= 4,
   (js.match(/_renderEcheances\(\);/g) || []).length + ' appel(s)');
ok('le clic mène au mois de l\'échéance', /function _echAller\(dateStr\)/.test(js) &&
   /_calYear = parseInt/.test(js));

/* ── L'écran athlète et sa migration ─────────────────────────────
 * L'athlète n'écrit aujourd'hui que dans `athlete_feedback`. Lui ouvrir
 * `patients` — la table qui porte nom, prénom et date de naissance — pour
 * qu'il déclare une date de course serait un très mauvais échange : d'où une
 * table dédiée, et une migration NON APPLIQUÉE tant que le praticien ne l'a
 * pas décidé.
 *
 * Le code est donc écrit pour vivre SANS elle : requête en échec = section
 * entièrement masquée, agenda inchangé. C'est ce qui permet de déployer avant
 * de toucher au schéma, et c'est le cas le plus important d'ici. */
console.log('\nL\'écran athlète survit à l\'absence de la table');
var ath = fs.readFileSync(path.join(R, 'athlete.html'), 'utf8');

var D0 = 'var _echListe = null;', D1 = 'function _echSupprimer(id){';
var a0 = ath.indexOf(D0), a1 = ath.indexOf(D1, a0);
ok('le bloc de l\'écran est identifiable', a0 > 0 && a1 > a0);
var codeAth = ath.slice(a0, a1);

function rendreAth(liste) {
  var boite = { innerHTML: '' };
  /* eslint-disable no-new-func */
  new Function('document', 'escH', 'SUPA_URL', 'SUPA_KEY', '_patientId', 'fetch',
    codeAth + '\nreturn function(l){ _echListe = l; _echRendre(); };')(
    { getElementById: function () { return boite; } },
    function (x) { return String(x); }, '', '', '1', function () {}
  )(liste);
  return boite.innerHTML;
}

ok('table absente : la section reste entièrement vide', rendreAth(null) === '',
   'une section a moitié affichée serait pire que pas de section');
ok('… et la réponse en échec n\'écrit rien', /if\(!Array\.isArray\(d\)\) return;/.test(codeAth));

var attente = rendreAth([{ id:1, texte:'UTMB', date:jour(24), repris_at:null }]);
ok('une échéance en attente est modifiable', attente.indexOf('_echSupprimer(1)') > 0);
ok('… et le dit', attente.indexOf('en attente de validation') > 0);

var prise = rendreAth([{ id:1, texte:'UTMB', date:jour(24), repris_at:'2026-08-20T10:00:00Z' }]);
/* Une fois reprise, des cycles sont calés dessus : la base refuse l'écriture,
   l'interface ne doit donc pas la proposer. */
ok('une échéance reprise n\'est plus modifiable', prise.indexOf('_echSupprimer') < 0);
ok('… et l\'athlète voit que c\'est acté', prise.indexOf('pris en compte') > 0);

/* Une échéance reprise est souvent recopiée dans le bilan par le praticien :
   sans garde-fou elle s'afficherait deux fois, une par source. On exécute la
   vraie fusion avec un `_fetchRetry` doublé. */
var _fusionPromesse = Promise.resolve();
console.log('\nLa fusion des deux sources');
{
  var F0 = js.indexOf('function _chargerEcheancesAthlete');
  var F1 = js.indexOf('\n}', F0);
  var codeFus = js.slice(F0, F1 + 2);
  /* `_chargerEcheancesAthlete` fusionne au bout de DEUX sauts de micro-tache :
     `.then(r => r.json())` puis `.then(data => …)`. Lire la liste trop tot la
     trouve inchangee, et l'assertion « pas de doublon » passe pour la mauvaise
     raison — rien n'a encore ete ajoute.

     Un seul `Promise.resolve().then()` ne suffisait pas : il ne couvre qu'UN
     saut, et c'est ce qui la faisait passer a tort. On attend un tour de boucle
     d'evenements entier, qui vient apres toutes les micro-taches. */
  /* `_patientObjectifs` est REASSIGNE par la fonction — elle remplace la part
     athlete au lieu de l'empiler. Le passer en parametre ne suffit donc pas :
     la reassignation rebind le parametre local, et la doublure continuerait de
     lire le tableau d'origine, inchange. On le declare VARIABLE a l'interieur,
     et l'on rend un accesseur pour le relire apres coup. */
  function fusionner(bilan, athlete) {
    /* eslint-disable no-new-func */
    var lire = new Function('SUPA_URL_P', '_sbHeaders', '_fetchRetry', '_progPatient',
      '_depart', '_renderEcheances', '_renderCalendarUI',
      'var _patientObjectifs = _depart;\n' + codeFus
      + '\n_chargerEcheancesAthlete(1);'
      + '\nreturn function(){ return _patientObjectifs; };')(
      '', function () { return {}; },
      function () { return Promise.resolve({ ok: true, json: function () { return athlete; } }); },
      { id: 1 }, bilan.slice(), function () {}, function () {}
    );
    return new Promise(function(resoudre){
      setTimeout(function(){ resoudre(lire()); }, 0);
    });
  }
  _fusionPromesse = fusionner([{ text: 'UTMB', date: '2026-08-29' }],
                      [{ id: 9, texte: 'UTMB', date: '2026-08-29', repris_at: null }])
    .then(function (fus) {
      ok('une échéance présente des deux côtés n\'apparaît qu\'une fois', fus.length === 1,
         fus.length + ' entrée(s)');
      return fusionner([{ text: 'UTMB', date: '2026-08-29' }],
                       [{ id: 9, texte: 'Templiers', date: '2026-10-18', repris_at: null }]);
    })
    .then(function (fus2) {
      ok('… mais une échéance distincte s\'ajoute bien', fus2.length === 2,
         fus2.length + ' entrée(s)');
      ok('… en portant sa source', fus2.length === 2 && fus2[1].source === 'athlete');
    });
}

console.log('\nDeux échéances le même jour : les DEUX se voient');
{
  /* Le premier jet les fondait tout seul — meme jour, deux sources, une puce.
     C'est l'inverse de ce qu'il faut : deux echeances le meme jour sont souvent
     deux choses DIFFERENTES, et les fondre les cachait toutes les deux derriere
     un libelle unique, sans moyen de voir ce qu'il y avait dessous. */
  ok('plus aucune fusion automatique', !/_echFondreParDate/.test(js));

  var D0 = js.indexOf('function _echDoublonPossible');
  var D1 = js.indexOf('\nfunction _renderEcheances', D0);
  if (D0 < 0 || D1 < D0) { console.log('  ✗ bornes de _echDoublonPossible introuvables'); ko++; }
  var aide = new Function(js.slice(D0, D1)
    + '\nreturn { doublon:_echDoublonPossible, libelle:_echLibellePraticien };')();

  var prat = function (t, d) { return { text:t, date:d, source:'praticien' }; };
  var athl = function (t, d, id) { return { text:t, date:d, source:'athlete', echId:id||'a1' }; };

  /* La fusion n'est PROPOSEE que dans la configuration qui s'y prete : deux
     echeances, meme jour, deux sources. */
  var L = [prat('hyrox', '2026-10-17'), athl('hyrox V', '2026-10-17', 'a7')];
  ok('la fusion est proposée sur l\'échéance de l\'athlète', aide.doublon(L, L[1]));
  /* JAMAIS sur celle du praticien : c'est la ligne de l'athlete qu'on reecrit.
     On lui donne artificiellement un identifiant — sinon le refus viendrait de
     son absence, et le controle passerait pour une mauvaise raison. */
  var pratAvecId = { text:'hyrox', date:'2026-10-17', source:'praticien', echId:'p1' };
  ok('… et jamais sur celle du praticien',
     !aide.doublon([pratAvecId, L[1]], pratAvecId));

  var L2 = [prat('hyrox', '2026-10-17'), athl('trail', '2026-10-18', 'a8')];
  ok('deux dates différentes ne proposent rien', !aide.doublon(L2, L2[1]));
  /* Deux declarations de l'ATHLETE le meme jour ne sont pas un doublon
     inter-sources : il n'y a rien du praticien a adopter. Sans le filtre sur la
     source, la ligne se trouverait elle-meme et se proposerait a la fusion. */
  var L3 = [athl('course A', '2026-10-17', 'a1'), athl('course B', '2026-10-17', 'a2')];
  ok('deux déclarations de l\'athlète non plus', !aide.doublon(L3, L3[0]));
  ok('… et une échéance seule ne se trouve pas elle-même',
     !aide.doublon([L3[0]], L3[0]));
  /* Sans identifiant, il n'y a rien a reecrire. */
  var L4 = [prat('hyrox', '2026-10-17'), { text:'x', date:'2026-10-17', source:'athlete' }];
  ok('une échéance sans identifiant ne se fusionne pas', !aide.doublon(L4, L4[1]));

  /* Le libelle adopte est celui du PRATICIEN — le nom officiel. */
  ok('le libellé retenu est celui du praticien',
     aide.libelle(L, '2026-10-17') === 'hyrox', aide.libelle(L, '2026-10-17'));
  ok('… et rien s\'il n\'y en a pas', aide.libelle(L3, '2026-10-17') === '');
}

console.log('\nFusionner : ce que le geste écrit');
{
  var F0 = js.indexOf('function _echFusionner');
  var F1 = js.indexOf('\n/* Le panneau', F0);
  if (F0 < 0 || F1 < F0) { console.log('  ✗ bornes de _echFusionner introuvables'); ko++; }
  var f = js.slice(F0, F1);
  /* Le geste relie deux echeances du patient : il se confirme, et la
     confirmation nomme les deux libelles. */
  ok('elle demande confirmation', /confirm\(/.test(f));
  ok('… en nommant les deux libellés', /athlete \? athlete\.text/.test(f) && /libelle/.test(f));
  /* Et elle dit que RIEN n'est perdu — c'est ce qui distingue cette version de
     la premiere, qui ecrasait le libelle de l'athlete. */
  ok('… et en disant que les deux sont conservés', /libellés sont conservés/.test(f));
  /* Fusionner vers rien relierait l'echeance a un libelle absent. */
  ok('elle refuse de fusionner vers un libellé vide', /if\(!libelle\)/.test(f));
  /* Elle pose le lien ET la prise en compte, en une seule ecriture. */
  ok('elle pose le lien', /fusion:\{ avec:libelle/.test(f));
  ok('… et la prise en compte', /repris_at:/.test(f));

  /* L'ecriture elle-meme est partagee par les trois gestes. */
  var W0 = js.indexOf('function _echEcrireFusion');
  var w = js.slice(W0, js.indexOf('\n/* Relire plutot', W0));
  ok('l\'écriture vise la ligne de l\'athlète', /athlete_objectifs\?id=eq\./.test(w));

  /* Le bouton vit HORS de la puce : un bouton dans un bouton n'est pas
     cliquable, et le balisage est invalide. */
  var R0 = js.indexOf('function _renderEcheances');
  var R1 = js.indexOf('\nfunction _echDateLisible', R0);
  var rend = js.slice(R0, R1);
  ok('le bouton est posé après la puce',
     rend.indexOf("+  '</button>'") >= 0
     && rend.indexOf('cal-ech-fus') > rend.indexOf("+  '</button>'"));
  ok('… et n\'apparaît que sur un doublon possible', /o\.doublon[\s\S]{0,160}cal-ech-fus/.test(rend));
  ok('… stylé dans la feuille', /\.cal-ech-fus\s*\{/.test(html));
  /* Les objectifs du bilan doivent porter leur source, sinon rien n'est propose. */
  ok('les objectifs du bilan portent leur source', /source:'praticien'/.test(js));
}

console.log('\nFusionner sans rien détruire');
{
  /* La premiere version ecrasait `texte` avec le libelle du praticien. Le mot
     de l'athlete etait alors PERDU : on ne pouvait plus ni defusionner, ni
     choisir lequel afficher. Une fusion qui detruit une des deux valeurs
     qu'elle relie n'est pas une fusion, c'est un remplacement. */
  ok('le texte de l\'athlète n\'est jamais réécrit', !/texte: *libelle/.test(js));
  ok('la fusion vit dans sa propre colonne', /fusion:\{ *avec:/.test(js));
  /* Tant que la migration n'est pas appliquee, la colonne n'existe pas : la
     lecture doit survivre. `select=*` rend ce qui existe, une liste de colonnes
     ferait echouer la requete et la section entiere disparaitrait. */
  ok('la lecture survit à l\'absence de la colonne', /athlete_objectifs\?patient_id=eq\.' \+ pid[\s\S]{0,200}select=\*/.test(js));

  var A0 = js.indexOf('function _echAppliquerFusions');
  var A1 = js.indexOf('\nfunction _renderEcheances', A0);
  if (A0 < 0 || A1 < A0) { console.log('  ✗ bornes de _echAppliquerFusions introuvables'); ko++; }
  var appliquer = new Function(js.slice(A0, A1) + '\nreturn _echAppliquerFusions;')();

  var prat = function (t, d) { return { text:t, date:d, jours:10, kind:'sport', source:'praticien' }; };
  var athlF = function (t, d, avec, affiche) {
    return { text:t, date:d, jours:10, kind:'sport', source:'athlete', echId:'a1',
             fusion:{ avec:avec, affiche:affiche } };
  };

  var r = appliquer([prat('hyrox', '2026-10-17'), athlF('hyrox V', '2026-10-17', 'hyrox', 'praticien')]);
  ok('une paire fusionnée n\'occupe qu\'une puce', r.length === 1, r.length + ' puce(s)');
  ok('… au libellé choisi', r[0] && r[0].text === 'hyrox', r[0] && r[0].text);
  /* Les DEUX libelles restent portes par la puce : c'est ce que le panneau
     affiche pour permettre de choisir. */
  ok('… en gardant les deux libellés', r[0] && r[0].libPrat === 'hyrox' && r[0].libAthl === 'hyrox V');

  var r2 = appliquer([prat('hyrox', '2026-10-17'), athlF('hyrox V', '2026-10-17', 'hyrox', 'athlete')]);
  ok('choisir le libellé de l\'athlète le fait afficher', r2[0] && r2[0].text === 'hyrox V', r2[0] && r2[0].text);
  /* Une valeur inconnue ne doit pas laisser la puce sans libelle : on retombe
     sur le nom officiel. */
  var r3 = appliquer([prat('hyrox', '2026-10-17'), athlF('hyrox V', '2026-10-17', 'hyrox', 'nimporte')]);
  ok('un choix inconnu retombe sur le libellé officiel', r3[0] && r3[0].text === 'hyrox');

  /* Ce qui n'est PAS fusionne passe intact — y compris un objectif du praticien
     d'un autre jour, qu'une comparaison sur le seul texte aurait avale. */
  var r4 = appliquer([prat('hyrox', '2026-10-17'), prat('hyrox', '2026-11-02'),
                      athlF('hyrox V', '2026-10-17', 'hyrox', 'praticien')]);
  ok('le même libellé un autre jour reste visible', r4.length === 2, r4.length + ' puce(s)');
  var r5 = appliquer([prat('trail', '2026-10-17'), { text:'autre', date:'2026-10-17', jours:10, source:'athlete', echId:'a2' }]);
  ok('sans fusion, les deux restent séparées', r5.length === 2, r5.length + ' puce(s)');

  /* La fusion n'est plus PROPOSEE sur une paire deja fusionnee. */
  var D0 = js.indexOf('function _echDoublonPossible');
  var doub = new Function(js.slice(D0, js.indexOf('\n/* Le libelle du praticien', D0))
                          + '\nreturn _echDoublonPossible;')();
  var dejaFus = athlF('hyrox V', '2026-10-17', 'hyrox', 'praticien');
  ok('une paire déjà fusionnée ne se repropose pas',
     !doub([prat('hyrox', '2026-10-17'), dejaFus], dejaFus));
}

console.log('\nDéfusionner et choisir');
{
  var E0 = js.indexOf('function _echEcrireFusion');
  var E1 = js.indexOf('\nfunction _echToutBasculer', E0);
  var z = js.slice(E0, E1);
  /* Trois gestes, une seule ecriture qui les porte tous. */
  ok('fusionner pose le lien et la prise en compte', /fusion:\{ avec:libelle, affiche:'praticien' \}/.test(z));
  ok('choisir ne change QUE l\'affichage', /fusion:\{ avec:o\.fusion\.avec, affiche:quoi \}/.test(z));
  ok('séparer remet la fusion à rien', /fusion:null/.test(z));
  /* `repris_at` n'est pas efface : le praticien a bien vu la declaration, se
     separer ne revient pas la-dessus. */
  ok('séparer ne défait pas la prise en compte', !/_echSeparer[\s\S]{0,200}repris_at/.test(z));
  /* On n'annonce que ce qui est FAIT — la colonne peut ne pas exister encore. */
  /* Le message doit etre ATTEIGNABLE : le trouver dans le fichier ne prouve
     rien s'il vit dans une branche que plus rien ne declenche. */
  ok('un refus est annoncé, avec la piste',
     /if\(!res\.ok\)\{[\s\S]{0,320}migration « fusion » est-elle appliquée/.test(z));
  ok('… et zéro ligne touchée n\'est pas un succès', /Aucune échéance modifiée/.test(z));
  ok('les lignes touchées sont demandées', /'return=representation'/.test(z));

  /* Le panneau porte les deux libelles, dit QUI les a saisis, et separe. */
  var P0 = js.indexOf('function _echPanneauFusion');
  var P1 = js.indexOf('\nwindow._echPanneauFusion', P0);
  var pan = js.slice(P0, P1);
  ok('le panneau montre le libellé du praticien', /o\.fusion\.avec/.test(pan));
  ok('… et celui de l\'athlète', /o\.libAthl/.test(pan));
  ok('… en disant qui a saisi quoi', /vous<\/i>/.test(pan) && /athlète<\/i>/.test(pan));
  ok('… et propose de séparer', /_echSeparer/.test(pan));
  /* Un second clic referme : le bouton est une bascule, pas un aller simple. */
  ok('un second clic referme le panneau', /if\(deja\)\{ _echFermerPanneau\(\); return; \}/.test(pan));

  /* Deux etats du meme bouton, au meme endroit. */
  var R0 = js.indexOf('function _renderEcheances');
  var rend = js.slice(R0, js.indexOf('\nfunction _echDateLisible', R0));
  ok('le bouton propose la fusion quand elle est possible', /o\.doublon[\s\S]{0,160}_echFusionner/.test(rend));
  ok('… et ouvre le choix quand elle est faite', /o\.fusionnee[\s\S]{0,160}_echPanneauFusion/.test(rend));
  ok('l\'état fusionné se distingue à l\'œil', /\.cal-ech-fus\.est-fus/.test(html));
  ok('le panneau est stylé', /\.cal-ech-panneau\s*\{/.test(html));
}

console.log('\nLe geste se voit tout de suite');
{
  /* L'ecriture reussissait — le message le disait — et la bande ne changeait
     pas. `_chargerEcheancesAthlete` ne faisait qu'EMPILER : rejouee, elle
     retrouvait l'ancienne entree deja en place, la voyait dans son garde-fou
     anti-doublon, et ECARTAIT la ligne fraiche, celle qui portait la fusion. */
  var C0 = js.indexOf('function _chargerEcheancesAthlete');
  var C1 = js.indexOf('\n// Repère', C0);
  var chg = js.slice(C0, C1);
  ok('le chargement REMPLACE la part athlète',
     /_patientObjectifs = _patientObjectifs\.filter\(function\(o\)\{ return o\.source !== 'athlete'; \}\);/.test(chg));
  /* Et il doit le faire AVANT de construire son garde-fou anti-doublon, sinon
     celui-ci retient encore les entrees qu'on vient de retirer. */
  ok('… avant de construire le garde-fou anti-doublon',
     chg.indexOf("o.source !== 'athlete'") < chg.indexOf('var deja = {}'));

  /* La ligne rendue par le serveur fait foi et s'applique tout de suite : c'est
     ce qui rend l'affichage independant d'une relecture, laquelle exige un
     patient courant. */
  var M0 = js.indexOf('function _echAppliquerLigne');
  var M1 = js.indexOf('\nfunction _echRelire', M0);
  if (M0 < 0 || M1 < M0) { console.log('  ✗ bornes de _echAppliquerLigne introuvables'); ko++; }
  var appliquerLigne = new Function(js.slice(M0, M1) + '\nreturn _echAppliquerLigne;');

  var etat = [{ text:'hyrox V', date:'2026-10-17', source:'athlete', echId:'a1', fusion:null, repris:false }];
  var maj = new Function('_patientObjectifs', js.slice(M0, M1) + '\nreturn _echAppliquerLigne;')(etat);
  maj({ id:'a1', fusion:{ avec:'hyrox', affiche:'praticien' }, repris_at:'2026-09-03T00:00:00Z' });
  ok('la fusion rendue par le serveur est appliquée',
     !!(etat[0].fusion && etat[0].fusion.avec === 'hyrox'));
  ok('… et la prise en compte avec', etat[0].repris === true);

  /* Separer rend `fusion: null` : l'entree doit repasser non fusionnee. */
  maj({ id:'a1', fusion:null });
  ok('séparer remet l\'entrée en clair', etat[0].fusion === null);

  /* Postgres peut rendre un jsonb deja decode ou en chaine selon le client :
     les deux formes doivent etre acceptees. */
  var etat2 = [{ text:'x', date:'2026-10-17', source:'athlete', echId:'a2' }];
  var maj2 = new Function('_patientObjectifs', js.slice(M0, M1) + '\nreturn _echAppliquerLigne;')(etat2);
  maj2({ id:'a2', fusion:'{"avec":"y","affiche":"athlete"}' });
  ok('une fusion rendue en chaîne est décodée',
     !!(etat2[0].fusion && etat2[0].fusion.affiche === 'athlete'));

  /* Une ligne qui ne concerne personne ne doit rien toucher. */
  var etat3 = [{ text:'x', date:'2026-10-17', source:'athlete', echId:'a3', fusion:null }];
  var maj3 = new Function('_patientObjectifs', js.slice(M0, M1) + '\nreturn _echAppliquerLigne;')(etat3);
  maj3({ id:'zzz', fusion:{ avec:'w', affiche:'praticien' } });
  ok('une ligne étrangère ne touche à rien', etat3[0].fusion === null);

  /* Le rendu doit etre rejoue apres l'ecriture, sinon rien ne se voit. */
  var Z0 = js.indexOf('function _echRelire');
  var z2 = js.slice(Z0, js.indexOf('\nfunction _echFusionner', Z0));
  ok('l\'affichage est refait après l\'écriture', /_renderEcheances\(\)/.test(z2));
  ok('… et le calendrier aussi', /_renderCalendarUI/.test(z2));
  ok('… et le panneau se referme', /_echFermerPanneau\(\)/.test(z2));
  /* Les trois gestes passent par la : aucun ne doit s'en dispenser. */
  ok('les trois gestes rafraîchissent',
     (js.match(/if\(ok\) _echRelire\(\);/g) || []).length === 3,
     (js.match(/if\(ok\) _echRelire\(\);/g) || []).length + ' geste(s)');
}

console.log('\nLa migration de la fusion');
{
  var mig = '';
  try { mig = fs.readFileSync(path.join(R, 'supabase', 'migrations', '20260902_athlete_objectifs_fusion.sql'), 'utf8'); } catch(e){}
  ok('le fichier existe', !!mig);
  ok('elle ajoute la colonne sans casser l\'existant', /ADD COLUMN IF NOT EXISTS fusion jsonb/.test(mig));
  ok('elle dit pourquoi une colonne plutôt qu\'une réécriture', /pas une fusion, c'est un remplacement/.test(mig));
  ok('elle explique comment défusionner', /repasse `fusion` à NULL|remettre `fusion` à NULL/i.test(mig));
}

console.log('\nLa migration, écrite mais NON appliquée');
var sqlPath = path.join(R, 'supabase', 'migrations', '20260829_athlete_objectifs.sql');
ok('le fichier existe', fs.existsSync(sqlPath));
var sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';
ok('elle dit en tête qu\'elle n\'est pas appliquée', /NON APPLIQU/.test(sql));
ok('la sécurité au niveau ligne est activée', /ENABLE ROW LEVEL SECURITY/.test(sql));
/* La seule politique réellement fermée : elle protège les données d'un
   cabinet de celles d'un autre. */
/* Les DEUX clauses comptent : `USING` filtre ce qu'il voit, `WITH CHECK` ce
   qu'il écrit. Un premier jet ne vérifiait que la présence du filtre quelque
   part dans le fichier — la régression passait au vert avec un `USING (true)`
   tant que l'autre clause subsistait. */
var polPrat = sql.slice(sql.indexOf('CREATE POLICY athlete_objectifs_praticien'));
polPrat = polPrat.slice(0, polPrat.indexOf(';') + 1);
ok('le praticien ne VOIT que ses patients',
   /USING\s+\(EXISTS[\s\S]*?praticien_id = auth\.uid\(\)/.test(polPrat));
ok('… et n\'ÉCRIT que sur les siens',
   /WITH CHECK\s+\(EXISTS[\s\S]*?praticien_id = auth\.uid\(\)/.test(polPrat));
/* S'auto-valider priverait le praticien du filtre qui l'empêche de caler des
   cycles sur une date fantaisiste. */
ok('l\'athlète ne peut pas se déclarer « pris en compte »',
   /FOR INSERT TO anon WITH CHECK \(repris_at IS NULL\)/.test(sql));
ok('… ni modifier ce qui l\'est déjà',
   /FOR UPDATE TO anon[\s\S]{0,80}USING \(repris_at IS NULL\)/.test(sql));
ok('l\'exposition résiduelle est écrite noir sur blanc', /EXPOSITION R/.test(sql));

_fusionPromesse.then(function () {
  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Bande d\'echeances : tous les cas passent.');
});

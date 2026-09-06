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
   acceptée, la source ne change plus rien — mais sur ce qui reste à faire.

   Une PÉRIODE fait exception, et c'est la seule : ce n'est pas une échéance
   vue autrement, c'est autre chose — une parenthèse pendant laquelle on ne
   travaille pas, là où l'échéance est un but vers lequel on travaille. */
ok('les échéances portent toutes la même identité',
   /kind:\(o\.dateFin \? 'periode' : 'sport'\)/.test(js));
ok('… la période étant la seule exception',
   (js.match(/kind:'/g) || []).length === 0);
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
  ok('plus aucune fusion automatique', !/_echFondreParDate/.test(js));

  var D0 = js.indexOf('function _echPartenaire');
  var D1 = js.indexOf('\n/* Une entree ABSORBEE', D0);
  if (D0 < 0 || D1 < D0) { console.log('  ✗ bornes de _echPartenaire introuvables'); ko++; }
  /* `_echPartenaire` s'appuie desormais sur `_echEstPeriode` — une periode ne
     se fond pas. L'extraire seule la laissait sans sa dependance, et le cas
     levait au lieu de mesurer. */
  var P0 = js.indexOf('function _echEstPeriode');
  var P1 = js.indexOf('\n}', js.indexOf('function _echCouvre'));
  if (P0 < 0 || P1 < P0) { console.log('  ✗ bornes des outils de période introuvables'); ko++; }
  var part = new Function(js.slice(P0, P1 + 2) + '\n' + js.slice(D0, D1) +
                          '\nreturn _echPartenaire;')();

  var e = function (t, d, src, id, fus) {
    return { text:t, date:d, source:src, echId:id, fusion:fus || null };
  };

  /* La SOURCE n'entre pas dans la regle. Deux echeances du meme jour viennent
     souvent des DEUX declarations de l'athlete — « hyrox V » puis « hyrox » —
     et c'est precisement ce doublon-la qu'on veut pouvoir reduire. */
  var L = [e('hyrox', '2099-10-17', 'athlete', 5), e('hyrox V', '2099-10-17', 'athlete', 4)];
  ok('deux déclarations de l\'athlète ont un partenaire', !!part(L, L[0]));
  var L2 = [e('hyrox', '2099-10-17', 'praticien'), e('hyrox V', '2099-10-17', 'athlete', 4)];
  ok('… comme un objectif du bilan et une déclaration', !!part(L2, L2[1]));

  /* Une seule echeance ce jour-la : rien a fusionner. */
  ok('une échéance seule n\'a pas de partenaire', !part([L[0]], L[0]));
  /* Des dates differentes ne se rejoignent jamais. */
  /* On passe l'ELEMENT de la liste, pas une copie : `_echPartenaire` s'ecarte
     lui-meme par identite (`x !== o`), et une copie se prendrait pour sa propre
     partenaire. */
  var LD = [e('a', '2099-10-17', 'athlete', 1), e('b', '2099-10-18', 'athlete', 2)];
  ok('deux dates différentes non plus', !part(LD, LD[0]));
  /* A TROIS, on ne saurait pas laquelle absorber : on ne propose rien plutot
     que de choisir a la place du praticien. */
  var L3 = [e('a', '2099-10-17', 'athlete', 1), e('b', '2099-10-17', 'athlete', 2),
            e('c', '2099-10-17', 'athlete', 3)];
  ok('à trois, rien n\'est proposé', !part(L3, L3[0]));
  /* Une paire deja fusionnee ne se repropose pas, ni ne sert de partenaire. */
  var dejaFus = e('hyrox', '2099-10-17', 'athlete', 5, { avec:'hyrox V', avecId:4, affiche:'moi' });
  ok('une échéance fusionnée ne se repropose pas', !part([dejaFus, L[1]], dejaFus));
  ok('… et ne sert pas de partenaire', !part([dejaFus, L[1]], L[1]));
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
  ok('… en nommant les deux libellés', /moi\.text/.test(f) && /autre\.text/.test(f));
  /* Et elle dit que RIEN n'est perdu — c'est ce qui distingue cette version de
     la premiere, qui ecrasait le libelle de l'athlete. */
  ok('… et en disant que les deux sont conservés', /libellés sont conservés/.test(f));
  /* Fusionner sans partenaire relierait l'echeance a rien. */
  ok('elle refuse de fusionner sans partenaire', /if\(!moi \|\| !autre\)/.test(f));
  /* Elle pose le lien ET la prise en compte, en une seule ecriture. Le
     partenaire est designe par son IDENTIFIANT quand il en a un : un libelle ne
     designe rien de sur. */
  ok('elle pose le lien', /fusion:\{ avec:autre\.text/.test(f));
  ok('… par identifiant quand il en a un', /avecId:\(autre\.echId != null \? autre\.echId : null\)/.test(f));
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
  ok('… en gardant les deux libellés', r[0] && r[0].libAutre === 'hyrox' && r[0].libMoi === 'hyrox V');

  var r2 = appliquer([prat('hyrox', '2026-10-17'), athlF('hyrox V', '2026-10-17', 'hyrox', 'athlete')]);
  ok('choisir le libellé de l\'athlète le fait afficher', r2[0] && r2[0].text === 'hyrox V', r2[0] && r2[0].text);
  /* Une valeur inconnue ne doit pas laisser la puce sans libelle : on retombe
     sur le nom officiel. */
  /* Une valeur inconnue vaut « mon libelle » : c'est celui de la ligne qu'on
     lit, jamais un champ vide. */
  var r3 = appliquer([prat('hyrox', '2026-10-17'), athlF('hyrox V', '2026-10-17', 'hyrox', 'nimporte')]);
  ok('un choix inconnu retombe sur le libellé propre', r3[0] && r3[0].text === 'hyrox V');

  /* Ce qui n'est PAS fusionne passe intact — y compris un objectif du praticien
     d'un autre jour, qu'une comparaison sur le seul texte aurait avale. */
  var r4 = appliquer([prat('hyrox', '2026-10-17'), prat('hyrox', '2026-11-02'),
                      athlF('hyrox V', '2026-10-17', 'hyrox', 'praticien')]);
  ok('le même libellé un autre jour reste visible', r4.length === 2, r4.length + ' puce(s)');
  var r5 = appliquer([prat('trail', '2026-10-17'), { text:'autre', date:'2026-10-17', jours:10, source:'athlete', echId:'a2' }]);
  ok('sans fusion, les deux restent séparées', r5.length === 2, r5.length + ' puce(s)');

  /* La proposition est verifiee plus haut, sur `_echPartenaire`. */
}

console.log('\nDéfusionner et choisir');
{
  var E0 = js.indexOf('function _echEcrireFusion');
  var E1 = js.indexOf('\nfunction _echToutBasculer', E0);
  var z = js.slice(E0, E1);
  /* Trois gestes, une seule ecriture qui les porte tous. */
  ok('fusionner pose le lien et la prise en compte', /fusion:\{ avec:autre\.text,/.test(js));
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
  ok('… et le sien propre', /escH\(o\.text\)/.test(pan));
  /* Qui a saisi quoi se lit en clair — sans ca, « choisir » ne veut rien dire.
     Les deux moities pouvant venir de l'athlete, la mention se deduit de la
     SOURCE relevee au rendu, elle ne se suppose pas. */
  ok('… en disant qui a saisi quoi', /qui\(vue\.srcAutre\)/.test(pan) && /qui\(o\.source\)/.test(pan));
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

console.log('\nLe rendu ENTIER, de bout en bout');
{
  /* Les cas precedents appelaient `_echAppliquerFusions` DIRECTEMENT, avec des
     entrees portant deja `fusion`. Ils etaient verts pendant que le produit ne
     fusionnait rien : `_renderEcheances` reconstruit chaque entree champ par
     champ, et `fusion` n'y etait pas recopie. La fusion etait ecrite en base,
     relue correctement, puis jetee a la frontiere du rendu.

     On execute donc le rendu COMPLET, depuis `_patientObjectifs` jusqu'au HTML
     produit. Une fonction juste dont personne ne transmet le resultat est
     exactement ce que les cas isoles ne peuvent pas voir. */
  var Y0 = js.indexOf('function _echJours');
  var Y1 = js.indexOf('\nfunction _echDateLisible', Y0);
  if (Y0 < 0 || Y1 < Y0) { console.log('  ✗ bornes du rendu introuvables'); ko++; }

  function rendre(objectifs){
    var boite = { style:{}, innerHTML:'' };
    new Function('_patientObjectifs', '_echTout', '_ECH_MAX', 'escH',
                 '_echDateLisible', 'document', '_dernierRenduEch',
      js.slice(Y0, Y1) + '\n_renderEcheances();')(
      objectifs, false, 3,
      function(x){ return String(x); },
      function(d){ return d; },
      { getElementById: function(id){ return id === 'calEcheances' ? boite : null; } },
      []
    );
    return boite.innerHTML;
  }

  /* Une date lointaine pour que le J-N reste positif quel que soit le jour. */
  var D = '2099-10-17';
  var paire = [
    { text:'hyrox',   date:D, source:'praticien' },
    { text:'hyrox V', date:D, source:'athlete', echId:'a1', repris:true,
      fusion:{ avec:'hyrox', affiche:'praticien' } }
  ];
  var h = rendre(paire);
  ok('une paire fusionnée ne rend qu\'UNE puce',
     (h.match(/class="cal-ech"/g) || []).length === 1,
     (h.match(/class="cal-ech"/g) || []).length + ' puce(s)');
  ok('… au libellé choisi', h.indexOf('hyrox<') >= 0 && h.indexOf('hyrox V') < 0);
  /* Et le bouton doit ouvrir le panneau, pas reproposer la fusion. */
  ok('… avec le bouton qui ouvre le panneau', /_echPanneauFusion/.test(h));
  ok('… et non celui qui la propose', !/_echFusionner/.test(h));

  /* Choisir le libelle de l'athlete doit changer ce qui s'affiche. */
  var h2 = rendre([paire[0],
    { text:'hyrox V', date:D, source:'athlete', echId:'a1', repris:true,
      fusion:{ avec:'hyrox', affiche:'athlete' } }]);
  ok('choisir le libellé de l\'athlète change l\'affichage', h2.indexOf('hyrox V') >= 0);

  /* Sans fusion : deux puces, et la proposition sur celle de l'athlete. */
  var h3 = rendre([
    { text:'hyrox',   date:D, source:'praticien' },
    { text:'hyrox V', date:D, source:'athlete', echId:'a1', repris:true }
  ]);
  ok('sans fusion, les deux puces se voient',
     (h3.match(/class="cal-ech"/g) || []).length === 2,
     (h3.match(/class="cal-ech"/g) || []).length + ' puce(s)');
  ok('… avec le bouton qui propose la fusion', /_echFusionner/.test(h3));
  ok('… et pas celui du panneau', !/_echPanneauFusion/.test(h3));

  /* Deux objectifs du praticien restent deux puces, sans rien proposer. */
  /* Le partenaire designe par IDENTIFIANT — la forme qu'ecrit le code actuel.
     Le repli par libelle masquait ce chemin : ici les textes ne se ressemblent
     pas, seul l'identifiant relie les deux. */
  var hId = rendre([
    { text:'hyrox V', date:D, source:'athlete', echId:4, repris:true },
    { text:'hyrox',   date:D, source:'athlete', echId:5, repris:true,
      fusion:{ avec:'hyrox V', avecId:4, affiche:'moi' } }
  ]);
  ok('le partenaire désigné par identifiant est absorbé',
     (hId.match(/class="cal-ech"/g) || []).length === 1,
     (hId.match(/class="cal-ech"/g) || []).length + ' puce(s)');
  ok('… et le libellé choisi est celui qu\'on garde', hId.indexOf('hyrox<') >= 0);

  /* Deux fusions qui se DESIGNENT L'UNE L'AUTRE : sans le garde, chacune
     absorberait l'autre et la bande se viderait. */
  var hCroise = rendre([
    { text:'A', date:D, source:'athlete', echId:1, repris:true, fusion:{ avec:'B', avecId:2, affiche:'moi' } },
    { text:'B', date:D, source:'athlete', echId:2, repris:true, fusion:{ avec:'A', avecId:1, affiche:'moi' } }
  ]);
  ok('deux fusions croisées ne vident pas la bande',
     (hCroise.match(/class="cal-ech"/g) || []).length === 2,
     (hCroise.match(/class="cal-ech"/g) || []).length + ' puce(s)');

  /* Deux objectifs du praticien le meme jour : ils restent DEUX puces, et la
     fusion leur est proposee comme aux autres — la source n'entre pas dans la
     regle, c'est au praticien de dire si c'est un doublon. */
  var h4 = rendre([
    { text:'trail', date:D, source:'praticien' },
    { text:'test VMA', date:D, source:'praticien' }
  ]);
  ok('deux objectifs du praticien restent deux puces',
     (h4.match(/class="cal-ech"/g) || []).length === 2);
  /* Sans identifiant, il n'y a rien a reecrire : le bouton ne s'affiche que sur
     une ligne qui peut porter la fusion. */
  ok('… mais sans identifiant, rien à proposer', !/cal-ech-fus/.test(h4));
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


/* ── Periodes declarees par l'athlete ──────────────────────────────────────
   Une PERIODE (vacances, deplacement, examens) partage la table et la bande
   avec les echeances — c'est la meme chose du point de vue de la
   planification : quelque chose de date que l'athlete declare. Mais elle ne se
   lit pas pareil, et elle ne VIT pas pareil.

   Le piege central : une periode COMMENCEE n'est pas passee. Le filtre de la
   bande garde ce dont le jour n'est pas depasse ; applique tel quel au DEBUT
   d'une periode, il faisait disparaitre les vacances le deuxieme jour des
   vacances — pile quand elles informent le plus. */

console.log('\nUne période se juge sur sa fin, pas sur son début');

var enCours = rendre([{ text: 'Vacances', date: jour(-3), dateFin: jour(4), echId: 7 }]);
ok('une période commencée reste dans la bande',
   /Vacances/.test(enCours.innerHTML), enCours.innerHTML.slice(0, 120));
ok('… et ne s\'annonce plus en J-N',
   !/J-/.test(enCours.innerHTML), enCours.innerHTML);
ok('… elle dit le temps qu\'il reste', /encore 4 j/.test(enCours.innerHTML));

var dernier = rendre([{ text: 'Vacances', date: jour(-6), dateFin: jour(0), echId: 7 }]);
ok('le dernier jour se nomme', /dernier jour/.test(dernier.innerHTML));

var finie = rendre([{ text: 'Vacances', date: jour(-20), dateFin: jour(-1), echId: 7 }]);
ok('une période terminée quitte la bande', !/Vacances/.test(finie.innerHTML));

var aVenir = rendre([{ text: 'Vacances', date: jour(10), dateFin: jour(24), echId: 7 }]);
ok('une période à venir garde son J-N', /J-10/.test(aVenir.innerHTML));
ok('… et annonce sa durée, bornes incluses', /15 j/.test(aVenir.innerHTML),
   aVenir.innerHTML);

console.log('\nUne période ne se déguise pas en échéance');
ok('elle porte son propre pictogramme', /⏸/.test(aVenir.innerHTML));
ok('… pas celui des échéances', !/🎯/.test(aVenir.innerHTML));
var mixte = rendre([{ text: 'Vacances', date: jour(10), dateFin: jour(24), echId: 7 },
                    { text: 'UTMB', date: jour(40), echId: 8 }]);
ok('les deux cohabitent, chacune avec sa marque',
   /⏸/.test(mixte.innerHTML) && /🎯/.test(mixte.innerHTML));
ok('la période affiche ses deux bornes', /→/.test(aVenir.innerHTML));

console.log('\nLa fusion ne s\'applique pas aux périodes');
/* La fusion existe pour supprimer un DOUBLON — la meme echeance saisie deux
   fois. Une periode et une echeance du meme jour ne disent pas la meme chose ;
   deux periodes non plus, puisqu'elles n'ont pas la meme fin, et fondre « du
   1er au 8 » avec « du 1er au 20 » perdrait la seconde borne sans rien dire. */
var memeJour = rendre([{ text: 'Vacances', date: jour(10), dateFin: jour(24), echId: 7 },
                       { text: 'UTMB',     date: jour(10), echId: 8 }]);
ok('les deux restent affichées',
   /Vacances/.test(memeJour.innerHTML) && /UTMB/.test(memeJour.innerHTML));
var nbFus = (memeJour.innerHTML.match(/_echFusionner/g) || []).length;
ok('aucun bouton de fusion n\'est proposé', nbFus === 0, nbFus + ' proposé(s)');

var deuxPer = rendre([{ text: 'Vacances', date: jour(10), dateFin: jour(24), echId: 7 },
                      { text: 'Stage',    date: jour(10), dateFin: jour(12), echId: 8 }]);
ok('deux périodes le même jour ne se fondent pas non plus',
   (deuxPer.innerHTML.match(/_echFusionner/g) || []).length === 0);

/* Deux ECHEANCES du meme jour, elles, doivent toujours pouvoir se fondre :
   sans ce cas, desactiver la fusion partout passerait pour un succes. */
var deuxEch = rendre([{ text: 'UTMB', date: jour(10), echId: 7 },
                      { text: 'Ultra', date: jour(10), echId: 8 }]);
ok('… mais deux échéances, si',
   (deuxEch.innerHTML.match(/_echFusionner/g) || []).length > 0);

console.log('\nLe calendrier marque chaque jour couvert');
{
  /* `_dayObjectifLabelHtml` vit AVANT la tranche executee ci-dessus : on la
     prend pour elle-meme, avec les outils de periode dont elle depend. */
  var dL = js.indexOf('function _dayObjectifLabelHtml');
  var dO = js.indexOf('function _echEstPeriode');
  var fO = js.indexOf('\n}', js.indexOf('function _echCouvre'));
  if (dL < 0 || dO < 0 || fO < 0) { console.error('Bornes du repère de jour introuvables'); process.exit(1); }
  var jourLbl = new Function('_patientObjectifs', 'escH',
    js.slice(dO, fO + 2) + '\n' + js.slice(dL, js.indexOf('\n}', dL) + 2) +
    '\nreturn _dayObjectifLabelHtml;')(
      [{ text: 'Vacances', date: '2026-07-10', dateFin: '2026-07-20' },
       { text: 'UTMB', date: '2026-08-28' }],
      function (x) { return String(x); });

  ok('le premier jour est marqué', /Vacances/.test(jourLbl('2026-07-10', 'c')));
  ok('un jour du milieu aussi', /Vacances/.test(jourLbl('2026-07-15', 'c')));
  ok('le dernier jour aussi', /Vacances/.test(jourLbl('2026-07-20', 'c')));
  ok('la veille ne l\'est pas', jourLbl('2026-07-09', 'c') === '');
  ok('le lendemain non plus', jourLbl('2026-07-21', 'c') === '');
  ok('une période porte son pictogramme', /⏸/.test(jourLbl('2026-07-15', 'c')));
  ok('une échéance garde le sien', /🎯/.test(jourLbl('2026-08-28', 'c')));
  ok('… et n\'emprunte pas celui des périodes', !/⏸/.test(jourLbl('2026-08-28', 'c')));
}

console.log('\nL\'écran athlète rend vraiment ses périodes');
{
  /* Les cas ci-dessus lisent la SOURCE d'athlete.html. Ils ne prouvent donc
     rien de ce qui s'affiche : une chaine mal fermee ou une variable oubliee
     passerait tout entiere. On execute ici le vrai `_echRendre`. */
  var ath = fs.readFileSync(path.join(R, 'athlete.html'), 'utf8');
  var a0 = ath.indexOf('var _echListe = null;');
  var a1 = ath.indexOf('/* ── Vue MOIS ── */');
  if (a0 < 0 || a1 < a0) { console.log('  ✗ bloc « Mes objectifs » introuvable'); ko++; }

  function rendreAth(liste, opts) {
    opts = opts || {};
    var boite = { innerHTML: '' };
    var f = new Function('document', 'escH', 'fetch', 'alert', 'confirm',
      'SUPA_URL', 'SUPA_KEY', '_patientId', 'poser',
      ath.slice(a0, a1) +
      '\n_echListe = poser.liste; _echPeriodesOk = poser.per; _echModePeriode = poser.mode;' +
      '\n_echRendre(); return null;');
    f({ getElementById: function () { return boite; } },
      function (x) { return String(x); },
      function () { return { then: function () { return this; }, catch: function () { return this; } }; },
      function () {}, function () { return true; },
      'http://x', 'k', 'p1',
      { liste: liste, per: !!opts.per, mode: !!opts.mode });
    return boite.innerHTML;
  }

  var h1 = rendreAth([{ id: 1, texte: 'Vacances', date: jour(-2), date_fin: jour(5) }], { per: true });
  ok('la période commencée s\'affiche', /Vacances/.test(h1));
  ok('… avec ses deux bornes', /du .* au /.test(h1), h1.slice(0, 200));
  ok('… et le temps restant', /encore 5 j/.test(h1));
  /* On vise la PASTILLE de la ligne, pas le caractere n'importe ou : le bouton
     de bascule porte lui aussi « ⏸ Une période », et une recherche large
     passait au vert alors que la ligne avait repris le 🎯 des echeances. */
  ok('… sous son propre pictogramme', h1.indexOf('<div class="ech-ico">⏸</div>') > 0);
  ok('… et pas celui des échéances', h1.indexOf('<div class="ech-ico">🎯</div>') < 0);

  var h2 = rendreAth([{ id: 1, texte: 'UTMB', date: jour(30) }], { per: true });
  ok('une échéance garde son J-N', /J-30/.test(h2));
  ok('… et sa cible', h2.indexOf('<div class="ech-ico">🎯</div>') > 0);

  var h3 = rendreAth([], { per: true, mode: true });
  ok('le mode période propose deux dates', /id="echDate"/.test(h3) && /id="echFin"/.test(h3));
  ok('… et la bascule marque le mode actif',
     /⏸ Une période<\/button>/.test(h3) && /aria-pressed="true"[^>]*onclick="_echBasculerMode\(true\)/.test(h3));

  var h4 = rendreAth([], { per: false });
  ok('sans la colonne en base, aucune bascule', !/_echBasculerMode/.test(h4));
  ok('… et un seul champ de date', /id="echDate"/.test(h4) && !/id="echFin"/.test(h4));
  /* La bascule est le SEUL chemin vers le mode periode, donc `_echModePeriode`
     ne peut pas etre vrai sans la sonde — aujourd'hui. Ce cas verrouille cette
     dependance plutot que de s'y fier : un mode periode ouvert sans la colonne
     ferait saisir une date de fin que la base refuserait. */
  var h4b = rendreAth([], { per: false, mode: true });
  ok('… même si le mode période était forcé', !/id="echFin"/.test(h4b));

  var h5 = rendreAth([{ id: 1, texte: 'Vacances', date: jour(-20), date_fin: jour(-8) }], { per: true });
  ok('une période finie descend dans « Passées »',
     h5.indexOf('Passées') > 0 && h5.indexOf('Passées') < h5.indexOf('Vacances'));

  /* Une periode reprise n'est plus supprimable — c'est la base qui refuse,
     et l'ecran ne doit pas proposer un geste voue a l'echec. */
  var h6 = rendreAth([{ id: 1, texte: 'Vacances', date: jour(3), date_fin: jour(9),
                        repris_at: '2026-09-01T10:00:00Z' }], { per: true });
  ok('une période reprise ne propose plus de suppression', !/_echSupprimer/.test(h6));
  ok('… et le dit', /pris en compte/.test(h6));
}

console.log('\nLa migration se lit avant de s\'appliquer');
{
  var sqlP = fs.readFileSync(path.join(R, 'supabase', 'migrations',
                             '20260906_athlete_objectifs_periode.sql'), 'utf8');
  ok('la colonne est ajoutée sans casser l\'existant',
     /ADD COLUMN IF NOT EXISTS date_fin date/.test(sqlP));
  ok('une fin ne peut pas précéder le début',
     /date_fin IS NULL OR date_fin >= date/.test(sqlP));
  ok('la durée est bornée', /date_fin - date\) <= 366/.test(sqlP));
  ok('elle est annoncée NON APPLIQUÉE', /NON APPLIQU/.test(sqlP));
}

console.log('\nLe code survit à la migration non appliquée');
{
  /* Tant que `date_fin` n'existe pas, la requete ne doit pas la NOMMER : elle
     echouerait, et la section entiere disparaitrait au lieu de perdre un
     champ. C'est deja la regle pour `fusion` — on verifie qu'elle tient. */
  var ath = fs.readFileSync(path.join(R, 'athlete.html'), 'utf8');
  ok('le praticien lit avec select=*',
     /athlete_objectifs\?patient_id=eq\.' \+ pid[\s\S]{0,80}select=\*/.test(js));
  ok('l\'athlète aussi', /athlete_objectifs\?patient_id=eq\.' \+ _patientId[\s\S]{0,80}select=\*/.test(ath));
  ok('aucune requête ne nomme date_fin dans un select de liste',
     !/select=[^'"&]*date_fin[^'"&]*,/.test(ath + js));
  ok('la disponibilité est SONDÉE, pas déduite des lignes',
     /select=date_fin&limit=1/.test(ath));
  ok('le formulaire de période dépend de la sonde',
     /_echPeriodesOk && _echModePeriode/.test(ath));
}

_fusionPromesse.then(function () {
  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('Bande d\'echeances : tous les cas passent.');
});

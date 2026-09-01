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
  /* `_chargerEcheancesAthlete` fusionne dans un `.then` : lire la liste tout
     de suite la trouve inchangee, et l'assertion « pas de doublon » passe pour
     la mauvaise raison — rien n'a encore ete ajoute. On attend donc que les
     micro-taches soient vidangees. */
  function fusionner(bilan, athlete) {
    var liste = bilan.slice();
    /* eslint-disable no-new-func */
    new Function('SUPA_URL_P', '_sbHeaders', '_fetchRetry', '_progPatient',
      '_patientObjectifs', '_renderEcheances', '_renderCalendarUI',
      codeFus + '\n_chargerEcheancesAthlete(1);')(
      '', function () { return {}; },
      function () { return Promise.resolve({ ok: true, json: function () { return athlete; } }); },
      { id: 1 }, liste, function () {}, function () {}
    );
    return Promise.resolve().then(function(){ return liste; });
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

console.log('\nDeux sources, un même jour : une seule puce');
{
  /* Le garde-fou `texte|date` ne rapproche que les libelles IDENTIQUES. Or le
     praticien note « UTMB » au bilan et l'athlete declare « UTMB 2026 » : deux
     puces pour une seule course, et la bande se remplit. On les fond. */
  var G0 = js.indexOf('function _echFondreParDate');
  var G1 = js.indexOf('\nfunction _renderEcheances', G0);
  if (G0 < 0 || G1 < G0) { console.log('  ✗ bornes de _echFondreParDate introuvables'); ko++; }
  var fondre = new Function(js.slice(G0, G1) + '\nreturn _echFondreParDate;')();

  var prat = function (t, d, j) { return { text:t, date:d, jours:j, kind:'sport', source:'praticien' }; };
  var athl = function (t, d, j, vu, id) {
    return { text:t, date:d, jours:j, kind:'sport', source:'athlete', echId:id||'a1', aVoir:!vu };
  };

  var r = fondre([prat('UTMB', '2026-08-29', 120), athl('UTMB 2026', '2026-08-29', 120, true)]);
  ok('deux sources le même jour ne font qu\'une puce', r.length === 1, r.length + ' puce(s)');
  /* Le libelle retenu est celui du PRATICIEN : c'est le nom officiel, celui qui
     part au courrier. */
  ok('… au libellé du praticien', r[0] && r[0].text === 'UTMB', r[0] && r[0].text);
  /* L'autre n'est pas perdu : il reste lisible en infobulle. */
  ok('… l\'autre libellé reste consultable',
     !!(r[0] && r[0].autres && r[0].autres.indexOf('UTMB 2026') >= 0));
  ok('… et la puce se signale comme fondue', !!(r[0] && r[0].fondue));

  /* Ce qui RESTE A FAIRE survit a la fusion : une echeance non reprise garde sa
     marque et son identifiant, sinon fondre ferait disparaitre une action. */
  var r2 = fondre([prat('UTMB', '2026-08-29', 120), athl('UTMB 2026', '2026-08-29', 120, false, 'a42')]);
  ok('une échéance non reprise reste à prendre en compte', !!(r2[0] && r2[0].aVoir));
  ok('… et garde SON identifiant', r2[0] && r2[0].echId === 'a42', r2[0] && r2[0].echId);

  /* Deux objectifs poses par le PRATICIEN le meme jour sont deux objectifs :
     les fondre lui cacherait ce qu'il a ecrit lui-meme. */
  var r3 = fondre([prat('Trail 20 km', '2026-05-10', 30), prat('Test VMA', '2026-05-10', 30)]);
  ok('deux objectifs du praticien restent distincts', r3.length === 2, r3.length + ' puce(s)');
  var r4 = fondre([athl('Course A', '2026-05-10', 30, true, 'x1'), athl('Course B', '2026-05-10', 30, true, 'x2')]);
  ok('… comme deux déclarations de l\'athlète', r4.length === 2, r4.length + ' puce(s)');

  /* Des dates differentes ne se fondent jamais, meme entre sources. */
  var r5 = fondre([prat('UTMB', '2026-08-29', 120), athl('UTMB', '2026-08-30', 121, true)]);
  ok('deux dates différentes restent deux puces', r5.length === 2, r5.length + ' puce(s)');

  /* Au-dela de deux, seule la PREMIERE de chaque source entre dans la fusion :
     le surnumeraire reste visible plutot que d'etre avale en silence. */
  var r6 = fondre([prat('UTMB', '2026-08-29', 120), athl('UTMB 2026', '2026-08-29', 120, true, 'a1'),
                   athl('Autre course', '2026-08-29', 120, true, 'a2')]);
  ok('un troisième reste visible', r6.length === 2, r6.length + ' puce(s)');

  /* La bande se lit par distance : l'ordre doit survivre a la fusion. */
  var r7 = fondre([prat('Loin', '2027-01-01', 400), prat('Proche', '2026-09-05', 4),
                   athl('Loin 2027', '2027-01-01', 400, true)]);
  ok('l\'ordre par distance est conservé',
     r7.length === 2 && r7[0].text === 'Proche', r7.map(function(x){ return x.text; }).join(' / '));

  /* Le rendu doit poser la marque et l'infobulle double. */
  ok('la puce fondue porte sa marque dans le rendu', /cal-ech-fus/.test(js));
  ok('… stylée dans la feuille', /\.cal-ech-fus\s*\{/.test(html));
  ok('l\'infobulle porte les deux libellés', /o\.autres && o\.autres\.length \? ' · ' \+ o\.autres\.join/.test(js));
  /* Les objectifs du bilan doivent porter leur source, sinon rien ne se fond. */
  ok('les objectifs du bilan portent leur source', /source:'praticien'/.test(js));
  /* Et le RENDU doit appeler la fusion : une fonction juste que personne
     n'appelle laisse la bande se remplir comme avant, et tous les cas
     ci-dessus resteraient verts. */
  var R0 = js.indexOf('function _renderEcheances');
  var R1 = js.indexOf('\nfunction _echDateLisible', R0);
  ok('le rendu appelle bien la fusion',
     R0 >= 0 && R1 > R0 && /liste = _echFondreParDate\(liste\);/.test(js.slice(R0, R1)));
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

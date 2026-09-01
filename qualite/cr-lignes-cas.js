#!/usr/bin/env node
/* Cas de référence — lignes de résultat du CR (`_crMesTab`).
 *
 * Un test à deux côtés s'écrit en mini-tableau : une colonne par côté,
 * l'asymétrie en dernier. Trois règles y vivent, et chacune a coûté un défaut.
 *
 *   1. L'ORDRE DES COLONNES. « Droit » ne passe jamais avant « Gauche ».
 *      Les appels ne s'accordaient pas entre eux : la plupart passent
 *      (côté sain, côté atteint), la Contraction Flash passe l'inverse, et
 *      le libellé de chacun dépend du côté atteint du patient. Résultat, un
 *      même CR affichait « DROIT | GAUCHE » sur une ligne et
 *      « GAUCHE | DROIT » sur la suivante.
 *
 *      La normalisation se fait DANS `_crMesTab`, pas dans les appels : c'est
 *      le seul endroit par où tout passe, et un nouvel appel écrit demain
 *      hérite de la règle sans que personne y pense.
 *
 *      Le piège mortel : échanger les en-têtes SANS échanger les valeurs
 *      inverserait les deux côtés du patient en silence. Les cas ci-dessous
 *      vérifient que les deux bougent ensemble.
 *
 *   2. La colonne « Mesure » ne sort qu'à partir de deux lignes.
 *   3. Cette colonne se désigne par `.lbl`, jamais `:first-child`.
 *
 *   node qualite/cr-lignes-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bilan.js'), 'utf8');
var deb = src.indexOf('function _crMesTab');
var fin = src.indexOf('function buildCR(', deb);
if (deb < 0 || fin < 0 || fin <= deb) {
  console.error('Bornes de _crMesTab introuvables dans js/bilan.js.');
  console.error('Le test extrait la zone entre `function _crMesTab` et');
  console.error('`function buildCR(`. Corriger si elles ont bougé.');
  process.exit(1);
}
var crMesTab = new Function(src.slice(deb, fin) + '\nreturn _crMesTab;')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

/* Rend le tableau lisible : « Gauche|Droit » pour les en-têtes,
   « 80 N|100 N » pour les valeurs. */
function entetes(html) {
  var th = html.match(/<th[^>]*>([^<]*)<\/th>/g) || [];
  return th.map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('|');
}
function valeurs(html) {
  var td = html.match(/<td[^>]*>([^<]*)<\/td>/g) || [];
  return td.map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('|');
}

/* ── 1. L'ordre des colonnes ─────────────────────────────────────────────── */

console.log('\nOrdre des colonnes — « Droit » ne passe jamais avant « Gauche »');

var droitDabord = crMesTab([{ l:'Force', a:'100 N', b:'80 N', asym:'20%' }], 'Droit', 'Gauche');
verifie('en-têtes remis dans l\'ordre', 'Gauche|Droit|Asym.', entetes(droitDabord));
verifie('les valeurs suivent les en-têtes', '80 N|100 N|20%', valeurs(droitDabord));

var gaucheDabord = crMesTab([{ l:'Force', a:'80 N', b:'100 N', asym:'20%' }], 'Gauche', 'Droit');
verifie('déjà dans l\'ordre → rien ne bouge', 'Gauche|Droit|Asym.', entetes(gaucheDabord));
verifie('et les valeurs non plus', '80 N|100 N|20%', valeurs(gaucheDabord));

/* Le meme patient, les mêmes chiffres, deux appels qui ne s'accordent pas sur
   l'ordre des arguments : les deux lignes doivent sortir identiques. */
console.log('\nDeux appels de conventions opposées donnent la même ligne');
var viaSainAtteint = crMesTab([{ l:'Force', a:'100 N', b:'80 N' }], 'Droit', 'Gauche');
var viaAtteintSain = crMesTab([{ l:'Force', a:'80 N',  b:'100 N' }], 'Gauche', 'Droit');
verifie('en-têtes identiques', entetes(viaAtteintSain), entetes(viaSainAtteint));
verifie('valeurs identiques', valeurs(viaAtteintSain), valeurs(viaSainAtteint));

console.log('\nLes libellés en toutes lettres suivent la même règle');
var cotes = crMesTab([{ l:'Distance', a:'9 cm', b:'11 cm' }], 'Côté droit', 'Côté gauche');
verifie('« Côté droit » avant « Côté gauche » est retourné', 'Côté gauche|Côté droit', entetes(cotes));
verifie('les valeurs suivent', '11 cm|9 cm', valeurs(cotes));

console.log('\nSain avant atteint — l\'autre couple autorisé');
var sa = crMesTab([{ l:'Force', a:'100 N', b:'80 N', asym:'20%' }], 'Côté sain', 'Côté atteint');
verifie('déjà dans l\'ordre → rien ne bouge', 'Côté sain|Côté atteint|Asym.', entetes(sa));
verifie('les valeurs non plus', '100 N|80 N|20%', valeurs(sa));

var as = crMesTab([{ l:'Force', a:'80 N', b:'100 N', asym:'20%' }], 'Atteint', 'Sain');
verifie('« Atteint » avant « Sain » est retourné', 'Sain|Atteint|Asym.', entetes(as));
verifie('les valeurs suivent', '100 N|80 N|20%', valeurs(as));

console.log('\nOn ne mélange pas les deux couples');
var mixte = crMesTab([{ l:'Force', a:'100 N', b:'80 N' }], 'Droit', 'Atteint');
verifie('« Droit » face à « Atteint » : aucune règle ne s\'applique',
        'Droit|Atteint', entetes(mixte));

console.log('\nUn échange n\'emporte que les côtés, jamais l\'asymétrie');
var multi = crMesTab([{ l:'2 appuis', a:'11.5 cm', b:'11 cm', asym:'4.3%' },
                      { l:'1 appui',  a:'9.5 cm',  b:'9 cm',  asym:'5.3%' }], 'Droit', 'Gauche');
verifie('toutes les lignes sont échangées, pas seulement la première',
        'Mesure|Gauche|Droit|Asym.', entetes(multi));
verifie('l\'asymétrie reste en queue de chaque ligne',
        '2 appuis|11 cm|11.5 cm|4.3%|1 appui|9 cm|9.5 cm|5.3%', valeurs(multi));

/* ── 2. La colonne « Mesure » ────────────────────────────────────────────── */

console.log('\nColonne « Mesure » — seulement quand il y a plusieurs lignes');
verifie('une seule mesure → pas de colonne d\'intitulé',
        'Gauche|Droit', entetes(crMesTab([{ l:'Force', a:'80 N', b:'100 N' }], 'Gauche', 'Droit')));
verifie('et pas de cellule d\'intitulé non plus',
        '80 N|100 N', valeurs(crMesTab([{ l:'Force', a:'80 N', b:'100 N' }], 'Gauche', 'Droit')));
verifie('deux mesures → la colonne apparaît', 'Mesure|Gauche|Droit',
        entetes(crMesTab([{ l:'2 appuis', a:'11 cm', b:'11 cm' },
                          { l:'1 appui', a:'9 cm', b:'9 cm' }], 'Gauche', 'Droit')));

/* La course interne mollet a trois mesures, mais une seule peut etre saisie.
   La regle « moins de deux lignes → pas d'intitule » la laisserait alors avec
   un chiffre nu, sans dire si c'est le 2 appuis ou l'effondrement. */
console.log('\nUn test à mesures multiples garde sa colonne même réduit à une ligne');
verifie('opts.lbl force la colonne', 'Mesure|Gauche|Droit',
        entetes(crMesTab([{ l:'2 appuis', a:'11 cm', b:'11 cm' }], 'Gauche', 'Droit', { lbl:true })));
verifie('et la cellule qui va avec', '2 appuis|11 cm|11 cm',
        valeurs(crMesTab([{ l:'2 appuis', a:'11 cm', b:'11 cm' }], 'Gauche', 'Droit', { lbl:true })));

console.log('\nLa colonne d\'intitulés se désigne par .lbl, jamais :first-child');
var avecLbl = crMesTab([{ l:'2 appuis', a:'11 cm', b:'11 cm' },
                        { l:'1 appui', a:'9 cm', b:'9 cm' }], 'Gauche', 'Droit');
verifie('l\'en-tête porte la classe', true, /<th class="lbl">Mesure<\/th>/.test(avecLbl));
verifie('les cellules aussi', 2, (avecLbl.match(/<td class="lbl">/g) || []).length);
verifie('aucune classe .lbl quand la colonne n\'existe pas', false,
        /class="lbl"/.test(crMesTab([{ l:'Force', a:'80 N', b:'100 N' }], 'Gauche', 'Droit')));

/* ── 3. Cas limites ──────────────────────────────────────────────────────── */

console.log('\nCas limites');
verifie('aucune mesure renseignée → rien du tout', '', crMesTab([{ l:'Force', a:'', b:'' }], 'Gauche', 'Droit'));
verifie('liste vide → rien du tout', '', crMesTab([], 'Gauche', 'Droit'));
verifie('un seul côté mesuré → l\'autre montre un tiret',
        '80 N|—', valeurs(crMesTab([{ l:'Force', a:'80 N', b:'' }], 'Gauche', 'Droit')));
verifie('aucune asymétrie sur aucune ligne → pas de colonne Asym.',
        'Gauche|Droit', entetes(crMesTab([{ l:'Force', a:'80 N', b:'100 N' }], 'Gauche', 'Droit')));

/* ══════════════════════════════════════════════════════════════════════════
   Garde-fou textuel : plus aucune ligne de resultat ecrite a la main.

   Avant la refonte, ces lignes etaient des chaines du type
   « CS=100 kg CA=80 kg Asym.=20% ». Une seule oubliee suffit a casser
   l'alignement de tout un bloc — et a echapper a la regle d'ordre ci-dessus,
   puisqu'elle ne passe pas par _crMesTab.
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\nAucune ligne de résultat fabriquée à la main');

var fautes = [];
src.split('\n').forEach(function (ligne, i) {
  var t = ligne.trim();
  if (!t || t.indexOf('//') === 0 || t.indexOf('*') === 0) return;
  // Les phrases d'interpretation clinique sont de la prose, pas des lignes
  // de resultat : « CA = 9 cm (deficit de 1 cm du contact) ».
  if (/\binterp\b/.test(ligne)) return;
  /* On ne traque que les paires de COTES ecrites en phrase. La mobilite de
     hanche ecrit « Flex=120 Ext=0 RI=30 » — six mesures d'un seul cote, dont
     la cle de ligne porte deja le cote : ce n'est pas une paire, la regle
     d'ordre ne la concerne pas. */
  var pairDeCotes = /'(CS|CA)\s*=\s*'|_labelC[SA]\s*\+\s*'\s*=|lbl\.[ab]\s*\+\s*'\s*=/;
  if (pairDeCotes.test(ligne)) {
    fautes.push('    js/bilan.js:' + (i + 1) + '  ' + t.slice(0, 88));
  }
});
if (fautes.length) {
  nbKo++;
  console.log('    ✗ ' + fautes.length + ' ligne(s) encore écrites en phrase :');
  fautes.forEach(function (f) { console.log(f); });
} else {
  nbOk++;
  console.log('    ✓ aucune');
}

/* Le CSS du CR existe en DEUX exemplaires : bilan.html pour l'ecran, et la
   chaine `var css` de js/bilan.js pour l'export autonome. Une regle ajoutee
   d'un seul cote ne se voit pas — et l'export est le document que recoit le
   medecin. */
console.log('\nLe CSS du tableau existe des deux côtés');
var html = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
['.cr-mt', '.cr-mt th', '.lbl', 'width: 86px'].forEach(function (regle) {
  verifie('bilan.html contient « ' + regle + ' »', true, html.indexOf(regle) > -1);
});
var css = src.slice(src.indexOf('var css = `'), src.indexOf('svg{max-width:100%'));
['.cr-mt{', '.cr-mt th{', '.lbl', 'width:86px'].forEach(function (regle) {
  verifie('l\'export contient « ' + regle + ' »', true, css.indexOf(regle) > -1);
});

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('\n  La Contraction Flash compte des RÉPÉTITIONS');
{
  /* Le formulaire le dit deux fois — « Quadriceps — Répétitions max » et
     « nombre de répétitions » — et le courrier annoncait des newtons. Le test
     compte des contractions tenues, il ne mesure aucune charge : une force
     annoncee au medecin est une mesure qui n'a jamais ete faite.

     On lit le VRAI appel dans `buildCR`, borne a sa ligne : chercher « N »
     dans tout le fichier ne prouverait rien. */
  var _b0 = src.indexOf("crItem('Contraction Flash Isométrique 20s'");
  var _b1 = src.indexOf("['cf-q-ca','cf-q-cs']", _b0);
  if (_b0 < 0 || _b1 < _b0) {
    console.error('Bornes de la ligne Contraction Flash introuvables.');
    process.exit(1);
  }
  var _cf = src.slice(_b0, _b1);
  verifie('les deux côtés sont en répétitions', 2, (_cf.match(/\+\s*' rép'/g) || []).length);
  verifie('aucun côté n\'est en newtons', 'false', /\+\s*' N'/.test(_cf));
  /* La colonne « Mesure » ne sort qu'a partir de deux lignes, donc ce libelle
     ne s'affiche pas ici — il doit rester juste malgre tout : c'est lui qu'on
     lira le jour ou une seconde mesure s'ajoutera. */
  verifie('le libellé de la mesure dit répétitions', 'true', /l:'Répétitions'/.test(_cf));

  /* Le formulaire est la SOURCE : si son intitule cessait de parler de
     repetitions, la correction du courrier n'aurait plus de fondement. */
  var _html = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
  verifie('le formulaire compte bien des répétitions', 'true',
          /Quadriceps — Répétitions max/.test(_html));
  verifie('… et le rappelle sous le tableau', 'true',
          /Contraction isométrique maximale 20s — nombre de répétitions/.test(_html));

  /* Le graphique d'Evolution doit dire la MEME unite que le courrier : deux
     unites pour une meme mesure, dans le meme produit, c'est la porte ouverte
     a celle qui reste juste par hasard. */
  var _g0 = src.indexOf("idA:'cf-q-ca'");
  verifie('le graphique d\'Évolution existe', 'true', String(_g0 > 0));
  verifie('… et compte lui aussi des répétitions', 'true',
          /idA:'cf-q-ca'[^}]*unit:'rép'/.test(src));
}

console.log('\n' + '─'.repeat(64));
if (nbKo) {
  console.log('✗ ' + nbKo + ' attente(s) en échec sur ' + (nbOk + nbKo));
  process.exit(1);
}
console.log('✓ ' + nbOk + ' attentes vérifiées');

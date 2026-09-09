#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Renseigner un bloc de tests d'un seul geste

   144 des 157 tableaux du bilan répondent en `Positif / Négatif / N/A`.
   Renseigner les quatre lignes d'un LCA/LCP normal demandait quatre menus
   déroulants, pour dire quatre fois la même chose.

   TROIS DÉCISIONS, et ce sont elles qui font la sûreté du geste :

   1. LES LIBELLÉS VIENNENT DES OPTIONS DU BLOC, jamais d'un « positif /
      négatif » écrit en dur. Treize tableaux emploient d'autres réponses —
      `Validé / Pas validé`, `Normal / Réduit`, `Ok / Acceptable /
      Insuffisant` — et sur les six tableaux FONCTIONNELS, « Positif » veut
      dire RÉUSSI : la polarité s'inverse. Un bouton codé en dur y dirait le
      contraire de ce qu'il fait.

   2. « TOUT POSITIF » N'EST PAS LE SYMÉTRIQUE DE « TOUT NÉGATIF ». Un bloc
      entièrement négatif est le cas courant ; entièrement positif, c'est rare.
      Les poser côte à côte invite à la faute de clic — et cette faute inscrit
      des signes cliniques en bloc. Seule la valeur « rien à signaler » a son
      bouton ; les autres vivent d'un cran en dessous.

   3. LE CLIC NE REMPLIT QUE LES LIGNES VIDES. Une mesure déjà saisie ne
      s'écrase jamais par accident. Le libellé le dit — « Compléter en… » — et
      le message qui suit permet d'annuler, ou de remplacer explicitement.

     node qualite/bloc-rapide-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

var fs = require('fs');
var path = require('path');
var R = path.join(__dirname, '..');
var src  = fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
var html = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

var ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
function egal(nom, attendu, obtenu) {
  ok(nom, String(attendu) === String(obtenu),
     String(attendu) === String(obtenu) ? '' : 'attendu ' + attendu + ', obtenu ' + obtenu);
}

var d = src.indexOf('var BL_RAS');
if (d < 0) { console.log('  ✗ `BL_RAS` introuvable dans js/bilan.js'); process.exit(1); }
var code = src.slice(d, src.indexOf('\n// -- INIT', d) > d
                        ? src.indexOf('\n// -- INIT', d) : src.indexOf('\nfunction init()', d));

/* Un bloc de test minimal : des `<select>` porteurs de leurs options. */
function faux(sels) {
  var selects = sels.map(function (s) {
    var el = { id: 'sel-x-' + s.i, value: s.val || '', _opts: s.opts, _events: [],
               options: s.opts.map(function (v) { return { value: v }; }),
               dispatchEvent: function (e) { this._events.push(e.type); return true; },
               /* Le vrai `closest` respecte son selecteur : le mouchard aussi,
                  sinon la regle des lignes masquees passerait inapercue. */
               _cache: s.cache,
               closest: function (q) {
                 if (q === '.bl-hidden') return this._cache ? { className: 'bl-hidden' } : null;
                 return bloc;
               } };
    return el;
  });
  var entete = { _html: '', appendChild: function (n) { this._html += n; },
                 querySelector: function () { return null; } };
  var bloc = {
    querySelectorAll: function (sel) { return sel === 'select' ? selects : []; },
    querySelector: function (sel) { return sel === '.block-header' ? entete : null; }
  };
  return { bloc: bloc, selects: selects, entete: entete };
}

var api = new Function('document',
  code + '\nreturn { RAS:BL_RAS, valeurs:_blValeursBloc, ras:_blValeurRAS, ' +
         'vides:_blCompteVides, appliquer:_blAppliquerBloc, selectsBloc:_blSelectsBloc };')(
  { querySelectorAll: function () { return []; }, getElementById: function () { return null; } });

/* ── La valeur « rien à signaler » ────────────────────────────────────────── */
console.log('\nLa valeur « rien à signaler » se déduit des options');

egal('un bloc orthopédique → Négatif', 'Négatif', api.ras(['Positif', 'Négatif', 'N/A']));
egal('une mobilité → Normal', 'Normal', api.ras(['Normal', 'Réduit', 'N/A']));
egal('un DN4 → Non', 'Non', api.ras(['Oui', 'Non']));
/* Sur un tableau FONCTIONNEL, « Positif » veut dire REUSSI : aucune des deux
   valeurs n'est « rien a signaler ». Aucun bouton principal, donc — le menu
   seul, ou l'on choisit en connaissance de cause. */
egal('un test fonctionnel n\'a pas de valeur anodine', 'null',
     String(api.ras(['Validé', 'Pas validé', 'N/A'])));
egal('… ni une appréciation à trois paliers', 'null',
     String(api.ras(['Ok', 'Acceptable', 'Insuffisant'])));

/* ── Ce que le bloc propose ───────────────────────────────────────────────── */
console.log('\nLes valeurs proposées sont CELLES DU BLOC');

var b1 = faux([{ i: 0, opts: ['', 'Positif', 'Négatif', 'N/A'] },
               { i: 1, opts: ['', 'Positif', 'Négatif', 'N/A'] }]);
egal('les options du bloc, sans la vide', 'Positif,Négatif,N/A',
     api.valeurs(b1.selects).join(','));

/* Un bloc MIXTE — mobilite et tests dans le meme encadre — propose l'union, et
   chaque valeur ne s'applique qu'aux lignes qui l'offrent. */
var b2 = faux([{ i: 0, opts: ['', 'Positif', 'Négatif'] },
               { i: 1, opts: ['', 'Normal', 'Réduit'] }]);
egal('un bloc mixte propose l\'union', 'Positif,Négatif,Normal,Réduit',
     api.valeurs(b2.selects).join(','));

/* ── Le remplissage ───────────────────────────────────────────────────────── */
console.log('\nLe clic ne remplit que les lignes vides');

var b3 = faux([{ i: 0, opts: ['', 'Positif', 'Négatif'], val: 'Positif' },
               { i: 1, opts: ['', 'Positif', 'Négatif'] },
               { i: 2, opts: ['', 'Positif', 'Négatif'] }]);
egal('trois lignes, deux vides', 2, api.vides(b3.selects));
var r3 = api.appliquer(b3.bloc, 'Négatif', false);
egal('deux lignes complétées', 2, r3.touchees);
egal('… la mesure déjà saisie est intacte', 'Positif', b3.selects[0].value);
egal('… les autres portent la valeur', 'Négatif,Négatif',
     [b3.selects[1].value, b3.selects[2].value].join(','));

/* Une ecriture programmatique n'emet AUCUN evenement : sans cette emission, le
   verdict de la ligne, le compte-rendu et le brouillon ne verraient rien. */
egal('chaque ligne touchée émet son changement', 'change,change',
     [b3.selects[1]._events[0], b3.selects[2]._events[0]].join(','));
egal('… et la ligne intacte n\'en émet aucun', 0, b3.selects[0]._events.length);

/* Le REMPLACEMENT est explicite, jamais le comportement par defaut. */
var b4 = faux([{ i: 0, opts: ['', 'Positif', 'Négatif'], val: 'Positif' },
               { i: 1, opts: ['', 'Positif', 'Négatif'] }]);
var r4 = api.appliquer(b4.bloc, 'Négatif', true);
egal('en mode remplacement, tout est réécrit', 2, r4.touchees);
egal('… y compris la ligne déjà saisie', 'Négatif', b4.selects[0].value);

/* Une valeur que la ligne n'offre PAS ne s'y pose jamais : ce serait inscrire
   une reponse impossible, que le menu ne saurait meme pas afficher. */
var b5 = faux([{ i: 0, opts: ['', 'Positif', 'Négatif'] },
               { i: 1, opts: ['', 'Normal', 'Réduit'] }]);
var r5 = api.appliquer(b5.bloc, 'Négatif', false);
egal('une ligne qui n\'offre pas la valeur est ignorée', 1, r5.touchees);
egal('… et reste vide', '', b5.selects[1].value);

/* L'annulation rend l'etat EXACT d'avant, ligne par ligne. */
egal('l\'état antérieur est conservé', 'Positif,', r4.avant.join(','));

/* ── Le câblage ───────────────────────────────────────────────────────────── */
console.log('\nCe que la page pose et ce qu\'elle protège');

ok('la commande est posée sur les blocs', /function _blPoserCommandes/.test(src));
/* Elle lit les `<select>` pour en tirer ses libelles : appelee avant que les
   tableaux soient batis, elle ne trouve rien et ne pose RIEN — sans erreur. */
var iDef = src.indexOf('function _blPoserCommandes');
var iTb  = src.indexOf('tbody.appendChild(tr)');
var iApp = src.indexOf('_blPoserCommandes()', iTb);
var iRev = src.indexOf('_reevalRender()');
/* Borne HAUTE obligatoire : le second appel, celui de la reconstruction de
   disposition, vit plus loin dans le fichier et satisferait la condition a lui
   seul — la disposition n'est pourtant rejouee que si le praticien en a une. */
ok('… appelée depuis l\'init, après construction des tableaux',
   iDef > 0 && iTb > 0 && iApp > iTb && iRev > iTb && iApp < iRev,
   iApp < 0 ? 'aucun appel après la construction des tableaux'
            : 'seul l\'appel de la reconstruction subsiste');

/* Un bloc d'une seule ligne ne gagne rien a une commande de groupe : le menu du
   bloc ferait exactement ce que fait deja le menu de la ligne, en doublant la
   surface de clic pour rien. */
var corpsP = iDef > 0 ? src.slice(iDef, src.indexOf('\n}', iDef)) : '';
ok('un bloc d\'une seule ligne n\'en reçoit pas',
   /sels\.length\s*<\s*2/.test(corpsP));
/* En LECTURE, on ne saisit pas : la commande n'a rien a y faire, et un bouton
   qui repond dans un formulaire verrouille est pire qu'absent. */
ok('elle disparaît en mode lecture',
   /\.bilan-readonly[^{]*\.bl-vite[^{]*\{[^}]*display:\s*none/.test(html.replace(/\n/g, ' ')),
   'regle absente de bilan.html');
['.bl-vite', '.bl-vite-btn', '.bl-vite-cpt', '.bl-vite-pan'].forEach(function (c) {
  var re = new RegExp('(^|[\\n;}])\\s*' + c.replace('.', '\\.') + '\\s*\\{');
  ok(c + ' est défini par sa propre règle', re.test(html));
});

/* Une reconstruction de disposition rebatit des lignes et en masque d'autres :
   sans ce second passage, un bloc neuf reste sans commande et un bloc ampute
   annonce un compte faux. */
var iRe = src.indexOf('_reevalRender()');
ok('la disposition reconstruite repose la commande et rafraîchit le compte',
   iRe > 0 && /_blPoserCommandes\(\)/.test(src.slice(iRe, iRe + 400))
          && /_blMajCompteur\(/.test(src.slice(iRe, iRe + 400)));

/* ── Une ligne masquee n'est pas une ligne ────────────────────────────────── */
console.log('\nUne ligne masquée par la disposition reste hors du geste');
var bm = faux([{ i: 0, opts: ['', 'Positif', 'Négatif'] },
               { i: 1, opts: ['', 'Positif', 'Négatif'], cache: true },
               { i: 2, opts: ['', 'Positif', 'Négatif'] }]);
var visibles = api.selectsBloc(bm.bloc);
egal('elle sort du décompte des lignes', 2, visibles.length);
api.appliquer(bm.bloc, 'Négatif', false);
egal('… et le clic ne l\'écrit pas', '', bm.selects[1].value);
egal('les deux autres sont renseignées', 'Négatif,Négatif',
     [bm.selects[0].value, bm.selects[2].value].join(','));

/* Aucun libelle en dur : c'est la regle qui protege les treize tableaux aux
   autres reponses, et les six fonctionnels ou la polarite s'inverse. */
var corps = corpsP;
ok('aucun « Positif » écrit en dur dans la commande',
   !/'Positif'|"Positif"/.test(corps), corps.slice(0, 160));
ok('aucun « Négatif » non plus', !/'Négatif'|"Négatif"/.test(corps));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bloc rapide : tous les cas passent.');

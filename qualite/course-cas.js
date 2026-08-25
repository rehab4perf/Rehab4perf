#!/usr/bin/env node
/* Vérifie la section « Analyse de Course à pied » du CR et les points à
   travailler qu'elle alimente, sur un formulaire entièrement rempli. */
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'js', 'bilan.js');
var src = fs.readFileSync(SRC, 'utf8');

function ext(nom){
  var d = src.indexOf('function ' + nom + '(');
  var f = src.indexOf('\n}', d);
  return src.slice(d, f + 2);
}

var CH = {
  'cp-chaussure':'Nike Pegasus 41', 'cp-drop':'10', 'cp-allure':'5:30 /km',
  'cp-support':'Tapis roulant', 'cp-echauff':'8 min', 'cp-km':'42 km',
  'cp-douleur':'2/10 - face ant. genou D',
  'cp-cadence':'162',
  /* Statut observe + chiffre facultatif : le chiffre vient d'un capteur ou
     d'un comptage d'images, jamais de l'oeil nu. */
  'cp-gct-q':'insuffisant', 'cp-gct':'278',
  'cp-sym-q':'insuffisant',  'cp-gct-asym':'9',
  'cp-osc-q':'acceptable',   'cp-osc':'9.5',
  'cp-strike':'devant',
  'cp-zone-g':'Talon', 'cp-zone-d':'Talon',
  'cp-tibia-g':'ok', 'cp-tibia-d':'insuffisant',
  'cp-bruit-g':'acceptable', 'cp-bruit-d':'insuffisant',
  'cp-amorti':'acceptable', 'cp-amorti-nt':'',
  'cp-exthanche':'insuffisant', 'cp-exthanche-nt':'Limitee bilateralement',
  'cp-tronc':'acceptable', 'cp-tronc-nt':'',
  'cp-talon':'ok', 'cp-talon-nt':'',
  'cp-bras':'acceptable', 'cp-bras-nt':'Bras droit croise la ligne mediane',
  'cp-pelvis-g':'ok', 'cp-pelvis-d':'insuffisant',
  'cp-valgus-g':'ok', 'cp-valgus-d':'insuffisant',
  'cp-crossover-g':'acceptable', 'cp-crossover-d':'acceptable',
  'cp-eversion-g':'ok', 'cp-eversion-d':'acceptable',
  'cp-conclusion':'Overstride marque avec cadence basse.'
};
/* Les libelles des statuts observes sont lus SUR LE FORMULAIRE par le CR.
   Le faux DOM extrait donc les vraies options de bilan.html : ce cas verifie
   du meme coup que les deux fichiers disent les memes mots. */
var htmlSrc = fs.readFileSync(path.join(__dirname, '..', 'bilan.html'), 'utf8');
function optionsDe(id) {
  var re = new RegExp('<select[^>]*id="' + id + '"[\\s\\S]*?<\\/select>');
  var bloc = htmlSrc.match(re);
  if (!bloc) return null;
  var out = {};
  bloc[0].replace(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g,
    function(_, v, t){ if (v) out[v] = t.trim(); return ''; });
  return out;
}
var OPTS = {};
['cp-gct-q','cp-sym-q','cp-osc-q'].forEach(function(id){
  OPTS[id] = optionsDe(id);
  if (!OPTS[id]) { console.error('Options introuvables pour ' + id + ' dans bilan.html'); process.exit(1); }
});

global.window = {};
global.document = {
  getElementById: function(id){
    if (CH[id] === undefined) return null;
    var el = { value: CH[id], closest: function(){ return { id:'page-course' }; } };
    if (OPTS[id] && CH[id]) el.selectedOptions = [{ textContent: OPTS[id][CH[id]] || '' }];
    return el;
  }
};

var pre = ''
  + ext('_crMesTab') + '\n'
  + 'var CP_CADENCE_MIN = 165, CP_CADENCE_REF = 180;\n'
  + ext('_cpCadenceInsuffisante') + '\n'
  + src.slice(src.indexOf('var CP_STRIKE_LBL'),
              src.indexOf('};', src.indexOf('var CP_STRIKE_LBL')) + 2) + '\n'
  + 'function nl2br(s){ return String(s||"").replace(/\\n/g,"<br>"); }\n'
  + 'function _crInSuiviMode(){ return false; }\n'
  + 'function _crMarquage(){ return { cls: "", badge: "" }; }\n';

// crItem, extrait de _buildAllTestsHtml
var bi = src.indexOf('function crItem(key, val, tag, tagClass, fieldIds)');
var be = src.indexOf('\n  }', bi);
pre += src.slice(bi, be + 4) + '\n';

// La section elle-meme
var si = src.indexOf('  var cpV   = function(id)');
var se = src.indexOf("  addSec('6. Analyse de Course a pied', cpHtml);");
if (si < 0 || se < 0) { console.error('Section CAP introuvable'); process.exit(1); }
var sectionSrc = src.slice(si, se);

/* SOURCE UNIQUE : la meme fonction alimente la synthese de l'onglet et la
   section « Points a Travailler » des deux comptes-rendus. */
var ptsSrc = ext('_cpPointsATravailler');
if (!ptsSrc) { console.error('_cpPointsATravailler introuvable'); process.exit(1); }

var mod = pre + ptsSrc + '\n'
  + 'function sectionCAP(){\n' + sectionSrc + '\n  return cpHtml;\n}\n'
  + 'function pointsCAP(){ var toWork = [];\n'
  + '  _cpPointsATravailler().forEach(function(p){ toWork.push(p.t); });\n'
  + '  return toWork;\n}\n'
  + 'module.exports = { sectionCAP: sectionCAP, pointsCAP: pointsCAP,'
  + ' brut: _cpPointsATravailler };';
var TMP = path.join(require('os').tmpdir(), '_r4p_course_mod.js');
fs.writeFileSync(TMP, mod);
var m = require(TMP);

var html = m.sectionCAP();
var pts  = m.pointsCAP();

var ok = 0, ko = 0;
function verifie(intitule, cond, detail){
  if (cond) { ok++; console.log('    ✓ ' + intitule); }
  else { ko++; console.log('    ✗ ' + intitule + (detail ? '\n        ' + detail : '')); }
}

console.log('\nSection CR — contenu');
verifie('conditions avec chaussure et drop', /Nike Pegasus 41 — drop 10 mm/.test(html));
verifie('cadence en constat, sans cible',
  /162 pas\/min \(référence performance : 180\)/.test(html));
verifie('aucune cible de progression dans le CR', !/Cible |\+5 à \+10/.test(html));
verifie('le CR reprend le libellé du formulaire, pas « Insuffisant »',
  html.indexOf(OPTS['cp-gct-q'].insuffisant + ' — 278 ms') >= 0,
  'attendu : ' + OPTS['cp-gct-q'].insuffisant + ' — 278 ms');
verifie('symétrie des appuis avec écart', /Symétrie des appuis/.test(html) && /9 % écart/.test(html));
verifie('oscillation au libellé du formulaire',
  /Oscillation verticale/.test(html) && html.indexOf(OPTS['cp-osc-q'].acceptable) >= 0);
verifie('la pastille garde le statut générique', /cr-tag bad">Insuffisant</.test(html));
verifie('overstride nommé', /Devant le centre de masse \(overstride\)/.test(html));
verifie('conclusion reprise', /Overstride marque avec cadence basse/.test(html));

console.log('\nColonnes des lignes à deux côtés');
var iG = html.indexOf('>Gauche<'), iD = html.indexOf('>Droit<');
verifie('Gauche avant Droit', iG > -1 && iD > -1 && iG < iD, 'iG=' + iG + ' iD=' + iD);
verifie('aucun en-tête Sain/Atteint', !/Côté sain|Côté atteint/.test(html));
// tibia : ok a gauche, insuffisant a droite -> l'ordre des valeurs doit suivre
var mTib = html.match(/Angle du tibia[\s\S]{0,600}?<\/table>/);
verifie('valeurs du tibia dans l\'ordre G puis D',
  !!mTib && mTib[0].indexOf('Vertical') < mTib[0].indexOf('Très incliné') === false
    ? mTib[0].indexOf('OK') < mTib[0].indexOf('Insuffisant')
    : mTib[0].indexOf('OK') < mTib[0].indexOf('Insuffisant'));

console.log('\nProvenance des lignes (filtre du CR Tests)');
var nbItems = (html.match(/class="cr-item/g) || []).length;
var nbPages = (html.match(/data-pages="page-course"/g) || []).length;
verifie('toutes les lignes portent page-course', nbItems > 0 && nbItems === nbPages,
  nbItems + ' lignes, ' + nbPages + ' avec data-pages');

console.log('\nPoints à travailler alimentés');
console.log(pts.map(function(p){ return '        • ' + p; }).join('\n'));
verifie('bassin droit remonté', pts.some(function(p){ return /bassin, hanche droite/.test(p); }));
verifie('valgus droit remonté', pts.some(function(p){ return /valgus dynamique, hanche droite/.test(p); }));
verifie('overstride remonté', pts.some(function(p){ return /overstride/.test(p); }));
verifie('cadence sous 165 remontée comme insuffisante',
  pts.some(function(p){ return /Cadence insuffisante — 162 pas\/min \(seuil 165\)/.test(p); }));
verifie('extension de hanche remontée', pts.some(function(p){ return /Extension de hanche/.test(p); }));
verifie('asymétrie remontée avec son écart', pts.some(function(p){ return /Asymétrie des appuis \(9 % d'écart\)/.test(p); }));
verifie('appui long remonté', pts.some(function(p){ return /pied qui s'écrase/.test(p); }));
verifie('rien pour le côté gauche (tout OK)', !pts.some(function(p){ return /gauche/.test(p); }));

/* ── Bibliothèque de chaussures ──────────────────────────────────────────
   Le <datalist> a été remplacé par une liste maison : Chrome rendait le sien
   avec son propre habillage sombre et y mêlait son autofill d'adresses. */
var dbSrc = src.slice(src.indexOf('var CHAUSSURES_DROP'),
                      src.indexOf('\n};', src.indexOf('var CHAUSSURES_DROP')) + 3);
var comboMod = dbSrc + '\n' + ext('_cpComboFiltre')
  + '\nmodule.exports = { f:_cpComboFiltre, db:CHAUSSURES_DROP,'
  + ' n:Object.keys(CHAUSSURES_DROP).length };';
var TMP2 = path.join(require('os').tmpdir(), '_r4p_course_combo.js');
fs.writeFileSync(TMP2, comboMod);
var cb = require(TMP2);

console.log('\nCadence — un seuil, aucune cible');
var cadSauve = CH['cp-cadence'];
[[180, false], [170, false], [165, false], [164, true], [150, true]].forEach(function(c){
  CH['cp-cadence'] = String(c[0]);
  var p = m.pointsCAP();
  var remonte = p.some(function(x){ return /Cadence insuffisante/.test(x); });
  verifie(c[0] + ' pas/min ' + (c[1] ? 'remonte' : 'ne remonte pas'), remonte === c[1]);
});
CH['cp-cadence'] = '180';
/* Cibler « cadence » tout court attrapait « passer par la cadence » de la
   ligne overstride — c'est un moyen, pas une consigne sur la cadence. */
verifie('180 ne reçoit aucune consigne sur sa cadence',
  !m.pointsCAP().some(function(x){ return /^Cadence/.test(x); }));
verifie('180 apparaît quand même dans le CR', /180 pas\/min/.test(m.sectionCAP()));
CH['cp-cadence'] = cadSauve;

console.log('\nSans capteur — le statut seul doit suffire');
var sauve = {};
['cp-gct','cp-gct-asym','cp-osc'].forEach(function(k){ sauve[k] = CH[k]; CH[k] = ''; });
var htmlSansN = m.sectionCAP();
var ptsSansN  = m.pointsCAP();
verifie('asymétrie remontée sans aucun chiffre',
  ptsSansN.some(function(p){ return /^Asymétrie des appuis — en chercher/.test(p); }),
  ptsSansN.filter(function(p){ return /Asym/.test(p); }).join(' | '));
verifie('le CR affiche le libellé seul, sans chiffre',
  htmlSansN.indexOf('>' + OPTS['cp-gct-q'].insuffisant + '<') >= 0);
verifie('aucun « undefined » ni « NaN » dans le CR', !/undefined|NaN/.test(htmlSansN));
['cp-gct','cp-gct-asym','cp-osc'].forEach(function(k){ CH[k] = sauve[k]; });

console.log('\nSynthèse de l\'onglet et CR — une seule source');
var brut = m.brut();
verifie('mêmes lignes que les points à travailler du CR',
  brut.map(function(p){ return p.t; }).join('|') === pts.join('|'));
verifie('chaque ligne porte un niveau', brut.every(function(p){ return p.n === 'bad' || p.n === 'warn'; }));
verifie('les constats les mieux étayés en tête',
  brut[0].n === 'bad' && brut[brut.length - 1].n === 'warn');

console.log('\nBibliothèque de chaussures');
verifie('au moins 60 modèles', cb.n >= 60, cb.n + ' modèles');
verifie('champ vide — tout est proposé', cb.f('').length === cb.n);
verifie('recherche par marque', cb.f('nike').length === 9);
verifie('recherche partielle', cb.f('peg').length === 2 && cb.f('peg').every(function(x){ return /Pegasus/.test(x); }));
verifie('mots dans le désordre', cb.f('peg nike').join() === cb.f('nike peg').join());
verifie('insensible à la casse', cb.f('HOKA CLIFTON').length === 1);
verifie('modèle inconnu — aucune proposition', cb.f('zzz').length === 0);
verifie('Altra en drop nul', cb.db['Altra Lone Peak 8'] === 0);
verifie('Brooks Ghost en 12 mm', cb.db['Brooks Ghost 16'] === 12);


console.log('\n' + '─'.repeat(64));
if (ko) { console.log('✗ ' + ko + ' échec(s) sur ' + (ok + ko)); process.exit(1); }
console.log('✓ ' + ok + ' attentes vérifiées');

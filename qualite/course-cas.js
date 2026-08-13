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
  'cp-cadence':'162', 'cp-gct':'278', 'cp-gct-asym':'9', 'cp-osc':'9.5',
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
global.window = {};
global.document = {
  getElementById: function(id){
    if (CH[id] === undefined) return null;
    return { value: CH[id], closest: function(){ return { id:'page-course' }; } };
  }
};

var pre = ''
  + ext('_crMesTab') + '\n'
  + ext('_cpCadenceCible') + '\n'
  + src.slice(src.indexOf('var CP_STRIKE_LBL'),
              src.indexOf('};', src.indexOf('var CP_STRIKE_LBL')) + 2) + '\n'
  + 'function nl2br(s){ return String(s||"").replace(/\\n/g,"<br>"); }\n'
  + 'function _crInSuiviMode(){ return false; }\n';

// crItem, extrait de _buildAllTestsHtml
var bi = src.indexOf('function crItem(key, val, tag, tagClass, fieldIds)');
var be = src.indexOf('\n  }', bi);
pre += src.slice(bi, be + 4) + '\n';

// La section elle-meme
var si = src.indexOf('  var cpV   = function(id)');
var se = src.indexOf("  addSec('6. Analyse de Course a pied', cpHtml);");
if (si < 0 || se < 0) { console.error('Section CAP introuvable'); process.exit(1); }
var sectionSrc = src.slice(si, se);

/* Les points a travailler. La borne se cherche APRES « var toWork = [] » :
   le meme intitule de commentaire ouvre aussi le bloc de TRACKED_METRICS,
   bien plus haut dans le fichier, et un indexOf depuis zero tombe dessus. */
var wDeb = src.indexOf('  // 7. Points à travailler');
var wi = src.indexOf('  /* ── Course à pied ─', wDeb);
var we = src.indexOf('  })();', wi) + 7;
if (wDeb < 0 || wi < 0) { console.error('Bloc toWork Course introuvable'); process.exit(1); }
var workSrc = src.slice(wi, we);

var mod = pre
  + 'function sectionCAP(){\n' + sectionSrc + '\n  return cpHtml;\n}\n'
  + 'function pointsCAP(){ var toWork = [];\n' + workSrc + '\n  return toWork;\n}\n'
  + 'module.exports = { sectionCAP: sectionCAP, pointsCAP: pointsCAP };';
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
verifie('cadence avec cible relative 170–178', /162 pas\/min/.test(html) && /Cible 170–178/.test(html));
verifie('asymétrie 9 % marquée', /9 %/.test(html) && /Marquée/.test(html));
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
verifie('cadence avec cible chiffrée', pts.some(function(p){ return /162 → 170–178/.test(p); }));
verifie('extension de hanche remontée', pts.some(function(p){ return /Extension de hanche/.test(p); }));
verifie('asymétrie > 5 % remontée', pts.some(function(p){ return /Asymétrie du temps de contact au sol \(9 %\)/.test(p); }));
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

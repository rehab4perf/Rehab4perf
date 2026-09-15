#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — le poids que donne un %1RM, et la courbe à un clic

   Suite de qualite/historique-exo-cas.js (B, deuxième temps), demandée par le
   praticien le 2026-09-13 : « pour pouvoir mettre le bon poids sur mon exo ».

   1. Sous une cible %1RM, le poids qu'elle représente : « ≈ 74,5 kg »
      (fourchette : « ≈ 65–74,5 kg »), arrondi au demi-kilo. La référence est
      le 1RM ESTIMÉ de la dernière séance CHARGÉE avant celle qu'on compose —
      les charges prescrites, comme Évolution. L'infobulle dit d'où il vient.
      Rien sans séance chargée avant, rien sur un modèle, rien au poids du
      corps : un poids inventé serait pire qu'aucun.
      updateCible ne redessine pas la séance : le poids se recalcule EN PLACE
      à la frappe, sinon il mentirait dès le premier chiffre changé.
   2. La ligne « Dernière séance… » s'ouvre au clic sur la courbe de
      l'exercice : Évolution, cet exercice ajouté à la sélection, sa carte
      amenée à l'écran et soulignée.

     node qualite/cible-1rm-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fd = fnDe(pdata);

const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const kg = (n, reps, series, charge) => ({ name: n, reps: String(reps), series: String(series), cibles: charge ? [{ type: 'kg', min: String(charge), max: '' }] : [] });
const SEANCES = [
  prog('2026-08-31', [kg('Back squat', 8, 4, 70), kg('Pistol squat box', 8, 3), kg('Fentes', 10, 3, 20)]),
  prog('2026-09-07', [kg('Back Squat', 8, 4, 75), kg('Pistol squat box', 10, 3)]),
  prog('2026-09-14', [kg('Back squat', 8, 4, 80)])     // la séance qu'on compose : ne compte pas
];
function contexte(etat) {
  const c = vm.createContext(Object.assign({
    _builderDate: '2026-09-14', _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
    _pevoAujourdhuiIso: () => '2026-09-13',
    escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }, etat));
  try {
    vm.runInContext(['_norm', '_cleExo', '_1rm', '_extractExoLoads', '_histExoHtml', '_rm1Ref', '_cibleKgHtml'].map(fd).join('\n')
      + '\nvar _histExos = { pid:"x", map:null, enCours:false };', c);
    c._histExos.map = c._extractExoLoads(SEANCES, 1);
  } catch (e) { ok('les fonctions se chargent', false, e.message); }
  return c;
}
const c = contexte({});
const poids = (nom, cible, ctx) => { try { return (ctx || c)._cibleKgHtml({ name: nom }, cible); } catch (e) { return 'ERREUR ' + e.message; } };
const texte = h => String(h).replace(/<[^>]+>/g, '');
const pct = (min, max) => ({ type: '%1RM', min, max: max || '' });

console.log('\nLe poids d\'une cible %1RM');
ok('80 % d\'un 1RM estimé à 93,1 kg (4 × 8 à 75 kg, le 7 sept.) : ≈ 74,5 kg', texte(poids('Back squat', pct('80'))) === '≈ 74,5 kg', poids('Back squat', pct('80')));
ok('… une fourchette donne une fourchette', texte(poids('Back squat', pct('70', '80'))) === '≈ 65–74,5 kg', poids('Back squat', pct('70', '80')));
ok('… l\'infobulle dit d\'où vient le 1RM', /title="70–80 % du 1RM estimé : 93,1 kg \(séance du 7 sept\.\)"/.test(poids('Back squat', pct('70', '80'))), poids('Back squat', pct('70', '80')));
ok('la séance qu\'on compose ne sert pas de référence (le 14, à 80 kg : 1RM ≈ 99)', texte(poids('Back squat', pct('100'))) === '≈ 93 kg', poids('Back squat', pct('100')));
ok('une seule séance chargée suffit', texte(poids('Fentes', pct('50'))) === '≈ 13,5 kg', poids('Fentes', pct('50')));
ok('la virgule se lit comme un point', texte(poids('Back squat', pct('72,5'))) === texte(poids('Back squat', pct('72.5'))) && texte(poids('Back squat', pct('72,5'))) !== '');
ok('rien sans valeur, ou sur un autre type de cible', poids('Back squat', pct('')) === '' && poids('Back squat', { type: 'RPE', min: '8', max: '' }) === '' && poids('Back squat', { type: 'kg', min: '80', max: '' }) === '');
ok('rien au poids du corps, ni pour un exercice jamais chargé', poids('Pistol squat box', pct('80')) === '' && poids('Soulevé de terre', pct('80')) === '');
{
  const m = contexte({ _builderFromTemplate: 't1' }), t = contexte({ _builderMode: 'template' });
  ok('rien sur un modèle (il n\'est à personne)', poids('Back squat', pct('80'), m) === '' && poids('Back squat', pct('80'), t) === '');
}

console.log('\nDans le builder');
const rs = fd('renderSession');
ok('le poids vit sous sa cible, DANS la cellule des cibles (la grille de la ligne ne bouge pas)',
   /html \+= '<\/div>';\n(\s*\/\*[^*]*\*\/\n)?\s*html \+= '<div class="cible-kg" data-ck="'\+b\.id\+'\|'\+e\.id\+'\|'\+ci\+'">' \+ _cibleKgHtml\(e, c\) \+ '<\/div>';\n\s*\}\);/.test(rs));
ok('… il suit la frappe, en place (updateCible ne redessine rien)', /_cibleKgMaj\(blocId, exoId, idx\);/.test(fd('updateCible')));
ok('… et se remplit quand l\'historique arrive', /querySelectorAll\('\.cible-kg\[data-ck\]'\)/.test(fd('_histExosRemplir')));
ok('une ligne vide ne prend pas de place', /\.cible-kg:empty \{ display:none; \}/.test(html));

console.log('\nLa courbe à un clic');
ok('la ligne d\'historique est un bouton', /<button type="button" class="exo-hist-lien" onclick="_histVoirCourbe\(this\)"/.test(fd('_histExoHtml')));
{
  let ouvert = 0; const sel = new Set(['fentes']); let sauve = null;
  const v = vm.createContext({ _progPatient: { id: 'p1' }, _pevoFocusCle: null,
    _pevoGetSel: () => sel, _pevoSaveSel: (id, s) => { sauve = Array.from(s); }, openChargesEvo: () => { ouvert++; } });
  try { vm.runInContext(fd('_norm') + fd('_cleExo') + fd('_histVoirCourbe'), v); v._histVoirCourbe({ closest: () => ({ getAttribute: () => 'Back Squat' }) }); }
  catch (e) { ok('_histVoirCourbe se charge', false, e.message); }
  ok('le clic ajoute l\'exercice à la sélection d\'Évolution, sans retirer les autres', sauve && sauve.includes('back squat') && sauve.includes('fentes'), JSON.stringify(sauve));
  ok('… et ouvre Évolution, sur sa carte', ouvert === 1 && v._pevoFocusCle === 'back squat', v._pevoFocusCle);
}
const rp = fd('_renderPevoCharts');
ok('les cartes d\'exercice portent leur clé', /chartsHtml \+= '<div class="pevo-card" data-cle="'\+escH\(key\)\+'">'/.test(rp));
ok('… et la carte visée vient à l\'écran, soulignée', /_pevoFocusCle/.test(rp) && /scrollIntoView/.test(rp) && /pevo-focus/.test(rp) && /\.pevo-card\.pevo-focus \{/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : le poids d\'un %1RM sous sa cible ; la courbe à un clic.');

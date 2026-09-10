#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Espace athlète — une séance n'affiche QUE son propre ressenti

   Douleur par exercice, exercices terminés, note de séance, tours d'AMRAP :
   tout est rangé dans le navigateur sous l'id de la séance (`r4p-pain-<id>`…).
   Mais à l'intérieur, les exercices ne sont désignés que par leur POSITION
   (`b0e0` = bloc 1, exercice 1). Charger sous le mauvais id affiche donc l'état
   d'une autre séance sur les mêmes cases.

   LE DÉFAUT QUE CE FICHIER FERME : à l'ouverture d'une séance, le chargement
   tournait AVANT que `buildRpeCard` ne pose l'id de la séance ouverte — donc
   avec l'id de la séance ouverte JUSTE AVANT. Et sans id, il ne remettait rien
   à zéro. Constaté par le praticien : douleur 1/10 sur l'exercice 1 de la
   séance du 12/08, séance du 10/09 dupliquée depuis elle — la seconde
   s'ouvrait avec le 1/10 déjà posé. Si l'athlète envoyait sans y toucher, le
   praticien recevait une douleur que personne n'avait saisie.

   La duplication ne copie aucun retour (`athlete_feedback` est lié à l'id de
   séance, la copie en a un neuf) : elle rendait seulement le défaut VISIBLE,
   en reproduisant les mêmes exercices aux mêmes positions. Toute séance ouverte
   après une autre était touchée.

   Les tours d'AMRAP avaient le défaut inverse : chargés une seule fois, au
   démarrage de la page, sous une clé sans id — jamais ceux de la séance ouverte.

   Exécute les VRAIS `openProgModal` (calendrier) et `renderProgInMain` (lien
   de séance unique), et relève l'état que voit le rendu.

     node qualite/athlete-etat-seance-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const S = fs.readFileSync(path.join(__dirname, '..', 'athlete.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const src = nom => { const d = S.indexOf('function ' + nom + '('); return d < 0 ? '' : S.slice(d, S.indexOf('\n}\n', d) + 2); };
const tick = () => new Promise(r => setTimeout(r, 0));

/* Ce que l'athlète a saisi sur la séance A (12/08), dans son navigateur. */
const STOCK = {
  'r4p-pain-A': '{"b0e0":1}', 'r4p-done-A': '{"b0e0":true}',
  'r4p-snote-A': '"genou ok"', 'r4p-tours-A': '{"X":5}'
};

function banc() {
  const store = new Map(Object.entries(STOCK));
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) };
  const vus = [], els = {};
  const document = { getElementById: id => els[id] || (els[id] = { textContent: '', innerHTML: '', classList: { add() {}, remove() {} } }) };
  /* La séance dupliquée : même programme, mêmes positions, même id de bloc. */
  const PROG = { id: 'P', nom: 'Séance genou', donnees: { blocs: [{ id: 'X', exos: [{ name: 'Squat' }] }] } };
  const fetch = url => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(/athlete_feedback/.test(url) ? [] : [PROG]) });
  const code = `
    var _currentSeanceId = '', _painRatings = {}, _doneExos = {}, _sessionNote = '', _toursRealises = {}, _existingExoNotes = {}, _seanceId = '';
    var _currentBlocs, _currentDureeMin, _currentRpe, SUPA_URL = 'https://supa.test';
    function _entetes(){ return {}; }
    function _blocsVisibles(b){ return b; }
    function _buildCapProgHTML(){ return ''; } function _buildHsrProgHTML(){ return ''; } function _buildCapPainCard(){ return ''; }
    function buildProgHTML(){ vus.push({ quoi: 'prog', pain: JSON.stringify(_painRatings), done: JSON.stringify(_doneExos), tours: JSON.stringify(_toursRealises) }); return ''; }
    /* Doublure : la première ligne du vrai buildRpeCard pose l'id (contrôlé plus bas). */
    function buildRpeCard(id){ _currentSeanceId = id || ''; vus.push({ quoi: 'rpe', note: _sessionNote }); return ''; }
    ${src('_exoKey')}${src('_loadPainRatings')}${src('_loadSessionNote')}${src('_chargerEtatSeance')}
    ${src('_initExoEffortsFromFeedback')}${src('openProgModal')}${src('renderProgInMain')}
    return { ouvrir: openProgModal, lien: function(id){ _seanceId = id; renderProgInMain(PROG); } };`;
  const api = new Function('document', 'fetch', 'localStorage', 'vus', 'PROG', code)(document, fetch, localStorage, vus, PROG);
  const dernier = q => vus.filter(v => v.quoi === q).pop() || {};
  return { api, etat: () => Object.assign({}, dernier('prog'), { note: dernier('rpe').note }) };
}

(async () => {
  ok('la doublure est fidèle : le vrai buildRpeCard pose l\'id en première ligne',
    /function buildRpeCard\(seanceId, blocs, existing\)\{\s*_currentSeanceId = seanceId \|\| '';/.test(S));

  console.log('\nCalendrier : ouvrir une séance, puis sa copie');
  let b = banc(), e;
  b.api.ouvrir('P', 'A'); await tick(); await tick(); e = b.etat();
  ok('la séance du 12/08 retrouve SA douleur', e.pain === '{"b0e0":1}', e.pain);
  ok('… ses exercices terminés', e.done === '{"b0e0":true}', e.done);
  ok('… sa note de séance', e.note === 'genou ok', JSON.stringify(e.note));
  ok('… ses tours d\'AMRAP', e.tours === '{"X":5}', e.tours);

  b.api.ouvrir('P', 'B'); await tick(); await tick(); e = b.etat();
  ok('la copie du 10/09 s\'ouvre SANS le 1/10 de la séance d\'origine', e.pain === '{}', e.pain);
  ok('… sans ses exercices terminés', e.done === '{}', e.done);
  ok('… sans sa note', e.note === '', JSON.stringify(e.note));
  ok('… sans ses tours', e.tours === '{}', e.tours);

  b.api.ouvrir('P', 'A'); await tick(); await tick(); e = b.etat();
  ok('rouvrir la séance du 12/08 la retrouve intacte', e.pain === '{"b0e0":1}', e.pain);

  b.api.ouvrir('P'); await tick(); await tick(); e = b.etat();
  ok('un programme ouvert sans séance ne montre l\'état d\'aucune', e.pain === '{}' && e.done === '{}', e.pain + ' ' + e.done);

  console.log('\nLien de séance unique');
  b = banc(); b.api.lien('A'); await tick(); await tick(); e = b.etat();
  ok('la séance du lien retrouve sa douleur', e.pain === '{"b0e0":1}', e.pain);
  ok('… et ses tours d\'AMRAP', e.tours === '{"X":5}', e.tours);
  b = banc(); b.api.lien('B'); await tick(); await tick(); e = b.etat();
  ok('le lien d\'une autre séance part de zéro', e.pain === '{}' && e.tours === '{}', e.pain + ' ' + e.tours);

  console.log('');
  if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
  console.log('État de séance de l\'athlète : tous les cas passent.');
})().catch(err => { console.error('✗ le banc ne s\'exécute pas — ' + err.message); process.exit(1); });

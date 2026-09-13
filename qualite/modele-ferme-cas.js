#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Refermer le builder termine la modification d'un modèle

   Signalé par le praticien (2026-09-13), capture à l'appui : sur l'agenda de
   Maeva Zara, ouvrir sa séance demandait « Vous modifiez le modèle « WARM-UP
   MARP — Lower body ». Ouvrir cette séance quittera le modèle… » — alors qu'il
   ne modifiait aucun modèle.

   Le mode « modèle ouvert » ne se pose que par « Modifier le modèle ». Mais il
   ne tombait qu'avec « Quitter le modèle », « Utiliser pour un patient »,
   « + Séance » ou l'ouverture d'une séance. REFERMER le builder le laissait
   actif, sans plus rien pour le montrer — et la question revenait au premier
   clic sur une séance de l'agenda, des heures plus tard.

   La règle :
     - refermer le builder sort du modèle (avec la question « Quitter sans
       mettre à jour ? » s'il y a des changements) ;
     - ouvrir une séance ne demande rien quand le modèle ouvert n'a pas de
       modification en attente ;
     - le nom d'un modèle est celui de la barre latérale : le groupe tel qu'il
       s'appelle AUJOURD'HUI, puis la phase. `nom` est figé à la création — le
       groupe renommé « WARM-UP RAMP » s'affichait encore « MARP ».

     node qualite/modele-ferme-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const data = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(main), fd = fnDe(data);

/* Le banc : les VRAIES fonctions, des doublures pour ce qu'elles appellent. */
function banc(etat, fonctions) {
  const journal = [];
  const ctx = vm.createContext(Object.assign({
    blocs: [{ id: 'b1' }], _builderMode: 'seance', _builderSaved: true, _builderFromTemplate: null,
    _currentSeanceId: null, _currentProgId: null, _lastSavedHash: 'h0', _draftSaveTimer: null,
    _sidebarProgs: [{ id: 't42', nom: 'WARM-UP MARP — Lower body', phase_nom: 'Lower body', group_id: 'g1' }],
    _groups: [{ id: 'g1', nom: 'WARM-UP RAMP' }],
    _calDragJustEnded: false, _calDrag: null, _builderDate: '', _pendingOpenFeedback: false,
    __hash: 'h0', __rep: undefined, journal,
    clearTimeout() {},
  }, etat));
  Object.assign(ctx, {
    _sessionHash: () => ctx.__hash,
    _confirmDialog: (o, cb) => { journal.push('question « ' + o.title + ' » ' + (o.body || '')); if (ctx.__rep) cb(); },
    r4pConfirmer: o => { journal.push('question « ' + o.titre + ' »'); return { then: cb => { if (ctx.__rep !== undefined) cb(ctx.__rep); } }; },
    _draftClear: () => journal.push('brouillon vidé'),
    _quitterModeTemplate: () => journal.push('mode template quitté'),
    _exitBuilderMode: () => journal.push('builder fermé'),
    _resetBuilderState: () => { journal.push('état remis à zéro'); ctx._builderFromTemplate = null; ctx.blocs = []; },
    _refreshDraftBadge() {}, _hideLibPreview() {}, _updateBuilderTitle() {},
    _loadProg: (p, s, q) => journal.push('séance ouverte ' + p + '/' + s + (q ? ' (quitte le modèle)' : '')),
  });
  try { vm.runInContext(fonctions.join('\n'), ctx); } catch (e) { journal.push('ERREUR ' + e.message); }
  return ctx;
}
const J = c => c.journal.join(' | ');

/* ── Le nom du modèle ────────────────────────────────────────────────────── */
console.log('\nLe nom du modèle, celui de la barre latérale');
{
  const c = banc({}, [fm('_nomModele')]);
  let n = '';
  try { n = c._nomModele(c._sidebarProgs[0]); } catch (e) { n = 'ERREUR ' + e.message; }
  ok('groupe renommé : « WARM-UP RAMP — Lower body », pas l\'ancien nom figé', n === 'WARM-UP RAMP — Lower body', n);
  let n2 = '', n3 = '';
  try { n2 = c._nomModele({ id: 'x', nom: 'Gainage' }); n3 = c._nomModele(null); } catch (e) { n2 = 'ERREUR ' + e.message; }
  ok('… un modèle hors groupe garde son nom', n2 === 'Gainage', n2);
  ok('… et sans modèle connu : « Modèle »', n3 === 'Modèle', n3);
  /* Le bandeau ne nomme plus le modèle : son nom est dans le titre, une fois
     (décision du praticien, qualite/rappels-nom-cas.js). */
  ok('le titre et la notification d\'ouverture le lisent',
     /'Modèle : ' \+ _nomModele\(_mT\)/.test(main) && /'✎ Modèle « ' \+ _nomModele\(t\)/.test(main));
}

/* ── Refermer le builder ─────────────────────────────────────────────────── */
console.log('\nRefermer le builder sort du modèle');
const FERMER = [fm('_nomModele'), fm('_sortirDuModeleOuvert'), fm('closeBuilder')];
{
  const c = banc({ _builderFromTemplate: 't42' }, FERMER);
  try { c.closeBuilder(); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('modèle ouvert, rien de changé : le builder se ferme, le modèle avec', c._builderFromTemplate === null && /builder fermé/.test(J(c)) && !/question/.test(J(c)), J(c));
  ok('… et son contenu ne reste pas en mémoire (il reviendrait en séance au prochain « + Séance »)', c.blocs.length === 0, J(c));
}
{
  const c = banc({ _builderFromTemplate: 't42', _builderSaved: false, __hash: 'h1' }, FERMER);
  try { c.closeBuilder(); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('modèle modifié : on le demande, en nommant le modèle actuel', /question « Quitter sans mettre à jour le modèle \? »/.test(J(c)) && /WARM-UP RAMP — Lower body/.test(J(c)), J(c));
  ok('… et tant qu\'on n\'a pas répondu, rien ne se ferme', c._builderFromTemplate === 't42' && !/builder fermé/.test(J(c)));
  const c2 = banc({ _builderFromTemplate: 't42', _builderSaved: false, __hash: 'h1', __rep: true }, FERMER);
  try { c2.closeBuilder(); } catch (e) { c2.journal.push('ERREUR ' + e.message); }
  ok('… l\'accord ferme le builder ET sort du modèle', c2._builderFromTemplate === null && /builder fermé/.test(J(c2)), J(c2));
}
{
  const c = banc({}, FERMER);
  try { c.closeBuilder(); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('la séance d\'un patient, elle, reste en mémoire comme avant', c.blocs.length === 1 && !/remis à zéro/.test(J(c)) && /builder fermé/.test(J(c)), J(c));
  const c2 = banc({ _builderMode: 'template' }, FERMER);
  try { c2.closeBuilder(); } catch (e) { c2.journal.push('ERREUR ' + e.message); }
  ok('un nouveau modèle en composition suit son propre chemin (séance empruntée rendue)', /mode template quitté/.test(J(c2)) && !/remis à zéro/.test(J(c2)), J(c2));
}

/* ── Ouvrir une séance de l'agenda ───────────────────────────────────────── */
console.log('\nOuvrir une séance de l\'agenda');
const OUVRIR = [fm('_nomModele'), fd('_openChipInBuilder')];
{
  const c = banc({ _builderFromTemplate: 't42' }, OUVRIR);
  try { c._openChipInBuilder('p7', '2026-09-14', 's3'); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('modèle ouvert sans modification en attente : aucune question, la séance s\'ouvre', !/question/.test(J(c)) && /séance ouverte p7\/s3 \(quitte le modèle\)/.test(J(c)), J(c));
}
{
  const c = banc({ _builderFromTemplate: 't42', __hash: 'h1', __rep: false }, OUVRIR);
  try { c._openChipInBuilder('p7', '2026-09-14', 's3'); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('modifications en attente : la question, avec le nom actuel', /question « Vous modifiez le modèle « WARM-UP RAMP — Lower body » »/.test(J(c)), J(c));
  ok('… le refus n\'ouvre rien', !/séance ouverte/.test(J(c)));
  const c2 = banc({ _builderFromTemplate: 't42', __hash: 'h1', __rep: true }, OUVRIR);
  try { c2._openChipInBuilder('p7', '2026-09-14', 's3'); } catch (e) { c2.journal.push('ERREUR ' + e.message); }
  ok('… l\'accord ouvre la séance', /séance ouverte p7\/s3/.test(J(c2)), J(c2));
}
{
  const c = banc({}, OUVRIR);
  try { c._openChipInBuilder('p7', '2026-09-14', 's3'); } catch (e) { c.journal.push('ERREUR ' + e.message); }
  ok('aucun modèle ouvert : rien ne change', !/question/.test(J(c)) && /séance ouverte/.test(J(c)), J(c));
}

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Refermer le builder sort du modèle ; la question ne se pose que s\'il y a à perdre.');

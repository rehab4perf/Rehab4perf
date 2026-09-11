#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Modèles — un bouton, un verbe : AJOUTER à la séance, ou MODIFIER le modèle

   Signalé par le praticien : dans la bibliothèque du builder, certains
   boutons chargeaient le modèle et ne permettaient plus que de le « mettre à
   jour », d'autres permettaient de l'utiliser et de le planifier — sans que
   rien ne dise lequel fait quoi. Le bouton ⤓ promettait « Ajouter tout le
   contenu à la séance en cours »… et transformait une séance VIDE en
   modification du modèle.

   La cause : `loadTemplate` décidait du SENS du geste selon l'état de la
   séance — vide, « cette séance est ce modèle » ; pleine, « j'y ajoute ». Le
   même clic changeait de sens, en silence.

   Décision du praticien :
     - AJOUTER (⤓, « Ajouter » du panneau Biblio, « + Ajouter à la séance ») :
       copie le contenu, ne change JAMAIS la nature de la séance — ni lien au
       modèle, ni séance planifiée, ni phase liée ;
     - MODIFIER LE MODÈLE (crayon, carte du répertoire) : le seul chemin vers
       « Mettre à jour le modèle » — il ferme la séance en cours, et le
       demande si elle n'est pas enregistrée ;
     - un BANDEAU dit en permanence le mode : séance d'un patient, ou
       modification d'un modèle (« aucun patient n'est concerné »), avec
       « Quitter le modèle » et « Utiliser pour un patient ».

     node qualite/modele-verbes-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
const aide = fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fn = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };
['loadTemplate', 'modifierModele', 'utiliserModele', 'quitterModele', '_majBandeauMode'].forEach(n =>
  ok(n + ' existe', !!fn(n)));

/* ── loadTemplate, exécutée ──────────────────────────────────────────────── */
const T1 = { id: 't1', nom: 'WARM-UP MARP — Lower', donnees: JSON.stringify({ blocs: [{ title: 'RAISE', exos: [] }, { title: 'MOBILITÉ', exos: [] }] }) };
function banc(etat) {
  const champ = { value: '', readOnly: false };
  const ctx = vm.createContext(Object.assign({
    blocs: [], _notes: '', _currentProgId: null, _currentSeanceId: null, _builderFromTemplate: null,
    _activeGroupId: 'g1', _activeGroupNom: 'LCA', _activePhaseOrdre: 2, _builderReadOnly: false,
    _lastSavedHash: '', _builderSaved: true, _progToken: null, _progUid: null, _templates: [T1],
    _loadTemplates() {}, _injecterTemplate(d) { d.blocs.forEach(b => ctx.blocs.push(b)); return d.blocs.length; },
    _updateActiveGroupBadge() {}, _applyBuilderReadOnly() {}, renderSession() {}, _updateBuilderTitle() {},
    _refreshSaveBtn() {}, _sessionHash() { return 'h' + ctx.blocs.length; }, _refreshDraftBadge() {}, _showToast() {},
    alert(m) { ctx._alerte = m; }, document: { getElementById: id => (id === 'patientName' ? champ : null) }
  }, etat));
  vm.runInContext(fn('loadTemplate'), ctx);
  ctx._champ = champ;
  return ctx;
}
console.log('\nAjouter ne change jamais la nature de la séance');
let c = banc({});
c.loadTemplate('t1');
ok('séance VIDE + Ajouter : le contenu arrive…', c.blocs.length === 2, c.blocs.length + ' blocs');
ok('… et la séance reste une séance — pas une modification du modèle', c._builderFromTemplate === null, String(c._builderFromTemplate));
ok('… modifiée, donc à enregistrer', c._builderSaved === false);
c = banc({ _currentProgId: 'p5' });
c.loadTemplate('t1');
ok('une séance PLANIFIÉE vide garde son identité (elle s\'enregistre toujours chez le patient)', c._currentProgId === 'p5', String(c._currentProgId));
ok('… et sa phase de protocole liée', c._activeGroupId === 'g1', String(c._activeGroupId));
c = banc({ _builderFromTemplate: 't9', blocs: [{ title: 'X' }] });
c.loadTemplate('t1');
ok('ajouter dans un modèle OUVERT le laisse ouvert (on compose le modèle)', c._builderFromTemplate === 't9', String(c._builderFromTemplate));

console.log('\nModifier le modèle : un geste explicite');
c = banc({});
c.loadTemplate('t1', true);
ok('ouvrir explicitement pose le lien au modèle', c._builderFromTemplate === 't1', String(c._builderFromTemplate));
ok('… affiche son nom (c\'est ce qui sera mis à jour)', c._champ.value === T1.nom, c._champ.value);
ok('… et vaut « enregistré » : rien n\'a encore été modifié', c._builderSaved === true);
/* La bibliothèque publiée ajoute aussi : elle effaçait l'identité d'une séance
   planifiée vide et coupait le lien d'un modèle ouvert. */
const lib = fn('loadLibraryTemplate');
ok('la bibliothèque publiée ajoute sans changer la nature de la séance', !!lib && !/_currentProgId = null/.test(lib) && !/_builderFromTemplate = null/.test(lib), lib.slice(0, 120));
ok('le répertoire ouvre le modèle EXPLICITEMENT', /loadTemplate\(id, ?true\)/.test(fn('_sidebarLoadProg')), fn('_sidebarLoadProg').slice(0, 200));

/* Vu en ligne à la première preuve : ouvrir un modèle proposait le BROUILLON
   de la séance qu'on venait de fermer (« Restaurer » l'aurait mis à la place
   du modèle), sous le bandeau de protocole du patient, avec « 1 bloc ajouté ». */
console.log('\nOuvrir un modèle : ni brouillon de séance, ni protocole du patient');
const clef = vm.createContext({ _DRAFT_KEY: 'r4p-draft', _builderMode: 'seance', _builderFromTemplate: 't1', _currentSeanceId: null, _currentProgId: null });
vm.runInContext(fn('_draftKey'), clef);
const kModele = clef._draftKey(); clef._builderFromTemplate = null; const kSeance = clef._draftKey();
ok('un modèle ouvert a son propre brouillon (il n\'écrase plus celui d\'une séance)', kModele !== kSeance, kModele + ' / ' + kSeance);
ok('aucun brouillon n\'est proposé sur un modèle ouvert', /if\(_builderFromTemplate && !_currentSeanceId && !_currentProgId\) return;/.test(fn('_draftRestore')));
ok('le mode se déclare dès le clic, avant le réseau', /_builderFromTemplate = String\(id\);[\s\S]*loadTemplate\(id, ?true\)/.test(fn('_sidebarLoadProg')));
ok('… et se défait si le chargement échoue', /function _echecOuverture\(\)[\s\S]{0,200}_builderFromTemplate = null/.test(fn('loadTemplate')) && (fn('loadTemplate').match(/_echecOuverture\(\); alert/g) || []).length === 2);
ok('le bandeau de protocole du patient ne s\'affiche pas sur un modèle', /_builderFromTemplate && !_currentSeanceId && !_currentProgId\)\) return;/.test(fn('_builderLoadProtoContext')));
ok('ouvrir dit « ouvert », pas « bloc ajouté »', /ouvrirModele \? '✎ Modèle « '/.test(fn('loadTemplate')));
ok('« Utiliser pour un patient » fait revenir son protocole', /_builderLoadProtoContext\(\)/.test(fn('utiliserModele')));

/* ── modifierModele / quitterModele / utiliserModele ─────────────────────── */
function gestes(etat) {
  const trace = [];
  const ctx = vm.createContext(Object.assign({
    blocs: [], _lastSavedHash: 'h0', _builderFromTemplate: null, _currentProgId: null, _currentSeanceId: null, _progPatient: null,
    _builderSaved: true, _sessionHash() { return 'h' + ctx.blocs.length; },
    _confirmDialog(o, cb) { trace.push('confirmer:' + (o.title || '')); ctx._ok = cb; },
    _sidebarLoadProg(id) { trace.push('ouvrir:' + id); }, _resetBuilderState() { trace.push('reset'); ctx._builderFromTemplate = null; },
    _updateBuilderTitle() { trace.push('titre'); }, _refreshSaveBtn() { trace.push('bouton'); }, _refreshDraftBadge() {},
    _showToast(m) { trace.push('toast:' + m); }, alert(m) { trace.push('alerte'); }, _sidebarProgs: [T1]
  }, etat));
  vm.runInContext(['modifierModele', 'quitterModele', 'utiliserModele'].map(fn).join('\n'), ctx);
  ctx._trace = trace;
  return ctx;
}
let g = gestes({});
g.modifierModele('t1');
ok('builder vide : « Modifier le modèle » l\'ouvre directement', g._trace.join() === 'ouvrir:t1', g._trace.join());
g = gestes({ blocs: [{}, {}] });
g.modifierModele('t1');
ok('séance NON enregistrée : on demande avant de la fermer', /^confirmer:/.test(g._trace[0]) && g._trace.indexOf('ouvrir:t1') < 0, g._trace.join());
g._ok && g._ok();
ok('… et l\'on ouvre après confirmation', g._trace.indexOf('ouvrir:t1') > 0, g._trace.join());
g = gestes({ blocs: [{}], _lastSavedHash: 'h1' });
g.modifierModele('t1');
ok('séance déjà enregistrée : pas de question', g._trace.join() === 'ouvrir:t1', g._trace.join());

g = gestes({ blocs: [{}], _lastSavedHash: 'h1', _builderFromTemplate: 't1' });
g.quitterModele();
ok('« Quitter le modèle » sans modification : on sort', g._trace.indexOf('reset') >= 0 && g._builderFromTemplate === null, g._trace.join());
g = gestes({ blocs: [{}, {}], _lastSavedHash: 'h1', _builderFromTemplate: 't1' });
g.quitterModele();
ok('… avec des modifications : on demande d\'abord', /^confirmer:/.test(g._trace[0]) && g._trace.indexOf('reset') < 0, g._trace.join());

g = gestes({ blocs: [{}], _builderFromTemplate: 't1' });
g.utiliserModele();
ok('« Utiliser pour un patient » sans patient : on le dit, le modèle reste ouvert', g._trace.indexOf('alerte') >= 0 && g._builderFromTemplate === 't1', g._trace.join());
g = gestes({ blocs: [{}], _builderFromTemplate: 't1', _progPatient: { prenom: 'Antoine', nom: 'Peronnaud' } });
g.utiliserModele();
ok('avec un patient : le contenu devient SA séance, le lien au modèle tombe', g._builderFromTemplate === null && g._currentProgId === null && g._currentSeanceId === null, String(g._builderFromTemplate));
ok('… à enregistrer, et les boutons suivent', g._builderSaved === false && g._trace.indexOf('bouton') >= 0 && g._trace.indexOf('titre') >= 0, g._trace.join());

/* ── Le bandeau de mode ──────────────────────────────────────────────────── */
console.log('\nLe bandeau dit le mode');
function bandeau(etat) {
  const bar = { innerHTML: '', textContent: '', style: {}, _cl: {} };
  bar.classList = { toggle: (k, f) => { if (f) bar._cl[k] = true; else delete bar._cl[k]; }, add: k => { bar._cl[k] = true; }, remove: k => { delete bar._cl[k]; }, contains: k => !!bar._cl[k] };
  const ctx = vm.createContext(Object.assign({
    _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null,
    _sidebarProgs: [T1], _progPatient: null, _builderDate: '', _activeGroupNom: '',
    escH: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    document: { getElementById: id => (id === 'builderDateBar' ? bar : null) }
  }, etat));
  try { vm.runInContext(fn('_majBandeauMode'), ctx); ctx._majBandeauMode(); } catch (e) { bar.innerHTML = 'ERREUR ' + e.message; }
  return bar;
}
let b = bandeau({ _builderFromTemplate: 't1' });
ok('modification d\'un modèle : bandeau ambre, qui le nomme', b._cl['mode-modele'] && /Modification du modèle « WARM-UP MARP — Lower »/.test(b.innerHTML), b.innerHTML.slice(0, 160));
ok('… dit qu\'aucun patient n\'est concerné', /aucun patient n.est concerné/.test(b.innerHTML));
ok('… et offre d\'en sortir', /quitterModele\(\)/.test(b.innerHTML) && /Quitter le modèle/.test(b.innerHTML));
b = bandeau({ _progPatient: { prenom: 'Antoine', nom: 'Peronnaud' }, _builderDate: '2026-09-01' });
ok('séance d\'un patient : son nom et la date, sans la couleur du modèle', /Séance d.Antoine Peronnaud/.test(b.innerHTML + b.textContent) && /1 septembre 2026/.test(b.innerHTML + b.textContent) && !b._cl['mode-modele'],
   (b.innerHTML || b.textContent).slice(0, 160));
b = bandeau({ _builderMode: 'template' });
ok('nouveau modèle : même bandeau ambre', b._cl['mode-modele'] && /Nouveau modèle/.test(b.innerHTML), b.innerHTML.slice(0, 120));
ok('le bandeau est rafraîchi avec les boutons (appelé par _refreshSaveBtn)', /_majBandeauMode\(\)/.test(fn('_refreshSaveBtn')));

/* ── Les boutons et leurs mots ───────────────────────────────────────────── */
console.log('\nLes boutons disent ce qu\'ils font');
const picker = fn('_pickerRenderTemplate');
ok('bibliothèque : « Ajouter à la séance » et « Modifier le modèle », côte à côte', /Ajouter à la séance/.test(picker) && /modifierModele\(/.test(picker) && /Modifier le modèle/.test(picker));
/* Le ⤓ de l'en-tête faisait la même chose que « + Ajouter à la séance » :
   un seul bouton par geste — celui qui dit ce qu'il fait. */
ok('plus de ⤓ en doublon de « Ajouter à la séance »', !/picker-load-btn/.test(picker) && !/picker-load-btn/.test(html));
ok('panneau Biblio : un crayon à côté de « Ajouter »', /builder-lib-edit[^>]*modifierModele\(/.test(pmain));
ok('répertoire : « Modifier le modèle », plus « Ouvrir dans le builder »', /modifierModele\([^)]*\)">Modifier le modèle</.test(fn('_renderTmplCardTree')) && !/Ouvrir dans le builder/.test(fn('_renderTmplCardTree')));
ok('« Utiliser pour un patient » existe dans l\'en-tête du builder', /id="builder-utiliser-btn"[^>]*onclick="utiliserModele\(\)"/.test(html));
const rsb = fn('_refreshSaveBtn');
ok('… affiché en mode modèle, masqué ailleurs', /utilBtn\.style\.display = enModele \? '' : 'none'/.test(rsb));
['.builder-date-bar.mode-modele', '.picker-edit-all', '.builder-lib-edit', '.stmpl-card-tree-open'].forEach(s => ok(s + ' est défini', html.indexOf(s + ' {') > 0 || html.indexOf(s + ',') > 0));

console.log('\nL\'aide suit');
ok('elle ne décrit plus le changement de sens silencieux', !/n.apparaît que si le modèle est seul/.test(aide) && !/« Ouvrir dans le builder »/.test(aide));
ok('elle nomme les deux verbes', /Ajouter à la séance/.test(aide) && /Modifier le modèle/.test(aide));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Modèles : un bouton, un verbe.');

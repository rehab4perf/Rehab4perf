#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Programme — le nom du patient se lit une fois, en haut

   Demandé par le praticien (2026-09-13), captures à l'appui : « beaucoup
   d'endroits le nom du patient. Pas utile. Je le vois en haut de mon sélecteur
   patient. Idem pour modifier un modèle. »

   Le nom du patient était rappelé :
     - dans la barre du programme (« Mathis Bouchez », ou « Aucun patient
       sélectionné » alors que la barre de l'application disait Zied) ;
     - au-dessus de l'agenda (« 👤 … ») ;
     - dans le bandeau du builder ;
     - dans le champ de nom de la séance, prérempli — et ce nom devenait celui
       de la SÉANCE : l'agenda de Maeva affichait « J+16 · Maeva Zara » partout.
   Le nom d'un modèle ouvert l'était quatre fois : titre, bouton, bandeau, champ.

   Décisions du praticien :
     - le champ reste vide (« Nom de la séance (facultatif) ») ; sans nom, la
       séance s'appelle « Séance ». Une séance déjà enregistrée au nom du
       patient se lit « Séance » — rien n'est réécrit en base ;
     - le nom du modèle reste dans le titre, seulement : « Mettre à jour le
       modèle », « Modification d'un modèle », champ masqué (il n'agit pas sur
       le modèle, qui se renomme par « … › Modifier »).

     node qualite/rappels-nom-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fd = fnDe(pdata), fm = fnDe(pmain);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ── Les rappels retirés ─────────────────────────────────────────────────── */
console.log('\nPlus de rappel du patient dans le programme');
ok('la barre du programme ne porte plus de puce patient', !/id="topbarPatientName"/.test(html) && !/id="topbarPatientEmpty"/.test(html));
ok('… ni l\'agenda son « 👤 nom »', !/id="calPatientLabel"/.test(html));
ok('le champ de nom de séance ne se préremplit plus avec le patient',
   !/pnEl\.value = _progPatient\.prenom/.test(pdata) && !/pnEl\.value = _progPatient\.nom/.test(pdata));
ok('… et le dit : « Nom de la séance (facultatif) »', /id="patientName" placeholder="Nom de la séance \(facultatif\)"/.test(html));

/* ── Le nom d'une séance ─────────────────────────────────────────────────── */
console.log('\nLe nom d\'une séance');
const ctx = vm.createContext({ _progPatient: { prenom: 'Maeva', nom: 'Zara' } });
try { vm.runInContext(['_nomPatientCourant', '_nomSeancePropre', '_libelleSeance'].map(fd).join('\n'), ctx); }
catch (e) { ok('les fonctions se chargent', false, e.message); }
const essai = (f, v) => { try { return ctx[f](v); } catch (e) { return 'ERREUR ' + e.message; } };
ok('une séance enregistrée au nom du patient se lit « Séance »', essai('_libelleSeance', 'Maeva Zara') === 'Séance' && essai('_libelleSeance', 'zara  maeva') === 'Séance',
   essai('_libelleSeance', 'Maeva Zara') + ' / ' + essai('_libelleSeance', 'zara  maeva'));
ok('… une séance sans nom aussi', essai('_libelleSeance', '') === 'Séance' && essai('_libelleSeance', null) === 'Séance');
ok('… un vrai nom reste le sien', essai('_libelleSeance', 'Force bas du corps') === 'Force bas du corps');
ok('rouvrir une ancienne séance ne remet pas le patient dans le champ', essai('_nomSeancePropre', 'Maeva Zara') === '' && /pnEl\.value = _nomSeancePropre\(d\.nom\)/.test(fd('_loadProg') || pdata));
ok('l\'agenda et « Prochaines séances » affichent ce libellé',
   (pmain.match(/var nom = _libelleSeance\(ev\.programmes&&ev\.programmes\.nom\);/g) || []).length === 2 && !/\(ev\.programmes&&ev\.programmes\.nom\)\|\|'Programme'/.test(pmain));
ok('sans nom, une séance s\'enregistre « Séance » (plus « Programme », ni le nom du patient)',
   !/getElementById\('patientName'\)\|\|\{\}\)\.value \|\| (_patName|'Programme'|\('Programme du )/.test(pmain + pdata),
   ((pmain + pdata).match(/getElementById\('patientName'\)\|\|\{\}\)\.value \|\| [^;]+;/g) || []).join(' | '));
ok('les exports nomment le vrai patient, pas le champ de la séance',
   /var patient = _nomPatientCourant\(\) \|\| 'Patient';/.test(fd('buildExportHTML')) && /_nomPatientCourant\(\)\|\|'prescription'/.test(fd('downloadExport'))
   && /var patient = _nomPatientCourant\(\);/.test(fm('exportCycles')));

/* ── Le builder ──────────────────────────────────────────────────────────── */
console.log('\nLe builder');
function bandeau(etat) {
  const bar = { innerHTML: 'x', textContent: '', style: {}, _cl: {} };
  bar.classList = { toggle: (k, f) => { if (f) bar._cl[k] = true; else delete bar._cl[k]; }, add: k => { bar._cl[k] = true; }, remove: k => { delete bar._cl[k]; }, contains: k => !!bar._cl[k] };
  const c = vm.createContext(Object.assign({
    _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null, _groups: [],
    _sidebarProgs: [{ id: 't1', nom: 'WARM-UP MARP — Lower body', phase_nom: 'Lower body', group_id: 'g1' }],
    _progPatient: { prenom: 'Zied', nom: 'Ben Yahmed' }, _builderDate: '2026-09-14', _activeGroupNom: '', escH: esc,
    document: { getElementById: id => (id === 'builderDateBar' ? bar : null) }
  }, etat));
  try { vm.runInContext(fm('_nomModele') + fm('_majBandeauMode'), c); c._majBandeauMode(); } catch (e) { bar.innerHTML = 'ERREUR ' + e.message; }
  return bar;
}
let b = bandeau({});
ok('séance d\'un patient : pas de bandeau, pas de nom', b.style.display === 'none' && !/Zied|Ben Yahmed/.test(b.innerHTML), JSON.stringify({ d: b.style.display, h: b.innerHTML.slice(0, 80) }));
b = bandeau({ _builderFromTemplate: 't1', _groups: [{ id: 'g1', nom: 'WARM-UP RAMP' }] });
ok('modèle ouvert : le bandeau dit le mode, sans répéter le nom', /Modification d’un modèle/.test(b.innerHTML) && !/WARM-UP|Lower body/.test(b.innerHTML) && /Quitter le modèle/.test(b.innerHTML), b.innerHTML.slice(0, 140));
ok('le bouton : « Mettre à jour le modèle »', /'Mettre à jour<span class="btn-label"> le modèle<\/span>'/.test(fm('_refreshSaveBtn')) && !/_mNom/.test(fm('_refreshSaveBtn')));
{
  const el = {};
  const mk = id => (el[id] = el[id] || { textContent: '', innerHTML: '', style: {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } });
  const c = vm.createContext({ _builderMode: 'seance', _builderFromTemplate: 't1', _currentSeanceId: null, _currentProgId: null, _groups: [{ id: 'g1', nom: 'WARM-UP RAMP' }],
    _sidebarProgs: [{ id: 't1', nom: 'WARM-UP MARP — Lower body', phase_nom: 'Lower body', group_id: 'g1' }], _progPatient: null, _builderDate: '', _activeGroupNom: '', escH: esc,
    document: { getElementById: id => mk(id) } });
  try { vm.runInContext(fm('_nomModele') + fm('_majBandeauMode') + fm('_updateBuilderTitle'), c); c._updateBuilderTitle(); } catch (e) { mk('builderTitle').textContent = 'ERREUR ' + e.message; }
  ok('le titre garde le nom du modèle, une fois', mk('builderTitle').textContent === 'Modèle : WARM-UP RAMP — Lower body', mk('builderTitle').textContent);
  ok('… et le champ de nom est masqué (il n\'agit pas sur le modèle)', mk('patientName').style.display === 'none', JSON.stringify(mk('patientName').style));
  c._builderFromTemplate = null; c._builderDate = '2026-09-14';
  try { c._updateBuilderTitle(); } catch (e) {}
  ok('… il revient pour une séance', mk('patientName').style.display === '' && mk('builderTitle').textContent === 'Séance du 14 septembre', mk('builderTitle').textContent);
}
/* Le « · » séparait le nom du patient du protocole, sur la même ligne. Le nom
   parti, il restait seul devant « LCA — Phase 1 » (vu en ligne sur la démo). */
ok('le protocole ne garde pas de « · » orphelin devant lui',
   !/#builder-proto-banner::before \{ content:'·'/.test(html) && /\n#builder-proto-banner::before \{ content:none; \}/.test(html));
/* … et sa marge : elle venait du nom du patient qui le précédait. Seul sur la
   ligne, il était collé au bord (vu en ligne sur la démo). */
ok('… ni collé au bord : il a sa propre marge, alignée sur le champ de nom',
   /#builder-proto-banner \{[^}]*padding:6px 14px;/.test(html));
ok('« + Ajouter » reste à droite quand le champ est masqué', /<span style="position:relative;margin-left:auto;"><button class="btn btn-outline" onclick="ouvrirMenuAjout\(event,-1\)"/.test(html));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Programme : le nom du patient se lit une fois, en haut ; celui du modèle, dans le titre.');

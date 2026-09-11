#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — un mot par chose, une ligne par information

   Inventaire fait avec le praticien après « un bouton, un verbe » :
     1. « Bibliothèque » voulait dire trois choses : le répertoire des modèles
        (agenda), l'onglet des modèles (builder), la bibliothèque d'exercices.
        L'aide disait déjà « onglet Modèles ». → « Exercices | Modèles »,
        panneau « Modèles » ; « Bibliothèque » ne désigne plus que le panneau
        latéral du builder (exercices et modèles).
     2. Le nom du patient s'affichait jusqu'à six fois. → le TITRE dit ce qu'on
        fait (« Séance du 15 septembre », « Nouvelle séance », « Modèle : … »),
        UNE ligne dit pour qui.
     3. Deux bandeaux empilés (séance, protocole). → une seule ligne :
        « Thomas Martin · LCA — Phase 1 · Lier à cette phase ».
     4. Un panneau « Biblio 2 colonnes » masqué en permanence, avec ses
        propres boutons : du code mort, qui a trompé l'inventaire. → retiré.
     5. Trois styles d'icônes (📅, 🔄, dessinées). → dessinées.
     6. « Feedback » sur une séance neuve : l'identifiant d'une séance CAP ou
        HSR ouverte plus tôt n'était jamais effacé. → effacé, et masqué sur un
        modèle.
     7. La séance vide ne proposait que « Ajoutez un bloc ». → « + Ajouter un
        bloc » et « Partir d'un modèle », qui ouvre l'onglet Modèles.

     node qualite/builder-clarte-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
const aide = fs.readFileSync(path.join(R, 'js', 'aide-content.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fn = fnDe(pmain);
const EMOJI = /[\u{1F300}-\u{1FAFF}]|[☀-➿]️?/u;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ── 4. Le panneau mort ──────────────────────────────────────────────────── */
console.log('\nLe panneau « Biblio 2 colonnes », masqué en permanence, a disparu');
['renderBuilderLibrary', '_renderBuilderLibraryUI', 'renderTemplatesInBuilder', '_toggleLibCat', '_selectLibGroup'].forEach(n =>
  ok(n + ' : ni définie ni appelée', !new RegExp('\\b' + n + '\\(').test(pmain + pdata)));
ok('ni son conteneur, ni sa clé de stockage, ni son style', !/templatesBuilderArea/.test(html + pmain) && !/LIB_CAT_COLLAPSED/.test(pdata + pmain) && !/\.builder-lib/.test(html));

/* ── 1. Le vocabulaire ───────────────────────────────────────────────────── */
console.log('\n« Bibliothèque » ne veut plus dire trois choses');
ok('les onglets du builder : « Exercices | Modèles »', />Exercices<\/button>/.test(html) && /id="sb-tab-btn-picker"[^>]*>Modèles<\/button>/.test(html),
   (html.match(/id="sb-tab-btn-picker"[^>]*>[^<]*/) || ['absent'])[0]);
ok('le panneau de l\'agenda s\'appelle « Modèles »', /class="stmpl-title">Modèles</.test(html));
ok('la recherche de l\'onglet Modèles cherche des modèles (et les exercices qu\'ils contiennent)', /id="pickerSearch"[^>]*placeholder="Rechercher un modèle ou un exercice…"/.test(html));
const toggle = fn('_updateSidebarToggleBtn');
ok('le bouton du haut nomme ce qu\'il ouvre : « Bibliothèque » dans le builder, « Modèles » sur l\'agenda',
   /btn-label"> Bibliothèque</.test(toggle) && /btn-label"> Modèles</.test(toggle) && !/> Biblio</.test(toggle + html));

/* ── 2 et 3. Le titre et la ligne du patient ─────────────────────────────── */
console.log('\nLe titre dit ce qu\'on fait, une seule ligne dit pour qui');
function entete(etat) {
  const el = {};
  const mk = id => (el[id] = el[id] || { id, textContent: '', innerHTML: '', style: {}, _cl: {},
    classList: { toggle(k, f) { if (f) el[id]._cl[k] = 1; else delete el[id]._cl[k]; }, add(k) { el[id]._cl[k] = 1; }, remove(k) { delete el[id]._cl[k]; }, contains: k => !!el[id]._cl[k] } });
  const ctx = vm.createContext(Object.assign({
    _builderMode: 'seance', _builderFromTemplate: null, _currentSeanceId: null, _currentProgId: null, _sidebarProgs: [{ id: 't1', nom: 'Routine genou' }],
    _progPatient: { prenom: 'Thomas', nom: 'Martin' }, _builderDate: '', _activeGroupNom: '', escH: esc,
    document: { getElementById: id => mk(id) }
  }, etat));
  vm.runInContext(fn('_updateBuilderTitle') + fn('_majBandeauMode'), ctx);
  ctx._updateBuilderTitle();
  return { titre: mk('builderTitle').textContent, bandeau: mk('builderDateBar') };
}
let e = entete({ _builderDate: '2026-09-15' });
ok('séance datée : « Séance du 15 septembre », sans le nom du patient', e.titre === 'Séance du 15 septembre', e.titre);
ok('… le patient est dans la ligne sous l\'en-tête', /Thomas Martin/.test(e.bandeau.innerHTML) && !e.bandeau._cl['mode-modele'], e.bandeau.innerHTML.slice(0, 120));
ok('… sans répéter la date (le titre la porte)', !/15 septembre/.test(e.bandeau.innerHTML));
e = entete({});
ok('séance sans date : « Nouvelle séance »', e.titre === 'Nouvelle séance', e.titre);
e = entete({ _builderFromTemplate: 't1' });
ok('modèle : « Modèle : Routine genou »', e.titre === 'Modèle : Routine genou', e.titre);
ok('aucune icône-emoji dans la ligne (📅, ✎ → icônes dessinées)', !EMOJI.test(e.bandeau.innerHTML + entete({ _builderDate: '2026-09-15' }).bandeau.innerHTML) && /<svg/.test(e.bandeau.innerHTML));
ok('le protocole partage la ligne du patient', /class="builder-mode-row"[^>]*>\s*<div class="builder-date-bar" id="builderDateBar"><\/div>\s*<div id="builder-proto-banner"/.test(html),
   (html.match(/<div[^>]*builder-mode-row[\s\S]{0,200}/) || ['absent'])[0]);
const proto = fn('_builderRenderProtoBanner') + fn('_builderRenderProtoBannerDone');
ok('… et ne répète plus le nom du patient', !/patName \?/.test(proto) && !/<strong>' \+ patName/.test(proto));
ok('« Mettre à jour le modèle » a l\'icône d\'enregistrement, pas 🔄', !/🔄/.test(fn('_refreshSaveBtn')) && /_PROG_SAVE_ICON \+ 'Mettre à jour/.test(fn('_refreshSaveBtn')));

/* ── 6. Feedback ─────────────────────────────────────────────────────────── */
console.log('\n« Feedback » n\'apparaît que sur une séance qui existe');
function fb(etat) {
  const btn = { style: {}, classList: { add() {}, remove() {} } };
  const ctx = vm.createContext(Object.assign({ _currentSeanceId: null, _capBbSeanceId: null, _hsrBbSeanceId: null, _builderMode: 'seance',
    _builderFromTemplate: null, _currentProgId: null, document: { getElementById: () => btn } }, etat));
  vm.runInContext(fn('_updateFeedbackBtn'), ctx); ctx._updateFeedbackBtn(false);
  return btn.style.display;
}
ok('séance enregistrée : visible', fb({ _currentSeanceId: 's1' }) === 'inline-flex');
ok('modèle ouvert : masqué, même avec un identifiant CAP resté', fb({ _builderFromTemplate: 't1', _capBbSeanceId: 'c9' }) === 'none');
ok('une nouvelle séance efface les identifiants CAP / HSR d\'une séance précédente',
   /_capBbSeanceId = null/.test(fn('_resetBuilderState')) && /_hsrBbSeanceId = null/.test(fn('_resetBuilderState')) && /_updateFeedbackBtn\(false\)/.test(fn('_resetBuilderState')));
ok('… y compris depuis un clic sur un jour de l\'agenda', /_capBbSeanceId = null/.test(fn('openBuilderForDate')) && /_updateFeedbackBtn\(false\)/.test(fn('openBuilderForDate')));

/* ── 7. La séance vide ───────────────────────────────────────────────────── */
console.log('\nLa séance vide propose de partir d\'un modèle');
const rs = fnDe(pdata)('renderSession');
const vide = rs.slice(rs.indexOf("if(!blocs.length && !etapes.length)"), rs.indexOf('return;', rs.indexOf("if(!blocs.length && !etapes.length)")));
ok('deux boutons : « + Ajouter un bloc » et « Partir d\'un modèle »', /\+ Ajouter un bloc/.test(vide) && /Partir d.un modèle/.test(vide) && /ouvrirModeles\(\)/.test(vide), vide.slice(0, 200));
ok('… et plus l\'emoji 📋 ni le texte seul', !/📋/.test(vide));
const om = fn('ouvrirModeles');
ok('« Partir d\'un modèle » ouvre le panneau et l\'onglet Modèles', /_switchSidebarTab\('picker'\)/.test(om) && /collapsed/.test(om));
ok('l\'état initial de la page dit la même chose', /Partir d.un modèle/.test(html.slice(html.indexOf('id="sessionArea"'), html.indexOf('id="sessionArea"') + 900)));

/* ── L'aide ──────────────────────────────────────────────────────────────── */
/* ── Téléphone ───────────────────────────────────────────────────────────────
   Mesuré à 390 px : en mode modèle, « Mettre à jour « … » » et « Utiliser pour
   un patient » gardaient leur libellé entier — l'en-tête débordait de 130 px
   et poussait la fermeture hors de l'écran. */
console.log('\nSur téléphone');
ok('« Utiliser pour un patient » se replie en icône, comme ses voisins', /id="builder-utiliser-btn"[^>]*>\s*<svg[\s\S]{0,400}<span class="btn-label"> Utiliser pour un patient<\/span><\/button>/.test(html));
ok('« Mettre à jour » replie le nom du modèle', /'Mettre à jour<span class="btn-label"> « '/.test(fn('_refreshSaveBtn')));
ok('la ligne patient et le protocole s\'empilent sans « · » orphelin', /@media \(max-width:700px\) \{\n[\s\S]{0,300}#builder-proto-banner::before \{ content:none; \}/.test(html));
ok('la dernière tuile du bilan, seule sur sa rangée, prend la largeur', /\.bc-kpi:last-child:nth-child\(odd\) \{ grid-column:1 \/ -1; \}/.test(html));

console.log('\nL\'aide suit');
ok('elle parle du panneau « Modèles », plus de « Séances & modèles »', !/Séances & modèles/.test(aide));
ok('elle décrit la ligne du patient, plus « Séance d\'Antoine · 1 septembre »', !/Séance d\\'Antoine · 1 septembre/.test(aide) && /Partir d(\\'|’)un modèle/.test(aide));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : un mot par chose, une ligne par information.');

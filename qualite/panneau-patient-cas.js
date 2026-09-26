#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Agenda — la colonne « Patient »

   Retenue par le praticien sur le prototype du 2026-09-13 : avant de poser une
   séance, on consulte le cycle, la charge, les retours et ce qui vient. Tout
   était ailleurs — le cycle dans les cases, la charge sous l'agenda, les
   retours dans le Journal — et la colonne de l'agenda ne montrait que le
   répertoire des modèles.

   La colonne porte deux onglets : « Patient » (par défaut dès qu'un patient
   est choisi, le dernier choix est retenu) et « Modèles », inchangé.
     - cycle en cours : nom, « semaine k sur N », fin, avancement ;
     - charge : ACWR du jour, zone EN FRANÇAIS, 7 jours et chronique — mêmes
       calculs que le bilan de charge (_buildUaMap, _calcACWR) ;
     - derniers retours de l'athlète (pas l'EVA saisie par le praticien) ;
     - à venir : les prochaines séances. Sur ordinateur, la liste « Prochaines
       séances » sous l'agenda ferait doublon : elle ne reste que sur téléphone,
       où la colonne est repliée.
   Les échéances restent dans leur bande : elle porte leurs actions (fusion,
   acceptation, périodes), qu'une liste dans la colonne n'aurait pas.

     node qualite/panneau-patient-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const pdata = fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fnDe = src => n => { const d = src.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : src.slice(d, src.indexOf('\n}\n', d) + 3); };
const fm = fnDe(pmain), fd = fnDe(pdata);
const src = n => fm(n) || fd(n);

/* Des dates relatives à aujourd'hui : le rendu lit la vraie date du jour. */
const iso = dec => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dec); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const UA = {}; for (let i = 0; i < 28; i += 2) UA[iso(-i)] = 300;
const ev = (dec, nom, fb, id) => ({ id: id || 's' + dec, date: iso(dec), programme_id: 'p' + dec, programmes: { nom }, athlete_feedback: fb || null });
const CAL = [
  ev(-9, 'Séance A', { rpe: 6, duree_min: 45, douleur: 2, submitted_at: '2026-01-01' }),
  ev(-6, 'Séance B', { rpe: 7, duree_min: 50, douleur: 4 }),
  ev(-4, 'Séance <C>', { rpe: 5, duree_min: 40, douleur: 1 }),
  ev(-2, 'Séance EVA praticien', { rpe: 6, submitted_at: '2026-01-01T10:00:00Z', eva_praticien_at: '2026-01-02T10:00:00Z' }),
  ev(-1, 'Séance sans retour'),
  ev(1, 'Séance A'), ev(3, 'Séance B'), ev(5, 'Séance C'), ev(8, 'Séance A'), ev(10, 'Séance B')
];

function contexte(etat) {
  const c = vm.createContext(Object.assign({
    _progPatient: { prenom: 'Zied', nom: 'Ben Yahmed' },
    _cycles: [{ nom: 'Endurance de force', startDate: iso(-10), duree: 6, color: '#2B5FA6' }],
    _cycleColors: {}, _cloudCalEvents: CAL, _buildUaMap: () => UA,
    escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }, etat));
  vm.runInContext(['_dateStr', '_calcACWR', '_bcFmt', '_fbEstRetourPatient', '_fbDouleur', '_nomSeancePropre', '_libelleSeance',
    '_cyclesDuJour', '_cycleDuJour', '_zoneAcwrFr', '_panneauPatientHtml'].map(src).join('\n'), c);
  return c;
}
let h = '';
try { h = contexte({})._panneauPatientHtml(); } catch (e) { h = 'ERREUR ' + e.message; }
const carte = titre => { const i = h.indexOf('>' + titre); if (i < 0) return ''; const j = h.indexOf('<div class="pp-carte">', i); return h.slice(i, j < 0 ? h.length : j); };

console.log('\nLe cycle en cours');
const cy = carte('Cycle en cours');
ok('son nom et où on en est : semaine 2 sur 6', /Endurance de force/.test(cy) && /Semaine 2 sur 6/.test(cy), cy.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140));
ok('… sa fin, et une barre d\'avancement (2/6 = 33 %)', /jusqu’au/.test(cy) && /width:33%/.test(cy));
ok('… et un accès aux cycles', /onclick="openCycles\(\)"/.test(cy));
/* Décision du praticien (13/09) : la carte devient le SEUL accès aux cycles —
   elle doit permettre d'en créer, pas seulement de consulter. */
ok('… et d\'en créer un, directement', /onclick="_ppNouveauCycle\(\)"[^>]*>\+ Nouveau cycle</.test(cy));
ok('« + Nouveau cycle » ouvre le formulaire de création', /openCycles\(\);\s*openCycleForm\(null\);/.test(fm('_ppNouveauCycle')));

console.log('\nLa charge');
const ch = carte('Charge');
ok('l\'ACWR du jour, en chiffres français', /ACWR \d+,\d+|ACWR \d+ /.test(ch), ch.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140));
ok('… sa zone en français (pas « Sweet spot »)', /zone favorable|sous-charge|prudence|zone à risque|données insuffisantes/.test(ch) && !/Sweet spot/i.test(h));
ok('… la charge 7 jours et la chronique', /7 jours : [\d\s\u00a0\u202f]+ UA/.test(ch) && /chronique [\d\s\u00a0\u202f]+ UA\/sem\./.test(ch));   // milliers : espace fine insécable (fr-FR)
ok('… et l\'Évolution à un clic (plus dans le menu ···)', /onclick="openChargesEvo\(\)">Évolution</.test(ch));
/* Le curseur du prototype : la zone se lit d'un coup d'œil, avant le chiffre. */
{
  const r = (ch.match(/ACWR (\d+),(\d+)/) || []).slice(1).join('.');
  const pos = r ? Math.round(Math.min(+r, 2) / 2 * 1000) / 10 : null;
  ok('le curseur ACWR : quatre zones, et l\'aiguille à sa place (échelle 0–2)',
     /class="pp-jauge"/.test(ch) && (ch.match(/class="z\d"/g) || []).length === 4 && pos !== null && ch.indexOf('<i style="left:' + pos + '%"></i>') > 0, 'ACWR ' + r + ' → ' + pos + ' %');
  ok('… repères 0,8 et 1,3 (la zone favorable)', /<span style="left:40%">0,8<\/span><span style="left:65%">1,3<\/span>/.test(ch));
}

console.log('\nLes derniers retours');
const rt = carte('Derniers retours');
const noms = [...rt.matchAll(/<span class="pp-nom">([^<]*)<\/span>/g)].map(m => m[1]);
ok('les trois plus récents, du plus récent au plus ancien', noms.join(' | ') === 'Séance &lt;C&gt; | Séance B | Séance A', noms.join(' | '));
ok('… sans l\'EVA saisie par le praticien, ni une séance sans retour', !/EVA praticien|sans retour/.test(rt));
ok('… avec la RPE et l\'EVA, colorée selon la douleur', /RPE 7/.test(rt) && /bi-orange">EVA 4/.test(rt) && /bi-green">EVA 1/.test(rt));
ok('… un clic ouvre la séance sur son retour (identifiants entre guillemets)', /onclick="_openChipInBuilder\('p-4','[\d-]+','s-4',true\)"/.test(rt), (rt.match(/onclick="[^"]*"/) || [''])[0]);
ok('… et le Journal est à un clic', /onclick="openJournal\(\)"/.test(rt));

/* Vu en ligne sur la démo : « mar. 14 » pour un retour du 14 JUILLET — sans le
   mois, on le lisait en septembre, un jour qui n'était pas encore arrivé. */
{
  const ctxD = contexte({ _cloudCalEvents: [ev(-75, 'Séance ancienne', { rpe: 5, duree_min: 40 })] });
  let hd = ''; try { hd = ctxD._panneauPatientHtml(); } catch (e) { hd = 'ERREUR ' + e.message; }
  const d = (hd.match(/<span class="pp-date">([^<]*)<\/span>/) || [])[1] || '';
  const vieux = new Date(); vieux.setHours(0, 0, 0, 0); vieux.setDate(vieux.getDate() - 75);
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  ok('une date d\'un autre mois porte son mois (« mar. 14 juil. »)', d.endsWith(' ' + MOIS[vieux.getMonth()]) && d.indexOf(String(vieux.getDate())) > 0, d);
  const d4 = (h.match(/<span class="pp-date">([^<]*)<\/span>/g) || []).map(x => x.replace(/<[^>]+>/g, ''));
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const memeMois = dec => { const x = new Date(auj); x.setDate(x.getDate() + dec); return x.getMonth() === auj.getMonth(); };
  ok('… et une date du mois en cours reste courte', d4.length > 0 && d4.every((x, i) => true) && (memeMois(-4) ? !/\s(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)/.test(d4[0]) : true), d4.join(' | '));
}

console.log('\nÀ venir');
const av = carte('À venir');
const nav = [...av.matchAll(/<span class="pp-nom">([^<]*)<\/span>/g)].map(m => m[1]);
ok('les quatre prochaines séances, dans l\'ordre', nav.join(' | ') === 'Séance A | Séance B | Séance C | Séance A', nav.join(' | '));

console.log('\nCas limites');
let h2 = 'x';
try { h2 = contexte({ _progPatient: null })._panneauPatientHtml(); } catch (e) { h2 = 'ERREUR ' + e.message; }
ok('sans patient : rien', h2 === '');
let h3 = '';
try { h3 = contexte({ _cycles: [], _cloudCalEvents: [], _buildUaMap: () => ({}) })._panneauPatientHtml(); } catch (e) { h3 = 'ERREUR ' + e.message; }
ok('données insuffisantes : la jauge sans aiguille', /class="pp-jauge"/.test(h3) && !/pp-jauge[^]*?<i style="left/.test(h3.slice(h3.indexOf('pp-jauge'), h3.indexOf('pp-jauge-lbl'))));
ok('patient sans données : chaque carte le dit, sans chiffre inventé', /Aucun cycle en cours/.test(h3) && /Aucun retour récent/.test(h3) && /Aucune séance planifiée/.test(h3) && /données insuffisantes/.test(h3), h3.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));

console.log('\nLes onglets');
{
  const el = {}; const mk = id => (el[id] = el[id] || { style: {}, disabled: false, _cl: new Set(), classList: { toggle(k, f) { f ? this._s.add(k) : this._s.delete(k); }, _s: null } });
  ['stmplPatient', 'stmplModeles', 'stmpl-onglet-patient', 'stmpl-onglet-modeles'].forEach(id => { mk(id).classList._s = mk(id)._cl; });
  const store = {};
  const c = vm.createContext({ _progPatient: { prenom: 'Z' }, R4P_KEYS: { ONGLET_COLONNE: 'k' }, document: { getElementById: id => el[id] || null },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } } });
  try { vm.runInContext('var _ongletColonneCourant = null;\n' + fm('_ongletColonne') + fm('_appliquerOngletColonne'), c); } catch (e) { ok('les onglets se chargent', false, e.message); }
  try { c._appliquerOngletColonne(); } catch (e) {}
  ok('par défaut, avec un patient : l\'onglet Patient', el.stmplPatient.style.display === 'flex' && el.stmplModeles.style.display === 'none' && el['stmpl-onglet-patient']._cl.has('active'));
  try { c._ongletColonne('modeles'); } catch (e) {}
  ok('choisir Modèles montre le répertoire, et s\'en souvient', el.stmplModeles.style.display === 'flex' && el.stmplPatient.style.display === 'none' && store.k === 'modeles');
  c._progPatient = null; c._ongletColonneCourant = 'patient';
  try { c._appliquerOngletColonne(); } catch (e) {}
  ok('sans patient : Modèles, et l\'onglet Patient désactivé', el.stmplModeles.style.display === 'flex' && el['stmpl-onglet-patient'].disabled === true);
}

console.log('\nL\'agenda');
ok('la colonne porte les deux onglets, et le répertoire est rangé sous « Modèles »',
   /id="stmpl-onglet-patient"[^>]*>Patient</.test(html) && /id="stmpl-onglet-modeles"[^>]*>Modèles</.test(html)
   && /id="stmplPatient"/.test(html) && /<div id="stmplModeles">[\s\S]*id="stmplScroll"/.test(html));
ok('l\'onglet retenu a sa clé de stockage', /ONGLET_COLONNE\s*:\s*'r4p-onglet-colonne'/.test(pdata));
ok('la colonne se redessine avec l\'agenda (mois et semaine)', /setTimeout\(_renderPanneauPatient, 0\)/.test(fm('_renderCalendarUI')) && /setTimeout\(_renderPanneauPatient, 0\)/.test(fm('_renderWeekUI')));
const mob = html.slice(html.indexOf('@media (max-width:700px) {\n'));
ok('« Prochaines séances » sous l\'agenda : téléphone seulement (la colonne l\'affiche ailleurs)', /\n#upcomingList \{ display:none; \}/.test(html) && /\n  #upcomingList \{ display:block; \}/.test(mob));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Agenda : la colonne « Patient » dit le cycle, la charge, les retours et la suite.');

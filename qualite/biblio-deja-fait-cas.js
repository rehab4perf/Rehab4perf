#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Bibliothèque du builder — le filtre « Déjà fait »

   Demandé par le praticien (2026-09-18) : « lorsque je veux mettre un exo
   réalisé sur une ancienne séance, et que je ne me souviens plus du nom, je
   suis bloqué ».

   La liste se construit depuis les SÉANCES du patient, jamais depuis LIBRARY
   ni depuis _histExos.map :

   - un exercice tapé À LA MAIN n'a pas d'entrée de catalogue, et c'est
     précisément celui qu'aucune recherche ne retrouve ;
   - _extractExoLoads écarte tout exercice sans répétitions chiffrées et sans
     1RM calculable — étirement, mobilité, exercice fait une seule fois. Une
     liste bâtie dessus aurait l'air complète sans l'être, et rien ne l'aurait
     signalé.

   Le « + » ne peut pas passer par addExoFromLib seule : elle sort sans rien
   faire sur un identifiant absent de LIBRARY. Nom connu du catalogue → ajout
   normal, avec vidéo et objectif ; sinon → exercice libre, nom déjà rempli.

   Et « Évolution » revient dans le menu ··· du builder (demande du même jour,
   décision du 2026-09-15 inversée) : c'est une MODALE, elle s'ouvre par-dessus
   le builder sans rien fermer.

     node qualite/biblio-deja-fait-cas.js
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

/* Des séances réelles : un exercice de catalogue, un étirement SANS
   répétitions, un exercice fait une seule fois, un manuscrit, et la même
   chose écrite de trois façons. */
const prog = (date, exos) => ({ id: 's' + date, date, programme_id: 'p' + date, programmes: { nom: 'Séance', donnees: { blocs: [{ exos }] } } });
const SEANCES = [
  prog('2026-07-06', [{ name: 'Squat bulgare', reps: '10', cibles: [{ type: 'kg', min: '20', max: '20' }], libId: 'renfo-42', url: 'https://youtu.be/ZZZ' },
                      { name: 'Étirement psoas', reps: '', duree: '', cibles: [] },
                      { name: 'Pont fessier une jambe', reps: '12', cibles: [] }]),
  prog('2026-08-24', [{ name: 'squat bulgare ', reps: '10', cibles: [{ type: 'kg', min: '24', max: '24' }], libId: 'renfo-42' },
                      { name: 'Copenhague excentrique maison', reps: '', duree: '30s', cibles: [], url: 'https://youtu.be/BBB' }]),
  prog('2026-09-14', [{ name: 'Squat Bulgare', reps: '8', cibles: [{ type: 'kg', min: '28', max: '28' }], url: 'https://youtu.be/AAA' },
                      { name: '', reps: '10', cibles: [] }])
];

const c = vm.createContext({ escH: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') });
try {
  vm.runInContext(['_norm', '_cleExo', '_dateCourteFr', '_dejaFaitListe'].map(fd).join('\n'), c);
} catch (e) { ok('les fonctions se chargent', false, e.message); }
let L = [];
try { L = c._dejaFaitListe(SEANCES); } catch (e) { ok('_dejaFaitListe tourne', false, e.message); }
const noms = L.map(x => x.label);

console.log('\nLa liste vient des séances, pas du catalogue');
ok('un exercice SANS répétitions y est (étirement)', noms.indexOf('Étirement psoas') > -1, noms.join(' | '));
ok('un exercice en durée aussi', noms.indexOf('Copenhague excentrique maison') > -1, noms.join(' | '));
ok('un exercice fait UNE SEULE fois y est', noms.indexOf('Pont fessier une jambe') > -1, noms.join(' | '));
ok('un exercice sans nom est ignoré', noms.every(n => n.trim()), JSON.stringify(noms));
ok('casse, accents et espace finale ne font qu\'UNE ligne', noms.filter(n => c._cleExo(n) === 'squat bulgare').length === 1, noms.join(' | '));
ok('… au libellé de la DERNIÈRE fois', (L.find(x => x.cle === 'squat bulgare') || {}).label === 'Squat Bulgare', JSON.stringify(L.find(x => x.cle === 'squat bulgare')));
ok('… et à sa date la plus récente', (L.find(x => x.cle === 'squat bulgare') || {}).date === '2026-09-14');
ok('la plus récente d\'abord', L.length > 1 && L[0].date === '2026-09-14' && L[L.length - 1].date === '2026-07-06'
   && L.every((x, i) => i === 0 || L[i - 1].date >= x.date), L.map(x => x.label + ':' + x.date).join(' | '));
/* La vignette vient de la bibliothèque quand l'exercice y est, et de la
   séance sinon : un exercice tapé à la main peut porter une vidéo
   (qualite/deja-fait-filtres-cas.js). */
ok('l\'URL de la dernière fois est gardée', (L.find(x => x.cle === 'squat bulgare') || {}).url === 'https://youtu.be/AAA',
   JSON.stringify(L.find(x => x.cle === 'squat bulgare')));
ok('… y compris pour un exercice tapé à la main',
   (L.find(x => x.cle === 'copenhague excentrique maison') || {}).url === 'https://youtu.be/BBB', JSON.stringify(L.find(x => x.cle === 'copenhague excentrique maison')));
ok('la date se lit en clair', (() => { try { return c._dateCourteFr('2026-09-14') === '14 sept.'; } catch (e) { return false; } })());

console.log('\nCe que _histExos.map perdait — la raison de ne pas s\'en servir');
{
  const c2 = vm.createContext({});
  try {
    vm.runInContext(['_norm', '_cleExo', '_repsUnite', '_1rm', '_extractExoLoads'].map(fd).join('\n'), c2);
    const m = c2._extractExoLoads(SEANCES, 1);
    ok('l\'étirement n\'y est PAS (donc la liste ne peut pas en venir)', !m['etirement psoas'], Object.keys(m).join(', '));
  } catch (e) { ok('_extractExoLoads tourne', false, e.message); }
}

console.log('\nLe « + » — un manuscrit s\'ajoute aussi');
ok('le bloc cible est partagé, pas recopié', /function _blocCibleAjout\(/.test(pdata) && /_blocCibleAjout\(\)/.test(fd('addExoFromLib')) && /_blocCibleAjout\(\)/.test(fd('addExoDejaFait')));
{
  const mk = () => {
    const blocs = [{ id: 'b1', exos: [] }];
    const ctx = vm.createContext({
      LIBRARY: [{ id: 'renfo-42', name: 'Squat bulgare ', url: 'http://v', obj: 'force', type: 'renfo' }],
      blocs, activeBloc: 'b1', genId: () => 'x1',
      _histExos: { pid: 'p1', faits: L },
      _blocsReels: () => blocs, _estMarqueur: () => false, addBloc: () => {},
      _hideLibPreview: () => {}, renderSession: () => {}, renderLib: () => {},
      document: { getElementById: () => null }
    });
    vm.runInContext(['_norm', '_cleExo', '_blocCibleAjout', 'addExoFromLib', 'addExoDejaFait'].map(fd).join('\n'), ctx);
    return { ctx, blocs };
  };
  const a = mk();
  try { a.ctx.addExoDejaFait('squat bulgare'); } catch (e) { ok('addExoDejaFait tourne', false, e.message); }
  const e1 = a.blocs[0].exos[0] || {};
  ok('un nom du catalogue : ajout normal, vidéo et objectif compris', e1.libId === 'renfo-42' && e1.url === 'http://v' && e1.obj === 'force' && !e1.free, JSON.stringify(e1));

  const b = mk();
  try { b.ctx.addExoDejaFait('copenhague excentrique maison'); } catch (e) { ok('addExoDejaFait tourne (manuscrit)', false, e.message); }
  const e2 = b.blocs[0].exos[0] || {};
  ok('un manuscrit : exercice libre, NOM DÉJÀ REMPLI', e2.free === true && e2.name === 'Copenhague excentrique maison' && !e2.libId, JSON.stringify(e2));
  ok('… avec la même forme qu\'un exercice libre créé à la main', ['reps', 'duree', 'series', 'cibles', 'tempo', 'recup', 'chained', 'consigne', 'perCote', 'nrs'].every(k => k in e2), Object.keys(e2).join(','));

  const d = mk();
  try { d.ctx.addExoDejaFait('jamais vu'); } catch (e) {}
  ok('un exercice inconnu n\'ajoute rien', d.blocs[0].exos.length === 0);
}

console.log('\nLe filtre dans la bibliothèque');
ok('un troisième bouton, à côté de « Tous » et « ⭐ Favoris »', /id="filterDejaFait" onclick="toggleDejaFaitFilter\(\)"/.test(html), (html.match(/id="filter[A-Za-z]+"/g) || []).join(' '));
ok('les deux filtres s\'excluent', /_favFilter = false/.test(fd('toggleDejaFaitFilter')) && /_dejaFaitFilter = false/.test(fd('toggleFavFilter')));
ok('« Tous » les éteint tous les deux', /_dejaFaitFilter = false/.test(fd('setFilterAll')) && /_favFilter = false/.test(fd('setFilterAll')));
ok('renderLib rend cette liste-là, pas LIBRARY', /if\(_dejaFaitFilter\)/.test(fd('renderLib')) && /_dejaFaitHtml\(/.test(fd('renderLib')));
ok('la recherche s\'y applique', /mots\.every/.test(fd('_dejaFaitHtml')) || /_norm\(q/.test(fd('_dejaFaitHtml')), fd('_dejaFaitHtml').slice(0, 200));
ok('un modèle n\'est à personne : pas de « déjà fait »', /_builderMode === 'template'/.test(fd('_dejaFaitHtml')));
ok('l\'attente se dit, le vide aussi', /Chargement/.test(fd('_dejaFaitHtml')) && /Aucun exercice/.test(fd('_dejaFaitHtml')));
ok('la clé part échappée dans le onclick', /escJS\(/.test(fd('_dejaFaitHtml')));

console.log('\nAucune requête de plus');
ok('la liste se construit dans le chargement DÉJÀ fait', /_histExos\.faits = Array\.isArray\(data\) \? _dejaFaitListe\(data\) : \[\];/.test(fd('_histExosCharger')));
ok('… et la bibliothèque se redessine quand elle arrive', /_dejaFaitFilter/.test(fd('_histExosRemplir')));

console.log('\n« Évolution » revient dans le menu ··· du builder');
const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="more-menu"') + 12000);
ok('le bouton est là', /id="moreMenuEvo"/.test(menu) && /openChargesEvo\(\)/.test(menu));
ok('… affiché dans le builder seulement', /_evo\.style\.display = \(_bp && _bp\.classList\.contains\('open'\)\) \? '' : 'none'/.test(fm('_toggleMoreMenu')), fm('_toggleMoreMenu').slice(0, 600));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bibliothèque : « Déjà fait » liste ce que le patient a fait, manuscrits compris.');

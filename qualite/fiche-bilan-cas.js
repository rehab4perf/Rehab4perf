#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   La fiche athlète reprend les valeurs du bilan quand elle n'a pas les siennes

   Poids, taille, activité et médecin existent à la fois dans la fiche (onglet
   Patients) et dans les infos du bilan. Les deux fusionnent :
   - fiche vide : elle AFFICHE, en grisé et datée, la valeur du bilan le plus
     récent (`r4pResolveFicheField`), et l'enregistre au prochain
     « Enregistrer la fiche » (`r4pValeurFiche`) — seulement si c'est elle qui
     était affichée : un champ rempli puis vidé ne se recomble pas ;
   - fiche remplie mais contraire au dernier bilan : l'écart est écrit sous le
     champ, avec « Reprendre » (`r4pEcartFicheBilan`). Avant, la fiche
     l'emportait en silence — 81 cm affichés contre 181 mesurés.
   Le bilan n'est jamais modifié depuis la fiche.

   LE DÉFAUT QUE CE FICHIER FERME : la requête qui charge les bilans
   (`fetchBilans`) ne rapatriait que TROIS clés — zones, diagnostic, sport —
   pour alléger le chargement. Le résolveur lisait `b.poids`, `b.taille`… sur
   des lignes qui ne les portaient pas : il ne trouvait jamais rien, et la
   fiche restait vide alors que le bilan contenait tout. Seul le sport
   fonctionnait. Rien ne le signalait.

   D'où la règle vérifiée ici : TOUT champ de la fiche adossé au bilan doit
   figurer dans la projection de la requête ET dans son repli.

     node qualite/fiche-bilan-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const pat = fs.readFileSync(path.join(R, 'patients.html'), 'utf8');
const data = fs.readFileSync(path.join(R, 'js', 'patients-data.js'), 'utf8');
const bilan = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}

/* Les champs de la fiche adossés au bilan, lus dans le VRAI rendu. */
const paires = [...pat.matchAll(/ficheField\(p,\s*'([a-z_]+)',\s*'([a-z_]+)'/g)].map(m => ({ fiche: m[1], bilan: m[2] }));
const dF = pat.indexOf('function fetchBilans(');
const fetchB = dF > 0 ? pat.slice(dF, pat.indexOf('\n}\n', dF)) : '';

console.log('\nChaque champ adossé au bilan est rapatrié par la requête');
ok('la fiche adosse des champs au bilan', paires.length >= 4, paires.map(p => p.fiche).join(', '));
paires.forEach(p => {
  ok(p.fiche + ' : le champ f-' + p.bilan + ' existe dans le bilan', new RegExp('id="f-' + p.bilan + '"').test(bilan));
  /* La projection nomme la colonne comme le résolveur la lit : `b[bilanKey]`. */
  ok(p.fiche + ' : dans la projection de la requête', fetchB.indexOf(p.bilan + ':donnees->>f-' + p.bilan) >= 0);
  /* Et dans le REPLI, pris quand la projection est refusée : sans lui, la
     même panne reviendrait par l'autre chemin. */
  ok(p.fiche + ' : dans le repli', new RegExp(p.bilan + ":\\s*d\\['f-" + p.bilan + "'\\]").test(fetchB));
});

console.log('\nLe résolveur, exécuté');
const dR = data.indexOf('function r4pResolveFicheField(');
const res = new Function(data.slice(dR, data.indexOf('\n}\n', dR) + 2) + '; return r4pResolveFicheField;')();
/* Des lignes EN FORME DE PROJECTION : c'est exactement ce que la fiche reçoit. */
const lignes = [
  { patient_id: 'T', date: '2026-01-20', poids: '80', taille: '181' },
  { patient_id: 'T', date: '2026-09-10', poids: '78', taille: '' },
  { patient_id: 'J', date: '2026-09-12', poids: '61' }
];
const vide = { id: 'T', poids: '', taille: null };
let r = res(vide, lignes, 'poids', 'poids');
ok('fiche vide : la valeur du bilan le plus RÉCENT', r.value === '78' && r.source === 'bilan', JSON.stringify(r));
ok('… datée', r.date === '2026-09-10');
r = res(vide, lignes, 'taille', 'taille');
ok('un bilan récent sans la valeur n\'efface pas celle d\'un plus ancien', r.value === '181', JSON.stringify(r));
ok('le bilan d\'un AUTRE patient n\'est jamais repris', res({ id: 'T' }, [lignes[2]], 'poids', 'poids').source === '');
ok('une fiche remplie fait foi', res({ id: 'T', poids: '77' }, lignes, 'poids', 'poids').value === '77');

/* ── Le vrai code, sur des bouchons ─────────────────────────────────────── */
const src = (s, nom) => { const d = s.indexOf('function ' + nom + '('); if (d < 0) throw new Error(nom + ' introuvable'); return s.slice(d, s.indexOf('\n}\n', d) + 2); };
const pd = require(path.join(R, 'js', 'patients-data.js'));
const [esc, fmtDate] = new Function(src(pat, 'esc') + src(pat, 'fmtDate') + 'return [esc, fmtDate];')();
const NOMS = Object.keys(pd), VALS = Object.values(pd);

/* `saveFiche` exécutée : on relève le PATCH qu'elle enverrait. */
function enregistrer(patient, saisies, bilans) {
  let patch = null;
  const document = { getElementById: id => /^fi-/.test(id) && id !== 'fi-save' && id !== 'fi-status'
    ? { value: saisies[id] || '' } : { disabled: false, className: '', textContent: '' } };
  const ch = { eq: () => ch, select: () => ch, single: () => ({ then: () => ({ catch: () => {} }) }) };
  const sb = { from: () => ({ update: p => { patch = p; return ch; } }) };
  new Function('document', 'sb', '_raw', '_currentPatientId', '_jours', '_antecedents', 'setTimeout', 'renderFiche', ...NOMS,
    src(pat, 'fVal') + src(pat, 'saveFiche') + '; saveFiche();')(
    document, sb, { patients: [patient], bilans }, patient.id, [], [], () => {}, () => {}, ...VALS);
  return patch || {};
}
/* `ficheField` exécutée : le HTML du champ. */
function champ(patient, bilans, key, opts) {
  return new Function('_raw', 'esc', 'fmtDate', ...NOMS, src(pat, 'ficheField') + '; return ficheField;')(
    { patients: [patient], bilans }, esc, fmtDate, ...VALS)(patient, key, key, 'Libellé', opts || {});
}
const B = [{ patient_id: 'T', date: '2026-09-10', poids: '78,5', taille: '181', activite: 'Technicien', medecin: 'Dr Philippe MOREAU' }];

console.log('\nFusion à l\'enregistrement : la valeur du bilan AFFICHÉE entre dans la fiche');
let pt;
try {
  pt = enregistrer({ id: 'T' }, {}, B);
  ok('fiche vide, rien saisi : le poids du bilan est enregistré, en NOMBRE', pt.poids === 78.5, JSON.stringify(pt.poids));
  ok('… la taille aussi', pt.taille === 181, JSON.stringify(pt.taille));
  ok('… l\'activité et le médecin aussi', pt.activite === 'Technicien' && pt.medecin === 'Dr Philippe MOREAU');
  pt = enregistrer({ id: 'T' }, { 'fi-poids': '80' }, B);
  ok('une saisie du praticien l\'emporte sur le bilan', pt.poids === 80);
  /* Le champ était rempli, donc AUCUNE valeur de bilan n'était affichée : le
     vider est une décision du praticien, pas un trou à combler. */
  pt = enregistrer({ id: 'T', taille: 81 }, {}, B);
  ok('vider un champ déjà rempli l\'efface — le bilan ne le recomble pas', pt.taille === null, JSON.stringify(pt.taille));
  ok('sans bilan, un champ vide reste vide', enregistrer({ id: 'T' }, {}, []).poids === null);
  ok('les champs sans équivalent au bilan ne bougent pas', enregistrer({ id: 'T' }, {}, B).niveau === null);
} catch (e) { ok('saveFiche s\'exécute', false, e.message); }

console.log('\nÉcart : une fiche qui contredit le dernier bilan le dit');
try {
  let h = champ({ id: 'T', taille: 81 }, B, 'taille', { number: true, unit: ' cm' });
  ok('81 cm en fiche, 181 au bilan : l\'écart est signalé', /fi-ecart/.test(h) && /181 cm/.test(h), h.slice(0, 200));
  ok('… daté', /10\/09\/2026/.test(h));
  ok('… avec de quoi reprendre la valeur du bilan', /onclick="ficheReprendre\(this\)"/.test(h) && /data-cible="fi-taille"/.test(h) && /data-val="181"/.test(h));
  ok('fiche = bilan : aucun écart', !/fi-ecart/.test(champ({ id: 'T', taille: 181 }, B, 'taille', { number: true })));
  ok('78.5 en fiche, « 78,5 » au bilan : même nombre, aucun écart', !/fi-ecart/.test(champ({ id: 'T', poids: 78.5 }, B, 'poids', { number: true })));
  ok('casse et espaces ne font pas un écart', !/fi-ecart/.test(champ({ id: 'T', medecin: 'dr philippe  moreau ' }, B, 'medecin')));
  ok('fiche vide : la valeur du bilan en indice, annoncée comme enregistrée avec la fiche',
    /class="inherited"/.test(h = champ({ id: 'T' }, B, 'taille', { number: true })) && /enregistr/i.test(h) && !/fi-ecart/.test(h));
} catch (e) { ok('ficheField s\'exécute', false, e.message); }

try {
  const el = { value: '81', classList: { remove() {} }, focus() {} }, parent = { textContent: '' };
  const btn = { getAttribute: a => ({ 'data-cible': 'fi-taille', 'data-val': '181' })[a], parentNode: parent };
  new Function('document', src(pat, 'ficheReprendre') + '; ficheReprendre(btn);'.replace('btn', 'arguments[1]'))({ getElementById: id => id === 'fi-taille' ? el : null }, btn);
  ok('« Reprendre » pose la valeur du bilan dans le champ', el.value === '181');
  ok('… et dit qu\'il reste à enregistrer', /enregistr/i.test(parent.textContent));
} catch (e) { ok('ficheReprendre s\'exécute', false, e.message); }

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Fiche et bilan : tous les cas passent.');

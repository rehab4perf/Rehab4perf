#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   La fiche athlète reprend les valeurs du bilan quand elle n'a pas les siennes

   Poids, taille, activité et médecin existent à la fois dans la fiche (onglet
   Patients) et dans les infos du bilan. La fiche fait foi si elle est remplie ;
   sinon elle AFFICHE, en grisé et datée, la valeur du bilan le plus récent —
   sans l'écrire, pour qu'un bilan ancien ne puisse jamais écraser une saisie
   récente. `r4pResolveFicheField` porte cette règle.

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

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Fiche et bilan : tous les cas passent.');

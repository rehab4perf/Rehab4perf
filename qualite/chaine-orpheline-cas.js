#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Builder — un enchaînement ne survit pas à l'exercice avec lequel il liait

   Signalé par le praticien (2026-09-22) : « plus moyen d'enlever le mode
   enchaîner de l'exercice ; ça s'est produit quand j'ai supprimé l'exo avec
   lequel il était enchaîné. »

   `chained` veut dire « enchaîné avec le SUIVANT ». Le bouton ne s'affichait
   que pour un exercice qui a un suivant (`idx < longueur - 1`) — juste pour
   CRÉER un enchaînement, mais du coup invisible sur celui qui vient de
   devenir dernier. Le drapeau restait allumé, sans aucun moyen de l'éteindre.

   Deux verrous, et corriger l'un sans l'autre ne suffit pas :
   - à la SOURCE, retirer ou déplacer un exercice normalise le bloc — le
     dernier ne peut pas être enchaîné, il n'y a rien après lui ;
   - au RENDU, le bouton s'affiche aussi quand le drapeau est là, quoi qu'il
     arrive : les séances déjà enregistrées portent l'ancien état, et on doit
     pouvoir le défaire à la main.

   Le rendu ne NORMALISE PAS : renderSession tourne à chaque ouverture, et
   écrire dans le modèle depuis le rendu marquerait « non sauvegardé » une
   séance qu'on vient seulement d'ouvrir.

     node qualite/chaine-orpheline-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pdata = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-data.js'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fd = n => { const d = pdata.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pdata.slice(d, pdata.indexOf('\n}\n', d) + 3); };

const c = vm.createContext({});
try { vm.runInContext([ '_normChaines', '_chaineVive' ].map(fd).join('\n'), c); }
catch (e) { ok('le code se charge', false, e.message); }
const bloc = () => ({ id: 'b1', exos: [
  { id: 'e1', name: 'Presse mollets 1j', chained: true },
  { id: 'e2', name: 'Tractions pronations', chained: true },
  { id: 'e3', name: 'Calf raise', chained: false } ] });

console.log('\nLe dernier ne peut pas être enchaîné');
{
  const b = bloc();
  b.exos[2].chained = true;                       // l'état fautif
  try { c._normChaines(b); } catch (e) { ok('_normChaines tourne', false, e.message); }
  ok('… le drapeau du dernier tombe', b.exos[2].chained === false, JSON.stringify(b.exos.map(x => x.chained)));
  ok('… et les autres ne bougent pas', b.exos[0].chained === true && b.exos[1].chained === true);
}
ok('un bloc vide ou absent ne casse rien', (() => {
  try { c._normChaines({ id: 'x', exos: [] }); c._normChaines(null); c._normChaines({ id: 'y' }); return true; }
  catch (e) { return false; }
})());

console.log('\nSupprimer le partenaire dénoue l\'enchaînement');
ok('removeExo normalise le bloc', /_normChaines\(/.test(fd('removeExo')), 'removeExo ne normalise pas');
ok('moveExo aussi : déplacer change qui est dernier', /_normChaines\(/.test(fd('moveExo')), 'moveExo ne normalise pas');
{
  /* Le vrai geste du praticien : deux exercices enchaînés, on retire le
     second — le premier devient dernier, et son drapeau doit tomber. */
  const b = bloc(); b.exos = b.exos.slice(0, 2);
  b.exos = b.exos.filter(e => e.id !== 'e2');
  try { c._normChaines(b); } catch (e) {}
  ok('… celui qui reste n\'est plus enchaîné à rien', b.exos.length === 1 && b.exos[0].chained === false,
     JSON.stringify(b.exos.map(x => ({ id: x.id, ch: x.chained }))));
}

console.log('\nAu rendu, un enchaînement sans suivant n\'en est pas un');
{
  const b = bloc(); b.exos[2].chained = true;
  const V = i => { try { return c._chaineVive(b, i); } catch (e) { return 'ERREUR'; } };
  ok('un exercice suivi d\'un autre : enchaînement vif', V(0) === true && V(1) === true);
  ok('le dernier : jamais, même drapeau allumé', V(2) === false, String(V(2)));
  ok('hors bornes : rien, plutôt qu\'une erreur', V(9) === false && V(-1) === false);
}
ok('le groupe visuel se construit dessus', (() => {
  const rs = fd('renderSession');
  return /_chaineVive\(b, idx\)/.test(rs) && /_chaineVive\(b, idx ?- ?1\)/.test(rs);
})(), 'renderSession garde ses tests en dur');

console.log('\nLe bouton reste atteignable');
ok('il s\'affiche dès qu\'il y a un suivant OU que le drapeau est là',
   /idx < b\.exos\.length - 1 \|\| e\.chained/.test(fd('renderSession')), 'la condition n\'a pas changé');
ok('… et son état actif suit le DRAPEAU, pas l\'enchaînement vif', (() => {
  const rs = fd('renderSession');
  const i = rs.indexOf('chain-icon-toggle');
  return i > -1 && /e\.chained/.test(rs.slice(i, i + 200));
})(), 'le bouton d\'un drapeau orphelin ne se montrerait pas actif');

console.log('\nLe rendu n\'écrit pas dans le modèle');
ok('renderSession ne normalise pas : une séance ouverte ne devient pas « non sauvegardé »',
   !/_normChaines\(/.test(fd('renderSession')), 'renderSession mute le modèle');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Builder : un enchaînement orphelin se dénoue, et son bouton reste atteignable.');

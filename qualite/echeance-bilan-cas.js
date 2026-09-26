#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Le bilan LISTE les échéances de l'agenda, il ne les possède pas

   Décision du praticien (2026-09-26), en réponse à « le bilan doit-il refléter
   une échéance saisie depuis Programme ? » : en LECTURE SEULE.

   Le raisonnement : une seule source, donc aucun doublon qui diverge. On voit
   l'échéance à l'examen, là où on l'attend, mais elle se modifie là où elle a
   été posée. Une copie éditable dans le bilan aurait recréé exactement le
   problème qu'on vient de fermer — deux exemplaires d'une même date, et rien
   pour dire lequel fait foi.

   CE QUI EST VOLONTAIREMENT ABSENT : le bouton de suppression. Les chips
   d'objectif juste au-dessus en portent un ; si ces lignes lui ressemblaient,
   on croirait pouvoir les supprimer ici.

     node qualite/echeance-bilan-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const bjs = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                : fs.readFileSync(path.join(R, 'js', 'bilan.js'), 'utf8');
const bhtml = fs.readFileSync(path.join(R, 'bilan.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = bjs.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : bjs.slice(d, bjs.indexOf('\n}\n', d) + 3); };

/* Le vrai code, sur un faux DOM : ce qui compte est ce qui SORT — les lignes
   retenues, leur ordre, et ce que le balisage n'offre pas. */
const iso = dec => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dec);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function rendre(lignes) {
  const box = { hidden: false, innerHTML: '' };
  const c = vm.createContext({
    document: { getElementById: id => (id === 'obj-ech' ? box : null) },
    _objDateFmt: s => { const p = String(s).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; },
    _objEsc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  });
  vm.runInContext([fm('_echJoursBilan'), fm('_renderEcheancesBilan')].join('\n'), c);
  c._renderEcheancesBilan(lignes);
  return box;
}

console.log('\nCe que le bilan montre');
{
  const b = rendre([
    { texte: 'Semi de Colmar', date: iso(90) },
    { texte: 'Vacances', date: iso(10), date_fin: iso(24) },
    { texte: 'Course passée', date: iso(-30) },
    { texte: 'Aujourd’hui', date: iso(0) }
  ]);
  ok('les échéances à venir sont listées', /Semi de Colmar/.test(b.innerHTML) && /Vacances/.test(b.innerHTML));
  ok('une échéance PASSÉE ne dit plus rien à l\'examen', !/Course passée/.test(b.innerHTML),
     'le bloc se remplirait de dates dépassées en quelques semaines');
  ok('le jour même est encore là', /aujourd’hui/.test(b.innerHTML), b.innerHTML.slice(0, 300));
  ok('une période dit ses deux bornes', /du .* au /.test(b.innerHTML), b.innerHTML);
  ok('… et l\'échéance ponctuelle porte son J-N', /J-90/.test(b.innerHTML));
  ok('les plus proches d\'abord', b.innerHTML.indexOf('Vacances') < b.innerHTML.indexOf('Semi de Colmar'));
  ok('AUCUN bouton : ces lignes ne se modifient pas ici',
     !/<button/.test(b.innerHTML) && !/onclick/.test(b.innerHTML),
     'un contrôle ici ferait croire à un objectif du bilan');
  ok('… et on dit où elles se modifient', /onglet’?\s*Programme|Programme/.test(b.innerHTML), b.innerHTML.slice(-160));
  ok('le texte libre est échappé', rendre([{ texte: '<img src=x>', date: iso(5) }]).innerHTML.indexOf('<img') < 0);
}
{
  const vide = rendre([]);
  ok('rien à montrer : le bloc disparaît, pas de titre orphelin', vide.hidden === true && vide.innerHTML === '');
  const passe = rendre([{ texte: 'Vieille période', date: iso(-60), date_fin: iso(-30) }]);
  ok('une période entièrement passée non plus', passe.hidden === true);
  const enCours = rendre([{ texte: 'Arrêt en cours', date: iso(-3), date_fin: iso(4) }]);
  ok('une période EN COURS reste : elle commence dans le passé', enCours.hidden === false,
     'un déplacement en cours disparaîtrait de l\'écran pendant qu\'il a lieu');
}

console.log('\nLe chargement');
{
  const c = fm('_chargerEcheancesBilan');
  ok('il lit la table des échéances', /athlete_objectifs/.test(c), c.slice(0, 200));
  ok('… filtrée sur le patient', /patient_id/.test(c));
  ok('… et une réponse pour un AUTRE patient est ignorée', /_bilanPatient.*String\(pid\)|String\(pid\)/.test(c), c);
  ok('table absente : on n\'affiche rien plutôt qu\'une erreur', /res\.error/.test(c));
  ok('le bloc est vidé avant, sinon le patient précédent reste à l\'écran',
     /box\.hidden = true/.test(c), 'les échéances du patient d\'avant survivraient au changement');
  ok('le changement de patient le rejoue', /_chargerEcheancesBilan\(/.test(fm('_resetAndLoadPatient')));
}

console.log('\nLa page');
ok('le conteneur existe', /id="obj-ech"/.test(bhtml));
ok('… masqué par défaut', /id="obj-ech" hidden/.test(bhtml), 'un bloc vide apparaîtrait sur tout patient sans échéance');
ok('son style aussi', /\.obj-ech-item/.test(bhtml));
ok('il ne reprend PAS l\'apparence des chips d\'objectif', !/\.obj-ech-item[^}]*\.obj-chip/.test(bhtml));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Bilan : les échéances de l’agenda s’y lisent, et ne s’y modifient pas.');

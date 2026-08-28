#!/usr/bin/env node
/* Cas de référence — plusieurs cycles peuvent courir ensemble.
 *
 * Un cycle à CRITÈRES n'a pas de date : il dure tant qu'il n'est pas validé.
 * Un cycle DATÉ vit sa fenêtre de calendrier. Ce sont deux natures, pas deux
 * étapes — le tendon se poursuit sur critères pendant que le bloc de force
 * tourne sur ses dates, et les deux sont vrais en même temps.
 *
 * L'espace athlète n'en montrait qu'un. Deux verrous, à deux endroits :
 * `_cycleIsCurrent` faisait bloquer un cycle à critères par TOUT prédécesseur
 * non terminé, y compris d'une autre nature ; et le bandeau s'arrêtait au
 * premier trouvé (`break`), la liste du plan lisant ce seul indice.
 *
 * Chaque voie garde son ordre INTERNE : un cycle à critères attend que le
 * précédent à critères soit validé. C'est le blocage croisé qui a sauté.
 *
 *   node qualite/cycles-paralleles-cas.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'athlete.html'), 'utf8');
var L = src.split('\n');

function bornes(debut, fin) {
  var d = L.findIndex(function (l) { return l.startsWith(debut); });
  var f = L.findIndex(function (l) { return l.startsWith(fin); });
  if (d < 0 || f < 0) { console.error('Bornes introuvables : ' + debut); process.exit(1); }
  return L.slice(d, f).join('\n');
}
var utils = bornes('function _cyEndDate(', 'function _dayCycleBg(');
var api = new Function(utils + '\n return { courant:_cycleIsCurrent, termine:_cycleIsDone };')();

var nbOk = 0, nbKo = 0;
function verifie(intitule, attendu, obtenu) {
  if (String(attendu) === String(obtenu)) { nbOk++; console.log('    ✓ ' + intitule); return; }
  nbKo++;
  console.log('    ✗ ' + intitule);
  console.log('        attendu : ' + attendu);
  console.log('        obtenu  : ' + obtenu);
}

var LE_JOUR = new Date('2026-08-27'); LE_JOUR.setHours(0, 0, 0, 0);
function crit(nom, criteres, valides) {
  var checks = {};
  (valides || []).forEach(function (i) { checks[i] = { checked: true }; });
  return { nom: nom, mode: 'criteres', phases: [{ nom: '', criteria: criteres, checks: checks }] };
}
function date(nom, debut, duree) { return { nom: nom, mode: 'duree', startDate: debut, duree: duree }; }
function etats(plan) {
  return plan.map(function (c, i) {
    return c.nom + '=' + (api.courant(plan, i, LE_JOUR) ? 'cours'
                        : api.termine(c, LE_JOUR) ? 'fini' : 'venir');
  }).join(' ');
}

console.log('\n  Les deux voies avancent ensemble');
{
  /* Le plan de la capture : des vacances passées, un cycle tendon sur critères,
     un bloc de force daté qui a commencé le 24. */
  var plan = [date('Vacances', '2026-07-31', 3),
              crit('Tendon', ['a', 'b', 'c']),
              date('Force', '2026-08-24', 3)];
  verifie('critères et daté en cours en même temps',
          'Vacances=fini Tendon=cours Force=cours', etats(plan));
}

console.log('\n  Chaque voie garde son ordre interne');
{
  /* Deux cycles à critères ne courent pas ensemble : le second attend. */
  var plan = [crit('Tendon', ['a']), crit('Retour au sport', ['x'])];
  verifie('le second cycle à critères attend',
          'Tendon=cours Retour au sport=venir', etats(plan));

  var valide = [crit('Tendon', ['a'], [0]), crit('Retour au sport', ['x'])];
  verifie('… et prend le relais une fois le premier validé',
          'Tendon=fini Retour au sport=cours', etats(valide));
}

console.log('\n  Aucun blocage croisé entre les deux voies');
{
  /* C'est le verrou qui a sauté : un cycle daté non terminé retenait le cycle
     à critères placé après lui, et réciproquement la liste du plan n'en
     montrait qu'un. */
  var plan = [date('Force', '2026-08-24', 3), crit('Tendon', ['a'])];
  verifie('un daté en cours ne retient pas un cycle à critères',
          'Force=cours Tendon=cours', etats(plan));

  var plan2 = [crit('Tendon', ['a']), date('Force', '2026-09-14', 3)];
  verifie('un cycle à critères ne retient pas un daté à venir',
          'Tendon=cours Force=venir', etats(plan2));

  /* Trois cycles datés qui se chevauchent sont tous en cours : la fenêtre de
     chacun se lit seule. */
  var plan3 = [date('A', '2026-08-10', 4), date('B', '2026-08-24', 3), date('C', '2026-08-26', 2)];
  verifie('trois fenêtres qui se chevauchent', 'A=cours B=cours C=cours', etats(plan3));
}

console.log('\n  Un cycle daté hors de sa fenêtre n\'est jamais en cours');
{
  var plan = [date('Passé', '2026-07-01', 2), date('Futur', '2026-10-01', 2)];
  verifie('avant et après', 'Passé=fini Futur=venir', etats(plan));
}

/* ── Garde-fous textuels ─────────────────────────────────────────────────── */
console.log('\n  Garde-fous — les deux verrous, aux deux endroits');
{
  var propre = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  /* Le bandeau s'arretait au premier cycle trouve : un seul s'affichait meme
     quand deux voies tournaient. */
  verifie('le bandeau collecte tous les courants', 'true',
          /courants\.push\(_calCycles\[i\]\)/.test(propre) + '');
  /* Viser l'ANCIENNE forme exacte ne protegeait de rien : reintroduire un
     `break` sous une autre ecriture passait au vert. On lit la boucle de
     collecte elle-meme et on refuse toute sortie anticipee. */
  var boucle = (propre.split('\n').filter(function (l) {
    return l.indexOf('courants.push(_calCycles[i])') !== -1;
  })[0] || '');
  verifie('la boucle de collecte existe', 'true', String(!!boucle));
  verifie('elle ne sort pas au premier trouvé', 'false', String(/break/.test(boucle)));
  verifie('il en rend un par cycle', 'true', /courants\.forEach\(function \(cur\)\{|courants\.forEach\(function\(cur\)\{/.test(propre.replace(/\s+/g, ' ').replace(/ \(/g, '(')) + '');
  /* La liste du plan lisait le seul indice du bandeau. */
  verifie('la liste recalcule ligne par ligne', 'true',
          /var isCur\s*= _cycleIsCurrent\(_calCycles, i, today\);/.test(propre) + '');
  /* L'ordre INTERNE de la voie critères doit rester. */
  verifie('la voie critères reste ordonnée', 'true',
          /if\(cycles\[i\]\.mode !== 'criteres'\) continue;/.test(propre) + '');
}

console.log('\n  ' + (nbKo ? '✗ ' + nbKo + ' échec(s), ' : '✓ ') + nbOk + ' cas vérifiés.\n');
process.exit(nbKo ? 1 : 0);

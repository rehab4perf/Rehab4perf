/* L'empreinte du CR médecin (`_crSignature`) décide d'UNE chose : faut-il
   demander confirmation avant de changer de patient. Un faux positif est
   coûteux — le praticien voit « des informations n'ont pas été sauvegardées »
   alors qu'il n'a rien saisi, et finit par répondre oui sans lire. Un faux
   négatif l'est plus encore : un CR de dix minutes disparaît sans un mot.

   Le défaut vécu : les cases du bloc « Tests du bilan » n'ont pas d'`id`,
   elles sont rendues COCHÉES par défaut, et elles vivent dans `#panel-cr`.
   Trois tests renseignés dans le bilan suffisaient à faire passer le CR pour
   entamé — sans que personne n'ait touché à quoi que ce soit.

   Usage : node qualite/cr-empreinte-cas.js */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'outils.html'), 'utf8');

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nCR médecin — l\'empreinte ne doit signaler que VOTRE travail\n');

const iSig = src.indexOf('function _crSignature');
verifier('_crSignature existe', iSig >= 0);
const sig = iSig >= 0 ? src.slice(iSig, src.indexOf('\n  }', iSig) + 4) : '';

/* ── 1. Les éléments anonymes sont écartés ──
   Sans `id` ni `name`, deux éléments produisent la même entrée : l'empreinte
   compterait des anonymes au lieu de les nommer. C'est la cause du défaut. */
verifier('les éléments sans id ni name sont ignorés',
  /if\s*\(\s*!el\.id\s*&&\s*!el\.name\s*\)\s*return/.test(sig),
  'garde absente de _crSignature');

/* ── 2. L'identité patient reste hors empreinte ──
   Elle est remplie automatiquement au changement de patient : la compter
   ferait demander confirmation à chaque bascule. */
verifier('l\'identité patient est exclue',
  /CR_IDENTITE\.indexOf\(el\.id\)\s*>=\s*0\s*\)\s*return/.test(sig));

/* ── 3. Les tests comptent par ce qu'on a DÉCOCHÉ, pas par leur nombre ──
   La liste vient du bilan et se remplit toute seule ; seul le décochage est un
   geste du praticien. */
verifier('l\'empreinte retient les tests décochés',
  /Object\.keys\(_crTestsCoches[\s\S]{0,120}filter\(function\s*\(k\)\s*\{\s*return\s*!_crTestsCoches\[k\]/.test(sig));
verifier('elle ne compte plus le NOMBRE de tests disponibles',
  !/_crTestsFonc\s*\|\|\s*\[\]\)\.length/.test(sig),
  'un comptage de la liste ferait passer le CR pour entamé dès qu\'un test arrive');

/* ── 4. Les valeurs vides ne pèsent pas ──
   La configuration du CR arrive de Supabase après l'ouverture et crée ses
   champs : compter les champs vides ferait dériver l'empreinte toute seule. */
verifier('les valeurs vides sont ignorées',
  /if\s*\(\s*!String\(v\)\.trim\(\)\s*\)\s*return/.test(sig));

/* ── 5. L'ordre du DOM ne doit pas compter ──
   Les blocs se redessinent ; sans tri, un simple réordonnancement changerait
   l'empreinte. */
verifier('les entrées sont triées', /parts\.sort\(\)/.test(sig));

/* ── 6. Aucune confirmation au tout premier patient ──
   Sans référence posée, il n'y a rien à perdre : sinon une boîte s'ouvrirait
   au lancement de l'application. */
{
  /* Ancrer sur la DÉFINITION, pas sur le premier `window._crEstEntame` venu :
     le site d'appel, dans le gestionnaire de changement de patient, apparaît
     plus tôt dans le fichier. Le piège des bornes. */
  const i = src.indexOf('window._crEstEntame = function');
  const zone = i >= 0 ? src.slice(i, i + 260) : '';
  verifier('empreinte de référence absente → jamais entamé',
    /_crRefSignature\s*===\s*null/.test(zone), zone.slice(0, 120));
}

/* ── 7. Tout remplissage automatique remet la référence à plat ──
   L'association des infos patient et le chargement des tests écrivent dans le
   formulaire sans que le praticien n'ait rien fait. */
{
  const i = src.indexOf('function _crTenterImport');
  verifier('l\'import automatique remet la référence à plat',
    i >= 0 && /_crMarquerPropre\(\)/.test(src.slice(i, i + 900)));
}

/* ── 8. Le garde-fou, à l'exécution ──
   On rejoue la règle « seuls les décochés comptent » : une liste qui arrive
   toute cochée ne doit rien produire. */
{
  const actifs = (o) => {
    const r = [];
    Object.keys(o || {}).forEach(k => { if (!o[k]) r.push(k); });
    return r.sort().join(',');
  };
  verifier('trois tests arrivés cochés → aucune trace',
    actifs({ Hop: true, SLS: true, Rebond: true }) === '');
  verifier('un test décoché → une trace',
    actifs({ Hop: true, SLS: false, Rebond: true }) === 'SLS');
  verifier('recoché → la trace disparaît',
    actifs({ Hop: true, SLS: true, Rebond: true }) === '');
}

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

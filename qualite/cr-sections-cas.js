/* Une page de bilan entièrement remplie peut n'apparaître NULLE PART dans le
   compte-rendu, sans qu'aucune erreur ne le signale. C'est arrivé à la page
   « Poignet / Mains » : ses neuf tableaux figuraient au catalogue TESTS mais
   dans aucune section de `orthoSections`, et sa grille de mobilité n'était lue
   par personne. Mobilité, ULNT, Phalen, tests ligamentaires, De Quervain —
   rien ne remontait au médecin.

   Deux familles de défauts, toutes deux SILENCIEUSES :
     1. un `<tbody>` du catalogue qu'aucune section ne réclame ;
     2. une grille de mobilité dont l'identifiant calculé ne correspond à aucun
        champ réel — `mob-po-Incl_Ulnaire` contre `mob-po-InclUlnaire`.

   Usage : node qualite/cr-sections-cas.js */

const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const js   = fs.readFileSync(path.join(racine, 'js', 'bilan.js'), 'utf8');
const html = fs.readFileSync(path.join(racine, 'bilan.html'), 'utf8');

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nCR — aucune page remplie ne doit rester invisible\n');

/* ── 1. Tout tbody du catalogue est réclamé par une section ──
   Les tables `tb-*` du catalogue TESTS sont la promesse faite au praticien :
   ce qu'il remplit se retrouve au CR. Une table qu'aucune section ne cite est
   une saisie perdue. */
{
  const catalogue = [...js.matchAll(/'(tb-[\w-]+)'\s*:\s*\{\s*type:/g)].map(m => m[1]);
  const reclamees = new Set();
  [...js.matchAll(/tables:\s*\[([\s\S]*?)\]/g)].forEach(m => {
    [...m[1].matchAll(/'(tb-[\w-]+)'/g)].forEach(t => reclamees.add(t[1]));
  });
  /* Les tests fonctionnels et de force ont leurs propres sections, écrites
     séparément : on ne contrôle ici que les tables ORTHO, celles qui passent
     par `orthoSections`. */
  const orthoSeules = catalogue.filter(t => /^tb-(ep|cv|rl|ra|ha|ge|pi|po)-/.test(t));
  const orphelines = orthoSeules.filter(t => !reclamees.has(t));
  verifier('aucune table ortho orpheline',
    orphelines.length === 0,
    orphelines.length ? orphelines.join(', ') : '');
  verifier('les neuf tables du poignet sont réclamées',
    ['tb-po-neuro','tb-po-lig','tb-po-pouce','tb-po-neuro-g','tb-po-neuro-d',
     'tb-po-lig-g','tb-po-lig-d','tb-po-pouce-g','tb-po-pouce-d']
      .every(t => reclamees.has(t)));
}

/* ── 2. Chaque grille de mobilité appelée existe vraiment ──
   `_crMobTable(titre, seg, items)` déduit l'identifiant du libellé, sauf si
   l'item est une paire [clé, libellé]. Si le calcul tombe à côté, la ligne est
   cherchée sous un identifiant inexistant et reste muette.

   Les champs viennent de DEUX origines, et les confondre donne un test faux :
   les grilles du rachis sont fabriquées à l'exécution par la boucle de
   `_buildMobGrids`, tandis que celle du poignet est écrite en dur dans
   bilan.html. On reconstitue donc ce que la boucle produit, et on y ajoute les
   champs statiques. */
{
  const champsReels = new Set(
    [...html.matchAll(/id="(mob-[a-zA-Z0-9_-]+)-st"/g)].map(m => m[1])
  );

  const MOB_REF = ['Flexion','Extension','Incl. D','Incl. G','Rot. D','Rot. G'];
  const EXTRA_LOMB = ['Glissement D','Glissement G'];
  const segsGeneres = (js.match(/\[([^\]]*)\]\.forEach\(function\(seg\)/) || [, ''])[1]
    .split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  const uneDirection = {};
  const mud = js.match(/MOB_UNE_DIRECTION\s*=\s*\{([\s\S]*?)\}/);
  if (mud) [...mud[1].matchAll(/(\w+)\s*:\s*\['([^']+)'\]/g)]
    .forEach(m => { uneDirection[m[1]] = [m[2]]; });

  segsGeneres.forEach(seg => {
    const items = uneDirection[seg]
      || ((seg === 'lomb' || seg === 'rl') ? MOB_REF.concat(EXTRA_LOMB) : MOB_REF);
    items.forEach(m => champsReels.add('mob-' + seg + '-' + m.replace(/[\s./]+/g, '_')));
  });

  verifier('les segments générés à l\'exécution sont identifiés',
    segsGeneres.length >= 5, 'trouvés : ' + segsGeneres.join(', '));

  const appels = [...js.matchAll(/_crMobTable\(\s*'([^']*)'\s*,\s*'([^']*)'\s*(?:,\s*(\[[\s\S]*?\]))?\s*\)/g)]
    .filter(m => !/function/.test(m[0]));
  verifier('des appels à _crMobTable sont trouvés', appels.length > 0,
    'trouvés : ' + appels.length);

  const MOB = ['Flexion','Extension','Incl. D','Incl. G','Rot. D','Rot. G'];
  appels.forEach(([, titre, seg, itemsSrc]) => {
    let items;
    if (itemsSrc) {
      try { items = JSON.parse(itemsSrc.replace(/'/g, '"')); }
      catch (e) { verifier(titre + ' — liste d\'items lisible', false, itemsSrc); return; }
    } else {
      items = (seg === 'lomb' || seg === 'rl') ? MOB.concat(['Glissement D','Glissement G']) : MOB;
    }
    const manquants = items.filter(it => {
      const id = Array.isArray(it) ? it[0] : String(it).replace(/[\s./]+/g, '_');
      return !champsReels.has('mob-' + seg + '-' + id);
    }).map(it => 'mob-' + seg + '-' + (Array.isArray(it) ? it[0] : String(it).replace(/[\s./]+/g, '_')));

    verifier('« ' + titre + ' » (' + seg + ') — tous les champs existent',
      manquants.length === 0,
      manquants.length ? 'introuvables : ' + manquants.join(', ') : '');
  });
}

/* ── 3. Le poignet a bien sa section, et elle résout SON côté ──
   Reprendre les zones de l'ÉPAULE laisserait une douleur d'épaule décider du
   côté nommé pour le poignet — le défaut qui avait fait désigner le mauvais
   membre dans un compte-rendu envoyé au médecin. */
{
  const i = js.indexOf("label:'POIGNET / MAIN'");
  verifier('la section POIGNET / MAIN existe', i >= 0);
  if (i >= 0) {
    const ligne = js.slice(i, i + 220);
    verifier('elle résout le côté sur la zone poignet, et elle seule',
      /zones:\['poignet'\]/.test(ligne),
      ligne.match(/zones:\[[^\]]*\]/)?.[0] || '');
  }
  /* Sa mobilité passe désormais par le tableau actif/passif : la grille de
     statut du poignet a été remplacée, pas supprimée. Ce qui compte reste le
     même — la section doit rapporter SA mobilité, sinon on remplit la page
     pour rien. */
  verifier('sa mobilité est rapportée',
    /_crMobApRows\('po'\)/.test(js));
}

/* ── 4. Le coude aussi — même manque, refermé en même temps ──
   Douze tableaux au catalogue TESTS et une grille de mobilité dans la page, et
   rien de tout cela n'était lu : la page entière pouvait être remplie sans
   qu'une seule ligne n'apparaisse au compte-rendu. */
{
  const i = js.indexOf("label:'COUDE'");
  verifier('la section COUDE existe', i >= 0);
  if (i >= 0) {
    const ligne = js.slice(i, i + 220);
    verifier('elle résout le côté sur la zone coude, et elle seule',
      /zones:\['coude'\]/.test(ligne),
      ligne.match(/zones:\[[^\]]*\]/)?.[0] || '');
  }
  verifier('sa mobilité est rapportée', /_crMobApRows\('co'\)/.test(js));
}

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

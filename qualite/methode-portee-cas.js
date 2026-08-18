/* Une méthode s'applique à une SÉLECTION d'exercices, jamais forcément à tout
   le bloc. La carte, elle, était au niveau du bloc et affirmait :

     « ⛓ Les exercices de ce bloc sont enchaînés »

   Sur cinq exercices dont deux en circuit, c'était faux — et la description
   longue laissait croire que la consigne valait pour tous.

   Rien ne permettait de faire mieux : `applyMethode` n'écrivait que
   `e._methApplied`, préfixé `_` donc jamais enregistré, et supprimé au bout de
   trois secondes. L'application ne savait plus QUI portait la méthode.

   `e.methode` est désormais une trace durable, et la carte lit la portée réelle
   au lieu de la supposer.

   Usage : node qualite/methode-portee-cas.js */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'prog-data.js'), 'utf8');

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nMéthodes — la carte dit ce qu\'elle couvre, elle ne le suppose plus\n');

/* ── 1. La trace est DURABLE ──
   Sans souligné : conservée à l'enregistrement, et couverte par l'empreinte de
   séance (qui écarte les clés préfixées `_`). */
{
  const i = src.indexOf('function applyMethode');
  const zone = src.slice(i, i + 2200);
  verifier('applyMethode enregistre la méthode sur l\'exercice',
    /\be\.methode\s*=\s*bloc\.methode/.test(zone));
  verifier('la trace n\'est pas préfixée `_` (donc enregistrée)',
    !/\be\._methode\s*=/.test(zone),
    'une clé `_methode` serait perdue à la sauvegarde et exclue de l\'empreinte');
}

/* ── 2. Plus aucune affirmation au niveau du bloc ──
   C'est la phrase qui mentait. On la cherche dans le CODE seulement : les
   commentaires la citent pour expliquer le défaut, et les compter reviendrait
   à interdire d'en garder la mémoire. */
{
  const sansCommentaires = src.replace(/\/\*[\s\S]*?\*\//g, '');
  verifier('la carte n\'affirme plus « les exercices de ce bloc sont enchaînés »',
    !/exercices de ce bloc sont enchaînés/.test(sansCommentaires),
    'la formule est réapparue dans du code rendu');
}

/* ── 3. La portée se calcule sur les exercices ── */
{
  const i = src.indexOf('function _methPortee');
  verifier('_methPortee existe', i >= 0);
  const fn = i >= 0 ? src.slice(i, src.indexOf('\n}', i) + 2) : '';
  verifier('elle lit `e.methode`, pas `bloc.methode`',
    /e\.methode/.test(fn) && !/bloc\.methode/.test(fn));
  verifier('« tout le bloc » exige UNE seule méthode',
    /ids\.length === 1/.test(fn),
    'deux méthodes couvrant chacune la moitié ne font pas un bloc uniforme');
  verifier('« tout le bloc » exige TOUS les exercices',
    /porteurs === total/.test(fn));
}

/* ── 4. La règle, rejouée ── */
{
  const i = src.indexOf('function _methPortee');
  const _methPortee = new Function(src.slice(i, src.indexOf('\n}', i) + 2) + '\nreturn _methPortee;')();
  const ex = (m) => ({ methode: m || undefined });

  let p = _methPortee({ exos: [ex(), ex(), ex()] });
  verifier('aucun exercice ne porte la méthode → « aucun »',
    p.aucun && !p.uniforme && !p.multiple);

  p = _methPortee({ exos: [ex('circuit'), ex('circuit'), ex('circuit')] });
  verifier('tous la portent → « uniforme »', p.uniforme && !p.multiple && p.porteurs === 3);

  p = _methPortee({ exos: [ex('circuit'), ex('circuit'), ex(), ex(), ex()] });
  verifier('LE CAS SIGNALÉ — 2 sur 5 → ni uniforme, ni multiple',
    !p.uniforme && !p.multiple && p.porteurs === 2 && p.total === 5);

  p = _methPortee({ exos: [ex('circuit'), ex('circuit'), ex('tabata')] });
  verifier('deux méthodes → « multiple »', p.multiple && !p.uniforme);
  verifier('le détail compte chaque méthode',
    p.comptes.circuit === 2 && p.comptes.tabata === 1);

  /* Deux méthodes couvrant TOUT le bloc ne font pas un bloc uniforme :
     dire « appliquée à tout le bloc » y serait exact mais trompeur. */
  p = _methPortee({ exos: [ex('circuit'), ex('tabata')] });
  verifier('deux méthodes couvrant tout → multiple, jamais uniforme',
    p.multiple && !p.uniforme);

  /* Les blocs cardio, texte, AMRAP et EMOM n'ont pas d'`exos`. */
  verifier('bloc sans exercices → ne plante pas',
    _methPortee({}).total === 0 && _methPortee({}).aucun);
}

/* ── 5. La marque de ligne ──
   Elle vit dans `.exo-sub` et non à côté du nom : la colonne du nom est
   étroite, une pastille inline y écraserait le libellé. */
{
  verifier('une marque par exercice existe', /meth-exo-tag/.test(src));
  const i = src.indexOf('meth-exo-tag');
  /* On remonte jusqu'au conteneur ouvert le plus proche plutôt que de deviner
     une fenêtre : le commentaire qui précède la marque en fait varier la
     longueur, et une taille figée casserait au premier mot ajouté. */
  const iSub  = src.lastIndexOf('class="exo-sub"', i);
  const iName = src.lastIndexOf('class="exo-name"', i);
  verifier('elle est posée dans .exo-sub, pas à côté du nom',
    iSub > iName,
    'la colonne du nom est étroite : une pastille inline y écraserait le libellé');
  verifier('elle se tait quand tout le bloc porte la même méthode',
    /!_pt\.uniforme/.test(src.slice(i - 300, i + 300)),
    'la répéter sur chaque ligne serait du bruit');
}

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

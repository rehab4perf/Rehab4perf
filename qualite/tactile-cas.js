/* Un appareil n'est pas tactile OU pointeur — un iPad avec clavier est les
   deux, et l'utilisateur passe de l'un à l'autre dans la même minute.
   `_isTouchDevice` teste une CAPACITÉ, jamais le geste en cours : il vaut
   toujours vrai sur iPad, clavier branché ou non.

   Les chips de l'agenda choisissaient leurs gestionnaires de façon exclusive —
   tactile OU pointeur. Sur iPad elles ne recevaient donc que les gestionnaires
   tactiles, sans `onclick`, et un clic de trackpad (qui n'émet aucun événement
   tactile sur iPadOS) tombait dans le vide. Seul le « ⋮ » répondait, parce
   qu'il porte les deux depuis toujours.

   Ce fichier échoue si le schéma exclusif réapparaît.

   Usage : node qualite/tactile-cas.js */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'js', 'prog-main.js');
const src = fs.readFileSync(SRC, 'utf8');

let echecs = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('  ✓ ' + nom); return; }
  echecs++;
  console.log('  ✗ ' + nom + (detail ? '\n      ' + detail : ''));
}

console.log('\nAgenda — clic ET toucher sur les chips\n');

/* ── 1. Aucun jeu d'attributs ne doit choisir entre les deux ── */
const exclusifs = [...src.matchAll(/var\s+(\w*EvtAttrs)\s*=\s*_isTouchDevice/g)].map(m => m[1]);
verifier(
  'aucun jeu d\'attributs ne branche tactile OU pointeur',
  exclusifs.length === 0,
  exclusifs.length ? 'exclusifs : ' + exclusifs.join(', ') : ''
);

/* ── 2. Chaque jeu d'attributs porte onclick INCONDITIONNELLEMENT ──
   Le `onclick` doit être hors de la ternaire : posé en tête de la chaîne, il
   est présent quel que soit `_isTouchDevice`. */
const jeux = [...src.matchAll(/var\s+(\w*EvtAttrs)\s*=\s*([^\n]+)/g)];
verifier('quatre jeux d\'attributs trouvés', jeux.length === 4,
  'trouvés : ' + jeux.map(j => j[1]).join(', ') + ' (' + jeux.length + ')');

jeux.forEach(([, nom, debut]) => {
  verifier(nom + ' — onclick posé hors de la ternaire',
    /^'\s*onclick=/.test(debut.trim()),
    'commence par : ' + debut.trim().slice(0, 60));
});

/* ── 3. Le glisser-déposer reste réservé au pointeur ──
   Au doigt il ne fonctionne pas : c'est le long appui qui ouvre la feuille
   d'actions. `draggable` ne doit donc apparaître que dans la branche non
   tactile — sinon il intercepterait le geste. */
jeux.forEach(([bloc, nom]) => {
  const zone = src.slice(src.indexOf(bloc), src.indexOf(bloc) + 700);
  const ternaire = zone.match(/_isTouchDevice[\s\S]{0,600}?\);/);
  if (!ternaire) { verifier(nom + ' — ternaire tactile/pointeur présente', false); return; }
  const [tactile, pointeur] = ternaire[0].split(/^\s*:\s*/m);
  verifier(nom + ' — draggable seulement côté pointeur',
    !/draggable/.test(tactile || '') && /draggable/.test(pointeur || ''));
});

/* ── 4. Le garde-fou anti double-ouverture ──
   `_chipTouchEnd` appelle preventDefault(), ce qui supprime NORMALEMENT le clic
   de synthèse. Safari en a déjà produit des fantômes dans ce fichier (voir les
   350 ms de _showTouchActionSheet) : on ne s'y fie donc pas seul. */
verifier('un drapeau tactile existe', /_chipMarquerTactile/.test(src));
['_chipTouchEnd', '_noteChipTouchEnd'].forEach(fn => {
  const i = src.indexOf('function ' + fn);
  verifier(fn + ' pose le drapeau',
    i >= 0 && /_chipMarquerTactile\(\)/.test(src.slice(i, i + 400)));
});
['_chipOuvrirClic', '_noteOuvrirClic'].forEach(fn => {
  const i = src.indexOf('function ' + fn);
  verifier(fn + ' consulte le drapeau',
    i >= 0 && /_chipTactileJusque/.test(src.slice(i, i + 300)));
});

/* ── 5. Le garde-fou, à l'exécution ── */
{
  let horloge = 1000;
  const Date_ = { now: () => horloge };
  let jusque = 0;
  const marquer = () => { jusque = Date_.now() + 450; };
  const ouvrable = () => !(Date_.now() < jusque);

  verifier('clic seul (trackpad) → ouvre', ouvrable() === true);
  marquer();
  verifier('clic fantôme juste après un toucher → ignoré', ouvrable() === false);
  horloge += 200;
  verifier('encore ignoré à +200 ms', ouvrable() === false);
  horloge += 300;  // 500 ms après le toucher
  verifier('clic franc plus tard → ouvre à nouveau', ouvrable() === true);
}

console.log(echecs ? '\n' + echecs + ' cas en échec\n' : '\nTous les cas passent\n');
process.exit(echecs ? 1 : 0);

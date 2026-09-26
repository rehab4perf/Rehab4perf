#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Les cycles terminés — rangés, jamais supprimés

   Question du praticien (2026-09-26) : « que faire des cycles périmés ? »
   Décision : les REPLIER dans la liste, et CADRER la frise sur le présent.

   CE QU'ON NE FAIT PAS, et pourquoi : on ne les supprime pas. Un cycle à
   critères attend que le précédent À CRITÈRES soit validé — `_cycleIsCurrent`
   lit les cycles qui le précèdent. Les cycles terminés sont donc exactement
   ceux qui débloquent la suite. Ils teignent aussi leurs journées passées sur
   l'agenda, et le praticien a besoin de l'historique pour caler la suite.

   CE QUI GÊNE VRAIMENT, ce n'est pas la liste mais la FRISE : elle place tous
   les cycles à largeur fixe, donc chaque cycle ajouté rétrécit tous les
   autres. Vu en ligne le 2026-09-26 sur un patient à 5 cycles : « Deload » et
   « vacances » déjà tronqués, et le trait « Aujourd'hui » collé au bord droit
   — l'endroit le plus utile était celui qui avait le moins de place.

   DEUX PIÈGES DU CADRAGE, et chacun rend la frise fausse plutôt qu'illisible :
     - le trait « Aujourd'hui » se place en % du total AFFICHÉ : calculé sur le
       plan entier alors qu'on n'en montre qu'une part, il désigne le mauvais
       cycle ;
     - le numéro de semaine du repli sans dates (« S1 → S3 ») doit rester celui
       du PLAN ENTIER : reparti de 1 sur le cadre, le 5e cycle s'annoncerait
       comme le premier.

     node qualite/cycles-perimes-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };

const iso = dec => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + dec);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const AUJ = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/* Le plan de Gautier, tel qu'il est en ligne : quatre cycles finis, un en
   cours. Les semaines sont comptées depuis aujourd'hui pour que le banc ne
   périme pas à son tour. */
const PLAN = [
  { id: 'c1', nom: 'PPG',             startDate: iso(-61), duree: 3, color: '#A32D2D' },
  { id: 'c2', nom: 'Deload',          startDate: iso(-40), duree: 1, color: '#185FA5' },
  { id: 'c3', nom: 'PPG',             startDate: iso(-33), duree: 3, color: '#BA7517' },
  { id: 'c4', nom: 'vacances',        startDate: iso(-12), duree: 1, color: '#185FA5' },
  { id: 'c5', nom: 'Force / Puissance', startDate: iso(-5), duree: 3, color: '#A32D2D' }
];

function ctx(etat) {
  const c = vm.createContext(Object.assign({
    _cycles: PLAN, _cycleColors: {}, _cycleColor: () => '#888',
    _fmtDateShort: s => s.slice(8) + '/' + s.slice(5, 7),
    _cycleComputeEndDate: (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n * 7 - 1);
      return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); },
    _cyclePhases: () => [], _cyclePhaseIsDone: () => false, _cyclePhaseCurrentIndex: () => -1,
    escH: s => String(s || ''),
    /* Le recul du cadre est une constante du produit : on la lit, on ne la
       redefinit pas — sinon le banc testerait sa propre valeur. */
    _CYCLE_FRISE_RECUL_SEM: Number((pmain.match(/_CYCLE_FRISE_RECUL_SEM = (\d+)/) || [])[1])
  }, etat));
  vm.runInContext(['_cycleIsDone', '_cycleFriseCycles', '_cyclesTermines'].map(fm).join('\n'), c);
  return c;
}

console.log('\nCe qui est terminé');
{
  const c = ctx({});
  const fin = c._cyclesTermines(PLAN, AUJ());
  ok('les quatre cycles passés sont reconnus', fin.length === 4, fin.map(x => x.nom).join(', '));
  ok('… et celui en cours ne l\'est pas', !fin.some(x => x.id === 'c5'));
}

console.log('\nLa frise se cadre sur le présent');
{
  const c = ctx({});
  const vus = c._cycleFriseCycles(PLAN, AUJ(), false);
  ok('elle ne montre plus tout', vus.length < PLAN.length, vus.length + ' sur ' + PLAN.length);
  ok('le cycle EN COURS y est toujours', vus.some(x => x.id === 'c5'));
  ok('… et le passé récent aussi : on voit d\'où l\'on vient', vus.some(x => x.id === 'c4'),
     'la frise s\'ouvrirait sur le cycle en cours, sans contexte');
  ok('le plus ancien est écarté', !vus.some(x => x.id === 'c1'));
  const tout = c._cycleFriseCycles(PLAN, AUJ(), true);
  ok('« tout voir » les rend tous, dans l\'ordre du plan',
     tout.length === PLAN.length && tout[0].id === 'c1', tout.map(x => x.id).join(','));
  /* Un plan entièrement passé n'a rien à cadrer : cacher tout laisserait une
     frise vide sous un total qui compte des cycles qu'on ne voit pas. */
  /* DEUX cycles : a un seul, la fonction sort par son raccourci et le repli
     « rien de visible → on montre tout » n'est jamais exerce. Un cas qui
     n'atteint pas la ligne qu'il protege ne protege rien. */
  const vieux = [{ id: 'v1', nom: 'Vieux', startDate: iso(-400), duree: 2 },
                 { id: 'v2', nom: 'Vieux 2', startDate: iso(-380), duree: 2 }];
  ok('un plan entièrement passé se montre quand même',
     ctx({ _cycles: vieux })._cycleFriseCycles(vieux, AUJ(), false).length === 2,
     'la frise serait vide');
  ok('un plan sans date n\'est pas amputé',
     ctx({ _cycles: [{ id: 'x', nom: 'Tendon', mode: 'criteres' }] })
       ._cycleFriseCycles([{ id: 'x', nom: 'Tendon', mode: 'criteres' }], AUJ(), false).length === 1,
     'un cycle à critères n\'a pas de fin : il n\'est jamais « passé »');
}

/* Le VRAI rendu de la frise : c'est là que se jouent les deux pièges. */
console.log('\nLe trait « Aujourd\'hui » suit le cadre');
{
  function frise(tout) {
    /* Le total porte un BOUTON depuis le cadrage : il s'ecrit donc en
       innerHTML, et c'est lui qu'on relit. */
    const tl = { innerHTML: '' }, tot = { textContent: '', innerHTML: '' };
    const c = vm.createContext({
      _cycles: PLAN, _cycleColor: () => '#888', _cycleFriseTout: !!tout,
      _fmtDateShort: s => s.slice(8) + '/' + s.slice(5, 7),
      _cycleComputeEndDate: (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n * 7 - 1);
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); },
      _cyclePhases: () => [], _cyclePhaseIsDone: () => false, _cyclePhaseCurrentIndex: () => -1,
      _CYCLE_FRISE_RECUL_SEM: Number((pmain.match(/_CYCLE_FRISE_RECUL_SEM = (\d+)/) || [])[1]),
      document: { getElementById: id => (id === 'cycle-timeline' ? tl : (id === 'cycle-total' ? tot : null)) }
    });
    vm.runInContext(['_cycleIsDone', '_cyclesTermines', '_cycleFriseCycles', 'renderCycleTimeline'].map(fm).join('\n'), c);
    c.renderCycleTimeline();
    return { html: tl.innerHTML, total: tot.innerHTML || tot.textContent };
  }
  const cadre = frise(false);
  ok('le trait est posé', /Aujourd’hui|Aujourd'hui/.test(cadre.html), cadre.html.slice(0, 200));
  const pct = parseFloat((cadre.html.match(/left:([\d.]+)%/) || [0, '-1'])[1]);
  ok('… et il tombe DANS la frise, pas collé au bord', pct > 5 && pct < 98, pct + ' %');
  /* Le cycle en cours a commencé il y a 5 jours sur 21 : le trait doit tomber
     dans son premier quart, donc au-delà de la moitié d'un cadre qui ne porte
     que lui et le précédent. */
  ok('… au bon endroit : dans le cycle en cours', pct > 50, pct + ' %');
  ok('la frise cadrée montre moins de blocs que « tout voir »',
     (cadre.html.match(/class="cycle-block"/g) || []).length
       < (frise(true).html.match(/class="cycle-block"/g) || []).length);
  ok('le total reste celui du PLAN ENTIER', /11 semaine/.test(cadre.total), cadre.total);
  ok('… et il dit ce qui est masqué', /masqu/i.test(cadre.total), cadre.total);
  ok('tout voir : plus rien de masqué', !/masqu/i.test(frise(true).total), frise(true).total);
}

console.log('\nLa liste replie le passé');
{
  const l = fm('renderCycleList');
  ok('les terminés sont comptés à part', /_cyclesTermines\(/.test(l), l.slice(0, 400));
  ok('… et repliés par défaut', /_cyclePlieTermines/.test(l), l.slice(0, 400));
  ok('la ligne de repli dit combien', /cycle-plies/.test(l), l.slice(0, 600));
  /* « replier les 1 cycle terminé » — vu en ligne. Le singulier se dit
     autrement, il ne se fabrique pas en retirant les « s ». */
  /* « replier les 1 cycle terminé » — vu en ligne. Le singulier se dit
     autrement, il ne se fabrique pas en retirant les « s » : les deux
     formulations doivent exister en toutes lettres dans le code. */
  ok('… et elle s\'accorde au singulier',
     l.indexOf('replier le cycle terminé') > 0 && l.indexOf('cycles terminés') > 0,
     'une seule formulation : le singulier ou le pluriel sonnera faux');
  ok('le cycle EN COURS n\'est jamais replié', /_cycleIsCurrent\(/.test(l) || /_cyclesTermines\(/.test(l));
  /* Le glisser-deposer travaille par ID (_cycleDrop cherche par findIndex sur
     l'id) : le pliage ne peut donc pas deplacer le mauvais cycle. On le
     verifie, parce que reindexer sur la liste visible est l'erreur deja
     refermee cote athlete. */
  ok('le glisser-déposer reste indexé sur le PLAN, pas sur la liste visible',
     /_cycles\.findIndex\(function\(c\)\{ return c\.id===_cycleDragId; \}\)/.test(fm('_cycleDrop')),
     'un pliage réindexé déplacerait le mauvais cycle');
}
{
  const f = fm('_cyclesPlierBasculer') || fm('_cyclePlierBasculer');
  ok('la bascule existe', !!f, '_cyclePlierBasculer introuvable');
  ok('… et redessine la liste', /renderCycleList\(/.test(f), f);
  const t = fm('_cycleFriseBasculer');
  ok('celle de la frise aussi', !!t && /renderCycleTimeline\(/.test(t), t);
}
ok('le style du repli existe', /\.cycle-plies/.test(html), 'CSS absent');

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Cycles terminés : rangés dans la liste, hors du cadre de la frise — et toujours là.');

#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Poser une échéance depuis Programme

   Demandé par le praticien (2026-09-26) : « quand un patient me donne un
   objectif, je dois aller dans bilan, modifier le bilan et rentrer
   l'objectif. Le plus simple serait de pouvoir le rentrer dans une case,
   comme une note ou une séance. »

   LE FOND : une date de course apprise au téléphone n'est pas une
   observation clinique. Elle passait par le bilan parce que c'était le seul
   endroit où la saisir — on rouvrait donc un document daté, signé, qui part
   chez le médecin, pour y noter un semi-marathon.

   LA CONSÉQUENCE TECHNIQUE, qui est le vrai gain : un objectif de bilan vit
   dans un JSON SANS IDENTIFIANT. C'est écrit dans _renderEcheances — la
   fusion ne peut pas être proposée dessus, « il n'y a rien où l'inscrire ».
   Rangée dans `athlete_objectifs`, l'échéance gagne un id : modification,
   suppression, fusion avec celle que l'athlète a déclarée, période.

   TROIS RÈGLES À NE PAS DÉFAIRE :
     - ce qui vient de la TABLE se remplace par `echId`, jamais par la
       source : depuis que le praticien y écrit aussi, filtrer sur
       `source !== 'athlete'` laisserait ses lignes s'empiler à chaque
       rechargement ;
     - une échéance posée par le praticien naît REPRISE : la marque « à
       voir » dit « déclarée par l'athlète, pas encore vue » — la porter sur
       sa propre saisie n'aurait aucun sens, et c'est aussi ce qui la
       protège de l'édition côté athlète ;
     - la source ne change RIEN à l'apparence (même 🎯 ambre partout,
       décision déjà prise) : elle sert au REGROUPEMENT.

     node qualite/echeance-praticien-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const pmain = process.env.R4P_SRC ? fs.readFileSync(process.env.R4P_SRC, 'utf8')
                                  : fs.readFileSync(path.join(R, 'js', 'prog-main.js'), 'utf8');
const html = fs.readFileSync(path.join(R, 'programme.html'), 'utf8');
const mig = path.join(R, 'supabase', 'migrations', '20260926_echeance_source.sql');
const sql = fs.existsSync(mig) ? fs.readFileSync(mig, 'utf8') : '';

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const fm = n => { const d = pmain.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : pmain.slice(d, pmain.indexOf('\n}\n', d) + 3); };

console.log('\nLa migration');
ok('la colonne dit qui a saisi', /ADD COLUMN IF NOT EXISTS source/.test(sql), 'migration absente');
ok('… avec un défaut, sinon les lignes déjà en base n\'ont plus de source',
   /DEFAULT 'athlete'/.test(sql), 'les échéances existantes resteraient à NULL');
ok('… et deux valeurs, pas n\'importe quel texte', /CHECK \(source IN \('athlete', 'praticien'\)\)/.test(sql));
ok('l\'athlète ne peut pas se faire passer pour le praticien',
   /FOR INSERT TO anon[\s\S]{0,120}source = 'athlete'/.test(sql),
   'une échéance déposée depuis l\'espace athlète pourrait se dire du cabinet');
ok('… ni modifier ou supprimer une échéance du cabinet',
   (sql.match(/FOR (UPDATE|DELETE) TO anon[\s\S]{0,200}?source = 'athlete'/g) || []).length === 2,
   'les politiques anon ne redisent pas la source');

console.log('\nLa saisie');
{
  const f = fm('_echNouvelleForm') || fm('_echNouvelle');
  ok('un formulaire d\'échéance existe', !!f, '_echNouvelle introuvable');
  const e = fm('_echEnregistrer');
  ok('il écrit dans athlete_objectifs', /athlete_objectifs/.test(e), e.slice(0, 200));
  ok('… en se déclarant du praticien', /source: *'praticien'/.test(e), e.slice(0, 400));
  ok('… et REPRISE d\'emblée : ce n\'est pas une déclaration à examiner',
     /repris_at: *(new Date|_maintenantIso)/.test(e),
     'l\'échéance porterait la marque « à voir » sur votre propre saisie');
  ok('une seconde date en fait une période, sinon la colonne reste nulle',
     /date_fin: *[^,]*\? *[^:]*: *null|date_fin: *\w+ *\|\| *null/.test(e), e.slice(0, 600));
  ok('rien ne part sans intitulé', /trim\(\)/.test(e) && /return/.test(e), e.slice(0, 300));
  ok('la bande se redessine après l\'écriture', /_chargerEcheancesAthlete\(|_renderEcheances\(/.test(e));
  /* PostgREST REFUSE l'écriture entière sur une colonne inconnue — il ne
     l'ignore pas. Sans repli, le bouton ne ferait donc rien du tout tant que
     la migration n'est pas appliquée : exactement le genre de panne muette
     que le reste du projet évite en écrivant le code pour vivre sans elle. */
  ok('… et elle passe même sans la migration, en retirant `source`',
     /delete\s+\w+\.source/.test(e), 'un 400 laisserait le bouton sans effet');
}
ok('le menu du jour la propose, comme une note',
   /_echNouvelle\(/.test(fm('openCalPicker')) && /Ajouter une échéance/.test(fm('openCalPicker')),
   'le geste n\'est pas là où le praticien le cherche');
ok('la carte de la colonne aussi, sans passer par l\'agenda',
   /_echNouvelle\(/.test(fm('_panneauPatientHtml')), 'pas de bouton sur la carte Échéances');

console.log('\nLa lecture — ce qui vient de la table s\'y remplace');
{
  const c = fm('_chargerEcheancesAthlete');
  ok('la source est relue, pas supposée', /e\.source/.test(c),
     'toute ligne serait rangée comme déclarée par l\'athlète');
  ok('le remplacement porte sur l\'ID, pas sur la source', /!o\.echId/.test(c),
     'les lignes du praticien s\'empileraient à chaque rechargement');
  /* Les COMMENTAIRES sont retires avant ce controle : celui qui explique la
     regle cite justement le filtre qu'elle interdit, et le garde-fou echouait
     sur sa propre explication. */
  const sansCom = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok('… et les objectifs du BILAN survivent (ils n\'ont pas d\'id)',
     !/source !== 'athlete'/.test(sansCom), 'un filtre par source les emporterait');
}

/* Le vrai code, exécuté : deux rechargements de suite ne doivent pas doubler
   la liste. C'est la régression que le filtre par source aurait introduite,
   et elle ne se voit pas en relisant — elle se voit en rejouant. */
console.log('\nRejouer le chargement ne double rien');
{
  const LIGNES = [
    { id: 1, texte: 'Semi de Colmar', date: '2027-03-14', source: 'praticien', repris_at: '2026-09-26T10:00:00Z' },
    { id: 2, texte: 'Vacances', date: '2026-08-10', date_fin: '2026-08-24', source: 'athlete' }
  ];
  const c = vm.createContext({
    SUPA_URL_P: '', _sbHeaders: () => ({}), _progPatient: { id: 'p1' },
    _patientObjectifs: [{ text: 'Objectif du bilan', date: '2026-12-01', source: 'praticien' }],
    _renderEcheances: () => {}, _renderCalendarUI: () => {},
    /* La base rend l'état COURANT : le second appel sert la ligne modifiée. */
    _fetchRetry: () => Promise.resolve({ ok: true, json: () => Promise.resolve(LIGNES) })
  });
  vm.runInContext(fm('_chargerEcheancesAthlete'), c);
  return (async () => {
    await c._chargerEcheancesAthlete('p1'); await new Promise(r => setTimeout(r, 0));
    const un = c._patientObjectifs.length;
    await c._chargerEcheancesAthlete('p1'); await new Promise(r => setTimeout(r, 0));
    const deux = c._patientObjectifs.length;
    ok('un chargement : le bilan + les deux lignes', un === 3, un + ' entrées');
    ok('deux chargements : toujours trois', deux === 3, deux + ' entrées — la liste double');
    ok('la ligne du praticien garde sa source',
       (c._patientObjectifs.find(o => o.echId === 1) || {}).source === 'praticien',
       JSON.stringify(c._patientObjectifs.find(o => o.echId === 1)));
    ok('la période garde sa fin', (c._patientObjectifs.find(o => o.echId === 2) || {}).dateFin === '2026-08-24');
    /* Le VRAI contrat : rejouer un chargement doit RAFRAÎCHIR, pas seulement
       ne rien doubler. Le garde-fou « texte|date » masquait la différence —
       une ligne déjà là était écartée telle quelle, fusion périmée comprise.
       C'est le défaut déjà refermé une fois dans cette fonction. */
    LIGNES[0].texte = 'Semi de Colmar (reporté)';
    LIGNES[0].date_fin = '2027-03-15';
    await c._chargerEcheancesAthlete('p1'); await new Promise(r => setTimeout(r, 0));
    const maj = c._patientObjectifs.find(o => o.echId === 1) || {};
    ok('une ligne modifiée en base se relit à jour', maj.text === 'Semi de Colmar (reporté)' && maj.dateFin === '2027-03-15',
       JSON.stringify(maj));
    ok('… et toujours sans doubler', c._patientObjectifs.length === 3, c._patientObjectifs.length + ' entrées');
    ok('l\'objectif du bilan est toujours là',
       c._patientObjectifs.some(o => !o.echId && o.text === 'Objectif du bilan'));

    console.log('\nCe qui ne bouge pas');
    ok('aucune couleur propre au praticien', !/source *=== *'praticien'[\s\S]{0,80}(color|couleur|#[0-9a-f]{3})/i.test(fm('_renderEcheances')),
       'la même échéance prendrait deux apparences selon qui l\'a saisie');
    ok('le style du formulaire existe', /ech-form|cal-ech-form/.test(html), 'CSS absent');

    console.log('');
    if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
    console.log('Échéances : le praticien en pose depuis Programme, la bande les reprend telles quelles.');
  })();
}

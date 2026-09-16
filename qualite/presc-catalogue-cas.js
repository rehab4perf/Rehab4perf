#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Onglet Prescription — le catalogue de l'arrêté du 14 septembre 2026

   Demandé par le praticien (2026-09-16) : garder le texte libre, et y ajouter
   tout ce qu'un kinésithérapeute peut prescrire, rangé par rubriques, avec un
   « + » qui l'ajoute à l'ordonnance. Décisions : le « + » insère un GABARIT à
   compléter ; les médicaments se prescrivent en DCI, avec 1 à 3 exemples à
   posologie courante ; favoris ; « NR » automatique ; historique des
   ordonnances du patient avec « Refaire » ; suggestions tirées du bilan.

     node qualite/presc-catalogue-cas.js
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const lire = f => { try { return fs.readFileSync(path.join(R, f), 'utf8'); } catch (e) { return ''; } };
const cat = lire('js/presc-catalogue.js'), outils = lire('outils.html'), sql = lire('supabase/migrations/20260916_prescriptions.sql');
const rls = lire('qualite/rls-cas.js'), bump = lire('.claude/skills/deployer/scripts/bump-versions.js');

let ko = 0;
function ok(nom, cond, detail) {
  if (cond) { console.log('  ✓ ' + nom); return; }
  ko++; console.log('  ✗ ' + nom + (detail ? ' — ' + detail : ''));
}
const c = vm.createContext({});
try { vm.runInContext(cat + '\nthis.C = PRESC_CATALOGUE; this.I = PRESC_INDEX;', c); } catch (e) { ok('le catalogue se charge', false, e.message); }
const C = c.C || [], I = c.I || {};
const items = C.flatMap(x => x.items || []);

console.log('\nLe catalogue');
ok('11 rubriques', C.length === 11, C.map(x => x.titre).join(' | '));
ok('chaque produit a un identifiant unique', items.length > 0 && new Set(items.map(i => i.id)).size === items.length, items.length + ' produits');
const med = (C.find(x => x.id === 'medicaments') || { items: [] }).items;
ok('les médicaments de l\'arrêté, et eux seuls', med.map(i => i.id).sort().join(',') === 'antalgique,antiseptique,creme-anesthesiante,mucolytique,myorelaxant,nicotine', med.map(i => i.id).join(','));
ok('… leurs restrictions dites : hors injectables, hors iodés', /injectables/.test(I.antalgique && I.antalgique.item.note) && /injectables/.test(I.myorelaxant && I.myorelaxant.item.note) && /iodés/.test(I.antiseptique && I.antiseptique.item.note));
ok('… chacun en DCI, avec 1 à 3 exemples à posologie courante', med.every(i => i.dci && i.exemples && i.exemples.length >= 1 && i.exemples.length <= 3
   && i.exemples.every(e => /PAR JOUR|AVANT LE SOIN|TOUTES LES/.test(e.ligne))), med.map(i => i.id + ':' + (i.exemples || []).length).join(' '));
/* Demande du 2026-09-16 : des exemples aussi pour les dispositifs — des
   désignations précises, jamais une marque. */
const dm = items.filter(i => !i.dci), dmEx = dm.filter(i => i.exemples && i.exemples.length);
ok('les dispositifs ont aussi leurs exemples (1 à 3), au moins 30 produits', dmEx.length >= 30 && dmEx.every(i => i.exemples.length <= 3), dmEx.length + ' / ' + dm.length);
ok('… désignations précises, sans marque ni référence commerciale', !items.flatMap(i => (i.exemples || []).map(e => e.libelle + ' ' + e.ligne))
   .some(t => /thuasne|donjoy|sigvaris|gibaud|juzo|\bmedi\b|compex|cefar|elastoplast|urgo|hartmann|mueller|omron|nicorette|doliprane|efferalgan|dafalgan|lumirelax|coltramyl|emla|bronchokod|mucomyst/i.test(t)));
ok('… « (NR) » d\'office sur les exemples des produits non remboursables', items.filter(i => i.nr).every(i => (i.exemples || []).every(e => / \(NR\)$/.test(e.ligne))));
ok('les locations de moins de 3 mois disent leur limite', /moins de 3 mois/i.test(I.fauteuil && I.fauteuil.item.note));

console.log('\nLe gabarit du « + »');
const L = id => { try { return c._prescLigne(I[id].item); } catch (e) { return 'ERREUR ' + e.message; } };
ok('un médicament : DCI, dosage et forme, posologie, durée', L('antalgique') === 'DCI : … — DOSAGE ET FORME : … — POSOLOGIE : … — DURÉE : …', L('antalgique'));
ok('un dispositif : quantité à compléter, puis sa précision', L('bas') === '… × BAS, CHAUSSETTES OU COLLANTS DE CONTENTION DE SÉRIE — CLASSE … — TAILLE : …', L('bas'));
const NR = ['coussin', 'attelle-posture', 'embouts', 'talonnettes', 'pansement-balneo'];
ok('« NR » sur les 5 produits qu\'ameli dit non remboursables — et sur eux seuls', items.filter(i => i.nr).map(i => i.id).sort().join(',') === NR.slice().sort().join(',')
   && NR.every(id => / \(NR\)$/.test(L(id))) && !/\(NR\)/.test(L('bas')), items.filter(i => i.nr).map(i => i.id).join(','));

console.log('\nLes suggestions du bilan');
const S = (b, p) => { try { return c._prescSuggestions(b, p); } catch (e) { return ['ERREUR ' + e.message]; } };
const pat = { nom: 'Martin' };
const genou = S({ 'f-nom': 'MARTIN', 'f-pain-zones': JSON.stringify([{ zone: 'genou', cote: 'DROIT' }]) }, pat);
ok('genou : béquilles, attelle, cryocompression…', genou.includes('bequilles') && genou.includes('cryocompression'), genou.join(','));
ok('le diagnostic aussi (LCA → arthromoteur)', S({ 'f-nom': 'Martin', 'f-motif': 'Rupture du LCA' }, pat).includes('arthromoteur'));
ok('rien si le bilan en mémoire est celui d\'un autre patient', S({ 'f-nom': 'Dupont', 'f-pain-zones': JSON.stringify([{ zone: 'genou' }]) }, pat).length === 0);
ok('au plus 8, sans doublon', (() => { const s = S({ 'f-nom': 'martin', 'f-motif': 'ptg lombalgie entorse', 'f-pain-zones': JSON.stringify([{ zone: 'genou' }, { zone: 'cheville' }, { zone: 'rachis-l' }]) }, pat); return s.length <= 8 && new Set(s).size === s.length; })());

console.log('\nL\'onglet');
ok('outils.html charge le catalogue', /<script src="js\/presc-catalogue\.js\?v=[0-9a-z]+"><\/script>/.test(outils));
ok('… et bump-versions le connaît', /'js\/presc-catalogue\.js':\s*\[\['outils\.html', 'js\/presc-catalogue\.js'\], \['index\.html', 'outils\.html'\]\]/.test(bump));
ok('le texte libre reste, le catalogue et l\'historique s\'ajoutent', /id="presc-objet"/.test(outils) && /id="presc-cat-q"/.test(outils) && /id="presc-cat"/.test(outils) && /id="presc-hist"/.test(outils));
const fo = n => { const d = outils.indexOf('\nfunction ' + n + '('); return d < 0 ? '' : outils.slice(d, outils.indexOf('\n}\n', d) + 3); };
ok('le « + » AJOUTE une ligne, sans rien effacer, et sélectionne le premier « … »', /\+ '\\n' : ''\) \+ ligne/.test(fo('_prescAjouter')) && /setSelectionRange/.test(fo('_prescAjouter')));
ok('favoris rangés par praticien', /'r4p-presc-favs-' \+/.test(fo('_prescFavsCle')));
ok('imprimer enregistre l\'ordonnance dans l\'historique', /_prescHistEnregistrer\(/.test(fo('printPrescription')));
ok('« Refaire » demande avant de remplacer un texte en cours', /r4pConfirmer\(/.test(fo('_prescRefaire')));
ok('sans la table en base, l\'historique reste dans le navigateur', /'r4p-presc-hist-' \+/.test(fo('_prescHistCleLocale')) && /_prescHistLocal\(pid\)/.test(fo('_prescHistCharger')));

console.log('\nLa table de l\'historique');
ok('une ligne par ordonnance, rattachée au patient', /CREATE TABLE IF NOT EXISTS public\.prescriptions/.test(sql) && /REFERENCES public\.patients\(id\) ON DELETE CASCADE/.test(sql));
ok('bornée au praticien, jamais anonyme, jamais réécrite', /AS RESTRICTIVE FOR ALL TO anon USING \(false\) WITH CHECK \(false\)/.test(sql)
   && /AS RESTRICTIVE FOR UPDATE TO authenticated USING \(false\)/.test(sql) && /REVOKE UPDATE ON public\.prescriptions FROM authenticated/.test(sql));
ok('rls-cas la contrôle', /TABLES_PATIENT = \[[^\]]*'prescriptions'/.test(rls) && /JAMAIS_ANONYME = \[[^\]]*'prescriptions'/.test(rls));

console.log('');
if (ko) { console.error(ko + ' cas en echec.'); process.exit(1); }
console.log('Prescription : le catalogue de l\'arrêté, en gabarits, avec favoris, historique et suggestions.');

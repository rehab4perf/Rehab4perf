/* ════════════════════════════════════════════════════════════════════════════
   Catalogue des produits que les masseurs-kinésithérapeutes peuvent prescrire
   Arrêté du 14 septembre 2026 (JO du 16 septembre 2026), qui abroge celui du
   9 janvier 2006 : 58 catégories, rangées ici en 11 rubriques.

   Conditions générales : dans le cadre des compétences du kinésithérapeute,
   sauf indication médicale contraire, hors produits utilisés pendant la séance.

   Chargé par outils.html (onglet Prescription). Garde-fou :
     node qualite/presc-catalogue-cas.js

   Règles tenues par ce fichier :
   - un libellé dit ce qu'on a le DROIT de prescrire, pas ce qu'on écrit :
     le « + » insère un GABARIT à compléter (« … ») ;
   - un médicament se prescrit en DCI (art. L5121-1-2 CSP) : dosage, forme,
     posologie, durée. Les exemples portent une posologie ADULTE USUELLE,
     à adapter — validés par le praticien ;
   - « NR » (non remboursable) n'est posé que sur les produits qu'ameli cite
     comme tels : coussins en fibres siliconées, attelles souples de posture
     ou de repos de série, embouts de cannes, talonnettes, pansements secs ou
     étanches pour la balnéothérapie. Aucun autre n'est deviné.
   ════════════════════════════════════════════════════════════════════════════ */

var PRESC_CATALOGUE = [
  { id:'medicaments', titre:'Médicaments', items:[
    { id:'antalgique', libelle:'Antalgique de palier 1 (OMS)', note:'Hors formes injectables', dci:true, exemples:[
      { libelle:'Paracétamol 1 g, comprimé', ligne:'PARACÉTAMOL 1 G, COMPRIMÉ — 1 COMPRIMÉ JUSQU’À 3 FOIS PAR JOUR, À 6 H D’INTERVALLE AU MOINS — DURÉE : … JOURS' },
      { libelle:'Paracétamol 500 mg, gélule', ligne:'PARACÉTAMOL 500 MG, GÉLULE — 1 À 2 GÉLULES JUSQU’À 3 FOIS PAR JOUR, SANS DÉPASSER 3 G PAR JOUR — DURÉE : … JOURS' }
    ]},
    { id:'myorelaxant', libelle:'Myorelaxant', note:'Hors formes injectables', dci:true, exemples:[
      { libelle:'Thiocolchicoside 4 mg, comprimé', ligne:'THIOCOLCHICOSIDE 4 MG, COMPRIMÉ — 2 COMPRIMÉS TOUTES LES 12 H — DURÉE : … JOURS (7 JOURS MAXIMUM)' }
    ]},
    { id:'mucolytique', libelle:'Mucolytique', dci:true, exemples:[
      { libelle:'Carbocistéine 750 mg, comprimé', ligne:'CARBOCISTÉINE 750 MG, COMPRIMÉ — 1 COMPRIMÉ 3 FOIS PAR JOUR — DURÉE : 5 JOURS' },
      { libelle:'Acétylcystéine 200 mg, sachet', ligne:'ACÉTYLCYSTÉINE 200 MG, POUDRE EN SACHET — 1 SACHET 3 FOIS PAR JOUR — DURÉE : 5 JOURS' }
    ]},
    { id:'antiseptique', libelle:'Antiseptique local', note:'Hors produits iodés', dci:true, exemples:[
      { libelle:'Chlorhexidine 0,05 %, solution', ligne:'CHLORHEXIDINE 0,05 %, SOLUTION POUR APPLICATION LOCALE — 1 À 2 APPLICATIONS PAR JOUR — DURÉE : … JOURS' }
    ]},
    { id:'creme-anesthesiante', libelle:'Crème anesthésiante', dci:true, exemples:[
      { libelle:'Lidocaïne / prilocaïne 5 %, crème', ligne:'LIDOCAÏNE 2,5 % / PRILOCAÏNE 2,5 %, CRÈME — APPLIQUER 1 H AVANT LE SOIN, SOUS PANSEMENT OCCLUSIF — QUANTITÉ : 1 TUBE' }
    ]},
    { id:'nicotine', libelle:'Substituts nicotiniques', dci:true, exemples:[
      { libelle:'Nicotine 21 mg/24 h, patch', ligne:'NICOTINE 21 MG/24 H, DISPOSITIF TRANSDERMIQUE — 1 PATCH PAR JOUR — DURÉE : … SEMAINES' },
      { libelle:'Nicotine 2 mg, gomme à mâcher', ligne:'NICOTINE 2 MG, GOMME À MÂCHER — 1 GOMME EN CAS D’ENVIE DE FUMER, 8 À 12 PAR JOUR, SANS DÉPASSER 30 — DURÉE : … SEMAINES' }
    ]}
  ]},
  { id:'marche', titre:'Aides à la marche et fauteuils', items:[
    { id:'cannes', libelle:'Cannes' },
    { id:'bequilles', libelle:'Béquilles', precision:'PAIRE' },
    { id:'deambulateur', libelle:'Déambulateur' },
    { id:'embouts', libelle:'Embouts de cannes', nr:true },
    { id:'fauteuil', libelle:'Fauteuil roulant manuel ou électrique', note:'Location de moins de 3 mois', precision:'MANUEL / ÉLECTRIQUE — EN LOCATION, DURÉE : … (MOINS DE 3 MOIS)' },
    { id:'poussette', libelle:'Poussette', note:'Location de moins de 3 mois', precision:'EN LOCATION, DURÉE : … (MOINS DE 3 MOIS)' }
  ]},
  { id:'domicile', titre:'Maintien à domicile et transferts', items:[
    { id:'lit', libelle:'Lit médicalisé', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'soulevement', libelle:'Potence, soulève-malade, harnais' },
    { id:'barrieres', libelle:'Barrières de lit, cerceaux' },
    { id:'redressement', libelle:'Barre de redressement, verticalisateur' },
    { id:'transfert', libelle:'Drap de glisse, planche ou guidon de transfert' },
    { id:'douche', libelle:'Barres de douche, rehausseur WC' },
    { id:'couverts', libelle:'Couverts adaptés' },
    { id:'fauteuil-repos', libelle:'Fauteuil de repos' }
  ]},
  { id:'escarres', titre:'Prévention des escarres', items:[
    { id:'matelas-hr', libelle:'Matelas en mousse haute résilience (gaufrier)' },
    { id:'matelas-air', libelle:'Matelas à air', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'coussin', libelle:'Coussin en fibres siliconées ou mousse monobloc', nr:true }
  ]},
  { id:'ortheses', titre:'Orthèses, attelles et chaussage', items:[
    { id:'attelle-serie', libelle:'Attelle souple, rigide ou articulée de série', precision:'LOCALISATION : … — TAILLE : …' },
    { id:'attelle-posture', libelle:'Attelle souple de posture ou de repos de série', precision:'LOCALISATION : … — TAILLE : …', nr:true },
    { id:'attelle-mesure', libelle:'Attelle souple sur mesure', precision:'LOCALISATION : …' },
    { id:'orthese-mesure', libelle:'Orthèse sur mesure (moulée, rigide ou articulée)', precision:'LOCALISATION : …' },
    { id:'orthese-progressive', libelle:'Orthèse à correction progressive', precision:'LOCALISATION : …' },
    { id:'orthese-thermo', libelle:'Orthèse thermoformable', precision:'LOCALISATION : …' },
    { id:'ceinture', libelle:'Ceinture lombaire de série', precision:'TAILLE : …' },
    { id:'sangle', libelle:'Sangle thoracique ou abdominale', precision:'TAILLE : …' },
    { id:'collier', libelle:'Collier cervical de repos de série', precision:'TAILLE : …' },
    { id:'talonnettes', libelle:'Talonnettes amortissantes', precision:'POINTURE : …', nr:true },
    { id:'chaussures', libelle:'Chaussures thérapeutiques de série', note:'Usage temporaire ou prolongé', precision:'USAGE TEMPORAIRE / PROLONGÉ — POINTURE : …' }
  ]},
  { id:'contention', titre:'Contention et strapping', items:[
    { id:'bas', libelle:'Bas, chaussettes ou collants de contention de série', precision:'CLASSE … — TAILLE : …' },
    { id:'manchon', libelle:'Manchon, bande ou orthèse de contention', precision:'CLASSE … — LOCALISATION : …' },
    { id:'strapping', libelle:'Bandes adhésives de contention souple ou rigide' },
    { id:'sparadrap', libelle:'Sparadrap' }
  ]},
  { id:'electro', titre:'Électrothérapie, froid et chaud', items:[
    { id:'tens', libelle:'Neurostimulateur TENS', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'excitomoteur', libelle:'Électrostimulateur excitomoteur', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'arthromoteur', libelle:'Arthromoteur', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'cryocompression', libelle:'Appareil de cryocompression', note:'Location', precision:'EN LOCATION, DURÉE : …' },
    { id:'cryotherapie', libelle:'Cryothérapie gazeuse ou compresses froides' },
    { id:'chaud', libelle:'Compresses chaudes, patchs chauffants' }
  ]},
  { id:'perineal', titre:'Rééducation périnéale et urinaire', items:[
    { id:'stimulateur-perineal', libelle:'Stimulateur périnéo-sphinctérien', note:'Location ou achat', precision:'LOCATION / ACHAT' },
    { id:'sonde', libelle:'Sonde périnéale ou anorectale, électrodes cutanées' },
    { id:'collecteurs', libelle:'Collecteurs d’urine, étuis péniens, urinal' },
    { id:'pessaire', libelle:'Pessaire', precision:'TAILLE : …' },
    { id:'preservatifs', libelle:'Préservatifs' },
    { id:'gel-vaginal', libelle:'Gel ou crème vaginale hydratante ou cicatrisante' }
  ]},
  { id:'respiratoire', titre:'Respiratoire et ORL', items:[
    { id:'debitmetre', libelle:'Débitmètre de pointe' },
    { id:'spirometre', libelle:'Spiromètre débitmétrique' },
    { id:'relaxateur', libelle:'Relaxateur de pression' },
    { id:'chambre', libelle:'Chambre d’inhalation' },
    { id:'aerosols', libelle:'Aérosols, humidification' },
    { id:'aspirateur', libelle:'Aspirateur trachéal et sondes d’aspiration' },
    { id:'nettoyage-voies', libelle:'Nettoyage des voies respiratoires' },
    { id:'lavage-nez', libelle:'Nécessaire de lavage de nez' },
    { id:'serum-physio', libelle:'Sérum physiologique isotonique unidose' },
    { id:'serum-hyper', libelle:'Sérum salé hypertonique pour nébulisation', note:'Renouvellement de prescription' },
    { id:'lingual', libelle:'Rééducation de la posture linguale et de la respiration nasale' },
    { id:'mandibulaire', libelle:'Rééducation des mouvements mandibulaires' }
  ]},
  { id:'surveillance', titre:'Surveillance', items:[
    { id:'oxymetre', libelle:'Oxymètre de pouls', note:'Réentraînement à l’effort' },
    { id:'saturometre', libelle:'Saturomètre' },
    { id:'tensiometre', libelle:'Tensiomètre' }
  ]},
  { id:'peau', titre:'Peau et cicatrisation', items:[
    { id:'pansement-balneo', libelle:'Pansements secs ou étanches pour la balnéothérapie', nr:true },
    { id:'pansement-etanche', libelle:'Pansements étanches' },
    { id:'hydrocolloide', libelle:'Pansements hydrocolloïdes' },
    { id:'cicatrisant', libelle:'Crème ou pansement cicatrisant' },
    { id:'emolliente', libelle:'Crème émolliente (glycérine, paraffine, vaseline)' }
  ]}
];

/* Un identifiant → son produit (et sa rubrique). */
var PRESC_INDEX = {};
PRESC_CATALOGUE.forEach(function(cat){
  cat.items.forEach(function(it){ PRESC_INDEX[it.id] = { item: it, cat: cat }; });
});

/* Le gabarit qu'insère le « + » d'un produit. « … » marque ce qui reste à
   compléter ; le premier est sélectionné à l'insertion. */
function _prescLigne(it){
  if(!it) return '';
  if(it.dci) return 'DCI : … — DOSAGE ET FORME : … — POSOLOGIE : … — DURÉE : …';
  return '… × ' + it.libelle.toUpperCase() + (it.precision ? ' — ' + it.precision : '') + (it.nr ? ' (NR)' : '');
}

/* Suggestions à partir du bilan en cours : les zones douloureuses, puis le
   diagnostic. Rien si le brouillon du bilan n'est pas celui du patient. */
var PRESC_SUGGESTIONS_ZONES = {
  'epaule':   ['attelle-posture', 'tens', 'cryotherapie', 'cryocompression'],
  'coude':    ['attelle-serie', 'tens', 'cryotherapie', 'strapping'],
  'poignet':  ['attelle-serie', 'attelle-posture', 'tens', 'cryotherapie'],
  'rachis-c': ['collier', 'tens', 'chaud'],
  'rachis-l': ['ceinture', 'tens', 'chaud'],
  'hanche':   ['cannes', 'bequilles', 'douche', 'tens'],
  'cuisse':   ['strapping', 'manchon', 'cryotherapie'],
  'genou':    ['bequilles', 'attelle-serie', 'cryocompression', 'arthromoteur', 'bas'],
  'jambe':    ['bas', 'strapping', 'cryotherapie'],
  'cheville': ['bequilles', 'attelle-serie', 'strapping', 'cryocompression'],
  'pied':     ['talonnettes', 'chaussures', 'strapping', 'cryotherapie']
};
var PRESC_SUGGESTIONS_MOTIFS = [
  { motif: /\b(lca|ligamentoplastie|prothese|ptg|pth|arthroplastie|menisc)/, ids: ['bequilles', 'cryocompression', 'arthromoteur', 'bas'] },
  { motif: /\b(bpco|mucoviscidose|bronch|respirat|asthme)/, ids: ['debitmetre', 'relaxateur', 'mucolytique', 'oxymetre'] },
  { motif: /\b(perine|incontinence|post-partum|postpartum|prostatectomie)/, ids: ['stimulateur-perineal', 'sonde'] },
  { motif: /\b(entorse)/, ids: ['attelle-serie', 'strapping', 'cryotherapie'] },
  { motif: /\b(lombalgie|lumbago|sciatique)/, ids: ['ceinture', 'tens', 'chaud'] }
];
function _prescNormTexte(s){
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function _prescSuggestions(bilan, patient){
  bilan = bilan || {};
  var nomB = _prescNormTexte(bilan['f-nom']), nomP = _prescNormTexte(patient && patient.nom);
  if(!nomB || !nomP || nomB !== nomP) return [];
  var ids = [];
  var ajouter = function(liste){ (liste || []).forEach(function(id){ if(PRESC_INDEX[id] && ids.indexOf(id) < 0) ids.push(id); }); };
  var zones = [];
  try { zones = JSON.parse(bilan['f-pain-zones'] || '[]') || []; } catch(e){ zones = []; }
  zones.forEach(function(z){ ajouter(PRESC_SUGGESTIONS_ZONES[z && z.zone]); });
  var motif = _prescNormTexte(bilan['f-motif']);
  PRESC_SUGGESTIONS_MOTIFS.forEach(function(r){ if(motif && r.motif.test(motif)) ajouter(r.ids); });
  return ids.slice(0, 8);
}

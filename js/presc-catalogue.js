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

/* Exemples de désignations pour les dispositifs (demande du praticien,
   2026-09-16) : l'équivalent des exemples en DCI des médicaments — une ligne
   précise et prescriptible, SANS marque ni référence commerciale (le
   remboursement porte sur la désignation générique). « … » reste à compléter.
   « (NR) » est ajouté d'office sur les produits non remboursables. */
var PRESC_EXEMPLES_DM = {
  'cannes':            [['Canne anglaise réglable', '1 CANNE ANGLAISE RÉGLABLE'], ['Canne tripode', '1 CANNE TRIPODE'], ['Canne simple en T', '1 CANNE SIMPLE EN T']],
  'bequilles':         [['Paire de cannes anglaises', '1 PAIRE DE CANNES ANGLAISES RÉGLABLES']],
  'deambulateur':      [['Déambulateur fixe', '1 DÉAMBULATEUR FIXE'], ['Déambulateur à 2 roues', '1 DÉAMBULATEUR À 2 ROUES'], ['Rollator 4 roues avec siège', '1 DÉAMBULATEUR À 4 ROUES AVEC SIÈGE ET FREINS']],
  'embouts':           [['Embouts antidérapants', '2 EMBOUTS DE CANNE ANTIDÉRAPANTS']],
  'fauteuil':          [['Fauteuil manuel non modulaire', '1 FAUTEUIL ROULANT MANUEL NON MODULAIRE — EN LOCATION, DURÉE : … SEMAINES (MOINS DE 3 MOIS)'], ['Fauteuil manuel modulaire', '1 FAUTEUIL ROULANT MANUEL MODULAIRE — EN LOCATION, DURÉE : … SEMAINES (MOINS DE 3 MOIS)']],
  'lit':               [['Lit à hauteur variable électrique', '1 LIT MÉDICALISÉ À HAUTEUR VARIABLE ÉLECTRIQUE — EN LOCATION, DURÉE : …']],
  'soulevement':       [['Potence de lit', '1 POTENCE DE LIT'], ['Soulève-malade électrique et harnais', '1 SOULÈVE-MALADE ÉLECTRIQUE AVEC HARNAIS — TAILLE DU HARNAIS : …']],
  'redressement':      [['Barre d’appui de redressement', '1 BARRE D’APPUI DE REDRESSEMENT']],
  'transfert':         [['Planche de transfert', '1 PLANCHE DE TRANSFERT'], ['Drap de glisse', '1 DRAP DE GLISSE']],
  'douche':            [['Rehausseur de WC', '1 REHAUSSEUR DE WC'], ['Barre d’appui de douche', '1 BARRE D’APPUI POUR DOUCHE']],
  'matelas-hr':        [['Matelas gaufrier', '1 MATELAS EN MOUSSE HAUTE RÉSILIENCE DE TYPE GAUFRIER']],
  'coussin':           [['Coussin d’assise en fibres siliconées', '1 COUSSIN D’ASSISE EN FIBRES SILICONÉES']],
  'attelle-serie':     [['Orthèse de stabilisation de cheville', '1 ORTHÈSE DE STABILISATION DE CHEVILLE DE SÉRIE — CÔTÉ : … — TAILLE : …'], ['Attelle d’immobilisation du genou en extension', '1 ATTELLE D’IMMOBILISATION DU GENOU EN EXTENSION DE SÉRIE — TAILLE : …'], ['Orthèse articulée de genou', '1 ORTHÈSE ARTICULÉE DE GENOU DE SÉRIE — CÔTÉ : … — TAILLE : …']],
  'attelle-posture':   [['Attelle de repos poignet-main', '1 ATTELLE SOUPLE DE REPOS POIGNET-MAIN DE SÉRIE — CÔTÉ : … — TAILLE : …'], ['Attelle de posture de cheville', '1 ATTELLE SOUPLE DE POSTURE DE CHEVILLE DE SÉRIE — CÔTÉ : … — TAILLE : …']],
  'ceinture':          [['Ceinture lombaire de soutien', '1 CEINTURE LOMBAIRE DE SOUTIEN DE SÉRIE — TAILLE : …']],
  'collier':           [['Collier cervical souple', '1 COLLIER CERVICAL SOUPLE DE REPOS DE SÉRIE — TAILLE : …']],
  'talonnettes':       [['Talonnettes en silicone', '1 PAIRE DE TALONNETTES AMORTISSANTES EN SILICONE — POINTURE : …']],
  'chaussures':        [['Chaussure de décharge de l’avant-pied', '1 CHAUSSURE THÉRAPEUTIQUE DE DÉCHARGE DE L’AVANT-PIED, USAGE TEMPORAIRE — CÔTÉ : … — POINTURE : …'], ['Chaussures à usage prolongé', '1 PAIRE DE CHAUSSURES THÉRAPEUTIQUES À USAGE PROLONGÉ — POINTURE : …']],
  'bas':               [['Chaussettes de contention classe 2', '2 PAIRES DE CHAUSSETTES DE CONTENTION CLASSE 2 — TAILLE : …'], ['Bas-cuisses de contention classe 2', '2 PAIRES DE BAS-CUISSES DE CONTENTION CLASSE 2 — TAILLE : …'], ['Collants de contention classe 2', '2 COLLANTS DE CONTENTION CLASSE 2 — TAILLE : …']],
  'manchon':           [['Manchon de contention du membre supérieur', '1 MANCHON DE CONTENTION DU MEMBRE SUPÉRIEUR CLASSE … — CÔTÉ : … — TAILLE : …']],
  'strapping':         [['Bande adhésive élastique 6 cm', '… BANDES ADHÉSIVES ÉLASTIQUES DE CONTENTION 6 CM'], ['Bande adhésive inextensible 3,8 cm', '… BANDES ADHÉSIVES INEXTENSIBLES 3,8 CM (CONTENTION RIGIDE)']],
  'tens':              [['TENS avec électrodes', '1 NEUROSTIMULATEUR TRANSCUTANÉ (TENS) AVEC ÉLECTRODES — EN LOCATION, DURÉE : … SEMAINES']],
  'excitomoteur':      [['Électrostimulateur 2 canaux', '1 ÉLECTROSTIMULATEUR EXCITOMOTEUR 2 CANAUX AVEC ÉLECTRODES — EN LOCATION, DURÉE : … SEMAINES']],
  'arthromoteur':      [['Arthromoteur de genou', '1 ARTHROMOTEUR DE GENOU — EN LOCATION, DURÉE : … SEMAINES']],
  'cryocompression':   [['Cryocompression, manchon genou', '1 APPAREIL DE CRYOCOMPRESSION AVEC MANCHON GENOU — EN LOCATION, DURÉE : … SEMAINES'], ['Cryocompression, manchon épaule', '1 APPAREIL DE CRYOCOMPRESSION AVEC MANCHON ÉPAULE — EN LOCATION, DURÉE : … SEMAINES']],
  'cryotherapie':      [['Compresses froides réutilisables', '… COMPRESSES DE CRYOTHÉRAPIE RÉUTILISABLES']],
  'chaud':             [['Patchs chauffants', '… PATCHS CHAUFFANTS']],
  'stimulateur-perineal': [['Stimulateur et sonde vaginale', '1 STIMULATEUR DE RÉÉDUCATION PÉRINÉALE AVEC SONDE VAGINALE — EN LOCATION, DURÉE : …'], ['Stimulateur et sonde anale', '1 STIMULATEUR DE RÉÉDUCATION PÉRINÉALE AVEC SONDE ANALE — EN LOCATION, DURÉE : …']],
  'sonde':             [['Sonde vaginale', '1 SONDE VAGINALE DE RÉÉDUCATION PÉRINÉALE'], ['Sonde anale', '1 SONDE ANALE DE RÉÉDUCATION PÉRINÉALE']],
  'debitmetre':        [['Débitmètre de pointe', '1 DÉBITMÈTRE DE POINTE (PEAK-FLOW)']],
  'chambre':           [['Chambre d’inhalation avec masque', '1 CHAMBRE D’INHALATION AVEC MASQUE — ADULTE / ENFANT']],
  'lavage-nez':        [['Dispositif de lavage à grand volume', '1 DISPOSITIF DE LAVAGE DE NEZ À GRAND VOLUME']],
  'serum-physio':      [['Unidoses de 5 ml', '… BOÎTES DE SÉRUM PHYSIOLOGIQUE EN UNIDOSES DE 5 ML']],
  'serum-hyper':       [['Hypertonique 7 % pour nébulisation', 'SÉRUM SALÉ HYPERTONIQUE À 7 % POUR NÉBULISATION — QUANTITÉ : … (RENOUVELLEMENT)']],
  'oxymetre':          [['Oxymètre de doigt', '1 OXYMÈTRE DE POULS DE DOIGT']],
  'tensiometre':       [['Tensiomètre électronique au bras', '1 TENSIOMÈTRE ÉLECTRONIQUE AU BRAS']],
  'pansement-balneo':  [['Pansements étanches de balnéothérapie', '… PANSEMENTS ÉTANCHES POUR LA BALNÉOTHÉRAPIE — TAILLE : …']],
  'hydrocolloide':     [['Pansements hydrocolloïdes', '… PANSEMENTS HYDROCOLLOÏDES — TAILLE : …']],
  'emolliente':        [['Crème émolliente', '1 TUBE DE CRÈME ÉMOLLIENTE (GLYCÉRINE, VASELINE, PARAFFINE)']]
};
PRESC_CATALOGUE.forEach(function(cat){
  cat.items.forEach(function(it){
    var ex = PRESC_EXEMPLES_DM[it.id];
    if(!ex || it.dci) return;
    it.exemples = ex.map(function(e){ return { libelle: e[0], ligne: e[1] + (it.nr ? ' (NR)' : '') }; });
  });
});

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

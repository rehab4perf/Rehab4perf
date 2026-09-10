/* ================================================================
   PROTOCOLES DE RÉFÉRENCE — la bibliothèque intégrée
   ================================================================
   Chargée par DEUX pages, avant leur propre code :
     - programme.html (avant js/prog-main.js) : le builder sème la ligne
       `__r4p_protocols_meta__` du praticien depuis cette liste, et y retombe
       tant que la ligne n'existe pas ;
     - athlete.html : « Mon protocole » y retombe pour un protocole que la
       ligne meta du praticien n'a pas — en particulier AVANT la première
       ouverture du panneau Protocoles, qui seule crée cette ligne.
   Elle vivait dans prog-main.js : l'espace athlète ne pouvait pas la lire,
   et restait vide entre l'affectation d'un protocole et cette ouverture.
   Garde-fou : node qualite/protocole-actif-cas.js
   Toute modification ici se versionne dans les deux pages
   (.claude/skills/deployer/scripts/bump-versions.js connaît le maillon). */
var PROTOCOLS_REF = [
  {
    id: 'lca',
    type: 'rehab',
    name: 'LCA',
    icon: 'genou',
    category: 'Pathologie',
    joint: 'Genou',
    source: 'Antoine Peronnaud',
    duration: '4–6 mois',
    isBuiltin: true,
    phases: [
      {
        id: 'p1',
        name: 'Phase 1 — Post-opératoire immédiat',
        weeks: '',
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        objectives: [
          'Contrôle de la douleur et réduction de l\'épanchement (genou sec)',
          'Récupération de l\'extension passive complète (0°)',
          'Activation sélective du vaste médial (VM)',
          'Reprise de la marche sans boiterie'
        ],
        precautions: [
          'Différencier les exercices selon l\'état du genou (irritable vs tolérant)',
          'Surveiller l\'épanchement après chaque séance',
          'Progression uniquement si genou sec en début de séance'
        ],
        weekly: [
          { week: 'Genou irritable', content: 'Isométrie IJ (couché ventral, RPE 3–5), contractions quadriceps + compex assis genou tendu puis fléchi — consigne "Remonter la rotule"' },
          { week: 'Genou tolérant', content: 'IJ excentrique, chaise isométrique bi/unipodal, extension genou isométrique 90° swissball, TKE, extension genou allongé' }
        ],
        exitCriteria: [
          'Genou sec',
          'Extension passive = 0°',
          'Marche sans boiterie',
          'Contraction sélective du VM validée',
          'Test du mur : contact mollet identique côté sain/opéré',
          'Test SLS : 3 squats unipodaux sans tremblement, extension comparable côté sain',
          '3 séances de renforcement consécutives sans douleur'
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2 — Renforcement & contrôle neuromusculaire',
        weeks: '',
        color: '#F0FDF4',
        borderColor: '#22C55E',
        objectives: [
          'Renforcement musculaire progressif (chaîne postérieure + quadriceps)',
          'Récupération de l\'amplitude articulaire complète',
          'Contrôle excentrique du quadriceps',
          'Activation et intégration du transverse'
        ],
        precautions: [
          'Surveiller l\'épanchement après augmentation de charge',
          'Progression des charges contrôlée (départ ≤ 50% 1RM)',
          'Contrôle du valgus dynamique sur tous les exercices unipodaux',
          'Pas de passage en phase 3 avant genou sec sous charge'
        ],
        weekly: [
          { week: 'Bloc A', content: '15–25 reps × 4 séries, ≤ 50% 1RM, récup 1\'30 : Back squat, Front squat, Pistol squat box, Cossack squat, Front lunge, Deadlift, Romanian DL, Hip thrust, Glute bridge (swissball + walk), Single leg RDL anti-valgus, Pall of press (debout + fentes), Deadbug élastique' }
        ],
        exitCriteria: [
          'Amplitude articulaire complète en flexion/extension',
          'Contrôle excentrique du quadriceps validé',
          'Activation et intégration du transverse',
          'Genou sec après augmentation de la charge d\'entraînement'
        ]
      },
      {
        id: 'p3',
        name: 'Phase 3 — Course / Sauts / Agilité / Travail Métabolique',
        weeks: '',
        color: '#FFF7ED',
        borderColor: '#F97316',
        objectives: [
          'Renforcement haute intensité (70–80% 1RM)',
          'Reprise progressive de la course (Zone 2)',
          'Validation des tests fonctionnels de symétrie',
          'Travail d\'agilité et réathlétisation sport-spécifique'
        ],
        precautions: [
          'Tests fonctionnels validés avant reprise de la course',
          'Pas de sauts/réceptions avant symétrie confirmée',
          'Surveiller le stiff landing à chaque exercice pliométrique',
          'Accord médical avant reprise compétition'
        ],
        weekly: [
          { week: 'Bloc renfo', content: '8–12 reps × 4 séries, RPE 8 / 70–80% 1RM : mêmes exercices que phase 2 en charges lourdes' },
          { week: 'Tests fonctionnels', content: 'Évaluation symétrie (protocole adapté à l\'athlète)' },
          { week: 'Bloc cardio', content: 'Course continue Zone 2, progression 5 → 20 min à 65% VMA' }
        ],
        exitCriteria: [
          'Symétrie aux tests fonctionnels',
          'Course sans douleur 20 min à 65% VMA (Zone 2)',
          'Absence de stiff landing à la réception',
          'Réussite des tests fonctionnels sport-spécifiques'
        ]
      }
    ]
  },
  {
    id: 'latarjet',
    type: 'rehab',
    name: 'Latarjet',
    icon: 'epaule',
    category: 'Pathologie',
    joint: 'Épaule',
    source: 'Bradley et al., 2021 · Falls & Popchak — Return to Competitive Sport After Anterior Shoulder Stabilization',
    duration: 'Piloté par critères — horizon 4 à 6 mois',
    isBuiltin: true,
    /* Les identifiants de phase sont volontairement en f1–f5 et non p1–p5 :
       les validations de critères sont stockées en base par (phase_id,
       criteria_index). Repartir sur un nouvel espace de noms garantit qu'une
       coche posée sur l'ancien protocole ne peut pas se reporter sur un
       nouveau critère qui n'a jamais été passé. */
    phases: [
      {
        id: 'f1',
        name: 'Phase 1 — Protection',
        weeks: 'Attelle 3–4 sem. · sortie sur critères',
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        objectives: [
          'Protéger le montage pendant la cicatrisation — immobiliser n\'est pas ne rien faire',
          'Récupérer 120° de flexion et d\'abduction passives',
          'Viser 0° de rotation externe minimum, jusqu\'à 30° si l\'ordonnance le permet',
          'Installer le contrôle neuromusculaire scapulaire dès les premiers jours',
          'Maintenir la condition physique générale : l\'athlète reste un athlète'
        ],
        precautions: [
          'Attelle 3 à 4 semaines, retirée pendant la séance pour activer la scapula',
          'Rotation externe < 30° — la butée traverse le subscapulaire, et cicatriser en rotation interne rend la RE très difficile à récupérer ensuite',
          'Aucune sollicitation active du biceps : la coracoïde transférée porte l\'insertion du chef court, une sollicitation trop précoce menace le montage chirurgical',
          'Sans mouvement, les trapèzes tirent et se surchargent — la scapula se travaille dès les premiers jours'
        ],
        weekly: [
          { week: 'La rotation externe', content: 'Viser 0° minimum, 30° si l\'ordonnance le permet. C\'est l\'amplitude la plus coûteuse à récupérer si on la néglige : la butée traverse le subscapulaire et une cicatrisation en rotation interne la verrouille durablement.' },
          { week: 'La scapula', content: 'Retirer l\'attelle pendant la séance pour activer la scapula. Sans mouvement, les trapèzes tirent et se surchargent. Bascule et sonnette actives, contrôle neuromusculaire scapulaire.' },
          { week: 'Le reste du corps', content: 'Éducation croisée et renforcement général. On limite le déconditionnement, et l\'athlète reste un athlète. Cardio adapté sans mise en charge du membre supérieur.' }
        ],
        exitCriteria: [
          'EVA < 3/10 au repos',
          'QuickDASH < 60 %',
          'Amplitude passive ≥ 120° en flexion et abduction',
          'Bascule scapulaire active normale'
        ]
      },
      {
        id: 'f2',
        name: 'Phase 2 — Endurance',
        weeks: 'Charge 2–3 kg pendant 6 à 8 sem. · sortie sur critères',
        color: '#F0FDF4',
        borderColor: '#22C55E',
        objectives: [
          'Passer de l\'amplitude active aidée à l\'amplitude active (AAROM → AROM)',
          'Rechercher la trophicité et l\'endurance — l\'objectif n\'est pas la force',
          'Restaurer le sens positionnel de l\'épaule',
          'Renforcer la coiffe des rotateurs et les stabilisateurs scapulaires',
          'Intégrer progressivement la chaîne cinétique'
        ],
        precautions: [
          '2 à 3 kg maximum, et sur des mouvements proches du corps',
          'Pendant 6 à 8 semaines, un bras de levier trop long fait courir un risque d\'arrachement de la coracoïde',
          'Peu de charge, beaucoup de répétitions'
        ],
        weekly: [
          { week: 'Pourquoi la chaîne fermée', content: 'Elle est très bien tolérée en phase précoce. Elle met de la compression dans la gléno-humérale et redonne énormément d\'information proprioceptive à l\'épaule.' },
          { week: 'Trois exercices pour démarrer', content: 'Pompes scapulaires · RE1 en couché latéral · Élévation antérieure résistée. Bras de levier court, charge faible, séries longues.' },
          { week: 'Contenu de la phase', content: 'AAROM → AROM · Chaîne fermée ++ · Sens positionnel · Coiffe des rotateurs · Stabilisateurs scapulaires.' }
        ],
        exitCriteria: [
          'EVA < 3/10 à l\'activité',
          'QuickDASH < 40 %',
          'AAROM = AROM',
          'Protocole de fatigue réussi — 20 élévations antérieures à 90°, 20 abductions à 90°, 20 RE1 en couché latéral à 2 % du poids de corps',
          'JAR réussi sous 90°'
        ]
      },
      {
        id: 'f3',
        name: 'Phase 3 — Renforcement',
        weeks: 'Pas avant 8 semaines post-opératoires',
        color: '#FFFBEB',
        borderColor: '#F59E0B',
        objectives: [
          'Construire la force — isolée d\'abord, fonctionnelle ensuite',
          'Récupérer les amplitudes en position 90/90',
          'Renforcer en overhead',
          'Débuter le travail en position d\'appréhension'
        ],
        precautions: [
          'Pas avant 8 semaines post-opératoires : c\'est la cicatrisation qui commande, aucun critère ne peut ouvrir cette phase plus tôt',
          'Un déficit de force est un facteur de risque — on ne se contente pas d\'un ressenti, on mesure au dynamomètre tout au long de la rééducation',
          'Évaluer en continu, pas seulement à la fin de la phase'
        ],
        weekly: [
          { week: 'Pourquoi la position 90/90', content: 'C\'est la position d\'armé du lancer, du smash et du service. La récupérer n\'est pas un supplément de confort : c\'est la condition du geste sportif.' },
          { week: 'Le continuum de rotation externe', content: 'La même fonction, travaillée dans des positions de plus en plus exigeantes — de la RE coude au corps jusqu\'à la position 90/90, puis l\'overhead.' },
          { week: 'Contenu de la phase', content: 'Amplitudes 90/90 ++ · Renforcement overhead · Isolé puis fonctionnel · Début du travail d\'appréhension.' }
        ],
        exitCriteria: [
          'Aucune appréhension',
          'QuickDASH < 20 %',
          'Amplitude active > 90 % du côté sain',
          'HHD > 90 % de symétrie avec le côté sain',
          'JAR réussi en overhead',
          'Questionnaire SI-RSI renseigné'
        ]
      },
      {
        id: 'f4',
        name: 'Phase 4 — Puissance',
        weeks: 'Moins lourd, plus vite',
        color: '#FFF7ED',
        borderColor: '#F97316',
        objectives: [
          'Développer la puissance : P = force × vitesse',
          'Pliométrie du membre supérieur',
          'Travail d\'éjection et lancers',
          'Travail en position d\'appréhension ++',
          'Retrouver les amplitudes qu\'exige réellement le geste sportif'
        ],
        precautions: [
          'Après trois phases passées à monter la charge, on l\'inverse — la puissance n\'est pas de la force',
          'Le chaos : réaliser des gestes sous fatigue, avec plusieurs informations à traiter en même temps. L\'objectif n\'est plus l\'exercice propre, c\'est de se rapprocher du match',
          'Les amplitudes visées sont celles du terrain, pas celles du bilan'
        ],
        weekly: [
          { week: 'Trois entrées vers la pliométrie', content: 'Drop jump en position de pompes — mains sur des steps, on se laisse tomber · Pompes sautées · Contraste lourd / léger.' },
          { week: 'Contenu de la phase', content: 'Pliométrie · Travail d\'éjection · Lancers · Contraste de charge · Position d\'appréhension ++.' }
        ],
        /* La batterie de tests est choisie selon le sport : la lister test par
           test rendrait la phase impossible à valider pour un athlète non
           concerné (un coureur ne passe pas de test de lancer). Le critère est
           donc formulé au niveau de la batterie, les tests étant cités en
           exemples à choisir. */
        exitCriteria: [
          'Batterie de tests choisie selon le sport et validée — CKCUEST, ULRT, ASH, UQ-YBT, PSET',
          'Questionnaire SI-RSI',
          'Aucune appréhension dans les positions sportives'
        ]
      },
      {
        id: 'f5',
        name: 'Phase 5 — Retour au sport',
        weeks: 'Horizon 4 à 6 mois',
        color: '#FDF4FF',
        borderColor: '#A855F7',
        objectives: [
          'Être fort dans les amplitudes extrêmes demandées par le sport',
          'Retrouver le niveau d\'avant la blessure',
          'Restaurer la confiance — la tête décide autant que l\'épaule',
          'Charger à l\'intensité réelle de la compétition'
        ],
        precautions: [
          'Le cabinet n\'est pas le terrain : le sport sera toujours plus exigeant que la salle de rééducation',
          'C\'est la phase où l\'on ose enfin charger. Sous-doser ici, c\'est renvoyer l\'athlète sur le terrain avec une épaule jamais confrontée à ce que le terrain lui demandera',
          'Aide du coach et du préparateur physique à intégrer'
        ],
        weekly: [
          { week: 'Contenu de la phase', content: 'Jeux avec contact · Intensité de match · Drills spécifiques · Lancers par intervalles pour les athlètes overhead.' },
          { week: 'Ce qu\'on mesure', content: 'La confiance. Le SI-RSI évalue l\'appréhension au retour au sport — la tête décide autant que l\'épaule.' }
        ],
        exitCriteria: [
          'Drills sport-spécifiques réussis',
          'Entraînement mené à intensité de match',
          'Progression du geste dominant validée — lancers par intervalles pour les athlètes overhead',
          'Force conservée dans les amplitudes extrêmes du sport',
          'SI-RSI satisfaisant et athlète confiant'
        ]
      }
    ]
  },

  /* ── Flexion dorsale cheville ── */
  {
    id: 'flexion-dorsale-cheville',
    type: 'library',
    name: 'Flexion dorsale cheville',
    icon: 'pied',
    category: 'Mobilité',
    source: 'Antoine Peronnaud',
    duration: 'Séance unique',
    description: 'Arbre décisionnel pour le bilan et le traitement des limitations en flexion dorsale de cheville. Identifier la localisation du blocage au WBLT, puis discriminer la structure responsable.',
    entryTest: {
      name: 'WBLT (Weight Bearing Lunge Test)',
      description: 'Identifier la localisation de la sensation de blocage'
    },
    branches: [
      {
        id: 'anterieur',
        label: 'Antérieur',
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        blocs: [
          { id: '_tj9zmz4', title: 'Test', exos: [
            { id: '_r7z372w', libId: 'c1777818298038',
              name: 'Posterior talar glide test',
              url: 'https://youtu.be/ypwvbBcF6Y4?is=dkwhUnVcaT7Ib4Kn',
              consigne: 'Asymétrie > 4° => talocrural\nAsymétrie < 4° => chopart',
              reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_gvlp333', title: 'Rehab Asymétrie > 4° — TALO-CRURAL', exos: [
            { id: '_bqvm0st', libId: 'c1777818482390', name: 'Mobilisation antéro-postérieur du talus',           url: 'https://youtu.be/J0gO8BfHsEs?is=ikhKlmON8di5zc13', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_q6bpztc', libId: 'c1777818554296', name: 'Mobilisation antéro-postérieur du talus (Mulligan)', url: 'https://youtu.be/GHcsdaiS0WE?is=vTKAVVU7vqVuux75',  reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_ydtofis', title: 'Rehab Asymétrie < 4° — CHOPART', exos: [
            { id: '_c00jdbj', libId: 'c1777818801958', name: 'Mobilisation transverse du tarse',          url: 'https://youtu.be/myFVAxjCzqk?is=DkWceAmMl2sXgKwC', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_82qg1tp', libId: 'c1777818837489', name: 'Mobilisation transverse du tarse (Mulligan)', url: 'https://youtu.be/uSPRHeoCgf8?is=ci4X1gPsi5IVZBhK',  reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]}
        ]
      },
      {
        id: 'antero-lateral',
        label: 'Antéro-latéral',
        color: '#FFFBEB',
        borderColor: '#F59E0B',
        blocs: [
          { id: '_esz4w0g', title: 'TEST', exos: [
            { id: '_k128375', libId: 'c1777819009753',
              name: 'Kleiger test (syndesmose)',
              url: 'https://youtu.be/nJbnquuD5Sg?is=_s7Bh-N2aWJkvWqR',
              consigne: 'Si test + : Syndesmose\nSi test - : Conflit antéro-latéral',
              reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_0djpi7e', title: 'Rehab (syndesmose + conflit antéro-latéral)', exos: [
            { id: '_ejtflv9', libId: 'c1777819303073', name: 'Mobilisation antéro-postérieur tibiofibulaire',           url: 'https://youtu.be/KjYh_650wwM?is=bp1u_QzDdwLqp8Yw', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_xa58rxg', libId: 'c1777819362407', name: 'Mobilisation antéro-postérieur tibiofibulaire (Mulligan)', url: 'https://youtu.be/P1VWOTCQz-Y?is=7shVEAXN016H47cA', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]}
        ]
      },
      {
        id: 'medial-retromall',
        label: 'Médial rétromalléolaire',
        color: '#F0FDF4',
        borderColor: '#22C55E',
        blocs: [
          { id: '_o533xwd', title: 'Test', exos: [
            { id: '_6rub6r3', libId: 'c1777838105421',
              name: 'WBLT + Hallux dorsiflexion',
              url: '',
              consigne: 'Comparer au WBLT classique :\n— Si douleur augmente ou ROM diminue > 1,5 cm → LTFH\n— Sinon → Sous-talienne',
              reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_o2su0lp', title: 'LTFH', exos: [
            { id: '_mjypvne', libId: 'c1777838290074', name: 'Étirement du LTFH', url: 'https://youtu.be/7gp0SbtW0wE?is=Lq4w483qi_bRbHzu', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_03u2nnk', title: 'Sous-talienne', exos: [
            { id: '_az1qjh8', libId: 'c1777838353809', name: 'Mobilisation médio-latéral de la sous-talienne',  url: 'https://youtu.be/TzFkSfU99ec?is=iA2n8p4ZPkdQ04is', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_jod455s', libId: 'c1777838411460', name: 'Mobilisation latéro-médial de la sous-talienne', url: 'https://youtu.be/s4k0jqDIkc8?is=U175aAz_h6aW0hYD',  reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]}
        ]
      },
      {
        id: 'lateral-retromall',
        label: 'Latéral rétromalléolaire',
        color: '#FFF7ED',
        borderColor: '#F97316',
        blocs: [
          { id: '_xbenezg', title: 'Test', exos: [
            { id: '_xa9h85l', libId: 'c1777838591737',
              name: 'WBLT + inversion',
              url: '',
              consigne: 'Comparer au WBLT classique :\n— Si douleur augmente ou ROM diminue > 1,5 cm → Tendinopathie des fibulaires\n— Sinon → Tibiofibulaire inférieur',
              reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_1fes75o', title: 'Fibulaires', exos: [
            { id: '_rku1i5i', libId: 'c1777838776758', name: 'Étirement des fibulaires',         url: 'https://youtu.be/1djX7cIsBMg?is=A4mg7Cd0cYAgsN8Q', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_dim6mf7', libId: 'c1777839390292', name: 'Éversion de cheville isométrique', url: 'https://youtu.be/QmquJBw2JT0?is=TlsYYb6YFToouoIx', reps:'', duree:'45s', series:'3', recup:'120', tempo:'', chained:false, cibles:[{type:'RPE',min:'4',max:'7'}], obj:'' }
          ]},
          { id: '_z5j97hq', title: 'Tibiofibulaire inférieur', exos: [
            { id: '_rjvl5cy', libId: 'c1777839473325', name: 'Mobilisation postéro-antérieur tibiofibulaire inférieur',           url: 'https://youtu.be/_qC0jRbA5l0?is=ZLC1816sRPN9xCso', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' },
            { id: '_que0pa0', libId: 'c1777839527912', name: 'Mobilisation postéro-antérieur tibiofibulaire inférieur (Mulligan)', url: 'https://youtu.be/GVu-sH0zF5I?is=lXdCXQM5GnFaCQbL', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]}
        ]
      },
      {
        id: 'posterieur',
        label: 'Postérieur',
        color: '#FDF4FF',
        borderColor: '#A855F7',
        blocs: [
          { id: '_i2uo0ll', title: 'Test', exos: [
            { id: '_7ko0pd7', libId: 'c1777839734378',
              name: 'SLUMP test',
              url: 'https://youtu.be/HFGfP84uwEo?is=jeEWYFV8cO65D_zK',
              consigne: 'Si douleur augmente ou ROM diminue → Mécanosensibilité neurale (nerf tibial)\nSinon → Raideur du triceps sural',
              reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_yqxlgf4', title: 'Nerf tibial', exos: [
            { id: '_2cqnaaz', libId: 'c1777839934435', name: 'Neurodynamie nerf tibial', url: 'https://youtu.be/qZZIy5zAnBQ?is=Wx7Wp5PXdRv-cfcn', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]},
          { id: '_g6ir442', title: 'Triceps sural', exos: [
            { id: '_ep0tez7', libId: 'c1777840032716', name: 'Étirement du triceps sural', url: 'https://youtu.be/J-nbiHzMKHc?is=VTQfzs2-KkvEuPEF', reps:'', duree:'', series:'', recup:'', tempo:'', chained:false, cibles:[], obj:'' }
          ]}
        ]
      }
    ]
  },
  {
    id: 'menisque',
    type: 'rehab',
    name: 'Réparation Méniscale',
    icon: 'genou',
    category: 'Pathologie',
    joint: 'Genou',
    source: 'Kinesport',
    duration: 'Variable selon critères',
    isBuiltin: true,
    phases: [
      {
        id: 'p1',
        name: 'Phase 1 — Post-lésionnelle / Mouvement protégé',
        weeks: '',
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        objectives: [
          'Protéger la cicatrisation des tissus réparés',
          'Réduire la douleur et l\'œdème au niveau du genou, du pied et de la cheville',
          'Rétablir l\'extension complète du genou',
          'Restaurer les quadriceps et l\'activation des muscles environnants'
        ],
        precautions: [
          'Protection maximale — pas de course, saut ou activité pliométrique',
          'Mise en charge modifiée et/ou assistée',
          'Déchirures stables : MEC autorisée sous couvert attelle verrouillée en extension 4 semaines → déverrouillage semaines 5/6 → sevrage > 6 semaines',
          'Déchirures instables : MEC proscrite 4 semaines → MEC progressive > 4 semaines → déverrouillage à 90° > 6 semaines → sevrage quand marche qualitative'
        ],
        weekly: [
          { week: 'Exercices', content: 'Mobilité patellaire · Extension complète de genou · Flexion progressive selon recommandations postopératoires · Stabilisation du tronc · Renforcement autour de la hanche · Recrutement quadricipital progressif sans douleur fémoro-patellaire · Marche selon consignes postopératoires · Équilibre bipodal selon consignes postopératoires' }
        ],
        exitCriteria: [
          'Absence d\'épanchement actif',
          'Mobilité patellaire normale',
          '20 levées de jambe sans faiblesse des extenseurs',
          'Extension active complète du genou',
          'Démarche normale sans compensation bassin/tronc',
          'Activation du quadriceps validée',
          'Qualité trophique du genou',
          'Autorisation médicale pour mise en charge complète'
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2 — À faible impact',
        weeks: '',
        color: '#F0FDF4',
        borderColor: '#22C55E',
        objectives: [
          'Rétablir l\'amplitude articulaire passive complète',
          'Rétablir la cinématique de mise en charge symétrique',
          'Rétablir l\'équilibre jambe opérée / jambe controlatérale',
          'Normaliser le schéma de marche sans assistance',
          'Retour au travail léger (bureau, conduite)',
          'Retour sport faible impact (natation, cyclisme, marche linéaire 2×/semaine)'
        ],
        precautions: [],
        weekly: [
          { week: 'Exercices', content: 'Maintenir extension genou · Progression de la flexion selon restrictions · Pratique aquatique · Stabilisation du tronc · Renforcement chaîne postérieure · Exercices chaîne fermée bipodal → unipodal · Exercices chaîne ouverte sans douleur · Exercices cardiovasculaires' }
        ],
        exitCriteria: [
          'Montée/descente escaliers sans compensations',
          'Pas de douleur post-activité > 24h',
          'Squat 75° qualitatif sans douleur',
          'Station unipodale 30s sans perte d\'équilibre ni douleur',
          'Démarche normale (escaliers)',
          'Qualités biomécaniques et proprioceptives validées'
        ]
      },
      {
        id: 'p3',
        name: 'Phase 3 — Linéaire / Force & Course',
        weeks: '',
        color: '#FFF7ED',
        borderColor: '#F97316',
        objectives: [
          'Maintenir l\'amplitude articulaire passive complète',
          'Rétablir la stabilité durant les activités unipodales',
          'Rétablir le schéma de course',
          'Retour à l\'activité professionnelle',
          'Retour sport amateur (Tegner 4–5)'
        ],
        precautions: [
          'Autorisation requise pour reprise course/saut (généralement pas avant 3 mois post-réparation méniscale)',
          'Pas de changement de direction'
        ],
        weekly: [],
        exitCriteria: [
          'Douleur < 2/10 durant les exercices',
          'Pas de valgus dynamique en unipodal',
          'Single Leg Step Down sans ou léger valgus',
          'Force LSI > 80%',
          'Récupération force symétrique',
          'Schéma de course normal',
          'Pas de douleur pendant ni après les activités'
        ]
      },
      {
        id: 'p4',
        name: 'Phase 4 — Retour à l\'activité (Impact élevé)',
        weeks: '',
        color: '#FDF4FF',
        borderColor: '#A855F7',
        objectives: [
          'Progression course/agilité en interval training',
          'Contrôle réception bipodale/unipodale sans compensation inter-membres',
          'Retour sport de contact amateur',
          'Retour compétition / haut niveau (Tegner 6–10)'
        ],
        precautions: [
          'Réservé aux patients ayant un objectif d\'activité Tegner 6 à 10'
        ],
        weekly: [
          { week: 'Exercices', content: 'Force et endurance sur les exercices de la phase 3 · Progression pliométrie / agilité / sauts · Puissance · Rééducation neuromusculaire · Gainage et stabilisation · Entraînements spécifiques au sport · Exercices cardiovasculaires' }
        ],
        exitCriteria: [
          'Pas d\'œdème',
          'Circonférence cuisse Δ < 1,5 cm',
          'Amplitude articulaire égale',
          'Single Leg Step Down sans valgus dynamique',
          'Single hop / Triple hop / Triple crossover hop / 6m hop / 505 Test validés',
          'ACL-RSI > 65%',
          'Tests de sauts LSI > 90%',
          'Force isocinétisme quadriceps > 90% côté opposé',
          '505 test > 90% côté opposé'
        ]
      }
    ]
  },
  {
    id: 'lcm-chirurgical',
    type: 'rehab',
    name: 'LCM post-chirurgical',
    icon: 'genou',
    category: 'Pathologie',
    source: 'Kinesport',
    duration: '20 semaines (RTP 6–9 mois)',
    joint: 'Genou',
    isBuiltin: true,
    phases: [
      {
        id: 'p1',
        name: 'Phase 1 — Post-opératoire',
        weeks: 'S0 → S6',
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        objectives: [
          'Amplitude de mouvement',
          'Marche',
          'Soins de la plaie',
          'Contrôle douleur et œdème',
          'Renforcement précoce'
        ],
        precautions: [
          'Attelle articulée : 0–90° de flexion les 4 premières semaines, puis 130° à 6 semaines',
          'ROM passive les 2 premières semaines → active assistée → active',
          'ROM complète attendue à 6–8 semaines (peut prendre jusqu\'à 6–10 semaines)',
          'Marche en décharge ou pas-simulé durant les 6 premières semaines',
          'Ablation des sutures 10–14 jours post-op'
        ],
        weekly: [
          { week: 'Exercices', content: 'Mobilisation rotulienne, tissus mous et cicatriciels · Vélo stationnaire selon amplitudes tolérées · Réduction œdème : drainage, cryothérapie, pressothérapie · Récupération activation quadriceps · Renforcement muscles de hanche (adducteurs, abducteurs, extenseurs) · Activation pompe tricipitale avec maintien de l\'attelle' }
        ],
        exitCriteria: [
          'Pas de douleur durant la mobilisation 0–90°',
          'Sweep test (0–1+)',
          'Lever jambe tendue sans perte d\'activation du quadriceps',
          'Marche sans béquille, sans boiterie et sans douleur avec attelle déverrouillée',
          'Douleur, œdème, ROM et activation quadriceps contrôlés'
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2 — Contrôle Moteur',
        weeks: 'S6 → S12',
        color: '#F0FDF4',
        borderColor: '#22C55E',
        objectives: [
          'Récupération de la force',
          'Correction des facteurs causaux',
          'Course en ligne à faible intensité'
        ],
        precautions: [
          'Renforcement chaîne fermée possible à partir de 6 semaines post-op si contrôle quadricipital',
          'Leg Press limité à 70° sur les premières séances en chaîne fermée',
          'Vigilance sur les facteurs de causalité : valgus genou, faiblesse abducteurs/rotateurs externes hanche, pronation pied, faiblesse du tronc',
          'Reprise course : balnéothérapie → tapis → terrain'
        ],
        weekly: [
          { week: 'Exercices', content: 'Renforcement progressif chaîne ouverte → chaîne fermée · Stabilisateurs dynamiques du genou (quadriceps, ischio-jambiers) · Stabilisateurs sus- et sous-jacents (bassin, glutéaux, triceps sural) · Course en ligne à faible intensité progressive (distances spécifiques au sport)' }
        ],
        exitCriteria: [
          'LSI > 80%',
          'Pas de valgus de genou dans les exercices de réhabilitation',
          'Pas de valgus ni de douleur lors du jogging en ligne',
          'Récupération d\'une force symétrique',
          'Correction biomécanique validée',
          'Course en ligne qualitative'
        ]
      },
      {
        id: 'p3',
        name: 'Phase 3 — Retour au sport',
        weeks: 'S12 → RTP',
        color: '#FFF7ED',
        borderColor: '#F97316',
        objectives: [
          'Progresser de la course à faible intensité au sprint',
          'Travail du changement de direction',
          'Incorporer renforcement fonctionnel',
          'Récupération des performances physiques'
        ],
        precautions: [
          'Vigilance absolue sur le valgus de genou lors des changements de direction',
          'Progression COD : excentrique décélération → poussée → COD complet',
          'Adaptation au sport, à la position et aux capacités du sportif'
        ],
        weekly: [
          { week: 'Exercices', content: 'Progression course : distance spécifique au sport → volume → intensité → sprint · Changements de direction progressifs · Renforcement fonctionnel : proprioception, pliométrie, agilité, exercices spécifiques au sport · Prévention secondaire' }
        ],
        exitCriteria: [
          'ROM similaire au côté opposé',
          'Pas de douleur à la palpation du LCM',
          'Signe du glaçon négatif',
          'Valgus stress test négatif (pas d\'instabilité)',
          'LSI > 90% quadriceps et ischio-jambiers',
          'Pas de douleur au sprint',
          'Pas de douleur ni valgus lors des COD, pliométrie et agilité',
          'LSI > 90% au 505 test',
          'Amplitude, stabilité articulaire, force musculaire et performances physiques adéquates'
        ]
      }
    ]
  }
];

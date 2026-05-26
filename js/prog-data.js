/* ── Constantes localStorage ─────────────────────────────────────────
   Source unique de vérité pour toutes les clés de stockage local.
   Modifier ici = propagé partout dans ce fichier. ────────────────── */
var R4P_KEYS = {
  PATIENT              : 'r4p-current-patient',
  PROFILE              : 'r4p-profile',
  BILAN_DRAFT          : 'athletik-bilan',
  SUPABASE_AUTH        : 'sb-sxdobjodxkwexaspepdm-auth-token',
  CAL_EVENTS           : 'r4p-cal-events',
  CYCLES               : 'r4p-cycles',
  SEANCES              : 'r4p-seances',
  TEMPLATES            : 'r4p-templates',
  TEMPLATE_GROUPS      : 'r4p-template-groups',
  CUSTOM_PROTOCOLS     : 'r4p-custom-protocols',
  CUSTOM_PROTOCOLS_SID : 'r4p-custom-protocols-sid',
  FAV_EXOS             : 'r4p-fav-exos',
  PICKER_FAVS          : 'r4p_picker_favs',
  LIBRARY              : 'r4p-library',
  EXPANDED_GROUPS      : 'r4p-expanded-groups',
  COLLAPSED_CATS       : 'r4p-collapsed-cats',
  LIB_CAT_COLLAPSED    : 'r4p-lib-cat-collapsed',
  J0_PREFIX            : 'r4p-j0-',
  PEVO_SEL_PREFIX      : 'r4p-pevo-sel-',
  PEVO_DUREE_PREFIX    : 'r4p-pevo-duree-',
  PEVO_CARDIO_PREFIX   : 'r4p-pevo-cardio-'
};

/* ================================================================
   NETWORK HELPER — fetch with exponential-backoff retry
   Retries on: network error (TypeError) or HTTP 5xx / 429.
   POST on 5xx is NOT retried (non-idempotent, risk of duplicates).
   ================================================================ */
function _fetchRetry(url, opts, _n) {
  _n = _n || 0;
  var method = ((opts && opts.method) || 'GET').toUpperCase();
  return window.fetch(url, opts).then(function(r) {
    // 4xx (except 429) → pass through immediately, don't retry
    if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) return r;
    // 5xx / 429 but already at max attempts or POST → give up
    if (_n >= 2 || method === 'POST') return r;
    return new Promise(function(res){ setTimeout(res, 800 * Math.pow(2, _n)); })
      .then(function(){ return _fetchRetry(url, opts, _n + 1); });
  }).catch(function(err) {
    if (_n >= 2) throw err;
    return new Promise(function(res){ setTimeout(res, 800 * Math.pow(2, _n)); })
      .then(function(){ return _fetchRetry(url, opts, _n + 1); });
  });
}

/* ================================================================
   EXERCISE DATABASE
   ================================================================ */
var LIBRARY = [
  /* ── WARM-UP : ÉPAULE ── */
  {id:'w001',name:"CARs épaule (debout)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/7KGs8I8gM9o",obj:"GLOBAL"},
  {id:'w002',name:"CARs épaule (chevalier servant)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/lB1csuGlktA",obj:"GLOBAL"},
  {id:'w003',name:"CARs épaule (ventre)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/Ir0Ia0v_6eM",obj:"GLOBAL"},
  {id:'w004',name:"CARs épaule (bras tendu)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/0a-YMkQ0Vy4",obj:"GLOBAL"},
  {id:'w005',name:"CARs scapula (base)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/vJ9BZhzmKS4",obj:"GLOBAL"},
  {id:'w006',name:"CARs scapula (barre/bâton)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/UgY43mQIVz8",obj:"GLOBAL"},
  {id:'w007',name:"CARs scapula (suspension)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/kzGNIEM1Fco",obj:"GLOBAL"},
  {id:'w008',name:"ADD épaule (côté)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/kjHxPYR84x4",obj:"ADD"},
  {id:'w009',name:"V:W allongé",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/5qy2PA-LaGY",obj:"FLEXION, RE"},
  {id:'w010',name:"Y élastique (squat)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/lH_NntkVv50",obj:"FLEXION"},
  {id:'w011',name:"Rotation externe coude sur genou (EXC)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/LPthvuCqZMo",obj:"RE"},
  {id:'w012',name:"Rotation externe coude sur genou (EXC + CON)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/cUD-oRToxCU",obj:"RE"},
  {id:'w013',name:"Rotation externe R2 allongé (EXC)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/Tm8RtLl_SyM",obj:"RE"},
  {id:'w014',name:"Lift off RE (ventre)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/l8pQ4OTlnXI",obj:"RE"},
  {id:'w015',name:"PAILS/RAILS RE lift off (avec bâton)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/JXM9r4DjeVM",obj:"RE"},
  {id:'w016',name:"Lift off extension (banc)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/jTkZ8xkdaSA",obj:"EXTENSION"},
  {id:'w017',name:"Lift off flexion (bâton)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/EQ3kd1hleQY",obj:"FLEXION"},
  {id:'w018',name:"Lift off flexion (ventre)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/81roUnNNywM",obj:"FLEXION"},
  {id:'w019',name:"Pull over (poids)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/mN19vTcN78M",obj:"FLEXION"},
  {id:'w020',name:"Lift off extension (assis)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/H8smoQD7IzA",obj:"EXTENSION"},
  {id:'w021',name:"Flexion d'épaule (child pose)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/sNTIfIQNeOQ",obj:"FLEXION"},
  {id:'w022',name:"PAILS/RAILS R2 (bloc pilate)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/vS-pYWOeqV0",obj:"RE"},
  {id:'w023',name:"Étirement actif RI (debout)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/SISBkVfkG2s",obj:"RI"},
  {id:'w024',name:"Étirement actif RI (allongé)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/P7bqn8nVRaQ",obj:"RI"},
  {id:'w025',name:"RI (bande élastique) + RE passive",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/37ZywBfG658",obj:"RI"},
  {id:'w026',name:"Élévation antérieur avec mini bande",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/3W41UIo5Li4",obj:"FLEXION, RE"},
  {id:'w027',name:"Élévation antérieur avec mini bande (assis)",zone:"ÉPAULE",type:"warmup",url:"https://youtu.be/Glb63eePg-M",obj:"FLEXION, RE"},
  /* COUDE */
  {id:'w028',name:"CARs Coude",zone:"COUDE",type:"warmup",url:"https://youtu.be/NFV5uR8-dlg",obj:"GLOBAL"},
  {id:'w029',name:"Lift off supination",zone:"COUDE",type:"warmup",url:"https://youtu.be/C54bLNfZ-pE",obj:"PRONOSUPINATION"},
  /* POIGNET */
  {id:'w030',name:"CARs Poignet",zone:"POIGNET",type:"warmup",url:"https://youtu.be/fDN1sTF-KXk",obj:"GLOBAL"},
  /* RACHIS CERVICAL */
  {id:'w031',name:"CARs Cervicales",zone:"RACHIS – CERVICAL",type:"warmup",url:"https://youtu.be/FRTm1ElD-V8",obj:"GLOBAL"},
  {id:'w032',name:"Rétraction cervicale",zone:"RACHIS – CERVICAL",type:"warmup",url:"https://youtu.be/Yarfds_W-2c",obj:"RETRACTION"},
  {id:'w033',name:"SNAGs en extension (manuelles)",zone:"RACHIS – CERVICAL",type:"warmup",url:"https://youtu.be/jlas-tFoM-c",obj:"EXTENSION"},
  {id:'w034',name:"Rétraction + extension",zone:"RACHIS – CERVICAL",type:"warmup",url:"https://youtu.be/NPbmtqO9iUs",obj:"EXTENSION, RETRACTION"},
  /* RACHIS THORACIQUE */
  {id:'w035',name:"CARs thoracique",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/Uxw1K_etA1s",obj:"GLOBAL"},
  {id:'w036',name:"Extension thoracique au rouleau",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/YoPs_HtL9tc",obj:"EXTENSION"},
  {id:'w037',name:"Lift off thoracique en extension",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/CWH1M3vawug",obj:"EXTENSION"},
  {id:'w038',name:"Lift off rotations",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/VkNqbeCTuoM",obj:"ROT G, ROT D"},
  {id:'w039',name:"Open book",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/Ow9vbE7FaK0",obj:"ROT G, ROT D"},
  {id:'w040',name:"Rotations thoracique au mur (rouleau)",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/9OknW1rJAWA",obj:"ROT D, ROT G"},
  {id:'w041',name:"Lift off inclinaison",zone:"RACHIS – THORACIQUE",type:"warmup",url:"https://youtu.be/EVzYMMiypWs",obj:"INCLI G, INCLI D"},
  {id:'w042',name:"Jefferson curl (bande élastique)",zone:"RACHIS – THORACIQUE, RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/Snt9axgAfYw",obj:"FLEXION, EXTENSION"},
  {id:'w043',name:"Jefferson curl (haltère)",zone:"RACHIS – THORACIQUE, RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/AKBp2wdnf9c",obj:"FLEXION, EXTENSION"},
  {id:'w044',name:"Jefferson curl + rotations",zone:"RACHIS – THORACIQUE, RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/2E4Orr3UWlA",obj:"FLEXION, EXTENSION, ROT"},
  /* RACHIS LOMBAIRE */
  {id:'w045',name:"Extension lombaire cobra",zone:"RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/hbV9obVSk3Q",obj:"EXTENSION"},
  {id:'w046',name:"Scorpion",zone:"RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/APtyhAkaj5Q",obj:"EXTENSION, ROT"},
  {id:'w047',name:"Cat and cow (élastique)",zone:"RACHIS – LOMBAIRE",type:"warmup",url:"https://youtu.be/Yb38Ymp4ZgI",obj:"FLEXION, EXTENSION"},
  /* HANCHE */
  {id:'w048',name:"CARs Hanche (debout)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/W7Cc_ajM6k8",obj:"GLOBAL"},
  {id:'w049',name:"CARs Hanche (chevalier servant)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/rT0u9lCIR1M",obj:"GLOBAL"},
  {id:'w050',name:"CARs + flexion de hanche",zone:"HANCHE",type:"warmup",url:"https://youtu.be/rNN9b9YoBgg",obj:"GLOBAL"},
  {id:'w051',name:"CARs quadrupédie (focus contrôle moteur)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/HAGjO_dy01U",obj:"GLOBAL"},
  {id:'w052',name:"FADIR + traction postérieur (élastique)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/ihZT4rDjDAQ",obj:"GLOBAL"},
  {id:'w053',name:"Deep squat",zone:"HANCHE",type:"warmup",url:"https://youtu.be/Jk_q1rCj0zc",obj:"GLOBAL"},
  {id:'w054',name:"Sumo squat ISO fin de ROM",zone:"HANCHE",type:"warmup",url:"https://youtu.be/UeuJpmJMg_w",obj:"GLOBAL"},
  {id:'w055',name:"90/90 (base forme)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/LZbX9VQhSao",obj:"GLOBAL"},
  {id:'w056',name:"Rotations de hanche 90/90",zone:"HANCHE",type:"warmup",url:"https://youtu.be/GpfA-6N4-K0",obj:"RE, RI"},
  {id:'w057',name:"90/90 + Lift off RE",zone:"HANCHE",type:"warmup",url:"https://youtu.be/4qs8eMMGkBk",obj:"RE"},
  {id:'w058',name:"PAILS / RAILS 90/90 RI",zone:"HANCHE",type:"warmup",url:"https://youtu.be/9kqn-GDJ3ts",obj:"RI"},
  {id:'w059',name:"90/90 ABD de hanche",zone:"HANCHE",type:"warmup",url:"https://youtu.be/6TG5grM5iOw",obj:"ABD"},
  {id:'w060',name:"RI de hanche (côté)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/wjts-zCbYac",obj:"RI"},
  {id:'w061',name:"RI de hanche + équilibre (debout + bande élastique)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/xzt7EMDb5AA",obj:"FLEXION, RI"},
  {id:'w062',name:"RI de hanche assis (rouleau)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/AyVw6bgsSKQ",obj:"RI"},
  {id:'w063',name:"Mise en tension RI (allongé + banc)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/1FbQSAGt3Ig",obj:"RI"},
  {id:'w064',name:"Ouverture de hanche (Frog)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/-KQXmeZR-k8",obj:"ABD, RI"},
  {id:'w065',name:"Ouverture de hanche (fente latérale)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/RWsl52aFn78",obj:"FLEXION, ABD, RI"},
  {id:'w066',name:"Lift off RI de hanche",zone:"HANCHE",type:"warmup",url:"https://youtu.be/4aJXkibVyb0",obj:"RI"},
  {id:'w067',name:"Groin rock",zone:"HANCHE",type:"warmup",url:"https://youtu.be/wzc84xzxkWQ",obj:"FLEXION, ABD, RI"},
  {id:'w068',name:"Groin rock actif",zone:"HANCHE",type:"warmup",url:"https://youtu.be/1ehgQWOI5ZY",obj:"FLEXION, ABD, RI"},
  {id:'w069',name:"Flexion de hanche (CI + debout)",zone:"HANCHE",type:"warmup",url:"https://youtu.be/33R9Sk6bTqw",obj:"FLEXION"},
  {id:'w070',name:"Lift off extension quadrupédie + banc",zone:"HANCHE",type:"warmup",url:"https://youtu.be/URkycEURDPw",obj:"EXTENSION"},
  /* GENOU */
  {id:'w071',name:"CARs Genoux assis",zone:"GENOU",type:"warmup",url:"https://youtu.be/b1zqnBVx6As",obj:"GLOBAL"},
  {id:'w072',name:"CARs Genoux debout (90° flexion hanche)",zone:"GENOU",type:"warmup",url:"https://youtu.be/z3o7IP2I9GY",obj:"GLOBAL"},
  {id:'w073',name:"Poor man (élastique)",zone:"GENOU",type:"warmup",url:"https://youtu.be/4WMugRY1Uco",obj:"FLEXION"},
  {id:'w074',name:"Rotations tibiales",zone:"GENOU",type:"warmup",url:"https://youtu.be/rWqp7RVIQeI",obj:"RE, RI"},
  {id:'w075',name:"Couch stretch lift off",zone:"GENOU",type:"warmup",url:"https://youtu.be/WVfjmMqNQp8",obj:"FLEXION"},

  {id:'w077',name:"Extension du genou (allongé)",zone:"GENOU",type:"warmup",url:"https://youtu.be/yuwII223anc",obj:"EXTENSION"},
  /* CHEVILLE */
  {id:'w078',name:"CARs cheville (debout)",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/L4XHZVPpn7s",obj:"GLOBAL"},
  {id:'w079',name:"CARs cheville (assis)",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/GTxesHQgdlQ",obj:"GLOBAL"},
  {id:'w080',name:"Dorsiflexion de cheville contre mur",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/ldqCAkdsGnU",obj:"FLEXION DORSAL"},
  {id:'w081',name:"Mise en tension dorsiflexion + extension hallux",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/iYxFnprukwk",obj:"FLEXION DORSAL"},
  {id:'w082',name:"Lift off flexion dorsal (chevalier servant)",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/BhrfbsE-c60",obj:"FLEXION DORSAL"},
  {id:'w083',name:"PAILS RAILS inversion",zone:"CHEVILLE",type:"warmup",url:"https://youtu.be/GX4WFUB6QF8",obj:"INVERSION"},
  /* PIED */
  {id:'w084',name:"Hallux en extension",zone:"PIED / HALLUX",type:"warmup",url:"https://youtu.be/t2h9062EWPQ",obj:"EXTENSION"},
  {id:'w085',name:"Étirement hallux assis",zone:"PIED / HALLUX",type:"warmup",url:"https://youtu.be/bJtR8dEZbSg",obj:"EXTENSION"},
  {id:'w086',name:"Flexion de l'hallux (élastique)",zone:"PIED / HALLUX",type:"warmup",url:"https://youtu.be/AN_f5zcIz94",obj:"FLEXION"},
  /* AUTO-MASSAGE */
  {id:'a001',name:"Auto-massage infra épineux",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/d1OIaxbfo5w",obj:""},
  {id:'a002',name:"Auto-massage grand dorsal",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/EF_CKqbtz7s",obj:""},
  {id:'a003',name:"Auto-massage adducteur",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/0IdEFbptlQo",obj:""},
  {id:'a004',name:"Auto-massage fessier",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/WESgToV-RTU",obj:""},
  {id:'a005',name:"Auto-massage psoas",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/GzdzCCrpNpA",obj:""},
  {id:'a006',name:"Auto-massage quadriceps",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/Hee20rNCXGg",obj:""},
  {id:'a007',name:"Auto-massage lombaires",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/u69s46Y1bKk",obj:""},
  {id:'a008',name:"Auto-massage épicondyliens",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/4I6heTKTNVo",obj:""},
  {id:'a009',name:"Auto-massage voûte plantaire",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/JCOTR0zLWzc",obj:""},
  {id:'a010',name:"Auto-massage mollets",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/dRrvjdwmDtI",obj:""},
  {id:'a011',name:"Auto-massage fibulaire",zone:"AUTO-MASSAGE",type:"automassage",url:"https://youtu.be/MiDNO_4T2WM",obj:""},
  /* ── RENFO : ÉPAULES / COUDES ── */
  {id:'r001',name:"Rowing bilatéral (banc + haltères)",zone:"ÉPAULES, COUDES",type:"renfo",url:"https://youtu.be/k7wxFOPed_U",obj:"",patterns:["Tirage horizontal"]},
  {id:'r002',name:"Rowing (barre libre)",zone:"ÉPAULES, COUDES",type:"renfo",url:"https://youtu.be/X7rimaqBMqU",obj:"",patterns:["Tirage horizontal"]},
  {id:'r003',name:"Tractions pronation",zone:"ÉPAULES, COUDES",type:"renfo",url:"https://youtu.be/HbkyJKMFqmM",obj:"",patterns:["Tirage vertical"]},
  {id:'r004',name:"Dips",zone:"ÉPAULES, COUDES",type:"renfo",url:"https://youtu.be/UceGdIvZOM4",obj:"",patterns:["Poussé vertical"]},
  {id:'r005',name:"Rotation + strict press",zone:"ÉPAULES, THORACIQUES",type:"renfo",url:"https://youtu.be/0pF7uWSFINg",obj:"EXTENSION, ROT G, ROT D",patterns:["Poussé vertical"]},
  {id:'r006',name:"Y sur banc",zone:"ÉPAULES",type:"renfo",url:"https://youtu.be/EbJCxOqICGM",obj:"FLEXION",patterns:[]},
  {id:'r007',name:"RE iso (bande élastique)",zone:"ÉPAULES",type:"renfo",url:"https://youtu.be/F4qScguZBNg",obj:"",patterns:[]},
  {id:'r008',name:"Full can",zone:"ÉPAULES",type:"renfo",url:"https://youtu.be/MW6N5yLYduA",obj:"",patterns:[]},
  {id:'r009',name:"Perfect shrug",zone:"ÉPAULES",type:"renfo",url:"https://youtu.be/EDN6ELI2Q8s",obj:"",patterns:[]},
  /* RENFO : HANCHE / GENOUX */
  {id:'r010',name:"Back squat",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/nd08ytRkRno",obj:"",patterns:["Triple flexion"]},
  {id:'r011',name:"Front squat",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/d8ulCpd7d9M",obj:"",patterns:["Triple flexion"]},
  {id:'r012',name:"Pistol squat box",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/FIu5-Oa9ZpQ",obj:"",patterns:["Triple flexion"]},
  {id:'r013',name:"Deadlift",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/ZwcwxKYMGqk",obj:"",patterns:["Hinge"]},
  {id:'r014',name:"Romanian deadlift",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/Iu-CCUSX_Ao",obj:"",patterns:["Hinge"]},
  {id:'r015',name:"Hip thrust",zone:"HANCHE",type:"renfo",url:"https://youtu.be/BDj2fjfhOFo",obj:"",patterns:["Hinge"]},
  {id:'r016',name:"Glute bridge swissball",zone:"HANCHE",type:"renfo",url:"https://youtu.be/p_rx7_qvOK4",obj:"",patterns:["Hinge"]},
  {id:'r017',name:"Glute bridge walk",zone:"HANCHE",type:"renfo",url:"https://youtu.be/gFOvhVOxEuk",obj:"",patterns:["Hinge"]},
  {id:'r018',name:"Cossack squat (avec variations)",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/fZptiFPFgE4",obj:"",patterns:["Triple flexion"]},
  {id:'r019',name:"Front lunge",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/rFdUl5EGU3k",obj:"",patterns:["Triple flexion"]},
  {id:'r020',name:"Reverse lunge (step)",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/bz5VD2QrnCE",obj:"",patterns:["Triple flexion"]},
  {id:'r021',name:"Reverse lunge (cale pied)",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/S3FhvMiKNSI",obj:"",patterns:["Triple flexion"]},
  {id:'r022',name:"Bulgarian lunge",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/WnRo668nU5k",obj:"",patterns:["Triple flexion"]},
  {id:'r023',name:"Pistol lunge",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/dkinMBYBSKQ",obj:"",patterns:["Triple flexion"]},
  {id:'r024',name:"Bulgarian lunge (focus droit fémoral jambe arrière)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/r-2608D5xFo",obj:"",patterns:["Triple flexion"]},
  {id:'r025',name:"Lunge excentrique",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/rMcqmH3BgWU",obj:"",patterns:["Triple flexion"]},
  {id:'r026',name:"Banded jump lunge (anti valgus)",zone:"GENOUX",type:"renfo",url:"https://youtu.be/qRVlaEkxZKs",obj:"",patterns:["Triple flexion"]},
  {id:'r027',name:"Copenhaguen plank (CE + flexion de hanche)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/tmERKqq-Foo",obj:"",patterns:[]},
  {id:'r028',name:"Star plank",zone:"HANCHE",type:"renfo",url:"https://youtu.be/d8ulCpd7d9M",obj:"",patterns:[]},
  {id:'r029',name:"Star plank (genoux)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/HCg8SOSoS4E",obj:"",patterns:[]},
  {id:'r030',name:"ABD hanche mini bande",zone:"HANCHE",type:"renfo",url:"https://youtu.be/QfdySRI7aNQ",obj:"",patterns:[]},
  {id:'r031',name:"Single leg Romanian deadlift (anti valgus)",zone:"HANCHE, GENOUX",type:"renfo",url:"https://youtu.be/URkycEURDPw",obj:"",patterns:["Hinge"]},
  /* RENFO : CHEVILLE */
  {id:'r032',name:"ISO inversion de cheville",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/cmmAI6F7gv8",obj:"",patterns:[]},
  {id:'r033',name:"Marche en inversion",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/Q6K1zDrP_Q4",obj:"",patterns:[]},
  {id:'r034',name:"Proprio anti inversion (bande élastique)",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/0Q8-gtEtN-A",obj:"",patterns:[]},
  {id:'r035',name:"Proprio anti inversion + pall off (bande élastique)",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/M_42buOG47w",obj:"",patterns:[]},
  {id:'r036',name:"Inversion de cheville excentrique (bande élastique)",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/9-L5Z6rBRII",obj:"",patterns:[]},
  {id:'r037',name:"ISO éversion de cheville",zone:"CHEVILLE",type:"renfo",url:"https://youtu.be/qroIPUxRvto",obj:"",patterns:[]},
  /* RENFO : PIED */
  {id:'r038',name:"Reverse three point with big toe (unilatéral)",zone:"PIED",type:"renfo",url:"https://youtu.be/hfZ0NK8zaY8",obj:"FORCE HALLUX",patterns:[]},
  {id:'r039',name:"Reverse three point with big toe (bilatéral)",zone:"PIED",type:"renfo",url:"https://youtu.be/hUK14ld48gk",obj:"FORCE HALLUX",patterns:[]},
  {id:'r040',name:"Glute bridge with big toe (unilatéral)",zone:"PIED",type:"renfo",url:"https://youtu.be/xLfxLooZDY4",obj:"FORCE HALLUX",patterns:["Hinge"]},
  {id:'r041',name:"Short foot",zone:"PIED",type:"renfo",url:"https://youtu.be/52956aAQz4s",obj:"INTRINSÈQUE DU PIED",patterns:[]},
  {id:'r042',name:"Short foot + équilibre",zone:"PIED",type:"renfo",url:"https://youtu.be/_T2zNWAMN_A",obj:"INTRINSÈQUE DU PIED",patterns:[]},
  {id:'r043',name:"Dissociation orteils",zone:"PIED",type:"renfo",url:"https://youtu.be/NmM2x5Z_DAs",obj:"INTRINSÈQUE DU PIED",patterns:[]},
  /* RENFO : TRONC / GAINAGE */
  {id:'r044',name:"Extension lombaire ISO",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/Yb38Ymp4ZgI",obj:"",patterns:["Core / Gainage"]},
  {id:'r045',name:"Superman",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/hpT2zH1zDG4",obj:"",patterns:["Core / Gainage"]},
  {id:'r046',name:"Twist wood chop (base neutre)",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/MnKUuHp90BE",obj:"",patterns:["Core / Gainage"]},
  {id:'r047',name:"Twist wood chop (fentes)",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/FF2SC09iKnE",obj:"",patterns:["Core / Gainage"]},
  {id:'r048',name:"Pall of press",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/7kl5Q9EiqTk",obj:"",patterns:["Core / Gainage"]},
  {id:'r049',name:"Pall of press (fentes)",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/DN-sA2mK-Xk",obj:"",patterns:["Core / Gainage"]},
  {id:'r050',name:"Single leg pall of press",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/LQ5Wu04tfmk",obj:"",patterns:["Core / Gainage"]},
  {id:'r051',name:"Half kneeling pall of press",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/f9QSvXAvs5U",obj:"",patterns:["Core / Gainage"]},
  {id:'r052',name:"Gainage superman",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/uvggCi-0U6g",obj:"",patterns:["Core / Gainage"]},
  {id:'r053',name:"Hollow hold",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/-fLzQxZg35c",obj:"",patterns:["Core / Gainage"]},
  {id:'r054',name:"Deadbug élastique",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/VYzVVtiOdm4",obj:"",patterns:["Core / Gainage"]},
  {id:'r055',name:"Deadbug avancée + KTLB",zone:"TRONC / GAINAGE",type:"renfo",url:"https://youtu.be/FzJAL1pEGbA",obj:"",patterns:["Core / Gainage"]}
];
// Référence immuable des exercices hardcodés (jamais modifiée)
var LIBRARY_DEFAULT = LIBRARY.slice();
// IDs des exercices qui viennent de Supabase { id: true }
var _supaExoIds = {};
// IDs des exercices hardcodés supprimés par l'utilisateur (persistés en localStorage)
var _deletedDefaultIds = new Set(
  JSON.parse(localStorage.getItem('r4p-deleted-defaults') || '[]')
);
// Appliquer la blacklist dès l'initialisation
if(_deletedDefaultIds.size > 0){
  LIBRARY = LIBRARY_DEFAULT.filter(function(e){ return !_deletedDefaultIds.has(e.id); });
}

/* ================================================================
   STATE
   ================================================================ */
var blocs = [];
var activeBloc = null;

/* ================================================================
   LIBRARY RENDER
   ================================================================ */
function getTypeLabel(t){ return {warmup:'Warm-up',renfo:'Renfo',automassage:'Auto-massage',therapie_manuelle:'Thérapie manuelle'}[t]||t; }
function getTypeClass(t){ return {renfo:'renfo',automassage:'automassage',therapie_manuelle:'therapie_manuelle'}[t]||''; }

/* ── FAVORITES ── */
function getFavs(){
  try { return new Set(JSON.parse(localStorage.getItem(R4P_KEYS.FAV_EXOS)||'[]')); } catch(e){ return new Set(); }
}
function toggleFav(id){
  var favs = getFavs();
  if(favs.has(id)) favs.delete(id); else favs.add(id);
  localStorage.setItem(R4P_KEYS.FAV_EXOS, JSON.stringify(Array.from(favs)));
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

var _favFilter = false;
function toggleFavFilter(){
  _favFilter = !_favFilter;
  document.getElementById('filterFav').classList.toggle('active', _favFilter);
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

/* ── DECISION-TREE FILTER DATA ── */
var WARMUP_ZONES = [
  {val:'RACHIS – CERVICAL', label:'Rachis cervical'},
  {val:'RACHIS – THORACIQUE', label:'Rachis thoracique'},
  {val:'RACHIS – LOMBAIRE', label:'Rachis lombaire'},
  {val:'TRONC / GAINAGE', label:'Tronc / Gainage'},
  {val:'ÉPAULE', label:'Épaule'},
  {val:'HANCHE', label:'Hanche'},
  {val:'GENOU', label:'Genou'},
  {val:'CHEVILLE', label:'Cheville'},
  {val:'PIED / HALLUX', label:'Pied / Hallux'},
];
var RENFO_PATTERNS = [
  {val:'Triple flexion', label:'Triple flexion'},
  {val:'Hinge', label:'Hinge'},
  {val:'Poussé vertical', label:'Poussé vertical'},
  {val:'Poussé horizontal', label:'Poussé horizontal'},
  {val:'Tirage vertical', label:'Tirage vertical'},
  {val:'Tirage horizontal', label:'Tirage horizontal'},
  {val:'Core / Gainage', label:'Core / Gainage'},
];
var AUTOMASSAGE_ZONES = [
  {val:'Upper', label:'Upper'},
  {val:'Lower', label:'Lower'},
];
var RENFO_ZONES = [
  {val:'ÉPAULE',               label:'Épaule'},
  {val:'COUDE',                label:'Coude'},
  {val:'POIGNET',              label:'Poignet'},
  {val:'HANCHE',               label:'Hanche'},
  {val:'GENOU',                label:'Genou'},
  {val:'CHEVILLE',             label:'Cheville'},
  {val:'PIED',                 label:'Pied'},
  {val:'TRONC',                label:'Tronc / Gainage'},
  {val:'RACHIS – CERVICAL',    label:'Rachis cervical'},
  {val:'RACHIS – THORACIQUE',  label:'Rachis thoracique'},
  {val:'RACHIS – LOMBAIRE',    label:'Rachis lombaire'},
];

function onTypeChange(){
  var typeVal = document.getElementById('filterType').value;
  var wrap  = document.getElementById('filter-sub-wrap');
  var wrap2 = document.getElementById('filter-sub2-wrap');
  var subSel  = document.getElementById('filterSub');
  var subSel2 = document.getElementById('filterSub2');
  var subLabel = document.getElementById('filter-sub-label');
  var opts = [], opts2 = [];
  if(typeVal === 'warmup'){
    subLabel.textContent = 'Articulation';
    opts = WARMUP_ZONES;
  } else if(typeVal === 'renfo'){
    subLabel.textContent = 'Mouvement';
    opts  = RENFO_PATTERNS;
    opts2 = RENFO_ZONES;
  } else if(typeVal === 'automassage'){
    subLabel.textContent = 'Zone';
    opts = AUTOMASSAGE_ZONES;
  }
  if(opts.length){
    wrap.style.display = '';
    subSel.innerHTML = '<option value="">— Tous —</option>' + opts.map(function(o){
      return '<option value="'+o.val+'">'+o.label+'</option>';
    }).join('');
  } else {
    wrap.style.display = 'none';
    subSel.innerHTML = '';
  }
  if(opts2.length){
    wrap2.style.display = '';
    subSel2.innerHTML = '<option value="">— Toutes —</option>' + opts2.map(function(o){
      return '<option value="'+o.val+'">'+o.label+'</option>';
    }).join('');
  } else {
    wrap2.style.display = 'none';
    subSel2.innerHTML = '';
  }
  applyFilters();
}

function filterLib(){
  applyFilters();
}

function setFilterAll(){
  document.getElementById('filterType').value = '';
  var subSel  = document.getElementById('filterSub');
  var subSel2 = document.getElementById('filterSub2');
  if(subSel)  subSel.value  = '';
  if(subSel2) subSel2.value = '';
  var subWrap  = document.getElementById('filter-sub-wrap');
  var subWrap2 = document.getElementById('filter-sub2-wrap');
  if(subWrap)  subWrap.style.display  = 'none';
  if(subWrap2) subWrap2.style.display = 'none';
  _favFilter = false;
  document.getElementById('filterFav').classList.remove('active');
  document.getElementById('filterAll').classList.add('active');
  document.getElementById('filterType').classList.remove('active-filter');
  var q = document.getElementById('searchInput').value.toLowerCase().trim();
  renderLib(q);
}

function applyFilters(){
  var typeVal  = document.getElementById('filterType').value;
  var subSel   = document.getElementById('filterSub');
  var subSel2  = document.getElementById('filterSub2');
  var subVal   = subSel  ? subSel.value  : '';
  var subVal2  = subSel2 ? subSel2.value : '';
  var allBtn   = document.getElementById('filterAll');
  if(typeVal || subVal || subVal2){ allBtn.classList.remove('active'); } else { allBtn.classList.add('active'); }
  document.getElementById('filterType').classList.toggle('active-filter', !!typeVal);
  var q = document.getElementById('searchInput').value.toLowerCase().trim();
  renderLib(q, typeVal, subVal, subVal2);
}

function renderLib(q, typeFilter, subFilter, subFilter2){
  q = (q||'').toLowerCase();
  typeFilter  = typeFilter  !== undefined ? typeFilter  : document.getElementById('filterType').value;
  var subSel  = document.getElementById('filterSub');
  var subSel2 = document.getElementById('filterSub2');
  subFilter  = subFilter  !== undefined ? subFilter  : (subSel  ? subSel.value  : '');
  subFilter2 = subFilter2 !== undefined ? subFilter2 : (subSel2 ? subSel2.value : '');
  var scroll = document.getElementById('libScroll');
  var favs = getFavs();
  var visible = LIBRARY.filter(function(ex){
    if(_favFilter && !favs.has(ex.id)) return false;
    if(typeFilter && ex.type!==typeFilter) return false;
    // Filtre mouvement (renfo uniquement)
    if(subFilter){
      if(typeFilter === 'renfo'){
        if(!ex.patterns || ex.patterns.indexOf(subFilter) === -1) return false;
      } else {
        var _rzArr = ex.zone ? ex.zone.split(',').map(function(z){ return z.trim(); }) : [];
      if(_rzArr.indexOf(subFilter) === -1 && (!ex.zones || ex.zones.indexOf(subFilter)===-1)) return false;
      }
    }
    // Filtre articulation (renfo uniquement — correspondance par sous-chaîne)
    if(subFilter2 && typeFilter === 'renfo'){
      if(!ex.zone || ex.zone.toUpperCase().indexOf(subFilter2) === -1) return false;
    }
    if(q && ex.name.toLowerCase().indexOf(q)===-1 && ex.zone.toLowerCase().indexOf(q)===-1 && (ex.obj||'').toLowerCase().indexOf(q)===-1) return false;
    return true;
  });
  // Regroupement :
  // - Renfo sans subFilter → par mouvement (même si subFilter2 actif)
  // - Warmup / Automassage sans subFilter → par zone
  // - Tous les autres cas → liste plate

  var hasFilter = !!(typeFilter || subFilter || subFilter2 || _favFilter || q);

  var groupBy; // 'pattern', 'zone', 'type-zone', or 'none'
  if(_favFilter && !typeFilter){
    groupBy = 'type-zone'; // favoris sans filtre type → tri par objectif puis articulation
  } else if(typeFilter === 'renfo' && !subFilter){
    groupBy = 'pattern'; // regroupé par mouvement, même si filtre articulation actif
  } else if((typeFilter === 'warmup' || typeFilter === 'automassage') && !subFilter){
    groupBy = 'zone';
  } else {
    groupBy = 'none';
  }

  var groups = {};
  var order = [];
  var ALL_PATTERNS_ORDER = ['Triple flexion','Hinge','Poussé vertical','Poussé horizontal','Tirage vertical','Tirage horizontal','Autre'];
  visible.forEach(function(ex){
    var keys = [];
    if(groupBy === 'pattern'){
      keys = (ex.patterns && ex.patterns.length) ? ex.patterns : ['Autre'];
    } else if(groupBy === 'zone'){
      keys = ex.zone ? ex.zone.split(',').map(function(z){ return z.trim(); }).filter(Boolean) : [''];
    } else {
      keys = [''];
    }
    keys.forEach(function(k){
      if(!groups[k]){ groups[k]={label:k, items:[]}; order.push(k); }
      if(groups[k].items.indexOf(ex) === -1) groups[k].items.push(ex);
    });
  });
  // Sort pattern groups in defined order
  if(groupBy === 'pattern'){
    order.sort(function(a,b){
      var ia = ALL_PATTERNS_ORDER.indexOf(a); var ib = ALL_PATTERNS_ORDER.indexOf(b);
      return (ia===-1?99:ia) - (ib===-1?99:ib);
    });
  }

  // Get added ids
  var addedIds = {};
  blocs.forEach(function(b){ b.exos.forEach(function(e){ addedIds[e.libId]=true; }); });

  // If Tous and no search → show all flat, no section titles
  // If truly nothing selected (no filter, no fav, no search) → show hint
  if(!hasFilter){
    // show all exercises flat, no headers
  }

  // Helper : rendu d'un item bibliothèque (partagé entre les deux modes de rendu)
  function _libItemHtml(ex, isAdded, isFav){
    var hoverAttrs = _isTouchDevice ? '' :
      ' onmouseenter="_showLibPreviewDelayed(\''+ex.id+'\',this)" onmouseleave="_hideLibPreview()"';
    var h = '<div class="lib-item'+(isAdded?' added':'')+'" id="li-'+ex.id+'"'+hoverAttrs+'>';
    if(ex.url){ h += _ytThumbHtml(ex.url); }
    h += '<div class="lib-item-info">';
    h += '<div class="lib-item-name">'+escH(ex.name)+'</div>';
    h += '<div class="lib-sub">';
    h += '<span class="lib-tag '+getTypeClass(ex.type)+'">'+getTypeLabel(ex.type)+'</span>';
    h += '</div></div>';
    if(_isTouchDevice){
      h += '<button class="lib-info-btn" id="libinfo-'+ex.id+'" onclick="_toggleLibPreview(event,\''+ex.id+'\')" title="Aperçu">ℹ</button>';
    }
    h += '<button class="fav-btn'+(isFav?' active':'')+'" onclick="event.stopPropagation();toggleFav(\''+ex.id+'\')" title="Favori">★</button>';
    h += '<button class="lib-add-btn" onclick="addExoFromLib(\''+ex.id+'\')" title="Ajouter"></button>';
    h += '</div>';
    return h;
  }

  var html = '';

  if(groupBy === 'type-zone'){
    // ── Favoris : tri niveau 1 = objectif, niveau 2 = articulation ──────────
    var _TYPE_ORDER  = ['warmup','renfo','automassage','therapie_manuelle'];
    var _TYPE_LABELS = {warmup:'Warm-up / Mobilité', renfo:'Renforcement', automassage:'Auto-massage', therapie_manuelle:'Thérapie manuelle'};
    var _ZONE_ORDERS = {
      warmup:            WARMUP_ZONES.map(function(z){ return z.val; }),
      renfo:             RENFO_ZONES.map(function(z){ return z.val; }),
      automassage:       AUTOMASSAGE_ZONES.map(function(z){ return z.val; }),
      therapie_manuelle: []
    };
    // Lookup val → label lisible (ex. "ÉPAULE" → "Épaule")
    var _ZONE_LABEL = {};
    [WARMUP_ZONES, RENFO_ZONES, AUTOMASSAGE_ZONES].forEach(function(arr){
      arr.forEach(function(z){ _ZONE_LABEL[z.val] = z.label; });
    });
    // Construire typeMap[type][zone] = [exercices]
    var _typeMap = {};
    visible.forEach(function(ex){
      var t = ex.type || 'autre';
      if(!_typeMap[t]) _typeMap[t] = {};
      var zones = ex.zone ? ex.zone.split(',').map(function(z){ return z.trim(); }).filter(Boolean) : [''];
      zones.forEach(function(z){
        if(!_typeMap[t][z]) _typeMap[t][z] = [];
        if(_typeMap[t][z].indexOf(ex) === -1) _typeMap[t][z].push(ex);
      });
    });
    var _typeFirst = true;
    _TYPE_ORDER.forEach(function(t){
      if(!_typeMap[t]) return;
      var zOrder = _ZONE_ORDERS[t] || [];
      var zonesPresent = Object.keys(_typeMap[t]);
      zonesPresent.sort(function(a,b){
        var ia = zOrder.indexOf(a); var ib = zOrder.indexOf(b);
        return (ia===-1?99:ia) - (ib===-1?99:ib);
      });
      html += '<div class="lib-fav-type'+(_typeFirst?'':' not-first')+'">'+escH(_TYPE_LABELS[t]||t)+'</div>';
      _typeFirst = false;
      zonesPresent.forEach(function(z){
        if(z) html += '<div class="lib-section-title">'+escH(_ZONE_LABEL[z]||z)+'</div>';
        _typeMap[t][z].forEach(function(ex){
          html += _libItemHtml(ex, !!addedIds[ex.id], favs.has(ex.id));
        });
      });
    });
  } else {
    // ── Rendu standard (pattern / zone / none) ──────────────────────────────
    order.forEach(function(k){
      var g = groups[k];
      html += '<div class="lib-section">';
      if(g.label && groupBy !== 'none') html += '<div class="lib-section-title">'+escH(g.label)+'</div>';
      g.items.forEach(function(ex){
        html += _libItemHtml(ex, !!addedIds[ex.id], favs.has(ex.id));
      });
      html += '</div>';
    });
  }

  if(!html) html = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:.8rem;">Aucun exercice trouvé</div>';
  scroll.innerHTML = html;
}

/* ================================================================
   SESSION / BLOCS
   ================================================================ */
function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// Échappe les apostrophes pour usage dans un attribut onclick JS (contexte string JS entre guillemets simples)
function escJS(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

// ── Aperçu rapide bibliothèque ───────────────────────────────────────────────
var _libPreviewTimer  = null;
var _libPreviewKeepOn = false; // true quand la souris est sur le popover
var _libPreviewExId   = null;  // exo actuellement affiché
var _libHideTimer     = null;  // délai avant fermeture (desktop)

function _buildLibPreviewHtml(ex){
  var html = '<div class="pp-name">'+escH(ex.name)+'</div>';
  html += '<div class="pp-tags">';
  html += '<span class="lib-tag '+getTypeClass(ex.type)+'">'+getTypeLabel(ex.type)+'</span>';
  if(ex.zone){ ex.zone.split(',').forEach(function(z){ z=z.trim(); if(z && z!==ex.name) html+='<span class="lib-tag">'+escH(z)+'</span>'; }); }
  if(ex.patterns && ex.patterns.length) ex.patterns.forEach(function(p){ html += '<span class="lib-tag" style="background:#E8F5E9;color:#2E7D32;">'+escH(p)+'</span>'; });
  html += '</div>';
  if(ex.url){
    var yt = _ytThumbHtml(ex.url);
    html += '<div class="pp-thumb">'+(yt ? yt : '<span class="pp-nourl">🔗 Lien vidéo disponible</span>')+'</div>';
  }
  return html;
}

function _positionLibPreview(targetEl){
  var pop = document.getElementById('libPreviewPop');
  pop.style.display = 'block';
  var rect = targetEl.getBoundingClientRect();
  var popW = 250; var popH = pop.offsetHeight || 160;
  var spaceRight = window.innerWidth - rect.right - 8;
  var left = spaceRight >= popW ? rect.right + 8 : rect.left - popW - 8;
  // Sur mobile (sidebar en haut) : centrer horizontalement
  if(window.innerWidth <= 900){ left = (window.innerWidth - popW) / 2; }
  // Guard : rester dans la fenêtre
  left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
  var top  = Math.min(rect.top, window.innerHeight - popH - 10);
  top = Math.max(8, top);
  pop.style.left = left + 'px';
  pop.style.top  = top  + 'px';
}

function _showLibPreviewNow(exId, targetEl){
  var ex = LIBRARY.find(function(x){ return x.id===exId; });
  if(!ex) return;
  _libPreviewExId = exId;
  var pop = document.getElementById('libPreviewPop');
  pop.innerHTML = _buildLibPreviewHtml(ex);
  _positionLibPreview(targetEl);
  // Toujours activer les pointer-events : sur desktop pour que _libPreviewKeep
  // fonctionne (annule la fermeture quand la souris entre dans le popup),
  // sur touch pour que le thumb soit cliquable
  pop.style.pointerEvents = 'auto';
  // Marquer le bouton actif
  document.querySelectorAll('.lib-info-btn').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.getElementById('libinfo-'+exId);
  if(btn) btn.classList.add('active');
}

function _showLibPreviewDelayed(exId, targetEl){
  clearTimeout(_libPreviewTimer);
  _libPreviewTimer = setTimeout(function(){ _showLibPreviewNow(exId, targetEl); }, 250);
}

function _hideLibPreview(){
  if(_libPreviewKeepOn) return; // souris sur le popover, on attend
  clearTimeout(_libPreviewTimer); _libPreviewTimer = null;
  clearTimeout(_libHideTimer);
  // Sur desktop : délai de 220ms pour permettre à la souris de rejoindre le popup
  // Sur touch   : fermeture immédiate (le ℹ gère son propre cycle)
  var delay = _isTouchDevice ? 0 : 220;
  _libHideTimer = setTimeout(function(){
    if(_libPreviewKeepOn) return; // la souris est entrée dans le popup entre-temps
    var pop = document.getElementById('libPreviewPop');
    if(pop) pop.style.display = 'none';
    document.querySelectorAll('.lib-info-btn').forEach(function(b){ b.classList.remove('active'); });
    _libPreviewExId = null;
  }, delay);
}

function _libPreviewKeep(){
  _libPreviewKeepOn = true;
  clearTimeout(_libHideTimer); // annule la fermeture en cours si la souris rejoint le popup
}
function _libPreviewLeave(){ _libPreviewKeepOn = false; _hideLibPreview(); }

// Touch : tap sur ℹ = toggle
function _toggleLibPreview(e, exId){
  e.stopPropagation();
  var pop = document.getElementById('libPreviewPop');
  if(_libPreviewExId === exId && pop.style.display !== 'none'){
    _libPreviewExId = null;
    _hideLibPreview();
  } else {
    _libPreviewKeepOn = false;
    _showLibPreviewNow(exId, e.currentTarget);
    // Fermer si tap en dehors
    setTimeout(function(){
      document.addEventListener('touchstart', _libPreviewOutsideTap, {once:true, passive:true});
    }, 50);
  }
}

function _libPreviewOutsideTap(e){
  var pop = document.getElementById('libPreviewPop');
  if(pop && !pop.contains(e.target)){
    _libPreviewExId = null;
    _hideLibPreview();
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── YouTube helpers ──────────────────────────────────────────────────────────
function _ytId(url){
  if(!url) return null;
  var m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function _ytThumbHtml(url){
  var id = _ytId(url); if(!id) return null;
  return '<span class="yt-thumb-wrap" onclick="openYtModal(\''+id+'\')" title="Voir la vidéo">'
       + '<img src="https://img.youtube.com/vi/'+id+'/hqdefault.jpg" alt="vidéo" loading="lazy">'
       + '<span class="yt-play"></span>'
       + '</span>';
}
function openYtModal(videoId){
  document.getElementById('ytModalIframe').src = 'https://www.youtube.com/embed/'+videoId+'?autoplay=1&rel=0';
  document.getElementById('ytModalOverlay').classList.add('open');
}
function closeYtModal(e){
  if(e && e.target !== document.getElementById('ytModalOverlay')) return;
  document.getElementById('ytModalIframe').src = '';
  document.getElementById('ytModalOverlay').classList.remove('open');
}
// ─────────────────────────────────────────────────────────────────────────────

var METHODES = {
  libre:     { label:'Libre', methods:[] },
  endurance: { label:'Endurance de force', methods:[
    { id:'circuit',   label:'Circuit Training', chained:true,
      desc:'Enchaîner tous les exercices · 40s effort / 20s repos par exo · 3min récup entre circuits',
      params:{ duree:'40s', series:'3', recup:'3min', cibles:[{type:'RIR', min:'2', max:''}] } },
    { id:'tabata',    label:'HIIT-Tabata',
      desc:'20s effort / 10s repos · 8 tours · RPE 8-9',
      params:{ duree:'20s', series:'8', recup:'10s', cibles:[{type:'RPE', min:'8', max:'9'}] } },
    { id:'amrap',     label:'AMRAP',
      desc:'Max reps en temps fixé · RPE 8-9',
      params:{ reps:'Max', series:'1', duree:'10-15min', cibles:[{type:'RPE', min:'8', max:'9'}] } },
    { id:'emom',      label:'EMOM',
      desc:'Reps fixées chaque minute · RPE 7-8',
      params:{ reps:'10-15', series:'10-20', recup:'reste', cibles:[{type:'RPE', min:'7', max:'8'}] } },
    { id:'fortime',   label:'For Time',
      desc:'Volume fixé, le plus vite possible · RPE 9',
      params:{ reps:'Max', series:'1', cibles:[{type:'RPE', min:'9', max:''}] } },
    { id:'deathby',   label:'Death By',
      desc:'+1 rép par minute jusqu\'à l\'échec · RPE max',
      params:{ reps:'+1/min', series:'Max', cibles:[{type:'RPE', min:'10', max:''}] } },
  ]},
  puissance: { label:'Puissance', methods:[
    { id:'contraste-ll1', label:'Contraste de charge — option 1', chained:true,
      desc:'4 séries · 3 reps à 80% RM + 3 reps légères enchaînées · 3min récup',
      exoLabels:['Lourd — 3 reps @ 80% RM', 'Léger — 3 reps explosives'],
      params:{ reps:'3', series:'4', recup:'3min', cibles:[{type:'%1RM', min:'80', max:''}] } },
    { id:'contraste-ll2', label:'Contraste de charge — option 2', chained:true,
      desc:'4 séries · 4 reps à 60% RM tempo 2/0/1/0 + 4 reps légères enchaînées · 2-3min récup',
      exoLabels:['Lourd — 4 reps @ 60% RM', 'Léger — 4 reps explosives'],
      params:{ reps:'4', series:'4', recup:'2-3min', tempo:'2/0/1/0', cibles:[{type:'%1RM', min:'60', max:''}] } },
    { id:'iso-dyn',       label:'Isométrique-Dynamique',
      desc:'3 séries · ISO 3s + repos 7s + ISO 3s + 6 reps actives · 3min récup',
      protocol:'ISO 3s → repos 7s → ISO 3s → 6 reps actives',
      params:{ series:'3', recup:'3min', cibles:[{type:'RPE', min:'9', max:''}] } },
    { id:'concentrique',  label:'Concentrique volontaire',
      desc:'3 séries / côté · 5 reps · RPE 5 · 2min récup · vitesse maximale',
      params:{ reps:'5', series:'3', recup:'2min', cibles:[{type:'RPE', min:'5', max:''}] } },
    { id:'plyometrie',    label:'Plyométrie',
      desc:'3 séries / côté · 4 reps à 30% RM · 2min récup',
      params:{ reps:'4', series:'3', recup:'2min', cibles:[{type:'%1RM', min:'30', max:''}] } },
  ]},
  hypertrophie: { label:'Hypertrophie', methods:[
    { id:'hyp-classique', label:'Classique',
      desc:'4 séries · 8-12 reps · 1min30 récup · RPE 8 · 70-80% 1RM',
      params:{ reps:'8-12', series:'4', recup:"1'30", cibles:[{type:'RPE', min:'8', max:''},{type:'%1RM', min:'70', max:'80'}] } },
    { id:'biset',       label:'Bi-Set', chained:true,
      desc:'3 séries · Exo 1 : 8 reps @ 75% · Exo 2 : 10 reps @ 12RM · 1min30 récup',
      exoLabels:['Exo 1 — 8 reps @ 75%', 'Exo 2 — 10 reps @ 12RM'],
      params:{ series:'3', recup:'1min30', cibles:[{type:'%1RM', min:'75', max:''}] } },
    { id:'triset',      label:'Tri-Set', chained:true,
      desc:'3 séries · Exo 1 : 6 reps RIR 2 · Exo 2 : 10 reps RIR 1 · Exo 3 : 10 reps RIR 0 · 2min récup',
      exoLabels:['Exo 1 — 6 reps · RIR 2', 'Exo 2 — 10 reps · RIR 1', 'Exo 3 — 10 reps · RIR 0'],
      params:{ series:'3', recup:'2min', cibles:[{type:'RIR', min:'2', max:''}] } },
    { id:'superset',    label:'Super-Set', chained:true,
      desc:'3 séries · Exo 1 : 6 reps RPE 8 · Exo 2 : 6 reps tempo 3/2/1/0',
      exoLabels:['Exo 1 — 6 reps · RPE 8', 'Exo 2 — 6 reps · tempo 3/2/1/0'],
      params:{ reps:'6', series:'3', recup:'1min30', cibles:[{type:'RPE', min:'8', max:''}] } },
    { id:'cluster-hyp', label:'Cluster',
      desc:'3 séries · 10 reps à 80% RM · 3min récup',
      protocol:'5 reps → repos 15s → 3 reps → repos 10s → 2 reps → repos 5s → 1 rep → repos 5s → 1 rep',
      params:{ reps:'10', series:'3', recup:'3min', cibles:[{type:'%1RM', min:'80', max:''}] } },
  ]},
  forcemax: { label:'Force maximale', methods:[
    { id:'det3rm',          label:'Détermination 3RM',
      desc:'4 séries · 3 reps jusqu\'à la 3RM · montée progressive · 1-5min récup',
      params:{ reps:'3', series:'4', recup:'1-5min', cibles:[{type:'kg', min:'→ 3RM', max:''}] } },
    { id:'cluster-fm',      label:'Cluster',
      desc:'3 séries · 4 reps à 93% de la 1RM · 4-5min récup',
      protocol:'1 rep → repos 10s → 1 rep → repos 10s → 1 rep → repos 10s → 1 rep',
      params:{ reps:'4', series:'3', recup:'4-5min', cibles:[{type:'%1RM', min:'93', max:''}] } },
    { id:'pyramidal-fm',    label:'Pyramidal',
      desc:'3 reps @ 90% → 2 reps @ 95% → 1 rep @ 97-100% · 4min récup',
      protocol:'Série 1 : 3 reps @ 90%  ·  Série 2 : 2 reps @ 95%  ·  Série 3 : 1 rep @ 97-100%',
      params:{ reps:'3→2→1', series:'3', recup:'4min', cibles:[{type:'%1RM', min:'90', max:'100'}] } },
    { id:'iso-max',         label:'Isométrie max (Overcoming)',
      desc:'3 séries · 7s d\'isométrie maximale · 3min récup',
      params:{ duree:'7s', series:'3', recup:'3min', tempo:'ISO', cibles:[{type:'RPE', min:'10', max:''}] } },
    { id:'excentrique-sm',  label:'Excentrique sous-max',
      desc:'5 reps à 5RM · tempo 5/0/1/4 · 3min récup',
      params:{ reps:'5', series:'3', recup:'3min', tempo:'5/0/1/4', cibles:[{type:'kg', min:'5RM', max:''}] } },
    { id:'excentrique-sup', label:'Excentrique supra-max',
      desc:'4 séries · 4 reps à 120% de la RM · 5min récup',
      params:{ reps:'4', series:'4', recup:'5min', cibles:[{type:'%1RM', min:'120', max:''}] } },
  ]},
  isometrie: { label:'Tendinopathie', methods:[
    { id:'iso-tendon-std',  label:'Isométrie',
      desc:'3 séries · 45s de contraction isométrique · 60 secondes RM · 2min récup · RPE 4–7',
      params:{ duree:'45s', series:'3', recup:'2min', cibles:[{type:'RPE', min:'4', max:'7'}] } },
    { id:'teno-excentrique', label:'Excentrique',
      desc:'2–4 séries (déf. 3) · Phase excentrique 1\'–1\'30 par série · 10 reps × 6s (≈ 60s excentriques) · 2min récup · RPE 6–8 · 60–90% 1RM',
      params:{ reps:'10', series:'3', duree:"1'30", recup:"2min", cibles:[{type:'RPE', min:'6', max:'8'},{type:'%1RM', min:'60', max:'90'}] } },
    { id:'teno-hsr', label:'HSR — Heavy Slow Resistance',
      desc:'3 séries · 15RM → 6RM (progression) · 2min récup · Tempo 3/0/3/0 · RPE 8–10 · RIR 0–1',
      params:{ reps:'15', series:'3', recup:'2min', tempo:'3/0/3/0', cibles:[{type:'RPE', min:'8', max:'10'},{type:'RIR', min:'0', max:'1'}] } },
    { id:'teno-iso-balist', label:'Isométrie balistique / oscillatoire',
      desc:'2 séries · 6 reps · Maintien 3–5s par rep · 70–100% 1RM · RPE 7–10',
      params:{ reps:'6', series:'2', duree:'3-5s', cibles:[{type:'%1RM', min:'70', max:'100'},{type:'RPE', min:'7', max:'10'}] } },
    { id:'teno-exc-supra', label:'Excentrique supra-max',
      desc:'3 séries · 3 à 6 reps (déf. 5) · 3min récup · 120% 1RM · RPE 9',
      params:{ reps:'5', series:'3', recup:'3min', cibles:[{type:'%1RM', min:'120', max:''},{type:'RPE', min:'9', max:''}] } },
  ]},
};

var OBJ_COLORS = { libre:'var(--muted)', endurance:'#2D7D46', puissance:'#7B2DBF', hypertrophie:'var(--accent)', forcemax:'#C0392B', isometrie:'#B45309' };

function genId(){ return '_'+Math.random().toString(36).slice(2,9); }

/* ══════════════════════════════════════
   BLOCS CARDIO
   ══════════════════════════════════════ */
var CARDIO_ZONES = ['Z1 — Récup','Z2 — Endurance','Z3 — Tempo','Z4 — Seuil','Z5 — VO2max'];
var CARDIO_SPORTS = [
  {val:'course',   label:'🏃 Course à pied'},
  {val:'velo',     label:'🚴 Vélo'},
  {val:'natation', label:'🏊 Natation'},
  {val:'rameur',   label:'🚣 Rameur'},
  {val:'ski_erg',  label:'❄️ Ski Erg'}
];
var CARDIO_EFFORT_TYPES = [
  {val:'continu',      label:'Continu'},
  {val:'fractionne',   label:'Fractionné'},
  {val:'recuperation', label:'Récupération active'},
  {val:'emom',         label:'EMOM'}
];
var CARDIO_CIBLE_TYPES = ['bpm', 'allure', 'watts', 'zone FC', '%FC', 'RPE', 'cal', 'distance (m)'];

function addCardioBloc(){
  var id = genId();
  var letter = String.fromCharCode(65 + blocs.length);
  blocs.push({
    id:id, title:'Bloc '+letter, type:'cardio',
    sport:'course', effort_type:'continu',
    duree_totale:'', distance:'',
    cibles:[{type:'bpm', min:'', max:''}],
    repetitions:'', duree_effort:'', duree_recup:'',
    frac_cibles:[{type:'bpm', min:'', max:''}],
    frac_recup_cibles:[{type:'bpm', min:'', max:''}],
    emom_exos:[],
    commentaire:'',
    exos:[]
  });
  activeBloc = id;
  renderSession();
}

function updateCardioField(id, field, val){
  var b = blocs.find(function(x){ return x.id===id; });
  if(!b) return;
  b[field] = val;
  if(field==='effort_type') renderSession();
  else _draftSaveLazy();
}

/* ── Cibles cardio (scope: 'cibles' | 'frac_cibles' | 'frac_recup_cibles') ── */
function _ensureCardioCibles(b, scope){
  if(!b[scope] || !b[scope].length) b[scope] = [{type:'bpm', min:'', max:''}];
}
function addCardioCible(blocId, scope){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b) return;
  _ensureCardioCibles(b, scope);
  var arr = b[scope];
  var lastType = arr[arr.length - 1].type;
  var idx = CARDIO_CIBLE_TYPES.indexOf(lastType);
  var nextType = CARDIO_CIBLE_TYPES[(idx + 1) % CARDIO_CIBLE_TYPES.length];
  arr.push({type: nextType, min:'', max:''});
  renderSession();
}
function removeCardioCible(blocId, scope, idx){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b[scope]) return;
  b[scope].splice(idx, 1);
  if(!b[scope].length) b[scope] = [{type:'bpm', min:'', max:''}];
  renderSession();
}
function updateCardioCible(blocId, scope, idx, field, val){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b[scope] || !b[scope][idx]) return;
  b[scope][idx][field] = val;
  _draftSaveLazy();
}

/* ── EMOM exercises ── */
function addEmomExo(blocId){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b) return;
  if(!b.emom_exos) b.emom_exos = [];
  b.emom_exos.push({id:genId(), sport:'course', cibles:[{type:'bpm', min:'', max:''}]});
  renderSession();
}
function removeEmomExo(blocId, exoId){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b.emom_exos) return;
  b.emom_exos = b.emom_exos.filter(function(e){ return e.id !== exoId; });
  renderSession();
}
function updateEmomExoSport(blocId, exoId, val){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b.emom_exos) return;
  var e = b.emom_exos.find(function(x){ return x.id===exoId; });
  if(e){ e.sport = val; _draftSaveLazy(); }
}
function addEmomCible(blocId, exoId){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b.emom_exos) return;
  var e = b.emom_exos.find(function(x){ return x.id===exoId; });
  if(!e) return;
  if(!e.cibles) e.cibles = [];
  var lastType = e.cibles.length ? e.cibles[e.cibles.length - 1].type : null;
  var idx = lastType !== null ? CARDIO_CIBLE_TYPES.indexOf(lastType) : -1;
  var nextType = CARDIO_CIBLE_TYPES[(idx + 1) % CARDIO_CIBLE_TYPES.length];
  e.cibles.push({type: nextType, min:'', max:''});
  renderSession();
}
function removeEmomCible(blocId, exoId, idx){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b.emom_exos) return;
  var e = b.emom_exos.find(function(x){ return x.id===exoId; });
  if(!e || !e.cibles) return;
  e.cibles.splice(idx, 1);
  if(!e.cibles.length) e.cibles = [{type:'bpm', min:'', max:''}];
  renderSession();
}
function updateEmomCible(blocId, exoId, idx, field, val){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b.emom_exos) return;
  var e = b.emom_exos.find(function(x){ return x.id===exoId; });
  if(!e || !e.cibles || !e.cibles[idx]) return;
  e.cibles[idx][field] = val;
  _draftSaveLazy();
}

/* Rend une section de cibles cardio (réutilisé pour main / frac effort / frac récup) */
function _renderCardioCibles(bid, scope, arr, label){
  if(!arr || !arr.length) arr = [{type:'bpm', min:'', max:''}];
  var h = '<div class="cardio-cible-section">';
  h += '<div class="cardio-cible-lbl">'+escH(label)+'</div>';
  arr.forEach(function(c, ci){
    var tOpts = CARDIO_CIBLE_TYPES.map(function(t){
      return '<option value="'+t+'"'+(c.type===t?' selected':'')+'>'+t+'</option>';
    }).join('');
    h += '<div class="cardio-cible-tag">';
    h += '<select class="cardio-cible-type-sel" onchange="updateCardioCible(\''+bid+'\',\''+scope+'\','+ci+',\'type\',this.value)">'+tOpts+'</select>';
    h += '<input class="cardio-cible-val" type="text" value="'+escH(c.min||'')+'" placeholder="—" oninput="updateCardioCible(\''+bid+'\',\''+scope+'\','+ci+',\'min\',this.value)">';
    h += '<span class="cardio-cible-dash">–</span>';
    h += '<input class="cardio-cible-val" type="text" value="'+escH(c.max||'')+'" placeholder="max" oninput="updateCardioCible(\''+bid+'\',\''+scope+'\','+ci+',\'max\',this.value)">';
    if(arr.length > 1){
      h += '<button class="cardio-cible-del" onclick="removeCardioCible(\''+bid+'\',\''+scope+'\','+ci+')" title="Retirer">×</button>';
    }
    h += '</div>';
  });
  h += '<button class="cardio-cible-add" onclick="addCardioCible(\''+bid+'\',\''+scope+'\')">＋ cible</button>';
  h += '</div>';
  return h;
}

function _renderCardioBloc(b, idx){
  var isActive = b.id===activeBloc;
  var bid = b.id;
  var isFrac = b.effort_type==='fractionne';
  var isEmom = b.effort_type==='emom';

  // Compat descendante : migrer les anciens champs vers cibles
  if(!b.cibles || !b.cibles.length){
    if(b.allure || b.zone_fc){
      b.cibles = [{type: b.allure ? 'allure' : 'zone FC', min: b.allure || b.zone_fc || '', max:''}];
    } else {
      b.cibles = [{type:'bpm', min:'', max:''}];
    }
  }
  if(!b.frac_cibles || !b.frac_cibles.length){
    b.frac_cibles = [{type: b.zone_effort ? 'zone FC' : 'bpm', min: b.zone_effort||'', max:''}];
  }
  if(!b.frac_recup_cibles || !b.frac_recup_cibles.length){
    b.frac_recup_cibles = [{type: b.zone_recup ? 'zone FC' : 'bpm', min: b.zone_recup||'', max:''}];
  }
  if(!b.emom_exos) b.emom_exos = [];

  var sportOpts = CARDIO_SPORTS.map(function(s){
    return '<option value="'+s.val+'"'+(b.sport===s.val?' selected':'')+'>'+s.label+'</option>';
  }).join('');
  var effortOpts = CARDIO_EFFORT_TYPES.map(function(e){
    return '<option value="'+e.val+'"'+(b.effort_type===e.val?' selected':'')+'>'+e.label+'</option>';
  }).join('');

  var h = '<div class="bloc cardio-bloc" id="bloc-'+bid+'" draggable="true" ondragstart="blocDragStart(event,'+idx+')" ondragover="blocDragOver(event,this,'+idx+')" ondrop="blocDrop(event,this,'+idx+')" ondragend="blocDragEnd()">';
  // Header
  h += '<div class="bloc-header" data-blocid="'+bid+'" style="opacity:'+(isActive?'1':'.75')+'" onclick="setActiveBloc(\''+bid+'\')">';
  h += '<span class="bloc-drag-handle" onmousedown="event.stopPropagation()" title="Glisser pour réordonner">⋮⋮</span>';
  h += '<input class="bloc-title-input" value="'+escH(b.title)+'" placeholder="Nom du bloc" oninput="updateBlocTitle(\''+bid+'\',this.value)" onclick="event.stopPropagation()">';
  h += '<span class="cardio-tag">🏃 Cardio</span>';
  h += '<button class="bloc-del-btn" onclick="event.stopPropagation();deleteBloc(\''+bid+'\')" title="Supprimer le bloc"></button>';
  h += '</div>';

  // Form
  h += '<div class="cardio-form">';

  // Row 1 : sport + type effort + durée totale + distance
  h += '<div class="cardio-row">';
  h += '<div class="cardio-field"><label class="cardio-lbl">Sport</label><select class="cardio-sel" onchange="updateCardioField(\''+bid+'\',\'sport\',this.value)">'+sportOpts+'</select></div>';
  h += '<div class="cardio-field"><label class="cardio-lbl">Type d\'effort</label><select class="cardio-sel" onchange="updateCardioField(\''+bid+'\',\'effort_type\',this.value)">'+effortOpts+'</select></div>';
  h += '<div class="cardio-field"><label class="cardio-lbl">Durée totale (min)</label><input type="number" class="cardio-inp" min="1" value="'+escH(b.duree_totale||'')+'" placeholder="45" oninput="updateCardioField(\''+bid+'\',\'duree_totale\',this.value)"></div>';
  h += '<div class="cardio-field"><label class="cardio-lbl">Distance (km)</label><input type="number" class="cardio-inp" min="0" step="0.1" value="'+escH(b.distance||'')+'" placeholder="—" oninput="updateCardioField(\''+bid+'\',\'distance\',this.value)"></div>';
  h += '</div>';

  // Row 2 : cibles (pour continu et récupération active seulement)
  if(!isFrac && !isEmom){
    h += _renderCardioCibles(bid, 'cibles', b.cibles, 'Cibles');
  }

  // ── Fractionné ──────────────────────────────────────────────────────
  if(isFrac){
    h += '<div class="cardio-frac-section">';
    h += '<div class="cardio-frac-title">⚡ Détail du fractionné</div>';
    h += '<div class="cardio-row">';
    h += '<div class="cardio-field"><label class="cardio-lbl">Répétitions</label><input type="number" class="cardio-inp" min="1" value="'+escH(b.repetitions||'')+'" placeholder="6" oninput="updateCardioField(\''+bid+'\',\'repetitions\',this.value)"></div>';
    h += '<div class="cardio-field"><label class="cardio-lbl">Durée effort</label><input type="text" class="cardio-inp" value="'+escH(b.duree_effort||'')+'" placeholder="3 min" oninput="updateCardioField(\''+bid+'\',\'duree_effort\',this.value)"></div>';
    h += '<div class="cardio-field"><label class="cardio-lbl">Récupération</label><input type="text" class="cardio-inp" value="'+escH(b.duree_recup||'')+'" placeholder="2 min" oninput="updateCardioField(\''+bid+'\',\'duree_recup\',this.value)"></div>';
    h += '</div>';
    h += _renderCardioCibles(bid, 'frac_cibles', b.frac_cibles, 'Cibles effort');
    h += _renderCardioCibles(bid, 'frac_recup_cibles', b.frac_recup_cibles, 'Cibles récupération');
    h += '</div>';
  }

  // ── EMOM ────────────────────────────────────────────────────────────
  if(isEmom){
    h += '<div class="cardio-frac-section">';
    h += '<div class="cardio-frac-title">🔄 Détail EMOM</div>';
    var emomExos = b.emom_exos || [];
    emomExos.forEach(function(ex, ei){
      var exSportOpts = CARDIO_SPORTS.map(function(s){
        return '<option value="'+s.val+'"'+(ex.sport===s.val?' selected':'')+'>'+s.label+'</option>';
      }).join('');
      var exCibles = ex.cibles || [{type:'bpm', min:'', max:''}];
      var exId = ex.id;
      h += '<div class="emom-minute-card">';
      h += '<div class="emom-minute-hdr">';
      h += '<span class="emom-minute-num">Minute '+(ei+1)+'</span>';
      h += '<button class="emom-minute-del" onclick="removeEmomExo(\''+bid+'\',\''+exId+'\')" title="Supprimer">×</button>';
      h += '</div>';
      h += '<div class="cardio-row" style="margin-bottom:8px">';
      h += '<div class="cardio-field"><label class="cardio-lbl">Exercice</label><select class="cardio-sel" onchange="updateEmomExoSport(\''+bid+'\',\''+exId+'\',this.value)">'+exSportOpts+'</select></div>';
      h += '</div>';
      // Cibles EMOM
      h += '<div class="cardio-cible-section">';
      h += '<div class="cardio-cible-lbl">Cibles</div>';
      exCibles.forEach(function(c, ci){
        var tOpts = CARDIO_CIBLE_TYPES.map(function(t){
          return '<option value="'+t+'"'+(c.type===t?' selected':'')+'>'+t+'</option>';
        }).join('');
        h += '<div class="cardio-cible-tag">';
        h += '<select class="cardio-cible-type-sel" onchange="updateEmomCible(\''+bid+'\',\''+exId+'\','+ci+',\'type\',this.value)">'+tOpts+'</select>';
        h += '<input class="cardio-cible-val" type="text" value="'+escH(c.min||'')+'" placeholder="—" oninput="updateEmomCible(\''+bid+'\',\''+exId+'\','+ci+',\'min\',this.value)">';
        h += '<span class="cardio-cible-dash">–</span>';
        h += '<input class="cardio-cible-val" type="text" value="'+escH(c.max||'')+'" placeholder="max" oninput="updateEmomCible(\''+bid+'\',\''+exId+'\','+ci+',\'max\',this.value)">';
        if(exCibles.length > 1){
          h += '<button class="cardio-cible-del" onclick="removeEmomCible(\''+bid+'\',\''+exId+'\','+ci+')" title="Retirer">×</button>';
        }
        h += '</div>';
      });
      h += '<button class="cardio-cible-add" onclick="addEmomCible(\''+bid+'\',\''+exId+'\')">＋ cible</button>';
      h += '</div>';
      h += '</div>'; // emom-minute-card
    });
    h += '<button class="emom-add-minute-btn" onclick="addEmomExo(\''+bid+'\')">＋ Ajouter une minute</button>';
    h += '</div>'; // cardio-frac-section
  }

  // Consignes
  h += '<div class="cardio-row"><div class="cardio-field" style="flex:1"><label class="cardio-lbl">Consignes</label>';
  h += '<textarea class="cardio-txt" oninput="updateCardioField(\''+bid+'\',\'commentaire\',this.value)">'+escH(b.commentaire||'')+'</textarea></div></div>';
  h += '</div>'; // cardio-form
  h += '</div>'; // bloc
  return h;
}

function addBloc(){
  var id = genId();
  var letter = String.fromCharCode(65 + blocs.length);
  blocs.push({id:id, title:'Bloc '+letter, exos:[], objectif:'libre', methode:''});
  activeBloc = id;
  renderSession();
}

function deleteBloc(id){
  blocs = blocs.filter(function(b){ return b.id!==id; });
  if(activeBloc===id) activeBloc = blocs.length ? blocs[blocs.length-1].id : null;
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

function addExoFromLib(libId){
  _hideLibPreview();
  var ex = LIBRARY.find(function(e){ return e.id===libId; });
  if(!ex) return;
  // If no bloc, create one
  if(!blocs.length) addBloc();
  // Use target-bloc-select, activeBloc, or last bloc
  var targetBlocSel = document.getElementById('target-bloc-select');
  var selectedBlocId = targetBlocSel ? targetBlocSel.value : '';
  var targetId = selectedBlocId || activeBloc || blocs[blocs.length-1].id;
  var bloc = blocs.find(function(b){ return b.id===targetId; });
  if(!bloc) { bloc = blocs[blocs.length-1]; targetId = bloc ? bloc.id : null; }
  if(!bloc) return;
  var row = {id:genId(), libId:ex.id, name:ex.name, url:ex.url, reps:'', duree:'', series:'', cibles:[{type:'kg', min:'', max:''}], obj:ex.obj, tempo:'', recup:'', chained:false, consigne:'', perCote:false, nrs:null};
  bloc.exos.push(row);
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
  // Scroll to bloc
  var el = document.getElementById('bloc-'+targetId);
  if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function addFreeExo(blocId) {
  var bloc = blocs.find(function(b){ return b.id === blocId; });
  if(!bloc) return;
  bloc.exos.push({ id:genId(), free:true, name:'', url:'',
    reps:'', duree:'', series:'',
    cibles:[{type:'kg', min:'', max:''}],
    tempo:'', recup:'', chained:false, consigne:'', perCote:false, nrs:null });
  activeBloc = blocId;
  renderSession();
  setTimeout(function(){
    var inputs = document.querySelectorAll('.exo-name-input');
    if(inputs.length) inputs[inputs.length-1].focus();
  }, 40);
}

function updateExoName(blocId, exoId, value) {
  var bloc = blocs.find(function(b){ return b.id === blocId; });
  if(!bloc) return;
  var exo = bloc.exos.find(function(e){ return e.id === exoId; });
  if(!exo) return;
  exo.name = value;
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

function autoResizeTa(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function removeExo(blocId, exoId){
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  if(!bloc) return;
  bloc.exos = bloc.exos.filter(function(e){ return e.id!==exoId; });
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

function updateField(blocId, exoId, field, val){
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  if(!bloc) return;
  var exo = bloc.exos.find(function(e){ return e.id===exoId; });
  if(exo) exo[field] = val;
  _draftSaveLazy();
}

/* ── NRS douleur par exercice ── */
var _openNrsId = null;

function _getNrsPop(){
  var p = document.getElementById('_nrsGlobalPop');
  if(!p){
    p = document.createElement('div');
    p.id = '_nrsGlobalPop';
    p.style.cssText = 'position:fixed;display:none;z-index:5000;flex-wrap:wrap;gap:4px;align-items:center;max-width:290px;background:#fff;border:1px solid var(--border-l);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.16);padding:8px 10px;';
    document.body.appendChild(p);
    document.addEventListener('pointerdown', function(e){ if(!p.contains(e.target)) _closeNrsPop(); }, true);
  }
  return p;
}

function toggleNrsPop(blocId, exoId, e){
  e.stopPropagation();
  var key = blocId+'-'+exoId;
  if(_openNrsId === key){ _closeNrsPop(); return; }
  _closeNrsPop();
  _openNrsId = key;
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  var exo = bloc ? bloc.exos.find(function(ex){ return ex.id===exoId; }) : null;
  if(!exo) return;
  var pop = _getNrsPop();
  var btns = '';
  for(var i=0; i<=10; i++){
    var active = exo.nrs === i;
    var col = i<=3 ? '#16A34A' : i<=6 ? '#F59E0B' : '#DC2626';
    btns += '<button class="nrs-pop-btn'+(active?' nrs-active':'')+'" style="'+(active?'background:'+col+';':'')+'font-size:.76rem;" onclick="setNrs(\''+blocId+'\',\''+exoId+'\','+i+')">'+i+'</button>';
  }
  btns += '<button class="nrs-pop-clear" onclick="setNrs(\''+blocId+'\',\''+exoId+'\',null)" title="Effacer">✕</button>';
  pop.innerHTML = btns;
  pop.style.display = 'flex';
  var rect = e.currentTarget.getBoundingClientRect();
  var popW = 290, popH = 50;
  var top = rect.bottom + 4;
  var left = rect.left;
  if(top + popH > window.innerHeight - 8) top = rect.top - popH - 4;
  if(left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  pop.style.top = top+'px'; pop.style.left = left+'px';
}

function _closeNrsPop(){
  var p = document.getElementById('_nrsGlobalPop');
  if(p) p.style.display = 'none';
  _openNrsId = null;
}

function setNrs(blocId, exoId, val){
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  if(!bloc) return;
  var exo = bloc.exos.find(function(e){ return e.id===exoId; });
  if(!exo) return;
  exo.nrs = val;
  _draftSaveLazy();
  var badge = document.querySelector('[data-nrs="'+blocId+'-'+exoId+'"]');
  if(badge){
    var col = val === null ? '#9AA0A8' : val<=3 ? '#16A34A' : val<=6 ? '#F59E0B' : '#DC2626';
    badge.textContent = val !== null ? '💢 '+val+'/10' : '💢 —';
    badge.style.color = col;
    badge.style.borderColor = val !== null ? col : '#CBD2DB';
  }
  _closeNrsPop();
}

function togglePerCote(blocId, exoId){
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  if(!bloc) return;
  var exo = bloc.exos.find(function(e){ return e.id===exoId; });
  if(!exo) return;
  exo.perCote = !exo.perCote;
  _draftSaveLazy();
  var btn = document.querySelector('[data-percote="'+blocId+'-'+exoId+'"]');
  if(btn) btn.classList.toggle('active', exo.perCote);
}

/* ── Cibles multi-tags ── */
function _getExo(blocId, exoId){
  var b = blocs.find(function(x){ return x.id===blocId; });
  return b ? b.exos.find(function(x){ return x.id===exoId; }) : null;
}
function _normCibles(e){
  if(!e.cibles || !e.cibles.length)
    e.cibles = [{type: e.cibleType||'kg', min: e.cibleVal||'', max:''}];
}
var _EXO_CIBLE_SEQ = ['kg','RPE','RIR','%1RM','Vitesse'];
function addCible(blocId, exoId){
  var e = _getExo(blocId, exoId); if(!e) return;
  _normCibles(e);
  var lastType = e.cibles[e.cibles.length - 1].type;
  var idx = _EXO_CIBLE_SEQ.indexOf(lastType);
  var nextType = _EXO_CIBLE_SEQ[(idx + 1) % _EXO_CIBLE_SEQ.length];
  e.cibles.push({type: nextType, min:'', max:''});
  renderSession();
}
function removeCible(blocId, exoId, idx){
  var e = _getExo(blocId, exoId); if(!e) return;
  _normCibles(e);
  e.cibles.splice(idx, 1);
  if(!e.cibles.length) e.cibles = [{type:'RPE', min:'', max:''}];
  renderSession();
}
function updateCible(blocId, exoId, idx, field, val){
  var e = _getExo(blocId, exoId); if(!e) return;
  _normCibles(e);
  if(e.cibles[idx]) e.cibles[idx][field] = val;
  _draftSaveLazy();
}

function toggleExoChain(blocId, exoId){
  var e = _getExo(blocId, exoId); if(!e) return;
  e.chained = !e.chained;
  renderSession();
}

function updateBlocTitle(id, val){
  var bloc = blocs.find(function(b){ return b.id===id; });
  if(bloc) bloc.title = val;
  _draftSaveLazy();
}

function updateBlocObjectif(id, val){
  var bloc = blocs.find(function(b){ return b.id===id; });
  if(!bloc) return;
  bloc.objectif = val;
  bloc.methode  = '';
  // Nouvelle sélection d'objectif → remettre toutes les cases à coché
  bloc.exos.forEach(function(e){ delete e._methChecked; delete e._methApplied; });
  renderSession();
}

function updateBlocMethode(id, val){
  var bloc = blocs.find(function(b){ return b.id===id; });
  if(!bloc) return;
  bloc.methode = val;
  // Nouvelle méthode choisie → remettre toutes les cases à coché
  bloc.exos.forEach(function(e){ delete e._methChecked; delete e._methApplied; });
  renderSession();
}

function _toggleAllExoChecks(blocId){
  var bloc = blocs.find(function(b){ return b.id===blocId; });
  if(!bloc) return;
  // Si tous cochés → tout décocher, sinon → tout cocher
  var allChecked = bloc.exos.length > 0 && bloc.exos.every(function(e){ return e._methChecked === true; });
  var newState = !allChecked;
  bloc.exos.forEach(function(e){
    e._methChecked = newState;
    var cb = document.getElementById('exo-check-'+blocId+'-'+e.id);
    if(cb) cb.checked = newState;
  });
  // Re-render pour mettre à jour le libellé du bouton
  renderSession();
}
function _onExoCheckChange(cb){
  // Persister l'état coché dans le modèle pour survivre aux re-renders
  var bid = cb.id.split('-')[2];
  var eid = cb.id.split('-')[3];
  var bloc = blocs.find(function(b){ return b.id===bid; });
  if(!bloc) return;
  var exo = bloc.exos.find(function(e){ return e.id===eid; });
  if(exo) exo._methChecked = cb.checked;
}

function applyMethode(id){
  var bloc = blocs.find(function(b){ return b.id===id; });
  if(!bloc || !bloc.methode) return;
  var objDef = METHODES[bloc.objectif] || METHODES.libre;
  var methObj = objDef.methods.find(function(m){ return m.id===bloc.methode; });
  if(!methObj || !methObj.params) return;
  var p = methObj.params;
  var appliedCount = 0;
  bloc.exos.forEach(function(e){
    // Vérifier si la checkbox de cet exercice est cochée
    var cb = document.getElementById('exo-check-'+id+'-'+e.id);
    if(cb && !cb.checked) return; // ignorer les exercices décochés
    appliedCount++;
    // On écrase TOUS les champs couverables : si la méthode ne les définit pas,
    // on efface la valeur résiduelle d'une méthode précédente.
    e.reps   = p.reps   !== undefined ? p.reps   : '';
    e.duree  = p.duree  !== undefined ? p.duree  : '';
    e.series = p.series !== undefined ? p.series : '';
    e.recup  = p.recup  !== undefined ? p.recup  : '';
    e.tempo  = p.tempo  !== undefined ? p.tempo  : '';
    if(p.cibles !== undefined){
      e.cibles = JSON.parse(JSON.stringify(p.cibles));
    } else if(p.cibleType !== undefined || p.cibleVal !== undefined){
      e.cibles = [{type: p.cibleType||'RPE', min: p.cibleVal||'', max:''}];
    } else {
      e.cibles = [];
    }
    e.chained     = !!(methObj.chained);
    e._methApplied  = true;  // pastille verte
    e._methChecked  = false; // décocher après application
  });
  if(appliedCount === 0){ _showToast('⚠️ Aucun exercice sélectionné.'); return; }
  renderSession();
  // Effacer les pastilles après 3s (les cases restent décochées)
  setTimeout(function(){
    bloc.exos.forEach(function(e){ delete e._methApplied; });
    renderSession();
  }, 3000);
}

function setActiveBloc(id){
  activeBloc = id;
  // Highlight active bloc header
  document.querySelectorAll('.bloc-header').forEach(function(h){
    h.style.opacity = h.dataset.blocid===id ? '1' : '.72';
  });
}

function clearBlocs(){
  if(!blocs.length) return;
  if(!confirm('Vider tous les blocs ?')) return;
  blocs = [];
  activeBloc = null;
  _draftSave();
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

function clearSession(){
  if(blocs.length===0) return;
  if(!confirm('Effacer toute la séance ?')) return;
  blocs = [];
  activeBloc = null;
  document.getElementById('patientName').value = '';
  _draftClear(); // efface aussi le brouillon
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

/* ── Toast ── */
function _showToast(msg, undoFn){
  var t = document.getElementById('shareToast');
  if(!t) return;
  clearTimeout(t._timer);
  t._undoFn = undoFn || null;
  if(undoFn){
    t.innerHTML = '<span>'+msg+'</span><button class="undo-btn" id="toastUndoBtn">Annuler</button>';
    t.classList.add('has-undo');
    var btn = document.getElementById('toastUndoBtn');
    if(btn) btn.onclick = function(){
      t._undoFn && t._undoFn();
      t.classList.remove('show','has-undo');
      clearTimeout(t._timer);
    };
  } else {
    t.textContent = msg;
    t.classList.remove('has-undo');
  }
  t.classList.add('show');
  t._timer = setTimeout(function(){ t.classList.remove('show','has-undo'); }, 4500);
}

/* ── Génère le lien athlete.html?prog=ID ── */
function _athleteLink(id){
  return window.location.href.replace(/\/[^/]+$/, '/athlete.html') + '?prog=' + id;
}

function _copyLink(id){
  var link = _athleteLink(id);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link)
      .then(function(){ _showToast('📤 Lien copié ! Envoie-le à ton athlète.'); })
      .catch(function(){ prompt('Copie ce lien :', link); });
  } else {
    prompt('Copie ce lien :', link);
  }
}

/* Option A : bouton Partager dans le builder (auto-save si besoin) */
function shareBuilderProg(){
  if(_currentProgId){ _copyLink(_currentProgId); return; }
  if(!_progPatient){ alert('Sélectionnez un patient avant de partager.'); return; }
  if(!_progUid || !_progToken){ alert('Session non disponible. Sélectionnez à nouveau le patient.'); return; }
  var btn = document.getElementById('prog-share-btn');
  if(btn){ btn.disabled=true; btn.textContent='⏳…'; }
  var nomProg = (document.getElementById('patientName')||{}).value || ('Programme du '+new Date().toLocaleDateString('fr-FR'));
  var donnees = { blocs: JSON.parse(JSON.stringify(blocs||[])), notes: getNotes() };
  var today = new Date().toISOString().split('T')[0];
  _fetchRetry(SUPA_URL_P+'/rest/v1/programmes', {
    method:'POST', headers:_sbHeaders(),
    body:JSON.stringify({patient_id:_progPatient.id, praticien_id:_progUid, nom:nomProg, date:today, donnees:donnees})
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d}; }); })
  .then(function(res){
    if(btn){ btn.disabled=false; btn.textContent='📤 Partager'; }
    if(!res.ok){ alert('Erreur : '+JSON.stringify(res.data)); return; }
    var d = Array.isArray(res.data) ? res.data[0] : res.data;
    if(d && d.id){
      _currentProgId = d.id;
      var sb = document.getElementById('prog-cloud-save-btn');
      if(sb){ sb.textContent='✓ Sauvegardé'; setTimeout(function(){ sb.textContent='☁️ Sauvegarder'; },2500); }
      _copyLink(d.id);
    }
  })
  .catch(function(err){
    if(btn){ btn.disabled=false; btn.textContent='📤 Partager'; }
    alert('Erreur réseau : '+(err&&err.message||err));
  });
}

/* Option B : bouton 📤 dans l'historique des programmes */
function _shareProgById(id){
  _copyLink(id);
}


/* ================================================================
   DRAG & DROP EXERCICES
   ================================================================ */
var _exoDrag = {blocId:null, fromIdx:null};

function exoDragStart(e, blocId, fromIdx){
  _exoDrag = {blocId:blocId, fromIdx:fromIdx};
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(fromIdx));
  var row = e.currentTarget;
  setTimeout(function(){ row.classList.add('exo-dragging'); }, 0);
}

function exoDragOver(e, el, blocId){
  if(!_exoDrag.blocId || _exoDrag.blocId !== blocId){ return; }
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var rect = el.getBoundingClientRect();
  var before = e.clientY < rect.top + rect.height / 2;
  document.querySelectorAll('.exo-row').forEach(function(r){ r.classList.remove('drag-top','drag-bot'); });
  el.classList.add(before ? 'drag-top' : 'drag-bot');
}

function exoDrop(e, el, blocId, toIdx){
  e.preventDefault();
  if(!_exoDrag.blocId || _exoDrag.blocId !== blocId){ exoDragEnd(); return; }
  var fromIdx = _exoDrag.fromIdx;
  var rect = el.getBoundingClientRect();
  var before = e.clientY < rect.top + rect.height / 2;
  var insertAt = before ? toIdx : toIdx + 1;
  if(insertAt > fromIdx) insertAt--;
  exoDragEnd();
  if(insertAt === fromIdx) return;
  var bloc = blocs.find(function(b){ return b.id === blocId; });
  if(!bloc) return;
  var exo = bloc.exos.splice(fromIdx, 1)[0];
  bloc.exos.splice(insertAt, 0, exo);
  renderSession();
}

function exoDragEnd(){
  _exoDrag = {blocId:null, fromIdx:null};
  document.querySelectorAll('.exo-row').forEach(function(r){
    r.classList.remove('exo-dragging','drag-top','drag-bot');
    r.style.opacity = '';
  });
}

/* ── Drag-and-drop des blocs ────────────────────────────────────────────── */
var _blocDrag = { fromIdx: null };

function blocDragStart(e, idx){
  // Ignorer si le drag vient d'un élément interactif (input, select, button)
  if(['INPUT','SELECT','TEXTAREA','BUTTON'].indexOf(e.target.tagName) > -1){ e.preventDefault(); return; }
  _blocDrag.fromIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
  var el = e.currentTarget;
  setTimeout(function(){ el.classList.add('bloc-dragging'); }, 0);
}

function blocDragOver(e, el, idx){
  if(_blocDrag.fromIdx === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var rect = el.getBoundingClientRect();
  var before = e.clientY < rect.top + rect.height / 2;
  document.querySelectorAll('#sessionArea .bloc').forEach(function(b){ b.classList.remove('bloc-drag-top','bloc-drag-bot'); });
  el.classList.add(before ? 'bloc-drag-top' : 'bloc-drag-bot');
}

function blocDrop(e, el, toIdx){
  e.preventDefault();
  if(_blocDrag.fromIdx === null){ blocDragEnd(); return; }
  var fromIdx = _blocDrag.fromIdx;
  var rect = el.getBoundingClientRect();
  var before = e.clientY < rect.top + rect.height / 2;
  var insertAt = before ? toIdx : toIdx + 1;
  if(insertAt > fromIdx) insertAt--;
  blocDragEnd();
  if(insertAt === fromIdx) return;
  var moved = blocs.splice(fromIdx, 1)[0];
  blocs.splice(insertAt, 0, moved);
  renderSession();
  _draftSaveLazy();
}

function blocDragEnd(){
  _blocDrag.fromIdx = null;
  document.querySelectorAll('#sessionArea .bloc').forEach(function(b){
    b.classList.remove('bloc-dragging','bloc-drag-top','bloc-drag-bot');
  });
}

/* ================================================================
   TEMPS ESTIMÉ
   ================================================================ */
function parseMin(str){
  if(!str) return null;
  str=(str+'').trim().toLowerCase().replace(/\s/g,'');
  var m;
  // Plages en minutes : "3-5'" ou "3-5min"
  m=str.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?:'|min)$/); if(m) return (parseFloat(m[1])+parseFloat(m[2]))/2;
  // "1'30" ou "1min30" ou "1min30s"
  m=str.match(/^(\d+)(?:'|min)(\d+)s?$/);  if(m) return parseFloat(m[1])+parseFloat(m[2])/60;
  // "3'" ou "3min"
  m=str.match(/^(\d+(?:\.\d+)?)(?:'|min)$/); if(m) return parseFloat(m[1]);
  // Plages en secondes : "30-60s"
  m=str.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)s$/); if(m) return (parseFloat(m[1])+parseFloat(m[2]))/2/60;
  // "30s"
  m=str.match(/^(\d+(?:\.\d+)?)s$/); if(m) return parseFloat(m[1])/60;
  return null;
}
function parseNum(str){
  if(!str) return null;
  str=(str+'').trim();
  if(str.indexOf('+')!==-1){ var p=str.split('+').map(parseFloat).filter(function(n){return !isNaN(n);}); if(p.length) return p.reduce(function(a,b){return a+b;},0); }
  if(str.match(/^\d[\d-]*\d$/)&&str.indexOf('-')!==-1){ var p2=str.split('-').map(parseFloat).filter(function(n){return !isNaN(n);}); if(p2.length>1) return p2.reduce(function(a,b){return a+b;},0)/p2.length; }
  var n=parseFloat(str); return isNaN(n)?null:n;
}
function estimateExoMin(e){
  var series=parseNum(e.series); if(!series||series<=0) return null;
  var recup=parseMin(e.recup); if(recup===null) recup=0;
  var work=0;
  if(e.duree){ var d=parseMin(e.duree); work=(d!==null)?d:0.5; }
  else if(e.reps){ var r=parseNum(e.reps); work=r?(r*4)/60:0.5; }
  else work=0.5;
  return series*work+Math.max(0,series-1)*recup;
}
function fmtMin(min){
  if(min<1) return '< 1 min';
  return '~'+Math.round(min)+' min';
}
/* Durée totale de séance (renfo + cardio) — utilisé pour estimation Foster */
function _estimateSessionMin(blocsArr){
  var total = 0;
  (blocsArr||[]).forEach(function(b){
    if(b.type === 'cardio'){
      total += parseFloat(b.duree_totale)||0;
    } else {
      (b.exos||[]).forEach(function(e){
        var t = estimateExoMin(e);
        if(t) total += t;
      });
    }
  });
  return total;
}

/* ================================================================
   RENDER SESSION
   ================================================================ */
function renderSession(){
  var area = document.getElementById('sessionArea');
  var clearBtn = document.getElementById('clearBlocsBtn');
  if(clearBtn) clearBtn.style.display = blocs.length ? '' : 'none';
  if(!blocs.length){
    area.innerHTML = '<div class="empty-state" id="emptyState"><div class="icon">📋</div><p>Ajoutez un bloc puis sélectionnez des exercices<br>depuis la bibliothèque pour construire votre séance.</p></div>';
    updateTargetBlocSelect();
    return;
  }
  var html = '';
  blocs.forEach(function(b, idx){
    // ── Bloc Cardio ──
    if(b.type === 'cardio'){ html += _renderCardioBloc(b, idx); return; }
    // ── Bloc Renforcement ──
    var isActive = b.id===activeBloc;
    html += '<div class="bloc" id="bloc-'+b.id+'" draggable="true" ondragstart="blocDragStart(event,'+idx+')" ondragover="blocDragOver(event,this,'+idx+')" ondrop="blocDrop(event,this,'+idx+')" ondragend="blocDragEnd()">';
    html += '<div class="bloc-header" data-blocid="'+b.id+'" style="opacity:'+(isActive?'1':'.8')+'" onclick="setActiveBloc(\''+b.id+'\')">';
    html += '<span class="bloc-drag-handle" title="Glisser pour réordonner">⋮⋮</span>';
    html += '<input class="bloc-title-input" value="'+escH(b.title)+'" placeholder="Nom du bloc" oninput="updateBlocTitle(\''+b.id+'\',this.value)">';
    html += '<button class="bloc-del-btn" onclick="event.stopPropagation();deleteBloc(\''+b.id+'\')" title="Supprimer le bloc"></button>';
    html += '</div>';
    // Méthode bar
    var obj = b.objectif || 'libre';
    var objDef = METHODES[obj] || METHODES.libre;
    var methList = objDef.methods;
    var methVal = b.methode || '';
    var methObj = methVal ? methList.find(function(m){ return m.id===methVal; }) : null;
    html += '<div class="methode-bar obj-'+obj+'">';
    html += '<span class="obj-label">Objectif :</span>';
    html += '<select class="meth-select" onchange="updateBlocObjectif(\''+b.id+'\',this.value)">';
    ['libre','endurance','puissance','hypertrophie','forcemax','isometrie'].forEach(function(k){
      html += '<option value="'+k+'"'+(obj===k?' selected':'')+'>'+escH(METHODES[k].label)+'</option>';
    });
    html += '</select>';
    if(methList.length){
      html += '<select class="meth-select" onchange="updateBlocMethode(\''+b.id+'\',this.value)">';
      html += '<option value="">— Méthode —</option>';
      methList.forEach(function(m){
        html += '<option value="'+m.id+'"'+(methVal===m.id?' selected':'')+'>'+escH(m.label)+'</option>';
      });
      html += '</select>';
      if(methObj){
        var allChecked = b.exos.length > 0 && b.exos.every(function(e){ return e._methChecked === true; });
        html += '<button class="meth-select-all-btn" onclick="_toggleAllExoChecks(\''+b.id+'\')" title="'+(allChecked?'Tout désélectionner':'Tout sélectionner')+'">'
              + (allChecked ? '☑ Tout désélectionner' : '☐ Tout sélectionner')
              + '</button>';
        html += '<button class="meth-apply-btn" onclick="applyMethode(\''+b.id+'\')">Appliquer à la sélection</button>';
      }
    }
    html += '</div>';
    if(methObj){
      html += '<div class="methode-card obj-'+obj+'">';
      html += '<strong>'+escH(methObj.label)+'</strong> — '+escH(methObj.desc);
      if(methObj.protocol){
        html += '<div class="protocol-steps">⚙ Structure intra-série : '+escH(methObj.protocol)+'</div>';
      }
      if(methObj.chained && b.exos.length){
        html += '<div class="protocol-steps">⛓ Les exercices de ce bloc sont enchaînés — récup appliquée après le dernier exercice.</div>';
      }
      html += '</div>';
    }
    html += '<div class="bloc-body">';
    if(b.exos.length){
      html += '<div class="exo-col-header">';
      html += '<span class="col-lbl"></span>';
      html += '<span class="col-lbl">Exercice</span>';
      html += '<span class="col-lbl">Reps</span>';
      html += '<span class="col-lbl">Durée</span>';
      html += '<span class="col-lbl">Séries</span>';
      html += '<span class="col-lbl">Récup</span>';
      html += '<span class="col-lbl">Tempo</span>';
      html += '<span class="col-lbl">Cible</span>';
      html += '<span></span>';
      html += '</div>';
      var objColor = OBJ_COLORS[obj] || 'var(--muted)';
      var _cGrpBgs = { libre:'#F5F7FA', endurance:'#F0FAF0', puissance:'#F5F0FF', hypertrophie:'#EEF3FB', forcemax:'#FEF0EE', isometrie:'#FFFBEB' };
      var _cGrpBg  = _cGrpBgs[obj] || '#F5F7FA';
      var _inChainGrp = false;
      b.exos.forEach(function(e, idx){
        var exoChained = !!e.chained;
        var prevChained = idx > 0 && !!b.exos[idx-1].chained;
        var isInGroup  = exoChained || prevChained;
        // Ouvrir le wrapper du groupe enchaîné
        if(isInGroup && !_inChainGrp){
          _inChainGrp = true;
          html += '<div class="chain-group" style="--chain-c:'+objColor+';border-color:'+objColor+';background:'+_cGrpBg+'">';
          html += '<div class="chain-group-header" style="color:'+objColor+'">⛓ Enchaîné</div>';
        }
        html += '<div class="exo-row" draggable="true"'
             +  ' style="cursor:default"'
             +  ' ondragstart="exoDragStart(event,\''+b.id+'\','+idx+')"'
             +  ' ondragover="exoDragOver(event,this,\''+b.id+'\')"'
             +  ' ondrop="exoDrop(event,this,\''+b.id+'\','+idx+')"'
             +  ' ondragend="exoDragEnd()">';
        if(methObj){
          var isChecked = (e._methChecked === true); // coché seulement si explicitement sélectionné
          html += '<div class="drag-handle" style="cursor:default;">'
                + '<input type="checkbox" class="exo-meth-check" id="exo-check-'+b.id+'-'+e.id+'"'
                + (isChecked ? ' checked' : '')
                + ' style="accent-color:'+objColor+';"'
                + ' onchange="_onExoCheckChange(this)"'
                + ' onclick="event.stopPropagation()">'
                + '</div>';
        } else {
          html += '<div class="drag-handle" title="Glisser pour réordonner">⋮⋮</div>';
        }
        html += '<div class="exo-name-cell">';
        if(e.free){
          html += '<input class="exo-name-input" type="text" value="'+escH(e.name||'')+'" placeholder="Nom de l\'exercice…" oninput="updateExoName(\''+b.id+'\',\''+e.id+'\',this.value)">';
        } else {
          html += '<div class="exo-name">'+escH(e.name)+(e._methApplied ? '<span class="meth-applied-badge">✓ méthode appliquée</span>' : '')+'</div>';
        }
        html += '<div class="exo-sub">';
        if(e.url){ var _vt=_ytThumbHtml(e.url); html += _vt ? _vt : '<a class="vid-link" href="'+escH(e.url)+'" target="_blank">▶ Vidéo</a>'; }
        var exoMin=estimateExoMin(e); if(exoMin!==null) html+='<span class="time-tag">⏱ '+fmtMin(exoMin)+'</span>';
        if(idx < b.exos.length - 1){
          html += '<button class="chain-toggle-btn'+(exoChained?' active':'')+'"'
               +  ' style="--chain-c:'+objColor+'"'
               +  ' onclick="toggleExoChain(\''+b.id+'\',\''+e.id+'\')"'
               +  ' title="'+(exoChained?'Désactiver l\'enchaînement':'Enchaîner avec le suivant')+'">'
               +  '⛓ '+(exoChained?'Enchaîné':'Enchaîner')
               +  '</button>';
        }
        html += '</div></div>';
        html += '<div class="reps-wrap">'
             +  '<input class="cell-input" type="text" value="'+escH(e.reps)+'" placeholder="—" title="Répétitions" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'reps\',this.value)">'
             +  '<button class="percote-toggle'+(e.perCote?' active':'')+'" data-percote="'+b.id+'-'+e.id+'" onclick="togglePerCote(\''+b.id+'\',\''+e.id+'\')" title="Par côté">/côté</button>'
             +  '</div>';
        html += '<input class="cell-input" type="text" value="'+escH(e.duree)+'" placeholder="—" title="Durée" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'duree\',this.value)">';
        html += '<input class="cell-input" type="text" value="'+escH(e.series)+'" placeholder="—" title="Séries" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'series\',this.value)">';
        html += '<input class="cell-input" type="text" value="'+escH(e.recup)+'" placeholder="—" title="Récupération" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'recup\',this.value)">';
        html += '<input class="cell-input" type="text" value="'+escH(e.tempo)+'" placeholder="—" title="Tempo" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'tempo\',this.value)">';
        html += '<div class="cible-cell">';
        var cibles = (e.cibles && e.cibles.length) ? e.cibles : [{type:e.cibleType||'RPE', min:e.cibleVal||'', max:''}];
        cibles.forEach(function(c, ci){
          html += '<div class="cible-tag">';
          html += '<select class="cible-type-sel" onchange="updateCible(\''+b.id+'\',\''+e.id+'\','+ci+',\'type\',this.value)">';
          ['kg','RPE','RIR','%1RM','Vitesse'].forEach(function(opt){
            html += '<option value="'+opt+'"'+(c.type===opt?' selected':'')+'>'+opt+'</option>';
          });
          html += '</select>';
          html += '<input class="cible-min-input" type="text" value="'+escH(c.min||'')+'" placeholder="—" title="Valeur (ou min si fourchette)" oninput="updateCible(\''+b.id+'\',\''+e.id+'\','+ci+',\'min\',this.value)">';
          html += '<span class="cible-dash">–</span>';
          html += '<input class="cible-max-input" type="text" value="'+escH(c.max||'')+'" placeholder="max" title="Max (optionnel)" oninput="updateCible(\''+b.id+'\',\''+e.id+'\','+ci+',\'max\',this.value)">';
          html += '<button class="cible-del-btn" onclick="removeCible(\''+b.id+'\',\''+e.id+'\','+ci+')" title="Retirer">×</button>';
          html += '</div>';
        });
        html += '<button class="cible-add-btn" onclick="addCible(\''+b.id+'\',\''+e.id+'\')">＋ cible</button>';
        html += '</div>';
        html += '<button class="exo-del-btn" onclick="removeExo(\''+b.id+'\',\''+e.id+'\')" title="Retirer"></button>';
        // Consignes + NRS par exercice
        var consigneVal = e.consigne || '';
        var nrsVal = (e.nrs !== null && e.nrs !== undefined) ? e.nrs : null;
        var nrsTxt = nrsVal !== null ? '💢 '+nrsVal+'/10' : '💢 —';
        var nrsCol = nrsVal === null ? '#9AA0A8' : nrsVal <= 3 ? '#16A34A' : nrsVal <= 6 ? '#F59E0B' : '#DC2626';
        html += '<div class="exo-consigne-row">'
             +  '<div class="exo-consigne-inner">'
             +  '<button class="nrs-badge" data-nrs="'+b.id+'-'+e.id+'" style="color:'+nrsCol+';border-color:'+(nrsVal!==null?nrsCol:'#CBD2DB')+'" onclick="toggleNrsPop(\''+b.id+'\',\''+e.id+'\',event)" title="Douleur NRS (0-10)">'+nrsTxt+'</button>'
             +  '<textarea class="exo-consigne-ta'+(consigneVal?' has-value':'')+'"'
             +  ' placeholder="💬 Consignes spécifiques…"'
             +  ' oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'consigne\',this.value);this.classList.toggle(\'has-value\',!!this.value.trim());autoResizeTa(this)"'
             +  '>'+escH(consigneVal)+'</textarea>'
             +  '</div>'
             +  '</div>';
        html += '</div>';
        // Fermer le wrapper après le dernier exercice du groupe
        if(isInGroup && !exoChained){
          _inChainGrp = false;
          html += '</div>'; // .chain-group
        }
      });
      // Fermer un groupe encore ouvert (cas limite : dernier exo du bloc encore chainé)
      if(_inChainGrp){ html += '</div>'; _inChainGrp = false; }
      var blocMin=b.exos.reduce(function(sum,e){var t=estimateExoMin(e);return sum+(t||0);},0);
      if(blocMin>0) html+='<div class="bloc-time-total">⏱ Durée estimée du bloc : '+fmtMin(blocMin)+'</div>';
    } else {
      html += '<div style="padding:14px;text-align:center;color:var(--muted);font-size:.78rem;">Cliquez sur un exercice dans la bibliothèque pour l\'ajouter ici</div>';
    }
    html += '<button class="add-free-exo-btn" onclick="addFreeExo(\''+b.id+'\')">✚ Exercice libre</button>';
    html += '</div></div>'; // .bloc-body .bloc
  });
  // Notes
  html += '<div class="notes-bloc"><div class="notes-label">Notes / Consignes</div>';
  html += '<textarea class="notes-ta" id="sessionNotes" placeholder="Conseils, progressions, points d\'attention…" oninput="autoResizeTa(this);if(typeof _notes!==\'undefined\'){_notes=this.value;_draftSaveLazy();}">'+escH(getNotes())+'</textarea></div>';
  html += '<button class="add-bloc-btn" onclick="addBloc()">+ Ajouter un bloc</button>';
  area.innerHTML = html;
  updateTargetBlocSelect();
  // Auto-resize des consignes déjà remplies + notes
  // Différé via rAF : le layout doit être calculé avant de mesurer scrollHeight
  requestAnimationFrame(function(){
    area.querySelectorAll('.exo-consigne-ta.has-value').forEach(function(ta){ autoResizeTa(ta); });
    var notesTa = document.getElementById('sessionNotes');
    if(notesTa && notesTa.value) autoResizeTa(notesTa);
  });
  // Auto-save brouillon après chaque rendu
  if(typeof _draftSave === 'function') _draftSave();
  // Sync état "déjà ajouté" dans le picker
  if(typeof _pickerRefreshAddedState === 'function') _pickerRefreshAddedState();
}

function updateTargetBlocSelect(){
  var sel = document.getElementById('target-bloc-select');
  if(!sel) return;
  var prev = sel.value;
  sel.innerHTML = '<option value="">— Dernier bloc —</option>';
  blocs.forEach(function(b, idx){
    var opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.title || ('Bloc ' + (idx+1));
    sel.appendChild(opt);
  });
  if(prev && blocs.find(function(b){ return b.id===prev; })) sel.value = prev;
}

var _notes = '';
function getNotes(){ return _notes; }
// Persist notes when re-rendering
document.addEventListener('input', function(e){
  if(e.target && e.target.id==='sessionNotes') _notes = e.target.value;
});

/* ================================================================
   EXPORT
   ================================================================ */
function exportSession(){
  if(!blocs.length){ alert('Aucun exercice à exporter.'); return; }
  document.getElementById('exportModal').classList.remove('hidden');
}

function getProfile(){
  try { return JSON.parse(localStorage.getItem(R4P_KEYS.PROFILE)||'{}'); } catch(e){ return {}; }
}

function buildExportHTML(){
  var patient = document.getElementById('patientName').value || 'Patient';
  var date = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  var notes = _notes;
  var p = getProfile();
  var praticien = ((p.prenom||'')+' '+(p.nom||'')).trim() || 'Praticien';
  var cabinet = p.cabinet || '';
  var metaParts = [date, praticien];
  if(cabinet) metaParts.push(cabinet);
  if(p.am) metaParts.push('N° AM : '+p.am);
  if(p.tel) metaParts.push(p.tel);
  var metaLine = metaParts.join(' · ');

  var OBJ_BGS = { libre:'#F5F7FA', endurance:'#F0FAF0', puissance:'#F5F0FF', hypertrophie:'#EEF3FB', forcemax:'#FEF0EE', isometrie:'#FFFBEB' };

  var blocksHtml = '';
  blocs.forEach(function(b){
    if(!b.exos.length) return;

    var obj     = b.objectif || 'libre';
    var objDef  = METHODES[obj] || METHODES.libre;
    var methVal = b.methode || '';
    var methObj = methVal ? objDef.methods.find(function(m){ return m.id===methVal; }) : null;
    var isChained = !!(methObj && methObj.chained);
    var objColor  = OBJ_COLORS[obj] || 'var(--muted)';
    var objBg     = OBJ_BGS[obj]    || '#F5F7FA';

    blocksHtml += '<div class="bloc">';
    blocksHtml += '<div class="bloc-header">'+escH(b.title)+'</div>';

    // ── Carte méthode ───────────────────────────────────────────────
    if(methObj){
      blocksHtml += '<div class="methode-info" style="border-left:4px solid '+objColor+';background:'+objBg+'">';
      blocksHtml += '<div class="methode-title" style="color:'+objColor+'">'+escH(objDef.label)+' — '+escH(methObj.label)+'</div>';
      blocksHtml += '<div class="methode-desc">'+escH(methObj.desc)+'</div>';
      if(methObj.protocol){
        blocksHtml += '<div class="methode-protocol">⚙ Structure intra-série : '+escH(methObj.protocol)+'</div>';
      }
      var anyChained = b.exos.some(function(ex){ return !!ex.chained; });
      if(anyChained){
        blocksHtml += '<div class="methode-protocol">⛓ Exercices enchaînés — récupération appliquée après le dernier exercice.</div>';
      }
      blocksHtml += '</div>';
    }

    // ── Tableau exercices ────────────────────────────────────────────
    blocksHtml += '<table>';
    blocksHtml += '<thead><tr><th>Exercice</th><th>Vidéo</th><th>Reps</th><th>Durée</th><th>Séries</th><th>Récup</th><th>Tempo</th><th>Cible</th><th>⏱</th></tr></thead>';
    blocksHtml += '<tbody>';
    b.exos.forEach(function(e, idx){
      var _cibles = (e.cibles && e.cibles.length) ? e.cibles : (e.cibleVal ? [{type:e.cibleType||'RPE', min:e.cibleVal, max:''}] : []);
      var cible = _cibles.filter(function(c){ return c.min||c.max; }).map(function(c){
        return c.type + ' ' + (c.min||'') + (c.max ? '–'+c.max : '');
      }).join(' · ') || '—';
      var exoMin  = estimateExoMin(e);
      var chainedRow = idx > 0 && !!b.exos[idx-1].chained;
      blocksHtml += '<tr'+(chainedRow?' class="chained-row"':'')+'>';
      blocksHtml += '<td class="exo-name-col">'+(chainedRow?'<span class="chain-icon">⛓</span> ':'')
                  + escH(e.name)+(e.obj?'<br><span class="tag">'+escH(e.obj)+'</span>':'')+'</td>';
      var _eVt = e.url ? _ytThumbHtml(e.url) : null;
      blocksHtml += '<td>'+(_eVt ? _eVt : (e.url ? '<a href="'+escH(e.url)+'" target="_blank">▶</a>' : '—'))+'</td>';
      blocksHtml += '<td>'+(e.reps||'—')+'</td>';
      blocksHtml += '<td>'+(e.duree||'—')+'</td>';
      blocksHtml += '<td>'+(e.series||'—')+'</td>';
      blocksHtml += '<td>'+(e.recup||'—')+'</td>';
      blocksHtml += '<td>'+(e.tempo||'—')+'</td>';
      blocksHtml += '<td class="cible-col">'+escH(cible)+'</td>';
      blocksHtml += '<td class="time-col">'+(exoMin!==null?fmtMin(exoMin):'—')+'</td>';
      blocksHtml += '</tr>';
      if(e.consigne && e.consigne.trim()){
        blocksHtml += '<tr class="consigne-row"><td colspan="9" class="consigne-cell">💬 '+escH(e.consigne)+'</td></tr>';
      }
    });
    // Ligne total bloc
    var blocMin = b.exos.reduce(function(s,e){ var t=estimateExoMin(e); return s+(t||0); },0);
    if(blocMin>0){
      blocksHtml += '<tr class="total-row">'
                  + '<td colspan="8">Durée estimée du bloc</td>'
                  + '<td class="time-col"><strong>'+fmtMin(blocMin)+'</strong></td>'
                  + '</tr>';
    }
    blocksHtml += '</tbody></table></div>';
  });

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Prescription – '+escH(patient)+'</title><style>'
    +'*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:-apple-system,Helvetica Neue,Arial,sans-serif;background:#F0F4F8;color:#1a2433;padding:24px}'
    +'.header{background:var(--navy);color:#fff;padding:18px 24px;border-radius:10px;margin-bottom:20px}'
    +'.header h1{font-size:1.1rem;font-weight:700;margin-bottom:2px}'
    +'.header .meta{font-size:.8rem;opacity:.7}'
    +'.logo{font-size:.85rem;font-style:italic;margin-bottom:8px}'
    +'.logo .r{color:var(--accent2)}.logo .n{font-weight:900;font-style:normal}.logo .p{color:var(--red)}'
    +'.bloc{background:#fff;border-radius:10px;border:1px solid var(--border);margin-bottom:16px;overflow:hidden}'
    +'.bloc-header{background:var(--navy);color:#fff;padding:10px 16px;font-size:.88rem;font-weight:700;letter-spacing:.04em}'
    +'table{width:100%;border-collapse:collapse}'
    +'thead tr{background:#F5F8FF}'
    +'th{padding:7px 10px;font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;text-align:left;border-bottom:1px solid var(--border)}'
    +'td{padding:9px 10px;font-size:.8rem;border-bottom:1px solid #f0f4f8;vertical-align:middle}'
    +'tr:last-child td{border-bottom:none}'
    +'.exo-name-col{font-weight:600;min-width:160px}'
    +'.tag{display:inline-block;padding:1px 6px;border-radius:8px;background:#F3F0FF;color:#5B4FBF;font-size:.65rem;font-weight:600;margin-top:3px}'
    +'a{color:var(--accent);text-decoration:none;font-weight:500}'
    +'a:hover{text-decoration:underline}'
    +'.cible-col{font-weight:600;color:var(--navy)}'
    +'.notes{background:#fff;border-radius:10px;border:1px solid var(--border);padding:16px;margin-top:4px}'
    +'.notes-label{font-size:.7rem;font-weight:700;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}'
    +'.notes-body{font-size:.82rem;line-height:1.6;white-space:pre-wrap}'
    +'.methode-info{padding:9px 14px;font-size:.78rem;line-height:1.6}'
    +'.methode-title{font-weight:700;font-size:.8rem;margin-bottom:2px}'
    +'.methode-desc{color:#444;margin-bottom:2px}'
    +'.methode-protocol{font-weight:600;margin-top:3px;font-size:.74rem}'
    +'.chain-icon{font-size:.75rem;opacity:.7}'
    +'.chained-row td:first-child{padding-left:22px}'
    +'.time-col{font-size:.75rem;color:#7a5c1e;font-weight:600;white-space:nowrap;text-align:center}'
    +'.total-row td{background:#F5F8FF;font-size:.75rem;color:var(--muted);padding:6px 10px;border-top:2px solid var(--border);text-align:right}'
    +'.total-row .time-col{color:var(--navy);text-align:center}'
    +'.consigne-row td{background:#FAFBFF;border-bottom:1px solid #f0f4f8}'
    +'.consigne-cell{padding:3px 10px 8px 24px;font-size:.76rem;color:#555;font-style:italic;white-space:pre-wrap}'
    +'@media print{body{background:#fff;padding:10px}.header{border-radius:0}}'
    +'</style></head><body>'
    +'<div class="header">'
    +'<div class="logo"><span class="r">Rehab</span><span class="n">4</span><span class="p">Perf</span></div>'
    +'<h1>Prescription d\'exercices – '+escH(patient)+'</h1>'
    +'<div class="meta">'+escH(metaLine)+'</div>'
    +'</div>'
    +blocksHtml
    +(notes?'<div class="notes"><div class="notes-label">Notes / Consignes</div><div class="notes-body">'+escH(notes)+'</div></div>':'')
    +'</body></html>';
}

function downloadExport(){
  var html = buildExportHTML();
  var patient = (document.getElementById('patientName').value||'prescription').replace(/\s+/g,'_');
  var date = new Date().toISOString().slice(0,10);
  var blob = new Blob([html],{type:'text/html;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'prescription_'+patient+'_'+date+'.html';
  a.click();
  document.getElementById('exportModal').classList.add('hidden');
}

function copyExportLink(){
  var html = buildExportHTML();
  navigator.clipboard.writeText(html).then(function(){
    alert('HTML copié dans le presse-papiers. Vous pouvez le coller dans un email ou un éditeur.');
  }).catch(function(){
    alert('Impossible de copier automatiquement. Utilisez "Télécharger" à la place.');
  });
  document.getElementById('exportModal').classList.add('hidden');
}

/* ================================================================
   LIBRARY EDITOR
   ================================================================ */
var ALL_ZONES = [
  'ÉPAULE','COUDE','POIGNET',
  'RACHIS – CERVICAL','RACHIS – THORACIQUE','RACHIS – LOMBAIRE',
  'HANCHE','GENOU','CHEVILLE','PIED',
  'TRONC / GAINAGE'
];
var ALL_TYPES = ['warmup','renfo','automassage'];

// Charge les exercices partagés depuis Supabase et les fusionne avec LIBRARY_DEFAULT
function _loadSupaLibrary(){
  if(!_progToken || !_progUid) return;
  _fetchRetry(SUPA_URL_P + '/rest/v1/exercices_library?order=created_at.asc', { headers: _sbHeaders() })
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(data){
    if(!Array.isArray(data)) return;
    _supaExoIds = {};
    data.forEach(function(e){ _supaExoIds[e.id] = true; });
    var supaIds = new Set(data.map(function(e){ return e.id; }));
    // Defaults : exclure ceux remplacés par Supabase (modifiés) ET ceux supprimés
    var filteredDefaults = LIBRARY_DEFAULT.filter(function(e){
      return !supaIds.has(e.id) && !_deletedDefaultIds.has(e.id);
    });
    var supaExos = data.map(function(e){
      return { id: e.id, name: e.name, zone: e.zone||'', type: e.type||'',
               url: e.url||'', obj: e.obj||'',
               patterns: Array.isArray(e.patterns) ? e.patterns : [],
               _fromSupa: true };
    });
    LIBRARY = filteredDefaults.concat(supaExos);
    filterLib();
  })
  .catch(function(){});
}

var _editorData = [];
var _editorOriginalIds = [];
var _efType    = '';    // '' | 'warmup' | 'renfo' | 'automassage'
var _efNoVideo = false;
var _efAdded   = false;

function setEfType(btn, val){
  _efType = val;
  document.querySelectorAll('.ef-pill').forEach(function(b){ b.classList.toggle('active', b.dataset.type === val); });
  renderEditor();
}
function toggleEfNoVideo(){
  _efNoVideo = !_efNoVideo;
  document.getElementById('efNoVideo').classList.toggle('active', _efNoVideo);
  renderEditor();
}
function toggleEfAdded(){
  _efAdded = !_efAdded;
  var btn = document.getElementById('efAdded');
  btn.classList.remove('active','active-blue');
  if(_efAdded) btn.classList.add('active-blue');
  renderEditor();
}
function _populateEfZone(){
  var sel = document.getElementById('efZone');
  if(!sel) return;
  var cur = sel.value;
  sel.innerHTML = '<option value="">— Toutes zones —</option>' + ALL_ZONES.map(function(z){ return '<option value="'+escH(z)+'"'+(z===cur?' selected':'')+'>'+escH(z)+'</option>'; }).join('');
}

function openEditor(){
  // Réinitialiser les filtres
  _efType = ''; _efNoVideo = false; _efAdded = false;
  document.querySelectorAll('.ef-pill').forEach(function(b){ b.classList.toggle('active', b.dataset.type === ''); });
  var efNv = document.getElementById('efNoVideo'); if(efNv) efNv.classList.remove('active');
  var efAd = document.getElementById('efAdded');   if(efAd) efAd.classList.remove('active','active-blue');
  document.getElementById('editorModal').classList.add('open');
  document.getElementById('editorSearch').value = '';
  // Recharger depuis Supabase en arrière-plan, puis ouvrir avec données fraîches
  if(_progToken && _progUid){
    _fetchRetry(SUPA_URL_P + '/rest/v1/exercices_library?order=created_at.asc', { headers: _sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if(Array.isArray(data)){
        _supaExoIds = {};
        data.forEach(function(e){ _supaExoIds[e.id] = true; });
        var supaIds2 = new Set(data.map(function(e){ return e.id; }));
        var filteredDefs = LIBRARY_DEFAULT.filter(function(e){
          return !supaIds2.has(e.id) && !_deletedDefaultIds.has(e.id);
        });
        var supaExos2 = data.map(function(e){
          return { id:e.id, name:e.name, zone:e.zone||'', type:e.type||'', url:e.url||'', obj:e.obj||'', patterns:Array.isArray(e.patterns)?e.patterns:[], _fromSupa:true };
        });
        LIBRARY = filteredDefs.concat(supaExos2);
      }
      _editorOriginalIds = LIBRARY.map(function(e){ return e.id; });
      _editorData = LIBRARY.map(function(e){ return Object.assign({},e); });
      renderEditor();
    })
    .catch(function(){
      _editorOriginalIds = LIBRARY.map(function(e){ return e.id; });
      _editorData = LIBRARY.map(function(e){ return Object.assign({},e); });
      renderEditor();
    });
  } else {
    // Sans auth : appliquer quand même la blacklist
    LIBRARY = LIBRARY_DEFAULT.filter(function(e){ return !_deletedDefaultIds.has(e.id); });
    _editorOriginalIds = LIBRARY.map(function(e){ return e.id; });
    _editorData = LIBRARY.map(function(e){ return Object.assign({},e); });
    renderEditor();
  }
}

function closeEditor(){
  document.getElementById('editorModal').classList.remove('open');
}

function saveEditor(){
  LIBRARY = _editorData.filter(function(e){ return e.name.trim(); });

  // ── Sync Supabase ──
  if(_progToken && _progUid){
    var defaultIds = new Set(LIBRARY_DEFAULT.map(function(e){ return e.id; }));
    var currentIds = new Set(LIBRARY.map(function(e){ return e.id; }));

    // POST (nouveau) ou PATCH (modifié) pour tous les exercices non-hardcodés
    // et pour les exercices hardcodés modifiés par l'utilisateur
    LIBRARY.forEach(function(ex){
      if(defaultIds.has(ex.id) && !ex._modified) return; // hardcodé non modifié, on ignore
      var payload = {
        id: ex.id, name: ex.name, zone: ex.zone||null, type: ex.type||null,
        url: ex.url||null, obj: ex.obj||null,
        patterns: ex.patterns||[],
        created_by: _progUid
      };
      if(_supaExoIds[ex.id]){
        // Modifier un exercice Supabase existant
        _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library?id=eq.'+ex.id, {
          method:'PATCH',
          headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
          body: JSON.stringify(payload)
        });
      } else {
        // Créer un nouvel exercice dans Supabase
        _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library', {
          method:'POST',
          headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
          body: JSON.stringify(payload)
        }).then(function(r){ if(r.ok) _supaExoIds[ex.id] = true; });
      }
    });

    // Supprimer les exercices retirés de la liste
    _editorOriginalIds.forEach(function(id){
      if(!currentIds.has(id)){
        // Exercice Supabase (custom ou default modifié) → DELETE Supabase
        if(_supaExoIds[id]){
          _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library?id=eq.'+id, {
            method:'DELETE', headers: _sbHeaders()
          }).then(function(r){ if(r.ok) delete _supaExoIds[id]; });
        }
        // Exercice hardcodé non encore dans Supabase → blacklist localStorage
        if(defaultIds.has(id) && !_supaExoIds[id]){
          _deletedDefaultIds.add(id);
          localStorage.setItem('r4p-deleted-defaults', JSON.stringify([..._deletedDefaultIds]));
        }
      }
    });
  }

  // Synchroniser les URLs dans la session courante pour les exos déjà ajoutés
  var sessionUpdated = false;
  blocs.forEach(function(bloc){
    (bloc.exos||[]).forEach(function(row){
      if(!row.libId) return;
      var libEx = LIBRARY.find(function(x){ return x.id === row.libId; });
      if(libEx && libEx.url && libEx.url !== row.url){
        row.url = libEx.url;
        sessionUpdated = true;
      }
    });
  });
  if(sessionUpdated) renderSession();
  filterLib();
  // Feedback bouton — reste ouvert
  var saveBtn = document.querySelector('#editorModal .btn-primary[onclick="saveEditor()"]');
  if(saveBtn){
    var prev = saveBtn.textContent;
    saveBtn.textContent = '✓ Enregistré !';
    saveBtn.style.background = '#1B5E20';
    saveBtn.style.borderColor = '#1B5E20';
    saveBtn.disabled = true;
    setTimeout(function(){
      saveBtn.textContent = prev;
      saveBtn.style.background = '';
      saveBtn.style.borderColor = '';
      saveBtn.disabled = false;
    }, 2000);
  }
}

function resetLibrary(){
  if(!confirm('Réinitialiser la bibliothèque aux exercices par défaut ?')) return;
  try { localStorage.removeItem(R4P_KEYS.LIBRARY); } catch(ex){}
  location.reload();
}

function addNewExo(){
  _editorData.unshift({id:'c'+Date.now(),name:'',zone:'',type:'',url:'',obj:'',patterns:[]});
  renderEditor();
  var el = document.getElementById('editorList').querySelector('input.exo-edit-name');
  if(el) el.focus();
}

function deleteEditorRow(idx){
  var ex  = _editorData[idx];
  var nom = (ex && ex.name) ? ex.name : 'cet exercice';
  if(!confirm('Supprimer « ' + nom + ' » de la bibliothèque ?')) return;
  var exId = ex ? ex.id : null;
  var defaultIds = new Set(LIBRARY_DEFAULT.map(function(e){ return e.id; }));
  _editorData.splice(idx, 1);
  // Mettre à jour LIBRARY et la sidebar immédiatement
  LIBRARY = LIBRARY.filter(function(e){ return e.id !== exId; });
  renderEditor();
  filterLib();
  if(!exId) return;
  // Exercice Supabase (custom ou default déjà modifié/uploadé) → DELETE Supabase
  if(_supaExoIds[exId] && _progToken && _progUid){
    _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library?id=eq.'+exId, {
      method:'DELETE', headers: _sbHeaders()
    }).then(function(r){
      if(r.ok){ delete _supaExoIds[exId]; }
      else { r.text().then(function(t){ alert('Erreur suppression : '+t); }); }
    }).catch(function(e){ alert('Erreur réseau : '+(e&&e.message||e)); });
  }
  // Exercice hardcodé non encore dans Supabase → blacklist localStorage
  if(defaultIds.has(exId) && !_supaExoIds[exId]){
    _deletedDefaultIds.add(exId);
    localStorage.setItem('r4p-deleted-defaults', JSON.stringify([..._deletedDefaultIds]));
  }
}

function updateEditorUrl(idx, val){
  if(!_editorData[idx]) return;
  _editorData[idx]._modified = true;
  _editorData[idx].url = val;
  var sp = document.getElementById('exo-thumb-'+idx);
  if(!sp) return;
  var html = val ? (_ytThumbHtml(val) || '<div class="exo-url-placeholder">Pas<br>YouTube</div>') : '<div class="exo-url-placeholder">▶</div>';
  sp.innerHTML = html;
}

/* ── Zone multi-select ── */
var _zonePopActive = null;

function _zoneLabel(zoneStr){
  if(!zoneStr) return '— Aucune —';
  var parts = zoneStr.split(',').map(function(z){ return z.trim(); }).filter(Boolean);
  if(parts.length === 0) return '— Aucune —';
  if(parts.length === 1) return parts[0];
  return parts.length + ' zones';
}

function _zonePopOpen(idx, event){
  event && event.stopPropagation();
  if(_zonePopActive === idx){ _zonePopClose(); return; }
  _zonePopClose();
  _zonePopActive = idx;
  var pop = document.getElementById('zone-ms-pop-'+idx);
  var btn = document.getElementById('zone-ms-btn-'+idx);
  if(pop) pop.classList.add('open');
  if(btn) btn.classList.add('open');
}

function _zonePopClose(){
  if(_zonePopActive === null) return;
  var pop = document.getElementById('zone-ms-pop-'+_zonePopActive);
  var btn = document.getElementById('zone-ms-btn-'+_zonePopActive);
  if(pop) pop.classList.remove('open');
  if(btn) btn.classList.remove('open');
  _zonePopActive = null;
}

function _zoneToggle(idx, zone, event){
  event && event.stopPropagation();
  if(!_editorData[idx]) return;
  _editorData[idx]._modified = true;
  var cur = (_editorData[idx].zone||'').split(',').map(function(z){ return z.trim(); }).filter(Boolean);
  var pos = cur.indexOf(zone);
  if(pos === -1) cur.push(zone);
  else cur.splice(pos, 1);
  _editorData[idx].zone = cur.join(',');
  // Mettre à jour le label du bouton
  var lbl = document.getElementById('zone-ms-lbl-'+idx);
  if(lbl) lbl.textContent = _zoneLabel(_editorData[idx].zone);
  // Mettre à jour l'état visuel de l'item
  var pop = document.getElementById('zone-ms-pop-'+idx);
  if(pop){
    var item = pop.querySelector('[data-zone="'+zone+'"]');
    if(item){
      var nowChecked = pos === -1;
      item.classList.toggle('checked', nowChecked);
      var cb = item.querySelector('input[type=checkbox]');
      if(cb) cb.checked = nowChecked;
    }
  }
}

// Fermer le popover zone au clic en dehors
document.addEventListener('click', function(){
  if(_zonePopActive !== null) _zonePopClose();
});

function updateEditorField(idx, field, val){
  if(!_editorData[idx]) return;
  _editorData[idx]._modified = true;
  if(field === 'patterns_str'){
    _editorData[idx].patterns = val.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  } else if(field === 'patterns_sel'){
    _editorData[idx].patterns = val ? [val] : [];
  } else {
    _editorData[idx][field] = val;
  }
}

function renderEditor(){
  var q        = (document.getElementById('editorSearch').value||'').toLowerCase();
  var efZone   = ((document.getElementById('efZone')||{}).value||'');
  var list     = document.getElementById('editorList');
  var defaultIds = new Set(LIBRARY_DEFAULT.map(function(e){ return e.id; }));

  _populateEfZone();

  var rows = '';
  _editorData.forEach(function(e, i){
    // ── Filtres ──
    var _eZoneArr = (e.zone||'').split(',').map(function(z){ return z.trim(); }).filter(Boolean);
    if(q && e.name.toLowerCase().indexOf(q)===-1 && (e.zone||'').toLowerCase().indexOf(q)===-1) return;
    if(efZone   && _eZoneArr.indexOf(efZone) === -1) return;
    if(_efType  && e.type  !== _efType)  return;
    if(_efNoVideo && e.url)              return;
    if(_efAdded && defaultIds.has(e.id)) return;
    // Zone multi-select widget
    var _zMsItems = ALL_ZONES.map(function(z){
      var chk = _eZoneArr.indexOf(z) !== -1;
      return '<div class="zone-ms-item'+(chk?' checked':'')+'" data-zone="'+escH(z)+'" onclick="_zoneToggle('+i+',\''+z+'\',event)">'
        + '<input type="checkbox"'+(chk?' checked':'')+'>'+escH(z)+'</div>';
    }).join('');
    var zMsHtml = '<div class="zone-ms-wrap">'
      +'<button type="button" class="zone-ms-btn" id="zone-ms-btn-'+i+'" onclick="_zonePopOpen('+i+',event)">'
      +'<span class="zone-ms-btn-label" id="zone-ms-lbl-'+i+'">'+escH(_zoneLabel(e.zone||''))+'</span>'
      +'<span class="zone-ms-btn-arrow">▾</span></button>'
      +'<div class="zone-ms-pop" id="zone-ms-pop-'+i+'">'+_zMsItems+'</div>'
      +'</div>';
    var typeOpts = '<option value=""'+((!e.type)?' selected':'')+'>— Aucun —</option>' + [
      {v:'warmup',           l:'Warm-up / Mobilité'},
      {v:'renfo',            l:'Renforcement'},
      {v:'automassage',      l:'Auto-massage'},
      {v:'etirements',       l:'Étirements'},
      {v:'neurodynamie',     l:'Neurodynamie'},
      {v:'tests',            l:'Tests'},
      {v:'therapie_manuelle',l:'Thérapie manuelle'}
    ].map(function(o){ return '<option value="'+o.v+'"'+(o.v===(e.type||'')?' selected':'')+'>'+o.l+'</option>'; }).join('');
    var allPatterns = ['Triple flexion','Hinge','Poussé vertical','Poussé horizontal','Tirage vertical','Tirage horizontal'];
    var exPatterns = e.patterns || [];
    var patSel = '<option value="">— Aucun —</option>' + allPatterns.map(function(p){
      return '<option value="'+escH(p)+'"'+(exPatterns.indexOf(p)!==-1?' selected':'')+'>'+escH(p)+'</option>';
    }).join('');
    rows += '<div class="exo-edit-row" data-idx="'+i+'">';
    rows += '<input class="exo-edit-name" type="text" value="'+escH(e.name)+'" placeholder="Nom de l\'exercice" oninput="updateEditorField('+i+',\'name\',this.value)">';
    rows += zMsHtml;
    rows += '<select onchange="updateEditorField('+i+',\'type\',this.value)">'+typeOpts+'</select>';
    rows += '<select onchange="updateEditorField('+i+',\'patterns_sel\',this.value)">'+patSel+'</select>';
    var thumbHtml = e.url ? (_ytThumbHtml(e.url) || '<div class="exo-url-placeholder">Pas<br>YouTube</div>') : '<div class="exo-url-placeholder">▶</div>';
    rows += '<div class="exo-url-cell">'
          + '<span id="exo-thumb-'+i+'">'+thumbHtml+'</span>'
          + '<input type="url" value="'+escH(e.url||'')+'" placeholder="https://youtu.be/…" oninput="updateEditorUrl('+i+',this.value)">'
          + '</div>';
    rows += '<button class="exo-del-edit" onclick="deleteEditorRow('+i+')" title="Supprimer">×</button>';
    rows += '</div>';
  });
  list.innerHTML = rows || '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.8rem;">Aucun exercice correspondant</div>';
  // Compteur
  var countEl = document.getElementById('editorCount');
  if(countEl){
    var visible = rows ? rows.split('class="exo-edit-row"').length - 1 : 0;
    var total   = _editorData.length;
    countEl.textContent = q ? visible + ' / ' + total + ' exercice' + (total>1?'s':'') : total + ' exercice' + (total>1?'s':'');
  }
}

/* ================================================================
   INIT
   ================================================================ */
// Avertissement fermeture onglet/fenêtre si séance non sauvegardée
window.addEventListener('beforeunload', function(e){
  if(typeof _builderSaved !== 'undefined' && !_builderSaved &&
     typeof blocs !== 'undefined' && blocs && blocs.length){
    e.preventDefault();
    e.returnValue = '';
  }
});

window.addEventListener('message', function(e){
  if(e.origin !== window.location.origin) return;
  if(e.data && e.data.type==='r4p-profile'){
    try { localStorage.setItem(R4P_KEYS.PROFILE, JSON.stringify(e.data.profile)); } catch(ex){}
  }
  // Nouveau token reçu depuis index.html après refresh automatique
  if(e.data && e.data.type==='r4p-token-refreshed' && e.data.access_token){
    _progToken = e.data.access_token;
    try {
      var pl = JSON.parse(atob(_progToken.split('.')[1]));
      _progUid = pl.sub || null;
    } catch(ex){}
    _loadUserRole();
  }
  if(e.data && e.data.type==='r4p-patient-selected'){
    _progPatient = _normalizePatient(e.data.patient);
    _currentProgId = null;
    try { localStorage.setItem(R4P_KEYS.PATIENT, e.data.patient ? JSON.stringify(_progPatient) : ''); } catch(ex){}
    // Récupérer uid et token depuis le payload JWT envoyé par le parent
    if(e.data.auth && e.data.auth.access_token){
      _progToken = e.data.auth.access_token;
      try {
        var payload = JSON.parse(atob(_progToken.split('.')[1]));
        _progUid = payload.sub || null;
      } catch(ex){}
      _loadSupaLibrary();
      _loadUserRole();
    }
    // Auto-remplir le champ nom du patient + mettre à jour toute l'UI
    if(_progPatient){
      var pnEl = document.getElementById('patientName');
      if(pnEl) pnEl.value = _progPatient.prenom + ' ' + _progPatient.nom;
    }
    _updatePatientUI();
  }
});

/* ═══════════════════════════════════════════════════════════
   SUPABASE — PROGRAMMES
═══════════════════════════════════════════════════════════ */
var SUPA_URL_P = 'https://sxdobjodxkwexaspepdm.supabase.co';
var SUPA_KEY_P = 'sb_publishable_zEJrmQOnKyRm-Y_NyojaTA_ERrDx4pl';
var sbP = supabase.createClient(SUPA_URL_P, SUPA_KEY_P);

var _progPatient    = null;
var _currentProgId  = null;
var _currentSeanceId = null; // ID de la séance calendrier ouverte dans le builder (null si chargée depuis l'historique)
var _progUid        = null;
var _progToken     = null;
var _userRole      = null; // 'admin' | 'lecteur' | null

/* Capitalise la 1re lettre de chaque mot (gère accents + tirets) */
function _capName(str){
  if(!str) return str;
  return str.toLowerCase().replace(/(^|[\s\-])([\wÀ-ÿ])/g, function(m, sep, c){ return sep + c.toUpperCase(); });
}
function _normalizePatient(p){
  if(!p) return p;
  if(p.prenom) p.prenom = _capName(p.prenom);
  if(p.nom)    p.nom    = _capName(p.nom);
  return p;
}

// Fallback : récupérer uid + token depuis localStorage au chargement
(function(){
  try {
    var raw = localStorage.getItem(R4P_KEYS.SUPABASE_AUTH);
    if(raw){
      var parsed = JSON.parse(raw);
      var tok = parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token);
      if(tok){
        _progToken = tok;
        var pl = JSON.parse(atob(tok.split('.')[1]));
        _progUid = pl.sub || null;
        _loadSupaLibrary();
        _loadUserRole();
      }
    }
  } catch(ex){}
})();

// Restaurer patient depuis localStorage
(function(){
  try {
    var sp = localStorage.getItem(R4P_KEYS.PATIENT);
    if(sp && sp !== '') {
      _progPatient = _normalizePatient(JSON.parse(sp));
      var pnEl = document.getElementById('patientName');
      if(pnEl && !pnEl.value) pnEl.value = _progPatient.prenom + ' ' + _progPatient.nom;
    }
  } catch(ex){}
  _updatePatientUI();
})();

// ── Met à jour tous les éléments UI liés au patient actif ──
function _updatePatientUI(){
  var nom = _progPatient ? (_progPatient.prenom||'') + ' ' + (_progPatient.nom||'') : '';
  nom = nom.trim();
  // Badge séance
  var badge = document.getElementById('patientBadge');
  var badgeName = document.getElementById('patientBadgeName');
  if(badge){ badge.style.display = nom ? 'flex' : 'none'; }
  if(badgeName){ badgeName.textContent = nom; }
  // Label calendrier
  var calLbl = document.getElementById('calPatientLabel');
  if(calLbl){ calLbl.textContent = nom ? '👤 ' + nom : ''; }
  // Header templates
  var tmplHeader = document.querySelector('#mpanel-seances .main-header h1');
  if(tmplHeader){ tmplHeader.textContent = nom ? 'Templates — ' + nom : 'Templates de séances'; }
  // Charger les cycles du patient depuis Supabase
  if(_progPatient) setTimeout(function(){ if(typeof _loadCyclesForPatient==="function") _loadCyclesForPatient(); }, 0);
  // Sync des notes cliniques depuis Supabase (une fois par patient)
  if(typeof _calNotesSyncedFor !== 'undefined') _calNotesSyncedFor = null;
  setTimeout(function(){ if(typeof _syncCalNotesIfNeeded === 'function') _syncCalNotesIfNeeded(); }, 200);
  // Rafraîchir le calendrier pour le nouveau patient
  if(typeof renderCalendar === 'function') renderCalendar();
}

// Tente de lire un token frais depuis le localStorage Supabase
function _tryRefreshToken(){
  try {
    var raw = localStorage.getItem(R4P_KEYS.SUPABASE_AUTH);
    if(!raw) return false;
    var parsed = JSON.parse(raw);
    var tok = parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token);
    if(!tok || tok === _progToken) return false;
    _progToken = tok;
    var pl = JSON.parse(atob(tok.split('.')[1]));
    _progUid = pl.sub || null;
    return true;
  } catch(ex){ return false; }
}

function _sbHeaders(){
  // Si le token semble absent, tenter une lecture fraîche depuis localStorage
  if(!_progToken) _tryRefreshToken();
  return {
    'Authorization': 'Bearer ' + _progToken,
    'apikey': SUPA_KEY_P,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

/* ── Rôles utilisateur ── */
function _isAdmin(){ return _userRole === 'admin'; }
function _isEditor(){ return _isAdmin(); } // editeur supprimé — alias admin
function _isReader(){ return _userRole === 'lecteur'; }

function _loadUserRole(){
  if(!_progToken || !_progUid) return;
  _fetchRetry(SUPA_URL_P + '/rest/v1/praticien_roles?user_id=eq.'+_progUid+'&select=role', { headers: _sbHeaders() })
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(data){
    _userRole = (Array.isArray(data) && data[0]) ? data[0].role : 'lecteur';
    _applyRoleUI();
  })
  .catch(function(){ _userRole = 'lecteur'; _applyRoleUI(); });
}

function _applyRoleUI(){
  document.querySelectorAll('.r4p-admin-only').forEach(function(el){
    el.style.display = _isAdmin() ? '' : 'none';
  });
  document.querySelectorAll('.r4p-editor-only').forEach(function(el){
    el.style.display = _isEditor() ? '' : 'none';
  });
}

/* ── Toggle public/privé d'un template ou protocole (admin only) ── */
function _togglePublic(type, id, makePublic){
  var table = type === 'group' ? 'template_groups' : 'templates';
  _fetchRetry(SUPA_URL_P+'/rest/v1/'+table+'?id=eq.'+id, {
    method: 'PATCH',
    headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
    body: JSON.stringify({ is_public: makePublic })
  }).then(function(r){
    if(r.ok){
      var arr = type === 'group' ? (_groups||[]) : (_sidebarProgs||[]);
      var item = arr.find(function(x){ return String(x.id)===String(id); });
      if(item) item.is_public = makePublic;
      // Cascade is_public sur toutes les phases du groupe
      if(type === 'group'){
        _fetchRetry(SUPA_URL_P+'/rest/v1/templates?group_id=eq.'+id, {
          method: 'PATCH',
          headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
          body: JSON.stringify({ is_public: makePublic })
        }).then(function(){
          (_sidebarProgs||[]).forEach(function(p){
            if(String(p.group_id)===String(id)) p.is_public = makePublic;
          });
          renderSidebarTemplates();
          renderBuilderLibrary();
          _showToast(makePublic ? '🌐 Rendu public (protocole + phases) !' : '🔒 Rendu privé !');
        }).catch(function(){
          renderSidebarTemplates();
          renderBuilderLibrary();
          _showToast(makePublic ? '🌐 Groupe public — erreur mise à jour phases.' : '🔒 Rendu privé !');
        });
      } else {
        renderSidebarTemplates();
        renderBuilderLibrary();
        _showToast(makePublic ? '🌐 Rendu public !' : '🔒 Rendu privé !');
      }
    } else {
      r.json().then(function(d){ alert('Erreur : '+JSON.stringify(d)); });
    }
  }).catch(function(){ alert('Erreur réseau.'); });
}

// Gestion centralisée des erreurs réseau — message lisible si JWT expiré
function _handleApiError(status, data, context){
  if(status === 401){
    // Tenter de récupérer un token frais depuis localStorage
    if(_tryRefreshToken()){
      _showToast('🔄 Session renouvelée — réessayez la sauvegarde.');
    } else {
      _showToast('⚠️ Session expirée — veuillez recharger la page.');
    }
    return;
  }
  alert('Erreur '+ status + (context ? ' ('+context+')' : '') + ' : ' + JSON.stringify(data));
}

function saveProgToCloud(){
  if(!_progPatient){ alert('Sélectionnez un patient depuis la barre de navigation.'); return; }
  if(!_progUid || !_progToken){ alert('Session non disponible. Veuillez sélectionner à nouveau le patient depuis la barre de navigation.'); return; }
  var btn = document.getElementById('prog-cloud-save-btn');
  btn.disabled = true; btn.textContent = '⏳ Sauvegarde…';
  var nomProg = (document.getElementById('patientName')||{}).value || ('Programme du '+new Date().toLocaleDateString('fr-FR'));
  var donnees = { blocs: JSON.parse(JSON.stringify(blocs||[])), notes: getNotes() };
  if(_builderLinkedPhase) donnees.linkedPhase = _builderLinkedPhase;
  var today = new Date().toISOString().split('T')[0];

  // Si ce programme vient d'une séance calendrier, vérifier localement (dans _cloudCalEvents déjà chargé)
  // si ce programme_id est partagé par plusieurs séances. Si oui, forcer un INSERT indépendant.
  if(_currentProgId && _currentSeanceId){
    var sharedCount = (_cloudCalEvents||[]).filter(function(ev){
      return ev.programme_id === _currentProgId;
    }).length;
    if(sharedCount > 1){
      _currentProgId = null; // forcer la création d'un programme indépendant
    }
  }
  var saveDate = _builderDate || today;
  _doSaveProgCloud(nomProg, donnees, saveDate, btn);
}

function _doSaveProgCloud(nomProg, donnees, today, btn){
  var isNew = !_currentProgId;
  var seanceId = _currentSeanceId; // capturer avant l'async
  var url = isNew
    ? (SUPA_URL_P + '/rest/v1/programmes')
    : (SUPA_URL_P + '/rest/v1/programmes?id=eq.' + _currentProgId);
  var method = isNew ? 'POST' : 'PATCH';
  var payload = isNew
    ? {patient_id:_progPatient.id, praticien_id:_progUid, nom:nomProg, date:today, donnees:donnees}
    : {donnees:donnees, nom:nomProg, date:today};
  _fetchRetry(url, {method:method, headers:_sbHeaders(), body:JSON.stringify(payload)})
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, status:r.status, data:d}; }); })
  .then(function(res){
    btn.disabled = false;
    if(!res.ok){ _refreshSaveBtn(); _handleApiError(res.status, res.data, 'sauvegarde séance'); return; }
    var d = Array.isArray(res.data) ? res.data[0] : res.data;
    if(isNew && d && d.id){
      _currentProgId = d.id;
      // Relier uniquement la séance actuelle au nouveau programme indépendant,
      // puis rafraîchir le calendrier pour que le chip pointe vers le nouveau programme_id.
      if(seanceId){
        _fetchRetry(SUPA_URL_P + '/rest/v1/seances_planifiees?id=eq.' + seanceId, {
          method:'PATCH',
          headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
          body: JSON.stringify({programme_id: d.id})
        })
        .then(function(){ renderCalendar(); })
        .catch(function(e){ console.warn('Mise à jour programme_id séance échouée :', e); });
      }
    }
    _draftClear();
    _showToast('✓ Programme sauvegardé !');
    _refreshSaveBtn();
    _updateBuilderTitle();
  })
  .catch(function(err){
    btn.disabled = false; _refreshSaveBtn();
    alert('Erreur réseau : '+(err&&err.message||err));
  });
}

function openProgHistory(){
  if(!_progPatient){ alert('Sélectionnez un patient depuis la barre de navigation.'); return; }
  // Créer le modal dynamiquement s'il n'existe pas
  var overlay = document.getElementById('progHistoOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'progHistoOverlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);align-items:flex-start;justify-content:center;padding-top:60px;';
    overlay.innerHTML = '<div style="background:#fff;border-radius:10px;width:100%;max-width:440px;max-height:calc(100vh - 100px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.22);">'
      +'<div style="background:var(--navy);color:#fff;padding:13px 18px;display:flex;align-items:center;gap:10px;">'
      +'<button class="btn-back" onclick="document.getElementById(\'progHistoOverlay\').style.display=\'none\'" title="Retour">←</button>'
      +'<h2 style="flex:1;font-size:.92rem;font-weight:700;">📂 Programmes enregistrés</h2>'
      +'<button onclick="document.getElementById(\'progHistoOverlay\').style.display=\'none\'" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:1.3rem;cursor:pointer;">✕</button>'
      +'</div>'
      +'<div id="progHistoList" style="flex:1;overflow-y:auto;"></div>'
      +'<button onclick="_newProgVierge()" style="margin:12px 16px;padding:9px;background:#2D6A4F;color:#fff;border:none;border-radius:6px;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit;">+ Nouveau programme vierge</button>'
      +'</div>';
    overlay.onclick = function(e){ if(e.target===overlay) overlay.style.display='none'; };
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  document.getElementById('progHistoList').innerHTML = '<div style="padding:28px 20px;text-align:center;color:#9D9B96;font-style:italic;">Chargement…</div>';
  var histoUrl = SUPA_URL_P + '/rest/v1/programmes?patient_id=eq.' + _progPatient.id + '&select=id,nom,date&order=date.desc';
  _fetchRetry(histoUrl, {method:'GET', headers:_sbHeaders()})
    .then(function(r){ return r.json(); })
    .then(function(data){
    var list = document.getElementById('progHistoList');
    if(!data || !data.length){
      list.innerHTML='<div style="padding:28px 20px;text-align:center;color:#9D9B96;font-style:italic;">Aucun programme enregistré pour ce patient.</div>';
      return;
    }
    list.innerHTML = data.map(function(p){
      var d = p.date ? p.date.split('-').reverse().join('/') : '—';
      var isCurrent = _currentProgId === p.id;
      return '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #F1F0ED;'+(isCurrent?'background:#EEF3FB;':'')+'">'
        +'<div style="flex:1;min-width:0;"><div style="font-size:.88rem;font-weight:700;color:var(--navy);">'+d+'</div>'
        +'<div style="font-size:.75rem;color:#6B6860;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escH(p.nom||'')+'</div></div>'
        +'<button onclick="_loadProg(\''+p.id+'\')" style="background:var(--navy);color:#fff;border:none;border-radius:5px;padding:5px 11px;font-size:.75rem;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;">'+(isCurrent?'✓ Actif':'Charger')+'</button>'
        +'<button onclick="_shareProgById(\''+p.id+'\')" style="background:rgba(42,95,166,.1);color:var(--accent);border:1px solid rgba(42,95,166,.3);border-radius:5px;padding:5px 9px;font-size:.78rem;cursor:pointer;font-family:inherit;flex-shrink:0;" title="Copier le lien de partage">📤</button>'
        +'<button onclick="_deleteProg(\''+p.id+'\',\''+escJS(p.nom||d)+'\')" style="background:none;border:1px solid var(--red);color:var(--red);border-radius:5px;padding:5px 8px;font-size:.78rem;cursor:pointer;font-family:inherit;flex-shrink:0;" title="Supprimer ce programme">🗑</button>'
        +'</div>';
    }).join('');
  });
}

/* ================================================================
   ÉVOLUTION DES CHARGES
   ================================================================ */

/* Estimation 1RM :
   - Brzycki pour 1–36 reps (précision optimale en force)
   - Epley pour > 36 reps (endurance, pas de limite haute)
   - kg par défaut = 1 si absent/nul (poids de corps ≈ négligeable) */
function _1rm(kg, reps) {
  reps = parseFloat(reps);
  if(isNaN(reps) || reps <= 0) return null;
  kg = parseFloat(kg);
  if(isNaN(kg) || kg <= 0) kg = 0.1;        // poids de corps → 0.1 kg par défaut (quasi nul)
  if(reps === 1) return Math.round(kg * 10) / 10;
  if(reps <= 36) return Math.round((kg * 36 / (37 - reps)) * 10) / 10;  // Brzycki
  return Math.round((kg * (1 + reps / 30)) * 10) / 10;                   // Epley
}

/* Extrait, depuis un tableau de programmes Supabase [{id,nom,date,donnees}],
   un dictionnaire { "Nom exercice normalisé" → [{date, kg, reps, rm1, progNom}] }
   trié par date croissante. Ne garde que les entrées avec cibles.type==='kg'. */
/* Accepte un tableau de séances : [{date, programme_id, programmes:{nom,donnees}}]
   Déduplique par programme_id (même programme sur plusieurs séances = 1 seul point,
   à la date de la 1ère séance qui l'utilise). */
function _extractExoLoads(seances) {
  // 1. Dédupliquer par (date + programme_id) : même programme sur jours différents = points séparés
  var seenKeys = {};
  var progList = [];
  seances.forEach(function(s) {
    var pid = s.programme_id;
    var prog = s.programmes;
    if(!pid || !prog) return;
    var key = (s.date || '') + '|' + pid;
    if(!seenKeys[key]) {
      seenKeys[key] = true;
      progList.push({ date: s.date || '', donnees: prog.donnees, nom: prog.nom || '' });
    }
  });

  // 2. Extraire les exercices (kg OU reps seules) de chaque programme
  var map = {};
  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    blocs.forEach(function(bloc) {
      (bloc.exos || []).forEach(function(exo) {
        var name = (exo.name || '').trim();
        if(!name) return;
        var reps = parseFloat(exo.reps);
        if(isNaN(reps) || reps <= 0) return;          // besoin d'au moins des reps
        var kgCible = null;
        (exo.cibles || []).forEach(function(c) {
          if(c.type === 'kg' && (parseFloat(c.min) > 0 || parseFloat(c.max) > 0)) kgCible = c;
        });
        // Min seul → min / Max seul → max / Les deux → moyenne
        var kg = 0;
        if(kgCible) {
          var kMin = parseFloat(kgCible.min) || 0;
          var kMax = parseFloat(kgCible.max) || 0;
          kg = (kMin > 0 && kMax > 0) ? (kMin + kMax) / 2 : (kMin || kMax);
        }
        var bw  = !kgCible || kg <= 0;                // poids de corps / sans charge
        var rm1 = _1rm(kg, reps);
        if(!rm1) return;
        var key = name.toLowerCase().replace(/\s+/g,' ');
        if(!map[key]) map[key] = { label: name, points: [] };
        map[key].points.push({ date: prog.date, kg: bw?0:kg, reps: reps, rm1: rm1, bw: bw, progNom: prog.nom });
      });
    });
  });

  // 3. Trier par date, garder seulement ≥2 points
  var result = {};
  Object.keys(map).forEach(function(key) {
    var pts = map[key].points.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
    if(pts.length >= 2) result[key] = { label: map[key].label, points: pts };
  });
  return result;
}

/* Extrait les données NRS (douleur) par exercice à partir des séances chargées. */
function _extractExoNRS(seances) {
  var seenKeys = {};
  var progList = [];
  seances.forEach(function(s) {
    var pid = s.programme_id;
    var prog = s.programmes;
    if(!pid || !prog) return;
    var key = (s.date || '') + '|' + pid;
    if(!seenKeys[key]) {
      seenKeys[key] = true;
      progList.push({ date: s.date || '', donnees: prog.donnees });
    }
  });

  var map = {};
  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    blocs.forEach(function(bloc) {
      (bloc.exos || []).forEach(function(exo) {
        var name = (exo.name || '').trim();
        if(!name) return;
        if(exo.nrs === null || exo.nrs === undefined) return;
        var key = name.toLowerCase().replace(/\s+/g,' ');
        if(!map[key]) map[key] = { nom: name, pts: [] };
        map[key].pts.push({ date: prog.date, nrs: exo.nrs });
      });
    });
  });

  var result = {};
  Object.keys(map).forEach(function(key) {
    var pts = map[key].pts.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
    if(pts.length >= 2) result[key] = { nom: map[key].nom, pts: pts };
  });
  return result;
}

/* ─── PARSING DURÉE ─────────────────────────────────────────────────────── */
function _parseDuree(str) {
  if(!str || typeof str !== 'string') return null;
  str = str.trim();
  var m;
  // "Xmin[Ys]" / "XmYs" (ex: "1min30", "1min30s", "1min")
  m = str.match(/^(\d+)\s*(?:min|m)(?:s?)(?:\s*(\d+)\s*s?)?$/i);
  if(m) return parseInt(m[1])*60 + (m[2] ? parseInt(m[2]) : 0);
  // "X'Y" ou "X:Y"  (ex: "1'30", "1:30")
  m = str.match(/^(\d+)[':](\d+)$/);
  if(m) return parseInt(m[1])*60 + parseInt(m[2]);
  // "Xs" (ex: "30s", "45 s")
  m = str.match(/^(\d+)\s*s$/i);
  if(m) return parseInt(m[1]);
  return null; // valeur sans unité ("30") → ignorée
}

function _formatDuree(secs) {
  secs = Math.max(0, Math.round(secs));
  if(secs < 60) return secs + 's';
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return s > 0 ? m + 'm' + s + 's' : m + 'min';
}

/* Extrait les durées par exercice (exos sans reps mais avec duree parseable). */
function _extractExoDurations(seances) {
  var seenKeys = {};
  var progList = [];
  seances.forEach(function(s) {
    var pid = s.programme_id;
    var prog = s.programmes;
    if(!pid || !prog) return;
    var key = (s.date || '') + '|' + pid;
    if(!seenKeys[key]) {
      seenKeys[key] = true;
      progList.push({ date: s.date || '', donnees: prog.donnees, nom: prog.nom || '' });
    }
  });

  var map = {};
  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    blocs.forEach(function(bloc) {
      if(bloc.type === 'cardio') return;
      (bloc.exos || []).forEach(function(exo) {
        var name = (exo.name || '').trim();
        if(!name) return;
        var reps = parseFloat(exo.reps);
        if(!isNaN(reps) && reps > 0) return; // skip si reps définies
        var secs = _parseDuree(exo.duree || '');
        if(!secs || secs <= 0) return;
        var key = name.toLowerCase().replace(/\s+/g,' ') + '__duree';
        if(!map[key]) map[key] = { label: name + ' (durée)', points: [] };
        map[key].points.push({ date: prog.date, secs: secs, progNom: prog.nom });
      });
    });
  });

  var result = {};
  Object.keys(map).forEach(function(key) {
    var pts = map[key].points.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
    if(pts.length >= 2) result[key] = { label: map[key].label, points: pts };
  });
  return result;
}

/* Extrait les charges cardio (distance km) par groupe sport+effort_type. */
function _extractCardioLoads(seances) {
  var seenKeys = {};
  var progList = [];
  seances.forEach(function(s) {
    var pid = s.programme_id;
    var prog = s.programmes;
    if(!pid || !prog) return;
    var key = (s.date || '') + '|' + pid;
    if(!seenKeys[key]) {
      seenKeys[key] = true;
      progList.push({ date: s.date || '', donnees: prog.donnees });
    }
  });

  var map = {};
  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    blocs.forEach(function(bloc) {
      if(bloc.type !== 'cardio') return;
      var sport = bloc.sport || 'general';
      var effortType = bloc.effort_type || 'continu';
      var dist = parseFloat(bloc.distance);
      if(isNaN(dist) || dist <= 0) return;
      var groupKey = sport + '|' + effortType + '__cardio';
      var sportLabel = (CARDIO_SPORTS.find(function(s){ return s.val === sport; }) || {label: sport}).label;
      var effortLabel = (CARDIO_EFFORT_TYPES.find(function(e){ return e.val === effortType; }) || {label: effortType}).label;
      var label = sportLabel + ' — ' + effortLabel;
      if(!map[groupKey]) map[groupKey] = { label: label, points: [] };
      map[groupKey].points.push({ date: prog.date, km: dist });
    });
  });

  var result = {};
  Object.keys(map).forEach(function(key) {
    var pts = map[key].points.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
    if(pts.length >= 2) result[key] = { label: map[key].label, points: pts };
  });
  return result;
}

/* SVG courbe durée (axe Y en secondes, labels formatés Xm Ys). */
function _buildPevoDureeChart(pts, chartId, nrsPts) {
  if(!pts || pts.length < 2) return '';
  nrsPts = nrsPts || null;
  var nrsValidArr = nrsPts ? nrsPts.filter(function(v){ return v !== null && !isNaN(v); }) : [];
  var hasNrs = nrsValidArr.length >= 2;
  var vals = pts.map(function(p){ return p.secs; });
  var dates = pts.map(function(p){ var d=p.date?p.date.split('-'):['','','']; return (d[2]||'?')+'/'+(d[1]||'?'); });
  var VW=500, VH=110;
  var PAD={top:18, right: hasNrs ? 38 : 22, bottom:30, left:46};
  var C = '#D97706';
  var CNRS = '#7C3AED';
  var minV = Math.min.apply(null, vals), maxV = Math.max.apply(null, vals);
  var pad = Math.max(1, (maxV-minV)*0.15); minV = Math.max(0, minV-pad); maxV = maxV+pad;
  var rangeV = maxV - minV || 1;
  var n = pts.length;
  var svgId = 'pevo'+String(chartId).replace(/[^a-z0-9]/gi,'');
  var gId   = 'gduree'+svgId;
  var gNrsId = 'gnrsduree'+svgId;
  function pxy(i,v){ return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y:(VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom)}; }
  function nrsPt(i,v){ return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y:(VH-PAD.bottom)-(v/10)*(VH-PAD.top-PAD.bottom)}; }
  var html = '<defs>'
    +'<linearGradient id="'+gId+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+C+'" stop-opacity="0.22"/>'
    +'<stop offset="100%" stop-color="'+C+'" stop-opacity="0.02"/>'
    +'</linearGradient>'
    +(hasNrs ? '<linearGradient id="'+gNrsId+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+CNRS+'" stop-opacity="0.18"/><stop offset="100%" stop-color="'+CNRS+'" stop-opacity="0.02"/></linearGradient>' : '')
    +'</defs>';
  // Grille Y gauche
  var step = Math.max(1, Math.ceil((maxV-minV)/4));
  for(var gv=Math.round(minV); gv<=maxV+step; gv+=step){
    var gy=(VH-PAD.bottom)-((gv-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    if(gy<PAD.top||gy>VH-PAD.bottom+2) continue;
    html+='<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+_formatDuree(Math.max(0,Math.round(gv)))+'</text>';
  }
  // Axe NRS droit
  if(hasNrs){
    html+='<line x1="'+(VW-PAD.right)+'" y1="'+PAD.top+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#EDE8F9" stroke-width="1"/>';
    [0,5,10].forEach(function(v){
      var gy2=(VH-PAD.bottom)-(v/10)*(VH-PAD.top-PAD.bottom);
      html+='<text x="'+(VW-PAD.right+5)+'" y="'+(gy2+4).toFixed(1)+'" text-anchor="start" font-size="8" fill="#A89BDA">'+v+'</text>';
    });
  }
  // Dates X
  var shownD={};
  pts.forEach(function(p,i){ var dt=dates[i]; if(shownD[dt])return; shownD[dt]=true; html+='<text x="'+pxy(i,p.secs).x.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+dt+'</text>'; });
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  // Courbe durée
  var vp=pts.map(function(p,i){ var q=pxy(i,p.secs); return {x:q.x,y:q.y,secs:p.secs,date:dates[i]}; });
  var lp='M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
  for(var i=1;i<vp.length;i++){ var cx=(vp[i-1].x+vp[i].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1); }
  var by=VH-PAD.bottom;
  html+='<g data-line="duree">';
  html+='<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#'+gId+')"/>';
  html+='<path d="'+lp+'" fill="none" stroke="'+C+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  vp.forEach(function(p,i){
    var isFirst=i===0, isLast=i===vp.length-1;
    var lbl=_formatDuree(p.secs);
    if(isLast){
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+C+'" opacity="0.18"/>';
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+C+'"/>';
      html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+lbl+'</text>';
    } else {
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+C+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+lbl+'</text>';
    }
  });
  html+='</g>';
  // Courbe NRS (si dispo)
  if(hasNrs){
    var nvp = nrsPts.map(function(v,i){ var q=nrsPt(i,v===null?0:v); return {x:q.x,y:q.y,nrs:v,valid:v!==null}; });
    var validNvp = nvp.filter(function(p){ return p.valid; });
    if(validNvp.length >= 2){
      var nlp='M '+validNvp[0].x.toFixed(1)+','+validNvp[0].y.toFixed(1);
      for(var ni=1;ni<validNvp.length;ni++){ var ncx=(validNvp[ni-1].x+validNvp[ni].x)/2; nlp+=' C '+ncx.toFixed(1)+','+validNvp[ni-1].y.toFixed(1)+' '+ncx.toFixed(1)+','+validNvp[ni].y.toFixed(1)+' '+validNvp[ni].x.toFixed(1)+','+validNvp[ni].y.toFixed(1); }
      html+='<g data-line="nrs">';
      html+='<path d="'+nlp+' L '+validNvp[validNvp.length-1].x.toFixed(1)+','+by+' L '+validNvp[0].x.toFixed(1)+','+by+' Z" fill="url(#'+gNrsId+')" opacity="0.6"/>';
      html+='<path d="'+nlp+'" fill="none" stroke="'+CNRS+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5,3"/>';
      validNvp.forEach(function(p,ni){
        var isLast=ni===validNvp.length-1, isFirst=ni===0;
        if(isLast){
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="'+CNRS+'" opacity="0.18"/>';
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.5" fill="'+CNRS+'"/>';
          html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-10).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+CNRS+'">'+p.nrs+'/10</text>';
        } else if(isFirst){
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3" fill="#fff" stroke="'+CNRS+'" stroke-width="1.5"/>';
        }
      });
      html+='</g>';
    }
  }
  return '<svg data-pevo-id="'+svgId+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* SVG courbe cardio (axe Y en km). */
function _buildPevoCardioChart(pts, chartId) {
  if(!pts || pts.length < 2) return '';
  var vals = pts.map(function(p){ return p.km; });
  var dates = pts.map(function(p){ var d=p.date?p.date.split('-'):['','','']; return (d[2]||'?')+'/'+(d[1]||'?'); });
  var VW=500, VH=110;
  var PAD={top:18, right:22, bottom:30, left:46};
  var C = '#059669';
  var minV=Math.min.apply(null,vals), maxV=Math.max.apply(null,vals);
  var pad=Math.max(0.1,(maxV-minV)*0.15); minV=Math.max(0,minV-pad); maxV=maxV+pad;
  var rangeV=maxV-minV||1;
  var n=pts.length;
  var gId='gcardio'+String(chartId).replace(/[^a-z0-9]/gi,'');
  function pxy(i,v){ return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y:(VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom)}; }
  var html='<defs><linearGradient id="'+gId+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+C+'" stop-opacity="0.22"/>'
    +'<stop offset="100%" stop-color="'+C+'" stop-opacity="0.02"/>'
    +'</linearGradient></defs>';
  var step=Math.max(0.1,Math.ceil((maxV-minV)/4*10)/10);
  for(var gv=Math.round(minV*10)/10; gv<=maxV+step; gv=Math.round((gv+step)*100)/100){
    var gy=(VH-PAD.bottom)-((gv-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    if(gy<PAD.top||gy>VH-PAD.bottom+2) continue;
    html+='<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+gv.toFixed(1)+'</text>';
  }
  var shownD={};
  pts.forEach(function(p,i){ var dt=dates[i]; if(shownD[dt])return; shownD[dt]=true; html+='<text x="'+pxy(i,p.km).x.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+dt+'</text>'; });
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  var vp=pts.map(function(p,i){ var q=pxy(i,p.km); return {x:q.x,y:q.y,km:p.km,date:dates[i]}; });
  var lp='M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
  for(var i=1;i<vp.length;i++){ var cx=(vp[i-1].x+vp[i].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1); }
  var by=VH-PAD.bottom;
  html+='<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#'+gId+')"/>';
  html+='<path d="'+lp+'" fill="none" stroke="'+C+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  vp.forEach(function(p,i){
    var isFirst=i===0, isLast=i===vp.length-1;
    var lbl=p.km.toFixed(1)+' km';
    if(isLast){
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+C+'" opacity="0.18"/>';
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+C+'"/>';
      html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+lbl+'</text>';
    } else {
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+C+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+lbl+'</text>';
    }
  });
  return '<svg viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* SVG mini-courbe NRS pour le modal Évolution (axe Y fixe 0-10). */
function _buildPevoNrsChart(pts, chartId) {
  if(!pts || pts.length < 2) return '';
  var VW=500, VH=110;
  var PAD={top:18, right:18, bottom:30, left:34};
  var n = pts.length;
  var minV=0, maxV=10, rangeV=10;
  function pxy(i, v){ return { x: PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y: (VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom) }; }
  var C = '#7C3AED';
  var gId = 'gnrs'+chartId.replace(/[^a-z0-9]/gi,'');
  var html = '<defs><linearGradient id="'+gId+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+C+'" stop-opacity="0.2"/>'
    +'<stop offset="100%" stop-color="'+C+'" stop-opacity="0.02"/>'
    +'</linearGradient></defs>';
  // Grille Y
  [0,2,4,6,8,10].forEach(function(gv){
    var gy = pxy(0, gv).y;
    html += '<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html += '<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+gv+'</text>';
  });
  // Axe X
  var dates = pts.map(function(p){ var d=p.date?p.date.split('-'):['','','']; return (d[2]||'?')+'/'+(d[1]||'?'); });
  var shownD = {};
  pts.forEach(function(p, i){
    var date = dates[i]; if(shownD[date]) return; shownD[date]=true;
    html += '<text x="'+pxy(i, p.nrs).x.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+date+'</text>';
  });
  html += '<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  // Courbe bézier
  var vp = pts.map(function(p, i){ var q=pxy(i, p.nrs); return {x:q.x, y:q.y, nrs:p.nrs, date:dates[i]}; });
  var lp = 'M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
  for(var i=1; i<vp.length; i++){ var cx=(vp[i-1].x+vp[i].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1); }
  var by = VH-PAD.bottom;
  html += '<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#'+gId+')"/>';
  html += '<path d="'+lp+'" fill="none" stroke="'+C+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  // Points
  vp.forEach(function(p, i){
    var isFirst=i===0, isLast=i===vp.length-1;
    if(isLast){
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+C+'" opacity="0.15"/>';
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+C+'"/>';
      html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+p.nrs+'/10</text>';
    } else {
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+C+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+p.nrs+'/10</text>';
    }
  });
  return '<svg viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* Construit un SVG bezier pour l'évolution 1RM d'un exercice.
   vals  = tableau de nombres (1RM estimé)
   dates = labels JJ/MM
   meta  = [{bw:bool, reps:number, kg:number}] — pour colorer PdC vs chargé */
function _buildPevoChart(vals, dates, chartId, meta, nrsPts) {
  meta = meta || [];
  nrsPts = nrsPts || null;
  var VW=500, VH=115;
  // Determine si NRS a assez de points valides
  var nrsValidArr = nrsPts ? nrsPts.filter(function(v){ return v!==null && !isNaN(v); }) : [];
  var hasNrs = nrsValidArr.length >= 2;
  var PAD={top:18, right: hasNrs ? 38 : 22, bottom:34, left:42};
  var valid = vals.filter(function(v){ return !isNaN(v); });
  if(valid.length < 2) return '';
  var minV=Math.min.apply(null,valid), maxV=Math.max.apply(null,valid);
  var pad=Math.max(1,(maxV-minV)*0.15); minV-=pad; maxV+=pad;
  var rangeV=maxV-minV||1, n=vals.length;
  var id='pevo'+chartId;
  // Couleur principale : vert si 100% poids de corps, bleu sinon
  var allBw = meta.length && meta.every(function(m){ return m.bw; });
  var C = allBw ? '#2D6A4F' : 'var(--accent)';
  var CNRS = '#7C3AED';
  function pt(i,v){ return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y:(VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom)}; }
  function nrsPt(i,v){ return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y:(VH-PAD.bottom)-(v/10)*(VH-PAD.top-PAD.bottom)}; }
  var pts = vals.map(function(v,i){
    var p=pt(i,isNaN(v)?minV:v);
    var m=meta[i]||{};
    return {x:p.x,y:p.y,v:v,date:dates[i],valid:!isNaN(v),bw:!!m.bw,reps:m.reps,kg:m.kg};
  });
  var html = '<defs>'
    +'<linearGradient id="gpevo'+id+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+C+'" stop-opacity="0.25"/>'
    +'<stop offset="100%" stop-color="'+C+'" stop-opacity="0.02"/>'
    +'</linearGradient></defs>';
  // Grille (partagée)
  var step=Math.max(1,Math.ceil((maxV-minV)/4));
  for(var gv=Math.round(minV);gv<=maxV+step;gv+=step){
    var gy=(VH-PAD.bottom)-((gv-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    if(gy<PAD.top||gy>VH-PAD.bottom+2) continue;
    html+='<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+Math.round(gv)+'</text>';
  }
  // Dates X (partagées)
  var shownD={};
  pts.forEach(function(p){ if(shownD[p.date])return; shownD[p.date]=true; html+='<text x="'+p.x.toFixed(1)+'" y="'+(VH-PAD.bottom+13)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+p.date+'</text>'; });
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  // Axe NRS droit (si présent)
  if(hasNrs){
    html+='<line x1="'+(VW-PAD.right)+'" y1="'+PAD.top+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#EDE8F9" stroke-width="1"/>';
    [0,5,10].forEach(function(v){
      var gy=(VH-PAD.bottom)-(v/10)*(VH-PAD.top-PAD.bottom);
      html+='<text x="'+(VW-PAD.right+5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="start" font-size="8" fill="#A89BDA">'+v+'</text>';
    });
  }
  // ── Groupe Charge ──────────────────────────────────────────
  html += '<g data-line="charge">';
  var vp=pts.filter(function(p){ return p.valid; });
  if(vp.length>=2){
    var lp='M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
    for(var i=1;i<vp.length;i++){ var cx=(vp[i-1].x+vp[i].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1); }
    var by=VH-PAD.bottom;
    html+='<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#gpevo'+id+')"/>';
    html+='<path d="'+lp+'" fill="none" stroke="'+C+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  pts.forEach(function(p,i){
    if(!p.valid) return;
    var isFirst=!pts.slice(0,i).some(function(q){return q.valid;});
    var isLast=!pts.slice(i+1).some(function(q){return q.valid;});
    var val = p.bw ? (p.reps ? p.reps+'reps PdC' : p.v.toFixed(1)+'kg') : p.v.toFixed(1)+'kg';
    var pc = p.bw ? '#2D6A4F' : 'var(--accent)';
    if(isLast){
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="7" fill="'+pc+'" opacity="0.15"/>';
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+pc+'"/>';
      html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+val+'</text>';
    } else {
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?4:3.5)+'" fill="#fff" stroke="'+pc+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+val+'</text>';
      html+='<circle class="pevo-hit" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="18" fill="transparent" data-tt="tt'+id+'" data-x="'+p.x.toFixed(1)+'" data-y="'+p.y.toFixed(1)+'" data-l1="'+val+'" data-l2="'+p.date+'" style="cursor:pointer"/>';
    }
  });
  html+='<g id="tt'+id+'" visibility="hidden" style="pointer-events:none"><rect id="tt'+id+'-bg" rx="7" fill="var(--navy)" opacity="0.93" width="84" height="36"/><text id="tt'+id+'-l1" font-size="11" font-weight="700" fill="#fff" text-anchor="middle"/><text id="tt'+id+'-l2" font-size="9" fill="rgba(255,255,255,0.65)" text-anchor="middle"/></g>';
  html += '</g>';
  // ── Groupe NRS (courbe douleur) ────────────────────────────
  if(hasNrs){
    html += '<g data-line="nrs">';
    var nrsVp = [];
    nrsPts.forEach(function(v, i){
      if(v!==null && !isNaN(v)){ var q=nrsPt(i,v); nrsVp.push({x:q.x,y:q.y,v:v,date:dates[i]}); }
    });
    if(nrsVp.length>=2){
      var nlp='M '+nrsVp[0].x.toFixed(1)+','+nrsVp[0].y.toFixed(1);
      for(var ni=1;ni<nrsVp.length;ni++){ var ncx=(nrsVp[ni-1].x+nrsVp[ni].x)/2; nlp+=' C '+ncx.toFixed(1)+','+nrsVp[ni-1].y.toFixed(1)+' '+ncx.toFixed(1)+','+nrsVp[ni].y.toFixed(1)+' '+nrsVp[ni].x.toFixed(1)+','+nrsVp[ni].y.toFixed(1); }
      html+='<path d="'+nlp+'" fill="none" stroke="'+CNRS+'" stroke-width="1.8" stroke-dasharray="4,2.5" stroke-linecap="round" stroke-linejoin="round"/>';
      nrsVp.forEach(function(p,ni){
        var isLast=ni===nrsVp.length-1, isFirst=ni===0;
        if(isLast){
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+CNRS+'"/>';
          var lblY = p.y < VH/2 ? p.y+14 : p.y-10;
          html+='<text x="'+p.x.toFixed(1)+'" y="'+lblY.toFixed(1)+'" text-anchor="middle" font-size="8" font-weight="700" fill="'+CNRS+'">'+p.v+'/10</text>';
        } else {
          html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3:2.5)+'" fill="#fff" stroke="'+CNRS+'" stroke-width="1.5"/>';
        }
      });
    }
    html += '</g>';
  }
  return '<svg class="pevo-chart-svg" data-pevo-id="pevo'+chartId+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* État de sélection par patient : { patientId → Set(exoKey) } en localStorage */
function _pevoGetSel(patientId) {
  try { return new Set(JSON.parse(localStorage.getItem(R4P_KEYS.PEVO_SEL_PREFIX+patientId)||'[]')); } catch(e){ return new Set(); }
}
function _pevoSaveSel(patientId, sel) {
  try { localStorage.setItem(R4P_KEYS.PEVO_SEL_PREFIX+patientId, JSON.stringify(Array.from(sel))); } catch(e){}
}
function _pevoGetDureeSel(patId) {
  try { return new Set(JSON.parse(localStorage.getItem(R4P_KEYS.PEVO_DUREE_PREFIX+patId)||'[]')); } catch(e){ return new Set(); }
}
function _pevoSaveDureeSel(patId, sel) {
  try { localStorage.setItem(R4P_KEYS.PEVO_DUREE_PREFIX+patId, JSON.stringify(Array.from(sel))); } catch(e){}
}
function _pevoGetCardioSel(patId) {
  try { return new Set(JSON.parse(localStorage.getItem(R4P_KEYS.PEVO_CARDIO_PREFIX+patId)||'[]')); } catch(e){ return new Set(); }
}
function _pevoSaveCardioSel(patId, sel) {
  try { localStorage.setItem(R4P_KEYS.PEVO_CARDIO_PREFIX+patId, JSON.stringify(Array.from(sel))); } catch(e){}
}

var _pevoData = null;      // { exoKey → {label, points} } — données chargées
var _pevoNrsData = null;   // { exoKey → {nom, pts:[{date,nrs}]} } — données NRS
var _pevoChartCtr = 0;     // compteur unique pour IDs SVG
var _pevoDureeData = null;  // { exoKey → {label, points:[{date,secs}]} }
var _pevoCardioData = null; // { groupKey → {label, points:[{date,km}]} }

/* Attache les events tooltip sur les hit areas (même logique que bilan.html) */
var _pevoTtOpen = null;
function _attachPevoEvents() {
  if(!document._pevoDocListener){
    document._pevoDocListener = true;
    document.addEventListener('pointerdown', function(){ _closePevoTt(); });
  }
  var body = document.getElementById('pevoBody');
  if(!body) return;
  body.querySelectorAll('.pevo-hit').forEach(function(el){
    var svgEl = el.closest('svg'), ttId = el.dataset.tt;
    var show = function(){
      var g=svgEl.getElementById(ttId); if(!g) return;
      var bg=svgEl.getElementById(ttId+'-bg'), t1=svgEl.getElementById(ttId+'-l1'), t2=svgEl.getElementById(ttId+'-l2');
      var W=84,H=36,VW2=500, x=parseFloat(el.dataset.x), y=parseFloat(el.dataset.y);
      var tx=Math.max(2,Math.min(x-W/2,VW2-W-2)), ty=y-H-12; if(ty<2) ty=y+14;
      bg.setAttribute('x',tx); bg.setAttribute('y',ty);
      t1.setAttribute('x',tx+W/2); t1.setAttribute('y',ty+15); t1.textContent=el.dataset.l1;
      t2.setAttribute('x',tx+W/2); t2.setAttribute('y',ty+29); t2.textContent=el.dataset.l2;
      g.setAttribute('visibility','visible');
      _pevoTtOpen = {svgEl:svgEl, ttId:ttId};
    };
    el.addEventListener('pointerenter', function(e){ if(e.pointerType==='mouse') show(); });
    el.addEventListener('pointerleave', function(e){ if(e.pointerType==='mouse') _closePevoTt(); });
    el.addEventListener('pointerdown', function(e){
      e.stopPropagation();
      if(_pevoTtOpen && _pevoTtOpen.ttId===ttId){ _closePevoTt(); } else { _closePevoTt(); show(); }
    });
  });
}
function _closePevoTt(){
  if(_pevoTtOpen){ var g=_pevoTtOpen.svgEl.getElementById(_pevoTtOpen.ttId); if(g) g.setAttribute('visibility','hidden'); _pevoTtOpen=null; }
}

function _renderPevoCharts(exoData, selectedKeys) {
  var body = document.getElementById('pevoBody');
  if(!body) return;
  var allKeys = Object.keys(exoData);
  var dureeKeys = _pevoDureeData ? Object.keys(_pevoDureeData) : [];
  var cardioKeys = _pevoCardioData ? Object.keys(_pevoCardioData) : [];
  if(!allKeys.length && !dureeKeys.length && !cardioKeys.length){
    body.innerHTML = '<div class="pevo-empty">Aucun exercice avec répétitions, durée ou cardio prescrit sur plusieurs séances.</div>';
    return;
  }
  var patId = _progPatient ? _progPatient.id : 'local';
  // Pills de sélection
  var pillsHtml = allKeys.map(function(key){
    var active = selectedKeys.has(key);
    return '<label class="pevo-pill'+(active?' active':'')+'">'
      +'<input type="checkbox" '+(active?'checked':'')+' onchange="_pevoToggle(\''+key+'\')">'
      +escH(exoData[key].label)
      +'</label>';
  }).join('');
  var chartsHtml = '';
  _pevoChartCtr = 0;
  allKeys.forEach(function(key){
    if(!selectedKeys.has(key)) return;
    _pevoChartCtr++;
    var grp = exoData[key];
    var pts = grp.points;
    var vals  = pts.map(function(p){ return p.rm1; });
    var dates = pts.map(function(p){ var d=p.date?p.date.split('-'):['','','']; return (d[2]||'?')+'/'+(d[1]||'?'); });
    var meta  = pts.map(function(p){ return {bw:p.bw, reps:p.reps, kg:p.kg}; });
    var first = pts[0].rm1, last = pts[pts.length-1].rm1;
    var delta = last - first, sign = delta>=0?'+':'';
    var pct = first>0 ? (delta/first*100) : null;
    var pctStr = pct!==null?' ('+(Math.abs(pct)>999?(pct>0?'>':'<')+' 999%':(pct>=0?'+':'')+pct.toFixed(0)+'%')+')':'';
    var cls = delta===0?'neutral':(delta>0?'pos':'neg');
    // Labels KPI : afficher reps si PdC, kg si chargé
    var fLabel = pts[0].bw   ? pts[0].reps+'reps PdC'                  : first.toFixed(1)+'kg';
    var lLabel = pts[pts.length-1].bw ? pts[pts.length-1].reps+'reps PdC' : last.toFixed(1)+'kg';
    var dLabel = sign+delta.toFixed(1)+'kg'+pctStr;
    // Aligner les pts NRS sur les pts de charge (même timeline)
    var nrsPts = null, hasNrsData = false;
    if(_pevoNrsData && _pevoNrsData[key]) {
      var nrsMap = {};
      _pevoNrsData[key].pts.forEach(function(p){ nrsMap[p.date] = p.nrs; });
      nrsPts = pts.map(function(p){ return (nrsMap[p.date] !== undefined && nrsMap[p.date] !== null) ? nrsMap[p.date] : null; });
      hasNrsData = nrsPts.filter(function(v){ return v !== null; }).length >= 2;
    }
    var svg = _buildPevoChart(vals, dates, _pevoChartCtr, meta, nrsPts);
    if(!svg) return;
    // Pills toggle charge / douleur (si NRS disponible)
    var allBwMeta = meta.length && meta.every(function(m){ return m.bw; });
    var chargeColor = allBwMeta ? '#2D6A4F' : 'var(--accent)';
    var pillToggleHtml = '';
    if(hasNrsData) {
      var _ctr = _pevoChartCtr;
      pillToggleHtml = '<div class="pevo-pill-toggles">'
        +'<button class="pevo-line-pill active" style="color:'+chargeColor+';border-color:'+chargeColor+'" onclick="togglePevoPill(this,\'pevo'+_ctr+'\',\'charge\')">● Charge</button>'
        +'<button class="pevo-line-pill active" style="color:#7C3AED;border-color:#7C3AED" onclick="togglePevoPill(this,\'pevo'+_ctr+'\',\'nrs\')">● Douleur</button>'
        +'</div>';
    }
    chartsHtml += '<div class="pevo-card">'
      +'<div class="pevo-card-header">'
      +'<span class="pevo-card-title">'+escH(grp.label)+'</span>'
      +'<div class="pevo-card-kpis">'
      +'<span class="pevo-kpi-neutral">Début : '+fLabel+'</span>'
      +'<span class="pevo-kpi-neutral">→</span>'
      +'<span class="pevo-kpi-strong">Actuel : '+lLabel+'</span>'
      +'<span class="pevo-kpi '+cls+'">'+dLabel+'</span>'
      +'</div></div>'
      +pillToggleHtml
      +svg+'</div>';
  });

  // ── Section durée ─────────────────────────────────────────────────────
  var dureeSectionHtml = '';
  if(dureeKeys.length) {
    var patId2 = _progPatient ? _progPatient.id : 'local';
    var dureeSel = _pevoGetDureeSel(patId2);
    var dureePillsHtml = dureeKeys.map(function(key){
      var active = dureeSel.has(key);
      return '<label class="pevo-pill'+(active?' active':'')+'">'
        +'<input type="checkbox" '+(active?'checked':'')+' onchange="_pevoToggleDuree(\''+key+'\')">'
        +escH(_pevoDureeData[key].label)+'</label>';
    }).join('');
    var dureeChartsHtml = '';
    dureeKeys.forEach(function(key){
      if(!dureeSel.has(key)) return;
      _pevoChartCtr++;
      var grp = _pevoDureeData[key];
      var pts = grp.points;
      var first = pts[0].secs, last = pts[pts.length-1].secs;
      var delta = last - first, sign = delta>=0?'+':'';
      var cls = delta===0?'neutral':(delta>0?'pos':'neg');
      // Chercher les NRS pour cet exercice (clé sans suffixe __duree)
      var exoKeyNrs = key.replace(/__duree$/, '');
      var nrsPts = null, hasNrsData = false;
      if(_pevoNrsData && _pevoNrsData[exoKeyNrs]) {
        var nrsMap = {};
        _pevoNrsData[exoKeyNrs].pts.forEach(function(p){ nrsMap[p.date] = p.nrs; });
        nrsPts = pts.map(function(p){ return (nrsMap[p.date] !== undefined && nrsMap[p.date] !== null) ? nrsMap[p.date] : null; });
        hasNrsData = nrsPts.filter(function(v){ return v !== null; }).length >= 2;
      }
      var svg = _buildPevoDureeChart(pts, _pevoChartCtr, nrsPts);
      if(!svg) return;
      // Pills toggle durée / douleur
      var dureeToggleHtml = '';
      if(hasNrsData) {
        var _dctr = _pevoChartCtr;
        dureeToggleHtml = '<div class="pevo-pill-toggles">'
          +'<button class="pevo-line-pill active" style="color:#D97706;border-color:#D97706" onclick="togglePevoPill(this,\'pevo'+_dctr+'\',\'duree\')">● Durée</button>'
          +'<button class="pevo-line-pill active" style="color:#7C3AED;border-color:#7C3AED" onclick="togglePevoPill(this,\'pevo'+_dctr+'\',\'nrs\')">● Douleur</button>'
          +'</div>';
      }
      dureeChartsHtml += '<div class="pevo-card">'
        +'<div class="pevo-card-header">'
        +'<span class="pevo-card-title">'+escH(grp.label)+'</span>'
        +'<div class="pevo-card-kpis">'
        +'<span class="pevo-kpi-neutral">Début : '+_formatDuree(first)+'</span>'
        +'<span class="pevo-kpi-neutral">→</span>'
        +'<span class="pevo-kpi-strong">Actuel : '+_formatDuree(last)+'</span>'
        +'<span class="pevo-kpi '+cls+'">'+(sign)+_formatDuree(Math.abs(delta))+'</span>'
        +'</div></div>'
        +dureeToggleHtml
        +svg+'</div>';
    });
    dureeSectionHtml = '<div class="pevo-select-section">'
      +'<div class="pevo-select-title" style="color:#D97706">⏱ Durée des exercices ('+dureeKeys.length+')</div>'
      +'<div class="pevo-selall-row">'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAllDuree(true)">✓ Tout</button>'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAllDuree(false)">✗ Aucun</button>'
      +'</div>'
      +'<div class="pevo-exo-pills">'+dureePillsHtml+'</div>'
      +'</div>'
      +(dureeChartsHtml ? '<div class="pevo-charts">'+dureeChartsHtml+'</div>' : '');
  }

  // ── Section cardio ─────────────────────────────────────────────────────
  var cardioSectionHtml = '';
  if(cardioKeys.length) {
    var patId3 = _progPatient ? _progPatient.id : 'local';
    var cardioSel = _pevoGetCardioSel(patId3);
    var cardioPillsHtml = cardioKeys.map(function(key){
      var active = cardioSel.has(key);
      return '<label class="pevo-pill'+(active?' active':'')+'">'
        +'<input type="checkbox" '+(active?'checked':'')+' onchange="_pevoToggleCardio(\''+key+'\')">'
        +escH(_pevoCardioData[key].label)+'</label>';
    }).join('');
    var cardioChartsHtml = '';
    cardioKeys.forEach(function(key){
      if(!cardioSel.has(key)) return;
      _pevoChartCtr++;
      var grp = _pevoCardioData[key];
      var pts = grp.points;
      var first = pts[0].km, last = pts[pts.length-1].km;
      var delta = last - first, sign = delta>=0?'+':'';
      var cls = delta===0?'neutral':(delta>0?'pos':'neg');
      var svg = _buildPevoCardioChart(pts, _pevoChartCtr);
      if(!svg) return;
      cardioChartsHtml += '<div class="pevo-card">'
        +'<div class="pevo-card-header">'
        +'<span class="pevo-card-title">'+escH(grp.label)+'</span>'
        +'<div class="pevo-card-kpis">'
        +'<span class="pevo-kpi-neutral">Début : '+first.toFixed(1)+' km</span>'
        +'<span class="pevo-kpi-neutral">→</span>'
        +'<span class="pevo-kpi-strong">Actuel : '+last.toFixed(1)+' km</span>'
        +'<span class="pevo-kpi '+cls+'">'+(sign)+delta.toFixed(1)+' km</span>'
        +'</div></div>'
        +svg+'</div>';
    });
    cardioSectionHtml = '<div class="pevo-select-section">'
      +'<div class="pevo-select-title" style="color:#059669">🏃 Charges cardio ('+cardioKeys.length+')</div>'
      +'<div class="pevo-selall-row">'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAllCardio(true)">✓ Tout</button>'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAllCardio(false)">✗ Aucun</button>'
      +'</div>'
      +'<div class="pevo-exo-pills">'+cardioPillsHtml+'</div>'
      +'</div>'
      +(cardioChartsHtml ? '<div class="pevo-charts">'+cardioChartsHtml+'</div>' : '');
  }

  var rmSection = '';
  if(allKeys.length) {
    rmSection = '<div class="pevo-select-section">'
      +'<div class="pevo-select-title">Exercices disponibles ('+allKeys.length+')</div>'
      +'<div class="pevo-selall-row">'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAll(true)">✓ Tout sélectionner</button>'
      +'<button class="pevo-selall-btn" onclick="_pevoSelectAll(false)">✗ Tout désélectionner</button>'
      +'</div>'
      +'<div class="pevo-exo-pills" id="pevoPills">'+pillsHtml+'</div>'
      +'</div>'
      +(chartsHtml ? '<div class="pevo-charts" id="pevoChartsGrid">'+chartsHtml+'</div>'
                   : '<div class="pevo-empty">Cochez un exercice ci-dessus pour afficher sa courbe.</div>');
  }

  var sep = '<div style="height:32px"></div>';
  var parts = [rmSection, dureeSectionHtml, cardioSectionHtml].filter(function(s){ return !!s; });
  body.innerHTML = parts.join(sep);
  _attachPevoEvents();
}

function togglePevoPill(btn, svgId, line) {
  btn.classList.toggle('active');
  var show = btn.classList.contains('active');
  var svg = document.querySelector('svg[data-pevo-id="'+svgId+'"]');
  if(!svg) return;
  svg.querySelectorAll('[data-line="'+line+'"]').forEach(function(el){
    el.style.display = show ? '' : 'none';
  });
}

function _pevoToggle(key) {
  if(!_pevoData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = _pevoGetSel(patId);
  if(sel.has(key)) sel.delete(key); else sel.add(key);
  _pevoSaveSel(patId, sel);
  _renderPevoCharts(_pevoData, sel);
}

function _pevoSelectAll(state) {
  if(!_pevoData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = state ? new Set(Object.keys(_pevoData)) : new Set();
  _pevoSaveSel(patId, sel);
  _renderPevoCharts(_pevoData, sel);
}

function _pevoToggleDuree(key) {
  if(!_pevoDureeData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = _pevoGetDureeSel(patId);
  if(sel.has(key)) sel.delete(key); else sel.add(key);
  _pevoSaveDureeSel(patId, sel);
  _renderPevoCharts(_pevoData, _pevoGetSel(patId));
}
function _pevoSelectAllDuree(state) {
  if(!_pevoDureeData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = state ? new Set(Object.keys(_pevoDureeData)) : new Set();
  _pevoSaveDureeSel(patId, sel);
  _renderPevoCharts(_pevoData, _pevoGetSel(patId));
}
function _pevoToggleCardio(key) {
  if(!_pevoCardioData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = _pevoGetCardioSel(patId);
  if(sel.has(key)) sel.delete(key); else sel.add(key);
  _pevoSaveCardioSel(patId, sel);
  _renderPevoCharts(_pevoData, _pevoGetSel(patId));
}
function _pevoSelectAllCardio(state) {
  if(!_pevoCardioData || !_progPatient) return;
  var patId = _progPatient.id;
  var sel = state ? new Set(Object.keys(_pevoCardioData)) : new Set();
  _pevoSaveCardioSel(patId, sel);
  _renderPevoCharts(_pevoData, _pevoGetSel(patId));
}

function _buildPevoExportHTML(){
  if(!_pevoData || !_progPatient) return null;
  // Récupérer le grid des charts (hors pills de sélection)
  var grid = document.getElementById('pevoChartsGrid');
  if(!grid){ return null; }
  var clone = grid.cloneNode(true);
  // Retirer les hit areas tooltip (interactif uniquement)
  clone.querySelectorAll('.pevo-hit').forEach(function(el){ el.remove(); });
  var contentHTML = clone.outerHTML;

  // Infos patient et praticien
  var patNom = ((_progPatient.prenom||'')+' '+(_progPatient.nom||'')).trim();
  var initials = (((_progPatient.prenom||'')[0]||'')+((_progPatient.nom||'')[0]||'')).toUpperCase()||'?';
  var date = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  var prof = getProfile();
  var praticienNom = ((prof.prenom||'')+' '+(prof.nom||'')).trim() || 'Praticien';
  var cabinet = prof.cabinet || '';
  var am = prof.am || '';
  var tel = prof.tel || '';
  var email = prof.email || '';
  var metaSub = [am?'N° AM : '+am:'', tel, email].filter(Boolean).join(' · ');
  var metaParts = [];
  if(praticienNom) metaParts.push('<strong>'+(praticienNom+(cabinet?' — '+cabinet:''))+'</strong>');
  if(metaSub) metaParts.push(metaSub);
  var praticienMetaHTML = metaParts.join('<br>');


  var css = ':root{--accent:#2B5FA6;--accent-l:#EEF3FB;--navy:#1A3A5C;--text:#1A1917;--muted:#6B6860;--border:#E8E6E1;--surface:#fff;--bg:#F0F4F8}'
    +'*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'html{font-size:14px}body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:#F0F4F8;color:#1A1917}'
    +'.page-wrap{max-width:860px;margin:0 auto;padding:0 0 48px}'
    +'.doc-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 24px;background:var(--navy)}'
    +'.doc-logo{font-family:Georgia,serif;font-style:italic;font-size:1.1rem;color:#fff}'
    +'.doc-logo .r{color:var(--accent2)}.doc-logo .n{font-weight:900;font-style:normal}.doc-logo .p{color:var(--red)}'
    +'.doc-meta{text-align:right;font-size:.72rem;color:rgba(255,255,255,.8);line-height:1.8}'
    +'.doc-meta strong{font-size:.82rem;color:#fff;display:block}'
    +'.patient-card{background:#fff;padding:20px 24px;border-bottom:1px solid #DDE3EC;display:flex;align-items:center;gap:18px}'
    +'.patient-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--navy));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0}'
    +'.patient-name{font-size:1.1rem;font-weight:700;color:var(--navy);margin-bottom:3px}'
    +'.summary-bar{background:#EEF3FB;padding:10px 24px;border-bottom:1px solid #D3D9F0;font-size:.82rem;color:var(--navy)}'
    +'.doc-body{padding:20px 24px 0}'
    +'.pevo-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px}'
    +'@media(max-width:600px){.pevo-charts{grid-template-columns:1fr}}'
    +'.pevo-card{background:#fff;border:1px solid #E8E6E1;border-radius:10px;padding:14px 16px 10px}'
    +'.pevo-card-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px}'
    +'.pevo-card-title{font-size:.82rem;font-weight:700;color:#1A1917}'
    +'.pevo-card-kpis{display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
    +'.pevo-kpi-neutral{font-size:.72rem;color:#6B6860}'
    +'.pevo-kpi-strong{font-size:.72rem;font-weight:700;color:var(--navy)}'
    +'.pevo-kpi{font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:10px}'
    +'.pos{background:#E8F5EE;color:#2D6A4F}.neg{background:#FDECEA;color:#C0392B}.neutral{background:#F1F0ED;color:#6B6860}'
    +'@media print{.print-btn-wrap{display:none!important}.doc-header{background:var(--navy)!important}.pevo-card{break-inside:avoid}}';

  var html = '<!DOCTYPE html><html lang="fr"><head>'
    +'<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    +'<title>Évolution des charges — '+patNom+'</title>'
    +'<style>'+css+'</style></head><body><div class="page-wrap">'
    +'<div class="doc-header"><div class="doc-logo"><span class="r">Rehab</span><span class="n">4</span><span class="p">Perf</span></div>'
    +'<div class="doc-meta">'+praticienMetaHTML+'</div></div>'
    +'<div class="patient-card"><div class="patient-avatar">'+initials+'</div>'
    +'<div><div class="patient-name">'+patNom+'</div></div></div>'
    +'<div class="summary-bar">📊 Évolution des charges prescrites · Export généré le '+date+'</div>'
    +'<div class="doc-body"><br>'+contentHTML+'</div>'
    +'</div></body></html>';

  return { html: html, patient: patNom, date: date };
}

function exportPevoHTML(){
  var r = _buildPevoExportHTML();
  if(!r){ alert('Aucun graphique à exporter. Sélectionnez au moins un exercice.'); return; }
  var blob = new Blob([r.html], {type:'text/html;charset=utf-8'});
  var blobUrl = URL.createObjectURL(blob);
  var filename = 'Evolution_charges'+(r.patient?'_'+r.patient.replace(/\s+/g,'_'):'')+'.html';
  var a = document.createElement('a');
  a.href = blobUrl; a.download = filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 300);
}

function printPevoHTML(){
  var r = _buildPevoExportHTML();
  if(!r){ alert('Aucun graphique à imprimer. Sélectionnez au moins un exercice.'); return; }
  var printHtml = r.html.replace('</body>',
    '<script>window.onload=function(){window.focus();setTimeout(function(){window.print();},400);}<\/script></body>');
  var win = window.open('','_blank');
  if(!win){ alert('Autorisez les pop-ups pour imprimer.'); return; }
  win.document.open(); win.document.write(printHtml); win.document.close();
}

function openChargesEvo() {
  if(!_progPatient){ alert('Sélectionnez un patient d\'abord.'); return; }
  var overlay = document.getElementById('pevoOverlay');
  overlay.classList.add('open');
  var body = document.getElementById('pevoBody');
  body.innerHTML = '<div class="pevo-loading">Chargement des séances…</div>';
  _pevoData = null; _pevoDureeData = null; _pevoCardioData = null;
  // Charger toutes les séances du patient avec les données du programme lié
  var url = SUPA_URL_P + '/rest/v1/seances_planifiees?patient_id=eq.' + _progPatient.id
    + '&select=id,date,programme_id,programmes(nom,donnees)&order=date.asc';
  _fetchRetry(url, {method:'GET', headers:_sbHeaders()})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data) || !data.length){
        body.innerHTML = '<div class="pevo-empty">Aucune séance planifiée pour ce patient.</div>';
        return;
      }
      _pevoData = _extractExoLoads(data);
      _pevoNrsData = _extractExoNRS(data);
      _pevoDureeData = _extractExoDurations(data);
      _pevoCardioData = _extractCardioLoads(data);
      var sel = _pevoGetSel(_progPatient.id);
      _renderPevoCharts(_pevoData, sel);
    })
    .catch(function(err){ body.innerHTML = '<div class="pevo-empty">Erreur réseau : '+(err&&err.message||err)+'</div>'; });
}

function closeChargesEvo() {
  document.getElementById('pevoOverlay').classList.remove('open');
}

function _loadProg(id, seanceId){
  _currentSeanceId = seanceId || null; // null si chargé depuis l'historique ou la bibliothèque
  var url = SUPA_URL_P + '/rest/v1/programmes?id=eq.' + id + '&select=*';
  _fetchRetry(url, {method:'GET', headers:_sbHeaders()})
    .then(function(r){ return r.json(); })
    .then(function(data){
      var d = Array.isArray(data) ? data[0] : data;
      if(!d || d.code){ alert('Erreur lors du chargement.'); return; }
      _currentProgId = d.id;
      // Rétrocompat : donnees peut être un tableau (ancien) ou {blocs,notes} (nouveau)
      var raw = d.donnees || [];
      if(Array.isArray(raw)){ blocs = raw; _notes = ''; _builderLinkedPhase = null; }
      else { blocs = raw.blocs || []; _notes = raw.notes || ''; _builderLinkedPhase = raw.linkedPhase || null; }
      var pnEl = document.getElementById('patientName');
      if(pnEl) pnEl.value = d.nom || '';
      renderSession();
      _enterBuilderMode();
      var overlay = document.getElementById('progHistoOverlay');
      if(overlay) overlay.style.display='none';
      var btn = document.getElementById('prog-cloud-save-btn');
      if(btn){ btn.textContent='✓ Programme chargé'; setTimeout(function(){ _refreshSaveBtn(); },2500); }
    })
    .catch(function(){ alert('Erreur réseau lors du chargement.'); });
}

// Ouvrir un programme du calendrier dans le builder (clic sur chip)
function _openChipInBuilder(progId, dateStr, seanceId){
  if(_calDragJustEnded || _calDrag) return; // pas d'ouverture en fin de drag
  _hideLibPreview();
  _builderDate = dateStr;
  _updateBuilderTitle();
  _loadProg(progId, seanceId); // transmet l'ID de séance pour la détection de partage
}

function _deleteProg(id, nom){
  if(!confirm('Supprimer le programme "' + nom + '" ?\nCette action est irréversible.')) return;
  _fetchRetry(SUPA_URL_P + '/rest/v1/programmes?id=eq.' + id, {method:'DELETE', headers:_sbHeaders()})
    .then(function(r){
      if(!r.ok){ return r.json().then(function(d){ alert('Erreur : ' + JSON.stringify(d)); }); }
      // Si le programme supprimé était l'actif, réinitialiser
      if(_currentProgId === id){
        _currentProgId = null;
        blocs = [];
        renderSession();
        var btn = document.getElementById('prog-cloud-save-btn');
        if(btn){ btn.textContent='☁️ Sauvegarder'; }
      }
      // Rafraîchir la liste
      openProgHistory();
    })
    .catch(function(err){ alert('Erreur réseau : ' + (err&&err.message||err)); });
}

function _newProgVierge(){
  if(!confirm('Créer un nouveau programme vierge ? (le programme actuel non sauvegardé sera perdu)')) return;
  _currentProgId = null;
  blocs = [];
  renderSession();
  var overlay = document.getElementById('progHistoOverlay');
  if(overlay) overlay.style.display='none';
}

// Doit être défini avant renderLib() (utilisé dans renderLib pour hover/touch)
var _isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
renderLib('');

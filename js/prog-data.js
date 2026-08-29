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
  FAV_EXOS_SID         : 'r4p-fav-exos-sid',
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
  {id:'r001',name:"Rowing bilatéral (banc + haltères)",zone:"ÉPAULE, COUDE",type:"renfo",url:"https://youtu.be/k7wxFOPed_U",obj:"",patterns:["Tirage horizontal"]},
  {id:'r002',name:"Rowing (barre libre)",zone:"ÉPAULE, COUDE",type:"renfo",url:"https://youtu.be/X7rimaqBMqU",obj:"",patterns:["Tirage horizontal"]},
  {id:'r003',name:"Tractions pronation",zone:"ÉPAULE, COUDE",type:"renfo",url:"https://youtu.be/HbkyJKMFqmM",obj:"",patterns:["Tirage vertical"]},
  {id:'r004',name:"Dips",zone:"ÉPAULE, COUDE",type:"renfo",url:"https://youtu.be/UceGdIvZOM4",obj:"",patterns:["Poussé vertical"]},
  {id:'r005',name:"Rotation + strict press",zone:"ÉPAULE, RACHIS – THORACIQUE",type:"renfo",url:"https://youtu.be/0pF7uWSFINg",obj:"EXTENSION, ROT G, ROT D",patterns:["Poussé vertical"]},
  {id:'r006',name:"Y sur banc",zone:"ÉPAULE",type:"renfo",url:"https://youtu.be/EbJCxOqICGM",obj:"FLEXION",patterns:[]},
  {id:'r007',name:"RE iso (bande élastique)",zone:"ÉPAULE",type:"renfo",url:"https://youtu.be/F4qScguZBNg",obj:"",patterns:[]},
  {id:'r008',name:"Full can",zone:"ÉPAULE",type:"renfo",url:"https://youtu.be/MW6N5yLYduA",obj:"",patterns:[]},
  {id:'r009',name:"Perfect shrug",zone:"ÉPAULE",type:"renfo",url:"https://youtu.be/EDN6ELI2Q8s",obj:"",patterns:[]},
  /* RENFO : HANCHE / GENOUX */
  {id:'r010',name:"Back squat",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/nd08ytRkRno",obj:"",patterns:["Triple flexion"]},
  {id:'r011',name:"Front squat",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/d8ulCpd7d9M",obj:"",patterns:["Triple flexion"]},
  {id:'r012',name:"Pistol squat box",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/FIu5-Oa9ZpQ",obj:"",patterns:["Triple flexion"]},
  {id:'r013',name:"Deadlift",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/ZwcwxKYMGqk",obj:"",patterns:["Hinge"]},
  {id:'r014',name:"Romanian deadlift",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/Iu-CCUSX_Ao",obj:"",patterns:["Hinge"]},
  {id:'r015',name:"Hip thrust",zone:"HANCHE",type:"renfo",url:"https://youtu.be/BDj2fjfhOFo",obj:"",patterns:["Hinge"]},
  {id:'r016',name:"Glute bridge swissball",zone:"HANCHE",type:"renfo",url:"https://youtu.be/p_rx7_qvOK4",obj:"",patterns:["Hinge"]},
  {id:'r017',name:"Glute bridge walk",zone:"HANCHE",type:"renfo",url:"https://youtu.be/gFOvhVOxEuk",obj:"",patterns:["Hinge"]},
  {id:'r018',name:"Cossack squat (avec variations)",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/fZptiFPFgE4",obj:"",patterns:["Triple flexion"]},
  {id:'r019',name:"Front lunge",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/rFdUl5EGU3k",obj:"",patterns:["Triple flexion"]},
  {id:'r020',name:"Reverse lunge (step)",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/bz5VD2QrnCE",obj:"",patterns:["Triple flexion"]},
  {id:'r021',name:"Reverse lunge (cale pied)",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/S3FhvMiKNSI",obj:"",patterns:["Triple flexion"]},
  {id:'r022',name:"Bulgarian lunge",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/WnRo668nU5k",obj:"",patterns:["Triple flexion"]},
  {id:'r023',name:"Pistol lunge",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/dkinMBYBSKQ",obj:"",patterns:["Triple flexion"]},
  {id:'r024',name:"Bulgarian lunge (focus droit fémoral jambe arrière)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/r-2608D5xFo",obj:"",patterns:["Triple flexion"]},
  {id:'r025',name:"Lunge excentrique",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/rMcqmH3BgWU",obj:"",patterns:["Triple flexion"]},
  {id:'r026',name:"Banded jump lunge (anti valgus)",zone:"GENOU",type:"renfo",url:"https://youtu.be/qRVlaEkxZKs",obj:"",patterns:["Triple flexion"]},
  {id:'r027',name:"Copenhaguen plank (CE + flexion de hanche)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/tmERKqq-Foo",obj:"",patterns:[]},
  {id:'r028',name:"Star plank",zone:"HANCHE",type:"renfo",url:"https://youtu.be/d8ulCpd7d9M",obj:"",patterns:[]},
  {id:'r029',name:"Star plank (genoux)",zone:"HANCHE",type:"renfo",url:"https://youtu.be/HCg8SOSoS4E",obj:"",patterns:[]},
  {id:'r030',name:"ABD hanche mini bande",zone:"HANCHE",type:"renfo",url:"https://youtu.be/QfdySRI7aNQ",obj:"",patterns:[]},
  {id:'r031',name:"Single leg Romanian deadlift (anti valgus)",zone:"HANCHE, GENOU",type:"renfo",url:"https://youtu.be/URkycEURDPw",obj:"",patterns:["Hinge"]},
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
// Exercices personnels (table user_exercises, RLS : chacun ne voit/écrit que les siens).
// Jamais mélangés à _editorData/_editorOriginalIds (l'éditeur bibliothèque, admin only,
// ne doit jamais pouvoir toucher — même par accident via la sync PATCH/DELETE — les
// exercices privés d'un praticien) ; toujours ajoutés à LIBRARY en tout dernier, pour
// l'affichage de la sidebar uniquement.
var _userExercises = [];
function _loadUserExercises(){
  if(!_progToken || !_progUid) return Promise.resolve([]);
  return _fetchRetry(SUPA_URL_P+'/rest/v1/user_exercises?praticien_id=eq.'+_progUid+'&order=created_at.asc', { headers: _sbHeaders() })
    .then(function(r){ return r.ok ? r.json() : []; })
    .then(function(data){
      _userExercises = Array.isArray(data) ? data.map(function(e){
        return { id:'u_'+e.id, _dbId:e.id, name:e.name, zone:e.zone||'', type:e.type||'',
                 url:e.url||'', obj:e.obj||'', patterns:Array.isArray(e.patterns)?e.patterns:[],
                 _isPrivate:true };
      }) : [];
      return _userExercises;
    })
    .catch(function(){ _userExercises = []; return []; });
}

/* Modale légère « Ajouter mon exercice » — ouverte à tous les praticiens (pas seulement
   admin), contrairement à « Éditer la bibliothèque ». N'écrit que dans user_exercises,
   jamais dans exercices_library : impossible d'affecter la bibliothèque commune. */
function openMyExoModal(){
  var modal = document.getElementById('myExoModal'); if(!modal) return;
  document.getElementById('myExoName').value = '';
  document.getElementById('myExoUrl').value = '';
  document.getElementById('myExoType').value = '';
  _populateMyExoZone();
  modal.classList.add('open');
  document.getElementById('myExoName').focus();
}
function closeMyExoModal(){
  var modal = document.getElementById('myExoModal'); if(modal) modal.classList.remove('open');
}
function _populateMyExoZone(){
  var sel = document.getElementById('myExoZone'); if(!sel) return;
  var cur = sel.value;
  sel.innerHTML = '<option value="">— Zone / Articulation —</option>' + ALL_ZONES.map(function(z){
    return '<option value="'+escH(z)+'"'+(z===cur?' selected':'')+'>'+escH(z)+'</option>';
  }).join('');
}
function saveMyExo(){
  var name = document.getElementById('myExoName').value.trim();
  if(!name){ document.getElementById('myExoName').focus(); return; }
  if(!_progToken || !_progUid){ _showToast('⚠️ Session expirée — reconnectez-vous'); return; }
  var payload = {
    praticien_id: _progUid,
    name: name,
    zone: document.getElementById('myExoZone').value || null,
    type: document.getElementById('myExoType').value || null,
    url:  document.getElementById('myExoUrl').value.trim() || null
  };
  var btn = document.getElementById('myExoSaveBtn');
  if(btn) btn.disabled = true;
  _fetchRetry(SUPA_URL_P+'/rest/v1/user_exercises', {
    method:'POST',
    headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=representation'}),
    body: JSON.stringify(payload)
  })
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(rows){
    if(btn) btn.disabled = false;
    var row = Array.isArray(rows) ? rows[0] : null;
    if(!row){ _showToast('⚠️ Échec de l\'ajout — réessayez'); return; }
    _userExercises.push({ id:'u_'+row.id, _dbId:row.id, name:row.name, zone:row.zone||'',
      type:row.type||'', url:row.url||'', obj:row.obj||'', patterns:[], _isPrivate:true });
    LIBRARY = LIBRARY.concat([_userExercises[_userExercises.length-1]]);
    closeMyExoModal();
    filterLib();
    _showToast('✓ Exercice ajouté — visible uniquement par vous');
  })
  .catch(function(){ if(btn) btn.disabled = false; _showToast('⚠️ Échec de l\'ajout — réessayez'); });
}
function deleteUserExercise(id){
  var ex = _userExercises.find(function(e){ return e.id === id; });
  if(!ex) return;
  if(!confirm('Supprimer « '+ex.name+' » ? Il ne sera plus disponible pour aucune de vos séances.')) return;
  _fetchRetry(SUPA_URL_P+'/rest/v1/user_exercises?id=eq.'+ex._dbId, { method:'DELETE', headers: _sbHeaders() })
  .then(function(r){
    if(!r.ok) { _showToast('⚠️ Échec de la suppression'); return; }
    _userExercises = _userExercises.filter(function(e){ return e.id !== id; });
    LIBRARY = LIBRARY.filter(function(e){ return e.id !== id; });
    filterLib();
  })
  .catch(function(){ _showToast('⚠️ Échec de la suppression'); });
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
  _saveFavsToSupabase();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

/* ── Sync favoris Supabase (union multi-device) ── */
var _favExoSupaId = null;

function _saveFavsToSupabase(){
  if(!_progToken || !_progUid) return;
  var favs = getFavs();
  var donnees = JSON.stringify({ favs: Array.from(favs) });
  var body = JSON.stringify({ praticien_id: _progUid, nom: '__r4p_favs_meta__', type: '__meta__', is_public: true, donnees: donnees });
  if(_favExoSupaId){
    _fetchRetry(SUPA_URL_P+'/rest/v1/templates?id=eq.'+_favExoSupaId, {
      method:'PATCH', headers: Object.assign({}, _sbHeaders(), {'Content-Type':'application/json'}), body: body
    });
  } else {
    _fetchRetry(SUPA_URL_P+'/rest/v1/templates', {
      method:'POST', headers: Object.assign({}, _sbHeaders(), {'Content-Type':'application/json','Prefer':'return=representation'}), body: body
    }).then(function(r){ return r.ok ? r.json() : null; })
    .then(function(rows){
      if(rows && rows.length){
        _favExoSupaId = rows[0].id;
        try{ localStorage.setItem(R4P_KEYS.FAV_EXOS_SID, String(rows[0].id)); }catch(e){}
      }
    });
  }
}

function _fetchFavsFromSupabase(callback){
  if(!_progToken || !_progUid){ callback && callback(); return; }
  /* Récupère TOUS les records (pas limit=1) pour gérer les doublons inter-devices */
  _fetchRetry(SUPA_URL_P+'/rest/v1/templates?nom=eq.__r4p_favs_meta__&praticien_id=eq.'+_progUid+'&select=id,donnees&order=id.asc', { headers: _sbHeaders() })
  .then(function(r){ return r.ok ? r.json() : []; })
  .then(function(rows){
    if(rows && rows.length){
      /* Union de tous les records (gère race condition multi-device) */
      var merged = getFavs();
      rows.forEach(function(row){
        var d = row.donnees;
        if(typeof d === 'string') try{ d = JSON.parse(d); }catch(e){ d = null; }
        if(d && Array.isArray(d.favs)){
          d.favs.forEach(function(id){ merged.add(String(id)); });
        }
      });
      /* Garder le record le plus ancien (id le plus petit), supprimer les doublons */
      _favExoSupaId = rows[0].id;
      try{ localStorage.setItem(R4P_KEYS.FAV_EXOS_SID, String(rows[0].id)); }catch(e){}
      if(rows.length > 1){
        rows.slice(1).forEach(function(row){
          _fetchRetry(SUPA_URL_P+'/rest/v1/templates?id=eq.'+row.id, { method:'DELETE', headers: _sbHeaders() });
        });
      }
      try{ localStorage.setItem(R4P_KEYS.FAV_EXOS, JSON.stringify(Array.from(merged))); }catch(e){}
      /* Toujours re-sauvegarder pour consolider l'union sur le record canonique */
      _saveFavsToSupabase();
    } else {
      /* Premier chargement : seeder Supabase depuis le local */
      _saveFavsToSupabase();
    }
    renderLib(document.getElementById('searchInput').value.toLowerCase());
    callback && callback();
  })
  .catch(function(){ callback && callback(); });
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
/* Union de toutes les articulations — utilisée quand typeFilter = '' (Tous) */
var GLOBAL_ZONES = [
  {val:'RACHIS – CERVICAL',   label:'Rachis cervical'},
  {val:'RACHIS – THORACIQUE', label:'Rachis thoracique'},
  {val:'RACHIS – LOMBAIRE',   label:'Rachis lombaire'},
  {val:'TRONC / GAINAGE',     label:'Tronc / Gainage'},
  {val:'ÉPAULE',              label:'Épaule'},
  {val:'COUDE',               label:'Coude'},
  {val:'POIGNET',             label:'Poignet'},
  {val:'HANCHE',              label:'Hanche'},
  {val:'GENOU',               label:'Genou'},
  {val:'CHEVILLE',            label:'Cheville'},
  {val:'PIED / HALLUX',       label:'Pied / Hallux'},
];

function onTypeChange(){
  var typeVal = document.getElementById('filterType').value;
  var wrap  = document.getElementById('filter-sub-wrap');
  var wrap2 = document.getElementById('filter-sub2-wrap');
  var subSel  = document.getElementById('filterSub');
  var subSel2 = document.getElementById('filterSub2');
  var subLabel = document.getElementById('filter-sub-label');
  var opts = [], opts2 = [];
  if(typeVal === ''){
    subLabel.textContent = 'Articulation';
    opts = GLOBAL_ZONES;
  } else if(typeVal === 'warmup'){
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
  if(subWrap){
    subWrap.style.display = '';
    var subLabel = document.getElementById('filter-sub-label');
    if(subLabel) subLabel.textContent = 'Articulation';
    if(subSel) subSel.innerHTML = '<option value="">— Toutes —</option>' + GLOBAL_ZONES.map(function(o){
      return '<option value="'+o.val+'">'+o.label+'</option>';
    }).join('');
  }
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

function _norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }

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
    if(q){
      var _words = _norm(q).split(/\s+/).filter(Boolean);
      var _hay = _norm(ex.name)+' '+_norm(ex.zone)+' '+_norm(ex.obj||'')+' '+_norm((ex.patterns||[]).join(' '));
      if(!_words.every(function(w){ return _hay.indexOf(w)>-1; })) return false;
    }
    return true;
  });
  // Favoris toujours en tête de liste (stable sort)
  visible.sort(function(a, b) {
    var af = favs.has(a.id) ? 0 : 1;
    var bf = favs.has(b.id) ? 0 : 1;
    return af - bf;
  });
  // Regroupement :
  // - Renfo sans subFilter → par mouvement (même si subFilter2 actif)
  // - Warmup / Automassage sans subFilter → par zone
  // - Tous les autres cas → liste plate

  var hasFilter = !!(typeFilter || subFilter || subFilter2 || _favFilter || q);

  var groupBy; // 'pattern', 'zone', 'type-zone', or 'none'
  if(_favFilter && !typeFilter){
    groupBy = 'type-zone'; // favoris sans filtre type → tri par objectif puis articulation
  } else if(_favFilter && typeFilter && !subFilter){
    groupBy = 'zone'; // favoris avec filtre type → tri par articulation (pas par pattern)
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
  // Sort groups in defined order
  if(groupBy === 'pattern'){
    order.sort(function(a,b){
      var ia = ALL_PATTERNS_ORDER.indexOf(a); var ib = ALL_PATTERNS_ORDER.indexOf(b);
      return (ia===-1?99:ia) - (ib===-1?99:ib);
    });
  }
  if(groupBy === 'zone'){
    var _zRef = typeFilter === 'renfo' ? RENFO_ZONES : typeFilter === 'automassage' ? AUTOMASSAGE_ZONES : WARMUP_ZONES;
    var _zVals = _zRef.map(function(z){ return z.val; });
    order.sort(function(a,b){
      var ia = _zVals.indexOf(a); var ib = _zVals.indexOf(b);
      return (ia===-1?99:ia) - (ib===-1?99:ib);
    });
  }

  // Get added ids
  var addedIds = {};
  blocs.forEach(function(b){ (b.exos||[]).forEach(function(e){ addedIds[e.libId]=true; }); });

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
    if(ex._isPrivate) h += '<span class="lib-tag" style="background:#EDE7F6;color:#5E35B1;" title="Visible uniquement par vous">🔒 Privé</span>';
    h += '</div></div>';
    if(_isTouchDevice){
      h += '<button class="lib-info-btn" id="libinfo-'+ex.id+'" onclick="_toggleLibPreview(event,\''+ex.id+'\')" title="Aperçu">ℹ</button>';
    }
    if(ex._isPrivate){
      h += '<button class="lib-info-btn" onclick="event.stopPropagation();deleteUserExercise(\''+ex.id+'\')" title="Supprimer mon exercice">×</button>';
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
/* La marche ouvre la liste : c'est le premier palier de remise en charge, celui
   qui precede la course dans un retour au sport. L'ordre de cette liste est
   l'ordre de progression, pas l'ordre alphabetique.
   Les `val` sont enregistrees dans les seances : on AJOUTE, on ne renomme
   jamais — une cle changee rendrait illisibles les seances deja envoyees. */
var CARDIO_SPORTS = [
  {val:'marche',   label:'🚶 Marche'},
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

/* ── Définition des 5 zones FC ── */
var FC_ZONES = [
  { key:'Z1', label:'Z1', desc:'Récupération',      range:'50–60% FCmax' },
  { key:'Z2', label:'Z2', desc:'Endurance aérobie', range:'60–70% FCmax' },
  { key:'Z3', label:'Z3', desc:'Tempo',             range:'70–80% FCmax' },
  { key:'Z4', label:'Z4', desc:'Seuil lactique',    range:'80–90% FCmax' },
  { key:'Z5', label:'Z5', desc:'VO2max / PMA',      range:'90–100% FCmax' },
];

function addCardioBloc(atIndex){
  var id = genId();
  var pos = _posInsertion(atIndex);
  var etapeCible = _etapeDeIndex(pos) || null;
  blocs.splice(pos, 0, {
    id:id, title:'Bloc', type:'cardio', _titreAuto:true,
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
  _syncEtapeIds();
  _relettrerEtape(etapeCible);
  activeBloc = id;
  renderSession();
  setActiveBloc(id);
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
  if(field === 'type') renderSession(); else _draftSaveLazy();
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
  if(field === 'type') renderSession(); else _draftSaveLazy();
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
    if(c.type === 'zone FC'){
      // Sélection multi-zones — stockées dans c.min comme CSV "Z1,Z3"
      var selZones = (c.min||'').split(',').filter(Boolean);
      h += '<div class="fc-zones-wrap">';
      FC_ZONES.forEach(function(z){
        var active = selZones.indexOf(z.key) !== -1;
        h += '<button type="button" class="fc-zone-btn'+(active?' active':'')+'"'
          +' title="'+escH(z.desc+' — '+z.range)+'"'
          +' onclick="toggleFcZone(\''+bid+'\',\''+scope+'\','+ci+',\''+z.key+'\')">'
          +escH(z.label)+'</button>';
      });
      h += '</div>';
      h += '<span style="font-size:.7rem;color:var(--text3);align-self:center;white-space:nowrap;">'
        +(selZones.length ? selZones.join(', ')+' ('+_fcZoneRangeStr(selZones)+')' : '— choisir zone(s) —')+'</span>';
    } else {
      h += '<input class="cardio-cible-val" type="text" value="'+escH(c.min||'')+'" placeholder="—" oninput="updateCardioCible(\''+bid+'\',\''+scope+'\','+ci+',\'min\',this.value)">';
      h += '<span class="cardio-cible-dash">–</span>';
      h += '<input class="cardio-cible-val" type="text" value="'+escH(c.max||'')+'" placeholder="max" oninput="updateCardioCible(\''+bid+'\',\''+scope+'\','+ci+',\'max\',this.value)">';
    }
    if(arr.length > 1){
      h += '<button class="cardio-cible-del" onclick="removeCardioCible(\''+bid+'\',\''+scope+'\','+ci+')" title="Retirer">×</button>';
    }
    h += '</div>';
  });
  h += '<button class="cardio-cible-add" onclick="addCardioCible(\''+bid+'\',\''+scope+'\')">＋ cible</button>';
  h += '</div>';
  return h;
}

/* Retourne une plage % condensée pour un ensemble de zones ("Z2,Z3" → "60–80%") */
function _fcZoneRangeStr(zoneKeys) {
  if(!zoneKeys.length) return '';
  var sorted = zoneKeys.slice().sort();
  var pcts = { Z1:[50,60], Z2:[60,70], Z3:[70,80], Z4:[80,90], Z5:[90,100] };
  var mins = sorted.map(function(k){ return (pcts[k]||[0,0])[0]; });
  var maxs = sorted.map(function(k){ return (pcts[k]||[0,0])[1]; });
  return Math.min.apply(null,mins)+'–'+Math.max.apply(null,maxs)+'% FCmax';
}

/* Toggle une zone FC dans la cible */
function toggleFcZone(blocId, scope, idx, zoneKey){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b || !b[scope] || !b[scope][idx]) return;
  var c = b[scope][idx];
  var zones = (c.min||'').split(',').filter(Boolean);
  var zi = zones.indexOf(zoneKey);
  if(zi !== -1) zones.splice(zi, 1);
  else zones.push(zoneKey);
  zones.sort();
  c.min = zones.join(',');
  _draftSaveLazy();
  renderSession();
}

/* ── Bloc texte ───────────────────────────────────────────────────────
   Un titre et un corps de texte, rien d'autre. Sert aux consignes, au
   contexte, aux rappels de sécurité — tout ce qui n'est ni un exercice ni un
   effort mesuré. */
function addTexteBloc(atIndex){
  var id = genId();
  blocs.splice(_posInsertion(atIndex), 0,
    { id:id, type:'texte', title:'Consigne', contenu:'' });
  _syncEtapeIds();
  activeBloc = id;
  renderSession();
  setActiveBloc(id);
}

function updateTexteContenu(id, val){
  var b = blocs.find(function(x){ return x.id===id; });
  if(!b) return;
  b.contenu = val;
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

/* Le sélecteur « Étape », commun à TOUS les types de blocs. Il n'existait que
   sur le bloc d'exercices : un bloc cardio, texte, AMRAP ou EMOM créé au
   mauvais endroit ne pouvait plus être rangé. C'est aussi le seul chemin pour
   changer un bloc d'étape, les flèches ne franchissant plus les frontières. */
function _selectEtape(b){
  if(!etapes.length) return '';
  var h = '<select class="bloc-etape-select" title="Rattacher ce bloc à une étape"'
        + ' onclick="event.stopPropagation()"'
        + ' onchange="event.stopPropagation();assignBlocEtape(\''+b.id+'\',this.value)">';
  h += '<option value="">— Sans étape —</option>';
  etapes.forEach(function(e){
    h += '<option value="'+e.id+'"'+(b.etapeId===e.id?' selected':'')+'>'+escH(e.title||'Étape')+'</option>';
  });
  return h + '</select>';
}

function _renderTexteBloc(b, idx){
  var bid = b.id;
  var h = '<div class="bloc texte-bloc" id="bloc-'+bid+'">';
  h += '<div class="bloc-header" data-blocid="'+bid+'">';
  h += '<span class="bloc-move-btns">'
    +  '<button class="bloc-move-btn"'+(_estPremierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',-1)" title="Monter">↑</button>'
    +  '<button class="bloc-move-btn"'+(_estDernierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',1)" title="Descendre">↓</button>'
    +  '</span>';
  h += '<input class="bloc-title-input" value="'+escH(b.title||'')+'" placeholder="Titre" oninput="updateBlocTitle(\''+bid+'\',this.value)" onclick="event.stopPropagation()">';
  h += '<span class="texte-tag">Texte</span>';
  h += _selectEtape(b);
  h += '<button class="bloc-del-btn" onclick="event.stopPropagation();deleteBloc(\''+bid+'\')" title="Supprimer le bloc"></button>';
  h += '</div>';
  h += '<div class="bloc-body"><textarea class="texte-ta" placeholder="Consigne, contexte, rappel…" '
    +  'oninput="autoResizeTa(this);updateTexteContenu(\''+bid+'\',this.value)">'+escH(b.contenu||'')+'</textarea></div>';
  h += '</div>';
  return h;
}

/* ── AMRAP et EMOM ────────────────────────────────────────────────────
   Deux formats à contrainte de temps, qui partagent la même liste
   d'exercices que les blocs classiques : la bibliothèque y dépose donc ses
   exercices sans rien changer.

   AMRAP — une durée, des exercices avec leurs répétitions, le patient
   enchaîne les tours. Le praticien peut viser un nombre de tours ; l'athlète
   note ce qu'il a réellement fait, ce qui rend l'AMRAP comparable d'une
   séance à l'autre.

   EMOM — une durée totale et un intervalle. Les exercices ALTERNENT : minute
   1 le premier, minute 2 le deuxième, et ainsi de suite en boucle. */
function addAmrapBloc(atIndex){
  var id = genId();
  blocs.splice(_posInsertion(atIndex), 0,
    { id:id, type:'amrap', title:'AMRAP', duree:'12', toursCible:'', exos:[], commentaire:'' });
  _syncEtapeIds();
  activeBloc = id;
  renderSession();
  setActiveBloc(id);
}

function addEmomBloc(atIndex){
  var id = genId();
  blocs.splice(_posInsertion(atIndex), 0,
    { id:id, type:'emom', title:'EMOM', dureeTotale:'10', intervalle:'1', exos:[], commentaire:'' });
  _syncEtapeIds();
  activeBloc = id;
  renderSession();
  setActiveBloc(id);
}

function updateChronoField(id, field, val){
  var b = blocs.find(function(x){ return x.id===id; });
  if(!b) return;
  b[field] = val;
  if(field === 'intervalle' || field === 'dureeTotale') renderSession();
  else if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

function updateExoReps(blocId, exoId, val){
  var b = blocs.find(function(x){ return x.id===blocId; });
  if(!b) return;
  var e = (b.exos||[]).find(function(x){ return x.id===exoId; });
  if(!e) return;
  e.reps = val;
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

/* Nombre de tours d'un EMOM : chaque exercice revient toutes les N minutes. */
function _emomTours(b){
  var total = parseFloat(b.dureeTotale) || 0;
  var inter = parseFloat(b.intervalle) || 1;
  return inter > 0 ? Math.floor(total / inter) : 0;
}

/* Liste d'exercices commune aux deux formats : nom, répétitions, suppression. */
function _renderChronoExos(b){
  var h = '<div class="chrono-exos">';
  if(!b.exos || !b.exos.length){
    h += '<div class="chrono-vide">Cliquez sur un exercice dans la bibliothèque pour l\'ajouter ici</div>';
  }
  (b.exos||[]).forEach(function(e, i){
    h += '<div class="chrono-exo">';
    /* Les fleches manquaient ici alors que `moveExo` est generique : l'ordre
       etait fige a la saisie, sans aucun moyen de le reprendre. Il compte
       pourtant plus qu'ailleurs — dans un EMOM la position EST la minute, et
       dans un AMRAP elle fixe l'enchainement du tour. Meme classe que les
       blocs d'exercices : elle porte deja le masquage en lecture seule et a
       l'impression, et l'affichage permanent sur ecran tactile. */
    h += '<div class="exo-move-btns">'
      +  '<button class="exo-move-btn"'+(i===0?' disabled':'')+' onclick="event.stopPropagation();moveExo(\''+b.id+'\','+i+',-1)" title="Monter">↑</button>'
      +  '<button class="exo-move-btn"'+(i===(b.exos.length-1)?' disabled':'')+' onclick="event.stopPropagation();moveExo(\''+b.id+'\','+i+',1)" title="Descendre">↓</button>'
      +  '</div>';
    if(b.type === 'emom'){
      h += '<span class="chrono-min">min '+(i+1)+'</span>';
    }
    // Vignette vidéo, comme dans un bloc d'exercices : un AMRAP se démontre
    // autant qu'il se lit. Une place fixe est réservée même sans vidéo, pour
    // que les noms restent alignés d'une ligne à l'autre.
    var _vt = e.url ? _ytThumbHtml(e.url) : null;
    h += _vt || '<span class="chrono-exo-vide" title="Pas de vidéo">—</span>';
    h += '<div class="chrono-exo-nom">';
    if(e.free){
      h += '<input class="exo-name-input" type="text" value="'+escH(e.name||'')+'" placeholder="Nom de l\'exercice…" oninput="updateExoName(\''+b.id+'\',\''+e.id+'\',this.value)">';
    } else {
      h += escH(e.name || '');
    }
    h += '</div>';
    h += '<input class="chrono-reps" type="text" value="'+escH(e.reps||'')+'" placeholder="reps" '
      +  'oninput="updateExoReps(\''+b.id+'\',\''+e.id+'\',this.value)">';
    // Un exercice unilatéral le reste dans un AMRAP ou un EMOM : la bascule
    // manquait ici alors que la donnée, elle, existait déjà sur l'exercice.
    h += '<button class="percote-toggle'+(e.perCote?' active':'')+'" data-percote="'+b.id+'-'+e.id+'"'
      +  ' onclick="event.stopPropagation();togglePerCote(\''+b.id+'\',\''+e.id+'\')" title="Par côté">/côté</button>';
    h += '<button class="exo-del-btn" onclick="removeExo(\''+b.id+'\',\''+e.id+'\')" title="Retirer"></button>';
    h += '</div>';
  });
  h += '<button class="add-free-exo-btn" onclick="addFreeExo(\''+b.id+'\')">✚ Exercice libre</button>';
  h += '</div>';
  return h;
}

function _renderChronoBloc(b, idx){
  var bid = b.id;
  var estAmrap = b.type === 'amrap';
  var isActive = b.id === activeBloc;
  var h = '<div class="bloc chrono-bloc '+(estAmrap?'amrap-bloc':'emom-bloc')+'" id="bloc-'+bid+'">';
  h += '<div class="bloc-header'+(isActive?' actif':'')+'" data-blocid="'+bid+'" onclick="setActiveBloc(\''+bid+'\')">';
  h += '<span class="bloc-move-btns">'
    +  '<button class="bloc-move-btn"'+(_estPremierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',-1)" title="Monter">↑</button>'
    +  '<button class="bloc-move-btn"'+(_estDernierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',1)" title="Descendre">↓</button>'
    +  '</span>';
  h += '<input class="bloc-title-input" value="'+escH(b.title||'')+'" placeholder="Nom du bloc" oninput="updateBlocTitle(\''+bid+'\',this.value)" onclick="event.stopPropagation()">';
  h += '<span class="chrono-tag">'+(estAmrap?'AMRAP':'EMOM')+'</span>';
  h += _selectEtape(b);
  h += '<button class="bloc-del-btn" onclick="event.stopPropagation();deleteBloc(\''+bid+'\')" title="Supprimer le bloc"></button>';
  h += '</div>';

  h += '<div class="bloc-body"><div class="chrono-form">';
  if(estAmrap){
    h += '<div class="cardio-field"><label class="cardio-lbl">Durée (min)</label>'
      +  '<input type="number" class="cardio-inp" min="1" value="'+escH(b.duree||'')+'" placeholder="12" oninput="updateChronoField(\''+bid+'\',\'duree\',this.value)"></div>';
    h += '<div class="cardio-field"><label class="cardio-lbl">Tours visés <span class="cap-opt">optionnel</span></label>'
      +  '<input type="number" class="cardio-inp" min="0" value="'+escH(b.toursCible||'')+'" placeholder="—" oninput="updateChronoField(\''+bid+'\',\'toursCible\',this.value)"></div>';
  } else {
    h += '<div class="cardio-field"><label class="cardio-lbl">Durée totale (min)</label>'
      +  '<input type="number" class="cardio-inp" min="1" value="'+escH(b.dureeTotale||'')+'" placeholder="10" oninput="updateChronoField(\''+bid+'\',\'dureeTotale\',this.value)"></div>';
    h += '<div class="cardio-field"><label class="cardio-lbl">Intervalle (min)</label>'
      +  '<input type="number" class="cardio-inp" min="0.5" step="0.5" value="'+escH(b.intervalle||'')+'" placeholder="1" oninput="updateChronoField(\''+bid+'\',\'intervalle\',this.value)"></div>';
  }
  h += '</div>';

  if(!estAmrap && (b.exos||[]).length){
    var tours = _emomTours(b);
    var cycles = Math.ceil(tours / b.exos.length);
    h += '<div class="chrono-resume">'+tours+' intervalles — chaque exercice revient '
      +  cycles + (cycles > 1 ? ' fois' : ' fois') + '.</div>';
  }
  h += _renderChronoExos(b);
  h += '<textarea class="texte-ta" style="margin-top:8px;min-height:44px;" placeholder="Consignes…" '
    +  'oninput="autoResizeTa(this);updateChronoField(\''+bid+'\',\'commentaire\',this.value)">'+escH(b.commentaire||'')+'</textarea>';
  h += '</div></div>';
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

  var h = '<div class="bloc cardio-bloc" id="bloc-'+bid+'">';
  // Header
  h += '<div class="bloc-header'+(isActive?' actif':'')+'" data-blocid="'+bid+'" onclick="setActiveBloc(\''+bid+'\')">';
  h += '<span class="bloc-move-btns">'
    +  '<button class="bloc-move-btn"'+(_estPremierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',-1)" title="Monter">↑</button>'
    +  '<button class="bloc-move-btn"'+(_estDernierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',1)" title="Descendre">↓</button>'
    +  '</span>';
  h += '<input class="bloc-title-input" value="'+escH(b.title)+'" placeholder="Nom du bloc" oninput="updateBlocTitle(\''+bid+'\',this.value)" onclick="event.stopPropagation()">';
  h += '<span class="cardio-tag">🏃 Cardio</span>';
  h += _selectEtape(b);
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
    h += '<div class="cardio-field"><label class="cardio-lbl">Durée effort</label><input type="text" class="cardio-inp" value="'+escH(_normDureeStr(b.duree_effort)||'')+'" placeholder="3 min" oninput="updateCardioField(\''+bid+'\',\'duree_effort\',this.value)"></div>';
    h += '<div class="cardio-field"><label class="cardio-lbl">Récupération</label><input type="text" class="cardio-inp" value="'+escH(_normDureeStr(b.duree_recup)||'')+'" placeholder="2 min" oninput="updateCardioField(\''+bid+'\',\'duree_recup\',this.value)"></div>';
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

/* `atIndex` : position d'insertion dans `blocs`. Absent ou négatif = à la fin. */
function _posInsertion(atIndex){
  return (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= blocs.length)
    ? atIndex : blocs.length;
}

function addBloc(atIndex){
  var id = genId();
  var pos = _posInsertion(atIndex);
  var etapeCible = _etapeDeIndex(pos) || null;
  blocs.splice(pos, 0,
    {id:id, title:'Bloc', exos:[], objectif:'libre', methode:'', _titreAuto:true});
  _syncEtapeIds();
  _relettrerEtape(etapeCible);
  activeBloc = id;
  renderSession();
  setActiveBloc(id);
}

function deleteBloc(id){
  var supprime = blocs.find(function(b){ return !_estMarqueur(b) && b.id===id; });
  var etapeDeSuppr = supprime ? (supprime.etapeId||null) : null;
  blocs = blocs.filter(function(b){ return _estMarqueur(b) || b.id!==id; });
  // Supprimer le dernier bloc d'une zone libre y laisse un séparateur orphelin.
  _compacterMarqueurs();
  _relettrerEtape(etapeDeSuppr);
  if(activeBloc===id){ var r = _blocsReels(); activeBloc = r.length ? r[r.length-1].id : null; }
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

/* ── Étapes (regroupement de blocs, ex: Échauffement / Corps de séance) ──
   `etapes` est une vraie liste ordonnée, indépendante des blocs : c'est ce qui
   permet à une étape d'exister vide (on la crée d'abord, on la remplit ensuite)
   et de survivre à la suppression de son dernier bloc. Chaque bloc porte un
   `etapeId` (ou rien). L'ordre d'affichage reste piloté par `blocs` ; les étapes
   encore vides s'affichent en fin de séance, là où on vient de les créer. */
/* Ordre voulu par le praticien : bleu, rouge, vert d'abord — les trois
   premieres etapes d'une seance sont les plus frequentes et se distinguent
   ainsi au premier coup d'oeil. La suite importe peu.

   La couleur est STOCKEE sur chaque etape, pas son indice : reordonner ici ne
   repeint aucune seance deja enregistree. Une exception, et elle impose de
   tenir les deux fichiers d'accord — `athlete.html` garde sa propre copie
   (ETAPE_COLORS_ATH) et s'en sert PAR INDICE pour les seances anterieures a
   la liste `etapes`. Les deux listes doivent rester identiques, sinon le
   patient voit d'autres couleurs que le praticien sur ces seances-la. */
var ETAPE_COLORS = ['#2563EB','#DC2626','#16A34A','#F59E0B','#0D9488','#7C3AED','#DB2777','#0891B2'];
var etapes = [];

/* Icônes réutilisées depuis le vocabulaire déjà en place dans le site
   (enregistrer / corbeille / dossier) — pas d'emoji dans le builder. */
var _ETAPE_ICO_SAVE = '<svg width="14" height="14" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="m28.702 8.564-4.273-5c-.795-.93-1.954-1.464-3.18-1.464h-14.771c-2.306 0-4.182 1.877-4.182 4.183v19.436c0 2.306 1.876 4.183 4.182 4.183h19.045c2.306 0 4.183-1.877 4.183-4.183v-14.437c-.001-.995-.357-1.96-1.004-2.718zm-6.962 19.536h-11.481v-8.173c0-.631.514-1.144 1.145-1.144h9.191c.631 0 1.145.513 1.145 1.144zm6.164-2.382c0 1.313-1.068 2.382-2.382 2.382h-1.981v-8.173c0-1.623-1.321-2.944-2.945-2.944h-9.191c-1.624 0-2.945 1.321-2.945 2.944v8.173h-1.982c-1.313 0-2.382-1.068-2.382-2.382v-19.436c0-1.313 1.069-2.382 2.382-2.382h14.771c.698 0 1.358.304 1.811.834l4.273 4.999c.369.432.571.982.571 1.549z"/><path d="m9.359 9.31h5.963c.497 0 .9-.403.9-.9s-.403-.9-.9-.9h-5.963c-.497 0-.9.403-.9.9s.403.9.9.9z"/><path d="m22.641 11.572h-13.282c-.497 0-.9.403-.9.9s.403.9.9.9h13.281c.497 0 .9-.403.9-.9s-.402-.9-.899-.9z"/></g></svg>';
/* Chevrons de réordonnancement, dans le vocabulaire d'icônes du site :
   viewBox 24, trait courant, extrémités rondes. */
var _ETAPE_ICO_UP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,14 12,8 18,14"/></svg>';
var _ETAPE_ICO_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,10 12,16 18,10"/></svg>';
var _ETAPE_ICO_TRASH = '<svg width="13" height="13" fill="currentColor" viewBox="-40 0 427 427.00131" xmlns="http://www.w3.org/2000/svg"><path d="m232.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/><path d="m114.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/><path d="m28.398438 127.121094v246.378906c0 14.5625 5.339843 28.238281 14.667968 38.050781 9.285156 9.839844 22.207032 15.425781 35.730469 15.449219h189.203125c13.527344-.023438 26.449219-5.609375 35.730469-15.449219 9.328125-9.8125 14.667969-23.488281 14.667969-38.050781v-246.378906c18.542968-4.921875 30.558593-22.835938 28.078124-41.863282-2.484374-19.023437-18.691406-33.253906-37.878906-33.257812h-51.199218v-12.5c.058593-10.511719-4.097657-20.605469-11.539063-28.03125-7.441406-7.421875-17.550781-11.5546875-28.0625-11.46875h-88.796875c-10.511719-.0859375-20.621094 4.046875-28.0625 11.46875-7.441406 7.425781-11.597656 17.519531-11.539062 28.03125v12.5h-51.199219c-19.1875.003906-35.394531 14.234375-37.878907 33.257812-2.480468 19.027344 9.535157 36.941407 28.078126 41.863282zm239.601562 279.878906h-189.203125c-17.097656 0-30.398437-14.6875-30.398437-33.5v-245.5h250v245.5c0 18.8125-13.300782 33.5-30.398438 33.5zm-158.601562-367.5c-.066407-5.207031 1.980468-10.21875 5.675781-13.894531 3.691406-3.675781 8.714843-5.695313 13.925781-5.605469h88.796875c5.210937-.089844 10.234375 1.929688 13.925781 5.605469 3.695313 3.671875 5.742188 8.6875 5.675782 13.894531v12.5h-128zm-71.199219 32.5h270.398437c9.941406 0 18 8.058594 18 18s-8.058594 18-18 18h-270.398437c-9.941407 0-18-8.058594-18-18s8.058593-18 18-18zm0 0"/><path d="m173.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/></svg>';
var _ETAPE_ICO_FOLDER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 511.999 511.999" width="14" height="14" fill="currentColor" style="vertical-align:middle;margin-right:5px"><path d="M477.418,98.354H262.25l-0.94-6.098c-2.808-18.223-20.093-33.047-38.531-33.047H115.962c-18.44,0-35.724,14.826-38.529,33.047l-0.941,6.098h-0.669c-19.068,0-34.581,15.513-34.581,34.582v23.139H30.71c-9.454,0-17.847,3.738-23.629,10.524c-5.783,6.787-8.14,15.665-6.64,24.999l36.69,228.225c2.922,18.179,20.281,32.968,38.693,32.968h401.594c1.782,0,3.525-0.133,5.222-0.395c16.6-2.525,29.359-16.894,29.359-34.188V132.935C511.999,113.867,496.486,98.354,477.418,98.354z M488.799,431.834c-2,2.347-4.764,3.905-7.98,4.543c-0.133,0.025-0.269,0.04-0.403,0.062c-0.399,0.069-0.799,0.134-1.21,0.175c-0.589,0.057-1.185,0.091-1.789,0.091H75.824c-10.67,0-21.116-8.901-22.811-19.436l-36.69-228.224c-0.74-4.605,0.325-8.87,3.001-12.012c2.677-3.14,6.72-4.87,11.384-4.87h401.593c10.669,0,21.115,8.901,22.808,19.436l36.691,228.224C492.542,424.427,491.475,428.693,488.799,431.834z M81.921,156.076v-0.001v-13.032h381.992v29.598c-7.36-9.889-19.244-16.566-31.61-16.566H81.921z M495.912,344.035l-15.912-98.978V134.998c0-4.442-3.6-8.044-8.044-8.044H73.877c-4.443,0-8.044,3.601-8.044,8.044v21.075h-8.505v-23.139c0-10.198,8.296-18.495,18.494-18.495h7.57c3.969,0,7.345-2.896,7.949-6.818l1.992-12.918c1.619-10.521,11.982-19.409,22.629-19.409h106.817c10.647,0,21.01,8.889,22.633,19.41l1.989,12.916c0.604,3.923,3.98,6.819,7.949,6.819h222.067c10.198,0,18.494,8.297,18.494,18.495V344.035z"/></svg>';

function getEtape(etapeId){
  return (etapes||[]).find(function(e){ return e.id===etapeId; }) || null;
}

function _etapeColor(etapeId){
  var e = getEtape(etapeId);
  return (e && e.color) || ETAPE_COLORS[0];
}

function _etapeTitle(etapeId){
  var e = getEtape(etapeId);
  return (e && e.title) || 'Étape';
}

/* Reconstruit `etapes` quand la donnée chargée n'en a pas (séances enregistrées
   avant l'introduction de la liste, où titre/couleur vivaient sur les blocs).
   Supprime aussi les etapeId orphelins pour éviter des groupes fantômes. */
function _normalizeEtapes(){
  if(!Array.isArray(etapes)) etapes = [];
  var known = {};
  etapes.forEach(function(e){ if(e && e.id) known[e.id] = true; });

  // Étapes connues des blocs mais absentes de la liste (anciens formats).
  (blocs||[]).forEach(function(b){
    if(_estMarqueur(b)){
      if(_estMarqueurEtape(b) && !known[b.id]){
        known[b.id] = true;
        etapes.push({ id:b.id, title:'Étape', color:ETAPE_COLORS[etapes.length%ETAPE_COLORS.length] });
      }
      return;
    }
    if(!b.etapeId) return;
    if(!known[b.etapeId]){
      known[b.etapeId] = true;
      etapes.push({ id:b.etapeId, title:b.etapeTitle || 'Étape', color:ETAPE_COLORS[(etapes.length)%ETAPE_COLORS.length] });
    }
    if(b.etapeTitle !== undefined) delete b.etapeTitle;   // le titre ne vit plus sur le bloc
  });
  etapes.forEach(function(e, i){ if(!e.color) e.color = ETAPE_COLORS[i%ETAPE_COLORS.length]; });

  // ── Migration : une séance enregistrée avant le modèle plat n'a pas de
  // séparateurs. On les pose devant le premier bloc de chaque étape, en
  // conservant l'ordre d'affichage qu'elle avait. Une étape sans bloc atterrit
  // en fin de séance, faute de mieux — c'est là qu'elle s'affichait déjà.
  var manquantes = etapes.filter(function(e){ return _indexMarqueur(e.id) < 0; });
  manquantes.forEach(function(e){
    var i = (blocs||[]).findIndex(function(b){ return !_estMarqueur(b) && b.etapeId === e.id; });
    if(i < 0) blocs.push({ id:e.id, type:'etape' });
    else      blocs.splice(i, 0, { id:e.id, type:'etape' });
  });

  // Une étape dont le séparateur a disparu n'existe plus.
  etapes = etapes.filter(function(e){ return _indexMarqueur(e.id) >= 0; });
  _syncEtapeIds();
}

function _blocsOfEtape(etapeId){
  return (blocs||[]).filter(function(b){ return !_estMarqueur(b) && b.etapeId===etapeId; });
}

/* ── L'ordre vit dans `blocs`, et nulle part ailleurs ──────────────────
   Une étape est une ENTRÉE de `blocs` : un séparateur `{type:'etape'}`. Les
   blocs qui le suivent lui appartiennent, jusqu'au séparateur suivant.

   Avant, l'ordre d'affichage était reconstruit depuis `blocs` tandis que les
   étapes vivaient dans une seconde liste ordonnée : deux sources d'ordre pour
   une seule séance. Les étapes vides étaient collées en fin de liste, si bien
   qu'ajouter un bloc à la deuxième étape la faisait remonter en première
   position — elle passait soudain par `blocs`, l'autre restait « en attente ».
   Et une étape ne pouvait naître qu'à la fin.

   `etapes[]` ne porte plus que les métadonnées (titre, couleur). */

/* Deux sortes de séparateurs. `etape` ouvre une étape nommée ; `libre` ouvre
   une zone qui n'appartient à aucune. Sans ce second marqueur, « hors étape »
   ne pourrait exister qu'avant le tout premier séparateur — c'est-à-dire en
   tête de séance — et sortir un bloc de son étape le ferait sauter en haut. */
function _estMarqueur(b){ return !!(b && (b.type === 'etape' || b.type === 'libre')); }
function _estMarqueurEtape(b){ return !!(b && b.type === 'etape'); }
function _estMarqueurLibre(b){ return !!(b && b.type === 'libre'); }

/* Bornes du GROUPE, pas de la séance : les flèches d'un bloc ne lui font pas
   franchir une frontière d'étape, il y serait absorbé sans le dire. Pour
   changer d'étape, on passe par le sélecteur « Étape » de son en-tête. */
function _estPremierDuGroupe(idx){
  return idx <= 0 || _estMarqueur(blocs[idx - 1]);
}
function _estDernierDuGroupe(idx){
  return idx >= blocs.length - 1 || _estMarqueur(blocs[idx + 1]);
}

/* Retire les séparateurs libres qui ne servent à rien : celui qui ouvre une
   zone déjà libre, celui qu'un autre séparateur suit aussitôt, celui qui
   termine la séance. Sans ce nettoyage ils s'accumulent à chaque sortie. */
function _compacterMarqueurs(){
  var out = [];
  (blocs||[]).forEach(function(b){
    if(_estMarqueurLibre(b)){
      var dernier = null;
      for(var k = out.length - 1; k >= 0; k--){
        if(_estMarqueur(out[k])){ dernier = out[k]; break; }
      }
      if(!_estMarqueurEtape(dernier)) return;   // la zone en cours est déjà libre
    }
    out.push(b);
  });
  out = out.filter(function(b, i){
    return !(_estMarqueurLibre(b) && _estMarqueur(out[i + 1]));
  });
  while(out.length && _estMarqueurLibre(out[out.length - 1])) out.pop();
  blocs = out;
}

/* Les blocs réels, séparateurs exclus — pour compter et pour nommer. */
function _blocsReels(){
  return (blocs||[]).filter(function(b){ return !_estMarqueur(b); });
}

/* Index du séparateur d'une étape dans `blocs`, ou -1. */
function _indexMarqueur(etapeId){
  return (blocs||[]).findIndex(function(b){ return _estMarqueurEtape(b) && b.id === etapeId; });
}

/* Étape à laquelle appartient le bloc d'index `i` : le dernier séparateur
   rencontré avant lui, ou aucune s'il ouvre une zone libre. */
function _etapeDeIndex(i){
  for(var k = i - 1; k >= 0; k--){
    if(_estMarqueur(blocs[k])) return _estMarqueurEtape(blocs[k]) ? blocs[k].id : null;
  }
  return null;
}

/* Renomme les blocs « Bloc X » — jamais ceux nommés à la main — pour qu'ils
   suivent A, B, C… dans l'ordre d'affichage de LEUR étape (`etapeId===cible`,
   `null` pour la zone hors étape). `n` compte TOUS les blocs réels de l'étape,
   nommés à la main ou non : un bloc renommé « Squat » garde sa place dans le
   compte, sinon les lettres qui le suivent ne correspondraient plus à leur
   position. Seul le TITRE des blocs `_titreAuto` est réécrit.

   Appelée après tout geste qui change l'ordre ou l'appartenance d'un bloc :
   création, déplacement, changement d'étape, suppression. Un bloc déjà
   enregistré avant cette fonctionnalité n'a pas `_titreAuto` — il ne sera
   jamais renommé tout seul, même déplacé. */
function _relettrerEtape(etapeId){
  var cible = etapeId || null;
  var n = 0;
  _blocsReels().forEach(function(b){
    if((b.etapeId||null) !== cible) return;
    n++;
    if(b._titreAuto) b.title = 'Bloc ' + String.fromCharCode(64 + n);
  });
}

/* Ajoute UNE copie d'un bloc a la fin de la seance — le geste « piocher un
   bloc dans un repertoire ».

   Une etape est un decoupage de la SEANCE, pas une propriete du bloc : on
   prend le contenu, jamais le contenant. `etapeId` est donc supprime de la
   copie, puis _syncEtapeIds le recalcule DEPUIS LA POSITION. Le bloc pioche se
   comporte ainsi exactement comme un bloc cree par « + Ajouter » : il rejoint
   l'etape ouverte en fin de seance s'il y en a une, sinon aucune.

   Ne jamais repasser par _injecterTemplate pour un bloc seul : sans separateur
   dans le tableau, ce moteur se rabat sur `etapeId` et RECREE l'etape source —
   une etape neuve a chaque clic, donc des doublons du meme nom.

   node qualite/templates-cas.js */
function _ajouterBlocPioche(srcBloc){
  if(!srcBloc) return null;
  var nb = JSON.parse(JSON.stringify(srcBloc));
  nb.id = genId();
  nb.exos = (nb.exos || []).map(function(e){ return Object.assign({}, e, { id: genId() }); });
  delete nb.etapeId;
  blocs.push(nb);
  activeBloc = nb.id;
  _syncEtapeIds();
  _relettrerEtape(nb.etapeId||null);
  return nb;
}

/* Découpe la séance en groupes affichables. Un seul parcours, un seul ordre.
   Les blocs hors étape voisins forment UN groupe, pas un groupe chacun. */
function _groupBlocsForRender(){
  var groups = [];
  var courant = null;
  (blocs||[]).forEach(function(b){
    if(_estMarqueur(b)){
      courant = { etapeId: _estMarqueurEtape(b) ? b.id : null, blocs: [] };
      groups.push(courant);
      return;
    }
    if(!courant){ courant = { etapeId: null, blocs: [] }; groups.push(courant); }
    courant.blocs.push(b);
  });
  return groups;
}

/* Réécrit `blocs` depuis une liste de groupes. Le premier groupe, s'il est
   hors étape, n'a besoin d'aucun séparateur : le début de séance l'est déjà. */
function _reconstruireDepuisGroupes(groups){
  var out = [];
  groups.forEach(function(g, i){
    if(g.etapeId) out.push({ id: g.etapeId, type: 'etape' });
    else if(i > 0) out.push({ type: 'libre' });
    g.blocs.forEach(function(b){ out.push(b); });
  });
  blocs = out;
  _compacterMarqueurs();
}

/* Chaque bloc porte l'étape déduite de sa position. Le champ n'est plus la
   source de vérité — il est recalculé — mais il reste écrit parce que l'espace
   athlète groupe les blocs avec. */
function _syncEtapeIds(){
  var courant = null;
  (blocs||[]).forEach(function(b){
    if(_estMarqueur(b)){ courant = _estMarqueurEtape(b) ? b.id : null; return; }
    if(courant) b.etapeId = courant; else delete b.etapeId;
  });
}

/* Crée une étape à l'index voulu dans la séance. Sans index, à la fin. */
function addEtape(atIndex){
  var id = genId();
  var nbEtapes = (blocs||[]).filter(_estMarqueur).length;
  var e = { id: id, title: 'Nouvelle étape', color: ETAPE_COLORS[nbEtapes % ETAPE_COLORS.length] };
  etapes.push(e);
  var pos = (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= blocs.length)
    ? atIndex : blocs.length;
  blocs.splice(pos, 0, { id: id, type: 'etape' });
  _syncEtapeIds();
  renderSession();
  var input = document.querySelector('.etape-group[data-etapeid="'+id+'"] .etape-title-input');
  if(input){ input.focus(); input.select(); }
  var el = document.querySelector('.etape-group[data-etapeid="'+id+'"]');
  if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* Fin du groupe d'une étape : l'index juste avant le séparateur suivant. */
function _finDeGroupe(etapeId){
  var i = _indexMarqueur(etapeId);
  if(i < 0) return blocs.length;
  var j = i + 1;
  while(j < blocs.length && !_estMarqueur(blocs[j])) j++;
  return j;
}

function renameEtape(etapeId, val){
  var e = getEtape(etapeId);
  if(!e) return;
  e.title = val;
  // Pas de renderSession() : on écrase la frappe en cours dans le champ
  var sel = document.querySelectorAll('.bloc-etape-select option[value="'+etapeId+'"]');
  sel.forEach(function(o){ o.textContent = val || 'Étape'; });
  if(typeof _draftSave === 'function') _draftSave();
}

/* Déplie la palette d'une étape. Repliée, elle ne montre que la couleur en
   cours ; le clic suivant sur une pastille choisit et referme (le rendu
   repart de zéro). */
function _toggleSwatches(ev){
  ev.stopPropagation();
  var w = ev.currentTarget.parentNode;
  w.setAttribute('data-open', w.getAttribute('data-open') === '1' ? '0' : '1');
}

function setEtapeColor(etapeId, color){
  var e = getEtape(etapeId);
  if(!e) return;
  e.color = color;
  renderSession();
}

/* Dissout : le groupement disparaît, les blocs restent dans la séance. */
/* Dissout : le séparateur disparaît, les blocs restent en place — ils
   rejoignent l'étape précédente, ou aucune s'il n'y en a pas. */
function dissolveEtape(etapeId){
  var i = _indexMarqueur(etapeId);
  if(i >= 0) blocs.splice(i, 1);
  etapes = etapes.filter(function(e){ return e.id!==etapeId; });
  // La zone qui suivait peut être devenue libre elle aussi : son séparateur
  // ne sert alors plus à rien.
  _compacterMarqueurs();
  _syncEtapeIds();
  renderSession();
}

/* Rattacher un bloc à une étape, c'est le DÉPLACER dans son groupe : la
   position fait l'appartenance, plus un champ. */
function assignBlocEtape(blocId, etapeId){
  var i = (blocs||[]).findIndex(function(x){ return x.id===blocId && !_estMarqueur(x); });
  if(i < 0) return;
  var etapeAvant = _etapeDeIndex(i);
  var etapeDest = (etapeId && _indexMarqueur(etapeId) >= 0) ? etapeId : null;

  if(!etapeId || _indexMarqueur(etapeId) < 0){
    var courante = etapeAvant;
    if(courante === null) return;                  // déjà hors étape
    // Le bloc sort de son étape et se pose juste APRÈS elle, dans une zone
    // libre. Le remonter avant le premier séparateur — seule autre zone sans
    // étape — le ferait sauter en tête de séance sans raison. Le sortir sur
    // place ferait sortir avec lui tous les blocs qui le suivent, puisque
    // l'appartenance est positionnelle.
    var b0 = blocs.splice(i, 1)[0];
    blocs.splice(_finDeGroupe(courante), 0, { type:'libre' }, b0);
  } else {
    var b = blocs.splice(i, 1)[0];
    blocs.splice(_finDeGroupe(etapeId), 0, b);
  }

  _compacterMarqueurs();
  _syncEtapeIds();
  _relettrerEtape(etapeAvant);
  _relettrerEtape(etapeDest);
  renderSession();
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

/* Déplace une étape ET son contenu d'un cran, parmi les étapes seulement.
   Une étape vide compte : celle qu'on vient de créer doit pouvoir être placée
   avant d'être remplie.

   Les blocs situés avant la première étape n'appartiennent à aucune, et
   restent en tête. Les faire passer sous un séparateur les y ferait entrer :
   l'appartenance est positionnelle, un bloc pousse derrière un marqueur est
   absorbé par l'étape. C'est pour ça que le déplacement porte sur la liste des
   étapes et non sur celle des groupes affichés. */
function moveEtape(etapeId, dir){
  var groups = _groupBlocsForRender();
  // Les zones hors étape gardent leur place dans la séance : seules deux
  // étapes voisines échangent leur contenu.
  var posEtapes = [];
  groups.forEach(function(g, i){ if(g.etapeId) posEtapes.push(i); });
  var k = posEtapes.findIndex(function(i){ return groups[i].etapeId === etapeId; });
  if(k < 0 || k + dir < 0 || k + dir >= posEtapes.length) return;
  var a = posEtapes[k], b = posEtapes[k + dir];
  var tmp = groups[a]; groups[a] = groups[b]; groups[b] = tmp;

  _reconstruireDepuisGroupes(groups);
  _syncEtapeIds();
  renderSession();
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
}

function addExoFromLib(libId){
  _hideLibPreview();
  var ex = LIBRARY.find(function(e){ return e.id===libId; });
  if(!ex) return;
  // If no bloc, create one
  if(!_blocsReels().length) addBloc();
  // Use target-bloc-select, activeBloc, or last bloc
  var targetBlocSel = document.getElementById('target-bloc-select');
  var selectedBlocId = targetBlocSel ? targetBlocSel.value : '';
  var _reels = _blocsReels();
  var targetId = selectedBlocId || activeBloc || _reels[_reels.length-1].id;
  var bloc = blocs.find(function(b){ return b.id===targetId; });
  if(!bloc || _estMarqueur(bloc)) { bloc = _reels[_reels.length-1]; targetId = bloc ? bloc.id : null; }
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
    // Scopé au bloc concerné : un querySelectorAll global prenait le dernier
    // .exo-name-input de TOUTE la page, donc d'un bloc plus bas si celui-ci
    // n'était pas le dernier de la séance — le focus y envoyait l'écran.
    var blocEl = document.getElementById('bloc-'+blocId);
    var inputs = blocEl ? blocEl.querySelectorAll('.exo-name-input') : [];
    if(inputs.length){
      var el = inputs[inputs.length-1];
      el.focus({preventScroll:true});
      el.scrollIntoView({block:'nearest', behavior:'smooth'});
    }
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
  /* Retirer un exercice DESIGNE le bloc : on vient d'y travailler, et
     l'exercice suivant s'y ajoute presque toujours. Sans cela il fallait
     recliquer le bloc — ou pire, ne pas y penser et voir l'exercice partir
     dans le dernier bloc de la seance.

     L'ecoute deleguee qui rend un bloc actif au clic ne peut PAS s'en charger :
     elle vit sur `document`, donc elle se declenche apres le `onclick` du
     bouton, et celui-ci a deja rebati la zone. Sa garde `zone.contains(target)`
     tombe alors sur un noeud detache et abandonne. C'est aussi pourquoi le
     bloc actif doit etre pose AVANT `renderSession` — le rendu lit `activeBloc`
     pour marquer l'en-tete — et confirme APRES, `updateTargetBlocSelect`
     reconstruisant le menu « Ajouter au bloc ». */
  activeBloc = blocId;
  renderSession();
  setActiveBloc(blocId);
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
    badge.textContent = val !== null ? 'EVA '+val+'/10' : 'EVA —';
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
  if(bloc){ bloc.title = val; bloc._titreAuto = false; }
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
  /* Toutes les cases cochees : appliquer au bloc entier est le cas courant, et
     l'intention etait deja ecrite ici — le code, lui, les decochait, ce qui
     obligeait a tout recocher avant de pouvoir appliquer quoi que ce soit. */
  bloc.exos.forEach(function(e){ e._methChecked = true; delete e._methApplied; });
  /* On ouvre le mode selection : c'est le geste qui suit naturellement. En
     sortir n'efface pas la methode — le bandeau continue de documenter ce
     qui a ete applique au bloc. */
  if(val) bloc._methSel = true; else delete bloc._methSel;
  renderSession();
}

/* Rouvre le mode selection sur un bloc dont la methode est deja posee — pour
   la reappliquer a d'autres exercices, ou apres en avoir ajoute un. */
function _ouvrirSelMethode(id){
  var bloc = blocs.find(function(b){ return b.id===id; });
  if(!bloc) return;
  bloc._methSel = true;
  bloc.exos.forEach(function(e){ e._methChecked = true; });
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
  /* Applique : on rend la main. Les fleches de deplacement reviennent, la
     methode et son bandeau restent. */
  delete bloc._methSel;
  renderSession();
  // Effacer les pastilles après 3s (les cases restent décochées)
  setTimeout(function(){
    bloc.exos.forEach(function(e){ delete e._methApplied; });
    renderSession();
  }, 3000);
}

function setActiveBloc(id){
  activeBloc = id;
  document.querySelectorAll('.bloc-header').forEach(function(h){
    var estLui = h.dataset.blocid === id;
    h.style.opacity = estLui ? '1' : '.72';
    /* La classe portait le fond teinte mais n'etait posee qu'au rendu : le
       bloc precedemment actif gardait sa couleur jusqu'au prochain
       renderSession, et deux blocs paraissaient actifs a la fois. */
    h.classList.toggle('actif', estLui);
  });
  /* Le selecteur « Ajouter au bloc » l'emporte sur activeBloc dans
     addExoFromLib. Deux designations concurrentes du meme choix — l'une
     visible, l'autre non — et c'est la visible qui gagne : cliquer un bloc
     n'aurait rien change tant que ce menu pointait ailleurs. On les tient
     donc alignes : un seul choix, montre a deux endroits. */
  var sel = document.getElementById('target-bloc-select');
  if (sel && sel.value !== id) {
    var existe = Array.prototype.some.call(sel.options, function(o){ return o.value === id; });
    if (existe) sel.value = id;
  }
}

/* Cliquer n'importe ou dans un bloc le rend actif — pas seulement sur sa
   barre de titre. Une seule ecoute deleguee sur le conteneur : les quatre
   types de blocs (normal, cardio, texte, chrono) partagent `class="bloc"` et
   `id="bloc-<id>"`, et un type ajoute demain en heritera sans rien faire.
   Les boutons deplacer/supprimer arretent la propagation pour leurs propres
   raisons : ils ne changent donc pas le bloc actif, ce qui est souhaitable. */
document.addEventListener('click', function(e){
  var zone = document.getElementById('sessionArea');
  if (!zone || !zone.contains(e.target)) return;
  var el = e.target.closest ? e.target.closest('.bloc') : null;
  if (!el || !el.id || el.id.indexOf('bloc-') !== 0) return;
  var id = el.id.slice(5);
  if (id && id !== activeBloc) setActiveBloc(id);
});

function clearBlocs(){
  if(!blocs.length) return;
  if(!confirm('Vider tous les blocs ?')) return;
  blocs = []; etapes = [];
  activeBloc = null;
  _draftSave();
  renderSession();
  renderLib(document.getElementById('searchInput').value.toLowerCase());
}

function clearSession(){
  if(blocs.length===0) return;
  if(!confirm('Effacer toute la séance ?')) return;
  blocs = []; etapes = [];
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

/* ── Nom du patient en clair dans l'URL, pour reconnaître le lien au premier coup d'œil
   (dans l'historique de partage, un SMS envoyé, etc.) — affichage uniquement, l'identification
   réelle reste l'id ; athlete.html ignore ce paramètre. ── */
function _shareNomParam(){
  if(!_progPatient) return '';
  var nom = ((_progPatient.prenom||'')+' '+(_progPatient.nom||'')).trim();
  return nom ? '&nom=' + encodeURIComponent(nom) : '';
}

/* ── Génère le lien athlete.html?prog=ID ── */
function _athleteLink(id){
  return window.location.href.replace(/\/[^/]+$/, '/athlete.html') + '?prog=' + id + _shareNomParam();
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
  var donnees = { blocs: JSON.parse(JSON.stringify(blocs||[])), etapes: JSON.parse(JSON.stringify(etapes||[])), notes: getNotes() };
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
/* ── Réordonnancement des exercices ─────────────────────────────────────── */
function moveExo(blocId, idx, dir){
  var bloc = blocs.find(function(b){ return b.id === blocId; });
  if(!bloc) return;
  var newIdx = idx + dir;
  if(newIdx < 0 || newIdx >= bloc.exos.length) return;
  var moved = bloc.exos.splice(idx, 1)[0];
  bloc.exos.splice(newIdx, 0, moved);
  renderSession();
}

/* ── Réordonnancement des blocs ─────────────────────────────────────────── */
/* Monter ou descendre un bloc d'un cran, en sautant les séparateurs : franchir
   un séparateur, c'est changer d'étape, et ça se fait alors d'un seul geste. */
function moveBloc(idx, dir){
  var moved = blocs[idx];
  if(!moved || _estMarqueur(moved)) return;
  var newIdx = idx + dir;
  // Une flèche ne franchit pas un séparateur. Elle le faisait, et le bloc
  // changeait alors d'étape en silence tout en sautant par-dessus son voisin.
  if(newIdx < 0 || newIdx >= blocs.length || _estMarqueur(blocs[newIdx])) return;
  blocs.splice(idx, 1);
  blocs.splice(newIdx, 0, moved);
  _syncEtapeIds();
  _relettrerEtape(moved.etapeId||null);
  renderSession();
  if(typeof _draftSaveLazy === 'function') _draftSaveLazy();
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
/* ── Ajouter : un seul point d'entrée, à n'importe quel endroit ───────
   Un menu unique remplace les boutons épars, et un « + » discret s'intercale
   entre chaque élément : on ajoute au bon endroit du premier coup, au lieu
   d'ajouter à la fin puis de déplacer. */
var _menuAjoutOuvert = null;      // index d'insertion du menu actuellement ouvert

var TYPES_BLOC = [
  { id:'exos',   label:'Bloc d\'exercices', fn:'addBloc' },
  { id:'cardio', label:'Cardio',            fn:'addCardioBloc' },
  { id:'amrap',  label:'AMRAP',            fn:'addAmrapBloc' },
  { id:'emom',   label:'EMOM',             fn:'addEmomBloc' },
  { id:'texte',  label:'Texte libre',       fn:'addTexteBloc' },
];

function _fermerMenuAjout(){
  _menuAjoutOuvert = null;
  document.querySelectorAll('.add-menu').forEach(function(m){ m.remove(); });
  document.removeEventListener('click', _fermerMenuAjout, true);
  window.removeEventListener('scroll', _fermerMenuAjout, true);
  window.removeEventListener('resize', _fermerMenuAjout, true);
}

/* `sansEtape` : ouvert depuis l'intérieur d'une étape, le menu ne propose pas
   d'en créer une — une étape dans une étape n'a pas de sens. */
function ouvrirMenuAjout(ev, atIndex, sansEtape){
  ev.stopPropagation();
  var cle = atIndex + (sansEtape ? ':e' : '');
  var deja = _menuAjoutOuvert === cle;
  var bouton = ev.currentTarget;
  _fermerMenuAjout();
  if(deja) return;
  _menuAjoutOuvert = cle;

  var html = '<div class="add-menu">';
  TYPES_BLOC.forEach(function(t){
    html += '<button class="add-menu-item" onclick="event.stopPropagation();_fermerMenuAjout();'
          + t.fn + '(' + atIndex + ')">' + escH(t.label) + '</button>';
  });
  if(!sansEtape){
    html += '<div class="add-menu-sep"></div>'
          + '<button class="add-menu-item" onclick="event.stopPropagation();_fermerMenuAjout();addEtape('
          + atIndex + ')">' + _ETAPE_ICO_FOLDER + 'Étape</button>';
  }
  html += '</div>';

  // Le menu est posé sur le <body>, en position fixe : accroché à son bouton, il
  // héritait du contexte d'empilement de la barre d'outils et passait SOUS les
  // blocs — ses deux premières entrées disparaissaient derrière l'en-tête du
  // premier bloc.
  document.body.insertAdjacentHTML('beforeend', html);
  var menu = document.body.lastElementChild;
  var r = bouton.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = Math.round(r.bottom + 4) + 'px';
  menu.style.left = Math.round(r.left + r.width / 2) + 'px';
  menu.style.transform = 'translateX(-50%)';
  // Ne jamais déborder de la fenêtre
  var m = menu.getBoundingClientRect();
  if(m.right > window.innerWidth - 8){
    menu.style.left = Math.round(window.innerWidth - 8 - m.width / 2) + 'px';
  }
  if(m.left < 8) menu.style.left = Math.round(8 + m.width / 2) + 'px';
  if(m.bottom > window.innerHeight - 8){
    menu.style.top = Math.round(r.top - m.height - 4) + 'px';
  }

  setTimeout(function(){
    document.addEventListener('click', _fermerMenuAjout, true);
    window.addEventListener('scroll', _fermerMenuAjout, true);
    window.addEventListener('resize', _fermerMenuAjout, true);
  }, 0);
}

/* Le « + » intercalaire. `atIndex` est la position dans `blocs` où insérer. */
function _pointInsertion(atIndex){
  return '<div class="add-point"><button class="add-point-btn" title="Insérer ici" '
       + 'onclick="ouvrirMenuAjout(event,' + atIndex + ')">+</button></div>';
}

/* La rangée de fin, avec le même menu. */
function _renderAddRow(){
  return '<div class="bloc-add-row">'
       + '<button class="add-bloc-btn" onclick="ouvrirMenuAjout(event,-1)">+ Ajouter</button>'
       + '</div>';
}


function renderSession(){
  var area = document.getElementById('sessionArea');
  var clearBtn = document.getElementById('clearBlocsBtn');
  if(clearBtn) clearBtn.style.display = blocs.length ? '' : 'none';
  _normalizeEtapes();
  if(!blocs.length && !etapes.length){
    area.innerHTML = '<div class="empty-state" id="emptyState"><div class="icon">📋</div><p>Ajoutez un bloc puis sélectionnez des exercices<br>depuis la bibliothèque pour construire votre séance.</p></div>'
      + _renderAddRow();
    updateTargetBlocSelect();
    return;
  }
  var html = '';
  var _groups = _groupBlocsForRender();
  // Position parmi les ÉTAPES : c'est sur cette liste que moveEtape déplace.
  // La calculer sur les groupes affichés grisait des flèches à tort.
  var _etGroupes = _groups.filter(function(g){ return g.etapeId; });
  _groups.forEach(function(g){
  // Un « + » avant chaque groupe : c'est là qu'on insère au bon endroit.
  // Un point devant le séparateur, pour insérer AVANT l'étape. Devant une zone
  // libre il tomberait au même index que celui du premier bloc : doublon.
  if(g.etapeId) html += _pointInsertion(_indexMarqueur(g.etapeId));
  if(g.etapeId){
    var _ec = _etapeColor(g.etapeId);
    var _gPos = _etGroupes.findIndex(function(x){ return x.etapeId===g.etapeId; });
    var _haut = _gPos <= 0, _bas = _gPos < 0 || _gPos >= _etGroupes.length - 1;
    html += '<div class="etape-group" data-etapeid="'+g.etapeId+'" style="--etape-c:'+_ec+'">';
    html += '<div class="etape-header">';
    // Toujours affichées, y compris sur une étape vide : on doit pouvoir la
    // placer avant de la remplir.
    html += '<span class="etape-move-btns">'
          + '<button class="etape-move-btn"'+(_haut?' disabled':'')+' onclick="moveEtape(\''+g.etapeId+'\',-1)" aria-label="Monter l\'étape" title="'
          + (_haut ? 'Déjà la première étape' : 'Monter l\'étape et son contenu')+'">'+_ETAPE_ICO_UP+'</button>'
          + '<button class="etape-move-btn"'+(_bas?' disabled':'')+' onclick="moveEtape(\''+g.etapeId+'\',1)" aria-label="Descendre l\'étape" title="'
          + (_bas ? 'Déjà la dernière étape' : 'Descendre l\'étape et son contenu')+'">'+_ETAPE_ICO_DOWN+'</button>'
          + '</span>';
    html += '<input class="etape-title-input" value="'+escH(_etapeTitle(g.etapeId))+'" placeholder="Nom de l\'étape" oninput="renameEtape(\''+g.etapeId+'\',this.value)">';
    // Repliées derrière la couleur active : huit pastilles occupaient la ligne
    // en permanence pour un réglage qu'on touche une fois.
    html += '<span class="etape-swatches" data-open="0">';
    html += '<button class="etape-swatch active" style="background:'+_ec+'" onclick="_toggleSwatches(event)" title="Changer la couleur de l\'étape"></button>';
    ETAPE_COLORS.forEach(function(c){
      if(c === _ec) return;
      html += '<button class="etape-swatch repli" style="background:'+c+'" onclick="setEtapeColor(\''+g.etapeId+'\',\''+c+'\')" title="Couleur de l\'étape"></button>';
    });
    html += '</span>';
    html += '<button class="etape-tmpl-btn"'+(g.blocs.length?'':' disabled')+' onclick="openSaveEtapeTemplate(\''+g.etapeId+'\')" title="Enregistrer cette étape comme modèle">'+_ETAPE_ICO_SAVE+'</button>';
    html += '<button class="etape-del-btn" onclick="dissolveEtape(\''+g.etapeId+'\')" title="Dissoudre l\'étape — les blocs sont conservés dans la séance">'+_ETAPE_ICO_TRASH+'</button>';
    html += '</div>';
    if(!g.blocs.length){
      html += '<div class="etape-empty">Étape vide — créez un bloc ici, ou rattachez un bloc existant avec son menu « Étape ».</div>';
    }
  }
  g.blocs.forEach(function(b, _iDansGroupe){
    if(_estMarqueur(b)) return;          // le séparateur est déjà rendu par l'en-tête
    var idx = blocs.indexOf(b);
    html += _pointInsertion(idx);
    // ── Bloc Cardio ──
    if(b.type === 'cardio'){ html += _renderCardioBloc(b, idx); return; }
    if(b.type === 'texte'){  html += _renderTexteBloc(b, idx);  return; }
    if(b.type === 'amrap' || b.type === 'emom'){ html += _renderChronoBloc(b, idx); return; }
    // ── Bloc Renforcement ──
    var isActive = b.id===activeBloc;
    html += '<div class="bloc" id="bloc-'+b.id+'">';
    html += '<div class="bloc-header'+(isActive?' actif':'')+'" data-blocid="'+b.id+'" onclick="setActiveBloc(\''+b.id+'\')">';
    html += '<span class="bloc-move-btns">'
          + '<button class="bloc-move-btn"'+(_estPremierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',-1)" title="Monter">↑</button>'
          + '<button class="bloc-move-btn"'+(_estDernierDuGroupe(idx)?' disabled':'')+' onclick="event.stopPropagation();moveBloc('+idx+',1)" title="Descendre">↓</button>'
          + '</span>';
    html += '<input class="bloc-title-input" value="'+escH(b.title)+'" placeholder="Nom du bloc" oninput="updateBlocTitle(\''+b.id+'\',this.value)">';
    html += _selectEtape(b);
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
      /* `_methSel` : le mode SELECTION, distinct du choix de la methode.
         Auparavant, choisir une methode remplacait durablement les fleches de
         deplacement par des cases a cocher — on ne pouvait plus reordonner les
         exercices du bloc, et rien ne rendait la main. Le mode s'ouvre au
         choix d'une methode, se ferme des qu'on a applique. */
      if(methObj && !b._methSel){
        html += '<button class="meth-select-all-btn" onclick="_ouvrirSelMethode(\''+b.id+'\')" title="Choisir les exercices auxquels appliquer la méthode">Sélectionner…</button>';
      }
      if(methObj && b._methSel){
        var allChecked = b.exos.length > 0 && b.exos.every(function(e){ return e._methChecked === true; });
        html += '<button class="meth-select-all-btn" onclick="_toggleAllExoChecks(\''+b.id+'\')" title="'+(allChecked?'Tout désélectionner':'Tout sélectionner')+'">'
              + (allChecked ? '☑ Tout désélectionner' : '☐ Tout sélectionner')
              + '</button>';
        html += '<button class="meth-apply-btn" onclick="applyMethode(\''+b.id+'\')">Appliquer à la sélection</button>';
      }
    }
    html += '</div>';
    /* Plus de carte de methode. Choisir une methode est un RACCOURCI DE SAISIE :
       elle ecrit les parametres dans les colonnes, et les colonnes sont ensuite
       la seule verite. Une description au niveau du bloc ne pouvait que
       repeter ce que Duree, Series, Recup et Cible affichent deja — ou pire,
       laisser croire qu'une consigne valait pour des exercices qu'elle ne
       touchait pas, la methode ne s'appliquant qu'a une selection.
       Ce qui doit etre explique au patient l'est par le praticien, dans la
       consigne de l'exercice. */
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

        }
        html += '<div class="exo-row">';
        if(methObj && b._methSel){
          var isChecked = (e._methChecked === true);
          html += '<div class="exo-move-btns" style="justify-content:center;">'
                + '<input type="checkbox" class="exo-meth-check" id="exo-check-'+b.id+'-'+e.id+'"'
                + (isChecked ? ' checked' : '')
                + ' style="accent-color:'+objColor+';"'
                + ' onchange="_onExoCheckChange(this)"'
                + ' onclick="event.stopPropagation()">'
                + '</div>';
        } else {
          html += '<div class="exo-move-btns">'
                + '<button class="exo-move-btn"'+(idx===0?' disabled':'')+' onclick="moveExo(\''+b.id+'\','+idx+',-1)" title="Monter">↑</button>'
                + '<button class="exo-move-btn"'+(idx===b.exos.length-1?' disabled':'')+' onclick="moveExo(\''+b.id+'\','+idx+',1)" title="Descendre">↓</button>'
                + '</div>';
        }
        html += '<div class="exo-name-cell">';
        if(e.free){
          html += '<input class="exo-name-input" type="text" value="'+escH(e.name||'')+'" placeholder="Nom de l\'exercice…" oninput="updateExoName(\''+b.id+'\',\''+e.id+'\',this.value)">';
        } else {
          html += '<div class="exo-name">'+escH(e.name)
               +  (e._methApplied ? '<span class="meth-applied-badge">✓ méthode appliquée</span>' : '')+'</div>';
        }
        html += '<div class="exo-sub">';
        if(e.url){ var _vt=_ytThumbHtml(e.url); html += _vt ? _vt : '<a class="vid-link" href="'+escH(e.url)+'" target="_blank">▶ Vidéo</a>'; }
        var exoMin=estimateExoMin(e); if(exoMin!==null) html+='<span class="time-tag">⏱ '+fmtMin(exoMin)+'</span>';

        html += '</div></div>';
        html += '<div class="reps-wrap">'
             +  '<span class="cell-lbl">Reps</span>'
             +  '<input class="cell-input" type="text" value="'+escH(e.reps)+'" placeholder="—" title="Répétitions" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'reps\',this.value)">'
             +  '<button class="percote-toggle'+(e.perCote?' active':'')+'" data-percote="'+b.id+'-'+e.id+'" onclick="togglePerCote(\''+b.id+'\',\''+e.id+'\')" title="Par côté">/côté</button>'
             +  '</div>';
        html += '<div class="cell-wrap"><span class="cell-lbl">Durée</span><input class="cell-input" type="text" value="'+escH(e.duree)+'" placeholder="—" title="Durée" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'duree\',this.value)"></div>';
        html += '<div class="cell-wrap"><span class="cell-lbl">Séries</span><input class="cell-input" type="text" value="'+escH(e.series)+'" placeholder="—" title="Séries" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'series\',this.value)"></div>';
        html += '<div class="chain-recup-wrap">'
             +  '<span class="cell-lbl">Récup</span>'
             +  '<input class="cell-input'+(exoChained?' chain-dim':'')+'" type="text" value="'+escH(e.recup)+'" placeholder="—" title="Récupération" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'recup\',this.value)">';
        if(idx < b.exos.length - 1){
          html += '<button class="chain-icon-toggle'+(exoChained?' active':'')+'"'
               +  ' onclick="toggleExoChain(\''+b.id+'\',\''+e.id+'\')"'
               +  ' title="'+(exoChained?'Désactiver l\'enchaînement':'Enchaîner avec le suivant')+'">';
          html += '<svg width="11" height="11" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="m511.36 99.922-18.544 71.516a19.973 19.973 0 0 1 -24.379 14.34l-73.637-19.093a20 20 0 1 1 10.039-38.719l25.722 6.669c-53.134-76.492-151.853-110.186-241.641-80.325a211.136 211.136 0 0 0 -134 132.783 20 20 0 1 1 -37.83-13 254.846 254.846 0 0 1 59.71-96.121 249.919 249.919 0 0 1 99.5-61.617 252.632 252.632 0 0 1 289.673 99.245l6.667-25.712a20 20 0 0 1 38.72 10.039zm-28.86 212.568a20 20 0 0 0 -25.413 12.417 211.136 211.136 0 0 1 -134 132.783c-89.787 29.861-188.507-3.833-241.638-80.325l25.722 6.669a20 20 0 1 0 10.029-38.719l-73.64-19.093a20 20 0 0 0 -24.379 14.34l-18.541 71.516a20 20 0 1 0 38.72 10.039l6.667-25.712a252.738 252.738 0 0 0 289.673 99.241 249.932 249.932 0 0 0 99.5-61.618 254.838 254.838 0 0 0 59.71-96.125 20 20 0 0 0 -12.41-25.413z"/></svg>';
          html += '</button>';
        }
        html += '</div>';
        html += '<div class="cell-wrap"><span class="cell-lbl">Tempo</span><input class="cell-input" type="text" value="'+escH(e.tempo)+'" placeholder="—" title="Tempo" oninput="updateField(\''+b.id+'\',\''+e.id+'\',\'tempo\',this.value)"></div>';
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
        var nrsTxt = nrsVal !== null ? 'EVA '+nrsVal+'/10' : 'EVA —';
        var nrsCol = nrsVal === null ? '#9AA0A8' : nrsVal <= 3 ? '#16A34A' : nrsVal <= 6 ? '#F59E0B' : '#DC2626';
        html += '<div class="exo-consigne-row">'
             +  '<div class="exo-consigne-inner">'
             +  '<button class="nrs-badge" data-nrs="'+b.id+'-'+e.id+'" style="color:'+nrsCol+';border-color:'+(nrsVal!==null?nrsCol:'#CBD2DB')+'" onclick="toggleNrsPop(\''+b.id+'\',\''+e.id+'\',event)" title="Douleur NRS (0-10)">'+nrsTxt+'</button>'
             +  '<textarea rows="1" class="exo-consigne-ta'+(consigneVal?' has-value':'')+'"'
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
  }); // g.blocs
  // Pas de point APRÈS un groupe : il tomberait au même index que celui d'avant
  // le groupe suivant. La fin de séance est couverte par « + Ajouter », la fin
  // d'une étape par « + Bloc dans cette étape ».
  if(g.etapeId){
    // Le même menu que partout ailleurs : le bouton imposait un bloc
    // d'exercices. L'index est calculé au clic, les positions bougeant.
    html += '<button class="etape-addbloc-btn" onclick="ouvrirMenuAjout(event,_finDeGroupe(\''+g.etapeId+'\'),1)">+ Ajouter dans cette étape</button>';
    html += '</div>'; // .etape-group
  }
  }); // _groups
  /* « + Ajouter » passe AVANT les notes : on compose la seance de haut en bas,
     et le bouton d'ajout se trouvait derriere un pave de texte. Les notes
     ferment la seance, ce qui est leur place. */
  html += _renderAddRow();
  // Notes
  html += '<div class="notes-bloc"><div class="notes-label">Notes / Consignes</div>';
  html += '<textarea class="notes-ta" id="sessionNotes" placeholder="Conseils, progressions, points d\'attention…" oninput="autoResizeTa(this);if(typeof _notes!==\'undefined\'){_notes=this.value;_draftSaveLazy();}">'+escH(getNotes())+'</textarea></div>';
  area.innerHTML = html;
  updateTargetBlocSelect();
  // Auto-resize des consignes déjà remplies + notes
  // Différé via rAF : le layout doit être calculé avant de mesurer scrollHeight
  requestAnimationFrame(function(){
    // Toutes les zones qui grandissent a la frappe doivent aussi grandir au
    // rendu, sinon elles rouvrent a leur hauteur minimale et COUPENT leur
    // contenu : le bloc de texte libre, les consignes d'un bloc chrono ou
    // cardio, celles d'un exercice, et les notes de seance.
    area.querySelectorAll('.exo-consigne-ta.has-value, .texte-ta, .cardio-txt')
      .forEach(function(ta){ if(ta.value) autoResizeTa(ta); });
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
    +'.logo{display:inline-flex;align-items:center;gap:8px;margin-bottom:8px}'
    +'.logo svg{display:block;flex-shrink:0}'
    +'.logo .w{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}'
    +'.logo .r{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em}'
    +'.logo .e{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#7FA8D9;margin:0 .05em 0 .01em;line-height:0}'
    +'.logo .p{font-family:\'Poppins\',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-.025em;margin-left:.02em}'
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
    +'</style><link rel="stylesheet" href="/fonts/fonts.css"></head><body>'
    +'<div class="header">'
    +'<div class="logo"><svg viewBox="8 34 164 104" width="24" height="15" aria-hidden="true"><g stroke="#4A90D9" stroke-width="17" stroke-linecap="round" fill="none"><line x1="20" y1="118" x2="56" y2="104"/><line x1="70" y1="122" x2="100" y2="84"/><line x1="112" y1="125" x2="134" y2="66"/><line x1="158" y1="128" x2="158" y2="46"/></g></svg><span class="w"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></span></div>'
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
  Promise.all([
    _fetchRetry(SUPA_URL_P + '/rest/v1/exercices_library?order=created_at.asc', { headers: _sbHeaders() })
      .then(function(r){ return r.ok ? r.json() : null; }),
    _loadUserExercises()
  ])
  .then(function(results){
    var data = results[0];
    if(!Array.isArray(data)) return;
    /* Séparer les marqueurs de suppression globale des exercices réels */
    var deletedMarkers = new Set(data.filter(function(e){ return e.type === '__deleted__'; }).map(function(e){ return e.id; }));
    var realData = data.filter(function(e){ return e.type !== '__deleted__'; });
    _supaExoIds = {};
    realData.forEach(function(e){ _supaExoIds[e.id] = true; });
    /* supaIds inclut defaults modifiés + marqueurs supprimés → exclus des defaults */
    var supaIds = new Set(data.map(function(e){ return e.id; }));
    /* Sync cache local des supprimés de defaults */
    deletedMarkers.forEach(function(id){ _deletedDefaultIds.add(id); });
    // Defaults : exclure ceux remplacés par Supabase (modifiés) ET ceux supprimés globalement
    var filteredDefaults = LIBRARY_DEFAULT.filter(function(e){
      return !supaIds.has(e.id) && !_deletedDefaultIds.has(e.id);
    });
    var supaExos = realData.map(function(e){
      return { id: e.id, name: e.name, zone: e.zone||'', type: e.type||'',
               url: e.url||'', obj: e.obj||'',
               patterns: Array.isArray(e.patterns) ? e.patterns : [],
               _fromSupa: true };
    });
    LIBRARY = filteredDefaults.concat(supaExos).concat(_userExercises);
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
        var deletedMarkers2 = new Set(data.filter(function(e){ return e.type === '__deleted__'; }).map(function(e){ return e.id; }));
        var realData2 = data.filter(function(e){ return e.type !== '__deleted__'; });
        _supaExoIds = {};
        realData2.forEach(function(e){ _supaExoIds[e.id] = true; });
        var supaIds2 = new Set(data.map(function(e){ return e.id; }));
        deletedMarkers2.forEach(function(id){ _deletedDefaultIds.add(id); });
        var filteredDefs = LIBRARY_DEFAULT.filter(function(e){
          return !supaIds2.has(e.id) && !_deletedDefaultIds.has(e.id);
        });
        var supaExos2 = realData2.map(function(e){
          return { id:e.id, name:e.name, zone:e.zone||'', type:e.type||'', url:e.url||'', obj:e.obj||'', patterns:Array.isArray(e.patterns)?e.patterns:[], _fromSupa:true };
        });
        LIBRARY = filteredDefs.concat(supaExos2);
      }
      LIBRARY = LIBRARY.concat(_userExercises);
      // Filtre explicite (pas seulement un ordre d'opérations) : l'éditeur (admin) ne
      // doit JAMAIS lister/pouvoir toucher les exercices personnels d'un praticien — la
      // sync PATCH/DELETE de saveEditor() se base sur ces deux variables.
      var _cleanForEditor = LIBRARY.filter(function(e){ return !e._isPrivate; });
      _editorOriginalIds = _cleanForEditor.map(function(e){ return e.id; });
      _editorData = _cleanForEditor.map(function(e){ return Object.assign({},e); });
      renderEditor();
    })
    .catch(function(){
      var _cleanForEditor = LIBRARY.filter(function(e){ return !e._isPrivate; });
      _editorOriginalIds = _cleanForEditor.map(function(e){ return e.id; });
      _editorData = _cleanForEditor.map(function(e){ return Object.assign({},e); });
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
  // _editorData ne contient jamais d'exercices personnels (voir openEditor) — on les
  // rajoute ici pour que la sidebar les retrouve après la sauvegarde de la bibliothèque.
  LIBRARY = _editorData.filter(function(e){ return e.name.trim(); }).concat(_userExercises);

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
        // Exercice hardcodé non encore dans Supabase → marqueur global __deleted__ + cache local
        if(defaultIds.has(id) && !_supaExoIds[id]){
          _deletedDefaultIds.add(id);
          localStorage.setItem('r4p-deleted-defaults', JSON.stringify([..._deletedDefaultIds]));
          _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library', {
            method:'POST',
            headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
            body: JSON.stringify({ id: id, name: '', type: '__deleted__', created_by: _progUid })
          }).then(function(r){ if(r.ok) _supaExoIds[id] = true; });
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
  // Exercice hardcodé non encore dans Supabase → marqueur global __deleted__ + cache local
  if(defaultIds.has(exId) && !_supaExoIds[exId]){
    _deletedDefaultIds.add(exId);
    localStorage.setItem('r4p-deleted-defaults', JSON.stringify([..._deletedDefaultIds]));
    _fetchRetry(SUPA_URL_P+'/rest/v1/exercices_library', {
      method:'POST',
      headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
      body: JSON.stringify({ id: exId, name: '', type: '__deleted__', created_by: _progUid })
    }).then(function(r){ if(r.ok) _supaExoIds[exId] = true; });
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
  // bilan.html vient d'être sauvegardé pour le patient actif : rafraîchir
  // les objectifs datés (repère 🎯 dans l'agenda) sans attendre un changement
  // de patient — sinon un objectif ajouté puis enregistré n'apparaît qu'après
  // avoir quitté/reselectionné le patient.
  if(e.data && e.data.type==='r4p-bilan-saved' && e.data.patientId){
    if(_progPatient && String(_progPatient.id)===String(e.data.patientId) && typeof _loadObjectifsForPatient==='function'){
      _loadObjectifsForPatient();
    }
  }
  // Génère les graphiques pevo pour le CR médecin (outils.html)
  if(e.data && e.data.type==='r4p-pevo-request'){
    var _reqPatId = e.data.patientId;
    var _pevoOrigin = window.location.origin;
    if(!_reqPatId){ window.parent.postMessage({type:'r4p-pevo-response',error:'no_patient'},_pevoOrigin); return; }
    if(!_progToken){ window.parent.postMessage({type:'r4p-pevo-response',error:'no_auth'},_pevoOrigin); return; }

    function _sendPevoGrid(){
      if(!_pevoData || !Object.keys(_pevoData).length){
        window.parent.postMessage({type:'r4p-pevo-response',error:'no_data'},_pevoOrigin); return;
      }
      var body = document.getElementById('pevoBody');
      var savedHTML = body ? body.innerHTML : '';
      var allSel = new Set(Object.keys(_pevoData));
      _renderPevoCharts(_pevoData, allSel);
      var grid = document.getElementById('pevoChartsGrid');
      var contentHTML = '';
      if(grid){
        var clone = grid.cloneNode(true);
        clone.querySelectorAll('.pevo-hit,.pevo-pill-toggles').forEach(function(el){ el.remove(); });
        contentHTML = clone.outerHTML;
      }
      if(body) body.innerHTML = savedHTML;
      if(!contentHTML){ window.parent.postMessage({type:'r4p-pevo-response',error:'no_data'},_pevoOrigin); return; }
      window.parent.postMessage({type:'r4p-pevo-response',contentHTML:contentHTML},_pevoOrigin);
    }

    if(_progPatient && String(_progPatient.id)===String(_reqPatId) && _pevoData){
      _sendPevoGrid(); return;
    }
    var _pevoUrl = SUPA_URL_P+'/rest/v1/seances_planifiees?patient_id=eq.'+_reqPatId
      +'&select=id,date,programme_id,programmes(nom,donnees),athlete_feedback(rpe,duree_min,douleur,effort,exo_data,submitted_at)&order=date.asc';
    _fetchRetry(_pevoUrl,{method:'GET',headers:_sbHeaders()})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!Array.isArray(data)||!data.length){
          window.parent.postMessage({type:'r4p-pevo-response',error:'no_data'},_pevoOrigin); return;
        }
        _pevoData        = _extractExoLoads(data);
        _pevoNrsData     = _extractExoNRS(data);
        _pevoDureeData   = _extractExoDurations(data);
        _pevoCardioData  = _extractCardioLoads(data);
        _pevoCapPainData = _extractCapPainData(data);
        _sendPevoGrid();
      })
      .catch(function(){ window.parent.postMessage({type:'r4p-pevo-response',error:'fetch_error'},_pevoOrigin); });
    return;
  }
  // La cloche de notifications demande l'ouverture d'une séance dans le builder
  if(e.data && e.data.type==='r4p-open-seance' && e.data.seanceId && e.data.progId){
    _openChipInBuilder(e.data.progId, e.data.date || '', e.data.seanceId, !!e.data.openFeedback);
    return;
  }
  // "Tout marquer lu" depuis la cloche → retirer toutes les pastilles agenda
  if(e.data && e.data.type==='r4p-fb-seen-all'){
    if(typeof _fbUnseen !== 'undefined'){ _fbUnseen = {}; _applyFbDots(); }
    return;
  }
  // La cloche demande l'ouverture d'un rappel de note (patient deja selectionne par le parent)
  if(e.data && e.data.type==='r4p-open-note' && e.data.noteId){
    if(typeof _loadCalNotes === 'function') _loadCalNotes();
    if(typeof _openCalNoteView === 'function') _openCalNoteView(e.data.noteId);
    return;
  }
  // Nouveau token reçu depuis index.html après refresh automatique
  // On met à jour uniquement le token — le rôle et les favoris ne changent pas entre deux refreshs,
  // donc on évite les toggles DOM de _applyRoleUI() qui causaient un flash visuel.
  if(e.data && e.data.type==='r4p-token-refreshed' && e.data.access_token){
    _progToken = e.data.access_token;
    try {
      var pl = JSON.parse(atob(_progToken.split('.')[1]));
      _progUid = pl.sub || null;
    } catch(ex){}
  }
  if(e.data && e.data.type==='r4p-patient-selected'){
    _progPatient = _normalizePatient(e.data.patient);
    _currentProgId = null;
    _currentProgRawDonnees = null;
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
      _fetchFavsFromSupabase();
    }
    // Auto-remplir le champ nom du patient + mettre à jour toute l'UI
    if(_progPatient){
      var pnEl = document.getElementById('patientName');
      if(pnEl) pnEl.value = _progPatient.prenom + ' ' + _progPatient.nom;
    }
    // Changement de patient pendant que le builder est ouvert : revenir à l'agenda plutôt
    // que de rester sur le builder de l'ancien patient. Le brouillon auto-sauvegardé est
    // propre à cette session de builder (pas au patient) — on le vide pour éviter qu'il soit
    // proposé plus tard sur un AUTRE patient (_draftRestore ne vérifie que le protocole actif,
    // pas l'identité du patient).
    var _builderPanelEl = document.getElementById('builderPanel');
    if(_builderPanelEl && _builderPanelEl.classList.contains('open')){
      try { _draftClear(); } catch(ex){}
      try { _exitBuilderMode(); } catch(ex){}
    }
    // Recherche + filtres de la bibliothèque d'exercices : propres à la session de builder en
    // cours, jamais au patient — on repart d'un état neutre à chaque changement de patient.
    var _searchEl = document.getElementById('searchInput');
    if(_searchEl) _searchEl.value = '';
    try { setFilterAll(); } catch(ex){}
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
var _currentProgRawDonnees = null; // Métadonnées du programme chargé (type, ref1RM, pct, etc.) — préservées au save
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
        _fetchFavsFromSupabase();
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
  // Charger les cycles du patient depuis Supabase (synchrone, pas de setTimeout —
  // voir la version prog-main.js pour le detail du bug d'ordonnancement corrige)
  if(_progPatient && typeof _loadCyclesForPatient==="function") _loadCyclesForPatient();
  if(_progPatient && typeof _loadObjectifsForPatient==="function") _loadObjectifsForPatient();
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
  var donnees = { blocs: JSON.parse(JSON.stringify(blocs||[])), etapes: JSON.parse(JSON.stringify(etapes||[])), notes: getNotes() };
  if(_builderLinkedPhase) donnees.linkedPhase = _builderLinkedPhase;
  // Préserver les métadonnées HSR / CAP (type, ref1RM, pct, sets, reps, phase_key, exercice, …)
  if(_currentProgRawDonnees && _currentProgRawDonnees.type){
    var _skipKeys = {blocs:1, notes:1, linkedPhase:1};
    Object.keys(_currentProgRawDonnees).forEach(function(k){
      if(!_skipKeys[k]) donnees[k] = _currentProgRawDonnees[k];
    });
  }
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
    } else if(!isNew){
      // Mettre à jour le nom dans le cache local des chips pour que le calendrier
      // reflète immédiatement le nouveau nom sans re-fetch réseau.
      (_cloudCalEvents||[]).forEach(function(ev){
        if(ev.programme_id === _currentProgId && ev.programmes){
          ev.programmes.nom = nomProg;
        }
      });
      // Re-rendre l'agenda depuis le cache mis à jour (sinon le chip garde l'ancien nom).
      if(typeof _renderCalendarUI === 'function') _renderCalendarUI();
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

/* ── Auto-sauvegarde silencieuse de la liaison de phase ──────────────── */
function _autoSavePhaseLinkage(){
  if(!_currentProgId || !_progPatient || !_progUid || !_progToken) return;
  var donnees = { blocs: JSON.parse(JSON.stringify(blocs||[])), etapes: JSON.parse(JSON.stringify(etapes||[])), notes: getNotes() };
  if(_builderLinkedPhase) donnees.linkedPhase = _builderLinkedPhase;
  // Préserver les métadonnées HSR / CAP
  if(_currentProgRawDonnees && _currentProgRawDonnees.type){
    var _skipPhase = {blocs:1, notes:1, linkedPhase:1};
    Object.keys(_currentProgRawDonnees).forEach(function(k){
      if(!_skipPhase[k]) donnees[k] = _currentProgRawDonnees[k];
    });
  }
  _fetchRetry(SUPA_URL_P + '/rest/v1/programmes?id=eq.' + _currentProgId, {
    method: 'PATCH',
    headers: Object.assign({}, _sbHeaders(), {'Prefer':'return=minimal'}),
    body: JSON.stringify({ donnees: donnees })
  }).then(function(r){
    if(!r.ok) return;
    (_cloudCalEvents||[]).forEach(function(ev){
      if(ev.programme_id === _currentProgId && ev.programmes){
        ev.programmes.donnees = donnees;
      }
    });
    if(typeof _renderCalendarUI === 'function') _renderCalendarUI();
  }).catch(function(e){ console.warn('Auto-save phase linkage failed:', e); });
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
        var key = _norm(name).replace(/\s+/g,' ');
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

/* Retrouve le nom d'un exercice depuis la cle de feedback (« b0e2 », ou
   « cardio-1 »). Les index sont ceux de la liste SANS separateurs d'etape,
   telle que l'espace athlete l'affiche. Renvoie '' si la cle ne correspond a
   rien dans la seance fournie — on garde alors le nom stocke.

   `source` est la liste de blocs de LA seance a laquelle appartient ce
   feedback. Trois lecteurs s'en servent, tous sur des seances differentes :
   le panneau Feedback du builder, le journal, et les courbes de douleur. Un
   nom stocke a pu etre fausse (la collecte cote athlete numerotait sur une
   liste NON filtree des separateurs, l'affichage sur la liste filtree) — la
   CLE, elle, designe bien ce que l'athlete avait sous les yeux. */
function _nomDepuisCleFeedback(cle, source){
  if(!cle || !source || !source.length) return '';
  var reels = source.filter(function(b){
    return b && b.type !== 'etape' && b.type !== 'libre';
  });
  var mc = String(cle).match(/^cardio-(\d+)$/);
  if(mc){
    var bc = reels[parseInt(mc[1], 10)];
    return (bc && (bc.sport || 'Cardio')) || '';
  }
  var m = String(cle).match(/^b(\d+)e(\d+)$/);
  if(!m) return '';
  var b = reels[parseInt(m[1], 10)];
  if(!b || !b.exos) return '';
  var e = b.exos[parseInt(m[2], 10)];
  return (e && e.name) || '';
}

/* Extrait les données NRS (douleur) par exercice à partir des séances chargées.
   Deux sources fusionnées : NRS praticien (exo.nrs dans donnees) et douleur
   athlète (athlete_feedback.exo_data.exos[].pain). L'athlète est prioritaire
   sur une même date/exercice. */
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
  function _addPt(name, date, nrs, fromAthlete) {
    var key = _norm(name).replace(/\s+/g,' ');
    if(!map[key]) map[key] = { nom: name, pts: {} };
    var existing = map[key].pts[date];
    // Athlète prioritaire : n'écrase pas un point athlète par un NRS praticien
    if(existing && existing.fromAthlete && !fromAthlete) return;
    map[key].pts[date] = { date: date, nrs: nrs, fromAthlete: !!fromAthlete };
  }

  // 1. NRS praticien (exo.nrs dans les donnees du programme)
  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    blocs.forEach(function(bloc) {
      (bloc.exos || []).forEach(function(exo) {
        var name = (exo.name || '').trim();
        if(!name) return;
        if(exo.nrs === null || exo.nrs === undefined) return;
        _addPt(name, prog.date, exo.nrs, false);
      });
    });
  });

  // 2. Douleur athlète (athlete_feedback.exo_data.exos)
  seances.forEach(function(s) {
    var fb = s.athlete_feedback;
    var exos = (fb && fb.exo_data && fb.exo_data.exos) ? fb.exo_data.exos : [];
    // Les points sont regroupes PAR NOM : un nom fausse ferait migrer la
    // douleur sur la courbe d'un autre exercice. On le recalcule depuis la cle
    // sur les blocs de cette seance-la.
    var rawS = (s.programmes && s.programmes.donnees) || {};
    if(typeof rawS === 'string'){ try { rawS = JSON.parse(rawS || '{}'); } catch(e){ rawS = {}; } }
    var blocsS = Array.isArray(rawS) ? rawS : (rawS.blocs || []);
    exos.forEach(function(ex) {
      var name = (_nomDepuisCleFeedback(ex.key, blocsS) || ex.name || '').trim();
      if(!name) return;
      if(ex.pain === null || ex.pain === undefined) return;
      _addPt(name, s.date || '', ex.pain, true);
    });
  });

  var result = {};
  Object.keys(map).forEach(function(key) {
    var pts = Object.keys(map[key].pts).map(function(d){ return map[key].pts[d]; })
      .sort(function(a,b){ return a.date < b.date ? -1 : 1; });
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
        var key = _norm(name).replace(/\s+/g,' ') + '__duree';
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

/* ── Helpers cardio évolution ──────────────────────────────────────── */

/* Normalise une durée stockée au format numérique "Xm" → notation min/sec lisible.
   Ex : "1.5m" → "1'30" · "2m" → "2'" · "0.5m" → "30s" · "1'30" → "1'30" (inchangé) */
function _normDureeStr(s) {
  if (s === null || s === undefined || s === '') return s;
  var str = String(s).trim();
  var m = str.match(/^(\d+(?:\.\d+)?)m$/i);
  if (!m) return str; // déjà formaté correctement
  var mins = parseFloat(m[1]);
  if (mins === 0.5) return '30s';
  var whole = Math.floor(mins);
  var secs  = Math.round((mins - whole) * 60);
  if (secs === 0) return whole + '\'';
  return whole + '\'' + (secs < 10 ? '0' : '') + secs;
}

/* Convertit une chaîne durée (duree_effort) en minutes. */
function _parseCardioMinutes(str) {
  if(str === null || str === undefined || str === '') return null;
  str = String(str).trim();
  if(/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);        // nombre seul → minutes
  var m = str.match(/^(\d+(?:\.\d+)?)\s*min/i);
  if(m) return parseFloat(m[1]);
  m = str.match(/^(\d+(?:\.\d+)?)\s*s(?:ec)?/i);
  if(m) return parseFloat(m[1]) / 60;
  m = str.match(/^(\d+):(\d{2})$/);
  if(m) return parseInt(m[1]) + parseInt(m[2]) / 60;
  return null;
}

/* Types de cibles numériques (hors zone FC et allure qui ont un traitement spécial). */
var _CARDIO_NUM_TYPES = ['watts', 'RPE', 'bpm', '%FC', 'cal', 'distance (m)'];

/* Extrait la valeur numérique scalaire d'une cible cardio. */
function _extractCibleVal(c) {
  if(!c || !c.type) return null;
  if(c.type === 'zone FC') {
    var mz = String(c.min || '').match(/Z?(\d)/i);
    return mz ? parseInt(mz[1]) : null;
  }
  if(c.type === 'allure') {
    var ma = String(c.min || '').match(/^(\d+):(\d{2})$/);
    return ma ? (parseInt(ma[1]) * 60 + parseInt(ma[2])) : null;
  }
  if(_CARDIO_NUM_TYPES.indexOf(c.type) >= 0) {
    var v = parseFloat(c.min);
    return isNaN(v) ? null : v;
  }
  return null;
}

/* Formate une valeur d'intensité selon son type (affichage). */
function _formatCardioIntensity(val, type) {
  if(val === null || val === undefined || isNaN(val)) return '—';
  if(type === 'zone FC')    return 'Z' + Math.round(val);
  if(type === 'RPE')        return val.toFixed(1) + '/10';
  if(type === 'watts')      return Math.round(val) + ' W';
  if(type === 'bpm')        return Math.round(val) + ' bpm';
  if(type === '%FC')        return val.toFixed(0) + '% FC';
  if(type === 'cal')        return Math.round(val) + ' cal';
  if(type === 'distance (m)') return Math.round(val) + ' m';
  if(type === 'allure') {
    var s = Math.round(val);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '/km';
  }
  return val.toFixed(1);
}

/* Formate un delta d'intensité (avec signe, unités). */
function _formatCardioIntensityDelta(delta, type) {
  if(delta === null || isNaN(delta)) return '';
  var sign = delta >= 0 ? '+' : '-';
  var abs = Math.abs(delta);
  if(type === 'zone FC')    return sign + Math.round(abs) + ' zone';
  if(type === 'RPE')        return sign + abs.toFixed(1) + '/10';
  if(type === 'watts')      return sign + Math.round(abs) + ' W';
  if(type === 'bpm')        return sign + Math.round(abs) + ' bpm';
  if(type === '%FC')        return sign + abs.toFixed(0) + '% FC';
  if(type === 'cal')        return sign + Math.round(abs) + ' cal';
  if(type === 'distance (m)') return sign + Math.round(abs) + ' m';
  if(type === 'allure') {
    // Pour l'allure, une réduction = amélioration → inverser le signe affiché
    var s = Math.round(abs);
    return (delta <= 0 ? '+' : '-') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '/km';
  }
  return sign + abs.toFixed(1);
}

/* Formate une durée en minutes en chaîne lisible. */
function _formatDureeMin(min) {
  if(min === null || min === undefined || isNaN(min)) return '—';
  var v = Math.round(min * 10) / 10;
  var h = Math.floor(v / 60);
  var m = Math.round(v % 60);
  if(h > 0) return h + 'h' + String(m).padStart(2, '0');
  return (v % 1 === 0 ? Math.round(v) : v.toFixed(1)) + ' min';
}

function _extractCardioLoads(seances) {
  // Dédupliquer par programme_id + date
  var seenKeys = {};
  var progList = [];
  seances.forEach(function(s) {
    if(!s.programme_id || !s.programmes) return;
    var key = (s.date || '') + '|' + s.programme_id;
    if(!seenKeys[key]) {
      seenKeys[key] = true;
      progList.push({ date: s.date || '', donnees: s.programmes.donnees });
    }
  });

  // sessionData[groupKey][date] = { totalDuree, hasDuree, intensiteSum, intensiteCount, metricFreq }
  var sessionData = {};
  var groupMetricFreq = {}; // groupKey → metricType → nb de sessions

  progList.forEach(function(prog) {
    var raw = prog.donnees || {};
    var blocs = Array.isArray(raw) ? raw : (raw.blocs || []);
    var date = prog.date;

    blocs.forEach(function(bloc) {
      if(bloc.type !== 'cardio') return;
      var sport      = bloc.sport || 'general';
      var effortType = bloc.effort_type || 'continu';
      var isFrac     = effortType === 'fractionne';
      var groupKey   = sport + '|' + effortType;

      // Durée effective
      var duree = null;
      if(isFrac) {
        var reps = parseFloat(bloc.repetitions);
        var effortMin = _parseCardioMinutes(bloc.duree_effort);
        if(!isNaN(reps) && reps > 0 && effortMin !== null) duree = reps * effortMin;
      }
      if(duree === null) {
        var dt = parseFloat(bloc.duree_totale);
        if(!isNaN(dt) && dt > 0) duree = dt;
      }

      var km = null;
      var distVal = parseFloat(bloc.distance);
      if(!isNaN(distVal) && distVal > 0) km = distVal;

      // Première cible numérique valide
      var ciblesArr = isFrac ? (bloc.frac_cibles || []) : (bloc.cibles || []);
      var intensite = null, iType = null;
      for(var ci = 0; ci < ciblesArr.length; ci++) {
        var v = _extractCibleVal(ciblesArr[ci]);
        if(v !== null) { intensite = v; iType = ciblesArr[ci].type; break; }
      }

      // Agréger par session
      if(!sessionData[groupKey]) sessionData[groupKey] = {};
      if(!sessionData[groupKey][date]) {
        sessionData[groupKey][date] = { totalDuree: 0, hasDuree: false, totalKm: 0, hasKm: false, intensiteSum: 0, intensiteCount: 0, metricFreq: {} };
      }
      var sd = sessionData[groupKey][date];
      if(duree !== null) { sd.totalDuree += duree; sd.hasDuree = true; }
      if(km !== null) { sd.totalKm += km; sd.hasKm = true; }
      if(intensite !== null && iType) {
        sd.intensiteSum += intensite;
        sd.intensiteCount++;
        sd.metricFreq[iType] = (sd.metricFreq[iType] || 0) + 1;
      }
    });
  });

  // Détecter la métrique dominante par groupe (la plus fréquente sur l'ensemble des séances)
  Object.keys(sessionData).forEach(function(groupKey) {
    if(!groupMetricFreq[groupKey]) groupMetricFreq[groupKey] = {};
    Object.keys(sessionData[groupKey]).forEach(function(date) {
      var sd = sessionData[groupKey][date];
      // Métrique dominante de cette session
      var bestType = null, bestCount = 0;
      Object.keys(sd.metricFreq).forEach(function(t) {
        if(sd.metricFreq[t] > bestCount) { bestCount = sd.metricFreq[t]; bestType = t; }
      });
      if(bestType) groupMetricFreq[groupKey][bestType] = (groupMetricFreq[groupKey][bestType] || 0) + 1;
    });
  });

  var dominantMetric = {};
  Object.keys(groupMetricFreq).forEach(function(groupKey) {
    var freq = groupMetricFreq[groupKey];
    var best = null, bestCount = 0;
    Object.keys(freq).forEach(function(t) {
      if(freq[t] > bestCount) { bestCount = freq[t]; best = t; }
    });
    dominantMetric[groupKey] = best;
  });

  // Construire les points triés par date
  var result = {};
  Object.keys(sessionData).forEach(function(groupKey) {
    var domMetric = dominantMetric[groupKey] || null;
    var dates = Object.keys(sessionData[groupKey]).sort();
    var points = [];
    dates.forEach(function(date) {
      var sd = sessionData[groupKey][date];
      points.push({
        date:      date,
        duree:     sd.hasDuree ? sd.totalDuree : null,
        km:        sd.hasKm ? sd.totalKm : null,
        intensite: sd.intensiteCount > 0 ? sd.intensiteSum / sd.intensiteCount : null
      });
    });

    // Nécessite ≥2 points avec durée OU ≥2 points avec km
    var withDuree = points.filter(function(p){ return p.duree !== null; });
    var withKm    = points.filter(function(p){ return p.km !== null; });
    if(withDuree.length < 2 && withKm.length < 2) return;

    var parts = groupKey.split('|');
    var sport = parts[0], effortType = parts[1];
    var sportLabel = (CARDIO_SPORTS.find(function(s){ return s.val === sport; }) || {label: sport}).label;
    var effortLabel = (CARDIO_EFFORT_TYPES.find(function(e){ return e.val === effortType; }) || {label: effortType}).label;

    result[groupKey] = {
      label:         sportLabel + ' — ' + effortLabel,
      intensiteType: domMetric,
      points:        points
    };
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

/* SVG courbe cardio — axe gauche : durée (vert), axe droit : intensité dominante (orange). */
function _buildPevoCardioChart(pts, chartId, intensiteType, useKm) {
  var dureePts    = (pts || []).filter(function(p){ return p.duree !== null; });
  var kmPts       = (pts || []).filter(function(p){ return p.km !== null; });
  var intensitePts = intensiteType ? (pts || []).filter(function(p){ return p.intensite !== null; }) : [];
  if(!useKm) useKm = dureePts.length < 2 && kmPts.length >= 2;
  var primaryPts  = useKm ? kmPts : dureePts;
  if(primaryPts.length < 2) return '';
  function fmtPrimary(v) { return useKm ? v.toFixed(1) + ' km' : _formatDureeMin(v); }
  function getPrimaryVal(p) { return useKm ? p.km : p.duree; }

  var hasInt = intensitePts.length >= 2;
  var VW = 500, VH = 115;
  var PAD = { top: 18, right: hasInt ? 54 : 22, bottom: 30, left: 50 };
  var CG = '#059669';
  var CO = '#D97706';

  var uid = 'cc' + String(chartId).replace(/[^a-z0-9]/gi, '');

  // Échelles axe gauche (durée ou km)
  var primaryVals = primaryPts.map(function(p){ return getPrimaryVal(p); });
  var minD = Math.min.apply(null, primaryVals), maxD = Math.max.apply(null, primaryVals);
  var padD = Math.max(useKm ? 0.1 : 0.5, (maxD - minD) * 0.18);
  minD = Math.max(0, minD - padD); maxD = maxD + padD;
  var rangeD = maxD - minD || 1;

  // Échelles intensité (axe droit)
  var minI = 0, maxI = 1, rangeI = 1;
  if(hasInt) {
    var intVals = intensitePts.map(function(p){ return p.intensite; });
    minI = Math.min.apply(null, intVals); maxI = Math.max.apply(null, intVals);
    if(intensiteType === 'zone FC') { minI = 0.5; maxI = 5.5; }
    else if(intensiteType === 'RPE') { minI = 0; maxI = 10; }
    else { var padI = Math.max(0.5, (maxI - minI) * 0.18); minI = Math.max(0, minI - padI); maxI += padI; }
    rangeI = maxI - minI || 1;
  }

  // Map dates → position X
  var allDates = pts.map(function(p){ return p.date; }).sort();
  var n = allDates.length;
  function xOf(date) { var i = allDates.indexOf(date); return PAD.left + (i / Math.max(n - 1, 1)) * (VW - PAD.left - PAD.right); }
  function yD(v) { return (VH - PAD.bottom) - ((v - minD) / rangeD) * (VH - PAD.top - PAD.bottom); }
  function yI(v) { return (VH - PAD.bottom) - ((v - minI) / rangeI) * (VH - PAD.top - PAD.bottom); }

  var html = '<defs>'
    + '<linearGradient id="'+uid+'g" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="'+CG+'" stop-opacity="0.2"/>'
    + '<stop offset="100%" stop-color="'+CG+'" stop-opacity="0.02"/></linearGradient>'
    + (hasInt
      ? '<linearGradient id="'+uid+'o" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0%" stop-color="'+CO+'" stop-opacity="0.15"/>'
        + '<stop offset="100%" stop-color="'+CO+'" stop-opacity="0.02"/></linearGradient>'
      : '')
    + '</defs>';

  // Grille + axe gauche (durée ou km)
  var stepD = Math.max(useKm ? 0.1 : 1, (maxD - minD) / 4);
  for(var gv = Math.floor(minD * (useKm ? 10 : 1)) / (useKm ? 10 : 1); gv <= maxD + stepD; gv += stepD) {
    var gy = yD(gv);
    if(gy < PAD.top || gy > VH - PAD.bottom + 2) continue;
    html += '<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html += '<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="'+CG+'">'+fmtPrimary(Math.max(0, gv))+'</text>';
  }

  // Axe droit (intensité)
  if(hasInt) {
    var ivArr;
    if(intensiteType === 'zone FC') { ivArr = [1, 2, 3, 4, 5]; }
    else if(intensiteType === 'RPE') { ivArr = [0, 2, 4, 6, 8, 10]; }
    else {
      ivArr = [];
      var stepI2 = Math.max(1, Math.ceil((maxI - minI) / 4));
      for(var iv = Math.floor(minI); iv <= maxI + stepI2; iv += stepI2) ivArr.push(iv);
    }
    ivArr.forEach(function(v2) {
      var gy2 = yI(v2);
      if(gy2 < PAD.top || gy2 > VH - PAD.bottom + 2) return;
      html += '<text x="'+(VW-PAD.right+5)+'" y="'+(gy2+4).toFixed(1)+'" text-anchor="start" font-size="9" fill="'+CO+'">'+_formatCardioIntensity(v2, intensiteType)+'</text>';
    });
  }

  // Axe X (dates)
  var shownDates = {};
  pts.forEach(function(p) {
    if(shownDates[p.date]) return; shownDates[p.date] = true;
    var dp = p.date ? p.date.split('-') : ['','',''];
    html += '<text x="'+xOf(p.date).toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+(dp[2]||'?')+'/'+(dp[1]||'?')+'</text>';
  });
  html += '<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';

  // ── Courbe durée ou km (vert, trait plein) ──
  var vpD = primaryPts.map(function(p){ return {x: xOf(p.date), y: yD(getPrimaryVal(p)), val: getPrimaryVal(p)}; });
  var lpD = 'M '+vpD[0].x.toFixed(1)+','+vpD[0].y.toFixed(1);
  for(var i = 1; i < vpD.length; i++) { var cxD = (vpD[i-1].x + vpD[i].x) / 2; lpD += ' C '+cxD.toFixed(1)+','+vpD[i-1].y.toFixed(1)+' '+cxD.toFixed(1)+','+vpD[i].y.toFixed(1)+' '+vpD[i].x.toFixed(1)+','+vpD[i].y.toFixed(1); }
  var byD = VH - PAD.bottom;
  html += '<path data-line="duree" d="'+lpD+' L '+vpD[vpD.length-1].x.toFixed(1)+','+byD+' L '+vpD[0].x.toFixed(1)+','+byD+' Z" fill="url(#'+uid+'g)"/>';
  html += '<path data-line="duree" d="'+lpD+'" fill="none" stroke="'+CG+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  vpD.forEach(function(p, i) {
    var isFirst = i === 0, isLast = i === vpD.length - 1;
    var lbl = fmtPrimary(p.val);
    if(isLast) {
      html += '<circle data-line="duree" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+CG+'" opacity="0.18"/>';
      html += '<circle data-line="duree" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+CG+'"/>';
      html += '<text data-line="duree" x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+lbl+'</text>';
    } else {
      html += '<circle data-line="duree" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+CG+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html += '<text data-line="duree" x="'+p.x.toFixed(1)+'" y="'+(p.y-10).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+lbl+'</text>';
    }
  });

  // ── Courbe intensité (orange, tirets) ──
  if(hasInt) {
    var vpI = intensitePts.map(function(p){ return {x: xOf(p.date), y: yI(p.intensite), val: p.intensite}; });
    var lpI = 'M '+vpI[0].x.toFixed(1)+','+vpI[0].y.toFixed(1);
    for(var j = 1; j < vpI.length; j++) { var cxI = (vpI[j-1].x + vpI[j].x) / 2; lpI += ' C '+cxI.toFixed(1)+','+vpI[j-1].y.toFixed(1)+' '+cxI.toFixed(1)+','+vpI[j].y.toFixed(1)+' '+vpI[j].x.toFixed(1)+','+vpI[j].y.toFixed(1); }
    var byI = VH - PAD.bottom;
    html += '<path data-line="intensite" d="'+lpI+' L '+vpI[vpI.length-1].x.toFixed(1)+','+byI+' L '+vpI[0].x.toFixed(1)+','+byI+' Z" fill="url(#'+uid+'o)"/>';
    html += '<path data-line="intensite" d="'+lpI+'" fill="none" stroke="'+CO+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,3"/>';
    vpI.forEach(function(p, j) {
      var isLast2 = j === vpI.length - 1;
      if(isLast2) {
        html += '<circle data-line="intensite" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+CO+'" opacity="0.18"/>';
        html += '<circle data-line="intensite" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+CO+'"/>';
      } else {
        html += '<circle data-line="intensite" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="2.5" fill="#fff" stroke="'+CO+'" stroke-width="1.5"/>';
      }
    });
  }

  return '<svg class="pevo-chart-svg" data-pevo-id="pevo'+chartId+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
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
  var gId = 'gnrs'+String(chartId).replace(/[^a-z0-9]/gi,'');
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
function _buildPevoChart(vals, dates, chartId, meta, nrsPts, todayLastIdx) {
  meta = meta || [];
  nrsPts = nrsPts || null;
  var VW=500, VH=115;
  // Determine si NRS a assez de points valides
  var nrsValidArr = nrsPts ? nrsPts.filter(function(v){ return v!==null && !isNaN(v); }) : [];
  var hasNrs = nrsValidArr.length >= 2;
  var PAD={top:18, right: hasNrs ? 38 : 22, bottom:34, left:10};
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
  // (grille Y et labels axe supprimés)
  // Dates X (partagées)
  var shownD={};
  pts.forEach(function(p){ if(shownD[p.date])return; shownD[p.date]=true; html+='<text x="'+p.x.toFixed(1)+'" y="'+(VH-PAD.bottom+13)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+p.date+'</text>'; });
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  // Ligne verticale "Aujourd'hui" (mode Programmé uniquement)
  if(todayLastIdx !== null && todayLastIdx !== undefined && todayLastIdx >= 0 && todayLastIdx < n-1){
    var tlx1 = pt(todayLastIdx, minV).x, tlx2 = pt(todayLastIdx+1, minV).x;
    var tlx = (tlx1+tlx2)/2;
    html+='<line x1="'+tlx.toFixed(1)+'" y1="'+PAD.top+'" x2="'+tlx.toFixed(1)+'" y2="'+(VH-PAD.bottom)+'" stroke="#D4600A" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>';
    html+='<text x="'+(tlx+4).toFixed(1)+'" y="'+(PAD.top+9).toFixed(1)+'" font-size="8" fill="#D4600A" font-weight="700" opacity="0.85">Auj.</text>';
  }
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
var _pevoCapPainData = null; // [{date, pain}] pour CAP — douleur EVA
var _pevoRawSeances  = null; // cache brut Supabase — évite un re-fetch au toggle
var _pevoShowFuture  = false; // false = séances ≤ aujourd'hui seulement

/* Attache les events tooltip sur les hit areas (même logique que bilan.html) */
var _pevoTtOpen = null;
var _pevoFilterDays = null; // null = tout, sinon jours
var _pevoFilterFrom = '';
var _pevoFilterTo   = '';
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

/* ── Barre de filtre de date pevo ── */
function _renderPevoFilterBar(){
  var presets = [{label:'1 mois',days:30},{label:'3 mois',days:90},{label:'6 mois',days:180},{label:'1 an',days:365}];
  var h = '<div class="pevo-filter-bar">';
  h += '<button class="pevo-filter-btn'+(_pevoFilterDays===null&&!_pevoFilterFrom?' active':'')+'" onclick="setPevoFilter(null)">Tout</button>';
  presets.forEach(function(p){
    h += '<button class="pevo-filter-btn'+(_pevoFilterDays===p.days?' active':'')+'" onclick="setPevoFilter('+p.days+')">'+p.label+'</button>';
  });
  var customActive = _pevoFilterFrom||_pevoFilterTo;
  h += '<button class="pevo-filter-btn'+(customActive?' active':'')+'" onclick="togglePevoCustomFilter()">🗓 Personnalisé</button>';
  h += '<div id="pevo-custom-dates" style="display:'+(customActive?'flex':'none')+';gap:6px;align-items:center;flex-wrap:wrap;width:100%;margin-top:4px;">';
  h += '<label style="font-size:.72rem;color:#6B6860">Du</label>';
  h += '<input type="date" id="pevo-date-from" value="'+(_pevoFilterFrom||'')+'" onchange="setPevoCustomFilter()" style="font-size:.78rem;padding:3px 6px;border:1px solid #D3D1CB;border-radius:6px;">';
  h += '<label style="font-size:.72rem;color:#6B6860">au</label>';
  h += '<input type="date" id="pevo-date-to" value="'+(_pevoFilterTo||'')+'" onchange="setPevoCustomFilter()" style="font-size:.78rem;padding:3px 6px;border:1px solid #D3D1CB;border-radius:6px;">';
  h += '</div>';
  h += '<button class="pevo-future-toggle'+(_pevoShowFuture?' active':'')+'" onclick="togglePevoFuture()" title="Inclure les séances futures programmées">'
    + (_pevoShowFuture ? '🔮 Programmé' : '📅 Réalisé') + '</button>';
  h += '</div>';
  return h;
}
function setPevoFilter(days){
  _pevoFilterDays = days; _pevoFilterFrom = ''; _pevoFilterTo = '';
  _renderPevoCharts(_pevoData||{}, _pevoGetSel(_progPatient?_progPatient.id:'local'));
}
function togglePevoCustomFilter(){
  var d = document.getElementById('pevo-custom-dates');
  if(d) d.style.display = d.style.display==='none'?'flex':'none';
}
function setPevoCustomFilter(){
  _pevoFilterFrom = (document.getElementById('pevo-date-from')||{}).value||'';
  _pevoFilterTo   = (document.getElementById('pevo-date-to')  ||{}).value||'';
  _pevoFilterDays = null;
  _renderPevoCharts(_pevoData||{}, _pevoGetSel(_progPatient?_progPatient.id:'local'));
}
function _pevoFilterPts(pts){
  if(!pts) return pts;
  return pts.filter(function(p){
    if(!p.date) return true;
    if(_pevoFilterDays !== null){
      var cutoff = new Date(new Date()-_pevoFilterDays*86400000).toISOString().slice(0,10);
      return p.date >= cutoff;
    }
    if(_pevoFilterFrom && p.date < _pevoFilterFrom) return false;
    if(!_pevoShowFuture && _pevoFilterTo && p.date > _pevoFilterTo) return false;
    return true;
  });
}

function _extractCapPainData(seances) {
  var points = [];
  seances.forEach(function(s) {
    var donnees = (s.programmes && s.programmes.donnees) || {};
    if (donnees.type !== 'cap') return;
    var fb = s.athlete_feedback;
    // Colonne dediee douleur (fallback legacy : rpe quand duree_min = effort <= 10)
    var pain = _fbDouleur(fb);
    pain = (pain !== null) ? parseFloat(pain) : null;
    if (pain === null || isNaN(pain)) return;
    points.push({ date: s.date, pain: pain });
  });
  points.sort(function(a, b) { return a.date.localeCompare(b.date); });
  return points.length >= 2 ? points : null;
}

/* ── Charge globale (UA) — tendance séance / semaine ──────────────────
   Réutilise _buildUaMap() de prog-main.js (RPE × durée + estimation Strava).
   Le Bilan de charge sous l'agenda reste la vue de pilotage hebdo ;
   ici on lit la trajectoire longue durée, calée sur le filtre de période. */
var _pevoUaMode = 'seance'; // 'seance' | 'semaine'

function setPevoUaMode(mode){
  _pevoUaMode = mode;
  _renderPevoCharts(_pevoData||{}, _pevoGetSel(_progPatient?_progPatient.id:'local'));
}

function _buildUaSeanceChart(pts, chartId){
  var VW=500, VH=120, PAD={top:20,right:18,bottom:30,left:40};
  var n = pts.length;
  var maxV = Math.max.apply(null, pts.map(function(p){ return p.ua; }));
  if(!(maxV > 0)) return '';
  function pxy(i,v){ return { x: PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y: (VH-PAD.bottom)-(v/maxV)*(VH-PAD.top-PAD.bottom) }; }
  var C = '#4A90D9';
  var gId = 'gua'+String(chartId).replace(/[^a-z0-9]/gi,'');
  var html = '<defs><linearGradient id="'+gId+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+C+'" stop-opacity="0.18"/>'
    +'<stop offset="100%" stop-color="'+C+'" stop-opacity="0.02"/>'
    +'</linearGradient></defs>';
  [0, 0.5, 1].forEach(function(f){
    var gy = pxy(0, maxV*f).y;
    html += '<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html += '<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+Math.round(maxV*f)+'</text>';
  });
  // Labels dates espacés (max ~6)
  var step = Math.max(1, Math.ceil(n/6));
  pts.forEach(function(p, i){
    if(i%step !== 0 && i !== n-1) return;
    var d = p.date ? p.date.split('-') : ['','',''];
    html += '<text x="'+pxy(i,p.ua).x.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+(d[2]||'?')+'/'+(d[1]||'?')+'</text>';
  });
  html += '<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  var vp = pts.map(function(p,i){ var q=pxy(i,p.ua); return {x:q.x, y:q.y, ua:Math.round(p.ua)}; });
  var lp = 'M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
  for(var i=1;i<vp.length;i++){ var cx=(vp[i-1].x+vp[i].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1); }
  var by = VH-PAD.bottom;
  html += '<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#'+gId+')"/>';
  html += '<path d="'+lp+'" fill="none" stroke="'+C+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  vp.forEach(function(p, i){
    var isFirst=i===0, isLast=i===vp.length-1;
    if(isLast){
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+C+'" opacity="0.15"/>';
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+C+'"/>';
      html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--navy)">'+p.ua+' UA</text>';
    } else {
      html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+C+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
      if(isFirst) html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="#9D9B96">'+p.ua+'</text>';
    }
  });
  return '<svg viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

function _buildUaWeekChart(weeks, chartId){
  var VW=500, VH=140, PAD={top:26,right:12,bottom:38,left:40};
  var n = weeks.length;
  var maxV = Math.max.apply(null, weeks.map(function(w){ return w.ua; }));
  if(!(maxV > 0)) return '';
  var plotW = VW-PAD.left-PAD.right, plotH = VH-PAD.top-PAD.bottom;
  var bw = Math.min(42, plotW/n*0.62);
  var html = '';
  [0, 0.5, 1].forEach(function(f){
    var gy = (VH-PAD.bottom)-f*plotH;
    html += '<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html += '<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+Math.round(maxV*f)+'</text>';
  });
  html += '<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="#E8E6E1" stroke-width="1"/>';
  weeks.forEach(function(w, i){
    var cx = PAD.left + (i+0.5)/n*plotW;
    var h = Math.max(2, w.ua/maxV*plotH);
    var pct = (i>0 && weeks[i-1].ua>0) ? Math.round((w.ua-weeks[i-1].ua)/weeks[i-1].ua*100) : null;
    var spike = pct !== null && pct > 30;
    var barCol = spike ? '#E67E22' : '#4A90D9';
    html += '<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+((VH-PAD.bottom)-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="4" fill="'+barCol+'" opacity="0.85"/>';
    html += '<text x="'+cx.toFixed(1)+'" y="'+((VH-PAD.bottom)-h-5).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+(spike?'#B45309':'var(--navy)')+'">'+w.ua+'</text>';
    var d = w.date ? w.date.split('-') : ['','',''];
    html += '<text x="'+cx.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+(d[2]||'?')+'/'+(d[1]||'?')+'</text>';
    if(pct !== null){
      var pCol = pct > 30 ? '#DC2626' : pct > 10 ? '#E67E22' : '#27AE60';
      html += '<text x="'+cx.toFixed(1)+'" y="'+(VH-PAD.bottom+24)+'" text-anchor="middle" font-size="8.5" font-weight="600" fill="'+pCol+'">'+(pct>=0?'+':'')+pct+'%</text>';
    }
  });
  return '<svg viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

function _buildUaTrendSection(){
  if(typeof _buildUaMap !== 'function' || typeof _getMondayOf !== 'function') return '';
  var uaMap;
  try { uaMap = _buildUaMap(); } catch(e){ return ''; }
  var today = new Date().toISOString().slice(0,10);
  var pts = Object.keys(uaMap).sort().map(function(d){ return { date: d, ua: uaMap[d] }; })
    .filter(function(p){ return p.ua > 0 && (_pevoShowFuture || p.date <= today); });
  pts = _pevoFilterPts(pts);
  if(!pts || pts.length < 2) return '';

  _pevoChartCtr++;
  var svg, kpiHtml, title;
  if(_pevoUaMode === 'semaine'){
    var wkMap = {};
    pts.forEach(function(p){
      var mon = _dateStr(_getMondayOf(new Date(p.date+'T12:00:00')));
      wkMap[mon] = (wkMap[mon]||0) + p.ua;
    });
    var weeks = Object.keys(wkMap).sort().map(function(m){ return { date: m, ua: Math.round(wkMap[m]) }; });
    if(weeks.length < 2) return '';
    svg = _buildUaWeekChart(weeks, _pevoChartCtr);
    title = 'UA cumulées par semaine';
    kpiHtml = '<span class="pevo-kpi-neutral">Début : '+weeks[0].ua+' UA</span>'
      +'<span class="pevo-kpi-neutral">→</span>'
      +'<span class="pevo-kpi-strong">Actuel : '+weeks[weeks.length-1].ua+' UA</span>';
  } else {
    svg = _buildUaSeanceChart(pts, _pevoChartCtr);
    title = 'UA par séance';
    kpiHtml = '<span class="pevo-kpi-neutral">Début : '+Math.round(pts[0].ua)+' UA</span>'
      +'<span class="pevo-kpi-neutral">→</span>'
      +'<span class="pevo-kpi-strong">Actuel : '+Math.round(pts[pts.length-1].ua)+' UA</span>';
  }
  if(!svg) return '';

  var toggle = '<div class="pevo-pill-toggles">'
    +'<button class="pevo-line-pill'+(_pevoUaMode==='seance'?' active':'')+'" style="color:#4A90D9;border-color:#4A90D9" onclick="setPevoUaMode(\'seance\')">● Séance</button>'
    +'<button class="pevo-line-pill'+(_pevoUaMode==='semaine'?' active':'')+'" style="color:#4A90D9;border-color:#4A90D9" onclick="setPevoUaMode(\'semaine\')">● Semaine</button>'
    +'</div>';

  return '<div class="pevo-select-section">'
    +'<div class="pevo-select-title" style="color:#4A90D9">⚡ Charge globale — UA (RPE × durée)</div>'
    +'</div>'
    +'<div class="pevo-charts"><div class="pevo-card">'
    +'<div class="pevo-card-header"><span class="pevo-card-title">'+title+'</span>'
    +'<div class="pevo-card-kpis">'+kpiHtml+'</div></div>'
    +toggle
    +svg
    +'</div></div>';
}

function _renderPevoCharts(exoData, selectedKeys) {
  var body = document.getElementById('pevoBody');
  if(!body) return;
  var allKeys = Object.keys(exoData);
  var dureeKeys = _pevoDureeData ? Object.keys(_pevoDureeData) : [];
  var cardioKeys = _pevoCardioData ? Object.keys(_pevoCardioData) : [];
  if(!allKeys.length && !dureeKeys.length && !cardioKeys.length && !_pevoCapPainData){
    var uaOnly = _buildUaTrendSection();
    body.innerHTML = _renderPevoFilterBar()
      + (uaOnly || '<div class="pevo-empty">Aucun exercice avec répétitions, durée ou cardio prescrit sur plusieurs séances.</div>');
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
    var pts = _pevoFilterPts(grp.points);
    if(!pts || pts.length < 2) return; // pas assez de points après filtrage
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
    // Label KPI "Actuel" vs "Prévu" selon si le dernier point est futur
    var todayStr = new Date().toISOString().slice(0,10);
    var lastIsFuture = _pevoShowFuture && pts[pts.length-1].date && pts[pts.length-1].date > todayStr;
    var lKpiLabel = lastIsFuture ? 'Prévu : ' : 'Actuel : ';
    // Indice du dernier point passé (pour ligne today sur SVG)
    var todayLastIdx = null;
    if(_pevoShowFuture){
      var _tli = -1;
      for(var _ti=0; _ti<pts.length; _ti++){ if(pts[_ti].date && pts[_ti].date <= todayStr) _tli = _ti; }
      var _hasFut = false;
      for(var _fi=0; _fi<pts.length; _fi++){ if(pts[_fi].date && pts[_fi].date > todayStr){ _hasFut=true; break; } }
      if(_tli >= 0 && _hasFut) todayLastIdx = _tli;
    }
    // Aligner les pts NRS sur les pts de charge (même timeline)
    var nrsPts = null, hasNrsData = false;
    if(_pevoNrsData && _pevoNrsData[key]) {
      var nrsMap = {};
      _pevoNrsData[key].pts.forEach(function(p){ nrsMap[p.date] = p.nrs; });
      nrsPts = pts.map(function(p){ return (nrsMap[p.date] !== undefined && nrsMap[p.date] !== null) ? nrsMap[p.date] : null; });
      hasNrsData = nrsPts.filter(function(v){ return v !== null; }).length >= 2;
    }
    var svg = _buildPevoChart(vals, dates, _pevoChartCtr, meta, nrsPts, todayLastIdx);
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
    var rmTag = allBwMeta ? '' : '<span class="pevo-kpi-neutral" style="font-size:.65rem;opacity:.7;">· 1RM</span>';
    chartsHtml += '<div class="pevo-card">'
      +'<div class="pevo-card-header">'
      +'<span class="pevo-card-title">'+escH(grp.label)+'</span>'
      +'<div class="pevo-card-kpis">'
      +'<span class="pevo-kpi-neutral">Début : '+fLabel+'</span>'
      +'<span class="pevo-kpi-neutral">→</span>'
      +'<span class="pevo-kpi-strong">'+lKpiLabel+lLabel+'</span>'
      +'<span class="pevo-kpi '+cls+'">'+dLabel+'</span>'
      +rmTag
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
      var iType = grp.intensiteType || null;
      var pts = _pevoFilterPts(grp.points);
      if(!pts || pts.length < 2) return;

      // KPI durée ou km
      var dPts = pts.filter(function(p){ return p.duree !== null; });
      var kPts = pts.filter(function(p){ return p.km !== null; });
      var useKmKpi = dPts.length < 2 && kPts.length >= 2;
      var primaryKpiPts = useKmKpi ? kPts : dPts;
      var dFirst = primaryKpiPts.length ? (useKmKpi ? primaryKpiPts[0].km : primaryKpiPts[0].duree) : null;
      var dLast  = primaryKpiPts.length ? (useKmKpi ? primaryKpiPts[primaryKpiPts.length - 1].km : primaryKpiPts[primaryKpiPts.length - 1].duree) : null;
      var dDelta = (dFirst !== null && dLast !== null) ? dLast - dFirst : null;
      var dCls   = dDelta === null || dDelta === 0 ? 'neutral' : (dDelta > 0 ? 'pos' : 'neg');
      var dSign  = dDelta !== null ? (dDelta >= 0 ? '+' : '-') : '';
      function fmtKpi(v) { return useKmKpi ? v.toFixed(1) + ' km' : _formatDureeMin(v); }

      // KPI intensité
      var iPts = iType ? pts.filter(function(p){ return p.intensite !== null; }) : [];
      var iFirst = iPts.length >= 2 ? iPts[0].intensite : null;
      var iLast  = iPts.length >= 2 ? iPts[iPts.length - 1].intensite : null;
      var iDelta = (iFirst !== null && iLast !== null) ? iLast - iFirst : null;
      var iCls   = iDelta === null || iDelta === 0 ? 'neutral' : (iDelta > 0 ? 'pos' : 'neg');
      var hasIntKpi = iFirst !== null && iLast !== null;

      var svg = _buildPevoCardioChart(pts, _pevoChartCtr, iType, useKmKpi);
      if(!svg) return;

      // Libellé du type d'intensité
      var iLabel = iType === 'zone FC' ? 'Zone FC' : iType === 'RPE' ? 'RPE' : iType === 'watts' ? 'Watts' : iType === 'bpm' ? 'FC' : iType === '%FC' ? '% FC' : iType === 'allure' ? 'Allure' : (iType || '');

      // Ligne KPI durée ou km
      var kpisHtml = '';
      if(dFirst !== null) {
        var kpiIcon = useKmKpi ? '📏 Distance :' : '⏱ Durée :';
        kpisHtml += '<div class="pevo-card-kpis">'
          +'<span style="font-size:.67rem;color:#059669;font-weight:700;white-space:nowrap;margin-right:2px">'+kpiIcon+'</span>'
          +'<span class="pevo-kpi-neutral">'+fmtKpi(dFirst)+'</span>'
          +'<span class="pevo-kpi-neutral">→</span>'
          +'<span class="pevo-kpi-strong">'+fmtKpi(dLast)+'</span>'
          +(dDelta !== null ? '<span class="pevo-kpi '+dCls+'">'+dSign+fmtKpi(Math.abs(dDelta))+'</span>' : '')
          +'</div>';
      }
      // Ligne KPI intensité
      if(hasIntKpi) {
        kpisHtml += '<div class="pevo-card-kpis">'
          +'<span style="font-size:.67rem;color:#D97706;font-weight:700;white-space:nowrap;margin-right:2px">⚡ '+escH(iLabel)+' :</span>'
          +'<span class="pevo-kpi-neutral">'+_formatCardioIntensity(iFirst, iType)+'</span>'
          +'<span class="pevo-kpi-neutral">→</span>'
          +'<span class="pevo-kpi-strong">'+_formatCardioIntensity(iLast, iType)+'</span>'
          +(iDelta !== null ? '<span class="pevo-kpi '+iCls+'">'+_formatCardioIntensityDelta(iDelta, iType)+'</span>' : '')
          +'</div>';
      }

      // Pills toggle (si intensité disponible)
      var toggleHtml = '';
      if(hasIntKpi) {
        var _cctr = _pevoChartCtr;
        var primaryLabel = useKmKpi ? 'Distance' : 'Durée';
        toggleHtml = '<div class="pevo-pill-toggles">'
          +'<button class="pevo-line-pill active" style="color:#059669;border-color:#059669" onclick="togglePevoPill(this,\'pevo'+_cctr+'\',\'duree\')">● '+primaryLabel+'</button>'
          +'<button class="pevo-line-pill active" style="color:#D97706;border-color:#D97706" onclick="togglePevoPill(this,\'pevo'+_cctr+'\',\'intensite\')">● '+escH(iLabel)+'</button>'
          +'</div>';
      }

      cardioChartsHtml += '<div class="pevo-card">'
        +'<div class="pevo-card-header">'
        +'<span class="pevo-card-title">'+escH(grp.label)+'</span>'
        +'<div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0">'+kpisHtml+'</div>'
        +'</div>'
        +toggleHtml
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

  // ── Section CAP — Douleur EVA ────────────────────────────────────────────
  var capPainSectionHtml = '';
  if (_pevoCapPainData) {
    var filteredCapPts = _pevoFilterPts(_pevoCapPainData);
    if (filteredCapPts && filteredCapPts.length >= 2) {
      _pevoChartCtr++;
      var nrsPts = filteredCapPts.map(function(p) { return { date: p.date, nrs: p.pain }; });
      var svg = _buildPevoNrsChart(nrsPts, _pevoChartCtr);
      var capFirst = filteredCapPts[0].pain;
      var capLast  = filteredCapPts[filteredCapPts.length - 1].pain;
      var capDelta = capLast - capFirst;
      var capCls   = capDelta === 0 ? 'neutral' : (capDelta < 0 ? 'pos' : 'neg'); // moins de douleur = positif
      capPainSectionHtml = '<div class="pevo-select-section">'
        + '<div class="pevo-select-title" style="color:#0d9488">🏃 CAP — Douleur à l\'effort</div>'
        + '</div>'
        + '<div class="pevo-charts"><div class="pevo-card">'
        + '<div class="pevo-card-header">'
        + '<span class="pevo-card-title">Douleur EVA (0–10)</span>'
        + '<div class="pevo-card-kpis">'
        + '<span class="pevo-kpi-neutral">S1 : ' + capFirst + '/10</span>'
        + '<span class="pevo-kpi-neutral">→</span>'
        + '<span class="pevo-kpi-strong">Actuel : ' + capLast + '/10</span>'
        + '<span class="pevo-kpi ' + capCls + '">' + (capDelta >= 0 ? '+' : '') + capDelta.toFixed(1) + '</span>'
        + '</div></div>'
        + svg
        + '</div></div>';
    }
  }

  var sep = '<div style="height:32px"></div>';
  var uaSectionHtml = _buildUaTrendSection();
  var parts = [uaSectionHtml, rmSection, dureeSectionHtml, cardioSectionHtml, capPainSectionHtml].filter(function(s){ return !!s; });
  body.innerHTML = _renderPevoFilterBar() + parts.join(sep);
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
    +'.doc-logo{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}'
    +'.doc-logo .r{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em}'
    +'.doc-logo .e{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#fff;margin:0 .05em 0 .01em;line-height:0}'
    +'.doc-logo .p{font-family:\'Poppins\',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-.025em;margin-left:.02em}'
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
    +'<link rel="stylesheet" href="/fonts/fonts.css">'
    +'<title>Évolution des charges — '+patNom+'</title>'
    +'<style>'+css+'</style></head><body><div class="page-wrap">'
    +'<div class="doc-header"><div class="doc-logo"><svg viewBox="8 34 164 104" width="26" height="16" aria-hidden="true"><g stroke="#4A90D9" stroke-width="17" stroke-linecap="round" fill="none"><line x1="20" y1="118" x2="56" y2="104"/><line x1="70" y1="122" x2="100" y2="84"/><line x1="112" y1="125" x2="134" y2="66"/><line x1="158" y1="128" x2="158" y2="46"/></g></svg><span class="w"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></span></div>'
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
  _pevoData = null; _pevoDureeData = null; _pevoCardioData = null; _pevoCapPainData = null;
  // Charger toutes les séances du patient avec les données du programme lié
  var url = SUPA_URL_P + '/rest/v1/seances_planifiees?patient_id=eq.' + _progPatient.id
    + '&select=id,date,programme_id,programmes(nom,donnees),athlete_feedback(rpe,duree_min,douleur,effort,exo_data,submitted_at)&order=date.asc';
  _fetchRetry(url, {method:'GET', headers:_sbHeaders()})
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!Array.isArray(data) || !data.length){
        body.innerHTML = '<div class="pevo-empty">Aucune séance planifiée pour ce patient.</div>';
        return;
      }
      _pevoRawSeances = data;
      _rebuildPevoData();
    })
    .catch(function(err){ body.innerHTML = '<div class="pevo-empty">Erreur réseau : '+(err&&err.message||err)+'</div>'; });
}

function closeChargesEvo() {
  document.getElementById('pevoOverlay').classList.remove('open');
}

function _rebuildPevoData() {
  var today = new Date().toISOString().slice(0,10);
  var seances = _pevoShowFuture
    ? _pevoRawSeances
    : _pevoRawSeances.filter(function(s){ return !s.date || s.date <= today; });
  _pevoData        = _extractExoLoads(seances);
  _pevoNrsData     = _extractExoNRS(seances);
  _pevoDureeData   = _extractExoDurations(seances);
  _pevoCardioData  = _extractCardioLoads(seances);
  _pevoCapPainData = _extractCapPainData(seances);
  var sel = _pevoGetSel(_progPatient ? _progPatient.id : 'local');
  _renderPevoCharts(_pevoData, sel);
}

function togglePevoFuture() {
  _pevoShowFuture = !_pevoShowFuture;
  if(_pevoRawSeances) _rebuildPevoData();
}

var _pendingOpenFeedback = false; // true si la cloche de notifications demande l'ouverture directe du feedback
function _loadProg(id, seanceId){
  _currentSeanceId = seanceId || null; // null si chargé depuis l'historique ou la bibliothèque
  _builderFromTemplate = null; // ce programme n'est pas (ou plus) un template chargé — évite le bouton "Mettre à jour le template" fantôme
  var url = SUPA_URL_P + '/rest/v1/programmes?id=eq.' + id + '&select=*';
  _fetchRetry(url, {method:'GET', headers:_sbHeaders()})
    .then(function(r){ return r.json(); })
    .then(function(data){
      var d = Array.isArray(data) ? data[0] : data;
      if(!d || d.code){ alert('Erreur lors du chargement.'); return; }
      _currentProgId = d.id;
      // Rétrocompat : donnees peut être un tableau (ancien) ou {blocs,notes} (nouveau).
      // Et parfois une CHAINE JSON : la planification depuis la barre latérale
      // recopiait telle quelle la valeur d'un template, qui est stockee en
      // chaine. La seance s'affichait alors vide. Corrige a la source, mais les
      // programmes deja crees ainsi restent en base — on les repare a la
      // lecture plutot que de les laisser inaccessibles.
      var raw = d.donnees || [];
      if(typeof raw === 'string'){
        try { raw = JSON.parse(raw || '{}'); } catch(e){ raw = []; }
      }
      if(Array.isArray(raw)){ blocs = raw; etapes = []; _notes = ''; _builderLinkedPhase = null; }
      else { blocs = raw.blocs || []; etapes = raw.etapes || []; _notes = raw.notes || ''; _builderLinkedPhase = raw.linkedPhase || null; }
      // Rétrocompat HSR : si le programme a perdu son type:'hsr' (ancien save écrasant),
      // le détecter via le nom de la séance calendrier et reconstruire les métadonnées de phase.
      if (!Array.isArray(raw) && !raw.type && seanceId) {
        var _retroEv = (_cloudCalEvents || []).filter(function(ev){ return String(ev.id) === String(seanceId); })[0];
        // Le nom est dans ev.programmes.nom (join Supabase), pas dans ev.nom directement
        var _retroNom = _retroEv ? ((_retroEv.programmes && _retroEv.programmes.nom) || _retroEv.nom || '') : '';
        if (_retroNom.indexOf('HSR —') === 0) {
          raw = Object.assign({}, raw, { type: 'hsr' });
          var _hrM = _retroNom.match(/HSR — ([\w-]+) · /);
          if (_hrM && typeof HSR_PHASES !== 'undefined') {
            var _hrPh = HSR_PHASES.filter(function(p){ return p.key === _hrM[1]; })[0];
            if (_hrPh) {
              if (!raw.pct)         raw.pct         = _hrPh.pct;
              if (!raw.sets)        raw.sets        = _hrPh.sets;
              if (!raw.reps)        raw.reps        = _hrPh.reps;
              if (!raw.phase_key)   raw.phase_key   = _hrPh.key;
              if (!raw.phase_label) raw.phase_label = _hrPh.w + ' · ' + _hrPh.rm;
              if (!raw.rm_label)    raw.rm_label    = _hrPh.rm;
            }
          }
          // Reconstruire session_index et total depuis la position dans _cloudCalEvents
          var _hsrAll = (_cloudCalEvents || []).filter(function(ev){
            var n = (ev.programmes && ev.programmes.nom) || ev.nom || '';
            return n.indexOf('HSR —') === 0;
          }).sort(function(a, b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
          var _hsrIdx = -1;
          for (var _hi = 0; _hi < _hsrAll.length; _hi++) {
            if (String(_hsrAll[_hi].id) === String(seanceId)) { _hsrIdx = _hi; break; }
          }
          if (_hsrIdx !== -1) {
            if (raw.session_index === undefined) raw.session_index = _hsrIdx;
            if (raw.total === undefined)         raw.total         = _hsrAll.length;
          }
        }
      }
      _currentProgRawDonnees = Array.isArray(raw) ? null : raw; // Préserver les métadonnées (type hsr/cap, ref1RM, …)
      // HSR : vider les blocs uniquement s'ils sont invalides (renfo sans tableau exos)
      // pour éviter le crash dans renderSession. Les blocs valides (avec exos) sont conservés.
      if (raw && raw.type === 'hsr') {
        // Un séparateur n'a pas d'exos et n'est pas invalide pour autant :
        // sans cette exception, ouvrir un HSR contenant des étapes vidait
        // toute la séance.
        var _hsrBlocInvalid = blocs.some(function(b){
          if(_estMarqueur(b) || b.type === 'cardio' || b.type === 'texte') return false;
          return !Array.isArray(b.exos);
        });
        if (_hsrBlocInvalid) blocs = [];
      }
      var pnEl = document.getElementById('patientName');
      if(pnEl) pnEl.value = d.nom || '';
      renderSession();
      _enterBuilderMode();
      try {
        if (typeof _renderCapBuilderBanner === 'function') {
          _renderCapBuilderBanner(Array.isArray(raw) ? {} : raw, _currentSeanceId);
        }
      } catch(e) { console.warn('CAP banner error:', e); }
      try {
        if (typeof _renderHsrBuilderBanner === 'function') {
          _renderHsrBuilderBanner(Array.isArray(raw) ? {} : raw, _currentSeanceId);
        }
      } catch(e) { console.warn('HSR banner error:', e); }
      try {
        if (typeof _renderStravaRealisedBanner === 'function') {
          _renderStravaRealisedBanner(_currentSeanceId);
        }
      } catch(e) { console.warn('Strava banner error:', e); }
      var overlay = document.getElementById('progHistoOverlay');
      if(overlay) overlay.style.display='none';
      var btn = document.getElementById('prog-cloud-save-btn');
      if(btn){ btn.textContent='✓ Programme chargé'; setTimeout(function(){ _refreshSaveBtn(); },2500); }
      if(typeof _renderAthleteRetour==='function') _renderAthleteRetour(seanceId);
      if(_pendingOpenFeedback){
        _pendingOpenFeedback = false;
        if(typeof _openFeedbackModal==='function') _openFeedbackModal();
      }
    })
    .catch(function(){ alert('Erreur lors du chargement.'); });
}

// Ouvrir un programme du calendrier dans le builder (clic sur chip)
function _openChipInBuilder(progId, dateStr, seanceId, openFeedback){
  if(_calDragJustEnded || _calDrag) return; // pas d'ouverture en fin de drag
  _hideLibPreview();
  _builderDate = dateStr;
  _updateBuilderTitle();
  _pendingOpenFeedback = !!openFeedback;
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
        _currentProgRawDonnees = null;
        blocs = []; etapes = [];
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
  _currentProgRawDonnees = null;
  blocs = []; etapes = [];
  renderSession();
  var overlay = document.getElementById('progHistoOverlay');
  if(overlay) overlay.style.display='none';
}

// Doit être défini avant renderLib() (utilisé dans renderLib pour hover/touch)
var _isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
// Initialise les filtres (affiche le dropdown articulation dès le chargement)
onTypeChange();

// ── Calculateur 1RM (tool panel) ────────────────────────────────

function _pRnd(v){ return Math.round(v*10)/10; }

var _pFORMULAS = [
  {name:'Brzycki', fn:function(w,r){ return r===1?w:w/(1.0278-0.0278*r); }},
  {name:'Epley',   fn:function(w,r){ return r===1?w:w*(1+r/30); }},
  {name:'Lander',  fn:function(w,r){ return r===1?w:(100*w)/(101.3-2.671*r); }},
  {name:'Lombardi',fn:function(w,r){ return w*Math.pow(r,0.1); }},
  {name:"O'Conner",fn:function(w,r){ return r===1?w:w*(1+r/40); }},
  {name:'Mayhew',  fn:function(w,r){ return r===1?w:(100*w)/(52.2+41.9*Math.exp(-0.055*r)); }},
];

var _pCHARGES = [
  {pct:100,reps:'1',    obj:'Force max / Test',          zone:'Maximale',       cls:'tp-zR'},
  {pct:95, reps:'2-3',  obj:'Force maximale',            zone:'Sub-Maximale',   cls:'tp-zO'},
  {pct:90, reps:'3-4',  obj:'Force / Puissance',         zone:'Sub-Maximale',   cls:'tp-zO'},
  {pct:85, reps:'4-6',  obj:'Force fonctionnelle',       zone:'Élevée',         cls:'tp-zY'},
  {pct:80, reps:'6-8',  obj:'Hypertrophie / Force',      zone:'Hypertrophie',   cls:'tp-zV'},
  {pct:75, reps:'8-10', obj:'Hypertrophie',              zone:'Hypertrophie',   cls:'tp-zV'},
  {pct:70, reps:'10-12',obj:'Hypertrophie / Endurance',  zone:'Modérée-Haute',  cls:'tp-zB'},
  {pct:65, reps:'12-15',obj:'Endurance de force',        zone:'Modérée',        cls:'tp-zG'},
  {pct:60, reps:'15-20',obj:'Endurance musculaire',      zone:'Modérée',        cls:'tp-zG'},
  {pct:55, reps:'20-25',obj:'Réathlétisation / Kiné',    zone:'Faible-Modérée', cls:'tp-zC'},
  {pct:50, reps:'25-30',obj:'Rééducation active',        zone:'Rééducation',    cls:'tp-zC'},
  {pct:40, reps:'30+',  obj:'Activation / Échauffement', zone:'Activation',     cls:'tp-zW'},
];

function _pCalcRM(){
  var w = parseFloat((document.getElementById('p-rm-poids')||{}).value)||0;
  var r = Math.min(parseInt((document.getElementById('p-rm-reps')||{}).value)||1,30);
  var exo = (document.getElementById('p-rm-exo')||{}).value||'';
  if(w<=0||r<1) return;
  var vals = _pFORMULAS.map(function(f){ return _pRnd(f.fn(w,r)); });
  var avg  = _pRnd(vals.reduce(function(a,b){return a+b;},0)/vals.length);
  var avgEl=document.getElementById('p-rm-avg');     if(avgEl) avgEl.textContent=avg+' kg';
  var lblEl=document.getElementById('p-rm-exo-lbl'); if(lblEl) lblEl.textContent=exo;
  var pillsEl=document.getElementById('p-rm-pills');
  if(pillsEl) pillsEl.innerHTML=_pFORMULAS.map(function(f,i){
    return '<div class="tp-pill'+(i===0?' best':'')+'"><div class="pv">'+vals[i]+' kg</div><div class="pl">'+f.name+'</div></div>';
  }).join('');
  var tbody=document.getElementById('p-rm-tbody');
  if(tbody) tbody.innerHTML=_pCHARGES.map(function(c){
    return '<tr><td style="font-weight:700">'+c.pct+'%</td>'
      +'<td style="font-weight:700;color:var(--navy)">'+_pRnd(avg*c.pct/100)+' kg</td>'
      +'<td>'+c.reps+'</td><td>'+c.obj+'</td>'
      +'<td class="'+c.cls+'">'+c.zone+'</td></tr>';
  }).join('');
}

// ── Calculateur Cardio (tool panel) ─────────────────────────────

var _pC_ALLURES = [
  {lbl:'Récupération',           pct:55},
  {lbl:'Endurance fondamentale', pct:70},
  {lbl:'Allure marathon',        pct:80},
  {lbl:'Seuil aérobie (SV1)',    pct:85},
  {lbl:'Seuil anaérobie (SV2)',  pct:92},
  {lbl:'VMA (100%)',             pct:100},
  {lbl:'Allure 5 km (~105%)',    pct:105},
];

var _pC_ZONES = [
  {z:'Z1',nom:'Récupération active',    pMin:50,pMax:60,benefit:'Récupération · blessures · débutants'},
  {z:'Z2',nom:'Endurance fondamentale', pMin:60,pMax:70,benefit:'Aérobie de base · brûlage graisses'},
  {z:'Z3',nom:'Aérobie modéré',         pMin:70,pMax:80,benefit:'Amélioration capacité cardiovasculaire'},
  {z:'Z4',nom:'Seuil anaérobie',        pMin:80,pMax:90,benefit:'Performance · tolérance lactate'},
  {z:'Z5',nom:'Anaérobie / Intensité max',pMin:90,pMax:100,benefit:'Filière anaérobie · effort maximal'},
];

var _pZ_COLORS = ['#9D9B96','#2D6A4F','#2980B9','#D4600A','#C0392B'];

function _pCMinKm(spd){
  if(!spd||spd<=0) return '--';
  var s=3600/spd, m=Math.floor(s/60), sc=Math.round(s%60);
  return m+':'+(sc<10?'0':'')+sc+'/km';
}
function _pCRnd(v,d){ d=d||1; return Math.round(v*Math.pow(10,d))/Math.pow(10,d); }

function _pg(id){ var e=document.getElementById(id); return e?e.value:''; }
function _ps(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }

function _pCalcCardio(){
  var age    = parseFloat(_pg('p-c-age'));
  var poids  = parseFloat(_pg('p-c-poids'));
  var taille = parseFloat(_pg('p-c-taille'));
  var fcrep  = parseFloat(_pg('p-c-fcrep'));
  var fcmaxM = parseFloat(_pg('p-c-fcmax-m'));
  var cooper     = parseFloat(_pg('p-c-cooper'));
  var demiCooper = parseFloat(_pg('p-c-demi-cooper'));
  var leger      = parseFloat(_pg('p-c-leger'));

  // IMC
  if(!isNaN(poids)&&!isNaN(taille)&&taille>0){
    var imc=_pCRnd(poids/Math.pow(taille/100,2));
    _ps('p-c-imc',imc+' kg/m²');
    var cat=imc<18.5?'Insuffisance pondérale':imc<25?'Poids normal':imc<30?'Surpoids':'Obésité';
    var col=(imc<18.5||imc>=30)?'#C0392B':imc>=25?'#D4600A':'#2D6A4F';
    var catEl=document.getElementById('p-c-imc-cat');
    if(catEl){catEl.textContent=cat;catEl.style.color=col;}
  } else { _ps('p-c-imc','--'); _ps('p-c-imc-cat','--'); }

  if(isNaN(age)||age<=0) return;

  // FCmax
  var fcmax, fcmaxSrc;
  if(!isNaN(fcmaxM)&&fcmaxM>0){
    fcmax=Math.round(fcmaxM); fcmaxSrc='Mesurée directement';
  } else {
    fcmax=Math.round(208-0.7*age); fcmaxSrc='Tanaka (2001) : 208 − 0.7 × âge';
  }
  _ps('p-c-fcmax-val',fcmax+' bpm');
  _ps('p-c-fcmax-src',fcmaxSrc);

  if(isNaN(fcrep)||fcrep<=0){ _ps('p-c-fcres','— Renseignez FC repos'); return; }

  var fcres=fcmax-fcrep;
  var fcres_lo=fcmax-(fcrep-2);
  var fcres_hi=fcmax-(fcrep+2);
  _ps('p-c-fcres',fcres+' bpm');
  _ps('p-c-fcrep-range','Plage : '+(fcrep-2)+' – '+(fcrep+2)+' bpm');

  var vo2,vma,vo2_lo,vo2_hi,vma_lo,vma_hi;
  if(!isNaN(cooper)&&cooper>0){
    vo2=_pCRnd((cooper-504.9)/44.73); vma=_pCRnd(cooper/200,2);
    vo2_lo=vo2; vo2_hi=vo2; vma_lo=vma; vma_hi=vma;
    _ps('p-c-vo2-src','Cooper 12min ('+cooper+' m)');
    _ps('p-c-vma-src','Cooper : distance / 200');
  } else if(!isNaN(demiCooper)&&demiCooper>0){
    vo2=_pCRnd((demiCooper/1000*14.49)-1.38); vma=_pCRnd(vo2/3.5,2);
    vo2_lo=vo2; vo2_hi=vo2; vma_lo=vma; vma_hi=vma;
    _ps('p-c-vo2-src','Demi-Cooper 6min ('+demiCooper+' m)');
    _ps('p-c-vma-src','Billat (VO₂/3.5)');
  } else if(!isNaN(leger)&&leger>0){
    vo2=_pCRnd(5.857*(8+0.5*(leger-1))-19.458); vma=_pCRnd(8+0.5*(leger-1),2);
    vo2_lo=vo2; vo2_hi=vo2; vma_lo=vma; vma_hi=vma;
    _ps('p-c-vo2-src','Léger-Boucher (palier '+leger+')');
    _ps('p-c-vma-src','Léger-Boucher (direct)');
  } else {
    vo2=_pCRnd(15*fcmax/fcrep);
    vo2_lo=_pCRnd(15*fcmax/(fcrep-2));
    vo2_hi=_pCRnd(15*fcmax/(fcrep+2));
    vma=_pCRnd(vo2/3.5,2); vma_lo=_pCRnd(vo2_lo/3.5,2); vma_hi=_pCRnd(vo2_hi/3.5,2);
    _ps('p-c-vo2-src','Uth 2004 — entre '+Math.min(vo2_lo,vo2_hi)+' et '+Math.max(vo2_lo,vo2_hi)+' ml/kg/min');
    _ps('p-c-vma-src','Billat — entre '+Math.min(vma_lo,vma_hi)+' et '+Math.max(vma_lo,vma_hi)+' km/h');
  }

  _ps('p-c-vo2',vo2+' ml/kg/min');
  _ps('p-c-vma',vma+' km/h');
  _ps('p-c-vma-allure',_pCMinKm(vma));

  var atbody=document.getElementById('p-c-allures-tbody');
  if(atbody){
    atbody.innerHTML=_pC_ALLURES.slice().reverse().map(function(a,i){
      var spd=_pCRnd(vma*a.pct/100,2);
      var spdLo=_pCRnd(Math.max(vma_lo,vma_hi)*a.pct/100,2);
      var spdHi=_pCRnd(Math.min(vma_lo,vma_hi)*a.pct/100,2);
      var fc_lo=Math.round((fcrep-2)+fcres_lo*a.pct/100);
      var fc_hi=Math.round((fcrep+2)+fcres_hi*a.pct/100);
      var allure_str=(vma_lo===vma_hi)?_pCMinKm(spd):'de '+_pCMinKm(spdLo)+' à '+_pCMinKm(spdHi);
      var fc_str=Math.min(fc_lo,fc_hi)+' à '+Math.max(fc_lo,fc_hi)+' bpm';
      var bg=i%2===0?'':'background:#F1F0ED;';
      return '<tr style="'+bg+'"><td style="font-weight:600">'+a.lbl+'</td>'
        +'<td style="font-weight:700;color:#2D6A4F">'+a.pct+'%</td>'
        +'<td style="color:#1A3A5C">'+spd+' km/h</td>'
        +'<td style="font-weight:700;color:#1A3A5C">'+allure_str+'</td>'
        +'<td style="color:#2D6A4F;font-weight:600">'+fc_str+'</td></tr>';
    }).join('');
  }

  var ztbody=document.getElementById('p-c-zones-tbody');
  if(ztbody){
    ztbody.innerHTML=_pC_ZONES.map(function(z,i){
      var fcMin_t=Math.round(Math.min((fcrep-2)+fcres_lo*z.pMin/100,(fcrep+2)+fcres_hi*z.pMin/100));
      var fcMax_t=Math.round(Math.max((fcrep-2)+fcres_lo*z.pMax/100,(fcrep+2)+fcres_hi*z.pMax/100));
      var bg=i%2===0?'':'background:#F1F0ED;';
      return '<tr style="'+bg+'"><td style="font-weight:700;color:'+_pZ_COLORS[i]+'">'+z.z+'</td>'
        +'<td style="font-weight:600">'+z.nom+'</td>'
        +'<td>'+z.pMin+'–'+z.pMax+'%</td>'
        +'<td style="font-weight:700;color:'+_pZ_COLORS[i]+'">'+fcMin_t+' à '+fcMax_t+' bpm</td>'
        +'<td style="font-size:.74rem;color:#6B6860">'+z.benefit+'</td></tr>';
    }).join('');
  }
}

function _pSyncCardioFromBilan(){
  try {
    var raw=localStorage.getItem('athletik-bilan');
    if(!raw) return;
    var data=JSON.parse(raw);
    var synced=[];
    var ageEl=document.getElementById('p-c-age');
    var wEl=document.getElementById('p-c-poids');
    var hEl=document.getElementById('p-c-taille');
    var sexEl=document.getElementById('p-c-sex');
    if(data['f-dob']&&ageEl&&!ageEl.value){
      var ag=new Date().getFullYear()-new Date(data['f-dob']).getFullYear();
      if(ag>0&&ag<120){ageEl.value=ag;synced.push('âge');}
    }
    if(data['f-poids']&&wEl&&!wEl.value){wEl.value=data['f-poids'];synced.push('poids');}
    if(data['f-taille']&&hEl&&!hEl.value){hEl.value=data['f-taille'];synced.push('taille');}
    if(data['f-sexe']&&sexEl){sexEl.value=data['f-sexe']==='F'?'0':'1';}
    if(synced.length>0){
      var banner=document.getElementById('p-cardio-banner');
      if(banner) banner.style.display='block';
      var sf=document.getElementById('p-cardio-sync-fields');
      if(sf) sf.textContent=synced.join(', ');
    }
  } catch(e){}
}

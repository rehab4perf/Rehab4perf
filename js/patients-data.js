/* ═══════════════════════════════════════════════════════════════════
   Rehab4Perf — Agrégations de l'onglet Patients.

   Fonctions PURES (aucun accès DOM, aucun réseau) : elles prennent les
   lignes brutes et rendent des compteurs. Isolé dans son propre fichier
   pour être testable et réutilisable.

   Deux principes appliqués partout :
   - Unité de comptage = LE PATIENT, jamais le bilan. Sinon un patient
     avec 5 bilans pèse 5 fois dans les statistiques.
   - Tout ce qui n'est pas reconnu est compté et affiché (« Non renseigné »,
     « Non reconnu ») : sans ce taux, on lit un classement en croyant
     qu'il couvre tout.
   ═══════════════════════════════════════════════════════════════════ */

/* Normalisation pour la comparaison de texte libre : minuscules, sans
   accents, espaces compactés. « Course à Pied » → « course a pied ». */
function r4pNorm(s){
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Apostrophes et tirets deviennent des espaces : \u00ab tendon d'Achille \u00bb,
    // \u00ab f\u00e9moro-patellaire \u00bb et \u00ab femoro patellaire \u00bb se ram\u00e8nent ainsi \u00e0 une
    // seule forme, et les alias n'ont plus besoin d'\u00eatre \u00e9crits en double.
    .replace(/['\u2019\-\u2013\u2014]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Sports ────────────────────────────────────────────────────────
   Regroupement par alias à l'affichage : la saisie reste libre, aucune
   migration des valeurs existantes. Un champ peut contenir plusieurs
   sports (« Football, Tennis ») → plusieurs correspondances possibles. */
var R4P_SPORT_ALIASES = [
  ['Football',      ['football', 'foot', 'soccer', 'futsal']],
  ['Course à pied', ['course a pied', 'course', 'running', 'trail', 'jogging', 'marathon', 'semi', 'cap', 'run']],
  ['Cyclisme',      ['cyclisme', 'velo', 'vtt', 'bike', 'cycling', 'triathlon']],
  ['Musculation',   ['musculation', 'muscu', 'crossfit', 'cross training', 'halterophilie', 'force athletique', 'renforcement']],
  ['Rugby',         ['rugby']],
  ['Tennis',        ['tennis', 'padel', 'squash', 'badminton']],
  ['Basketball',    ['basketball', 'basket']],
  ['Handball',      ['handball']],
  ['Volleyball',    ['volleyball', 'volley']],
  ['Natation',      ['natation', 'nage', 'swim']],
  ['Sports de combat', ['judo', 'lutte', 'boxe', 'mma', 'jjb', 'grappling', 'karate', 'taekwondo']],
  ['Gymnastique',   ['gymnastique', 'gym', 'trampoline']],
  ['Athlétisme',    ['athletisme', 'sprint', 'saut', 'lancer', 'haies', 'perche']],
  ['Ski',           ['ski', 'snowboard', 'surf']],
  ['Danse',         ['danse', 'dance']],
  ['Escalade',      ['escalade', 'climbing']],
  ['Golf',          ['golf']],
  ['Équitation',    ['equitation', 'cheval']],
];

/* ── Motifs de consultation ────────────────────────────────────────
   Extraction de MOTS-CLÉS, pas de regroupement de chaînes : un motif est
   une phrase (« Contrôle post-op LCA à 3 mois »), pas une étiquette.
   Un motif peut donc alimenter plusieurs catégories.

   Limites connues et assumées : pas de gestion des négations (« pas de
   rupture du LCA » compte dans LCA), et le dictionnaire n'est jamais
   complet — d'où l'importance de la ligne « Non reconnu ». */
var R4P_MOTIF_KEYWORDS = [
  // ── Contexte de consultation (pas une pathologie) ──
  ['Post-opératoire',      ['post op', 'postop', 'post operatoire', 'postoperatoire', 'opere', 'operee', 'operation', 'chirurgie', 'plastie', 'reconstruction', 'arthroscopie', 'prothese']],

  // ── Genou ──
  ['LCA',                  ['lca', 'ligament croise anterieur', 'didt', 'kenneth jones', 'acl']],
  ['LCP',                  ['lcp', 'ligament croise posterieur']],
  ['Lésion méniscale',     ['menisque', 'meniscal', 'meniscale', 'meniscectomie']],
  // « rotulien » seul est volontairement absent : il apparaît autant dans
  // « syndrome rotulien » (fémoro-patellaire) que dans « tendinopathie
  // rotulienne », qui est une pathologie différente. Seule la forme complète
  // est retenue, pour ne pas étiqueter à tort toutes les tendinopathies.
  ['Syndrome fémoro-patellaire', ['sfp', 'femoro patellaire', 'femoropatellaire', 'syndrome rotulien',
                                  'chondropathie', 'pfps', 'patellofemoral']],
  ['Syndrome bandelette ilio-tibiale', ['sbit', 'bandelette', 'ilio tibial', 'iliotibial', 'essuie glace']],

  // ── Hanche ──
  // La région n'apparaissait nulle part dans cette table, alors qu'elle est une
  // page entière du bilan : tout ce qui en venait partait en non-reconnu.
  ['Conflit fémoro-acétabulaire', ['conflit femoro acetabulaire', 'femoro acetabulaire',
                                   'conflit de hanche', 'conflit coxo femoral',
                                   'came femorale', 'cam femoral', 'pincer acetabulaire', 'fai']],
  ['Tendinopathie glutéale', ['gluteale', 'grand trochanter', 'trochanterien', 'trochanterienne',
                              'moyen fessier', 'petit fessier', 'gtps', 'abducteurs de hanche'],
                             { famille: 'tendinopathie' }],
  ['Tendinopathie du psoas', [['tendinopathie', 'psoas'], ['tendinite', 'psoas'],
                              'psoas iliaque', 'ilio psoas'], { famille: 'tendinopathie' }],

  // ── Épaule ──
  ['Coiffe des rotateurs', ['coiffe', 'rotateurs', 'sus epineux', 'supra epineux', 'infra epineux']],
  // « instabilite » seul a été retiré : trop générique, il attrapait aussi
  // « instabilité chronique de cheville » et étiquetait ces patients en épaule.
  ['Instabilité d\'épaule',['instabilite epaule', 'instabilite gleno', 'luxation', 'subluxation', 'latarjet', 'bankart']],
  ['Capsulite rétractile', ['capsulite', 'epaule gelee', 'frozen shoulder', 'retractile']],
  ['Lésion du labrum',     ['labrum', 'labral', 'slap']],
  // Le motif d'épaule le plus fréquent manquait. « bursite » seul est écarté :
  // il existe aussi au trochanter, et rangerait ces patients en épaule.
  ['Conflit sous-acromial', ['sous acromial', 'sous acromiale', 'impingement', 'acromioplastie',
                             'conflit epaule', 'conflit d epaule']],
  ['Lésion acromio-claviculaire', ['acromio claviculaire', 'disjonction', 'entorse acromio']],

  // ── Coude, poignet, main ──
  ['Épicondylite',         ['epicondylite', 'epicondylalgie', 'epicondylien', 'tennis elbow',
                            'epitrochleite', 'golfer elbow']],
  // « carpien » seul est écarté : il est contenu dans « métacarpien », donc
  // une fracture de métacarpien serait comptée en canal carpien.
  ['Canal carpien',        ['canal carpien']],

  // ── Cheville, pied ──
  ['Instabilité de cheville', ['instabilite cheville', 'cheville instable', 'instabilite chronique',
                               'entorses a repetition', 'laxite cheville']],
  ['Aponévrosite plantaire', ['aponevrosite', 'aponevrose plantaire', 'fasciite plantaire',
                              'fascia plantaire', 'epine calcaneenne', 'talalgie']],
  // Exige le mot « rupture » : sans lui, « tendinopathie achilléenne » serait
  // comptée comme une rupture, ce qui est une pathologie tout autre.
  // Alias en LISTE : « rupture » et le site doivent etre presents, mais pas
  // colles. Les expressions contigues cassaient des qu'un mot s'intercalait —
  // « rupture PARTIELLE du tendon d'Achille » partait en non-reconnu.
  ['Rupture du tendon d\'Achille', [['rupture', 'achille'], ['rupture', 'achilleen'],
                                    ['rupture', 'calcaneen'], ['desinsertion', 'achille']]],
  ['Périostite tibiale',   ['periostite', 'stress tibial', 'syndrome de stress tibial']],

  // ── Tendinopathies par site ──
  // Nature ET site sont exigés. Les variantes couvrent ce qui se tape vraiment,
  // fautes comprises : « isquios » pour « ischios » se rencontre autant que la
  // forme correcte, et une table juste en théorie est fausse en pratique.
  ['Tendinopathie des ischio-jambiers', [['tendinopathie', 'ischio'], ['tendinopathie', 'isquio'],
                                         ['tendinopathie', 'ichio'], ['tendinite', 'ischio'],
                                         ['tendinite', 'isquio'], ['tendinose', 'ischio'],
                                         ['tendinopathie', 'hamstring'], 'high hamstring'],
                                        { famille: 'tendinopathie' }],
  ['Tendinopathie rotulienne', [['tendinopathie', 'rotulien'], ['tendinite', 'rotulien'],
                                ['tendinopathie', 'patellaire'], ['tendinose', 'rotulien'],
                                'jumper knee', 'jumpers knee', 'tendon rotulien'],
                               { famille: 'tendinopathie' }],
  ['Tendinopathie d\'Achille', [['tendinopathie', 'achille'], ['tendinite', 'achille'],
                                ['tendinopathie', 'achilleen'], ['tendinite', 'achilleen'],
                                ['tendinose', 'achille'], 'tendinopathie calcaneenne'],
                               { famille: 'tendinopathie' }],
  ['Tendinopathie du tibial postérieur', ['tibial posterieur', 'jambier posterieur'],
                                         { famille: 'tendinopathie' }],

  // ── Rachis ──
  ['Dorsalgie', ['dorsalgie', 'rachialgie thoracique', 'douleur thoracique', 'dorso lombaire']],
  ['Spondylolyse / spondylolisthésis', ['spondylolyse', 'spondylolisthesis', 'spondylolisthese',
                                        'lyse isthmique', 'isthmique']],
  ['Canal lombaire étroit', ['canal lombaire', 'stenose lombaire', 'stenose canalaire',
                             'canal etroit'], { famille: 'lombaire' }],

  // ── Jambe et pied ──
  ['Syndrome des loges', ['syndrome des loges', 'syndrome de loge', 'loge anterieure',
                          'aponevrotomie', 'chronic exertional']],
  ['Fracture de fatigue', ['fracture de fatigue', 'fracture de stress', 'stress fracture',
                           'fatigue osseuse', 'oedeme osseux'], { famille: 'fracture' }],
  ['Névrome de Morton', ['morton', 'nevrome']],

  // ── Général ──
  ['SDRC / algodystrophie', ['sdrc', 'algodystrophie', 'algoneurodystrophie', 'crps',
                             'syndrome douloureux regional']],
  ['Commotion cérébrale', ['commotion', 'traumatisme cranien']],
  ['Préparation physique', ['preparation physique', 'prepa physique', 'preparation marathon',
                            'plan marathon', 'objectif course', 'ppg']],

  // ── Transversal ──
  // « tendon » seul a été retiré : il apparaît dans « rupture du tendon
  // d'Achille », qui n'est pas une tendinopathie. Un motif vague du type
  // « problème de tendon » part désormais en non-reconnu, ce qui est plus
  // honnête qu'un classement erroné.
  ['Tendinopathie',        ['tendinopathie', 'tendinite', 'tendineux', 'tendinose'],
                           { generique: 'tendinopathie' }],
  ['Entorse',              ['entorse', 'ligamentoplastie', 'ligamentaire']],
  ['Lésion musculaire',    ['lesion musculaire', 'dechirure', 'claquage', 'elongation', 'contracture',
                            'lma', 'myo aponevrotique', 'myoaponevrotique', 'desinsertion']],
  ['Arthrose',             ['arthrose', 'arthrosique', 'gonarthrose', 'coxarthrose', 'omarthrose']],
  ['Lombalgie',            ['lombalgie', 'lombaire', 'lumbago', 'hernie', 'discal', 'sciatique', 'cruralgie'],
                           { generique: 'lombaire' }],
  ['Cervicalgie',          ['cervicalgie', 'cervical', 'ncb', 'torticolis']],
  ['Pubalgie',             ['pubalgie', 'pubis', 'adducteurs']],
  ['Fracture',             ['fracture', 'fissure'], { generique: 'fracture' }],
  ['Retour au sport',      ['rts', 'retour au sport', 'return to sport', 'reprise du sport', 'reathletisation', 'readaptation']],
  ['Prévention',           ['prevention', 'preventif', 'depistage', 'screening', 'bilan initial', 'profilage']],
  ['Contrôle / suivi',     ['controle', 'suivi', 'reevaluation', 'reeval']],
];

/* Un alias court risque de se retrouver dans un mot sans rapport
   (« cap » dans « capoeira ») → frontière de mot exigée sous 5 caractères. */
function r4pMatchAlias(hay, alias){
  // Un alias peut etre une LISTE : tous ses termes doivent etre presents.
  // C'est ce qui permet d'exiger la nature ET le site — « tendinopathie » +
  // « ischio » — sans quoi « lesion musculaire des ischio-jambiers » serait
  // etiquetee tendinopathie, le site seul ne disant rien de la lesion.
  if (Array.isArray(alias)) {
    for (var k = 0; k < alias.length; k++) {
      if (!r4pMatchAlias(hay, alias[k])) return false;
    }
    return true;
  }
  if (alias.length < 5) {
    return new RegExp('(^|[^a-z0-9])' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(hay);
  }
  return hay.indexOf(alias) !== -1;
}

/* Rend les libellés dont au moins un alias apparaît dans le texte. */
function r4pMatchGroups(text, table){
  var hay = r4pNorm(text);
  if (!hay) return [];
  var out = [], familles = {}, generiques = [];
  table.forEach(function(entry){
    var label = entry[0], aliases = entry[1], opt = entry[2] || {};
    for (var i = 0; i < aliases.length; i++) {
      if (!r4pMatchAlias(hay, aliases[i])) continue;
      out.push(label);
      if (opt.famille) familles[opt.famille] = true;
      if (opt.generique) generiques.push({ label: label, famille: opt.generique });
      return;
    }
  });
  // Un groupe generique s'efface devant un groupe precis de sa famille : sans
  // ca le patient compterait deux fois, en « Tendinopathie » et en
  // « Tendinopathie des ischio-jambiers », et les deux barres seraient fausses.
  generiques.forEach(function(g){
    if (!familles[g.famille]) return;
    var i = out.indexOf(g.label);
    if (i >= 0) out.splice(i, 1);
  });
  return out;
}

/* ── Âge ───────────────────────────────────────────────────────────
   Bornes lues comme « anniversaire déjà passé cette année ou non ». */
function r4pAge(ddn, today){
  if (!ddn) return null;
  var d = new Date(String(ddn).slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var t = today || new Date();
  var age = t.getFullYear() - d.getFullYear();
  var m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return (age >= 0 && age < 120) ? age : null;
}

var R4P_AGE_BINS = [
  ['Moins de 18', 0,  17],
  ['18 – 29',     18, 29],
  ['30 – 44',     30, 44],
  ['45 – 59',     45, 59],
  ['60 et plus',  60, 200],
];

/* ── Résolution du sport ───────────────────────────────────────────
   Aujourd'hui la saisie existe à deux endroits (patients.sport et le champ
   f-sport de chaque bilan) sans synchronisation entre eux — les deux vont
   diverger. Plutôt que de les unifier (ce qui toucherait bilan.js), on
   résout ici, à la lecture : patients.sport fait foi, et à défaut on prend
   le f-sport du bilan le plus récent du patient. Aucune écriture nulle
   part, donc aucun risque d'écraser une valeur avec une saisie plus ancienne. */
function r4pResolveSport(patients, bilans){
  bilans = bilans || [];
  var latestBilanSport = {};
  var latestDate = {};
  bilans.forEach(function(b){
    if (!b.patient_id || !r4pNorm(b.sport)) return;
    var d = String(b.date || '').slice(0, 10);
    if (!latestDate[b.patient_id] || d > latestDate[b.patient_id]) {
      latestDate[b.patient_id] = d;
      latestBilanSport[b.patient_id] = b.sport;
    }
  });
  return (patients || []).map(function(p){
    if (r4pNorm(p.sport)) return p;
    var fallback = latestBilanSport[p.id];
    return fallback ? Object.assign({}, p, { sport: fallback }) : p;
  });
}

/* ── Fiche athlète ─────────────────────────────────────────────────
   Listes fermées dès le départ : le champ « sport » en texte libre a montré
   qu'une saisie ouverte rend les statistiques inexploitables, et ici il n'y
   a aucune valeur existante à migrer. */
var R4P_NIVEAUX = [
  ['loisir',        'Loisir'],
  ['departemental', 'Départemental'],
  ['regional',      'Régional'],
  ['national',      'National'],
  ['international', 'International'],
  ['professionnel', 'Professionnel'],
];
var R4P_LAT_MAIN = [['droite','Droite'], ['gauche','Gauche'], ['ambidextre','Ambidextre']];
var R4P_LAT_PIED = [['droit','Droit'],   ['gauche','Gauche'], ['indifferent','Indifférent']];

/* Jours de disponibilité : stockés comme une liste de clés, pas comme du
   texte. Un « lundi, mercredi, vendredi » saisi à la main serait illisible
   pour le générateur de programmes ; des clés restent exploitables. */
var R4P_JOURS = [
  ['lun','Lun'], ['mar','Mar'], ['mer','Mer'], ['jeu','Jeu'],
  ['ven','Ven'], ['sam','Sam'], ['dim','Dim'],
];

/* Les champs de la fiche qui existent AUSSI dans le bilan (poids, taille,
   activité, médecin) ne sont pas dupliqués : la fiche fait foi si elle est
   remplie, sinon on affiche la valeur du bilan le plus récent — comme un
   indice, sans jamais l'écrire. Même règle que pour le sport, et donc aucun
   risque d'écraser une saisie récente en éditant un bilan ancien.

   Rend { value, source } où source vaut 'fiche' | 'bilan' | ''. */
function r4pResolveFicheField(patient, bilans, ficheKey, bilanKey){
  var own = patient ? patient[ficheKey] : null;
  if (own !== null && own !== undefined && String(own).trim() !== '') {
    return { value: own, source: 'fiche' };
  }
  var best = null, bestDate = '';
  (bilans || []).forEach(function(b){
    if (String(b.patient_id) !== String(patient && patient.id)) return;
    var v = b[bilanKey];
    if (v === null || v === undefined || String(v).trim() === '') return;
    var d = String(b.date || '').slice(0, 10);
    if (!best || d > bestDate) { best = v; bestDate = d; }
  });
  return best !== null ? { value: best, source: 'bilan', date: bestDate } : { value: '', source: '' };
}

/* Antécédents : liste répétable datée, comme les objectifs et les zones
   douloureuses du bilan. Un bloc de texte unique perdrait la chronologie,
   qui est justement l'information utile. */
function r4pNormAntecedents(raw){
  if (Array.isArray(raw)) {
    return raw.filter(function(a){ return a && r4pNorm(a.text); })
              .map(function(a){ return { text: String(a.text), date: a.date || '' }; });
  }
  // Rétrocompatibilité : un texte libre déjà saisi devient une entrée sans date.
  if (raw && String(raw).trim()) return [{ text: String(raw).trim(), date: '' }];
  return [];
}

/* ── Liste des patients ────────────────────────────────────────────
   Une ligne par patient, avec ses dernières dates d'activité et un statut.
   Le statut reprend exactement les seuils des indicateurs (30 / 90 jours)
   pour qu'un patient compté « dormant » en haut de page le soit aussi ici. */
function r4pBuildRoster(patients, seances, bilans, today){
  var t = today || new Date();
  patients = patients || []; seances = seances || []; bilans = bilans || [];

  var last = function(rows, key){
    var out = {};
    rows.forEach(function(r){
      var d = String(r.date || '').slice(0, 10);
      if (!d || !r.patient_id) return;
      if (!out[r.patient_id] || d > out[r.patient_id]) out[r.patient_id] = d;
    });
    return out;
  };
  var lastS = last(seances), lastB = last(bilans);
  var nbB = {};
  bilans.forEach(function(b){ if (b.patient_id) nbB[b.patient_id] = (nbB[b.patient_id] || 0) + 1; });

  var iso = function(daysAgo){
    return new Date(t.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
  };
  var seuil30 = iso(30), seuil90 = iso(90);

  return patients.map(function(p){
    var ls = lastS[p.id] || '', lb = lastB[p.id] || '';
    // La dernière activité est la plus récente des deux, pas seulement la séance :
    // un patient vu en bilan sans séance planifiée n'est pas inactif.
    var derniere = (ls > lb ? ls : lb) || '';
    var statut;
    if (derniere && derniere >= seuil30)      statut = 'actif';
    else if (!derniere || derniere < seuil90) statut = 'dormant';
    else                                     statut = 'recent';
    return {
      id: p.id,
      nom: p.nom || '', prenom: p.prenom || '',
      sexe: p.sexe || '', sport: p.sport || '',
      age: r4pAge(p.ddn, t),
      derniereSeance: ls, dernierBilan: lb, derniereActivite: derniere,
      nbBilans: nbB[p.id] || 0,
      statut: statut
    };
  });
}

var R4P_STATUT_LABELS = { actif: 'Actif', recent: 'Récent', dormant: 'Dormant' };

/* Tri d'une liste déjà construite. Les valeurs vides partent toujours en
   dernier, quel que soit le sens : une date absente n'est ni petite ni grande. */
function r4pSortRoster(rows, key, asc){
  var dir = asc ? 1 : -1;
  return rows.slice().sort(function(a, b){
    var va = a[key], vb = b[key];
    var ea = (va === null || va === undefined || va === '');
    var eb = (vb === null || vb === undefined || vb === '');
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'fr') * dir;
  });
}

/* ── Filtre de période ─────────────────────────────────────────────
   Un patient n'est pas un événement daté : il « appartient » à une période
   s'il y a eu de l'activité le concernant dedans — une séance planifiée, un
   bilan, ou sa création. C'est la lecture de « combien de patients ai-je eu
   sur cette période », et elle englobe aussi bien les nouveaux que les suivis.

   from / to : 'YYYY-MM-DD' ou null (borne ouverte). Les deux nuls = tout. */
function r4pFilterCohort(patients, seances, bilans, from, to){
  patients = patients || []; seances = seances || []; bilans = bilans || [];
  if (!from && !to) {
    return { patients: patients, seances: seances, bilans: bilans, filtered: false };
  }
  var inRange = function(d){
    d = String(d == null ? '' : d).slice(0, 10);
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  };
  var fs = seances.filter(function(s){ return inRange(s.date); });
  var fb = bilans.filter(function(b){ return inRange(b.date); });
  var keep = {};
  fs.forEach(function(s){ if (s.patient_id) keep[s.patient_id] = true; });
  fb.forEach(function(b){ if (b.patient_id) keep[b.patient_id] = true; });
  patients.forEach(function(p){ if (p.created_at && inRange(p.created_at)) keep[p.id] = true; });
  return {
    patients: patients.filter(function(p){ return keep[p.id]; }),
    seances: fs, bilans: fb, filtered: true
  };
}

/* Bornes des périodes prédéfinies, en mois glissants. */
function r4pPeriodFrom(mois, today){
  var t = today || new Date();
  var d = new Date(t.getTime());
  d.setMonth(d.getMonth() - mois);
  return d.toISOString().slice(0, 10);
}

/* ── Agrégat principal ─────────────────────────────────────────────
   patients : [{id, ddn, sexe, sport, created_at?}]
   seances  : [{patient_id, date}]                 (activité)
   bilans   : [{patient_id, date, zones, motif}]   (zones = JSON string ou tableau)
*/
function r4pBuildStats(patients, seances, bilans, today){
  var t = today || new Date();
  patients = patients || []; seances = seances || []; bilans = bilans || [];

  var stats = { total: patients.length };

  /* — Activité : dernière séance planifiée par patient — */
  var lastSeance = {};
  seances.forEach(function(s){
    var d = String(s.date || '').slice(0, 10);
    if (!d) return;
    if (!lastSeance[s.patient_id] || d > lastSeance[s.patient_id]) lastSeance[s.patient_id] = d;
  });
  var iso = function(daysAgo){
    var d = new Date(t.getTime() - daysAgo * 86400000);
    return d.toISOString().slice(0, 10);
  };
  var seuil30 = iso(30), seuil90 = iso(90);
  stats.actifs = 0; stats.dormants = 0;
  patients.forEach(function(p){
    var last = lastSeance[p.id];
    if (last && last >= seuil30) stats.actifs++;
    else if (!last || last < seuil90) stats.dormants++;
  });

  /* — Nouveaux ce mois : seulement si la colonne existe — */
  stats.nouveaux = null;
  if (patients.some(function(p){ return p.created_at; })) {
    var moisCourant = t.toISOString().slice(0, 7);
    stats.nouveaux = patients.filter(function(p){
      return String(p.created_at || '').slice(0, 7) === moisCourant;
    }).length;
  }

  /* — Sexe — */
  stats.femmes = patients.filter(function(p){ return p.sexe === 'F'; }).length;
  stats.hommes = patients.filter(function(p){ return p.sexe === 'H'; }).length;
  stats.sexeInconnu = patients.length - stats.femmes - stats.hommes;

  /* — Âge — */
  stats.ages = R4P_AGE_BINS.map(function(b){ return { label: b[0], n: 0 }; });
  stats.ageInconnu = 0;
  patients.forEach(function(p){
    var a = r4pAge(p.ddn, t);
    if (a === null) { stats.ageInconnu++; return; }
    for (var i = 0; i < R4P_AGE_BINS.length; i++) {
      if (a >= R4P_AGE_BINS[i][1] && a <= R4P_AGE_BINS[i][2]) { stats.ages[i].n++; return; }
    }
  });

  /* — Sports — « Autres » = renseigné mais hors dictionnaire — */
  var sportCount = {}, sportAutres = 0, sportVide = 0;
  patients.forEach(function(p){
    if (!r4pNorm(p.sport)) { sportVide++; return; }
    var g = r4pMatchGroups(p.sport, R4P_SPORT_ALIASES);
    if (!g.length) { sportAutres++; return; }
    g.forEach(function(l){ sportCount[l] = (sportCount[l] || 0) + 1; });
  });
  stats.sports = Object.keys(sportCount)
    .map(function(k){ return { label: k, n: sportCount[k] }; })
    .sort(function(a, b){ return b.n - a.n; });
  stats.sportAutres = sportAutres;
  stats.sportVide   = sportVide;

  /* — Régions et motifs : union par patient, pas par bilan — */
  var zonesParPatient = {}, motifsParPatient = {}, patientsAvecBilan = {}, patientsAvecMotif = {};
  bilans.forEach(function(b){
    var pid = b.patient_id;
    if (!pid) return;
    patientsAvecBilan[pid] = true;

    var zones = b.zones;
    if (typeof zones === 'string') { try { zones = JSON.parse(zones); } catch(e){ zones = null; } }
    if (Array.isArray(zones)) {
      if (!zonesParPatient[pid]) zonesParPatient[pid] = {};
      zones.forEach(function(z){
        var nom = z && z.zone;
        if (nom) zonesParPatient[pid][nom] = true;
      });
    }

    if (r4pNorm(b.motif)) {
      patientsAvecMotif[pid] = true;
      if (!motifsParPatient[pid]) motifsParPatient[pid] = {};
      r4pMatchGroups(b.motif, R4P_MOTIF_KEYWORDS).forEach(function(l){
        motifsParPatient[pid][l] = true;
      });
    }
  });

  stats.patientsAvecBilan = Object.keys(patientsAvecBilan).length;
  stats.nbBilans = bilans.length;

  var zoneCount = {};
  Object.keys(zonesParPatient).forEach(function(pid){
    Object.keys(zonesParPatient[pid]).forEach(function(z){ zoneCount[z] = (zoneCount[z] || 0) + 1; });
  });
  stats.regions = Object.keys(zoneCount)
    .map(function(k){ return { label: k, n: zoneCount[k] }; })
    .sort(function(a, b){ return b.n - a.n; });

  var motifCount = {}, motifNonReconnu = 0;
  Object.keys(patientsAvecMotif).forEach(function(pid){
    var found = Object.keys(motifsParPatient[pid] || {});
    if (!found.length) { motifNonReconnu++; return; }
    found.forEach(function(m){ motifCount[m] = (motifCount[m] || 0) + 1; });
  });
  stats.motifs = Object.keys(motifCount)
    .map(function(k){ return { label: k, n: motifCount[k] }; })
    .sort(function(a, b){ return b.n - a.n; });
  stats.motifsRenseignes = Object.keys(patientsAvecMotif).length;
  stats.motifNonReconnu  = motifNonReconnu;

  return stats;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { r4pNorm: r4pNorm, r4pAge: r4pAge, r4pMatchGroups: r4pMatchGroups,
                     r4pBuildStats: r4pBuildStats, r4pFilterCohort: r4pFilterCohort,
                     r4pPeriodFrom: r4pPeriodFrom, R4P_SPORT_ALIASES: R4P_SPORT_ALIASES,
                     R4P_MOTIF_KEYWORDS: R4P_MOTIF_KEYWORDS,
                     r4pBuildRoster: r4pBuildRoster, r4pSortRoster: r4pSortRoster,
                     R4P_STATUT_LABELS: R4P_STATUT_LABELS, r4pResolveSport: r4pResolveSport,
                     R4P_NIVEAUX: R4P_NIVEAUX, R4P_LAT_MAIN: R4P_LAT_MAIN, R4P_LAT_PIED: R4P_LAT_PIED,
                     R4P_JOURS: R4P_JOURS,
                     r4pResolveFicheField: r4pResolveFicheField, r4pNormAntecedents: r4pNormAntecedents };
}

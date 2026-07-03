/* ── Constantes localStorage ─────────────────────────────────────────
   Source unique de vérité pour toutes les clés de stockage local.
   Modifier ici = propagé partout dans ce fichier. ────────────────── */
var R4P_KEYS = {
  PATIENT        : 'r4p-current-patient',
  PROFILE        : 'r4p-profile',
  CACHED_PROFILE : 'r4p-cached-profile',
  BILAN_DRAFT    : 'athletik-bilan',
  SUPABASE_AUTH  : 'sb-sxdobjodxkwexaspepdm-auth-token'
};
var _SAVE_ICON = '<svg style="vertical-align:middle;margin-right:4px" width="16" height="16" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="m28.702 8.564-4.273-5c-.795-.93-1.954-1.464-3.18-1.464h-14.771c-2.306 0-4.182 1.877-4.182 4.183v19.436c0 2.306 1.876 4.183 4.182 4.183h19.045c2.306 0 4.183-1.877 4.183-4.183v-14.437c-.001-.995-.357-1.96-1.004-2.718zm-6.962 19.536h-11.481v-8.173c0-.631.514-1.144 1.145-1.144h9.191c.631 0 1.145.513 1.145 1.144zm6.164-2.382c0 1.313-1.068 2.382-2.382 2.382h-1.981v-8.173c0-1.623-1.321-2.944-2.945-2.944h-9.191c-1.624 0-2.945 1.321-2.945 2.944v8.173h-1.982c-1.313 0-2.382-1.068-2.382-2.382v-19.436c0-1.313 1.069-2.382 2.382-2.382h14.771c.698 0 1.358.304 1.811.834l4.273 4.999c.369.432.571.982.571 1.549z"/><path d="m9.359 9.31h5.963c.497 0 .9-.403.9-.9s-.403-.9-.9-.9h-5.963c-.497 0-.9.403-.9.9s.403.9.9.9z"/><path d="m22.641 11.572h-13.282c-.497 0-.9.403-.9.9s.403.9.9.9h13.281c.497 0 .9-.403.9-.9s-.402-.9-.899-.9z"/></g></svg>';


/* ================================================================
   NETWORK HELPER — Supabase SDK call with exponential-backoff retry
   Retries on: HTTP 5xx, 429 (rate limit) or status 0 (network error).
   Usage: _sbRetry(function(){ return sbB.from('bilans').update(...); })
   ================================================================ */
function _sbRetry(fn, _n) {
  _n = _n || 0;
  return fn().then(function(res) {
    if (!res.error) return res;
    var s = res.error.status || 0;
    var isTransient = (s === 429 || s >= 500 || s === 0);
    if (isTransient && _n < 2) {
      return new Promise(function(r){ setTimeout(r, 800 * Math.pow(2, _n)); })
        .then(function(){ return _sbRetry(fn, _n + 1); });
    }
    return res;
  });
}

// -- DATA -----------------------------------------------------
const TESTS = {
  'tb-ep-irrit':{type:'ortho',items:[
    'Arm Squeeze Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">3 pressions : tiers sup. bras / ACJ / sous-acromial — EVA bras > 3 = positif (Thoomes 2017)</span>',
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial</span>',
    'ULNT 4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire</span>',
  ]},
  'tb-ep-trau-gh':{type:'ortho',items:[
    'Appréhension test (antérieure) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">ABD + RE → Appréhension</span>',
    'Relocation test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">ABD + RE + pression tête humérale → Absence d\'appréhension</span>',
    'Posterior appréhension test (postérieure) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">90° élévation + légère adduction + pression axe fût huméral → Appréhension</span>',
    'Inferior appréhension test / Sulcus Test (inférieure) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Tirer le coude vers le bas → Appréhension + signe du sulcus</span>',
  ]},
  'tb-ep-trau-ac':{type:'ortho',items:[
    'Cross body adduction test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Adduction horizontale passive max → Douleur AC</span>',
    'Palpation interligne AC <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palper interligne articulaire → Douleur AC</span>',
  ]},
  'tb-ep-trau-lab':{type:'ortho',items:[
    'Compression Rotation Test (SLAP) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">90° ABD + compression axe fût huméral + rotation → Douleur / ressaut ou claquement</span>',
    'Jerk Test (lésion postéro-inférieure) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">90° ABD + RI + compression en add horizontale → Douleur / ressaut ou claquement</span>',
  ]},
  'tb-ep-trau-coiffe':{type:'ortho',items:[
    'External rotation lag sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Tenir la rotation externe max → Incapacité à tenir la position</span>',
    'Internal rotation lag sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Tenir la rotation interne max → Incapacité à tenir la position</span>',
  ]},
    'tb-ep-fonc': {type:'fonc', items:['Extension thoracique (inspi + rétraction scap.)','Activation coiffe - préhension','Activation coiffe - pré-activation RE','Activation coiffe - contre résistance','Activation coiffe - chaîne croisée','Activation coiffe - bord ulnaire','Inhibition coiffe','Postériorisation GH','SRT (Shoulder Rotation Test)','SAT (Scapular Assistance Test)']},
  'tb-ep-ortho-mob':{type:'ortho',items:[
    'Mobilité scapulaire en DCL <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">ABD/ADD · Sonnette ext/int · Bascule ant/post → Comparaison controlatérale</span>',
    'Extension thoracique au mur <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">❌ si incapacité à lever les coudes &gt; 90° en gardant contacts sacré, thoracique et crânial</span>',
    'Cross body adduction test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Adduction horizontale passive max → Appréhension / Signe du sulcus</span>',
  ]},
  'tb-ep-ortho-conf':{type:'ortho',items:[
    'Test de Neer <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">ABD passive max plan de la scapula → Douleur (conflit sous-acromial)</span>',
    'Posterior impingement test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Geste de l\'armé passif → Douleur (conflit postéro-supérieur)</span>',
    'Hawkins-Kennedy <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">RI passive max à 90° d\'élévation → Douleur (conflit sous-coracoïdien)</span>',
  ]},
  // Épaule bilatérale — tables simplifiées (flat, sans sous-en-têtes)
  'tb-ep-irrit-g':{type:'ortho',items:['Arm Squeeze Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">3 pressions : tiers sup. bras / ACJ / sous-acromial — EVA bras > 3 = positif (Thoomes 2017)</span>','ULNT 1 (Nerf médian)','ULNT 2 (Nerf médian)','ULNT 3 (Nerf radial)','ULNT 4 (Nerf ulnaire)']},
  'tb-ep-irrit-d':{type:'ortho',items:['Arm Squeeze Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">3 pressions : tiers sup. bras / ACJ / sous-acromial — EVA bras > 3 = positif (Thoomes 2017)</span>','ULNT 1 (Nerf médian)','ULNT 2 (Nerf médian)','ULNT 3 (Nerf radial)','ULNT 4 (Nerf ulnaire)']},
  'tb-ep-trau-g':{type:'ortho',items:[
    'Appréhension (ant.)','Relocation test','Appréhension post.','Sulcus Test',
    'Cross body adduction test','Palpation interligne AC',
    'Compression Rotation (SLAP)','Jerk Test',
    'External rotation lag sign','Internal rotation lag sign'
  ]},
  'tb-ep-trau-d':{type:'ortho',items:[
    'Appréhension (ant.)','Relocation test','Appréhension post.','Sulcus Test',
    'Cross body adduction test','Palpation interligne AC',
    'Compression Rotation (SLAP)','Jerk Test',
    'External rotation lag sign','Internal rotation lag sign'
  ]},
  'tb-ep-fonc-g':{type:'fonc',items:['Extension thoracique','Activation coiffe - préhension','Activation coiffe - pré-activation RE','Activation coiffe - contre résistance','Activation coiffe - chaîne croisée','Activation coiffe - bord ulnaire','Inhibition coiffe','Postériorisation GH','SRT','SAT']},
  'tb-ep-fonc-d':{type:'fonc',items:['Extension thoracique','Activation coiffe - préhension','Activation coiffe - pré-activation RE','Activation coiffe - contre résistance','Activation coiffe - chaîne croisée','Activation coiffe - bord ulnaire','Inhibition coiffe','Postériorisation GH','SRT','SAT']},
  'tb-ep-ortho-g':{type:'ortho',items:[
    'Mobilité scapulaire en DCL','Extension thoracique au mur','Cross body adduction test',
    'Test de Neer','Posterior impingement test','Hawkins-Kennedy'
  ]},
  'tb-ep-ortho-d':{type:'ortho',items:[
    'Mobilité scapulaire en DCL','Extension thoracique au mur','Cross body adduction test',
    'Test de Neer','Posterior impingement test','Hawkins-Kennedy'
  ]},
  // ── Coude ────────────────────────────────────────────────────
  'tb-co-lat':{type:'ortho',items:[
    'Test LCLC — varus statique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus, humérus fixé en RE, coude 30° → Laxité / Douleur épicondyle lat.</span>',
    'Test LCLC — varus dynamique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Recherche d\'un ressaut en varus (Sp 100%, Se 10%)</span>',
    'Test de Cozen <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension poignet contre résistance → Douleur épicondyle latérale</span>',
    'Test de Mill <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Avant-bras en pronation, extension + flexion palmaire poignet → Douleur épicondyle lat.</span>',
    'Test de Maudsley <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension contrariée du majeur (P3) → Douleur épicondyle latérale</span>',
    'ULNT radial (ULNT 2) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Diminution amplitude / modification symptômes par inclinaison de la tête</span>',
  ]},
  'tb-co-lat-g':{type:'ortho',items:['Test LCLC varus statique','Test LCLC varus dynamique','Test de Cozen','Test de Mill','Test de Maudsley','ULNT radial (ULNT 2)']},
  'tb-co-lat-d':{type:'ortho',items:['Test LCLC varus statique','Test LCLC varus dynamique','Test de Cozen','Test de Mill','Test de Maudsley','ULNT radial (ULNT 2)']},
  'tb-co-med':{type:'ortho',items:[
    'Test UCL — valgus statique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus, humérus fixé en RI, coude 30° → Laxité / Douleur épicondyle méd. (Sp 50%, Se 65%)</span>',
    'Test UCL — valgus dynamique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Recherche d\'un ressaut en valgus (Sp 100%, Se 19%)</span>',
    'Moving Valgus Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Coude fléchi max, RE épaule, extension contre résistance → Douleur postéro-médiale (Sp 75%, Se 100%)</span>',
    'Test de Cozen inversé <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Coude fléchi, avant-bras supination, flexion poignet + pronation contre résistance → Douleur épicondyle méd.</span>',
    'Test d\'étirement épicondyliens médiaux <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Coude fléchi, avant-bras supination → Douleur épicondyle méd.</span>',
    'ULNT ulnaire (ULNT 3) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Diminution amplitude / modification symptômes par inclinaison de la tête</span>',
  ]},
  'tb-co-med-g':{type:'ortho',items:['Test UCL valgus statique','Test UCL valgus dynamique','Moving Valgus Test','Test de Cozen inversé','Étirement épicondyliens méd.','ULNT ulnaire (ULNT 3)']},
  'tb-co-med-d':{type:'ortho',items:['Test UCL valgus statique','Test UCL valgus dynamique','Moving Valgus Test','Test de Cozen inversé','Étirement épicondyliens méd.','ULNT ulnaire (ULNT 3)']},
  'tb-co-ant':{type:'ortho',items:[
    'Test de flexion — recherche de conflit <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur antérieure à la flexion / Diminution du ROM ?</span>',
    'LMA biceps — excentrique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur / Déficit de force</span>',
    'LMA biceps — extensibilité passive <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur / Raideur</span>',
    'LMA biceps — extensibilité active <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur / Déficit de force</span>',
    'Test du crochet — rupture long biceps <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Crochetage impossible = rupture (Sp 100%, Se 81%)</span>',
  ]},
  'tb-co-ant-g':{type:'ortho',items:['Test flexion conflit','LMA biceps excentrique','LMA biceps ext. passive','LMA biceps ext. active','Test du crochet (rupture LB)']},
  'tb-co-ant-d':{type:'ortho',items:['Test flexion conflit','LMA biceps excentrique','LMA biceps ext. passive','LMA biceps ext. active','Test du crochet (rupture LB)']},
  'tb-co-post':{type:'ortho',items:[
    'Test d\'extension — recherche de conflit <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur postérieure à l\'extension</span>',
    'LMA triceps — excentrique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur postérieure à l\'extension</span>',
    'LMA triceps — extensibilité passive <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur / Raideur</span>',
    'LMA triceps — extensibilité active <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur / Déficit de force</span>',
    'Test rupture triceps <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Défaut macroscopique à la palpation / Douleur</span>',
  ]},
  'tb-co-post-g':{type:'ortho',items:['Test extension conflit','LMA triceps excentrique','LMA triceps ext. passive','LMA triceps ext. active','Test rupture triceps']},
  'tb-co-post-d':{type:'ortho',items:['Test extension conflit','LMA triceps excentrique','LMA triceps ext. passive','LMA triceps ext. active','Test rupture triceps']},

  'tb-po-neuro':{type:'ortho',items:[
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian — diminution amplitude / modification symptômes par inclinaison de la tête</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial — diminution amplitude / modification symptômes par inclinaison de la tête</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire — diminution amplitude / modification symptômes par inclinaison de la tête</span>',
    'Test de Phalen <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Poignets en flexion maintenue 1 min — Paresthésies territoire nerf médian (face ant. 3 premiers doigts + bord ext. annulaire)</span>',
    'Test de Phalen inversé <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Poignets en extension complète maintenue 1 min — Paresthésies territoire nerf médian</span>',
  ]},
  'tb-po-neuro-g':{type:'ortho',items:['ULNT 1','ULNT 2','ULNT 3','Test de Phalen','Test de Phalen inversé']},
  'tb-po-neuro-d':{type:'ortho',items:['ULNT 1','ULNT 2','ULNT 3','Test de Phalen','Test de Phalen inversé']},

  'tb-po-lig':{type:'ortho',items:[
    'Manœuvre de tiroir postérieur <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Saisir radius/ulna + carpe, tiroir postérieur — Laxité / Hypermobilité (Sp: ND, Se: ND)</span>',
    'Manœuvre de tiroir antérieur <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Saisir radius/ulna + carpe, tiroir antérieur — Laxité / Hypermobilité (Sp: ND, Se: ND)</span>',
    'Manœuvre de Watson — Scaphoïde Shift Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression tubercule scaphoïde + mobilisation poignet en inclinaison ulnaire — Ressaut douloureux = lésion scapho-lunaire (Sp: 66%, Se: 69%)</span>',
  ]},
  'tb-po-lig-g':{type:'ortho',items:['Manœuvre de tiroir postérieur','Manœuvre de tiroir antérieur','Manœuvre de Watson']},
  'tb-po-lig-d':{type:'ortho',items:['Manœuvre de tiroir postérieur','Manœuvre de tiroir antérieur','Manœuvre de Watson']},

  'tb-po-pouce':{type:'ortho',items:[
    'Test de Finkelstein <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pouce en poing, inclinaison ulnaire passive — Douleur stiloïde radiale = tendinopathie De Quervain (Sp: 14%, Se: 89%)</span>',
    'WHAT test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Hyperflexion poignet + pouce abduction, adduction résistée — Positif si douleur reproduite (Se: 0,99 / Sp: 0,29 — Goubau 2014)</span>',
  ]},
  'tb-po-pouce-g':{type:'ortho',items:['Test de Finkelstein','WHAT test']},
  'tb-po-pouce-d':{type:'ortho',items:['Test de Finkelstein','WHAT test']},

  'tb-ra-cerv': {type:'ortho',items:[
    'Spurling A',
    'Distraction cervicale'
  ]},
  'tb-ra-cerv-neuro-g': {type:'ortho',items:[
    'Rotation cervicale <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Positif si &lt; 60°</span>',
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial</span>',
    'ULNT 4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire</span>'
  ]},
  'tb-ra-cerv-neuro-d': {type:'ortho',items:[
    'Rotation cervicale <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Positif si &lt; 60°</span>',
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial</span>',
    'ULNT 4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire</span>'
  ]},
  'tb-ra-lomb-g': {type:'ortho',items:['SLUMP test','Lasègue (SLR)','Léri']},
  'tb-ra-lomb-d': {type:'ortho',items:['SLUMP test','Lasègue (SLR)','Léri']},

  // ── Rachis Lombaire (page-rachis-lomb) ─────────────────────────────────
  'tb-rl-nerveux-g': {type:'ortho', items:[
    'SLS / Lasègue <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion passive MI tendu (DD). ✚ Douleur irradiant dans la jambe à &lt; 60° → spécificité 83% sciatique radiculaire. La douleur lombaire seule ne compte pas</span>',
    'Léri (Lasègue inverse) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus ventral, genou fléchi à 90° + extension passive hanche. ✚ Douleur antérieure cuisse → tension nerf fémoral (cruralgie)</span>',
    'Slump <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion rachis + extension genou assis. ✚ Reproduction des symptômes → mécanosensitivité neurale</span>'
  ]},
  'tb-rl-nerveux-d': {type:'ortho', items:[
    'SLS / Lasègue <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion passive MI tendu (DD). ✚ Douleur irradiant dans la jambe à &lt; 60° → spécificité 83% sciatique radiculaire. La douleur lombaire seule ne compte pas</span>',
    'Léri (Lasègue inverse) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus ventral, genou fléchi à 90° + extension passive hanche. ✚ Douleur antérieure cuisse → tension nerf fémoral (cruralgie)</span>',
    'Slump <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion rachis + extension genou assis. ✚ Reproduction des symptômes → mécanosensitivité neurale</span>'
  ]},
  'tb-rl-rot-g': {type:'ortho', items:[
    'L4 / L3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe rotulien</span>',
    'S1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe achilléen</span>'
  ]},
  'tb-rl-rot-d': {type:'ortho', items:[
    'L4 / L3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe rotulien</span>',
    'S1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe achilléen</span>'
  ]},
  'tb-rl-motric-g': {type:'ortho', items:[
    'L3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Adduction de cuisse</span>',
    'L4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion de cuisse</span>',
    'L5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Releveurs du pied — marche sur les talons</span>',
    'S1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Fléchisseurs du pied — marche sur les pointes</span>'
  ]},
  'tb-rl-motric-d': {type:'ortho', items:[
    'L3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Adduction de cuisse</span>',
    'L4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion de cuisse</span>',
    'L5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Releveurs du pied — marche sur les talons</span>',
    'S1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Fléchisseurs du pied — marche sur les pointes</span>'
  ]},
  'tb-rl-sensib-g': {type:'ortho', items:[
    'Superficielle <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pic-touche</span>',
    'Profonde kinesthésique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Position du membre (yeux fermés)</span>',
    'Thermo-algique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Sensibilité thermique</span>'
  ]},
  'tb-rl-sensib-d': {type:'ortho', items:[
    'Superficielle <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pic-touche</span>',
    'Profonde kinesthésique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Position du membre (yeux fermés)</span>',
    'Thermo-algique <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Sensibilité thermique</span>'
  ]},
  'tb-rl-tfd-suite': {type:'ortho', items:[
    'Test de densité spécifique de l\'iliaque <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation densité tissulaire iliaque D/G. ✚ Asymétrie densité → côté dysfonctionnel SIJ</span>',
    'Aspect positionnel — 3 points (EIAS / EIPS / pubis) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Comparaison bilatérale hauteur des 3 repères. ✚ EIPS postérieure = iliaque postérieur ; EIAS antérieure = iliaque antérieur</span>',
    'Test de Gillet (Stork Test) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion hanche monopodal, EIPS palpée. ✚ EIPS ne descend pas en caudal → blocage sacro-iliaque</span>'
  ]},
  'tb-rl-tfa-suite': {type:'ortho', items:[
    'Test de densité — 4 cadrans (sacrum) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation densité des 4 quadrants sacrés. ✚ Asymétrie → cadran dysfonctionnel SIJ</span>',
    'Test du grand bras (long lever) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Levier long sur MI étendu en procubitus. ✚ Douleur SIJ → confirmation dysfonction</span>',
    'Test du petit bras (short lever) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Levier court direct sur sacrum / iliaque. ✚ Douleur SIJ → affine le diagnostic</span>'
  ]},
  'tb-rl-laslett-1': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Distraction <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression divergente sur les EIAS (DD). ✚ Reproduction douleur postérieure pelvienne</span>',
    'Thigh Thrust <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion hanche 90° + poussée axiale fémur (DD). ✚ Douleur postérieure SIJ ipsilatérale</span>'
  ]},
  'tb-rl-laslett-2': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Compression <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression convergente sur les crêtes iliaques (DD latéral). ✚ Reproduction douleur postérieure pelvienne</span>'
  ]},
  'tb-rl-laslett-3': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Sacral Thrust <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression postéro-antérieure sur le sacrum (procubitus). ✚ Reproduction douleur postérieure pelvienne</span>'
  ]},
  'tb-rl-plet': {type:'ortho', items:[
    'Passive Lumbar Extension Test (PLET) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Procubitus, élévation des MI en légère traction (genoux tendus). ✚ Reproduction d\'une douleur lombaire sévère ou sensation de « détachement » → instabilité structurelle (spondylolisthésis) — Kasai 2006 : Se 84%, Sp 90%</span>'
  ]},
  'tb-rl-transverse': {type:'ortho', opts:['Positif','Négatif'], items:[
    'Test de la toux <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus dorsal, genoux fléchis. Toux franche. ✚ Doigts repoussés → défaut de contraction anticipatoire du transverse</span>',
    'Test de Valsalva <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus dorsal, genoux fléchis. Expiration forcée à glotte fermée. ✚ Doigts repoussés → augmentation pression intra-abdominale sans stabilisation lombaire</span>'
  ]},
  'tb-rl-instab': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Apprehension sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Sensation d\'affaissement du bas du dos avec douleur lombaire soudaine lors des AVQ. ✚ Présent dans les 7 derniers jours (Areeudomwong 2020)</span>',
    'Instability catch sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Catch douloureux en flexion lombaire. ✚ Diminué par contraction du transverse → instabilité</span>',
    'Painful catch sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur au retour de flexion avec compensation. ✚ Diminuée par contraction du transverse → instabilité</span>',
    'Prone Instability Test (PIT) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Procubitus MI hors table. Glissement PA passif sur segments lombaires. ✚ Douleur disparaît à la contraction des extenseurs → instabilité segmentaire</span>'
  ]},

  // ── Rachis Cervical (page-rachis-cerv) ──────────────────────────────────
  'tb-cv-vascul': {type:'ortho', items:[
    'Test de Tillaux <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension C0-C1 + flexion buste. ✚ Symptômes neuro-végétatifs → insuffisance vertébro-basilaire</span>',
    'Test de Rancurel <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Compression triangle de Tillaux + extension-inclinaison-rotation controlatérale. ✚ Symptômes neuro-végétatifs → insuffisance vertébro-basilaire</span>',
    'Test de Klein — artère vertébrale <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension-inclinaison-rotation controlatérale (assis puis DD). ✚ Symptômes neuro-végétatifs → insuffisance vertébro-basilaire</span>'
  ]},
  'tb-cv-sensib-g': {type:'ortho', items:[
    'C4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Région trapèze, sus-claviculaire et sommet épaule</span>',
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Triangle C4-acromion-T1, deltoïde inférieur, ½ sup face externe bras</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Triangle C5-acromion-T1, face externe coude-avant-bras-bras, pouce</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Bande face postérieure bras → 2ème et 3ème doigts</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">4ème et 5ème doigts, face médiale avant-bras et coude</span>'
  ]},
  'tb-cv-sensib-d': {type:'ortho', items:[
    'C4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Région trapèze, sus-claviculaire et sommet épaule</span>',
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Triangle C4-acromion-T1, deltoïde inférieur, ½ sup face externe bras</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Triangle C5-acromion-T1, face externe coude-avant-bras-bras, pouce</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Bande face postérieure bras → 2ème et 3ème doigts</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">4ème et 5ème doigts, face médiale avant-bras et coude</span>'
  ]},
  'tb-cv-motric-g': {type:'ortho', items:[
    'C2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion de tête</span>',
    'C3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Inclinaison de tête</span>',
    'C4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Élévation des épaules</span>',
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Abduction épaule</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion coude, supination avant-bras</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension coude-poignet-doigts</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion, écartements des doigts et opposition pouce</span>'
  ]},
  'tb-cv-motric-d': {type:'ortho', items:[
    'C2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion de tête</span>',
    'C3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Inclinaison de tête</span>',
    'C4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Élévation des épaules</span>',
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Abduction épaule</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion coude, supination avant-bras</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension coude-poignet-doigts</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion, écartements des doigts et opposition pouce</span>'
  ]},
  'tb-cv-rot-g': {type:'ortho', items:[
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe bicipital</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe stylo-radial</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe tricipital</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe cubito-pronateur</span>'
  ]},
  'tb-cv-rot-d': {type:'ortho', items:[
    'C5 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe bicipital</span>',
    'C6 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe stylo-radial</span>',
    'C7 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe tricipital</span>',
    'C8 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Réflexe cubito-pronateur</span>'
  ]},
  'tb-cv-ulnt-g': {type:'ortho', items:[
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial</span>',
    'ULNT 4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire</span>'
  ]},
  'tb-cv-ulnt-d': {type:'ortho', items:[
    'ULNT 1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 2 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf médian</span>',
    'ULNT 3 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf radial</span>',
    'ULNT 4 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Nerf ulnaire</span>'
  ]},
  'tb-cv-defilé-g': {type:'ortho', items:[
    'Scalènes / costo-claviculaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Bras chandelier + rotation homo/controlatérale + inspiration profonde. ✚ Abolition / diminution du pouls</span>',
    'Petit pectoral <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">MS levé + avant-bras au-dessus tête + rotation controlatérale. ✚ Abolition / diminution du pouls</span>'
  ]},
  'tb-cv-defilé-d': {type:'ortho', items:[
    'Scalènes / costo-claviculaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Bras chandelier + rotation homo/controlatérale + inspiration profonde. ✚ Abolition / diminution du pouls</span>',
    'Petit pectoral <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">MS levé + avant-bras au-dessus tête + rotation controlatérale. ✚ Abolition / diminution du pouls</span>'
  ]},
  'tb-cv-mecanique': {type:'ortho', items:[
    'Translation de C1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Débattement latéral des apophyses transverses C1 (DD). ✚ Débattement ↑ → fracture odontoïde ? — ❌ Contre-indication à la TM</span>',
    'Compression axiale — Flexion <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression axiale crâne en flexion cervicale. ✚ Douleur / paresthésies → hernie molle</span>',
    'Compression axiale — Latéro-flexion <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression axiale crâne en latéro-flexion. ✚ Douleur / paresthésies → hernie dure</span>',
    'Compression axiale — Extension <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression axiale crâne en extension. ✚ Douleur / paresthésies → hernie dure</span>',
    'Distraction cervicale <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Traction axiale manuelle (DD). ✚ Diminution des symptômes → radiculopathie (Cluster de Wainner)</span>',
    'Sharp Purser Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Translation post. crâne + translation ant. C2. ✚ Arrêt moins ferme + symptômes diminuent → entorse ligament transverse</span>',
    'Test ligament alaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Rotation cervicale haute fixant C2. ✚ Rotation &gt; 20° ou inclinaison non limitée → entorse ligament alaire</span>'
  ]},
  'tb-cv-dn4-itw': {type:'ortho', opts:['Oui','Non'], items:[
    'Brûlure',
    'Sensation de froid douloureux',
    'Décharges électriques',
    'Fourmillements',
    'Picotements',
    'Engourdissement',
    'Démangeaisons'
  ]},
  'tb-cv-dn4-exam': {type:'ortho', opts:['Oui','Non'], items:[
    'Hypoesthésie au tact',
    'Hypoesthésie à la piqûre',
    'Allodynie au frottage léger'
  ]},
  // Hanche — Tests Neurologiques
  'tb-ha-neuro': {type:'ortho', items:[
    'SLS / Lasègue <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion passive MI tendu (DD). ✚ Douleur irradiant dans la jambe à &lt; 60° → spécificité 83% sciatique radiculaire. La douleur lombaire seule ne compte pas</span>',
    'Léri (Lasègue inverse) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus ventral, genou fléchi à 90° + extension passive hanche. ✚ Douleur antérieure cuisse → tension nerf fémoral (cruralgie)</span>',
    'Slump <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion rachis + extension genou assis. ✚ Reproduction des symptômes → mécanosensitivité neurale</span>'
  ]},
  'tb-ha-neuro-g': {type:'ortho', items:['SLS / Lasègue','Léri (Lasègue inverse)','Slump']},
  'tb-ha-neuro-d': {type:'ortho', items:['SLS / Lasègue','Léri (Lasègue inverse)','Slump']},
  // Hanche — Cluster de Laslett
  'tb-ha-laslett-1': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Distraction <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression divergente sur les EIAS (DD). ✚ Reproduction douleur postérieure pelvienne</span>',
    'Thigh Thrust <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion hanche 90° + poussée axiale fémur (DD). ✚ Douleur postérieure SIJ ipsilatérale</span>'
  ]},
  'tb-ha-laslett-2': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Compression <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression convergente sur les crêtes iliaques (DD latéral). ✚ Reproduction douleur postérieure pelvienne</span>'
  ]},
  'tb-ha-laslett-3': {type:'ortho', opts:['Positif','Négatif','N/A'], items:[
    'Sacral Thrust <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pression postéro-antérieure sur le sacrum (procubitus). ✚ Reproduction douleur postérieure pelvienne</span>'
  ]},
  // Hanche — Exclusion Fracture
  'tb-ha-fracture': {type:'ortho', items:[
    'Patellar Pubic Percussion Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Auscultation du son de percussion genou → pubis. ✚ Différence bilatérale du timbre sonore → fracture de contrainte (Se: 95%, Sp: 86%)</span>',
    'Fulcrum Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Levier sous diaphyse fémorale + compression axiale en DD. ✚ Douleur franche en point précis → fracture de contrainte fémur (Se: 88–93%, Sp: 13–75%)</span>'
  ]},
  'tb-ha-fracture-g': {type:'ortho', items:['Patellar Pubic Percussion Test','Fulcrum Test']},
  'tb-ha-fracture-d': {type:'ortho', items:['Patellar Pubic Percussion Test','Fulcrum Test']},
  // Hanche — Athletic Groin Pain
  // AGP — Adducteurs : Pubic Clock
  'tb-ha-agp-clock': {type:'ortho', items:[
    'Pubis — 3h <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation bord latéral du pubis. ✚ Douleur → périoste pubien / insertion adducteurs latéraux</span>',
    'Long adducteur — 6h <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation bord inférieur du pubis. ✚ Douleur → insertion du long adducteur (zone la plus fréquente)</span>',
    'Ligament inguinal — 9h <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation bord latéral controlatéral. ✚ Douleur → ligament inguinal / origine pubienne adducteurs médiaux</span>',
    'Anneau inguinal + abdos — 12h <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Palpation bord supérieur du pubis. ✚ Douleur → insertion droits abdominaux / anneau inguinal superficiel</span>'
  ]},
  // AGP — Adducteurs : Démembrement
  'tb-ha-agp-demem': {type:'ortho', items:[
    'Sartorius + Long Adducteur <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Plan superficiel — Bord du Triangle de Scarpa</span>',
    'Gracile <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Plan superficiel — En dedans du Triangle de Scarpa</span>',
    'Ilio-Psoas + Pectiné <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Plan intermédiaire — Entre le Sartorius et le Long Adducteur</span>',
    'Grand + Court Adducteur <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Plan profond — Entre le Long Adducteur et le Gracile</span>'
  ]},
  // AGP — Adducteurs : tests fonctionnels (Squeeze 0° géré en HTML custom avec EVA)
  'tb-ha-agp-add': {type:'ortho', items:[
    'Squeeze test 45° <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Serrer ballon/poing, genoux fléchis à 45°. ✚ EVA ≥ 6 ou force &lt; 210 mmHg (dynamomètre) → positif</span>',
    'Étirement ADD — Frog Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Étirement passif des adducteurs en grenouille (genoux fléchis, pieds joints, chute en abduction). ✚ Douleur inguinale ou pubienne reproduite</span>'
  ]},
  // AGP — Pubis
  'tb-ha-agp-pubis': {type:'ortho', items:[
    'Pubis Stress Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Compression latéro-latérale des ailes iliaques ou pression directe sur le pubis. ✚ Douleur pubienne reproduite → ostéopathie pubienne</span>'
  ]},
  // AGP — Fléchisseurs
  'tb-ha-agp-flech': {type:'ortho', items:[
    'Contraction résistée fléchisseurs <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion de hanche résistée isométrique à 90° (DD). ✚ Douleur inguinale → tendinopathie psoas / insertion fléchisseurs</span>',
    'BKFO <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Bent Knee Fall Out : DD, talon ipsilatéral fixé, chute du genou en abduction passive. Mesure genou→sol. ✚ Seuil &gt; 17 cm → déficit mobilité RE hanche</span>'
  ]},
  // AGP — Canal Inguinal
  'tb-ha-agp-inguinal': {type:'ortho', items:[
    'Contraction résistée inguinal <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Break test résistance à l\'extension de hanche + palpation anneau inguinal. ✚ Douleur anneau inguinal → atteinte paroi inguinale</span>',
    'Valsalva + Toux <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Expiration forcée à glotte fermée + toux franche. ✚ Douleur ou pression anneau inguinal → défaut paroi / hernie inguinale</span>'
  ]},
  // AGP — variantes bilatérales (flat, sans sous-catégories)
  'tb-ha-agp-g': {type:'ortho', items:['Pubic Clock 3h — Pubis','Pubic Clock 6h — Long adducteur','Pubic Clock 9h — Ligament inguinal','Pubic Clock 12h — Anneau inguinal + abdos','Démembrement — Sartorius + Long Adducteur','Démembrement — Gracile','Démembrement — Ilio-Psoas + Pectiné','Démembrement — Grand + Court Adducteur','Squeeze test 0°','Squeeze test 45°','Étirement ADD — Frog Test','Pubis Stress Test','Contraction résistée fléchisseurs','Contraction résistée inguinal','Valsalva + Toux','BKFO']},
  'tb-ha-agp-d': {type:'ortho', items:['Pubic Clock 3h — Pubis','Pubic Clock 6h — Long adducteur','Pubic Clock 9h — Ligament inguinal','Pubic Clock 12h — Anneau inguinal + abdos','Démembrement — Sartorius + Long Adducteur','Démembrement — Gracile','Démembrement — Ilio-Psoas + Pectiné','Démembrement — Grand + Court Adducteur','Squeeze test 0°','Squeeze test 45°','Étirement ADD — Frog Test','Pubis Stress Test','Contraction résistée fléchisseurs','Contraction résistée inguinal','Valsalva + Toux','BKFO']},
  // Hanche — Tests Coxo-Fémoraux
  'tb-ha-hanche': {type:'ortho', items:[
    'Log Roll <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Rotation passive MI en extension (DD). ✚ Douleur inguinale → pathologie intra-articulaire hanche (Se: 30%, très Sp)</span>',
    'FADDIR <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">FAI</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion 90°, ADduction + Rotation Interne passive (DD). ✚ Douleur inguinale / accrochage → FAI ou lésion labrale (Se: 56–99%, Sp: 3–100%)</span>',
    'FADDIR + Extension Lombaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">FADDIR réalisé avec extension lombaire active. ✚ Modulation de la douleur → participation lombaire ou sacro-iliaque</span>',
    'FADDIR + Compression <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">FADDIR + compression axiale du fémur. ✚ Augmentation douleur inguinale → renforce suspicion FAI / labrum</span>',
    'FADDIR + Distraction <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">FADDIR + traction axiale du fémur. ✚ Diminution douleur inguinale → confirme origine intra-articulaire</span>',
    'Third Test <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Labrum</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion maximale hanche + distraction + RI/RE progressive. ✚ Douleur inguinale reproduite → lésion labrale antérieure (Se: 98%, Sp: 75%)</span>',
    'FABER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">SIA / Coxarthrose</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion-ABduction-Rotation Externe (figure 4). ✚ Douleur inguinale → pathologie coxo-fémorale ; douleur postérieure → origine sacro-iliaque (Se: 41–98%)</span>',
    'AB-HEER Test <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Instabilité post.</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">ABduction + Hyperextension + Rotation Externe résistée. ✚ Douleur / appréhension postérieure → instabilité postérieure de hanche (Se: 80.6%, Sp: 89.4%)</span>',
    'Test de Thomas <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, genou controlatéral fléchi sur la poitrine. ✚ MI ipsilatéral qui décolle de la table → rétraction fléchisseurs de hanche (Se: 89%, Sp: 92%)</span>',
    'Test d\'Appréhension Antérieure / HEER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Micro-instabilité</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Extension + Rotation Externe passive en procubitus. ✚ Appréhension / douleur antérieure → micro-instabilité antérieure (Se: 71%, Sp: 85.1%)</span>',
    'Test de Ober <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">TFL / BIT</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus latéral, abduction + extension hanche, relâchement → le genou ne descend pas → rétraction TFL / bandelette ilio-tibiale</span>',
    'FADER-R <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">GTPS</span> <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Flexion-ADduction-RE + résistée. ✚ Douleur grand trochanter → tendinopathie glutéale (Se: 44%, Sp: 93.3%)</span>'
  ]},
  'tb-ha-hanche-g': {type:'ortho', items:['Log Roll','FADDIR','FADDIR + Extension Lombaire','FADDIR + Compression','FADDIR + Distraction','Third Test','FABER','AB-HEER Test','Test de Thomas','Test d\'Appréhension Antérieure / HEER','Test de Ober','FADER-R']},
  'tb-ha-hanche-d': {type:'ortho', items:['Log Roll','FADDIR','FADDIR + Extension Lombaire','FADDIR + Compression','FADDIR + Distraction','Third Test','FABER','AB-HEER Test','Test de Thomas','Test d\'Appréhension Antérieure / HEER','Test de Ober','FADER-R']},

  'tb-ge-global': {type:'ortho',items:['Signe du Glaçon — Test du choc rotulien <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, recherche du choc patellaire. Main crâniale abaisse la patella (cul de sac sous-quadricipital), main caudale contre-appui, index pousse verticalement vers la table. ✚ Patella qui s\'enfonce dans le liquide → hémarthrose (rupture lig, lésion ostéochondrale, luxation patellaire)</span>']},
  'tb-ge-global-g':{type:'ortho',items:['Signe du Glaçon']},
  'tb-ge-global-d':{type:'ortho',items:['Signe du Glaçon']},
  'tb-ge-mob-flex':   {type:'ortho',opts:['Normal','Réduit','N/A'],items:[
    'Flexion passive <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, flexion passive associée à la RI. Préciser si limitation algique ou mécanique. ✚ Réduit → déficit flexion ; Atteinte corne post. ménisques / LCM</span>',
    'Flexion active <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, flexion active comparée à la flexion passive. ✚ Différence passive/active → déficit musculaire quadricipital</span>'
  ]},
  'tb-ge-mob-ext':    {type:'ortho',opts:['Normal','Réduit','Récurvatum','N/A'],items:[
    'Extension passive <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, extension passive associée à la RE. ✚ Récurvatum unilatéral → atteinte PAPI, PAPE et LCP ; Bilatéral → hyperlaxité constitutionnelle ; Douleur ant. → corne ant. ménisques</span>',
    "Extension active <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, extension active du genou. ✚ Défaut d'extension active → lésion quadriceps / tendon patellaire / fracture patella</span>"
  ]},
  'tb-ge-mob-flex-g': {type:'ortho',opts:['Normal','Réduit','N/A'],items:['Flexion passive','Flexion active']},
  'tb-ge-mob-flex-d': {type:'ortho',opts:['Normal','Réduit','N/A'],items:['Flexion passive','Flexion active']},
  'tb-ge-mob-ext-g':  {type:'ortho',opts:['Normal','Réduit','Récurvatum','N/A'],items:['Extension passive','Extension active']},
  'tb-ge-mob-ext-d':  {type:'ortho',opts:['Normal','Réduit','Récurvatum','N/A'],items:['Extension passive','Extension active']},
  'tb-ge-lig':    {type:'ortho',items:[
    'Laxité en varus à 0° — Verrouillage complet <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Varus en extension complète (DD). ✚ Laxité → atteinte du LCL + PAPE (atteinte grave, souvent associée au pivot central)</span>',
    'Laxité en valgus à 0° — Verrouillage complet <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Valgus en extension complète (DD). ✚ Laxité → atteinte du LCM + PAPI (atteinte grave du plan médial)</span>',
    'Laxité en varus à 20–30° <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Varus, genou fléchi à 20–30° (DD). ✚ Laxité → atteinte isolée du LCL</span>',
    'Laxité en valgus à 20–30° <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Valgus, genou fléchi à 20–30° (DD). ✚ Laxité → atteinte du LCM (Se: 96%, Référence IRM)</span>'
  ]},
  'tb-ge-lig-g':  {type:'ortho',items:['Laxité varus 0°','Laxité valgus 0°','Laxité varus 20–30°','Laxité valgus 20–30°']},
  'tb-ge-lig-d':  {type:'ortho',items:['Laxité varus 0°','Laxité valgus 0°','Laxité varus 20–30°','Laxité valgus 20–30°']},
  'tb-ge-lca':    {type:'ortho',items:[
    'Test de Lachman <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, genou relâché. Main proximale empaume fémur distal, main distale au niveau de la TTA. Tiroir antérieur du tibia. ✚ Arrêt mou ou mou retardé → rupture / distension LCA (Se: 81–89%, Sp: 85–94%)</span>',
    "Tiroir antérieur <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou 90°, hanche 45°. Traction du tibia vers l'avant. ✚ Arrêt mou → rupture LCA (Se: 55–83%, Sp: 85–96%)</span>",
    "Tiroir postérieur <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou 90°, hanche 45°. Poussée du tibia vers l'arrière. ✚ Arrêt mou → rupture LCP (Se: 22–100%, Sp: 98%). Atteinte LCP souvent associée PAPE/PAPI, LCM/LCL</span>",
    'Test de Lelli — Lever sign <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, jambe relâchée. Main distale sous 1/3 proximal triceps sural (contre-appui), main crâniale pousse verticalement sur 1/3 distal quadriceps. ✚ Talon reste sur la table → rupture LCA (Se: 77–83%, Sp: 90–91%)</span>'
  ]},
  'tb-ge-lca-g':  {type:'ortho',items:['Lachman','Tiroir antérieur','Tiroir postérieur','Test de Lelli']},
  'tb-ge-lca-d':  {type:'ortho',items:['Lachman','Tiroir antérieur','Tiroir postérieur','Test de Lelli']},
  'tb-ge-men':    {type:'ortho',items:[
    'Test de Oudart — Cri méniscal <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, palpation interligne médial. Extension active lente du genou par le patient. ✚ Douleur aiguë en flexion → corne post. ; en extension → corne ant. (Se: 63–83%, Sp: 77–83%)</span>',
    "Compression d'Appley — Griding test <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">Décubitus ventral, genou 90°. Compression axiale + rotations médiale et latérale. ✚ Douleur : rotation latérale → ménisque interne ; rotation médiale → ménisque externe (Se: 60,7%, Sp: 70,2%)</span>",
    'Test de Judet-Genety <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Décubitus ventral, patella en bord de table, jambes dans le vide. Poussée verticale vers le sol au talon. ✚ Résistance élastique et/ou douleur → lésion méniscale</span>',
    'Test de Thessaly <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Debout en appui unipodal, genou fléchi à 20°. 3 rotations corps/genou médiales et latérales. ✚ Douleur et/ou craquement → lésion méniscale (Se: 75%, Sp: 87%) — meilleure précision pour ménisque médial et latéral</span>'
  ]},
  "tb-ge-men-g":  {type:'ortho',items:["Test de Oudart","Compression d'Appley","Test de Judet-Genety","Test de Thessaly"]},
  "tb-ge-men-d":  {type:'ortho',items:["Test de Oudart","Compression d'Appley","Test de Judet-Genety","Test de Thessaly"]},
  'tb-ge-rot':    {type:'ortho',items:[
    "Engagement Rotulien <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou tendu. Légère flexion en s'opposant à la descente de la patella avec les deux pouces. ✚ Accrochage → clapet chondral ; Douleur → lésion portion inf. cartilage ; Claquement → signe de subluxation</span>",
    "Test de Smillie — Patella apprehension <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou tendu. Pression de la patella vers l'extérieur avec les deux pouces lors d'une flexion progressive. ✚ Appréhension à 30° → instabilité rotulienne (Se: 7–37%, Sp: 70–92%)</span>",
    "Test d'Accroupissement <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">Patient debout, accroupissement bipodal talons décollés. ✚ Douleur descente et remontée → atteinte patellaire ; Douleur progressive en flexion max → atteinte tendineuse</span>"
  ]},
  "tb-ge-rot-g":  {type:'ortho',items:['Engagement Rotulien','Test de Smillie',"Test d'Accroupissement"]},
  "tb-ge-rot-d":  {type:'ortho',items:['Engagement Rotulien','Test de Smillie',"Test d'Accroupissement"]},
  "tb-ge-sbit":   {type:'ortho',items:[
    "Test de Renne — STIT/SBIT <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">Debout en appui unipodal. Flexion/extension genou aux alentours de 30° de flexion. Pression possible du condyle latéral. ✚ Douleur externe au condyle → STIT (conflit condyle lat. / bandelette ilio-tibiale). Bursite dans 30% des cas</span>",
    "Test de Noble <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou fléchi à 90°, segment jambier en RM. Pression sur le tractus ilio-tibial distal à proximité de l'épicondyle latéral, extension progressive du genou. ✚ Douleur familière vers 30° de flexion → SDBIT (conflit tractus IT / épicondyle lat.)</span>"
  ]},
  'tb-ge-sbit-g': {type:'ortho',items:['Test de Renne','Test de Noble']},
  'tb-ge-sbit-d': {type:'ortho',items:['Test de Renne','Test de Noble']},
  "tb-ge-plicae": {type:'ortho',items:["Hugston's Plicae Test <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD, genou fléchi à 90°. Translation médiale de la patella (pulpe des doigts sur zone plicae), tibia en RI sous fémur, flexion/extension genou. ✚ Douleur sous les doigts identique à la situation réelle → épaississement plicae médiale. Peut être associé à un ressaut ou claquement</span>"]},
  "tb-ge-plicae-g":{type:'ortho',items:["Hugston's Plicae Test"]},
  "tb-ge-plicae-d":{type:'ortho',items:["Hugston's Plicae Test"]},
  'tb-ge-ext':    {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ge-ext-g':  {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ge-ext-d':  {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ra-transverse':{type:'ortho',items:['Test du transverse (toux + valsalva)']},
  'tb-pi-ottawa':  {type:'ortho',opts:['Positif','Négatif','N/A'],items:[
    'Sensibilité bord post. / pointe malléole latérale (A) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Douleur zone malléolaire + ≥1 critère A ou B → radio cheville indiquée</span>',
    'Sensibilité bord post. / extrémité malléole médiale (B)',
    'Incapacité à supporter le poids immédiatement + 4 pas aux urgences',
    'Sensibilité base 5e métatarsien (C) <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">≥1 critère C ou D → radio pied indiquée</span>',
    'Sensibilité naviculaire (D)'
  ]},
  'tb-pi-ottawa-g':{type:'ortho',opts:['Positif','Négatif','N/A'],items:['Sensibilité malléole latérale (A)','Sensibilité malléole médiale (B)','Incapacité à supporter le poids','Sensibilité base 5e métatarsien (C)','Sensibilité naviculaire (D)']},
  'tb-pi-ottawa-d':{type:'ortho',opts:['Positif','Négatif','N/A'],items:['Sensibilité malléole latérale (A)','Sensibilité malléole médiale (B)','Incapacité à supporter le poids','Sensibilité base 5e métatarsien (C)','Sensibilité naviculaire (D)']},
  'tb-pi-global':  {type:'ortho',items:[
    'Test Tissulaire / Liberté Articulaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, genou tendu. Main externe: calcanéum, main interne: talus. Action: décoaptation + retour. ✚ Réponse tissu conjonctif — densité/laxité, comparatif controlatéral. Pas de données de validité publiées.</span>',
    'Flexion Plantaire <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, empaumer calcanéum. Mobilisation en FP complète. But: recherche de douleur (la mobilité est évaluée dans le bloc Amplitudes). ✚ Douleur en FP → carrefour postérieur. Pas de données publiées.</span>',
    'Flexion Dorsale <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, empaumer calcanéum. Mobilisation en FD complète. But: recherche de douleur (la mobilité est évaluée dans le bloc Amplitudes). ✚ Douleur en FD → syndesmose. Pas de données publiées.</span>'
  ]},
  'tb-pi-global-g':{type:'ortho',items:['Test Tissulaire / Liberté Articulaire','Flexion Plantaire','Flexion Dorsale']},
  'tb-pi-global-d':{type:'ortho',items:['Test Tissulaire / Liberté Articulaire','Flexion Plantaire','Flexion Dorsale']},
  'tb-pi-amp-g':{type:'ortho',opts:['Ok','Acceptable','Insuffisant'],items:['Flex. dorsale (g. tendu)','Flex. dorsale (g. fléchi)','Flexion plantaire','Inversion','Éversion']},
  'tb-pi-amp-d':{type:'ortho',opts:['Ok','Acceptable','Insuffisant'],items:['Flex. dorsale (g. tendu)','Flex. dorsale (g. fléchi)','Flexion plantaire','Inversion','Éversion']},
  'tb-pi-tt':    {type:'ortho',items:[
    'Reverse Antero Lateral Drawer Test — RALDT <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, cheville 20° FP. Kiné stabilise tibia, poussée sèche dans partie distale du tibia. ✚ Qualité arrêt + douleur. Se/Sp supérieures au Tiroir Antérieur et ALDT (Li et al.).</span>',
    'Talar Tilt Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, en fente. Main stabilisatrice tibia, main mobilisatrice calcanéum. Varus forcé: teste LCL (calcanéo-fibulaire) ; valgus forcé: teste ligament deltoïde. ✚ Qualité arrêt, laxité > 10°, douleur. Se: 49–54,5%, Sp: 82.</span>',
    'Test de Cisaillement — Choc talien <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, coude dans axe des poignets, empaumer calcanéum, contre-prise tibia. Action: cisaillement pour tester tenue du talus dans la pince tibio-fibulaire. ✚ Qualité arrêt + douleur. Pas de données publiées.</span>'
  ]},
  'tb-pi-tt-g':  {type:'ortho',items:['RALDT','Talar Tilt Test','Test de Cisaillement']},
  'tb-pi-tt-d':  {type:'ortho',items:['RALDT','Talar Tilt Test','Test de Cisaillement']},
  'tb-pi-synd':  {type:'ortho',items:[
    'Test de Kleiger <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD, genou 90°. Empaumer bord interne pied, maintenir cheville FD + genou RI avec creux axillaire. Action: RE du pied. ✚ Douleur. Se: 20–71%, Sp: 47,5–97%. Teste aussi faisceau superficiel ligament deltoïde.</span>',
    'Fibular Translation Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Main stabilisatrice tibia, mobilise pointe fibula avec loge thénar (prise souple). ✚ Qualité arrêt/controlatéral, claquement audible, douleur. Pas de données publiées.</span>',
    'Tiroir Talien Transversal <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Main externe stabilise tibia sans maintenir fibula ; main interne bord post. calcanéum, coude dans le prolongement. Action: poussée vers le haut et le dehors. ✚ Qualité arrêt, diastasis visible. Pas de données publiées.</span>',
    'Squeeze Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Compression fibula contre tibia à mi-hauteur segment jambier. ✚ Qualité arrêt, douleur dans la syndesmose. Se: 25–44,4%, Sp: 55,9–99%. Utile pour distinguer lésions stables vs instables (Calder 2014).</span>'
  ]},
  'tb-pi-synd-g':{type:'ortho',items:['Test de Kleiger','Fibular Translation Test','Tiroir Talien Transversal','Squeeze Test']},
  'tb-pi-synd-d':{type:'ortho',items:['Test de Kleiger','Fibular Translation Test','Tiroir Talien Transversal','Squeeze Test']},
  'tb-pi-conf':  {type:'ortho',items:[
    'Griding Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Main stabilisatrice tibia, main mobilisatrice calcanéum. Action: amener pied en FP et gratter calcanéum contre pilon tibial postérieur. ✚ Douleur. Pas de données publiées.</span>',
    "Test d'Impaction <span style=\"font-size:.68rem;color:var(--text3);font-weight:400;display:block\">DD. Main stabilisatrice cou-de-pied pour contrôler la FD. Action: impaction calcanéum en FP et FD. ✚ Douleur en FP ; absence de douleur en FD. Pas de données publiées.</span>",
    'Excentrique LFP1 <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Amener gros orteil en extension résistée complète. Permet de différencier conflit postérieur tissus mous vs osseux. ✚ Douleur. Pas de données publiées.</span>',
    'Molloy Test — Conflit antéro-latéral <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Pied hors table, position neutre. Comprimer gouttière antéro-latérale avec pouce, maintenir compression + amener cheville en dorsiflexion. ✚ Douleur gouttière antéro-latérale majorée en FD. Se: 94,8%, Sp: 88%. Référence: Arthroscopie (Molloy et al. 2011).</span>'
  ]},
  'tb-pi-conf-g':{type:'ortho',items:['Griding Test',"Test d'Impaction",'Excentrique LFP1','Molloy Test']},
  'tb-pi-conf-d':{type:'ortho',items:['Griding Test',"Test d'Impaction",'Excentrique LFP1','Molloy Test']},
  'tb-pi-st':    {type:'ortho',items:[
    'Varus / Valgus en FD — Sous-talienne <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Amener cheville en FD pour verrouiller talus dans la mortaise. Varus: teste sous-talienne en externe ; Valgus: teste sous-talienne en interne. ✚ Qualité arrêt + douleur. Pas de données publiées.</span>',
    'Cisaillement en FD — Sous-talienne <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Amener cheville en FD pour verrouiller talus dans la mortaise. Action: cisaillement dans un sens et dans l\'autre. ✚ Qualité arrêt + douleur. Pas de données publiées.</span>'
  ]},
  'tb-pi-st-g':  {type:'ortho',items:['Varus/Valgus en FD','Cisaillement en FD']},
  'tb-pi-st-d':  {type:'ortho',items:['Varus/Valgus en FD','Cisaillement en FD']},
  'tb-pi-chopart':{type:'ortho',items:[
    'Médiotarse — Talonaviculaire et Calcanéo-Cuboïdienne <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">DD. Mobilise articulation talonaviculaire en ABD pronation puis calcanéo-cuboïdienne en ADD supination. ✚ Douleur. Pas de données publiées.</span>',
    'Neutral Heel Lateral Push Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Patient assis, dorsiflexion neutre. Fixer calcanéum avec main externe, exercer rotation externe sur médiopied. ✚ Douleur. Pas de données publiées.</span>'
  ]},
  'tb-pi-chopart-g':{type:'ortho',items:['Médiotarse','Neutral Heel Lateral Push Test']},
  'tb-pi-chopart-d':{type:'ortho',items:['Médiotarse','Neutral Heel Lateral Push Test']},
  'tb-pi-tc-g': {type:'ortho', items:['Too many toes sign','Windlass test']},
  'tb-pi-tc-d': {type:'ortho', items:['Too many toes sign','Windlass test']},

  // ── LMA — mêmes 6 tests pour chaque muscle ──────────────────
  'tb-lma-pecto':  {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-biceps': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-triceps':{type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-dorsal': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-interco':{type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-ischio': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-quadri': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-adduct': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
  'tb-lma-mollet': {type:'ortho',items:['Étirement actif','Étirement passif','Contraction isométrique course interne','Contraction isométrique course externe','Contraction excentrique','Palpation']},
};

const CRITERIA_REC = [
  {label:' Le talon a dépassé le repère de 80%', ref:'Critère de distance'},
  {label:' Descente fluide sans arrêt jusqu\'à 90°', ref:'Myer 2008'},
  {label:' Maintien statique 3s à 90°', ref:'Schmitt 2012'},
  {label:' Contrôle neuromusculaire du genou (valgus dynamique)', ref:'Hewett 2005 (AJSM)'},
  {label:' Contrôle du tronc (TSB)', ref:'Trunk Sway & Balance'},
];

const MOB = ['Flexion','Extension','Incl. D','Incl. G','Rot. D','Rot. G'];

// ── ROM CONFIG ────────────────────────────────────────────────────────────
// norm : valeur normale de référence (°)
// max  : maximum physiologique pour l'échelle de la barre
// inverted : true si 0 = optimal (ex. déficit d'extension)
var ROM_CONFIG = {
  // Rachis Cervical
  'mob-cerv-Flexion':   {norm:50, max:70,  label:'Flexion cerv.'},
  'mob-cerv-Extension': {norm:60, max:80,  label:'Extension cerv.'},
  'mob-cerv-Incl_D':    {norm:45, max:60,  label:'Incl. cerv. D'},
  'mob-cerv-Incl_G':    {norm:45, max:60,  label:'Incl. cerv. G'},
  'mob-cerv-Rot_D':     {norm:80, max:100, label:'Rot. cerv. D'},
  'mob-cerv-Rot_G':     {norm:80, max:100, label:'Rot. cerv. G'},
  // Rachis Thoracique
  'mob-thor-Flexion':   {norm:50, max:80,  label:'Flexion thor.'},
  'mob-thor-Extension': {norm:25, max:45,  label:'Extension thor.'},
  'mob-thor-Incl_D':    {norm:25, max:40,  label:'Incl. thor. D'},
  'mob-thor-Incl_G':    {norm:25, max:40,  label:'Incl. thor. G'},
  'mob-thor-Rot_D':     {norm:35, max:50,  label:'Rot. thor. D'},
  'mob-thor-Rot_G':     {norm:35, max:50,  label:'Rot. thor. G'},
  // Rachis Lombaire
  'mob-lomb-Flexion':   {norm:60, max:90,  label:'Flexion lomb.'},
  'mob-lomb-Extension': {norm:25, max:40,  label:'Extension lomb.'},
  'mob-lomb-Incl_D':    {norm:25, max:40,  label:'Incl. lomb. D'},
  'mob-lomb-Incl_G':    {norm:25, max:40,  label:'Incl. lomb. G'},
  'mob-lomb-Rot_D':     {norm:5,  max:20,  label:'Rot. lomb. D'},
  'mob-lomb-Rot_G':     {norm:5,  max:20,  label:'Rot. lomb. G'},
  // Hanche — Gauche
  'ha-mob-g-flex': {norm:120, max:145, label:'Flexion hanche G'},
  'ha-mob-g-ext':  {norm:20,  max:35,  label:'Extension hanche G'},
  'ha-mob-g-ri':   {norm:45,  max:65,  label:'RI hanche G'},
  'ha-mob-g-re':   {norm:45,  max:65,  label:'RE hanche G'},
  'ha-mob-g-abd':  {norm:45,  max:60,  label:'ABD hanche G'},
  'ha-mob-g-add':  {norm:30,  max:45,  label:'ADD hanche G'},
  // Hanche — Droit
  'ha-mob-d-flex': {norm:120, max:145, label:'Flexion hanche D'},
  'ha-mob-d-ext':  {norm:20,  max:35,  label:'Extension hanche D'},
  'ha-mob-d-ri':   {norm:45,  max:65,  label:'RI hanche D'},
  'ha-mob-d-re':   {norm:45,  max:65,  label:'RE hanche D'},
  'ha-mob-d-abd':  {norm:45,  max:60,  label:'ABD hanche D'},
  'ha-mob-d-add':  {norm:30,  max:45,  label:'ADD hanche D'},
  // Épaule — Droit
  'rom-ep-d-flex': {norm:170, max:185, label:'Flexion épaule D'},
  'rom-ep-d-ext':  {norm:55,  max:80,  label:'Extension épaule D'},
  'rom-ep-d-abd':  {norm:170, max:185, label:'Abduction épaule D'},
  'rom-ep-d-addh': {norm:45,  max:65,  label:'ADD horiz. épaule D'},
  'rom-ep-d-ri0':  {norm:65,  max:90,  label:'RI 0° épaule D'},
  'rom-ep-d-re0':  {norm:85,  max:100, label:'RE 0° épaule D'},
  'rom-ep-d-ri90': {norm:80,  max:100, label:'RI 90° épaule D'},
  'rom-ep-d-re90': {norm:85,  max:100, label:'RE 90° épaule D'},
  // Épaule — Gauche
  'rom-ep-g-flex': {norm:170, max:185, label:'Flexion épaule G'},
  'rom-ep-g-ext':  {norm:55,  max:80,  label:'Extension épaule G'},
  'rom-ep-g-abd':  {norm:170, max:185, label:'Abduction épaule G'},
  'rom-ep-g-addh': {norm:45,  max:65,  label:'ADD horiz. épaule G'},
  'rom-ep-g-ri0':  {norm:65,  max:90,  label:'RI 0° épaule G'},
  'rom-ep-g-re0':  {norm:85,  max:100, label:'RE 0° épaule G'},
  'rom-ep-g-ri90': {norm:80,  max:100, label:'RI 90° épaule G'},
  'rom-ep-g-re90': {norm:85,  max:100, label:'RE 90° épaule G'},
  // Genou — Droit
  'rom-ge-d-flexa': {norm:145, max:165, label:'Flexion active genou D'},
  'rom-ge-d-flexp': {norm:150, max:165, label:'Flexion passive genou D'},
  'rom-ge-d-ext':   {norm:0,   max:15,  label:'Déficit extension genou D', inverted:true},
  // Genou — Gauche
  'rom-ge-g-flexa': {norm:145, max:165, label:'Flexion active genou G'},
  'rom-ge-g-flexp': {norm:150, max:165, label:'Flexion passive genou G'},
  'rom-ge-g-ext':   {norm:0,   max:15,  label:'Déficit extension genou G', inverted:true},
};

function _mobStatusChange(sel) {
  sel.className = 'mob-status-sel';
  if (sel.value) sel.classList.add('st-' + sel.value);
}

function updateRomBar(el) {
  var id = el.id;
  var cfg = ROM_CONFIG[id];
  if (!cfg) return;
  var v = parseFloat(el.value);
  var barEl  = document.getElementById(id + '-bar');
  var statEl = document.getElementById(id + '-stat');
  if (!barEl && !statEl) return;
  if (isNaN(v) || el.value === '') {
    if (barEl)  { barEl.style.width = '0%'; barEl.className = 'rom-bar-fill'; }
    if (statEl) { statEl.textContent = '—'; statEl.className = 'rom-stat empty'; }
    return;
  }
  var pct = Math.min(Math.max(v / cfg.max * 100, 0), 100);
  var cls, tag;
  if (cfg.inverted) {
    cls = v === 0 ? 'ok' : v <= 5 ? 'warn' : 'bad';
    tag = v === 0 ? 'Normal' : v <= 5 ? 'Acceptable' : 'Insuffisant';
  } else {
    var ratio = cfg.norm > 0 ? v / cfg.norm : 1;
    cls = ratio >= 0.9 ? 'ok' : ratio >= 0.75 ? 'warn' : 'bad';
    tag = ratio >= 0.9 ? 'Normal' : ratio >= 0.75 ? 'Acceptable' : 'Insuffisant';
  }
  if (barEl)  { barEl.style.width = pct + '%'; barEl.className = 'rom-bar-fill ' + cls; }
  if (statEl) { statEl.textContent = tag + ' (n=' + cfg.norm + '°)'; statEl.className = 'rom-stat ' + cls; }
}

function _initAllRomBars() {
  Object.keys(ROM_CONFIG).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) updateRomBar(el);
  });
}

// -- INIT ------------------------------------------------------
function init() {
  // Build test tables
  Object.entries(TESTS).forEach(([id, cfg]) => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    cfg.items.forEach((name, i) => {
      const tr = document.createElement('tr');
      var opts = cfg.opts ? cfg.opts : ['Positif', 'Négatif', 'N/A'];
      var optHtml = '<option value="">-</option>';
      for (var oi=0; oi<opts.length; oi++) {
        optHtml += '<option value="' + opts[oi] + '">' + opts[oi] + '</option>';
      }
      var selId  = 'sel-' + id + '-' + i;
      var noteId = 'note-' + id + '-' + i;
      tr.innerHTML = '<td><div class="test-name">' + name + '</div></td>' +
        '<td class="result-cell"><select id="' + selId + '" data-type="' + cfg.type + '" onchange="onTestChange(this,\'' + id + '\',' + i + ')">' +
        optHtml + '</select></td>' +
        '<td class="note-cell"><input type="text" id="' + noteId + '" placeholder="Observation\u2026" data-note="' + id + '-' + i + '"></td>';
      tbody.appendChild(tr);
    });
  });

  // Mobility grids \u2014 statut qualitatif + note de marqueur
  var MOB_PLACEHOLDERS = {
    'cerv-Flexion':    'Ex\u00a0: menton\u2011sternum 0\u00a0cm\u2026',
    'cerv-Extension':  'Ex\u00a0: occiput\u2011mur 0\u00a0cm\u2026',
    'cerv-Incl__D':    'Ex\u00a0: oreille\u2011\u00e9paule 12\u00a0cm\u2026',
    'cerv-Incl__G':    'Ex\u00a0: oreille\u2011\u00e9paule 12\u00a0cm\u2026',
    'cerv-Rot__D':     'Ex\u00a0: menton\u2011acromion 0\u00a0cm\u2026',
    'cerv-Rot__G':     'Ex\u00a0: menton\u2011acromion 0\u00a0cm\u2026',
    'thor-Flexion':    'Ex\u00a0: DDS 5\u00a0cm, cyphose\u2026',
    'thor-Extension':  'Ex\u00a0: sternum\u2011table 20\u00a0cm\u2026',
    'thor-Incl__D':    'Ex\u00a0: sym\u00e9trique D=G\u2026',
    'thor-Incl__G':    'Ex\u00a0: sym\u00e9trique D=G\u2026',
    'thor-Rot__D':     'Ex\u00a0: \u00e9paule\u2011mur 3\u00a0cm\u2026',
    'thor-Rot__G':     'Ex\u00a0: \u00e9paule\u2011mur 3\u00a0cm\u2026',
    'lomb-Flexion':       'Ex\u00a0: DDS 5\u00a0cm, Schober 14\u00a0cm\u2026',
    'lomb-Extension':     'Ex\u00a0: Schober extension 8\u00a0cm\u2026',
    'lomb-Incl__D':       'Ex\u00a0: majeur\u2011sol 23\u00a0cm\u2026',
    'lomb-Incl__G':       'Ex\u00a0: majeur\u2011sol 23\u00a0cm\u2026',
    'lomb-Rot__D':        'Ex\u00a0: \u00e9paule\u2011genou 18\u00a0cm\u2026',
    'lomb-Rot__G':        'Ex\u00a0: \u00e9paule\u2011genou 18\u00a0cm\u2026',
    'lomb-Glissement_D':  'Ex\u00a0: shift lat\u00e9ral droit spontan\u00e9, correction active\u2026',
    'lomb-Glissement_G':  'Ex\u00a0: shift lat\u00e9ral gauche spontan\u00e9, correction active\u2026',
    'rl-Flexion':       'Ex\u00a0: DDS 5\u00a0cm, Schober 14\u00a0cm\u2026',
    'rl-Extension':     'Ex\u00a0: Schober extension 8\u00a0cm\u2026',
    'rl-Incl__D':       'Ex\u00a0: majeur\u2011sol 23\u00a0cm\u2026',
    'rl-Incl__G':       'Ex\u00a0: majeur\u2011sol 23\u00a0cm\u2026',
    'rl-Rot__D':        'Ex\u00a0: \u00e9paule\u2011genou 18\u00a0cm\u2026',
    'rl-Rot__G':        'Ex\u00a0: \u00e9paule\u2011genou 18\u00a0cm\u2026',
    'rl-Glissement_D':  'Ex\u00a0: shift lat\u00e9ral droit spontan\u00e9, correction active\u2026',
    'rl-Glissement_G':  'Ex\u00a0: shift lat\u00e9ral gauche spontan\u00e9, correction active\u2026',
  };
  var LOMB_EXTRA_MOB = ['Glissement D', 'Glissement G'];
  ['cerv','cv','thor','lomb','rl'].forEach(function(seg) {
    var grid = document.getElementById('mob-' + seg);
    if (!grid) return;
    grid.className = ''; // retire mobility-grid (grille 6 colonnes)
    var items = (seg === 'lomb' || seg === 'rl') ? MOB.concat(LOMB_EXTRA_MOB) : MOB;
    grid.innerHTML = items.map(function(m) {
      var mKey = 'mob-' + seg + '-' + m.replace(/[\s.\/]+/g, '_');
      var phKey = seg + '-' + m.replace(/[\s.\/]+/g, '_');
      var ph = MOB_PLACEHOLDERS[phKey] || 'Marqueur, mesure\u2026';
      return '<div class="mob-dir-row">'
        + '<span class="mob-dir-label">' + m + '</span>'
        + '<select class="mob-status-sel" id="' + mKey + '-st" onchange="_mobStatusChange(this)">'
        + '<option value="">\u2014</option>'
        + '<option value="ok">\u2713\u00a0OK</option>'
        + '<option value="acceptable">~\u00a0Acceptable</option>'
        + '<option value="insuffisant">\u2717\u00a0Insuffisant</option>'
        + '</select>'
        + '<input type="text" class="mob-note-inp" id="' + mKey + '-nt" placeholder="' + ph + '">'
        + '</div>';
    }).join('');
  });

  // Criteria réception
  const critGrid = document.getElementById('rec-criteria');
  CRITERIA_REC.forEach((c, i) => {
    var rowBg = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';
  critGrid.innerHTML += '<div style="display:grid;grid-template-columns:1fr 90px 90px;background:' + rowBg + ';padding:10px 14px;align-items:center;gap:8px;border-bottom:1px solid var(--border)">' +
      '<div style="font-size:.86rem;line-height:1.4;color:var(--text)">' + c.label + '<span style="display:block;font-size:.7rem;color:var(--text3);margin-top:1px">' + c.ref + '</span></div>' +
      '<div style="text-align:center"><input type="checkbox" id="rec-cs-' + i + '" onchange="calcRec()" style="width:18px;height:18px;cursor:pointer;accent-color:var(--accent)"></div>' +
      '<div style="text-align:center"><input type="checkbox" id="rec-ca-' + i + '" onchange="calcRec()" style="width:18px;height:18px;cursor:pointer;accent-color:var(--green)"></div>' +
      '</div>';
  });

  // Set today's date
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  updateAll();
  loadFromStorage();
  applyProfile(getProfile());
  // Forcer le select LMA sur "Choisir" au chargement (le navigateur mémorise la dernière valeur)
  var lmaSmInit = document.getElementById('lma-sel-membre');
  if (lmaSmInit) { lmaSmInit.value = ''; _lmaUpdateMembre(); }
  showPage('infos');
}

// -- PROFILE ---------------------------------------------------
function getProfile(){
  try {
    var p = JSON.parse(localStorage.getItem(R4P_KEYS.PROFILE)||'{}');
    // Fallback : profil Netlify Identity si r4p-profile vide
    if (!p.prenom && !p.nom && !p.am) {
      var cached = JSON.parse(localStorage.getItem(R4P_KEYS.CACHED_PROFILE)||'{}');
      if (cached.prenom || cached.nom || cached.am) return cached;
    }
    return p;
  } catch(e){ return {}; }
}

function applyProfile(p){
  if(!p || (!p.prenom && !p.nom && !p.am && !p.tel)) return;
  var name = ((p.prenom||'')+' '+(p.nom||'')).trim() || '—';
  var cabinet = p.cabinet ? ' — '+p.cabinet : '';
  var sub = [];
  if(p.am) sub.push('N° AM : '+p.am);
  if(p.tel) sub.push(p.tel);
  var nameHtml = name+cabinet;
  var subHtml  = sub.join(' · ');
  var n1 = document.getElementById('sig-tf-name'); if(n1) n1.textContent = nameHtml;
  var s1 = document.getElementById('sig-tf-sub');  if(s1) s1.textContent = subHtml;
  var n2 = document.getElementById('sig-cr-name'); if(n2) n2.textContent = nameHtml;
  var s2 = document.getElementById('sig-cr-sub');  if(s2) s2.textContent = subHtml;
  // ph-meta (print header)
  var phMeta = document.getElementById('ph-meta');
  if(phMeta) {
    var metaParts = [nameHtml];
    if(subHtml) metaParts.push(subHtml);
    phMeta.innerHTML = metaParts.join('<br>');
  }
}

window.addEventListener('message', function(e){
  if(e.origin !== window.location.origin) return;
  if(e.data && e.data.type==='r4p-profile'){
    try { localStorage.setItem(R4P_KEYS.PROFILE, JSON.stringify(e.data.profile)); } catch(ex){}
    applyProfile(e.data.profile);
  }
  // Score reçu depuis Outils.html → mettre à jour le champ du bilan en live
  if(e.data && e.data.type==='r4p-outils-save' && e.data.field){
    var targetEl = document.getElementById(e.data.field);
    if(targetEl){
      targetEl.value = String(e.data.value || '');
      try{ targetEl.dispatchEvent(new Event('input',{bubbles:true})); }catch(ex){}
      try{ targetEl.dispatchEvent(new Event('change',{bubbles:true})); }catch(ex){}
    }
  }
  if(e.data && e.data.type==='r4p-patient-selected'){
    var _newPat = e.data.patient;
    var _isDiff = !_bilanPatient || !_newPat || _bilanPatient.id !== _newPat.id;
    var _msgData = e.data; // capturer pour le callback async
    function _applyPatientSwitch(){
      _bilanPatient = _newPat;
      _currentBilanId = null;
      _bilanModified = false;
      try { localStorage.setItem(R4P_KEYS.PATIENT, _newPat ? JSON.stringify(_newPat) : ''); } catch(ex){}
      if(_msgData.auth && _msgData.auth.access_token){
        try {
          var payload = JSON.parse(atob(_msgData.auth.access_token.split('.')[1]));
          _bilanUid = payload.sub || null;
        } catch(ex){}
        try { sbB.auth.setSession(_msgData.auth); } catch(ex){}
      }
      _updateSaveBar();
      if(_bilanPatient && _isDiff){
        _resetAndLoadPatient(_bilanPatient);
      } else if(_bilanPatient){
        _autofillPatientFields(_bilanPatient);
      }
    }
    // Protection contre la perte de données
    if(_isDiff && _bilanModified){
      _bilanConfirm(
        function(){ _applyPatientSwitch(); },
        function(){
          // Demander au parent de revenir à l'ancien patient
          try { window.parent.postMessage({ type:'r4p-cancel-patient-switch', patientId: _bilanPatient ? _bilanPatient.id : null }, window.location.origin); } catch(ex){}
        }
      );
      return;
    }
    _applyPatientSwitch();
  }
});

/* ═══════════════════════════════════════════════════════════
   SUPABASE — GESTION BILANS
═══════════════════════════════════════════════════════════ */
var SUPA_URL_B = 'https://sxdobjodxkwexaspepdm.supabase.co';
var SUPA_KEY_B = 'sb_publishable_zEJrmQOnKyRm-Y_NyojaTA_ERrDx4pl';
var sbB = supabase.createClient(SUPA_URL_B, SUPA_KEY_B);

var _bilanPatient   = null;
var _currentBilanId = null;
var _currentBilanDate = null; // date ISO (YYYY-MM-DD) du bilan actuellement chargé
var _bilanReadOnly  = false;  // true quand le formulaire est en lecture seule
var _suiviSnapshot  = null;   // snapshot des valeurs au début d'un bilan de suivi
var _bilanIsSuivi   = false;  // true pendant la saisie d'un nouveau bilan de suivi
var _bilanUid       = null;
var _bilanModified  = false;   // true dès qu'une saisie est faite depuis le dernier save/load
var _bilanHistoMode = false;   // true quand on consulte/édite un bilan historique (non-latest)
var _suppressDirty  = false;   // true pendant _deserializeBilan pour ne pas polluer le flag
var _bilanNeedsRefresh = false; // true après un save → charge la vue fusionnée lors du passage en lecture
var _suiviRapideInitial = {};  // snapshot des valeurs DOM à l'ouverture du suivi rapide
var _chartCounter = 0;
var _evoFilterDays = null; // null = tout, sinon nombre de jours (30,90,180,365)
var _evoFilterFrom = '';   // 'YYYY-MM-DD' — date de début filtre custom
var _evoFilterTo   = '';   // 'YYYY-MM-DD' — date de fin filtre custom
var _prevDonnees    = null;    // donnees du bilan précédent (pour deltas inline)
var _allBilans      = [];      // tous les bilans du patient (pour la page évolution)

// Marquer le bilan comme modifié à chaque saisie utilisateur
document.addEventListener('input',  function(){ if(!_suppressDirty) _bilanModified = true; });
document.addEventListener('change', function(){ if(!_suppressDirty) _bilanModified = true; });

// Essayer de récupérer l'uid depuis le localStorage Supabase (fallback au chargement)
(function(){
  try {
    var raw = localStorage.getItem(R4P_KEYS.SUPABASE_AUTH);
    if(raw){
      var parsed = JSON.parse(raw);
      var tok = parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token);
      if(tok){ var pl = JSON.parse(atob(tok.split('.')[1])); _bilanUid = pl.sub || null; }
    }
  } catch(ex){}
})();

// Restaurer patient depuis localStorage au chargement
(function(){
  try {
    var sp = localStorage.getItem(R4P_KEYS.PATIENT);
    if(sp && sp !== '') {
      _bilanPatient = JSON.parse(sp);
      // Charger tous les bilans Supabase pour avoir _allBilans + _prevDonnees
      // (exécuté après l'auth auto-restaurée par le client Supabase)
      setTimeout(function(){ _resetAndLoadPatient(_bilanPatient); }, 0);
    }
    _updateSaveBar();
  } catch(ex){}
})();

function _updateSaveBar(){
  var el = document.getElementById('sb-save-patient');
  var btn = document.getElementById('bilan-save-btn');
  var suiviBtn = document.getElementById('bilan-suivi-btn');
  var nameEl = document.getElementById('sb-name');
  if(!el) return;
  if(_bilanPatient){
    el.innerHTML = 'Patient : <strong>'+_esc2(_bilanPatient.nom)+' '+_esc2(_bilanPatient.prenom)+'</strong>';
    el.classList.remove('no-patient');
    if(btn) btn.classList.remove('no-patient');
    if(nameEl) nameEl.classList.remove('no-patient');
    if(suiviBtn) suiviBtn.disabled = false;
  } else {
    el.innerHTML = '⚠️ Aucun patient sélectionné';
    el.classList.add('no-patient');
    if(btn){ btn.classList.add('no-patient'); btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan'; }
    if(nameEl){ nameEl.textContent = 'Nouveau patient à créer'; nameEl.classList.add('no-patient'); }
    if(suiviBtn) suiviBtn.disabled = true;
  }
}
function _esc2(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── Mode consultation historique ─────────────────────────── */
function _enterHistoMode(bilanDate){
  _bilanHistoMode = true;
  var banner  = document.getElementById('histo-mode-banner');
  var label   = document.getElementById('histo-mode-label');
  var btn     = document.getElementById('bilan-save-btn');
  var readable = bilanDate ? _isoToReadable(bilanDate) : '—';
  if(label)  label.textContent = 'Bilan du ' + readable;
  if(banner) banner.classList.add('active');
  if(btn)    btn.innerHTML = _SAVE_ICON + 'Mettre à jour ce bilan';
}

function _exitHistoMode(){
  _bilanHistoMode = false;
  var banner = document.getElementById('histo-mode-banner');
  var btn    = document.getElementById('bilan-save-btn');
  if(banner) banner.classList.remove('active');
  if(btn && _bilanPatient) btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan';
}

/* ── Mode lecture ────────────────────────────────────────── */
function _enterReadOnlyMode(){
  _bilanReadOnly = true;
  var main = document.querySelector('main');
  if(main) main.classList.add('bilan-readonly');
  var saveBtn  = document.getElementById('bilan-save-btn');
  var editBtn  = document.getElementById('bilan-edit-btn');
  var suiviBtn = document.getElementById('bilan-suivi-btn');
  if(saveBtn)  { saveBtn.style.display = 'none'; saveBtn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan'; }
  if(editBtn)  editBtn.style.display = 'flex';
  if(suiviBtn) suiviBtn.style.display = '';
  // Charger la vue fusionnée ici — APRÈS que le bouton "Modifier" est visible, jamais avant.
  // Cela garantit qu'aucun callback async ne peut écraser le formulaire après que
  // l'utilisateur a cliqué "Modifier" (la fenêtre de vulnérabilité est fermée).
  if(_bilanNeedsRefresh && _allBilans && _allBilans.length){
    _bilanNeedsRefresh = false;
    _deserializeBilan(_buildMergedDonnees(_allBilans));
    document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
    if(_prevDonnees) _renderDeltas(_prevDonnees);
  }
}

function _exitReadOnlyMode(){
  _bilanReadOnly = false;
  var main = document.querySelector('main');
  if(main) main.classList.remove('bilan-readonly');
  var saveBtn = document.getElementById('bilan-save-btn');
  var editBtn = document.getElementById('bilan-edit-btn');
  if(saveBtn) saveBtn.style.display = '';
  if(editBtn) editBtn.style.display = 'none';
}

/* ── Dialog "Modifier ce bilan" ─────────────────────────── */
function editBilan(){
  var dateLabel = _currentBilanDate ? _isoToReadable(_currentBilanDate) : '—';
  var lbl = document.getElementById('modal-edit-date-label');
  var ov  = document.getElementById('modal-confirm-edit');
  if(lbl) lbl.textContent = 'le bilan du ' + dateLabel;
  if(ov)  ov.classList.add('open');
}

function _editBilanConfirm(){
  var ov = document.getElementById('modal-confirm-edit');
  if(ov) ov.classList.remove('open');
  _exitReadOnlyMode();
  _bilanHistoMode = true;
  // Recharger UNIQUEMENT les données brutes de ce bilan (sans fusion des bilans antérieurs).
  // Sans ce reset, le formulaire contient le snapshot fusionné (_buildMergedDonnees) qui
  // inclut des valeurs héritées des bilans plus anciens. Sauvegarder ce snapshot polluerait
  // ce bilan avec des données qu'il ne contient pas en propre.
  var bilanPropre = _allBilans.find(function(b){ return b.id === _currentBilanId; });
  if(bilanPropre && bilanPropre.donnees){
    _resetBilanFields();
    _deserializeBilan(bilanPropre.donnees);
    // Injecter les noms de tests personnalisés des autres bilans (valeurs vides)
    // pour que tous les tests de l'historique soient visibles dans ce bilan
    try{ window._ctMergeNamesFromAllBilans(_allBilans); }catch(ex){}
  }
  var btn = document.getElementById('bilan-save-btn');
  if(btn) btn.innerHTML = _SAVE_ICON + 'Enregistrer les modifications';
  showToast('Mode édition — les modifications seront enregistrées à la date d\'origine');
}

function _editBilanCancel(){
  var ov = document.getElementById('modal-confirm-edit');
  if(ov) ov.classList.remove('open');
}

/* Bouton "↩ Revenir au bilan actuel" — recharge le bilan le plus récent */
function exitHistoMode(){
  if(_bilanModified && !confirm('Quitter le mode consultation ? Les modifications non sauvegardées de ce bilan seront perdues.')) return;
  _exitHistoMode();
  _exitReadOnlyMode();
  if(_allBilans && _allBilans.length){
    var latest = _allBilans[0];
    _currentBilanId   = latest.id;
    _currentBilanDate = latest.date ? latest.date.split('T')[0] : null;
    _suppressDirty = true;
    _resetBilanFields();
    _autofillPatientFields(_bilanPatient);
    _deserializeBilan(_buildMergedDonnees(_allBilans));
    _suppressDirty = false;
    _bilanModified = false;
    _bilanIsSuivi  = false;
    _suiviSnapshot = null;
    document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
    if(_allBilans.length >= 2){
      _prevDonnees = _allBilans[1].donnees || {};
      _renderDeltas(_prevDonnees);
    } else {
      _prevDonnees = null;
    }
    showToast('↩ Retour au bilan du ' + _isoToReadable(latest.date ? latest.date.split('T')[0] : ''));
    // Revenir en mode lecture sur le bilan le plus récent
    _bilanHistoMode = true;
    _enterReadOnlyMode();
  } else {
    _resetBilanFields();
    if(_bilanPatient) _autofillPatientFields(_bilanPatient);
    showToast('↩ Mode consultation quitté');
  }
}

/* Capitalise 1re lettre de chaque mot (accents + tirets) */
function _capName(str){
  if(!str) return str;
  return str.toLowerCase().replace(/(^|[\s\-])([\wÀ-ÿ])/g, function(m, sep, c){ return sep+c.toUpperCase(); });
}
/* Applique la capitalisation sur un input en préservant le curseur */
function _capInput(el){
  var pos = el.selectionStart;
  el.value = _capName(el.value);
  try{ el.setSelectionRange(pos, pos); }catch(e){}
}

function _autofillPatientFields(p){
  var map = {'f-nom':_capName(p.nom||''),'f-prenom':_capName(p.prenom||''),'f-dob':p.ddn||'','f-sexe':p.sexe||''};
  Object.keys(map).forEach(function(id){
    var el = document.getElementById(id);
    if(el && !el.value && map[id]) { el.value = map[id]; }
  });
  try { updateAll(); } catch(ex){}
}

/* ── Rafraîchir le CR si la page est déjà visible ──────── */
function _refreshCRIfVisible(){
  var active = document.querySelector('.page.active');
  if(!active) return;
  if(active.id === 'page-cr')    buildCR();
  if(active.id === 'page-cr-tf') buildCRTF();
}

/* ── Reset + auto-chargement au changement de patient ──── */
function _resetBilanFields(){
  _suppressDirty = true;
  document.querySelectorAll('input:not([type=checkbox]):not([type=radio])').forEach(function(i){ i.value=''; });
  document.querySelectorAll('textarea').forEach(function(t){ t.value=''; });
  document.querySelectorAll('select').forEach(function(s){ s.selectedIndex=0; s.className=''; });
  document.querySelectorAll('input[type=checkbox],input[type=radio]').forEach(function(c){ c.checked=false; });
  try{ var fd=document.getElementById('f-date'); if(fd) fd.value=new Date().toISOString().split('T')[0]; }catch(ex){}
  _painZones=[]; renderPainZones();
  document.querySelectorAll('.evo-delta').forEach(function(el){ el.remove(); });
  // Recalculer TOUTES les fonctions d'affichage dérivées (LSI, RSI, déficits, badges…)
  try{ updateAll(); calcRec(); calcPlioq(); }catch(ex){}
  try{ ['sls','hop','pset','set'].forEach(function(k){ calcLSI(k); }); calcDJ(); calcLunge(); calcHR(); calcMusc(); }catch(ex){}
  try{ calcPlioq2(); calcSEBT(); calcUQYBT(); calcSideHop(); }catch(ex){}
  try{ calcGIRD(); ['ep-trap','ep-dent','ep-rl1','ep-rl2','ep-ri1','ep-ri2','ep-abd','ep-bht','co-f-ext','co-f-flex'].forEach(calcEpForce); ['ha-f-add','ha-f-flech','ha-f-abd','ha-f-ri','ha-f-re'].forEach(calcEpForce); ['ge-f-quad','ge-f-ij'].forEach(calcEpForce); ['pi-f-fp','pi-f-fd','pi-f-inv','pi-f-ev','pi-f-lfh'].forEach(calcEpForce); ['ra-fc-inc'].forEach(calcEpForce); }catch(ex){}
  try{ updateBadges(); _initAllRomBars(); _updateSq0Status(); }catch(ex){}
  // Éléments non couverts par les fonctions ci-dessus
  try{ var hl=document.getElementById('hdr-lma'); if(hl) hl.textContent='—'; }catch(ex){}
  _suppressDirty = false;
  _bilanModified = false;
  _refreshCRIfVisible();
}

function _resetAndLoadPatient(p){
  _exitHistoMode();
  _exitReadOnlyMode();
  _bilanIsSuivi  = false;
  _suiviSnapshot = null;
  _resetBilanFields();
  _autofillPatientFields(p);
  _prevDonnees = null;
  _allBilans   = [];
  var btn = document.getElementById('bilan-save-btn');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Chargement…'; }
  sbB.from('bilans')
    .select('*').eq('patient_id', p.id)
    .order('date',{ascending:false}).limit(50)
    .then(function(res){
      if(btn){ btn.disabled=false; btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan'; }
      if(res.error || !res.data || !res.data.length){
        _showPatientToast('Nouveau bilan vierge');
        _renderEvolutionPage();
        var srPg = document.getElementById('page-suivi-rapide');
        if(srPg && srPg.classList.contains('active')) _renderSuiviRapide();
        return;
      }
      _allBilans = res.data; // du plus récent au plus ancien
      var b = res.data[0];
      _currentBilanId   = b.id;
      _currentBilanDate = b.date ? b.date.split('T')[0] : null;
      // Charger le snapshot fusionné (valeur la plus récente par champ)
      // → le formulaire reflète l'état courant même si certains champs
      //   viennent de bilans de suivi partiels.
      _deserializeBilan(_buildMergedDonnees(res.data));
      if(res.data.length >= 2){
        _prevDonnees = res.data[1].donnees || {};
        _renderDeltas(_prevDonnees);
      }
      var d = b.date ? b.date.split('-').reverse().join('/') : '—';
      _showPatientToast('Bilan du '+d+' chargé');
      _renderEvolutionPage();
      // Passer en mode lecture : bilan existant
      _bilanHistoMode = true;
      _enterReadOnlyMode();
      // Rafraîchir le suivi rapide si l'onglet est déjà ouvert
      var srPg = document.getElementById('page-suivi-rapide');
      if(srPg && srPg.classList.contains('active')) _renderSuiviRapide();
    });
}

function _showPatientToast(msg){
  var el = document.getElementById('sb-save-patient');
  if(!el) return;
  el.innerHTML = '<em style="color:var(--accent);font-style:normal">'+msg+'</em>';
  setTimeout(function(){ _updateSaveBar(); }, 3000);
}

/* ── Snapshot fusionné : valeur la plus récente par champ ──
   Parcourt tous les bilans (oldest→newest) ; les valeurs
   récentes écrasent les anciennes. Retourne un objet donnees
   représentant l'état "le plus à jour" de chaque champ.
   Utilisé pour pré-remplir le formulaire au chargement patient. */
function _buildMergedDonnees(allBilans){
  var merged = {};
  allBilans.slice().reverse().forEach(function(b){ // oldest → newest
    var d = b.donnees || {};
    Object.keys(d).forEach(function(k){
      var v = d[k];
      if(v !== undefined && v !== null && v !== ''){
        // Pour les champs ct-data-*, '[]' = bilan sans tests → ne pas écraser un vrai tableau
        if(k.indexOf('ct-data-') === 0 && v === '[]') return;
        merged[k] = v;
      }
    });
  });
  // Union-merge spécial pour ct-data-* : union de tous les noms de tests,
  // valeurs les plus récentes non-vides par test
  var ctPgs = window._CT_PAGES || [];
  ctPgs.forEach(function(pk){
    var key = 'ct-data-' + pk;
    var seen = {}, nameOrder = [];
    allBilans.slice().reverse().forEach(function(b){ // oldest → newest pour l'ordre
      var raw = (b.donnees||{})[key];
      if(!raw) return;
      try{ (JSON.parse(raw)||[]).forEach(function(t){
        if(t.name && !seen[t.name]){ seen[t.name]={type:t.type||'comparison'}; nameOrder.push(t.name); }
      }); }catch(e){}
    });
    if(!nameOrder.length) return;
    var arr = nameOrder.map(function(name){
      var best = {name:name, valA:'', valB:'', type:seen[name].type};
      allBilans.slice().reverse().forEach(function(b){ // oldest → newest, last non-empty wins
        var raw = (b.donnees||{})[key];
        if(!raw) return;
        try{ (JSON.parse(raw)||[]).forEach(function(t){
          if(t.name !== name) return;
          if(t.type) best.type = t.type;
          if(t.valA !== undefined && t.valA !== '') best.valA = t.valA;
          if(t.valB !== undefined && t.valB !== '') best.valB = t.valB;
        }); }catch(e){}
      });
      return best;
    });
    merged[key] = JSON.stringify(arr);
  });
  return merged;
}

/* ── Évolution : configuration des métriques suivies ───── */
var TRACKED_METRICS = [
  // ── Douleur ──────────────────────────────────────────────
  {id:'f-eva',          label:'Douleur EVA (repos)',        unit:'/10', dir:'down', cat:'Douleur'},
  {id:'f-eva-max',      label:'EVA max (7 jours)',           unit:'/10', dir:'down', cat:'Douleur'},
  // ── Épaule — Mobilité ────────────────────────────────────
  {id:'rom-ep-d-flex',  label:'Flex. épaule D',              unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-g-flex',  label:'Flex. épaule G',              unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-d-abd',   label:'Abduction épaule D',          unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-g-abd',   label:'Abduction épaule G',          unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-d-re0',   label:'RE épaule D (0°)',            unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-g-re0',   label:'RE épaule G (0°)',            unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-d-ri0',   label:'RI épaule D (0°)',            unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-g-ri0',   label:'RI épaule G (0°)',            unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-d-re90',  label:'RE épaule D (90°)',           unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'rom-ep-g-re90',  label:'RE épaule G (90°)',           unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  {id:'gird-ca',        label:'GIRD (côté atteint)',          unit:'°',   dir:'up',   cat:'Épaule — Mobilité'},
  // ── Épaule — Force ──────────────────────────────────────
  {id:'ep-rl1-ca',      label:'RL1 (côté atteint)',           unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl1-cs',      label:'RL1 (côté sain)',              unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl2-ca',      label:'RL2 (côté atteint)',           unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl2-cs',      label:'RL2 (côté sain)',              unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-ri1-ca',      label:'RI1 (côté atteint)',           unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-ri1-cs',      label:'RI1 (côté sain)',              unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-ri2-ca',      label:'RI2 (côté atteint)',           unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-ri2-cs',      label:'RI2 (côté sain)',              unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-abd-ca',      label:'Abducteurs (atteint)',         unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-abd-cs',      label:'Abducteurs (sain)',            unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-bht-ca',      label:'BHT (côté atteint)',           unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  {id:'ep-bht-cs',      label:'BHT (côté sain)',              unit:'kg',  dir:'up',   cat:'Épaule — Force'},
  // ── Coude — Force ───────────────────────────────────────────
  {id:'co-f-ext-ca',    label:'Extension coude (atteint)',    unit:'kg',  dir:'up',   cat:'Coude — Force'},
  {id:'co-f-ext-cs',    label:'Extension coude (sain)',       unit:'kg',  dir:'up',   cat:'Coude — Force'},
  {id:'co-f-flex-ca',   label:'Flexion coude (atteint)',      unit:'kg',  dir:'up',   cat:'Coude — Force'},
  {id:'co-f-flex-cs',   label:'Flexion coude (sain)',         unit:'kg',  dir:'up',   cat:'Coude — Force'},
  // ── Hanche — Force ──────────────────────────────────────────
  {id:'ha-f-add-ca',    label:'Adducteurs (atteint)',         unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-add-cs',    label:'Adducteurs (sain)',            unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-flech-ca',  label:'Fléchisseurs (atteint)',        unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-flech-cs',  label:'Fléchisseurs (sain)',           unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-abd-ca',    label:'Abducteurs (atteint)',          unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-abd-cs',    label:'Abducteurs (sain)',             unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-ri-ca',     label:'RI (atteint)',                  unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-ri-cs',     label:'RI (sain)',                     unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-re-ca',     label:'RE (atteint)',                  unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  {id:'ha-f-re-cs',     label:'RE (sain)',                     unit:'kg',  dir:'up',   cat:'Hanche — Force'},
  // ── Genou — Force ───────────────────────────────────────────
  {id:'ge-f-quad-ca',   label:'Quadriceps (atteint)',         unit:'kg',  dir:'up',   cat:'Genou — Force'},
  {id:'ge-f-quad-cs',   label:'Quadriceps (sain)',            unit:'kg',  dir:'up',   cat:'Genou — Force'},
  {id:'ge-f-ij-ca',     label:'Ischio-jambiers (atteint)',    unit:'kg',  dir:'up',   cat:'Genou — Force'},
  {id:'ge-f-ij-cs',     label:'Ischio-jambiers (sain)',       unit:'kg',  dir:'up',   cat:'Genou — Force'},
  // ── Pied/Cheville — Force ───────────────────────────────────
  {id:'pi-f-fp-ca',     label:'Flex. plantaire (atteint)',    unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-fp-cs',     label:'Flex. plantaire (sain)',       unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-fd-ca',     label:'Flex. dorsale (atteint)',      unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-fd-cs',     label:'Flex. dorsale (sain)',         unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-inv-ca',    label:'Inversion (atteint)',          unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-inv-cs',    label:'Inversion (sain)',             unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-ev-ca',     label:'Éversion (atteint)',           unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-ev-cs',     label:'Éversion (sain)',              unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-lfh-ca',    label:'LFH (atteint)',                unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  {id:'pi-f-lfh-cs',    label:'LFH (sain)',                   unit:'kg',  dir:'up',   cat:'Pied/Cheville — Force'},
  // ── Rachis — Force ──────────────────────────────────────
  {id:'ra-fc-ext',      label:'Ext. cervicale (force)',       unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  {id:'ra-fc-flex',     label:'Flex. cervicale (force)',      unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  {id:'ra-fc-inc-ca',   label:'Incl. cervicale (atteint)',    unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  {id:'ra-fc-inc-cs',   label:'Incl. cervicale (sain)',       unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  {id:'ra-fl-ext',      label:'Ext. lombaire (force)',        unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  {id:'ra-fl-flex',     label:'Flex. lombaire (force)',       unit:'kg',  dir:'up',   cat:'Rachis — Force'},
  // ── Hanche — Mobilité ───────────────────────────────────
  {id:'ha-mob-d-flex',  label:'Flex. hanche D',              unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-g-flex',  label:'Flex. hanche G',              unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-d-ext',   label:'Ext. hanche D',               unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-g-ext',   label:'Ext. hanche G',               unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-d-ri',    label:'RI hanche D',                 unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-g-ri',    label:'RI hanche G',                 unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-d-re',    label:'RE hanche D',                 unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-g-re',    label:'RE hanche G',                 unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-d-abd',   label:'Abduction hanche D',          unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  {id:'ha-mob-g-abd',   label:'Abduction hanche G',          unit:'°',   dir:'up',   cat:'Hanche — Mobilité'},
  // ── Genou — Mobilité ────────────────────────────────────
  {id:'rom-ge-d-flexa', label:'Flex. genou D (actif)',        unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  {id:'rom-ge-g-flexa', label:'Flex. genou G (actif)',        unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  {id:'rom-ge-d-flexp', label:'Flex. genou D (passif)',       unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  {id:'rom-ge-g-flexp', label:'Flex. genou G (passif)',       unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  {id:'rom-ge-d-ext',   label:'Ext. genou D',                unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  {id:'rom-ge-g-ext',   label:'Ext. genou G',                unit:'°',   dir:'up',   cat:'Genou — Mobilité'},
  // ── Tests Fonctionnels MI ────────────────────────────────
  {id:'sls-ca',         label:'SLS (côté atteint)',           unit:'rép', dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sls-cs',         label:'SLS (côté sain)',              unit:'rép', dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'hop-ca',         label:'Hop Test (côté atteint)',      unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'hop-cs',         label:'Hop Test (côté sain)',         unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'lu-ca',          label:'Lunge WBLT (côté atteint)',    unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'lu-cs',          label:'Lunge WBLT (côté sain)',       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'dj-h-ca',        label:'Drop Jump hauteur (atteint)',  unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'dj-h-cs',        label:'Drop Jump hauteur (sain)',     unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'dj-t-ca',        label:'Drop Jump contact (atteint)', unit:'ms',  dir:'down', cat:'Tests Fonctionnels MI'},
  {id:'dj-t-cs',        label:'Drop Jump contact (sain)',    unit:'ms',  dir:'down', cat:'Tests Fonctionnels MI'},
  {id:'sebt-ant-ca',    label:'SEBT Antérieur (atteint)',     unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sebt-ant-cs',    label:'SEBT Antérieur (sain)',        unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sebt-pm-ca',     label:'SEBT Postéro-médial (atteint)',unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sebt-pm-cs',     label:'SEBT Postéro-médial (sain)',   unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sebt-pl-ca',     label:'SEBT Postéro-latéral (atteint)',unit:'cm', dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'sebt-pl-cs',     label:'SEBT Postéro-latéral (sain)',  unit:'cm', dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-med-d',    label:'UQYBT Médial D',               unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-med-g',    label:'UQYBT Médial G',               unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-il-d',     label:'UQYBT Inféro-latéral D',       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-il-g',     label:'UQYBT Inféro-latéral G',       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-sl-d',     label:'UQYBT Supéro-latéral D',       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'uqybt-sl-g',     label:'UQYBT Supéro-latéral G',       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'set-ca',         label:'SET (côté atteint)',            unit:'s',   dir:'up',   cat:'Tests Fonctionnels MI'},
  {id:'set-cs',         label:'SET (côté sain)',               unit:'s',   dir:'up',   cat:'Tests Fonctionnels MI'},
  // ── Tests Fonctionnels MS ────────────────────────────────
  {id:'pset-ca',        label:'PSET (côté atteint)',           unit:'rép', dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'pset-cs',        label:'PSET (côté sain)',              unit:'rép', dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'shrt-d',         label:'SHRT D',                       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'shrt-g',         label:'SHRT G',                       unit:'cm',  dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'ckc-s2',         label:'mCKCUEST S1 (touches)',        unit:'',    dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'ckc-s3',         label:'mCKCUEST S2 (touches)',        unit:'',    dir:'up',   cat:'Tests Fonctionnels MS'},
  {id:'ckc-s4',         label:'mCKCUEST S4 endurance',        unit:'',    dir:'up',   cat:'Tests Fonctionnels MS'},
  // ULRT : moyenne des 3 essais par côté (métrique calculée)
  {id:'ulrt-g-avg', label:'ULRT G (moy. 3 essais)', unit:'cm', dir:'up', cat:'Tests Fonctionnels MS',
    compute: function(d){ var vs=[parseFloat(d['ulrt-g1']),parseFloat(d['ulrt-g2']),parseFloat(d['ulrt-g3'])].filter(function(v){return !isNaN(v);}); return vs.length?vs.reduce(function(a,b){return a+b;},0)/vs.length:NaN; }},
  {id:'ulrt-d-avg', label:'ULRT D (moy. 3 essais)', unit:'cm', dir:'up', cat:'Tests Fonctionnels MS',
    compute: function(d){ var vs=[parseFloat(d['ulrt-d1']),parseFloat(d['ulrt-d2']),parseFloat(d['ulrt-d3'])].filter(function(v){return !isNaN(v);}); return vs.length?vs.reduce(function(a,b){return a+b;},0)/vs.length:NaN; }},
  // ── Tests Fonctionnels Rachis ────────────────────────────
  {id:'rf-flx-cerv',    label:'Endurance fléchisseurs cerv.',  unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
  {id:'rf-ext-cerv',    label:'Endurance extenseurs cerv.',    unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
  {id:'rf-lat-g',       label:'Endurance latérale cerv. G',    unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
  {id:'rf-lat-d',       label:'Endurance latérale cerv. D',    unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
  {id:'rf-sorensen',    label:'Sørensen (ext. lombaires)',      unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
  {id:'rf-pdslrt',      label:'PDSLRT (lombaires)',             unit:'s',   dir:'up',   cat:'Tests Fonctionnels Rachis'},
];

/* ── Configuration des graphiques d'évolution ─────────── */
var CHART_GROUPS = [
  // ─ Douleur ─
  {cat:'Douleur', title:'Douleur EVA (repos)', type:'single', idA:'f-eva', unit:'/10', dir:'down', labelA:'EVA'},
  {cat:'Douleur', title:'EVA max (7 jours)', type:'single', idA:'f-eva-max', unit:'/10', dir:'down', labelA:'EVA max'},
  // ─ Épaule — Mobilité ─
  {cat:'Épaule — Mobilité', title:'Flexion épaule D vs G', type:'dual', idA:'rom-ep-d-flex', idB:'rom-ep-g-flex', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Épaule — Mobilité', title:'RE épaule D vs G (0°)', type:'dual', idA:'rom-ep-d-re0', idB:'rom-ep-g-re0', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Épaule — Mobilité', title:'RI épaule D vs G (0°)', type:'dual', idA:'rom-ep-d-ri0', idB:'rom-ep-g-ri0', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Épaule — Mobilité', title:'RE épaule D vs G (90°)', type:'dual', idA:'rom-ep-d-re90', idB:'rom-ep-g-re90', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Épaule — Mobilité', title:'GIRD (côté atteint)', type:'single', idA:'gird-ca', unit:'°', dir:'up', labelA:'GIRD'},
  // ─ Épaule — Force ─
  {cat:'Épaule — Force', title:'RL1 — Atteint vs Sain', type:'dual', idA:'ep-rl1-ca', idB:'ep-rl1-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'RL2 — Atteint vs Sain', type:'dual', idA:'ep-rl2-ca', idB:'ep-rl2-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'RI1 — Atteint vs Sain', type:'dual', idA:'ep-ri1-ca', idB:'ep-ri1-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'RI2 — Atteint vs Sain', type:'dual', idA:'ep-ri2-ca', idB:'ep-ri2-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'Abducteurs — Atteint vs Sain', type:'dual', idA:'ep-abd-ca', idB:'ep-abd-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'BHT — Atteint vs Sain', type:'dual', idA:'ep-bht-ca', idB:'ep-bht-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  // ─ Hanche — Force ─
  {cat:'Hanche — Force', title:'Adducteurs — Atteint vs Sain', type:'dual', idA:'ha-f-add-ca', idB:'ha-f-add-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Hanche — Force', title:'Fléchisseurs — Atteint vs Sain', type:'dual', idA:'ha-f-flech-ca', idB:'ha-f-flech-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Hanche — Force', title:'Abducteurs — Atteint vs Sain', type:'dual', idA:'ha-f-abd-ca', idB:'ha-f-abd-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Hanche — Force', title:'RI — Atteint vs Sain', type:'dual', idA:'ha-f-ri-ca', idB:'ha-f-ri-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Hanche — Force', title:'RE — Atteint vs Sain', type:'dual', idA:'ha-f-re-ca', idB:'ha-f-re-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  // ─ Genou — Force ─
  {cat:'Genou — Force', title:'Quadriceps — Atteint vs Sain', type:'dual', idA:'ge-f-quad-ca', idB:'ge-f-quad-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Genou — Force', title:'Ischio-jambiers — Atteint vs Sain', type:'dual', idA:'ge-f-ij-ca', idB:'ge-f-ij-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  // ─ Pied/Cheville — Force ─
  {cat:'Pied/Cheville — Force', title:'Flex. plantaire — Atteint vs Sain', type:'dual', idA:'pi-f-fp-ca', idB:'pi-f-fp-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Pied/Cheville — Force', title:'Flex. dorsale — Atteint vs Sain',   type:'dual', idA:'pi-f-fd-ca', idB:'pi-f-fd-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Pied/Cheville — Force', title:'Inversion — Atteint vs Sain',       type:'dual', idA:'pi-f-inv-ca', idB:'pi-f-inv-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Pied/Cheville — Force', title:'Éversion — Atteint vs Sain',        type:'dual', idA:'pi-f-ev-ca', idB:'pi-f-ev-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Pied/Cheville — Force', title:'LFH — Atteint vs Sain',             type:'dual', idA:'pi-f-lfh-ca', idB:'pi-f-lfh-cs', unit:'kg', dir:'up', labelA:'Atteint', labelB:'Sain'},
  // ─ Hanche — Mobilité ─
  {cat:'Hanche — Mobilité', title:'Flexion hanche D vs G', type:'dual', idA:'ha-mob-d-flex', idB:'ha-mob-g-flex', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Hanche — Mobilité', title:'RI hanche D vs G', type:'dual', idA:'ha-mob-d-ri', idB:'ha-mob-g-ri', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Hanche — Mobilité', title:'RE hanche D vs G', type:'dual', idA:'ha-mob-d-re', idB:'ha-mob-g-re', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  // ─ Genou — Mobilité ─
  {cat:'Genou — Mobilité', title:'Flexion genou D vs G (actif)', type:'dual', idA:'rom-ge-d-flexa', idB:'rom-ge-g-flexa', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Genou — Mobilité', title:'Flexion genou D vs G (passif)', type:'dual', idA:'rom-ge-d-flexp', idB:'rom-ge-g-flexp', unit:'°', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  // ─ Tests Fonctionnels MI ─
  {cat:'Tests Fonctionnels MI', title:'SLS — Atteint vs Sain', type:'dual', idA:'sls-ca', idB:'sls-cs', unit:'rép', dir:'up', labelA:'Atteint', labelB:'Sain', condId:'sls-hauteur'},
  {cat:'Tests Fonctionnels MI', title:'Hop Test — Atteint vs Sain', type:'dual', idA:'hop-ca', idB:'hop-cs', unit:'cm', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Tests Fonctionnels MI', title:'Lunge WBLT — Atteint vs Sain', type:'dual', idA:'lu-ca', idB:'lu-cs', unit:'cm', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Tests Fonctionnels MI', title:'Drop Jump hauteur — Atteint vs Sain', type:'dual', idA:'dj-h-ca', idB:'dj-h-cs', unit:'cm', dir:'up', labelA:'Atteint', labelB:'Sain', condId:'dj-hauteur-boite', condUnit:'cm'},
  {cat:'Tests Fonctionnels MI', title:'SEBT Antérieur — Atteint vs Sain', type:'dual', idA:'sebt-ant-ca', idB:'sebt-ant-cs', unit:'cm', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Tests Fonctionnels MI', title:'SEBT Postéro-médial — Atteint vs Sain', type:'dual', idA:'sebt-pm-ca', idB:'sebt-pm-cs', unit:'cm', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Tests Fonctionnels MI', title:'SET — Atteint vs Sain', type:'dual', idA:'set-ca', idB:'set-cs', unit:'s', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Tests Fonctionnels MI', title:'UQYBT Médial — D vs G', type:'dual', idA:'uqybt-med-d', idB:'uqybt-med-g', unit:'cm', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Tests Fonctionnels MI', title:'UQYBT Inféro-latéral — D vs G', type:'dual', idA:'uqybt-il-d', idB:'uqybt-il-g', unit:'cm', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  // ─ Tests Fonctionnels MS ─
  {cat:'Tests Fonctionnels MS', title:'PSET — Atteint vs Sain', type:'dual', idA:'pset-ca', idB:'pset-cs', unit:'rép', dir:'up', labelA:'Atteint', labelB:'Sain', condId:'pset-poids-reel', condUnit:'kg'},
  {cat:'Tests Fonctionnels MS', title:'SHRT — D vs G', type:'dual', idA:'shrt-d', idB:'shrt-g', unit:'cm', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Tests Fonctionnels MS', title:'ULRT — moy. D vs G', type:'dual',
    computeA:function(d){var vs=[parseFloat(d['ulrt-d1']),parseFloat(d['ulrt-d2']),parseFloat(d['ulrt-d3'])].filter(function(v){return !isNaN(v);});return vs.length?vs.reduce(function(a,b){return a+b;},0)/vs.length:NaN;},
    computeB:function(d){var vs=[parseFloat(d['ulrt-g1']),parseFloat(d['ulrt-g2']),parseFloat(d['ulrt-g3'])].filter(function(v){return !isNaN(v);});return vs.length?vs.reduce(function(a,b){return a+b;},0)/vs.length:NaN;},
    unit:'cm', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  // ─ Tests Fonctionnels Rachis ─
  {cat:'Tests Fonctionnels Rachis', title:'Endurance fléchisseurs cerv.', type:'single', idA:'rf-flx-cerv', unit:'s', dir:'up', labelA:'Maintien'},
  {cat:'Tests Fonctionnels Rachis', title:'Endurance extenseurs cerv.', type:'single', idA:'rf-ext-cerv', unit:'s', dir:'up', labelA:'Maintien'},
  {cat:'Tests Fonctionnels Rachis', title:'Endurance latérale cerv. D vs G', type:'dual', idA:'rf-lat-d', idB:'rf-lat-g', unit:'s', dir:'up', labelA:'Côté D', labelB:'Côté G'},
  {cat:'Tests Fonctionnels Rachis', title:'Sørensen — Ext. lombaires', type:'single', idA:'rf-sorensen', unit:'s', dir:'up', labelA:'Maintien'},
];

/* ── Helper : lire la valeur d'une métrique (simple ou calculée) ── */
function _getMetricVal(m, donnees){
  if(m.compute) return m.compute(donnees);
  return parseFloat((donnees||{})[m.id]);
}

/* ── Option C : deltas inline ──────────────────────────── */
function _renderDeltas(prevData){
  document.querySelectorAll('.evo-delta').forEach(function(el){ el.remove(); });
  if(!prevData) return;
  TRACKED_METRICS.forEach(function(m){
    // Les métriques calculées n'ont pas d'élément DOM direct → skip
    if(m.compute) return;
    var el = document.getElementById(m.id);
    if(!el) return;
    var curVal  = parseFloat(el.value);
    var prevVal = parseFloat(prevData[m.id]);
    if(isNaN(curVal) || isNaN(prevVal)) return;
    var diff = curVal - prevVal;
    if(diff === 0) return;
    var isGood = (m.dir === 'up') ? diff > 0 : diff < 0;
    var sign   = diff > 0 ? '+' : '';
    var pct    = prevVal !== 0 ? Math.round(Math.abs(diff) / Math.abs(prevVal) * 100) : null;
    var pctStr = pct !== null ? ' (' + (Math.abs(pct)>999 ? (diff>0?'>':'<')+' 999%' : (diff>0?'+':'−')+pct+'%') + ')' : '';
    var cls    = isGood ? 'evo-pos' : 'evo-neg';
    var badge  = document.createElement('span');
    badge.className = 'evo-delta ' + cls;
    badge.textContent = sign + diff.toFixed(0) + m.unit + pctStr;
    badge.title = 'Bilan précédent : ' + prevVal.toFixed(0) + m.unit;
    el.parentNode.insertBefore(badge, el.nextSibling);
  });

  // Deltas sur les tests personnalisés
  var _ctPagesList = window._CT_PAGES || [];
  _ctPagesList.forEach(function(pk){
    var hf = document.getElementById('ct-data-'+pk);
    if(!hf) return;
    var curArr = [];
    try{ curArr = JSON.parse(hf.value)||[]; }catch(e){ return; }
    var prevRaw = prevData['ct-data-'+pk];
    if(!prevRaw) return;
    var prevByName = {};
    try{ (JSON.parse(prevRaw)||[]).forEach(function(t){ if(t.name) prevByName[t.name]=t; }); }catch(e){ return; }
    curArr.forEach(function(t, idx){
      if(!t.name) return;
      var prev = prevByName[t.name];
      if(!prev) return;
      var row = document.querySelector('#ct-rows-'+pk+' .ct-row[data-idx="'+idx+'"]');
      if(!row) return;
      var cells = row.querySelectorAll('.ct-cell');
      function _ctDeltaBadge(curV, prevV, cell){
        var cur = parseFloat(curV), prv = parseFloat(prevV);
        if(isNaN(cur)||isNaN(prv)||cur===prv) return;
        var diff = cur - prv;
        var pct  = prv !== 0 ? Math.round(Math.abs(diff)/Math.abs(prv)*100) : null;
        var pctStr = pct !== null ? ' ('+(diff>0?'+':'−')+pct+'%)' : '';
        var badge = document.createElement('span');
        badge.className = 'evo-delta '+(diff>0?'evo-pos':'evo-neg');
        badge.textContent = (diff>0?'+':'')+diff.toFixed(0)+pctStr;
        badge.title = 'Bilan précédent : '+prv.toFixed(0);
        cell.appendChild(badge);
      }
      if(cells[0]) _ctDeltaBadge(t.valA, prev.valA, cells[0]);
      if(t.type !== 'perf' && cells[1]) _ctDeltaBadge(t.valB, prev.valB, cells[1]);
    });
  });
}

/* ── Builders de graphiques SVG ───────────────────────── */
/* ── Détection outliers : MAD × 10 (robuste même si IQR = 0) ── */
function _robustFence(arr){
  var valid=arr.filter(function(v){return !isNaN(v);});
  if(valid.length<2)return null;
  var sorted=valid.slice().sort(function(a,b){return a-b;});
  var mid=Math.floor((sorted.length-1)/2);
  var median=sorted.length%2===0?(sorted[mid]+sorted[mid+1])/2:sorted[mid];
  var absDevs=sorted.map(function(v){return Math.abs(v-median);}).sort(function(a,b){return a-b;});
  var mad=absDevs[Math.floor((absDevs.length-1)/2)];
  var scale=mad>0?mad:Math.max(Math.abs(median),1);
  return {lo:median-10*scale, hi:median+10*scale, median:median};
}

function _buildChartB(valsA, dates, opts){
  var id  = opts.chartId;
  var VW  = 500, VH = 120;
  var PAD = {top:18, right:22, bottom:34, left:38};
  var validA = valsA.filter(function(v){return !isNaN(v);});
  if(validA.length < 2) return '';
  var fence = _robustFence(validA);
  var clippedA = fence ? validA.filter(function(v){return v>=fence.lo&&v<=fence.hi;}) : validA;
  if(clippedA.length < 2) clippedA = validA; // fallback si tout est outlier
  var minV = Math.min.apply(null,clippedA); var maxV = Math.max.apply(null,clippedA);
  var pad  = Math.max(1,(maxV-minV)*0.12); minV -= pad; maxV += pad;
  var rangeV = maxV - minV || 1;
  var n = valsA.length;
  var pts = valsA.map(function(v,i){
    var inF = !isNaN(v) && (fence ? v>=fence.lo&&v<=fence.hi : true);
    var x=PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right);
    var y=inF?(VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom):(VH-PAD.bottom);
    return {x:x,y:y,v:v,date:dates[i],valid:inF};
  });
  var html = '<defs><linearGradient id="gb'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/></linearGradient></defs>';
  // Grille
  var step=Math.max(1,Math.ceil((maxV-minV)/4));
  for(var gv=Math.round(minV);gv<=maxV+step;gv+=step){
    var gy=(VH-PAD.bottom)-((gv-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    if(gy<PAD.top||gy>VH-PAD.bottom+2) continue;
    html+='<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+Math.round(gv)+'</text>';
  }
  // Dates X (dédupliquées)
  var shownD={};
  pts.forEach(function(p){if(shownD[p.date])return;shownD[p.date]=true;html+='<text x="'+p.x.toFixed(1)+'" y="'+(VH-PAD.bottom+13)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+p.date+'</text>';});
  // Axe X
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="var(--border)" stroke-width="1"/>';
  // Courbe bezier
  var vp=pts.filter(function(p){return p.valid;});
  if(vp.length>=2){
    var lp='M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
    for(var i=1;i<vp.length;i++){var cx=(vp[i-1].x+vp[i].x)/2;lp+=' C '+cx.toFixed(1)+','+vp[i-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[i].y.toFixed(1)+' '+vp[i].x.toFixed(1)+','+vp[i].y.toFixed(1);}
    var by=VH-PAD.bottom;
    html+='<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#gb'+id+')"/>';
    html+='<path d="'+lp+'" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  // Points + hit areas
  pts.forEach(function(p,i){
    if(!p.valid)return;
    var isFirst=!pts.slice(0,i).some(function(q){return q.valid;});
    var isLast=!pts.slice(i+1).some(function(q){return q.valid;});
    var dec=opts.unit==='cm'&&p.v%1!==0?1:0;
    if(isLast){
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="7" fill="var(--accent)" opacity="0.15"/>';
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="var(--accent)"/>';
      html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent2)">'+p.v.toFixed(dec)+opts.unit+'</text>';
    } else {
      var ptlId='ptlB'+id+'-'+i;
      html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="var(--accent)" stroke-width="'+(isFirst?2:1.5)+'" opacity="'+(isFirst?1:0.65)+'"/>';
      if(isFirst){
        html+='<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="var(--text3)">'+p.v.toFixed(dec)+opts.unit+'</text>';
      } else {
        html+='<text id="'+ptlId+'" visibility="hidden" x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="600" fill="var(--accent2)">'+p.v.toFixed(dec)+opts.unit+'</text>';
      }
      html+='<circle class="evo-hit" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="18" fill="transparent" data-tt="ttB'+id+'" data-x="'+p.x.toFixed(1)+'" data-y="'+p.y.toFixed(1)+'" data-l1="'+p.v.toFixed(dec)+opts.unit+'" data-l2="'+p.date+'"'+(isFirst?'':' data-ptl-id="'+ptlId+'"')+' style="cursor:pointer"/>';
    }
  });
  // Tooltip
  html+='<g id="ttB'+id+'" visibility="hidden" style="pointer-events:none"><rect id="ttB'+id+'-bg" rx="7" fill="var(--accent2)" opacity="0.93" width="84" height="36"/><text id="ttB'+id+'-l1" font-size="11" font-weight="700" fill="#fff" text-anchor="middle"/><text id="ttB'+id+'-l2" font-size="9" fill="rgba(255,255,255,0.65)" text-anchor="middle"/></g>';
  return '<svg class="evo-chart-svg" data-chart="B" data-id="'+id+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

function _buildChartD(valsA, valsB, dates, opts){
  var id=opts.chartId, colorA=opts.colorA||'var(--accent)', colorB=opts.colorB||'var(--green)';
  var VW=500;
  // Déterminer si des bandes de condition seront dessinées (nécessite plus de place en bas)
  var _hasBands = (function(){
    var c=opts.conditions; if(!c||!c.length) return false;
    var eff=[],last=''; c.forEach(function(v){if(v)last=v;eff.push(last);});
    var u=[]; eff.forEach(function(v){if(v&&u.indexOf(v)<0)u.push(v);}); return u.length>1;
  })();
  var VH  = _hasBands ? 152 : 130;
  var PAD = {top:20, right:88, bottom: _hasBands ? 56 : 34, left:38};
  // Axe Y restant fixe : VH-PAD.bottom = 96 dans les deux cas
  var allV=valsA.concat(valsB).filter(function(v){return !isNaN(v);});
  if(allV.length<2)return '';
  var fence=_robustFence(allV);
  var clipped=fence?allV.filter(function(v){return v>=fence.lo&&v<=fence.hi;}):allV;
  if(clipped.length<2)clipped=allV;
  var minV=Math.min.apply(null,clipped), maxV=Math.max.apply(null,clipped);
  var pad=Math.max(1,(maxV-minV)*0.12); minV-=pad; maxV+=pad;
  var rangeV=maxV-minV||1, n=Math.max(valsA.length,valsB.length);
  function pt(vals,i){
    var v=vals[i];
    var inF=!isNaN(v)&&(fence?v>=fence.lo&&v<=fence.hi:true);
    return {x:PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right),y:inF?(VH-PAD.bottom)-((v-minV)/rangeV)*(VH-PAD.top-PAD.bottom):(VH-PAD.bottom),v:v,valid:inF};
  }
  var ptsA=valsA.map(function(v,i){return Object.assign(pt(valsA,i),{date:dates[i]});});
  var ptsB=valsB.map(function(v,i){return Object.assign(pt(valsB,i),{date:dates[i]});});
  var html='<defs><linearGradient id="gd'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C0392B" stop-opacity="0.18"/><stop offset="100%" stop-color="#C0392B" stop-opacity="0.02"/></linearGradient></defs>';
  // ── Zones de condition ──
  (function(){
    var conds = opts.conditions;
    if(!conds || !conds.length) return;
    var ZCOL = [
      {fill:'rgba(245,158,11,0.10)',solid:'#FEF3C7',stroke:'rgba(180,115,7,0.30)',text:'#92400E'},
      {fill:'rgba(124,58,237,0.10)',solid:'#EDE9FE',stroke:'rgba(90,40,180,0.30)',text:'#5B21B6'},
      {fill:'rgba(6,182,212,0.10)', solid:'#CFFAFE',stroke:'rgba(4,130,155,0.30)',text:'#0E7490'},
      {fill:'rgba(244,63,94,0.10)', solid:'#FFE4E6',stroke:'rgba(180,30,60,0.30)',text:'#9F1239'},
      {fill:'rgba(34,197,94,0.10)', solid:'#DCFCE7',stroke:'rgba(20,140,60,0.30)',text:'#166534'},
    ];
    // Propagation avant de la condition connue la plus récente
    var eff = [], last = '';
    conds.forEach(function(c){ if(c) last=c; eff.push(last); });
    // Ordre d'apparition des conditions
    var order = [];
    eff.forEach(function(c){ if(c && order.indexOf(c)<0) order.push(c); });
    if(order.length < 2) return; // rien si toutes identiques
    // Construction des zones contiguës
    var zones = [], curZ = null;
    eff.forEach(function(c, i){
      if(!c){ curZ=null; return; }
      if(!curZ || curZ.c !== c){ curZ={c:c,s:i,e:i}; zones.push(curZ); }
      else { curZ.e=i; }
    });
    // Couleur par condition
    var ci = {};
    order.forEach(function(c,idx){ ci[c]=idx; });
    function px(i){ return PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right); }
    zones.forEach(function(z, zi){
      var cl = ZCOL[ci[z.c] % ZCOL.length];
      var xL = zi===0 ? PAD.left : (px(z.s)+px(z.s-1))/2;
      var xR = z.e===n-1 ? VW-PAD.right : (px(z.e)+px(z.e+1))/2;
      var zW = xR-xL, zH = VH-PAD.top-PAD.bottom;
      // Bande
      html += '<rect x="'+xL.toFixed(1)+'" y="'+PAD.top+'" width="'+zW.toFixed(1)+'" height="'+zH+'" fill="'+cl.fill+'"/>';
      // Ligne de changement (sauf première zone)
      if(zi>0) html += '<line x1="'+xL.toFixed(1)+'" y1="'+PAD.top+'" x2="'+xL.toFixed(1)+'" y2="'+(VH-PAD.bottom)+'" stroke="'+cl.stroke+'" stroke-width="1.5" stroke-dasharray="4,3"/>';
      // Étiquette sous l'axe X (dans la zone PAD.bottom élargie)
      var lx = (xL+xR)/2;
      var lbl = z.c.length>13 ? z.c.substring(0,12)+'…' : z.c;
      var labelY = VH-PAD.bottom+26; // ~14px sous les dates
      html += '<text x="'+lx.toFixed(1)+'" y="'+labelY+'" text-anchor="middle" font-size="8.5" font-weight="700" fill="'+cl.text+'">'+lbl+'</text>';
    });
  })();
  // Grille
  var step=Math.max(1,Math.ceil((maxV-minV)/4));
  for(var gv=Math.round(minV);gv<=maxV+step;gv+=step){
    var gy=(VH-PAD.bottom)-((gv-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    if(gy<PAD.top||gy>VH-PAD.bottom+2)continue;
    html+='<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+Math.round(gv)+'</text>';
  }
  // Ligne zéro (si l'axe Y traverse 0)
  if(minV < 0 && maxV > 0){
    var zy=(VH-PAD.bottom)-((0-minV)/rangeV)*(VH-PAD.top-PAD.bottom);
    html+='<line x1="'+PAD.left+'" y1="'+zy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+zy.toFixed(1)+'" stroke="var(--text3)" stroke-width="1" stroke-dasharray="4,3"/>';
    html+='<text x="'+(PAD.left-5)+'" y="'+(zy+4).toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="var(--text3)">0</text>';
  }
  // Dates X
  var shownD={};
  ptsA.forEach(function(p){if(shownD[p.date])return;shownD[p.date]=true;html+='<text x="'+p.x.toFixed(1)+'" y="'+(VH-PAD.bottom+13)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+p.date+'</text>';});
  // Axe X
  html+='<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="var(--border)" stroke-width="1"/>';
  // Zone déficit
  var vpA=ptsA.filter(function(p){return p.valid;}), vpB=ptsB.filter(function(p){return p.valid;});
  if(vpA.length>=2&&vpB.length>=2){
    var aD='M '+vpB.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' L ')+' L '+vpA.slice().reverse().map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' L ')+' Z';
    html+='<path d="'+aD+'" fill="url(#gd'+id+')"/>';
  }
  // Courbes — groupées par data-line pour toggle
  html += '<g data-line="B">';
  if(vpB.length>=2) html+='<polyline points="'+vpB.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+'" fill="none" stroke="'+colorB+'" stroke-width="2" stroke-dasharray="6,3" stroke-linecap="round"/>';
  // Points B
  ptsB.forEach(function(p,i){
    if(!p.valid)return;
    var isFirst=!ptsB.slice(0,i).some(function(q){return q.valid;});
    var isLast=!ptsB.slice(i+1).some(function(q){return q.valid;});
    if(isLast){html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+colorB+'"/>';}
    else if(isFirst){html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="#fff" stroke="'+colorB+'" stroke-width="2"/>';}
    else{html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.5" fill="'+colorB+'" opacity="0.8"/>';}
  });
  html += '</g>';
  html += '<g data-line="A">';
  if(vpA.length>=2) html+='<polyline points="'+vpA.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+'" fill="none" stroke="'+colorA+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  // Points A
  ptsA.forEach(function(p,i){
    if(!p.valid)return;
    var isFirst=!ptsA.slice(0,i).some(function(q){return q.valid;});
    var isLast=!ptsA.slice(i+1).some(function(q){return q.valid;});
    if(isLast){html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="7" fill="'+colorA+'" opacity="0.15"/><circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+colorA+'"/>';}
    else if(isFirst){html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="#fff" stroke="'+colorA+'" stroke-width="2.5"/>';}
    else{html+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+colorA+'" opacity="0.8"/>';}
  });
  html += '</g>';
  // Labels derniers points
  var lastA=null,lastB=null;
  ptsA.forEach(function(p){if(p.valid)lastA=p;}); ptsB.forEach(function(p){if(p.valid)lastB=p;});
  var decA=opts.unit==='cm'&&lastA&&lastA.v%1!==0?1:0;
  var decB=opts.unit==='cm'&&lastB&&lastB.v%1!==0?1:0;
  if(lastA && lastB){
    var gap = Math.abs(lastA.y - lastB.y);
    var aIsAbove = lastA.y <= lastB.y;
    var lyA, lyB;
    if(gap < 18){
      lyA = Math.min(lastA.y, lastB.y) + 14;
      lyB = Math.min(lastA.y, lastB.y) - 6;
    } else {
      lyA = lastA.y + (aIsAbove ? -6 : 14);
      lyB = lastB.y + (aIsAbove ? 14 : -6);
    }
    html+='<text data-line="A" x="'+(lastA.x-10).toFixed(1)+'" y="'+lyA.toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="'+colorA+'">'+lastA.v.toFixed(decA)+opts.unit+'</text>';
    html+='<text data-line="B" x="'+(lastB.x-10).toFixed(1)+'" y="'+lyB.toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="'+colorB+'">'+lastB.v.toFixed(decB)+opts.unit+'</text>';
  } else {
    if(lastA) html+='<text data-line="A" x="'+(lastA.x-10).toFixed(1)+'" y="'+(lastA.y+14).toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="'+colorA+'">'+lastA.v.toFixed(decA)+opts.unit+'</text>';
    if(lastB) html+='<text data-line="B" x="'+(lastB.x-10).toFixed(1)+'" y="'+(lastB.y-6).toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="'+colorB+'">'+lastB.v.toFixed(decB)+opts.unit+'</text>';
  }
  // Légende
  var lx=VW-PAD.right+8;
  html+='<rect data-line="A" x="'+lx+'" y="'+PAD.top+'" width="8" height="8" rx="2" fill="'+colorA+'"/><text data-line="A" x="'+(lx+11)+'" y="'+(PAD.top+7)+'" font-size="8.5" fill="'+colorA+'" font-weight="600">'+opts.labelA+'</text>';
  html+='<rect data-line="B" x="'+lx+'" y="'+(PAD.top+14)+'" width="8" height="8" rx="2" fill="'+colorB+'"/><text data-line="B" x="'+(lx+11)+'" y="'+(PAD.top+21)+'" font-size="8.5" fill="'+colorB+'" font-weight="600">'+opts.labelB+'</text>';
  // Hit areas + labels click-to-show
  ptsA.forEach(function(pA,i){
    if(!pA||!pA.valid)return;
    var isLastA=!ptsA.slice(i+1).some(function(q){return q.valid;});
    if(isLastA)return;
    var pB=ptsB[i];
    var midY=pA.y;
    var decA2=opts.unit==='cm'&&pA.v%1!==0?1:0;
    var decB2=pB&&pB.valid&&opts.unit==='cm'&&pB.v%1!==0?1:0;
    var vA=pA.v.toFixed(decA2)+opts.unit;
    var vB=pB&&pB.valid?pB.v.toFixed(decB2)+opts.unit:'—';
    var ptlId='ptlD'+id+'-'+i;
    var topY=Math.min(pA.y, pB&&pB.valid?pB.y:pA.y)-9;
    html+='<g id="'+ptlId+'" visibility="hidden">'
      +'<text x="'+pA.x.toFixed(1)+'" y="'+topY.toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="600" fill="'+colorA+'">'+vA+'</text>'
      +(pB&&pB.valid?'<text x="'+pA.x.toFixed(1)+'" y="'+(topY+11).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="600" fill="'+colorB+'">'+vB+'</text>':'')
      +'</g>';
    html+='<circle class="evo-hit-d" cx="'+pA.x.toFixed(1)+'" cy="'+midY.toFixed(1)+'" r="20" fill="transparent" data-tt="ttD'+id+'" data-x="'+pA.x.toFixed(1)+'" data-ya="'+pA.y.toFixed(1)+'" data-yb="'+(pB&&pB.valid?pB.y.toFixed(1):pA.y.toFixed(1))+'" data-la="'+opts.labelA+': '+vA+'" data-lb="'+opts.labelB+': '+vB+'" data-date="'+pA.date+'" data-ptl-id="'+ptlId+'" style="cursor:pointer"/>';
  });
  // Tooltip
  html+='<g id="ttD'+id+'" visibility="hidden" style="pointer-events:none"><rect id="ttD'+id+'-bg" rx="8" fill="var(--accent2)" opacity="0.94" width="120" height="52"/><text id="ttD'+id+'-date" font-size="8.5" fill="rgba(255,255,255,0.6)" text-anchor="middle"/><circle id="ttD'+id+'-dotA" r="4" fill="'+colorA+'"/><text id="ttD'+id+'-la" font-size="10" font-weight="700" fill="#7AB8FF"/><circle id="ttD'+id+'-dotB" r="4" fill="'+colorB+'"/><text id="ttD'+id+'-lb" font-size="10" font-weight="700" fill="#6ED9A0"/></g>';
  return '<svg class="evo-chart-svg" data-chart="D" data-id="'+id+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* ── Événements tooltip (Pointer Events API — souris + touch unifiés) ─── */
var _evoTtOpen = null; // {svgEl, ttId} — tooltip actuellement visible

function _attachChartEvents(){
  var container=document.getElementById('evolution-content');
  if(!container)return;

  function posB(svgEl,ttId,x,y,l1,l2){
    var g=svgEl.getElementById(ttId); if(!g)return;
    var bg=svgEl.getElementById(ttId+'-bg');
    var t1=svgEl.getElementById(ttId+'-l1');
    var t2=svgEl.getElementById(ttId+'-l2');
    var W=84,H=36,VW2=500;
    var tx=Math.max(2,Math.min(x-W/2,VW2-W-2));
    var ty=y-H-12; if(ty<2)ty=y+14;
    bg.setAttribute('x',tx);bg.setAttribute('y',ty);
    var cx=tx+W/2;
    t1.setAttribute('x',cx);t1.setAttribute('y',ty+15);t1.textContent=l1;
    t2.setAttribute('x',cx);t2.setAttribute('y',ty+29);t2.textContent=l2;
    g.setAttribute('visibility','visible');
  }
  function posD(svgEl,ttId,x,ya,yb,date,la,lb){
    var g=svgEl.getElementById(ttId); if(!g)return;
    var bg=svgEl.getElementById(ttId+'-bg');
    var dtEl=svgEl.getElementById(ttId+'-date');
    var dotA=svgEl.getElementById(ttId+'-dotA');
    var laEl=svgEl.getElementById(ttId+'-la');
    var dotB=svgEl.getElementById(ttId+'-dotB');
    var lbEl=svgEl.getElementById(ttId+'-lb');
    var W=120,H=52,VW2=500;
    var tx=Math.max(2,Math.min(x-W/2,VW2-W-2));
    var ty=Math.min(ya,yb)-H-14; if(ty<2)ty=Math.max(ya,yb)+10;
    bg.setAttribute('x',tx);bg.setAttribute('y',ty);
    dtEl.setAttribute('x',tx+W/2);dtEl.setAttribute('y',ty+13);dtEl.textContent=date;
    dotA.setAttribute('cx',tx+12);dotA.setAttribute('cy',ty+27);
    laEl.setAttribute('x',tx+20);laEl.setAttribute('y',ty+31);laEl.textContent=la;
    dotB.setAttribute('cx',tx+12);dotB.setAttribute('cy',ty+43);
    lbEl.setAttribute('x',tx+20);lbEl.setAttribute('y',ty+47);lbEl.textContent=lb;
    g.setAttribute('visibility','visible');
  }

  function _closeTt(){
    if(_evoTtOpen){
      var g=_evoTtOpen.svgEl.getElementById(_evoTtOpen.ttId);
      if(g) g.setAttribute('visibility','hidden');
      _evoTtOpen=null;
    }
  }

  // Fermeture via document — aucun SVG handler, pas de bug WebKit
  if(!document._evoTtDocListener){
    document._evoTtDocListener=true;
    document.addEventListener('pointerdown',function(){_closeTt();});
  }

  function _togglePtLabel(el){
    var ptlId = el.dataset.ptlId;
    if(!ptlId) return;
    var svgEl = el.closest('svg');
    if(!svgEl) return;
    var lbl = svgEl.getElementById(ptlId);
    if(!lbl) return;
    var vis = lbl.getAttribute('visibility');
    lbl.setAttribute('visibility', vis==='visible' ? 'hidden' : 'visible');
  }

  function _attachHit(el, showFn){
    var svgEl=el.closest('svg'), ttId=el.dataset.tt;
    // Hover souris
    el.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse') showFn(svgEl,ttId);});
    el.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse') _closeTt();});
    // Tap / clic
    el.addEventListener('pointerdown',function(e){
      e.stopPropagation(); // empêche le listener document de fermer immédiatement
      _togglePtLabel(el); // affiche/masque le label de la valeur
      if(_evoTtOpen && _evoTtOpen.ttId===ttId){
        _closeTt(); // même point : bascule fermeture
      } else {
        _closeTt(); // ferme l'éventuel autre tooltip ouvert
        showFn(svgEl,ttId);
        _evoTtOpen={svgEl:svgEl, ttId:ttId};
      }
    });
  }

  // Chart B
  container.querySelectorAll('.evo-hit').forEach(function(el){
    _attachHit(el, function(svgEl,ttId){
      posB(svgEl,ttId,parseFloat(el.dataset.x),parseFloat(el.dataset.y),el.dataset.l1,el.dataset.l2);
    });
  });

  // Chart D
  container.querySelectorAll('.evo-hit-d').forEach(function(el){
    _attachHit(el, function(svgEl,ttId){
      posD(svgEl,ttId,parseFloat(el.dataset.x),parseFloat(el.dataset.ya),parseFloat(el.dataset.yb),el.dataset.date,el.dataset.la,el.dataset.lb);
    });
  });
}

/* ── Tests Fonctionnels Qualitatifs — config & helpers ──── */
var QUAL_GROUPS = [
  {
    id:'reception',
    title:'Réception — Qualité de mouvement',
    prefixA:'rec-cs', prefixB:'rec-ca',
    labelA:'Côté sain', labelB:'Côté atteint',
    count:5,
    crToggleId:'rec-cr-toggle',
    criteria:['Talon au repère 80%','Descente fluide à 90°','Maintien 3s à 90°','Contrôle neuromusculaire genou','Contrôle du tronc (TSB)']
  },
  {
    id:'plioq',
    title:'Pliométrie Qualitative',
    prefixA:'plioq-cs', prefixB:'plioq-ca',
    labelA:'Côté sain', labelB:'Côté atteint',
    count:2,
    crToggleId:'plioq-cr-toggle',
    criteria:['Absence de raideur du membre','Absence de déficit de hauteur']
  }
];

/* Calcule le score (0..count) d'un test depuis donnees sérialisées.
   Retourne NaN si aucun champ n'est présent dans donnees (test non renseigné). */
function _qualScore(donnees, prefix, count){
  /* Retourne NaN si aucune case n'est cochée (=test non réalisé).
     Un score 0 n'est retourné que si au moins une case est explicitement
     présente comme true (test réalisé, critères non validés). */
  var hasAnyTrue = false;
  for(var i=0; i<count; i++){
    if(donnees[prefix+'-'+i]===true){ hasAnyTrue=true; break; }
  }
  if(!hasAnyTrue) return NaN;
  var score=0;
  for(var i=0; i<count; i++){
    if(donnees[prefix+'-'+i]===true) score++;
  }
  return score;
}

/* Construit le SVG de courbe de score (entier 0..maxVal) pour CA et CS. */
function _buildQualChart(scoresA, scoresB, dates, opts){
  opts = opts || {};
  var maxVal = opts.maxVal || 5;
  var colorA = 'var(--accent)', colorB = '#16A34A';
  var VW=500, VH=110;
  var PAD={top:18, right:22, bottom:30, left:32};
  var id = opts.chartId || 0;
  var n = scoresA.length;
  var validA = scoresA.filter(function(v){ return !isNaN(v); });
  var validB = scoresB.filter(function(v){ return !isNaN(v); });
  if(validA.length < 2 && validB.length < 2) return '';
  function pxy(i, v){ return { x: PAD.left+(i/Math.max(n-1,1))*(VW-PAD.left-PAD.right), y: (VH-PAD.bottom)-(v/maxVal)*(VH-PAD.top-PAD.bottom) }; }
  var html = '<defs>';
  ['A','B'].forEach(function(s){
    var c = s==='A'?colorA:colorB;
    html += '<linearGradient id="qg'+s+id+'" x1="0" y1="0" x2="0" y2="1">'
      +'<stop offset="0%" stop-color="'+c+'" stop-opacity="0.2"/>'
      +'<stop offset="100%" stop-color="'+c+'" stop-opacity="0.02"/></linearGradient>';
  });
  html += '</defs>';
  // Grille Y (0, mid, max)
  [0, Math.round(maxVal/2), maxVal].forEach(function(gv){
    var gy = (VH-PAD.bottom)-(gv/maxVal)*(VH-PAD.top-PAD.bottom);
    html += '<line x1="'+PAD.left+'" y1="'+gy.toFixed(1)+'" x2="'+(VW-PAD.right)+'" y2="'+gy.toFixed(1)+'" stroke="#EBEBEB" stroke-width="1" stroke-dasharray="3,3"/>';
    html += '<text x="'+(PAD.left-4)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="9" fill="#C0BDB8">'+gv+'</text>';
  });
  // Axe X + dates
  html += '<line x1="'+PAD.left+'" y1="'+(VH-PAD.bottom)+'" x2="'+(VW-PAD.right)+'" y2="'+(VH-PAD.bottom)+'" stroke="var(--border)" stroke-width="1"/>';
  var shownD={};
  scoresA.forEach(function(v,i){ var dt=dates[i]; if(shownD[dt])return; shownD[dt]=true; html+='<text x="'+pxy(i,0).x.toFixed(1)+'" y="'+(VH-PAD.bottom+12)+'" text-anchor="middle" font-size="9" fill="#C0BDB8">'+dt+'</text>'; });
  // Courbe A (CS) et B (CA)
  [[scoresA,'A',colorA],[scoresB,'B',colorB]].forEach(function(row){
    var scores=row[0], side=row[1], c=row[2];
    var valid=scores.map(function(v,i){ return {v:v,i:i}; }).filter(function(p){ return !isNaN(p.v); });
    if(valid.length < 2) return;
    var vp = valid.map(function(p){ var q=pxy(p.i,p.v); return {x:q.x,y:q.y,v:p.v,date:dates[p.i]}; });
    var lp='M '+vp[0].x.toFixed(1)+','+vp[0].y.toFixed(1);
    for(var ii=1;ii<vp.length;ii++){ var cx=(vp[ii-1].x+vp[ii].x)/2; lp+=' C '+cx.toFixed(1)+','+vp[ii-1].y.toFixed(1)+' '+cx.toFixed(1)+','+vp[ii].y.toFixed(1)+' '+vp[ii].x.toFixed(1)+','+vp[ii].y.toFixed(1); }
    var by=VH-PAD.bottom;
    html += '<g data-line="'+side+'">';
    html += '<path d="'+lp+' L '+vp[vp.length-1].x.toFixed(1)+','+by+' L '+vp[0].x.toFixed(1)+','+by+' Z" fill="url(#qg'+side+id+')"/>';
    html += '<path d="'+lp+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    vp.forEach(function(p,ii){
      var isLast=ii===vp.length-1, isFirst=ii===0;
      var lbl=p.v+'/'+maxVal;
      if(isLast){
        html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="6" fill="'+c+'" opacity="0.18"/>';
        html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+c+'"/>';
        html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-12).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent2)">'+lbl+'</text>';
      } else {
        html += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isFirst?3.5:3)+'" fill="#fff" stroke="'+c+'" stroke-width="'+(isFirst?2:1.5)+'"/>';
        if(isFirst) html += '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-9).toFixed(1)+'" text-anchor="middle" font-size="9" fill="var(--text3)">'+lbl+'</text>';
      }
    });
    html += '</g>';
  });
  return '<svg data-qual-id="qual'+id+'" viewBox="0 0 '+VW+' '+VH+'" style="width:100%;overflow:visible">'+html+'</svg>';
}

/* Construit le tableau couleur critère × bilan. */
function _buildQualGrid(bilansAsc, dates, grp){
  var html = '<div class="qual-grid-wrap"><table class="qual-grid">';
  // Header
  html += '<thead><tr><th class="qual-crit-hdr">Critère</th>';
  dates.forEach(function(d){ html += '<th>'+d+'</th>'; });
  html += '</tr></thead><tbody>';
  // Lignes critères
  grp.criteria.forEach(function(label, ci){
    // Ligne critère label
    html += '<tr><td class="qual-crit-lbl" rowspan="2">'+label+'</td>';
    // Côté sain (A)
    bilansAsc.forEach(function(b){
      var v = (b.donnees||{})[grp.prefixA+'-'+ci];
      var chip = v===true ? '<span class="qual-chip ok">✓</span>' : (v===false ? '<span class="qual-chip bad">✗</span>' : '<span class="qual-chip na">—</span>');
      html += '<td>'+chip+'</td>';
    });
    html += '</tr><tr>';
    // Côté atteint (B)
    bilansAsc.forEach(function(b){
      var v = (b.donnees||{})[grp.prefixB+'-'+ci];
      var chip = v===true ? '<span class="qual-chip ok">✓</span>' : (v===false ? '<span class="qual-chip bad">✗</span>' : '<span class="qual-chip na">—</span>');
      html += '<td>'+chip+'</td>';
    });
    html += '</tr>';
  });
  // Ligne score
  html += '<tr><td class="qual-crit-lbl" style="font-weight:700">Score</td>';
  bilansAsc.forEach(function(b, bi){
    var sa = _qualScore(b.donnees||{}, grp.prefixA, grp.count);
    var sb = _qualScore(b.donnees||{}, grp.prefixB, grp.count);
    var maxV = grp.count;
    function badge(sc){ if(isNaN(sc)) return '<span class="qual-chip na">—</span>'; var cls=sc===maxV?'ok':sc>0?'warn':'bad'; return '<span class="qual-score-badge '+cls+'">'+sc+'/'+maxV+'</span>'; }
    html += '<td style="vertical-align:middle"><div style="display:flex;flex-direction:column;gap:3px;align-items:center"><div style="font-size:.6rem;color:var(--accent);font-weight:600">CS</div>'+badge(sa)+'<div style="font-size:.6rem;color:#16A34A;font-weight:600">CA</div>'+badge(sb)+'</div></td>';
  });
  html += '</tr>';
  html += '</tbody></table></div>';
  return html;
}

/* Formate une valeur de condition pour affichage (ex: "1,4 kg", "30 cm", "45 cm + 1 brique") */
function _fmtCond(rawVal, grp){
  var s = String(rawVal === undefined || rawVal === null ? '' : rawVal).trim();
  if(!s) return '';
  if(grp.condUnit){
    var n = parseFloat(s);
    if(isNaN(n)) return '';
    var dec = (n % 1 === 0) ? String(Math.round(n)) : n.toFixed(1).replace('.', ',');
    return dec + ' ' + grp.condUnit;
  }
  return s;
}

/* ── Page Évolution ─────────────────────────────────────── */
/* ── Barre de filtre intervalle d'évolution ── */
function _renderEvoFilterBar(){
  var presets = [
    {label:'1 mois', days:30},
    {label:'3 mois', days:90},
    {label:'6 mois', days:180},
    {label:'1 an',   days:365},
  ];
  var h = '<div class="evo-filter-bar no-print">';
  h += '<button class="evo-filter-btn'+(_evoFilterDays===null&&!_evoFilterFrom?' active':'')+'" onclick="setEvoFilter(null)">Tout</button>';
  presets.forEach(function(p){
    h += '<button class="evo-filter-btn'+(_evoFilterDays===p.days?' active':'')+'" onclick="setEvoFilter('+p.days+')">'+p.label+'</button>';
  });
  var customActive = _evoFilterFrom||_evoFilterTo;
  h += '<button class="evo-filter-btn evo-filter-custom'+(customActive?' active':'')+'" onclick="toggleEvoCustomFilter()">🗓 Personnalisé</button>';
  h += '<div class="evo-custom-dates" id="evo-custom-dates" style="display:'+(customActive?'flex':'none')+';gap:6px;align-items:center;flex-wrap:wrap;">';
  h += '<label style="font-size:.75rem;color:var(--text2)">Du</label>';
  h += '<input type="date" id="evo-date-from" value="'+(_evoFilterFrom||'')+'" onchange="setEvoCustomFilter()" style="font-size:.8rem;padding:3px 6px;border:1px solid var(--border);border-radius:6px;">';
  h += '<label style="font-size:.75rem;color:var(--text2)">au</label>';
  h += '<input type="date" id="evo-date-to" value="'+(_evoFilterTo||'')+'" onchange="setEvoCustomFilter()" style="font-size:.8rem;padding:3px 6px;border:1px solid var(--border);border-radius:6px;">';
  h += '</div></div>';
  return h;
}
function setEvoFilter(days){
  _evoFilterDays = days; _evoFilterFrom = ''; _evoFilterTo = '';
  _renderEvolutionPage();
}
function toggleEvoCustomFilter(){
  var d = document.getElementById('evo-custom-dates');
  if(d) d.style.display = d.style.display === 'none' ? 'flex' : 'none';
}
function setEvoCustomFilter(){
  _evoFilterFrom = (document.getElementById('evo-date-from')||{}).value||'';
  _evoFilterTo   = (document.getElementById('evo-date-to')  ||{}).value||'';
  _evoFilterDays = null;
  _renderEvolutionPage();
}

function _renderEvolutionPage(){
  var container=document.getElementById('evolution-content');
  if(!container)return;
  var bilansAll=_allBilans.slice().reverse(); // chronologique ascendant
  // Appliquer le filtre temporel
  var now = new Date().toISOString().slice(0,10);
  var filteredBilans = bilansAll.filter(function(b){
    if(!b.date) return true;
    if(_evoFilterDays !== null){
      var cutoff = new Date(new Date() - _evoFilterDays*86400000).toISOString().slice(0,10);
      return b.date >= cutoff;
    }
    if(_evoFilterFrom && b.date < _evoFilterFrom) return false;
    if(_evoFilterTo   && b.date > _evoFilterTo)   return false;
    return true;
  });
  var bilansAsc = filteredBilans;
  if(bilansAll.length<2){
    container.innerHTML=_renderEvoFilterBar()+'<div class="evo-empty">Ce patient n\'a que '+(bilansAll.length===0?'aucun':'1')+' bilan sauvegardé. Il en faut au moins 2 pour afficher l\'évolution.</div>';
    return;
  }
  if(bilansAsc.length<2){
    container.innerHTML=_renderEvoFilterBar()+'<div class="evo-empty">Aucun graphique sur cette période — essayez un intervalle plus large.</div>';
    return;
  }
  var dates=bilansAsc.map(function(b){
    if(!b.date)return '—';
    var p=b.date.split('-'); return p[2]+'/'+p[1];
  });
  _chartCounter=0;
  var cats={};
  CHART_GROUPS.forEach(function(grp){if(!cats[grp.cat])cats[grp.cat]=[];cats[grp.cat].push(grp);});
  var html=_renderEvoFilterBar()+'<div class="evo-intro">📅 '+bilansAsc.length+' bilans — du '+dates[0]+' au '+dates[dates.length-1]+'</div>';

  Object.keys(cats).forEach(function(cat){
    var groups=cats[cat], catHtml='';
    groups.forEach(function(grp){
      _chartCounter++;
      var id=_chartCounter;
      var valsA=bilansAsc.map(function(b){
        var d=b.donnees||{};
        // Bilan de suivi : respecter changed_fields pour éviter les faux points
        var cf=d.changed_fields;
        if(cf && grp.idA && cf.indexOf(grp.idA)===-1) return NaN;
        return grp.computeA?grp.computeA(d):parseFloat(d[grp.idA]||'');
      });
      var validA=valsA.filter(function(v){return !isNaN(v);});
      // Pour les graphiques dual (Atteint vs Sain), les deux côtés doivent avoir ≥2 valeurs
      if(grp.type==='dual'){
        var valsB_check=bilansAsc.map(function(b){
          var d=b.donnees||{};
          var cf=d.changed_fields;
          // Pour un test bilatéral : si idA est mesuré dans ce suivi, idB l'est aussi
          if(cf && grp.idB && cf.indexOf(grp.idB)===-1 && (!grp.idA||cf.indexOf(grp.idA)===-1)) return NaN;
          return grp.computeB?grp.computeB(d):parseFloat(d[grp.idB]||'');
        });
        var validB_check=valsB_check.filter(function(v){return !isNaN(v);});
        if(validA.length<2||validB_check.length<2)return;
      } else {
        if(validA.length<2)return;
      }
      // Fence MAD pour KPI (évite d'afficher une valeur outlier comme "Actuel")
      var fenceKPI=_robustFence(validA);
      // Stats : firstA/lastA sur valeurs non-outlier si possible
      var firstA=NaN, lastA=NaN;
      valsA.forEach(function(v){if(!isNaN(v)&&(!fenceKPI||v>=fenceKPI.lo&&v<=fenceKPI.hi)&&isNaN(firstA))firstA=v;});
      valsA.slice().reverse().forEach(function(v){if(!isNaN(v)&&(!fenceKPI||v>=fenceKPI.lo&&v<=fenceKPI.hi)&&isNaN(lastA))lastA=v;});
      // Fallback : si toutes les valeurs sont hors fence (cas extrême), prendre la vraie dernière
      if(isNaN(firstA)){valsA.forEach(function(v){if(!isNaN(v)&&isNaN(firstA))firstA=v;});}
      if(isNaN(lastA)){valsA.slice().reverse().forEach(function(v){if(!isNaN(v)&&isNaN(lastA))lastA=v;});}
      var deltaA=lastA-firstA;
      var isGood=grp.dir==='up'?deltaA>=0:deltaA<=0;
      var sign=deltaA>=0?'+':'';
      var pct=firstA!==0?(deltaA/Math.abs(firstA)*100):null;
      var pctStr=pct!==null?' ('+(Math.abs(pct)>999?(pct>0?'>':'<')+' 999%':(pct>=0?'+':'')+pct.toFixed(0)+'%')+')':'';
      var deltaCls=deltaA===0?'evo-neutral':(isGood?'evo-pos':'evo-neg');
      var dec=grp.unit==='cm'&&firstA%1!==0?1:0;
      var decL=grp.unit==='cm'&&lastA%1!==0?1:0;
      // Chart SVG + dual stats
      var chartSvg='', lastB_val=NaN, firstB_val=NaN, lsiHtml='';
      if(grp.type==='dual'){
        var valsB=bilansAsc.map(function(b){var d=b.donnees||{};var cf=d.changed_fields;if(cf&&grp.idB&&cf.indexOf(grp.idB)===-1&&(!grp.idA||cf.indexOf(grp.idA)===-1))return NaN;return grp.computeB?grp.computeB(d):parseFloat(d[grp.idB]||'');});
        valsB.forEach(function(v){if(!isNaN(v)&&isNaN(firstB_val))firstB_val=v;});
        valsB.slice().reverse().forEach(function(v){if(!isNaN(v)&&isNaN(lastB_val))lastB_val=v;});
        if(!isNaN(lastA) && !isNaN(lastB_val) && Math.max(lastA,lastB_val)>0){
          // Groupes "Atteint vs Sain" en mode non-bilatéral : LSI = A/B (peut dépasser 100)
          // Groupes "D vs G" ou mode bilatéral : min/max (toujours ≤ 100)
          var _evoBilat = _isBilateral() || (grp.labelA !== 'Atteint' && grp.labelA !== 'Sain');
          var lsiVal = _evoBilat
            ? Math.round(Math.min(lastA,lastB_val)/Math.max(lastA,lastB_val)*100)
            : (lastB_val > 0 ? Math.round(lastA/lastB_val*100) : NaN);
          if(!isNaN(lsiVal)){
            var lsiCls=lsiVal>=90?'evo-pos':lsiVal>=75?'evo-neutral':'evo-neg';
            lsiHtml='<span class="evo-kpi '+lsiCls+'">LSI '+lsiVal+'%</span>';
          }
        }
        var _dOpts={unit:grp.unit,dir:grp.dir,labelA:grp.labelA,labelB:grp.labelB,chartId:id,colorA:'var(--accent)',colorB:'var(--green)'};
        if(grp.condId) _dOpts.conditions=bilansAsc.map(function(b){return _fmtCond((b.donnees||{})[grp.condId],grp);});
        chartSvg=_buildChartD(valsA,valsB,dates,_dOpts);
      } else {
        chartSvg=_buildChartB(valsA,dates,{unit:grp.unit,dir:grp.dir,labelA:grp.labelA,chartId:id});
      }
      if(!chartSvg)return;
      // Progression % pour chaque côté (dual)
      function _pctBadge(first,last,dir,color){
        if(isNaN(first)||isNaN(last)||first===0)return '';
        var d=last-first, pct=Math.round(d/Math.abs(first)*100);
        if(pct===0)return '';
        var good=dir==='up'?d>=0:d<=0;
        var cls=d===0?'evo-neutral':(good?'evo-pos':'evo-neg');
        return '<span class="evo-kpi '+cls+'" style="font-size:.65rem">'+(pct>0?'+':'')+pct+'%</span>';
      }
      var kpisHtml = grp.type==='dual'
        ? '<span class="evo-kpi-neutral" style="color:var(--accent);font-weight:700">'+grp.labelA+' : '+lastA.toFixed(decL)+grp.unit+'</span>'
          +_pctBadge(firstA,lastA,grp.dir,'var(--accent)')
          +'<span class="evo-kpi-neutral" style="color:var(--border);padding:0 2px">|</span>'
          +'<span class="evo-kpi-neutral" style="color:var(--green);font-weight:700">'+(!isNaN(lastB_val)?grp.labelB+' : '+lastB_val.toFixed(decL)+grp.unit:'—')+'</span>'
          +(!isNaN(lastB_val)?_pctBadge(firstB_val,lastB_val,grp.dir,'var(--green)'):'')
          +'<span class="evo-kpi-neutral" style="color:var(--border);padding:0 2px">|</span>'
          +lsiHtml
        : '<span class="evo-kpi-neutral">Début : '+firstA.toFixed(dec)+grp.unit+'</span>'
          +'<span class="evo-kpi-neutral">→</span>'
          +'<span class="evo-kpi-strong">Actuel : '+lastA.toFixed(decL)+grp.unit+'</span>'
          +'<span class="evo-kpi '+deltaCls+'">'+sign+deltaA.toFixed(0)+grp.unit+pctStr+'</span>';
      // Pills toggle lignes (dual uniquement)
      var pillsHtml = '';
      if(grp.type === 'dual'){
        var colorPillA = 'var(--accent)', colorPillB = 'var(--green)';
        pillsHtml = '<div class="evo-line-toggles">'
          +'<button class="evo-line-pill active" style="color:'+colorPillA+';border-color:'+colorPillA+'" onclick="toggleEvoPill(this,'+id+',\'A\')" data-line="A">● '+grp.labelA+'</button>'
          +'<button class="evo-line-pill active" style="color:'+colorPillB+';border-color:'+colorPillB+'" onclick="toggleEvoPill(this,'+id+',\'B\')" data-line="B">● '+grp.labelB+'</button>'
          +'</div>';
      }
      // ── Badge ⚠ si conditions variables (les zones sont rendues dans le SVG) ──
      if(grp.condId){
        var _fc=bilansAsc.map(function(b){return _fmtCond((b.donnees||{})[grp.condId],grp).toLowerCase();});
        var _ne=_fc.filter(function(c){return c!=='';});
        var _un=_ne.filter(function(c,i,a){return a.indexOf(c)===i;});
        if(_un.length>1) kpisHtml+=' <span class="evo-cond-warn">⚠ Conditions variables</span>';
      }
      catHtml+='<div class="evo-chart-card evo-unselected" data-chart-id="'+id+'">'
        +'<div class="evo-chart-header">'
        +'<div class="evo-check-wrap"><input type="checkbox" class="evo-chart-check no-print" onchange="this.closest(\'.evo-chart-card\').classList.toggle(\'evo-unselected\',!this.checked)"><span class="evo-chart-title">'+grp.title+'</span></div>'
        +'<div class="evo-chart-kpis">'+kpisHtml+'</div></div>'
        +pillsHtml
        +chartSvg+'</div>';
    });
    if(!catHtml)return;
    html+='<div class="evo-block"><div class="evo-block-title">'+cat+'</div><div class="evo-chart-grid">'+catHtml+'</div></div>';
  });
  // ── Section Tests Fonctionnels Qualitatifs ──
  var qualHtml = '';
  QUAL_GROUPS.forEach(function(grp){
    _chartCounter++;
    var qid = _chartCounter;
    var scoresA = bilansAsc.map(function(b){ return _qualScore(b.donnees||{}, grp.prefixA, grp.count); });
    var scoresB = bilansAsc.map(function(b){ return _qualScore(b.donnees||{}, grp.prefixB, grp.count); });
    var validA = scoresA.filter(function(v){ return !isNaN(v); });
    var validB = scoresB.filter(function(v){ return !isNaN(v); });
    if(validA.length < 2 && validB.length < 2) return;
    var chartSvg = _buildQualChart(scoresA, scoresB, dates, {maxVal: grp.count, chartId: qid, labelA: grp.labelA, labelB: grp.labelB});
    if(!chartSvg) return;
    var gridHtml = _buildQualGrid(bilansAsc, dates, grp);
    // KPIs : score CS / CA dernier bilan
    var lastA = NaN, lastB = NaN;
    scoresA.slice().reverse().forEach(function(v){ if(!isNaN(v) && isNaN(lastA)) lastA = v; });
    scoresB.slice().reverse().forEach(function(v){ if(!isNaN(v) && isNaN(lastB)) lastB = v; });
    var kpisHtml = '';
    if(!isNaN(lastA)) kpisHtml += '<span class="evo-kpi-neutral" style="color:var(--accent);font-weight:700">'+grp.labelA+' : '+lastA+'/'+grp.count+'</span>';
    if(!isNaN(lastA) && !isNaN(lastB)) kpisHtml += '<span class="evo-kpi-neutral" style="color:var(--border);padding:0 4px">|</span>';
    if(!isNaN(lastB)) kpisHtml += '<span class="evo-kpi-neutral" style="color:#16A34A;font-weight:700">'+grp.labelB+' : '+lastB+'/'+grp.count+'</span>';
    // Pills toggle lignes
    var pillsHtml = '<div class="evo-line-toggles">'
      +'<button class="evo-line-pill active" style="color:var(--accent);border-color:var(--accent)" onclick="toggleQualPill(this,\'qual'+qid+'\',\'A\')" data-line="A">● '+grp.labelA+'</button>'
      +'<button class="evo-line-pill active" style="color:#16A34A;border-color:#16A34A" onclick="toggleQualPill(this,\'qual'+qid+'\',\'B\')" data-line="B">● '+grp.labelB+'</button>'
      +'</div>';
    qualHtml += '<div class="evo-chart-card evo-unselected" data-chart-id="qual'+qid+'">'
      +'<div class="evo-chart-header">'
      +'<div class="evo-check-wrap"><input type="checkbox" class="evo-chart-check no-print" onchange="this.closest(\'.evo-chart-card\').classList.toggle(\'evo-unselected\',!this.checked)"><span class="evo-chart-title">'+grp.title+'</span></div>'
      +'<div class="evo-chart-kpis">'+kpisHtml+'</div></div>'
      +pillsHtml
      +chartSvg
      +'<div class="qual-grid-collapsible" id="qgrid-'+qid+'">'+gridHtml+'</div>'
      +'<button class="qual-toggle-btn no-print" onclick="toggleQualGrid(this,\'qgrid-'+qid+'\')" aria-expanded="false">▼ Voir le tableau détaillé</button>'
      +'</div>';
  });
  if(qualHtml){
    html += '<div class="evo-block"><div class="evo-block-title">🧩 Tests Fonctionnels Qualitatifs — MI</div><div class="evo-chart-grid">'+qualHtml+'</div></div>';
  }

  // ── Section Tests Personnalisés ──────────────────────────
  var _ctPgs = window._CT_PAGES || [];
  var _ctPageLabels = {
    epaule:'Épaule', rachis:'Rachis', hanche:'Hanche', genou:'Genou',
    pied:'Pied', lma:'LMA', fonctionnels:'Tests Fonctionnels MI',
    fonctionnelsMS:'Tests Fonctionnels MS', fonctionnelsRachis:'Tests Fonctionnels Rachis'
  };
  var ctHtml = '';
  var bilat = _isBilateral();
  var ctLblA = bilat ? 'Gauche' : 'Atteint';
  var ctLblB = bilat ? 'Droit' : 'Sain';

  _ctPgs.forEach(function(pk){
    // Collecter les noms de tests uniques dans l'ordre d'apparition
    var seen = {}, orderedNames = [];
    bilansAsc.forEach(function(b){
      var raw = (b.donnees||{})['ct-data-'+pk];
      if(!raw) return;
      try{
        (JSON.parse(raw)||[]).forEach(function(t){
          if(t.name && !seen[t.name]){ seen[t.name]={type:t.type||'comparison'}; orderedNames.push(t.name); }
        });
      }catch(e){}
    });

    orderedNames.forEach(function(name){
      var isPerf = seen[name].type === 'perf';

      // Extraire valA par bilan
      var valsA = bilansAsc.map(function(b){
        var raw = (b.donnees||{})['ct-data-'+pk];
        if(!raw) return NaN;
        try{
          var arr = JSON.parse(raw)||[], t=null;
          for(var i=0;i<arr.length;i++){ if(arr[i].name===name){t=arr[i];break;} }
          return t ? parseFloat(t.valA) : NaN;
        }catch(e){ return NaN; }
      });
      var validA = valsA.filter(function(v){ return !isNaN(v); });
      if(validA.length < 2) return;

      _chartCounter++;
      var cid = _chartCounter;
      var chartSvg = '', kpisHtml = '', pillsHtml = '';

      if(isPerf){
        chartSvg = _buildChartB(valsA, dates, {unit:'', dir:'up', labelA:name, chartId:cid});
        if(!chartSvg) return;
        var firstA=NaN, lastA=NaN;
        valsA.forEach(function(v){ if(!isNaN(v)&&isNaN(firstA)) firstA=v; });
        valsA.slice().reverse().forEach(function(v){ if(!isNaN(v)&&isNaN(lastA)) lastA=v; });
        var deltaA=lastA-firstA, signA=deltaA>=0?'+':'';
        var pctA=firstA!==0?(deltaA/Math.abs(firstA)*100):null;
        var pctStrA=pctA!==null?' ('+(pctA>=0?'+':'')+pctA.toFixed(0)+'%)':'';
        var dClsA=deltaA===0?'evo-neutral':deltaA>0?'evo-pos':'evo-neg';
        kpisHtml='<span class="evo-kpi-neutral">Début : '+firstA.toFixed(0)+'</span>'
          +'<span class="evo-kpi-neutral">→</span>'
          +'<span class="evo-kpi-strong">Actuel : '+lastA.toFixed(0)+'</span>'
          +'<span class="evo-kpi '+dClsA+'">'+signA+deltaA.toFixed(0)+pctStrA+'</span>';
      } else {
        var valsB = bilansAsc.map(function(b){
          var raw = (b.donnees||{})['ct-data-'+pk];
          if(!raw) return NaN;
          try{
            var arr = JSON.parse(raw)||[], t=null;
            for(var i=0;i<arr.length;i++){ if(arr[i].name===name){t=arr[i];break;} }
            return t ? parseFloat(t.valB) : NaN;
          }catch(e){ return NaN; }
        });
        var validB = valsB.filter(function(v){ return !isNaN(v); });
        if(validA.length < 2 && validB.length < 2) return;
        chartSvg = _buildChartD(valsA, valsB, dates, {unit:'', dir:'up', labelA:ctLblA, labelB:ctLblB, chartId:cid});
        if(!chartSvg) return;
        var firstA=NaN, lastA=NaN, firstB=NaN, lastB=NaN;
        valsA.forEach(function(v){ if(!isNaN(v)&&isNaN(firstA)) firstA=v; });
        valsA.slice().reverse().forEach(function(v){ if(!isNaN(v)&&isNaN(lastA)) lastA=v; });
        valsB.forEach(function(v){ if(!isNaN(v)&&isNaN(firstB)) firstB=v; });
        valsB.slice().reverse().forEach(function(v){ if(!isNaN(v)&&isNaN(lastB)) lastB=v; });
        var lsiHtml2='';
        if(!isNaN(lastA)&&!isNaN(lastB)&&Math.max(lastA,lastB)>0){
          var lsiV=bilat?Math.round(Math.min(lastA,lastB)/Math.max(lastA,lastB)*100):(lastB>0?Math.round(lastA/lastB*100):NaN);
          if(!isNaN(lsiV)){var lC=lsiV>=90?'evo-pos':lsiV>=75?'evo-neutral':'evo-neg';lsiHtml2='<span class="evo-kpi '+lC+'">LSI '+lsiV+'%</span>';}
        }
        function _pctBadgeCT(first,last){
          if(isNaN(first)||isNaN(last)||first===0)return '';
          var d=last-first,p=Math.round(d/Math.abs(first)*100);if(p===0)return '';
          var cls=d>0?'evo-pos':'evo-neg';
          return '<span class="evo-kpi '+cls+'" style="font-size:.65rem">'+(p>0?'+':'')+p+'%</span>';
        }
        kpisHtml='<span class="evo-kpi-neutral" style="color:var(--accent);font-weight:700">'+ctLblA+' : '+(isNaN(lastA)?'—':lastA.toFixed(0))+'</span>'
          +_pctBadgeCT(firstA,lastA)
          +'<span class="evo-kpi-neutral" style="color:var(--border);padding:0 2px">|</span>'
          +'<span class="evo-kpi-neutral" style="color:var(--green);font-weight:700">'+ctLblB+' : '+(isNaN(lastB)?'—':lastB.toFixed(0))+'</span>'
          +_pctBadgeCT(firstB,lastB)
          +'<span class="evo-kpi-neutral" style="color:var(--border);padding:0 2px">|</span>'
          +lsiHtml2;
        pillsHtml='<div class="evo-line-toggles">'
          +'<button class="evo-line-pill active" style="color:var(--accent);border-color:var(--accent)" onclick="toggleEvoPill(this,'+cid+',\'A\')" data-line="A">● '+ctLblA+'</button>'
          +'<button class="evo-line-pill active" style="color:var(--green);border-color:var(--green)" onclick="toggleEvoPill(this,'+cid+',\'B\')" data-line="B">● '+ctLblB+'</button>'
          +'</div>';
      }

      var pageLabel = _ctPageLabels[pk] ? ' <span style="font-size:.7rem;color:var(--text3);font-weight:400">('+_ctPageLabels[pk]+')</span>' : '';
      ctHtml += '<div class="evo-chart-card evo-unselected" data-chart-id="'+cid+'">'
        +'<div class="evo-chart-header">'
        +'<div class="evo-check-wrap"><input type="checkbox" class="evo-chart-check no-print" onchange="this.closest(\'.evo-chart-card\').classList.toggle(\'evo-unselected\',!this.checked)"><span class="evo-chart-title">'+name+pageLabel+'</span></div>'
        +'<div class="evo-chart-kpis">'+kpisHtml+'</div></div>'
        +pillsHtml+chartSvg+'</div>';
    });
  });
  if(ctHtml){
    html += '<div class="evo-block"><div class="evo-block-title">📋 Tests Personnalisés</div><div class="evo-chart-grid">'+ctHtml+'</div></div>';
  }

  container.innerHTML=html;
  _attachChartEvents();
}

/* ── Toggle par ligne dans chart dual ── */
function toggleEvoPill(btn, chartId, line){
  btn.classList.toggle('active');
  var show = btn.classList.contains('active');
  var svg = document.querySelector('svg[data-id="'+chartId+'"]');
  if(!svg) return;
  svg.querySelectorAll('[data-line="'+line+'"]').forEach(function(el){
    el.style.display = show ? '' : 'none';
  });
}

/* ── Dépliage tableau qualitatif ── */
function toggleQualGrid(btn, gridId){
  var el = document.getElementById(gridId);
  if(!el) return;
  var open = el.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? '▲ Masquer le tableau' : '▼ Voir le tableau détaillé';
}

/* ── Toggle par ligne dans chart qualitatif ── */
function toggleQualPill(btn, qualId, line){
  btn.classList.toggle('active');
  var show = btn.classList.contains('active');
  var svg = document.querySelector('svg[data-qual-id="'+qualId+'"]');
  if(!svg) return;
  svg.querySelectorAll('[data-line="'+line+'"]').forEach(function(el){
    el.style.display = show ? '' : 'none';
  });
}


/* ── Sélection graphiques ────────────────────────────── */
function _selectAllCharts(state){
  var container=document.getElementById('evolution-content');
  if(!container)return;
  container.querySelectorAll('.evo-chart-check').forEach(function(cb){
    cb.checked=state;
    cb.closest('.evo-chart-card').classList.toggle('evo-unselected',!state);
  });
}

/* ── Export / Impression Évolution ────────────────────── */
function _buildEvolutionHTML(){
  var container = document.getElementById('evolution-content');
  if(!container) return null;
  // Ne rendre que si le contenu est absent — évite d'écraser les sélections de l'utilisateur
  if(!container.querySelector('.evo-chart-card')) _renderEvolutionPage();

  // Infos praticien
  var p = getProfile ? getProfile() : {};
  var praticien = ((p.prenom||'')+' '+(p.nom||'')).trim() || 'Antoine PERONNAUD';
  var cabinet   = p.cabinet || 'Athletik Lamarck';
  var am        = p.am  || '';
  var tel       = p.tel || '';
  var email     = p.email || '';

  // Infos patient
  var nom    = ((document.getElementById('f-nom') ||{}).value||'').toUpperCase();
  var prenom = (document.getElementById('f-prenom')||{}).value||'';
  var dob    = (document.getElementById('f-dob')  ||{}).value||'';
  var patient = (prenom+' '+nom).trim();
  var age    = dob ? (new Date().getFullYear()-new Date(dob).getFullYear())+' ans' : '';
  var initials = ((prenom[0]||'')+(nom[0]||'')).toUpperCase()||'?';
  var date   = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});

  // Nombre de bilans
  var nbBilans = _allBilans.length;
  var datesRange = '';
  if(nbBilans >= 2){
    var oldest = _allBilans[_allBilans.length-1];
    var newest = _allBilans[0];
    var fmt = function(d){ if(!d) return '?'; var p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; };
    datesRange = fmt(oldest.date)+' → '+fmt(newest.date);
  }

  // Récupérer uniquement les graphiques sélectionnés (cochés)
  // Si aucun n'est coché, tout inclure (évite un export vide)
  var exportClone = container.cloneNode(true);
  var hasSelected = exportClone.querySelectorAll('.evo-chart-card:not(.evo-unselected)').length > 0;
  if(hasSelected){
    exportClone.querySelectorAll('.evo-chart-card.evo-unselected').forEach(function(el){el.remove();});
  }
  exportClone.querySelectorAll('.evo-chart-check').forEach(function(el){el.remove();});
  exportClone.querySelectorAll('.evo-filter-bar').forEach(function(el){el.remove();});
  // Tableau qualitatif : toujours visible + suppression du bouton toggle
  exportClone.querySelectorAll('.qual-toggle-btn').forEach(function(el){el.remove();});
  exportClone.querySelectorAll('.qual-grid-collapsible').forEach(function(el){el.classList.remove('qual-grid-collapsible');});
  // Nettoyer les blocs catégorie vides
  exportClone.querySelectorAll('.evo-block').forEach(function(bl){
    if(!bl.querySelector('.evo-chart-card'))bl.remove();
  });
  var contentHTML = exportClone.innerHTML
    .replace(/class="evo-intro"[^>]*>/g, 'class="evo-intro" style="display:none">')
    ;

  var metaSub = [am?'N° AM : '+am:'', tel, email].filter(Boolean).join(' · ');

  // CSS standalone — inclut les variables + styles évolution
  var css = ':root{--green:#2D6A4F;--green-l:#E8F5EE;--red:#C0392B;--red-l:#FDECEA;--border:#E8E6E1;--text:#1A1917;--text2:#6B6860;--text3:#9D9B96;--accent2:#1A3A5C;--surface2:#F1F0ED;--surface:#FFFFFF;--accent:#2B5FA6;--accent-l:#EEF3FB}'
    + '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + 'html{font-size:14px}body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:#F0F4F8;color:#1A1917;padding:0}'
    + '.page-wrap{max-width:860px;margin:0 auto;padding:0 0 48px}'
    + '.doc-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 24px;background:var(--accent2)}'
    + '.doc-logo{display:inline-flex;align-items:center;gap:8px}'
    + '.doc-logo svg{display:block;flex-shrink:0}'
    + '.doc-logo .w{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}'
    + '.doc-logo .r{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em}'
    + '.doc-logo .e{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#7FA8D9;margin:0 .05em 0 .01em;line-height:0}'
    + '.doc-logo .p{font-family:\'Poppins\',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-.025em;margin-left:.02em}'
    + '.doc-meta{text-align:right;font-size:.72rem;color:rgba(255,255,255,.8);line-height:1.8}'
    + '.doc-meta strong{font-size:.82rem;color:#fff;display:block}'
    + '.patient-card{background:#fff;padding:20px 24px;border-bottom:1px solid #DDE3EC;display:flex;align-items:center;gap:18px}'
    + '.patient-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0}'
    + '.patient-name{font-size:1.1rem;font-weight:700;color:var(--accent2);margin-bottom:3px}'
    + '.patient-sub{font-size:.8rem;color:var(--text2)}'
    + '.summary-bar{background:var(--accent-l);padding:10px 24px;border-bottom:1px solid #D3D9F0;font-size:.82rem;color:var(--accent2);display:flex;gap:24px;flex-wrap:wrap}'
    + '.summary-bar span{font-weight:600}'
    + '.doc-date-bar{background:#F7F6F3;padding:8px 24px;font-size:.75rem;color:var(--text2);border-bottom:1px solid var(--border)}'
    + '.doc-date-bar span{font-weight:600;color:var(--accent2)}'
    + '.doc-body{padding:20px 24px 0}'
    + '.evo-block{margin-bottom:24px}'
    + '.evo-block-title{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent2);padding:6px 0 6px;border-bottom:2px solid var(--accent-l);margin-bottom:6px}'
    + '.evo-table{width:100%;border-collapse:collapse;font-size:.83rem}'
    + '.evo-table th{background:#F1F0ED;color:var(--text2);font-size:.68rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:7px 10px;border-bottom:1px solid var(--border);text-align:left}'
    + '.evo-table th.center{text-align:center}'
    + '.evo-row td{border-bottom:1px solid var(--border);padding:7px 10px;vertical-align:middle}'
    + '.evo-metric-name{font-weight:500;color:#1A1917}'
    + '.evo-spark{text-align:center}'
    + '.evo-val{font-weight:600;text-align:center;color:var(--text2)}'
    + '.evo-delta-col{font-weight:700;text-align:center}'
    + '.evo-pos{color:var(--green)}.evo-neg{color:var(--red)}.evo-neutral{color:var(--text3)}'
    + '.evo-na{color:var(--text3);font-style:italic;font-size:.78rem}'
    + '.evo-intro{display:none}'  // masqué dans export (on a le summary-bar)
    + '.spark-svg{display:block;margin:0 auto;overflow:visible}'
    + '.evo-chart-card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px 10px;}'
    + '.evo-chart-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px;}'
    + '.evo-chart-title{font-size:.82rem;font-weight:700;color:#1A1917;}'
    + '.evo-chart-kpis{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}'
    + '.evo-kpi-neutral{font-size:.72rem;color:var(--text2);}'
    + '.evo-kpi-strong{font-size:.72rem;font-weight:700;color:var(--accent2);}'
    + '.evo-kpi{font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:10px;}'
    + '.evo-kpi.evo-pos{background:#E8F5EE;color:var(--green);}'
    + '.evo-kpi.evo-neg{background:#FDECEA;color:var(--red);}'
    + '.evo-kpi.evo-neutral{background:#F1F0ED;color:var(--text2);}'
    + '.evo-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}'
    + '@media(max-width:600px){.evo-chart-grid{grid-template-columns:1fr;}}'
    + '.evo-cond-strip{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:6px;padding-top:5px;border-top:1px solid var(--border);}'
    + '.evo-cond-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);white-space:nowrap;}'
    + '.evo-cond-chip{font-size:.64rem;font-weight:500;padding:2px 7px;border-radius:4px;background:#F1F0ED;color:var(--text2);border:1px solid var(--border);white-space:nowrap;}'
    + '.evo-cond-chip.changed{background:#FEF3C7;color:#92400E;border-color:#FDE68A;}'
    + '.evo-cond-warn{font-size:.68rem;font-weight:600;padding:2px 7px;border-radius:10px;background:#FEF3C7;color:#92400E;}'
    + '@media print{.doc-header{background:var(--accent2)!important}.evo-block{break-inside:avoid}.doc-body{padding:12px 24px 0}}'
    // Styles qualitatifs
    + '.qual-grid-wrap{overflow-x:auto;margin-top:10px;}'
    + '.qual-grid{width:100%;border-collapse:collapse;font-size:.72rem;}'
    + '.qual-grid th{background:#F1F0ED;color:#6B6860;font-weight:700;padding:5px 8px;text-align:center;border:1px solid #E8E6E1;white-space:nowrap;}'
    + '.qual-grid th.qual-crit-hdr{text-align:left;min-width:120px;}'
    + '.qual-grid td{padding:4px 6px;border:1px solid #E8E6E1;text-align:center;vertical-align:middle;white-space:nowrap;}'
    + '.qual-grid td.qual-crit-lbl{text-align:left;color:#6B6860;font-weight:500;padding:4px 10px;background:#FFFFFF;}'
    + '.qual-chip{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;font-size:.75rem;font-weight:700;}'
    + '.qual-chip.ok{background:#DCFCE7;color:#16A34A;}'
    + '.qual-chip.bad{background:#FEE2E2;color:#DC2626;}'
    + '.qual-chip.na{background:#F1F0ED;color:#9D9B96;}'
    + '.qual-score-badge{font-size:.82rem;font-weight:700;padding:2px 8px;border-radius:6px;}'
    + '.qual-score-badge.ok{background:#DCFCE7;color:#16A34A;}'
    + '.qual-score-badge.warn{background:#FEF3C7;color:#D97706;}'
    + '.qual-score-badge.bad{background:#FEE2E2;color:#DC2626;}'
    + '.qual-grid-collapsible{display:block;}'
    + '.qual-toggle-btn{display:none;}'
    // Pills de légende (toggle séries)
    + '.evo-line-toggles{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px;}'
    + '.evo-line-pill{display:inline-flex;align-items:center;gap:4px;font-size:.60rem;font-weight:600;padding:2px 8px;border-radius:4px;border:1.5px solid;cursor:pointer;font-family:inherit;line-height:1.5;background:#fff;letter-spacing:.01em;opacity:1;}'
    + '.evo-check-wrap{display:flex;align-items:center;gap:6px;}'
    + '.evo-chart-check{display:none;}'
    ;

  var metaParts = [];
  if(praticien) metaParts.push('<strong>'+(praticien+(cabinet?' — '+cabinet:''))+'</strong>');
  if(metaSub)   metaParts.push(metaSub);

  var html = '<!DOCTYPE html><html lang="fr"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<link rel="stylesheet" href="/fonts/fonts.css">'
    + '<title>Suivi Évolution — '+(patient||'Patient')+'</title>'
    + '<style>'+css+'</style></head><body><div class="page-wrap">'
    // Header
    + '<div class="doc-header"><div class="doc-logo"><svg viewBox="8 34 164 104" width="26" height="16" aria-hidden="true"><g stroke="#4A90D9" stroke-width="17" stroke-linecap="round" fill="none"><line x1="20" y1="118" x2="56" y2="104"/><line x1="70" y1="122" x2="100" y2="84"/><line x1="112" y1="125" x2="134" y2="66"/><line x1="158" y1="128" x2="158" y2="46"/></g></svg><span class="w"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></span></div>'
    + '<div class="doc-meta">'+metaParts.join('<br>')+'</div></div>'
    // Bouton impression (visible à l'écran, masqué à l'impression)
    // Patient card
    + (patient ? '<div class="patient-card"><div class="patient-avatar" style="font-family:Georgia,serif">'+initials+'</div>'
      + '<div><div class="patient-name">'+patient+'</div>'
      + (age ? '<div class="patient-sub">'+age+'</div>' : '')
      + '</div></div>' : '')
    // Résumé
    + '<div class="summary-bar">'
    + '📅 <span>'+nbBilans+' bilans</span> enregistrés'
    + (datesRange ? ' &nbsp;·&nbsp; Période : <span>'+datesRange+'</span>' : '')
    + ' &nbsp;·&nbsp; Export généré le <span>'+date+'</span>'
    + '</div>'
    + '<div class="doc-date-bar">Praticien : <span>'+praticien+(cabinet?' — '+cabinet:'')+'</span></div>'
    // Contenu
    + '<div class="doc-body"><br>'+contentHTML+'</div>'
    + '<div style="margin:32px 24px 0;padding:12px 16px;border-top:1px solid #DDE3EC;font-size:.68rem;color:#9D9B96;text-align:center;line-height:1.6">'
    + '🔒 Document confidentiel — Données de santé à caractère personnel · Usage professionnel exclusif'
    + '<br>Ne pas diffuser sans le consentement du patient · Généré par Rehab<strong>4</strong>Perf'
    + '</div>'
    + '</div>'
    + '<script>document.querySelectorAll(".evo-hit,.evo-hit-d").forEach(function(el){el.addEventListener("click",function(e){e.stopPropagation();var id=el.getAttribute("data-ptl-id");if(id){var t=el.closest("svg").getElementById(id);if(t)t.setAttribute("visibility",t.getAttribute("visibility")==="visible"?"hidden":"visible");}});});<\/script>'
    + '</body></html>';

  return { html: html, patient: patient, date: date };
}

function exportEvolutionHTML(){
  if(_allBilans.length < 2){ alert('Il faut au moins 2 bilans pour exporter l\'évolution.'); return; }
  var r = _buildEvolutionHTML();
  if(!r) return;
  var blob = new Blob([r.html], {type:'text/html;charset=utf-8'});
  var blobUrl = URL.createObjectURL(blob);
  var filename = 'Evolution'+(r.patient?'_'+r.patient.replace(/\s+/g,'_'):'')+'_'+r.date.replace(/\s/g,'-').replace(/,/g,'')+'.html';
  var topDoc = (window.top||window).document;
  var a = topDoc.createElement('a');
  a.href = blobUrl; a.download = filename; a.style.display='none';
  topDoc.body.appendChild(a); a.click();
  setTimeout(function(){ topDoc.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 300);
}

function printEvolution(){
  if(_allBilans.length < 2){ alert('Il faut au moins 2 bilans pour imprimer l\'évolution.'); return; }
  var r = _buildEvolutionHTML();
  if(!r) return;
  var printHtml = r.html.replace('</body>',
    '<script>window.onload=function(){window.focus();setTimeout(function(){window.print();},400);}<\/script></body>');
  var win = (window.top||window).open('','_blank');
  if(!win){ alert('Autorisez les pop-ups pour imprimer.'); return; }
  win.document.open(); win.document.write(printHtml); win.document.close();
}

/* ── Sérialisation ─────────────────────────────────────── */
function _serializeBilan(){
  var data = {};
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(function(el){
    if(el.closest('#print-header')) return; // ignorer la zone impression
    if(el.type==='checkbox'||el.type==='radio') data[el.id]=el.checked;
    else data[el.id]=el.value;
  });
  return data;
}

function _deserializeBilan(data){
  _suppressDirty = true;
  Object.keys(data).forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(el.type==='checkbox'||el.type==='radio') el.checked = !!data[id];
    else el.value = data[id]||'';
    // Restaurer les classes couleur des selects de tests ortho/fonc
    if(el.tagName==='SELECT' && el.dataset.type){
      var v = el.value; var t = el.dataset.type;
      el.className = '';
      if(v==='Positif'||v==='Validé') el.classList.add(t==='fonc'?'positif-fonc':'positif-ortho');
      else if(v==='Négatif'||v==='Pas validé') el.classList.add(t==='fonc'?'negatif-fonc':'negatif-ortho');
    }
    // Restaurer les selects appréciation épaule (ep-apr-sel)
    if(el.tagName==='SELECT' && el.classList.contains('ep-apr-sel')){
      el.className = 'ep-apr-sel';
      if(el.value==='Positif') el.classList.add('positif-ortho');
      else if(el.value==='Négatif') el.classList.add('negatif-ortho');
    }
    try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(ex){}
  });
  try{ updateAll(); calcRec(); calcPlioq(); }catch(ex){}
  try{ ['sls','hop','pset','set'].forEach(function(k){ calcLSI(k); }); calcDJ(); calcLunge(); calcHR(); calcMusc(); }catch(ex){}
  try{ calcCKC(); calcSHRT(); calcULRT(); }catch(ex){}
  try{ calcRachisStat(); calcLNF(); calcSorensen(); calcPDSLRT(); calcShirado(); }catch(ex){}
  try{ calcPlioq2(); calcSEBT(); calcUQYBT(); updateBadges(); }catch(ex){}
  try{ _initAllRomBars(); }catch(ex){}
  try{ calcGIRD(); ['ep-trap','ep-dent','ep-rl1','ep-rl2','ep-ri1','ep-ri2','ep-abd','ep-bht','co-f-ext','co-f-flex'].forEach(calcEpForce); ['ha-f-add','ha-f-flech','ha-f-abd','ha-f-ri','ha-f-re'].forEach(calcEpForce); ['ge-f-quad','ge-f-ij'].forEach(calcEpForce); ['pi-f-fp','pi-f-fd','pi-f-inv','pi-f-ev','pi-f-lfh'].forEach(calcEpForce); ['ra-fc-inc'].forEach(calcEpForce); }catch(ex){}
  _parsePainZones();
  _suppressDirty = false;
  _bilanModified = false;
  try{ _calcWainnerCerv(); _calcDN4(); _calcLaslett(); _calcHaLaslett(); _calcInstabLomb(); _calcFlexionLomb(); _calcMckenzie(); }catch(ex){}
  saveToStorage(); // état complet — une seule écriture après désérialisation
  try{ _ctRestoreAll(); }catch(ex){} // synchroniser _ctData AVANT de rendre le CR
  _refreshCRIfVisible();
}

/* ── Sauvegarder ───────────────────────────────────────── */
function saveBilan(){
  if(!_bilanPatient){
    showToast('⚠️ Aucun patient sélectionné — choisissez un patient depuis l\'accueil');
    var saveEl = document.getElementById('sb-save-patient');
    if(saveEl){ saveEl.style.transition='background .2s'; saveEl.style.background='#FEF3C7'; setTimeout(function(){ saveEl.style.background=''; },1500); }
    return;
  }
  if(!_bilanUid){ showToast('⚠️ Session expirée — sélectionnez à nouveau le patient depuis l\'accueil'); return; }
  var btn = document.getElementById('bilan-save-btn');
  btn.disabled = true; btn.textContent = '⏳ Sauvegarde…';
  var donnees = _serializeBilan();

  // Bilan de suivi : calculer les champs réellement modifiés (Option A — snapshot)
  if(_bilanIsSuivi && _suiviSnapshot){
    var _changedFields = [];
    Object.keys(donnees).forEach(function(k){
      var prev = _suiviSnapshot[k];
      var curr = donnees[k];
      var prevStr = (prev === undefined || prev === null) ? '' : String(prev);
      var currStr = (curr === undefined || curr === null) ? '' : String(curr);
      if(prevStr !== currStr) _changedFields.push(k);
    });
    donnees.changed_fields = _changedFields; // toujours écrire (même vide) pour marquer le bilan comme suivi
  }

  /* ── Mode consultation : on patche le bilan historique à sa date originale ── */
  if(_bilanHistoMode && _currentBilanId){
    // Recalculer changed_fields en comparant au bilan précédent (pas copier l'ancien tableau —
    // sinon les nouveaux champs ajoutés lors du re-save apparaissent à tort en grisé dans le CR).
    var _origBilan = _allBilans.find(function(b){ return b.id === _currentBilanId; });
    var _origHasCF = _origBilan && _origBilan.donnees && _origBilan.donnees.changed_fields;
    if(_origHasCF){
      var _prevD = (_allBilans.length >= 2)
        ? (_allBilans.find(function(b){ return b.id !== _currentBilanId; }) || {}).donnees || {}
        : {};
      var _newCF = [];
      Object.keys(donnees).forEach(function(k){
        if(k === 'changed_fields') return;
        var curr = donnees[k]; var prev = _prevD[k];
        var cs = (curr===undefined||curr===null)?'':String(curr);
        var ps = (prev===undefined||prev===null)?'':String(prev);
        if(cs !== '' && cs !== ps) _newCF.push(k);
      });
      if(_newCF.length) donnees.changed_fields = _newCF;
    }
    _sbRetry(function(){ return sbB.from('bilans').update({donnees:donnees}).eq('id', _currentBilanId).select().single(); })
      .then(function(res){
        btn.disabled = false;
        if(res.error){ btn.innerHTML = _SAVE_ICON + 'Enregistrer les modifications'; alert('Erreur : '+res.error.message); return; }
        _bilanModified = false;
        _syncBilanDatesNotes();
        btn.textContent = '✓ Bilan mis à jour !';
        _bilanNeedsRefresh = true;
        setTimeout(function(){
          btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan';
          _enterReadOnlyMode();
        }, 2500);
        // Rafraîchir _allBilans
        sbB.from('bilans').select('*').eq('patient_id',_bilanPatient.id)
          .order('date',{ascending:false}).limit(50)
          .then(function(r2){
            if(!r2.error && r2.data && r2.data.length){
              _allBilans = r2.data;
              _renderEvolutionPage();
              // Ne pas buildCR() ici : _enterReadOnlyMode va charger la vue fusionnée
              // et appeler _refreshCRIfVisible() — évite un CR incomplet transitoire
              if(!_bilanNeedsRefresh){
                var _activePage = document.querySelector('.page.active');
                if(_activePage && _activePage.id === 'page-cr') buildCR();
              }
            }
          });
      }).catch(function(err){
        btn.disabled = false;
        btn.innerHTML = _SAVE_ICON + 'Mettre à jour ce bilan';
        alert('Erreur réseau : '+(err&&err.message||err));
      });
    return;
  }

  // Date locale (évite le décalage UTC de toISOString)
  var _dn = new Date();
  var today = _dn.getFullYear()+'-'+String(_dn.getMonth()+1).padStart(2,'0')+'-'+String(_dn.getDate()).padStart(2,'0');

  // Chercher s'il existe déjà un bilan à la date du jour pour ce patient
  sbB.from('bilans')
    .select('id,date')
    .eq('patient_id', _bilanPatient.id)
    .eq('date', today)
    .order('created_at', {ascending:true})
    .limit(1)
    .then(function(lookup){
      var existingId = (lookup.data && lookup.data.length) ? lookup.data[0].id : null;
      var p, isNew;
      if (existingId) {
        // Bilan du jour trouvé → on l'écrase (quel que soit celui chargé en mémoire)
        isNew = false;
        p = _sbRetry(function(){ return sbB.from('bilans').update({donnees:donnees, date:today}).eq('id', existingId).select().single(); });
      } else {
        // Aucun bilan aujourd'hui → nouveau snapshot
        isNew = true;
        p = _sbRetry(function(){ return sbB.from('bilans').insert({patient_id:_bilanPatient.id, praticien_id:_bilanUid, date:today, donnees:donnees}).select().single(); });
      }
      return p.then(function(res){
        btn.disabled = false;
        if(res.error){ btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan'; alert('Erreur : '+res.error.message); return; }
        _currentBilanId   = res.data.id;
        _currentBilanDate = res.data.date ? res.data.date.split('T')[0] : today;
        _bilanModified  = false;
        _bilanIsSuivi   = false;
        _suiviSnapshot  = null;
        _syncBilanDatesNotes();
        btn.textContent = isNew ? '✓ Nouveau bilan enregistré !' : '✓ Sauvegardé !';
        setTimeout(function(){ btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan'; }, 2500);
        // Passer en mode lecture après sauvegarde
        _bilanHistoMode = true;
        _bilanNeedsRefresh = true; // _enterReadOnlyMode chargera la vue fusionnée au bon moment
        setTimeout(function(){ _enterReadOnlyMode(); }, 2600);
        // Rafraîchir _allBilans (sans toucher au formulaire — c'est _enterReadOnlyMode qui le fait)
        sbB.from('bilans').select('*').eq('patient_id',_bilanPatient.id)
          .order('date',{ascending:false}).limit(50)
          .then(function(r2){
            if(!r2.error && r2.data && r2.data.length){
              _allBilans = r2.data;
              _prevDonnees = r2.data.length >= 2 ? (r2.data[1].donnees||{}) : null;
              _renderEvolutionPage();
              var _activePage = document.querySelector('.page.active');
              if(_activePage && _activePage.id === 'page-cr') buildCR();
            }
          });
      });
    }).catch(function(err){
      btn.disabled = false;
      btn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan';
      alert('Erreur réseau : '+(err&&err.message||err));
    });
}

/* ── Génère un UUID v4 (pour les notes cliniques) ── */
function _genUUID_bilan() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c==='x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/* ── Synchronise les notes "dates clés" dans clinical_notes après save bilan ──
   Pour chaque date (opération, accident) :
   - Date renseignée → upsert de la note (création ou mise à jour de la date)
   - Date effacée    → suppression de la note
   Stratégie : chercher par (patient_id + praticien_id + title) pour éviter
   les doublons sans contraindre le format d'ID.                              */
function _syncBilanDatesNotes() {
  if (!_bilanPatient || !_bilanUid) return;
  var patId = _bilanPatient.id;
  var uid   = _bilanUid;

  var entries = [
    { field: 'f-date-op',       title: '📅 Date d\'opération' },
    { field: 'f-date-accident', title: '🤕 Date d\'accident'  }
  ];

  entries.forEach(function(entry) {
    var dateVal = (document.getElementById(entry.field) || {}).value || '';
    var title   = entry.title;

    // Chercher si une note existe déjà pour ce patient + praticien + titre
    sbB.from('clinical_notes')
      .select('id')
      .eq('patient_id',   patId)
      .eq('praticien_id', uid)
      .eq('title',        title)
      .limit(1)
      .then(function(res) {
        if (res.error) { console.warn('_syncBilanDatesNotes select error', res.error); return; }
        var existing = (res.data && res.data.length) ? res.data[0] : null;

        if (dateVal) {
          if (existing) {
            // Note existante → mettre à jour la date si elle a changé
            sbB.from('clinical_notes').update({ date: dateVal })
              .eq('id', existing.id)
              .then(function(u){ if(u.error) console.warn('_syncBilanDatesNotes update error', u.error); });
          } else {
            // Pas encore de note → créer
            sbB.from('clinical_notes').insert({
              id:           _genUUID_bilan(),
              patient_id:   patId,
              praticien_id: uid,
              date:         dateVal,
              title:        title,
              body:         '',
              created_at:   new Date().toISOString()
            }).then(function(i){ if(i.error) console.warn('_syncBilanDatesNotes insert error', i.error); });
          }
        } else if (existing) {
          // Date effacée et note existante → supprimer
          sbB.from('clinical_notes').delete()
            .eq('id', existing.id)
            .then(function(d){ if(d.error) console.warn('_syncBilanDatesNotes delete error', d.error); });
        }
      });
  });
}

/* ── Historique ────────────────────────────────────────── */
function openBilanHistory(){
  if(!_bilanPatient){ alert('Sélectionnez un patient depuis la barre de navigation.'); return; }
  document.getElementById('histoOverlay').classList.add('open');
  document.getElementById('histoList').innerHTML = '<div class="histo-empty">Chargement…</div>';
  sbB.from('bilans')
    .select('id,date,created_at')
    .eq('patient_id',_bilanPatient.id)
    .order('date',{ascending:false})
    .then(function(res){
      if(res.error||!res.data.length){
        document.getElementById('histoList').innerHTML='<div class="histo-empty">Aucun bilan enregistré pour ce patient.</div>';
        return;
      }
      var total = res.data.length;
      document.getElementById('histoList').innerHTML = res.data.map(function(b, i){
        var isCurrent = String(_currentBilanId) === String(b.id);
        var num = total - i; // numéro chronologique (1 = le plus ancien)
        // Date lisible + délai relatif (via helpers)
        var isoForHelper = b.date ? b.date.split('T')[0] : '';
        var dateStr = _isoToReadable(isoForHelper);
        var agoStr  = _isoToAgo(isoForHelper);
        var label = num === 1 ? 'Bilan initial' : 'Bilan #'+num;
        var isInitial = num === 1;
        var isoDate = b.date ? b.date.split('T')[0] : '';
        return '<div class="histo-item'+(isCurrent?' current':'')+'" id="histo-row-'+b.id+'">'
          +'<div class="histo-item-num">'+num+'</div>'
          +'<div class="histo-item-info">'
          +'<div class="histo-item-date" id="histo-date-label-'+b.id+'">'+dateStr+'</div>'
          +'<div class="histo-item-ago" id="histo-ago-label-'+b.id+'">'+agoStr+'</div>'
          +'</div>'
          +'<span class="histo-item-badge">'+(isCurrent?'● En cours':label)+'</span>'
          +'<button class="histo-item-edit" onclick="_startEditBilanDate(\''+b.id+'\',\''+isoDate+'\')" title="Modifier la date"><svg width="14" height="14" fill="currentColor" viewBox="0 0 348.882 348.882" xmlns="http://www.w3.org/2000/svg"><g><path d="M333.988,11.758l-0.42-0.383C325.538,4.04,315.129,0,304.258,0c-12.187,0-23.888,5.159-32.104,14.153L116.803,184.231c-1.416,1.55-2.49,3.379-3.154,5.37l-18.267,54.762c-2.112,6.331-1.052,13.333,2.835,18.729c3.918,5.438,10.23,8.685,16.886,8.685c0,0,0.001,0,0.001,0c2.879,0,5.693-0.592,8.362-1.76l52.89-23.138c1.923-0.841,3.648-2.076,5.063-3.626L336.771,73.176C352.937,55.479,351.69,27.929,333.988,11.758z M130.381,234.247l10.719-32.134l0.904-0.99l20.316,18.556l-0.904,0.99L130.381,234.247z M314.621,52.943L182.553,197.53l-20.316-18.556L294.305,34.386c2.583-2.828,6.118-4.386,9.954-4.386c3.365,0,6.588,1.252,9.082,3.53l0.419,0.383C319.244,38.922,319.63,47.459,314.621,52.943z"/><path d="M303.85,138.388c-8.284,0-15,6.716-15,15v127.347c0,21.034-17.113,38.147-38.147,38.147H68.904c-21.035,0-38.147-17.113-38.147-38.147V100.413c0-21.034,17.113-38.147,38.147-38.147h131.587c8.284,0,15-6.716,15-15s-6.716-15-15-15H68.904c-37.577,0-68.147,30.571-68.147,68.147v180.321c0,37.576,30.571,68.147,68.147,68.147h181.798c37.576,0,68.147-30.571,68.147-68.147V153.388C318.85,145.104,312.134,138.388,303.85,138.388z"/></g></svg></button>'
          +'<button class="histo-item-load" onclick="loadBilan(\''+b.id+'\')">'+(isCurrent?'Rechargé':'Charger')+'</button>'
          +'<button class="histo-item-del" onclick="deleteBilan(\''+b.id+'\',\''+dateStr+'\','+(isInitial?'true':'false')+',event)" title="Supprimer ce bilan"><svg width="14" height="14" fill="currentColor" viewBox="-40 0 427 427.00131" xmlns="http://www.w3.org/2000/svg"><path d="m232.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/><path d="m114.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/><path d="m28.398438 127.121094v246.378906c0 14.5625 5.339843 28.238281 14.667968 38.050781 9.285156 9.839844 22.207032 15.425781 35.730469 15.449219h189.203125c13.527344-.023438 26.449219-5.609375 35.730469-15.449219 9.328125-9.8125 14.667969-23.488281 14.667969-38.050781v-246.378906c18.542968-4.921875 30.558593-22.835938 28.078124-41.863282-2.484374-19.023437-18.691406-33.253906-37.878906-33.257812h-51.199218v-12.5c.058593-10.511719-4.097657-20.605469-11.539063-28.03125-7.441406-7.421875-17.550781-11.5546875-28.0625-11.46875h-88.796875c-10.511719-.0859375-20.621094 4.046875-28.0625 11.46875-7.441406 7.425781-11.597656 17.519531-11.539062 28.03125v12.5h-51.199219c-19.1875.003906-35.394531 14.234375-37.878907 33.257812-2.480468 19.027344 9.535157 36.941407 28.078126 41.863282zm239.601562 279.878906h-189.203125c-17.097656 0-30.398437-14.6875-30.398437-33.5v-245.5h250v245.5c0 18.8125-13.300782 33.5-30.398438 33.5zm-158.601562-367.5c-.066407-5.207031 1.980468-10.21875 5.675781-13.894531 3.691406-3.675781 8.714843-5.695313 13.925781-5.605469h88.796875c5.210937-.089844 10.234375 1.929688 13.925781 5.605469 3.695313 3.671875 5.742188 8.6875 5.675782 13.894531v12.5h-128zm-71.199219 32.5h270.398437c9.941406 0 18 8.058594 18 18s-8.058594 18-18 18h-270.398437c-9.941407 0-18-8.058594-18-18s8.058593-18 18-18zm0 0"/><path d="m173.398438 154.703125c-5.523438 0-10 4.476563-10 10v189c0 5.519531 4.476562 10 10 10 5.523437 0 10-4.480469 10-10v-189c0-5.523437-4.476563-10-10-10zm0 0"/></svg></button>'
          +'</div>';
      }).join('');
    });
}

/* ── Édition de date dans l'historique ─────────────────── */
function _startEditBilanDate(bilanId, isoDate) {
  // Si une autre ligne est en cours d'édition, l'annuler d'abord
  var existing = document.querySelector('.histo-date-edit-wrap');
  if (existing) {
    var existingId = existing.dataset.bilanId;
    if (existingId) _cancelEditBilanDate(existingId);
  }

  var infoDiv  = document.querySelector('#histo-row-'+bilanId+' .histo-item-info');
  var editBtn  = document.querySelector('#histo-row-'+bilanId+' .histo-item-edit');
  if (!infoDiv) return;

  // Masquer le bouton crayon
  if (editBtn) editBtn.style.display = 'none';

  // Remplacer le contenu du histo-item-info par un champ date
  infoDiv.innerHTML =
    '<div class="histo-date-edit-wrap" data-bilan-id="'+bilanId+'" data-orig="'+isoDate+'">'
    + '<input class="histo-date-input" id="histo-date-inp-'+bilanId+'" type="date" value="'+isoDate+'">'
    + '<button class="histo-date-confirm" onclick="_confirmEditBilanDate(\''+bilanId+'\')">✓</button>'
    + '<button class="histo-date-cancel" onclick="_cancelEditBilanDate(\''+bilanId+'\')">✕</button>'
    + '</div>';

  var inp = document.getElementById('histo-date-inp-'+bilanId);
  if (inp) {
    inp.focus();
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  _confirmEditBilanDate(bilanId);
      if (e.key === 'Escape') _cancelEditBilanDate(bilanId);
    });
  }
}

function _cancelEditBilanDate(bilanId) {
  // Retrouver la date d'origine depuis le dataset
  var wrap = document.querySelector('.histo-date-edit-wrap[data-bilan-id="'+bilanId+'"]');
  var origIso = wrap ? wrap.dataset.orig : '';

  var infoDiv = document.querySelector('#histo-row-'+bilanId+' .histo-item-info');
  var editBtn = document.querySelector('#histo-row-'+bilanId+' .histo-item-edit');
  if (!infoDiv) return;

  // Reconstruire l'affichage original
  var dateStr = _isoToReadable(origIso);
  var agoStr  = _isoToAgo(origIso);
  infoDiv.innerHTML =
    '<div class="histo-item-date" id="histo-date-label-'+bilanId+'">'+dateStr+'</div>'
    +'<div class="histo-item-ago"  id="histo-ago-label-'+bilanId+'">'+agoStr+'</div>';
  if (editBtn) editBtn.style.display = '';
}

function _confirmEditBilanDate(bilanId) {
  var inp = document.getElementById('histo-date-inp-'+bilanId);
  if (!inp) return;
  var newDate = inp.value;
  if (!newDate) { _cancelEditBilanDate(bilanId); return; }

  // No-op si date identique
  var wrap = document.querySelector('.histo-date-edit-wrap[data-bilan-id="'+bilanId+'"]');
  if (wrap && wrap.dataset.orig === newDate) { _cancelEditBilanDate(bilanId); return; }

  // Vérifier doublon dans _allBilans (autre bilan que celui-ci à cette date)
  var conflict = _allBilans.find(function(b){
    return String(b.id) !== String(bilanId) && b.date && b.date.split('T')[0] === newDate;
  });
  if (conflict) {
    var conflictStr = _isoToReadable(newDate);
    if (!confirm('⚠️ Un bilan du ' + conflictStr + ' existe déjà pour ce patient.\n\nVoulez-vous quand même changer la date ? Les deux bilans coexisteront.')) {
      return;
    }
  }

  // Mise à jour Supabase
  sbB.from('bilans').update({ date: newDate }).eq('id', bilanId).then(function(res) {
    if (res.error) { alert('Erreur lors de la mise à jour : ' + res.error.message); return; }

    // Mise à jour locale de _allBilans
    var entry = _allBilans.find(function(b){ return String(b.id) === String(bilanId); });
    if (entry) entry.date = newDate;

    // Si c'est le bilan actif, mettre à jour _currentBilanDate
    if (String(_currentBilanId) === String(bilanId)) {
      _currentBilanDate = newDate;
    }

    // Recalculer _prevDonnees selon le nouvel ordre
    _allBilans.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
    var idx = _allBilans.findIndex(function(b){ return String(b.id) === String(_currentBilanId); });
    _prevDonnees = (idx !== -1 && idx + 1 < _allBilans.length) ? (_allBilans[idx+1].donnees || {}) : null;
    document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
    if (_prevDonnees) _renderDeltas(_prevDonnees);
    _renderEvolutionPage();

    showToast('✓ Date mise à jour');
    // Recharger l'affichage du modal
    openBilanHistory();
  });
}

// Helpers de formatage date (réutilisables)
function _isoToReadable(iso) {
  if (!iso) return '—';
  var parts  = iso.split('-');
  var months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  return parseInt(parts[2],10)+' '+months[parseInt(parts[1],10)-1]+' '+parts[0];
}
function _isoToAgo(iso) {
  if (!iso) return '';
  var today = new Date(); today.setHours(0,0,0,0);
  var d     = new Date(iso); d.setHours(0,0,0,0);
  var diff  = Math.round((today - d) / 86400000);
  if (diff === 0)      return "Aujourd'hui";
  if (diff === 1)      return 'Il y a 1 jour';
  if (diff < 7)        return 'Il y a '+diff+' jours';
  if (diff < 14)       return 'Il y a 1 semaine';
  if (diff < 31)       return 'Il y a '+Math.floor(diff/7)+' semaines';
  if (diff < 60)       return 'Il y a 1 mois';
  if (diff < 365)      return 'Il y a '+Math.floor(diff/30)+' mois';
  return 'Il y a '+Math.floor(diff/365)+' an'+(diff>=730?'s':'');
}

/* ── Guard IDOR : vérifie que l'id appartient bien au patient chargé ──
   _allBilans est peuplé dès le chargement patient ; si vide (état
   transitoire), on laisse passer — les RLS Supabase font le reste. */
function _assertBilanOwnership(id){
  if(!_allBilans || !_allBilans.length) return true;
  var ok = _allBilans.some(function(b){ return String(b.id) === String(id); });
  if(!ok) console.warn('[r4p] Bilan ID non autorisé :', id);
  return ok;
}

function loadBilan(id){
  if(!_assertBilanOwnership(id)) return;
  document.getElementById('histoList').innerHTML='<div class="histo-empty">Chargement…</div>';
  _sbRetry(function(){ return sbB.from('bilans').select('*').eq('id',id).single(); }).then(function(res){
    if(res.error){ alert('Erreur : '+res.error.message); closeHistoModal(); return; }
    _currentBilanId   = res.data.id;
    _currentBilanDate = res.data.date ? res.data.date.split('T')[0] : null;
    _deserializeBilan(_buildMergedDonnees(_allBilans.slice(_allBilans.findIndex(function(b){ return b.id === res.data.id; }))));
    closeHistoModal();
    // Entrer en mode lecture (sauvegarde patche à la date originale via _bilanHistoMode)
    _bilanHistoMode = true;
    _bilanIsSuivi   = false;
    _suiviSnapshot  = null;
    _enterReadOnlyMode();
    _enterHistoMode(_currentBilanDate);
    // Mettre à jour deltas inline : trouver le bilan précédent dans _allBilans
    document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
    var idx = _allBilans.findIndex(function(b){ return b.id === id; });
    if(idx !== -1 && idx + 1 < _allBilans.length){
      _prevDonnees = _allBilans[idx + 1].donnees || {};
      _renderDeltas(_prevDonnees);
    } else {
      _prevDonnees = null;
    }
  });
}

/* ── Champs "contexte permanent" reportés dans un bilan de suivi ── */
var _SUIVI_CARRY_FIELDS = [
  // Dates clés + latéralité + zones douloureuses
  'f-date-op','f-date-accident','f-cote','f-pain-zones',
  // Anamnèse
  'f-motif','f-motif-patient','f-mecanisme','f-debut',
  'f-aggravants','f-soulagants','f-atcd','f-traitements',
  'f-retentissement','f-remarques','f-objectifs',
  // Sport / Activité / Anthropométrie
  'f-sport','f-activite','f-poids','f-taille',
  // Imagerie (6 modalités × date + observations)
  'f-img-radio-date','f-img-radio-obs',
  'f-img-irm-date',  'f-img-irm-obs',
  'f-img-echo-date', 'f-img-echo-obs',
  'f-img-scan-date', 'f-img-scan-obs',
  'f-img-arthro-date','f-img-arthro-obs',
  'f-img-autre-date','f-img-autre-obs',
  // Notes libres suivi rapide
  'f-suivi-notes'
];

function newBilanSuivi(){
  if(!_bilanPatient){
    showToast('⚠️ Sélectionnez d\'abord un patient depuis l\'accueil.');
    return;
  }
  if(!_allBilans || !_allBilans.length){
    showToast('⚠️ Aucun bilan précédent — sauvegardez d\'abord le bilan initial.');
    return;
  }
  var lastDate  = _allBilans[0].date ? _allBilans[0].date.split('T')[0] : '';
  var lastLabel = lastDate ? _isoToReadable(lastDate) : 'précédent';
  var body = document.getElementById('modal-suivi-body');
  if(body) body.innerHTML = 'Les informations patient seront pré-remplies depuis le <strong>bilan du '+lastLabel+'</strong>.<br>'
    +'Les pages cliniques démarreront vierges — seules les valeurs que vous <strong>saisissez</strong> seront enregistrées dans ce suivi.';
  var ov = document.getElementById('modal-confirm-suivi');
  if(ov) ov.classList.add('open');
}

function _newBilanSuiviCancel(){
  var ov = document.getElementById('modal-confirm-suivi');
  if(ov) ov.classList.remove('open');
}

function _newBilanSuiviConfirm(){
  var ov = document.getElementById('modal-confirm-suivi');
  if(ov) ov.classList.remove('open');
  if(!_allBilans || !_allBilans.length) return;

  var lastDate  = _allBilans[0].date ? _allBilans[0].date.split('T')[0] : '';
  var lastLabel = lastDate ? _isoToReadable(lastDate) : 'précédent';

  // Capturer les tests perso de la session courante AVANT le reset
  // (couvre les tests non encore sauvegardés en base)
  var _preSuiviRaw = {};
  (window._CT_PAGES || []).forEach(function(pk){
    var hf = document.getElementById('ct-data-' + pk);
    if(hf && hf.value && hf.value !== '' && hf.value !== '[]') _preSuiviRaw[pk] = hf.value;
  });

  _exitHistoMode();
  _exitReadOnlyMode();
  _currentBilanId = null;
  _bilanHistoMode = false;
  _bilanIsSuivi   = true;
  _prevDonnees    = _allBilans[0].donnees || {};
  _resetBilanFields();
  document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });

  // Pré-remplir uniquement les champs de page-infos (infos patient)
  var mergedDonnees = _buildMergedDonnees(_allBilans);
  var infoKeys = {};
  document.querySelectorAll('#page-infos input[id], #page-infos select[id], #page-infos textarea[id]').forEach(function(el){
    if(mergedDonnees.hasOwnProperty(el.id)) infoKeys[el.id] = mergedDonnees[el.id];
  });
  _deserializeBilan(infoKeys);
  try{ _parsePainZones(); }catch(ex){}

  // Reporter les noms de tests (valeurs vides) : union de la session courante + tous les bilans
  try{
    (window._CT_PAGES || []).forEach(function(pk){
      var seen = {}, names = [];
      function addRaw(raw){
        if(!raw || raw === '[]') return;
        try{
          (JSON.parse(raw)||[]).forEach(function(t){
            if(t.name && !seen[t.name]){
              seen[t.name] = true;
              names.push({name:t.name, valA:'', valB:'', type:t.type||'comparison'});
            }
          });
        }catch(e){}
      }
      // Session courante en priorité, puis tous les bilans oldest→newest
      addRaw(_preSuiviRaw[pk]);
      (_allBilans||[]).slice().reverse().forEach(function(b){ addRaw((b.donnees||{})['ct-data-'+pk]); });
      if(!names.length) return;
      var hf = document.getElementById('ct-data-' + pk);
      if(hf) hf.value = JSON.stringify(names);
    });
    if(typeof window._ctRestoreAll === 'function') window._ctRestoreAll();
  }catch(ex){}

  // Date du bilan = aujourd'hui
  var _dn = new Date();
  var today = _dn.getFullYear()+'-'+String(_dn.getMonth()+1).padStart(2,'0')+'-'+String(_dn.getDate()).padStart(2,'0');
  var fd = document.getElementById('f-date');
  if(fd){ fd.value = today; }

  // Snapshot des valeurs héritées (pour détecter les changements au moment de la sauvegarde)
  _suiviSnapshot = _serializeBilan();

  // Texte du bouton spécifique au bilan de suivi
  var saveBtn = document.getElementById('bilan-save-btn');
  if(saveBtn) saveBtn.innerHTML = _SAVE_ICON + 'Sauvegarder le bilan de suivi';
  // Masquer le bouton "Bilan de suivi" (évite de créer un suivi d'un suivi)
  var suiviBtn = document.getElementById('bilan-suivi-btn');
  if(suiviBtn) suiviBtn.style.display = 'none';

  try{ updateAll(); }catch(ex){}
  _bilanModified = false;
  showPage('infos');
  showToast('📋 Bilan de suivi — infos patient pré-remplies depuis le '+lastLabel);
}

function newBilan(){
  if(!confirm('Créer un nouveau bilan vierge ? (le bilan actuel non sauvegardé sera perdu)')) return;
  _exitHistoMode();
  _currentBilanId = null;
  _prevDonnees    = null;
  _resetBilanFields();
  document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
  showPage('infos');
  localStorage.removeItem(R4P_KEYS.BILAN_DRAFT);
  if(_bilanPatient) _autofillPatientFields(_bilanPatient);
  closeHistoModal();
}

/* ═══════════════════════════════════════════════════════════
   ⚡  SUIVI RAPIDE
   ══════════════════════════════════════════════════════════ */

/* Rendu du formulaire de mise à jour rapide. Appelé par showPage(). */
function _renderSuiviRapide(){
  var container = document.getElementById('suivi-rapide-content');
  if(!container) return;

  if(!_bilanPatient){
    container.innerHTML='<div class="suivi-rapide-empty">Sélectionnez un patient depuis l\'accueil.</div>';
    return;
  }
  if(!_allBilans || !_allBilans.length){
    container.innerHTML='<div class="suivi-rapide-empty">Aucun bilan sauvegardé — créez et enregistrez un premier bilan pour activer le suivi rapide.</div>';
    return;
  }

  /* ── 1. IDs déjà couverts par CHART_GROUPS (pour détecter les orphelins) ── */
  var coveredIds = {};
  CHART_GROUPS.forEach(function(grp){
    if(grp.idA) coveredIds[grp.idA] = true;
    if(grp.idB) coveredIds[grp.idB] = true;
  });
  // dj-t-ca/cs sont orphelins mais seront injectés dans le bloc Drop Jump
  coveredIds['dj-t-ca'] = true;
  coveredIds['dj-t-cs'] = true;

  /* ── 2. Construction des blocs par catégorie depuis CHART_GROUPS ── */
  var blocksByCat = {};

  CHART_GROUPS.forEach(function(grp){
    if(grp.computeA || grp.computeB) return; // pas d'IDs DOM directs (ULRT)
    // Actif si au moins 1 valeur dans l'historique
    var active = _allBilans.some(function(b){
      var d = b.donnees||{};
      if(grp.idA && !isNaN(parseFloat(d[grp.idA]))) return true;
      if(grp.idB && !isNaN(parseFloat(d[grp.idB]))) return true;
      if(grp.condId){ var cv=d[grp.condId]; if(cv!==undefined&&cv!==null&&cv!=='') return true; }
      return false;
    });
    if(!active) return;

    var fields = [];
    // Paramètre de condition en tête du bloc (si présent)
    if(grp.condId){
      var condDomEl = document.getElementById(grp.condId);
      var condType  = condDomEl ? (condDomEl.type||'text') : 'text';
      var condLabel = grp.condId==='sls-hauteur'      ? 'Hauteur de marche'
                    : grp.condId==='dj-hauteur-boite' ? 'Hauteur boîte'
                    : grp.condId==='pset-poids-reel'  ? 'Poids réel'
                    : grp.condId;
      fields.push({id:grp.condId, label:condLabel, unit:grp.condUnit||'', type:condType, isCond:true});
    }
    if(grp.idA) fields.push({id:grp.idA, label:grp.labelA||grp.idA, unit:grp.unit||'', type:'number'});
    if(grp.idB) fields.push({id:grp.idB, label:grp.labelB||grp.idB, unit:grp.unit||'', type:'number'});

    // Cas spécial Drop Jump : injecter les temps de contact si renseignés
    if(grp.idA === 'dj-h-ca'){
      var hasDjT = _allBilans.some(function(b){
        var d=b.donnees||{};
        return !isNaN(parseFloat(d['dj-t-ca']))||!isNaN(parseFloat(d['dj-t-cs']));
      });
      if(hasDjT){
        fields.push({id:'dj-t-ca', label:'Tps contact (atteint)', unit:'ms', type:'number'});
        fields.push({id:'dj-t-cs', label:'Tps contact (sain)',    unit:'ms', type:'number'});
      }
    }

    if(!blocksByCat[grp.cat]) blocksByCat[grp.cat]=[];
    blocksByCat[grp.cat].push({title:grp.title, fields:fields, isEva: grp.idA==='f-eva'});
  });

  /* ── 3. Métriques orphelines (TRACKED_METRICS sans CHART_GROUP) ── */
  function _findPartnerOrphan(id, allIds){
    if(id.endsWith('-ca')){ var p=id.slice(0,-3)+'-cs'; if(allIds.indexOf(p)!==-1)return p; }
    if(id.endsWith('-cs')){ var p=id.slice(0,-3)+'-ca'; if(allIds.indexOf(p)!==-1)return p; }
    var pts=id.split('-');
    if(pts[pts.length-1]==='d'){ var p2=pts.slice(0,-1).join('-')+'-g'; if(allIds.indexOf(p2)!==-1)return p2; }
    if(pts[pts.length-1]==='g'){ var p2=pts.slice(0,-1).join('-')+'-d'; if(allIds.indexOf(p2)!==-1)return p2; }
    var wg=id.replace(/-d-/,'-g-'); if(wg!==id&&allIds.indexOf(wg)!==-1)return wg;
    return null;
  }
  function _stripSide(lbl){
    return lbl.replace(/\s*\(atteint\)/gi,'').replace(/\s*\(sain\)/gi,'').replace(/\s+[DG]$/,'').trim();
  }

  var orphansByCat = {};
  TRACKED_METRICS.forEach(function(m){
    if(m.compute||coveredIds[m.id]) return;
    var hasVal=_allBilans.some(function(b){return !isNaN(parseFloat((b.donnees||{})[m.id]));});
    if(!hasVal) return;
    if(!orphansByCat[m.cat]) orphansByCat[m.cat]=[];
    orphansByCat[m.cat].push(m);
  });
  Object.keys(orphansByCat).forEach(function(cat){
    var orphans=orphansByCat[cat], allIds=orphans.map(function(m){return m.id;}), seen={};
    orphans.forEach(function(m){
      if(seen[m.id]) return;
      seen[m.id]=true;
      var pid=_findPartnerOrphan(m.id,allIds);
      var partner=pid?orphans.find(function(o){return o.id===pid;}):null;
      if(partner) seen[partner.id]=true;
      var fields=[{id:m.id,label:m.label,unit:m.unit,type:'number'}];
      if(partner) fields.push({id:partner.id,label:partner.label,unit:partner.unit,type:'number'});
      if(!blocksByCat[cat]) blocksByCat[cat]=[];
      blocksByCat[cat].push({title:partner?_stripSide(m.label):m.label, fields:fields});
    });
  });

  /* ── 4. Groupes qualitatifs actifs ── */
  var activeQuals = QUAL_GROUPS.filter(function(grp){
    return _allBilans.some(function(b){
      var d=b.donnees||{};
      // Inclure si au moins une case cochée OU si "inclure dans le CR" est activé
      if(grp.crToggleId && d[grp.crToggleId]===true) return true;
      for(var i=0;i<grp.count;i++){
        if(d[grp.prefixA+'-'+i]===true||d[grp.prefixB+'-'+i]===true) return true;
      }
      return false;
    });
  });

  var hasContent = Object.keys(blocksByCat).length>0||activeQuals.length>0;
  if(!hasContent){
    container.innerHTML='<div class="suivi-rapide-empty">Aucune donnée de suivi identifiée.<br>Les métriques apparaîtront ici dès qu\'elles auront été renseignées dans le bilan.</div>';
    return;
  }

  /* ── 5. Capture initial depuis le DOM ── */
  _suiviRapideInitial = {};

  /* ── 6. Helper rendu d'un champ ── */
  function _renderField(f){
    var domEl=document.getElementById(f.id);
    var val=domEl?domEl.value:'';
    _suiviRapideInitial[f.id]=val;
    var inputEl;
    if(f.type==='text'){
      inputEl='<input type="text" class="suivi-rapide-input suivi-rapide-input-text"'
        +' data-metric-id="'+f.id+'" value="'+_esc2(val)+'" autocomplete="off" placeholder="ex: 45 cm">';
    } else {
      inputEl='<input type="number" class="suivi-rapide-input"'
        +' data-metric-id="'+f.id+'" value="'+_esc2(val)+'" step="any" min="0" autocomplete="off">';
    }
    var unitSpan=(f.unit&&!f.isCond)?'<span class="suivi-rapide-unit">'+_esc2(f.unit)+'</span>':'';
    var labelCls=f.isCond?'suivi-rapide-field-label cond':'suivi-rapide-field-label';
    var fieldCls=f.isCond?'suivi-rapide-field suivi-rapide-field-cond':'suivi-rapide-field';
    var labelTxt=(f.isCond&&f.unit)?_esc2(f.label+' ('+f.unit+')'):_esc2(f.label);
    return '<div class="'+fieldCls+'">'
      +'<div class="'+labelCls+'">'+labelTxt+'</div>'
      +'<div class="suivi-rapide-input-wrap">'+inputEl+unitSpan+'</div>'
      +'</div>';
  }

  /* ── 7. Rendu principal ── */
  var html = '<div class="suivi-rapide-header"><div class="suivi-rapide-info">'
    +'Seuls les champs <strong>modifiés</strong> créeront un nouveau point sur les graphiques d\'évolution. '
    +'Les champs non touchés ne génèrent aucune écriture.'
    +'</div></div>';

  Object.keys(blocksByCat).forEach(function(cat){
    var blocks=blocksByCat[cat];
    if(!blocks.length) return;
    html+='<div class="suivi-rapide-cat">'
      +'<div class="suivi-rapide-cat-title">'+_esc2(cat)+'</div>'
      +'<div class="suivi-rapide-blocks">';
    blocks.forEach(function(block){
      html+='<div class="suivi-rapide-test-block">'
        +'<div class="suivi-rapide-test-title">'+_esc2(block.title)+'</div>'
        +'<div class="suivi-rapide-test-fields">';
      block.fields.forEach(function(f){ html+=_renderField(f); });
      html+='</div>';
      if(block.isEva){
        var obsEl=document.getElementById('f-eva-obs');
        var obsVal=obsEl?obsEl.value:'';
        _suiviRapideInitial['f-eva-obs']=obsVal;
        html+='<textarea class="suivi-rapide-obs" data-metric-id="f-eva-obs"'
          +' placeholder="Observations douleur (localisation, type…)" rows="2">'+_esc2(obsVal)+'</textarea>';
      }
      html+='</div>';
    });
    html+='</div></div>';
  });

  /* ── 8. Tests qualitatifs ── */
  if(activeQuals.length){
    html+='<div class="suivi-rapide-cat"><div class="suivi-rapide-cat-title">Tests qualitatifs</div>';
    activeQuals.forEach(function(grp){
      html+='<div class="suivi-rapide-qual-block">'
        +'<div class="suivi-rapide-qual-title">'+_esc2(grp.title)+'</div>'
        +'<table class="suivi-rapide-qual-table"><thead><tr>'
        +'<th>Critère</th><th>'+_esc2(grp.labelA)+'</th><th>'+_esc2(grp.labelB)+'</th>'
        +'</tr></thead><tbody>';
      grp.criteria.forEach(function(label,ci){
        var elA=document.getElementById(grp.prefixA+'-'+ci);
        var elB=document.getElementById(grp.prefixB+'-'+ci);
        var chkA=elA?elA.checked:false, chkB=elB?elB.checked:false;
        _suiviRapideInitial[grp.prefixA+'-'+ci]=chkA;
        _suiviRapideInitial[grp.prefixB+'-'+ci]=chkB;
        html+='<tr>'
          +'<td class="suivi-rapide-qual-crit">'+_esc2(label)+'</td>'
          +'<td class="suivi-rapide-qual-cell"><input type="checkbox" class="suivi-rapide-check"'
          +' data-metric-id="'+grp.prefixA+'-'+ci+'" data-is-cb="1"'+(chkA?' checked':'')+'></td>'
          +'<td class="suivi-rapide-qual-cell"><input type="checkbox" class="suivi-rapide-check"'
          +' data-metric-id="'+grp.prefixB+'-'+ci+'" data-is-cb="1"'+(chkB?' checked':'')+'></td>'
          +'</tr>';
      });
      html+='</tbody></table></div>';
    });
    html+='</div>';
  }

  /* ── 9. Bloc notes libres (toujours visible) ── */
  var notesEl = document.getElementById('f-suivi-notes');
  var notesVal = notesEl ? notesEl.value : '';
  _suiviRapideInitial['f-suivi-notes'] = notesVal;
  html += '<div class="suivi-rapide-notes-block">'
    + '<div class="suivi-rapide-notes-title">Notes libres</div>'
    + '<textarea class="suivi-rapide-notes-area" data-metric-id="f-suivi-notes"'
    + ' placeholder="Observations, contexte, points d\'attention, remarques libres…"'
    + '>'+_esc2(notesVal)+'</textarea>'
    + '</div>';

  /* ── 10. Footer sticky ── */
  html+='<div class="suivi-rapide-footer">'
    +'<div class="suivi-rapide-footer-info" id="suivi-rapide-delta-info">Aucune modification</div>'
    +'<button class="suivi-rapide-save-btn" onclick="_saveSuiviRapide()">⚡ Enregistrer la mise à jour</button>'
    +'</div>';

  container.innerHTML = html;
  container.addEventListener('input',  _updateSuiviRapideDeltaInfo);
  container.addEventListener('change', _updateSuiviRapideDeltaInfo);
}

/* Calcule le delta = champs modifiés non vides (nombres ou checkboxes). */
function _computeSuiviRapideDelta(){
  var delta = {};
  var container = document.getElementById('suivi-rapide-content');
  if(!container) return delta;
  container.querySelectorAll('[data-metric-id]').forEach(function(el){
    var mid  = el.getAttribute('data-metric-id');
    var isCb = el.getAttribute('data-is-cb') === '1';
    if(isCb){
      var cur  = el.checked;
      var init = !!_suiviRapideInitial[mid];
      if(cur !== init) delta[mid] = cur;
    } else {
      var curV  = el.value;
      var initV = _suiviRapideInitial[mid] !== undefined ? String(_suiviRapideInitial[mid]) : '';
      // Changed AND (non-vide OU textarea — les notes libres peuvent être vidées)
      if(curV !== initV && (curV !== '' || el.tagName === 'TEXTAREA')) delta[mid] = curV;
    }
  });
  return delta;
}

/* Met à jour le compteur live dans le footer. */
function _updateSuiviRapideDeltaInfo(){
  var delta = _computeSuiviRapideDelta();
  var n  = Object.keys(delta).length;
  var el = document.getElementById('suivi-rapide-delta-info');
  if(!el) return;
  el.textContent = n===0 ? 'Aucune modification' : n+' champ'+(n>1?'s':'')+' modifié'+(n>1?'s':'');
  el.className = 'suivi-rapide-footer-info'+(n>0?' has-delta':'');
  // Highlight modifiés
  var container = document.getElementById('suivi-rapide-content');
  if(!container) return;
  container.querySelectorAll('.suivi-rapide-input').forEach(function(inp){
    var mid  = inp.getAttribute('data-metric-id');
    var initV = _suiviRapideInitial[mid] !== undefined ? String(_suiviRapideInitial[mid]) : '';
    inp.classList.toggle('modified', inp.value !== initV && inp.value !== '');
  });
}

/* Sauvegarde partielle — seul le delta est écrit dans Supabase. */
function _saveSuiviRapide(){
  if(!_bilanPatient){ showToast('⚠️ Aucun patient sélectionné'); return; }
  if(!_bilanUid){ showToast('⚠️ Session expirée — rechargez la page'); return; }

  var delta = _computeSuiviRapideDelta();

  // Pour les tests dual (Atteint vs Sain / D vs G) : si un côté est dans le delta,
  // forcer l'inclusion du côté partenaire (avec sa valeur DOM courante, si non-vide).
  // Garantit que les deux courbes du graphique restent alignées sur le même axe temporel.
  CHART_GROUPS.forEach(function(grp){
    if(grp.type !== 'dual' || grp.computeA || grp.computeB) return; // skip computed/non-standard
    var hasA = grp.idA in delta;
    var hasB = grp.idB in delta;
    if(!hasA && !hasB) return; // aucun côté modifié → ne rien forcer
    if(!hasA){
      var elA = document.querySelector('[data-metric-id="'+grp.idA+'"]');
      if(elA && elA.value !== '') delta[grp.idA] = elA.value;
    }
    if(!hasB){
      var elB = document.querySelector('[data-metric-id="'+grp.idB+'"]');
      if(elB && elB.value !== '') delta[grp.idB] = elB.value;
    }
  });

  if(!Object.keys(delta).length){
    showToast('Aucune modification à enregistrer');
    return;
  }

  var saveBtn = document.querySelector('.suivi-rapide-save-btn');
  if(saveBtn){ saveBtn.disabled=true; saveBtn.textContent='⏳ Enregistrement…'; }

  var _dn  = new Date();
  var today = _dn.getFullYear()+'-'+String(_dn.getMonth()+1).padStart(2,'0')+'-'+String(_dn.getDate()).padStart(2,'0');

  // Rechercher un bilan existant aujourd'hui
  sbB.from('bilans').select('id,donnees')
    .eq('patient_id', _bilanPatient.id)
    .eq('date', today)
    .order('created_at',{ascending:true}).limit(1)
    .then(function(lookup){
      var existing    = (lookup.data&&lookup.data.length) ? lookup.data[0] : null;
      var existingId  = existing ? existing.id : null;
      var baseDonnees = existing ? (existing.donnees||{}) : {};

      // Fusionner le delta dans la base du jour
      var merged = {};
      Object.keys(baseDonnees).forEach(function(k){ merged[k]=baseDonnees[k]; });
      Object.keys(delta).forEach(function(k){ merged[k]=delta[k]; });

      var p = existingId
        ? _sbRetry(function(){ return sbB.from('bilans').update({donnees:merged}).eq('id',existingId).select().single(); })
        : _sbRetry(function(){ return sbB.from('bilans').insert({
            patient_id:_bilanPatient.id, praticien_id:_bilanUid,
            date:today, donnees:merged
          }).select().single(); });

      return p.then(function(res){
        if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='⚡ Enregistrer la mise à jour'; }
        if(res.error){ alert('Erreur : '+res.error.message); return; }

        var newBilanId = res.data.id;

        // Injecter le delta dans le formulaire principal
        Object.keys(delta).forEach(function(mid){
          var el = document.getElementById(mid);
          if(!el) return;
          if(el.type==='checkbox'||el.type==='radio') el.checked = !!delta[mid];
          else el.value = delta[mid];
        });
        try{ updateAll(); calcRec(); calcPlioq(); calcPlioq2(); }catch(ex){}

        // Mettre à jour l'initial pour détecter de nouveaux changements
        Object.keys(delta).forEach(function(mid){ _suiviRapideInitial[mid]=delta[mid]; });
        _updateSuiviRapideDeltaInfo();

        // Rafraîchir _allBilans + snapshot fusionné dans le formulaire
        sbB.from('bilans').select('*').eq('patient_id',_bilanPatient.id)
          .order('date',{ascending:false}).limit(50)
          .then(function(r2){
            if(!r2.error && r2.data && r2.data.length){
              _allBilans       = r2.data;
              _currentBilanId  = newBilanId;
              _currentBilanDate = today;
              // Re-fusionner dans le formulaire (les champs non touchés
              // reprennent la valeur la plus récente de l'historique)
              _suppressDirty = true;
              _deserializeBilan(_buildMergedDonnees(r2.data));
              _suppressDirty = false;
              _bilanModified = false;
              _prevDonnees = r2.data.length>=2 ? (r2.data[1].donnees||{}) : null;
              document.querySelectorAll('.evo-delta').forEach(function(e){e.remove();});
              if(_prevDonnees) _renderDeltas(_prevDonnees);
              _renderEvolutionPage();
            }
          });

        var n = Object.keys(delta).length;
        showToast('⚡ Mis à jour — '+n+' champ'+(n>1?'s':'')+' enregistré'+(n>1?'s':''));
      });
    }).catch(function(err){
      if(saveBtn){ saveBtn.disabled=false; saveBtn.textContent='⚡ Enregistrer la mise à jour'; }
      alert('Erreur réseau : '+(err&&err.message||err));
    });
}

function deleteBilan(id, dateStr, isInitial, e) {
  if (e) e.stopPropagation();
  if(!_assertBilanOwnership(id)) return;
  var msg = 'Supprimer le bilan du ' + dateStr + ' ?'
    + (isInitial ? '\n\n⚠ Attention : il s\'agit du bilan initial de ce patient.' : '')
    + '\n\nCette action est irréversible — les données seront définitivement perdues.';
  if (!confirm(msg)) return;

  _sbRetry(function(){ return sbB.from('bilans').delete().eq('id', id); }).then(function(res) {
    if (res.error) { alert('Erreur lors de la suppression : ' + res.error.message); return; }

    // Mise à jour locale
    var wasActive = String(_currentBilanId) === String(id);
    _allBilans = _allBilans.filter(function(b){ return String(b.id) !== String(id); });

    if (wasActive) {
      // Bilan actif supprimé → charger le plus récent restant, sinon vierge
      _currentBilanId = null;
      _currentBilanDate = null;
      _prevDonnees = null;
      document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
      if (_allBilans.length > 0) {
        // Charger le bilan le plus récent restant silencieusement
        sbB.from('bilans').select('*').eq('id', _allBilans[0].id).single().then(function(r) {
          if (!r.error && r.data) {
            _currentBilanId   = r.data.id;
            _currentBilanDate = r.data.date ? r.data.date.split('T')[0] : null;
            _deserializeBilan(r.data.donnees || {});
            if (_allBilans.length >= 2) {
              _prevDonnees = _allBilans[1].donnees || {};
              _renderDeltas(_prevDonnees);
            }
            showToast('🗑 Bilan supprimé — bilan précédent rechargé');
          }
          _renderEvolutionPage();
        });
      } else {
        _resetBilanFields();
        _renderEvolutionPage();
        showToast('🗑 Bilan supprimé');
      }
    } else {
      // Bilan non actif : recalc _prevDonnees si nécessaire
      var idx = _allBilans.findIndex(function(b){ return String(b.id) === String(_currentBilanId); });
      _prevDonnees = (idx !== -1 && idx + 1 < _allBilans.length) ? (_allBilans[idx + 1].donnees || {}) : null;
      document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
      if (_prevDonnees) _renderDeltas(_prevDonnees);
      _renderEvolutionPage();
      showToast('🗑 Bilan supprimé');
    }

    // Rafraîchir la liste de l'historique
    openBilanHistory();
  });
}

function closeHistoModal(){ document.getElementById('histoOverlay').classList.remove('open'); }
function closeHistoOnBackdrop(e){ if(e.target===document.getElementById('histoOverlay')) closeHistoModal(); }

// -- NAV -------------------------------------------------------
function showPage(id) {
  // Inline styles — priorité absolue sur toute règle CSS
  document.querySelectorAll('.page').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var pg = document.getElementById('page-' + id);
  if (pg) { pg.style.display = 'flex'; pg.classList.add('active'); }
  var nb = document.querySelector('[data-page="' + id + '"]');
  if (nb) nb.classList.add('active');
  if (id === 'cr') buildCR();
  if (id === 'cr-tf') buildCRTF();
  if (id === 'evolution') _renderEvolutionPage();
  if (id === 'suivi-rapide') _renderSuiviRapide();
  saveToStorage();
}

// -- TEST CHANGE -----------------------------------------------
function _calcWainnerCerv() {
  var score = 0;
  // Rotation cervicale <60° (selects cv-rot-cerv-g / cv-rot-cerv-d) — counts as 1 criterion max
  var rotPos = 0;
  ['cv-rot-cerv-g','cv-rot-cerv-d'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.value === 'inf60') rotPos = 1;
  });
  score += rotPos;
  // ULNT 1 (row 0 in ulnt-g or ulnt-d) — counts as 1 criterion max
  var ulntPos = 0;
  ['tb-cv-ulnt-g','tb-cv-ulnt-d'].forEach(function(tid) {
    var tb = document.getElementById(tid); if (!tb) return;
    var rows = tb.querySelectorAll('tr');
    if (rows[0] && rows[0].querySelector('select') && rows[0].querySelector('select').value === 'Positif') ulntPos = 1;
  });
  score += ulntPos;
  // Compression axiale any (rows 1,2,3 in mecanique) — counts as 1 criterion max
  var compPos = 0;
  var mec = document.getElementById('tb-cv-mecanique');
  if (mec) {
    var mecRows = mec.querySelectorAll('tr');
    [1,2,3].forEach(function(i) {
      if (mecRows[i] && mecRows[i].querySelector('select') && mecRows[i].querySelector('select').value === 'Positif') compPos = 1;
    });
    score += compPos;
    // Distraction cervicale (row 4 in mecanique)
    if (mecRows[4] && mecRows[4].querySelector('select') && mecRows[4].querySelector('select').value === 'Positif') score++;
  }
  var alertEl = document.getElementById('cv-wainner-alert');
  if (alertEl) alertEl.style.display = score >= 3 ? 'flex' : 'none';
}

function _calcDN4() {
  var total = 0;
  ['tb-cv-dn4-itw','tb-cv-dn4-exam'].forEach(function(tid) {
    var tb = document.getElementById(tid); if (!tb) return;
    tb.querySelectorAll('select').forEach(function(s) {
      if (s.value === 'Oui') total++;
    });
  });
  var scoreEl = document.getElementById('cv-dn4-score');
  if (scoreEl) {
    scoreEl.textContent = 'Score DN4 : ' + total + '/10' + (total >= 4 ? ' — Douleur neuropathique probable' : '');
    scoreEl.style.color = total >= 4 ? 'var(--warning,#e67e22)' : '';
    scoreEl.style.fontWeight = total >= 4 ? '600' : '';
  }
}

var _MCK_MVTS = ['flex','ext','incl-g','incl-d','rot-g','rot-d','gliss-g','gliss-d'];
var _MCK_GREEN = {Centralisation:1, Abolition:1};
var _MCK_RED   = {Périphérisation:1, Augmentation:1};

var _MCK_LBLS = {
  'flex':'Flexion','ext':'Extension',
  'incl-g':'Inclinaison gauche','incl-d':'Inclinaison droite',
  'rot-g':'Rotation gauche','rot-d':'Rotation droite',
  'gliss-g':'Glissement gauche','gliss-d':'Glissement droit'
};

function _calcMckenzie() {
  var hasGreen = false, hasRed = false;
  var favDirs = [];
  _MCK_MVTS.forEach(function(m) {
    var sel = document.getElementById('mck-' + m + '-res');
    if (!sel) return;
    var v = sel.value;
    if (_MCK_GREEN[v]) {
      sel.style.background = 'var(--green-l,#eaf3de)'; sel.style.color = 'var(--green,#27500a)';
      hasGreen = true; favDirs.push(_MCK_LBLS[m]);
    } else if (_MCK_RED[v]) {
      sel.style.background = 'var(--red-l,#fcebeb)'; sel.style.color = 'var(--red,#791f1f)'; hasRed = true;
    } else if (v === 'Diminution') {
      sel.style.background = '#e6f1fb'; sel.style.color = '#185fa5';
      favDirs.push(_MCK_LBLS[m]);
    } else {
      sel.style.background = ''; sel.style.color = '';
    }
  });
  var gEl = document.getElementById('mck-central-badge');
  var rEl = document.getElementById('mck-periph-badge');
  var showBadge = hasGreen || favDirs.length > 0;
  if (gEl) {
    gEl.style.display = showBadge ? 'flex' : 'none';
    var dirTxt = document.getElementById('mck-dir-txt');
    if (dirTxt) dirTxt.textContent = favDirs.join(', ');
  }
  if (rEl) rEl.style.display = hasRed ? 'flex' : 'none';
}

function _calcLaslett() {
  var pos = 0, filled = 0;
  ['tb-rl-laslett-1','tb-rl-laslett-2','tb-rl-laslett-3'].forEach(function(id) {
    var tb = document.getElementById(id);
    if (!tb) return;
    tb.querySelectorAll('select').forEach(function(s) {
      if (s.value) filled++;
      if (s.value === 'Positif') pos++;
    });
  });
  var scoreEl = document.getElementById('rl-laslett-score');
  if (scoreEl) {
    var lbl = pos === 0 && filled === 0 ? '—'
      : pos === 0 ? '0/4 — Douleur SIJ exclue'
      : pos === 1 ? '1/4 — Douleur SIJ peu probable'
      : pos + '/4 — Symptômes d\'origine sacro-iliaque probables';
    scoreEl.textContent = 'Score Laslett : ' + lbl;
    scoreEl.style.color = pos >= 2 ? 'var(--warning,#e67e22)' : (pos === 0 && filled > 0) ? '#27500a' : '';
    scoreEl.style.fontWeight = pos >= 2 ? '700' : '';
  }
  var excluEl = document.getElementById('rl-laslett-exclu');
  var alertEl = document.getElementById('rl-laslett-alert');
  if (excluEl) excluEl.style.display = pos === 0 && filled > 0 ? 'flex' : 'none';
  if (alertEl) alertEl.style.display = pos >= 2 ? 'flex' : 'none';
  if (!_suppressDirty) updateBadges();
}

function _updateSq0Status() {
  var inp = document.getElementById('ha-sq0-eva');
  var badge = document.getElementById('ha-sq0-status');
  if (!badge || !inp) return;
  var v = inp.value.trim();
  var n = parseFloat(v);
  if (v === '' || isNaN(n)) { badge.textContent = ''; badge.style.cssText = 'font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:10px'; return; }
  if (n <= 2)      { badge.textContent = 'Sain';         badge.style.cssText = 'font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:#D1FAE5;color:#065F46'; }
  else if (n <= 5) { badge.textContent = 'Acceptable';   badge.style.cssText = 'font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:#FEF3C7;color:#92400E'; }
  else             { badge.textContent = 'Risque élevé'; badge.style.cssText = 'font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:#FEE2E2;color:#991B1B'; }
}

function _calcHaLaslett() {
  var pos = 0, filled = 0;
  ['tb-ha-laslett-1','tb-ha-laslett-2','tb-ha-laslett-3'].forEach(function(id) {
    var tb = document.getElementById(id);
    if (!tb) return;
    tb.querySelectorAll('select').forEach(function(s) {
      if (s.value) filled++;
      if (s.value === 'Positif') pos++;
    });
  });
  var scoreEl = document.getElementById('ha-laslett-score');
  if (scoreEl) {
    var lbl = pos === 0 && filled === 0 ? '—'
      : pos === 0 ? '0/4 — Douleur SIJ exclue'
      : pos === 1 ? '1/4 — Douleur SIJ peu probable'
      : pos + '/4 — Symptômes d\'origine sacro-iliaque probables';
    scoreEl.textContent = 'Score Laslett : ' + lbl;
    scoreEl.style.color = pos >= 2 ? 'var(--warning,#e67e22)' : (pos === 0 && filled > 0) ? '#27500a' : '';
    scoreEl.style.fontWeight = pos >= 2 ? '700' : '';
  }
  var excluEl = document.getElementById('ha-laslett-exclu');
  var alertEl = document.getElementById('ha-laslett-alert');
  if (excluEl) excluEl.style.display = pos === 0 && filled > 0 ? 'flex' : 'none';
  if (alertEl) alertEl.style.display = pos >= 2 ? 'flex' : 'none';
  if (!_suppressDirty) updateBadges();
}

function _calcFlexionLomb() {
  var tfd = (document.getElementById('rl-tfd-res') || {}).value || '';
  var tfa = (document.getElementById('rl-tfa-res') || {}).value || '';
  var tfdSuite = document.getElementById('rl-tfd-suite');
  var tfaSuite = document.getElementById('rl-tfa-suite');
  if (tfdSuite) tfdSuite.style.display = tfd === 'Positif' ? '' : 'none';
  if (tfaSuite) tfaSuite.style.display = tfa === 'Positif' ? '' : 'none';
  if (!_suppressDirty) updateBadges();
}

function _calcInstabLomb() {
  var score = 0;
  var tb = document.getElementById('tb-rl-instab');
  if (tb) tb.querySelectorAll('select').forEach(function(s) { if (s.value === 'Positif') score++; });
  var scoreEl = document.getElementById('rl-instab-score');
  if (scoreEl) {
    scoreEl.textContent = 'Score instabilité : ' + score + '/4' + (score >= 3 ? ' — Cluster positif' : '');
    scoreEl.style.color = score >= 3 ? 'var(--warning,#e67e22)' : '';
    scoreEl.style.fontWeight = score >= 3 ? '700' : '';
  }
  var alertEl = document.getElementById('rl-instab-alert');
  if (alertEl) alertEl.style.display = score >= 3 ? 'flex' : 'none';
}

function onTestChange(sel, tableId, idx) {
  var v = sel.value;
  var type = sel.dataset.type;
  sel.className = '';
  if (v === 'Positif' || v === 'Valid' + 'é') sel.classList.add(type === 'fonc' ? 'positif-fonc' : 'positif-ortho');
  else if (v === 'N' + 'égatif' || v === 'Pas valid' + 'é') sel.classList.add(type === 'fonc' ? 'negatif-fonc' : 'negatif-ortho');
  if (!_suppressDirty) {
    var wainnerTables = {'tb-cv-ulnt-g':1,'tb-cv-ulnt-d':1,'tb-cv-mecanique':1};
    if (wainnerTables[tableId]) _calcWainnerCerv();
    var dn4Tables = {'tb-cv-dn4-itw':1,'tb-cv-dn4-exam':1};
    if (dn4Tables[tableId]) _calcDN4();
    if (tableId === 'tb-rl-instab') _calcInstabLomb();
    var lasslett = {'tb-rl-laslett-1':1,'tb-rl-laslett-2':1,'tb-rl-laslett-3':1};
    if (lasslett[tableId]) _calcLaslett();
    var haLasslett = {'tb-ha-laslett-1':1,'tb-ha-laslett-2':1,'tb-ha-laslett-3':1};
    if (haLasslett[tableId]) _calcHaLaslett();
    updateBadges();
  }
}

function updateBadges() {
  const sections = {
    'epaule': ['tb-ep-irrit','tb-ep-trau-gh','tb-ep-trau-ac','tb-ep-trau-lab','tb-ep-trau-coiffe','tb-ep-fonc','tb-ep-ortho-mob','tb-ep-ortho-conf'],
    'rachis': ['tb-ra-cerv','tb-ra-cerv-neuro-g','tb-ra-cerv-neuro-d','tb-ra-lomb-g','tb-ra-lomb-d','tb-ra-transverse'],
    'rachis-cerv': ['tb-cv-vascul','tb-cv-defilé-g','tb-cv-defilé-d','tb-cv-mecanique','tb-cv-ulnt-g','tb-cv-ulnt-d','tb-cv-dn4-itw','tb-cv-dn4-exam','tb-cv-motric-g','tb-cv-motric-d','tb-cv-rot-g','tb-cv-rot-d','tb-cv-sensib-g','tb-cv-sensib-d'],
    'rachis-lomb': ['tb-rl-nerveux-g','tb-rl-nerveux-d','tb-rl-rot-g','tb-rl-rot-d','tb-rl-motric-g','tb-rl-motric-d','tb-rl-sensib-g','tb-rl-sensib-d','tb-rl-plet','tb-rl-laslett-1','tb-rl-laslett-2','tb-rl-laslett-3','tb-rl-instab','tb-rl-tfd-suite','tb-rl-tfa-suite','tb-rl-transverse'],
    'hanche': ['tb-ha-neuro','tb-ha-laslett-1','tb-ha-laslett-2','tb-ha-laslett-3','tb-ha-fracture','tb-ha-agp-clock','tb-ha-agp-demem','tb-ha-agp-add','tb-ha-agp-pubis','tb-ha-agp-flech','tb-ha-agp-inguinal','tb-ha-hanche','tb-ha-fonc','tb-ha-neuro-g','tb-ha-neuro-d','tb-ha-fracture-g','tb-ha-fracture-d','tb-ha-agp-g','tb-ha-agp-d','tb-ha-hanche-g','tb-ha-hanche-d'],
    'genou':  ['tb-ge-global','tb-ge-mob-flex','tb-ge-mob-ext','tb-ge-lig','tb-ge-lca','tb-ge-men','tb-ge-rot','tb-ge-sbit','tb-ge-plicae','tb-ge-ext',
               'tb-ge-global-g','tb-ge-global-d','tb-ge-mob-flex-g','tb-ge-mob-flex-d','tb-ge-mob-ext-g','tb-ge-mob-ext-d','tb-ge-lig-g','tb-ge-lig-d','tb-ge-lca-g','tb-ge-lca-d',
               'tb-ge-men-g','tb-ge-men-d','tb-ge-rot-g','tb-ge-rot-d','tb-ge-sbit-g','tb-ge-sbit-d',
               'tb-ge-plicae-g','tb-ge-plicae-d','tb-ge-ext-g','tb-ge-ext-d',
               ],
    'pied':   ['tb-pi-ottawa','tb-pi-global','tb-pi-tt','tb-pi-synd','tb-pi-conf','tb-pi-st','tb-pi-chopart','tb-pi-tc-g','tb-pi-tc-d',
               'tb-pi-ottawa-g','tb-pi-ottawa-d','tb-pi-global-g','tb-pi-global-d','tb-pi-tt-g','tb-pi-tt-d','tb-pi-synd-g','tb-pi-synd-d','tb-pi-conf-g','tb-pi-conf-d','tb-pi-st-g','tb-pi-st-d','tb-pi-chopart-g','tb-pi-chopart-d'],
    'lma':    ['tb-lma-pecto','tb-lma-biceps','tb-lma-triceps','tb-lma-dorsal','tb-lma-interco','tb-lma-ischio','tb-lma-quadri','tb-lma-adduct','tb-lma-mollet'],
  };
  Object.entries(sections).forEach(([page, tables]) => {
    let pos = 0;
    tables.forEach(t => {
      const tbody = document.getElementById(t);
      if (!tbody) return;
      tbody.querySelectorAll('select').forEach(s => { if (s.value === 'Positif') pos++; });
    });
    const badge = document.getElementById('badge-' + page);
    if (badge) { badge.style.display = pos > 0 ? '' : 'none'; badge.textContent = pos; }
  });
}

// -- Pain zones data (declared early for updateAll) --
var _painZones = [];
var PAIN_ZONES_CONFIG = [
  { key:'epaule',   label:'Épaule',           hdr:['epaule','fonc-ms'] },
  { key:'coude',    label:'Coude',            hdr:['coude','epaule','fonc-ms'] },
  { key:'poignet',  label:'Poignet',          hdr:['main','epaule','fonc-ms'] },
  { key:'rachis-c', label:'Rachis Cerv.',     hdr:['rachis','fonc-rachis'] },
  { key:'rachis-l', label:'Rachis Lomb.',     hdr:['rachis','fonc-rachis'] },
  { key:'hanche',   label:'Hanche',           hdr:['hanche','fonc-mi','musc'] },
  { key:'cuisse',   label:'Cuisse',           hdr:['fonc-mi'] },
  { key:'genou',    label:'Genou',            hdr:['genou','fonc-mi','musc'] },
  { key:'jambe',    label:'Jambe',            hdr:['fonc-mi'] },
  { key:'cheville', label:'Cheville',         hdr:['pied','fonc-mi'] },
  { key:'pied',     label:'Pied',             hdr:['pied','fonc-mi'] },
];

// -- UPDATE ALL ------------------------------------------------
function updateAll() {
  const nom = document.getElementById('f-nom').value;
  const prenom = document.getElementById('f-prenom').value;
  const cote = document.getElementById('f-cote').value;
  const date = document.getElementById('f-date').value;
  const dob = document.getElementById('f-dob').value;
  const fullName = [prenom, nom].filter(Boolean).join(' ') || 'Nouveau patient';
  document.getElementById('sb-name').textContent = fullName;

  let age = null;
  if (dob) {
    const d = new Date(dob);
    const today = new Date();
    age = today.getFullYear() - d.getFullYear() - (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  }

  var cotesMeta = _painZones.map(function(p){
    var cfg = PAIN_ZONES_CONFIG ? PAIN_ZONES_CONFIG.find(function(z){ return z.key===p.zone; }) : null;
    return (cfg?cfg.label:p.zone)+' '+p.cote;
  }).join(' • ');
  const meta = [age ? (age + ' ans') : null, cotesMeta||cote||null, date ? formatDate(date) : null].filter(Boolean).join('   ');
  document.getElementById('sb-meta').textContent = meta || '-';

  // Headers for each page
  const hdrTxt = [fullName, date ? formatDate(date) : null].filter(Boolean).join(' - ');
  ['epaule','coude','main','rachis','rachis-cerv','rachis-thor','rachis-lomb','hanche','genou','pied','fonc-mi','fonc-ms','fonc-rachis','musc','force-ms','force-rachis','force-mi'].forEach(function(p){
    var el = document.getElementById('hdr-' + p);
    if(!el) return;
    var coteStr = getCoteForHdr(p);
    el.textContent = [fullName, date ? formatDate(date) : null, coteStr ? ('Côté : '+coteStr) : null].filter(Boolean).join(' - ');
  });

  // Heel rise norms highlight
  highlightNormRow(age);
  calcHR();

  // PSET poids auto (2% PC)
  calcPSET();

  // PDSLRT norme selon age
  calcPDSLRT();

  // Tests MS
  calcCKC();
  calcSHRT();
  calcULRT();

  // Tests Rachis
  try{ calcRachisStat(); }catch(ex){}
  try{ calcLNF(); }catch(ex){}
  try{ calcSorensen(); }catch(ex){}
  try{ calcShirado(); }catch(ex){}

  // Progress
  const fields = document.querySelectorAll('input[type=text],input[type=number],textarea,select');
  let filled = 0;
  fields.forEach(f => { if (f.value && f.value !== '-' && f.value !== '') filled++; });
  const pct = Math.min(100, Math.round(filled / 60 * 100));
  document.getElementById('sb-progress').style.width = pct + '%';
}

function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return day + '/' + m + '/' + y;
}

function highlightNormRow(age) {
  document.querySelectorAll('#norm-heel-rise tbody tr').forEach(tr => {
    tr.classList.remove('highlight-age');
    if (age !== null) {
      const min = parseInt(tr.dataset.min), max = parseInt(tr.dataset.max);
      if (age >= min && age <= max) tr.classList.add('highlight-age');
    }
  });
}

// -- LSI CALC -------------------------------------------------
function _isBilateral() {
  var cote = (document.getElementById('f-cote') || {}).value || '';
  // '' (vide) et 'BILATÉRAL' → bilatéral (min/max, toujours ≤ 100%)
  // 'DROIT' ou 'GAUCHE' → unilatéral (atteint/sain, peut dépasser 100%)
  return cote !== 'DROIT' && cote !== 'GAUCHE';
}
// Scope-aware bilateral check: uses the same zone scope as _updateSideLabels
// Prevents LSI > 100% when opposite limbs are affected (e.g. Cheville G + Hanche D)
var _MI_ZONES = ['genou','hanche','cheville','pied','cuisse','jambe'];
var _MS_ZONES = ['epaule','coude','poignet'];
function _isBilateralForZones(zones) {
  var c = _getCoteForScope(zones);
  return c !== 'DROIT' && c !== 'GAUCHE';
}

function lsiClass(v, higher=true) {
  if (isNaN(v)) return '';
  if (higher) return v >= 90 ? 'good' : v >= 80 ? 'warn' : 'bad';
  return v <= 110 ? 'good' : 'bad';
}

function setLSI(lsiEl, statEl, lsi, seuil, higher, bilateral) {
  seuil = seuil || '>= 90%'; higher = (higher !== false);
  if (isNaN(lsi)) { lsiEl.textContent='-'; lsiEl.className='measure-stat'; statEl.textContent='-'; statEl.className='measure-stat'; return; }
  const cls = lsiClass(lsi, higher);
  lsiEl.textContent = lsi.toFixed(1) + '%';
  lsiEl.className = 'measure-stat ' + cls;
  const icons = bilateral
    ? {good:' Symétrique', warn:' Asymétrie modérée', bad:' Asymétrie significative'}
    : {good:' Objectif atteint', warn:' Acceptable', bad:' Insuffisant'};
  statEl.textContent = icons[cls] || '-';
  statEl.className = 'measure-stat ' + cls;
}

function calcLSI(key) {
  const ca = parseFloat(document.getElementById(key + '-ca') ? document.getElementById(key + '-ca').value : '');
  const cs = parseFloat(document.getElementById(key + '-cs') ? document.getElementById(key + '-cs').value : '');
  var bilateral = _isBilateralForZones((key === 'pset' || key === 'set') ? _MS_ZONES : _MI_ZONES);
  var lsi = bilateral
    ? (ca > 0 && cs > 0 ? Math.min(ca, cs) / Math.max(ca, cs) * 100 : NaN)
    : (cs > 0 ? ca / cs * 100 : NaN);
  setLSI(document.getElementById(key + '-lsi'), document.getElementById(key + '-stat'), lsi, '>= 90%', true, bilateral);
  if (key === 'hop') {
    var repere = document.getElementById('hop-repere80');
    var taille = parseFloat(document.getElementById('f-taille')?document.getElementById('f-taille').value:'');
    var sexeH = document.getElementById('f-sexe')?document.getElementById('f-sexe').value:'';
    var svgDest = '<svg viewBox="0 0 100 100" width="14" height="14" fill="currentColor" style="vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg"><path d="m50.83 44.66c-5.81 0-10.54-4.73-10.54-10.54s4.73-10.54 10.54-10.54 10.54 4.73 10.54 10.54-4.73 10.54-10.54 10.54zm0-18.08c-4.16 0-7.54 3.38-7.54 7.54s3.38 7.54 7.54 7.54 7.54-3.38 7.54-7.54-3.38-7.54-7.54-7.54z"/><path d="m62.07 54.4c3.9-6.55 7.44-13.95 7.44-19.28 0-11.6-7.87-20.02-18.72-20.02-10.84 0-18.71 8.42-18.71 20.02 0 5.33 3.53 12.73 7.44 19.28-12.06 2.24-20.02 7.91-20.02 14.44 0 8.66 13.75 15.45 31.31 15.45 17.55 0 31.3-6.79 31.3-15.45 0-6.51-7.97-12.21-20.04-14.44zm-26.99-19.28c0-9.86 6.61-17.02 15.71-17.02 9.11 0 15.72 7.16 15.72 17.02 0 8.93-11.88 25.51-15.72 30.64-3.83-5.13-15.71-21.71-15.71-30.64zm14.54 34.04c.28.36.71.57 1.17.57s.9-.21 1.18-.57c.23-.3 2.15-2.75 4.64-6.32 6.3 1.1 9.68 3.69 9.68 5.68 0 2.91-6.7 6.18-15.67 6.18-8.98 0-15.68-3.27-15.68-6.18 0-2.03 3.5-4.68 10.01-5.73 2.5 3.6 4.44 6.07 4.67 6.37zm1.19 12.13c-15.35 0-28.31-5.7-28.31-12.45 0-5.14 7.65-9.89 18.7-11.69.64 1.01 1.28 2 1.9 2.92-6.85 1.41-11.16 4.62-11.16 8.45 0 5.23 8.03 9.18 18.68 9.18 10.64 0 18.67-3.95 18.67-9.18 0-3.77-4.17-6.94-10.84-8.38.64-.95 1.29-1.96 1.95-3 11.05 1.81 18.71 6.58 18.71 11.7 0 6.75-12.96 12.45-28.3 12.45z"/></svg>';
    var svgObj = '<svg viewBox="0 0 682.67 682.67" width="12" height="12" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="hop-obj-clip" clipPathUnits="userSpaceOnUse"><path d="M0,512H512V0H0Z"/></clipPath></defs><g transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><g clip-path="url(#hop-obj-clip)"><path transform="translate(256,100)" d="m0,0c-86.019,0-156,69.981-156,156 0,86.019 69.981,156 156,156 86.019,0 156,-69.981 156,-156C156,69.981 86.019,0 0,0Z"/><path transform="translate(256,190)" d="m0,0c-36.393,0-66,29.607-66,66 0,36.393 29.607,66 66,66 36.393,0 66,-29.607 66,-66C66,29.607 36.393,0 0,0Z"/><path transform="translate(256,256)" d="M0,0 110.309,110.309"/><path transform="translate(488.638,424.998)" d="m0,0-63.64,-63.639-58.69,4.95L-127.279,0-63.64,63.64-58.69,4.95Z"/><path transform="translate(455.245,391.606)" d="m0,0-30.247,-30.246-58.69,4.949-4.949,58.69 30.246,30.247c-38.633,26.344-85.317,41.755-135.605,41.755-133.101,0-241,-107.9-241,-241 0,-133.101 107.899,-241 241,-241 133.1,0 241,107.899 241,241C41.755,-85.317 26.344,-38.633 0,0Z"/></g></g></svg>';
    var html = '';
    var hasRepere = !isNaN(cs) && cs > 0;
    var hasSeuil = !isNaN(taille) && taille > 0;
    if (hasRepere || hasSeuil) {
      if (hasRepere) {
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + svgDest + '<span>80% CS : <strong>' + (cs*0.8).toFixed(1) + ' cm</strong></span>';
        if (!isNaN(ca) && ca > 0) html += '<span style="opacity:.3;margin:0 1px">·</span><span>80% CA : <strong>' + (ca*0.8).toFixed(1) + ' cm</strong></span>';
        html += '</div>';
      }
      if (hasSeuil) {
        var pctRTS = sexeH==='F' ? 0.80 : 0.90;
        var labelRTS = sexeH==='F' ? '80% taille (F)' : sexeH==='H' ? '90% taille (H)' : '90% taille (H) / 80% taille (F)';
        var seuilRTS = (taille * pctRTS).toFixed(1);
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap' + (hasRepere ? ';margin-top:4px' : '') + '">' + svgObj + '<span>Seuil RTS : ≥ <strong>' + seuilRTS + ' cm</strong> <span style="opacity:.6">(' + labelRTS + ')</span></span>';
        if (!isNaN(ca) && ca > 0) {
          var atteint = ca >= parseFloat(seuilRTS);
          html += '<span style="opacity:.3;margin:0 1px">·</span><span>CA : <strong>' + ca + ' cm</strong></span><span style="display:inline-flex;align-items:center;gap:2px;background:' + (atteint ? '#e6f4ec' : '#fde8e8') + ';color:' + (atteint ? '#1e6b42' : '#9B1C1C') + ';font-size:.78rem;font-weight:500;padding:1px 6px;border-radius:3px">' + (atteint ? '✓ Atteint' : '✗ Non atteint') + '</span>';
        }
        html += '</div>';
      }
    } else {
      html = '<span style="opacity:.4">—</span>';
    }
    if (repere) repere.innerHTML = html;
  }
}

function calcRec() {
  var scoreCA = 0, scoreCS = 0;
  for (var ci=0; ci<CRITERIA_REC.length; ci++) {
    var elCA = document.getElementById('rec-ca-' + ci);
    var elCS = document.getElementById('rec-cs-' + ci);
    if (elCA && elCA.checked) scoreCA++;
    if (elCS && elCS.checked) scoreCS++;
  }
  var n = CRITERIA_REC.length;
  var setScore = function(scoreEl, statusEl, score, total, accent) {
    if (!scoreEl) return;
    scoreEl.textContent = score + '/' + total;
    var cls = score === total ? 'good' : score >= 1 ? 'warn' : 'bad';
    scoreEl.style.color = cls==='good'?'var(--green)':cls==='warn'?'var(--orange)':'var(--red)';
    if (statusEl) {
      statusEl.textContent = score===total ? 'Reussi' : score>=1 ? 'A ameliorer' : 'Non reussi';
      statusEl.style.color = scoreEl.style.color;
    }
  };
  setScore(document.getElementById('rec-score-ca'), document.getElementById('rec-status'), scoreCA, n);
  setScore(document.getElementById('rec-score-cs'), document.getElementById('rec-status-cs'), scoreCS, n);
  // Auto-activer le toggle CR dès qu'une case est cochée
  var recTog = document.getElementById('rec-cr-toggle');
  if (recTog && (scoreCA > 0 || scoreCS > 0)) recTog.checked = true;
}

function calcPlioq() {
  const ca = document.getElementById('plioq-ca').value;
  const cs = document.getElementById('plioq-cs').value;
  const good = v => v === 'Excellent' || v === 'Bon';
  const el = document.getElementById('plioq-stat');
  if (!ca || !cs) { el.textContent='-'; el.className='measure-stat'; return; }
  if (good(ca) && good(cs)) { el.textContent=' Symétrique'; el.className='measure-stat good'; }
  else { el.textContent=' Asymétrie'; el.className='measure-stat warn'; }
}

function calcHR() {
  var hrCaEl = document.getElementById('hr-ca');
  var hrCsEl = document.getElementById('hr-cs');
  var ca = hrCaEl ? parseFloat(hrCaEl.value) : NaN;
  var cs = hrCsEl ? parseFloat(hrCsEl.value) : NaN;
  var bilateral = _isBilateralForZones(_MI_ZONES);
  var lsi = bilateral
    ? (ca > 0 && cs > 0 ? Math.min(ca, cs) / Math.max(ca, cs) * 100 : NaN)
    : (cs > 0 ? ca / cs * 100 : NaN);
  setLSI(document.getElementById('hr-lsi'), document.getElementById('hr-stat'), lsi, '>= 90%', true, bilateral);

  var dob = document.getElementById('f-dob') ? document.getElementById('f-dob').value : '';
  var normEl = document.getElementById('hr-norm');
  if (!normEl) return;
  if (!dob) { normEl.textContent = 'Renseignez la date de naissance dans Infos Patient'; return; }
  var age = new Date().getFullYear() - new Date(dob).getFullYear();
  var norms = [
    {min:20,max:29,th:28,tf:24,lbl:'20-29 ans'},
    {min:30,max:39,th:25,tf:22,lbl:'30-39 ans'},
    {min:40,max:49,th:22,tf:19,lbl:'40-49 ans'},
    {min:50,max:59,th:18,tf:15,lbl:'50-59 ans'},
    {min:60,max:69,th:14,tf:12,lbl:'60-69 ans'},
    {min:70,max:79,th:9, tf:8, lbl:'70-79 ans'},
    {min:80,max:120,th:6,tf:5, lbl:'>= 80 ans'},
  ];
  var norm = null;
  for (var ni=0; ni<norms.length; ni++) {
    if (age >= norms[ni].min && age <= norms[ni].max) { norm = norms[ni]; break; }
  }
  if (norm) {
    var txt = norm.lbl + '  |  Seuil H : ' + norm.th + ' rep.  /  Seuil F : ' + norm.tf + ' rep.';
    if (!isNaN(ca)) {
      if (ca >= norm.th) txt += '  ->  OK seuil hommes';
      else if (ca >= norm.tf) txt += '  ->  Seuil femmes seulement';
      else txt += '  ->  En-dessous des deux seuils';
    }
    normEl.textContent = txt;
  }
}

function calcLunge() {
  var luCaEl = document.getElementById('lu-ca');
  var luCsEl = document.getElementById('lu-cs');
  var ca = luCaEl ? parseFloat(luCaEl.value) : NaN;
  var cs = luCsEl ? parseFloat(luCsEl.value) : NaN;
  var lsiEl  = document.getElementById('lu-lsi');
  var statEl = document.getElementById('lu-stat');
  var interpEl = document.getElementById('lu-interp');
  if (!lsiEl || !statEl) return;

  if (isNaN(ca) || isNaN(cs)) {
    lsiEl.textContent = '-'; lsiEl.className = 'measure-stat';
    statEl.textContent = '-'; statEl.className = 'measure-stat';
    if (interpEl) interpEl.textContent = '-';
    return;
  }

  var cls, stat, interp;

  // Cas : côté atteint ne touche pas le mur (valeur négative = déficit en cm)
  if (ca < 0) {
    var ecart = Math.abs(ca);
    var ecartTotal = cs - ca; // ex: 13 - (-9) = 22 cm
    lsiEl.textContent = '—'; lsiEl.className = 'measure-stat bad';
    cls = 'bad';
    stat = 'Deficit complet — ne touche pas';
    interp = 'CA = ' + ca + ' cm (déficit de ' + ecart.toFixed(1) + ' cm du contact) — écart total vs côté sain = ' + ecartTotal.toFixed(1) + ' cm';
  } else {
    var luBilateral = _isBilateralForZones(_MI_ZONES);
    var lsi = luBilateral
      ? (ca > 0 && cs > 0 ? Math.min(ca, cs) / Math.max(ca, cs) * 100 : NaN)
      : (cs !== 0 ? ca / cs * 100 : NaN);
    lsiEl.textContent = !isNaN(lsi) ? lsi.toFixed(1) + '%' : '-';
    var diff = Math.abs(ca - cs);
    if (ca < 10) {
      cls='bad'; stat='Deficit absolu (< 10 cm)';
      interp = 'CA = ' + ca + ' cm - inferieur au seuil de 10 cm (Bennell 1998)';
    } else if (diff > 1.5) {
      cls='warn'; stat='Asymetrie > 1,5 cm';
      interp = 'Difference = ' + diff.toFixed(1) + ' cm entre les deux cotes (seuil : <= 1,5 cm)';
    } else if (!isNaN(lsi) && lsi < 90) {
      cls='warn'; stat= luBilateral ? 'Asymetrie > 10%' : 'LSI < 90%';
      interp = (luBilateral ? 'Symétrie = ' : 'LSI = ') + lsi.toFixed(1) + '% - asymetrie relative (Hoch 2011)';
    } else {
      cls='good'; stat='OK Symetrique et suffisant';
      interp = 'CA = ' + ca + ' cm (>=10 cm), diff = ' + diff.toFixed(1) + ' cm (<=1,5 cm)' + (!isNaN(lsi) ? ', LSI = ' + lsi.toFixed(1) + '%' : '');
    }
    lsiEl.className = 'measure-stat ' + cls;
  }
  statEl.textContent = stat; statEl.className = 'measure-stat ' + cls;
  if (interpEl) interpEl.textContent = interp;
}

function calcDJ() {
  const hca = parseFloat(document.getElementById('dj-h-ca').value);
  const hcs = parseFloat(document.getElementById('dj-h-cs').value);
  const tca = parseFloat(document.getElementById('dj-t-ca').value);
  const tcs = parseFloat(document.getElementById('dj-t-cs').value);
  var bilateral = _isBilateralForZones(_MI_ZONES);
  const hlsi = bilateral
    ? (hca > 0 && hcs > 0 ? Math.min(hca, hcs) / Math.max(hca, hcs) * 100 : NaN)
    : (hcs > 0 ? hca / hcs * 100 : NaN);
  const tlsi = bilateral
    ? (tca > 0 && tcs > 0 ? Math.min(tca, tcs) / Math.max(tca, tcs) * 100 : NaN)
    : (tcs > 0 ? tca / tcs * 100 : NaN);
  setLSI(document.getElementById('dj-h-lsi'), document.getElementById('dj-h-stat'), hlsi, '>= 90%', true, bilateral);
  setLSI(document.getElementById('dj-t-lsi'), document.getElementById('dj-t-stat'), tlsi, bilateral ? '>= 90%' : '<= 110%', bilateral ? true : false, bilateral);
  const rcaEl = document.getElementById('dj-rsi-ca');
  const rcsEl = document.getElementById('dj-rsi-cs');
  const rlsiEl = document.getElementById('dj-rsi-lsi');
  const rstatEl = document.getElementById('dj-rsi-stat');
  const rca = (tca > 0 && !isNaN(hca)) ? hca/tca : NaN;
  const rcs = (tcs > 0 && !isNaN(hcs)) ? hcs/tcs : NaN;
  rcaEl.textContent = isNaN(rca) ? '-' : rca.toFixed(3);
  rcsEl.textContent = isNaN(rcs) ? '-' : rcs.toFixed(3);
  const rlsi = bilateral
    ? (!isNaN(rca) && !isNaN(rcs) && rca > 0 && rcs > 0 ? Math.min(rca, rcs) / Math.max(rca, rcs) * 100 : NaN)
    : (!isNaN(rca) && !isNaN(rcs) && rcs > 0 ? rca / rcs * 100 : NaN);
  setLSI(rlsiEl, rstatEl, rlsi, '>= 90%', true, bilateral);
}

function calcPiCIM() {
  var gEl = document.getElementById('pi-cim-g');
  var dEl = document.getElementById('pi-cim-d');
  var lsiEl = document.getElementById('pi-cim-lsi');
  var statEl = document.getElementById('pi-cim-stat');
  if (!gEl || !dEl || !lsiEl || !statEl) return;
  var g = parseFloat(gEl.value);
  var d = parseFloat(dEl.value);
  if (!isNaN(g) && g > 0 && !isNaN(d) && d > 0) {
    var lsi = Math.min(g, d) / Math.max(g, d) * 100;
    lsiEl.textContent = lsi.toFixed(0) + '%';
    if (lsi >= 90)      { statEl.textContent = '✅ ≥ 90%'; statEl.className = 'measure-stat good'; }
    else if (lsi >= 80) { statEl.textContent = '⚠️ ' + lsi.toFixed(0) + '%'; statEl.className = 'measure-stat warn'; }
    else                { statEl.textContent = '❌ ' + lsi.toFixed(0) + '%'; statEl.className = 'measure-stat bad'; }
  } else {
    lsiEl.textContent = '—';
    statEl.textContent = '—'; statEl.className = 'measure-stat';
  }
}

function calcPiNDT() {
  ['g','d'].forEach(function(side) {
    var el = document.getElementById('pi-ndt-' + side);
    var statEl = document.getElementById('pi-ndt-' + side + '-stat');
    if (!el || !statEl) return;
    var v = parseFloat(el.value);
    if (!isNaN(v) && el.value !== '') {
      if (v > 10) { statEl.textContent = 'Effondrement arche'; statEl.className = 'measure-stat bad'; }
      else        { statEl.textContent = 'Normal (' + v + ' mm)'; statEl.className = 'measure-stat good'; }
    } else {
      statEl.textContent = '—'; statEl.className = 'measure-stat';
    }
  });
}

function calcF8() {
  var caEl = document.getElementById('f8-ca');
  var csEl = document.getElementById('f8-cs');
  var lsiEl = document.getElementById('f8-lsi');
  var statEl = document.getElementById('f8-stat');
  if (!caEl || !csEl || !lsiEl || !statEl) return;
  var ca = parseFloat(caEl.value);
  var cs = parseFloat(csEl.value);
  var bilateral = _isBilateralForZones(_MI_ZONES);
  var lsi;
  if (bilateral) {
    lsi = (ca > 0 && cs > 0) ? Math.min(ca, cs) / Math.max(ca, cs) * 100 : NaN;
  } else {
    lsi = (ca > 0 && cs > 0) ? cs / ca * 100 : NaN;
  }
  setLSI(lsiEl, statEl, lsi, '>= 90%', true, bilateral);
  var seuilEl = document.getElementById('f8-seuil');
  if (seuilEl && !isNaN(ca)) {
    var base = 'Témoins : 11,0 ± 0,4 s (Caffrey 2005) · Seuil proposé : &lt; 12 s';
    var tag = ca <= 12
      ? '   <span style="color:var(--green);font-weight:600">✓ CA ≤ 12 s</span>'
      : '   <span style="color:var(--red);font-weight:600">✗ CA > 12 s</span>';
    seuilEl.innerHTML = base + tag;
  }
}

function calcSLST() {
  ['cs','ca'].forEach(function(side) {
    var total = 0, touched = false;
    for (var i = 1; i <= 6; i++) {
      var inp = document.getElementById('slst-' + side + '-' + i);
      if (inp && inp.value !== '') { total += (parseInt(inp.value) || 0); touched = true; }
    }
    var el = document.getElementById('slst-' + side + '-total');
    if (!el) return;
    if (!touched) { el.textContent = '—'; el.className = 'measure-stat'; return; }
    el.textContent = total + ' erreur' + (total !== 1 ? 's' : '');
    el.className = 'measure-stat ' + (total <= 1 ? 'good' : total <= 3 ? 'warn' : 'bad');
  });
}

function calcMusc() {
  const calc = (ca, cs) => { const v = cs>0 ? (1-ca/cs)*100 : NaN; return v; };
  const setDef = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isNaN(v)) { el.textContent='-'; el.className='measure-stat'; return; }
    el.textContent = v.toFixed(1) + '%';
    el.className = 'measure-stat ' + (v <= 10 ? 'good' : v <= 20 ? 'warn' : 'bad');
  };
  const qfca = parseFloat(document.getElementById('q-f-ca').value);
  const qfcs = parseFloat(document.getElementById('q-f-cs').value);
  const qpca = parseFloat(document.getElementById('q-p-ca').value);
  const qpcs = parseFloat(document.getElementById('q-p-cs').value);
  const qrca = parseFloat(document.getElementById('q-r-ca').value);
  const ijfca = parseFloat(document.getElementById('ij-f-ca').value);
  const ijfcs = parseFloat(document.getElementById('ij-f-cs').value);
  const ijpca = parseFloat(document.getElementById('ij-p-ca').value);
  const ijpcs = parseFloat(document.getElementById('ij-p-cs').value);
  setDef('q-f-def', calc(qfca,qfcs));
  setDef('q-p-def', calc(qpca,qpcs));
  setDef('q-r-def', calc(qrca,parseFloat(document.getElementById('q-r-cs').value)));
  setDef('ij-f-def', calc(ijfca,ijfcs));
  setDef('ij-p-def', calc(ijpca,ijpcs));
  setDef('ij-r-def', calc(parseFloat(document.getElementById('ij-r-ca').value),parseFloat(document.getElementById('ij-r-cs').value)));

  const ratioCA = (qfca>0 && !isNaN(ijfca)) ? ijfca/qfca*100 : NaN;
  const ratioCS = (qfcs>0 && !isNaN(ijfcs)) ? ijfcs/qfcs*100 : NaN;
  const poids = parseFloat(document.getElementById('f-poids').value);

  const setRatio = (id, v, min, max) => {
    const el = document.getElementById(id); if (!el) return;
    if (isNaN(v)) { el.textContent='-'; el.className='val'; return; }
    el.textContent = v.toFixed(1)+'%';
    el.className = 'val ' + (v>=min && v<=max ? 'good' : 'warn');
  };
  setRatio('ratio-ca', ratioCA, 60, 70);
  setRatio('ratio-cs', ratioCS, 60, 70);

  const setPic = (id, nm, thr) => {
    const el = document.getElementById(id); if (!el) return;
    if (isNaN(nm) || isNaN(poids) || poids<=0) { el.textContent='-'; el.className='val'; return; }
    const v = nm/poids;
    el.textContent = v.toFixed(2);
    el.className = 'val ' + (v>=thr ? 'good' : 'bad');
  };
  setPic('pic-q', qfca, 2.4);
  setPic('pic-ij', ijfca, 1.7);
}

// -- HELPER TESTS SECTIONS (partagé CR Complet + CR Tests) ----
// Retourne true si on est dans un contexte suivi (bilan le plus récent avec un antérieur)
function _crInSuiviMode() {
  if (_bilanIsSuivi && _suiviSnapshot) return true;
  if (!_allBilans || _allBilans.length < 2) return false;
  if (!_currentBilanId) return false; // nouveau bilan vierge non sauvegardé
  // Bilan historique (pas le plus récent) : pas de grisé suivi
  if (_allBilans[0] && _allBilans[0].id && _currentBilanId !== _allBilans[0].id) return false;
  return true;
}

// Retourne la date (dd/mm) du bilan d'origine d'un champ porté
function _crOriginDate(fieldIds) {
  if (!fieldIds || !fieldIds.length || !_allBilans || !_allBilans.length) return '';
  var startIdx = (_bilanIsSuivi && _suiviSnapshot) ? 0 : 1;
  for (var _oi = startIdx; _oi < _allBilans.length; _oi++) {
    var _od = _allBilans[_oi].donnees || {};
    for (var _oj = 0; _oj < fieldIds.length; _oj++) {
      var _ov = _od[fieldIds[_oj]];
      if (_ov !== undefined && _ov !== null && String(_ov) !== '') {
        var _odate = (_allBilans[_oi].date || '').slice(0, 10);
        return _odate.length >= 10 ? _odate.slice(8, 10) + '/' + _odate.slice(5, 7) : '';
      }
    }
  }
  return '';
}

// Retourne true si le champ vient d'un bilan précédent (non remesuré dans le suivi actuel)
function _crIsCarried(fieldIds) {
  if (!fieldIds || !fieldIds.length) return false;
  // Suivi en cours (avant enregistrement) — comparer au snapshot
  if (_bilanIsSuivi && _suiviSnapshot) {
    var hasVal = false;
    for (var _ci = 0; _ci < fieldIds.length; _ci++) {
      var _el = document.getElementById(fieldIds[_ci]);
      if (!_el) continue;
      var _curr = (_el.type === 'checkbox' || _el.type === 'radio') ? String(_el.checked) : (_el.value || '');
      if (!_curr) continue;
      hasVal = true;
      var _prevStr = _suiviSnapshot[fieldIds[_ci]] !== undefined ? String(_suiviSnapshot[fieldIds[_ci]]) : '';
      if (_curr !== _prevStr) return false; // au moins un champ modifié aujourd'hui
    }
    return hasVal;
  }
  // Bilan sauvegardé — vérifier changed_fields si présent, sinon comparer les donnees brutes
  if (!_allBilans || _allBilans.length < 2) return false;
  var _d0 = _allBilans[0].donnees || {};
  var _cf = _d0.changed_fields;
  if (_cf !== undefined && _cf !== null) {
    // Nouveau format : changed_fields explicite
    for (var _cj = 0; _cj < fieldIds.length; _cj++) {
      if (_cf.indexOf(fieldIds[_cj]) !== -1) return false;
    }
    return true;
  }
  // Ancien format (sans changed_fields) : comparaison directe avec le bilan précédent
  var _d1 = _allBilans[1].donnees || {};
  for (var _ck = 0; _ck < fieldIds.length; _ck++) {
    var _v0 = _d0[fieldIds[_ck]]; var _v1 = _d1[fieldIds[_ck]];
    var _s0 = (_v0 === undefined || _v0 === null) ? '' : String(_v0);
    var _s1 = (_v1 === undefined || _v1 === null) ? '' : String(_v1);
    if (_s0 !== '' && _s0 !== _s1) return false; // champ renseigné et différent = mesuré dans ce bilan
  }
  return true; // tout vide ou identique = porté du bilan précédent
}

function _buildAllTestsHtml() {
  var sections = [];
  function addSec(title, html) { if (html && html.trim()) sections.push({title: title, html: html}); }

  function nl2br(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
  function crItem(key, val, tag, tagClass, fieldIds) {
    if (!val) return '';
    tag = tag || ''; tagClass = tagClass || '';
    var tagHtml = tag ? '<span class="cr-tag ' + tagClass + '">' + tag + '</span>' : '';
    var cls = ''; var dateBadge = '';
    if (fieldIds && _crInSuiviMode()) {
      if (_crIsCarried(fieldIds)) {
        cls = ' cr-item--carried';
        var _od = _crOriginDate(fieldIds);
        if (_od) dateBadge = '<span class="cr-date-badge">' + _od + '</span>';
      } else { cls = ' cr-item--fresh'; }
    }
    return '<div class="cr-item' + cls + '"><span class="cr-key">' + key + '</span><span class="cr-val">' + val + '</span>' + tagHtml + dateBadge + '</div>';
  }

  // ── Résolution du côté atteint ────────────────────────────────
  var _cotePrimaire = ((document.getElementById('f-cote')||{}).value||'').toUpperCase();
  var _isBilat  = (_cotePrimaire !== 'DROIT' && _cotePrimaire !== 'GAUCHE'); // '' et 'BILATÉRAL' → bilatéral

  var lsiStr  = function(ca,cs) {
    if (isNaN(ca)||isNaN(cs)) return '';
    var v = _isBilat
      ? (ca > 0 && cs > 0 ? Math.min(ca,cs)/Math.max(ca,cs)*100 : NaN)
      : (cs > 0 ? ca/cs*100 : NaN);
    if (isNaN(v)) return '';
    return (_isBilat ? 'Sym. = ' : 'LSI = ') + v.toFixed(1) + '%';
  };
  var lsiCls2 = function(ca,cs) {
    if (isNaN(ca)||isNaN(cs)) return '';
    var v = _isBilat
      ? (ca > 0 && cs > 0 ? Math.min(ca,cs)/Math.max(ca,cs)*100 : NaN)
      : (cs > 0 ? ca/cs*100 : NaN);
    if (isNaN(v)) return '';
    return v >= 90 ? 'good' : v >= 80 ? 'warn' : 'bad';
  };
  var statOf2 = function(cls) {
    if (_isBilat) return ({good:'Symétrique', warn:'Asymétrie modérée', bad:'Asymétrie significative'}[cls])||'';
    return ({good:'OK', warn:'Acceptable', bad:'Insuffisant'}[cls])||'';
  };
  // Pour unilatéral : CA = côté douloureux, CS = côté sain
  // Pour bilatéral  : Gauche en premier (sens de lecture), Droit en second
  var _labelCA = _cotePrimaire === 'DROIT' ? 'Droit' : _cotePrimaire === 'GAUCHE' ? 'Gauche' : 'Gauche';
  var _labelCS = _cotePrimaire === 'DROIT' ? 'Gauche' : _cotePrimaire === 'GAUCHE' ? 'Droit' : 'Droit';

  var obsBlock = function(idCA, idCS) {
    var ca = (document.getElementById(idCA)||{}).value||'';
    var cs = (document.getElementById(idCS)||{}).value||'';
    var parts = [];
    if(ca) parts.push('<div><span style="font-weight:600;font-style:normal;">Obs. '+_labelCA+' :</span><br><span style="padding-left:8px;display:inline-block">'+nl2br(ca)+'</span></div>');
    if(cs) parts.push('<div><span style="font-weight:600;font-style:normal;">Obs. '+_labelCS+' :</span><br><span style="padding-left:8px;display:inline-block">'+nl2br(cs)+'</span></div>');
    var txt = parts.join('');
    return txt?'<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">'+txt+'</div>':'';
  };

  // ── ROM status table helper ───────────────────────────────────
  function romStatTag(v, cfg) {
    if (!cfg || isNaN(v)) return '';
    var cls2, tag2;
    if (cfg.inverted) {
      cls2 = v===0?'good':v<=5?'warn':'bad';
      tag2 = v===0?'Normal':v<=5?'Acceptable':'Insuffisant';
    } else {
      var r2 = cfg.norm>0?v/cfg.norm:1;
      cls2 = r2>=0.9?'good':r2>=0.75?'warn':'bad';
      tag2 = r2>=0.9?'Normal':r2>=0.75?'Acceptable':'Insuffisant';
    }
    return '<span class="cr-tag '+cls2+'">'+tag2+'</span>';
  }
  function romCrTable(title, rows, twoSides) {
    // rows: [{label, dId, gId?}]
    var anyVal=false, rowsHtml='';
    for (var r2i=0;r2i<rows.length;r2i++) {
      var r2=rows[r2i];
      var dEl2=document.getElementById(r2.dId);
      var gEl2=r2.gId?document.getElementById(r2.gId):null;
      var dV2=dEl2&&dEl2.value!==''?parseFloat(dEl2.value):NaN;
      var gV2=gEl2&&gEl2.value!==''?parseFloat(gEl2.value):NaN;
      if(isNaN(dV2)&&isNaN(gV2)) continue;
      anyVal=true;
      var dStr2=isNaN(dV2)?'—':dV2+'° '+romStatTag(dV2,ROM_CONFIG[r2.dId]);
      var gStr2=gEl2?(isNaN(gV2)?'—':gV2+'° '+romStatTag(gV2,ROM_CONFIG[r2.gId])):'';
      rowsHtml+='<tr style="border-top:1px solid var(--border)">'
        +'<td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">'+r2.label+'</td>'
        +'<td style="padding:3px 8px;font-size:.8rem;text-align:center">'+dStr2+'</td>'
        +(twoSides?'<td style="padding:3px 8px;font-size:.8rem;text-align:center">'+gStr2+'</td>':'')
        +'</tr>';
    }
    if(!anyVal) return '';
    return '<div style="margin:4px 0 10px">'
      +'<div style="font-size:.77rem;font-weight:600;color:var(--text2);margin-bottom:3px">'+title+'</div>'
      +'<table style="width:100%;border-collapse:collapse">'
      +'<thead><tr style="background:var(--surface2)">'
      +'<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Mouvement</th>'
      +(twoSides
        ?'<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Droit</th>'
         +'<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Gauche</th>'
        :'<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Valeur</th>')
      +'</tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
  }
  // 2. Bilan ortho
  var orthoSections = [
    { label:'EPAULE', pk:'epaule', fields:[['ep-type','Type'],['ep-marqueur','Marqueur']], tables:['tb-ep-irrit','tb-ep-trau-gh','tb-ep-trau-ac','tb-ep-trau-lab','tb-ep-trau-coiffe','tb-ep-fonc','tb-ep-ortho-mob','tb-ep-ortho-conf','tb-ep-irrit-g','tb-ep-irrit-d','tb-ep-trau-g','tb-ep-trau-d','tb-ep-fonc-g','tb-ep-fonc-d','tb-ep-ortho-g','tb-ep-ortho-d'], concl:'ep-conclusion', opt:'ep-opt' },
    { label:'RACHIS CERVICAL', pk:'', fields:[['cv-marqueur','Marqueur']], tables:['tb-cv-vascul','tb-cv-defilé-g','tb-cv-defilé-d','tb-cv-mecanique','tb-cv-ulnt-g','tb-cv-ulnt-d','tb-cv-dn4-itw','tb-cv-dn4-exam','tb-cv-motric-g','tb-cv-motric-d','tb-cv-rot-g','tb-cv-rot-d','tb-cv-sensib-g','tb-cv-sensib-d'], concl:'cv-conclusion' },
    { label:'RACHIS LOMBAIRE', pk:'', fields:[['rl-marqueur','Marqueur']], tables:['tb-rl-nerveux-g','tb-rl-nerveux-d','tb-rl-rot-g','tb-rl-rot-d','tb-rl-motric-g','tb-rl-motric-d','tb-rl-sensib-g','tb-rl-sensib-d','tb-rl-plet','tb-rl-laslett-1','tb-rl-laslett-2','tb-rl-laslett-3','tb-rl-instab','tb-rl-tfd-suite','tb-rl-tfa-suite','tb-rl-transverse'], concl:'rl-conclusion' },
    { label:'RACHIS', pk:'rachis', fields:[['ra-marqueur','Marqueur'],['ra-mckenzie','McKenzie']], tables:['tb-ra-cerv','tb-ra-cerv-neuro-g','tb-ra-cerv-neuro-d','tb-ra-lomb-g','tb-ra-lomb-d','tb-ra-transverse'], concl:'ra-conclusion', opt:'ra-opt' },
    { label:'HANCHE', pk:'hanche', fields:[['ha-marqueur','Marqueur']], tables:['tb-ha-neuro','tb-ha-laslett-1','tb-ha-laslett-2','tb-ha-laslett-3','tb-ha-fracture','tb-ha-agp-clock','tb-ha-agp-demem','tb-ha-agp-add','tb-ha-agp-pubis','tb-ha-agp-flech','tb-ha-agp-inguinal','tb-ha-hanche','tb-ha-fonc','tb-ha-neuro-g','tb-ha-neuro-d','tb-ha-fracture-g','tb-ha-fracture-d','tb-ha-agp-g','tb-ha-agp-d','tb-ha-hanche-g','tb-ha-hanche-d'], concl:'ha-conclusion', opt:'ha-opt' },
    { label:'GENOU', pk:'genou', fields:[['ge-marqueur','Marqueur']], tables:[
        'tb-ge-global','tb-ge-mob-flex','tb-ge-mob-ext','tb-ge-lig','tb-ge-lca','tb-ge-men','tb-ge-rot','tb-ge-sbit','tb-ge-plicae','tb-ge-ext',
        'tb-ge-global-g','tb-ge-global-d','tb-ge-mob-flex-g','tb-ge-mob-flex-d','tb-ge-mob-ext-g','tb-ge-mob-ext-d','tb-ge-lig-g','tb-ge-lig-d','tb-ge-lca-g','tb-ge-lca-d',
        'tb-ge-men-g','tb-ge-men-d','tb-ge-rot-g','tb-ge-rot-d','tb-ge-sbit-g','tb-ge-sbit-d',
        'tb-ge-plicae-g','tb-ge-plicae-d','tb-ge-ext-g','tb-ge-ext-d',
        ], concl:'ge-conclusion', opt:'ge-opt' },
    { label:'PIED / CHEVILLE', pk:'pied', fields:[['pi-marqueur','Marqueur']], tables:[
        'tb-pi-ottawa','tb-pi-global','tb-pi-tt','tb-pi-synd','tb-pi-conf','tb-pi-st','tb-pi-chopart',
        'tb-pi-ottawa-g','tb-pi-ottawa-d','tb-pi-global-g','tb-pi-global-d','tb-pi-amp-g','tb-pi-amp-d','tb-pi-tt-g','tb-pi-tt-d','tb-pi-synd-g','tb-pi-synd-d','tb-pi-conf-g','tb-pi-conf-d','tb-pi-st-g','tb-pi-st-d','tb-pi-chopart-g','tb-pi-chopart-d',
        'tb-pi-tc-g','tb-pi-tc-d'], concl:'pi-conclusion', opt:'pi-opt' },
  ];
  var orthoHtml = '';
  for (var oi=0; oi<orthoSections.length; oi++) {
    var sec = orthoSections[oi];
    var secRows = '';
    for (var fi=0; fi<sec.fields.length; fi++) {
      var fEl = document.getElementById(sec.fields[fi][0]);
      if (fEl && fEl.value) secRows += crItem(sec.fields[fi][1], nl2br(fEl.value), '', '', [sec.fields[fi][0]]);
    }
    for (var ti=0; ti<sec.tables.length; ti++) {
      var tKey = sec.tables[ti];
      var cfg = TESTS[tKey];
      if (!cfg) continue;
      var tbody = document.getElementById(tKey);
      if (!tbody) continue;
      var rows = tbody.querySelectorAll('tr');
      for (var ri=0; ri<rows.length; ri++) {
        var selEl = rows[ri].querySelector('select');
        var noteEl = rows[ri].querySelector('input[type="text"]');
        var val = selEl ? selEl.value : '';
        var isPos = val === 'Positif' || val === 'Validé';
        var isNeg = val === 'Négatif' || val === 'Pas validé';
        var isAmp = val === 'Ok' || val === 'Acceptable' || val === 'Insuffisant';
        if (selEl && (isPos || isNeg || isAmp)) {
          var tname = (cfg.items[ri] || '').replace(/<span[\s\S]*?<\/span>/gi, '').replace(/<[^>]*>/g, '').trim();
          // Ajouter la latéralité pour les tables bilatérales (clé se terminant par -d ou -g)
          if (/-d$/.test(tKey)) tname += ' — Droit';
          else if (/-g$/.test(tKey)) tname += ' — Gauche';
          var noteVal = noteEl ? noteEl.value : '';
          var isFonc = cfg.type === 'fonc';
          var tag, tagCls;
          if      (val === 'Validé')     { tag = 'Validé';     tagCls = 'ok'; }
          else if (val === 'Pas validé') { tag = 'Pas validé'; tagCls = 'bad'; }
          else if (isAmp)                { tag = val; tagCls = val === 'Ok' ? 'ok' : val === 'Acceptable' ? 'warn' : 'bad'; }
          else if (isFonc)               { tag = val; tagCls = isPos ? 'ok'  : 'bad'; }
          else                           { tag = val; tagCls = isPos ? 'bad' : 'ok';  }
          secRows += crItem(tname, noteVal || '-', tag, tagCls, [selEl.id].filter(Boolean));
        }
      }
    }
    if (sec.label === 'HANCHE') {
      secRows += romCrTable('Amplitudes Articulaires — Hanche (°)', [
        {label:'Flexion',   dId:'ha-mob-d-flex', gId:'ha-mob-g-flex'},
        {label:'Extension', dId:'ha-mob-d-ext',  gId:'ha-mob-g-ext'},
        {label:'RI',        dId:'ha-mob-d-ri',   gId:'ha-mob-g-ri'},
        {label:'RE',        dId:'ha-mob-d-re',   gId:'ha-mob-g-re'},
        {label:'ABD',       dId:'ha-mob-d-abd',  gId:'ha-mob-g-abd'},
        {label:'ADD',       dId:'ha-mob-d-add',  gId:'ha-mob-g-add'},
      ], true);
      var haObsG = (document.getElementById('ha-mob-g-obs')||{}).value||'';
      var haObsD = (document.getElementById('ha-mob-d-obs')||{}).value||'';
      if (haObsG) secRows += '<div style="margin:2px 0 6px;padding:5px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. Hanche G : '+nl2br(haObsG)+'</div>';
      if (haObsD) secRows += '<div style="margin:2px 0 6px;padding:5px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. Hanche D : '+nl2br(haObsD)+'</div>';
      // Force musculaire hanche
      var haForceTests = [
        {key:'ha-f-add',   label:'Adducteurs'},
        {key:'ha-f-flech', label:'Fléchisseurs'},
        {key:'ha-f-abd',   label:'Abducteurs'},
        {key:'ha-f-ri',    label:'RI'},
        {key:'ha-f-re',    label:'RE'},
      ];
      haForceTests.forEach(function(ft) {
        var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
        var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
        var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
        var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
        if (!isNaN(csN) && csN > 0) {
          var lsiV = !isNaN(caN) ? caN/csN*100 : NaN;
          var isPos = !isNaN(lsiV) && lsiV < 90;
          var valStr = 'CS='+csN+' kg'+(!isNaN(caN)?' CA='+caN+' kg':'')+(!isNaN(lsiV)?' LSI='+lsiV.toFixed(0)+'%':'');
          secRows += crItem(ft.label, valStr, isPos?'Positif':'Négatif', isPos?'bad':'ok', [ft.key+'-cs',ft.key+'-ca']);
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS+'='+csA);
          if (caA) parts.push(_labelCA+'='+caA);
          var anyPos = csA==='Positif' || caA==='Positif';
          if (anyPos || csA==='Négatif' || caA==='Négatif') {
            secRows += crItem(ft.label, parts.join(' · '), anyPos?'Positif':'Négatif', anyPos?'bad':'ok', [ft.key+'-apr-cs',ft.key+'-apr-ca']);
          }
        }
      });
    }
    if (sec.label === 'GENOU') {
      var geMobFields = ['flex','ext','ri','re','abd','add'];
      var geMobLabels = ['Flex','Ext','RI','RE','Abd','Add'];
      function geMobSide(prefix, sideLabel) {
        var vals = geMobFields.map(function(f){ return (document.getElementById(prefix+'-'+f)||{}).value||''; });
        var hasVal = vals.some(function(v){ return v.trim()!==''; });
        if (!hasVal) return '';
        var obs = (document.getElementById(prefix+'-obs')||{}).value||'';
        var valStr = geMobLabels.map(function(l,i){ return vals[i]?l+'='+vals[i]:''; }).filter(Boolean).join('   ');
        var out = crItem('Mobilité Hanche (genou) — '+sideLabel, valStr);
        if (obs) out += '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. : '+nl2br(obs)+'</div>';
        return out;
      }
      secRows += geMobSide('ge-mob-g','Gauche') + geMobSide('ge-mob-d','Droit');
      secRows += romCrTable('Amplitudes Articulaires — Genou (°)', [
        {label:'Flexion active',     dId:'rom-ge-d-flexa', gId:'rom-ge-g-flexa'},
        {label:'Flexion passive',    dId:'rom-ge-d-flexp', gId:'rom-ge-g-flexp'},
        {label:'Déficit extension',  dId:'rom-ge-d-ext',   gId:'rom-ge-g-ext'},
      ], true);
      // Force musculaire genou
      var geForceTests = [
        {key:'ge-f-quad', label:'Quadriceps'},
        {key:'ge-f-ij',   label:'Ischio-jambiers'},
      ];
      geForceTests.forEach(function(ft) {
        var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
        var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
        var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
        var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
        if (!isNaN(csN) && csN > 0) {
          var lsiV = !isNaN(caN) ? caN/csN*100 : NaN;
          var isPos = !isNaN(lsiV) && lsiV < 90;
          var valStr = 'CS='+csN+' kg'+(!isNaN(caN)?' CA='+caN+' kg':'')+(!isNaN(lsiV)?' LSI='+lsiV.toFixed(0)+'%':'');
          secRows += crItem(ft.label, valStr, isPos?'Positif':'Négatif', isPos?'bad':'ok', [ft.key+'-cs',ft.key+'-ca']);
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS+'='+csA);
          if (caA) parts.push(_labelCA+'='+caA);
          var anyPos = csA==='Positif' || caA==='Positif';
          if (anyPos || csA==='Négatif' || caA==='Négatif') {
            secRows += crItem(ft.label, parts.join(' · '), anyPos?'Positif':'Négatif', anyPos?'bad':'ok', [ft.key+'-apr-cs',ft.key+'-apr-ca']);
          }
        }
      });
    }
    if (sec.label === 'EPAULE') {
      // GIRD
      var girdCS = parseFloat((document.getElementById('gird-cs')||{}).value);
      var girdCA = parseFloat((document.getElementById('gird-ca')||{}).value);
      if (!isNaN(girdCS) && !isNaN(girdCA)) {
        var girdDiff = girdCS - girdCA;
        var girdTag = girdDiff > 15 ? 'Positif' : 'Négatif';
        var girdCls = girdDiff > 15 ? 'bad' : 'ok';
        secRows += crItem('GIRD — RI', 'CS=' + girdCS + '° CA=' + girdCA + '° (diff ' + (girdDiff>=0?'+':'') + girdDiff.toFixed(0) + '°)', girdTag, girdCls, ['gird-cs','gird-ca']);
      }
      // Force break tests
      var epForceTests = [
        {key:'ep-trap', label:'Trapèze inf. — Y Test'},
        {key:'ep-dent', label:'Dentelé ant. — Push up+'},
        {key:'ep-rl1',  label:'Rotateurs lat. RE1'},
        {key:'ep-rl2',  label:'Rotateurs lat. RE2'},
        {key:'ep-ri1',  label:'Rotateurs int. RI1'},
        {key:'ep-ri2',  label:'Rotateurs int. RI2'},
        {key:'ep-abd',  label:'Élévation antérieure'},
        {key:'ep-bht',  label:'Bear Hug Test'},
        {key:'co-f-ext', label:'Extension coude'},
        {key:'co-f-flex', label:'Flexion coude'},
      ];
      epForceTests.forEach(function(ft) {
        var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
        var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
        var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
        var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
        if (!isNaN(csN) && csN > 0) {
          var lsiV = !isNaN(caN) ? caN/csN*100 : NaN;
          var isDent = ft.key === 'ep-dent';
          var isPos = isDent ? (csN < 20 || (!isNaN(caN) && caN < 20) || (!isNaN(lsiV) && lsiV < 90))
                             : (!isNaN(lsiV) && lsiV < 90);
          var valStr = (isDent ? 'CS=' + csN + ' rép' : 'CS=' + csN + ' N') +
                       (!isNaN(caN) ? (isDent ? ' CA=' + caN + ' rép' : ' CA=' + caN + ' N') : '') +
                       (!isNaN(lsiV) ? ' LSI=' + lsiV.toFixed(0) + '%' : '');
          secRows += crItem(ft.label, valStr, isPos ? 'Positif' : 'Négatif', isPos ? 'bad' : 'ok', [ft.key+'-cs', ft.key+'-ca']);
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS + '=' + csA);
          if (caA) parts.push(_labelCA + '=' + caA);
          var anyPos = csA === 'Positif' || caA === 'Positif';
          if (anyPos || csA === 'Négatif' || caA === 'Négatif') {
            secRows += crItem(ft.label, parts.join(' · '), anyPos ? 'Positif' : 'Négatif', anyPos ? 'bad' : 'ok', [ft.key+'-apr-cs', ft.key+'-apr-ca']);
          }
        }
      });
      secRows += romCrTable('Amplitudes Articulaires — Épaule (°)', [
        {label:'Flexion',          dId:'rom-ep-d-flex',  gId:'rom-ep-g-flex'},
        {label:'Extension',        dId:'rom-ep-d-ext',   gId:'rom-ep-g-ext'},
        {label:'Abduction',        dId:'rom-ep-d-abd',   gId:'rom-ep-g-abd'},
        {label:'ADD horizontale',  dId:'rom-ep-d-addh',  gId:'rom-ep-g-addh'},
        {label:'RI bras à 0°',     dId:'rom-ep-d-ri0',   gId:'rom-ep-g-ri0'},
        {label:'RE bras à 0°',     dId:'rom-ep-d-re0',   gId:'rom-ep-g-re0'},
        {label:'RI bras à 90°',    dId:'rom-ep-d-ri90',  gId:'rom-ep-g-ri90'},
        {label:'RE bras à 90°',    dId:'rom-ep-d-re90',  gId:'rom-ep-g-re90'},
      ], true);
    }
    if (sec.label === 'RACHIS') {
      // Mobilité rachis — statut qualitatif
      var mobSegments = [
        { title:'Mobilité Cervicale', seg:'cerv' },
        { title:'Mobilité Thoracique', seg:'thor' },
        { title:'Mobilité Lombaire',   seg:'lomb' },
      ];
      var stLblMap = { ok:'OK', acceptable:'Acceptable', insuffisant:'Insuffisant' };
      var stClsMap = { ok:'ok', acceptable:'warn', insuffisant:'bad' };
      mobSegments.forEach(function(ms) {
        var anyMob = false, mobRows = '';
        var mobItems = ms.seg === 'lomb' ? MOB.concat(['Glissement D', 'Glissement G']) : MOB;
        mobItems.forEach(function(m) {
          var mKey = 'mob-' + ms.seg + '-' + m.replace(/[\s.\/]+/g, '_');
          var stEl = document.getElementById(mKey + '-st');
          var ntEl = document.getElementById(mKey + '-nt');
          var stVal = stEl ? stEl.value : '';
          var ntVal = ntEl ? ntEl.value.trim() : '';
          if (!stVal && !ntVal) return;
          anyMob = true;
          var stTag = stVal ? ('<span class="cr-tag '+stClsMap[stVal]+'">'+stLblMap[stVal]+'</span>') : '';
          mobRows += '<tr style="border-top:1px solid var(--border)">'
            + '<td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">'+m+'</td>'
            + '<td style="padding:3px 8px;font-size:.8rem;text-align:center">'+stTag+'</td>'
            + '<td style="padding:3px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+nl2br(ntVal)+'</td>'
            + '</tr>';
        });
        if (anyMob) {
          secRows += '<div style="margin:4px 0 10px">'
            + '<div style="font-size:.77rem;font-weight:600;color:var(--text2);margin-bottom:3px">'+ms.title+'</div>'
            + '<table style="width:100%;border-collapse:collapse">'
            + '<thead><tr style="background:var(--surface2)">'
            + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Mouvement</th>'
            + '<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Statut</th>'
            + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Marqueur</th>'
            + '</tr></thead><tbody>'+mobRows+'</tbody></table></div>';
        }
      });
      // Force cervicale + lombaire (valeurs brutes)
      var raRawTests = [
        {key:'ra-fc-ext',  label:'Extension cervicale (force)'},
        {key:'ra-fc-flex', label:'Flexion cervicale (force)'},
        {key:'ra-fl-ext',  label:'Extension lombaire (force)'},
        {key:'ra-fl-flex', label:'Flexion lombaire (force)'},
      ];
      raRawTests.forEach(function(t) {
        var v = parseFloat((document.getElementById(t.key)||{}).value);
        var obs = ((document.getElementById(t.key+'-obs')||{}).value||'').trim();
        if (!isNaN(v) && v > 0) {
          secRows += crItem(t.label, v+' kg'+(obs?' — '+obs:''), '', 'ok', [t.key]);
        } else if (obs) {
          secRows += crItem(t.label, obs, '', 'ok', [t.key+'-obs']);
        }
      });
      // Inclinaison cervicale (LSI)
      (function(){
        var csN = parseFloat((document.getElementById('ra-fc-inc-cs')||{}).value);
        var caN = parseFloat((document.getElementById('ra-fc-inc-ca')||{}).value);
        var csA = (document.getElementById('ra-fc-inc-apr-cs')||{}).value||'';
        var caA = (document.getElementById('ra-fc-inc-apr-ca')||{}).value||'';
        if (!isNaN(csN) && csN > 0) {
          var lsiV = !isNaN(caN) ? caN/csN*100 : NaN;
          var isPos = !isNaN(lsiV) && lsiV < 90;
          var valStr = 'CS='+csN+' kg'+(!isNaN(caN)?' CA='+caN+' kg':'')+(!isNaN(lsiV)?' LSI='+lsiV.toFixed(0)+'%':'');
          secRows += crItem('Inclinaison cervicale', valStr, isPos?'Positif':'Négatif', isPos?'bad':'ok', ['ra-fc-inc-cs','ra-fc-inc-ca']);
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS+'='+csA);
          if (caA) parts.push(_labelCA+'='+caA);
          var anyPos = csA==='Positif' || caA==='Positif';
          if (anyPos || csA==='Négatif' || caA==='Négatif') {
            secRows += crItem('Inclinaison cervicale', parts.join(' · '), anyPos?'Positif':'Négatif', anyPos?'bad':'ok', ['ra-fc-inc-apr-cs','ra-fc-inc-apr-ca']);
          }
        }
      })();
    }
    if (sec.label === 'RACHIS LOMBAIRE') {
      var rlMobItems = MOB.concat(['Glissement D', 'Glissement G']);
      var rlStLblMap = { ok:'OK', acceptable:'Acceptable', insuffisant:'Insuffisant' };
      var rlStClsMap = { ok:'ok', acceptable:'warn', insuffisant:'bad' };
      var rlAnyMob = false, rlMobRows = '';
      rlMobItems.forEach(function(m) {
        var mKey = 'mob-rl-' + m.replace(/[\s.\/]+/g, '_');
        var stEl = document.getElementById(mKey + '-st');
        var ntEl = document.getElementById(mKey + '-nt');
        var stVal = stEl ? stEl.value : '';
        var ntVal = ntEl ? ntEl.value.trim() : '';
        if (!stVal && !ntVal) return;
        rlAnyMob = true;
        var stTag = stVal ? ('<span class="cr-tag '+rlStClsMap[stVal]+'">'+rlStLblMap[stVal]+'</span>') : '';
        rlMobRows += '<tr style="border-top:1px solid var(--border)">'
          + '<td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">'+m+'</td>'
          + '<td style="padding:3px 8px;font-size:.8rem;text-align:center">'+stTag+'</td>'
          + '<td style="padding:3px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+nl2br(ntVal)+'</td>'
          + '</tr>';
      });
      if (rlAnyMob) {
        secRows += '<div style="margin:4px 0 10px">'
          + '<div style="font-size:.77rem;font-weight:600;color:var(--text2);margin-bottom:3px">Mobilité Lombaire</div>'
          + '<table style="width:100%;border-collapse:collapse">'
          + '<thead><tr style="background:var(--surface2)">'
          + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Mouvement</th>'
          + '<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Statut</th>'
          + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Marqueur</th>'
          + '</tr></thead><tbody>'+rlMobRows+'</tbody></table></div>';
      }
      // TFD / TFA primaires
      (function() {
        var tfdRes = (document.getElementById('rl-tfd-res')||{}).value || '';
        var tfdNt  = ((document.getElementById('rl-tfd-nt')||{}).value||'').trim();
        var tfaRes = (document.getElementById('rl-tfa-res')||{}).value || '';
        var tfaNt  = ((document.getElementById('rl-tfa-nt')||{}).value||'').trim();
        if (!tfdRes && !tfdNt && !tfaRes && !tfaNt) return;
        var mkTag = function(v) {
          if (!v) return '';
          var cls = v === 'Positif' ? 'bad' : v === 'Négatif' ? 'good' : '';
          return '<span class="cr-tag '+cls+'">'+v+'</span>';
        };
        var rows = '';
        if (tfdRes || tfdNt) rows += '<tr style="border-top:1px solid var(--border)"><td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">TFD (flexion debout)</td><td style="padding:3px 8px;text-align:center">'+mkTag(tfdRes)+'</td><td style="padding:3px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+nl2br(tfdNt)+(tfdRes==='Positif'?' <em style="color:#166534">→ MI</em>':'')+'</td></tr>';
        if (tfaRes || tfaNt) rows += '<tr style="border-top:1px solid var(--border)"><td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">TFA (flexion assis)</td><td style="padding:3px 8px;text-align:center">'+mkTag(tfaRes)+'</td><td style="padding:3px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+nl2br(tfaNt)+(tfaRes==='Positif'?' <em style="color:#166534">→ Rachis</em>':'')+'</td></tr>';
        secRows += '<div style="margin:4px 0 10px">'
          + '<div style="font-size:.77rem;font-weight:600;color:var(--text2);margin-bottom:3px">Tests de flexion SIJ</div>'
          + '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)">'
          + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Test</th>'
          + '<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Résultat</th>'
          + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Observation</th>'
          + '</tr></thead><tbody>'+rows+'</tbody></table></div>';
      })();
      // McKenzie
      (function() {
        var mckLbls = {
          'flex':'Flexion', 'ext':'Extension',
          'incl-g':'Inclinaison gauche', 'incl-d':'Inclinaison droite',
          'rot-g':'Rotation gauche', 'rot-d':'Rotation droite',
          'gliss-g':'Glissement gauche', 'gliss-d':'Glissement droit'
        };
        var mckRows = '', anyMck = false;
        _MCK_MVTS.forEach(function(m) {
          var res = (document.getElementById('mck-'+m+'-res')||{}).value || '';
          var rep = (document.getElementById('mck-'+m+'-rep')||{}).value || '';
          var nt  = ((document.getElementById('mck-'+m+'-nt')||{}).value||'').trim();
          if (!res && !nt) return;
          anyMck = true;
          var cls = _MCK_GREEN[res] ? 'good' : _MCK_RED[res] ? 'bad' : res === 'Diminution' ? 'warn' : '';
          var tag = res ? ('<span class="cr-tag '+cls+'">'+res+'</span>') : '';
          var repStr = rep ? ' ×'+rep : '';
          mckRows += '<tr style="border-top:1px solid var(--border)">'
            + '<td style="padding:3px 8px;font-size:.8rem;color:var(--text2)">'+mckLbls[m]+repStr+'</td>'
            + '<td style="padding:3px 8px;text-align:center">'+tag+'</td>'
            + '<td style="padding:3px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+nl2br(nt)+'</td>'
            + '</tr>';
        });
        var _favDirsCR = [];
        _MCK_MVTS.forEach(function(m){
          var res = (document.getElementById('mck-'+m+'-res')||{}).value || '';
          if (_MCK_GREEN[res] || res === 'Diminution') _favDirsCR.push(_MCK_LBLS[m]);
        });
        var dir = _favDirsCR.length ? _favDirsCR.join(', ') : '';
        if (anyMck || dir) {
          var summary = dir ? 'Direction(s) préférentielle(s) : ' + dir : '';
          secRows += '<div style="margin:4px 0 10px">'
            + '<div style="font-size:.77rem;font-weight:600;color:var(--text2);margin-bottom:3px">McKenzie (MDT)</div>'
            + (anyMck ? '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--surface2)">'
              + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Mouvement</th>'
              + '<th style="padding:3px 8px;text-align:center;font-size:.72rem;color:var(--text3);font-weight:600">Réponse</th>'
              + '<th style="padding:3px 8px;text-align:left;font-size:.72rem;color:var(--text3);font-weight:600">Observation</th>'
              + '</tr></thead><tbody>'+mckRows+'</tbody></table>' : '')
            + (summary ? '<div style="padding:5px 8px;font-size:.78rem;color:var(--text2);font-style:italic">'+summary+'</div>' : '')
            + '</div>';
        }
      })();
    }
    if (sec.label === 'PIED / CHEVILLE') {
      // Course interne mollet
      var cimG = parseFloat((document.getElementById('pi-cim-g')||{}).value);
      var cimD = parseFloat((document.getElementById('pi-cim-d')||{}).value);
      if (!isNaN(cimG) || !isNaN(cimD)) {
        var cimLsi = document.getElementById('pi-cim-lsi');
        var cimStat = document.getElementById('pi-cim-stat');
        var cimLsiTxt = cimLsi ? cimLsi.textContent : '—';
        var cimStatTxt = cimStat ? cimStat.textContent.replace(/[✅⚠️❌]\s*/,'') : '—';
        var cimCls = cimStat ? (cimStat.className.includes('good') ? 'ok' : cimStat.className.includes('warn') ? 'warn' : cimStat.className.includes('bad') ? 'bad' : '') : '';
        var cimDetail = (!isNaN(cimG) ? 'G : '+cimG+' cm' : '') + ((!isNaN(cimG)&&!isNaN(cimD))?' · ':'') + (!isNaN(cimD) ? 'D : '+cimD+' cm' : '') + ' · LSI : ' + cimLsiTxt;
        secRows += crItem('Course interne mollet', cimDetail, cimStatTxt, cimCls, ['pi-cim-g','pi-cim-d'].filter(function(i){ var e=document.getElementById(i); return e&&e.value; }));
      }
      // Navicular Drop Test
      ['g','d'].forEach(function(side) {
        var el = document.getElementById('pi-ndt-' + side);
        if (!el || !el.value) return;
        var v = parseFloat(el.value);
        if (isNaN(v)) return;
        var statEl = document.getElementById('pi-ndt-' + side + '-stat');
        var statTxt = statEl ? statEl.textContent : (v > 10 ? 'Effondrement arche' : 'Normal');
        var tagCls = v > 10 ? 'bad' : 'ok';
        secRows += crItem('Navicular Drop Test — ' + (side==='g'?'Gauche':'Droit'), v+' mm', statTxt, tagCls, ['pi-ndt-'+side]);
      });
      // Force musculaire pied/cheville
      var piForceTests = [
        {key:'pi-f-fp',  label:'Flexion plantaire'},
        {key:'pi-f-fd',  label:'Flexion dorsale'},
        {key:'pi-f-inv', label:'Inversion'},
        {key:'pi-f-ev',  label:'Éversion'},
        {key:'pi-f-lfh', label:'Long Fléchisseur de l\'Hallux (LFH)'},
      ];
      piForceTests.forEach(function(ft) {
        var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
        var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
        var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
        var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
        if (!isNaN(csN) && csN > 0) {
          var lsiV = !isNaN(caN) ? caN/csN*100 : NaN;
          var isPos = !isNaN(lsiV) && lsiV < 90;
          var valStr = 'CS='+csN+' kg'+(!isNaN(caN)?' CA='+caN+' kg':'')+(!isNaN(lsiV)?' LSI='+lsiV.toFixed(0)+'%':'');
          secRows += crItem(ft.label, valStr, isPos?'Positif':'Négatif', isPos?'bad':'ok', [ft.key+'-cs',ft.key+'-ca']);
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS+'='+csA);
          if (caA) parts.push(_labelCA+'='+caA);
          var anyPos = csA==='Positif' || caA==='Positif';
          if (anyPos || csA==='Négatif' || caA==='Négatif') {
            secRows += crItem(ft.label, parts.join(' · '), anyPos?'Positif':'Négatif', anyPos?'bad':'ok', [ft.key+'-apr-cs',ft.key+'-apr-ca']);
          }
        }
      });
    }
    if (sec.label === 'GENOU' || sec.label === 'HANCHE' || sec.label === 'EPAULE' || sec.label === 'RACHIS') {
      var cfCA2 = parseFloat((document.getElementById('cf-q-ca')||{}).value||'');
      var cfCS2 = parseFloat((document.getElementById('cf-q-cs')||{}).value||'');
      var cfObs2 = (document.getElementById('cf-obs-ca')||{}).value||'';
      if (sec.label === 'GENOU' && !isNaN(cfCA2)) {
        secRows += crItem('Contraction Flash Isométrique 20s',
          _labelCA+'='+cfCA2+'N   '+_labelCS+'='+(isNaN(cfCS2)?'-':cfCS2)+'N   '+lsiStr(cfCA2,cfCS2),
          statOf2(lsiCls2(cfCA2,cfCS2)), lsiCls2(cfCA2,cfCS2), ['cf-q-ca','cf-q-cs']);
      }
      if (sec.label === 'GENOU' && cfObs2) secRows += '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">' + cfObs2 + '</div>';
    }
    var conclEl = document.getElementById(sec.concl);
    if (conclEl && conclEl.value) secRows += crItem('Conclusion', nl2br(conclEl.value), '', '', [sec.concl]);
    var optEl = sec.opt ? document.getElementById(sec.opt) : null;
    if (optEl && optEl.value) secRows += crItem('Tests Optionnels', nl2br(optEl.value), '', '', [sec.opt]);
    if(sec.pk && typeof window._ctBuildSectionHtml === 'function') secRows += window._ctBuildSectionHtml(sec.pk);
    if (secRows) orthoHtml += '<div style="margin-bottom:14px"><div style="margin-top:16px;margin-bottom:8px;border-left:3px solid var(--green);background:#F6FBF8;padding:6px 12px;font-size:.72rem;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.08em">' + sec.label + '</div>' + secRows + '</div>';
  }
  addSec('2. Bilan Orthopedique', orthoHtml);

  // 2b. LMA
  var lmaMuscleSel = document.getElementById('lma-sel-muscle');
  var lmaMuscleVal = lmaMuscleSel ? lmaMuscleSel.value : '';
  var lmaHtml = '';
  if (lmaMuscleVal) {
    var lmaMusclLabel = lmaMuscleSel.options[lmaMuscleSel.selectedIndex].text;
    var lmaMembreSel  = document.getElementById('lma-sel-membre');
    var lmaMembreLabel = lmaMembreSel ? lmaMembreSel.options[lmaMembreSel.selectedIndex].text : '';
    var lmaTbKey = 'tb-lma-' + lmaMuscleVal;
    var lmaCfg   = TESTS[lmaTbKey];
    var lmaTbody = document.getElementById(lmaTbKey);
    if (lmaCfg && lmaTbody) {
      var lmaRows = lmaTbody.querySelectorAll('tr');
      for (var li = 0; li < lmaRows.length; li++) {
        var lmaSelEl  = lmaRows[li].querySelector('select');
        var lmaNoteEl = lmaRows[li].querySelector('input[type="text"]');
        var lmaVal    = lmaSelEl ? lmaSelEl.value : '';
        var lmaIsPos  = lmaVal === 'Positif';
        var lmaIsNeg  = lmaVal === 'Négatif';
        if (lmaSelEl && (lmaIsPos || lmaIsNeg)) {
          var lmaTname   = lmaCfg.items[li] || '';
          var lmaNoteVal = lmaNoteEl ? lmaNoteEl.value : '';
          var lmaTag    = lmaVal;
          var lmaTagCls = lmaIsPos ? 'bad' : 'ok';
          lmaHtml += crItem(lmaTname, lmaNoteVal || '-', lmaTag, lmaTagCls, lmaSelEl ? [lmaSelEl.id] : []);
        }
      }
    }
    var lmaMarqEl = document.getElementById('lma-marqueur');
    if (lmaMarqEl && lmaMarqEl.value) lmaHtml += crItem('Marqueur', nl2br(lmaMarqEl.value), '', '', ['lma-marqueur']);
    var lmaConclEl = document.getElementById('lma-conclusion');
    if (lmaConclEl && lmaConclEl.value) lmaHtml += crItem('Conclusion', nl2br(lmaConclEl.value), '', '', ['lma-conclusion']);
    if (lmaHtml) {
      lmaHtml = '<div style="margin-bottom:6px"><div style="font-size:.78rem;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">'
              + lmaMembreLabel + ' — ' + lmaMusclLabel + '</div>' + lmaHtml + '</div>';
    }
  }
  var lmaCtHtml = typeof window._ctBuildSectionHtml === 'function' ? window._ctBuildSectionHtml('lma') : '';
  if (lmaHtml || lmaCtHtml) addSec('🔪 LMA — Lésion Myo-Aponévrotique', (lmaHtml||'') + lmaCtHtml);

  // 3. Tests fonctionnels MI
  // Overrides scope-aware : même logique que _updateSideLabels pour page-fonctionnels
  var _savedLabelCA = _labelCA, _savedLabelCS = _labelCS;
  var _savedLsiStr = lsiStr, _savedLsiCls2 = lsiCls2, _savedStatOf2 = statOf2;
  var _miScope = _getCoteForScope(_MI_ZONES);
  var _isBilatMI = (_miScope !== 'DROIT' && _miScope !== 'GAUCHE');
  _labelCA = _isBilatMI ? 'Droit' : (_miScope === 'DROIT' ? 'Droit' : 'Gauche');
  _labelCS = _isBilatMI ? 'Gauche' : (_miScope === 'DROIT' ? 'Gauche' : 'Droit');
  // Affichage Gauche en premier en bilatéral (convention UI) ; unilatéral inchangé (atteint en premier)
  var _p = function(caVal, csVal, unit) {
    var u = unit||'';
    var lA = _isBilatMI ? _labelCS : _labelCA; // Gauche (bilatéral) ou Atteint (unilatéral)
    var lB = _isBilatMI ? _labelCA : _labelCS; // Droit  (bilatéral) ou Sain   (unilatéral)
    var vA = _isBilatMI ? csVal : caVal;
    var vB = _isBilatMI ? caVal : csVal;
    return lA+'='+vA+u+'   '+lB+'='+vB+u;
  };
  lsiStr = function(ca,cs) {
    if (isNaN(ca)||isNaN(cs)) return '';
    var v = _isBilatMI ? (ca>0&&cs>0 ? Math.min(ca,cs)/Math.max(ca,cs)*100 : NaN) : (cs>0 ? ca/cs*100 : NaN);
    if (isNaN(v)) return '';
    return (_isBilatMI ? 'Sym. = ' : 'LSI = ') + v.toFixed(1) + '%';
  };
  lsiCls2 = function(ca,cs) {
    if (isNaN(ca)||isNaN(cs)) return '';
    var v = _isBilatMI ? (ca>0&&cs>0 ? Math.min(ca,cs)/Math.max(ca,cs)*100 : NaN) : (cs>0 ? ca/cs*100 : NaN);
    if (isNaN(v)) return '';
    return v >= 90 ? 'good' : v >= 80 ? 'warn' : 'bad';
  };
  statOf2 = function(cls) {
    if (_isBilatMI) return ({good:'Symétrique', warn:'Asymétrie modérée', bad:'Asymétrie significative'}[cls])||'';
    return ({good:'Symétrique', warn:'Asymétrie modérée', bad:'Déficit'}[cls])||'';
  };
  var tfHtml = '';
  var slsCA = parseFloat((document.getElementById('sls-ca')||{}).value||'');
  var slsCS = parseFloat((document.getElementById('sls-cs')||{}).value||'');
  var slsH2 = (document.getElementById('sls-hauteur')||{}).value||'';
  var hopCA    = parseFloat((document.getElementById('hop-ca')||{}).value||'');
  var hopCS    = parseFloat((document.getElementById('hop-cs')||{}).value||'');
  var hopTaille = parseFloat((document.getElementById('f-taille')||{}).value||'');
  var hopSexe   = ((document.getElementById('f-sexe')||{}).value||'');
  var hrCA  = parseFloat((document.getElementById('hr-ca')||{}).value||'');
  var hrCS  = parseFloat((document.getElementById('hr-cs')||{}).value||'');
  var luCA  = parseFloat((document.getElementById('lu-ca')||{}).value||'');
  var luCS  = parseFloat((document.getElementById('lu-cs')||{}).value||'');
  var djHca = parseFloat((document.getElementById('dj-h-ca')||{}).value||'');
  var djHcs = parseFloat((document.getElementById('dj-h-cs')||{}).value||'');
  if (!isNaN(slsCA)) {
    var slsVal2 = _p(slsCA,slsCS,' rep.')+'   '+lsiStr(slsCA,slsCS)+(slsH2?'   |   Repère EIAS-sol : '+slsH2+(slsH2.indexOf('cm')===-1?' cm':''):'');
    tfHtml += crItem('SLS', slsVal2, statOf2(lsiCls2(slsCA,slsCS)), lsiCls2(slsCA,slsCS), ['sls-ca','sls-cs']);
  }
  tfHtml += obsBlock('sls-obs-ca','sls-obs-cs');
  if (!isNaN(hopCA)) {
    var hopDesc = _p(hopCA,hopCS,'cm')+'   '+lsiStr(hopCA, hopCS);
    if (!isNaN(hopCS) && hopCS > 0) hopDesc += '   Repère 80% CS = ' + (hopCS * 0.8).toFixed(1) + 'cm';
    if (!isNaN(hopTaille) && hopTaille > 0) {
      if (hopSexe === 'F') { var hopSeuil = (hopTaille * 0.80).toFixed(1); hopDesc += '   |   Seuil RTS 80% taille (F) = ' + hopSeuil + 'cm → ' + (hopCA >= parseFloat(hopSeuil) ? '✓ Atteint' : '✗ Non atteint'); }
      else if (hopSexe === 'H') { var hopSeuil = (hopTaille * 0.90).toFixed(1); hopDesc += '   |   Seuil RTS 90% taille (H) = ' + hopSeuil + 'cm → ' + (hopCA >= parseFloat(hopSeuil) ? '✓ Atteint' : '✗ Non atteint'); }
      else { hopDesc += '   |   Seuil RTS : ≥' + (hopTaille * 0.80).toFixed(1) + 'cm (F) / ≥' + (hopTaille * 0.90).toFixed(1) + 'cm (H)'; }
    }
    tfHtml += crItem('Hop Test', hopDesc, statOf2(lsiCls2(hopCA, hopCS)), lsiCls2(hopCA, hopCS), ['hop-ca','hop-cs']);
  }
  tfHtml += obsBlock('hop-obs-ca','hop-obs-cs');
  var scoreCA2 = 0; var scoreCS2 = 0; var recN = CRITERIA_REC.length;
  for (var ci=0; ci<recN; ci++) {
    var cElCA = document.getElementById('rec-ca-'+ci); if (cElCA && cElCA.checked) scoreCA2++;
    var cElCS = document.getElementById('rec-cs-'+ci); if (cElCS && cElCS.checked) scoreCS2++;
  }
  var recCrToggle = document.getElementById('rec-cr-toggle');
  if ((recCrToggle && recCrToggle.checked) || scoreCA2 > 0 || scoreCS2 > 0) {
    var rclsCA = scoreCA2===recN?'good':scoreCA2>0?'warn':'bad';
    tfHtml += crItem('Réception — 80% Hop Test',
      _p(scoreCA2+'/'+recN, scoreCS2+'/'+recN),
      statOf2(rclsCA), rclsCA, ['rec-ca-0','rec-ca-1','rec-ca-2','rec-ca-3','rec-ca-4']);
  }
  tfHtml += obsBlock('rec-obs-ca','rec-obs-cs');
  if (!isNaN(hrCA)) tfHtml += crItem('Heel Rise', _p(hrCA,hrCS)+'   '+lsiStr(hrCA,hrCS), statOf2(lsiCls2(hrCA,hrCS)), lsiCls2(hrCA,hrCS), ['hr-ca','hr-cs']);
  tfHtml += obsBlock('hr-obs-ca','hr-obs-cs');
  if (!isNaN(luCA)) {
    var luDiff2 = Math.abs(luCA-luCS); var luBad2 = luCA<10 || luDiff2>1.5;
    tfHtml += crItem('Lunge WBLT', _p(luCA,luCS,'cm')+'   Diff='+luDiff2.toFixed(1)+'cm   '+lsiStr(luCA,luCS), luBad2?'Deficit':'OK', luBad2?'bad':'good', ['lu-ca','lu-cs']);
  }
  tfHtml += obsBlock('lu-obs-ca','lu-obs-cs');
  if (!isNaN(djHca)) tfHtml += crItem('Drop Jump H', _p(djHca,djHcs,'cm')+'   '+lsiStr(djHca,djHcs), statOf2(lsiCls2(djHca,djHcs)), lsiCls2(djHca,djHcs), ['dj-h-ca','dj-h-cs']);
  tfHtml += obsBlock('dj-obs-ca','dj-obs-cs');
  var shExpCA2 = parseFloat((document.getElementById('sh-exp-ca')||{}).value||'');
  var shExpCS2 = parseFloat((document.getElementById('sh-exp-cs')||{}).value||'');
  var shEndCA2 = parseFloat((document.getElementById('sh-end-ca')||{}).value||'');
  var shEndCS2 = parseFloat((document.getElementById('sh-end-cs')||{}).value||'');
  if (!isNaN(shExpCA2)) tfHtml += crItem('Side Hop — Explosivité (15s)', _p(shExpCA2,(isNaN(shExpCS2)?'-':shExpCS2),' sauts')+'   '+lsiStr(shExpCA2,shExpCS2), statOf2(lsiCls2(shExpCA2,shExpCS2)), lsiCls2(shExpCA2,shExpCS2), ['sh-exp-ca','sh-exp-cs']);
  if (!isNaN(shEndCA2)) tfHtml += crItem('Side Hop — Endurance (30s)', _p(shEndCA2,(isNaN(shEndCS2)?'-':shEndCS2),' sauts')+'   '+lsiStr(shEndCA2,shEndCS2), statOf2(lsiCls2(shEndCA2,shEndCS2)), lsiCls2(shEndCA2,shEndCS2), ['sh-end-ca','sh-end-cs']);
  tfHtml += obsBlock('sh-obs-ca','sh-obs-cs');
  var qfCA = parseFloat((document.getElementById('q-f-ca')||{}).value||'');
  var qfCS = parseFloat((document.getElementById('q-f-cs')||{}).value||'');
  var ijfCA = parseFloat((document.getElementById('ij-f-ca')||{}).value||'');
  var ijfCS = parseFloat((document.getElementById('ij-f-cs')||{}).value||'');
  if (!isNaN(qfCA) && !isNaN(qfCS)) { var qd = (1-qfCA/qfCS)*100; tfHtml += crItem('Quadriceps deficit', qd.toFixed(1) + '%', qd<=10?'Normal':'Deficit', qd<=10?'ok':'warn', ['q-f-ca','q-f-cs']); }
  if (!isNaN(ijfCA) && !isNaN(ijfCS)) { var ijd = (1-ijfCA/ijfCS)*100; tfHtml += crItem('IJ deficit', ijd.toFixed(1) + '%', ijd<=10?'Normal':'Deficit', ijd<=10?'ok':'warn', ['ij-f-ca','ij-f-cs']); }
  // Drop Jump — Temps contact
  var djTca = parseFloat((document.getElementById('dj-t-ca')||{}).value||'');
  var djTcs = parseFloat((document.getElementById('dj-t-cs')||{}).value||'');
  if (!isNaN(djTca)) tfHtml += crItem('Drop Jump — Temps contact', _p(djTca,djTcs,'ms')+'   '+lsiStr(djTca,djTcs), statOf2(lsiCls2(djTca,djTcs)), lsiCls2(djTca,djTcs), ['dj-t-ca','dj-t-cs']);
  // Drop Jump — RSI (calculé, affiché en textContent)
  var djRsiCAv = ((document.getElementById('dj-rsi-ca')||{}).textContent||'').trim();
  var djRsiCSv = ((document.getElementById('dj-rsi-cs')||{}).textContent||'').trim();
  var djRsiLsiv = ((document.getElementById('dj-rsi-lsi')||{}).textContent||'').trim();
  if (djRsiCAv && djRsiCAv !== '-' && parseFloat(djRsiCAv) > 0) {
    var rsiCls = lsiCls2(parseFloat(djRsiCAv), parseFloat(djRsiCSv));
    tfHtml += crItem('Drop Jump — RSI', _p(djRsiCAv,djRsiCSv)+'   LSI='+djRsiLsiv, statOf2(rsiCls), rsiCls, ['dj-t-ca','dj-t-cs']);
  }
  // Pliométrie verticale qualitative
  var plioqCA2 = 0; var plioqCS2 = 0; var plioqTouched = false;
  for (var pi2=0; pi2<2; pi2++) {
    var pcaEl = document.getElementById('plioq-ca-'+pi2);
    var pcsEl = document.getElementById('plioq-cs-'+pi2);
    if(pcaEl && pcaEl.checked){ plioqCA2++; plioqTouched = true; }
    if(pcsEl && pcsEl.checked){ plioqCS2++; plioqTouched = true; }
  }
  var plioqCrToggle = document.getElementById('plioq-cr-toggle');
  if ((plioqCrToggle && plioqCrToggle.checked) || plioqTouched) {
    tfHtml += crItem('Pliométrie verticale (qualitative)', _p(plioqCA2+'/2', plioqCS2+'/2'), plioqCA2===2?'Réussi':'À améliorer', plioqCA2===2?'good':'warn', ['plioq-ca-0','plioq-ca-1']);
  }
  tfHtml += obsBlock('plioq-obs-ca','plioq-obs-cs');
  // SEBT
  var sebtAntCA2 = parseFloat((document.getElementById('sebt-ant-ca')||{}).value||'');
  var sebtAntCS2 = parseFloat((document.getElementById('sebt-ant-cs')||{}).value||'');
  var sebtPmCA2  = parseFloat((document.getElementById('sebt-pm-ca')||{}).value||'');
  var sebtPmCS2  = parseFloat((document.getElementById('sebt-pm-cs')||{}).value||'');
  var sebtPlCA2  = parseFloat((document.getElementById('sebt-pl-ca')||{}).value||'');
  var sebtPlCS2  = parseFloat((document.getElementById('sebt-pl-cs')||{}).value||'');
  var sebtCompCA2 = ((document.getElementById('sebt-comp-ca')||{}).textContent||'').trim();
  var sebtCompCS2 = ((document.getElementById('sebt-comp-cs')||{}).textContent||'').trim();
  if (!isNaN(sebtAntCA2)) tfHtml += crItem('SEBT — Antérieur',       _p(sebtAntCA2,sebtAntCS2,'cm')+'   '+lsiStr(sebtAntCA2,sebtAntCS2), statOf2(lsiCls2(sebtAntCA2,sebtAntCS2)), lsiCls2(sebtAntCA2,sebtAntCS2), ['sebt-ant-ca','sebt-ant-cs']);
  if (!isNaN(sebtPmCA2))  tfHtml += crItem('SEBT — Postéro-médial',  _p(sebtPmCA2,sebtPmCS2,'cm')+'   '+lsiStr(sebtPmCA2,sebtPmCS2),   statOf2(lsiCls2(sebtPmCA2,sebtPmCS2)),   lsiCls2(sebtPmCA2,sebtPmCS2), ['sebt-pm-ca','sebt-pm-cs']);
  if (!isNaN(sebtPlCA2))  tfHtml += crItem('SEBT — Postéro-latéral', _p(sebtPlCA2,sebtPlCS2,'cm')+'   '+lsiStr(sebtPlCA2,sebtPlCS2),   statOf2(lsiCls2(sebtPlCA2,sebtPlCS2)),   lsiCls2(sebtPlCA2,sebtPlCS2), ['sebt-pl-ca','sebt-pl-cs']);
  if (sebtCompCA2 && sebtCompCA2.indexOf('CA :') === 0) {
    var _sebtA = _isBilatMI ? sebtCompCS2 : sebtCompCA2, _sebtB = _isBilatMI ? sebtCompCA2 : sebtCompCS2;
    var _lA = _isBilatMI ? _labelCS : _labelCA, _lB = _isBilatMI ? _labelCA : _labelCS;
    tfHtml += crItem('SEBT — Score composite', _sebtA.replace('CA : ','').replace('CS : ','')+'('+_lA+')   '+_sebtB.replace('CA : ','').replace('CS : ','')+'('+_lB+')', '', '', ['sebt-ant-ca','sebt-pm-ca','sebt-pl-ca']);
  }
  tfHtml += obsBlock('sebt-obs-ca','sebt-obs-cs');
  // Single-Leg Stance Test
  var slstCSTotal = 0, slstCATotal = 0, slstTouched = false;
  for (var si=1; si<=6; si++) {
    var scsEl = document.getElementById('slst-cs-'+si);
    var scaEl = document.getElementById('slst-ca-'+si);
    if (scsEl && scsEl.value !== '') { slstCSTotal += (parseInt(scsEl.value)||0); slstTouched = true; }
    if (scaEl && scaEl.value !== '') { slstCATotal += (parseInt(scaEl.value)||0); slstTouched = true; }
  }
  if (slstTouched) {
    var slstCls = slstCATotal <= 1 ? 'good' : slstCATotal <= 3 ? 'warn' : 'bad';
    var slstStat = slstCATotal <= 1 ? 'Bon équilibre' : slstCATotal <= 3 ? 'Équilibre altéré' : 'Déficit significatif';
    tfHtml += crItem('Single-Leg Stance Test', _p(slstCATotal+' err.', slstCSTotal+' err.', ''), slstStat, slstCls, ['slst-ca-1','slst-cs-1']);
  }
  tfHtml += obsBlock('slst-obs-ca','slst-obs-cs');
  // Figure-of-8 Hop Test (temps : lower is better → LSI = sain/atteint)
  var f8CA = parseFloat((document.getElementById('f8-ca')||{}).value||'');
  var f8CS = parseFloat((document.getElementById('f8-cs')||{}).value||'');
  if (!isNaN(f8CA)) {
    var f8Lsi = (!isNaN(f8CS) && f8CA > 0 && f8CS > 0)
      ? (_isBilatMI ? Math.min(f8CA,f8CS)/Math.max(f8CA,f8CS)*100 : f8CS/f8CA*100)
      : NaN;
    var f8Cls = isNaN(f8Lsi) ? '' : (f8Lsi >= 90 ? 'good' : f8Lsi >= 80 ? 'warn' : 'bad');
    var f8Lsi_s = isNaN(f8Lsi) ? '' : '   ' + (_isBilatMI ? 'Sym. = ' : 'LSI = ') + f8Lsi.toFixed(1) + '%';
    var f8Seuil = f8CA <= 12 ? '   Seuil <12s ✓' : '   >12s ✗';
    tfHtml += crItem('Figure-of-8 Hop Test', _p(f8CA+'s', (!isNaN(f8CS)?f8CS+'s':'-'), '') + f8Lsi_s + f8Seuil,
      f8Cls==='good' ? 'LSI ≥90%' : f8Cls==='warn' ? 'LSI 80-89%' : f8Cls==='bad' ? 'LSI <80%' : '',
      f8Cls, ['f8-ca','f8-cs']);
  }
  tfHtml += obsBlock('f8-obs-ca','f8-obs-cs');
  // UQYBT
  var uqDirs = [{id:'med',label:'Médial'},{id:'il',label:'Inféro-latéral'},{id:'sl',label:'Supéro-latéral'}];
  for (var ui=0; ui<uqDirs.length; ui++) {
    var uqD = parseFloat((document.getElementById('uqybt-'+uqDirs[ui].id+'-d')||{}).value||'');
    var uqG = parseFloat((document.getElementById('uqybt-'+uqDirs[ui].id+'-g')||{}).value||'');
    var uqDiffTxt = ((document.getElementById('uqybt-'+uqDirs[ui].id+'-diff')||{}).textContent||'').trim();
    if (!isNaN(uqD) && !isNaN(uqG)) {
      var uqBad = parseFloat(uqDiffTxt) > 5;
      tfHtml += crItem('UQYBT — '+uqDirs[ui].label, 'D='+uqD+'cm   G='+uqG+'cm   Diff='+uqDiffTxt, uqBad?'>5% Asymétrie':'OK', uqBad?'warn':'good', ['uqybt-'+uqDirs[ui].id+'-d','uqybt-'+uqDirs[ui].id+'-g']);
    }
  }
  if(typeof window._ctBuildSectionHtml === 'function') tfHtml += window._ctBuildSectionHtml('fonctionnels');
  addSec('3. Tests Fonctionnels & Musculaires - Membres Inferieurs', tfHtml);
  // Restaurer les variables globales pour les sections MS et suivantes
  _labelCA = _savedLabelCA; _labelCS = _savedLabelCS;
  lsiStr = _savedLsiStr; lsiCls2 = _savedLsiCls2; statOf2 = _savedStatOf2;

  // 4. Tests MS
  var tfMsHtml = '';
  var psetCAv = parseFloat((document.getElementById('pset-ca')||{}).value||'');
  var psetCSv = parseFloat((document.getElementById('pset-cs')||{}).value||'');
  var psetPoidsReelV = (document.getElementById('pset-poids-reel')||{}).value||'';
  var setCAv  = parseFloat((document.getElementById('set-ca')||{}).value||'');
  var setCSv  = parseFloat((document.getElementById('set-cs')||{}).value||'');
  var shrtEl2 = document.getElementById('shrt-lsi');
  var ulrtEl2 = document.getElementById('ulrt-lsi');
  if (!isNaN(psetCAv)) {
    var pl = psetCSv>0?(psetCAv/psetCSv*100):NaN;
    var psetVal = _labelCA+'='+psetCAv+'   '+_labelCS+'='+(isNaN(psetCSv)?'-':psetCSv)+(!isNaN(pl)?'   LSI='+pl.toFixed(1)+'%':'');
    if (psetPoidsReelV) psetVal += '   — Poids utilisé : ' + psetPoidsReelV + ' kg';
    tfMsHtml += crItem('PSET', psetVal, statOf2(lsiCls2(psetCAv,psetCSv)), lsiCls2(psetCAv,psetCSv), ['pset-ca','pset-cs']);
  }
  tfMsHtml += obsBlock('pset-obs-ca','pset-obs-cs');
  if (!isNaN(setCAv))  { var sl = setCSv>0?(setCAv/setCSv*100):NaN; tfMsHtml += crItem('Shoulder Endurance', _labelCA+'='+setCAv+'   '+_labelCS+'='+setCSv+(!isNaN(sl)?'   LSI='+sl.toFixed(1)+'%':''), statOf2(lsiCls2(setCAv,setCSv)), lsiCls2(setCAv,setCSv), ['set-ca','set-cs']); }
  tfMsHtml += obsBlock('set-obs-ca','set-obs-cs');
  (function(){
    var s2 = parseFloat((document.getElementById('ckc-s2')||{}).value||'');
    var s3 = parseFloat((document.getElementById('ckc-s3')||{}).value||'');
    var s4 = parseFloat((document.getElementById('ckc-s4')||{}).value||'');
    if (isNaN(s2) && isNaN(s3) && isNaN(s4)) return;
    var score = (!isNaN(s2)&&!isNaN(s3))?(s2+s3)/2:(!isNaN(s2)?s2:(!isNaN(s3)?s3:NaN));
    var mei   = (!isNaN(s4)&&!isNaN(score)&&score>0)?(s4/2)/score:NaN;
    var sCls  = !isNaN(score)?(score>21?'good':score>=19?'warn':'bad'):'';
    var mCls  = !isNaN(mei)?(mei>=0.90?'good':mei>=0.70?'warn':'bad'):'';
    var tagFn = function(c){ return c==='good'?'OK':c==='warn'?'Acceptable':'Insuffisant'; };
    var ovCls = (sCls==='bad'||mCls==='bad')?'bad':(sCls==='warn'||mCls==='warn')?'warn':(sCls||mCls);
    var desc  = '';
    if (!isNaN(score)) desc += 'Score=' + score.toFixed(1) + ' touches' + (sCls?' ('+tagFn(sCls)+')':'');
    if (!isNaN(mei))   desc += (desc?'   ':'') + 'MEI=' + mei.toFixed(2) + (mCls?' ('+tagFn(mCls)+')':'');
    tfMsHtml += crItem('mCKCUEST', desc, ovCls?tagFn(ovCls):'', ovCls||'ok', ['ckc-s2','ckc-s3','ckc-s4']);
    var ckcObs = (document.getElementById('ckc-obs')||{}).value||'';
    if (ckcObs) tfMsHtml += '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. : ' + nl2br(ckcObs) + '</div>';
  })();
  var lsiClsFn2 = function(v){ return v>=90?'good':v>=80?'warn':'bad'; };
  var lsiTagFn2 = function(v){ return v>=90?'LSI ≥ 90 % — OK':v>=80?'LSI 80–90 % — Acceptable':'LSI < 80 % — Insuffisant'; };
  if (shrtEl2 && shrtEl2.textContent && shrtEl2.textContent !== '-' && shrtEl2.textContent !== '—' && shrtEl2.textContent !== '--') {
    var shrtV2 = parseFloat(shrtEl2.textContent);
    tfMsHtml += crItem('Side Hold Rotation', shrtEl2.textContent, !isNaN(shrtV2)?lsiTagFn2(shrtV2):'', !isNaN(shrtV2)?lsiClsFn2(shrtV2):'ok', ['shrt-g','shrt-d']);
  }
  tfMsHtml += obsBlock('shrt-obs-ca','shrt-obs-cs');
  if (ulrtEl2 && ulrtEl2.textContent && ulrtEl2.textContent !== '-' && ulrtEl2.textContent !== '—' && ulrtEl2.textContent !== '--') {
    var ulrtV2 = parseFloat(ulrtEl2.textContent);
    tfMsHtml += crItem('ULRT', ulrtEl2.textContent, !isNaN(ulrtV2)?lsiTagFn2(ulrtV2):'', !isNaN(ulrtV2)?lsiClsFn2(ulrtV2):'ok', ['ulrt-d1','ulrt-g1']);
  }
  tfMsHtml += obsBlock('ulrt-obs-ca','ulrt-obs-cs');
  if(typeof window._ctBuildSectionHtml === 'function') tfMsHtml += window._ctBuildSectionHtml('fonctionnelsMS');
  addSec('4. Tests Fonctionnels - Membres Superieurs', tfMsHtml);

  // 5. Tests Fonctionnels Rachis
  var tfRachisHtml = '';
  var obsSingle = function(id) {
    var v = (document.getElementById(id)||{}).value||'';
    return v ? '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. : ' + nl2br(v) + '</div>' : '';
  };
  var flxV2  = parseFloat((document.getElementById('rf-flx-cerv')||{}).value||'');
  var extV2  = parseFloat((document.getElementById('rf-ext-cerv')||{}).value||'');
  var latD2  = parseFloat((document.getElementById('rf-lat-d')||{}).value||'');
  var latG2  = parseFloat((document.getElementById('rf-lat-g')||{}).value||'');
  var sorV2  = parseFloat((document.getElementById('rf-sorensen')||{}).value||'');
  var pdslV2 = parseFloat((document.getElementById('rf-pdslrt')||{}).value||'');
  var rfNotes = (document.getElementById('rf-notes')||{}).value||'';
  if (!isNaN(flxV2)) { tfRachisHtml += crItem('Endurance Fléchisseurs Cervicaux', flxV2+'s', flxV2>=39?'Normal':flxV2>=24?'Limite':'Deficit', flxV2>=39?'ok':flxV2>=24?'warn':'bad', ['rf-flx-cerv']); tfRachisHtml += obsSingle('rf-flx-obs'); }
  if (!isNaN(extV2)) { tfRachisHtml += crItem('Endurance Extenseurs Cervicaux', extV2+'s', extV2>=20?'OK':'Insuffisant', extV2>=20?'ok':'bad', ['rf-ext-cerv']); tfRachisHtml += obsSingle('rf-ext-obs'); }
  if (!isNaN(latD2) && !isNaN(latG2)) { var latRatio2 = Math.min(latD2,latG2)/Math.max(latD2,latG2)*100; tfRachisHtml += crItem('Endurance Latérale Cervicale', 'D='+latD2+'s   G='+latG2+'s   Ratio='+latRatio2.toFixed(1)+'%', latRatio2>=70?'Symétrie OK':'Asymétrie', latRatio2>=70?'ok':'warn', ['rf-lat-d','rf-lat-g']); tfRachisHtml += obsSingle('rf-lat-obs'); }
  if (!isNaN(sorV2)) { tfRachisHtml += crItem('Test de Sørensen', sorV2+'s', sorV2>=198?'Facteur protecteur':sorV2>=176?'Zone intermédiaire':'Facteur de risque', sorV2>=198?'ok':sorV2>=176?'warn':'bad', ['rf-sorensen']); tfRachisHtml += obsSingle('rf-sor-obs'); }
  if (!isNaN(pdslV2)) { tfRachisHtml += crItem('PDSLRT', pdslV2+'s', pdslV2>=30?'OK':'Deficit', pdslV2>=30?'ok':'bad', ['rf-pdslrt']); tfRachisHtml += obsSingle('rf-pdslrt-obs'); }
  if (rfNotes) tfRachisHtml += crItem('Notes', rfNotes, '', '', ['rf-notes']);
  if(typeof window._ctBuildSectionHtml === 'function') tfRachisHtml += window._ctBuildSectionHtml('fonctionnelsRachis');
  addSec('5. Tests Fonctionnels - Rachis', tfRachisHtml);

  // 6. Points à travailler
  var toWork = [];

  // ── Force musculaire rachis ──────────────────────────────────────────────
  (function(){
    var raForceMap = [
      {key:'ra-fc-inc', label:'Inclinaison cervicale'},
    ];
    raForceMap.forEach(function(m) {
      var csN = parseFloat((document.getElementById(m.key+'-cs')||{}).value);
      var caN = parseFloat((document.getElementById(m.key+'-ca')||{}).value);
      var caA = (document.getElementById(m.key+'-apr-ca')||{}).value||'';
      var lsiLow = !isNaN(csN) && csN > 0 && !isNaN(caN) && caN/csN*100 < 90;
      if (lsiLow || caA === 'Positif') {
        var item = 'Renforcer ' + m.label;
        if (toWork.indexOf(item) === -1) toWork.push(item);
      }
    });
  })();

  // ── Test du transverse ──────────────────────────────────────────────────
  (function(){
    var tbody = document.getElementById('tb-ra-transverse'); if (!tbody) return;
    var row = tbody.querySelector('tr'); if (!row) return;
    var sel = row.querySelector('select');
    if (sel && sel.value === 'Positif') toWork.push("Travailler l'activation du transverse");
  })();

  // ── Mobilité rachis insuffisante ────────────────────────────────────────
  (function(){
    var segLbl = { cerv:'cervicale', cv:'cervicale (bilan cerv.)', thor:'thoracique', lomb:'lombaire', rl:'lombaire (bilan lomb.)' };
    var dirLbl = {
      'Flexion':   'la flexion',
      'Extension': "l'extension",
      'Incl. D':   "l'inclinaison droite",
      'Incl. G':   "l'inclinaison gauche",
      'Rot. D':    'la rotation droite',
      'Rot. G':    'la rotation gauche',
    };
    ['cerv','cv','thor','lomb','rl'].forEach(function(seg) {
      MOB.forEach(function(m) {
        var mKey = 'mob-' + seg + '-' + m.replace(/[\s.\/]+/g, '_') + '-st';
        var stEl = document.getElementById(mKey);
        if (!stEl || stEl.value !== 'insuffisant') return;
        var item = 'Travailler ' + (dirLbl[m] || m.toLowerCase()) + ' ' + segLbl[seg];
        if (toWork.indexOf(item) === -1) toWork.push(item);
      });
    });
  })();

  // ── Tests fonctionnels épaule (tb-ep-fonc) ──────────────────────────────
  var epFoncTbody = document.getElementById('tb-ep-fonc');
  if (epFoncTbody) {
    epFoncTbody.querySelectorAll('tr').forEach(function(row) {
      var sel = row.querySelector('select'); if (!sel || sel.value !== 'Positif') return;
      var tdEl = row.querySelector('td'); if (!tdEl) return;
      var name = tdEl.textContent.trim();
      var item = null;
      if (name.indexOf('Activation coiffe') !== -1) {
        item = 'Renforcement de la coiffe des rotateurs';
      } else if (name === 'Inhibition coiffe') {
        item = 'Travail en compression + renforcement musculaire des grands muscles de l\'épaule';
      } else if (name === 'Postériorisation GH') {
        item = 'Renforcer les muscles postérieurs de l\'épaule';
      } else if (name.indexOf('Extension thoracique') !== -1) {
        item = 'Travailler l\'extension thoracique';
      } else if (name.indexOf('SAT') !== -1) {
        item = 'Renforcer les muscles de la sonnette latérale : trapèze supérieur, élévateur de la scapula, dentelé antérieur';
      } else if (name.indexOf('SRT') !== -1) {
        item = 'Renforcer les stabilisateurs de l\'omoplate : rhomboïdes, trapèze moyen et inférieur, dentelé antérieur';
      }
      if (item && toWork.indexOf(item) === -1) toWork.push(item);
    });
  }

  // ── Force épaule (break tests + dentelé) ────────────────────────────────
  (function(){
    var epForceMap = [
      {key:'ep-trap', label:'Renforcer le trapèze inférieur'},
      {key:'ep-dent', label:'Renforcer le dentelé antérieur'},
      {key:'ep-rl1',  label:'Renforcer les rotateurs externes RE1'},
      {key:'ep-rl2',  label:'Renforcer les rotateurs externes RE2'},
      {key:'ep-ri1',  label:'Renforcer les rotateurs internes RI1'},
      {key:'ep-ri2',  label:'Renforcer les rotateurs internes RI2'},
      {key:'ep-abd',  label:'Renforcer les élévateurs de l\'épaule'},
      {key:'ep-bht',   label:'Renforcer le sub-scapulaire'},
      {key:'co-f-ext', label:'Renforcer les extenseurs du coude'},
      {key:'co-f-flex',label:'Renforcer les fléchisseurs du coude'},
    ];
    epForceMap.forEach(function(ft) {
      var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
      var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
      var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
      var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
      if (!isNaN(csN) && csN > 0) {
        // Mode Newton / LSI
        if (ft.key === 'ep-dent') {
          // CS side — une seule entrée consolidée
          if (csN < 20) {
            var dentCS = ft.label + ' — ' + _labelCS + ' (' + csN + ' rép < 20)';
            if (toWork.indexOf(dentCS) < 0) toWork.push(dentCS);
          }
          // CA side — fusionner reps ET LSI en une seule entrée
          if (!isNaN(caN)) {
            var lsiDent = csN > 0 ? caN / csN * 100 : NaN;
            var caReasons = [];
            if (caN < 20) caReasons.push(caN + ' rép < 20');
            if (!isNaN(lsiDent) && lsiDent < 90) caReasons.push('LSI ' + lsiDent.toFixed(0) + '%');
            if (caReasons.length > 0) {
              var dentCA = ft.label + ' — ' + _labelCA + ' (' + caReasons.join(', ') + ')';
              if (toWork.indexOf(dentCA) < 0) toWork.push(dentCA);
            }
          }
        } else {
          if (!isNaN(caN) && csN > 0 && caN/csN*100 < 90) { var i4 = ft.label + ' — ' + _labelCA + ' (LSI ' + (caN/csN*100).toFixed(0) + '%)'; if (toWork.indexOf(i4)<0) toWork.push(i4); }
        }
      } else {
        // Mode appréciation
        if (csA === 'Positif') { var i5 = ft.label + ' — ' + _labelCS; if (toWork.indexOf(i5)<0) toWork.push(i5); }
        if (caA === 'Positif') { var i6 = ft.label + ' — ' + _labelCA; if (toWork.indexOf(i6)<0) toWork.push(i6); }
      }
    });
    // GIRD
    var girdCS2 = parseFloat((document.getElementById('gird-cs')||{}).value);
    var girdCA2 = parseFloat((document.getElementById('gird-ca')||{}).value);
    if (!isNaN(girdCS2) && !isNaN(girdCA2) && girdCS2 - girdCA2 > 15) {
      toWork.push('Travailler le gain en rotation interne gléno-humérale — ' + _labelCA + ' (GIRD ' + (girdCS2-girdCA2).toFixed(0) + '°)');
    }
    // ULNT positifs (tb-ep-irrit)
    var irritTbody = document.getElementById('tb-ep-irrit');
  })();

  // ── Force musculaire hanche ──────────────────────────────────────────────
  (function(){
    var haForceMap = [
      {key:'ha-f-add',   label:'Renforcer les adducteurs'},
      {key:'ha-f-flech', label:'Renforcer les fléchisseurs de hanche'},
      {key:'ha-f-abd',   label:'Renforcer les abducteurs de hanche'},
      {key:'ha-f-ri',    label:'Renforcer les rotateurs internes de hanche'},
      {key:'ha-f-re',    label:'Renforcer les rotateurs externes de hanche'},
    ];
    haForceMap.forEach(function(ft) {
      var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
      var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
      var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
      var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
      if (!isNaN(csN) && csN > 0) {
        if (!isNaN(caN) && csN > 0 && caN/csN*100 < 90) { var iH = ft.label+' — '+_labelCA+' (LSI '+(caN/csN*100).toFixed(0)+'%)'; if (toWork.indexOf(iH)<0) toWork.push(iH); }
      } else {
        if (csA==='Positif') { var iHa = ft.label+' — '+_labelCS; if (toWork.indexOf(iHa)<0) toWork.push(iHa); }
        if (caA==='Positif') { var iHb = ft.label+' — '+_labelCA; if (toWork.indexOf(iHb)<0) toWork.push(iHb); }
      }
    });
  })();

  // ── Force musculaire pied/cheville ──────────────────────────────────────
  (function(){
    var piForceMap = [
      {key:'pi-f-fp',  label:'Renforcer les fléchisseurs plantaires'},
      {key:'pi-f-fd',  label:'Renforcer les fléchisseurs dorsaux'},
      {key:'pi-f-inv', label:'Renforcer les inverseurs'},
      {key:'pi-f-ev',  label:'Renforcer les éverseurs'},
      {key:'pi-f-lfh', label:'Renforcer le long fléchisseur de l\'hallux'},
    ];
    piForceMap.forEach(function(ft) {
      var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
      var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
      var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
      var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
      if (!isNaN(csN) && csN > 0) {
        if (!isNaN(caN) && csN > 0 && caN/csN*100 < 90) { var iP = ft.label+' — '+_labelCA+' (LSI '+(caN/csN*100).toFixed(0)+'%)'; if (toWork.indexOf(iP)<0) toWork.push(iP); }
      } else {
        if (csA==='Positif') { var iPa = ft.label+' — '+_labelCS; if (toWork.indexOf(iPa)<0) toWork.push(iPa); }
        if (caA==='Positif') { var iPb = ft.label+' — '+_labelCA; if (toWork.indexOf(iPb)<0) toWork.push(iPb); }
      }
    });
  })();

  // ── Force musculaire genou ───────────────────────────────────────────────
  (function(){
    var geForceMap = [
      {key:'ge-f-quad', label:'Renforcer les quadriceps'},
      {key:'ge-f-ij',   label:'Renforcer les ischio-jambiers'},
    ];
    geForceMap.forEach(function(ft) {
      var csN = parseFloat((document.getElementById(ft.key+'-cs')||{}).value);
      var caN = parseFloat((document.getElementById(ft.key+'-ca')||{}).value);
      var csA = (document.getElementById(ft.key+'-apr-cs')||{}).value||'';
      var caA = (document.getElementById(ft.key+'-apr-ca')||{}).value||'';
      if (!isNaN(csN) && csN > 0) {
        if (!isNaN(caN) && csN > 0 && caN/csN*100 < 90) { var iG = ft.label+' — '+_labelCA+' (LSI '+(caN/csN*100).toFixed(0)+'%)'; if (toWork.indexOf(iG)<0) toWork.push(iG); }
      } else {
        if (csA==='Positif') { var iGa = ft.label+' — '+_labelCS; if (toWork.indexOf(iGa)<0) toWork.push(iGa); }
        if (caA==='Positif') { var iGb = ft.label+' — '+_labelCA; if (toWork.indexOf(iGb)<0) toWork.push(iGb); }
      }
    });
  })();

  // ── ULNT épaule ─────────────────────────────────────────────────────────
  (function(){
    var irritTbody = document.getElementById('tb-ep-irrit');
    if (irritTbody) {
      var ulntPos = [];
      irritTbody.querySelectorAll('tr').forEach(function(row) {
        var sel = row.querySelector('select'); if (!sel || sel.value !== 'Positif') return;
        var td = row.querySelector('td'); if (!td) return;
        var name = td.textContent.trim();
        if (name.indexOf('ULNT') !== -1) ulntPos.push(name.replace(/\s+/g,' '));
      });
      if (ulntPos.length) toWork.push('Mobilisation neurale — ' + ulntPos.join(', ') + ' positif(s)');
    }
  })();

  // ── PSET ─────────────────────────────────────────────────────────────────
  if (!isNaN(psetCAv) && psetCSv > 0) {
    var psetLsiTW = psetCAv / psetCSv * 100;
    if (psetLsiTW < 90) toWork.push('Renforcer la coiffe des rotateurs postérieure gléno-humérale (PSET LSI ' + psetLsiTW.toFixed(1) + '%)');
  }

  // ── mCKCUEST ─────────────────────────────────────────────────────────────
  (function(){
    var s2 = parseFloat((document.getElementById('ckc-s2')||{}).value||'');
    var s3 = parseFloat((document.getElementById('ckc-s3')||{}).value||'');
    var s4 = parseFloat((document.getElementById('ckc-s4')||{}).value||'');
    if (isNaN(s2) && isNaN(s3) && isNaN(s4)) return;
    var ckcScore = (!isNaN(s2)&&!isNaN(s3))?(s2+s3)/2:(!isNaN(s2)?s2:(!isNaN(s3)?s3:NaN));
    var ckcMei   = (!isNaN(s4)&&!isNaN(ckcScore)&&ckcScore>0)?(s4/2)/ckcScore:NaN;
    if (!isNaN(ckcScore) && ckcScore < 19) toWork.push('Renforcement de la stabilité de l\'épaule — explosivité (mCKCUEST score ' + ckcScore.toFixed(1) + ' < 19)');
    if (!isNaN(ckcMei)   && ckcMei   < 0.70) toWork.push('Renforcement de la stabilité de l\'épaule — endurance (mCKCUEST MEI ' + ckcMei.toFixed(2) + ' < 0.70)');
  })();

  // ── Tests nerveux cervicaux D/G (Rotations + ULNT) ───────────────────────
  (function(){
    var rotPos = [], ulntPos = [];
    [{id:'tb-ra-cerv-neuro-g', side:'Gauche'},{id:'tb-ra-cerv-neuro-d', side:'Droit'}].forEach(function(t){
      var tbody = document.getElementById(t.id); if (!tbody) return;
      tbody.querySelectorAll('tr').forEach(function(row) {
        var sel = row.querySelector('select'); if (!sel || sel.value !== 'Positif') return;
        var td = row.querySelector('td'); if (!td) return;
        var name = td.textContent.trim().replace(/\s+/g,' ');
        if (name.indexOf('Rotation') !== -1) rotPos.push(name + ' — ' + t.side);
        else if (name.indexOf('ULNT') !== -1) ulntPos.push(name + ' — ' + t.side);
      });
    });
    if (rotPos.length) toWork.push('Restriction rotation cervicale — ' + rotPos.join(', ') + ' (< 60°)');
    if (ulntPos.length) toWork.push('Mobilisation neurale cervicale — ' + ulntPos.join(', ') + ' positif(s)');
  })();
  // ── Tests nerveux lombaires D/G (Slump / Lasègue / Léri) ─────────────────
  (function(){
    var lombPos = [];
    [{id:'tb-ra-lomb-g', side:'Gauche'},{id:'tb-ra-lomb-d', side:'Droit'}].forEach(function(t){
      var tbody = document.getElementById(t.id); if (!tbody) return;
      tbody.querySelectorAll('tr').forEach(function(row) {
        var sel = row.querySelector('select'); if (!sel || sel.value !== 'Positif') return;
        var td = row.querySelector('td'); if (!td) return;
        lombPos.push(td.textContent.trim().replace(/\s+/g,' ') + ' — ' + t.side);
      });
    });
    if (lombPos.length) toWork.push('Mobilisation neurale lombaire — ' + lombPos.join(', ') + ' positif(s)');
  })();
  // ── Glissements lombaires ─────────────────────────────────────────────────
  (function(){
    var glissInsuff = [];
    [['Glissement D','droit'],['Glissement G','gauche']].forEach(function(g){
      var stEl = document.getElementById('mob-lomb-' + g[0].replace(/\s/g,'_') + '-st');
      if (stEl && stEl.value === 'insuffisant') glissInsuff.push('glissement ' + g[1]);
    });
    if (glissInsuff.length) toWork.push('Correction du shift lombaire — ' + glissInsuff.join(', ') + ' insuffisant(s)');
  })();

  // ── Tests fonctionnels rachis ─────────────────────────────────────────────
  if (!isNaN(flxV2) && flxV2 < 39) toWork.push('Renforcement des fléchisseurs cervicaux' + (flxV2 < 24 ? ' (déficit important)' : ' (insuffisant)'));
  if (!isNaN(extV2) && extV2 < 20) toWork.push('Renforcement des extenseurs cervicaux');
  if (!isNaN(latD2) && !isNaN(latG2) && latD2 > 0 && latG2 > 0) {
    var latRatioTW = Math.min(latD2, latG2) / Math.max(latD2, latG2) * 100;
    if (latRatioTW < 70) {
      var latWeakerTW = latD2 < latG2 ? 'droit' : 'gauche';
      toWork.push('Renforcement des latéraux cervicaux côté ' + latWeakerTW + ' (asymétrie ' + (100-latRatioTW).toFixed(1) + '%)');
    }
  }
  if (!isNaN(sorV2) && sorV2 < 176) toWork.push('Renforcement des extenseurs lombaires (Test de Sørensen ' + sorV2 + 's — insuffisant)');
  if (!isNaN(pdslV2) && pdslV2 < 30) toWork.push('Renforcement des stabilisateurs lombaires (PDSLRT ' + pdslV2 + 's < 30s)');

  // ── Tests fonctionnels MI ─────────────────────────────────────────────────
  var slsLsi2 = slsCS>0?slsCA/slsCS*100:NaN;
  var hopLsi2 = hopCS>0?hopCA/hopCS*100:NaN;
  var hrLsi2  = hrCS>0?hrCA/hrCS*100:NaN;
  if (!isNaN(slsLsi2) && slsLsi2<90) toWork.push('Renforcement MI — squat unilatéral (LSI SLS ' + slsLsi2.toFixed(1) + '%)');
  if (!isNaN(hopLsi2) && hopLsi2<90) toWork.push('Travail de propulsion — saut unipodal (LSI Hop ' + hopLsi2.toFixed(1) + '%)');
  // Test de réception — par critère non validé côté atteint
  (function(){
    // Le test est considéré comme rempli si le toggle CR est coché OU si au moins un critère CA ou CS est coché
    var recCrTog2 = document.getElementById('rec-cr-toggle');
    var recDone = (recCrTog2 && recCrTog2.checked) || scoreCA2 > 0 || scoreCS2 > 0;
    if (!recDone) return;
    var rec0CA = document.getElementById('rec-ca-0'); // Talon > repère 80%
    var rec1CA = document.getElementById('rec-ca-1'); // Descente fluide
    var rec2CA = document.getElementById('rec-ca-2'); // Maintien statique
    var rec3CA = document.getElementById('rec-ca-3'); // Contrôle neuromusculaire
    var rec4CA = document.getElementById('rec-ca-4'); // Contrôle du tronc (TSB)
    if (rec0CA && !rec0CA.checked) toWork.push('Travailler la propulsion — le talon n\'a pas dépassé le repère de 80% (test réception)');
    if (rec1CA && !rec1CA.checked) toWork.push('Renforcer le quadriceps en excentrique — descente fluide non obtenue (test réception)');
    if (rec2CA && !rec2CA.checked) toWork.push('Travailler la stabilité statique du genou — maintien 3s à 90° non obtenu (test réception)');
    if (rec3CA && !rec3CA.checked) toWork.push('Travailler le contrôle neuromusculaire du genou — valgus dynamique non contrôlé (test réception)');
    if (rec4CA && !rec4CA.checked) toWork.push('Travailler le contrôle du tronc');
  })();
  if (!isNaN(luCA) && (luCA<10 || Math.abs(luCA-(luCS||0))>1.5)) toWork.push('Déficit de flexion dorsale de cheville (Lunge ' + luCA + 'cm — < 10 cm ou asymétrie > 1,5 cm)');
  if (!isNaN(hrLsi2) && hrLsi2<90) toWork.push('Renforcement du mollet — Heel Rise progressif (LSI ' + hrLsi2.toFixed(1) + '%)');
  if (!isNaN(qfCA) && !isNaN(qfCS) && qfCS>0 && (1-qfCA/qfCS)*100>10) toWork.push('Renforcement quadriceps (déficit ' + ((1-qfCA/qfCS)*100).toFixed(1) + '%)');
  // Flash Isométrique 20s (cf-q-ca / cf-q-cs) — distinct de l'isokinétique
  (function(){
    var cfqCA = parseFloat((document.getElementById('cf-q-ca')||{}).value||'');
    var cfqCS = parseFloat((document.getElementById('cf-q-cs')||{}).value||'');
    if (!isNaN(cfqCA) && !isNaN(cfqCS) && cfqCS>0) {
      var cfqLsi = cfqCA/cfqCS*100;
      if (cfqLsi < 90) toWork.push('Renforcement quadriceps isométrique (Flash 20s — LSI ' + cfqLsi.toFixed(1) + '%)');
    }
  })();
  if (!isNaN(ijfCA) && !isNaN(ijfCS) && ijfCS>0 && (1-ijfCA/ijfCS)*100>10) toWork.push('Renforcement ischio-jambiers — Nordic Hamstring, excentrique (déficit ' + ((1-ijfCA/ijfCS)*100).toFixed(1) + '%)');
  // Drop Jump H
  var djLsiTW = (!isNaN(djHca)&&djHcs>0)?djHca/djHcs*100:NaN;
  if (!isNaN(djLsiTW) && djLsiTW<90) toWork.push('Travail pliométrique — explosivité verticale (DJ LSI ' + djLsiTW.toFixed(1) + '%)');
  // Side Hop
  var shExpLsiTW = (!isNaN(shExpCA2)&&!isNaN(shExpCS2)&&shExpCS2>0)?shExpCA2/shExpCS2*100:NaN;
  var shEndLsiTW = (!isNaN(shEndCA2)&&!isNaN(shEndCS2)&&shEndCS2>0)?shEndCA2/shEndCS2*100:NaN;
  if (!isNaN(shExpLsiTW) && shExpLsiTW<90) toWork.push('Travail latéral explosif — Side Hop 15s (LSI ' + shExpLsiTW.toFixed(1) + '%)');
  if (!isNaN(shEndLsiTW) && shEndLsiTW<90) toWork.push('Travail latéral endurance — Side Hop 30s (LSI ' + shEndLsiTW.toFixed(1) + '%)');
  // SEBT
  var sebtDeficit = false;
  if (!isNaN(sebtAntCA2)&&!isNaN(sebtAntCS2)&&sebtAntCS2>0&&sebtAntCA2/sebtAntCS2*100<90){ sebtDeficit=true; toWork.push('Améliorer contrôle postural dynamique — SEBT antérieur (LSI ' + (sebtAntCA2/sebtAntCS2*100).toFixed(1) + '%)'); }
  if (!isNaN(sebtPmCA2) &&!isNaN(sebtPmCS2) &&sebtPmCS2>0 &&sebtPmCA2/sebtPmCS2*100<90) { sebtDeficit=true; toWork.push('Améliorer contrôle postural dynamique — SEBT postéro-médial (LSI ' + (sebtPmCA2/sebtPmCS2*100).toFixed(1) + '%)'); }
  if (!isNaN(sebtPlCA2) &&!isNaN(sebtPlCS2) &&sebtPlCS2>0 &&sebtPlCA2/sebtPlCS2*100<90) { sebtDeficit=true; toWork.push('Améliorer contrôle postural dynamique — SEBT postéro-latéral (LSI ' + (sebtPlCA2/sebtPlCS2*100).toFixed(1) + '%)'); }
  // UQYBT
  for (var twi=0; twi<uqDirs.length; twi++) {
    var twDiffTxt = ((document.getElementById('uqybt-'+uqDirs[twi].id+'-diff')||{}).textContent||'').trim();
    var twDiff = parseFloat(twDiffTxt);
    if (!isNaN(twDiff) && twDiff > 5) {
      var twItem = 'Asymétrie contrôle postural MS — UQYBT ' + uqDirs[twi].label + ' (diff ' + twDiffTxt + '%)';
      if (toWork.indexOf(twItem) === -1) toWork.push(twItem);
    }
  }
  // Pliométrie qualitative
  if (plioqTouched && plioqCA2 < 2) toWork.push('Améliorer qualité pliométrique et coordination (score CA ' + plioqCA2 + '/2)');
  if (toWork.length > 0) {
    var workHtml = '';
    for (var wi=0; wi<toWork.length; wi++) {
      workHtml += '<div class="cr-item"><span style="margin-right:6px;color:var(--orange)">-></span><span>' + toWork[wi] + '</span></div>';
    }
    addSec('6. Points a Travailler', workHtml);
  }

  return sections;
}
// -------------------------------------------------------------

// -- COMPTE-RENDU ---------------------------------------------

/* Header patient partagé entre CR Complet et CR Tests */
function _buildCRPatientHeaderHtml() {
  var nom    = (document.getElementById('f-nom')   ||{}).value || '';
  var prenom = (document.getElementById('f-prenom')||{}).value || '';
  var dob    = (document.getElementById('f-dob')   ||{}).value || '';
  var date   = (document.getElementById('f-date')  ||{}).value || '';
  var sexe   = (document.getElementById('f-sexe')  ||{}).value || '';
  var cote   = (document.getElementById('f-cote')  ||{}).value || '';
  var fullName = [prenom, nom].filter(Boolean).join(' ');
  if (!fullName) return '';
  var initials = [prenom, nom].filter(Boolean).map(function(s){ return s.charAt(0).toUpperCase(); }).join('').slice(0, 2);
  var age = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) : null;
  var metaParts = [age ? age + ' ans' : null, sexe||null, date ? formatDate(date) : null].filter(Boolean);
  // Chips zones
  var chipsHtml = '';
  if (_painZones && _painZones.length) {
    chipsHtml = _painZones.map(function(p) {
      var cfg = PAIN_ZONES_CONFIG.find(function(z){ return z.key === p.zone; });
      var lbl = (cfg ? cfg.label : p.zone) + ' — ' + p.cote;
      var cls = p.cote === 'DROIT' ? 'cote-d' : p.cote === 'GAUCHE' ? 'cote-g' : 'cote-bi';
      return '<span class="pz-chip ' + cls + '" style="font-size:.75rem;padding:3px 10px">' + lbl + '</span>';
    }).join('');
  } else if (cote) {
    chipsHtml = '<span class="pz-chip cote-d" style="font-size:.75rem;padding:3px 10px">' + cote + '</span>';
  }
  return '<div style="background:var(--surface);border-radius:var(--radius);margin-bottom:18px;padding:16px 18px;display:flex;align-items:flex-start;gap:14px;border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,.06)">' +
    '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;flex-shrink:0;font-family:var(--font-sans)">' + initials + '</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-size:1.05rem;font-weight:700;color:var(--accent2);font-family:var(--font-sans);margin-bottom:2px">' + fullName + '</div>' +
      (metaParts.length ? '<div style="font-size:.78rem;color:var(--text2);margin-bottom:' + (chipsHtml ? '8px' : '0') + '">' + metaParts.join(' · ') + '</div>' : '') +
      (chipsHtml ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + chipsHtml + '</div>' : '') +
    '</div>' +
  '</div>';
}


/* ── CR Évolution panel ────────────────────────────────── */
function _updateCrEvoPanel() {
  var panel = document.getElementById('cr-evo-panel');
  if (!panel) return;
  var hasEnough = _allBilans && _allBilans.length >= 2;
  panel.style.display = hasEnough ? '' : 'none';
  if (!hasEnough) {
    var toggle = document.getElementById('cr-evo-toggle');
    var grid   = document.getElementById('cr-evo-grid');
    if (toggle) toggle.checked = false;
    if (grid)   grid.style.display = 'none';
  }
}

function _onCrEvoToggle() {
  var toggle = document.getElementById('cr-evo-toggle');
  var grid   = document.getElementById('cr-evo-grid');
  if (!grid) return;
  var on = toggle && toggle.checked;
  grid.style.display = on ? '' : 'none';
  if (on) _buildCrEvoPicker();
  buildCR();
}

function _buildCrEvoPicker() {
  var checksDiv    = document.getElementById('cr-evo-checks');
  if (!checksDiv) return;
  var evoContainer = document.getElementById('evolution-content');
  if (!evoContainer) return;
  if (!evoContainer.querySelector('.evo-chart-card')) _renderEvolutionPage();
  // Preserve current checked state by chart-id
  var prevState = {};
  checksDiv.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
    prevState[cb.dataset.chartId] = cb.checked;
  });
  checksDiv.innerHTML = '';
  var cards = evoContainer.querySelectorAll('.evo-chart-card');
  if (!cards.length) {
    checksDiv.innerHTML = '<em style="font-size:.8rem;color:var(--text3)">Aucun graphique disponible.</em>';
    return;
  }
  cards.forEach(function(card) {
    var chartId = card.dataset.chartId;
    var title   = (card.querySelector('.evo-chart-title') || {}).textContent || chartId;
    // Default: check all (first build) or restore previous state
    var isChecked = (chartId in prevState) ? prevState[chartId] : true;
    var label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;padding:5px 10px;background:var(--surface);border-radius:6px;border:1px solid var(--border);font-size:.78rem;color:var(--text)';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.chartId = chartId;
    cb.checked = isChecked;
    cb.onchange = function() { buildCR(); };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(title));
    checksDiv.appendChild(label);
  });
}

function _crEvoCheckAll(state) {
  document.querySelectorAll('#cr-evo-checks input[type="checkbox"]').forEach(function(cb){
    cb.checked = state;
  });
  buildCR();
}

function _buildCREvoSection() {
  var toggle = document.getElementById('cr-evo-toggle');
  if (!toggle || !toggle.checked) return '';
  var evoContainer = document.getElementById('evolution-content');
  if (!evoContainer) return '';
  if (!evoContainer.querySelector('.evo-chart-card')) _renderEvolutionPage();
  var checks = document.querySelectorAll('#cr-evo-checks input[type="checkbox"]:checked');
  if (!checks.length) return '';
  var html = '<div style="padding:14px 16px">';
  checks.forEach(function(cb) {
    var chartId = cb.dataset.chartId;
    var card    = evoContainer.querySelector('.evo-chart-card[data-chart-id="' + chartId + '"]');
    if (!card) return;
    var title = (card.querySelector('.evo-chart-title') || {}).textContent || '';
    var svg   = card.querySelector('svg');
    if (!svg) return;
    html += '<div style="margin-bottom:20px;page-break-inside:avoid">'
          + '<div style="font-size:.72rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">' + title + '</div>'
          + '<div style="overflow:hidden;border-radius:6px;border:1px solid var(--border)">' + svg.outerHTML + '</div>'
          + '</div>';
  });
  html += '</div>';
  return html;
}

function buildCR() {
  var content = document.getElementById('cr-content');
  if (!content) return;
  content.innerHTML = '';

  _updateCrEvoPanel();

  content.innerHTML += _buildCRPatientHeaderHtml();

  function addSection(title, html) {
    if (!html || !html.trim()) return;
    content.innerHTML += '<div class="cr-section"><h3>' + title + '</h3>' + html + '</div>';
  }
  // Convertit \n en <br> pour l'affichage HTML des champs texte
  function nl2br(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

  function crItem(key, val, tag, tagClass, fieldIds) {
    if (!val) return '';
    tag = tag || ''; tagClass = tagClass || '';
    var tagHtml = tag ? '<span class="cr-tag ' + tagClass + '">' + tag + '</span>' : '';
    var cls = ''; var dateBadge = '';
    if (fieldIds && _crInSuiviMode()) {
      if (_crIsCarried(fieldIds)) {
        cls = ' cr-item--carried';
        var _od = _crOriginDate(fieldIds);
        if (_od) dateBadge = '<span class="cr-date-badge">' + _od + '</span>';
      } else { cls = ' cr-item--fresh'; }
    }
    return '<div class="cr-item' + cls + '"><span class="cr-key">' + key + '</span><span class="cr-val">' + val + '</span>' + tagHtml + dateBadge + '</div>';
  }

  // 1. Infos patient
  var infosHtml = '';
  var infosMap = [
    ['f-sexe','Sexe',''],['f-activite','Activité professionnelle',''],['f-sport','Sport / Objectif',''],['f-date-accident','Date accident',''],['f-date-op','Date opération',''],
    ['f-motif','Motif du bilan',''],['f-motif-patient','Motif (patient)',''],
    ['f-douleur','Douleur',''],['f-debut','Debut',''],['f-mecanisme','Mecanisme',''],
    ['f-eva','EVA actuelle','/10'],['f-eva-max','EVA max 7j','/10'],
    ['f-aggravants','Aggravants',''],['f-soulagants','Soulagants',''],
    ['f-atcd','Antecedents',''],['f-traitements','Traitements',''],
    ['f-objectifs','Objectifs',''],
    ['f-retentissement','Retentissement',''],['f-remarques','Remarques',''],
  ];
  for (var ii=0; ii<infosMap.length; ii++) {
    var el2 = document.getElementById(infosMap[ii][0]);
    var v2 = el2 ? el2.value : '';
    if (v2 && el2 && el2.type === 'date') { var _dp = v2.split('-'); v2 = _dp[2]+'/'+_dp[1]+'/'+_dp[0]; }
    if (v2) infosHtml += crItem(infosMap[ii][1], nl2br(v2) + infosMap[ii][2], '', '', [infosMap[ii][0]]);
  }
  // Imageries disponibles
  var imLines = [
    {label:'Radiographie', date:'f-img-radio-date', obs:'f-img-radio-obs'},
    {label:'IRM',          date:'f-img-irm-date',   obs:'f-img-irm-obs'},
    {label:'Échographie',  date:'f-img-echo-date',  obs:'f-img-echo-obs'},
    {label:'Scanner',      date:'f-img-scan-date',  obs:'f-img-scan-obs'},
    {label:'Arthroscopie', date:'f-img-arthro-date',obs:'f-img-arthro-obs'},
    {label:'Autre',        date:'f-img-autre-date', obs:'f-img-autre-obs'}
  ];
  var imHtml = '';
  imLines.forEach(function(im){
    var d = (document.getElementById(im.date)||{}).value||'';
    var o = (document.getElementById(im.obs)||{}).value||'';
    if(d||o) imHtml += '<div style="margin-bottom:3px;"><strong>'+im.label+'</strong>'+(d?' — '+d:'')+(o?' : '+o:'')+'</div>';
  });
  if(imHtml) infosHtml += crItem('📷 Imageries', imHtml);
  addSection('1. Infos Patient & Anamnese', infosHtml);

  // Sections 2→6 : délégué à _buildAllTestsHtml() (tests perso inclus inline)
  _buildAllTestsHtml().forEach(function(sec){ addSection(sec.title, sec.html); });

  // Section évolution (optionnelle)
  var evoSectionHtml = _buildCREvoSection();
  if (evoSectionHtml) {
    content.innerHTML += '<div class="cr-section"><h3>📈 Graphiques d\'évolution</h3>' + evoSectionHtml + '</div>';
  }

  if (!content.innerHTML.trim()) {
    content.innerHTML = '<div class="cr-empty">Aucune donnee saisie. Remplissez les onglets pour generer le compte-rendu.</div>';
  }
}

function openReset() { document.getElementById('modal-reset').classList.add('open'); }
function closeReset() { document.getElementById('modal-reset').classList.remove('open'); }
function doReset() {
  _bilanPatient = null;
  _prevDonnees  = null;
  _allBilans    = [];
  localStorage.removeItem(R4P_KEYS.PATIENT);
  _resetBilanFields();
  document.querySelectorAll('.evo-delta').forEach(function(el){ el.remove(); });
  _renderEvolutionPage();
  _updateSaveBar();
  closeReset();
  showPage('infos');
  localStorage.removeItem(R4P_KEYS.BILAN_DRAFT);
  showToast('Dossier réinitialisé — Prêt pour un nouveau patient');
  try { window.parent.postMessage({ type: 'r4p-patient-reset' }, window.location.origin); } catch(ex) {}
}

// -- LMA : selects cascadants -----------------------------------
var _LMA_MUSCLES = {
  sup: [
    {val:'pecto',  label:'Pectoraux'},
    {val:'biceps', label:'Biceps'},
    {val:'triceps',label:'Triceps'},
    {val:'dorsal', label:'Grand dorsal'},
    {val:'interco',label:'Intercostaux'}
  ],
  inf: [
    {val:'ischio', label:'Ischio-jambiers'},
    {val:'quadri', label:'Quadriceps'},
    {val:'adduct', label:'Adducteurs'},
    {val:'mollet', label:'Mollet'}
  ]
};

function _lmaUpdateMembre() {
  var membre = document.getElementById('lma-sel-membre').value;
  var selMuscle = document.getElementById('lma-sel-muscle');

  // Cacher tous les blocs, le marqueur et la conclusion
  document.querySelectorAll('.lma-bloc').forEach(function(b){ b.style.display='none'; });
  document.getElementById('lma-bloc-marqueur').style.display  = 'none';
  document.getElementById('lma-bloc-conclusion').style.display = 'none';

  // Réinitialiser le select muscle
  selMuscle.innerHTML = '<option value="">— Choisir un muscle —</option>';

  if (!membre) {
    selMuscle.disabled = true;
    selMuscle.style.opacity = '.5';
    return;
  }

  // Peupler le select muscle selon le membre choisi
  (_LMA_MUSCLES[membre] || []).forEach(function(m) {
    var opt = document.createElement('option');
    opt.value = m.val;
    opt.textContent = m.label;
    selMuscle.appendChild(opt);
  });

  selMuscle.disabled = false;
  selMuscle.style.opacity = '1';
}

function _lmaUpdateMuscle() {
  var muscle = document.getElementById('lma-sel-muscle').value;

  // Cacher tous les blocs musculaires + marqueur + conclusion
  document.querySelectorAll('.lma-bloc').forEach(function(b){ b.style.display='none'; });
  document.getElementById('lma-bloc-marqueur').style.display  = 'none';
  document.getElementById('lma-bloc-conclusion').style.display = 'none';

  if (!muscle) return;

  // Afficher le bloc du muscle sélectionné + marqueur + conclusion
  var bloc = document.getElementById('lma-bloc-' + muscle);
  if (bloc) bloc.style.display = 'block';
  document.getElementById('lma-bloc-marqueur').style.display  = 'block';
  document.getElementById('lma-bloc-conclusion').style.display = 'block';

  // Mettre à jour le sous-titre du header
  var selMuscle = document.getElementById('lma-sel-muscle');
  var label = selMuscle.options[selMuscle.selectedIndex].text;
  var hdr = document.getElementById('hdr-lma');
  if (hdr) hdr.textContent = label;

  updateBadges();
}
// ---------------------------------------------------------------

// -- CONFIRM DIALOG --------------------------------------------
var _bilanConfirmOkCb  = null;
var _bilanConfirmCancelCb = null;
function _bilanConfirm(onOk, onCancel) {
  _bilanConfirmOkCb     = onOk     || null;
  _bilanConfirmCancelCb = onCancel || null;
  var ov = document.getElementById('modal-confirm-switch');
  if(ov) ov.classList.add('open');
}
function _bilanConfirmOk() {
  var ov = document.getElementById('modal-confirm-switch');
  if(ov) ov.classList.remove('open');
  var cb = _bilanConfirmOkCb;
  _bilanConfirmOkCb = _bilanConfirmCancelCb = null;
  if(cb) cb();
}
function _bilanConfirmCancel() {
  var ov = document.getElementById('modal-confirm-switch');
  if(ov) ov.classList.remove('open');
  var cb = _bilanConfirmCancelCb;
  _bilanConfirmOkCb = _bilanConfirmCancelCb = null;
  if(cb) cb();
}

// -- TOAST ------------------------------------------------------
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// -- STORAGE ---------------------------------------------------
function saveToStorage() {
  try {
    const data = {};
    document.querySelectorAll('input,textarea,select').forEach(el => {
      if (el.id) {
        if (el.type === 'checkbox') data[el.id] = el.checked;
        else data[el.id] = el.value;
      }
    });
    localStorage.setItem(R4P_KEYS.BILAN_DRAFT, JSON.stringify(data));
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(R4P_KEYS.BILAN_DRAFT);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = val;
      else el.value = val;
      // Restore CF classes
      if (el.tagName === 'SELECT' && el.dataset.type) {
        const v = el.value;
        const type = el.dataset.type;
        if (v === 'Positif') el.classList.add(type === 'fonc' ? 'positif-fonc' : 'positif-ortho');
        else if (v === 'Négatif') el.classList.add(type === 'fonc' ? 'negatif-fonc' : 'negatif-ortho');
      }
      // Restore mob status colors
      if (el.classList.contains('mob-status-sel') && el.value) _mobStatusChange(el);
    });
    updateAll(); calcRec(); calcPlioq();
    ['sls','hop','pset','set'].forEach(k => calcLSI(k));
    calcDJ(); calcLunge(); calcHR(); calcMusc();
    calcCKC(); calcSHRT(); calcULRT();
    calcRachisStat(); calcLNF(); calcSorensen(); calcPDSLRT(); calcShirado();
    calcPlioq2(); calcRec(); calcSEBT(); calcUQYBT();
    updateBadges();
  } catch(e) {}
}


// -- PSET poids auto (2% du poids corporel) --------------------
function calcPSET() {
  const poids = parseFloat(document.getElementById('f-poids').value);
  const el = document.getElementById('pset-poids-calc');
  if (el) {
    if (!isNaN(poids) && poids > 0) {
      const pset = (poids * 0.02).toFixed(2);
      el.textContent = '-> Poids recommandé : ' + pset + ' kg (2% x ' + poids + ' kg)';
    } else {
      el.textContent = '<- Renseignez le poids dans Infos Patient';
    }
  }
}

// -- mCKCUEST : Score = (S2+S3)/2 ; MEI = (S4_30s/2) / Score ------
function calcCKC() {
  // Envergure → espacement repères (½ envergure)
  var envD = parseFloat((document.getElementById('ckc-env-d')||{}).value||'');
  var envG = parseFloat((document.getElementById('ckc-env-g')||{}).value||'');
  var elEsp = document.getElementById('ckc-espacement');
  if (elEsp) {
    if (!isNaN(envD) && !isNaN(envG)) {
      elEsp.textContent = ((envD + envG) / 2).toFixed(1) + ' cm';
    } else if (!isNaN(envD)) {
      elEsp.textContent = envD.toFixed(1) + ' cm (D seul)';
    } else if (!isNaN(envG)) {
      elEsp.textContent = envG.toFixed(1) + ' cm (G seul)';
    } else {
      elEsp.textContent = '—';
    }
  }

  var sexe = ((document.getElementById('f-sexe')||{}).value||'');
  var s2 = parseFloat((document.getElementById('ckc-s2')||{}).value||'');
  var s3 = parseFloat((document.getElementById('ckc-s3')||{}).value||'');
  var s4 = parseFloat((document.getElementById('ckc-s4')||{}).value||'');

  // Score = moyenne S2 et S3
  var score = NaN;
  if (!isNaN(s2) && !isNaN(s3)) score = (s2 + s3) / 2;
  else if (!isNaN(s2)) score = s2;
  else if (!isNaN(s3)) score = s3;

  // MEI = (S4 / 2) / Score
  var mei = NaN;
  if (!isNaN(s4) && !isNaN(score) && score > 0) mei = (s4 / 2) / score;

  // Cotation Score
  var scoreInfo = null;
  if (!isNaN(score)) {
    if (score > 21)      scoreInfo = { cls:'good', txt:'3 pts — Excellent (> 21 touches)' };
    else if (score >= 19) scoreInfo = { cls:'warn', txt:'2 pts — Moyen (19–21 touches)' };
    else                  scoreInfo = { cls:'bad',  txt:'1 pt — Faible (< 19 touches)' };
  }

  // Cotation MEI
  var meiInfo = null;
  if (!isNaN(mei)) {
    if (mei >= 0.90) meiInfo = { cls:'good', txt:'3 pts — Maintien optimal (≥ 0.90)' };
    else if (mei >= 0.70) meiInfo = { cls:'warn', txt:'2 pts — Maintien partiel (0.70–0.89)' };
    else meiInfo = { cls:'bad', txt:'1 pt — Chute de performance (< 0.70)' };
  }

  var clsBg  = function(c){ return c==='good'?'var(--green-l)':c==='warn'?'var(--orange-l)':'var(--red-l)'; };
  var clsFg  = function(c){ return c==='good'?'var(--green)':c==='warn'?'var(--orange)':'var(--red)'; };
  var clsTxt = function(c){ return c==='good'?'✓ OK':c==='warn'?'⚠ Attention':'✗ Déficit'; };

  // Affichage Score
  var elScore    = document.getElementById('ckc-score');
  var elScorePts = document.getElementById('ckc-score-pts');
  var elScoreSt  = document.getElementById('ckc-score-stat');
  if (elScore)    { elScore.textContent = isNaN(score) ? '—' : score.toFixed(1); }
  if (elScorePts) { elScorePts.textContent = scoreInfo ? scoreInfo.txt : '—'; elScorePts.style.color = scoreInfo ? clsFg(scoreInfo.cls) : ''; }
  if (elScoreSt)  {
    elScoreSt.textContent = scoreInfo ? clsTxt(scoreInfo.cls) : '—';
    elScoreSt.style.background = scoreInfo ? clsBg(scoreInfo.cls) : '';
    elScoreSt.style.color      = scoreInfo ? clsFg(scoreInfo.cls) : '';
  }

  // Affichage MEI
  var elMei    = document.getElementById('ckc-mei');
  var elMeiPts = document.getElementById('ckc-mei-pts');
  var elMeiSt  = document.getElementById('ckc-mei-stat');
  if (elMei)    { elMei.textContent = isNaN(mei) ? '—' : mei.toFixed(2); }
  if (elMeiPts) { elMeiPts.textContent = meiInfo ? meiInfo.txt : '—'; elMeiPts.style.color = meiInfo ? clsFg(meiInfo.cls) : ''; }
  if (elMeiSt)  {
    elMeiSt.textContent = meiInfo ? clsTxt(meiInfo.cls) : '—';
    elMeiSt.style.background = meiInfo ? clsBg(meiInfo.cls) : '';
    elMeiSt.style.color      = meiInfo ? clsFg(meiInfo.cls) : '';
  }

  // Statut S2 / S3 (repère visuel)
  var setStatEl = function(id, val) {
    var el = document.getElementById(id); if (!el) return;
    if (isNaN(val)) { el.textContent = '—'; el.style.background = ''; el.style.color = ''; return; }
    var c = val>21?'good':val>=19?'warn':'bad';
    el.textContent = val + ' tch'; el.style.background = clsBg(c); el.style.color = clsFg(c);
  };
  setStatEl('ckc-s2-stat', s2);
  setStatEl('ckc-s3-stat', s3);
  var elS4s = document.getElementById('ckc-s4-stat');
  if (elS4s) { elS4s.textContent = isNaN(s4) ? '—' : s4 + ' tch (30s)'; elS4s.style.background = ''; elS4s.style.color = 'var(--text2)'; }
}

// -- Side Hold Rotation Test -----------------------------------
function calcSHRT() {
  var d = parseFloat(document.getElementById('shrt-d') ? document.getElementById('shrt-d').value : '');
  var g = parseFloat(document.getElementById('shrt-g') ? document.getElementById('shrt-g').value : '');
  var lsiEl = document.getElementById('shrt-lsi');
  var statEl = document.getElementById('shrt-stat');
  if (!lsiEl || !statEl) return;

  if (!isNaN(d) && !isNaN(g) && Math.max(d,g) > 0) {
    var ref = Math.max(d, g);
    var min = Math.min(d, g);
    var lsi = min / ref * 100;
    var cls = lsi >= 90 ? 'good' : lsi >= 75 ? 'warn' : 'bad';
    lsiEl.textContent = lsi.toFixed(1) + '%';
    lsiEl.style.background = cls === 'good' ? 'var(--green-l)' : cls === 'warn' ? 'var(--orange-l)' : 'var(--red-l)';
    lsiEl.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    statEl.textContent = cls === 'good' ? ' Symétrique' : cls === 'warn' ? ' Asymétrie modérée' : ' Déficit';
    statEl.style.background = lsiEl.style.background;
    statEl.style.color = lsiEl.style.color;
  } else {
    lsiEl.textContent = '-'; lsiEl.style.background = ''; lsiEl.style.color = '';
    statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
  }
}

// -- ULRT - moyenne des 3 essais + LSI D/G --------------------
function calcULRT() {
  var getMoy = function(id1, id2, id3) {
    var vals = [
      parseFloat(document.getElementById(id1) ? document.getElementById(id1).value : ''),
      parseFloat(document.getElementById(id2) ? document.getElementById(id2).value : ''),
      parseFloat(document.getElementById(id3) ? document.getElementById(id3).value : '')
    ].filter(function(v) { return !isNaN(v); });
    if (vals.length === 0) return NaN;
    return vals.reduce(function(a,b) { return a+b; }, 0) / vals.length;
  };

  var moyD = getMoy('ulrt-d1','ulrt-d2','ulrt-d3');
  var moyG = getMoy('ulrt-g1','ulrt-g2','ulrt-g3');

  var elDmoy = document.getElementById('ulrt-d-moy');
  var elGmoy = document.getElementById('ulrt-g-moy');
  var elLsi  = document.getElementById('ulrt-lsi');
  var elStat = document.getElementById('ulrt-stat');

  if (elDmoy) elDmoy.textContent = isNaN(moyD) ? '-' : moyD.toFixed(1);
  if (elGmoy) elGmoy.textContent = isNaN(moyG) ? '-' : moyG.toFixed(1);

  if (!isNaN(moyD) && !isNaN(moyG) && Math.max(moyD,moyG) > 0) {
    var ref = Math.max(moyD, moyG);
    var min = Math.min(moyD, moyG);
    var lsi = min / ref * 100;
    var diff = Math.abs(moyD - moyG);
    var asym = diff / ref * 100;
    var cls = asym <= 10 ? 'good' : asym <= 20 ? 'warn' : 'bad';
    if (elLsi) {
      elLsi.textContent = 'LSI = ' + lsi.toFixed(1) + '%  |  Asymétrie = ' + asym.toFixed(1) + '%  (seuil significatif > 10%)';
      elLsi.style.background = cls === 'good' ? 'var(--green-l)' : cls === 'warn' ? 'var(--orange-l)' : 'var(--red-l)';
      elLsi.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    }
    if (elStat) {
      elStat.textContent = cls === 'good' ? ' Symétrique' : cls === 'warn' ? ' Asymétrie' : ' Déficit';
      elStat.style.background = elLsi ? elLsi.style.background : '';
      elStat.style.color = elLsi ? elLsi.style.color : '';
    }
  } else {
    if (elLsi) { elLsi.textContent = '-'; elLsi.style.background = ''; elLsi.style.color = ''; }
    if (elStat) { elStat.textContent = '-'; elStat.style.background = ''; elStat.style.color = ''; }
  }
}


// -- Tests Fonctionnels Rachis ---------------------------------

function calcRachisStat() {
  // Fléchisseurs cervicaux
  var flxEl = document.getElementById('rf-flx-cerv');
  var flxStat = document.getElementById('rf-flx-cerv-stat');
  if (flxEl && flxStat) {
    var v = parseFloat(flxEl.value);
    if (!isNaN(v)) {
      var cls = v >= 39 ? 'good' : v >= 24 ? 'warn' : 'bad';
      flxStat.textContent = v >= 39 ? 'OK (>= normes sains)' : v >= 24 ? 'Limite (>= cervicalgiques)' : 'Deficit (< 24s)';
      flxStat.style.background = cls === 'good' ? 'var(--green-l)' : cls === 'warn' ? 'var(--orange-l)' : 'var(--red-l)';
      flxStat.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    } else {
      flxStat.textContent = '-'; flxStat.style.background = ''; flxStat.style.color = '';
    }
  }
  // Extenseurs cervicaux
  var extEl = document.getElementById('rf-ext-cerv');
  var extStat = document.getElementById('rf-ext-cerv-stat');
  if (extEl && extStat) {
    var v2 = parseFloat(extEl.value);
    if (!isNaN(v2)) {
      var cls2 = v2 >= 20 ? 'good' : 'bad';
      extStat.textContent = v2 >= 20 ? 'OK (>= 20s)' : 'Insuffisant (< 20s)';
      extStat.style.background = cls2 === 'good' ? 'var(--green-l)' : 'var(--red-l)';
      extStat.style.color = cls2 === 'good' ? 'var(--green)' : 'var(--red)';
    } else {
      extStat.textContent = '-'; extStat.style.background = ''; extStat.style.color = '';
    }
  }
}

function calcLNF() {
  var dEl = document.getElementById('rf-lat-d');
  var gEl = document.getElementById('rf-lat-g');
  var ratioEl = document.getElementById('rf-lat-ratio');
  var statEl = document.getElementById('rf-lat-stat');
  if (!dEl || !gEl || !ratioEl || !statEl) return;
  var d = parseFloat(dEl.value);
  var g = parseFloat(gEl.value);
  if (!isNaN(d) && !isNaN(g) && Math.max(d,g) > 0) {
    var minV = Math.min(d,g);
    var maxV = Math.max(d,g);
    var ratio = minV / maxV * 100;
    ratioEl.textContent = ratio.toFixed(1) + '%';
    var cls = ratio >= 70 ? 'good' : 'bad';
    ratioEl.style.background = cls === 'good' ? 'var(--green-l)' : 'var(--red-l)';
    ratioEl.style.color = cls === 'good' ? 'var(--green)' : 'var(--red)';
    statEl.textContent = cls === 'good' ? 'Symetrie OK (>= 70%)' : 'Asymetrie (< 70%)';
    statEl.style.background = ratioEl.style.background;
    statEl.style.color = ratioEl.style.color;
  } else {
    ratioEl.textContent = '-'; ratioEl.style.background = ''; ratioEl.style.color = '';
    statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
  }
}

function calcSorensen() {
  var el = document.getElementById('rf-sorensen');
  var statEl = document.getElementById('rf-sorensen-stat');
  var interpEl = document.getElementById('rf-sorensen-interp');
  if (!el || !statEl) return;
  var v = parseFloat(el.value);
  if (!isNaN(v)) {
    var cls, stat, interp;
    if (v >= 198) {
      cls = 'good'; stat = 'Facteur protecteur (>= 198s)';
      interp = '>= 198s : facteur protecteur (Sorensen)';
    } else if (v >= 176) {
      cls = 'warn'; stat = 'Zone intermediaire (176-197s)';
      interp = '176-197s : sous la moyenne sains, seuil predictif non atteint';
    } else {
      cls = 'bad'; stat = 'Facteur de risque (< 176s - H)';
      interp = "< 176s : facteur predictif lombalgie chez l'homme (Sorensen)";
    }
    statEl.textContent = stat;
    statEl.style.background = cls === 'good' ? 'var(--green-l)' : cls === 'warn' ? 'var(--orange-l)' : 'var(--red-l)';
    statEl.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    if (interpEl) {
      interpEl.textContent = interp;
      interpEl.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    }
  } else {
    statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
    if (interpEl) { interpEl.textContent = '-'; interpEl.style.color = ''; }
  }
}

function calcPDSLRT() {
  var el = document.getElementById('rf-pdslrt');
  var statEl = document.getElementById('rf-pdslrt-stat');
  var normEl = document.getElementById('rf-pdslrt-norm');
  if (!el || !statEl) return;
  var v = parseFloat(el.value);

  // Highlight age row
  var dob = document.getElementById('f-dob') ? document.getElementById('f-dob').value : '';
  var age = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) : null;
  var rows = document.querySelectorAll('.pdslrt-row');
  var norm = null;
  for (var i=0; i<rows.length; i++) {
    var rMin = parseInt(rows[i].getAttribute('data-min'));
    var rMax = parseInt(rows[i].getAttribute('data-max'));
    rows[i].style.fontWeight = '400';
    rows[i].style.background = i%2===0 ? 'var(--surface)' : 'var(--surface2)';
    if (age !== null && age >= rMin && age <= rMax) {
      rows[i].style.background = 'var(--accent-l)';
      rows[i].style.fontWeight = '700';
      norm = rows[i];
    }
  }

  if (normEl) {
    if (age !== null) {
      normEl.textContent = age < 30 ? 'Groupe 15-29 ans - Ref H: 58s / F: 47,7s' :
                           age < 45 ? 'Groupe 30-44 ans - Ref H: 52,4s / F: 42,6s' :
                           age < 60 ? 'Groupe 45-59 ans - Ref H: 44,8s / F: 37,3s' :
                                      'Groupe 60+ ans - Ref H: 35,6s / F: 29,1s';
    } else {
      normEl.textContent = 'Renseignez la date de naissance dans Infos Patient';
    }
  }

  if (!isNaN(v)) {
    var cutH = 30, cutF = 29;
    var cls = v >= cutH ? 'good' : 'bad';
    statEl.textContent = v >= cutH ? 'OK (>= 30s)' : 'Deficit (< 30s H / < 29s F)';
    statEl.style.background = cls === 'good' ? 'var(--green-l)' : 'var(--red-l)';
    statEl.style.color = cls === 'good' ? 'var(--green)' : 'var(--red)';
  } else {
    statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
  }
}


function calcShirado() {
  var el = document.getElementById('rf-shirado');
  var statEl = document.getElementById('rf-shirado-stat');
  var interpEl = document.getElementById('rf-shirado-interp');
  if (!el || !statEl) return;
  var v = parseFloat(el.value);
  if (!isNaN(v)) {
    var cls, stat, interp;
    if (v >= 100) {
      cls = 'good'; stat = 'Dans la norme sujets sains';
      interp = '>= 100s : endurance fléchisseurs satisfaisante';
    } else if (v >= 41) {
      cls = 'warn'; stat = 'Zone intermédiaire (41-99s)';
      interp = '41-99s : sous la norme sains, au-dessus du seuil lombalgiques';
    } else {
      cls = 'bad'; stat = 'Déficit significatif (< 41s)';
      interp = '< 41s : dans la plage lombalgiques (Fransoo 2009)';
    }
    statEl.textContent = stat;
    statEl.style.background = cls === 'good' ? 'var(--green-l)' : cls === 'warn' ? 'var(--orange-l)' : 'var(--red-l)';
    statEl.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    if (interpEl) {
      interpEl.textContent = interp;
      interpEl.style.color = cls === 'good' ? 'var(--green)' : cls === 'warn' ? 'var(--orange)' : 'var(--red)';
    }
  } else {
    statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
    if (interpEl) { interpEl.textContent = '-'; interpEl.style.color = ''; }
  }
}

function calcPlioq2() {
  var scores = {ca:0, cs:0};
  for (var pi=0; pi<2; pi++) {
    var elCA = document.getElementById('plioq-ca-' + pi);
    var elCS = document.getElementById('plioq-cs-' + pi);
    if (elCA && elCA.checked) scores.ca++;
    if (elCS && elCS.checked) scores.cs++;
  }
  var elCA_stat = document.getElementById('plioq-stat-ca');
  var elCS_stat = document.getElementById('plioq-stat-cs');
  var setScore = function(el, score) {
    if (!el) return;
    var cls = score === 2 ? 'good' : 'warn';
    el.textContent = score + '/2 - ' + (score === 2 ? 'Reussi' : 'A ameliorer');
    el.style.color = score === 2 ? 'var(--green)' : 'var(--orange)';
  };
  setScore(elCA_stat, scores.ca);
  setScore(elCS_stat, scores.cs);
  // Auto-activer le toggle CR dès qu'une case est cochée
  var plioqTog = document.getElementById('plioq-cr-toggle');
  if (plioqTog && (scores.ca > 0 || scores.cs > 0)) plioqTog.checked = true;
}

function calcSideHop() {
  var expCA = parseFloat(document.getElementById('sh-exp-ca')?document.getElementById('sh-exp-ca').value:'');
  var expCS = parseFloat(document.getElementById('sh-exp-cs')?document.getElementById('sh-exp-cs').value:'');
  var endCA = parseFloat(document.getElementById('sh-end-ca')?document.getElementById('sh-end-ca').value:'');
  var endCS = parseFloat(document.getElementById('sh-end-cs')?document.getElementById('sh-end-cs').value:'');
  var expLsiEl = document.getElementById('sh-exp-lsi');
  var expStatEl = document.getElementById('sh-exp-stat');
  var endLsiEl = document.getElementById('sh-end-lsi');
  var endStatEl = document.getElementById('sh-end-stat');
  var endSeuilEl = document.getElementById('sh-end-seuil');
  var expSeuilEl = document.getElementById('sh-exp-seuil');
  var sexe = document.getElementById('f-sexe')?document.getElementById('f-sexe').value:'';
  // LSI explosivité
  if (!isNaN(expCA) && !isNaN(expCS) && expCS > 0) {
    var expLsi = expCA/expCS*100;
    var expCls = expLsi>=90?'good':expLsi>=80?'warn':'bad';
    setLSI(expLsiEl, expStatEl, expLsi);
  } else {
    if(expLsiEl) expLsiEl.textContent='—';
    if(expStatEl) expStatEl.textContent='—';
  }
  // LSI endurance
  if (!isNaN(endCA) && !isNaN(endCS) && endCS > 0) {
    var endLsi = endCA/endCS*100;
    setLSI(endLsiEl, endStatEl, endLsi);
  } else {
    if(endLsiEl) endLsiEl.textContent='—';
    if(endStatEl) endStatEl.textContent='—';
  }
  // Seuil endurance RTS
  if (!isNaN(expCS) && expCS > 0) {
    var seuilEnd = (2 * expCS * 0.9).toFixed(0);
    var seuilEndCA = !isNaN(expCA) && expCA > 0 ? (2 * expCA * 0.9).toFixed(0) : null;
    var txt = '🎯 Seuil endurance RTS (CS) = 2 × ' + expCS + ' × 90% = ' + seuilEnd + ' sauts/30s';
    if (seuilEndCA) txt += '   |   CA : seuil = ' + seuilEndCA + ' sauts/30s';
    if (!isNaN(endCS)) txt += (!isNaN(endCS) && endCS >= parseFloat(seuilEnd) ? '   ✓ CS atteint' : '   ✗ CS non atteint');
    if (endSeuilEl) endSeuilEl.textContent = txt;
  } else {
    if (endSeuilEl) endSeuilEl.textContent = '—';
  }
  // Seuil explosivité RTS
  var seuilExp = sexe==='F'?25:30;
  var seuilExpLabel = sexe==='F'?'≥ 25 (F)':sexe==='H'?'≥ 30 (H)':'≥ 25 (F) / ≥ 30 (H)';
  var seuilExpTxt = '🎯 Seuil explosivité RTS : ' + seuilExpLabel + ' sauts/15s';
  if (!isNaN(expCS)) seuilExpTxt += '   CS : ' + expCS + (expCS >= seuilExp ? ' ✓' : ' ✗');
  if (!isNaN(expCA)) seuilExpTxt += '   CA : ' + expCA + (expCA >= seuilExp ? ' ✓' : ' ✗');
  if (expSeuilEl) expSeuilEl.textContent = seuilExpTxt;
}

function buildCRTF() {
  var content = document.getElementById('cr-tf-content');
  if (!content) return;
  content.innerHTML = '';

  // S'assurer que les éléments calculés MS sont à jour
  try { calcCKC(); } catch(ex){}
  try { calcSHRT(); } catch(ex){}
  try { calcULRT(); } catch(ex){}

  // Header patient
  content.innerHTML += _buildCRPatientHeaderHtml();

  function addTFSection(title, html) {
    if (!html || !html.trim()) return;
    content.innerHTML += '<div class="cr-section cr-tests" style="margin-bottom:14px">' +
      '<h3>' + title + '</h3>' +
      '<div style="padding:0 16px">' + html + '</div>' +
      '</div>';
  }

  // Toutes les sections tests via helper partagé (tests perso inclus inline)
  _buildAllTestsHtml().forEach(function(sec){ addTFSection(sec.title, sec.html); });

  if (!content.innerHTML.trim() || content.innerHTML === '<div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--border)"></div>') {
    content.innerHTML = '<div style="color:var(--text3);font-style:italic;padding:40px 0;text-align:center;font-size:.9rem">Aucun test renseigné.<br>Remplissez les onglets pour générer le compte-rendu.</div>';
  }
}

function calcSEBT() {
  var dirs = ['ant','pm','pl'];
  var ca = [], cs = [];
  var allFilled = true;
  for (var i=0; i<dirs.length; i++) {
    var caEl = document.getElementById('sebt-' + dirs[i] + '-ca');
    var csEl = document.getElementById('sebt-' + dirs[i] + '-cs');
    var diffEl = document.getElementById('sebt-' + dirs[i] + '-diff');
    var statEl = document.getElementById('sebt-' + dirs[i] + '-stat');
    if (!caEl || !csEl) continue;
    var v1 = parseFloat(caEl.value);
    var v2 = parseFloat(csEl.value);
    ca.push(isNaN(v1) ? null : v1);
    cs.push(isNaN(v2) ? null : v2);
    if (!isNaN(v1) && !isNaN(v2) && v2 > 0) {
      var diff = Math.abs(v1 - v2);
      var diffPct = diff / v2 * 100;
      var isAnt = dirs[i] === 'ant';
      var bad = isAnt ? diff > 4 : diffPct > 10;
      if (diffEl) {
        diffEl.textContent = diffPct.toFixed(1) + '% (' + diff.toFixed(1) + 'cm)';
        diffEl.style.background = bad ? 'var(--red-l)' : 'var(--green-l)';
        diffEl.style.color = bad ? 'var(--red)' : 'var(--green)';
      }
      if (statEl) {
        statEl.textContent = bad ? (isAnt ? '>4cm ' : 'Asymétrie ') : 'OK ';
        statEl.style.background = diffEl.style.background;
        statEl.style.color = diffEl.style.color;
      }
    } else {
      allFilled = false;
      if (diffEl) { diffEl.textContent = '-'; diffEl.style.background = ''; diffEl.style.color = ''; }
      if (statEl) { statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = ''; }
    }
  }
  // Score composite
  var lgCA = parseFloat(document.getElementById('sebt-longueur-ca') ? document.getElementById('sebt-longueur-ca').value : '');
  var lgCS = parseFloat(document.getElementById('sebt-longueur-cs') ? document.getElementById('sebt-longueur-cs').value : '');
  var compCAEl = document.getElementById('sebt-comp-ca');
  var compCSEl = document.getElementById('sebt-comp-cs');
  if (compCAEl && ca[0]!==null && ca[1]!==null && ca[2]!==null && !isNaN(lgCA) && lgCA > 0) {
    var compCA = (ca[0]+ca[1]+ca[2]) / (3*lgCA) * 100;
    compCAEl.textContent = 'CA : ' + compCA.toFixed(1) + '%';
    compCAEl.style.color = compCA < 89 ? 'var(--orange)' : 'var(--green)';
  } else if (compCAEl) { compCAEl.textContent = '-'; }
  if (compCSEl && cs[0]!==null && cs[1]!==null && cs[2]!==null && !isNaN(lgCS) && lgCS > 0) {
    var compCS = (cs[0]+cs[1]+cs[2]) / (3*lgCS) * 100;
    compCSEl.textContent = 'CS : ' + compCS.toFixed(1) + '%';
    compCSEl.style.color = compCS < 89 ? 'var(--orange)' : 'var(--green)';
  } else if (compCSEl) { compCSEl.textContent = '-'; }
}

// -- UQYBT ------------------------------------------------
function calcUQYBT() {
  var dirs = ['med','il','sl'];
  for (var i=0; i<dirs.length; i++) {
    var dEl = document.getElementById('uqybt-' + dirs[i] + '-d');
    var gEl = document.getElementById('uqybt-' + dirs[i] + '-g');
    var diffEl = document.getElementById('uqybt-' + dirs[i] + '-diff');
    var statEl = document.getElementById('uqybt-' + dirs[i] + '-stat');
    if (!dEl || !gEl || !diffEl || !statEl) continue;
    var vd = parseFloat(dEl.value);
    var vg = parseFloat(gEl.value);
    if (!isNaN(vd) && !isNaN(vg) && Math.max(vd,vg) > 0) {
      var ref = Math.max(vd,vg);
      var diff = Math.abs(vd-vg);
      var diffPct = diff/ref*100;
      var bad = diffPct > 5;
      diffEl.textContent = diffPct.toFixed(1) + '%';
      diffEl.style.background = bad ? 'var(--orange-l)' : 'var(--green-l)';
      diffEl.style.color = bad ? 'var(--orange)' : 'var(--green)';
      statEl.textContent = bad ? '>5% ' : 'OK ';
      statEl.style.background = diffEl.style.background;
      statEl.style.color = diffEl.style.color;
    } else {
      diffEl.textContent = '-'; diffEl.style.background = ''; diffEl.style.color = '';
      statEl.textContent = '-'; statEl.style.background = ''; statEl.style.color = '';
    }
  }
}

// -- EXPORT HTML -----------------------------------------------
function _buildBilanHTML(type) {
  var p         = getProfile();
  var praticien = ((p.prenom||'')+' '+(p.nom||'')).trim() || 'Praticien';
  var cabinet   = p.cabinet || '';
  var am        = p.am  || '';
  var tel       = p.tel || '';
  var email     = p.email || '';
  var date      = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});

  var iscrTF    = type === 'cr-tf';
  var title     = iscrTF ? 'Compte-Rendu Tests Fonctionnels' : 'CR Complet';
  var contentId = iscrTF ? 'cr-tf-content' : 'cr-content';

  var nom    = ((document.getElementById('f-nom')||{}).value || '').toUpperCase();
  var prenom = (document.getElementById('f-prenom') ||{}).value || '';
  var dob    = (document.getElementById('f-dob')    ||{}).value || '';
  var cote   = (document.getElementById('f-cote')   ||{}).value || '';
  var patient = ((prenom+' '+nom).trim()) || '';
  var age    = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) + ' ans' : '';

  var contentEl = document.getElementById(contentId);
  if (!contentEl) return null;

  var contentHTML = contentEl.innerHTML
    .replace(/(<div class="cr-section">)(<h3>6\. Points)/g, '<div class="cr-section cr-alert">$2')
    .replace(/(<div class="cr-section">)(<h3>2\. Bilan)/g,  '<div class="cr-section cr-ortho">$2')
    .replace(/(<div class="cr-section">)(<h3>[345]\. Tests)/g, '<div class="cr-section cr-tests">$2');

  var css = `:root{--green:#2D6A4F;--green-l:#E8F5EE;--red:#C0392B;--red-l:#FDECEA;--orange:#D4600A;--orange-l:#FEF3EB;--border:#E8E6E1;--text:#1A1917;--text2:#6B6860;--text3:#9D9B96;--accent2:#1A3A5C;--surface2:#F1F0ED;--surface:#FFFFFF;--accent:#2B5FA6;--accent-l:#EEF3FB}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{font-size:14px}body{font-family:'Figtree',-apple-system,sans-serif;background:#F5F7FA;color:#1A1917;padding:0}.page-wrap{max-width:800px;margin:0 auto;padding:0 0 48px}.doc-header{background:var(--accent2);padding:16px 28px 14px}.doc-hdr-row1{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.doc-hdr-sep{border:none;border-top:1px solid rgba(255,255,255,.12);margin:0 0 10px}.doc-hdr-row2{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.doc-logo{display:inline-flex;align-items:center;gap:8px;flex-shrink:0}.doc-logo svg{display:block;flex-shrink:0}.doc-logo .w{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}.doc-logo .r{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:22px;color:#fff;letter-spacing:-.01em}.doc-logo .e{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#7FA8D9;margin:0 .05em 0 .01em;line-height:0}.doc-logo .p{font-family:'Poppins',sans-serif;font-weight:800;font-size:17px;color:#fff;letter-spacing:-.025em;margin-left:.02em}.doc-type-badge{font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:3px 10px}.doc-pract-name{font-size:.88rem;font-weight:700;color:#fff;letter-spacing:-.01em}.doc-pract-meta{font-size:.72rem;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:10px;flex-wrap:wrap}.patient-card{background:#fff;margin:0;padding:22px 28px;border-bottom:3px solid var(--accent-l);display:flex;align-items:center;gap:18px}.patient-avatar{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;flex-shrink:0}.patient-name{font-size:1.35rem;font-weight:800;color:var(--accent2);margin-bottom:4px;letter-spacing:-.03em;line-height:1.1}.patient-sub{font-size:.8rem;color:var(--text2)}.patient-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.pat-badge{border-radius:6px;padding:3px 10px;font-size:.68rem;font-weight:600;letter-spacing:.01em;background:var(--accent-l);color:var(--accent)}.pat-badge.orange{background:#FEF3EB;color:#D4600A}.pat-badge.navy{background:var(--accent2);color:#fff;font-weight:700}.doc-date-bar{background:var(--accent-l);padding:7px 28px;font-size:.73rem;color:var(--accent);border-bottom:1px solid #D3D9F0;font-weight:500;letter-spacing:.01em}.doc-date-bar strong{font-weight:700;color:var(--accent2)}.doc-body{padding:20px 28px 0}.block{display:none}.cr-section{background:#fff;border-radius:10px;margin-bottom:16px;overflow:hidden;border:1px solid var(--border)}.cr-section h3{padding:11px 16px 11px 20px;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent2);margin:0;border-left:4px solid var(--accent2);background:#F7F8FC}.cr-ortho h3{border-left-color:var(--green);color:var(--green);background:#F3FAF6}.cr-tests h3{border-left-color:var(--accent);color:var(--accent);background:#F0F4FC}.cr-alert h3{border-left-color:#D4600A;color:#D4600A;background:#FFF8F3}.cr-item{display:flex;align-items:flex-start;gap:16px;padding:10px 16px;border-bottom:1px solid #F5F4F2;line-height:1.5}.cr-item:last-child{border-bottom:none}.cr-key{font-size:.65rem;font-weight:700;color:var(--text3);min-width:175px;flex-shrink:0;padding-top:3px;text-transform:uppercase;letter-spacing:.06em}.cr-val{flex:1;font-size:.88rem;color:#1A1917;line-height:1.55}.cr-tag{display:inline-block;padding:2px 9px;border-radius:5px;font-size:.65rem;font-weight:700;white-space:nowrap;margin-left:8px;vertical-align:middle;letter-spacing:.02em}.cr-tag.ok,.cr-tag.good{background:#E8F5EE;color:var(--green)}.cr-tag.warn{background:#FEF3EB;color:#D4600A}.cr-tag.bad{background:#FDECEA;color:var(--red)}.cr-alert .cr-item{padding:10px 16px;align-items:flex-start;background:#FFFAF7}.cr-alert .cr-item:nth-child(odd){background:#fff}.cr-alert .cr-item>span:first-child{color:#D4600A;font-weight:700;font-size:.95rem;flex-shrink:0}.cr-empty{padding:40px;text-align:center;color:var(--text3);font-style:italic;font-size:.9rem}@media print{body{background:#F5F7FA!important}.doc-header{background:var(--accent2)!important}.cr-section{break-inside:avoid;page-break-inside:avoid}.doc-body{padding:12px 28px 0}}@media(max-width:640px){.doc-header{padding:13px 16px 11px}.doc-pract-name{font-size:.8rem}.doc-pract-meta{font-size:.67rem;gap:6px}.patient-card{padding:14px 16px;gap:12px}.patient-avatar{width:44px;height:44px;font-size:1rem}.patient-name{font-size:1.05rem}.pat-badge{font-size:.66rem;padding:2px 8px}.doc-date-bar{padding:6px 16px;font-size:.71rem}.doc-body{padding:10px 16px 0}.cr-section{border-radius:8px;margin-bottom:10px}.cr-section h3{padding:9px 12px 9px 14px;font-size:.65rem}.cr-item{flex-direction:column;gap:3px;padding:10px 12px}.cr-key{min-width:0;width:100%;padding-top:0;padding-bottom:1px}.cr-val{font-size:.9rem;width:100%}.cr-tag{margin-left:0;margin-top:6px}.cr-alert .cr-item{flex-direction:row;gap:10px}}svg{max-width:100%;height:auto;display:block}`;

  var practNameStr = praticien + (cabinet ? ' — ' + cabinet : '');
  var metaItems = [];
  if(am)    metaItems.push('N° AM : '+am);
  if(tel)   metaItems.push(tel);
  if(email) metaItems.push(email);
  var metaHtml = metaItems.join(' · ');

  var initials = ((prenom[0]||'')+(nom[0]||'')).toUpperCase() || '?';
  var badges = '';
  // Zones douloureuses (multi-zone) → badges colorés
  if(_painZones && _painZones.length){
    _painZones.forEach(function(pz){
      var cfg = PAIN_ZONES_CONFIG.find(function(z){ return z.key===pz.zone; });
      var lbl = (cfg?cfg.label:pz.zone)+' '+pz.cote;
      var bg  = pz.cote==='DROIT'?'#E3F2FD':pz.cote==='GAUCHE'?'#F3E5F5':'#E8F5E9';
      var col = pz.cote==='DROIT'?'#1565C0':pz.cote==='GAUCHE'?'#6A1B9A':'#2E7D32';
      badges += '<span class="pat-badge" style="background:'+bg+';color:'+col+'">'+lbl+'</span>';
    });
  } else if(cote){
    badges += '<span class="pat-badge">'+cote+'</span>';
  }
  if(age)  badges += '<span class="pat-badge">'+age+'</span>';
  var bilanDate = (document.getElementById('f-date')||{}).value || '';
  if(bilanDate) badges += '<span class="pat-badge navy">Bilan du '+bilanDate.split('-').reverse().join('/')+'</span>';

  return {
    html: '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
      + '<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&family=Cormorant+Garamond:ital,wght@1,600&family=Poppins:wght@800&display=swap" rel="stylesheet">'
      + '<link rel="stylesheet" href="/fonts/fonts.css"><title>'+title+(patient?' — '+patient:'')+'</title><style>'+css+'</style></head><body><div class="page-wrap">'
      + '<div class="doc-header">'
      + '<div class="doc-hdr-row1"><div class="doc-logo"><svg viewBox="8 34 164 104" width="28" height="18" aria-hidden="true"><g stroke="#4A90D9" stroke-width="17" stroke-linecap="round" fill="none"><line x1="20" y1="118" x2="56" y2="104"/><line x1="70" y1="122" x2="100" y2="84"/><line x1="112" y1="125" x2="134" y2="66"/><line x1="158" y1="128" x2="158" y2="46"/></g></svg><span class="w"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></span></div><span class="doc-type-badge">'+title+'</span></div>'
      + '<hr class="doc-hdr-sep">'
      + '<div class="doc-hdr-row2"><div class="doc-pract-name">'+practNameStr+'</div><div class="doc-pract-meta">'+metaHtml+'</div></div>'
      + '</div>'
      + (patient ? '<div class="patient-card"><div class="patient-avatar">'+initials+'</div><div><div class="patient-name">'+patient+'</div>'+(badges?'<div class="patient-badges">'+badges+'</div>':'')+'</div></div>' : '')
      + '<div class="doc-date-bar">Compte-rendu généré le <strong>'+date+'</strong></div>'
      + '<div class="doc-body"><br>'+contentHTML+'</div>'
      + '<div style="margin:32px 24px 0;padding:12px 16px;border-top:1px solid #DDE3EC;font-size:.68rem;color:#9D9B96;text-align:center;line-height:1.6">'
      + '🔒 Document confidentiel — Données de santé à caractère personnel · Usage professionnel exclusif'
      + '<br>Ne pas diffuser sans le consentement du patient · Généré par Rehab<strong>4</strong>Perf'
      + '</div>'
      + '</div></body></html>',
    title: title,
    patient: patient,
    date: date
  };
}

function exportBilanHTML(type) {
  var r = _buildBilanHTML(type);
  if (!r) return;
  var blob = new Blob([r.html], {type:'text/html;charset=utf-8'});
  var blobUrl = URL.createObjectURL(blob);
  var filename = r.title.replace(/\s+/g,'_')+(r.patient?'_'+r.patient.replace(/\s+/g,'_'):'')+'_'+r.date.replace(/\s/g,'-')+'.html';
  var topDoc = (window.top||window).document;
  var a = topDoc.createElement('a');
  a.href = blobUrl; a.download = filename; a.style.display = 'none';
  topDoc.body.appendChild(a); a.click();
  setTimeout(function(){ topDoc.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 300);
}

function printBilan(type) {
  var r = _buildBilanHTML(type);
  if (!r) return;

  // Barre de navigation "← Retour" — visible à l'écran, masquée à l'impression
  var backBar = '<style>'
    + '.print-back-bar{position:fixed;top:0;left:0;right:0;z-index:9999;'
    + 'display:flex;align-items:center;gap:12px;padding:10px 18px;'
    + 'background:var(--accent2);color:#fff;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;'
    + 'font-size:.88rem;box-shadow:0 2px 8px rgba(0,0,0,.25);}'
    + '.print-back-btn{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);'
    + 'color:#fff;border-radius:7px;padding:6px 14px;font-size:.84rem;font-weight:600;'
    + 'cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;}'
    + '.print-back-btn:hover{background:rgba(255,255,255,.3);}'
    + '.print-back-bar .print-hint{font-size:.78rem;color:rgba(255,255,255,.7);}'
    + '.print-page-offset{padding-top:48px;}'
    + '@media print{'
    + '.print-back-bar{display:none!important;}'
    + '.print-page-offset{padding-top:0!important;}'
    + '}'
    + '</style>'
    + '<div class="print-back-bar">'
    + '<button class="print-back-btn" onclick="window.close()">← Retour</button>'
    + '<span class="print-hint">Utilisez le bouton ci-dessus pour revenir au bilan</span>'
    + '</div>';

  // Décaler le contenu sous la barre
  var printHtml = r.html
    .replace('<body>', '<body><div class="print-page-offset">')
    .replace('</body>', '</div></body>')
    .replace('</head>', backBar + '</head>')
    .replace('</body>',
      '<script>window.onload=function(){window.focus();setTimeout(function(){window.print();},300);}<\/script></body>');

  var win = (window.top||window).open('', '_blank');
  if (!win) { alert('Autorisez les pop-ups pour ce site pour imprimer.'); return; }
  win.document.open();
  win.document.write(printHtml);
  win.document.close();
}

// Auto-save on any change — skipped during _deserializeBilan to avoid partial writes
document.addEventListener('input', () => { if (!_suppressDirty) saveToStorage(); });
document.addEventListener('change', () => { if (!_suppressDirty) saveToStorage(); });

// Masquer TOUTES les pages immédiatement (inline style, priorité max)
document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });

/* ── Pain zones system ── */
function getCoteForHdr(hdrKey){
  var relevant = PAIN_ZONES_CONFIG.filter(function(z){ return z.hdr.indexOf(hdrKey)>-1; });
  var found = _painZones.filter(function(p){
    return relevant.some(function(r){ return r.key===p.zone; });
  });
  if(!found.length) return '';
  var cotes = found.map(function(f){ return f.cote; });
  var unique = cotes.filter(function(v,i,a){ return a.indexOf(v)===i; });
  if(unique.length===1) return unique[0];
  return found.map(function(f){
    var cfg = PAIN_ZONES_CONFIG.find(function(z){ return z.key===f.zone; });
    return (cfg?cfg.label:'?')+' '+f.cote;
  }).join(' • ');
}

function renderPainZones(){
  var list = document.getElementById('pain-zones-list');
  if(!list) return;
  list.innerHTML = _painZones.length ? '' : '<span style="font-size:.78rem;color:var(--muted);font-style:italic;">Aucune zone — patient sans douleur localisée</span>';
  _painZones.forEach(function(pz, idx){
    var cfg = PAIN_ZONES_CONFIG.find(function(z){ return z.key===pz.zone; });
    var cls = pz.cote==='DROIT' ? 'cote-d' : pz.cote==='GAUCHE' ? 'cote-g' : 'cote-bi';
    var lbl = (cfg?cfg.label:pz.zone) + ' — ' + pz.cote;
    var chip = '<span class="pz-chip '+cls+'">'+lbl+'<button class="pz-chip-del" onclick="removePainZone('+idx+')" title="Supprimer">×</button></span>';
    list.innerHTML += chip;
  });
  // Sync hidden fields
  var hf = document.getElementById('f-pain-zones');
  if(hf) hf.value = JSON.stringify(_painZones);
  // Sync f-cote for backward compat (primary côté = first zone, or empty)
  var fc = document.getElementById('f-cote');
  if(fc) fc.value = _painZones.length ? _painZones[0].cote : '';
  updateAll();
  if(typeof _updateSideLabels === 'function') _updateSideLabels();
}

function addPainZone(){
  var zone = (document.getElementById('pz-zone-sel')||{}).value;
  var cote = (document.getElementById('pz-cote-sel')||{}).value;
  if(!zone||!cote) return;
  // Prevent exact duplicate
  var exists = _painZones.some(function(p){ return p.zone===zone && p.cote===cote; });
  if(exists) return;
  _painZones.push({ zone:zone, cote:cote });
  renderPainZones();
}

function removePainZone(idx){
  _painZones.splice(idx,1);
  renderPainZones();
}

function calcGIRD() {
  var cs = parseFloat((document.getElementById('gird-cs')||{}).value);
  var ca = parseFloat((document.getElementById('gird-ca')||{}).value);
  var diffEl = document.getElementById('gird-diff');
  var statEl = document.getElementById('gird-stat');
  if (isNaN(cs) || isNaN(ca)) {
    if (diffEl) diffEl.textContent = '—';
    if (statEl) { statEl.textContent = '—'; statEl.className = 'measure-stat'; }
    return;
  }
  var diff = cs - ca;
  if (diffEl) diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(0) + '°';
  if (statEl) {
    if (diff > 15) {
      statEl.textContent = '❌ Positif'; statEl.className = 'measure-stat bad';
    } else {
      statEl.textContent = '✅ Négatif'; statEl.className = 'measure-stat good';
    }
  }
}

function onEpAprChange(sel) {
  sel.className = 'ep-apr-sel';
  var v = sel.value;
  if (v === 'Positif') sel.classList.add('positif-ortho');
  else if (v === 'Négatif') sel.classList.add('negatif-ortho');
}

function calcEpForce(key) {
  var csEl = document.getElementById(key+'-cs');
  var caEl = document.getElementById(key+'-ca');
  var lsiEl = document.getElementById(key+'-lsi');
  var statEl = document.getElementById(key+'-stat');
  if (!csEl || !caEl || !lsiEl || !statEl) return;
  var cs = parseFloat(csEl.value);
  var ca = parseFloat(caEl.value);
  // Zone scope → bilateral detection
  var zones = /^ra-/.test(key) ? ['rachis-c','rachis-l']
             : /^ep-/.test(key) ? ['epaule','coude','poignet']
             : ['genou','hanche','cheville','pied','cuisse','jambe'];
  var bilateral = _isBilateralForZones(zones);
  if (!isNaN(cs) && cs > 0) {
    var lsi = bilateral
      ? (!isNaN(ca) && ca > 0 ? Math.min(ca,cs)/Math.max(ca,cs)*100 : NaN)
      : (!isNaN(ca) ? ca/cs*100 : NaN);
    lsiEl.textContent = isNaN(lsi) ? '—' : lsi.toFixed(0) + '%';
    // Dentelé : positif si CS < 20 OU CA < 20 OU LSI < 90%
    if (key === 'ep-dent') {
      var dentPos = cs < 20 || (!isNaN(ca) && ca < 20) || (!isNaN(lsi) && lsi < 90);
      if (dentPos) {
        var reasons = [];
        if (cs < 20) reasons.push('CS ' + cs + ' rép < 20');
        if (!isNaN(ca) && ca < 20) reasons.push('CA ' + ca + ' rép < 20');
        if (!isNaN(lsi) && lsi < 90) reasons.push('LSI ' + lsi.toFixed(0) + '%');
        statEl.textContent = '❌ ' + reasons.join(' · '); statEl.className = 'measure-stat bad';
      } else {
        statEl.textContent = '✅ OK'; statEl.className = 'measure-stat good';
      }
    } else {
      if (isNaN(lsi)) {
        statEl.textContent = '—'; statEl.className = 'measure-stat';
      } else if (lsi >= 90) {
        statEl.textContent = '✅ ≥ 90%'; statEl.className = 'measure-stat good';
      } else if (lsi >= 80) {
        statEl.textContent = '⚠️ ' + lsi.toFixed(0) + '%'; statEl.className = 'measure-stat warn';
      } else {
        statEl.textContent = '❌ ' + lsi.toFixed(0) + '%'; statEl.className = 'measure-stat bad';
      }
    }
  } else {
    lsiEl.textContent = '—';
    statEl.textContent = '—'; statEl.className = 'measure-stat';
  }
}

// ── Latéralité par zone anatomique ─────────────────────────────────────
function _getCoteForScope(zones) {
  var matching = _painZones.filter(function(pz){ return zones.indexOf(pz.zone) >= 0; });
  if (matching.length === 0) return '';
  var cotes = matching.map(function(pz){ return pz.cote; })
    .filter(function(c){ return c === 'DROIT' || c === 'GAUCHE'; });
  if (cotes.length === 0) return 'BILATÉRAL';
  var unique = cotes.filter(function(v,i){ return cotes.indexOf(v) === i; });
  return unique.length === 1 ? unique[0] : 'BILATÉRAL';
}

function _applyColOrder(container, cote) {
  var gFirst = (cote !== 'GAUCHE'); // G goes first unless G is Atteint (cote=GAUCHE)

  // --- Part 1: elements with data-col="g"/"d" ---
  // Collect unique parent elements that have at least one direct [data-col="g"] child
  var allG = Array.prototype.slice.call(container.querySelectorAll('[data-col="g"]'));
  var parents = [];
  allG.forEach(function(el) {
    var p = el.parentNode;
    if (parents.indexOf(p) < 0) parents.push(p);
  });
  parents.forEach(function(parent) {
    var gEls = Array.prototype.slice.call(parent.querySelectorAll(':scope > [data-col="g"]'));
    var dEls = Array.prototype.slice.call(parent.querySelectorAll(':scope > [data-col="d"]'));
    if (!gEls.length || !dEls.length) return;
    // Is G currently before D?
    var gBeforeD = !!(gEls[0].compareDocumentPosition(dEls[0]) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (gFirst && !gBeforeD) {
      // Restore G first
      gEls.forEach(function(gEl, i) { if (dEls[i]) parent.insertBefore(gEl, dEls[i]); });
    } else if (!gFirst && gBeforeD) {
      // Put D first (Sain first when G=Atteint)
      dEls.forEach(function(dEl, i) { if (gEls[i]) parent.insertBefore(dEl, gEls[i]); });
    }
  });

  // --- Part 2: ROM tables (swap col index 1 ↔ 2 in each row) ---
  container.querySelectorAll('table.rom-block').forEach(function(table) {
    var isSwapped = table.dataset.colState === 'swapped';
    var needSwap = !gFirst;
    if (needSwap !== isSwapped) {
      table.querySelectorAll('tr').forEach(function(row) {
        if (row.children.length >= 3) row.insertBefore(row.children[2], row.children[1]);
      });
      table.dataset.colState = needSwap ? 'swapped' : 'default';
    }
  });
}

function _applyLabels(container, cote) {
  var bilateral = (cote !== 'DROIT' && cote !== 'GAUCHE');
  var droitAtteint = (cote === 'DROIT');
  container.querySelectorAll('.sl-cs').forEach(function(el){
    if(!el.dataset.slOrig) el.dataset.slOrig = el.textContent;
    el.textContent = el.dataset.slOrig
      .replace(/\bSain\b/g, bilateral?'Gauche':'Sain')
      .replace(/\bsain\b/g, bilateral?'gauche':'sain')
      .replace(/\bSAIN\b/g, bilateral?'GAUCHE':'SAIN');
  });
  container.querySelectorAll('.sl-ca').forEach(function(el){
    if(!el.dataset.slOrig) el.dataset.slOrig = el.textContent;
    el.textContent = el.dataset.slOrig
      .replace(/\bAtteint\b/g, bilateral?'Droit':'Atteint')
      .replace(/\batteint\b/g, bilateral?'droit':'atteint')
      .replace(/\bATTEINT\b/g, bilateral?'DROIT':'ATTEINT');
  });
  container.querySelectorAll('.sl-d').forEach(function(el){
    if(!el.dataset.slOrig) el.dataset.slOrig = el.textContent;
    if(bilateral){ el.textContent = el.dataset.slOrig; }
    else if(droitAtteint){
      el.textContent = el.dataset.slOrig
        .replace(/\bDroit\b/g,'Atteint').replace(/\bdroit\b/g,'atteint').replace(/\bDROIT\b/g,'ATTEINT');
    } else {
      el.textContent = el.dataset.slOrig
        .replace(/\bDroit\b/g,'Sain').replace(/\bdroit\b/g,'sain').replace(/\bDROIT\b/g,'SAIN');
    }
  });
  container.querySelectorAll('.sl-g').forEach(function(el){
    if(!el.dataset.slOrig) el.dataset.slOrig = el.textContent;
    if(bilateral){ el.textContent = el.dataset.slOrig; }
    else if(!droitAtteint){
      el.textContent = el.dataset.slOrig
        .replace(/\bGauche\b/g,'Atteint').replace(/\bgauche\b/g,'atteint').replace(/\bGAUCHE\b/g,'ATTEINT');
    } else {
      el.textContent = el.dataset.slOrig
        .replace(/\bGauche\b/g,'Sain').replace(/\bgauche\b/g,'sain').replace(/\bGAUCHE\b/g,'SAIN');
    }
  });
  // Apply column order: Sain always first, Atteint second
  _applyColOrder(container, cote);
}

function _updateGenouBilateral(){
  var cote = _getCoteForScope(['genou']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['global','mob','lig','lca','men','rot','sbit','plicae','ext'];
  blocks.forEach(function(b){
    var single = document.getElementById('ge-single-' + b);
    var bil    = document.getElementById('ge-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateChevBilateral(){
  var cote = _getCoteForScope(['cheville','pied']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['ottawa','global','tt','synd','conf','st','chopart'];
  blocks.forEach(function(b){
    var single = document.getElementById('pi-single-' + b);
    var bil    = document.getElementById('pi-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateEpauleBilateral(){
  var cote = _getCoteForScope(['epaule','coude','poignet']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['irrit','trau','fonc','ortho'];
  blocks.forEach(function(b){
    var single = document.getElementById('ep-single-' + b);
    var bil    = document.getElementById('ep-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateCoudeBilateral(){
  var cote = _getCoteForScope(['epaule','coude','poignet']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['lat','med','ant','post'];
  blocks.forEach(function(b){
    var single = document.getElementById('co-single-' + b);
    var bil    = document.getElementById('co-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateMainBilateral(){
  var cote = _getCoteForScope(['epaule','coude','poignet']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['neuro','lig','pouce'];
  blocks.forEach(function(b){
    var single = document.getElementById('po-single-' + b);
    var bil    = document.getElementById('po-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateHancheBilateral(){
  var cote = _getCoteForScope(['hanche']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['neuro','fracture','agp','hanche'];
  blocks.forEach(function(b){
    var single = document.getElementById('ha-single-' + b);
    var bil    = document.getElementById('ha-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateSideLabels(){
  var SCOPES = [
    { zones:['epaule','coude','poignet'],         pages:['page-epaule','page-coude','page-main','page-fonctionnelsMS','page-force-ms'] },
    { zones:['genou'],                            pages:['page-genou'] },
    { zones:['cheville','pied'],                  pages:['page-pied'] },
    { zones:['rachis-c','rachis-l'],              pages:['page-rachis','page-fonctionnelsRachis','page-force-rachis'] },
    { zones:['genou','hanche','cheville','pied','cuisse','jambe'], pages:['page-fonctionnels','page-force-mi'] }
  ];
  SCOPES.forEach(function(sc){
    var cote = _getCoteForScope(sc.zones);
    sc.pages.forEach(function(pid){
      var c = document.getElementById(pid);
      if(c) _applyLabels(c, cote);
    });
  });
  // Hanche : logique explicite pour contourner la dépendance à slOrig
  // BILATÉRAL  → CÔTÉ GAUCHE / CÔTÉ DROIT (force le texte + réinitialise slOrig)
  // DROIT/GAUCHE → CÔTÉ SAIN / CÔTÉ ATTEINT via _applyLabels
  // '' (rien)  → traité comme DROIT (SAIN/ATTEINT)
  var haCote = _getCoteForScope(['hanche']);
  var haEl = document.getElementById('page-hanche');
  if(haEl) {
    if(haCote === 'BILATÉRAL') {
      haEl.querySelectorAll('.sl-g').forEach(function(el){
        el.dataset.slOrig = 'CÔTÉ GAUCHE';
        el.textContent    = 'CÔTÉ GAUCHE';
      });
      haEl.querySelectorAll('.sl-d').forEach(function(el){
        el.dataset.slOrig = 'CÔTÉ DROIT';
        el.textContent    = 'CÔTÉ DROIT';
      });
      _applyColOrder(haEl, 'BILATÉRAL');
    } else {
      var haEffective = haCote || 'DROIT'; // '' → 'DROIT' (SAIN/ATTEINT)
      _applyLabels(haEl, haEffective);
    }
  }
  _updateHancheBilateral();
  _updateGenouBilateral();
  _updateChevBilateral();
  _updateEpauleBilateral();
  _updateCoudeBilateral();
  _updateMainBilateral();
}

function _parsePainZones(){
  var hf = document.getElementById('f-pain-zones');
  if(!hf || !hf.value || hf.value==='[]') { _painZones = []; }
  else { try{ _painZones = JSON.parse(hf.value)||[]; }catch(e){ _painZones=[]; } }
  renderPainZones();
  _updateSideLabels();
}

// Init
init(); // appelle showPage('infos') à la fin → page-infos s'affiche

// Triple garantie — showPage('infos') après la pile JS courante et après load
setTimeout(function(){ showPage('infos'); }, 0);
window.addEventListener('load', function(){ showPage('infos'); _parsePainZones(); });

/* ── Auto-resize tous les textareas ── */
function autoResizeTa(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
// Délégation globale : chaque saisie dans un textarea déclenche le resize
document.addEventListener('input', function(e){
  if(e.target && e.target.tagName === 'TEXTAREA') autoResizeTa(e.target);
});
// Au chargement : resize les textareas déjà remplis (localStorage restore)
window.addEventListener('load', function(){
  document.querySelectorAll('textarea').forEach(function(ta){
    if(ta.value) autoResizeTa(ta);
  });
});

/* ══════════════════════════════════════════════════════
   FAVORIS — Tests Fonctionnels (MS / Rachis / MI)
══════════════════════════════════════════════════════ */
(function(){
  var FAV_KEY = 'r4p-fav-tests';
  var TARGET_PAGES = ['page-fonctionnels','page-fonctionnelsMS','page-fonctionnelsRachis'];
  var _favFilterActive = {}; // { pageId: bool }

  function _loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; }
  }
  function _saveFavs(arr) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch(e) {}
  }
  function _slugify(str) {
    return str.replace(/<[^>]+>/g,'').replace(/[^a-z0-9]/gi,'-').toLowerCase().replace(/-+/g,'-').slice(0,60);
  }

  function _injectStars() {
    var favs = _loadFavs();
    TARGET_PAGES.forEach(function(pageId) {
      var page = document.getElementById(pageId);
      if (!page) return;

      // Barre de filtre (insérée une seule fois)
      if (!page.querySelector('.fav-filter-bar')) {
        var content = page.querySelector('.page-content');
        if (content) {
          var bar = document.createElement('div');
          bar.className = 'fav-filter-bar';
          bar.innerHTML = '<button class="fav-filter-btn" onclick="_favToggleFilter(\''+pageId+'\')">⭐ Favoris</button>'
            + '<span class="fav-filter-count" id="fav-count-'+pageId+'"></span>';
          content.insertBefore(bar, content.firstChild);
        }
      }

      // Étoile sur chaque block-header
      page.querySelectorAll('.block').forEach(function(block) {
        var hdr = block.querySelector('.block-header');
        if (!hdr || hdr.querySelector('.fav-star-btn')) return;
        var key = _slugify(hdr.textContent.trim());
        block.dataset.favKey = key;
        var btn = document.createElement('button');
        btn.className = 'fav-star-btn' + (favs.indexOf(key) !== -1 ? ' active' : '');
        btn.title = 'Ajouter aux favoris';
        btn.textContent = '⭐';
        btn.onclick = function(e) { e.stopPropagation(); _favToggle(key, btn, pageId); };
        hdr.appendChild(btn);
      });

      _updateFavCount(pageId);
    });
  }

  window._favToggle = function(key, btn, pageId) {
    var favs = _loadFavs();
    var idx = favs.indexOf(key);
    if (idx === -1) { favs.push(key); btn.classList.add('active'); }
    else            { favs.splice(idx,1); btn.classList.remove('active'); }
    _saveFavs(favs);
    _updateFavCount(pageId);
    if (_favFilterActive[pageId]) _applyFavFilter(pageId);
  };

  window._favToggleFilter = function(pageId) {
    _favFilterActive[pageId] = !_favFilterActive[pageId];
    var btn = document.querySelector('#'+pageId+' .fav-filter-btn');
    if (btn) btn.classList.toggle('active', _favFilterActive[pageId]);
    _applyFavFilter(pageId);
  };

  function _applyFavFilter(pageId) {
    var page = document.getElementById(pageId);
    if (!page) return;
    var favs = _loadFavs();
    var active = _favFilterActive[pageId];
    page.querySelectorAll('.block').forEach(function(block) {
      if (!active) { block.style.display = ''; return; }
      var key = block.dataset.favKey || '';
      block.style.display = (favs.indexOf(key) !== -1) ? '' : 'none';
    });
  }

  function _updateFavCount(pageId) {
    var page = document.getElementById(pageId);
    var el = document.getElementById('fav-count-'+pageId);
    if (!page || !el) return;
    var favs = _loadFavs();
    var count = 0;
    page.querySelectorAll('.block').forEach(function(b) {
      if (b.dataset.favKey && favs.indexOf(b.dataset.favKey) !== -1) count++;
    });
    el.textContent = count > 0 ? count + ' favori' + (count > 1 ? 's' : '') : '';
  }

  // Init après chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectStars);
  } else {
    _injectStars();
  }
})();

/* ══════════════════════════════════════════════════════
   PLAYLISTS — Tests Fonctionnels (chip-bar)
══════════════════════════════════════════════════════ */
(function(){
  var TARGET_PAGES = ['page-fonctionnels','page-fonctionnelsMS','page-fonctionnelsRachis'];
  var _activePl = {}; // { pageId: 'all'|'favs'|plId }
  var _plStore = {}; // cache mémoire (synchronisé avec Supabase à l'auth)
  var _plLastUid = null; // uid du dernier utilisateur chargé

  // Capture _favToggleFilter avant de l'envelopper
  var _origFavToggle = window._favToggleFilter;

  function _load() { return _plStore; }
  function _save(data) { _plStore = data; }
  function _uid() {
    try { return crypto.randomUUID(); } catch(e) { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){ var r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
  }
  function _getPlaylists(pageId) { return (_load()[pageId] || []); }

  function _plDbLoad(uid) {
    _sbRetry(function(){ return sbB.from('playlists').select('*').eq('user_id', uid); })
      .then(function(res) {
        if (!res || res.error || !res.data) return;
        var store = {};
        res.data.forEach(function(row) {
          var pid = 'page-' + row.page;
          if (!store[pid]) store[pid] = [];
          store[pid].push({ id: row.id, name: row.name, keys: Array.isArray(row.keys) ? row.keys : [] });
        });
        _plStore = store;
        TARGET_PAGES.forEach(function(pageId) {
          var bar = document.querySelector('#'+pageId+' .fav-filter-bar');
          if (bar) _renderBar(pageId);
        });
      });
  }

  function _plDbUpsert(pageId, pl) {
    if (!_plLastUid) return;
    _sbRetry(function(){
      return sbB.from('playlists').upsert({ id: pl.id, user_id: _plLastUid, page: pageId.replace('page-', ''), name: pl.name, keys: pl.keys });
    });
  }

  function _plDbDelete(plId) {
    if (!_plLastUid) return;
    _sbRetry(function(){ return sbB.from('playlists').delete().eq('id', plId); });
  }

  function _renderBar(pageId) {
    var bar = document.querySelector('#'+pageId+' .fav-filter-bar');
    if (!bar) return;
    bar.querySelectorAll('.pl-chip').forEach(function(c){ c.remove(); });

    var pls = _getPlaylists(pageId);
    var active = _activePl[pageId] || 'all';

    // Chip "Tous" — inséré avant le bouton Favoris
    var tousBtn = document.createElement('button');
    tousBtn.className = 'pl-chip' + (active === 'all' ? ' pl-active-all' : '');
    tousBtn.textContent = 'Tous';
    tousBtn.onclick = function(){ _plActivate(pageId, 'all'); };
    bar.insertBefore(tousBtn, bar.firstChild);

    // Synchronise le visuel du bouton Favoris
    var favBtn = bar.querySelector('.fav-filter-btn');
    if (favBtn) favBtn.classList.toggle('active', active === 'favs');

    // Chips des playlists
    pls.forEach(function(pl){
      var isActive = active === pl.id;
      var chip = document.createElement('span');
      chip.className = 'pl-chip' + (isActive ? ' pl-active' : '');

      var nameSpan = document.createElement('span');
      nameSpan.textContent = pl.name;
      nameSpan.style.cursor = 'pointer';
      nameSpan.onclick = function(){ _plActivate(pageId, pl.id); };

      var editBtn = document.createElement('button');
      editBtn.className = 'pl-chip-edit';
      editBtn.title = 'Modifier';
      editBtn.innerHTML = '<svg width="11" height="11" fill="currentColor" viewBox="0 0 348.882 348.882" xmlns="http://www.w3.org/2000/svg"><g><path d="M333.988,11.758l-0.42-0.383C325.538,4.04,315.129,0,304.258,0c-12.187,0-23.888,5.159-32.104,14.153L116.803,184.231c-1.416,1.55-2.49,3.379-3.154,5.37l-18.267,54.762c-2.112,6.331-1.052,13.333,2.835,18.729c3.918,5.438,10.23,8.685,16.886,8.685c0,0,0.001,0,0.001,0c2.879,0,5.693-0.592,8.362-1.76l52.89-23.138c1.923-0.841,3.648-2.076,5.063-3.626L336.771,73.176C352.937,55.479,351.69,27.929,333.988,11.758z M130.381,234.247l10.719-32.134l0.904-0.99l20.316,18.556l-0.904,0.99L130.381,234.247z M314.621,52.943L182.553,197.53l-20.316-18.556L294.305,34.386c2.583-2.828,6.118-4.386,9.954-4.386c3.365,0,6.588,1.252,9.082,3.53l0.419,0.383C319.244,38.922,319.63,47.459,314.621,52.943z"/><path d="M303.85,138.388c-8.284,0-15,6.716-15,15v127.347c0,21.034-17.113,38.147-38.147,38.147H68.904c-21.035,0-38.147-17.113-38.147-38.147V100.413c0-21.034,17.113-38.147,38.147-38.147h131.587c8.284,0,15-6.716,15-15s-6.716-15-15-15H68.904c-37.577,0-68.147,30.571-68.147,68.147v180.321c0,37.576,30.571,68.147,68.147,68.147h181.798c37.576,0,68.147-30.571,68.147-68.147V153.388C318.85,145.104,312.134,138.388,303.85,138.388z"/></g></svg>';
      editBtn.onclick = function(e){ e.stopPropagation(); _plOpenModal(pageId, pl.id); };

      chip.appendChild(nameSpan);
      chip.appendChild(editBtn);
      bar.appendChild(chip);
    });

    // Chip "+ Créer"
    var addBtn = document.createElement('button');
    addBtn.className = 'pl-chip pl-chip-dashed';
    addBtn.textContent = '+ Créer';
    addBtn.onclick = function(){ _plOpenModal(pageId, null); };
    bar.appendChild(addBtn);
  }

  function _plActivate(pageId, id) {
    _activePl[pageId] = id;
    var page = document.getElementById(pageId);
    if (!page) return;
    var favBtn = page.querySelector('.fav-filter-btn');
    var favIsActive = favBtn && favBtn.classList.contains('active');
    if (id === 'all') {
      if (favIsActive) _origFavToggle(pageId);
      page.querySelectorAll('.block').forEach(function(b){ b.style.display = ''; });
    } else {
      if (favIsActive) _origFavToggle(pageId);
      var pls = _getPlaylists(pageId);
      var pl = null;
      for (var i = 0; i < pls.length; i++) { if (pls[i].id === id) { pl = pls[i]; break; } }
      if (!pl) { _activePl[pageId] = 'all'; _renderBar(pageId); return; }
      page.querySelectorAll('.block').forEach(function(b){
        b.style.display = (pl.keys.indexOf(b.dataset.favKey || '') !== -1) ? '' : 'none';
      });
    }
    _renderBar(pageId);
  }

  function _injectModal() {
    if (document.getElementById('pl-modal-overlay')) return;
    var el = document.createElement('div');
    el.className = 'pl-modal-overlay';
    el.id = 'pl-modal-overlay';
    el.innerHTML =
      '<div class="pl-modal">' +
        '<div class="pl-modal-header">' +
          '<h3 id="pl-modal-title">Nouvelle playlist</h3>' +
          '<button class="pl-modal-close" onclick="_plCloseModal()">×</button>' +
        '</div>' +
        '<div class="pl-modal-body">' +
          '<input type="text" id="pl-modal-name" class="pl-name-input" placeholder="Nom de la playlist…">' +
          '<div class="pl-tests-label">Tests à inclure</div>' +
          '<div id="pl-tests-list"></div>' +
        '</div>' +
        '<div class="pl-modal-footer">' +
          '<button class="pl-btn pl-btn-delete" id="pl-btn-delete" style="display:none" onclick="_plDeleteCurrent()">Supprimer</button>' +
          '<button class="pl-btn pl-btn-cancel" onclick="_plCloseModal()">Annuler</button>' +
          '<button class="pl-btn pl-btn-save" onclick="_plSaveCurrent()">Enregistrer</button>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function(e){ if (e.target === el) _plCloseModal(); });
    document.body.appendChild(el);
  }

  var _editCtx = { pageId: null, plId: null };

  window._plOpenModal = function(pageId, plId) {
    _editCtx = { pageId: pageId, plId: plId };
    var overlay = document.getElementById('pl-modal-overlay');
    if (!overlay) return;
    var page = document.getElementById(pageId);
    if (!page) return;

    var pls = _getPlaylists(pageId);
    var pl = null;
    for (var i = 0; i < pls.length; i++) { if (pls[i].id === plId) { pl = pls[i]; break; } }

    var titleEl = document.getElementById('pl-modal-title');
    var nameEl = document.getElementById('pl-modal-name');
    var deleteBtn = document.getElementById('pl-btn-delete');
    if (titleEl) titleEl.textContent = pl ? 'Modifier la playlist' : 'Nouvelle playlist';
    if (nameEl) nameEl.value = pl ? pl.name : '';
    if (deleteBtn) deleteBtn.style.display = pl ? '' : 'none';

    var listEl = document.getElementById('pl-tests-list');
    if (listEl) {
      listEl.innerHTML = '';
      page.querySelectorAll('.block').forEach(function(b){
        var key = b.dataset.favKey;
        if (!key) return;
        var hdr = b.querySelector('.block-header');
        var label = hdr ? hdr.textContent.replace(/⭐/g,'').trim() : key;
        var checked = pl && pl.keys.indexOf(key) !== -1;
        var item = document.createElement('div');
        item.className = 'pl-test-item';
        item.innerHTML = '<input type="checkbox" id="pl-cb-'+key+'" value="'+key+'"'+(checked?' checked':'')+'>'
          + '<label for="pl-cb-'+key+'">'+label+'</label>';
        listEl.appendChild(item);
      });
    }

    overlay.classList.add('open');
    if (nameEl) setTimeout(function(){ nameEl.focus(); }, 50);
  };

  window._plCloseModal = function() {
    var overlay = document.getElementById('pl-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    _editCtx = { pageId: null, plId: null };
  };

  window._plSaveCurrent = function() {
    var pageId = _editCtx.pageId;
    var plId = _editCtx.plId;
    if (!pageId) return;
    var nameEl = document.getElementById('pl-modal-name');
    var name = (nameEl ? nameEl.value.trim() : '') || 'Playlist';
    var keys = [];
    var cbs = document.querySelectorAll('#pl-tests-list input[type="checkbox"]:checked');
    for (var i = 0; i < cbs.length; i++) { keys.push(cbs[i].value); }
    var data = _load();
    if (!data[pageId]) data[pageId] = [];
    var savedPl = null;
    if (plId) {
      for (var j = 0; j < data[pageId].length; j++) {
        if (data[pageId][j].id === plId) {
          data[pageId][j].name = name; data[pageId][j].keys = keys;
          savedPl = data[pageId][j]; break;
        }
      }
    } else {
      savedPl = { id: _uid(), name: name, keys: keys };
      data[pageId].push(savedPl);
    }
    _save(data);
    if (savedPl) _plDbUpsert(pageId, savedPl);
    _plCloseModal();
    _renderBar(pageId);
    if (_activePl[pageId] === plId && plId) _plActivate(pageId, plId);
  };

  window._plDeleteCurrent = function() {
    var pageId = _editCtx.pageId;
    var plId = _editCtx.plId;
    if (!pageId || !plId) return;
    if (!confirm('Supprimer cette playlist ?')) return;
    var data = _load();
    if (data[pageId]) {
      data[pageId] = data[pageId].filter(function(p){ return p.id !== plId; });
    }
    _save(data);
    _plDbDelete(plId);
    var wasActive = _activePl[pageId] === plId;
    _plCloseModal();
    if (wasActive) _plActivate(pageId, 'all');
    else _renderBar(pageId);
  };

  // Wrapper de _favToggleFilter pour synchroniser l'état des playlists
  window._favToggleFilter = function(pageId) {
    _origFavToggle(pageId);
    var favBtn = document.querySelector('#'+pageId+' .fav-filter-btn');
    var favNowActive = favBtn && favBtn.classList.contains('active');
    _activePl[pageId] = favNowActive ? 'favs' : 'all';
    _renderBar(pageId);
  };

  function _init() {
    _injectModal();
    TARGET_PAGES.forEach(function(pageId) {
      var bar = document.querySelector('#'+pageId+' .fav-filter-bar');
      if (!bar) return;
      var favBtn = bar.querySelector('.fav-filter-btn');
      _activePl[pageId] = (favBtn && favBtn.classList.contains('active')) ? 'favs' : 'all';
      _renderBar(pageId);
    });
  }

  // Charge les playlists dès que la session Supabase est réellement établie
  sbB.auth.onAuthStateChange(function(event, session) {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
      var uid = session.user.id;
      if (uid !== _plLastUid) { _plLastUid = uid; _plDbLoad(uid); }
    }
    if (event === 'SIGNED_OUT') { _plLastUid = null; _plStore = {}; }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(_init, 0); });
  } else {
    setTimeout(_init, 0);
  }
})();

/* ══════════════════════════════════════════════════════
   TESTS PERSONNALISÉS — section en bas de chaque page clinique
══════════════════════════════════════════════════════ */
(function(){
  var _CT_PAGES = ['epaule','coude','main','rachis','hanche','genou','pied','lma',
                   'fonctionnels','fonctionnelsMS','fonctionnelsRachis',
                   'rachis-cerv','rachis-lomb'];
  var _ctData = {};

  function _ctIsBilat(){
    var c = ((document.getElementById('f-cote')||{}).value||'').toUpperCase();
    return c !== 'DROIT' && c !== 'GAUCHE';
  }

  function _ctLabels(){
    return _ctIsBilat() ? {a:'Gauche', b:'Droit'} : {a:'Atteint', b:'Sain'};
  }

  function _ctLsiCalc(va, vb){
    var a = parseFloat(va), b = parseFloat(vb);
    if(isNaN(a)||isNaN(b)||b===0) return NaN;
    return _ctIsBilat() ? Math.min(a,b)/Math.max(a,b)*100 : a/b*100;
  }

  function _ctLsiClass(lsi){
    return isNaN(lsi) ? '' : lsi>=90 ? 'lsi-good' : lsi>=75 ? 'lsi-warn' : 'lsi-bad';
  }

  function _ctLsiText(lsi){
    return isNaN(lsi) ? '—' : Math.round(lsi)+'%';
  }

  function _ctSave(pk){
    var hf = document.getElementById('ct-data-'+pk);
    if(hf) hf.value = JSON.stringify(_ctData[pk]||[]);
  }

  function _esc(v){ return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

  function _mkObsZone(pk, idx, t, isComp, lbl){
    var obs = document.createElement('div');
    obs.style.cssText = 'padding:4px 0 8px;border-bottom:1px solid var(--border)';
    var taStyle = 'font-family:inherit;font-size:.78rem;color:var(--text1);border:1px solid var(--border);border-radius:5px;padding:5px 8px;width:100%;min-height:40px;resize:vertical;outline:none;line-height:1.5;background:var(--surface2);box-sizing:border-box';
    var lblStyle = 'font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:3px';
    if(isComp){
      obs.style.display='grid';
      obs.style.gridTemplateColumns='1fr 1fr';
      obs.style.gap='8px';
      [['obsB',lbl.b],['obsA',lbl.a]].forEach(function(pair){
        var field=pair[0], label=pair[1];
        var wrap = document.createElement('div');
        var lb = document.createElement('div');
        lb.style.cssText = lblStyle;
        lb.textContent = label;
        var ta = document.createElement('textarea');
        ta.placeholder = 'Observation '+label+'…';
        ta.style.cssText = taStyle;
        ta.value = t[field]||'';
        ta.addEventListener('input',function(){ _ctUpdate(pk,idx,field,this.value); });
        wrap.appendChild(lb); wrap.appendChild(ta);
        obs.appendChild(wrap);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.placeholder = 'Observation…';
      ta.style.cssText = taStyle;
      ta.value = t.obsA||'';
      ta.addEventListener('input',function(){ _ctUpdate(pk,idx,'obsA',this.value); });
      obs.appendChild(ta);
    }
    return obs;
  }

  function _ctRender(pk){
    var container = document.getElementById('ct-rows-'+pk);
    if(!container) return;
    var data = _ctData[pk]||[];
    var lbl = _ctLabels();
    container.innerHTML = '';

    var perfItems = [], compItems = [];
    data.forEach(function(t,i){ (t.type==='perf' ? perfItems : compItems).push({t:t,i:i}); });

    if(perfItems.length){
      var ph = document.createElement('div');
      ph.className = 'ct-sub-hdr ct-sub-hdr-perf';
      ph.innerHTML = '<span class="sh-left">Performance</span><span>Résultat</span>';
      container.appendChild(ph);
      perfItems.forEach(function(item){
        var t = item.t, idx = item.i;
        var row = document.createElement('div');
        row.className = 'ct-row ct-row-perf';
        row.setAttribute('data-idx', idx);
        row.innerHTML =
          '<input class="ct-name-inp" type="text" placeholder="Nom du test" value="'+_esc(t.name)+'" '+
            'oninput="_ctUpdate(\''+pk+'\','+idx+',\'name\',this.value)">'+
          '<div class="ct-cell"><input class="ct-val-inp" type="number" step="any" placeholder="—" value="'+_esc(t.valA)+'" '+
            'oninput="_ctUpdate(\''+pk+'\','+idx+',\'valA\',this.value)"></div>'+
          '<button class="ct-type-btn" onclick="_ctSetType(\''+pk+'\','+idx+',\'comparison\')" title="Passer en comparaison G/D">⇄</button>'+
          '<button class="ct-del-btn" onclick="_ctRemove(\''+pk+'\','+idx+')" title="Supprimer">×</button>';
        container.appendChild(row);
        container.appendChild(_mkObsZone(pk, idx, t, false, lbl));
      });
    }

    if(compItems.length){
      var ch = document.createElement('div');
      ch.className = 'ct-sub-hdr ct-sub-hdr-comp';
      ch.innerHTML = '<span class="sh-left">Comparaison</span><span>'+lbl.b+'</span><span>'+lbl.a+'</span><span>LSI</span>';
      container.appendChild(ch);
      compItems.forEach(function(item){
        var t = item.t, idx = item.i;
        var lsi = _ctLsiCalc(t.valA, t.valB);
        var row = document.createElement('div');
        row.className = 'ct-row';
        row.setAttribute('data-idx', idx);
        row.innerHTML =
          '<input class="ct-name-inp" type="text" placeholder="Nom du test" value="'+_esc(t.name)+'" '+
            'oninput="_ctUpdate(\''+pk+'\','+idx+',\'name\',this.value)">'+
          '<div class="ct-cell"><input class="ct-val-inp" type="number" step="any" placeholder="—" value="'+_esc(t.valB)+'" '+
            'oninput="_ctUpdate(\''+pk+'\','+idx+',\'valB\',this.value)"></div>'+
          '<div class="ct-cell"><input class="ct-val-inp" type="number" step="any" placeholder="—" value="'+_esc(t.valA)+'" '+
            'oninput="_ctUpdate(\''+pk+'\','+idx+',\'valA\',this.value)"></div>'+
          '<div class="ct-lsi-cell '+_ctLsiClass(lsi)+'">'+_ctLsiText(lsi)+'</div>'+
          '<button class="ct-type-btn" onclick="_ctSetType(\''+pk+'\','+idx+',\'perf\')" title="Passer en performance unique">↑</button>'+
          '<button class="ct-del-btn" onclick="_ctRemove(\''+pk+'\','+idx+')" title="Supprimer">×</button>';
        container.appendChild(row);
        container.appendChild(_mkObsZone(pk, idx, t, true, lbl));
      });
    }
  }

  function _ctUpdateLsiCell(pk, idx){
    var t = (_ctData[pk]||[])[idx];
    if(!t || t.type === 'perf') return;
    var lsi = _ctLsiCalc(t.valA, t.valB);
    var row = document.querySelector('#ct-rows-'+pk+' .ct-row[data-idx="'+idx+'"]');
    if(!row) return;
    var cell = row.querySelector('.ct-lsi-cell');
    if(!cell) return;
    cell.className = 'ct-lsi-cell '+_ctLsiClass(lsi);
    cell.textContent = _ctLsiText(lsi);
  }

  window._ctUpdate = function(pk, idx, field, val){
    if(!_ctData[pk]) return;
    _ctData[pk][idx][field] = val;
    _ctSave(pk);
    if(field === 'valA' || field === 'valB') _ctUpdateLsiCell(pk, idx);
    _bilanModified = true;
  };

  window._ctSetType = function(pk, idx, type){
    if(!_ctData[pk] || !_ctData[pk][idx]) return;
    _ctData[pk][idx].type = type;
    if(type === 'perf') { _ctData[pk][idx].valB = ''; }
    _ctSave(pk);
    _ctRender(pk);
    _bilanModified = true;
  };

  window._ctAdd = function(pk, type){
    if(!_ctData[pk]) _ctData[pk] = [];
    _ctData[pk].push({name:'', valA:'', valB:'', type: type||'comparison'});
    _ctSave(pk);
    _ctRender(pk);
    _bilanModified = true;
    var lastIdx = (_ctData[pk]||[]).length - 1;
    var last = lastIdx >= 0 ? document.querySelector('#ct-rows-'+pk+' .ct-row[data-idx="'+lastIdx+'"]') : null;
    if(last){ var inp = last.querySelector('.ct-name-inp'); if(inp) inp.focus(); }
  };

  window._ctRemove = function(pk, idx){
    if(!_ctData[pk]) return;
    _ctData[pk].splice(idx,1);
    _ctSave(pk);
    _ctRender(pk);
    _bilanModified = true;
  };

  // Rebuild labels when side changes
  window._ctRefreshLabels = function(){
    _CT_PAGES.forEach(function(pk){ _ctRender(pk); });
  };

  function _ctInit(){
    _CT_PAGES.forEach(function(pk){
      _ctData[pk] = [];
      var page = document.getElementById('page-'+pk);
      if(!page) return;
      var pc = page.querySelector('.page-content');
      if(!pc) return;

      var hf = document.createElement('input');
      hf.type = 'hidden'; hf.id = 'ct-data-'+pk; hf.value = '[]';
      pc.appendChild(hf);

      var lbl = _ctLabels();
      var _FUNC_PAGES = ['fonctionnels','fonctionnelsMS','fonctionnelsRachis'];
      var hdrClass = _FUNC_PAGES.indexOf(pk) !== -1 ? 'block-header' : 'block-header grey';
      var sec = document.createElement('div');
      sec.className = 'block';
      sec.innerHTML =
        '<div class="'+hdrClass+'">'+
          'Tests personnalisés'+
          '<div style="display:flex;gap:5px;margin-left:auto">'+
            '<button class="ct-add-btn" onclick="_ctAdd(\''+pk+'\',\'comparison\')">+ Comparaison</button>'+
            '<button class="ct-add-btn" onclick="_ctAdd(\''+pk+'\',\'perf\')">+ Performance</button>'+
          '</div>'+
        '</div>'+
        '<div style="padding:14px 16px">'+
          '<div id="ct-rows-'+pk+'"></div>'+
        '</div>';
      var conclArea = pc.querySelector('.concl-area');
      var conclBlock = conclArea && (conclArea.closest('.block') || conclArea);
      if(conclBlock) pc.insertBefore(sec, conclBlock);
      else pc.appendChild(sec);
    });

    // Refresh labels on côté change
    var coteEl = document.getElementById('f-cote');
    if(coteEl) coteEl.addEventListener('change', window._ctRefreshLabels);
  }

  window._ctRestoreAll = function(){
    _CT_PAGES.forEach(function(pk){
      var hf = document.getElementById('ct-data-'+pk);
      if(!hf) return;
      try{
        var arr = JSON.parse(hf.value)||[];
        arr.forEach(function(t){ if(!t.type) t.type='comparison'; });
        _ctData[pk] = arr;
      }catch(e){ _ctData[pk]=[]; }
      _ctRender(pk);
    });
  };

  window._ctBuildCRHtml = function(){
    var sections = [];
    var PAGE_LABELS = {
      epaule:'Épaule', rachis:'Rachis', hanche:'Hanche', genou:'Genou',
      pied:'Pied', lma:'LMA', fonctionnels:'Tests Fonctionnels MI',
      fonctionnelsMS:'Tests Fonctionnels MS', fonctionnelsRachis:'Tests Fonctionnels Rachis'
    };
    var bilat = _ctIsBilat();
    var lbl = _ctLabels();
    _CT_PAGES.forEach(function(pk){
      var data = (_ctData[pk]||[]).filter(function(t){ return t.name||t.valA||t.valB; });
      if(!data.length) return;
      var html = '<table style="width:100%;border-collapse:collapse;font-size:.82rem">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
        '<th style="text-align:left;padding:3px 8px;font-weight:600">Test</th>'+
        '<th style="text-align:center;padding:3px 8px;font-weight:600">'+lbl.a+'</th>'+
        '<th style="text-align:center;padding:3px 8px;font-weight:600">'+lbl.b+'</th>'+
        '<th style="text-align:center;padding:3px 8px;font-weight:600">'+(bilat?'Sym.':'LSI')+'</th>'+
        '</tr></thead><tbody>';
      data.forEach(function(t){
        if(t.type === 'perf'){
          html += '<tr style="border-bottom:1px solid var(--border)">'+
            '<td style="padding:3px 8px">'+(t.name||'—')+'</td>'+
            '<td style="text-align:center;padding:3px 8px;font-weight:600">'+(t.valA!==''?t.valA:'—')+'</td>'+
            '<td style="text-align:center;padding:3px 8px;color:var(--text3);font-size:.75rem" colspan="2">Performance unique</td>'+
            '</tr>';
        } else {
          var lsi = _ctLsiCalc(t.valA, t.valB);
          var clr = isNaN(lsi)?'':lsi>=90?'color:#16a34a':lsi>=75?'color:#d97706':'color:#dc2626';
          html += '<tr style="border-bottom:1px solid var(--border)">'+
            '<td style="padding:3px 8px">'+(t.name||'—')+'</td>'+
            '<td style="text-align:center;padding:3px 8px">'+(t.valA!==''?t.valA:'—')+'</td>'+
            '<td style="text-align:center;padding:3px 8px">'+(t.valB!==''?t.valB:'—')+'</td>'+
            '<td style="text-align:center;padding:3px 8px;font-weight:700;'+clr+'">'+(isNaN(lsi)?'—':Math.round(lsi)+'%')+'</td>'+
            '</tr>';
        }
      });
      html += '</tbody></table>';
      sections.push({title:'Tests personnalisés — '+(PAGE_LABELS[pk]||pk), html:html});
    });
    return sections;
  };

  // Appelé au démarrage d'un bilan de suivi : reporte les noms, efface les valeurs
  window._ctInitSuivi = function(prevDonnees){
    if(!prevDonnees) return;
    _CT_PAGES.forEach(function(pk){
      var raw = prevDonnees['ct-data-'+pk];
      if(!raw) return;
      try{
        var prev = JSON.parse(raw)||[];
        var carried = prev.filter(function(t){ return t.name; }).map(function(t){
          return {name: t.name, valA: '', valB: '', type: t.type||'comparison'};
        });
        if(!carried.length) return;
        _ctData[pk] = carried;
        _ctSave(pk);
        _ctRender(pk);
      }catch(e){}
    });
  };

  // Construit le html des tests personnalisés d'une page pour le CR,
  // intégré directement dans la section correspondante (grisé suivi inclus).
  window._ctBuildSectionHtml = function(pk){
    var data = (_ctData[pk]||[]).filter(function(t){ return t.name||t.valA||t.valB; });
    if(!data.length) return '';
    var bilat = _ctIsBilat();
    var lbl = _ctLabels();
    // Suivi grisé : récupère les valeurs du bilan précédent
    var prevByName = {};
    var isSuiviMode = typeof _crInSuiviMode === 'function' && _crInSuiviMode();
    if(isSuiviMode){
      var rawPrev = '';
      if(_bilanIsSuivi && _suiviSnapshot){
        rawPrev = _suiviSnapshot['ct-data-'+pk] || '';
      } else if(_allBilans && _allBilans.length >= 2){
        // Fusion des bilans antérieurs : couvre le cas où _allBilans[1] est lui-même un suivi vide
        rawPrev = (_buildMergedDonnees(_allBilans.slice(1)) || {})['ct-data-'+pk] || '';
      }
      if(rawPrev){ try{ (JSON.parse(rawPrev)||[]).forEach(function(t){ if(t.name) prevByName[t.name]=t; }); }catch(e){} }
    }
    var html = '<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:6px">'+
      '<div style="font-size:.7rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Tests personnalisés</div>';
    data.forEach(function(t){
      var valStr = '';
      var tag = '', tagCls = '';
      if(t.type === 'perf'){
        valStr = t.valA !== '' ? String(t.valA) : '—';
      } else {
        var lsi = _ctLsiCalc(t.valA, t.valB);
        valStr = lbl.a+'='+(t.valA!==''?t.valA:'—')+'   '+lbl.b+'='+(t.valB!==''?t.valB:'—');
        if(!isNaN(lsi)){
          valStr += '   '+(bilat?'Sym.':'LSI')+'='+Math.round(lsi)+'%';
          tag = Math.round(lsi)+'%';
          tagCls = lsi>=90?'good':lsi>=75?'warn':'bad';
        }
      }
      var cls = '', dateBadge = '';
      if(isSuiviMode && t.name){
        var prev = prevByName[t.name];
        if(prev){
          var valAEq = String(t.valA||'') === String(prev.valA||'');
          var valBEq = t.type === 'perf' || String(t.valB||'') === String(prev.valB||'');
          cls = (valAEq && valBEq) ? ' cr-item--carried' : ' cr-item--fresh';
        } else {
          cls = ' cr-item--fresh';
        }
        if(cls === ' cr-item--carried'){
          // Cherche le bilan d'origine (le plus récent bilan précédent avec une valeur non-vide)
          var startIdx = (_bilanIsSuivi && _suiviSnapshot) ? 0 : 1;
          for(var _oi2=startIdx; _oi2<(_allBilans||[]).length; _oi2++){
            var _rawB = ((_allBilans[_oi2].donnees)||{})['ct-data-'+pk]||'';
            if(!_rawB) continue;
            try{
              var _tb = JSON.parse(_rawB)||[];
              var _found = false;
              for(var _tj=0;_tj<_tb.length;_tj++){
                if(_tb[_tj].name===t.name && (_tb[_tj].valA!==''||_tb[_tj].valB!=='')){
                  _found=true; break;
                }
              }
              if(_found){
                var _od = (_allBilans[_oi2].date||'').slice(0,10);
                if(_od.length>=10) dateBadge='<span class="cr-date-badge">'+_od.slice(8,10)+'/'+_od.slice(5,7)+'</span>';
                break;
              }
            }catch(e){}
          }
        }
      }
      var tagHtml = tag ? '<span class="cr-tag '+tagCls+'">'+tag+'</span>' : '';
      html += '<div class="cr-item'+cls+'">'+
        '<span class="cr-key">'+_esc(t.name||'—')+'</span>'+
        '<span class="cr-val">'+valStr+'</span>'+
        tagHtml+dateBadge+'</div>';
    });
    html += '</div>';
    return html;
  };

  // Injecte dans _ctData les noms de tests manquants depuis les autres bilans
  // (valeurs vides). Utilisé lors de l'édition/consultation d'un bilan isolé
  // pour que tous les tests nommés dans l'historique restent visibles.
  window._ctMergeNamesFromAllBilans = function(allBilans){
    if(!allBilans || !allBilans.length) return;
    _CT_PAGES.forEach(function(pk){
      var key = 'ct-data-' + pk;
      var cur = _ctData[pk] || [];
      var curByName = {};
      cur.forEach(function(t){ if(t.name) curByName[t.name] = true; });
      var added = false;
      // Parcours oldest→newest pour respecter l'ordre d'insertion des tests
      allBilans.slice().reverse().forEach(function(b){
        var raw = (b.donnees||{})[key];
        if(!raw) return;
        try{
          (JSON.parse(raw)||[]).forEach(function(t){
            if(t.name && !curByName[t.name]){
              curByName[t.name] = true;
              cur.push({name:t.name, valA:'', valB:'', type:t.type||'comparison'});
              added = true;
            }
          });
        }catch(e){}
      });
      if(added){
        _ctData[pk] = cur;
        _ctSave(pk);
        _ctRender(pk);
      }
    });
  };

  window._CT_PAGES = _CT_PAGES;
  window.addEventListener('load', _ctInit);
})();

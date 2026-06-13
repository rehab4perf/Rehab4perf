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
    'Arm Squeeze Test <span style="font-size:.68rem;color:var(--text3);font-weight:400;display:block">Compression du tiers moyen du bras → Douleur = origine épaule</span>',
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
  'tb-ep-irrit-g':{type:'ortho',items:['Arm Squeeze Test','ULNT 1 (Nerf médian)','ULNT 2 (Nerf médian)','ULNT 3 (Nerf radial)','ULNT 4 (Nerf ulnaire)']},
  'tb-ep-irrit-d':{type:'ortho',items:['Arm Squeeze Test','ULNT 1 (Nerf médian)','ULNT 2 (Nerf médian)','ULNT 3 (Nerf radial)','ULNT 4 (Nerf ulnaire)']},
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
  'tb-ha-global':{type:'ortho',items:['HAGOS (questionnaire - noter score %)','Fulcrum test','Squeeze test 0° (EVA > 6 ?)']},
  'tb-ha-add':  {type:'ortho',items:['Squeeze test 45°','Étirement ADD']},
  'tb-ha-pubis':{type:'ortho',items:['Patellar pubic percussion test','Pubis stress test']},
  'tb-ha-flech':{type:'ortho',items:['Contraction résistée Thomas','Étirement fléchisseurs']},
  'tb-ha-inguinal':{type:'ortho',items:['Break test abdos - droit (CE+CI) + obliques','Transverse Valsalva + toux']},
  'tb-ha-hanche':{type:'ortho',items:['BKFO','FADIR <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">FAI</span>','FADIR + extension lombaire (modulation ?)','FADIR + Compression','FADIR + Distraction','Third test <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Labrum</span>','FABER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">SIA / Coxarthrose</span>','AB HEER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Instabilité post.</span>','Test appréhension antérieur <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Micro-instabilité</span>','Test de OBER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">TFL / BIT</span>','Test de FADER-R <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">GTPS</span>']},
  // Hanche — variantes bilatérales
  'tb-ha-global-g':{type:'ortho',items:['HAGOS (questionnaire - noter score %)','Fulcrum test','Squeeze test 0° (EVA > 6 ?)']},
  'tb-ha-global-d':{type:'ortho',items:['HAGOS (questionnaire - noter score %)','Fulcrum test','Squeeze test 0° (EVA > 6 ?)']},
  'tb-ha-add-g':   {type:'ortho',items:['Squeeze test 45°','Étirement ADD']},
  'tb-ha-add-d':   {type:'ortho',items:['Squeeze test 45°','Étirement ADD']},
  'tb-ha-pubis-g': {type:'ortho',items:['Patellar pubic percussion test','Pubis stress test']},
  'tb-ha-pubis-d': {type:'ortho',items:['Patellar pubic percussion test','Pubis stress test']},
  'tb-ha-flech-g': {type:'ortho',items:['Contraction résistée Thomas','Étirement fléchisseurs']},
  'tb-ha-flech-d': {type:'ortho',items:['Contraction résistée Thomas','Étirement fléchisseurs']},
  'tb-ha-inguinal-g':{type:'ortho',items:['Break test abdos - droit (CE+CI) + obliques','Transverse Valsalva + toux']},
  'tb-ha-inguinal-d':{type:'ortho',items:['Break test abdos - droit (CE+CI) + obliques','Transverse Valsalva + toux']},
  'tb-ha-hanche-g':{type:'ortho',items:['BKFO','FADIR <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">FAI</span>','FADIR + extension lombaire (modulation ?)','FADIR + Compression','FADIR + Distraction','Third test <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Labrum</span>','FABER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">SIA / Coxarthrose</span>','AB HEER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Instabilité post.</span>','Test appréhension antérieur <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Micro-instabilité</span>','Test de OBER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">TFL / BIT</span>','Test de FADER-R <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">GTPS</span>']},
  'tb-ha-hanche-d':{type:'ortho',items:['BKFO','FADIR <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">FAI</span>','FADIR + extension lombaire (modulation ?)','FADIR + Compression','FADIR + Distraction','Third test <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Labrum</span>','FABER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">SIA / Coxarthrose</span>','AB HEER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Instabilité post.</span>','Test appréhension antérieur <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">Micro-instabilité</span>','Test de OBER <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">TFL / BIT</span>','Test de FADER-R <span style="font-size:.68rem;background:#EBF3FF;color:var(--accent);padding:1px 5px;border-radius:4px;font-weight:600;margin-left:4px">GTPS</span>']},

  'tb-ge-global': {type:'ortho',items:['Signe du glaçon (épanchement)','Mobilisation flexion + extension']},
  'tb-ge-global-g':{type:'ortho',items:['Signe du glaçon (épanchement)','Mobilisation flexion + extension']},
  'tb-ge-global-d':{type:'ortho',items:['Signe du glaçon (épanchement)','Mobilisation flexion + extension']},
  'tb-ge-lig':    {type:'ortho',items:['Varus 20°/30°','Varus 0°','Valgus 20°/30°','Valgus 0°']},
  'tb-ge-lig-g':  {type:'ortho',items:['Varus 20°/30°','Varus 0°','Valgus 20°/30°','Valgus 0°']},
  'tb-ge-lig-d':  {type:'ortho',items:['Varus 20°/30°','Varus 0°','Valgus 20°/30°','Valgus 0°']},
  'tb-ge-lca':    {type:'ortho',items:['Lachman','Test du tiroir antérieur','Test de Lelli']},
  'tb-ge-lca-g':  {type:'ortho',items:['Lachman','Test du tiroir antérieur','Test de Lelli']},
  'tb-ge-lca-d':  {type:'ortho',items:['Lachman','Test du tiroir antérieur','Test de Lelli']},
  'tb-ge-men':    {type:'ortho',items:['Test de Oudart','Appley','Judet Genety','Thessaly']},
  'tb-ge-men-g':  {type:'ortho',items:['Test de Oudart','Appley','Judet Genety','Thessaly']},
  'tb-ge-men-d':  {type:'ortho',items:['Test de Oudart','Appley','Judet Genety','Thessaly']},
  'tb-ge-rot':    {type:'ortho',items:['Engagement rotulien','Test de Smillie','Accroupissement']},
  'tb-ge-rot-g':  {type:'ortho',items:['Engagement rotulien','Test de Smillie','Accroupissement']},
  'tb-ge-rot-d':  {type:'ortho',items:['Engagement rotulien','Test de Smillie','Accroupissement']},
  'tb-ge-sbit':   {type:'ortho',items:['Test de Renne','Test de Noble']},
  'tb-ge-sbit-g': {type:'ortho',items:['Test de Renne','Test de Noble']},
  'tb-ge-sbit-d': {type:'ortho',items:['Test de Renne','Test de Noble']},
  'tb-ge-plicae': {type:'ortho',items:['Hugston Plicae Test']},
  'tb-ge-plicae-g':{type:'ortho',items:['Hugston Plicae Test']},
  'tb-ge-plicae-d':{type:'ortho',items:['Hugston Plicae Test']},
  'tb-ge-ext':    {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ge-ext-g':  {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ge-ext-d':  {type:'fonc',items:['Extension passive','Extension active sur table','Extension active en charge'],opts:['Validé','Pas validé','N/A']},
  'tb-ge-knee-d':{type:'ortho',items:['Break test Quadriceps','Break test Ischio-jambiers']},
  'tb-ge-knee-g':{type:'ortho',items:['Break test Quadriceps','Break test Ischio-jambiers']},
  'tb-ge-hip-d': {type:'ortho',items:['Break test ABD hanche','Break test ADD hanche']},
  'tb-ge-hip-g': {type:'ortho',items:['Break test ABD hanche','Break test ADD hanche']},
  'tb-ra-force-d':{type:'ortho',items:['Break test Abdominaux (droits CE+CI)','Break test Obliques','Break test Extenseurs rachis']},
  'tb-ra-force-g':{type:'ortho',items:['Break test Abdominaux (droits CE+CI)','Break test Obliques','Break test Extenseurs rachis']},
  'tb-ra-transverse':{type:'ortho',items:['Test du transverse (toux + valsalva)']},
  'tb-ha-force-d':{type:'ortho',items:['Break test Adducteurs','Break test Abdominaux (CE+CI + obliques)','Break test Fléchisseurs hanche','Break test Abduction hanche','Break test Rotation interne hanche','Break test Rotation externe hanche']},
  'tb-ha-force-g':{type:'ortho',items:['Break test Adducteurs','Break test Abdominaux (CE+CI + obliques)','Break test Fléchisseurs hanche','Break test Abduction hanche','Break test Rotation interne hanche','Break test Rotation externe hanche']},
  'tb-pi-global':{type:'ortho',items:['Liberté articulaire globale','Flexion plantaire','Flexion dorsale']},
  'tb-pi-global-g':{type:'ortho',items:['Liberté articulaire globale','Flexion plantaire','Flexion dorsale']},
  'tb-pi-global-d':{type:'ortho',items:['Liberté articulaire globale','Flexion plantaire','Flexion dorsale']},
  'tb-pi-tt':   {type:'ortho',items:['Reverse antéro-latéral drawer test','Talar tilt test','Cisaillement']},
  'tb-pi-tt-g': {type:'ortho',items:['Reverse antéro-latéral drawer test','Talar tilt test','Cisaillement']},
  'tb-pi-tt-d': {type:'ortho',items:['Reverse antéro-latéral drawer test','Talar tilt test','Cisaillement']},
  'tb-pi-synd': {type:'ortho',items:['Kleiger','Fibular translation test','Tiroir talien transversal','Squeeze test']},
  'tb-pi-synd-g':{type:'ortho',items:['Kleiger','Fibular translation test','Tiroir talien transversal','Squeeze test']},
  'tb-pi-synd-d':{type:'ortho',items:['Kleiger','Fibular translation test','Tiroir talien transversal','Squeeze test']},
  'tb-pi-conf': {type:'ortho',items:['Grinding','Impaction','Excentrique LFH','Molloy test']},
  'tb-pi-conf-g':{type:'ortho',items:['Grinding','Impaction','Excentrique LFH','Molloy test']},
  'tb-pi-conf-d':{type:'ortho',items:['Grinding','Impaction','Excentrique LFH','Molloy test']},
  'tb-pi-st':   {type:'ortho',items:['Varus / Valgus en flexion dorsale','Cisaillement en flexion dorsale']},
  'tb-pi-st-g': {type:'ortho',items:['Varus / Valgus en flexion dorsale','Cisaillement en flexion dorsale']},
  'tb-pi-st-d': {type:'ortho',items:['Varus / Valgus en flexion dorsale','Cisaillement en flexion dorsale']},
  'tb-pi-chopart':{type:'ortho',items:['Mobilisation Chopart','Neutral Heel Lateral Push Test']},
  'tb-pi-chopart-g':{type:'ortho',items:['Mobilisation Chopart','Neutral Heel Lateral Push Test']},
  'tb-pi-chopart-d':{type:'ortho',items:['Mobilisation Chopart','Neutral Heel Lateral Push Test']},
  'tb-pi-fonc': {type:'ortho',items:['Course interne mollet','Navicular Drop Test (mm)','Avant-pied - équilibre pointes de pied (step)','Médio-pied - équilibre foot bridge','1ère ligne - montée pointes + cale 30° sous hallux','Équilibre classique global (yeux ouverts / yeux fermés)']},
  'tb-pi-fonc-g':{type:'ortho',items:['Course interne mollet','Navicular Drop Test (mm)','Avant-pied - équilibre pointes de pied (step)','Médio-pied - équilibre foot bridge','1ère ligne - montée pointes + cale 30° sous hallux','Équilibre classique global (yeux ouverts / yeux fermés)']},
  'tb-pi-fonc-d':{type:'ortho',items:['Course interne mollet','Navicular Drop Test (mm)','Avant-pied - équilibre pointes de pied (step)','Médio-pied - équilibre foot bridge','1ère ligne - montée pointes + cale 30° sous hallux','Équilibre classique global (yeux ouverts / yeux fermés)']},
  'tb-pi-force-ca':{type:'ortho',items:['Flexion plantaire','Flexion dorsale','Inversion','Éversion','Break test Long Fléchisseur de l\'Hallux (LFH)']},
  'tb-pi-force-cs':{type:'ortho',items:['Flexion plantaire','Flexion dorsale','Inversion','Éversion','Break test Long Fléchisseur de l\'Hallux (LFH)']},

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
  // Pied/Cheville — Droit
  'rom-pi-d-fdgt': {norm:20, max:35, label:'Flex. dorsale (g. tendu) D'},
  'rom-pi-d-fdgf': {norm:30, max:45, label:'Flex. dorsale (g. fléchi) D'},
  'rom-pi-d-fp':   {norm:50, max:65, label:'Flex. plantaire D'},
  'rom-pi-d-inv':  {norm:35, max:55, label:'Inversion D'},
  'rom-pi-d-ev':   {norm:15, max:30, label:'Éversion D'},
  // Pied/Cheville — Gauche
  'rom-pi-g-fdgt': {norm:20, max:35, label:'Flex. dorsale (g. tendu) G'},
  'rom-pi-g-fdgf': {norm:30, max:45, label:'Flex. dorsale (g. fléchi) G'},
  'rom-pi-g-fp':   {norm:50, max:65, label:'Flex. plantaire G'},
  'rom-pi-g-inv':  {norm:35, max:55, label:'Inversion G'},
  'rom-pi-g-ev':   {norm:15, max:30, label:'Éversion G'},
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
  };
  var LOMB_EXTRA_MOB = ['Glissement D', 'Glissement G'];
  ['cerv','thor','lomb'].forEach(function(seg) {
    var grid = document.getElementById('mob-' + seg);
    if (!grid) return;
    grid.className = ''; // retire mobility-grid (grille 6 colonnes)
    var items = seg === 'lomb' ? MOB.concat(LOMB_EXTRA_MOB) : MOB;
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
var _bilanUid       = null;
var _bilanModified  = false;   // true dès qu'une saisie est faite depuis le dernier save/load
var _bilanHistoMode = false;   // true quand on consulte/édite un bilan historique (non-latest)
var _suppressDirty  = false;   // true pendant _deserializeBilan pour ne pas polluer le flag
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
    if(btn){ btn.classList.add('no-patient'); btn.textContent = '💾 Sauvegarder le bilan'; }
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
  if(btn)    btn.textContent = '💾 Mettre à jour ce bilan';
}

function _exitHistoMode(){
  _bilanHistoMode = false;
  var banner = document.getElementById('histo-mode-banner');
  var btn    = document.getElementById('bilan-save-btn');
  if(banner) banner.classList.remove('active');
  if(btn && _bilanPatient) btn.textContent = '💾 Sauvegarder le bilan';
}

/* Bouton "↩ Revenir au bilan actuel" — recharge le bilan le plus récent */
function exitHistoMode(){
  if(_bilanModified && !confirm('Quitter le mode consultation ? Les modifications non sauvegardées de ce bilan seront perdues.')) return;
  _exitHistoMode();
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
    document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
    if(_allBilans.length >= 2){
      _prevDonnees = _allBilans[1].donnees || {};
      _renderDeltas(_prevDonnees);
    } else {
      _prevDonnees = null;
    }
    showToast('↩ Retour au bilan du ' + _isoToReadable(latest.date ? latest.date.split('T')[0] : ''));
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
  try{ calcGIRD(); ['ep-trap','ep-dent','ep-rl1','ep-rl2','ep-abd','ep-bht'].forEach(calcEpForce); }catch(ex){}
  try{ updateBadges(); _initAllRomBars(); }catch(ex){}
  // Éléments non couverts par les fonctions ci-dessus
  try{ var hl=document.getElementById('hdr-lma'); if(hl) hl.textContent='—'; }catch(ex){}
  _suppressDirty = false;
  _bilanModified = false;
  _refreshCRIfVisible();
}

function _resetAndLoadPatient(p){
  _exitHistoMode();
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
      if(btn){ btn.disabled=false; btn.textContent='💾 Sauvegarder le bilan'; }
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
      // '' = non renseigné → ne pas écraser une valeur antérieure
      // false (checkbox) = valeur explicite → on garde
      if(v !== undefined && v !== null && v !== ''){
        merged[k] = v;
      }
    });
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
  {id:'ep-rl1-ca',      label:'RL1 (côté atteint)',           unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl1-cs',      label:'RL1 (côté sain)',              unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl2-ca',      label:'RL2 (côté atteint)',           unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-rl2-cs',      label:'RL2 (côté sain)',              unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-abd-ca',      label:'Abducteurs (atteint)',         unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-abd-cs',      label:'Abducteurs (sain)',            unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-bht-ca',      label:'BHT (côté atteint)',           unit:'N',   dir:'up',   cat:'Épaule — Force'},
  {id:'ep-bht-cs',      label:'BHT (côté sain)',              unit:'N',   dir:'up',   cat:'Épaule — Force'},
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
  {cat:'Épaule — Force', title:'RL1 — Atteint vs Sain', type:'dual', idA:'ep-rl1-ca', idB:'ep-rl1-cs', unit:'N', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'RL2 — Atteint vs Sain', type:'dual', idA:'ep-rl2-ca', idB:'ep-rl2-cs', unit:'N', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'Abducteurs — Atteint vs Sain', type:'dual', idA:'ep-abd-ca', idB:'ep-abd-cs', unit:'N', dir:'up', labelA:'Atteint', labelB:'Sain'},
  {cat:'Épaule — Force', title:'BHT — Atteint vs Sain', type:'dual', idA:'ep-bht-ca', idB:'ep-bht-cs', unit:'N', dir:'up', labelA:'Atteint', labelB:'Sain'},
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
  var html='<defs><linearGradient id="gd'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--red)" stop-opacity="0.18"/><stop offset="100%" stop-color="var(--red)" stop-opacity="0.02"/></linearGradient></defs>';
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
      var valsA=bilansAsc.map(function(b){var d=b.donnees||{};return grp.computeA?grp.computeA(d):parseFloat(d[grp.idA]||'');});
      var validA=valsA.filter(function(v){return !isNaN(v);});
      // Pour les graphiques dual (Atteint vs Sain), les deux côtés doivent avoir ≥2 valeurs
      if(grp.type==='dual'){
        var valsB_check=bilansAsc.map(function(b){var d=b.donnees||{};return grp.computeB?grp.computeB(d):parseFloat(d[grp.idB]||'');});
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
        var valsB=bilansAsc.map(function(b){var d=b.donnees||{};return grp.computeB?grp.computeB(d):parseFloat(d[grp.idB]||'');});
        valsB.forEach(function(v){if(!isNaN(v)&&isNaN(firstB_val))firstB_val=v;});
        valsB.slice().reverse().forEach(function(v){if(!isNaN(v)&&isNaN(lastB_val))lastB_val=v;});
        if(!isNaN(lastA) && !isNaN(lastB_val) && Math.max(lastA,lastB_val)>0){
          var lsiVal=Math.round(Math.min(lastA,lastB_val)/Math.max(lastA,lastB_val)*100);
          var lsiCls=lsiVal>=90?'evo-pos':lsiVal>=75?'evo-neutral':'evo-neg';
          lsiHtml='<span class="evo-kpi '+lsiCls+'">LSI '+lsiVal+'%</span>';
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
    + '.doc-logo{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}'
    + '.doc-logo .r{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em}'
    + '.doc-logo .e{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#fff;margin:0 .05em 0 .01em;line-height:0}'
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
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Poppins:wght@800&display=swap" rel="stylesheet">'
    + '<title>Suivi Évolution — '+(patient||'Patient')+'</title>'
    + '<style>'+css+'</style></head><body><div class="page-wrap">'
    // Header
    + '<div class="doc-header"><div class="doc-logo"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></div>'
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
  try{ calcRachisStat(); calcLNF(); calcSorensen(); calcPDSLRT(); }catch(ex){}
  try{ calcPlioq2(); calcSEBT(); calcUQYBT(); updateBadges(); }catch(ex){}
  try{ _initAllRomBars(); }catch(ex){}
  try{ calcGIRD(); ['ep-trap','ep-dent','ep-rl1','ep-rl2','ep-abd','ep-bht'].forEach(calcEpForce); }catch(ex){}
  _parsePainZones();
  _suppressDirty = false;
  _bilanModified = false;
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

  /* ── Mode consultation : on patche le bilan historique à sa date originale ── */
  if(_bilanHistoMode && _currentBilanId){
    _sbRetry(function(){ return sbB.from('bilans').update({donnees:donnees}).eq('id', _currentBilanId).select().single(); })
      .then(function(res){
        btn.disabled = false;
        if(res.error){ btn.textContent='💾 Mettre à jour ce bilan'; alert('Erreur : '+res.error.message); return; }
        _bilanModified = false;
        _syncBilanDatesNotes();
        btn.textContent = '✓ Bilan mis à jour !';
        setTimeout(function(){ btn.textContent='💾 Mettre à jour ce bilan'; }, 2500);
        // Rafraîchir _allBilans
        sbB.from('bilans').select('*').eq('patient_id',_bilanPatient.id)
          .order('date',{ascending:false}).limit(50)
          .then(function(r2){
            if(!r2.error && r2.data && r2.data.length){
              _allBilans = r2.data;
              _renderEvolutionPage();
            }
          });
      }).catch(function(err){
        btn.disabled = false;
        btn.textContent = '💾 Mettre à jour ce bilan';
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
        if(res.error){ btn.textContent='💾 Sauvegarder le bilan'; alert('Erreur : '+res.error.message); return; }
        _currentBilanId   = res.data.id;
        _currentBilanDate = res.data.date ? res.data.date.split('T')[0] : today;
        _bilanModified = false;
        _syncBilanDatesNotes();
        btn.textContent = isNew ? '✓ Nouveau bilan enregistré !' : '✓ Sauvegardé !';
        setTimeout(function(){ btn.textContent='💾 Sauvegarder le bilan'; }, 2500);
        // Rafraîchir les données d'évolution après sauvegarde
        sbB.from('bilans').select('*').eq('patient_id',_bilanPatient.id)
          .order('date',{ascending:false}).limit(50)
          .then(function(r2){
            if(!r2.error && r2.data && r2.data.length){
              _allBilans = r2.data;
              _prevDonnees = r2.data.length >= 2 ? (r2.data[1].donnees||{}) : null;
              document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });
              if(_prevDonnees) _renderDeltas(_prevDonnees);
              _renderEvolutionPage();
            }
          });
      });
    }).catch(function(err){
      btn.disabled = false;
      btn.textContent = '💾 Sauvegarder le bilan';
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
          +'<button class="histo-item-edit" onclick="_startEditBilanDate(\''+b.id+'\',\''+isoDate+'\')" title="Modifier la date">✏️</button>'
          +'<button class="histo-item-load" onclick="loadBilan(\''+b.id+'\')">'+(isCurrent?'Rechargé':'Charger')+'</button>'
          +'<button class="histo-item-del" onclick="deleteBilan(\''+b.id+'\',\''+dateStr+'\','+(isInitial?'true':'false')+',event)" title="Supprimer ce bilan">🗑</button>'
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
    _deserializeBilan(res.data.donnees||{});
    closeHistoModal();
    // Entrer en mode consultation (sauvegarde = patch à la date originale)
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
  var lastDate = _allBilans[0].date ? _allBilans[0].date.split('T')[0] : '';
  var lastLabel = lastDate ? _isoToReadable(lastDate) : 'précédent';
  if(!confirm(
    'Créer un bilan de suivi ?\n\n'
    +'✔ Conservé : anamnèse, dates clés, imagerie, objectifs, poids/taille, traitements\n'
    +'✖ Effacé : EVA, douleur, ROM, tous les tests\n\n'
    +'Contexte reporté depuis le bilan du '+lastLabel+'.\n'
    +'Les données non sauvegardées seront perdues.'
  )) return;

  // Récupérer le contexte du dernier bilan sauvegardé
  var lastDonnees = _allBilans[0].donnees || {};

  // Tout effacer (quitter le mode consultation si actif)
  _exitHistoMode();
  _currentBilanId = null;
  _prevDonnees    = null;
  _resetBilanFields();
  document.querySelectorAll('.evo-delta').forEach(function(e){ e.remove(); });

  // Remettre identité patient (nom, prénom, dob, sexe)
  _autofillPatientFields(_bilanPatient);

  // Reporter les champs contextuels depuis le dernier bilan
  _SUIVI_CARRY_FIELDS.forEach(function(id){
    var val = lastDonnees[id];
    if(val === undefined || val === null || val === '') return;
    var el = document.getElementById(id);
    if(!el) return;
    if(el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
    else el.value = val;
  });

  // Reconstruire les zones douloureuses depuis f-pain-zones restauré
  try{ _parsePainZones(); }catch(ex){}

  // Date du bilan = aujourd'hui
  var fd = document.getElementById('f-date');
  if(fd){
    var t = new Date();
    fd.value = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  }

  try{ updateAll(); }catch(ex){}
  showPage('infos');
  showToast('📋 Bilan de suivi prêt — contexte reporté du '+lastLabel);
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
function onTestChange(sel, tableId, idx) {
  var v = sel.value;
  var type = sel.dataset.type;
  sel.className = '';
  if (v === 'Positif' || v === 'Valid' + 'é') sel.classList.add(type === 'fonc' ? 'positif-fonc' : 'positif-ortho');
  else if (v === 'N' + 'égatif' || v === 'Pas valid' + 'é') sel.classList.add(type === 'fonc' ? 'negatif-fonc' : 'negatif-ortho');
  updateBadges();
}

function updateBadges() {
  const sections = {
    'epaule': ['tb-ep-irrit','tb-ep-trau-gh','tb-ep-trau-ac','tb-ep-trau-lab','tb-ep-trau-coiffe','tb-ep-fonc','tb-ep-ortho-mob','tb-ep-ortho-conf'],
    'rachis': ['tb-ra-cerv','tb-ra-cerv-neuro-g','tb-ra-cerv-neuro-d','tb-ra-lomb-g','tb-ra-lomb-d','tb-ra-force-d','tb-ra-force-g','tb-ra-transverse'],
    'hanche': ['tb-ha-global','tb-ha-add','tb-ha-pubis','tb-ha-flech','tb-ha-inguinal','tb-ha-hanche','tb-ha-fonc','tb-ha-force-d','tb-ha-force-g','tb-ha-global-g','tb-ha-global-d','tb-ha-add-g','tb-ha-add-d','tb-ha-pubis-g','tb-ha-pubis-d','tb-ha-flech-g','tb-ha-flech-d','tb-ha-inguinal-g','tb-ha-inguinal-d','tb-ha-hanche-g','tb-ha-hanche-d'],
    'genou':  ['tb-ge-global','tb-ge-lig','tb-ge-lca','tb-ge-men','tb-ge-rot','tb-ge-sbit','tb-ge-plicae','tb-ge-ext',
               'tb-ge-global-g','tb-ge-global-d','tb-ge-lig-g','tb-ge-lig-d','tb-ge-lca-g','tb-ge-lca-d',
               'tb-ge-men-g','tb-ge-men-d','tb-ge-rot-g','tb-ge-rot-d','tb-ge-sbit-g','tb-ge-sbit-d',
               'tb-ge-plicae-g','tb-ge-plicae-d','tb-ge-ext-g','tb-ge-ext-d',
               'tb-ge-knee-d','tb-ge-knee-g','tb-ge-hip-d','tb-ge-hip-g'],
    'pied':   ['tb-pi-global','tb-pi-tt','tb-pi-synd','tb-pi-conf','tb-pi-st','tb-pi-chopart','tb-pi-fonc','tb-pi-force-ca','tb-pi-force-cs'],
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
  { key:'coude',    label:'Coude',            hdr:['epaule','fonc-ms'] },
  { key:'poignet',  label:'Poignet',          hdr:['epaule','fonc-ms'] },
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
  ['epaule','rachis','hanche','genou','pied','fonc-mi','fonc-ms','fonc-rachis','musc'].forEach(function(p){
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
  var bilateral = _isBilateral();
  var lsi = bilateral
    ? (ca > 0 && cs > 0 ? Math.min(ca, cs) / Math.max(ca, cs) * 100 : NaN)
    : (cs > 0 ? ca / cs * 100 : NaN);
  setLSI(document.getElementById(key + '-lsi'), document.getElementById(key + '-stat'), lsi, '>= 90%', true, bilateral);
  if (key === 'hop') {
    const repere = document.getElementById('hop-repere80');
    var taille = parseFloat(document.getElementById('f-taille')?document.getElementById('f-taille').value:'');
    var sexeH = document.getElementById('f-sexe')?document.getElementById('f-sexe').value:'';
    var parts = [];
    if (!isNaN(cs) && cs > 0) {
      parts.push('📏 Repère 80% CS : ' + (cs*0.8).toFixed(1) + ' cm');
      if (!isNaN(ca) && ca > 0) parts.push('80% CA : ' + (ca*0.8).toFixed(1) + ' cm');
    }
    if (!isNaN(taille) && taille > 0) {
      var pctRTS = sexeH==='F' ? 0.80 : 0.90;
      var labelRTS = sexeH==='F' ? '80% taille (F)' : sexeH==='H' ? '90% taille (H)' : '90% taille (H) / 80% taille (F)';
      var seuilRTS = (taille * pctRTS).toFixed(1);
      parts.push('🎯 Seuil RTS : ≥ ' + seuilRTS + ' cm (' + labelRTS + ')');
      if (!isNaN(ca) && ca > 0) parts.push('CA : ' + ca + ' cm ' + (ca >= parseFloat(seuilRTS) ? '✓' : '✗'));
    }
    if (repere) repere.textContent = parts.length ? parts.join('   |   ') : '—';
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
  var bilateral = _isBilateral();
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
    var luBilateral = _isBilateral();
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
  var bilateral = _isBilateral();
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
function _buildAllTestsHtml() {
  var sections = [];
  function addSec(title, html) { if (html && html.trim()) sections.push({title: title, html: html}); }

  function nl2br(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
  function crItem(key, val, tag, tagClass) {
    if (!val) return '';
    tag = tag || ''; tagClass = tagClass || '';
    var tagHtml = tag ? '<span class="cr-tag ' + tagClass + '">' + tag + '</span>' : '';
    return '<div class="cr-item"><span class="cr-key">' + key + '</span><span class="cr-val">' + val + '</span>' + tagHtml + '</div>';
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
    { label:'EPAULE', fields:[['ep-type','Type'],['ep-marqueur','Marqueur']], tables:['tb-ep-irrit','tb-ep-trau-gh','tb-ep-trau-ac','tb-ep-trau-lab','tb-ep-trau-coiffe','tb-ep-fonc','tb-ep-ortho-mob','tb-ep-ortho-conf','tb-ep-irrit-g','tb-ep-irrit-d','tb-ep-trau-g','tb-ep-trau-d','tb-ep-fonc-g','tb-ep-fonc-d','tb-ep-ortho-g','tb-ep-ortho-d'], concl:'ep-conclusion', opt:'ep-opt' },
    { label:'RACHIS', fields:[['ra-marqueur','Marqueur'],['ra-mckenzie','McKenzie']], tables:['tb-ra-cerv','tb-ra-cerv-neuro-g','tb-ra-cerv-neuro-d','tb-ra-lomb-g','tb-ra-lomb-d','tb-ra-force-d','tb-ra-force-g','tb-ra-transverse'], concl:'ra-conclusion', opt:'ra-opt' },
    { label:'HANCHE', fields:[['ha-marqueur','Marqueur']], tables:['tb-ha-global','tb-ha-add','tb-ha-pubis','tb-ha-flech','tb-ha-inguinal','tb-ha-hanche','tb-ha-fonc','tb-ha-force-d','tb-ha-force-g','tb-ha-global-g','tb-ha-global-d','tb-ha-add-g','tb-ha-add-d','tb-ha-pubis-g','tb-ha-pubis-d','tb-ha-flech-g','tb-ha-flech-d','tb-ha-inguinal-g','tb-ha-inguinal-d','tb-ha-hanche-g','tb-ha-hanche-d'], concl:'ha-conclusion', opt:'ha-opt' },
    { label:'GENOU', fields:[['ge-marqueur','Marqueur']], tables:[
        'tb-ge-global','tb-ge-lig','tb-ge-lca','tb-ge-men','tb-ge-rot','tb-ge-sbit','tb-ge-plicae','tb-ge-ext',
        'tb-ge-global-g','tb-ge-global-d','tb-ge-lig-g','tb-ge-lig-d','tb-ge-lca-g','tb-ge-lca-d',
        'tb-ge-men-g','tb-ge-men-d','tb-ge-rot-g','tb-ge-rot-d','tb-ge-sbit-g','tb-ge-sbit-d',
        'tb-ge-plicae-g','tb-ge-plicae-d','tb-ge-ext-g','tb-ge-ext-d',
        'tb-ge-knee-d','tb-ge-knee-g','tb-ge-hip-d','tb-ge-hip-g'], concl:'ge-conclusion', opt:'ge-opt' },
    { label:'PIED / CHEVILLE', fields:[['pi-marqueur','Marqueur']], tables:['tb-pi-global','tb-pi-tt','tb-pi-synd','tb-pi-conf','tb-pi-st','tb-pi-chopart','tb-pi-fonc','tb-pi-force-ca','tb-pi-force-cs','tb-pi-global-g','tb-pi-global-d','tb-pi-tt-g','tb-pi-tt-d','tb-pi-synd-g','tb-pi-synd-d','tb-pi-conf-g','tb-pi-conf-d','tb-pi-st-g','tb-pi-st-d','tb-pi-chopart-g','tb-pi-chopart-d','tb-pi-fonc-g','tb-pi-fonc-d'], concl:'pi-conclusion', opt:'pi-opt' },
  ];
  var orthoHtml = '';
  for (var oi=0; oi<orthoSections.length; oi++) {
    var sec = orthoSections[oi];
    var secRows = '';
    for (var fi=0; fi<sec.fields.length; fi++) {
      var fEl = document.getElementById(sec.fields[fi][0]);
      if (fEl && fEl.value) secRows += crItem(sec.fields[fi][1], nl2br(fEl.value));
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
        if (selEl && (isPos || isNeg)) {
          var tname = (cfg.items[ri] || '').replace(/<[^>]*>/g, '').trim();
          // Ajouter la latéralité pour les tables bilatérales (clé se terminant par -d ou -g)
          if (/-d$/.test(tKey)) tname += ' — Droit';
          else if (/-g$/.test(tKey)) tname += ' — Gauche';
          var noteVal = noteEl ? noteEl.value : '';
          var isFonc = cfg.type === 'fonc';
          var tag, tagCls;
          if      (val === 'Validé')     { tag = 'Validé';     tagCls = 'ok'; }
          else if (val === 'Pas validé') { tag = 'Pas validé'; tagCls = 'bad'; }
          else if (isFonc)               { tag = val; tagCls = isPos ? 'ok'  : 'bad'; }
          else                           { tag = val; tagCls = isPos ? 'bad' : 'ok';  }
          secRows += crItem(tname, noteVal || '-', tag, tagCls);
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
    }
    if (sec.label === 'EPAULE') {
      // GIRD
      var girdCS = parseFloat((document.getElementById('gird-cs')||{}).value);
      var girdCA = parseFloat((document.getElementById('gird-ca')||{}).value);
      if (!isNaN(girdCS) && !isNaN(girdCA)) {
        var girdDiff = girdCS - girdCA;
        var girdTag = girdDiff > 15 ? 'Positif' : 'Négatif';
        var girdCls = girdDiff > 15 ? 'bad' : 'ok';
        secRows += crItem('GIRD — RI', 'CS=' + girdCS + '° CA=' + girdCA + '° (diff ' + (girdDiff>=0?'+':'') + girdDiff.toFixed(0) + '°)', girdTag, girdCls);
      }
      // Force break tests
      var epForceTests = [
        {key:'ep-trap', label:'Trapèze inf. — Y Test'},
        {key:'ep-dent', label:'Dentelé ant. — Push up+'},
        {key:'ep-rl1',  label:'Rotateurs lat. RE1'},
        {key:'ep-rl2',  label:'Rotateurs lat. RE2'},
        {key:'ep-abd',  label:'Élévation antérieure'},
        {key:'ep-bht',  label:'Bear Hug Test'},
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
          secRows += crItem(ft.label, valStr, isPos ? 'Positif' : 'Négatif', isPos ? 'bad' : 'ok');
        } else if (csA || caA) {
          var parts = [];
          if (csA) parts.push(_labelCS + '=' + csA);
          if (caA) parts.push(_labelCA + '=' + caA);
          var anyPos = csA === 'Positif' || caA === 'Positif';
          if (anyPos || csA === 'Négatif' || caA === 'Négatif') {
            secRows += crItem(ft.label, parts.join(' · '), anyPos ? 'Positif' : 'Négatif', anyPos ? 'bad' : 'ok');
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
    }
    if (sec.label === 'PIED / CHEVILLE') {
      secRows += romCrTable('Amplitudes Articulaires — Cheville/Pied (°)', [
        {label:'Flex. dorsale (g. tendu)',  dId:'rom-pi-d-fdgt', gId:'rom-pi-g-fdgt'},
        {label:'Flex. dorsale (g. fléchi)', dId:'rom-pi-d-fdgf', gId:'rom-pi-g-fdgf'},
        {label:'Flexion plantaire',         dId:'rom-pi-d-fp',   gId:'rom-pi-g-fp'},
        {label:'Inversion',                 dId:'rom-pi-d-inv',  gId:'rom-pi-g-inv'},
        {label:'Éversion',                  dId:'rom-pi-d-ev',   gId:'rom-pi-g-ev'},
      ], true);
    }
    if (sec.label === 'GENOU' || sec.label === 'HANCHE' || sec.label === 'EPAULE' || sec.label === 'RACHIS') {
      var cfCA2 = parseFloat((document.getElementById('cf-q-ca')||{}).value||'');
      var cfCS2 = parseFloat((document.getElementById('cf-q-cs')||{}).value||'');
      var cfObs2 = (document.getElementById('cf-obs-ca')||{}).value||'';
      if (sec.label === 'GENOU' && !isNaN(cfCA2)) {
        secRows += crItem('Contraction Flash Isométrique 20s',
          _labelCA+'='+cfCA2+'N   '+_labelCS+'='+(isNaN(cfCS2)?'-':cfCS2)+'N   '+lsiStr(cfCA2,cfCS2),
          statOf2(lsiCls2(cfCA2,cfCS2)), lsiCls2(cfCA2,cfCS2));
      }
      if (sec.label === 'GENOU' && cfObs2) secRows += '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">' + cfObs2 + '</div>';
    }
    var conclEl = document.getElementById(sec.concl);
    if (conclEl && conclEl.value) secRows += crItem('Conclusion', nl2br(conclEl.value));
    var optEl = sec.opt ? document.getElementById(sec.opt) : null;
    if (optEl && optEl.value) secRows += crItem('Tests Optionnels', nl2br(optEl.value));
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
          lmaHtml += crItem(lmaTname, lmaNoteVal || '-', lmaTag, lmaTagCls);
        }
      }
    }
    var lmaMarqEl = document.getElementById('lma-marqueur');
    if (lmaMarqEl && lmaMarqEl.value) lmaHtml += crItem('Marqueur', nl2br(lmaMarqEl.value));
    var lmaConclEl = document.getElementById('lma-conclusion');
    if (lmaConclEl && lmaConclEl.value) lmaHtml += crItem('Conclusion', nl2br(lmaConclEl.value));
    if (lmaHtml) {
      lmaHtml = '<div style="margin-bottom:6px"><div style="font-size:.78rem;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">'
              + lmaMembreLabel + ' — ' + lmaMusclLabel + '</div>' + lmaHtml + '</div>';
    }
  }
  if (lmaHtml) addSec('🔪 LMA — Lésion Myo-Aponévrotique', lmaHtml);

  // 3. Tests fonctionnels MI
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
    var slsVal2 = _labelCA+'='+slsCA+' rep.   '+_labelCS+'='+slsCS+' rep.   '+lsiStr(slsCA,slsCS)+(slsH2?'   |   Repère EIAS-sol : '+slsH2+(slsH2.indexOf('cm')===-1?' cm':''):'');
    tfHtml += crItem('SLS', slsVal2, statOf2(lsiCls2(slsCA,slsCS)), lsiCls2(slsCA,slsCS));
  }
  tfHtml += obsBlock('sls-obs-ca','sls-obs-cs');
  if (!isNaN(hopCA)) {
    var hopDesc = _labelCA+'='+hopCA+'cm   '+_labelCS+'='+hopCS+'cm   '+lsiStr(hopCA, hopCS);
    if (!isNaN(hopCS) && hopCS > 0) hopDesc += '   Repère 80% CS = ' + (hopCS * 0.8).toFixed(1) + 'cm';
    if (!isNaN(hopTaille) && hopTaille > 0) {
      if (hopSexe === 'F') { var hopSeuil = (hopTaille * 0.80).toFixed(1); hopDesc += '   |   Seuil RTS 80% taille (F) = ' + hopSeuil + 'cm → ' + (hopCA >= parseFloat(hopSeuil) ? '✓ Atteint' : '✗ Non atteint'); }
      else if (hopSexe === 'H') { var hopSeuil = (hopTaille * 0.90).toFixed(1); hopDesc += '   |   Seuil RTS 90% taille (H) = ' + hopSeuil + 'cm → ' + (hopCA >= parseFloat(hopSeuil) ? '✓ Atteint' : '✗ Non atteint'); }
      else { hopDesc += '   |   Seuil RTS : ≥' + (hopTaille * 0.80).toFixed(1) + 'cm (F) / ≥' + (hopTaille * 0.90).toFixed(1) + 'cm (H)'; }
    }
    tfHtml += crItem('Hop Test', hopDesc, statOf2(lsiCls2(hopCA, hopCS)), lsiCls2(hopCA, hopCS));
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
      _labelCA+'='+scoreCA2+'/'+recN+'   '+_labelCS+'='+scoreCS2+'/'+recN,
      statOf2(rclsCA), rclsCA);
  }
  tfHtml += obsBlock('rec-obs-ca','rec-obs-cs');
  if (!isNaN(hrCA)) tfHtml += crItem('Heel Rise', _labelCA+'='+hrCA+'   '+_labelCS+'='+hrCS+'   '+lsiStr(hrCA,hrCS), statOf2(lsiCls2(hrCA,hrCS)), lsiCls2(hrCA,hrCS));
  tfHtml += obsBlock('hr-obs-ca','hr-obs-cs');
  if (!isNaN(luCA)) {
    var luDiff2 = Math.abs(luCA-luCS); var luBad2 = luCA<10 || luDiff2>1.5;
    tfHtml += crItem('Lunge WBLT', _labelCA+'='+luCA+'cm   '+_labelCS+'='+luCS+'cm   Diff='+luDiff2.toFixed(1)+'cm   '+lsiStr(luCA,luCS), luBad2?'Deficit':'OK', luBad2?'bad':'good');
  }
  tfHtml += obsBlock('lu-obs-ca','lu-obs-cs');
  if (!isNaN(djHca)) tfHtml += crItem('Drop Jump H', _labelCA+'='+djHca+'cm   '+_labelCS+'='+djHcs+'cm   '+lsiStr(djHca,djHcs), statOf2(lsiCls2(djHca,djHcs)), lsiCls2(djHca,djHcs));
  tfHtml += obsBlock('dj-obs-ca','dj-obs-cs');
  var shExpCA2 = parseFloat((document.getElementById('sh-exp-ca')||{}).value||'');
  var shExpCS2 = parseFloat((document.getElementById('sh-exp-cs')||{}).value||'');
  var shEndCA2 = parseFloat((document.getElementById('sh-end-ca')||{}).value||'');
  var shEndCS2 = parseFloat((document.getElementById('sh-end-cs')||{}).value||'');
  if (!isNaN(shExpCA2)) tfHtml += crItem('Side Hop — Explosivité (15s)', _labelCA+'='+shExpCA2+' sauts   '+_labelCS+'='+(isNaN(shExpCS2)?'-':shExpCS2)+' sauts   '+lsiStr(shExpCA2,shExpCS2), statOf2(lsiCls2(shExpCA2,shExpCS2)), lsiCls2(shExpCA2,shExpCS2));
  if (!isNaN(shEndCA2)) tfHtml += crItem('Side Hop — Endurance (30s)', _labelCA+'='+shEndCA2+' sauts   '+_labelCS+'='+(isNaN(shEndCS2)?'-':shEndCS2)+' sauts   '+lsiStr(shEndCA2,shEndCS2), statOf2(lsiCls2(shEndCA2,shEndCS2)), lsiCls2(shEndCA2,shEndCS2));
  tfHtml += obsBlock('sh-obs-ca','sh-obs-cs');
  var qfCA = parseFloat((document.getElementById('q-f-ca')||{}).value||'');
  var qfCS = parseFloat((document.getElementById('q-f-cs')||{}).value||'');
  var ijfCA = parseFloat((document.getElementById('ij-f-ca')||{}).value||'');
  var ijfCS = parseFloat((document.getElementById('ij-f-cs')||{}).value||'');
  if (!isNaN(qfCA) && !isNaN(qfCS)) { var qd = (1-qfCA/qfCS)*100; tfHtml += crItem('Quadriceps deficit', qd.toFixed(1) + '%', qd<=10?'Normal':'Deficit', qd<=10?'ok':'warn'); }
  if (!isNaN(ijfCA) && !isNaN(ijfCS)) { var ijd = (1-ijfCA/ijfCS)*100; tfHtml += crItem('IJ deficit', ijd.toFixed(1) + '%', ijd<=10?'Normal':'Deficit', ijd<=10?'ok':'warn'); }
  // Drop Jump — Temps contact
  var djTca = parseFloat((document.getElementById('dj-t-ca')||{}).value||'');
  var djTcs = parseFloat((document.getElementById('dj-t-cs')||{}).value||'');
  if (!isNaN(djTca)) tfHtml += crItem('Drop Jump — Temps contact', _labelCA+'='+djTca+'ms   '+_labelCS+'='+djTcs+'ms   '+lsiStr(djTca,djTcs), statOf2(lsiCls2(djTca,djTcs)), lsiCls2(djTca,djTcs));
  // Drop Jump — RSI (calculé, affiché en textContent)
  var djRsiCAv = ((document.getElementById('dj-rsi-ca')||{}).textContent||'').trim();
  var djRsiCSv = ((document.getElementById('dj-rsi-cs')||{}).textContent||'').trim();
  var djRsiLsiv = ((document.getElementById('dj-rsi-lsi')||{}).textContent||'').trim();
  if (djRsiCAv && djRsiCAv !== '-' && parseFloat(djRsiCAv) > 0) {
    var rsiCls = lsiCls2(parseFloat(djRsiCAv), parseFloat(djRsiCSv));
    tfHtml += crItem('Drop Jump — RSI', _labelCA+'='+djRsiCAv+'   '+_labelCS+'='+djRsiCSv+'   LSI='+djRsiLsiv, statOf2(rsiCls), rsiCls);
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
    tfHtml += crItem('Pliométrie verticale (qualitative)', _labelCA+'='+plioqCA2+'/2   '+_labelCS+'='+plioqCS2+'/2', plioqCA2===2?'Réussi':'À améliorer', plioqCA2===2?'good':'warn');
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
  if (!isNaN(sebtAntCA2)) tfHtml += crItem('SEBT — Antérieur',       _labelCA+'='+sebtAntCA2+'cm   '+_labelCS+'='+sebtAntCS2+'cm   '+lsiStr(sebtAntCA2,sebtAntCS2), statOf2(lsiCls2(sebtAntCA2,sebtAntCS2)), lsiCls2(sebtAntCA2,sebtAntCS2));
  if (!isNaN(sebtPmCA2))  tfHtml += crItem('SEBT — Postéro-médial',  _labelCA+'='+sebtPmCA2+'cm   '+_labelCS+'='+sebtPmCS2+'cm   '+lsiStr(sebtPmCA2,sebtPmCS2),   statOf2(lsiCls2(sebtPmCA2,sebtPmCS2)),   lsiCls2(sebtPmCA2,sebtPmCS2));
  if (!isNaN(sebtPlCA2))  tfHtml += crItem('SEBT — Postéro-latéral', _labelCA+'='+sebtPlCA2+'cm   '+_labelCS+'='+sebtPlCS2+'cm   '+lsiStr(sebtPlCA2,sebtPlCS2),   statOf2(lsiCls2(sebtPlCA2,sebtPlCS2)),   lsiCls2(sebtPlCA2,sebtPlCS2));
  if (sebtCompCA2 && sebtCompCA2.indexOf('CA :') === 0) {
    tfHtml += crItem('SEBT — Score composite', sebtCompCA2.replace('CA : ','')+' ('+_labelCA+')   '+sebtCompCS2.replace('CS : ','')+' ('+_labelCS+')', '', '');
  }
  tfHtml += obsBlock('sebt-obs-ca','sebt-obs-cs');
  // UQYBT
  var uqDirs = [{id:'med',label:'Médial'},{id:'il',label:'Inféro-latéral'},{id:'sl',label:'Supéro-latéral'}];
  for (var ui=0; ui<uqDirs.length; ui++) {
    var uqD = parseFloat((document.getElementById('uqybt-'+uqDirs[ui].id+'-d')||{}).value||'');
    var uqG = parseFloat((document.getElementById('uqybt-'+uqDirs[ui].id+'-g')||{}).value||'');
    var uqDiffTxt = ((document.getElementById('uqybt-'+uqDirs[ui].id+'-diff')||{}).textContent||'').trim();
    if (!isNaN(uqD) && !isNaN(uqG)) {
      var uqBad = parseFloat(uqDiffTxt) > 5;
      tfHtml += crItem('UQYBT — '+uqDirs[ui].label, 'D='+uqD+'cm   G='+uqG+'cm   Diff='+uqDiffTxt, uqBad?'>5% Asymétrie':'OK', uqBad?'warn':'good');
    }
  }
  addSec('3. Tests Fonctionnels & Musculaires - Membres Inferieurs', tfHtml);

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
    tfMsHtml += crItem('PSET', psetVal, statOf2(lsiCls2(psetCAv,psetCSv)), lsiCls2(psetCAv,psetCSv));
  }
  tfMsHtml += obsBlock('pset-obs-ca','pset-obs-cs');
  if (!isNaN(setCAv))  { var sl = setCSv>0?(setCAv/setCSv*100):NaN; tfMsHtml += crItem('Shoulder Endurance', _labelCA+'='+setCAv+'   '+_labelCS+'='+setCSv+(!isNaN(sl)?'   LSI='+sl.toFixed(1)+'%':''), statOf2(lsiCls2(setCAv,setCSv)), lsiCls2(setCAv,setCSv)); }
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
    tfMsHtml += crItem('mCKCUEST', desc, ovCls?tagFn(ovCls):'', ovCls||'ok');
    var ckcObs = (document.getElementById('ckc-obs')||{}).value||'';
    if (ckcObs) tfMsHtml += '<div style="margin:2px 0 8px;padding:6px 10px;background:var(--surface2);border-radius:5px;font-size:.82rem;color:var(--text2);font-style:italic">Obs. : ' + nl2br(ckcObs) + '</div>';
  })();
  var lsiClsFn2 = function(v){ return v>=90?'good':v>=80?'warn':'bad'; };
  var lsiTagFn2 = function(v){ return v>=90?'LSI ≥ 90 % — OK':v>=80?'LSI 80–90 % — Acceptable':'LSI < 80 % — Insuffisant'; };
  if (shrtEl2 && shrtEl2.textContent && shrtEl2.textContent !== '-' && shrtEl2.textContent !== '—' && shrtEl2.textContent !== '--') {
    var shrtV2 = parseFloat(shrtEl2.textContent);
    tfMsHtml += crItem('Side Hold Rotation', shrtEl2.textContent, !isNaN(shrtV2)?lsiTagFn2(shrtV2):'', !isNaN(shrtV2)?lsiClsFn2(shrtV2):'ok');
  }
  tfMsHtml += obsBlock('shrt-obs-ca','shrt-obs-cs');
  if (ulrtEl2 && ulrtEl2.textContent && ulrtEl2.textContent !== '-' && ulrtEl2.textContent !== '—' && ulrtEl2.textContent !== '--') {
    var ulrtV2 = parseFloat(ulrtEl2.textContent);
    tfMsHtml += crItem('ULRT', ulrtEl2.textContent, !isNaN(ulrtV2)?lsiTagFn2(ulrtV2):'', !isNaN(ulrtV2)?lsiClsFn2(ulrtV2):'ok');
  }
  tfMsHtml += obsBlock('ulrt-obs-ca','ulrt-obs-cs');
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
  if (!isNaN(flxV2)) { tfRachisHtml += crItem('Endurance Fléchisseurs Cervicaux', flxV2+'s', flxV2>=39?'Normal':flxV2>=24?'Limite':'Deficit', flxV2>=39?'ok':flxV2>=24?'warn':'bad'); tfRachisHtml += obsSingle('rf-flx-obs'); }
  if (!isNaN(extV2)) { tfRachisHtml += crItem('Endurance Extenseurs Cervicaux', extV2+'s', extV2>=20?'OK':'Insuffisant', extV2>=20?'ok':'bad'); tfRachisHtml += obsSingle('rf-ext-obs'); }
  if (!isNaN(latD2) && !isNaN(latG2)) { var latRatio2 = Math.min(latD2,latG2)/Math.max(latD2,latG2)*100; tfRachisHtml += crItem('Endurance Latérale Cervicale', 'D='+latD2+'s   G='+latG2+'s   Ratio='+latRatio2.toFixed(1)+'%', latRatio2>=70?'Symétrie OK':'Asymétrie', latRatio2>=70?'ok':'warn'); tfRachisHtml += obsSingle('rf-lat-obs'); }
  if (!isNaN(sorV2)) { tfRachisHtml += crItem('Test de Sørensen', sorV2+'s', sorV2>=198?'Facteur protecteur':sorV2>=176?'Zone intermédiaire':'Facteur de risque', sorV2>=198?'ok':sorV2>=176?'warn':'bad'); tfRachisHtml += obsSingle('rf-sor-obs'); }
  if (!isNaN(pdslV2)) { tfRachisHtml += crItem('PDSLRT', pdslV2+'s', pdslV2>=30?'OK':'Deficit', pdslV2>=30?'ok':'bad'); tfRachisHtml += obsSingle('rf-pdslrt-obs'); }
  if (rfNotes) tfRachisHtml += crItem('Notes', rfNotes);
  addSec('5. Tests Fonctionnels - Rachis', tfRachisHtml);

  // 6. Points à travailler
  var toWork = [];

  // ── Break tests force (wording : "Renforcer [muscle]") ──────────────────
  var forceTables = [
    {id:'tb-ha-force-d', side:'Droit'},  {id:'tb-ha-force-g', side:'Gauche'},
    {id:'tb-ge-knee-d',  side:'Droit'},  {id:'tb-ge-knee-g',  side:'Gauche'},
    {id:'tb-ge-hip-d',   side:'Droit'},  {id:'tb-ge-hip-g',   side:'Gauche'},
    {id:'tb-ra-force-d', side:'Droit'},  {id:'tb-ra-force-g', side:'Gauche'},
    {id:'tb-pi-force-ca', side:_labelCA}, {id:'tb-pi-force-cs', side:_labelCS},
  ];
  forceTables.forEach(function(ft) {
    var tbody = document.getElementById(ft.id); if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(function(row) {
      var sel = row.querySelector('select'); if (!sel || sel.value !== 'Positif') return;
      var tdEl = row.querySelector('td'); if (!tdEl) return;
      var name = tdEl.textContent.trim().replace(/^Break test\s+/i, '');
      var item = 'Renforcer ' + name + ' — ' + ft.side;
      if (toWork.indexOf(item) === -1) toWork.push(item);
    });
  });

  // ── Test du transverse ──────────────────────────────────────────────────
  (function(){
    var tbody = document.getElementById('tb-ra-transverse'); if (!tbody) return;
    var row = tbody.querySelector('tr'); if (!row) return;
    var sel = row.querySelector('select');
    if (sel && sel.value === 'Positif') toWork.push("Travailler l'activation du transverse");
  })();

  // ── Mobilité rachis insuffisante ────────────────────────────────────────
  (function(){
    var segLbl = { cerv:'cervicale', thor:'thoracique', lomb:'lombaire' };
    var dirLbl = {
      'Flexion':   'la flexion',
      'Extension': "l’extension",
      'Incl. D':   "l’inclinaison droite",
      'Incl. G':   "l’inclinaison gauche",
      'Rot. D':    'la rotation droite',
      'Rot. G':    'la rotation gauche',
    };
    ['cerv','thor','lomb'].forEach(function(seg) {
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
      {key:'ep-abd',  label:'Renforcer les élévateurs de l\'épaule'},
      {key:'ep-bht',  label:'Renforcer le sub-scapulaire'},
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
    '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;flex-shrink:0;font-family:var(--font-serif)">' + initials + '</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-size:1.05rem;font-weight:700;color:var(--accent2);font-family:var(--font-serif);margin-bottom:2px">' + fullName + '</div>' +
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

  function crItem(key, val, tag, tagClass) {
    if (!val) return '';
    tag = tag || ''; tagClass = tagClass || '';
    var tagHtml = tag ? '<span class="cr-tag ' + tagClass + '">' + tag + '</span>' : '';
    return '<div class="cr-item"><span class="cr-key">' + key + '</span><span class="cr-val">' + val + '</span>' + tagHtml + '</div>';
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
    if (v2) infosHtml += crItem(infosMap[ii][1], nl2br(v2) + infosMap[ii][2]);
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

  // Sections 2→6 : délégué à _buildAllTestsHtml()
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
    calcRachisStat(); calcLNF(); calcSorensen(); calcPDSLRT();
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

  // Toutes les sections tests via helper partagé
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

  var css = `:root{--green:#2D6A4F;--green-l:#E8F5EE;--red:#C0392B;--red-l:#FDECEA;--orange:#D4600A;--orange-l:#FEF3EB;--border:#E8E6E1;--text:#1A1917;--text2:#6B6860;--text3:#9D9B96;--accent2:#1A3A5C;--surface2:#F1F0ED;--surface:#FFFFFF;--accent:#2B5FA6;--accent-l:#EEF3FB}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html{font-size:14px}body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:#F0F4F8;color:#1A1917;padding:0}.page-wrap{max-width:800px;margin:0 auto;padding:0 0 48px}.doc-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 24px;background:var(--accent2)}.doc-logo{display:inline-flex;align-items:baseline;line-height:1;white-space:nowrap}.doc-logo .r{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em}.doc-logo .e{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:.44em;vertical-align:super;color:#fff;margin:0 .05em 0 .01em;line-height:0}.doc-logo .p{font-family:'Poppins',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-.025em;margin-left:.02em}.doc-meta{text-align:right;font-size:.72rem;color:rgba(255,255,255,.8);line-height:1.8}.doc-meta strong{font-size:.82rem;color:#fff;display:block}.patient-card{background:#fff;margin:0;padding:20px 24px;border-bottom:1px solid #DDE3EC;display:flex;align-items:center;gap:18px}.patient-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0;font-family:Georgia,serif}.patient-name{font-size:1.1rem;font-weight:700;color:var(--accent2);margin-bottom:3px}.patient-sub{font-size:.8rem;color:var(--text2)}.patient-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.pat-badge{background:var(--accent-l);color:var(--accent);border-radius:20px;padding:2px 10px;font-size:.7rem;font-weight:700}.pat-badge.orange{background:#FEF3EB;color:#D4600A}.doc-date-bar{background:#F7F6F3;padding:8px 24px;font-size:.75rem;color:var(--text2);border-bottom:1px solid var(--border)}.doc-date-bar span{font-weight:600;color:var(--accent2)}.doc-body{padding:20px 24px 0}.block{display:none}.cr-section{background:#fff;border-radius:10px;margin-bottom:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08),0 0 0 1px rgba(0,0,0,.04)}.cr-section h3{padding:10px 16px;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:var(--accent2);color:#fff;margin:0}.cr-ortho h3{background:var(--green)}.cr-tests h3{background:var(--accent)}.cr-alert h3{background:#D4600A}.cr-item{display:flex;align-items:flex-start;gap:12px;padding:9px 16px;border-bottom:1px solid #F1F0ED;line-height:1.5}.cr-item:last-child{border-bottom:none}.cr-key{font-size:.78rem;font-weight:600;color:var(--text2);min-width:175px;flex-shrink:0;padding-top:2px}.cr-val{flex:1;font-size:.85rem;color:#1A1917;line-height:1.5}.cr-tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.68rem;font-weight:700;white-space:nowrap;margin-left:8px;vertical-align:middle}.cr-tag.ok,.cr-tag.good{background:#E8F5EE;color:var(--green)}.cr-tag.warn{background:#FEF3EB;color:#D4600A}.cr-tag.bad{background:#FDECEA;color:var(--red)}.cr-alert .cr-item{padding:10px 16px;align-items:center;background:#FFF8F5}.cr-alert .cr-item:nth-child(odd){background:#fff}.cr-alert .cr-item>span:first-child{color:#D4600A;font-weight:700;font-size:1rem;flex-shrink:0}.cr-empty{padding:40px;text-align:center;color:var(--text3);font-style:italic;font-size:.9rem}@media print{body{background:#F0F4F8!important}.doc-header{background:var(--accent2)!important}.cr-ortho h3{background:var(--green)!important}.cr-tests h3{background:var(--accent)!important}.cr-alert h3{background:#D4600A!important}.cr-section{break-inside:avoid;page-break-inside:avoid}.doc-body{padding:12px 24px 0}}@media(max-width:640px){.doc-header{padding:11px 14px;gap:6px}.doc-meta{font-size:.67rem;text-align:left}.patient-card{padding:14px 14px;gap:12px}.patient-avatar{width:42px;height:42px;font-size:1rem}.patient-name{font-size:.97rem}.patient-sub{font-size:.75rem}.pat-badge{font-size:.68rem;padding:2px 8px}.doc-date-bar{padding:6px 14px;font-size:.72rem}.doc-body{padding:10px 14px 0}.cr-section{border-radius:8px;margin-bottom:10px}.cr-section h3{padding:8px 12px;font-size:.68rem}.cr-item{flex-direction:column;gap:3px;padding:10px 12px}.cr-key{min-width:0;width:100%;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);padding-top:0;padding-bottom:1px}.cr-val{font-size:.9rem;line-height:1.55;width:100%}.cr-tag{display:inline-block;margin-left:0;margin-top:6px;font-size:.7rem;padding:3px 10px}.cr-alert .cr-item{flex-direction:row;gap:10px;align-items:flex-start}.cr-alert .cr-item>span:first-child{font-size:.95rem;flex-shrink:0}}svg{max-width:100%;height:auto;display:block}`;

  var metaParts = [];
  if(praticien) metaParts.push('<strong>'+(praticien+(cabinet?' — '+cabinet:''))+'</strong>');
  var metaSub = [am?'N° AM : '+am:'', tel, email].filter(Boolean).join(' · ');
  if(metaSub) metaParts.push(metaSub);

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
  if(bilanDate) badges += '<span class="pat-badge orange">Bilan du '+bilanDate.split('-').reverse().join('/')+'</span>';

  return {
    html: '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&family=Poppins:wght@800&display=swap" rel="stylesheet"><title>'+title+(patient?' — '+patient:'')+'</title><style>'+css+'</style></head><body><div class="page-wrap">'
      + '<div class="doc-header"><div class="doc-logo"><span class="r">rehab<sup class="e">4</sup></span><span class="p">perf</span></div><div class="doc-meta">'+metaParts.join('<br>')+'</div></div>'
      + (patient ? '<div class="patient-card"><div class="patient-avatar">'+initials+'</div><div><div class="patient-name">'+patient+'</div>'+(badges?'<div class="patient-badges">'+badges+'</div>':'')+'</div></div>' : '')
      + '<div class="doc-date-bar">Compte-rendu généré le <span>'+date+'</span></div>'
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

// Auto-save on any change
document.addEventListener('input', () => saveToStorage());
document.addEventListener('change', () => saveToStorage());

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
  if (!isNaN(cs) && cs > 0) {
    var lsi = !isNaN(ca) ? ca / cs * 100 : NaN;
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
  var blocks = ['global','lig','lca','men','rot','sbit','plicae','ext'];
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
  var blocks = ['global','tt','synd','conf','st','chopart','fonc'];
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

function _updateHancheBilateral(){
  var cote = _getCoteForScope(['hanche']);
  var bilateral = (cote === 'BILATÉRAL');
  var blocks = ['global','add','pubis','flech','inguinal','hanche'];
  blocks.forEach(function(b){
    var single = document.getElementById('ha-single-' + b);
    var bil    = document.getElementById('ha-bilateral-' + b);
    if(single) single.style.display = bilateral ? 'none' : '';
    if(bil)    bil.style.display    = bilateral ? ''     : 'none';
  });
}

function _updateSideLabels(){
  var SCOPES = [
    { zones:['epaule','coude','poignet'],         pages:['page-epaule','page-fonctionnelsMS'] },
    { zones:['genou'],                            pages:['page-genou'] },
    { zones:['cheville','pied'],                  pages:['page-pied'] },
    { zones:['rachis-c','rachis-l'],              pages:['page-rachis','page-fonctionnelsRachis'] },
    { zones:['genou','hanche','cheville','pied','cuisse','jambe'], pages:['page-fonctionnels'] }
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

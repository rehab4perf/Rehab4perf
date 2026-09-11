/* ════════════════════════════════════════════════════════════════════════════
   Volume d'entraînement par sport — partagé par le builder et l'espace athlète

   Chargé par programme.html (AVANT prog-data.js) et par athlete.html. Le
   praticien le lit dans l'Évolution des charges, l'athlète dans son lien : un
   seul calcul, donc les mêmes chiffres des deux côtés. Recopié, il aurait
   divergé — la règle anti-double-comptage d'abord, la couleur ensuite
   (qualite/athlete-volume-cas.js).

   Rien ici ne lit une globale d'une page sans la garder par `typeof` : la
   page athlète n'a ni `_stravaActivities`, ni `_cloudCalEvents`, ni
   `_progPatient`, ni `_cycles`.

   Ordre : les sports, la période, la charge d'une séance, l'agrégation, les
   helpers de retour, le rendu.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Sports d'entrainement — table de correspondance Strava ──────────
   Strava nomme `Run`, `TrailRun` et `VirtualRun` trois libelles d'un MEME
   sport ; `WeightTraining`, `Workout` et `Crossfit` en sont un autre. Sans
   cette table, le volume compterait cinq sports la ou il n'y en a que deux, et
   le calendrier continuerait d'afficher le type brut.

   Ecrite UNE fois : elle sert le volume de l'onglet Evolution, et rien
   n'empeche le calendrier de s'y brancher ensuite.

   LES COULEURS SONT VALIDEES, pas choisies a l'oeil — bande de clarte,
   plancher de chroma, ecart perceptif sous les trois formes de daltonisme,
   contraste sur la surface. Elles passent tous les controles SUR LES PAIRES
   ADJACENTES, dans cet ordre exact.

   L'ORDRE EST FIXE et ne se trie jamais par grandeur : une part qui change de
   voisine d'une semaine a l'autre change d'ecart de couleur, et la comparaison
   devient impossible. C'est aussi cet ordre-la qui a ete valide.

   AU-DELA DE CINQ, on ne cree pas de sixieme teinte : le surplus tombe dans
   « Autre ». Cinq series sont la limite de ce qu'un lecteur distingue — mesure,
   pas estime. */
var R4P_SPORTS = [
  { cle:'course',   nom:'Course à pied', unite:'km', couleur:'#2B5FA6',
    types:['Run','TrailRun','VirtualRun'] },
  { cle:'velo',     nom:'Vélo',          unite:'km', couleur:'#C2410C',
    types:['Ride','VirtualRide','GravelRide','MountainBikeRide','EBikeRide','Handcycle'] },
  { cle:'natation', nom:'Natation',      unite:'km', couleur:'#0891B2',
    types:['Swim'] },
  { cle:'renfo',    nom:'Renforcement',  unite:'h',  couleur:'#7B2DBF',
    types:['WeightTraining','Workout','Crossfit','HighIntensityIntervalTraining'] },
  { cle:'marche',   nom:'Marche',        unite:'km', couleur:'#BE185D',
    types:['Walk','Hike','Snowshoe'] }
];
/* Gris volontaire : « Autre » n'est pas un sport, c'est ce qui reste. Une
   couleur franche lui donnerait le meme poids qu'aux cinq nommes. */
var R4P_SPORT_AUTRE = { cle:'autre', nom:'Autre', unite:'h', couleur:'#8A96A0', types:[] };

function r4pSportDeType(type){
  var t = String(type || '');
  for(var i=0;i<R4P_SPORTS.length;i++){
    if(R4P_SPORTS[i].types.indexOf(t) !== -1) return R4P_SPORTS[i];
  }
  return R4P_SPORT_AUTRE;
}

/* ── Période de l'Évolution : une UNITÉ et un DÉCALAGE ──────────────────
   Les préréglages « 1 semaine, 1 mois, 3 mois… » ne donnaient qu'une fenêtre
   glissante finissant aujourd'hui : impossible de regarder mars, et « 1 mois »
   valait cinq semaines. Décision du praticien (piste 1) : une unité — semaine,
   mois, trimestre, année — et des flèches pour reculer, jamais au-delà
   d'aujourd'hui. Les périodes sont CALENDAIRES. L'écart se mesure contre la
   période précédente de même unité, coupée au même avancement si la période
   est en cours, entière sinon. « Tout » et « Personnalisé » restent
   (qualite/pevo-periode-cas.js). */
function _pevoJour(iso){ var x = String(iso).split('-'); return new Date(+x[0], +x[1] - 1, +x[2]); }
function _pevoIso(d){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function _pevoPlus(iso, n){ var d = _pevoJour(iso); d.setDate(d.getDate() + n); return _pevoIso(d); }
function _pevoLundi(iso){ var d = _pevoJour(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return _pevoIso(d); }
function _pevoFinMois(y, m){ return _pevoIso(new Date(y, m + 1, 0)); }
function _pevoAujourdhuiIso(){ return _pevoIso(new Date()); }
/* « 7 » ou « 7 sept. » */
function _pevoFmtCourt(iso, avecMois){
  var MC = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  var d = _pevoJour(iso);
  return d.getDate() + (avecMois ? ' ' + MC[d.getMonth()] : '');
}
/* Sous-périodes des barres : jours, semaines (lundi → dimanche, coupées aux
   bornes) ou mois. */
function _pevoBuckets(debut, fin, mode){
  var out = [], cur = debut;
  while(cur <= fin){
    var f;
    if(mode === 'jour') f = cur;
    else if(mode === 'semaine') f = _pevoPlus(_pevoLundi(cur), 6);
    else { var d = _pevoJour(cur); f = _pevoFinMois(d.getFullYear(), d.getMonth()); }
    if(f > fin) f = fin;
    out.push({ debut:cur, fin:f });
    cur = _pevoPlus(f, 1);
  }
  return out;
}
/* ── Unité « Cycle » ──────────────────────────────────────────────────────
   En rééducation, c'est souvent la vraie unité de lecture : la charge et la
   progression d'une phase, comparées à la phase précédente.
   - un cycle À DURÉE va de son début à sa fin (ou début + durée) ;
   - un cycle À CRITÈRES va de son début à la validation de son dernier
     critère (`checkedAt`), ou jusqu'à aujourd'hui s'il n'est pas validé ;
   - sans date de début, ou pas encore commencé : ce n'est pas une période.
   Deux cycles n'ayant pas la même durée, la référence est RAMENÉE À LA MÊME
   DURÉE (`echelle`), et la phrase le dit (qualite/pevo-cycle-cas.js). */
function _pevoPeriodesCycles(cycles, auj){
  var out = [];
  (cycles || []).forEach(function(c){
    if(!c || !c.startDate || c.startDate > auj) return;
    var fin;
    if(c.mode === 'criteres'){
      var phases = (Array.isArray(c.phases) && c.phases.length) ? c.phases
                 : ((Array.isArray(c.criteria) && c.criteria.length) ? [{ criteria:c.criteria, checks:c.checks || {} }] : []);
      var dernier = null, valide = phases.length > 0;
      phases.forEach(function(ph){
        (ph.criteria || []).forEach(function(_, i){
          var ck = ph.checks && ph.checks[i];
          if(!ck || !ck.checked){ valide = false; return; }
          var d = String(ck.checkedAt || '').slice(0, 10);
          if(d && (!dernier || d > dernier)) dernier = d;
        });
      });
      fin = (valide && dernier) ? dernier : auj;
      if(fin < c.startDate) fin = c.startDate;
    } else {
      fin = c.endDate || (c.duree ? _pevoPlus(c.startDate, c.duree * 7 - 1) : '');
      if(!fin) return;
    }
    out.push({ nom:c.nom || 'Cycle', debut:c.startDate, fin:fin });
  });
  out.sort(function(a, b){ return a.debut < b.debut ? -1 : (a.debut > b.debut ? 1 : 0); });
  return out;
}
function _pevoPeriodeCycle(decalage, auj){
  var liste = _pevoPeriodesCycles(typeof _cycles !== 'undefined' ? _cycles : [], auj);
  if(!liste.length || (decalage || 0) > 0) return null;
  /* Période 0 : le cycle en cours — le plus récemment commencé si plusieurs
     se chevauchent (critères et durée vont en parallèle) —, sinon le dernier. */
  var i0 = liste.length - 1;
  for(var i = liste.length - 1; i >= 0; i--){ if(liste[i].debut <= auj && liste[i].fin >= auj){ i0 = i; break; } }
  var k = i0 + (decalage || 0);
  if(k < 0 || k >= liste.length) return null;
  var c = liste[k], r = k > 0 ? liste[k - 1] : null;
  var jours = function(a, b){ return Math.round((_pevoJour(b) - _pevoJour(a)) / 86400000) + 1; };
  var enCours = c.debut <= auj && c.fin >= auj;
  var per = { unite:'cycle', debut:c.debut, fin:c.fin, enCours:enCours,
              libelle:'Cycle « ' + c.nom + ' » · ' + _pevoFmtCourt(c.debut, true) + ' → ' + _pevoFmtCourt(c.fin, true) + (enCours ? ' · en cours' : ''),
              refDebut: r ? r.debut : null, refFin: r ? r.fin : null, sousUnite:'semaine',
              buckets:_pevoBuckets(c.debut, c.fin, 'semaine') };
  if(r){
    per.echelle = jours(c.debut, (enCours && c.fin > auj) ? auj : c.fin) / jours(r.debut, r.fin);
    per.compare = 'Comparé à « ' + r.nom + ' » (' + _pevoFmtCourt(r.debut, true) + ' → ' + _pevoFmtCourt(r.fin, true) + '), ramené à la même durée.';
  } else per.compare = 'Premier cycle : rien à comparer.';
  return per;
}
function _pevoPeriode(unite, decalage, auj){
  if(unite === 'cycle') return _pevoPeriodeCycle(decalage, auj);
  var MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var MC = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  var JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  var t = _pevoJour(auj), y = t.getFullYear(), m = t.getMonth(), o = decalage || 0;
  var debut, fin, refDebut, refFin, libelle, aRef, mode, feminin = false;
  if(unite === 'semaine'){
    debut = _pevoPlus(_pevoLundi(auj), 7 * o); fin = _pevoPlus(debut, 6);
    refDebut = _pevoPlus(debut, -7); refFin = _pevoPlus(refDebut, 6);
    libelle = 'Semaine du ' + _pevoFmtCourt(debut, _pevoJour(debut).getMonth() !== _pevoJour(fin).getMonth())
            + ' au ' + _pevoFmtCourt(fin, true);
    aRef = 'à la semaine du ' + _pevoFmtCourt(refDebut, true); mode = 'jour'; feminin = true;
  } else if(unite === 'mois'){
    var dm = new Date(y, m + o, 1), rm = new Date(y, m + o - 1, 1);
    debut = _pevoIso(dm); fin = _pevoFinMois(dm.getFullYear(), dm.getMonth());
    refDebut = _pevoIso(rm); refFin = _pevoFinMois(rm.getFullYear(), rm.getMonth());
    libelle = MOIS[dm.getMonth()].charAt(0).toUpperCase() + MOIS[dm.getMonth()].slice(1) + ' ' + dm.getFullYear();
    aRef = 'à ' + MOIS[rm.getMonth()] + (rm.getFullYear() !== dm.getFullYear() ? ' ' + rm.getFullYear() : '');
    mode = 'semaine';
  } else if(unite === 'trimestre'){
    var q = Math.floor(m / 3) + o, yq = y + Math.floor(q / 4), qq = ((q % 4) + 4) % 4;
    var rq = qq - 1, yr = yq; if(rq < 0){ rq = 3; yr--; }
    debut = _pevoIso(new Date(yq, qq * 3, 1)); fin = _pevoFinMois(yq, qq * 3 + 2);
    refDebut = _pevoIso(new Date(yr, rq * 3, 1)); refFin = _pevoFinMois(yr, rq * 3 + 2);
    libelle = 'T' + (qq + 1) + ' ' + yq + ' · ' + MC[qq * 3] + ' → ' + MC[qq * 3 + 2];
    aRef = 'au T' + (rq + 1) + ' ' + yr; mode = 'semaine';
  } else if(unite === 'annee'){
    var ya = y + o;
    debut = ya + '-01-01'; fin = ya + '-12-31'; refDebut = (ya - 1) + '-01-01'; refFin = (ya - 1) + '-12-31';
    libelle = String(ya); aRef = 'à l\'année ' + (ya - 1); mode = 'mois'; feminin = true;
  } else return null;
  var enCours = auj >= debut && auj <= fin, coupee = false;
  if(enCours){
    var ecoule = Math.round((_pevoJour(auj) - _pevoJour(debut)) / 86400000);
    var coupe = _pevoPlus(refDebut, ecoule);
    if(coupe < refFin){ refFin = coupe; coupee = true; }
  }
  var compare = !coupee
    ? 'Comparé ' + aRef + (feminin ? ' entière.' : ' entier.')
    : unite === 'semaine'
      ? 'Comparé ' + aRef + ', arrêtée elle aussi au ' + JOURS[(t.getDay() + 6) % 7] + '.'
      : 'Comparé ' + aRef + ', arrêté' + (feminin ? 'e' : '') + ' au même avancement (' + _pevoFmtCourt(refDebut, true) + ' → ' + _pevoFmtCourt(refFin, true) + ').';
  return { unite:unite, debut:debut, fin:fin, enCours:enCours, libelle:libelle,
           refDebut:refDebut, refFin:refFin, compare:compare, buckets:_pevoBuckets(debut, fin, mode),
           sousUnite: mode === 'jour' ? null : mode };   // la période qu'ouvre un clic sur une barre
}

/* ── Estimation charge Strava via FC moyenne (220 - âge → zones RPE) ── */
function _stravaRpeFromHr(avgHr, ddn){
  if(!avgHr || !ddn) return null;
  try {
    var age = Math.floor((Date.now()-new Date(ddn).getTime())/(365.25*24*3600*1000));
    if(age<10||age>100) return null;
    var pct = avgHr/(220-age);
    if(pct<0.60) return 2;
    if(pct<0.70) return 3;
    if(pct<0.80) return 5;
    if(pct<0.90) return 7;
    return 9;
  } catch(e){ return null; }
}
/* ── UA : la charge d'une seance ─────────────────────────────────
   Methode de Foster, telle que publiee :

       UA = RPE × duree (min)

   LA VARIANTE « AU CARRE » A ETE ESSAYEE PUIS RETIREE — decision du praticien,
   et elle merite d'etre gardee en memoire pour ne pas etre reprise a l'aveugle.

   L'intuition est bonne : le session-RPE est LINEAIRE en intensite, si bien que
   100 min a RPE 1 et 10 min a RPE 10 valent tous deux 100 UA — ce qui est
   physiologiquement faux. C'est la raison meme qui fait ponderer l'intensite de
   facon non lineaire dans les TRIMP de Banister et d'Edwards.

   Mais « Foster au carre » N'EST PAS UNE METHODE PUBLIEE : recherche en
   francais et en anglais, la methode de Foster est `sRPE × duree`, point. Et
   tous les seuils dont vit ce bilan — zone favorable ACWR 0,8–1,3, monotonie,
   contrainte — sont calibres sur cette formule-la. Les garder sous une autre
   echelle, c'est afficher des bornes qui ne veulent plus rien dire.

   Entre une intuition juste et un modele valide, le praticien garde le modele
   valide. NE PAS reintroduire le carre sans reference publiee ET sans
   recalibrer les seuils.

   La fonction demeure : elle est le SEUL point ou la charge se calcule, et
   c'est ce qui garantit que les deux origines de la carte — RPE declare et RPE
   estime depuis la frequence cardiaque — restent sur la meme echelle. */
function _uaFoster(rpe, durMin){
  var r = parseFloat(rpe);
  if(!isFinite(r) || r <= 0 || !isFinite(durMin) || durMin <= 0) return null;
  if(r > 10) r = 10;
  return Math.round(r * durMin);
}

function _stravaChargeEstimate(act, ddn){
  var durMin = (act.duree_s||0)/60;
  if(durMin<1) return null;
  var donnees = act.donnees||{};
  // 1) FC → RPE estimé, puis la MEME regle que les seances declarees
  var rpe = _stravaRpeFromHr(donnees.avg_hr, ddn);
  if(rpe) return _uaFoster(rpe, durMin);
  /* 2) Charge pre-calculee en DB (suffer_score×5 ou duree×intensite type).
     Ce n'est pas un produit RPE × duree : on en deduit l'INTENSITE IMPLICITE
     — charge / duree — et l'on reapplique la meme regle. Sans cela, cette
     charge-la resterait lineaire au milieu d'une carte quadratique. */
  if(!act.charge) return null;
  return _uaFoster(act.charge / durMin, durMin);
}

/* ── Volume d'entrainement par sport ─────────────────────────────────
   Il vivait dans l'onglet Evolution du bilan, alimente par un aller-retour
   entre deux iframes. Cet ecart a coute un relais, un repondeur, trois etats a
   distinguer et un garde-fou pour l'empecher de partir dans le courrier au
   medecin — et c'est lui qui rendait le bloc muet quand le programme n'avait
   pas encore le patient.

   Il vit desormais ou vivent ses donnees. L'onglet Evolution du bilan annonce
   « Suivi longitudinal des marqueurs cliniques — bilans sauvegardes » : le
   volume d'entrainement n'est ni l'un ni l'autre.

   ── CE QUI COMPTE, et pourquoi ──────────────────────────────────────
   Les seances PLANIFIEES avec retour de l'athlete comptent autant que les
   activites Strava. Elles etaient purement absentes : une seance de
   renforcement prescrite, faite, et dont l'athlete a declare la duree
   s'affichait « 0 min ». La regle anti-double-comptage est celle de
   `_buildUaMap`, recopiee nulle part : un feedback de charge ABSORBE les
   activites Strava liees a sa seance. */
function _volLundi(d){
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));      // lundi = 0
  return x;
}
function _volIso(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
       + '-' + String(d.getDate()).padStart(2,'0');
}
function _volCharge(a, ddn){
  /* La charge PRE-CALCULEE prime : c'est elle qui alimente deja l'ACWR, et deux
     chiffres de charge dans la meme application se contrediraient. */
  if(a && a.charge) return a.charge;
  try { return _stravaChargeEstimate(a, ddn) || 0; } catch(e){ return 0; }
}

/* La FENETRE suit le selecteur de temporalite du panneau — « 1 mois »,
   « 3 mois »… La repartition portait auparavant sur la DERNIERE SEMAINE seule,
   sans que rien ne le dise : deux chiffres du meme ecran parlaient de deux
   periodes differentes.

   Le libelle annonce toujours la fenetre reellement employee : « Tout » est
   borne a deux ans, au-dela les barres hebdomadaires cessent d'etre lisibles —
   et un libelle qui dit « tout » sur une fenetre bornee serait un mensonge. */
/* Plancher à UNE semaine, plus à deux : « 1 semaine » en aurait montré deux
   sous un bouton qui en annonce une. Une semaine se compare à la précédente
   comme toute période à la sienne, et chaque vue tient sur une seule semaine
   (qualite/volume-sport-cas.js). */
function _volFenetreSemaines(){
  if(typeof _pevoFilterDays !== 'undefined' && _pevoFilterDays)
    return Math.max(1, Math.ceil(_pevoFilterDays / 7));
  if(typeof _pevoFilterFrom !== 'undefined' && (_pevoFilterFrom || _pevoFilterTo)){
    var a = new Date((_pevoFilterFrom || '') + 'T00:00:00');
    var b = new Date((_pevoFilterTo || '') + 'T00:00:00');
    if(!isNaN(a) && !isNaN(b) && b > a)
      return Math.max(1, Math.min(104, Math.ceil((b - a) / (7 * 86400000))));
  }
  return 52;
}
function _volLibelleFenetre(n){
  if(n === 1) return 'dernière semaine';
  if(n % 52 === 0 && n >= 52) return (n / 52) + (n === 52 ? ' dernière année' : ' dernières années');
  if(n % 4 === 0 && n >= 8)  return (n / 4) + ' derniers mois';
  return n + ' dernières semaines';
}

/* `src` — { activites, seances, ddn } — sert l'espace athlète, qui range les
   mêmes lignes sous d'autres noms. Sans lui, ce sont les globales du builder,
   gardées par `typeof` : la page athlète ne les déclare pas. */
function _volumeParSport(nbSemaines, src){
  src = src || {};
  var _acts = src.activites || (typeof _stravaActivities !== 'undefined' ? _stravaActivities : null) || [];
  var _seances = src.seances || (typeof _cloudCalEvents !== 'undefined' ? _cloudCalEvents : null) || [];
  var n = nbSemaines || 12;
  var lundi0 = _volLundi(new Date());
  /* Les bornes des semaines sont posees D'ABORD : une semaine sans activite
     doit exister et valoir zero, sinon la courbe saute par-dessus et donne a
     lire une continuite qui n'a pas eu lieu. */
  var semaines = [], index = {};
  for(var i = n - 1; i >= 0; i--){
    var d = new Date(lundi0); d.setDate(d.getDate() - i * 7);
    index[_volIso(d)] = semaines.length;
    semaines.push({ debut:_volIso(d), sports:{} });
  }
  var ddn = ('ddn' in src) ? src.ddn
          : (typeof _progPatient !== 'undefined' && _progPatient ? _progPatient.ddn : null);

  function poser(dateStr, cle, dist, duree, charge){
    if(!dateStr) return;
    var jour = new Date(String(dateStr).slice(0,10) + 'T00:00:00');
    if(isNaN(jour)) return;
    var k = index[_volIso(_volLundi(jour))];
    if(k === undefined) return;                          // hors fenetre
    var cel = semaines[k].sports[cle]
           || (semaines[k].sports[cle] = { dist:0, duree:0, charge:0, n:0,
                parJour:[0,1,2,3,4,5,6].map(function(){ return { dist:0, duree:0, charge:0, n:0 }; }) });
    cel.dist += (dist || 0); cel.duree += (duree || 0);
    cel.charge += (charge || 0); cel.n += 1;
    /* Le détail par jour de la semaine (lundi = 0) permet de comparer À JOUR
       ÉGAL : la semaine en cours, inachevée, contre la même portion de la
       précédente (voir _volHtml). */
    var pj = cel.parJour[(jour.getDay() + 6) % 7];
    pj.dist += (dist || 0); pj.duree += (duree || 0);
    pj.charge += (charge || 0); pj.n += 1;
  }

  /* 1. Seances planifiees. Meme partage que `_buildUaMap` : un feedback de
        charge absorbe les activites Strava liees, sinon ce sont elles qui
        comptent. */
  var liees = {};
  _acts.forEach(function(a){
    if(a && a.seance_id) (liees[String(a.seance_id)] = liees[String(a.seance_id)] || []).push(a);
  });
  _seances.forEach(function(ev){
    if(!ev) return;
    var fb = ev.athlete_feedback;
    var list = liees[String(ev.id)] || [];
    if(typeof _evIsCap === 'function' && _evIsCap(ev)){
      list.forEach(function(a){
        var sp = r4pSportDeType(a.type);
        poser(a.date, sp.cle, a.distance_m, a.duree_s, _volCharge(a, ddn));
      });
      return;
    }
    if(typeof _fbIsCharge === 'function' && _fbIsCharge(fb)){
      var ua = (typeof _uaFoster === 'function' ? _uaFoster(fb.rpe, fb.duree_min) : 0) || 0;
      /* Le SPORT vient de Strava, la CHARGE du retour. Une séance du programme
         n'a pas de sport : sans activité liée, on ne peut que la ranger en
         renforcement. Mais quand Strava en a enregistré, c'est lui qui sait :
         une sortie course prescrite, faite et notée perdait ses kilomètres et
         gonflait le renforcement. La charge du retour (RPE × durée déclarée) se
         partage entre les activités liées au prorata de leur durée — le total
         reste celui de l'ACWR (qualite/volume-sport-cas.js). */
      if(list.length){
        var poids = list.map(function(a){ return Math.max(0, a.duree_s || 0); });
        var tot = poids.reduce(function(s, p){ return s + p; }, 0);
        list.forEach(function(a, i){
          var sp = r4pSportDeType(a.type);
          var part = tot > 0 ? poids[i] / tot : 1 / list.length;
          /* Renforcement : Strava n'y compte presque pas de temps « en
             mouvement », `duree_s` y vaut souvent zéro — la durée DÉCLARÉE prime. */
          var duree = sp.cle === 'renfo' ? (fb.duree_min || 0) * 60 * part : a.duree_s;
          poser(a.date || ev.date, sp.cle, a.distance_m, duree, ua * part);
        });
        return;
      }
      /* La duree DECLAREE par l'athlete, en minutes. C'est la seule qu'on ait
         pour une seance de renforcement : Strava n'y compte quasiment pas de
         temps « en mouvement », et `duree_s` y vaut souvent zero. */
      poser(ev.date, 'renfo', 0, (fb.duree_min || 0) * 60, ua);
      return;
    }
    list.forEach(function(a){
      var sp = r4pSportDeType(a.type);
      poser(a.date, sp.cle, a.distance_m, a.duree_s, _volCharge(a, ddn));
    });
  });

  /* 2. Activites libres — celles qui ne repondent a aucune seance planifiee. */
  _acts.forEach(function(a){
    if(!a || a.seance_id) return;
    var sp = r4pSportDeType(a.type);
    poser(a.date, sp.cle, a.distance_m, a.duree_s, _volCharge(a, ddn));
  });

  /* Les DEFINITIONS partent avec les chiffres : le rendu ne tient pas sa propre
     copie des noms, unites et couleurs — deux tables finiraient par diverger,
     et c'est la couleur qui derive en premier. */
  return { semaines:semaines, sports:R4P_SPORTS.concat([R4P_SPORT_AUTRE]),
           jourCourant:(new Date().getDay() + 6) % 7 };           // lundi = 0
}

/* Combien de semaines agréger pour une période : du lundi de sa RÉFÉRENCE
   jusqu'à la semaine en cours. La somme se fait ensuite jour par jour, sur la
   plage exacte (_volSomme). */
function _volNbSemaines(per, auj){
  return Math.max(1, Math.round((_pevoJour(_pevoLundi(auj))
         - _pevoJour(_pevoLundi(per.refDebut || per.debut))) / (7 * 86400000)) + 1);
}

/* ── Helpers sémantiques feedback (partagés) ──────────────────────── */
/* Vrai feedback de charge Foster (seance standard) — jamais un feedback douleur CAP/HSR */
function _fbIsCharge(fb){
  if(!fb || !fb.rpe || !fb.duree_min) return false;
  if(fb.douleur !== null && fb.douleur !== undefined) return false; // ligne douleur explicite
  if(fb.duree_min <= 10 && !fb.exo_data) return false;              // legacy CAP non migre
  return true;
}
/* Le builder lit `programmes.donnees` entier ; l'espace athlète ne demande que
   `programmes.type` (donnees->>type) — le contenu complet de chaque programme
   n'a rien à faire sur un téléphone pour savoir si c'est une séance CAP. */
function _evIsCap(ev){
  var p = ev.programmes || {};
  var type = (p.donnees && p.donnees.type) || p.type;
  return type === 'cap' || String(p.nom || '').indexOf('CAP —') === 0;
}

/* ── Volume d'entrainement par sport — trois vues ─────────────────────
   La semaine en chiffres, la repartition de l'effort, douze semaines cadre par
   cadre. Pose en tete du panneau « Evolution des charges », a cote de la
   charge globale : c'est de l'entrainement, pas de la clinique.

   Il a d'abord vecu dans l'onglet Evolution du bilan, alimente par un
   aller-retour entre deux iframes. Cet ecart a coute un relais, un repondeur,
   trois etats a distinguer et un garde-fou pour l'empecher de partir dans le
   courrier au medecin. Ici, un appel de fonction suffit. */


function _volFmt(v, u){
  if(u === 'km') return (v/1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',');
  var h = Math.floor(v/3600), m = Math.round((v%3600)/60);
  return h ? (h + ' h ' + String(m).padStart(2,'0')) : (m + ' min');
}
function _volValeur(cel, sp){ return sp.unite === 'km' ? cel.dist : cel.duree; }

/* Vue 3 : un cadre par sport. PAS cinq couleurs empilees — cinq teintes ne se
   distinguent pas deux a deux, c'est mesure. Separees, chaque serie n'a plus
   qu'elle-meme a distinguer. */
/* Somme d'un sport sur une plage EXACTE, jour par jour (détail `parJour`) :
   septembre commence le 1er, pas au lundi de sa première semaine. Une cellule
   sans détail ne compte que si la semaine entière tombe dans la plage. */
function _volPlusIso(iso, n){
  var x = String(iso).split('-'), d = new Date(+x[0], +x[1] - 1, +x[2] + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function _volSomme(_volDonnees, debut, fin, cle){
  var t = { dist:0, duree:0, charge:0, n:0 };
  ((_volDonnees && _volDonnees.semaines) || []).forEach(function(sm){
    var c = sm.sports[cle]; if(!c) return;
    if(!c.parJour){
      if(sm.debut >= debut && _volPlusIso(sm.debut, 6) <= fin){ t.dist += c.dist; t.duree += c.duree; t.charge += c.charge; t.n += c.n; }
      return;
    }
    for(var j = 0; j < 7; j++){
      var jour = _volPlusIso(sm.debut, j);
      if(jour < debut || jour > fin) continue;
      var p = c.parJour[j];
      t.dist += p.dist; t.duree += p.duree; t.charge += p.charge; t.n += p.n;
    }
  });
  return t;
}

function _volBarres(vals, coul, liens){
  var W = 240, H = 44, max = Math.max.apply(null, vals) || 1;
  var pas = W / vals.length, larg = Math.max(3, pas - 4), out = '';
  vals.forEach(function(v, i){
    var h = v > 0 ? Math.max(2, (v/max) * (H - 4)) : 0;
    var x = i*pas + (pas-larg)/2;
    out += '<rect x="'+x.toFixed(1)+'" y="'+(H-h).toFixed(1)+'" width="'+larg.toFixed(1)
        +  '" height="'+h.toFixed(1)+'" rx="2" fill="'+coul+'"'
        +  (i === vals.length-1 ? '' : ' opacity="0.4"')+'></rect>';
    /* Zone cliquable sur toute la hauteur : une barre nulle s'ouvre aussi. */
    var ln = liens && liens[i];
    if(ln) out += '<rect x="'+(i*pas).toFixed(1)+'" y="0" width="'+pas.toFixed(1)+'" height="'+H+'" fill="transparent"'
      + ' onclick="pevoOuvrirPeriode(\''+ln.unite+'\',\''+ln.date+'\')" style="cursor:pointer"><title>'+ln.titre+'</title></rect>';
  });
  return '<svg class="vol-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+out+'</svg>';
}

/* `nav` : le sélecteur de période propre à l'espace athlète, posé sous le
   titre. Le praticien a le sien, en tête du panneau. */
function _volCadre(corps, fen, nav){
  return '<div class="vol-bloc no-print">'
    + '<div class="vol-titre">Volume d\'entraînement <span>'
    + ((fen && typeof fen === 'object') ? escH(fen.libelle || '')
       : (typeof _volLibelleFenetre === 'function' ? _volLibelleFenetre(fen || 12) : ''))
    + ' · Strava et retours de séance</span></div>'
    + (nav || '') + corps + '</div>';
}

/* `opts` (espace athlète) : { nav, rien } — le sélecteur, et la phrase « rien
   à montrer » adressée à l'athlète plutôt qu'au praticien. */
function _volHtml(_volDonnees, fenetre, opts){
  opts = opts || {};
  if(!_volDonnees || !_volDonnees.semaines || !_volDonnees.semaines.length) return '';
  var vide = { dist:0, duree:0, charge:0, n:0 };
  var defs = _volDonnees.sports || [];
  var toutes = _volDonnees.semaines;
  /* Une PÉRIODE (objet de _pevoPeriode) ou, pour « Tout », un nombre de semaines. */
  var per = (fenetre && typeof fenetre === 'object') ? fenetre : null;
  var n = per ? 1 : (fenetre || Math.ceil(toutes.length / 2));
  /* La seconde moitie est la periode CHOISIE, la premiere sa reference. */
  var sems = toutes.slice(-n), avant = toutes.slice(0, toutes.length - n);

  function cumul(liste, cle){
    var t = { dist:0, duree:0, charge:0, n:0 };
    liste.forEach(function(sm){
      var c = sm.sports[cle] || vide;
      t.dist += c.dist; t.duree += c.duree; t.charge += c.charge; t.n += c.n;
    });
    return t;
  }
  /* L'écart se mesure À JOUR ÉGAL. Les périodes sont des semaines
     calendaires, et la semaine en cours compte même inachevée : un vendredi,
     « 1 semaine » comparait cinq jours à sept, et affichait une baisse qui
     n'était que le week-end à venir. La référence est donc coupée au MÊME jour
     de la semaine : seule sa DERNIÈRE semaine l'est, les autres sont complètes
     des deux côtés. Sans détail par jour, ou le dimanche, rien n'est coupé
     (qualite/volume-sport-cas.js). */
  var jc = (typeof _volDonnees.jourCourant === 'number') ? _volDonnees.jourCourant : 6;
  function cumulRef(liste, cle){
    var t = cumul(liste.slice(0, -1), cle);
    var dernier = liste[liste.length - 1];
    if(!dernier) return t;
    var c = dernier.sports[cle] || vide;
    if(jc < 6 && c.parJour){
      for(var j = 0; j <= jc; j++){
        var p = c.parJour[j];
        t.dist += p.dist; t.duree += p.duree; t.charge += p.charge; t.n += p.n;
      }
    } else {
      t.dist += c.dist; t.duree += c.duree; t.charge += c.charge; t.n += c.n;
    }
    return t;
  }
  var _JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  var titreEcart = jc < 6
    ? 'Comparé à la période précédente, à jour égal : arrêtée elle aussi au ' + _JOURS[jc] + '.'
    : 'Comparé à la période précédente de même longueur, à jour égal.';
  var der = { sports:{} }, av = { sports:{} };
  defs.forEach(function(sp){
    der.sports[sp.cle] = per ? _volSomme(_volDonnees, per.debut, per.fin, sp.cle) : cumul(sems, sp.cle);
    av.sports[sp.cle]  = per ? (per.refDebut ? _volSomme(_volDonnees, per.refDebut, per.refFin, sp.cle)
                                           : { dist:0, duree:0, charge:0, n:0 })   // « Tout » : rien à comparer
                             : cumulRef(avant, sp.cle);
  });
  if(per && per.compare) titreEcart = per.compare;
  /* Cycles : deux périodes de durées différentes — la référence est ramenée à la même durée. */
  if(per && per.echelle) defs.forEach(function(sp){
    var a = av.sports[sp.cle]; a.dist *= per.echelle; a.duree *= per.echelle; a.charge *= per.echelle;
  });

  var chargeTot = 0;
  defs.forEach(function(sp){ chargeTot += der.sports[sp.cle].charge; });
  var actifs = defs.filter(function(sp){ return der.sports[sp.cle].n > 0
                                             || (!per && sems.some(function(sm){ return (sm.sports[sp.cle] || vide).n > 0; })); });
  /* MASQUER EST INDISCERNABLE D'UNE PANNE. Sans activite, un bloc absent
     laissait le praticien sans moyen de savoir si la fonction avait disparu, si
     le patient n'etait pas relie a Strava, ou s'il n'avait simplement pas
     couru. Le bloc reste et dit laquelle des trois. */
  if(!actifs.length){
    return _volCadre('<div class="vol-rien">' + (opts.rien
      || ('Aucune activité Strava ni retour de séance sur la période choisie.'
      + '<br><span>Si le patient s\'entraîne, vérifiez que son compte Strava est bien relié '
      + 'dans l\'onglet Programme.</span>')) + '</div>', per || n, opts.nav);
  }

  /* ── Vue 1 : la semaine en chiffres ───────────────────────────── */
  /* TOUS les sports pratiques, pas les trois premiers. L'ordre etant FIXE, un
     `slice(0,3)` prenait toujours les memes — course, velo, natation — et le
     renforcement n'apparaissait jamais en tuile, alors que c'est justement
     celui dont le praticien cherchait le volume. La grille se replie toute
     seule sur les ecrans etroits. */
  var tuiles = actifs.map(function(sp){
    var c = der.sports[sp.cle] || vide, p = av.sports[sp.cle] || vide;
    var vc = _volValeur(c, sp), vp = _volValeur(p, sp);
    var d = vp > 0 ? Math.round((vc - vp)/vp*100) : null;
    var cls = d === null ? 'plat' : (d > 0 ? 'haut' : (d < 0 ? 'bas' : 'plat'));
    return '<div class="vol-tuile"><div class="vol-t-lbl">'
      + '<span class="vol-pt" style="background:'+sp.couleur+'"></span>'+escH(sp.nom)+'</div>'
      + '<div class="vol-t-val">'+_volFmt(vc, sp.unite)
      + (sp.unite === 'km' ? '<span class="vol-t-u">km</span>' : '')+'</div>'
      + '<div class="vol-t-sub"><span class="vol-d '+cls+'" title="'+escH(titreEcart)+'">'
      + (d === null ? '—' : (d > 0 ? '▲ +' : (d < 0 ? '▼ ' : '= ')) + d + ' %')
      + '</span> · '+c.n+' séance'+(c.n > 1 ? 's' : '')+'</div></div>';
  }).join('');
  tuiles += '<div class="vol-tuile"><div class="vol-t-lbl">Charge totale</div>'
    + '<div class="vol-t-val">'+Math.round(chargeTot)+'<span class="vol-t-u">UA</span></div>'
    + '<div class="vol-t-sub">'+(function(){
        var nb = actifs.reduce(function(a,sp){ return a + (der.sports[sp.cle]||vide).n; }, 0);
        return nb + ' séance' + (nb > 1 ? 's' : '');       // « 1 séances » s'affichait
      })()
    + ' sur la période</div></div>';

  /* ── Vue 2 : la repartition, en CHARGE ────────────────────────────
     Pas en kilometres : une heure de natation et dix kilometres de course ne
     s'additionnent pas. La charge est la seule unite qui met les sports sur un
     meme plan, et c'est deja celle de l'ACWR. */
  var rep = '', leg = '';
  if(chargeTot > 0){
    actifs.forEach(function(sp){
      var c = (der.sports[sp.cle] || vide).charge;
      if(c <= 0) return;
      var pct = Math.round(c/chargeTot*100);
      rep += '<div class="vol-seg" style="flex:'+pct+';background:'+sp.couleur+'" title="'
          +  escH(sp.nom)+' — '+Math.round(c)+' UA ('+pct+' %)"><span>'+pct+' %</span></div>';
      leg += '<span class="vol-leg-i"><span class="vol-pt" style="background:'+sp.couleur+'"></span>'
          +  escH(sp.nom)+' <b>'+Math.round(c)+' UA</b></span>';
    });
  }

  /* ── Vue 3 : douze semaines, un cadre par sport ───────────────── */
  var cadres = actifs.map(function(sp){
    /* Chaque barre ouvre sa période (la semaine d'un mois, le mois d'une année). */
    var liens = (per && per.sousUnite) ? per.buckets.map(function(bk){
      return { unite:per.sousUnite, date:bk.debut,
               titre: per.sousUnite === 'semaine' ? 'Ouvrir la semaine du ' + (+bk.debut.slice(8, 10)) + '/' + bk.debut.slice(5, 7)
                                                  : 'Ouvrir le mois ' + bk.debut.slice(5, 7) + '/' + bk.debut.slice(0, 4) }; }) : null;
    var vals = per
      ? per.buckets.map(function(bk){ return _volValeur(_volSomme(_volDonnees, bk.debut, bk.fin, sp.cle), sp); })
      : sems.map(function(sm){ return _volValeur(sm.sports[sp.cle] || vide, sp); });
    var c = der.sports[sp.cle] || vide;
    return '<div class="vol-cadre"><div class="vol-c-tete"><span class="vol-c-nom">'
      + '<span class="vol-pt" style="background:'+sp.couleur+'"></span>'+escH(sp.nom)+'</span>'
      + '<span class="vol-c-val">'+_volFmt(_volValeur(c, sp), sp.unite)
      + (sp.unite === 'km' ? ' km' : '')+'</span></div>'
      + _volBarres(vals, sp.couleur, liens)+'</div>';
  }).join('');

  /* La vue TABLEAU n'est pas un supplement : la couleur ne doit jamais porter
     seule une information, et un lecteur qui ne la distingue pas garde ici de
     quoi lire les memes chiffres. */
  var tbl = '<tr><th>Sport</th><th class="n">Sur la période</th><th class="n">Charge</th><th class="n">Séances</th></tr>'
    + actifs.map(function(sp){
        var c = der.sports[sp.cle] || vide;
        return '<tr><td><span class="vol-pt" style="background:'+sp.couleur+'"></span> '+escH(sp.nom)+'</td>'
          + '<td class="n">'+_volFmt(_volValeur(c, sp), sp.unite)+(sp.unite==='km'?' km':'')+'</td>'
          + '<td class="n">'+Math.round(c.charge)+' UA</td><td class="n">'+c.n+'</td></tr>';
      }).join('');

  return _volCadre(
      '<div class="vol-tuiles">'+tuiles+'</div>'
    + (rep ? '<div class="vol-rep">'+rep+'</div><div class="vol-leg">'+leg+'</div>' : '')
    + '<div class="vol-cadres">'+cadres+'</div>'
    + '<details class="vol-tbl"><summary>Voir les mêmes chiffres en tableau</summary>'
    + '<table>'+tbl+'</table></details>', per || n, opts.nav);
}

/* ── Fin de volume-sport.js ── */

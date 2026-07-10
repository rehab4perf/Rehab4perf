/* ═══════════════════════════════════════════════════════════════════
   PROM_CONTENT — définitions FAAM / ALR-RSI partagées entre :
   - outils.html (remplissage en cabinet, dans PROMS_QUESTIONNAIRES)
   - prom-link.html (lien envoyé au patient, sans backend, comme athlete.html)
   Ne jamais dupliquer ce contenu ailleurs.
═══════════════════════════════════════════════════════════════════ */
function _sum(prefix,n,from){from=from||1;var t=0;for(var i=from;i<=n;i++){var s=document.querySelector('input[name="'+prefix+i+'"]:checked');if(s)t+=parseFloat(s.value);}return t;}
function _missing(prefix,n,from){from=from||1;var m=[];for(var i=from;i<=n;i++){if(!document.querySelector('input[name="'+prefix+i+'"]:checked'))m.push('Q'+i);}return m;}

var _FAAM_ADL = [
  'Se tenir debout','Marcher sur un terrain régulier','Marcher pied nu sur un terrain régulier',
  'Monter une pente','Descendre une pente','Monter les escaliers','Descendre les escaliers',
  'Marcher sur un terrain irrégulier','Monter et descendre d\'un trottoir','S\'accroupir',
  'Se mettre sur la pointe des pieds','Faire les premiers pas (le matin au réveil / après une position assise prolongée)',
  'Marcher 5 minutes ou moins','Marcher environ 10 minutes','Marcher 15 minutes ou plus',
  'Les tâches ménagères','Les activités de la vie quotidienne','Les soins personnels',
  'Un travail lourd (pousser / tirer, grimper, porter)','Un travail léger à modéré (se tenir debout, marcher)','Les activités de loisirs'
];
var _FAAM_SPORT = [
  'Courir','Sauter','Se réceptionner d\'un saut','Démarrer et s\'arrêter rapidement',
  'Faire des pas chassés / des déplacements latéraux','Activités sportives à faible impact (peu de chocs)',
  'Capacité à exécuter votre activité sportive avec votre technique habituelle',
  'Capacité à pratiquer votre sport aussi longtemps que vous le souhaitez'
];
/* Calcule un sous-score FAAM. Retourne {pct} si valide, sinon {incomplete:[...]} ou {tooManyNA:true}. */
function _faamSub(prefix, n, maxNA){
  var sum=0, vals=0, na=0, blank=[];
  for(var i=1;i<=n;i++){
    var el=document.querySelector('input[name="'+prefix+i+'"]:checked');
    if(!el){ blank.push('Q'+i); }
    else if(el.value==='na'){ na++; }
    else { sum+=parseFloat(el.value); vals++; }
  }
  if(blank.length) return {incomplete:blank};
  if(na>maxNA || vals===0) return {tooManyNA:true, na:na};
  return {pct:Math.round(sum/(vals*4)*100), sum:sum, vals:vals, na:na};
}
function _faamRowsHtml(prefix, items){
  var opts=[[4,'Aucune'],[3,'Légère'],[2,'Modérée'],[1,'Sévère'],[0,'Incapable'],['na','N/A']];
  var h='';
  items.forEach(function(lbl,idx){
    h+='<div class="prom-q"><div class="prom-q-text">'+lbl+'</div><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">';
    opts.forEach(function(o){
      h+='<label style="display:inline-flex;align-items:center;gap:4px;font-size:.72rem;border:1px solid #dde3ec;border-radius:5px;padding:3px 8px;cursor:pointer;color:#444;"><input type="radio" name="'+prefix+(idx+1)+'" value="'+o[0]+'" style="accent-color:#1A3A5C;">'+o[1]+'</label>';
    });
    h+='</div></div>';
  });
  return h;
}

var _ALRRSI_Q = [
  ['Pensez-vous pouvoir pratiquer votre sport au même niveau qu\'auparavant ?','Pas du tout sûr','Totalement sûr'],
  ['Pensez-vous que vous pourriez vous blesser de nouveau la cheville si vous repreniez le sport ?','Extrêmement probable','Pas du tout probable'],
  ['Êtes-vous inquiet(e) à l\'idée de reprendre votre sport ?','Extrêmement inquiet','Pas du tout inquiet'],
  ['Pensez-vous que votre cheville sera stable lors de votre pratique sportive ?','Pas du tout sûr','Totalement sûr'],
  ['Pensez-vous pouvoir pratiquer votre sport sans vous soucier de votre cheville ?','Pas du tout sûr','Totalement sûr'],
  ['Craignez-vous de vous blesser de nouveau la cheville lors de votre pratique sportive ?','Crainte extrême','Aucune crainte'],
  ['Êtes-vous frustré(e) de devoir tenir compte de votre cheville lors de votre pratique sportive ?','Extrêmement frustré','Pas du tout frustré'],
  ['Pensez-vous que votre cheville peut résister aux contraintes ?','Pas du tout sûr','Totalement sûr'],
  ['Avez-vous peur de vous reblesser accidentellement la cheville lors de votre pratique sportive ?','Très peur','Pas du tout peur'],
  ['L\'idée d\'une possible réopération ou rééducation vous empêche-t-elle de pratiquer votre sport ?','Tout le temps','À aucun moment'],
  ['Êtes-vous confiant(e) en votre capacité à pratiquer votre sport ?','Pas du tout confiant','Totalement confiant'],
  ['Êtes-vous détendu(e) à l\'idée de pratiquer votre sport ?','Pas du tout détendu','Totalement détendu']
];

/* html(suf)/score(suf) : suf est un suffixe optionnel ('' par défaut) ajouté aux noms de
   champs, pour pouvoir afficher deux fois le même questionnaire sur une page (un lien combiné
   lésé+sain / gauche+droite) sans collision entre les réponses des deux côtés. */
var PROM_CONTENT = {
  FAAM: {
    acronym: 'FAAM', name: 'Foot and Ankle Ability Measure', scale: '0–100 / 2 sous-scores (↑=mieux)',
    html: function(suf){
      suf = suf || '';
      return '<div class="prom-intro">Répondez à chaque item selon la difficulté ressentie au cours de la <b>semaine passée</b>, en raison de votre pied ou de votre cheville. Si l\'activité est limitée par autre chose, cochez <b>N/A</b>.</div>'
        + '<div class="prom-section-label">Sous-échelle Vie quotidienne (AVQ) — 21 items</div>'
        + _faamRowsHtml('faamadl'+suf, _FAAM_ADL)
        + '<div class="prom-section-label">Sous-échelle Sport — 8 items</div>'
        + _faamRowsHtml('faamsport'+suf, _FAAM_SPORT);
    },
    score: function(suf){
      suf = suf || '';
      function line(label, r, maxNA){
        if(r.incomplete) return '<div style="color:#C0392B;">'+label+' : incomplet ('+r.incomplete.length+' item'+(r.incomplete.length>1?'s':'')+' sans réponse)</div>';
        if(r.tooManyNA) return '<div style="color:#C0392B;">'+label+' : trop de N/A ('+r.na+') — sous-score non calculable (max '+maxNA+').</div>';
        return '<div>'+label+' : <strong style="font-size:1.1rem;color:#1A3A5C;">'+r.pct+' %</strong> <span style="color:#888;font-size:.8rem;">('+r.sum+'/'+(r.vals*4)+(r.na?' · '+r.na+' N/A':'')+')</span></div>';
      }
      var adl=_faamSub('faamadl'+suf,21,2), sport=_faamSub('faamsport'+suf,8,1);
      return line('FAAM-AVQ', adl, 2) + '<div style="height:6px;"></div>' + line('FAAM-Sport', sport, 1)
        + '<div style="font-size:.78rem;color:#666;margin-top:8px;">Score = somme / (items répondus × 4) × 100. AVQ valide si ≥19/21, Sport si ≥7/8.</div>';
    }
  },
  'ALR-RSI': {
    acronym: 'ALR-RSI', name: 'Ankle Ligament Reconstruction — Return to Sport after Injury', scale: '0–100% (↑=mieux)',
    html: function(suf){
      suf = suf || '';
      var h='<div class="prom-intro">Répondez aux questions concernant le sport principal pratiqué avant la blessure. Cochez la case correspondant à votre situation actuelle.</div>';
      _ALRRSI_Q.forEach(function(q,i){
        h+='<div class="prom-q"><div class="prom-q-num">Q'+(i+1)+'</div><div class="prom-q-text">'+q[0]+'</div>'
          +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;align-items:center;">'
          +'<span style="font-size:.72rem;color:#888;white-space:nowrap;">'+q[1]+'</span>';
        for(var v=0;v<=10;v++) h+='<label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.75rem;min-width:26px;"><input type="radio" name="alrrsi'+suf+(i+1)+'" value="'+v+'"><span>'+v+'</span></label>';
        h+='<span style="font-size:.72rem;color:#888;white-space:nowrap;">'+q[2]+'</span></div></div>';
      });
      return h;
    },
    score: function(suf){
      suf = suf || '';
      var m=_missing('alrrsi'+suf,12);
      if(m.length) return '<div style="color:#C0392B;">Questions non répondues : '+m.join(', ')+'</div>';
      var t=_sum('alrrsi'+suf,12);
      var sc=Math.round(t*100/120);
      var col=sc>=60?'#2D6A4F':'#C0392B';
      return '<div>Score ALR-RSI : <strong style="font-size:1.2rem;color:'+col+'">'+sc+' / 100</strong></div>'
        +'<div style="font-size:.82rem;color:'+col+';font-weight:600;margin-top:4px;">'+(sc>=60?'Bonne disponibilité psychologique':'Disponibilité psychologique insuffisante (seuil 60%)')+'</div>'
        +'<div style="font-size:.78rem;color:#666;margin-top:4px;">Score = (Somme × 100) / 120. Seuil recommandé ≥ 60.</div>';
    }
  }
};

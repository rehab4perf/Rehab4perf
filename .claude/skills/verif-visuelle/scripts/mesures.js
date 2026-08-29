/* Sonde a coller dans javascript_tool — mesure, ne juge pas a l'oeil.
   Rend la liste des defauts : chevauchements texte/texte, texte/trace,
   debordements horizontaux et elements sortis de leur conteneur. */
(function (selecteurRacine) {
  function I(a, b) { return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top); }
  function visible(t) {
    var e = t;
    while (e && e.tagName) { if (e.getAttribute && e.getAttribute('visibility') === 'hidden') return false; e = e.parentNode; }
    return !!(t.textContent || '').trim();
  }
  var out = [], racines = document.querySelectorAll(selecteurRacine || 'svg');
  [].forEach.call(racines, function (svg, k) {
    var tx = [].filter.call(svg.querySelectorAll('text'), visible);
    for (var i = 0; i < tx.length; i++) for (var j = i + 1; j < tx.length; j++)
      if (I(tx[i].getBoundingClientRect(), tx[j].getBoundingClientRect()))
        out.push('#' + k + ' TEXTE×TEXTE "' + tx[i].textContent + '" ∩ "' + tx[j].textContent + '"');
    var tr = [].slice.call(svg.querySelectorAll('path[stroke],polyline[stroke],line[stroke]'));
    tx.forEach(function (e) {
      var r = e.getBoundingClientRect();
      tr.forEach(function (p) {
        if (!I(r, p.getBoundingClientRect())) return;
        for (var x = r.left + 1; x < r.right; x += 1.5) for (var y = r.top + 1; y < r.bottom; y += 1.5)
          if (document.elementFromPoint(x, y) === p) { out.push('#' + k + ' TEXTE×TRACÉ "' + e.textContent + '"'); return; }
      });
    });
  });
  if (document.documentElement.scrollWidth > innerWidth)
    out.push('DÉBORDEMENT horizontal : ' + (document.documentElement.scrollWidth - innerWidth) + ' px');
  return JSON.stringify({ largeur: innerWidth, defauts: out.length ? out : 'aucun' }, null, 1);
})('svg');

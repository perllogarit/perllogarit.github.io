'use strict';

function gtrack(name, params) {
  if (typeof gtag !== 'function') return;
  if (name === 'calculate') {
    var n = (parseInt(sessionStorage.getItem('pl_calc_n'), 10) || 0) + 1;
    sessionStorage.setItem('pl_calc_n', n);
    params = Object.assign({ session_calc_count: n }, params || {});
    if (params.calculator) {
      var lk = 'pl_u_' + params.calculator;
      localStorage.setItem(lk, (parseInt(localStorage.getItem(lk), 10) || 0) + 1);
    }
  }
  gtag('event', name, params);
}

// homepage calc suggestion — swap in + badge the user's most-used calculator
(function() {
  var p = window.location.pathname;
  if (p !== '/' && p !== '/index.html' && p !== '/index') return;

  var CALCS = {
    paga:      { href: 'calculators/paga',      icon: 'fi-br-user-salary',   title: 'Llogaritësi i Pagës' },
    sigurime:  { href: 'calculators/sigurime',  icon: 'fi-br-briefcase',     title: 'Sigurime Shoqërore për të Vetëpunësuarit' },
    makina:    { href: 'calculators/makina',    icon: 'fi-br-car',           title: 'Taksa e Importit të Makinës' },
    tvsh:      { href: 'calculators/tvsh',      icon: 'fi-br-percentage',    title: 'TVSH (20%)' },
    dividende: { href: 'calculators/dividende', icon: 'fi-br-chart-line-up', title: 'Tatim mbi Dividentët' },
    qiraja:    { href: 'calculators/qiraja',    icon: 'fi-br-home',          title: 'Tatim mbi të Ardhurat nga Qiraja' }
  };
  var DEFAULT_SLOTS = ['paga', 'sigurime', 'makina'];
  function usage(c) { return parseInt(localStorage.getItem('pl_u_' + c), 10) || 0; }

  var top = null, topN = 0;
  Object.keys(CALCS).forEach(function(c) {
    var n = usage(c); if (n > topN) { topN = n; top = c; }
  });
  if (!top) return;

  document.addEventListener('DOMContentLoaded', function() {
    var grid = document.querySelector('.hero-calc-grid');
    if (!grid) return;
    var slots = grid.querySelectorAll('.calc-card:not(.calc-card--all)');

    if (DEFAULT_SLOTS.indexOf(top) === -1) {
      // top calc not in grid — replace the least-used default slot
      var leastIdx = 0, leastN = usage(DEFAULT_SLOTS[0]);
      for (var i = 1; i < DEFAULT_SLOTS.length; i++) {
        var n = usage(DEFAULT_SLOTS[i]);
        if (n < leastN) { leastN = n; leastIdx = i; }
      }
      var card = slots[leastIdx];
      var d = CALCS[top];
      card.setAttribute('href', d.href);
      card.querySelector('.calc-icon').innerHTML = '<i class="fi ' + d.icon + '"></i>';
      card.querySelector('.calc-card-title').textContent = d.title;
    }

  });
})();

// scroll_depth — 25/50/75/100% milestones, homepage only
(function() {
  var p = window.location.pathname;
  if (p !== '/' && p !== '/index.html' && p !== '/index') return;
  var fired = {};
  window.addEventListener('scroll', function() {
    var d = document.documentElement;
    var h = d.scrollHeight - d.clientHeight;
    if (!h) return;
    var pct = Math.round((d.scrollTop || document.body.scrollTop) / h * 100);
    [25, 50, 75, 100].forEach(function(m) {
      if (!fired[m] && pct >= m) { fired[m] = true; gtrack('scroll_depth', { percent: m }); }
    });
  }, { passive: true });
})();

// tooltip_opened — fires after shared.js has already toggled tip--open
document.addEventListener('click', function(e) {
  var tip = e.target.closest('.tip');
  if (!tip || !tip.classList.contains('tip--open')) return;
  var match = window.location.pathname.match(/\/(\w+)\.html/);
  gtrack('tooltip_opened', {
    calculator: match ? match[1] : '',
    tip: (tip.dataset.tip || '').slice(0, 40)
  });
});

// calc_card_click — only active on llogaritesit.html (harmless elsewhere)
document.querySelectorAll('.calc-card').forEach(function(card) {
  if (card.classList.contains('calc-card--adsense')) return;
  card.addEventListener('click', function() {
    var href = card.getAttribute('href') || '';
    var m = href.match(/\/(\w+)\.html/);
    var calc = m ? m[1] : (card.querySelector('.calc-card-title') || {}).textContent || '';
    gtrack('calc_card_click', {
      calculator: calc.trim(),
      is_soon: card.classList.contains('calc-card--soon')
    });
  });
});

'use strict';

function gtrack(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

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

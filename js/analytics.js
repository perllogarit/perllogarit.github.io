'use strict';

function gtrack(name, params) {
  if (name === 'calculate') {
    try { /* storage can throw in embedded iframes / strict privacy modes */
      var n = (parseInt(sessionStorage.getItem('pl_calc_n'), 10) || 0) + 1;
      sessionStorage.setItem('pl_calc_n', n);
      params = Object.assign({ session_calc_count: n }, params || {});
      if (params.calculator) {
        var lk = 'pl_u_' + params.calculator;
        localStorage.setItem(lk, (parseInt(localStorage.getItem(lk), 10) || 0) + 1);
      }
    } catch (e) {}
  }
  if (typeof gtag !== 'function') return;
  gtag('event', name, params);
}

// homepage: fill the hero grid with the user's most-used calculators.
// The card catalog is parsed from llogaritesit.html (the canonical list of
// calculators) and cached in localStorage, so new calculators are picked up
// automatically with no changes here.
(function() {
  function slugOf(href) {
    var m = (href || '').match(/calculators\/([\w-]+)/);
    return m ? m[1] : null;
  }
  function usage(slug) {
    try { return parseInt(localStorage.getItem('pl_u_' + slug), 10) || 0; }
    catch (e) { return 0; }
  }
  function readCatalog() {
    try { return JSON.parse(localStorage.getItem('pl_cards')) || null; }
    catch (e) { return null; }
  }
  function refreshCatalog() {
    var base = window.location.pathname.indexOf('/calculators/') === 0 ? '../' : '';
    fetch(base + 'llogaritesit.html').then(function(r) { return r.ok ? r.text() : ''; }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var cards = [];
      doc.querySelectorAll('a.calc-card[href]').forEach(function(a) {
        var slug = slugOf(a.getAttribute('href'));
        var icon = a.querySelector('.calc-icon i');
        var title = a.querySelector('.calc-card-title');
        if (slug && icon && title) {
          cards.push({ slug: slug, icon: icon.className, title: title.textContent.trim() });
        }
      });
      if (cards.length) localStorage.setItem('pl_cards', JSON.stringify(cards));
    }).catch(function() {});
  }
  function refreshCatalogIdle() {
    if ('requestIdleCallback' in window) requestIdleCallback(refreshCatalog);
    else setTimeout(refreshCatalog, 2000);
  }

  var p = window.location.pathname;
  if (p !== '/' && p !== '/index.html' && p !== '/index') {
    // off-homepage: warm the catalog cache so a user's first homepage
    // visit can already personalize the grid
    if (!readCatalog()) refreshCatalogIdle();
    return;
  }

  document.addEventListener('DOMContentLoaded', function() {
    var grid = document.querySelector('.hero-calc-grid');
    if (!grid) return;
    refreshCatalogIdle();

    var catalog = readCatalog();
    if (!catalog || !catalog.length) return;
    var bySlug = {};
    catalog.forEach(function(c) { bySlug[c.slug] = c; });

    var slots = [];
    grid.querySelectorAll('a.calc-card:not(.calc-card--all)').forEach(function(s) {
      if (slugOf(s.getAttribute('href'))) slots.push(s);
    });
    if (!slots.length) return;

    // desired order: used calcs by count desc, then the current defaults
    // in markup order
    var desired = catalog
      .map(function(c) { return { slug: c.slug, n: usage(c.slug) }; })
      .filter(function(x) { return x.n > 0; })
      .sort(function(a, b) { return b.n - a.n; })
      .map(function(x) { return x.slug; });
    slots.forEach(function(s) {
      var slug = slugOf(s.getAttribute('href'));
      if (desired.indexOf(slug) === -1) desired.push(slug);
    });

    slots.forEach(function(s, i) {
      var d = bySlug[desired[i]];
      if (!d || desired[i] === slugOf(s.getAttribute('href'))) return;
      s.setAttribute('href', 'calculators/' + d.slug);
      s.querySelector('.calc-icon').innerHTML = '<i class="' + d.icon + '"></i>';
      s.querySelector('.calc-card-title').textContent = d.title;
    });
  });
})();

// scroll_depth 25/50/75/100% milestones, homepage only
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

// tooltip_opened fires after shared.js has already toggled tip--open
document.addEventListener('click', function(e) {
  var tip = e.target.closest('.tip');
  if (!tip || !tip.classList.contains('tip--open')) return;
  var match = window.location.pathname.match(/\/([\w-]+)(?:\.html)?$/);
  gtrack('tooltip_opened', {
    calculator: match ? match[1] : '',
    tip: (tip.dataset.tip || '').slice(0, 40)
  });
});

// calc_card_click only active on llogaritesit.html (harmless elsewhere)
document.querySelectorAll('.calc-card').forEach(function(card) {
  if (card.classList.contains('calc-card--adsense')) return;
  card.addEventListener('click', function() {
    var href = card.getAttribute('href') || '';
    var m = href.match(/\/([\w-]+)(?:\.html)?$/);
    var calc = m ? m[1] : (card.querySelector('.calc-card-title') || {}).textContent || '';
    gtrack('calc_card_click', {
      calculator: calc.trim(),
      is_soon: card.classList.contains('calc-card--soon')
    });
  });
});

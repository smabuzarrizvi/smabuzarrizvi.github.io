/* ==========================================================================
   analytics.js — privacy-friendly visitor analytics (GoatCounter).

   1. Tracking: if data/profile.json → analytics.goatcounter is set (e.g.
      "smarizvi"), GoatCounter's script is loaded. It uses no cookies and
      stores no IP addresses.
   2. Public statistics: the home page reads data/visitors.json, a file of
      AGGREGATE counts (total + per-country) that the GitHub Action in
      .github/workflows/visitor-stats.yml refreshes daily through the
      GoatCounter API. The API token stays in GitHub Secrets and is never
      exposed to the browser.
   The widget renders nothing until real data exists — numbers are never
   invented.
   ========================================================================== */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});

  function loadTracker(code) {
    if (!code || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === 'file:') return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + encodeURIComponent(code) + '.goatcounter.com/count');
    document.head.appendChild(s);
  }

  /** Emoji flag from an ISO 3166-1 alpha-2 code; null for non-country codes. */
  function flag(cc) {
    if (!/^[A-Z]{2}$/.test(cc || '')) return null;
    return String.fromCodePoint.apply(null, cc.split('').map(function (c) { return 0x1f1e6 + c.charCodeAt(0) - 65; }));
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function renderVisitors(profile) {
    const section = document.getElementById('visitors-section');
    const root = document.getElementById('visitors');
    if (!section || !root) return;
    const code = (profile.analytics || {}).goatcounter;
    const isLocal = /^(localhost|127\.)/.test(location.hostname);

    Promise.all([Site.load('visitors'), Site.load('country-centroids')]).then(function (d) {
      const v = d[0], centroids = d[1];
      const countries = (v.countries || []).filter(function (c) { return c && c.count > 0; });
      if (!v.configured || (!countries.length && v.total == null)) {
        if (isLocal) {
          section.hidden = false;
          root.innerHTML = '<div class="dev-note"><strong>Visitor statistics are not connected yet.</strong> This note is only shown on localhost. ' +
            'Follow “Visitor analytics” in README.md to connect GoatCounter; the section stays hidden on the live site until real data exists.</div>';
        }
        return;
      }
      section.hidden = false;
      const max = countries.reduce(function (m, c) { return Math.max(m, c.count); }, 0);
      const top = countries.slice(0, 10);
      const rest = countries.slice(10).reduce(function (s, c) { return s + c.count; }, 0);
      const updated = v.updated ? new Date(v.updated) : null;

      root.innerHTML = '<div class="visitors-grid">' +
        '<div class="card"><div class="map-wrap" id="visitor-map" role="img" aria-label="World map of visitor countries"></div></div>' +
        '<div class="card">' +
          '<div class="visitor-total" id="visitor-total">' + (v.total != null ? fmt(v.total) : '—') + '</div>' +
          '<p class="muted small" style="margin:6px 0 0">total visitors' + (countries.length ? ' from ' + countries.length + ' countr' + (countries.length === 1 ? 'y' : 'ies') : '') + '</p>' +
          '<ol class="country-list">' + top.map(function (c) {
            const f = flag(c.id);
            return '<li class="country-row"><span class="flag' + (f ? '' : ' code') + '" aria-hidden="true">' + (f || Site.esc(c.id || '?')) + '</span>' +
              '<span>' + Site.esc(c.name || c.id) + '<span class="bar"><span style="width:' + (max ? (100 * c.count / max).toFixed(1) : 0) + '%"></span></span></span>' +
              '<span class="n">' + fmt(c.count) + '</span></li>';
          }).join('') + '</ol>' +
          (rest ? '<p class="muted small" style="margin:10px 0 0">Other countries: ' + fmt(rest) + '</p>' : '') +
          (updated && !isNaN(updated) ? '<p class="muted small" style="margin:10px 0 0">Updated ' + updated.toISOString().slice(0, 10) + (v.since ? ' · counting since ' + Site.esc(v.since) : '') + '</p>' : '') +
        '</div></div>';

      const pts = countries.map(function (c) {
        const ll = centroids[c.id];
        if (!ll) return null;
        return { lon: ll[0], lat: ll[1], r: 3 + 7 * Math.sqrt(c.count / (max || 1)), title: (c.name || c.id) + ': ' + fmt(c.count) };
      }).filter(Boolean);
      Site.drawMap(document.getElementById('visitor-map'), pts);

      // Optional live total from GoatCounter's public counter endpoint
      // (requires "Allow adding visitor counts on your website" in GoatCounter settings).
      if (code && (profile.analytics || {}).liveTotalCounter) {
        fetch('https://' + encodeURIComponent(code) + '.goatcounter.com/counter/TOTAL.json')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { if (j && j.count) document.getElementById('visitor-total').textContent = j.count; })
          .catch(function () { /* keep the value from visitors.json */ });
      }
    }).catch(function () { /* analytics are optional */ });
  }

  document.addEventListener('site:profile', function (e) {
    const profile = e.detail || {};
    loadTracker((profile.analytics || {}).goatcounter);
    if (document.body.getAttribute('data-page') === 'home') renderVisitors(profile);
  });
})();

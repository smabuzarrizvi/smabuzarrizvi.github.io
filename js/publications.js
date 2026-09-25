/* ==========================================================================
   publications.js — rendering, search/filter/sort, BibTeX and citations
   for data/publications.json.
   ========================================================================== */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});
  const esc = function (s) { return Site.esc(s); };
  const icon = function (n) { return Site.icon(n); };

  const TYPES = {
    journal: { label: 'Journal', heading: 'Journal Articles', prefix: 'J', bib: 'article' },
    conference: { label: 'Conference', heading: 'Conference Papers', prefix: 'C', bib: 'inproceedings' },
    chapter: { label: 'Book chapter', heading: 'Book Chapters', prefix: 'B', bib: 'incollection' },
    preprint: { label: 'Preprint', heading: 'Preprints', prefix: 'P', bib: 'misc' },
    thesis: { label: 'Thesis', heading: 'Theses', prefix: 'T', bib: 'phdthesis' }
  };
  const TYPE_ORDER = Object.keys(TYPES);

  /** Stable sort by year (file order is kept within a year: list newer items first in the JSON). */
  function sorted(list, dir) {
    return list.map(function (p, i) { return { p: p, i: i }; })
      .sort(function (a, b) { return (dir === 'asc' ? a.p.year - b.p.year : b.p.year - a.p.year) || (dir === 'asc' ? b.i - a.i : a.i - b.i); })
      .map(function (x) { return x.p; });
  }

  /** Stable per-type numbers: oldest item of each type is 1. */
  function numbering(list) {
    const out = {};
    TYPE_ORDER.forEach(function (t) {
      sorted(list.filter(function (p) { return p.type === t; }), 'asc').forEach(function (p, i) {
        out[p.id] = TYPES[t].prefix + (i + 1);
      });
    });
    return out;
  }

  function splitAuthors(a) { return String(a || '').split(/\s*,\s*|\s+and\s+/).filter(Boolean); }

  function bibAuthor(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const last = parts.pop();
    return last + ', ' + parts.join(' ');
  }

  function bibPages(p) { return String(p || '').replace(/\s*[–—-]\s*/g, '--'); }

  function bibtex(p) {
    if (p.bibtex) return p.bibtex;
    const t = TYPES[p.type] || TYPES.journal;
    const f = [
      ['title', '{' + p.title + '}'],
      ['author', splitAuthors(p.authors).map(bibAuthor).join(' and ')]
    ];
    if (p.type === 'journal') f.push(['journal', p.venue]);
    else if (p.type === 'conference' || p.type === 'chapter') f.push(['booktitle', p.venue]);
    else if (p.venue) f.push(['howpublished', p.venue]);
    if (p.volume) f.push(['volume', p.volume]);
    if (p.issue) f.push(['number', p.issue]);
    if (p.pages) f.push(['pages', bibPages(p.pages)]);
    f.push(['year', String(p.year)]);
    if (p.publisher) f.push(['publisher', p.publisher]);
    if (p.doi) f.push(['doi', p.doi]);
    if (p.url) f.push(['url', p.url]);
    return '@' + t.bib + '{' + p.id + ',\n' + f.map(function (x) { return '  ' + x[0] + ' = {' + x[1] + '}'; }).join(',\n') + '\n}';
  }

  /** IEEE-style reference. html=true italicises the venue. */
  function citation(p, html) {
    const it = function (s) { return html ? '<em>' + esc(s) + '</em>' : s; };
    const e = function (s) { return html ? esc(s) : s; };
    const parts = [];
    let s = e(p.authors) + ', “' + e(p.title) + ',” ';
    s += (p.type === 'conference' ? 'in ' : '') + it(p.venue);
    if (p.volume) parts.push('vol. ' + e(p.volume));
    if (p.issue) parts.push('no. ' + e(p.issue));
    if (p.pages) parts.push((/[–-]/.test(p.pages) ? 'pp. ' : 'p. ') + e(p.pages));
    parts.push(e(p.year));
    s += ', ' + parts.join(', ');
    if (p.doi && !html) s += ', doi: ' + p.doi;
    return s + '.';
  }

  function scholarLink(p) {
    return p.scholar || 'https://scholar.google.com/scholar?q=' + encodeURIComponent('"' + p.title + '"');
  }

  function statusClass(s) {
    s = String(s || '').toLowerCase();
    if (/published|accepted/.test(s)) return 'badge-active';
    if (/review|submitted|revision/.test(s)) return 'badge-planned';
    return '';
  }

  function renderItem(p, num, profile, themes) {
    const meta = [];
    if (p.status) meta.push('<span class="badge ' + statusClass(p.status) + '">' + esc(p.status) + '</span>');
    if (p.award) meta.push('<span class="badge badge-award">' + icon('trophy') + esc(p.award) + '</span>');
    if (p.impactFactor) meta.push('<span class="badge" title="Journal impact factor as listed in the CV">IF ' + esc(p.impactFactor) + '</span>');
    if (p.citations != null && p.citations !== '') meta.push('<span class="badge" title="Citation count (manually updated)">' + icon('quote') + 'Cited by ' + esc(p.citations) + '</span>');
    (p.topics || []).forEach(function (t) { meta.push('<span class="tag">' + esc(t) + '</span>'); });

    const details = [];
    if (p.volume) details.push('vol. ' + esc(p.volume));
    if (p.issue) details.push('no. ' + esc(p.issue));
    if (p.pages) details.push((/[–-]/.test(p.pages) ? 'pp. ' : 'p. ') + esc(p.pages));
    details.push(esc(p.year));

    const actions = [];
    if (p.doi) actions.push('<a class="btn btn-sm" href="https://doi.org/' + esc(p.doi) + '" rel="noopener">' + icon('link') + 'DOI</a>');
    if (p.url) actions.push('<a class="btn btn-sm" href="' + esc(p.url) + '" rel="noopener">' + icon('external-link') + 'Publisher</a>');
    if (p.pdf) actions.push('<a class="btn btn-sm" href="' + esc(p.pdf) + '" rel="noopener">' + icon('file-text') + 'PDF</a>');
    if (p.code) actions.push('<a class="btn btn-sm" href="' + esc(p.code) + '" rel="noopener">' + icon('github') + 'Code</a>');
    actions.push('<a class="btn btn-sm" href="' + esc(scholarLink(p)) + '" rel="noopener">' + icon('googlescholar') + 'Scholar</a>');
    actions.push('<button type="button" class="btn btn-sm" data-act="bib" aria-expanded="false" aria-controls="bib-' + esc(p.id) + '">' + icon('file-text') + 'BibTeX</button>');
    actions.push('<button type="button" class="btn btn-sm" data-act="cite">' + icon('copy') + 'Copy citation</button>');

    return '<li class="pub" id="' + esc(p.id) + '" data-id="' + esc(p.id) + '">' +
      '<span class="pub-num" aria-hidden="true">[' + esc(num) + ']</span><div>' +
      '<h3 class="pub-title">' + esc(p.title) + '</h3>' +
      '<p class="pub-authors">' + Site.highlightAuthors(p.authors, profile.highlightNames) + '</p>' +
      '<p class="pub-venue">' + (p.type === 'conference' ? 'In ' : '') + '<em>' + esc(p.venue) + '</em>, ' + details.join(', ') + '</p>' +
      (meta.length ? '<div class="pub-meta">' + meta.join('') + '</div>' : '') +
      '<div class="pub-actions">' + actions.join('') + '</div>' +
      '<div class="bibtex" id="bib-' + esc(p.id) + '" hidden><pre><code>' + esc(bibtex(p)) + '</code></pre>' +
      '<button type="button" class="btn btn-sm" data-act="copybib">' + icon('copy') + 'Copy</button></div>' +
      '</div></li>';
  }

  function injectJsonLd(pubs, profile) {
    const data = {
      '@context': 'https://schema.org',
      '@graph': pubs.map(function (p) {
        const o = {
          '@type': 'ScholarlyArticle',
          headline: p.title,
          name: p.title,
          author: splitAuthors(p.authors).map(function (a) { return { '@type': 'Person', name: a }; }),
          datePublished: String(p.year),
          isPartOf: { '@type': p.type === 'journal' ? 'Periodical' : 'PublicationEvent', name: p.venue },
          keywords: (p.topics || []).join(', ')
        };
        if (p.doi) { o.sameAs = 'https://doi.org/' + p.doi; o.identifier = { '@type': 'PropertyValue', propertyID: 'DOI', value: p.doi }; }
        if (p.url) o.url = p.url;
        if (p.pagination || p.pages) o.pagination = p.pages;
        return o;
      })
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ---------- publications page ---------- */
  function page(profile) {
    const root = document.getElementById('pub-root');
    Site.load('publications').then(function (data) {
      const all = data.publications;
      const themes = data.themes || {};
      const nums = numbering(all);
      injectJsonLd(all, profile);

      const params = new URLSearchParams(location.search);
      const state = {
        q: params.get('q') || '',
        type: params.get('type') || '',
        theme: params.get('theme') || '',
        year: params.get('year') || '',
        sort: params.get('sort') === 'asc' ? 'asc' : 'desc'
      };

      // controls
      const q = document.getElementById('pub-search');
      const selTheme = document.getElementById('pub-theme');
      const selYear = document.getElementById('pub-year');
      const selSort = document.getElementById('pub-sort');
      const count = document.getElementById('pub-count');

      Object.keys(themes).filter(function (k) { return all.some(function (p) { return (p.themes || []).indexOf(k) >= 0; }); })
        .forEach(function (k) { selTheme.insertAdjacentHTML('beforeend', '<option value="' + esc(k) + '">' + esc(themes[k]) + '</option>'); });
      Array.from(new Set(all.map(function (p) { return p.year; }))).sort(function (a, b) { return b - a; })
        .forEach(function (y) { selYear.insertAdjacentHTML('beforeend', '<option value="' + y + '">' + y + '</option>'); });
      const types = TYPE_ORDER.filter(function (t) { return all.some(function (p) { return p.type === t; }); });
      Site.chips(document.getElementById('pub-types'),
        [{ value: '', label: 'All', count: all.length }].concat(types.map(function (t) {
          return { value: t, label: TYPES[t].label, count: all.filter(function (p) { return p.type === t; }).length };
        })), state.type, function (v) { state.type = v; draw(); });

      q.value = state.q; selTheme.value = state.theme; selYear.value = state.year; selSort.value = state.sort;
      let timer;
      q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { state.q = q.value; draw(); }, 120); });
      selTheme.addEventListener('change', function () { state.theme = selTheme.value; draw(); });
      selYear.addEventListener('change', function () { state.year = selYear.value; draw(); });
      selSort.addEventListener('change', function () { state.sort = selSort.value; draw(); });

      function haystack(p) {
        return [p.title, p.authors, p.venue, p.shortVenue, p.year, (p.topics || []).join(' '),
          (p.themes || []).map(function (t) { return themes[t] || ''; }).join(' '), p.award, p.status].join(' ').toLowerCase();
      }

      function draw() {
        const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
        const list = sorted(all.filter(function (p) {
          if (state.type && p.type !== state.type) return false;
          if (state.theme && (p.themes || []).indexOf(state.theme) < 0) return false;
          if (state.year && String(p.year) !== state.year) return false;
          const h = haystack(p);
          return terms.every(function (t) { return h.indexOf(t) >= 0; });
        }), state.sort);

        count.textContent = 'Showing ' + list.length + ' of ' + all.length;
        const groups = TYPE_ORDER.map(function (t) { return { t: t, items: list.filter(function (p) { return p.type === t; }) }; })
          .filter(function (g) { return g.items.length; });
        root.innerHTML = groups.length ? groups.map(function (g) {
          return '<section class="pub-group" aria-labelledby="grp-' + g.t + '"><h2 id="grp-' + g.t + '">' + TYPES[g.t].heading +
            ' <span class="count">' + g.items.length + '</span></h2><ol class="pub-list">' +
            g.items.map(function (p) { return renderItem(p, nums[p.id], profile, themes); }).join('') + '</ol></section>';
        }).join('') : '<p class="empty-note">No publications match your search.</p>';

        // keep the URL shareable
        const u = new URLSearchParams();
        if (state.q) u.set('q', state.q);
        if (state.type) u.set('type', state.type);
        if (state.theme) u.set('theme', state.theme);
        if (state.year) u.set('year', state.year);
        if (state.sort !== 'desc') u.set('sort', state.sort);
        const qs = u.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      }

      root.addEventListener('click', function (e) {
        const b = e.target.closest('button[data-act]');
        if (!b) return;
        const li = b.closest('.pub');
        const p = all.find(function (x) { return x.id === li.dataset.id; });
        const act = b.dataset.act;
        if (act === 'bib') {
          const box = document.getElementById('bib-' + p.id);
          const open = box.hidden;
          box.hidden = !open;
          b.setAttribute('aria-expanded', String(open));
        } else if (act === 'copybib') {
          Site.copy(bibtex(p), 'BibTeX copied');
        } else if (act === 'cite') {
          Site.copy(citation(p, false), 'Citation copied');
        }
      });

      draw();
      if (location.hash) {
        const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el) el.scrollIntoView();
      }
    }).catch(function (e) { Site.fail(root, e); });
  }

  Site.Pubs = { sorted: sorted, bibtex: bibtex, citation: citation, page: page, TYPES: TYPES };
})();

/* ==========================================================================
   main.js — shared utilities, theme, navigation, and page renderers.
   All content lists are rendered from the JSON files in /data.
   ========================================================================== */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});
  const cache = {};

  /* ---------- utilities ---------- */
  Site.load = function (name) {
    if (!cache[name]) {
      cache[name] = fetch('data/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('Could not load data/' + name + '.json (' + r.status + ')');
        return r.json();
      });
    }
    return cache[name];
  };

  Site.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const esc = Site.esc;

  Site.icon = function (name, cls) {
    return '<svg class="' + (cls || 'icon') + '" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#i-' + name + '"></use></svg>';
  };
  const icon = Site.icon;

  Site.$ = function (sel, root) { return (root || document).querySelector(sel); };
  const $ = Site.$;

  /** Bold the site owner's name inside an author string. */
  Site.highlightAuthors = function (authors, names) {
    let html = esc(authors);
    (names || []).forEach(function (n) {
      const safe = esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp('(^|[\\s,])(' + safe + ')(?=$|[\\s,])', 'g'), '$1<span class="me">$2</span>');
    });
    return html;
  };

  Site.toast = function (msg) {
    const t = $('.toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  Site.copy = function (text, okMsg) {
    const done = function () { Site.toast(okMsg || 'Copied to clipboard'); };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    }
    fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { Site.toast('Copy failed — please copy manually'); }
      document.body.removeChild(ta);
    }
  };

  Site.storage = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  Site.fail = function (el, err) {
    if (el) el.innerHTML = '<p class="empty-note">This section could not be loaded. If you are viewing the site from a local file, run a local web server (see README).</p>';
    if (window.console) console.error(err);
  };

  /** Render filter chips. items: [{value,label,count}] */
  Site.chips = function (root, items, active, onChange) {
    root.innerHTML = items.map(function (it) {
      return '<button type="button" class="chip" data-value="' + esc(it.value) + '" aria-pressed="' + (it.value === active) + '">' +
        esc(it.label) + (it.count != null ? ' <span class="count">' + it.count + '</span>' : '') + '</button>';
    }).join('');
    root.addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      root.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      onChange(b.dataset.value);
    });
  };

  /* ---------- world map (equirectangular, matches assets/images/world-dots.svg) ---------- */
  Site.project = function (lon, lat) {
    return [(lon + 180) / 360 * 1000, (84 - lat) / 360 * 1000];
  };
  /** points: [{lon,lat,r,label,title}] */
  Site.drawMap = function (el, points, opts) {
    opts = opts || {};
    let svg = '<svg class="map-svg" viewBox="0 0 1000 394.4" aria-hidden="true">';
    if (opts.arcs && points.length > 1) {
      for (let i = 0; i < points.length - 1; i++) {
        const a = Site.project(points[i].lon, points[i].lat), b = Site.project(points[i + 1].lon, points[i + 1].lat);
        const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.abs(a[0] - b[0]) * 0.25;
        svg += '<path class="arc" d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '"/>';
      }
    }
    points.forEach(function (p) {
      const xy = Site.project(p.lon, p.lat), r = p.r || 5;
      svg += '<g><title>' + esc(p.title || p.label || '') + '</title>' +
        '<circle class="pt-pulse" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="' + (r * 2.4).toFixed(1) + '"/>' +
        '<circle class="pt" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/>';
      if (p.label) {
        const right = xy[0] < 820;
        svg += '<text class="pt-label" x="' + (xy[0] + (right ? r + 6 : -(r + 6))).toFixed(1) + '" y="' + (xy[1] + 4).toFixed(1) + '"' + (right ? '' : ' text-anchor="end"') + '>' + esc(p.label) + '</text>';
      }
      svg += '</g>';
    });
    svg += '</svg>';
    el.innerHTML = '<div class="map-land"></div>' + svg;
  };

  /* ---------- theme ---------- */
  function initTheme() {
    const root = document.documentElement;
    const btn = $('.theme-toggle');
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const current = function () { return root.getAttribute('data-theme') || (mq && mq.matches ? 'dark' : 'light'); };
    const sync = function () {
      const t = current();
      root.setAttribute('data-theme', t);
      if (btn) {
        btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('aria-pressed', String(t === 'dark'));
      }
    };
    sync();
    if (btn) btn.addEventListener('click', function () {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      Site.storage.set('theme', next);
      sync();
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', function () {
      if (!Site.storage.get('theme')) { root.removeAttribute('data-theme'); sync(); }
    });
  }

  /* ---------- navigation ---------- */
  function initNav() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const menu = $('#nav-menu');
    const onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && menu) {
      const setOpen = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.classList.toggle('open', open);
      };
      toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
      });
      document.addEventListener('click', function (e) {
        if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-nav') && !e.target.closest('.nav-toggle')) setOpen(false);
      });
    }

    // On-page sub-navigation: highlight the section in view.
    const links = Array.prototype.slice.call(document.querySelectorAll('.subnav a[href^="#"]'));
    if (links.length && 'IntersectionObserver' in window) {
      const map = {};
      links.forEach(function (a) { const s = document.getElementById(a.getAttribute('href').slice(1)); if (s) map[s.id] = a; });
      const visible = {};
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        const first = Object.keys(map).find(function (id) { return visible[id]; });
        links.forEach(function (a) { a.classList.toggle('active', map[first] === a); });
      }, { rootMargin: '-120px 0px -55% 0px' });
      Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  }

  /* ---------- reveal on scroll (subtle) ---------- */
  Site.reveal = function (root) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = (root || document).querySelectorAll('.card:not(.tl-card), .tl-item, .pub');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already on screen: do not animate
      el.classList.add('reveal');
      io.observe(el);
    });
  };

  /* ---------- profile links ---------- */
  const LINKS = [
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'scholar', label: 'Google Scholar', icon: 'googlescholar' },
    { key: 'github', label: 'GitHub', icon: 'github' },
    { key: 'orcid', label: 'ORCID', icon: 'orcid' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { key: 'researchgate', label: 'ResearchGate', icon: 'researchgate' },
    { key: 'labPage', label: 'Lab / university profile', icon: 'building-2' }
  ];
  Site.profileLinks = function (p) {
    return LINKS.map(function (l) {
      const href = l.key === 'email' ? (p.email ? 'mailto:' + p.email : '') : (p.links || {})[l.key];
      return href ? { key: l.key, label: l.label, icon: l.icon, href: href, text: l.key === 'email' ? p.email : prettyUrl(href) } : null;
    }).filter(Boolean);
  };
  function prettyUrl(u) {
    return u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').replace(/[?&]hl=en/, '');
  }

  function renderSocial(p) {
    const links = Site.profileLinks(p);
    document.querySelectorAll('[data-social]').forEach(function (ul) {
      const compact = ul.getAttribute('data-social') === 'compact';
      ul.innerHTML = links.map(function (l) {
        const ext = l.key === 'email' ? '' : ' rel="noopener me"';
        return '<li><a href="' + esc(l.href) + '"' + ext + (compact ? ' aria-label="' + esc(l.label) + '" title="' + esc(l.label) + '"' : '') + '>' +
          icon(l.icon) + (compact ? '' : '<span>' + esc(l.label) + '</span>') + '</a></li>';
      }).join('');
    });
    const photo = $('[data-profile-photo]');
    if (photo && p.photo && photo.getAttribute('src') !== p.photo) photo.src = p.photo;
  }

  /* ---------- page: home ---------- */
  function renderHome(profile) {
    Promise.all([Site.load('publications'), Site.load('achievements'), Site.load('research')])
      .then(function (d) {
        const pubs = d[0].publications, ach = d[1], research = d[2];
        const m = profile.metrics || {};
        const n = function (t) { return pubs.filter(function (x) { return x.type === t; }).length; };
        const granted = ach.patents.filter(function (x) { return /grant/i.test(x.status); }).length;
        const src = 'Google Scholar' + (m.asOf ? ' · ' + m.asOf : '');
        const stats = [];
        if (m.citations != null) stats.push({ v: m.citations, l: 'Citations', s: src });
        if (m.hIndex != null) stats.push({ v: m.hIndex, l: 'h-index', s: src });
        if (m.i10Index != null) stats.push({ v: m.i10Index, l: 'i10-index', s: src });
        stats.push({ v: n('journal'), l: 'Journal articles' }, { v: n('conference'), l: 'Conference papers' },
          { v: ach.patents.length, l: 'Patents', s: granted ? granted + ' granted · ' + (ach.patents.length - granted) + ' pending' : '' });
        $('#stats').innerHTML = stats.filter(function (s) { return s.v; }).map(function (s) {
          return '<div class="stat"><span class="value">' + esc(s.v) + '</span><span class="label">' + esc(s.l) + '</span>' + (s.s ? '<span class="sub">' + esc(s.s) + '</span>' : '') + '</div>';
        }).join('');

        // research areas: the problem each one addresses and who it matters to
        $('#focus-list').innerHTML = research.themes.map(function (t) {
          return '<article class="card card-hover area-card"><header><span class="theme-icon">' + icon(t.icon) + '</span><h3>' + esc(t.title) + '</h3></header>' +
            '<p class="area-tagline">' + esc(t.tagline) + '</p>' +
            '<div><p class="area-label">Relevant to</p><ul class="tags">' + (t.relevant || []).map(function (r) { return '<li class="tag">' + esc(r) + '</li>'; }).join('') + '</ul></div>' +
            '<a class="more-link" href="research.html#' + esc(t.id) + '">The problem and my approach ' + icon('arrow-right') + '</a></article>';
        }).join('');

        // selected publications
        const themeName = {};
        research.themes.forEach(function (t) { themeName[t.id] = t.title; });
        const sel = Site.Pubs.sorted(pubs.filter(function (p) { return p.selected; }), 'desc');
        $('#selected-list').innerHTML = sel.map(function (p) {
          return '<li class="card selected-item"><div class="sel-top"><span class="sel-year">' + esc(p.year) + '</span>' +
            (p.award ? '<span class="badge badge-award">' + icon('trophy') + esc(p.award) + '</span>' : '') +
            (p.citations != null ? '<span class="badge">' + icon('quote') + 'Cited by ' + esc(p.citations) + '</span>' : '') + '</div>' +
            '<h3 class="pub-title"><a href="publications.html#' + esc(p.id) + '">' + esc(p.title) + '</a></h3>' +
            '<p class="sel-summary">' + esc(p.summary) + '</p>' +
            '<p class="pub-venue" style="margin:0"><em>' + esc(p.shortVenue ? p.venue.replace(/\s*\([^)]*\)$/, '') : p.venue) + '</em></p></li>';
        }).join('');

        // international collaborators (joint paper counts come from the author lists)
        $('#people-root').innerHTML = (research.collaborators || []).map(function (c) {
          const n = pubs.filter(function (p) { return p.authors.indexOf(c.match) >= 0; }).length;
          return '<li class="card person"><h3>' + esc(c.name) + '</h3><p class="person-aff">' + esc(c.affiliation) + '</p>' +
            '<p class="person-country">' + icon('map-pin') + esc(c.country) + '</p>' +
            (n ? '<a class="more-link" href="publications.html?q=' + encodeURIComponent(c.search) + '">' + n + ' joint paper' + (n === 1 ? '' : 's') + ' ' + icon('arrow-right') + '</a>' : '') + '</li>';
        }).join('');

        // collaboration interests
        const grp = function (title, icn, items) {
          return '<div class="card collab-card"><h3>' + icon(icn) + esc(title) + '</h3><ul class="collab-list">' + items.map(function (i) {
            return '<li><strong>' + esc(i.title) + '.</strong> ' + esc(i.text) + '</li>';
          }).join('') + '</ul></div>';
        };
        $('#collab-root').innerHTML = grp('Quantum industry', 'building-2', research.collaboration.industry) +
          grp('Academic groups', 'users', research.collaboration.academic);
        Site.reveal($('main'));
      })
      .catch(function (e) { Site.fail($('#selected-list'), e); });
  }

  /* ---------- page: research ---------- */
  function renderResearch() {
    Promise.all([Site.load('research'), Site.load('publications'), Site.load('projects')]).then(function (d) {
      const research = d[0], pubs = d[1].publications, projects = d[2].projects;
      $('#themes-root').innerHTML = research.themes.map(function (t) {
        const rp = Site.Pubs.sorted(pubs.filter(function (p) { return (p.themes || []).indexOf(t.id) >= 0; }), 'desc');
        const pj = projects.filter(function (p) { return (p.themes || []).indexOf(t.id) >= 0; });
        const stat = [rp.length + ' publication' + (rp.length === 1 ? '' : 's')];
        if (pj.length) stat.push(pj.length + ' funded project' + (pj.length === 1 ? '' : 's'));
        return '<article class="card theme-card theme-wide" id="' + esc(t.id) + '">' +
          '<header><span class="theme-icon">' + icon(t.icon) + '</span><div><h2 style="font-size:1.35rem;margin:0 0 4px">' + esc(t.title) + '</h2><p class="theme-status">' + esc(stat.join(' · ')) + '</p></div></header>' +
          '<div class="theme-cols"><div>' +
            '<h3 class="mini-h">The problem</h3><p class="summary">' + esc(t.problem) + '</p>' +
            '<h3 class="mini-h">My approach</h3><p class="summary">' + esc(t.approach) + '</p>' +
            '<ul class="tags">' + t.keywords.map(function (k) { return '<li class="tag">' + esc(k) + '</li>'; }).join('') + '</ul>' +
          '</div><div class="related">' +
            (rp.length ? '<h3 class="mini-h">Papers</h3><ul>' + rp.map(function (p) {
              return '<li><a href="publications.html#' + esc(p.id) + '">' + esc(p.title) + '</a> <span class="yr">(' + esc(p.year) + ')</span></li>';
            }).join('') + '</ul>' : '') +
            (pj.length ? '<h3 class="mini-h">Funded projects</h3><ul>' + pj.map(function (p) {
              return '<li>' + esc(p.title) + ' <span class="yr">(' + esc(p.start) + '–' + esc(p.end) + ')</span></li>';
            }).join('') + '</ul>' : '') +
          '</div></div></article>';
      }).join('');
      $('#skills-root').innerHTML = research.skills.map(function (g) {
        return '<div class="card skill-group"><h3>' + icon(g.icon) + esc(g.group) + '</h3><ul class="tags">' +
          g.items.map(function (s) { return '<li class="tag">' + esc(s) + '</li>'; }).join('') + '</ul></div>';
      }).join('');
      if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
      Site.reveal($('main'));
    }).catch(function (e) { Site.fail($('#themes-root'), e); });
  }

  /* ---------- page: projects ---------- */
  Site.projectStatus = function (p) {
    if (p.status) return p.status;
    const y = new Date().getFullYear();
    if (p.start > y) return 'Planned';
    return p.end < y ? 'Completed' : 'Active';
  };
  function renderProjects(profile) {
    Promise.all([Site.load('projects'), Site.load('publications')]).then(function (d) {
      const projects = d[0].projects.slice(), byId = {};
      d[1].publications.forEach(function (p) { byId[p.id] = p; });
      // PI projects first, then newest start year
      projects.sort(function (a, b) {
        const pa = /principal/i.test(a.role) ? 0 : 1, pb = /principal/i.test(b.role) ? 0 : 1;
        return pa - pb || b.start - a.start || b.end - a.end;
      });
      const areas = [];
      projects.forEach(function (p) { (p.areas || []).forEach(function (a) { if (areas.indexOf(a) < 0) areas.push(a); }); });
      const root = $('#projects-root');
      function draw(area) {
        const list = projects.filter(function (p) { return !area || (p.areas || []).indexOf(area) >= 0; });
        root.innerHTML = list.map(function (p) {
          const st = Site.projectStatus(p);
          const papers = (p.papers || []).map(function (id) { return byId[id]; }).filter(Boolean);
          const kv = [
            ['Funding', esc(p.funder)],
            ['Role', '<span class="' + (/principal/i.test(p.role) ? 'role-pi' : '') + '">' + esc(p.role) + '</span>']
          ];
          if (p.problem) kv.push(['Problem', esc(p.problem)]);
          if (p.tools && p.tools.length) kv.push(['Tools', esc(p.tools.join(', '))]);
          if (papers.length) kv.push(['Papers', papers.map(function (x) { return '<a href="publications.html#' + esc(x.id) + '">' + esc(x.title) + '</a>'; }).join('<br>')]);
          if (p.repo) kv.push(['Code', '<a href="' + esc(p.repo) + '" rel="noopener">' + esc(p.repo.replace(/^https?:\/\/(www\.)?/, '')) + '</a>']);
          return '<article class="card card-hover project-card">' +
            '<div class="project-top"><span class="project-period">' + icon('calendar') + esc(p.start) + '–' + esc(p.end) + '</span><span class="badge badge-' + st.toLowerCase() + '">' + esc(st) + '</span></div>' +
            '<h2 style="font-size:1.12rem;margin:0;line-height:1.35">' + esc(p.title) + '</h2>' +
            (p.description ? '<p class="small" style="margin:0">' + esc(p.description) + '</p>' : '') +
            '<dl class="kv">' + kv.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>' +
            '<ul class="tags">' + (p.areas || []).map(function (a) { return '<li class="tag">' + esc(a) + '</li>'; }).join('') + '</ul>' +
            '</article>';
        }).join('') || '<p class="empty-note">No projects in this area.</p>';
        Site.reveal(root);
      }
      Site.chips($('#project-filters'), [{ value: '', label: 'All', count: projects.length }].concat(areas.map(function (a) {
        return { value: a, label: a, count: projects.filter(function (p) { return p.areas.indexOf(a) >= 0; }).length };
      })), '', draw);
      draw('');
    }).catch(function (e) { Site.fail($('#projects-root'), e); });
  }

  /* ---------- page: achievements ---------- */
  function renderAchievements(profile) {
    Promise.all([Site.load('achievements'), Site.load('publications')]).then(function (d) {
      const a = d[0], byId = {};
      d[1].publications.forEach(function (p) { byId[p.id] = p; });
      $('#awards-root').innerHTML = a.awards.map(function (w) {
        const p = byId[w.paper];
        return '<article class="card award-card"><span class="award-icon">' + icon('trophy') + '</span><div>' +
          '<span class="year">' + esc(w.year) + '</span><h3>' + esc(w.title) + '</h3><p class="muted">' + esc(w.event) + '</p>' +
          (p ? '<p>For <a href="publications.html#' + esc(p.id) + '">“' + esc(p.title) + '”</a></p>' : '') + '</div></article>';
      }).join('');
      $('#patents-root').innerHTML = a.patents.map(function (p) {
        return '<article class="card patent-card">' +
          '<div class="project-top"><span class="num">' + esc(p.country) + ' ' + esc(p.numberType) + ' ' + esc(p.number) + '</span><span class="badge badge-' + esc(p.status.toLowerCase()) + '">' + esc(p.status) + '</span></div>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="inventors"><span class="visually-hidden">Inventors: </span>' + Site.highlightAuthors(p.inventors, profile.highlightNames) + '</p>' +
          (p.filed ? '<p class="small muted" style="margin:0">Filed ' + esc(p.filed) + '</p>' : '') +
          (p.description ? '<p class="small" style="margin:0">' + esc(p.description) + '</p>' : '') +
          '</article>';
      }).join('');
      $('#cert-root').innerHTML = a.certifications.map(function (c) {
        return '<article class="card award-card"><span class="award-icon">' + icon('file-badge') + '</span><div><span class="year">' + esc(c.date) + '</span>' +
          '<h3>' + (c.link ? '<a href="' + esc(c.link) + '" rel="noopener">' + esc(c.title) + '</a>' : esc(c.title)) + '</h3><p class="muted">' + esc(c.issuer) + '</p>' +
          (c.description ? '<p class="small">' + esc(c.description) + '</p>' : '') +
          (c.image ? '<p class="small"><a href="' + esc(c.image) + '">' + icon('file-badge') + ' View certificate</a></p>' : '') +
          '</div></article>';
      }).join('');
      if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
    }).catch(function (e) { Site.fail($('#awards-root'), e); });
  }

  /* ---------- page: education ---------- */
  function renderEducation() {
    Site.load('cv').then(function (cv) {
      $('#education-root').innerHTML = cv.education.map(function (e) {
        const rows = [];
        if (e.lab) rows.push(['Laboratory', e.lab]);
        if (e.specialization) rows.push(['Research', e.specialization]);
        if (e.advisor) rows.push(['Advisor', e.advisor]);
        if (e.thesis) rows.push(['Dissertation', e.thesis]);
        if (e.expectedGraduation) rows.push(['Expected graduation', e.expectedGraduation]);
        if (e.gpa) rows.push(['GPA', e.gpa]);
        if (e.scholarships) rows.push(['Scholarships', e.scholarships]);
        const logo = e.logo ? '<img class="edu-logo" src="' + esc(e.logo) + '" alt="' + esc(e.logoAlt || e.institution + ' logo') + '" loading="lazy">' : '';
        return '<li><article class="card edu-card' + (logo ? ' has-logo' : '') + '">' + logo + '<div class="edu-body"><div class="vt-head"><h2 class="edu-degree">' + esc(e.degree) + '</h2><span class="vt-dates">' + esc(e.start) + ' – ' + esc(e.end) + '</span></div>' +
          '<p class="vt-org">' + esc(e.institution) + ' · ' + esc(e.location) + '</p>' +
          (rows.length ? '<dl class="kv">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' : '') +
          '</div></article></li>';
      }).join('');
    }).catch(function (e) { Site.fail($('#education-root'), e); });
  }

  /* ---------- page: contact ---------- */
  function renderContact(profile) {
    const ul = $('#contact-links');
    ul.innerHTML = Site.profileLinks(profile).map(function (l) {
      return '<li><a href="' + esc(l.href) + '"' + (l.key === 'email' ? '' : ' rel="noopener me"') + '>' + icon(l.icon) +
        '<span><span class="lbl">' + esc(l.label) + '</span><span class="val">' + esc(l.text) + '</span></span></a></li>';
    }).join('');
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNav();
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    const page = document.body.getAttribute('data-page');
    Site.load('profile').then(function (profile) {
      Site.profile = profile;
      renderSocial(profile);
      const run = {
        home: renderHome, research: renderResearch, projects: renderProjects,
        achievements: renderAchievements, education: renderEducation, contact: renderContact,
        publications: function (p) { Site.Pubs.page(p); }
      }[page];
      if (run) run(profile);
      document.dispatchEvent(new CustomEvent('site:profile', { detail: profile }));
    }).catch(function (e) { Site.fail(null, e); });
  });
})();

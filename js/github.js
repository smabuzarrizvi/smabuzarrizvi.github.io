/* ==========================================================================
   github.js — optional, lightweight GitHub summary on the home page.
   Uses the public GitHub REST API (no token; 60 requests/hour per visitor)
   and caches the result for an hour in sessionStorage. If the request fails
   or there are no public repositories, the section stays hidden.
   ========================================================================== */
(function () {
  'use strict';

  const Site = (window.Site = window.Site || {});
  const TTL = 60 * 60 * 1000;

  function cached(key, fetcher) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.t < TTL) return Promise.resolve(c.v);
      }
    } catch (e) { /* storage unavailable */ }
    return fetcher().then(function (v) {
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* ignore */ }
      return v;
    });
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
      if (!r.ok) throw new Error('GitHub API ' + r.status);
      return r.json();
    });
  }

  function render(cfg) {
    const section = document.getElementById('code-section');
    if (!section || !cfg || !cfg.username || cfg.showActivity === false) return;
    const u = encodeURIComponent(cfg.username);
    cached('gh:' + cfg.username, function () {
      return Promise.all([
        getJSON('https://api.github.com/users/' + u),
        getJSON('https://api.github.com/users/' + u + '/repos?per_page=100&sort=updated')
      ]).then(function (d) {
        return {
          user: { html_url: d[0].html_url, public_repos: d[0].public_repos, followers: d[0].followers },
          repos: d[1].filter(function (r) { return !r.fork && !r.archived && r.name.toLowerCase() !== (cfg.username + '.github.io').toLowerCase(); })
            .map(function (r) {
              return { name: r.name, url: r.html_url, desc: r.description, lang: r.language, stars: r.stargazers_count, forks: r.forks_count, updated: r.pushed_at };
            })
        };
      });
    }).then(function (d) {
      const esc = Site.esc, icon = Site.icon;
      const repos = d.repos.filter(function (r) { return r.desc; }); // show documented repositories only
      if (!d.user.public_repos) return;
      const stars = d.repos.reduce(function (s, r) { return s + r.stars; }, 0);
      document.getElementById('gh-profile-link').href = d.user.html_url;
      document.getElementById('gh-stats').innerHTML =
        '<div><strong>' + d.user.public_repos + '</strong>public repositories</div>' +
        (stars ? '<div><strong>' + stars + '</strong>stars</div>' : '');
      const top = repos.slice().sort(function (a, b) { return b.stars - a.stars || (a.updated < b.updated ? 1 : -1); }).slice(0, cfg.maxRepos || 6);
      document.getElementById('gh-repos').innerHTML = top.map(function (r) {
        return '<a class="card card-hover repo-card" href="' + esc(r.url) + '" rel="noopener">' +
          '<span class="name">' + icon('folder-git-2') + esc(r.name) + '</span>' +
          '<p class="desc">' + esc(r.desc) + '</p>' +
          '<span class="meta">' + (r.lang ? '<span>' + esc(r.lang) + '</span>' : '') +
          '<span>' + icon('star') + r.stars + '</span><span>' + icon('git-fork') + r.forks + '</span></span></a>';
      }).join('');
      section.hidden = false;
    }).catch(function () { /* optional widget: stay hidden */ });
  }

  document.addEventListener('site:profile', function (e) { render((e.detail || {}).github); });
})();

# Academic website — Syed Muhammad Abuzar Rizvi

A static academic website for GitHub Pages. It uses plain HTML, CSS and JavaScript. There is no build step, no framework and no server.
Every list on the site (publications, projects, timeline, awards, patents, education, skills) is rendered from JSON files in [`data/`](data/). To update the site, you edit a JSON file and push.

Live URL: **https://smabuzarrizvi.github.io/**. It is served from the repository [`smabuzarrizvi/smabuzarrizvi.github.io`](https://github.com/smabuzarrizvi/smabuzarrizvi.github.io).

All content comes from the CV (`main.pdf`, Sept. 2026) and the Google Scholar profile (citation metrics, per-paper citations, and the 2026 IEEE TNSE paper on quantum fusion learning). Nothing was invented. Fields the CV does not provide, such as DOIs, advisor, thesis title, conference locations and citation metrics, are left empty, and the site hides them automatically until you fill them in.

---

## Contents

1. [Repository structure](#repository-structure)
2. [Run locally](#run-locally)
3. [Deploy on GitHub Pages](#deploy-on-github-pages)
4. [Updating content](#updating-content)
   - [Publications](#publications) · [Projects](#projects) · [Timeline](#timeline-academic-journey) · [Other data](#other-data-files)
   - [CV](#updating-the-cv) · [Photo](#profile-photo) · [Profile links & metrics](#profile-links-and-google-scholar-metrics)
5. [Visitor analytics](#visitor-analytics)
6. [GitHub activity widget](#github-activity-widget)
7. [Custom domain](#custom-domain)
8. [SEO notes](#seo-notes)
9. [Design & accessibility notes](#design--accessibility-notes)
10. [Checklist: what you still need to provide](#checklist-what-you-still-need-to-provide)

---

## Repository structure

```
/
├── index.html              Home: bio, stats, research areas, latest papers, milestones, GitHub, visitors
├── journey.html            Academic timeline (filterable) + conferences & places map
├── research.html           Research themes (auto-linked to papers/projects) + methods & tools
├── publications.html       Search / filter / sort, BibTeX, copy citation, DOI links
├── projects.html           Funded projects, filterable by area
├── achievements.html       Awards, patents, leadership, certifications
├── education.html          Education + experience
├── cv.html                 Embedded CV viewer + download
├── contact.html            Affiliation, email, profiles
├── 404.html
├── css/style.css           All styles (light + dark themes as CSS variables)
├── js/
│   ├── main.js             Theme, navigation, data loading, page renderers
│   ├── publications.js     Publication list, filters, BibTeX/citation generation, JSON-LD
│   ├── analytics.js        GoatCounter tracking + aggregate visitor widget
│   └── github.js           Optional GitHub repositories widget
├── data/
│   ├── profile.json        Name, position, links, optional Scholar metrics, analytics/GitHub settings
│   ├── publications.json   Publications + research-theme names
│   ├── projects.json       Funded projects
│   ├── timeline.json       Academic-journey events
│   ├── research.json       Research themes + skills
│   ├── achievements.json   Awards, patents, leadership, certifications
│   ├── cv.json             Education + experience
│   ├── conferences.json    Conferences and places (map)
│   ├── visitors.json       Aggregate visitor stats (written by the GitHub Action, do not edit by hand)
│   └── country-centroids.json  ISO country code → map coordinates (static)
├── assets/
│   ├── files/CV.pdf        Public CV (phone, home address and referees' contacts removed)
│   ├── images/             portrait.jpg, og-image.png, favicon.svg, world-dots.svg
│   ├── icons/sprite.svg    Self-hosted SVG icons (Lucide + Simple Icons)
│   └── fonts/              Self-hosted Inter + Source Serif 4 (variable, Latin subset)
├── scripts/update_visitors.py        Pulls aggregate stats from GoatCounter's API
├── .github/workflows/visitor-stats.yml  Runs the script daily
├── sitemap.xml · robots.txt · .nojekyll
└── README.md
```

`.nojekyll` tells GitHub Pages to serve the files as they are, without running Jekyll.

---

## Run locally

The pages load JSON with `fetch()`, so they need to be served over HTTP. Opening `index.html` directly from disk (`file://`) will not work.

```bash
git clone https://github.com/smabuzarrizvi/smabuzarrizvi.github.io.git
cd smabuzarrizvi.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

Any static server works, for example `npx serve .`. On `localhost` the home page shows a note if visitor analytics are not yet connected. The live site never shows this note.

---

## Deploy on GitHub Pages

The site is a GitHub Pages **user site**. A repository named exactly `smabuzarrizvi.github.io` is published at `https://smabuzarrizvi.github.io/`.

- **Publishing an update:** push to the `main` branch of `smabuzarrizvi/smabuzarrizvi.github.io`. GitHub rebuilds the site within about a minute. The build shows under the repository's **Actions** tab as "pages build and deployment".
- **Pages settings:** **Settings → Pages** should show **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**. If Pages ever reports no source, set it there and save.
- **Moving to another repository or a subpath:** replace the base URL in the HTML, `sitemap.xml` and `robots.txt`:

```bash
grep -rl "https://smabuzarrizvi.github.io/" --include="*.html" --include="*.xml" --include="*.txt" . \
  | xargs sed -i 's#https://smabuzarrizvi.github.io/#https://NEW-BASE-URL/#g'
```

(On macOS use `sed -i ''`.)

---

## Updating content

After editing any JSON file, check that it is still valid JSON. A missing comma will stop that section from rendering.

```bash
python3 -m json.tool data/publications.json > /dev/null && echo OK
```

### Publications

Add an object to the `publications` array in [`data/publications.json`](data/publications.json). Items are sorted by `year`. Within a year, items listed **earlier in the file appear first**, so put new papers at the top.

```json
{
  "id": "rizvi2026example",
  "type": "journal",
  "title": "Paper Title",
  "authors": "S.M.A. Rizvi, U. Khalid, H. Shin",
  "venue": "IEEE Transactions on Quantum Engineering",
  "year": 2026,
  "volume": "7", "issue": "2", "pages": "1–12",
  "doi": "10.1109/TQE.2026.0000000",
  "url": "https://ieeexplore.ieee.org/document/...",
  "pdf": "assets/files/papers/rizvi2026example.pdf",
  "code": "https://github.com/smabuzarrizvi/...",
  "status": "Published",
  "citations": 12,
  "award": "Best Paper Award",
  "impactFactor": "7.9",
  "themes": ["qcomm"],
  "topics": ["Quantum Communication", "Quantum MIMO"]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique. Used as the BibTeX key and the anchor (`publications.html#id`). |
| `type` | yes | `journal`, `conference`, `chapter`, `preprint` or `thesis`. The type filter chips appear automatically. |
| `title`, `authors`, `venue`, `year` | yes | Separate authors with commas. Your name is bolded wherever it matches `highlightNames` in `profile.json`. |
| `shortVenue` | no | Short label such as `ICOIN 2026`, used on the timeline. |
| `volume`, `issue`, `pages` | no | Shown when present. |
| `doi` | no | Adds a **DOI** button and is included in BibTeX. |
| `url` / `pdf` / `code` | no | **Publisher**, **PDF** and **Code** buttons. |
| `scholar` | no | Direct Google Scholar link. Without it, the **Scholar** button runs a title search. |
| `status` | no | `Published`, `Accepted`, `Under Review`, etc. Shown as a badge. |
| `citations` | no | Citation count you copy by hand from Scholar. Shown as "Cited by N". |
| `award`, `impactFactor` | no | Badges. |
| `themes` | no | Keys from the `themes` map at the top of the file. These drive the research-area filter and the Research page. |
| `topics` | no | Free-text tags. They are searchable. |
| `bibtex` | no | Full BibTeX string. Overrides the automatically generated entry. |

To add a new research area, add a key to `themes` in `publications.json` **and** a matching entry (same `id`) in `data/research.json`.

**Why the site doesn't pull from Google Scholar:** Scholar has no public API, and fetching it from the browser is unreliable and against its terms of service. Update citation counts and metrics by hand when you want them refreshed (see [metrics](#profile-links-and-google-scholar-metrics)). For automation later, a scheduled GitHub Action can query a legitimate metadata API, such as [OpenAlex](https://docs.openalex.org/) (free, no key) or [Crossref](https://api.crossref.org/), by DOI. It can then write `citations` into `publications.json`, using the same pattern as `scripts/update_visitors.py`. Such an action will need DOIs in the data first.

### Projects

Edit [`data/projects.json`](data/projects.json):

```json
{
  "title": "Project title",
  "start": 2026, "end": 2028,
  "funder": "National Research Foundation of Korea (NRF)",
  "role": "Principal Investigator",
  "areas": ["Quantum Communication"],
  "themes": ["qcomm"],
  "description": "One or two sentences.",
  "problem": "The research question.",
  "tools": ["Qiskit", "PyTorch"],
  "papers": ["rizvi2025semantic"],
  "repo": "https://github.com/smabuzarrizvi/...",
  "status": "Active"
}
```

- `status` is optional. By default it is computed from the years: **Planned** before `start`, **Completed** after `end`, **Active** otherwise.
- The `areas` values become the filter chips.
- `themes` links a project to a card on the Research page.
- Optional fields are hidden when empty.

### Timeline (academic journey)

Edit [`data/timeline.json`](data/timeline.json). Events are shown **in file order** (newest first) and grouped by year.

```json
{
  "date": "2026-11",
  "category": "award",
  "title": "Best Paper Award, Example Conference 2026",
  "institution": "Optional institution",
  "description": "Optional short description.",
  "papers": ["rizvi2026example"],
  "link": "https://optional-external-link",
  "linkLabel": "Optional button text (default: Details)"
}
```

- `date` can be `YYYY`, `YYYY-MM` or `present`.
- `category` is one of `education`, `position`, `research`, `publication`, `conference`, `award`, `patent` or `certification`. Each category has its own colour, icon and filter chip.
- The home page's "Recent milestones" shows the first three dated events.

### Other data files

| File | What it holds |
|---|---|
| `data/research.json` | Research-theme cards (`summary`, `keywords`, `icon`, optional `image` for a figure) and skill groups. |
| `data/achievements.json` | `awards` (a `paper` id links to the publication), `patents` (optional `filed` date and `description`), `leadership`, `certifications` (optional `description` and `image` of the certificate). |
| `data/cv.json` | `education` (optional `advisor`, `thesis`, `expectedGraduation`) and `experience` (add teaching or internships as more entries; optional `links`: `[{"label", "url"}]`). |
| `data/conferences.json` | Conferences (add `city`, `country`, `lat`, `lon` to put a pin on the map) and `places` of study and work. |

Available icon names are the `id="i-…"` values in `assets/icons/sprite.svg`, for example `atom`, `cpu`, `network`, `brain-circuit`, `shield-check`, `flask-conical`.

### Updating the CV

Replace `assets/files/CV.pdf` with the new file, keeping the same name, and push. The **Download CV** buttons and the viewer on `cv.html` pick it up automatically.

The current `CV.pdf` is a **public version** of the CV you supplied. The phone number, home address and referees' names and emails were removed, and references now read "Available upon request." Do the same for future versions. Referees' contact details should not be on a public site without their consent.

### Profile photo

The photo is `assets/images/portrait.jpg`, a 480×480 square crop shown at 240×240. To replace it, save a new square photo (at least 480×480, under 150 KB) **under a new file name**, and update `photo` in `data/profile.json` and the `<img data-profile-photo>` in `index.html`. A new name means browsers and GitHub Pages' cache load the new image immediately instead of showing the old one for up to 10 minutes.

### Profile links and Google Scholar metrics

`data/profile.json`:

- `links`: fill in `orcid`, `researchgate` and `labPage` when you have them. Empty links are hidden everywhere: hero, footer and contact page.
- `metrics`: copy **Citations**, **h-index** and **i10-index** from your Scholar profile and set `asOf` (for example `"Sep 2026"`). A card appears for each non-null value, labelled "Google Scholar, <asOf>". Leave them as `null` to hide the cards.
- If you add ORCID or ResearchGate, also add the URL to the `sameAs` list in the JSON-LD block in `index.html`.

---

## Visitor analytics

GitHub Pages is static, so the site uses **[GoatCounter](https://www.goatcounter.com/)**. It is free for personal sites, open source, uses no cookies, and does not store IP addresses.

The setup has two parts:

1. **Tracking.** The GoatCounter script counts page views.
2. **Public statistics.** A daily GitHub Action calls GoatCounter's API with a secret token. It writes **aggregate** numbers only (a total plus a count per country) to `data/visitors.json`. The home page then shows the total, the top countries with flags, and a world map. The API token never reaches the browser, and no individual visitor data is published.

The visitors section stays **hidden until real data exists**. No numbers are ever made up.

### Setup (about 10 minutes)

1. Sign up at https://www.goatcounter.com/signup and choose a code, for example `smarizvi`. Your dashboard is `https://smarizvi.goatcounter.com`.
2. In `data/profile.json` set `"goatcounter": "smarizvi"`, then push. Tracking starts. It is disabled on `localhost`.
3. In GoatCounter, open **Settings → API**. Create a token with the **Read statistics** permission.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions**:
   - **Secrets** tab: add `GOATCOUNTER_TOKEN` = the token.
   - **Variables** tab: add `GOATCOUNTER_CODE` = `smarizvi`. Optionally add `GOATCOUNTER_START` = the date you started tracking, for example `2026-10-01`.
5. Open **Actions → Update visitor statistics → Run workflow** to run it once now. After that it runs daily and commits `data/visitors.json` only when the numbers change.
6. Optional: to show a live total between daily updates, enable **Settings → Allow adding visitor counts on your website** in GoatCounter and set `"liveTotalCounter": true` in `profile.json`.

The data file has this format, in case you later switch provider and write it with your own script:

```json
{ "configured": true, "updated": "2026-10-02T03:17:00+00:00", "since": "2026-10-01",
  "total": 3421, "countries": [ { "id": "KR", "name": "South Korea", "count": 1240 } ] }
```

`id` is an ISO 3166-1 alpha-2 code. It is used for the flag emoji and the map position. Windows does not render flag emoji, so the site shows the two-letter code there instead.

Other services (Plausible, Umami, Cloudflare Web Analytics) can replace GoatCounter. Change the script URL in `js/analytics.js` → `loadTracker()`, and write the same `visitors.json` format from that service's API.

---

## GitHub activity widget

Set `github.username` in `profile.json`. The widget uses the public GitHub API (no token), caches results for an hour per visitor, and shows:

- the number of public repositories and the total stars;
- up to `maxRepos` non-fork repositories **that have a description**. Give your research-code repositories a description and they will appear.

Set `"showActivity": false` to remove the widget. It stays hidden if the API is unreachable or you have no public repositories.

---

## Custom domain

1. Buy a domain, for example `abuzarrizvi.com`, from any registrar.
2. Set up DNS at the registrar:
   - Apex domain: four `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Optionally add `AAAA` records `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
   - `www`: a `CNAME` record pointing to `smabuzarrizvi.github.io`.
3. In GitHub **Settings → Pages → Custom domain**, enter the domain and save. This creates a `CNAME` file in the repository. Once the certificate is issued, tick **Enforce HTTPS**.
4. Replace the base URL in the HTML, `sitemap.xml` and `robots.txt`:
   ```bash
   grep -rl "smabuzarrizvi.github.io/" --include="*.html" --include="*.xml" --include="*.txt" . \
     | xargs sed -i 's#https://smabuzarrizvi.github.io/#https://abuzarrizvi.com/#g'
   ```
5. Regenerate `assets/images/og-image.png` if you want the new URL printed on it (optional).

---

## SEO notes

- Every page has a title, meta description, canonical URL, Open Graph and Twitter/X card tags, and a 1200×630 share image.
- `index.html` contains Schema.org **Person** JSON-LD. `publications.html` adds **ScholarlyArticle** JSON-LD for every paper, generated from `publications.json`.
- `sitemap.xml` lists all pages. After deploying, submit it in [Google Search Console](https://search.google.com/search-console).
  - The site is served at the domain root, so `robots.txt` (which points crawlers to the sitemap) works as intended.
- Update `<lastmod>` in `sitemap.xml` when you make large content changes.
- For the strongest Google Scholar profile linkage, add DOIs and a Scholar `sameAs` link. The Scholar `sameAs` link is already in `index.html`.

---

## Design & accessibility notes

- **Typography:** Source Serif 4 for headings and venues, Inter for body text. Both are self-hosted; the site makes no requests to Google Fonts.
- **Colour:** navy on off-white with one accent colour (burnt sienna), and a full dark theme.
  - The toggle stores your choice in `localStorage`. With no stored choice, the site follows the operating system setting.
- **Navigation:** the header is sticky, with a hamburger menu below 1080 px (Escape closes it). On-page sub-navigation highlights the section in view. A skip link and visible focus rings support keyboard use. Animations are turned off under `prefers-reduced-motion`.
- **Page weight:** there are no third-party JavaScript libraries. The whole repository, including fonts, images and the PDF, is about 650 KB; a typical page transfers well under 300 KB.
- **Lighthouse results** (local run, mobile and desktop): Performance 95–100, Accessibility 100, Best Practices 96–100, SEO 100 on every page.
- **Editing page structure:** the HTML pages share the same header and footer. To add a page, copy an existing one, change `data-page`, the title and meta tags, and add a link to the `<ul class="nav-menu">` in **every** page and to `sitemap.xml`.

### Credits

- Icons: [Lucide](https://lucide.dev) (ISC) and [Simple Icons](https://simpleicons.org) (CC0).
- Fonts: [Inter](https://rsms.me/inter/) and [Source Serif 4](https://github.com/adobe-fonts/source-serif) (SIL OFL 1.1).
- World map generated from [Natural Earth](https://www.naturalearthdata.com/) data (public domain) via `world-atlas`.

---

## Checklist: what you still need to provide

- [x] **Profile photo.** Added. A higher-resolution original (480×480 or larger) would look sharper on high-resolution screens.
- [ ] **ORCID, ResearchGate and lab/university profile URLs** (`data/profile.json → links`). These are not in the CV.
- [x] **Google Scholar metrics and per-paper citation counts.** Added from your Scholar profile (Sep 2026). Update `metrics` in `profile.json` and the `citations` fields in `publications.json` when you want them refreshed.
- [ ] **DOIs and publisher links** for each paper. These enable the DOI and Publisher buttons and richer BibTeX. PDFs of accepted manuscripts are optional, where the publishers allow them.
- [ ] **Publication status** where relevant. Examples: whether the 2025/2026 IEEE TNSE papers are in early access; whether you want per-paper `status` badges.
- [ ] **Ph.D. advisor, dissertation title and expected graduation date** (`data/cv.json`). They are hidden until filled in.
- [ ] **Conference locations** (city, country, coordinates) in `data/conferences.json` to pin them on the map, plus anything else you want in "Conferences & places": talks, research visits, invited events.
- [ ] **Patent filing dates and one-line technical descriptions** (`data/achievements.json`). The CV gives numbers and status only.
- [ ] **Project details** (`description`, `problem`, `tools`, `papers`, `repo`) in `data/projects.json`, if you want richer project cards. Please also check the project title *"Development of 6H Next-Generation Mobile Communications Technology"*. It is copied exactly as written in the CV; if "6H" is a typo for "6G", correct it in both `projects.json` and your CV.
- [ ] **Teaching experience, scholarships and fellowships**, if any. None are listed in the CV, so those sections were not created.
- [ ] **GoatCounter account, token and repository settings** to switch on visitor statistics ([Visitor analytics](#visitor-analytics)).
- [ ] **Descriptions on your research-code GitHub repositories**, so they appear in the GitHub widget.
- [ ] **Review the wording** of the bio (home page), research-theme summaries (`data/research.json`) and timeline descriptions. They are paraphrased from your CV and paper titles; adjust the tone as you like.

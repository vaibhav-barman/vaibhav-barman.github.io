# vaibhav-barman.github.io

A dark, cinematic portfolio for an AI engineer: a three.js neural-network scene, a working terminal in the hero, and every word generated from one JSON file.

**Live:** https://vaibhav-barman.github.io

<!--
  SCREENSHOT: none yet. To add one:
  1. Open the live site at 1440px wide and capture the hero (text on the left, terminal on the right).
  2. Save it as docs/screenshot.png in this repo (create the docs/ folder).
  3. Replace this comment with:  ![Portfolio hero](docs/screenshot.png)
-->

## Features

- **3D hero scene (three.js):** a neural-network particle field (instanced nodes, glowing links with travelling pulses) that moves aside and lights up under the mouse, over a slowly undulating dot field. Bloom runs on desktop only.
- **The network tells a story as you scroll:** it is a loose cloud in the hero and About, becomes a layered network at Projects, one cluster per skill group at Skills, a path through Journey, and converges into a single bright sphere at Contact ([`src/scene/story.js`](src/scene/story.js)). It dims behind headings and text so copy stays readable, and every terminal command sends a ripple through it from the terminal.
- **"How it works" in 3D:** the projects panel draws each featured project's pipeline (from `pipeline` in the JSON) as a glowing graph, with pulses along the chain and the feedback loop (critic → generator, QA → engineer, …) as an animated arc. Hover a project card to see its graph; otherwise they take turns.
- **Skill graph:** one hub per skill group, with the projects in the middle. Hover a skill to light the projects that use it.
- **Project pages:** every featured project gets `/projects/<slug>.html` with its key facts, screenshot, an SVG of its pipeline (plus a text version), highlights and stack. Plain HTML, no 3D, prints well.
- **Notes:** Markdown files in [`notes/`](notes/README.md) become pages and a Notes section (hidden until the first note is published).
- **Hero terminal:** a real shell in the right half of the hero. It boots, auto-types `whoami`, and supports history (↑/↓), Tab completion, "did you mean…?", clickable output and tappable command chips on phones. Press <kbd>`</kbd> anywhere to focus it.

  | Group | Commands |
  |---|---|
  | About me | `whoami` `about` `neofetch` `skills [group]` `experience` `education` `contact` `resume [--md]` `ask <question>` |

  `ask` is semantic search over the portfolio that runs entirely in the visitor's browser: every project, highlight and section is embedded with [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) via [transformers.js](https://huggingface.co/docs/transformers.js) and ranked by cosine similarity, blended with a keyword score, and the answer quotes the matching highlight. The library (pinned, from a CDN) and the ~23 MB model load only on the first question, start loading as soon as someone types `ask `, and are cached by the browser afterwards. Nothing is sent to a server. If the model can't load (offline, blocked CDN), `ask` falls back to keyword search and says so ([`src/ai/ask.js`](src/ai/ask.js)).
  | Projects & links | `projects [n]` `open <n\|name> [--repo\|--live]` `github` `linkedin` |
  | Shell | `help` `ls` `cd` `cat` `pwd` `theme <green\|blue\|reset>` `3d <on\|off>` `history` `clear` `exit` |
  | Extras | `sudo hire-me` |

- **One source of truth:** [`portfolio.json`](portfolio.json) drives every section, the terminal output and its virtual files, the printable [resume page](https://vaibhav-barman.github.io/resume.html), SEO tags, JSON-LD and the social preview image.
- **One accent colour, one quiet secondary:** set in [`src/theme.js`](src/theme.js) and used everywhere (UI, 3D, favicon, resume, OG image). The accent marks what is interactive or live (buttons, links, active states, the terminal, the network); the secondary is for static labels (eyebrows, tags, dates, facts) and the far background of the 3D scene.
- **Works for everyone:**
  - The page is plain HTML rendered at build time, so it reads fine without JavaScript (the terminal shows a prerendered `whoami`).
  - There's keyboard navigation with visible focus, and every text colour is tested for WCAG AA contrast.
  - With `prefers-reduced-motion`, or on devices without WebGL, the 3D is replaced by a static background.
- **Fast:**
  - three.js loads only after the page is interactive.
  - Phones get a lighter scene with no bloom.
  - The pixel ratio is capped, and quality drops automatically if the frame rate falls.
  - Lighthouse 12 on a local production build (Nov 2026): 100 for Accessibility, Best Practices and SEO on mobile and desktop; Performance 100 on desktop and 99 on mobile (LCP about 1.7 s under simulated slow 4G). Project pages score 100 across the board.

## Install as an app

The site is a Progressive Web App: you can add it to your home screen or desktop and it opens in its own window, even offline.

- **Android (Chrome):** open the site, tap the **⋮** menu, then **Install app** (on some versions: **Add to Home screen → Install**).
- **iPhone / iPad (Safari):** open the site, tap **Share**, then **Add to Home Screen**, then **Add**. It must be Safari; other iOS browsers can't install it.
- **Desktop (Chrome or Edge):** click the install icon at the right end of the address bar, or the browser menu, then **Install**.

How it works:

- The [web app manifest](src/pwa/manifest.js) is generated at build time, so its colours come from [`src/theme.js`](src/theme.js) (`theme_color` is the accent, `background_color` the dark background).
- The service worker ([`src/pwa/sw.js`](src/pwa/sw.js)) is written to `dist/sw.js` at build time with a version hash of every built file. Pages are fetched from the network first and fall back to the cache offline, so a new deploy shows up on the next visit and old caches are deleted. It is registered in production builds only, so `npm run dev` never serves cached files.
- Icons live in `public/icons/` and `public/apple-touch-icon.png`. Run `npm run icons` to redraw them from the favicon mark and the theme (needs Chrome installed).
- To test locally: `npm run build && npm run preview`, open http://localhost:4173, then check **DevTools → Application → Manifest / Service Workers**. Tick **Offline** and reload to see it work without a network.

## Tech stack

From [`package.json`](package.json):

| Area | Packages |
|---|---|
| Build / dev server | `vite` ^7.1 |
| 3D | `three` ^0.180 (including its `EffectComposer` / `UnrealBloomPass` add-ons) |
| Fonts | `@fontsource-variable/space-grotesk`, `@fontsource-variable/jetbrains-mono` (self-hosted) |
| Tests | `vitest` ^3.2 |
| Hosting | GitHub Pages via GitHub Actions |

Plain JavaScript modules and CSS: no framework, no TypeScript, no CSS framework.

## Quick start

Requires Node.js 20.19+ (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173, reloads when portfolio.json changes
npm test           # terminal engine, data rules, generated HTML, colour contrast
npm run build      # production build into dist/
npm run preview    # serve the production build at http://localhost:4173
npm run og         # regenerate public/og-image.png from portfolio.json (needs Chrome installed)
npm run icons      # regenerate the app icons in public/ from the favicon mark (needs Chrome installed)
```

Testing helpers: add `?scene=lite` to the URL to force the phone version of the 3D scene, or `?scene=off` to turn it off.

## Project layout

```
portfolio.json          ← all content
notes/                  ← Markdown notes (optional)
index.html, resume.html ← page shells (filled in at build time)
page.html               ← template for /projects/*.html and /notes/*.html
src/
  theme.js              ← colours + fonts (change the accent here)
  config.js             ← section titles, terminal settings, 3D tuning
  site/                 ← HTML for each section, project/note pages, SEO, sitemap (runs at build time)
  styles/main.css       ← all styles
  cli/                  ← terminal engine and commands (no DOM, unit-tested)
  ui/                   ← browser behaviour: terminal, nav, 3D loader
  scene/                ← three.js scene: neural field + scroll story, floor, pipeline graphs, skill graph
  data/                 ← turns portfolio.json into the model everything uses
  pwa/                  ← web app manifest, service worker template, registration
tests/                  ← Vitest tests
```

## Editing portfolio.json

Change the JSON, save, and the dev server reloads. Every section, the terminal and the resume update together.

- **Profile:** `name`, `label` (the title under your name), `tagline` (the one-line pitch), `status` (shown in the terminal, About, Journey and Contact), `contact.location`, `contact.email`, `contact.booking_url` (optional: adds a "Book a call" button, e.g. a Cal.com link), `social_links`.
- **About:** `focus_areas` (what you work on) and `interests` (shown as "Off-screen").
- **Projects:** each entry has `title`, `summary`, `url`, `category` (`agentic`, `rag`, `llm`, `tooling`), `featured` (featured projects come first and get their own page), `tags` and `highlights`. The first two highlights show on the card; the rest are behind "more". Optional:
  - `shipped`: `"YYYY-MM"`, shown on the card and grouped into the Journey timeline.
  - `facts`: up to three short, verifiable numbers, shown as a stat row: `[{ "value": "850", "label": "chunks (1,000 chars, 200 overlap)" }]`.
  - `pipeline`: how it works, as steps plus at most one feedback loop (indices into `nodes`). Drawn in 3D and as an SVG on the project page:

    ```json
    "pipeline": { "nodes": ["Diff", "Generator", "Critic", "Commit"], "loop": { "from": 2, "to": 1, "label": "rejected" } }
    ```

  - `images`: `[{ "img_path": "img/projects/<slug>.jpg", "caption": "…" }]`. Keep screenshots in `public/img/projects/` (about 1200 px wide) so they are served and cached with the site.
  - `slug`: overrides the slug derived from the title (used in URLs and terminal commands).
- **Skills** are grouped. A skill is either a plain string, or `{ "name", "note" }` when it needs a short note:

  ```json
  "skills": [
    { "category": "Backend", "items": ["FastAPI", "Pydantic", { "name": "Alembic", "note": "migrations" }] },
    { "category": "Model APIs", "note": "worked with API keys for", "items": ["Anthropic", "OpenAI"] }
  ]
  ```

- **`also_used_exclude`:** project tags listed here still show on their project card, but not in the "Also in my projects" chips.
- **Education / work:** `education` and `work_experience` feed the timeline and the `education` / `experience` commands. The timeline also lists what you shipped each month (from `shipped`).

Section headings and other UI copy (not resume content) live in `src/config.js` under `sections`.

## Adding a terminal command

1. Add an object to any file in `src/cli/commands/` (or a new file):

   ```js
   import { t, run } from '../format.js'

   export const hello = {
     name: 'hello',
     summary: 'say hello',          // shown in `help`
     group: 'fun',                  // info | navigate | system | fun
     run: (args, { data }) => [
       [t(`Hello from ${data.firstName}!`, 'accent')],
       [t('try '), run('projects')], // a clickable command
     ],
   }
   ```

2. Add it to the list in [`src/cli/commands/index.js`](src/cli/commands/index.js).

`help`, Tab completion and "did you mean" pick it up automatically. A command returns lines. Each line is a list of pieces, which can be plain text, `t(text, tone)`, `link(text, url)` or `run(text, command)`. Tones are `accent`, `muted`, `dim`, `bold`, `ok`, `error` and `heading`.

## Changing the accent colour

Open [`src/theme.js`](src/theme.js) and change one value:

```js
accent: '#39ff88',   // neon green → try '#3b82f6' for electric blue
```

`secondary` (a muted cyan by default) is the quiet colour for static labels; change it the same way.

That's all you need. The CSS, the 3D scene, the terminal, the favicon and the resume all use it. Run `npm run og` and `npm run icons` to recolour the social preview image and the app icons too. `npm test` checks that the new colours still meet WCAG AA contrast.

## Deployment (GitHub Pages)

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci`, `npm test` and `npm run build` on every push to `main`, then publishes `dist/` to GitHub Pages.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is served from the domain root (`BASE = '/'` in `vite.config.js`), which is also the manifest's `start_url` and `scope` and the service worker's scope. For a project site at `username.github.io/repo`, set `BASE = '/repo/'`.

`vite build` also writes `dist/sw.js`, the project and note pages, and `dist/sitemap.xml`, so the same workflow publishes them with no extra step. Every deploy that changes the site gets a new service worker version, and visitors' old caches are replaced automatically.

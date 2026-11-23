# vaibhav-barman.github.io

A black, white and liquid-silver chrome portfolio for an AI engineer: a three.js chrome core with the projects orbiting it, animated pipeline diagrams of the real agent graphs, and every word generated from one JSON file.

**Live:** https://vaibhav-barman.github.io

The look is the one on the [GitHub profile README](https://github.com/vaibhav-barman/vaibhav-barman): `#000` background, chrome gradient type with a slow light sweep, hairlines and corner crop marks, numbered sections, a blinking "online" dot and a typed terminal line. There is no accent colour. Everything is a grey, and a test fails if a colour with a hue ever appears.

<!--
  SCREENSHOT: none yet. To add one:
  1. Open the live site at 1440px wide and capture the hero.
  2. Save it as docs/screenshot.png in this repo (create the docs/ folder).
  3. Replace this comment with:  ![Portfolio hero](docs/screenshot.png)
-->

## Sections

| # | Section | What it is |
|---|---|---|
| | **Hero** | A liquid-chrome blob lit by a custom studio environment, with the nine projects orbiting it on dashed rings. Hover (or tap) a node to highlight it; click (or tap again) to open the repo. Name in chrome type, the subtitle, a typed line cycling short taglines, and the availability status. |
| 01 | **Whoami** | A terminal-style manifest card whose rows fade in on scroll, plus an optional "open shell" (see below). |
| 02 | **Flagship builds** | One large card per flagship, each with an animated pipeline diagram: nodes over a perspective grid with glowing packets running the agent's real routes. |
| 03 | **More builds** | A grid of cards, each with a small rotating wireframe solid. |
| 04 | **Stack** | Monochrome chips, grouped. |
| 05 | **Experience & credentials** | Role, education and certifications. |
| 06 | **Open a channel** | Email, GitHub, LinkedIn and the resume, then a small chrome sphere and `END OF TRANSMISSION`. |

Also: [`/resume.html`](https://vaibhav-barman.github.io/resume.html) (dark on screen, plain black on white when printed), a page per featured project at `/projects/<slug>.html` (the same animated diagram, plus facts and highlights), and Markdown [notes](notes/README.md) (the Notes section appears once one is published).

## How it behaves

- **Phones are a first-class target, and the animation stays on them.** It is made cheaper rather than removed:

  | | Desktop | Phones / touch / narrow |
  |---|---|---|
  | Pixels | device pixel ratio ≤ 2 | ≤ 1.5 |
  | Blob | 16,820 triangles, clear-coat | 4,500 triangles, plain metal |
  | Dust | 1,400 points | 500 |
  | Bloom | full resolution, 4× MSAA | half resolution, no MSAA |

  The blob's surface is deformed in the vertex shader (the reference page did ~100k vertices on the CPU every frame), so it stays smooth at low detail. If frames run slow, quality steps down (bloom, then pixel ratio, then dust) but the scene never switches off. It pauses when the hero is off-screen or the tab is hidden, and starts right after first paint on phones too.
- **Scrolling is never hijacked.** There are no orbit controls; the canvas uses `touch-action: pan-y`. Nodes are picked by screen distance, so a fingertip is enough.
- **Diagrams** are inline SVG built at build time, in a wide layout and a tall one (phones), so text stays readable at 360px. Each diagram's animation clock only runs while it is on screen.
- **Reduced motion** gets a calm, slow version of the same scene (and frozen diagrams), not an empty hero.
- **No WebGL, or a software renderer:** an animated SVG chrome sphere stands in, so the hero is never a still frame.
- **Without JavaScript** the page is complete: it is plain HTML rendered at build time, and nothing is hidden by default.
- **Installable and offline:** it is a PWA (see below).
- **Accessible:** one `h1`, no skipped heading levels, visible focus rings, 44px tap targets on touch, and informational text at WCAG AA. The one token below AA, `#6b6b6b` (about 3.9:1 on black), is used only for decorative labels such as indices; `tests/theme.test.js` pins that.

### The shell

A real terminal and in-browser `ask` search sit behind **› open shell** in the whoami section. Nothing of it loads, or costs anything on first paint or on phones, until it is opened (or <kbd>`</kbd> is pressed). It supports history (↑/↓), Tab completion, "did you mean…?", clickable output and tappable chips.

| Group | Commands |
|---|---|
| About me | `whoami` `about` `neofetch` `skills [group]` `experience` `education` (also lists certifications) `contact` `resume [--md]` `ask <question>` |
| Projects & links | `projects [n]` `open <n\|name> [--repo\|--live]` `github` `linkedin` |
| Shell | `help` `ls` `cd` `cat` `pwd` `3d <on\|off>` `history` `clear` `exit` |
| Extras | `sudo hire-me` |

`projects 2` is `P / 02` on the page. `ask` is semantic search over the portfolio that runs entirely in the visitor's browser: every project, highlight, pipeline route and section is embedded with [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) via [transformers.js](https://huggingface.co/docs/transformers.js) and ranked by cosine similarity, blended with a keyword score. The library (pinned, from a CDN) and the ~23 MB model load only on the first question and are cached afterwards. Nothing is sent to a server. If the model can't load, `ask` falls back to keyword search and says so ([`src/ai/ask.js`](src/ai/ask.js)).

## Install as an app

The site is a Progressive Web App: you can add it to your home screen or desktop and it opens in its own window, even offline.

- **Android (Chrome):** open the site, tap the **⋮** menu, then **Install app** (on some versions: **Add to Home screen → Install**).
- **iPhone / iPad (Safari):** open the site, tap **Share**, then **Add to Home Screen**, then **Add**. It must be Safari; other iOS browsers can't install it.
- **Desktop (Chrome or Edge):** click the install icon at the right end of the address bar, or the browser menu, then **Install**.

How it works:

- The [web app manifest](src/pwa/manifest.js) is generated at build time. Its `theme_color` and `background_color` are both `#000000`.
- The service worker ([`src/pwa/sw.js`](src/pwa/sw.js)) is written to `dist/sw.js` at build time with a version hash of every built file. Pages are fetched from the network first and fall back to the cache offline, so a new deploy shows up on the next visit and old caches are deleted. It is registered in production builds only, so `npm run dev` never serves cached files.
- Icons live in `public/icons/` and `public/apple-touch-icon.png`: the chrome ball from [`src/theme.js`](src/theme.js). Run `npm run icons` to redraw them (needs Chrome installed).

## Tech stack

From [`package.json`](package.json):

| Area | Packages |
|---|---|
| Build / dev server | `vite` ^7.1 |
| 3D | `three` ^0.180 (including its `EffectComposer` / `UnrealBloomPass` add-ons) |
| Fonts | `@fontsource-variable/inter` (self-hosted, latin only) for weights 200 and 800 on every device; Helvetica Neue first where installed. Mono is the system `ui-monospace` stack. |
| Tests | `vitest` ^3.2 |
| Hosting | GitHub Pages via GitHub Actions |

Plain JavaScript modules and CSS: no framework, no TypeScript, no CSS framework.

## Quick start

Requires Node.js 20.19+ (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173, reloads when portfolio.json changes
npm test           # data rules, generated HTML, graphs, greyscale guard, contrast, terminal engine
npm run build      # production build into dist/
npm run preview    # serve the production build at http://localhost:4173
npm run og         # regenerate public/og-image.png from portfolio.json (needs Chrome installed)
npm run icons      # regenerate the app icons in public/ (needs Chrome installed)
```

Browser QA (needs Chrome installed and a fresh `npm run build`; no extra dependencies):

```bash
npm run qa         # layout at 360 / 375 / 390 / 414 / 768 / 1024 / 1440: overflow, tap targets, diagram text size
npm run qa:scene   # the 3D hero: pixel-ratio cap, triangle budgets, tap-to-highlight, hover, pausing, reduced motion
npm run qa:pages   # every rendered pixel and computed colour is grey; print; no-JS; offline; the shell
```

Headless Chrome renders WebGL in software, so those scene checks assert budgets and behaviour, not frame rate. To judge smoothness on a real phone, run `npm run dev -- --host` and open the printed network URL on it.

URL flags for testing: `?scene=off` never starts the 3D hero, `?scene=lite` forces the phone tier, `?scene=force` starts it even on a software renderer (and exposes `window.__hero.info()`).

## Project layout

```
portfolio.json          ← all content
notes/                  ← Markdown notes (optional)
index.html, resume.html ← page shells (filled in at build time)
page.html               ← template for /projects/*.html and /notes/*.html
src/
  theme.js              ← the design tokens (greys only), fonts, favicon and app icon
  config.js             ← section headings and UI copy, terminal settings
  site/                 ← HTML for each section, pipeline diagrams, project/note pages, SEO, sitemap (build time)
  styles/main.css       ← all styles (mobile first)
  scene/                ← the three.js hero: studio environment, GPU blob, nodes, interaction
  ui/                   ← browser behaviour: scene loader, reveal, typed line, diagram pause, wireframe solids, shell
  cli/                  ← terminal engine and commands (no DOM, unit-tested)
  data/                 ← turns portfolio.json into the model everything uses; graph validation
  pwa/                  ← web app manifest, service worker template, registration
scripts/                ← og image, icons, and the browser QA tools
tests/                  ← Vitest tests
```

## Editing portfolio.json

Change the JSON, save, and the dev server reloads. Every section, the 3D nodes, the shell and the resume update together.

- **Profile:** `name`, `label`, `tagline`, `contact`, `social_links`, `status` (shown in the hero, whoami and contact).
- **Hero:** `subtitle` (the line under the name) and `taglines` (the lines the hero types out).
- **Whoami card:** `manifest` (`role`, `builds`, `stack`, `principle`). The name, "studying" and status rows come from `name`, `education` and `status`.
- **Projects:** each entry has `title`, `summary`, `url`, `category`, `tags`, `highlights`. `showcase` decides where it appears:
  - `"flagship"`: a large card with an animated diagram (needs a `graph`), and an orbiting node in ring 1.
  - `"build"`: a card in "more builds", with a `solid` (`icosahedron`, `dodecahedron`, `octahedron`, `tetrahedron`, `cube` or `stella`) and an orbiting node in ring 2.
  - anything else (or missing): kept in the JSON for the resume, shell and `ask`, but not on the home page.

  The home page lists flagships, then builds, each in the order they appear in the file. Optional: `featured` (gets its own `/projects/<slug>.html` page), `facts` (up to three short, verifiable numbers), `shipped` (`"YYYY-MM"`), `images`, `slug`.
- **`graph`** is how a flagship works, drawn as the animated diagram. Positions are percentages of the plot area, one pair per layout (`wide` for desktop, `tall` for phones):

  ```json
  "graph": {
    "nodes":  [{ "id": "router", "label": "router", "sub": "picks a mode", "kind": "ball",
                 "wide": [16, 60], "tall": [50, 12], "wideLabel": "below", "tallLabel": "right" }],
    "edges":  [{ "from": "router", "to": "research", "label": "hybrid / open_book", "conditional": true }],
    "routes": [{ "name": "with research", "path": ["start", "router", "research", "orchestrator"] }]
  }
  ```

  `kind` is `ring`, `ball` or `stack`. Each **route** is a path a glowing packet travels, and every step must be an edge, so the diagram can only show real routes (`tests/graph.test.js` enforces it, and also checks that nodes don't overlap and stay inside the plot). Projects that only have the older `pipeline` (a chain plus one loop) are converted automatically.
- **Skills** are grouped. A skill is a plain string, or `{ "name", "note" }`:

  ```json
  "skills": [{ "category": "Backend", "items": ["FastAPI", "Pydantic", { "name": "Alembic", "note": "migrations" }] }]
  ```

- **Experience and credentials:** `work_experience` (`position`, `company`, and optionally `start_date`, `end_date`, `summary`, `highlights`; nothing is shown that you don't provide), `education`, and `certifications` (`[{ "name", "issuer" }]`).

Section headings and other UI copy (not resume content) live in `src/config.js` under `sections`.

## Design tokens

All colour and type live in [`src/theme.js`](src/theme.js), injected as CSS variables at build time:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#000000` | page |
| `--panel` | `#050505` | cards |
| `--line` / `--line2` | `#1a1a1a` / `#2a2a2a` | hairlines, panel frames |
| `--dim` | `#6b6b6b` | decorative labels only |
| `--mid` | `#a3a3a3` | secondary text |
| `--text` | `#ededed` | body text |
| `--white` | `#ffffff` | highlights, focus rings, selection |
| `--chrome` | `linear-gradient(100deg, #6f6f6f 0%, #fff 22%, #9c9c9c 45%, #f2f2f2 62%, #6a6a6a 80%, #d9d9d9 100%)` | chrome text, clipped to the glyphs |

Plus `#333` and `#3d3d3d` for control borders and crop marks, taken from the reference page. Headings use Helvetica Neue / Inter (the first name at weight 200, the last at 800, with wide tracking); labels and metadata use the system monospace stack, uppercase and widely tracked.

[`tests/monochrome.test.js`](tests/monochrome.test.js) scans the source, the templates, the build scripts and the generated HTML, manifest and icons for any colour with a hue (hex, `rgb()`, `hsl()`, `oklch`, `color-mix`, `0x…` and named colours), and `npm run qa:pages` checks every computed colour and rendered pixel in a real browser.

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

`help`, Tab completion and "did you mean" pick it up automatically. A command returns lines. Each line is a list of pieces, which can be plain text, `t(text, tone)`, `link(text, url)` or `run(text, command)`. Tones are `accent`, `muted`, `dim`, `bold`, `ok`, `error` and `heading`; they are all shades of grey (`error` is bold with a `✗`).

## Deployment (GitHub Pages)

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci`, `npm test` and `npm run build` on every push to `main`, then publishes `dist/` to GitHub Pages. (The browser QA scripts need Chrome and are not part of it.)

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is served from the domain root (`BASE = '/'` in `vite.config.js`), which is also the manifest's `start_url` and `scope` and the service worker's scope. For a project site at `username.github.io/repo`, set `BASE = '/repo/'`.

`vite build` also writes `dist/sw.js`, the project and note pages, and `dist/sitemap.xml`, so the same workflow publishes them with no extra step. Every deploy that changes the site gets a new service worker version, and visitors' old caches are replaced automatically.

# vaibhav-barman.github.io

An immersive 3D portfolio with a working terminal, generated entirely from one JSON file.

**Live:** https://vaibhav-barman.github.io · **Author:** [Vaibhav Barman](https://github.com/vaibhav-barman), AI Engineer (LLM applications, RAG and AI agents)

<!--
  SCREENSHOT / GIF: none yet. To add one:
  1. Save an image to docs/screenshot.png (or docs/demo.gif). A 1600×900 capture of the hero with the
     terminal overlay open works well; a 10-second GIF of `neofetch` + `projects 1` is even better.
  2. Uncomment the line below.
-->
<!-- ![Portfolio hero with the terminal overlay open](docs/screenshot.png) -->

## Features

- **3D scene** (three.js / react-three-fiber): an instanced neural-network field with pulses travelling along the links, a glowing AI core, a neon grid, and a camera that moves through each section as you scroll. Projects float as holographic cards, skills form a node graph, and experience and education sit on a glowing timeline.
- **Interactive terminal:** embedded in the page and available anywhere as an overlay (press <kbd>`</kbd>). It has history, Tab completion, "did you mean…?" suggestions, clickable output and quick-command chips for touch screens. Commands also move the 3D camera and highlight objects.

  | Group | Commands |
  |---|---|
  | About me | `whoami` `about` `neofetch` `skills [group]` `experience` `education` `contact` `resume [--md]` `ask <question>` |
  | Projects | `projects [n]` `open <n\|name> [--repo\|--live]` `github` `linkedin` |
  | Shell | `help` `ls` `cd` `cat` `pwd` `theme <cyan\|violet\|matrix>` `3d <on\|off>` `history` `clear` `exit` |
  | Extras | `sudo hire-me` |

- **One source of truth:** every word on the site comes from [`portfolio.json`](portfolio.json): the HTML sections, 3D cards, terminal output, virtual filesystem, printable resume, SEO tags, JSON-LD and social preview image.
- **"Ask my portfolio":** answers questions from the JSON (offline keyword retrieval for now; the provider interface is ready for an LLM).
- **Accessibility:** every piece of content is real, crawlable HTML; without JavaScript, a full text version is served. The terminal and dialogs have proper ARIA labels, there's keyboard navigation with visible focus, and `prefers-reduced-motion` is respected.
- **Performance:**
  - The 3D scene is a lazy-loaded chunk that never blocks first paint.
  - Phones get a lighter scene, loaded on the first scroll or touch.
  - Devices without WebGL, or with only software rendering, get a static background, and the terminal still works.
  <!-- LIGHTHOUSE: add scores here once confirmed, e.g.
  - Lighthouse (production build): mobile 88 · 100 · 100 · 100, desktop 99 · 100 · 100 · 100 (Performance · Accessibility · Best Practices · SEO) -->

## Tech stack

| Area | Packages |
|---|---|
| Framework | React 19, TypeScript 5.9, Vite 7 |
| 3D | three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, maath |
| UI | Tailwind CSS 4, framer-motion, zustand |
| Fonts | Space Grotesk, JetBrains Mono (self-hosted via Fontsource) |
| Tests | Vitest |
| Hosting | GitHub Pages via GitHub Actions |

## Quick start

Requires Node.js 20.19+ (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # CLI engine + data tests
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run og         # regenerate public/og-image.png from portfolio.json (needs local Chrome)
```

## Project structure

```
portfolio.json            content: the only place to edit content
src/config.ts             tweakables: themes, particle counts, camera, prompt, boot text, section headings
src/data/                 types, normalizer, text + static-HTML renderers
src/cli/                  engine (parse, history, completion, did-you-mean), session, vfs, commands/
src/scenes/               3D: Experience, CameraRig, NeuralField, LatentDust, HeroCore, ProjectCards, SkillCluster, Timeline3D
src/components/           Terminal, TerminalOverlay, Hud, Cursor, Loader, ProjectDialog, AskPortfolio, sections/
src/hooks/, src/store/    scroll tracking, media queries, app state
scripts/og-image.mjs      social preview image generator
```

`src/data/normalize.ts` turns the raw JSON into one typed model that everything else uses:

| Consumer | Where |
|---|---|
| HTML sections | `src/components/sections/*` |
| 3D scene | `src/scenes/*` |
| Terminal + virtual filesystem | `src/cli/*` |
| SEO tags, JSON-LD `Person`, no-JS text version | `src/data/staticHtml.ts` (injected by `vite.config.ts`) |
| Printable resume (`/resume.html`) | `src/data/staticHtml.ts` |
| "Ask my portfolio" | `src/ai/ask.ts` |

## Editing content

Edit `portfolio.json`; the dev server reloads everything. The original schema still works; these **optional** fields were added:

| Field | Where | Effect |
|---|---|---|
| `tagline` | top level | One-line pitch for the hero and `whoami` (falls back to `label`) |
| `status` | top level | Availability in the HUD, timeline and `neofetch` |
| `featured` | project | Listed first |
| `category` | project | `agentic`, `rag`, `llm`, `tooling`; controls ordering and labels (`config.projectCategories`) |
| `tags` | project | Tech tags for cards, the CLI and the skills graph |
| `repo_url` / `live_url` | project | Links for `open <n> --repo` / `--live` (`repo_url` falls back to `url`) |
| `slug` | project | CLI id, e.g. `open gitcommit-ai` (derived from the title if omitted) |
| `category` | skill | Skill group for the 3D cluster and `skills <group>` |

After changing your name, role or tags, run `npm run og` to refresh the social preview image.

## Adding a terminal command

1. Export a `Command` from a file in `src/cli/commands/`:

   ```ts
   import { link, t } from '../format'
   import type { Command } from '../types'

   export const blog: Command = {
     name: 'blog',
     summary: 'open my blog',
     group: 'navigate', // section in `help`
     run: (args, { data, actions }) => {
       actions.openUrl('https://example.com')
       return [[t('opening ', 'muted'), link('example.com', 'https://example.com')]]
     },
   }
   ```

2. Add it to the list in `src/cli/commands/index.ts`.

`help`, Tab completion and "did you mean" pick it up automatically. Commands receive the normalized JSON (`data`), the virtual filesystem (`fs`) and `actions` (scroll to a section, highlight 3D objects, focus a project, change the theme, open URLs, download files). Add `complete()` for argument completion; `src/cli/engine.test.ts` shows how to test a command with fake actions.

## Tweaking the look (`src/config.ts`)

| Key | Controls |
|---|---|
| `themes`, `defaultTheme` | Accent palettes used by both the UI and 3D (`theme <name>` switches at runtime) |
| `scene.particles`, `scene.neuralNodes` | Particle / node counts for desktop and mobile |
| `scene.maxDpr`, `scene.bloom`, `scene.vignette` | Render resolution cap and post-processing |
| `scene.cameraDamping`, `scene.parallax`, `scene.carouselSpeed` | Motion feel |
| `scene.anchors`, `scene.cameraOffset` | Where each section lives in 3D space |
| `terminal.prompt`, `terminal.host`, `terminal.bootText`, `terminal.quickCommands` | Terminal prompt, boot sequence and chips |
| `sections` | Section order, HUD labels and headings |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: install → test → build → publish `dist/` to GitHub Pages.

**One-time setup:** go to **Settings → Pages → Build and deployment → Source: GitHub Actions**. This is a user site served from the domain root, so `base` in `vite.config.ts` is `/`.

## License and credits

Content © Vaibhav Barman. Versions before 2.0 were generated with a tool based on [Corey Schafer's portfolio generator](https://github.com/CoreyMSchafer/portfolio_generator), and `portfolio.json` keeps its schema; see the original project for its license terms.

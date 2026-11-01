# Vaibhav Barman : AI Engineer Portfolio

A personal portfolio and résumé website showcasing AI engineering projects, technical skills, education, and links to professional profiles. The site is generated from a single JSON data file and deployed with GitHub Pages.

**Live website:** https://vaibhav-barman.github.io  
**GitHub:** https://github.com/vaibhav-barman

## About

I’m focused on building practical applications with large language models (LLMs), retrieval-augmented generation (RAG), and AI-agent workflows. My projects explore Python-based AI systems, local models, structured outputs, evaluation, and reliable backend design.

## Featured Projects

The portfolio currently highlights AI engineering projects, including:

- **GitCommit AI** — an agentic, repository-aware Git commit assistant (`git ai-commit`) with a deterministic critic loop.
- **LocalForge-AI** — a local-first multi-agent software development and QA workflow using LangGraph and Ollama.
- **Recovery — AI Payment Recovery Agent** — an AI-assisted payment recovery workflow with classification, strategy selection, and feedback.
- **Odyssey RAG** — a retrieval-augmented question-answering system for *The Odyssey*, with retrieval evaluation.
- **PromptRoute** — an LLM-powered travel itinerary planner that produces structured travel plans using a local model.
- **Local YouTube Video Summarizer** — transcribes videos with Whisper and summarizes them using a local Ollama model.
- **GNews MCP Server** — an MCP server exposing news search and headline tools.
- **ApplyIQ** — an AI-powered resume and job-description analysis application.
- **Gemini Website Summarizer** — extracts website text and summarizes it with the Gemini API.

## Tech Stack

- **Languages:** Python, JavaScript, TypeScript, SQL
- **AI/LLM:** LLM APIs, prompt engineering, RAG, AI agents, Ollama, Gemini
- **Backend:** FastAPI, MCP/FastMCP, SQLAlchemy
- **Frontend:** React, Vite, Tailwind CSS
- **Data and persistence:** PostgreSQL, SQLite
- **Tools:** Git, GitHub, `uv`
- **Deployment:** GitHub Pages (GitHub Actions)

## How It Works

The site is an immersive 3D portfolio with a built-in terminal, built with **Vite + React + TypeScript**, **three.js / react-three-fiber**, Tailwind CSS and framer-motion.

**`portfolio.json` is the single source of truth.** Every view reads from it:

| Consumer | Where |
|---|---|
| HTML sections (real, crawlable text) | `src/components/sections/*` |
| 3D scene (project cards, skill graph, timeline) | `src/scenes/*` |
| Terminal commands + virtual filesystem | `src/cli/*` |
| SEO tags, JSON-LD `Person`, no-JS text version | `src/data/staticHtml.ts`, injected by `vite.config.ts` |
| Printable resume (`/resume.html`) | `src/data/staticHtml.ts` |
| "Ask my portfolio" answers | `src/ai/ask.ts` |

`src/data/normalize.ts` turns the raw JSON into one typed model (ordering, slugs, skill groups, timeline) that all of the above consume. Edit the JSON and the dev server reloads everything.

```
portfolio.json            content (the only place to edit content)
src/config.ts             tweakables: colors/themes, particle counts, camera, prompt, boot text, section headings
src/data/                 types, normalizer, text + static HTML renderers
src/cli/                  engine (parse, history, completion, did-you-mean), session, vfs, commands/
src/scenes/               3D: Experience canvas, CameraRig, NeuralField, LatentDust, HeroCore, ProjectCards, SkillCluster, Timeline3D
src/components/           Terminal, TerminalOverlay, Hud, Cursor, Loader, ProjectDialog, AskPortfolio, sections/
src/hooks/, src/store/    scroll tracking, media queries, app state (zustand)
scripts/og-image.mjs      regenerates public/og-image.png from the JSON
```

## Run Locally

Requires Node.js 20.19+ (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # CLI engine + data tests (vitest)
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

## Editing Content (`portfolio.json`)

The original schema is unchanged; these **optional** fields were added (older JSON without them still works):

| Field | Where | Effect |
|---|---|---|
| `tagline` | top level | One-line pitch for the hero and `whoami`. Falls back to `label`. |
| `status` | top level | Availability shown in the HUD, timeline and `neofetch` (e.g. `"open to remote roles"`). |
| `featured` | project | Featured projects are listed first. |
| `category` | project | `agentic`, `rag`, `llm`, `tooling` (order and labels in `config.projectCategories`). Sorts AI/agentic work first. |
| `tags` | project | Tech tags for cards, the CLI and the skills graph's outer cloud. |
| `repo_url` | project | Repository link. Falls back to the existing `url`. |
| `live_url` | project | Live demo link (`open <n> --live`). |
| `slug` | project | CLI id (`open gitcommit-ai`). Derived from the title if omitted. |
| `category` | skill | Skill group for the 3D node cluster and `skills <group>`. |

After changing the name, role or tags, refresh the social preview image with `npm run og` (uses your local Chrome; set `CHROME_PATH` if needed).

## Adding a Terminal Command

1. Export a `Command` from any file in `src/cli/commands/` (or a new file):

   ```ts
   import { link, t } from '../format'
   import type { Command } from '../types'

   export const blog: Command = {
     name: 'blog',
     summary: 'open my blog',
     group: 'navigate',              // where it appears in `help`
     run: (args, { data, actions }) => {
       actions.openUrl('https://example.com')
       return [[t('opening ', 'muted'), link('example.com', 'https://example.com')]]
     },
   }
   ```

2. Add it to the list in `src/cli/commands/index.ts`.

`help`, Tab completion and "did you mean" pick it up automatically. Commands get the normalized JSON (`data`), the virtual filesystem (`fs`) and `actions` (scroll to a section, highlight 3D objects, focus a project, set the theme, open URLs, download files). Add a `complete()` function for argument completion. `src/cli/engine.test.ts` shows how to test a command with fake actions.

## 3D, Performance and Accessibility

- The 3D scene is a lazy-loaded chunk that never blocks first paint. Desktop loads it after the page is idle. Phones load a lighter scene (fewer particles, no post-processing) on the first scroll or touch.
- Devices without WebGL, or with only software rendering, get a static CSS background. The terminal and all content work without 3D. `3d on|off` in the terminal, or the footer toggle, overrides this.
- `prefers-reduced-motion` stops scene animation, camera easing, the custom cursor and the boot animation.
- All content is real HTML text. Without JavaScript, a full text version generated from the JSON is served.
- The ``[`]`` key toggles the terminal overlay; `Esc` closes it. The terminal has ARIA labels and a live output log, and quick-command chips make it usable on touch screens.

## Deploy to GitHub Pages

Deployment runs through GitHub Actions (`.github/workflows/deploy.yml`): every push to `main` runs the tests, builds, and publishes `dist/`.

**One-time setup:** in the repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. The old "deploy from branch" setting serves the raw source files and will not work with the Vite build.

This is a user site served from the domain root, so `base` in `vite.config.ts` is `/`.

## Repository

- **Website repository:** https://github.com/vaibhav-barman/vaibhav-barman.github.io
- **Live site:** https://vaibhav-barman.github.io

## License

The portfolio content and custom changes are maintained in this repository. Versions before 2.0 were generated with a tool based on [Corey Schafer’s portfolio generator](https://github.com/CoreyMSchafer/portfolio_generator), and `portfolio.json` keeps its schema; check the original project and its license for applicable attribution and licensing terms.

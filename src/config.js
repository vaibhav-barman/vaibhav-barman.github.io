/**
 * Site behaviour and 3D tuning. Colours live in theme.js; every word of
 * content lives in /portfolio.json.
 */
export const config = {
  /** Ordering + display names for project.category values in the JSON. */
  projectCategories: {
    order: ['agentic', 'rag', 'llm', 'tooling'],
    labels: {
      agentic: 'Agentic AI',
      rag: 'RAG',
      llm: 'LLM app',
      tooling: 'AI tooling',
    },
  },

  /**
   * Page sections, in order. `label` is the nav text; eyebrow/title/lead are
   * the section heading copy. `stage` adds a framed 3D window next to the heading.
   */
  sections: [
    { id: 'hero', label: 'home', eyebrow: '', title: '' },
    { id: 'about', label: 'about', eyebrow: 'about.md', title: 'Building AI that ships.' },
    {
      id: 'projects',
      label: 'projects',
      eyebrow: '~/projects',
      title: "Things I've built.",
      lead: 'Agentic and AI-first work first. Hover a project to bring its card forward.',
      stage: 'fig.01 · featured work',
    },
    {
      id: 'skills',
      label: 'skills',
      eyebrow: 'skills.txt',
      title: 'The stack.',
      lead: 'Grouped by category. Hover a skill to light it up in the graph.',
      stage: 'fig.02 · skill graph',
    },
    { id: 'journey', label: 'journey', eyebrow: 'education.md', title: 'The path so far.' },
    { id: 'contact', label: 'contact', eyebrow: 'contact.txt', title: "Let's build something." },
  ],

  /** Call-to-action button on the right of the nav bar. */
  nav: { cta: { label: 'Get in touch', href: '#contact' } },

  terminal: {
    /** Prompt template. {user} defaults to the first name from the JSON. */
    prompt: '{user}@{host}:{cwd}$',
    user: null,
    host: 'portfolio',
    /** Key that focuses the hero terminal from anywhere on the page. */
    focusKey: '`',
    /** ms per boot line (0 = instant). */
    bootLineDelay: 110,
    /** ms per character when auto-typing the first command. */
    typeDelay: 55,
    /** Command typed automatically after boot so the terminal never looks empty. */
    autoRun: 'whoami',
    bootText: [
      '[ OK ] mounting /home/{user} from portfolio.json',
      '[ OK ] loading {projects} projects, {skills} skills',
      '[ OK ] neural field online',
    ],
    /** Tappable chips under the terminal. */
    chips: ['whoami', 'projects', 'skills', 'contact'],
    maxHistory: 100,
  },

  /** Fallback when portfolio.json has no "status". */
  defaultStatus: 'open to opportunities',

  scene: {
    /** Neural-network nodes (instanced, one draw call). */
    nodes: { desktop: 220, mobile: 90 },
    /** Max links per node and max link length. */
    linksPerNode: 3,
    linkDistance: 2.6,
    /** Device-pixel-ratio cap; keeps fill-rate sane on retina screens. */
    maxDpr: { desktop: 1.5, mobile: 1.25 },
    /** How strongly nodes are pushed away from / lit by the mouse. */
    mouse: { radius: 2.4, push: 0.55 },
    bloom: { strength: 0.9, radius: 0.35, threshold: 0.38 },
    /** Camera follow speed when scrolling (higher = snappier). */
    cameraEase: 3.2,
    /** Mouse parallax strength (world units). */
    parallax: 0.45,
    /** Scrolling top→bottom flies the camera this far forward (z), down (y) and side to side. */
    travel: { depth: 80, drop: 2.5, sway: 1.2 },
    /** Camera position relative to the point it looks at. */
    cameraOffset: [0, 0.6, 9],
  },
}

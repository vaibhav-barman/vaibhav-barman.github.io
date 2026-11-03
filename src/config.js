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

  /** Page sections, in order. `label` is the nav text; eyebrow/title are section headings. */
  sections: [
    { id: 'hero', label: 'home', eyebrow: '', title: '' },
    { id: 'about', label: 'about', eyebrow: 'about.md', title: 'Building AI that ships.' },
    { id: 'projects', label: 'projects', eyebrow: '~/projects', title: "Things I've built." },
    { id: 'skills', label: 'skills', eyebrow: 'skills.txt', title: 'The stack.' },
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
    bloom: { strength: 0.75, radius: 0.5, threshold: 0.12 },
    /** Camera follow speed (higher = snappier). */
    cameraEase: 3.2,
    /** Mouse parallax strength (world units). */
    parallax: 0.45,
    /** World-space point the camera looks at for each section. */
    anchors: {
      hero: [0, 0, 0],
      about: [0, 0.4, -18],
      projects: [0, 0, -36],
      skills: [0, 0.3, -56],
      journey: [0, 0, -74],
      contact: [0, 0.6, -90],
    },
    /** Camera sits this far from the active anchor. */
    cameraOffset: [0, 0.6, 9],
  },
}

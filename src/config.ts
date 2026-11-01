/**
 * Every tweakable value for the site lives here: colors, themes, 3D tuning,
 * camera motion, terminal prompt and boot text. Content does NOT live here;
 * all content comes from /portfolio.json.
 */

export type ThemeName = 'cyan' | 'violet' | 'matrix'

export interface ThemePalette {
  /** Primary accent: links, prompt, glow, particles. */
  accent: string
  /** Secondary accent: headings, skill hubs, secondary particles. */
  accent2: string
  /** Tiny highlight color used sparingly (cursor, errors-ish, pulses). */
  hot: string
}

export const config = {
  colors: {
    background: '#05060a',
    surface: 'rgba(14, 18, 30, 0.55)',
    text: '#e6f1ff',
    muted: '#8b97ad',
  },

  themes: {
    cyan: { accent: '#00e5ff', accent2: '#8b5cf6', hot: '#ff2bd6' },
    violet: { accent: '#a78bfa', accent2: '#00e5ff', hot: '#ff2bd6' },
    matrix: { accent: '#00ff9c', accent2: '#3ddc84', hot: '#d4ff3f' },
  } satisfies Record<ThemeName, ThemePalette>,
  defaultTheme: 'cyan' as ThemeName,

  /** Ordering + display names for project.category values in the JSON. */
  projectCategories: {
    order: ['agentic', 'rag', 'llm', 'tooling'],
    labels: {
      agentic: 'Agentic AI',
      rag: 'RAG',
      llm: 'LLM app',
      tooling: 'AI tooling',
    } as Record<string, string>,
  },

  scene: {
    /** Ambient "latent space" dust particles. */
    particles: { desktop: 2600, mobile: 900 },
    /** Glowing neural-network nodes (instanced). */
    neuralNodes: { desktop: 170, mobile: 70 },
    /** Max distance for drawing a synapse between two nodes. */
    linkDistance: 3.4,
    /** Device-pixel-ratio cap; keeps fill-rate sane on retina screens. */
    maxDpr: { desktop: 1.75, mobile: 1.25 },
    /** How quickly the camera catches up with the scroll target (seconds, lower = snappier). */
    cameraDamping: 0.45,
    /** Mouse parallax strength (world units). */
    parallax: 0.55,
    /** Auto-rotation speed of the project carousel (radians/sec). */
    carouselSpeed: 0.08,
    bloom: { intensity: 0.85, threshold: 0.18, smoothing: 0.4 },
    vignette: { offset: 0.25, darkness: 0.85 },
    /** World-space anchor for each page section, in scroll order. */
    anchors: {
      hero: [0, 0, 0],
      about: [-1.5, 0.6, -16],
      projects: [0, 0, -34],
      skills: [1.5, 0.4, -54],
      journey: [0, 0, -72],
      terminal: [0, -0.4, -96],
      contact: [0, 0.8, -112],
    } as Record<string, [number, number, number]>,
    /** Camera sits this far from the active anchor. */
    cameraOffset: [0, 0.6, 9] as [number, number, number],
  },

  terminal: {
    /** Prompt template. {user} defaults to the first name from the JSON. */
    prompt: '{user}@{host}:{cwd}$',
    user: null as string | null,
    host: 'portfolio',
    toggleKey: '`',
    /** ms per boot line when animating (0 = instant). */
    bootLineDelay: 90,
    bootText: [
      '[ OK ] initialising latent-space renderer',
      '[ OK ] mounting /home/{user} from portfolio.json',
      '[ OK ] loading {projects} projects, {skills} skills',
      '[ OK ] warming up neural field',
      '[ OK ] shell ready',
    ],
    quickCommands: ['help', 'whoami', 'projects', 'skills', 'neofetch', 'contact'],
    maxHistory: 100,
  },

  hud: {
    /** Fallback when portfolio.json has no "status". */
    defaultStatus: 'open to opportunities',
  },

  /** Sections, in page order. Labels show in the HUD and nav; eyebrow/title are the section headings (UI copy, not resume content). */
  sections: [
    { id: 'hero', label: 'boot', eyebrow: '', title: '' },
    { id: 'about', label: 'about', eyebrow: 'about.md', title: 'Building AI that ships.' },
    { id: 'projects', label: 'projects', eyebrow: '~/projects', title: "Things I've built." },
    { id: 'skills', label: 'skills', eyebrow: 'skills.txt', title: 'The stack, as a graph.' },
    { id: 'journey', label: 'journey', eyebrow: 'experience.md · education.md', title: 'The path so far.' },
    { id: 'terminal', label: 'terminal', eyebrow: 'tty1', title: 'Prefer the command line?' },
    { id: 'contact', label: 'contact', eyebrow: 'contact.txt', title: "Let's build something." },
  ],
} as const

export type SectionId = (typeof config.sections)[number]['id']

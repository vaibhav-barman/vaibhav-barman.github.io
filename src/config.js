/**
 * Site behaviour and UI copy. Colours live in theme.js; every word of
 * content lives in /portfolio.json.
 */
export const config = {
  /** Ordering + display names for project.category values in the JSON. */
  projectCategories: {
    order: ['agentic', 'rag', 'llm', 'tooling', 'web'],
    labels: {
      agentic: 'Agentic AI',
      rag: 'RAG',
      llm: 'LLM app',
      tooling: 'AI tooling',
      web: 'Web app',
    },
  },

  /**
   * Page sections, in order. `label` is the nav text; `head`, `note` and `lead`
   * are the section heading copy. `{flagships}` / `{builds}` in a note become
   * the counts from portfolio.json. Sections are numbered 01, 02, ... in this
   * order (the hero is not numbered).
   */
  sections: [
    { id: 'hero', label: 'home', head: '' },
    { id: 'about', label: 'whoami', head: 'whoami', note: 'identity.load()' },
    {
      id: 'projects',
      label: 'builds',
      head: 'flagship builds',
      note: '{flagships} agentic pipelines',
      lead: 'The panels animate the real graphs: each white packet is one run taking a different route through the nodes.',
    },
    { id: 'builds', label: 'more', head: 'more builds', note: '{builds} more shipped projects' },
    { id: 'skills', label: 'stack', head: 'stack', note: 'what I build with' },
    { id: 'journey', label: 'credentials', head: 'experience & credentials', note: 'training.log' },
    {
      id: 'notes',
      label: 'notes',
      head: 'notes',
      note: 'lab notebook',
      lead: 'Short write-ups on how I build and evaluate AI systems.',
      /** Only shown (with its nav link) when notes/ has published notes. */
      optional: true,
    },
    { id: 'contact', label: 'contact', head: 'open a channel', note: 'handshake()' },
  ],

  /** Call-to-action button on the right of the nav bar. */
  nav: { cta: { label: 'Get in touch', href: '#contact' } },

  /** The terminal-style card in the whoami section. */
  whoami: { command: 'whoami --verbose', done: 'IDENTITY.LOAD() · OK', shell: '› open shell', shellClose: '× close shell' },

  footer: { end: 'END OF TRANSMISSION' },

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
      '[ OK ] chrome core online',
    ],
    /** Tappable chips under the terminal. */
    chips: ['whoami', 'projects', 'skills', 'contact'],
    maxHistory: 100,
  },

  /** Fallback when portfolio.json has no "status". */
  defaultStatus: 'open to opportunities',
}

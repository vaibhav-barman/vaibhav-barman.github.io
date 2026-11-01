/**
 * Shape of /portfolio.json. Everything that existed in the original
 * generator schema is kept; fields marked "(v2)" are optional additions.
 */

export interface RawSocialLink {
  label: string
  url: string
  svg_path?: string
}

export interface RawWork {
  company?: string
  organization?: string
  position: string
  url?: string
  start_date?: string
  end_date?: string
  summary?: string
  highlights?: string[]
  /** (v2) e.g. "Remote", "Jaipur" */
  location?: string
}

export interface RawImage {
  img_path: string
  caption?: string
}

export interface RawProject {
  title: string
  summary: string
  /** Original field: primary link (treated as the repository URL). */
  url?: string
  highlights?: string[]
  images?: RawImage[]
  /** (v2) URL-safe id used by the CLI (`open <slug>`). Derived from title if missing. */
  slug?: string
  /** (v2) Explicit repository URL; falls back to `url`. */
  repo_url?: string
  /** (v2) Live demo URL. */
  live_url?: string
  /** (v2) Featured projects are listed first. */
  featured?: boolean
  /** (v2) One of config.projectCategories.order, e.g. "agentic", "rag", "llm", "tooling". */
  category?: string
  /** (v2) Tech tags. */
  tags?: string[]
}

export interface RawEducation {
  institution: string
  location?: string
  url?: string
  degrees?: string[]
  honors?: string[]
  gpa_cumulative?: string
  gpa_major?: string
  graduation_date?: string
  /** (v2) */
  start_date?: string
}

export interface RawSkill {
  name: string
  proficiency?: number
  proficiency_label?: string
  /** (v2) Group name, e.g. "AI & LLMs". */
  category?: string
}

export interface RawInterest {
  name: string
  summary?: string
  images?: RawImage[]
}

export interface RawPortfolio {
  name: string
  label: string
  /** (v2) One-line pitch used by `whoami` and the hero. Falls back to `label`. */
  tagline?: string
  /** (v2) Availability shown in the HUD, e.g. "open to remote roles". */
  status?: string
  image_path?: string
  contact: {
    email?: string
    phone?: string
    location?: string
    website?: string
  }
  summary: string
  base_url?: string
  social_links?: RawSocialLink[]
  work_experience?: RawWork[]
  projects?: RawProject[]
  volunteer_experience?: RawWork[]
  education?: RawEducation[]
  skills?: RawSkill[]
  interests?: RawInterest[]
  languages?: { language: string; fluency?: string }[]
  references?: unknown[]
  marathon?: {
    title?: string
    medals?: { distance: string; event: string; medal?: string }[]
  }
}

/**
 * The single entry point for content in the browser. It imports
 * /portfolio.json directly, so editing that file hot-reloads the 3D UI,
 * the HTML sections and the CLI together.
 */
import raw from '../../portfolio.json'
import { normalize } from './normalize'
import type { RawPortfolio } from './types'

export const portfolio = normalize(raw as RawPortfolio)
export type { Portfolio, Project, Skill, SkillGroup, TimelineEntry, Social } from './normalize'

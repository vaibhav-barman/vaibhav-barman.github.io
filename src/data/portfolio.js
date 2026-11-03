/**
 * The single entry point for content in the browser. Imports /portfolio.json
 * directly, so the terminal and the 3D scene always match the HTML.
 */
import raw from '../../portfolio.json'
import { normalize } from './normalize.js'

export const portfolio = normalize(raw)

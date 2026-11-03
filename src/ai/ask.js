/**
 * "Ask my portfolio": answers questions by keyword retrieval over
 * portfolio.json, fully offline. A provider is any object with
 * `ask(question) -> Promise<{ text, sources }>`, so an LLM-backed one can be
 * swapped in later without touching the terminal.
 */
import { aboutMd, contactTxt, interestsMd, projectMd, skillsTxt, timelineMd } from '../data/text.js'

const STOP = new Set(
  'a an the is are was were do does did can could what which who whom how why when where of to in on for with and or his her their your you he she it this that about tell me any has have had i my vaibhav barman'.split(' '),
)

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map((x) => x.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((x) => x.length > 1 && !STOP.has(x))
}

function buildDocs(d) {
  const docs = [
    { id: 'about.md', title: 'About', text: aboutMd(d), answer: d.summary, boost: ['who', 'about', 'background', 'bio', 'summary', 'intro'] },
    {
      id: 'contact.txt',
      title: 'Contact',
      text: contactTxt(d),
      answer: `You can reach ${d.firstName} at ${d.email ?? 'the links below'}.${d.socials.length ? ` Also on ${d.socials.map((s) => s.label).join(', ')}.` : ''}`,
      boost: ['contact', 'email', 'reach', 'hire', 'linkedin', 'github', 'mail'],
    },
    {
      id: 'skills.txt',
      title: 'Skills',
      text: skillsTxt(d),
      answer: d.skillGroups.map((g) => `${g.name}: ${g.skills.map((s) => s.name).join(', ')}`).join('. ') + '.',
      boost: ['skills', 'stack', 'tech', 'technologies', 'languages', 'know', 'tools'],
    },
    {
      id: 'education.md',
      title: 'Education',
      text: timelineMd(d, 'education'),
      answer: timelineMd(d, 'education').replace(/^## /gm, '').replace(/\n- /g, ', ').replace(/\n/g, '. '),
      boost: ['education', 'study', 'degree', 'university', 'college', 'gpa', 'cgpa', 'bits', 'graduate', 'graduation'],
    },
    {
      id: 'experience.md',
      title: 'Experience',
      text: timelineMd(d, 'work') + ` status ${d.status} available open roles remote`,
      answer: d.timeline.some((x) => x.kind !== 'education')
        ? timelineMd(d, 'work').replace(/^## /gm, '').replace(/\n/g, '. ')
        : `No professional roles are listed yet; ${d.firstName} is currently ${d.status}.`,
      boost: ['experience', 'work', 'job', 'jobs', 'role', 'roles', 'available', 'open', 'remote', 'status'],
    },
    {
      id: 'interests.md',
      title: 'Interests',
      text: interestsMd(d),
      answer: `Outside work: ${d.interests.map((i) => i.name).join(', ')}.${d.achievements.length ? ` Medals: ${d.achievements.map((a) => a.title).join('; ')}.` : ''}`,
      boost: ['hobbies', 'interests', 'fun', 'running', 'marathon', 'gym', 'piano', 'books'],
    },
  ]
  for (const p of d.projects) {
    docs.push({
      id: `projects/${p.slug}.md`,
      title: p.title,
      text: projectMd(p) + ' project ' + p.slug,
      answer: `${p.title}: ${p.summary}${p.repoUrl ? ` (${p.repoUrl})` : ''}`,
      boost: [p.slug, ...tokens(p.title), ...p.tags.map((x) => x.toLowerCase())],
    })
  }
  return docs
}

export function createOfflineProvider(d) {
  const docs = buildDocs(d).map((doc) => ({ ...doc, toks: new Set(tokens(doc.text)), boost: new Set(doc.boost ?? []) }))
  return {
    name: 'offline · keyword retrieval over portfolio.json',
    async ask(question) {
      const q = tokens(question)
      if (!q.length) return { text: 'Ask me about projects, skills, education, or how to get in touch.', sources: [] }

      const scored = docs
        .map((doc) => {
          let score = 0
          for (const w of q) {
            if (doc.boost.has(w)) score += 3
            if (doc.toks.has(w)) score += 1
            else if (w.length > 3 && [...doc.toks].some((x) => x.startsWith(w))) score += 0.5
          }
          return { doc, score }
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)

      const asksProjects = q.some((w) => ['project', 'projects', 'built', 'build', 'portfolio', 'work'].includes(w))
      const projectHits = scored.filter((x) => x.doc.id.startsWith('projects/'))
      if (asksProjects && projectHits.length > 1 && (scored[0]?.doc.id.startsWith('projects/') || q.length <= 2)) {
        const top = projectHits.slice(0, 3)
        return { text: `Relevant projects: ${top.map((x) => x.doc.title).join(', ')}. ${top[0].doc.answer}`, sources: top.map((x) => x.doc.id) }
      }
      if (!scored.length) {
        return {
          text: `I couldn't find that in the portfolio. Try asking about projects, skills, education or contact. Or email ${d.email ?? d.firstName} directly.`,
          sources: [],
        }
      }
      return { text: scored[0].doc.answer, sources: scored.slice(0, 2).map((x) => x.doc.id) }
    },
  }
}

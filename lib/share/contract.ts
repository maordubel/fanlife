import type { StoryTemplate } from './story'

/**
 * THE SHARE CONTRACT (ONE RED WORLD §27–§29). Client-safe.
 *
 * Every share carries six things, and a share missing one of them is not a share, it is
 * a screenshot with a link stapled to it:
 *
 *   1. **an artefact** — the object the result becomes: a team sheet, a score slip, a
 *      ticket (§28). Drawn by the ONE renderer, `lib/share/story.ts` (rule 19).
 *   2. **a personal statement** — first person: "זכרתי 9/12", "זאת הפועל שלי".
 *   3. **tiny context** — what it was about, in a line: the topic, the match, the year.
 *   4. **a CTA** — the dare, in the voice (§2.1).
 *   5. **a deep link** — the SAME run (seed + cursor, or the gate's params), or for gate
 *      1 the same PROMPT (§10).
 *   6. **no spoiler** — the card and the link say how you did, never the answer.
 *
 * `checkShare()` is the gate a payload passes before it is drawn; `tests/share-contract`
 * holds every surface to it.
 */

/** §27's five kinds. */
export type ShareType = 'identity' | 'memory' | 'opinion' | 'story' | 'group'

/** The surfaces that share — the thirteen gates, THE WORKER LIFE and the stand. */
export type ShareSurface =
  | 'xi'
  | 'trivia'
  | 'lineup'
  | 'kit'
  | 'wardrobe'
  | 'memory'
  | 'terrace'
  | 'goal'
  | 'rumble'
  | 'blindcow'
  | 'hate'
  | 'archive'
  | 'timeline'
  | 'thread'
  | 'life'
  | 'stand'

export type SurfaceSpec = {
  gate: number | null
  type: ShareType
  /** §28 — the artefact, and the template that draws it */
  artefact: string
  template: StoryTemplate
  /** does the link reproduce a run? (identity / opinion surfaces hand over a prompt or nothing) */
  sameRun: boolean
}

/**
 * §28, one row per surface. The template is the artefact's own layout in `story.ts`;
 * two surfaces share a template only where the artefact is the same object (a ballot
 * slip is a ballot slip).
 */
export const SURFACES: Readonly<Record<ShareSurface, SurfaceSpec>> = {
  xi: { gate: 1, type: 'identity', artefact: 'team sheet', template: 'xi', sameRun: false },
  trivia: { gate: 2, type: 'memory', artefact: 'score slip', template: 'slip', sameRun: true },
  lineup: { gate: 3, type: 'memory', artefact: 'match programme', template: 'programme', sameRun: true },
  kit: { gate: 4, type: 'memory', artefact: 'collector card', template: 'collector', sameRun: true },
  wardrobe: { gate: 5, type: 'identity', artefact: 'closet card', template: 'closet', sameRun: false },
  memory: { gate: 6, type: 'memory', artefact: 'contact sheet', template: 'contact', sameRun: true },
  terrace: { gate: 7, type: 'opinion', artefact: 'ballot slip · debate sticker', template: 'debate', sameRun: false },
  goal: { gate: 8, type: 'memory', artefact: 'broadcast freeze frame', template: 'freeze', sameRun: true },
  rumble: { gate: 9, type: 'identity', artefact: 'five-player poster', template: 'poster', sameRun: true },
  blindcow: { gate: 10, type: 'memory', artefact: 'clue card', template: 'clue', sameRun: true },
  hate: { gate: 11, type: 'opinion', artefact: 'black poster', template: 'black', sameRun: true },
  archive: { gate: 12, type: 'story', artefact: 'press clipping', template: 'clipping', sameRun: false },
  timeline: { gate: 13, type: 'memory', artefact: 'paper strip', template: 'strip', sameRun: true },
  thread: { gate: 13, type: 'memory', artefact: 'paper strip · thread', template: 'strip', sameRun: true },
  life: { gate: null, type: 'story', artefact: 'ticket', template: 'ticket', sameRun: false },
  stand: { gate: null, type: 'group', artefact: 'stand recap', template: 'slip', sameRun: false },
}

export type SharePayload = {
  surface: ShareSurface
  /** 2 — first person */
  statement: string
  /** 3 — one line of context */
  context: string
  /** 4 — the dare */
  cta: string
  /** 5 — an absolute or site-relative link */
  link: string
  /** 6 — every string the card and the message will carry */
  texts: readonly string[]
}

export type ShareProblem =
  | 'no-statement'
  | 'no-context'
  | 'no-cta'
  | 'no-link'
  | 'link-not-same-run'
  | 'spoiler'

/**
 * The six rules, checked. `forbidden` is what this particular run must not reveal — the
 * blind cow's man, the goal's scorer, the lineup's eleven — and the check reads every
 * string the share would carry, the link included, for each of them.
 */
export function checkShare(payload: SharePayload, forbidden: readonly string[] = []): ShareProblem[] {
  const problems: ShareProblem[] = []
  if (!payload.statement.trim()) problems.push('no-statement')
  if (!payload.context.trim()) problems.push('no-context')
  if (!payload.cta.trim()) problems.push('no-cta')
  if (!payload.link.trim()) problems.push('no-link')
  const spec = SURFACES[payload.surface]
  if (spec.sameRun && payload.link && !/\/c\/[A-Za-z0-9_-]+|[?&]seed=\d+/.test(payload.link)) problems.push('link-not-same-run')
  const everything = [payload.statement, payload.context, payload.cta, payload.link, ...payload.texts]
  const secrets = forbidden.map((s) => s.trim()).filter((s) => s.length >= 2)
  if (secrets.some((secret) => everything.some((text) => text.includes(secret) || safeDecode(text).includes(secret)))) {
    problems.push('spoiler')
  }
  return problems
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

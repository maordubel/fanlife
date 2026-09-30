import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MESSAGES } from '@/lib/i18n'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import {
  blackCard,
  clippingCard,
  clueCard,
  collectorCard,
  contactCard,
  debateCard,
  freezeCard,
  posterCard,
  programmeCard,
  slipCard,
  stripCard,
  ticketCard,
} from '@/lib/share/artefacts'
import { SURFACES, checkShare, type ShareSurface } from '@/lib/share/contract'
import type { StoryCard } from '@/lib/share/story'

/**
 * SHARE V2 — the contract (ONE RED WORLD §27–§29, §43).
 *
 * Every surface has an artefact of its own (§28: "לא template אחד"), every artefact is in
 * the overlap harness (rule 19), every card carries statement · context · CTA and no
 * answer (§27), and the one share system stays the one share system.
 */
const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const CARDS: Record<Exclude<ShareSurface, 'xi' | 'wardrobe' | 'thread' | 'stand'>, StoryCard> = {
  trivia: slipCard({ topic: 'היסטוריה', marks: [true, false, true] }),
  lineup: programmeCard({ match: 'הפועל — מכבי חיפה', date: '24.5.1986', slots: [{ role: 'שוער', found: true }, { role: 'בלם', found: false }] }),
  kit: collectorCard({ season: '1985/86', serial: 3, kit: DEFAULT_SPEC, right: 4, total: 5 }),
  memory: contactCard({ moves: 9, frames: [{ label: 'אליפות', hit: true }] }),
  terrace: debateCard({ question: 'החלוץ של כל הזמנים', pick: 'בני טבק' }),
  goal: freezeCard({ match: 'הפועל — בנפיקה', route: [{ x: 1, y: 2 }], accuracy: 72, clock: "24'" }),
  rumble: posterCard({ rows: [{ role: 'שוער', name: 'א' }] }),
  blindcow: clueCard({ hints: 3, total: 10, solved: true }),
  hate: blackCard({ rows: [{ name: 'א', out: true }] }),
  archive: clippingCard({ date: '1.1.1990', headline: 'כותרת', caption: 'כיתוב', label: 'ARCHIVE' }),
  timeline: stripCard({ variant: 'order', rows: [{ text: 'אירוע', ok: true }] }),
  life: ticketCard({ year: '1986', place: 'בלומפילד', line: 'שורה', serial: 'NO. 1' }),
}

describe('§28 — an artefact per surface, drawn by the one renderer', () => {
  const story = read('lib/share/story.ts')
  const proof = read('app/qa/story/StoryProof.tsx')
  const declared = story.match(/export type StoryTemplate =([^\n]+)/)?.[1] ?? ''

  it('every surface names a declared template, and every new template is in the overlap harness', () => {
    for (const [surface, spec] of Object.entries(SURFACES)) {
      expect(declared, `${surface} → ${spec.template}`).toContain(`'${spec.template}'`)
      expect(proof, `${spec.template} is not in app/qa/story`).toMatch(new RegExp(`name: '${spec.template}'|template: '${spec.template}'|'${spec.template}'`))
    }
  })

  it('every artefact template is held to the safe zones by story:overlap', () => {
    const overlap = read('scripts/brand/story-overlap.mjs')
    const strict = overlap.match(/const SAFE_STRICT = \[([^\]]+)\]/)?.[1] ?? ''
    for (const t of ['slip', 'programme', 'collector', 'contact', 'debate', 'freeze', 'poster', 'clue', 'black', 'clipping', 'strip', 'ticket']) {
      expect(strict).toContain(`'${t}'`)
    }
  })

  it('each builder hands the renderer its own artefact', () => {
    for (const [surface, card] of Object.entries(CARDS)) {
      expect(card.artefact?.kind, surface).toBe(card.template)
      expect(card.template, surface).toBe(SURFACES[surface as ShareSurface].template)
    }
  })

  it('gate 11’s poster carries no vermilion — the away end (rule 9)', () => {
    const body = story.slice(story.indexOf('function blackPoster('), story.indexOf('/* ── gate 12'))
    expect(body.length).toBeGreaterThan(200)
    expect(body).not.toContain('BRAND.red')
    const tone = story.slice(story.indexOf("body.kind === 'black'\n"), story.indexOf(': dark\n'))
    expect(tone).toContain('rule: BRAND.sign')
    expect(tone).not.toContain('BRAND.red')
  })
})

describe('§27 — statement, context, CTA, deep link, no spoiler', () => {
  it('every card passes the contract with a challenge link', () => {
    for (const [surface, card] of Object.entries(CARDS)) {
      const problems = checkShare({
        surface: surface as ShareSurface,
        statement: card.cta,
        context: card.eyebrow,
        cta: card.challenge,
        link: 'https://theworker.dubelteam.com/c/eyJ2IjoxfQ',
        texts: [card.hero, card.kicker, JSON.stringify(card.artefact)],
      })
      expect(problems, surface).toEqual([])
    }
  })

  it('a same-run surface refuses a link that does not hand over the run', () => {
    expect(checkShare({ surface: 'trivia', statement: 'א', context: 'ב', cta: 'ג', link: 'https://x.test/trivia', texts: [] })).toContain('link-not-same-run')
    expect(checkShare({ surface: 'xi', statement: 'א', context: 'ב', cta: 'ג', link: 'https://x.test/xi?prompt=free', texts: [] })).toEqual([])
  })

  it('catches the answer wherever it hides — the text, the card, the URL-encoded link', () => {
    const name = 'אלי אוחנה'
    const leak = checkShare(
      { surface: 'blindcow', statement: 'תפסתי ברמז 3', context: 'פרה עיוורת', cta: 'אל תגלו', link: `https://x.test/blind-cow?n=${encodeURIComponent(name)}`, texts: [] },
      [name],
    )
    expect(leak).toContain('spoiler')
  })

  it('the builders are shaped so the answer cannot be passed in', () => {
    // the programme takes roles and ticks, the clue card counts, the freeze frame a route
    const programme = programmeCard({ match: 'm', date: 'd', slots: [{ role: 'שוער', found: true }] })
    expect(Object.keys(programme.artefact?.kind === 'programme' ? programme.artefact.slots[0]! : {})).toEqual(['role', 'found'])
    const clue = clueCard({ hints: 2, total: 10, solved: true })
    expect(JSON.stringify(clue)).not.toMatch(/p_[0-9a-f]{10}/)
    expect(clue.challenge).toBe(MESSAGES['voice.g10.act.noSpoil'])
  })
})

describe('§29 — the WhatsApp line is the gate’s own voice', () => {
  it('the cards speak the voice lines, filled with the run’s count', () => {
    expect(CARDS.trivia.cta).toBe('זכרתי 2/12. קח את אותם 12.')
    expect(CARDS.blindcow.cta).toBe('אני תפסתי ברמז 3. אל תגלו.')
    expect(CARDS.terrace.cta).toBe('אני הלכתי עם בני טבק. מה אתם אומרים?')
    expect(CARDS.life.cta).toBe('חזרתי עכשיו ל־1986.')
    expect(clueCard({ hints: 10, total: 10, solved: false }).cta).not.toContain('תפסתי')
  })

  it('the debate sticker says it the way the brief does', () => {
    const card = debateCard({ question: 'q', pick: 'X' })
    expect(card.artefact?.kind === 'debate' && `${card.artefact.took} ${card.artefact.pick}. ${card.artefact.ask}`).toBe('אני לקחתי את X. מה אתה אומר?')
  })
})

describe('the one share system (rule 19)', () => {
  const row = read('components/share/ShareRow.tsx')

  it('ShareRow says "שלח ליציע" and makes a challenge link through the landing', () => {
    expect(row).toContain('t(SHARE_KEY)')
    expect(row).toContain('mintChallengeAction')
    expect(row).toContain('challengeLink(code)')
    // until the server answers, the plain same-seed link still works
    expect(row).toContain('challengeUrl(kind, seed, cursor, route)')
    expect(row).toContain("track('share_created'")
    expect(row).toContain("track('challenge_created'")
  })

  it('no new renderer: the artefacts live in story.ts and nowhere else draws a story card', () => {
    const artefacts = read('lib/share/artefacts.ts')
    expect(artefacts).not.toMatch(/getContext\(|fillText\(/)
    expect(read('lib/share/story.ts')).toContain('function drawArtefactCard(')
  })

  it('the landing and the compare card count the plan’s own events (§37)', () => {
    const landing = read('components/share/ChallengeLanding.tsx')
    expect(landing).toContain("track('share_joined'")
    expect(landing).toContain("track('challenge_joined'")
    expect(read('components/share/CompareCard.tsx')).toContain("track('challenge_complete'")
  })
})

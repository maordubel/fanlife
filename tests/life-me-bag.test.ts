import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import heStage from '@/messages/he.stage.life90h.json'
import { MESSAGES } from '@/lib/i18n'
import { CHAPTERS, anchorOwner, chapterFor } from '@/lib/life/content/chapters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { fold, type LifeEvent } from '@/lib/life/events'
import {
  bagOverviewReading,
  distanceTierOf,
  identitySummaryReading,
  lifeTrackVisualReading,
  livedChapters,
  memoryDrawerReading,
  personalStoryReading,
  relationshipVisualReading,
  subscriptionCardReading,
  tiltOf,
} from '@/lib/life/personal'
import { presenceReading } from '@/lib/life/profile'
import { boxContents } from '@/lib/life/redboxView'
import { subscriptionReading } from '@/lib/life/subscription'
import { relationshipOf } from '@/lib/life/types'

/**
 * אני · התיק שלי · הסיפור שלי (delta 90-H) — the personal layer split into its three
 * destinations, and the rules each one keeps.
 *
 * What is held here: the readings are deterministic words and names (never a figure to
 * print, never a path Pugi was not offered, never a chapter he has not lived); the
 * presence data moved to the story and out of the bag; the bag reads the Red Box and the
 * subscription through their own readings; and the source of the dossier keeps the house
 * rules — no tab between the two halves, "לסגור" for the harness, z-[60] on every dialog,
 * no Math.random in layout, logical properties only.
 */

const ROOT = join(__dirname, '..')
const DIR = join(ROOT, 'components/life/profile')
const SOURCES = readdirSync(DIR)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }))
const CARD = readFileSync(join(ROOT, 'components/life/ProfileCard.tsx'), 'utf8')

const year = (chapter: string) => chapterFor(chapter)?.year ?? 0
const flags = (...names: string[]): LifeEvent[] => names.map((flag) => ({ t: 'flag.raised', flag }))
const rel = (who: string, axis: 'bond' | 'trust' | 'tension' | 'familiarity' | 'distance', delta: number): LifeEvent => ({ t: 'relationship.changed', who, axis, delta })
const at = (chapter: string, events: LifeEvent[] = []) =>
  fold(DEFAULT_IDENTITY, year(chapter), [
    { t: 'year.entered', year: year(chapter), weekday: 6, minute: 900 },
    { t: 'chapter.entered', chapter },
    ...events,
  ])

const FIRST = CHAPTERS.find((row) => row.playable)!
const SATURDAY = CHAPTERS.find((row) => row.id === row.anchorKey && row.stage === 'A')!
const LAST = CHAPTERS[CHAPTERS.length - 1]!

const noDigits = (text: string) => !/\d/.test(text)

// ---------------------------------------------------------------------------------
describe('מי אני — the hero is words, and it moves only on a milestone', () => {
  it('a child who has not been inside yet is a child from the street', () => {
    const who = identitySummaryReading(at(SATURDAY.id))
    expect(who.key).toBe('age:child')
    expect(noDigits(who.title) && noDigits(who.line)).toBe(true)
  })

  it('a title somebody gave him outranks his age, and says the title', () => {
    const who = identitySummaryReading(at(LAST.id, flags('own:route:ULTRAS:entry', 'own:route:ULTRAS:practice')))
    expect(who.key).toBe('route:ULTRAS:rising')
    expect(who.eyebrow).toContain('מוביל חבורה')
    const apex = identitySummaryReading(at(LAST.id, flags('own:route:ULTRAS:entry', 'own:route:ULTRAS:apex')))
    expect(apex.key).toBe('route:ULTRAS:apex')
    expect(apex.title).not.toBe(who.title)
  })

  it('a title he put down is history, not his identity today', () => {
    const who = identitySummaryReading(at(LAST.id, flags('own:route:JOURNALIST:entry', 'own:route:JOURNALIST:left')))
    expect(who.key).toBe('route:left')
  })

  it('is deterministic — the same life reads the same way twice', () => {
    const state = at(LAST.id, flags('own:track:PARENTHOOD:expecting', 'own:track:PARENTHOOD:born'))
    expect(identitySummaryReading(state)).toEqual(identitySummaryReading(state))
    expect(identitySummaryReading(state).key).toBe('track:parent')
  })
})

// ---------------------------------------------------------------------------------
describe('הדרך שלי — paths he knows about, drawn by state, never by number', () => {
  it('a route nobody offered him is not on the map at all', () => {
    const map = lifeTrackVisualReading(at(LAST.id))
    expect(map.branches.some((row) => row.kind === 'route')).toBe(false)
  })

  it('offered → emerging, held → active, apex → strong, left → dormant', () => {
    const state = at(
      LAST.id,
      flags('route:offered:OWNER:entry', 'own:route:ULTRAS:entry', 'own:route:TRAVELLER:entry', 'own:route:TRAVELLER:apex', 'own:route:JOURNALIST:entry', 'own:route:JOURNALIST:left'),
    )
    const byId = Object.fromEntries(lifeTrackVisualReading(state).branches.map((row) => [row.id, row]))
    expect(byId['route:OWNER']?.state).toBe('emerging')
    expect(byId['route:ULTRAS']?.state).toBe('active')
    expect(byId['route:TRAVELLER']?.state).toBe('strong')
    expect(byId['route:JOURNALIST']?.state).toBe('dormant')
  })

  it('a stage he has not reached is a mark with no name', () => {
    const map = lifeTrackVisualReading(at(LAST.id, flags('own:route:ULTRAS:entry')))
    const ultras = map.branches.find((row) => row.id === 'route:ULTRAS')!
    expect(ultras.stops.filter((stop) => stop.reached)).toHaveLength(1)
    expect(ultras.milestonesHe).toHaveLength(1)
    expect(Object.values(ultras.stops[1]!)).toEqual([false])
  })

  it('life tracks are branches of their own, strong at their last stage', () => {
    const map = lifeTrackVisualReading(at(LAST.id, flags('own:track:PARTNERSHIP:first', 'own:track:PARTNERSHIP:together', 'own:track:PARTNERSHIP:home', 'own:track:WORK:first-job')))
    expect(map.branches.find((row) => row.id === 'track:PARTNERSHIP')?.state).toBe('strong')
    expect(map.branches.find((row) => row.id === 'track:WORK')?.state).toBe('active')
  })

  it('a strong pull of the Red Heart is a path before anybody names it — and only then', () => {
    const quiet = lifeTrackVisualReading(at(SATURDAY.id))
    expect(quiet.branches).toHaveLength(0)
    const hall = lifeTrackVisualReading(at(SATURDAY.id, [{ t: 'redheart.changed', key: 'basketballLove', delta: 60 }]))
    expect(hall.branches.map((row) => row.id)).toEqual(['lean:basketballLove'])
    expect(hall.branches[0]?.state).toBe('emerging')
  })

  it('never returns a figure a screen could print', () => {
    const map = lifeTrackVisualReading(at(LAST.id, flags('own:route:ULTRAS:entry', 'own:track:WORK:first-job')))
    for (const row of map.branches) for (const text of [row.titleHe, row.stageHe, row.storyHe, ...row.milestonesHe]) expect(noDigits(text), text).toBe(true)
  })
})

// ---------------------------------------------------------------------------------
describe('האנשים שלי — a distance, never a value', () => {
  it('tiers read off bond, tension, trust and distance', () => {
    // every axis is SET to a value from whatever the chapter starts him on, so the test
    // reads the thresholds and not the defaults
    const base = relationshipOf(at(LAST.id), 'kobi')
    const to = (axis: 'bond' | 'tension' | 'distance' | 'trust', value: number) => rel('kobi', axis, value - base[axis])
    const calm = [to('tension', 0), to('distance', 0), to('trust', 60)]
    expect(distanceTierOf(at(LAST.id, [...calm, to('bond', 80)]), 'kobi')).toBe('inner')
    expect(distanceTierOf(at(LAST.id, [...calm, to('bond', 50)]), 'kobi')).toBe('close')
    expect(distanceTierOf(at(LAST.id, [...calm, to('bond', 50), to('tension', 70)]), 'kobi')).toBe('fractured')
    expect(distanceTierOf(at(LAST.id, [...calm, to('bond', 30), to('distance', 70)]), 'kobi')).toBe('distant')
  })

  it('carries no number on a node, and puts the partner in the romance sector', () => {
    const state = at(LAST.id, [rel('kobi', 'bond', 80), rel('melanie', 'bond', 80), { t: 'flag.set', flag: 'life:partner', value: 'melanie' }])
    const map = relationshipVisualReading(state, ['kobi'])
    const partner = map.nodes.find((node) => node.id === 'melanie')
    expect(partner?.category).toBe('romance')
    for (const node of map.nodes) for (const value of Object.values(node)) expect(typeof value === 'number').toBe(false)
    expect(map.romanceEmpty).toBe(false)
  })

  it('an adult with nobody in that part of life gets the empty place, a child does not', () => {
    expect(relationshipVisualReading(at(LAST.id), []).romanceEmpty).toBe(true)
    expect(relationshipVisualReading(at(SATURDAY.id), []).romanceEmpty).toBe(false)
  })
})

// ---------------------------------------------------------------------------------
describe('הסיפור שלי — his biography, never ahead of him', () => {
  it('lists only the chapters he has lived, ending where he stands', () => {
    const state = at(SATURDAY.id)
    const rows = personalStoryReading(state)
    expect(rows[rows.length - 1]?.id).toBe(SATURDAY.id)
    expect(rows[rows.length - 1]?.now).toBe(true)
    const future = CHAPTERS.findIndex((row) => row.id === SATURDAY.id)
    for (const row of rows) expect(CHAPTERS.findIndex((chapter) => chapter.id === row.id)).toBeLessThanOrEqual(future)
  })

  it('skips a window this life did not open', () => {
    const lived = livedChapters(at(LAST.id)).map((row) => row.id)
    const window = CHAPTERS.find((row) => (row.when?.length ?? 0) > 0)!
    expect(lived).not.toContain(window.id)
    expect(lived).toContain(LAST.id)
  })

  it('says how he was there in the first person, from the same data presenceReading reads', () => {
    const owned = CHAPTERS.filter((row) => row.stage !== 'A' && anchorOwner(row.anchorKey) === row.id)
    const [radio, missed] = [owned[0]!, owned[1]!]
    const state = at(LAST.id, [
      { t: 'anchor.attended', anchorId: SATURDAY.anchorKey },
      { t: 'presence.recorded', anchorId: radio.anchorKey, mode: 'radio' },
      { t: 'anchor.missed', anchorId: missed.anchorKey },
    ])
    const rows = Object.fromEntries(personalStoryReading(state).map((row) => [row.id, row]))
    expect(rows[SATURDAY.id]?.presence).toBe('there')
    expect(rows[SATURDAY.id]?.presenceHe).toBe(MESSAGES['life90h.story.there'])
    expect(rows[radio.id]?.presenceHe).toBe(MESSAGES['life90h.story.mode.radio'])
    expect(rows[radio.id]?.presence).toBe('partial')
    expect(rows[missed.id]?.presence).toBe('missed')
    // every day the old bag listed is a day the story tells
    const told = new Set(personalStoryReading(state).filter((row) => row.presence !== 'none').map((row) => chapterFor(row.id)?.anchorKey))
    for (const day of presenceReading(state)) expect(told.has(day.anchorId), day.anchorId).toBe(true)
  })

  it('opens with the shoulders of the prologue once it was played', () => {
    expect(personalStoryReading(at(FIRST.id))[0]?.id).not.toBe('prologue')
    expect(personalStoryReading(at(FIRST.id, flags('prologue:done')))[0]?.id).toBe('prologue')
  })
})

// ---------------------------------------------------------------------------------
describe('התיק שלי — the objects, through the readings that already own them', () => {
  const keep = (id: string, rarity: 'common' | 'rare'): LifeEvent => ({
    t: 'redbox.item_added',
    item: { id, year: year(LAST.id), atMinute: 900, sourceEventId: 'test', titleHe: 'צעיף', noteHe: 'אדום', item: 'scarf', rarity },
  })

  it('the memory drawer is the Red Box, joined to the rows that can be shared', () => {
    const state = at(LAST.id, [keep('k-rare', 'rare'), keep('k-common', 'common')])
    const drawer = memoryDrawerReading(state)
    expect(drawer.map((row) => row.id)).toEqual(boxContents(state).map((row) => row.id))
    expect(drawer.find((row) => row.id === 'k-rare')?.rarityHe).toBeTruthy()
    // `common` gets no plate at all — five rarities must never look like five tiers
    expect(drawer.find((row) => row.id === 'k-common')?.rarityHe).toBeNull()
    expect(drawer.every((row) => row.keepsake !== null)).toBe(true)
  })

  it('the season card is an object with its run said as a sentence, never the leaderboard word', () => {
    const none = subscriptionCardReading(subscriptionReading(at(LAST.id)))
    expect(none).toBeNull()
    const card = subscriptionCardReading({ seasonsHe: ['1998/99', '1999/00', '2000/01'], currentHe: '2000/01', streak: 3 })
    expect(card?.runHe).toBe(MESSAGES['life90h.sub.run3'])
    expect(card?.olderHe).toEqual(['1999/00', '1998/99'])
    for (const [key, value] of Object.entries(heStage)) expect(value.includes('רצף'), key).toBe(false)
    expect(subscriptionCardReading({ seasonsHe: ['2000/01'], currentHe: '2000/01', streak: 1 })?.runHe).toBeNull()
  })

  it('composes every compartment from one reading', () => {
    const state = at(LAST.id, [{ t: 'item.gained', item: 'coin', count: 2 }])
    const bag = bagOverviewReading(state, subscriptionReading(state))
    expect(bag.carried.map((row) => row.item)).toEqual(['coin'])
    expect(bag.purses).toHaveLength(2)
  })

  it('tilts are stable, whole degrees between −2 and +2', () => {
    for (const id of ['a', 'k-scarf', '1986-home', 'sub:2000/01', 'שלום']) {
      expect(tiltOf(id)).toBe(tiltOf(id))
      expect(tiltOf(id)).toBeGreaterThanOrEqual(-2)
      expect(tiltOf(id)).toBeLessThanOrEqual(2)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('the dossier, as source — house rules and the old contract', () => {
  it('has no tab between the two halves any more, and no presence in the bag', () => {
    expect(CARD).not.toMatch(/tabBag|tabMe|LeafTab/)
    for (const { name, text } of SOURCES) {
      if (/^(Bag|CurrentCarry|WardrobeRail|MemoryDrawer|MoneyAndSubscriptions|LifeBagSheet)/.test(name)) {
        expect(text, name).not.toContain('presenceReading')
        expect(text, name).not.toContain('personalStoryReading')
      }
    }
  })

  it('keeps "לסגור" — the LIFE harness closes the bedroom bag by that label', () => {
    const shell = SOURCES.find((row) => row.name === 'LifeSheetShell.tsx')!.text
    expect(shell).toContain("t('life.profile.close')")
    expect(MESSAGES['life.profile.close']).toBe('לסגור')
    const harness = readFileSync(join(ROOT, 'scripts/life/playthrough.mjs'), 'utf8')
    expect(harness).toContain("hasText: 'לסגור'")
  })

  it('every dialog sits above the tab bar, and nothing is laid out by chance', () => {
    for (const { name, text } of SOURCES) {
      for (const match of text.matchAll(/<[a-z]+[^>]*role="dialog"[^>]*>/g)) expect(match[0], name).toMatch(/z-\[6\d\]/)
      expect(text, name).not.toContain('Math.random(')
      expect(/\b(left|right)-[\d[]|\b(ml|mr|pl|pr)-[\d[]|rounded-/.test(text), name).toBe(false)
    }
    expect(readFileSync(join(DIR, 'personal.module.css'), 'utf8')).toContain('prefers-reduced-motion: reduce')
  })

  it('opens as two destinations from the HUD and from the menu', () => {
    const stage = readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8')
    expect(stage).toContain('data-life="me-open"')
    expect(stage).toContain('data-life="profile-open"')
    const menu = readFileSync(join(ROOT, 'components/life/LifeMenu.tsx'), 'utf8')
    expect(menu).toContain('data-life="menu-me"')
    const sheets = readFileSync(join(ROOT, 'app/life/stage/useLifeSheets.ts'), 'utf8')
    expect(sheets).toContain('openMe')
    expect(sheets).toContain('openBag')
  })

  it('every key in its catalogue is read by something', () => {
    const everything = [
      ...SOURCES.map((row) => row.text),
      CARD,
      readFileSync(join(ROOT, 'lib/life/personal.ts'), 'utf8'),
      readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8'),
      readFileSync(join(ROOT, 'components/life/LifeMenu.tsx'), 'utf8'),
    ].join('\n')
    const unread = Object.keys(heStage).filter((key) => !everything.includes(`'${key}'`))
    expect(unread).toEqual([])
  })
})

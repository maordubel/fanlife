import type { CraftOutput } from '../game/craft/types'
import { chapterFor } from './content/chapters'
import { callbackFlag, outputFlag } from './content/performedMissions'
import { wearsCrafted } from './shirts'
import { flagOn, type KeptOutput, type LifeState, type LocationId } from './types'

/**
 * שכבת ה-callback — DO → REMEMBER → SEE AGAIN (MASTER §39–§40, PERFORMED §20–§21, §47).
 *
 * Not a background process: metadata on the mission (`callbackFlags: ['banner:return:2000']`),
 * a flag raised when the thing was kept (`own:cb:banner:return:2000`), and this one resolver
 * that reads flags and outputs and says what is DUE in the chapter the player is standing in.
 * Everything a callback needs to draw is in `state.outputs` — a normalised `CraftOutput`, never
 * a picture — so the stand can hang the banner painted years earlier at any size.
 *
 * Grammar of a callback flag: `<kind>:<verb>:<from>`.
 *   kind  — what is seen again (`banner`, `shirt`, `confetti`, `stencil`)
 *   verb  — how (`return` in the stand, `wear` on him, `ofir` on a friend, `hall` in the hall)
 *   from  — WHEN: a four-digit year the callback is due from (inclusive), `same` for the chapter
 *           it was made in, `next` for any later chapter
 */

export type CallbackKind = 'banner' | 'shirt' | 'confetti' | 'stencil'

export type DueCallback = {
  /** the flag it was owed under — `banner:return:2000` */
  flag: string
  kind: CallbackKind
  verb: string
  /** the world key of the thing to show, and the thing itself */
  outputId: string
  output: KeptOutput
  /** the rooms of this chapter the world shows it in */
  rooms: readonly LocationId[]
}

/** kind + verb → where it is seen (`stand:banner` hangs over the terrace; confetti falls in the hall it was cut for) */
const WHERE: Record<string, { outputId: string; rooms: readonly LocationId[] }> = {
  'banner:return': { outputId: 'stand:banner', rooms: ['bloomfield-inside'] },
  'confetti:hall': { outputId: 'hall:confetti', rooms: ['ussishkin-hall'] },
  'shirt:wear': { outputId: 'pugi:fan-shirt', rooms: [] },
  'shirt:ofir': { outputId: 'ofir:fan-shirt', rooms: ['street'] },
  'stencil:wall': { outputId: 'wall:stencil', rooms: ['street'] },
}

const KINDS: ReadonlySet<string> = new Set(['banner', 'shirt', 'confetti', 'stencil'])

export function parseCallbackFlag(flag: string): { kind: CallbackKind; verb: string; from: string } | null {
  const [kind, verb, from] = flag.split(':')
  if (!kind || !verb || !from || !KINDS.has(kind)) return null
  return { kind: kind as CallbackKind, verb, from }
}

const yearOf = (chapter: string, fallback: number) => chapterFor(chapter)?.year ?? fallback

/** is a callback owed `from` due in `chapter`, given the chapter the thing was made in */
export function dueIn(from: string, chapter: string, madeIn: string, year: number): boolean {
  if (from === 'same') return chapter === madeIn
  if (from === 'next') return chapter !== madeIn && yearOf(chapter, year) >= yearOf(madeIn, year)
  const since = Number(from)
  return Number.isFinite(since) && chapter !== madeIn && yearOf(chapter, year) >= since
}

/**
 * מה חוזר בפרק הזה — every callback owed whose thing exists and whose time has come. Pure over
 * the state; the same save gives the same list, so a stand that hung a banner keeps hanging it.
 */
export function callbacksForChapter(state: LifeState, chapter: string = state.chapter): DueCallback[] {
  const out: DueCallback[] = []
  const prefix = callbackFlag('')
  for (const flag of Object.keys(state.flags)) {
    if (!flag.startsWith(prefix) || !flagOn(state, flag)) continue
    const owed = flag.slice(prefix.length)
    const parsed = parseCallbackFlag(owed)
    if (!parsed) continue
    const where = WHERE[`${parsed.kind}:${parsed.verb}`]
    if (!where) continue
    const output = (state.outputs ?? {})[where.outputId]
    if (!output) continue
    if (!dueIn(parsed.from, chapter, output.chapter, state.year)) continue
    out.push({ flag: owed, kind: parsed.kind, verb: parsed.verb, outputId: where.outputId, output, rooms: where.rooms })
  }
  return out
}

/** the callbacks due in one room of this chapter — what an overlay asks */
export function callbacksAt(state: LifeState, room: LocationId, chapter: string = state.chapter): DueCallback[] {
  return callbacksForChapter(state, chapter).filter((row) => row.rooms.includes(room))
}

/** the banner hanging over the stand right now, or null — the one world callback shipped end to end */
export function standBanner(state: LifeState, chapter: string = state.chapter): KeptOutput | null {
  return callbacksAt(state, 'bloomfield-inside', chapter).find((row) => row.kind === 'banner')?.output ?? null
}

// --------------------------------------------------------------------- confetti tier ---

export type ConfettiTier = 'none' | 'light' | 'full'

/**
 * קונפטי — a visual tier, never a simulation (PERFORMED §21). Read off the measure the bench
 * reported for the confetti cut in THIS chapter: nothing cut, nothing falls.
 */
export function confettiTier(state: LifeState, chapter: string = state.chapter): ConfettiTier {
  const due = callbacksForChapter(state, chapter).find((row) => row.kind === 'confetti')
  if (!due) return 'none'
  return due.output.measure >= 0.7 ? 'full' : 'light'
}

// --------------------------------------------------------------------- the wardrobe ---

export type CraftedGarment = {
  /** `pugi:fan-shirt` */
  outputId: string
  data: CraftOutput
  /** he has it on (the after-conversation's "ללבוש אותה עכשיו") */
  worn: boolean
  /** the chapter it was made in, for the shelf's line */
  madeIn: string
}

/** the shirts he made himself, for the bag's rail beside the ones he bought */
export function craftedWardrobe(state: LifeState): CraftedGarment[] {
  const outputs = state.outputs ?? {}
  const out: CraftedGarment[] = []
  const own = outputs['pugi:fan-shirt']
  if (own && own.data.surface === 'shirt' && flagOn(state, outputFlag('pugi:fan-shirt'))) {
    out.push({ outputId: 'pugi:fan-shirt', data: own.data, worn: wearsCrafted(state), madeIn: own.chapter })
  }
  return out
}

/** everything kept, newest first — the bag's "what I made" and the callbacks' source */
export function keptOutputs(state: LifeState): KeptOutput[] {
  return Object.values(state.outputs ?? {}).sort((a, b) => b.year - a.year)
}

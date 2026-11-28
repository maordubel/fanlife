/**
 * LIFE · the hood — THE MOMENT (the owner's screenplay, 28.11.2026: "years later somebody will remember which of them
 * you did").
 *
 * At the last line of a chapter the boy does one small thing with his own hands, one of two, and neither is the right
 * one: he holds the radio to his father's ear, or he runs to the window and shouts with the street. The story does not
 * score it. It REMEMBERS it: the aftermath card says what he did, and a chapter later somebody else has heard about it.
 * A player who simply walks away has done neither, and nothing is said of it (the quiet way is a way).
 *
 * Data only, club-agnostic like every story file: no club, no date, no score, no real person. Words in `words.ts`:
 *   story.moment.<mission>.<id>          the choice, as a gesture
 *   story.moment.<mission>.<id>.say      what is said back
 *   story.moment.<mission>.<id>.after    the line on the aftermath card
 *   story.moment.<mission>.<id>.later    what somebody remembers, on the card of the chapter in `echo`
 */
import type {StoryState} from './types'

export type Moment = {mission: string; /** the step's line the moment follows (the chapter's last talk) */ line: string; ids: readonly [string, string]; /** the later chapter whose card remembers it */ echo: string}

export const MOMENTS: readonly Moment[] = [
  // the radio through the wall: who hears it first, and from whom
  {mission: 'first-noise', line: 'story.s.first-noise.dad', ids: ['radio', 'window'], echo: 'six-short'},
  // the first shirt: worn at once over everything, or carried home folded to be shown
  {mission: 'six-short', line: 'story.s.six-short.shirt', ids: ['wear', 'carry'], echo: 'the-way-in'},
]

export const momentAt = (line: string): Moment | null => MOMENTS.find(m => m.line === line) ?? null
export const momentFlag = (mission: string) => `moment:${mission}`
/** what he did at a chapter's moment, if he did either thing */
export function momentOf(state: Pick<StoryState, 'flags'>, mission: string): string | null {
  const m = MOMENTS.find(x => x.mission === mission), v = state.flags[momentFlag(mission)]
  return m && typeof v === 'string' && (m.ids as readonly string[]).includes(v) ? v : null
}
/** the moment a chapter's card remembers: `{mission, id}` of the earlier chapter whose `echo` it is, when he did one */
export function echoFor(state: Pick<StoryState, 'flags'>, chapter: string | null): {mission: string; id: string} | null {
  if (!chapter) return null
  for (const m of MOMENTS) if (m.echo === chapter) { const id = momentOf(state, m.mission); if (id) return {mission: m.mission, id} }
  return null
}
/** the story effect a moment's choice carries, and reading it back */
export const momentEffect = (mission: string, id: string) => `story:moment:${mission}:${id}` as const

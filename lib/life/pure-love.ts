import type { LifeEvent } from './events'
import type { CharacterId, LifeState, RedHeartId, RelationshipState } from './types'

/**
 * PURE HAPOEL LOVE — the resolver, built now, answered in 2026.
 *
 * The whole game ends on one line. It cannot be a number that went up, because a number
 * that goes up is a number you can grind, and something you can grind is not love. So
 * the concept has an OWNER: this module, and nothing else in the codebase may state it.
 * No content file sets it, no scene adds to it, no dialogue effect touches it. It is
 * derived, every time it is asked for, from the life that was actually lived.
 *
 * At eight years old the honest answer is not a percentage and this returns none. It
 * returns a STATE — a short qualitative reading of a child who has just started — plus
 * the evidence it was read from, so the 2026 resolution has something to stand on and so
 * the profile screen can show a person rather than a bar.
 *
 * The architecture that matters is the signature. When the last chapter needs to say
 * `PURE HAPOEL LOVE = 100%`, it asks this function, and this function will be able to
 * answer because it has always been given the whole life: the state, the log, the
 * memories and the people.
 */

export type PureLoveStage = 'unformed' | 'inherited' | 'chosen' | 'carried' | 'returned' | 'whole'

export type PureLoveResolution = {
  stage: PureLoveStage
  /** the sentence the game is willing to say today */
  readingHe: string
  /** never a score the player can chase; null until a life is long enough to answer */
  percent: number | null
  /** what the reading was made of, in the player's language */
  evidenceHe: string[]
  /** the dimensions that are actually carrying this life so far */
  leading: RedHeartId[]
}

const NEVER_SET_DIRECTLY = true as const

/**
 * The one place the club's dimensions are weighed against each other. Deliberately not
 * an average: `familyTradition` is where everybody starts and is therefore worth least,
 * and `loyaltyReturn` — what you gave back — is worth most and is unreachable at eight.
 */
const WEIGHT: Record<RedHeartId, number> = {
  footballLove: 1.0,
  basketballLove: 0.5,
  troubleAffinity: 0.3,
  professionalFootball: 0.4,
  community: 1.1,
  terraceCulture: 0.9,
  travelDrive: 0.8,
  historyMemory: 0.9,
  familyTradition: 0.4,
  loyaltyReturn: 1.6,
}

function leadingDimensions(state: LifeState): RedHeartId[] {
  return (Object.keys(WEIGHT) as RedHeartId[])
    .map((key) => ({ key, score: state.redHeart[key] * WEIGHT[key] }))
    .filter((entry) => entry.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.key)
}

/**
 * ירשתי, או בחרתי.
 *
 * The hinge of Stage A, and the only distinction the chapter is old enough to draw. A
 * child who was taken to the ground has inherited it. A child who worked out where it
 * was and went is something else, and the game is allowed to say so.
 */
function stageFor(state: LifeState, events: readonly LifeEvent[]): PureLoveStage {
  const wentAlone = state.flags['went:alone'] === true
  const gotIn = state.attendedAnchors.length > 0
  const chose = events.some((event) => event.t === 'opportunity.accepted')

  if (gotIn && wentAlone) return 'chosen'
  if (gotIn) return 'inherited'
  if (chose || state.redHeart.footballLove > 40) return 'inherited'
  return 'unformed'
}

const READING: Record<PureLoveStage, string> = {
  unformed: 'עוד לא שלך. זה של אבא, ואתה בסביבה.',
  inherited: 'קיבלת את זה מהבית. עוד לא בחרת בזה.',
  chosen: 'הלכת לבד. מכאן זה כבר שלך.',
  carried: 'אתה נושא את זה גם כשאף אחד לא מסתכל.',
  returned: 'החזרת משהו למקום שנתן לך.',
  whole: 'הכול.',
}

export function resolvePureLove(
  state: LifeState,
  events: readonly LifeEvent[] = [],
  memories: readonly { id: string }[] = state.memories,
  relationships: Record<CharacterId, RelationshipState> = state.relationships,
): PureLoveResolution {
  const stage = stageFor(state, events)
  const evidenceHe: string[] = []

  if (state.flags['went:alone'] === true) evidenceHe.push('הגעת לבד')
  if (state.attendedAnchors.length > 0) evidenceHe.push('היית שם')
  if (state.missedAnchors.length > 0 && state.attendedAnchors.length === 0) evidenceHe.push('פספסת את זה')
  if (memories.length > 0) evidenceHe.push('שמרת משהו')
  if ((relationships['kobi']?.sharedHistory ?? 0) > 60) evidenceHe.push('זה עבר דרך אבא')
  if ((relationships['ofir']?.bond ?? 0) > 45) evidenceHe.push('לא היית לבד בשכונה')
  if (state.redHeart.terraceCulture > 25) evidenceHe.push('היציע נכנס לך לראש')
  if (state.redHeart.basketballLove > 25) evidenceHe.push('לא רק כדורגל')

  return {
    stage,
    readingHe: READING[stage],
    /**
     * Null, and it stays null for decades. A life that has not been lived cannot be
     * scored, and a number here would immediately become the thing players optimise.
     */
    percent: NEVER_SET_DIRECTLY ? null : null,
    evidenceHe,
    leading: leadingDimensions(state),
  }
}

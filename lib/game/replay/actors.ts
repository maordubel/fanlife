/**
 * מי נגע — the three kinds of actor a reported touch can have, and the curated reading.
 *
 * `goals.json` writes every touch with an `actorHe`, and until now the gate assumed that
 * every one of them was a Hapoel player from that season. Three are not:
 *
 *   · **`הכדור`** — "הכדור עבר את הגנת בנפיקה". The report names no passer, so the ball is
 *     written as the subject. It is an UNNAMED actor: there is a touch, and nobody to
 *     credit or blame for choosing its man.
 *   · **`השוער הרוש`**, **`השוער`** — the other side's keeper parrying the shot the rebound
 *     came from. Real, named in the report, and an OPPONENT.
 *
 * Offering the first two in a pool whose note said "these are the season's squad" was a
 * small lie of exactly the kind rule 11 forbids: it put the ball and a Beitar keeper in a
 * Hapoel dressing room. Now the pool drops unnamed actors, marks opponents as opponents,
 * and the judge gives an unnamed touch NO player component at all (its weight goes to the
 * rest of the pair, the same pattern `routeShape` uses for a direction nobody stated).
 *
 * The reading is curated here, per touch and by name, rather than guessed from the words:
 * "starts with השוער" would be a lexicon, and rule 74 is what a lexicon over Hebrew prose
 * becomes. A record may also carry `actorKind` itself (the Match Master adds it with a
 * `playerId`); when it does, the record wins and `tests/replay.test.ts` asserts the two
 * never disagree.
 */

export type ActorKind = 'player' | 'opponent' | 'unnamed'

const KINDS: readonly ActorKind[] = ['player', 'opponent', 'unnamed']

/** `<goalId>#<step>` → kind, for every touch whose actor is not a Hapoel player. */
export const CURATED_ACTORS: Readonly<Record<string, { actorHe: string; kind: Exclude<ActorKind, 'player'> }>> = {
  'benfica-2010-zahavi-90-2#1': { actorHe: 'הכדור', kind: 'unnamed' },
  'championship-2010-zahavi-92#2': { actorHe: 'השוער הרוש', kind: 'opponent' },
  'cupfinal-2010-vermouth-25#2': { actorHe: 'השוער', kind: 'opponent' },
}

export function isActorKind(value: unknown): value is ActorKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

export function curatedKind(goalId: string, step: number): ActorKind {
  return CURATED_ACTORS[`${goalId}#${step}`]?.kind ?? 'player'
}

/** The record's own `actorKind` when it states one, the curated reading otherwise. */
export function actorKindOf(goalId: string, step: { step: number; actorKind?: unknown }): ActorKind {
  return isActorKind(step.actorKind) ? step.actorKind : curatedKind(goalId, step.step)
}

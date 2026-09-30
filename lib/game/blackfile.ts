import 'server-only'

import { createHash } from 'node:crypto'

import { cycleSeed, rotate } from '@/lib/rotation/deck'
import { archive, rng, shuffle } from './archive'

/**
 * התיק השחור — gate 11.
 *
 * Maor asked for a "hatred game", ranking the figures Hapoel supporters resent. The
 * research pass changed what that game could honestly be, and the change made it
 * better:
 *
 *   · Three of the six names he listed do not belong here. Ofer Yanai and Shaul
 *     Eisenberg have no documented connection to the FOOTBALL club — both are
 *     basketball, and rule 14 keeps the sports apart. Shimon Gershon never played for
 *     Maccabi at all: he left for Beitar Jerusalem, and he retired at 33 on medical
 *     grounds, which is not terrace material under any framing.
 *   · Eran Zahavi did not move Hapoel → Maccabi. He left for Palermo in 2011 and
 *     signed for Maccabi from Palermo nineteen months later.
 *
 * So the game is not "rank these people by how much you hate them" — a ranking of
 * feeling cannot be graded, and a ranking of PEOPLE invites the app to publish
 * judgements about named individuals that no source supports. It is
 * **"מי חצה את הכביש"**: a fast binary on documented transfers, where the traps are
 * exactly the two beliefs the record contradicts. It is more fun than a hate-ranking
 * because the player is wrong about things they were sure of, and it leaves them
 * knowing something true.
 *
 * Every card carries its own source, and the reveal is the story.
 */

export type Verdict = 'crossed' | 'did_not'

/**
 * מזהה ציבורי — the same device `lib/game/timeline.ts` uses, and gate 11 needed it more.
 *
 * Until 17.9.2026 this file shipped TWO answers to the client and neither was earned:
 *
 * · **`kind` WAS the answer.** `judge()` derives truth as `kind === 'crossing'`, and
 *   `kind` travelled on every card. Anybody reading the payload knew every verdict
 *   before answering. Nothing in `BlackFile.tsx` ever used the field.
 * · **The slugs carry their years.** `liquidation-2017`, `safra-2024`, `benhaim-2013` —
 *   and the second half of the round is "which came first". The dates were in the DOM.
 *
 * Rule 4 is absolute about this and `timeline.ts` had already solved it: a sha256 of the
 * row's own key is unique, stable across a deal and a grade, and says nothing. The slug
 * never leaves the server now; `byId()` is the one place it comes back.
 */
function publicId(slug: string): string {
  return createHash('sha256').update(`grievance:${slug}`).digest('hex').slice(0, 12)
}

/**
 * The id of a known row, for the archive side of the wall — the suite names the two myth
 * rows by slug because that is what the ARCHIVE calls them, and it should not have to
 * hash them by hand to say so. It is exported from a `server-only` module, so nothing a
 * browser loads can reach it.
 */
export function cardId(slug: string): string {
  return publicId(slug)
}

function byId(id: string) {
  return archive.grievances.find((row) => publicId(row.slug) === id) ?? null
}

export type FileCard = {
  /** opaque — see `publicId`. The slug and the kind stay on the server. */
  id: string
  /** the name on the card, or the headline for a dated event */
  subjectHe: string
  /** what the player is being asked to judge */
  promptHe: string
}

export type CardVerdict = {
  id: string
  correct: boolean
  answer: Verdict
  /**
   * ONE RED WORLD §20 — every black-file entry says who, what happened, when, its source
   * and why it is in the file. `whoHe` is the record's own name; `why` is the row's KIND
   * (a crossing, a myth the terrace believes, a dated event) — the reason the row exists,
   * never a sentence invented about the man. Sent after the answer, so it earns nothing.
   */
  whoHe: string | null
  why: 'crossing' | 'myth' | 'event'
  titleHe: string
  bodyHe: string
  toClubHe: string | null
  feeEur: number | null
  happenedOn: string | null
  sourceTitle: string
  sourceUrl: string | null
}

/**
 * There used to be a `ROUND_SIZE = 8` here. The round is `transferCards()` (5 rows:
 * `crossing` + `myth`) followed by `dealPairs()` (4 pairs, out of 9 dated `event`
 * rows) — **nine** questions, not eight, and the archive can grow either half at any
 * time. A declared constant cannot track that: the header printed "8 מתוך 8" while the
 * ninth question was still being asked, and the Done screen could print "9 / 8" — a
 * number that was not true (rule 11/15). There is no replacement constant. The caller
 * deals `dealFile(seed)` and `dealPairs(seed)` once and sums their real lengths — see
 * `app/derby/file/page.tsx` — so the total on screen is always what was actually dealt.
 */

/** Only the cards that can be judged crossed / did-not — the transfer questions. */
function transferCards() {
  return archive.grievances.filter((row) => row.kind === 'crossing' || row.kind === 'myth')
}

/** The dated events, which drive the second half of the round: what came first. */
function datedEvents() {
  return archive.grievances.filter(
    (row) => row.kind === 'event' && row.happenedOn !== null,
  )
}

export function dealFile(seed: number, cursor = 0): FileCard[] {
  // Every transfer card is dealt — there are five — so the cursor only changes the
  // ORDER they arrive in. That is the honest thing for it to do here: this half of the
  // round is the whole file, not a sample of it.
  const random = rng(cursor === 0 ? seed : cycleSeed(seed, cursor))
  return shuffle([...transferCards()], random).map((row) => ({
    id: publicId(row.slug),
    subjectHe: row.personNameHe ?? row.titleHe,
    promptHe: row.titleHe,
  }))
}

/** Graded on the server. A `myth` row is the card whose true answer is "did not". */
export function judge(id: string, answer: Verdict): CardVerdict | null {
  const row = byId(id)
  if (!row) return null
  const truth: Verdict = row.kind === 'crossing' ? 'crossed' : 'did_not'
  return {
    id,
    correct: answer === truth,
    answer: truth,
    whoHe: row.personNameHe ?? null,
    why: row.kind,
    titleHe: row.titleHe,
    bodyHe: row.bodyHe,
    toClubHe: row.toClubHe ?? null,
    feeEur: row.feeEur ?? null,
    happenedOn: row.happenedOn,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
  }
}

/* ------------------------------------------------------------- what came first */

export type PairCard = {
  /** opaque, and derived from both halves so a pair cannot be re-identified from one */
  id: string
  aId: string
  bId: string
  aTitleHe: string
  bTitleHe: string
}

/**
 * The second half: two dated events, which came first. Ordering the whole decade at
 * once is a memory test; two at a time is a judgement, and it moves fast enough to
 * keep a round alive.
 */
export function dealPairs(seed: number, count = 4, cursor = 0): PairCard[] {
  const base = seed * 7 + 3
  const events = rotate(
    shuffle([...datedEvents()], rng(cursor === 0 ? base : cycleSeed(base, cursor))),
    cursor * count * 2,
  )
  const pairs: PairCard[] = []
  for (let index = 0; index + 1 < events.length && pairs.length < count; index += 2) {
    const a = events[index]
    const b = events[index + 1]
    if (!a || !b) continue
    pairs.push({
      id: publicId(`${a.slug}|${b.slug}`),
      aId: publicId(a.slug),
      bId: publicId(b.slug),
      aTitleHe: a.titleHe,
      bTitleHe: b.titleHe,
    })
  }
  return pairs
}

export type PairVerdict = {
  correct: boolean
  firstId: string
  aDate: string | null
  bDate: string | null
  aBodyHe: string
  bBodyHe: string
}

/**
 * The pair used to be identified by `aSlug|bSlug` and graded on the slug the player
 * picked — so both halves of the question travelled as readable text with the years in
 * them. It takes the two opaque card ids instead; the composite `PairCard.id` is for
 * React keys and is never parsed.
 */
export function judgePair(aId: string, bId: string, pickedId: string): PairVerdict | null {
  const a = byId(aId)
  const b = byId(bId)
  if (!a || !b || !a.happenedOn || !b.happenedOn) return null
  const first = a.happenedOn <= b.happenedOn ? a : b
  const firstId = first === a ? aId : bId
  return {
    correct: pickedId === firstId,
    firstId,
    aDate: a.happenedOn,
    bDate: b.happenedOn,
    aBodyHe: a.bodyHe,
    bBodyHe: b.bodyHe,
  }
}

export function fileSize(): number {
  return transferCards().length + datedEvents().length
}

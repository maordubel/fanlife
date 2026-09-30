'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'

import { advanceRotation, rotationFor } from '@/lib/profile/store'
import { mintSeed, withRound } from '@/lib/rotation/deck'

/**
 * להיכנס · שוב — and this time something else.
 *
 * Every "again" button in the app used to be `href={`/x?seed=${seed + 1}`}`, and two of
 * them were not even that: trivia's went to the topic picker, which reads no seed at
 * all, so pressing שוב replayed the identical twelve questions; the black file's was a
 * hardcoded `?seed=12`, so every replay after the first was the same round for ever.
 *
 * `seed + 1` was not much better than either. It walks a fixed cycle rather than
 * reshuffling (see the note on `rng()` in `lib/game/lineup.ts`), and it has no memory:
 * three plays in, it cannot know you have already seen those questions.
 *
 * So this button asks the DEVICE where it is in that gate's deck and steps one slice
 * forward — which is the only place that knowledge can live, because the archive is
 * server-side and the person is not signed in. The cursor is committed on the click,
 * not on render: a button that spends a round just by being drawn would burn the deck
 * of anybody who reaches a result screen and walks away.
 *
 * Before the effect runs — a crawler, a JavaScript-off browser, the first paint — the
 * link is the bare route, and `lib/rotation/round.ts` mints a fresh seed server-side.
 * Both paths deal something new; only the device path can also promise it is something
 * you have not seen.
 */
export function PlayLink({
  gate,
  href,
  className,
  ariaLabel,
  children,
}: {
  /**
   * The id this gate's deck is kept under. Usually the route — but trivia keeps one
   * deck PER TOPIC (`/trivia/europe`), because five topics sharing a cursor would mean
   * playing Europe advanced your place in the kit questions.
   */
  gate: string
  /** where the button goes, if that is not the gate id itself */
  href?: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const route = href ?? gate
  const [next, setNext] = useState(route)

  useEffect(() => {
    // The href is the device's CURRENT place in the deck; the click is what moves it
    // on. That ordering is what makes a first entry deal slice 0 rather than skipping
    // it, and what makes "שוב" on a result screen deal the slice after the one just
    // played — the entry that started this round already advanced the cursor.
    const rotation = rotationFor(gate, mintSeed)
    setNext(withRound(route, rotation.seed, rotation.cursor))
  }, [gate, route])

  return (
    <Link
      href={next}
      aria-label={ariaLabel}
      onClick={() => advanceRotation(gate, mintSeed)}
      className={className}
    >
      {children}
    </Link>
  )
}

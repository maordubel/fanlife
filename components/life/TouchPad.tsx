/**
 * מצבה — retired on 2.9.2026, when the control deck replaced it.
 *
 * TouchPad was a thumb zone with no body: an invisible half of the screen that steered,
 * and a floating red circle. It worked, and nobody found it. The playtest note was one
 * sentence — "לא ברור איזה מקש מפעיל" — and the answer to it is a console you can see
 * before you touch it, on the phone and on the keyboard alike:
 * `components/life/ControlDeck.tsx`.
 *
 * It stays as an inert tombstone rather than a deletion because deltas reach this repo
 * through GitHub's web upload, which adds and overwrites but never removes (rule 26).
 * A retired file that still imported something would keep failing the deploy long after
 * the local tree was clean — so this one imports nothing, and renders nothing.
 */

export const RETIRED_ON = '2026-09-02'
export const REPLACED_BY = 'components/life/ControlDeck.tsx'

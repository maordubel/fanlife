/**
 * מצבה — retired on 2.9.2026, when the control deck took the label.
 *
 * Prompt was the chip that named what the button would do — `דבר עם קובי`, `לך לרחוב`.
 * The words were right and the place was wrong: it floated at the foot of the picture,
 * a screen away from the button it described, so the two never read as one control. The
 * same sentence now sits in the middle of the deck, between the stick and the button,
 * and carries the same `data-life="prompt"` handle for the harness:
 * `components/life/ControlDeck.tsx`.
 *
 * It stays as an inert tombstone rather than a deletion because deltas reach this repo
 * through GitHub's web upload, which adds and overwrites but never removes (rule 26).
 */

export const RETIRED_ON = '2026-09-02'
export const REPLACED_BY = 'components/life/ControlDeck.tsx'

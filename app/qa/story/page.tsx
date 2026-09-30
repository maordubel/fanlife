import { notFound } from 'next/navigation'

import { qaAllowed } from '@/lib/qa'

import { StoryProof } from './StoryProof'

/**
 * מתקן הבדיקה של הסטורי — the harness the overlap check drives.
 *
 * Three times in a row a card shipped with text through text, and every time the reason
 * was the same: the only check was me looking at a screenshot of a SHORT name. The cards
 * now report every box of ink they lay down (`lastInkBoxes`), which turns "does it
 * overlap" into arithmetic — but arithmetic needs somewhere to run, and `drawStory`
 * needs a real canvas with the real faces loaded, so it has to run in a browser.
 *
 * This page is that browser. It draws every template with the WORST case in the archive
 * — the longest name, the longest question, a full eight-row ballot — and publishes the
 * boxes on `window`. `scripts/brand/story-overlap.mjs` reads them and fails loudly.
 *
 * It is `notFound()` in production. A QA harness on the live site is a page a supporter
 * can land on, and this one renders eight cards' worth of canvas for no reason.
 */
export default function StoryQaPage() {
  if (!qaAllowed()) notFound()
  return <StoryProof />
}

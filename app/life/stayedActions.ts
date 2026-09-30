'use server'

import { cleanChapters, stayedWithMe } from '@/lib/life/livedPool'
import { archiveHref } from '@/lib/links'

export type StayedRow = { id: string; nameHe: string; href: string | null }

/**
 * ONE RED WORLD §10 — "מה נשאר איתי": the men of the supporter's XI who belong to a LIFE
 * chapter this device finished. The client sends its finished chapters (from the save) and
 * the refs on its own XI sheet (`worker.xi.v1`); the answer is a subset of names the
 * supporter already chose, so it reveals nothing about a chapter ahead of him. Each name
 * opens its archive card when the Entity Graph knows it — the sourced side, never the story.
 */
export async function stayedWithMeAction(chapters: string[], refs: string[]): Promise<StayedRow[]> {
  const done = cleanChapters(chapters)
  if (done.length === 0 || !Array.isArray(refs)) return []
  return stayedWithMe(done, refs).map((p) => ({ id: p.id, nameHe: p.nameHe, href: archiveHref(p.id) }))
}

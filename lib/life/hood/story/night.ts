/**
 * LIFE · the hood — the night under a chapter. The Fitter decides, never this file.
 *
 * A chapter stands on a real archive night only when the Fitter's row for its template is READY: then the row is
 * handed on exactly as approved (title, day, sources) and the chapter may print its date and its score. In every
 * other state the chapter is personal — the same mission, no date, no score. When the supporter's birth year is
 * known, a night also has to fall in the years the chapter is lived (its age, a year either side); a great night
 * from another decade is not moved into a childhood.
 */
import {readArchive, type ClubArchiveView} from '@/lib/life/rush/archive'
import {fitTemplate, type Fit} from '@/lib/life/rush/fit'
import {templateById} from '@/lib/life/rush/templates'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {CHILDHOOD} from './childhood'
import type {Mission} from './types'

/** the Fitter's rows: the club's whole list (found by template), or one row per chapter (`chapterFits`, by mission id) */
export type ChapterFits = readonly Fit[] | Readonly<Record<string, Fit>>
/** a night belongs to a chapter when it falls at the chapter's age, a year either side */
export const YEARS_EITHER_SIDE = 1

export type ChapterNight = {dated: true; anchor: ArchiveRef; template: string} | {dated: false; anchor: null; template: string | null; why: 'no-template' | 'not-ready' | 'other-years'}

export function nightFor(m: Mission, fits: ChapterFits, birthYear: number | null = null): ChapterNight {
  if (!m.template) return {dated: false, anchor: null, template: null, why: 'no-template'}
  const fit = Array.isArray(fits) ? (fits as readonly Fit[]).find(f => f.template === m.template) : (fits as Readonly<Record<string, Fit>>)[m.id]
  if (!fit || fit.state !== 'READY' || !fit.anchor) return {dated: false, anchor: null, template: m.template, why: 'not-ready'}
  if (birthYear !== null && Math.abs(fit.anchor.year - birthYear - m.age) > YEARS_EITHER_SIDE) return {dated: false, anchor: null, template: m.template, why: 'other-years'}
  return {dated: true, anchor: fit.anchor, template: m.template}
}

/**
 * The Fitter asked chapter by chapter: each chapter's template is fitted to the club's rows of the years that
 * chapter is lived, so a childhood stands on the nights of that childhood, and no two chapters on the same night.
 * With no birth year on record the life has no calendar: every chapter stays personal (rules 137, 139).
 */
export function chapterFits(view: ClubArchiveView, birthYear: number | null, missions: readonly Mission[] = CHILDHOOD): Record<string, Fit> {
  const out: Record<string, Fit> = {}
  if (birthYear === null) return out
  const taken = new Set<string>()
  for (const m of missions) {
    const t = m.template ? templateById(m.template) : null
    if (!t) continue
    const at = birthYear + m.age
    // a night another chapter already stands on is not offered again: the Fitter only prefers a fresh one, the story requires it
    const fit = fitTemplate(readArchive({...view, anchors: view.anchors.filter(a => Math.abs(a.year - at) <= YEARS_EITHER_SIDE && !taken.has(a.factId))}), t, taken)
    if (fit.anchor) taken.add(fit.anchor.factId)
    out[m.id] = fit
  }
  return out
}

/**
 * The nights a life stands on, ready for the hood: mission id → the archive row, exactly as approved, for every chapter
 * the Fitter dated. A chapter that is not here is personal (no date, no score). Serialisable: the page hands it to the game.
 */
export function storyNights(view: ClubArchiveView, birthYear: number | null, missions: readonly Mission[] = CHILDHOOD): Record<string, ArchiveRef> {
  const fits = chapterFits(view, birthYear, missions)
  const out: Record<string, ArchiveRef> = {}
  for (const m of missions) { const n = nightFor(m, fits, birthYear); if (n.dated) out[m.id] = n.anchor }
  return out
}

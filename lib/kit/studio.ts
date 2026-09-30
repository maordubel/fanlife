import type { KitSpec } from './spec'

export type KitBriefId = 'free' | 'derby' | 'europe' | 'memory2010' | 'supporters'

/**
 * The studio's briefs. Their words live in the catalogue (`kits.brief.<id>.title|body`, rule 10);
 * this list is only the order and the ids the scoring below knows how to read.
 */
export type KitBrief = { id: KitBriefId }
export const KIT_BRIEFS: KitBrief[] = [{ id: 'free' }, { id: 'derby' }, { id: 'europe' }, { id: 'memory2010' }, { id: 'supporters' }]

/**
 * What the studio measures is the BRIEF, not taste (brief §16). "Brief Fit" and "DNA Fit" are
 * the two numbers it prints; the invented supporter lines that used to sit under them ("הייתי
 * קונה") are gone — nobody said them, and a screen may only say a supporter thinks something when
 * a supporter did.
 */
export type StudioMetrics = { identity: number; briefFit: number; originality: number; coherence: number; dnaUse: number; overall: number }
const TRAITS: Array<keyof KitSpec> = ['base','patternInk','pattern','collar','collarInk','sleeves','sleeveInk','makerHe','sponsorHe','crestKey','nameset']
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const differences = (a: KitSpec, b: KitSpec) => TRAITS.filter((key) => a[key] !== b[key]).length
const likeness = (a: KitSpec, b: KitSpec) => TRAITS.length - differences(a, b)
const uniqueColours = (spec: KitSpec) => new Set([spec.base, spec.patternInk, spec.sleeveInk, spec.collarInk]).size
const redDetail = (spec: KitSpec) => [spec.base, spec.patternInk, spec.sleeveInk, spec.collarInk].some((colour) => colour === 'red' || colour === 'deep')

export function scoreStudioDesign(spec: KitSpec, briefId: KitBriefId, dna: KitSpec[]): StudioMetrics {
  let identity = 30
  if (spec.base === 'red' || spec.base === 'deep') identity += 25
  if (redDetail(spec)) identity += 12
  if (spec.crestKey) identity += 23 // the badge is now a first-class design decision
  if (spec.sponsorHe === 'HAPOEL' || spec.sponsorHe === 'THE WORKER' || spec.sponsorHe === '1923') identity += 10

  const colours = uniqueColours(spec)
  let coherence = colours <= 2 ? 94 : colours === 3 ? 82 : 62
  if (spec.pattern === 'solid' && spec.base === spec.patternInk) coherence += 4
  if (!spec.sponsorHe) coherence += 2

  const nearest = dna.length ? [...dna].sort((a, b) => differences(spec, a) - differences(spec, b))[0] : null
  const originality = nearest ? clamp(28 + differences(spec, nearest) * 7) : 78
  const maxLike = dna.length ? Math.max(...dna.map((row) => likeness(spec, row))) : 0
  const dnaUse = dna.length ? clamp((maxLike / TRAITS.length) * 100) : 0

  let briefFit = 78
  if (briefId === 'derby') {
    briefFit = 20
    if (spec.base === 'red' || spec.base === 'deep') briefFit += 35
    if (spec.base !== spec.patternInk) briefFit += 20
    if (spec.pattern !== 'solid') briefFit += 15
    if (spec.crestKey) briefFit += 10
  } else if (briefId === 'europe') {
    briefFit = 20
    if (spec.base !== 'red' && spec.base !== 'deep') briefFit += 35
    if (redDetail(spec)) briefFit += 30
    if (colours <= 3) briefFit += 15
  } else if (briefId === 'memory2010') {
    const memory = dna.filter((row) => row.seasonLabel.startsWith('2009') || row.seasonLabel.startsWith('2010'))
    if (memory.length === 0) briefFit = 0
    else {
      const best = [...memory].sort((a, b) => differences(spec, a) - differences(spec, b))[0]!
      briefFit = clamp((likeness(spec, best) >= 2 ? 50 : 0) + (differences(spec, best) >= 2 ? 50 : 0))
    }
  } else if (briefId === 'supporters') briefFit = clamp(identity * .45 + coherence * .45 + (colours <= 3 ? 10 : 0))
  else briefFit = clamp((identity + coherence) / 2)

  const overall = clamp(identity * .27 + briefFit * .28 + originality * .18 + coherence * .22 + dnaUse * .05)
  return { identity: clamp(identity), briefFit: clamp(briefFit), originality, coherence: clamp(coherence), dnaUse, overall }
}

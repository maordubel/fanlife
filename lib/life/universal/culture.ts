/**
 * LIFE, universal — Culture DNA.
 *
 * Six things that make the same human beat taste of one club and not another: what is eaten on
 * the way, the song or chant, the road to the ground, the ticket and the gate, the media of the
 * decade, and the family figure who takes you. A chapter is written once with tokens for them
 * (`{food}`, `{chant}`, `{route}`, `{entry}`, `{media}`, `{kin}`); a club pack answers in
 * `life/culture.json`.
 *
 * Nothing here is guessed. A slot with no text prints a neutral phrase, and a club with an empty
 * slot is not READY. A slot that carries text carries a source or an explicit `needsReview`.
 */
export const CULTURE_SLOTS = ['food', 'chant', 'route', 'entry', 'media', 'kin'] as const
export type CultureSlot = typeof CULTURE_SLOTS[number]

export type CultureEntry = {text: string; source?: string; needsReview?: boolean}
export type CultureManifest = {schemaVersion: 1; clubId: string; status: string; note?: string; slots: Partial<Record<CultureSlot, CultureEntry>>}

/** What a sentence says when the pack has nothing for the slot — true for every club, belonging to none. */
export const CULTURE_NEUTRAL: Record<'en' | 'he', Record<CultureSlot, string>> = {
  en: {food: 'something to eat', chant: 'the song everybody knows', route: 'the way to the ground', entry: 'the ticket', media: 'the radio', kin: 'your father'},
  he: {food: 'משהו לאכול', chant: 'השיר שכולם מכירים', route: 'הדרך למגרש', entry: 'הכרטיס', media: 'הרדיו', kin: 'אבא שלך'},
}

const MAX = 80
const clean = (t: string) => t.replace(/\s+/g, ' ').trim()

/** Tokens for `fillChapter`: the pack's words where it has them, the neutral phrase where it does not. */
export function cultureVars(manifest: CultureManifest | null, clubId: string, locale: 'en' | 'he' = 'en'): Record<CultureSlot, string> {
  const own = manifest && manifest.clubId === clubId ? manifest.slots : {}
  const out = {} as Record<CultureSlot, string>
  for (const s of CULTURE_SLOTS) {
    const t = own[s]?.text
    out[s] = typeof t === 'string' && clean(t) ? clean(t).slice(0, MAX) : CULTURE_NEUTRAL[locale][s]
  }
  return out
}

/** Slots the pack leaves empty — each one blocks READY. */
export const emptySlots = (manifest: CultureManifest | null, clubId: string): CultureSlot[] =>
  CULTURE_SLOTS.filter(s => !(manifest && manifest.clubId === clubId && typeof manifest.slots[s]?.text === 'string' && clean(manifest.slots[s]!.text)))

/** Problems with a manifest as written (empty list = well formed). A filled slot needs a source or `needsReview`. */
export function cultureIssues(manifest: CultureManifest | null, clubId: string): string[] {
  if (!manifest) return []
  const out: string[] = []
  if (manifest.clubId !== clubId) out.push(`culture.json is for "${manifest.clubId}", not "${clubId}"`)
  for (const [k, e] of Object.entries(manifest.slots)) {
    if (!(CULTURE_SLOTS as readonly string[]).includes(k)) { out.push(`unknown slot "${k}"`); continue }
    if (!e || typeof e.text !== 'string' || !clean(e.text)) continue
    if (clean(e.text).length > MAX) out.push(`slot "${k}" is longer than ${MAX} characters`)
    if (!e.needsReview && !(typeof e.source === 'string' && /^https:\/\//.test(e.source))) out.push(`slot "${k}" has text but neither an https source nor needsReview`)
  }
  return out
}

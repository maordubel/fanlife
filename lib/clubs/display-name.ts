/**
 * One display-name resolver for every FAN LIFE screen (audit F01/F02, 22.10.2026).
 *
 * The universal shirt label used to be "the last word", which turned Ben Dayan into Dayan, da Silva into Silva
 * and printed fifteen Cohens as fifteen "Cohen". Rules:
 *  - a family name keeps its particle (van der Sar, Ben Dayan, דה סילבה) — `splitFamily`;
 *  - a one-word name stays whole;
 *  - where two DIFFERENT men in the same squad/pool share a family, both print their full name — `nameLabeler`;
 *  - a verified family can be handed in (`overrides`) for names no rule can split (כהן צדק).
 * Splitting a name is for display only — never for merging identities.
 */
const PARTICLES = new Set([
  'de', 'da', 'do', 'dos', 'das', 'di', 'del', 'della', 'van', 'von', 'der', 'den', 'ter', 'ten', 'la', 'le', 'el', 'al',
  'bin', 'ben', 'ibn', 'bar', 'abu', 'mac', 'st', 'saint',
  'בן', 'בר', 'דה', 'דל', 'אבו', 'בית', 'דוס', 'ואן', 'פון', 'אל', 'אבן',
])

const clean = (n: string) => n.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean)
const isParticle = (w: string) => PARTICLES.has(w.toLowerCase().replace(/[.']/g, ''))

export type NameParts = { given: string; family: string }

/** given / family for display: the last word plus any particles directly before it */
export function splitFamily(name: string, overrides?: Readonly<Record<string, string>>): NameParts {
  const words = clean(name)
  if (words.length <= 1) return { given: '', family: words[0] ?? name.trim() }
  const forced = overrides?.[name]
  if (forced) {
    const fw = clean(forced)
    if (fw.length && fw.length < words.length && words.slice(words.length - fw.length).join(' ') === fw.join(' ')) {
      return { given: words.slice(0, words.length - fw.length).join(' '), family: fw.join(' ') }
    }
  }
  let at = words.length - 1
  while (at > 1 && isParticle(words[at - 1]!)) at--
  return { given: words.slice(0, at).join(' '), family: words.slice(at).join(' ') }
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Build a labeller over the names that stand together on one screen. Two different names sharing a family print in full;
 * the same name twice (one man) never counts against itself.
 */
export function nameLabeler(names: Iterable<string>, overrides?: Readonly<Record<string, string>>): (name: string) => string {
  const byFamily = new Map<string, Set<string>>()
  for (const n of names) {
    const key = fold(splitFamily(n, overrides).family)
    const set = byFamily.get(key) ?? new Set<string>()
    set.add(fold(clean(n).join(' ')))
    byFamily.set(key, set)
  }
  return (name: string) => {
    const { family } = splitFamily(name, overrides)
    const shared = (byFamily.get(fold(family))?.size ?? 0) > 1
    return shared ? clean(name).join(' ') : family
  }
}

/** context-free label: family with its particle (collisions need `nameLabeler`) */
export const familyLabel = (name: string): string => splitFamily(name).family

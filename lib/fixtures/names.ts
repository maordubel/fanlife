/**
 * Name normalisation shared by the fixture feed and the meetings archive.
 * Lower-case, accents removed, punctuation to spaces. "Tel-Aviv" and "Tel Aviv" are the same
 * spelling; "Hapoel Tel Aviv" and "Maccabi Tel Aviv" are not — and nothing is matched by
 * similarity (rule 7).
 */
export const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Legal-form tokens that carry no identity. "Hapoel", "Maccabi", "Beitar" are NOT in this list. */
const FORM = new Set(['fc', 'fk', 'hsk', 'afc', 'sc', 'ac', 'cf', 'nk', 'sk', 'pfc', 'bc'])
export const core = (s: string): string => norm(s).split(' ').filter(w => !FORM.has(w)).join(' ')
export const sameClub = (a: string, b: string): boolean => core(a) !== '' && core(a) === core(b)

/**
 * Hebrew archive spellings of registry clubs — the names The Worker's match archive writes. Exact
 * spellings only (rule 7): a club meets another under one of these or not at all.
 */
export const HEBREW_NAMES: Readonly<Record<string, readonly string[]>> = {
  'Hapoel Tel Aviv': ['הפועל תל אביב', 'הפועל ת"א'],
  'Maccabi Tel Aviv': ['מכבי תל אביב', 'מכבי ת"א'],
  'Hapoel Petah Tikva': ['הפועל פ"ת', 'הפועל פתח תקווה', 'הפועל פתח תקוה'],
  'Maccabi Haifa': ['מכבי חיפה'],
}
export const namesOf = (name: string): string[] => [name, ...(Object.entries(HEBREW_NAMES).find(([en]) => sameClub(en, name))?.[1] ?? [])]

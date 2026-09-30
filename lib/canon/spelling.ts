/**
 * איות שקבע הבעלים — one name, one spelling, corrected where a source meets a person.
 *
 * Spec §0.1 (22.9.2026), the owner's words: the footballer is written **שלום תקוה**, with
 * ONE vav, everywhere — code, content, archive, script, metadata, sources, search. The
 * archive was swept on that day and `tests/owner-spelling.test.ts` fails the build if the
 * two-vav form comes back into any tracked text file.
 *
 * But ויקיפועל titles his page with two, and the next browser export will bring that
 * spelling back in. Rule 7 says a Hebrew name reaches a person only through an alias,
 * and the obvious fix — file the two-vav form as one of his `nameAliases` — would store
 * exactly the string the owner ruled out. So the correction happens HERE instead, at the
 * point where source text becomes a matching key: `identityKey` (the player registry and
 * everything that resolves through it), `normalizeName`/`normalizeLoose` (entity_alias
 * and every slug the importer mints) and the saved-sheet resolver. The wrong string is
 * never written down, and a source that uses it still lands on the right man.
 *
 * This is NOT a fuzzy matcher and must never grow into one. It is an explicit list of
 * spellings the owner ruled on, one entry per ruling, each exact. The pattern is written
 * as `ו{2}` so the forbidden string does not appear in this file either.
 */

type Ruling = { pattern: RegExp; replace: string }

const RULINGS: readonly Ruling[] = [
  // שלום תקוה — spec §0.1, 22.9.2026. `ם|מ` because `fold` turns a final mem into a plain
  // one before this runs; the separator is whatever the source used (space, hyphen, _,
  // maqaf).
  { pattern: /(שלו[םמ])([\s\-_\u05BE]+)תקו{2}ה/gu, replace: '$1$2תקוה' },
]

/** The owner's spelling for every name he has ruled on; everything else is untouched. */
export function ownerSpelling(text: string): string {
  let out = text
  for (const ruling of RULINGS) out = out.replace(ruling.pattern, ruling.replace)
  return out
}

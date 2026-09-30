import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  PLAYER_ID_PREFIX,
  identityKey,
  type PlayerIdEntry,
} from '@/lib/archive/player-identity'

/**
 * The player mint (21.9.2026) — the ONLY thing allowed to create a `PlayerId`.
 *
 * Same contract as `./matchIds.ts` (rule 35), for people: an id is derived from the
 * canonical slug the first time that person is seen and never derived again. The
 * registry (`content/manual/player-ids.json`) is the authority from then on — a spelling
 * fix, a slug fix or a reviewed merge moves `slug`/`slugAliases`/`nameAliases`, never
 * `id`.
 *
 * **Who is a person here.** Exactly the football people the archive already knows:
 * `people.json` ∪ `players-roster.json`, merged by slug the way `lib/game/archive.ts`
 * merges them, minus every name the Ussishkin association files hold (rules 14 and 17),
 * then folded by the reviewed merges in `content/manual/player-aliases.json`. Nobody is
 * created from a shirt-number spelling, a scorer string or a lineup name — a spelling
 * that does not reach one of these people is REPORTED, never promoted (the 61 phantom
 * people of Player Master v1 were exactly that).
 */

export const PLAYER_ID_REGISTRY = 'content/manual/player-ids.json'
export const PLAYER_ALIASES = 'content/manual/player-aliases.json'

type PersonRow = { slug: string; fullNameHe: string; fullNameEn?: string; aliases?: string[] }

export type PlayerAliasesFile = {
  merges: { keep: string; absorb: string[]; evidenceHe: string }[]
  nameAliases: { slug: string; nameHe: string; evidenceHe: string }[]
  classifications: { slug: string; kind: string; role: string; roleHe: string; evidenceHe: string }[]
}

export type PlannedPerson = {
  slug: string
  displayName: string
  slugAliases: string[]
  nameAliases: string[]
  /** which list(s) the person came from, for provenance */
  from: ('people' | 'roster')[]
}

export type PlayerPlan = {
  persons: PlannedPerson[]
  excluded: { nameHe: string; reason: string }[]
  problems: string[]
}

const read = (root: string, file: string): any =>
  JSON.parse(readFileSync(join(root, file), 'utf8'))

/** Code-point order — stable across ICU versions, which `localeCompare` is not. */
export function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort(byCodePoint)
}

/**
 * Build the list of people from the files. Pure over its inputs; deterministic.
 */
export function planPersons(root: string): PlayerPlan {
  const people = read(root, 'content/manual/people.json').records as PersonRow[]
  const roster = read(root, 'content/manual/players-roster.json').records as PersonRow[]
  const aliases = read(root, PLAYER_ALIASES) as PlayerAliasesFile
  const ussishkin = new Set<string>([
    ...(read(root, 'content/manual/association-roles.json').records as { personNameHe: string }[]).map(
      (row) => row.personNameHe,
    ),
    ...(read(root, 'content/manual/election-candidates.json').records as { personNameHe: string }[]).map(
      (row) => row.personNameHe,
    ),
  ])

  const problems: string[] = []
  const excluded: PlayerPlan['excluded'] = []

  // `mergeBySlug(people, roster)` — the curated record wins a slug, the roster fills in.
  const bySlug = new Map<string, { row: PersonRow; from: Set<'people' | 'roster'> }>()
  for (const row of people) bySlug.set(row.slug, { row, from: new Set(['people']) })
  for (const row of roster) {
    const found = bySlug.get(row.slug)
    if (found) {
      found.from.add('roster')
      // the roster's own spellings are still spellings of him
      found.row = { ...found.row, aliases: [...(found.row.aliases ?? []), row.fullNameHe, ...(row.aliases ?? [])] }
    } else {
      bySlug.set(row.slug, { row, from: new Set(['roster']) })
    }
  }

  for (const [slug, { row }] of [...bySlug]) {
    if (ussishkin.has(row.fullNameHe)) {
      excluded.push({ nameHe: row.fullNameHe, reason: 'rule-14/17: an Ussishkin association name, not a football person' })
      bySlug.delete(slug)
    }
  }

  // Reviewed merges: the absorbed slug becomes a former slug of the kept one.
  const absorbedInto = new Map<string, string>()
  for (const merge of aliases.merges) {
    if (!bySlug.has(merge.keep)) problems.push(`merge keeps unknown slug ${merge.keep}`)
    for (const slug of merge.absorb) {
      if (!bySlug.has(slug)) problems.push(`merge absorbs unknown slug ${slug}`)
      absorbedInto.set(slug, merge.keep)
    }
  }

  const persons = new Map<string, PlannedPerson>()
  for (const [slug, { row, from }] of bySlug) {
    if (absorbedInto.has(slug)) continue
    persons.set(slug, {
      slug,
      displayName: row.fullNameHe,
      slugAliases: [],
      nameAliases: [row.fullNameHe, ...(row.aliases ?? []), ...(row.fullNameEn ? [row.fullNameEn] : [])],
      from: [...from].sort(byCodePoint) as PlannedPerson['from'],
    })
  }
  for (const [slug, keep] of absorbedInto) {
    const target = persons.get(keep)
    const source = bySlug.get(slug)
    if (!target || !source) continue
    target.slugAliases.push(slug)
    target.nameAliases.push(source.row.fullNameHe, ...(source.row.aliases ?? []))
    if (source.row.fullNameEn) target.nameAliases.push(source.row.fullNameEn)
    for (const list of source.from) if (!target.from.includes(list)) target.from.push(list)
  }

  for (const alias of aliases.nameAliases) {
    const target = persons.get(alias.slug) ?? persons.get(absorbedInto.get(alias.slug) ?? '')
    if (!target) {
      problems.push(`name alias for unknown slug ${alias.slug}`)
      continue
    }
    target.nameAliases.push(alias.nameHe)
  }

  // Latin spellings the research files attached to a Hebrew name that is already his.
  const hebrewKey = new Map<string, Set<string>>()
  for (const person of persons.values()) {
    for (const name of person.nameAliases) {
      const key = identityKey(name)
      const set = hebrewKey.get(key) ?? new Set<string>()
      set.add(person.slug)
      hebrewKey.set(key, set)
    }
  }
  const latinFrom = (rows: { personNameHe?: string; personNameLatin?: string | null }[]) => {
    for (const row of rows) {
      if (!row.personNameHe || !row.personNameLatin) continue
      const owners = hebrewKey.get(identityKey(row.personNameHe))
      if (!owners || owners.size !== 1) continue
      persons.get([...owners][0] as string)?.nameAliases.push(row.personNameLatin)
    }
  }
  latinFrom(read(root, 'content/manual/player-facts.json').records)
  latinFrom(read(root, 'content/manual/player-facts-seasons.json').records)

  for (const person of persons.values()) {
    person.slugAliases = uniqueSorted(person.slugAliases)
    person.nameAliases = uniqueSorted(person.nameAliases)
    person.from.sort(byCodePoint)
  }

  return {
    persons: [...persons.values()].sort((a, b) => byCodePoint(a.slug, b.slug)),
    excluded: excluded.sort((a, b) => byCodePoint(a.nameHe, b.nameHe)),
    problems,
  }
}

type RegistryFile = { note: string; records: PlayerIdEntry[] }

const NOTE =
  'Append-only (rule 35, for people). An id is minted once and never changes; a slug fix or a ' +
  'reviewed merge (content/manual/player-aliases.json) moves `slug`/`slugAliases`/`nameAliases`, ' +
  'never `id`. Written only by `npm run canon:ids -- --write-ids`. Never hand-edit an `id`.'

export function loadPlayerRegistry(root: string): PlayerIdEntry[] {
  const path = join(root, PLAYER_ID_REGISTRY)
  if (!existsSync(path)) return []
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RegistryFile>
    return Array.isArray(parsed.records) ? parsed.records : []
  } catch {
    throw new Error(`${PLAYER_ID_REGISTRY} is unreadable — refusing to mint over it`)
  }
}

export function serialisePlayerRegistry(records: readonly PlayerIdEntry[]): string {
  const sorted = [...records].sort((a, b) => byCodePoint(a.id, b.id))
  return `${JSON.stringify({ note: NOTE, records: sorted }, null, 2)}\n`
}

export function savePlayerRegistry(root: string, records: readonly PlayerIdEntry[]): void {
  const path = join(root, PLAYER_ID_REGISTRY)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, serialisePlayerRegistry(records), 'utf8')
}

function derive(slug: string, salt: number): string {
  const seed = salt === 0 ? `player|${slug}` : `player|${slug}#${salt}`
  return `${PLAYER_ID_PREFIX}${createHash('sha256').update(seed).digest('hex').slice(0, 10)}`
}

/**
 * Mint what is missing and append what is new. Returns a NEW list; the input is not
 * touched. Idempotent: the same persons over the registry this produced change nothing.
 */
export function mintPlayerIds(
  registry: readonly PlayerIdEntry[],
  persons: readonly PlannedPerson[],
  now = new Date().toISOString().slice(0, 10),
): { records: PlayerIdEntry[]; minted: number; grown: number } {
  const records = registry.map((entry) => ({
    ...entry,
    slugAliases: [...entry.slugAliases],
    nameAliases: [...entry.nameAliases],
  }))
  const bySlug = new Map<string, PlayerIdEntry>()
  for (const entry of records) {
    bySlug.set(entry.slug, entry)
    for (const slug of entry.slugAliases) if (!bySlug.has(slug)) bySlug.set(slug, entry)
  }
  const taken = new Set(records.map((entry) => entry.id))

  let minted = 0
  let grown = 0
  for (const person of persons) {
    const existing =
      bySlug.get(person.slug) ?? person.slugAliases.map((slug) => bySlug.get(slug)).find(Boolean)
    if (existing) {
      // Append only — an existing alias keeps its place, a new one joins the end.
      const before = existing.slugAliases.length + existing.nameAliases.length
      const slugs = [...person.slugAliases, ...(existing.slug === person.slug ? [] : [person.slug])]
      for (const slug of slugs.sort(byCodePoint)) {
        if (slug !== existing.slug && !existing.slugAliases.includes(slug)) existing.slugAliases.push(slug)
      }
      for (const name of person.nameAliases) {
        if (!existing.nameAliases.includes(name)) existing.nameAliases.push(name)
      }
      if (existing.slugAliases.length + existing.nameAliases.length !== before) grown += 1
      continue
    }
    let salt = 0
    let id = derive(person.slug, salt)
    while (taken.has(id)) {
      salt += 1
      id = derive(person.slug, salt)
    }
    taken.add(id)
    const entry: PlayerIdEntry = {
      id,
      slug: person.slug,
      slugAliases: [...person.slugAliases],
      nameAliases: [...person.nameAliases],
      mintedOn: now,
    }
    records.push(entry)
    bySlug.set(entry.slug, entry)
    minted += 1
  }
  return { records, minted, grown }
}

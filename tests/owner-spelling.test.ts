import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import playerIds from '@/content/manual/player-ids.json'
import { identityKey } from '@/lib/archive/player-identity'
import { pickerRoster, resolvePlayer } from '@/lib/archive/player-master'
import { ownerSpelling } from '@/lib/canon/spelling'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { refResolver } from '@/lib/xi/store'
import { normalizeLoose, normalizeName, slugify } from '@/scripts/ingest/lib/normalize'

/**
 * שלום תקוה — one vav, everywhere (spec §0.1, 22.9.2026).
 *
 * The owner's rule is absolute: code, content, archive, script, metadata, sources and
 * search all write the name with ONE vav. The repository was swept on that day; this file
 * is what keeps it swept. It reads every text file in the tree — content, lib, app,
 * components, messages, tests, docs, scripts, data, the root — and fails on the two-vav
 * form with any separator a file uses (space, hyphen for a slug, underscore, maqaf).
 *
 * **The forbidden string is built from parts and never written here**, so the guard
 * cannot trip on itself and no exemption list is needed — not even for this file.
 *
 * A source that still spells it with two (ויקיפועל does, in its page title) is corrected
 * where it meets a person — `lib/canon/spelling.ts` — so the ruled-out spelling is never
 * stored as an alias either (rule 7). The second half of this file proves that seam.
 */

const ROOT = join(__dirname, '..')
const GIVEN = 'שלום'
const FAMILY_TWO_VAV = 'תקו' + 'וה'
const FAMILY = 'תקוה'
const TWO_VAV = [GIVEN, FAMILY_TWO_VAV].join(' ')
const SLUG_TWO_VAV = [GIVEN, FAMILY_TWO_VAV].join('-')
const FORBIDDEN = new RegExp(`${GIVEN}[\\s\\-_־]+${FAMILY_TWO_VAV}`, 'u')

/** directories that are not the repository's own text: dependencies, build output, and what .gitignore keeps out */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.deliver',
  'delta',
  'data/life-shots',
  'data/maor-shots',
  'docs/life-shots',
  'docs/goal-shots',
  '__pycache__',
])
const TEXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.mdx', '.py', '.sh', '.sql',
  '.svg', '.txt', '.yml', '.yaml', '.html', '.css', '.csv', '.tsv', '.xml',
])

function textFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const rel = relative(ROOT, path)
    if (SKIP_DIRS.has(name) || SKIP_DIRS.has(rel)) continue
    const stat = statSync(path)
    if (stat.isDirectory()) textFiles(path, out)
    else if (TEXT.has(extname(name).toLowerCase()) || name === '.gitignore') out.push(path)
  }
  return out
}

describe('שלום תקוה — the two-vav spelling appears nowhere in the repository', () => {
  const files = textFiles(ROOT)

  it('reads the whole tree, not a corner of it', () => {
    const rel = files.map((file) => relative(ROOT, file))
    for (const dir of ['content/manual/', 'content/raw/', 'content/generated/', 'lib/', 'app/', 'components/', 'messages/', 'tests/', 'docs/', 'scripts/', 'data/']) {
      expect(rel.some((file) => file.startsWith(dir)), dir).toBe(true)
    }
    expect(rel).toContain('CLAUDE.md')
    expect(rel).toContain('tests/owner-spelling.test.ts')
  })

  it('finds no file that writes it', () => {
    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      const hit = FORBIDDEN.exec(text)
      if (!hit) continue
      const line = text.slice(0, hit.index).split('\n').length
      offenders.push(`${relative(ROOT, file)}:${line}`)
    }
    expect(offenders).toEqual([])
  })

  it('the guard itself would catch every form it claims to', () => {
    for (const form of [TWO_VAV, SLUG_TWO_VAV, `${GIVEN}_${FAMILY_TWO_VAV}`, `${GIVEN}־${FAMILY_TWO_VAV}`, `${GIVEN}\n${FAMILY_TWO_VAV}`]) {
      expect(FORBIDDEN.test(form), form).toBe(true)
    }
    expect(FORBIDDEN.test(`${GIVEN} ${FAMILY}`)).toBe(false)
  })
})

describe('the seam — a two-vav source reaches the right man without the spelling being stored', () => {
  const tikva = resolvePlayer(`${GIVEN} ${FAMILY}`)

  it('he is in the archive under the owner’s spelling, and only that one', () => {
    expect(tikva?.id).toBe('p_b5d64bece3')
    const entry = (playerIds as { records: { id: string; slug: string; slugAliases: string[]; nameAliases: string[] }[] }).records.find(
      (row) => row.id === 'p_b5d64bece3',
    )!
    expect(entry.slug).toBe(`${GIVEN}-${FAMILY}`)
    for (const alias of [...entry.slugAliases, ...entry.nameAliases]) expect(FORBIDDEN.test(alias), alias).toBe(false)
  })

  it('corrects exactly the ruled name and nothing that merely shares a word with it', () => {
    expect(ownerSpelling(TWO_VAV)).toBe(`${GIVEN} ${FAMILY}`)
    expect(ownerSpelling(SLUG_TWO_VAV)).toBe(`${GIVEN}-${FAMILY}`)
    expect(ownerSpelling(`[[${TWO_VAV}]] ו[[חיים רביבו]]`)).toBe(`[[${GIVEN} ${FAMILY}]] ו[[חיים רביבו]]`)
    // his brother and Petah Tikva are other names, and the owner ruled on one
    for (const other of ['אבי ' + FAMILY_TWO_VAV, 'הפועל פתח ' + FAMILY_TWO_VAV, 'שכונת ה' + FAMILY_TWO_VAV, 'שלום עליכם']) {
      expect(ownerSpelling(other)).toBe(other)
    }
  })

  it('matches through every matching form the importer and the archive use', () => {
    expect(identityKey(TWO_VAV)).toBe(identityKey(`${GIVEN} ${FAMILY}`))
    expect(identityKey(SLUG_TWO_VAV)).toBe(identityKey(`${GIVEN}-${FAMILY}`))
    expect(normalizeName(TWO_VAV)).toBe(normalizeName(`${GIVEN} ${FAMILY}`))
    expect(normalizeLoose(TWO_VAV)).toBe(normalizeLoose(`${GIVEN} ${FAMILY}`))
    expect(slugify(TWO_VAV)).toBe(`${GIVEN}-${FAMILY}`)
    expect(resolvePlayer(TWO_VAV)?.id).toBe('p_b5d64bece3')
    expect(resolvePlayer(SLUG_TWO_VAV)?.id).toBe('p_b5d64bece3')
  })

  it('reads a sheet saved before the ruling onto the same man', () => {
    const resolve = refResolver({ roster: rosterIndex().all, slugAliases: pickerRoster().slugAliases })
    expect(resolve(SLUG_TWO_VAV)).toBe('p_b5d64bece3')
    expect(resolve(`${GIVEN}-${FAMILY}`)).toBe('p_b5d64bece3')
  })
})

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { OWNER_KNOWLEDGE_LABEL, recordKind } from '@/lib/game/hate-run'

/**
 * מקור הוא לא שם — spec §0.2 (22.9.2026).
 *
 * The owner's name is not presented as one of the archive's sources. What he knows is
 * still a source (rule 18) and is still cited as one — under the neutral label
 * `ידע אישי — צוות The Worker, <date>` — and everything the archive says ABOUT him as a
 * person stays: he founded Hapoel Ussishkin, his `association_role` rows, the Ussishkin
 * wing, the questions whose subject is him (rule 17). Only his name as a credit goes.
 *
 * So the check is on the KEY, not on the text: any field whose name says it is a source,
 * a credit, an attribution, a byline or a photographer — at any depth, including a
 * `sources` map whose values are objects — may not carry the name, in any file under
 * content/manual or content/generated. A fact that happens to mention him sits under a
 * key like `bodyHe` or `personNameHe` and is not touched.
 */

const ROOT = join(__dirname, '..')
const NAME = 'מאור הראל'
const SOURCE_KEY = /source|credit|attribution|byline|photographer/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

function offenders(value: unknown, path: string, out: string[]): string[] {
  if (Array.isArray(value)) value.forEach((item, index) => offenders(item, `${path}[${index}]`, out))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SOURCE_KEY.test(key) && strings(child).some((text) => text.includes(NAME))) out.push(`${path}.${key}`)
      offenders(child, `${path}.${key}`, out)
    }
  }
  return out
}

const FILES = ['content/manual', 'content/generated'].flatMap((dir) =>
  readdirSync(join(ROOT, dir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${dir}/${name}`),
)

describe('the owner’s name is not an archive source (spec §0.2)', () => {
  it('reads every JSON file in both directories', () => {
    expect(FILES.length).toBeGreaterThan(40)
    expect(FILES).toContain('content/manual/asset-provenance.json')
    expect(FILES).toContain('content/generated/question-master.json')
  })

  it('no source, credit, attribution, byline or photographer field carries the name', () => {
    const found = FILES.flatMap((file) => offenders(JSON.parse(readFileSync(join(ROOT, file), 'utf8')), file, []))
    expect(found).toEqual([])
  })

  it('the check would catch the shapes it claims to — flat, nested, prefixed', () => {
    expect(offenders({ sourceTitle: `${NAME} — ידע אישי, 1.9.2026` }, 'x', [])).toEqual(['x.sourceTitle'])
    expect(offenders({ sources: { s_1: { title: `חומרי עזר של ${NAME}` } } }, 'x', [])).toEqual(['x.sources'])
    expect(offenders({ records: [{ photographerHe: `צילום: מ${NAME}` }] }, 'x', [])).toEqual(['x.records[0].photographerHe'])
    expect(offenders({ records: [{ creditHe: 'ישי צבי', bodyHe: `${NAME} ייסד את הפועל אוסישקין` }] }, 'x', [])).toEqual([])
  })

  it('keeps the facts about him as a person', () => {
    const roles = JSON.parse(readFileSync(join(ROOT, 'content/manual/association-roles.json'), 'utf8')) as {
      records: { personNameHe: string }[]
    }
    expect(roles.records.filter((row) => row.personNameHe === NAME).length).toBeGreaterThan(0)
    const people = readFileSync(join(ROOT, 'content/manual/people.json'), 'utf8')
    expect(people).toContain(`"fullNameHe": "${NAME}"`)
  })

  it('cites his knowledge under the neutral label, and the hate wall still knows it for what it is', () => {
    expect(OWNER_KNOWLEDGE_LABEL).toBe('ידע אישי — צוות The Worker')
    const enemies = readFileSync(join(ROOT, 'content/manual/enemies.json'), 'utf8')
    expect(enemies).toMatch(/"sourceTitle": "ידע אישי — צוות The Worker, \d{1,2}\.\d{1,2}\.\d{4}"/)
    expect(recordKind(`${OWNER_KNOWLEDGE_LABEL}, 1.9.2026`)).toBe('maor')
  })

  it('the life game’s copy of the kit archive carries no name as a source either', () => {
    const shirts = readFileSync(join(ROOT, 'lib/life/generated/kitShirts.ts'), 'utf8')
    expect(shirts).not.toContain(NAME)
  })
})

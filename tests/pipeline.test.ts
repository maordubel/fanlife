import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { IngestReport } from '@/scripts/ingest/lib/report'
import { concatBundles, runPipeline } from '@/scripts/ingest/pipeline'
import { loadManualBundle } from '@/scripts/ingest/sources/manual'
import { parseRawPages } from '@/scripts/ingest/sources/wiki'
import { BUNDLE_KEYS, TRIVIA_CONFIDENCE_FLOOR } from '@/scripts/ingest/lib/types'
import { BASKETBALL_PLAYER_PAGE, PLAYER_PAGE, SEASON_PAGE, SQUAD_PAGE } from './fixtures/wiki'

const ROOT = process.cwd()

function run() {
  const report = new IngestReport('test')
  const wiki = parseRawPages([PLAYER_PAGE, SEASON_PAGE, SQUAD_PAGE, BASKETBALL_PLAYER_PAGE], report)
  const manual = loadManualBundle(ROOT, report)
  const result = runPipeline(concatBundles([manual, wiki]), report)
  return { ...result, report }
}

describe('pipeline', () => {
  it('is idempotent: two runs produce the identical bundle', () => {
    const first = run()
    const second = run()
    expect(second.bundle).toEqual(first.bundle)
    expect(second.aliases).toEqual(first.aliases)
  })

  it('running the pipeline over its own output adds nothing', () => {
    const first = run()
    const report = new IngestReport('test')
    const again = runPipeline(first.bundle, report)
    expect(again.bundle.people).toHaveLength(first.bundle.people.length)
    expect(again.bundle.seasons).toHaveLength(first.bundle.seasons.length)
    expect(report.duplicatesMerged).toBe(0)
  })

  it('rejects the basketball page and keeps it out of the bundle', () => {
    const { bundle, report } = run()
    expect(bundle.people.some((person) => person.slug.includes('כדורסל'))).toBe(false)
    expect(report.rejected.some((entry) => entry.reason.includes('basketball'))).toBe(true)
  })

  it('loads the manual reference data with its declared confidence', () => {
    const { bundle } = run()
    const club = bundle.clubs.find((row) => row.isUs)
    expect(club?.nameHe).toBe('הפועל תל אביב')
    expect(club?.confidence).toBe(3)
    expect(bundle.competitions.length).toBeGreaterThanOrEqual(6)
  })

  it('expands the season calendar scaffold at confidence 0', () => {
    const { bundle } = run()
    expect(bundle.seasons.length).toBeGreaterThan(100)
    const scaffold = bundle.seasons.find((season) => season.label === '1999/00')
    expect(scaffold?.confidence).toBe(0)
  })

  it('keeps every fact below the trivia floor out of the generator, and lists it', () => {
    const { bundle, report } = run()
    const eligible = bundle.seasons.filter(
      (season) => season.confidence >= TRIVIA_CONFIDENCE_FLOOR,
    )
    expect(eligible).toHaveLength(0)
    expect(report.lowConfidence.length).toBeGreaterThan(0)
  })

  it('attaches a source to every imported fact', () => {
    const { bundle } = run()
    const all = [
      ...bundle.people,
      ...bundle.seasons,
      ...bundle.clubs,
      ...bundle.competitions,
      ...bundle.squadMemberships,
    ]
    expect(all.length).toBeGreaterThan(0)
    expect(all.every((row) => row.source.naturalKey.length > 0)).toBe(true)
  })

  it('reports squad rows whose player is not in the bundle instead of creating one', () => {
    const { report } = run()
    // The fixture squad names players that have no player page in this run.
    expect(report.unresolved.some((entry) => entry.field === 'personSlug')).toBe(true)
  })

  it('produces a report with every required section', () => {
    const { report } = run()
    const markdown = report.toMarkdown()
    for (const heading of [
      '## Totals',
      '## Discovered',
      '## Imported by entity',
      '## Coverage',
      '## Skipped',
      '## Rejected',
      '## Unresolved entities',
      '## Conflicts',
      '## Low-confidence facts',
      '## Sources',
    ]) {
      expect(markdown).toContain(heading)
    }
  })
})

describe('the pipeline collects every entity in the bundle', () => {
  it('leaves no bundle key uncollected', () => {
    // A new entity that is staged but never collected vanishes between "discovered"
    // and "imported" with nothing rejected — the ingest report's two numbers simply
    // stop matching. This test is why that is now a failure rather than a puzzle.
    const source = readFileSync(join(ROOT, 'scripts/ingest/pipeline.ts'), 'utf8')
    for (const key of BUNDLE_KEYS) {
      // collect( may be broken across lines by the formatter.
      const called = new RegExp(`collect\\(\\s*'${key}'`).test(source)
      expect(called, `pipeline never collects ${key}`).toBe(true)
    }
  })
})

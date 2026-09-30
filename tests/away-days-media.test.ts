import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { cleanBeen, isBeen, mergeBeen, myJourney, pickEntry, toggleBeen, type BeenLedger } from '@/lib/away-days/been'
import { journeyData } from '@/lib/away-days/journey'
import { AWAY_MEDIA, photoLabel, venuePhoto } from '@/lib/away-days/media'
import type { AwayDaysMaster, VenueRecord } from '@/lib/away-days/types'
import { isYellow } from '@/lib/isYellow'
import { countYellow, isYellow as scriptIsYellow } from '@/scripts/away-days/ingest-media.mjs'

/**
 * AWAY DAYS — the media layer (§29) and "הייתי שם" (§30), 25.9.2026.
 *
 * A photograph is on the page only with a source, a credit, a licence and the year it was
 * taken; every shipped file is the exact bytes that were measured for yellow; and the
 * supporter's ticks merge the same way on the device as in the account.
 */

const ROOT = join(__dirname, '..')
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const master = JSON.parse(read('content/generated/away-days-master.json')) as AwayDaysMaster
const registry = (JSON.parse(read('content/manual/venue-registry.json')) as { records: VenueRecord[] }).records
const provenance = JSON.parse(read('content/manual/asset-provenance.json')) as {
  records: { key: string; folder: string; match: string[]; origin: string; sourceUrl: string | null; treatment: string[] }[]
}
const data = journeyData(master)

let sharp: ((input: Buffer) => { removeAlpha(): { raw(): { toBuffer(o: { resolveWithObject: true }): Promise<{ data: Buffer; info: { channels: number } }> } } }) | null = null
try {
  sharp = createRequire(import.meta.url)('sharp')
} catch {
  sharp = null
}

describe('away media — the ledger (§29)', () => {
  it('every row carries a licence, a source, a credit and the year it was taken', () => {
    expect(AWAY_MEDIA.length).toBeGreaterThan(0)
    for (const row of AWAY_MEDIA) {
      expect(row.kind, row.id).toBe('stadium')
      expect(row.license, row.id).toMatch(/^(CC BY(-SA)? [1-4]\.0|CC0 1\.0|Public domain|owner-upload)$/)
      expect(row.credit?.trim().length ?? 0, row.id).toBeGreaterThan(2)
      expect(typeof row.capturedYear, row.id).toBe('number')
      expect(row.capturedYear!, row.id).toBeGreaterThan(1900)
      expect(row.capturedYear!, row.id).toBeLessThanOrEqual(2026)
      if (row.license === 'owner-upload') {
        expect(row.sourceTitle?.length ?? 0, row.id).toBeGreaterThan(10)
      } else {
        // a free licence is only as good as the page that grants it
        expect(row.sourceUrl, row.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(row.licenseUrl, row.id).toMatch(/^https:\/\/creativecommons\.org\/|^https:\/\/commons\.wikimedia\.org\//)
      }
    }
  })

  it('points only at grounds the registry knows', () => {
    const ids = new Set(registry.map((v) => v.id))
    for (const row of AWAY_MEDIA) expect(ids.has(row.venueId ?? ''), row.id).toBe(true)
  })

  it('has unique ids and never hotlinks — every asset is a local /away file', () => {
    expect(new Set(AWAY_MEDIA.map((r) => r.id)).size).toBe(AWAY_MEDIA.length)
    for (const row of AWAY_MEDIA) {
      for (const url of [row.assetUrl, row.assetUrlTall]) {
        expect(url, row.id).toMatch(/^\/away\/[a-z0-9-]+-(wide|tall)\.webp$/)
        expect(existsSync(join(ROOT, 'public', url!)), url).toBe(true)
      }
    }
  })

  it('every file is measured: the shipped bytes are the measured bytes, at 1600×900 / 900×1200, with zero yellow', async () => {
    for (const row of AWAY_MEDIA) {
      expect(row.files.map((f) => `${f.width}x${f.height}`).sort(), row.id).toEqual(['1600x900', '900x1200'])
      for (const file of row.files) {
        const bytes = readFileSync(join(ROOT, file.path))
        expect(bytes.length, file.path).toBe(file.bytes)
        expect(createHash('sha256').update(bytes).digest('hex'), file.path).toBe(file.sha256)
        expect(file.yellowPx, file.path).toBe(0)
        if (sharp) {
          const { data: px, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true })
          let n = 0
          for (let i = 0; i < px.length; i += info.channels) if (isYellow(px[i]!, px[i + 1]!, px[i + 2]!)) n += 1
          expect(n, `${file.path} decodes with yellow`).toBe(0)
        }
      }
    }
  })

  it('every file in public/away is in the ledger and in the provenance manifest — no orphan, no double claim', () => {
    const files = readdirSync(join(ROOT, 'public/away')).sort()
    const ledgered = AWAY_MEDIA.flatMap((r) => r.files.map((f) => f.path.replace('public/away/', ''))).sort()
    expect(files).toEqual(ledgered)
    const claimed = provenance.records.filter((r) => r.folder === 'public/away').flatMap((r) => r.match).sort()
    expect(claimed).toEqual(files)
    for (const r of provenance.records.filter((r) => r.folder === 'public/away')) {
      expect(r.treatment).toContain('lossy-webp-measured')
      if (r.origin === 'free-licence') expect(r.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    }
    expect(read('scripts/life/asset-provenance.mjs')).toContain("'public/away'")
  })

  it('the pipeline measures with the same yellow the rule defines', () => {
    const probes: [number, number, number][] = [
      [216, 178, 92], [245, 197, 24], [176, 45, 16], [233, 223, 199], [143, 190, 99], [192, 155, 113], [242, 197, 0], [255, 255, 0], [90, 80, 20],
    ]
    for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 51) probes.push([r, g, b])
    for (const [r, g, b] of probes) expect(scriptIsYellow(r, g, b), `${r},${g},${b}`).toBe(isYellow(r, g, b))
    expect(countYellow(Buffer.from([245, 197, 24, 176, 45, 16]), 3)).toBe(1)
  })
})

describe('away media — on the page', () => {
  it('labels every photograph with the year it was taken, never bare', () => {
    const photo = venuePhoto('bloomfield')
    expect(photo).not.toBeNull()
    expect(photoLabel(photo!)).toBe('צילום משנות ה-80')
    expect(photoLabel({ ...photo!, decade: false, capturedYear: 2019 })).toBe('צילום מ-2019')
    expect(photoLabel({ ...photo!, capturedYear: null })).toBe('צילום, שנה לא ידועה')
    const component = read('components/away-days/VenuePhoto.tsx')
    expect(component).toContain('photoLabel(media)')
    expect(component).toContain('creditLine(media)')
    expect(component).toContain('loading="lazy"')
    const experience = read('components/away-days/AwayDaysExperience.tsx')
    // the only other <img> (the origin thumb) prints its label and credit in the same card
    expect(experience).toContain("t('away89.photo.inline'")
  })

  it('no component names an image URL — the ledger is the only way in', () => {
    for (const file of readdirSync(join(ROOT, 'components/away-days'))) {
      const text = read(`components/away-days/${file}`)
      expect(/https?:\/\/[^'"\s]*\.(jpe?g|png|webp)/i.test(text), file).toBe(false)
      expect(text.includes('upload.wikimedia.org'), file).toBe(false)
      expect(/src="\/away\//.test(text), file).toBe(false)
    }
  })

  it('a ground with no photograph keeps its typography (fallback)', () => {
    const without = registry.find((v) => !AWAY_MEDIA.some((m) => m.venueId === v.id))
    expect(without).toBeDefined()
    expect(venuePhoto(without!.id)).toBeNull()
  })
})

describe('הייתי שם — the ledger (§30)', () => {
  const [a, b, c] = data.visits
  const at = (iso: string) => new Date(iso)

  it('toggles, and keeps an un-tick as a dated entry', () => {
    let ledger: BeenLedger = {}
    ledger = toggleBeen(ledger, a!.id, at('2026-09-20T10:00:00Z'))
    expect(isBeen(ledger, a!.id)).toBe(true)
    ledger = toggleBeen(ledger, a!.id, at('2026-09-21T10:00:00Z'))
    expect(isBeen(ledger, a!.id)).toBe(false)
    expect(ledger[a!.id]).toEqual({ b: false, at: '2026-09-21T10:00:00.000Z' })
  })

  it('merges like the account does: newer wins, a tie keeps "been", order does not matter', () => {
    const phone: BeenLedger = { [a!.id]: { b: true, at: '2026-09-20T10:00:00.000Z' }, [b!.id]: { b: false, at: '2026-09-22T10:00:00.000Z' } }
    const laptop: BeenLedger = { [a!.id]: { b: false, at: '2026-09-19T10:00:00.000Z' }, [b!.id]: { b: true, at: '2026-09-21T10:00:00.000Z' }, [c!.id]: { b: true, at: '2026-09-18T00:00:00.000Z' } }
    const merged = mergeBeen(phone, laptop)
    expect(merged).toEqual(mergeBeen(laptop, phone))
    expect(isBeen(merged, a!.id)).toBe(true)
    expect(isBeen(merged, b!.id)).toBe(false)
    expect(isBeen(merged, c!.id)).toBe(true)
    expect(pickEntry({ b: false, at: '2026-09-20T10:00:00.000Z' }, { b: true, at: '2026-09-20T10:00:00.000Z' })?.b).toBe(true)
  })

  it('a guest ledger is merged into the account, not replaced (guest → account)', () => {
    const guest: BeenLedger = { [a!.id]: { b: true, at: '2026-09-25T08:00:00.000Z' } }
    const account: BeenLedger = { [b!.id]: { b: true, at: '2026-09-01T08:00:00.000Z' } }
    const merged = mergeBeen(guest, account)
    expect(Object.keys(merged).sort()).toEqual([a!.id, b!.id].sort())
  })

  it('refuses whatever is not a visit id or a well-formed entry', () => {
    expect(cleanBeen({ [a!.id]: { b: true, at: '2026-09-20T10:00:00Z' }, 'DROP TABLE': { b: true, at: '2026-09-20T10:00:00Z' }, [b!.id]: { b: 'yes', at: 'x' } })).toEqual({
      [a!.id]: { b: true, at: '2026-09-20T10:00:00Z' },
    })
    expect(cleanBeen(null)).toEqual({})
  })

  it('"המסע שלי" counts countries, grounds and matches over the public journey only', () => {
    const ledger: BeenLedger = {}
    for (const v of data.visits) ledger[v.id] = { b: true, at: '2026-09-20T10:00:00Z' }
    ledger['visit:m_notinjourney'] = { b: true, at: '2026-09-20T10:00:00Z' }
    const all = myJourney(data, ledger)
    expect(all).toMatchObject({ countries: master.counts.countries, stadiums: master.counts.stops, matches: master.counts.visits })
    expect(myJourney(data, {})).toMatchObject({ countries: 0, stadiums: 0, matches: 0, first: null })
    // two visits on one ground are one stadium
    const multi = master.stops.find((s) => s.visitCount > 1)!
    const two: BeenLedger = Object.fromEntries(multi.visitIds.slice(0, 2).map((id) => [id, { b: true, at: '2026-09-20T10:00:00Z' }]))
    expect(myJourney(data, two)).toMatchObject({ stadiums: 1, matches: 2, countries: 1 })
  })

  it('every public visit id fits the account table’s check', () => {
    for (const v of data.visits) expect(v.id).toMatch(/^visit:[a-z0-9_:.-]{1,80}$/)
  })
})

describe('הייתי שם — storage and sync, by source', () => {
  const been = read('lib/away-days/been.ts')
  const sync = read('lib/away-days/been-sync.ts')
  const sql = read('supabase/migrations/20260925092000_worker_away_been.sql')

  it('guards every storage touch', () => {
    expect(been.match(/window\.localStorage/g)?.length).toBe(2)
    expect(been.match(/try \{/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('syncs through the two RPCs only, silently, and never without keys', () => {
    expect(sync).toContain("rpc('worker_away_been_list')")
    expect(sync).toContain("rpc('worker_away_been_set'")
    expect(sync).not.toContain(".from('worker_away_been')")
    expect(sync).toContain('portalConfigured()')
    expect(sync).toContain("event === 'SIGNED_IN'")
  })

  it('the migration keeps rule 89: worker_ prefix, RLS, security definer, no auth trigger, no table grant', () => {
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('revoke all on public.worker_away_been from public, anon, authenticated')
    expect(sql.match(/security definer set search_path = public/g)?.length).toBe(2)
    expect(sql).not.toMatch(/create\s+(or\s+replace\s+)?trigger/i)
    expect(sql).not.toMatch(/on\s+auth\./i)
    const created = [...sql.matchAll(/create (?:table if not exists|or replace function) public\.([a-z_]+)/g)].map((m) => m[1])
    expect(created.length).toBe(3)
    for (const name of created) expect(name).toMatch(/^worker_/)
    expect(read('scripts/db/verify.sh')).toContain('supabase/tests/50-away-been.sql')
  })
})

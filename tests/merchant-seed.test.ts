import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  MIGRATION_PATH,
  SEED_BEGIN,
  currentBlock,
  readSeedFile,
  seedRow,
  seedSql,
  spliceSeed,
} from '@/scripts/collector/merchant-seed'

/**
 * החנויות שנבדקו — הקובץ, ה-SQL, והכללים של §22–§27 ו-§77 (22.9.2026).
 *
 * `content/manual/merchant-offers.json` הוא המקור, והבלוק במיגרציה נגזר ממנו. הבדיקה הזו היא
 * מה שמונע משניהם להיפרד: שינוי ביד באחד מהם בלי להריץ את הסקריפט נופל כאן.
 */
const ROOT = join(__dirname, '..')
const FILE = readSeedFile(ROOT)
const MIGRATION = readFileSync(join(ROOT, MIGRATION_PATH), 'utf8')
const PHOTOS = new Set(
  (JSON.parse(readFileSync(join(ROOT, 'content/manual/kit-photos.json'), 'utf8')) as { records: { slug: string }[] }).records.map(
    (row) => row.slug,
  ),
)
const KITS = new Set(
  (JSON.parse(readFileSync(join(ROOT, 'content/generated/kit-master.json'), 'utf8')) as { kits: { id: string }[] }).kits.map(
    (kit) => kit.id,
  ),
)

describe('זרע החנויות — הקובץ והמיגרציה אומרים אותו דבר', () => {
  it('carries exactly the block the script generates from the JSON', () => {
    expect(currentBlock(MIGRATION), 'run: npx tsx scripts/collector/merchant-seed.ts').toBe(seedSql(FILE))
  })

  it('has one row in the SQL for every offer in the JSON, in order', () => {
    const block = currentBlock(MIGRATION) ?? ''
    for (const offer of FILE.offers) expect(block).toContain(seedRow(offer))
    expect(block.match(/^\s{2}\(/gm)?.length).toBe(FILE.offers.length)
  })

  it('sits just before the check block, once, and is idempotent on the unique index', () => {
    expect(MIGRATION.split(SEED_BEGIN).length).toBe(2)
    expect(MIGRATION.indexOf(SEED_BEGIN)).toBeLessThan(MIGRATION.indexOf('-- 22. בדיקה'))
    expect(MIGRATION.indexOf('-- 21. מנהל ראשון')).toBeLessThan(MIGRATION.indexOf(SEED_BEGIN))
    expect(seedSql(FILE)).toContain(
      "on conflict (product_url, (coalesce(archive_slug, '')), (coalesce(kit_id, '')), (coalesce(season_label, ''))) do nothing;",
    )
    // splicing twice is the same as splicing once
    expect(spliceSeed(MIGRATION, seedSql(FILE))).toBe(MIGRATION)
  })

  it('never carries a query string — no utm, no ref, no affiliate anything (§27)', () => {
    for (const offer of FILE.offers) {
      expect(offer.productUrl, offer.productUrl).toMatch(/^https:\/\/[^\s?#]+$/)
      expect(new URL(offer.productUrl).search, offer.productUrl).toBe('')
      if (offer.imageUrl) expect(new URL(offer.imageUrl).search).toBe('')
    }
    expect(currentBlock(MIGRATION) ?? '').not.toMatch(/https:\/\/[^'\s]*\?/)
  })

  it('calls only the club store official, and every Retro Jerseys product a replica (§23, §77)', () => {
    for (const offer of FILE.offers) {
      if (offer.offerType === 'official') expect(offer.isOfficialClubStore, offer.productUrl).toBe(true)
      if (offer.isOfficialClubStore) {
        expect(offer.merchantType).toBe('club_store')
        expect(new URL(offer.productUrl).host).toBe('shop.htafc.co.il')
      }
      if (new URL(offer.productUrl).host === 'www.retro-jerseys.com') {
        expect(offer.offerType, offer.productUrl).toBe('replica')
        expect(offer.isOfficialClubStore).toBe(false)
      }
    }
  })

  it('points only at archive shirts and kits that exist, and always at something', () => {
    for (const offer of FILE.offers) {
      expect(offer.archiveSlug ?? offer.kitId ?? offer.seasonLabel, offer.productUrl).not.toBeNull()
      if (offer.archiveSlug) expect(PHOTOS.has(offer.archiveSlug), offer.archiveSlug).toBe(true)
      if (offer.kitId) expect(KITS.has(offer.kitId), offer.kitId).toBe(true)
      if (offer.seasonLabel) expect(offer.seasonLabel).toMatch(/^\d{4}\/\d{2}$/)
    }
  })

  it('keeps the basketball store out: it is not a football shirt shop (rule 6)', () => {
    for (const offer of FILE.offers) expect(offer.productUrl).not.toContain('hapoelbc')
  })

  it('records the day it was checked', () => {
    expect(FILE.lastCheckedAt).toBe('2026-09-22')
    for (const offer of FILE.offers) expect(offer.lastCheckedAt).toBe(FILE.lastCheckedAt)
  })
})

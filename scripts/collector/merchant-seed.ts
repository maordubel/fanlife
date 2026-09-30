/**
 * זרע החנויות — מ-`content/manual/merchant-offers.json` לבלוק SQL אחד במיגרציה (22.9.2026).
 *
 *   npx tsx scripts/collector/merchant-seed.ts           # כותב את הבלוק לקובץ המיגרציה
 *   npx tsx scripts/collector/merchant-seed.ts --check   # נכשל אם הקובץ והמיגרציה נפרדו
 *
 * הקובץ הוא המקור; ה-SQL נגזר ממנו ולא נכתב ביד, כדי ששני המקומות לא יוכלו להיפרד — ו-
 * `tests/merchant-seed.test.ts` בודק את זה בכל ריצה. הבלוק יושב לפני בלוק הבדיקה (22) ומוחלף
 * במקומו בכל הרצה; הוא `insert … on conflict do nothing` על האינדקס הייחודי של הטבלה, כך
 * שהרצה חוזרת של המיגרציה לא משכפלת שורה ולא דורסת תיקון שמנהל עשה.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const JSON_PATH = 'content/manual/merchant-offers.json'
export const MIGRATION_PATH = 'supabase/migrations/20260922120000_worker_collector_market.sql'

export const SEED_BEGIN = '-- >>> merchant-seed · נוצר מ-content/manual/merchant-offers.json ב-scripts/collector/merchant-seed.ts — לא לערוך ביד'
export const SEED_END = '-- <<< merchant-seed'
/** the heading line of the check block the seed sits in front of */
const CHECK_HEADING = '-- 22. בדיקה'
const RULE = '-- ====================================================================='

export type SeedOffer = {
  archiveSlug: string | null
  kitId: string | null
  seasonLabel: string | null
  merchantName: string
  merchantType: 'club_store' | 'retro_store' | 'other'
  offerType: 'official' | 'official_reissue' | 'replica' | 'external_new'
  isOfficialClubStore: boolean
  title: string | null
  price: number | null
  currency: 'ILS' | 'EUR' | 'USD'
  productUrl: string
  imageUrl: string | null
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  lastCheckedAt: string | null
  sortRank: number
}

export type SeedFile = { lastCheckedAt: string; offers: SeedOffer[] }

export const COLUMNS = [
  'archive_slug', 'kit_id', 'season_label', 'merchant_name', 'merchant_type', 'offer_type', 'title_he',
  'price', 'currency', 'product_url', 'image_url', 'availability', 'last_checked_at',
  'is_official_club_store', 'is_active', 'sort_rank',
] as const

const text = (value: string | null): string => (value === null ? 'null' : `'${value.replace(/'/g, "''")}'`)
const num = (value: number | null): string => (value === null ? 'null' : String(value))

/** One row of the VALUES list, in `COLUMNS` order. */
export function seedRow(offer: SeedOffer): string {
  return `(${[
    text(offer.archiveSlug),
    text(offer.kitId),
    text(offer.seasonLabel),
    text(offer.merchantName),
    text(offer.merchantType),
    text(offer.offerType),
    text(offer.title),
    num(offer.price),
    text(offer.currency),
    text(offer.productUrl),
    text(offer.imageUrl),
    text(offer.availability),
    offer.lastCheckedAt === null ? 'null' : `date ${text(offer.lastCheckedAt)}`,
    offer.isOfficialClubStore ? 'true' : 'false',
    'true',
    String(offer.sortRank),
  ].join(', ')})`
}

/** The whole generated block, markers included. */
export function seedSql(file: SeedFile): string {
  const official = file.offers.filter((offer) => offer.isOfficialClubStore).length
  const replica = file.offers.filter((offer) => offer.offerType === 'replica').length
  return [
    SEED_BEGIN,
    RULE,
    '-- 21ב. חנויות שנבדקו — זרע (מפרט §22–§27, §77)',
    RULE,
    `-- ${file.offers.length} מוצרים שנקראו ב-${file.lastCheckedAt}: ${official} מהחנות הרשמית של המועדון (official), ${replica} שחזורים`,
    '-- (replica — לעולם לא "רשמי", גם כשהחנות עצמה כותבת כך). הכתובות בלי שום פרמטר, בלי עמלה.',
    '-- הרצה חוזרת לא משכפלת ולא דורסת: on conflict על האינדקס הייחודי של הטבלה. מנהל שעדכן מחיר או',
    '-- כיבה שורה — התיקון שלו נשאר. המקור והנימוקים: content/manual/merchant-offers.json.',
    `insert into public.worker_merchant_offer (${COLUMNS.join(', ')})`,
    'values',
    file.offers.map((offer) => `  ${seedRow(offer)}`).join(',\n'),
    "on conflict (product_url, (coalesce(archive_slug, '')), (coalesce(kit_id, '')), (coalesce(season_label, ''))) do nothing;",
    SEED_END,
  ].join('\n')
}

/** Put the block in the migration: in place of the previous one, or in front of the check block. */
export function spliceSeed(migration: string, block: string): string {
  const begin = migration.indexOf(SEED_BEGIN)
  if (begin !== -1) {
    const end = migration.indexOf(SEED_END, begin)
    if (end === -1) throw new Error('merchant-seed: the begin marker has no end marker')
    return migration.slice(0, begin) + block + migration.slice(end + SEED_END.length)
  }
  const heading = migration.indexOf(CHECK_HEADING)
  if (heading === -1) throw new Error('merchant-seed: the check block (22) was not found')
  const rule = migration.lastIndexOf(RULE, heading)
  if (rule === -1) throw new Error('merchant-seed: the check block has no rule above it')
  return `${migration.slice(0, rule)}${block}\n\n${migration.slice(rule)}`
}

/** The block exactly as it sits in the migration today, or null. */
export function currentBlock(migration: string): string | null {
  const begin = migration.indexOf(SEED_BEGIN)
  if (begin === -1) return null
  const end = migration.indexOf(SEED_END, begin)
  return end === -1 ? null : migration.slice(begin, end + SEED_END.length)
}

export function readSeedFile(root = process.cwd()): SeedFile {
  return JSON.parse(readFileSync(join(root, JSON_PATH), 'utf8')) as SeedFile
}

function main(): void {
  const root = process.cwd()
  const block = seedSql(readSeedFile(root))
  const path = join(root, MIGRATION_PATH)
  const migration = readFileSync(path, 'utf8')
  if (process.argv.includes('--check')) {
    if (currentBlock(migration) !== block) {
      console.error('merchant-seed: the migration does not match content/manual/merchant-offers.json — run without --check')
      process.exit(1)
    }
    console.log('merchant-seed: in sync')
    return
  }
  writeFileSync(path, spliceSeed(migration, block))
  console.log(`merchant-seed: wrote ${block.split('\n').length} lines into ${MIGRATION_PATH}`)
}

if (process.argv[1]?.endsWith('merchant-seed.ts')) main()

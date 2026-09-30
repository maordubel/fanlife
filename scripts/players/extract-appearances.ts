/**
 * npm run players:appearances — reads two infobox fields off ויקיפועל's own player
 * pages (content/raw/vikipoel-player-wikitext.json, already on disk — no network) and writes
 * the ones that state a number to content/manual/player-appearances.json, and `מנגינת שיר שחקן`
 * (the TUNE of the terrace's song for him — a title, never a verse: rule 12) to
 * content/manual/player-song-tunes.json.
 *
 * What this is and is not (rule 11): the wiki's infobox field, quoted as the page wrote it —
 * `143 (2 שערים)` → 143 appearances. It is present on ~108 of 641 pages. A page with the field
 * empty, absent or unreadable gets NO row — never a guess, never the season count standing in
 * for appearances. Pages resolve to a player through the alias table only (rule 7).
 */
import Module from 'node:module'
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolve = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(process.cwd(), 'tests/stubs/server-only.ts')
  return resolve.call(this, request, ...rest)
}

const ROOT = process.cwd()
const OUT = join(ROOT, 'content/manual/player-appearances.json')
const OUT_TUNES = join(ROOT, 'content/manual/player-song-tunes.json')

type Page = { pageid: number; title: string; revisions: Array<{ revid: number; slots: { main: { content: string } } }> }

async function main() {
  const { resolvePlayer } = await import('../../lib/archive/player-master')
  const pages = JSON.parse(readFileSync(join(ROOT, 'content/raw/vikipoel-player-wikitext.json'), 'utf8')) as Page[]
  const records: Array<{ playerId: string; slug: string; appearances: number; goalsInBox: number | null; raw: string; pageTitle: string; pageId: number; revisionId: number }> = []
  const skipped: Array<{ title: string; reason: string; raw?: string }> = []
  const tunes: Array<{ playerId: string; slug: string; tuneHe: string; raw: string; pageTitle: string; pageId: number; revisionId: number }> = []
  const tuneSkipped: Array<{ title: string; reason: string; raw: string }> = []
  for (const page of pages) {
    const rev = page.revisions[0]
    const text = rev?.slots.main.content ?? ''
    const tuneRaw = (text.match(/\n\s*\|\s*מנגינת שיר שחקן\s*=([^\n]*)/)?.[1] ?? '').trim()
    if (tuneRaw !== '' && tuneRaw !== '-') {
      // one linked title or one plain title; two links, a link to a page, or a sentence is not a tune label
      const label = tuneRaw.replace(/^\[https?:\/\/\S+\s+([^\]]*)\]$/, '$1').trim()
      const player = resolvePlayer(page.title)
      if (!player) tuneSkipped.push({ title: page.title, reason: 'no player resolves', raw: tuneRaw })
      else if (label === '' || /[\[\]]|https?:/.test(label) || label.length > 48) tuneSkipped.push({ title: page.title, reason: 'not a single title', raw: tuneRaw })
      else tunes.push({ playerId: player.id, slug: player.slug, tuneHe: label, raw: tuneRaw, pageTitle: page.title, pageId: page.pageid, revisionId: rev!.revid })
    }
    const m = text.match(/\n\s*\|\s*הופעות\s*=([^\n]*)/)
    const raw = (m?.[1] ?? '').trim()
    if (!m || raw === '' || raw === '-') continue
    // a leading number the page states as its appearances; what follows (goals, "בליגה") stays in `raw`
    const parsed = raw.match(/^(\d{1,4})(?:\s*\((\d{1,4})\s*שער(?:ים)?\))?(?=$|\s|\()/)
    if (!parsed) {
      skipped.push({ title: page.title, reason: 'unreadable', raw })
      continue
    }
    const player = resolvePlayer(page.title)
    if (!player) {
      skipped.push({ title: page.title, reason: 'no player resolves', raw })
      continue
    }
    records.push({
      playerId: player.id,
      slug: player.slug,
      appearances: Number(parsed[1]),
      goalsInBox: parsed[2] ? Number(parsed[2]) : null,
      raw,
      pageTitle: page.title,
      pageId: page.pageid,
      revisionId: rev!.revid,
    })
  }
  records.sort((a, b) => a.slug.localeCompare(b.slug))
  const seen = new Set<string>()
  const unique = records.filter((r) => (seen.has(r.playerId) ? false : (seen.add(r.playerId), true)))
  const out = {
    schemaVersion: 1,
    source: 'ויקיפועל — תיבת המידע של דף השחקן, השדה "הופעות" (content/raw/vikipoel-player-wikitext.json)',
    note: 'מספר כפי שהדף כתב אותו. דף בלי מספר אינו כאן; לא ממלאים מספר עונות במקום הופעות (כלל 11).',
    counts: { records: unique.length, skipped: skipped.length },
    skipped,
    records: unique,
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
  const tuneSeen = new Set<string>()
  const tuneRows = tunes.filter((r) => (tuneSeen.has(r.playerId) ? false : (tuneSeen.add(r.playerId), true))).sort((a, b) => a.slug.localeCompare(b.slug))
  writeFileSync(
    OUT_TUNES,
    JSON.stringify(
      {
        schemaVersion: 1,
        source: 'ויקיפועל — תיבת המידע של דף השחקן, השדה "מנגינת שיר שחקן" (content/raw/vikipoel-player-wikitext.json)',
        note: 'שם המנגינה בלבד — לא מילות השיר (כלל 12). דף עם כמה קישורים או בלי כותרת בודדת אינו כאן.',
        counts: { records: tuneRows.length, skipped: tuneSkipped.length },
        skipped: tuneSkipped,
        records: tuneRows,
      },
      null,
      1,
    ) + '\n',
  )
  console.log(`player-song-tunes: ${tuneRows.length} rows · skipped ${tuneSkipped.length}`)
  console.log(`player-appearances: ${unique.length} rows · skipped ${skipped.length}`)
  for (const s of skipped) console.log(`  skipped ${s.title}: ${s.reason} ${s.raw ?? ''}`)
}
void main()

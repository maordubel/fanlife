/**
 * LIFE → the film studio: the interstitials the story needs, per club.
 *
 *   node --require ./scripts/master/server-only.cjs --import tsx scripts/life/transition-requests.ts [club-id …] [--check]
 *
 * Reads the story graph (`lib/life/hood/story`), each core club's own Fitter rows, asked chapter by chapter (`rushView` + `chapterFits`) and its
 * proposed birth year (`club-packs/<id>/life/timeline.json`), and writes ONE request manifest where the studio keeps
 * its own inputs: `scripts/football-stories/life/transition-requests.json`. A request is a title card, a time-advance
 * bridge or a matchday opener, in 9:16 and 16:9, with the archive night only where the Fitter bound one.
 *
 * It renders nothing, uploads nothing and publishes nothing. `--check` writes nothing and exits 1 when the file on
 * disk is not what the story asks for today. The studio hook is described in docs/life/LIFE-STORY-FLOW-2026-11-23.md §7.
 */
import {readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

process.env.FANLIFE_PRECOMPILED ??= 'off'
const OUT = 'scripts/football-stories/life/transition-requests.json'

async function main() {
  const {CORE_CLUB_IDS, loadClub} = await import('@/lib/clubs/resolver')
  const {rushView} = await import('@/lib/clubs/life/rush')
  const {chapterFits} = await import('@/lib/life/hood/story/night')
  const {LIFE_TIMELINE} = await import('@/lib/clubs/life/packs')
  const {manifestOf} = await import('@/lib/life/hood/story/requests')

  const args = process.argv.slice(2), check = args.includes('--check')
  const only = args.filter(a => !a.startsWith('-'))
  const ids = only.length ? only : [...CORE_CLUB_IDS]
  const clubs: Parameters<typeof manifestOf>[0] = {}
  for (const id of ids) {
    const club = await loadClub(id)
    if (!club) { console.log(`!! ${id}: not loadable — no requests`); continue }
    const birth = (LIFE_TIMELINE as Record<string, {birthYear?: number} | undefined>)[id]?.birthYear
    const birthYear = typeof birth === 'number' ? birth : null
    clubs[id] = {birthYear, fits: chapterFits(rushView(club.data), birthYear)}
  }
  const manifest = manifestOf(clubs)
  const text = JSON.stringify(manifest, null, 1) + '\n'
  for (const [id, c] of Object.entries(manifest.clubs)) {
    const dated = c.requests.filter(r => r.night)
    console.log(`${id.padEnd(20)} ${String(c.requests.length).padStart(3)} clips · ${dated.length} on an archive night${dated.length ? ` (${[...new Set(dated.map(r => `${r.chapter} ${r.night!.on ?? r.night!.year}`))].join(', ')})` : ''}`)
  }
  const path = join(process.cwd(), OUT)
  if (check) {
    let disk = ''
    try { disk = readFileSync(path, 'utf8') } catch { /* not written yet */ }
    if (disk !== text) { console.error(`${OUT} is stale: run scripts/life/transition-requests.ts`); process.exit(1) }
    console.log(`${OUT} is current`)
    return
  }
  if (only.length) { console.log('a partial run prints and does not write (the manifest is always every core club)'); return }
  writeFileSync(path, text)
  console.log(`wrote ${OUT}`)
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1) })

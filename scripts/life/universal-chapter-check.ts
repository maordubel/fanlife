/**
 * The gate a universal LIFE chapter passes before it is registered.
 *
 *   npx tsx scripts/life/universal-chapter-check.ts lib/life/universal/content/c2-shirt.ts [more files…]
 *
 * For every Chapter a file exports it runs, with the game's own functions:
 *  · the validator (rooms, slots, talks, flags, endings);
 *  · the exhaustive simulator, twice — as a life that kept nothing and as one that kept everything —
 *    and fails on a state from which the day can no longer end, on an ending nothing reaches,
 *    and on a chapter whose state space does not close (an effect that can be farmed);
 *  · the truth rules a universal chapter lives by: an age and never a year, no scoreline, no
 *    real club, no token the composer cannot fill.
 * Exit code 1 on any fault.
 */
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {buildCast} from '../../lib/life/universal/cast'
import {HERO_LOOKS} from '../../lib/life/universal/cast'
import {ROOMS} from '../../lib/life/universal/rooms'
import {simulate} from '../../lib/life/universal/sim'
import {fillChapter, mapText} from '../../lib/life/universal/text'
import type {Chapter, LifeEvent, LifePack} from '../../lib/life/universal/types'
import {validateChapter} from '../../lib/life/universal/validate'

export const TEST_VARS = {
  club: 'Testborough Athletic', short: 'Testborough', city: 'Testborough', ground: 'the ground',
  friend: 'Friend', kiosk: 'Kiosk', elder: 'Old supporter', rival: 'Classmate', teacher: 'Teacher',
  boss: 'Boss', mate: 'Workmate', seller: 'Scarf seller', child: 'The little one', dadName: 'your father', mumName: 'your mother',
}

/** What earlier chapters may have left in the box. A chapter has to play with all of it and with none of it. */
export const EARLIER_KEEPS = ['scarf', 'shirt', 'ticket', 'armband', 'stub', 'brush', 'parcel', 'second-scarf']
/** `life:` flags the chapters before may have raised (see docs/fanlife/33). */
export const EARLIER_FLAGS = ['life:sang', 'life:went-alone', 'life:stood-up', 'life:travelled', 'life:chose-match', 'life:chose-work', 'life:called-home', 'life:brought-child']

const YEAR = /\b(1[89]\d\d|20\d\d)\b/
const SCORE = /\b\d+\s*[–—:-]\s*\d+\b/
const BANNED = /\b(maccabi|hapoel|olympiacos|zrinjski|panathinaikos|vele[zž]|beitar|bloomfield|karaiskakis|uefa|fifa)\b/i

export function textFaults(chapter: Chapter): string[] {
  const out: string[] = []
  mapText(chapter, (t, id) => {
    if (YEAR.test(t)) out.push(`${id}: states a year — a universal chapter has an age, never a year`)
    if (SCORE.test(t)) out.push(`${id}: looks like a scoreline — a universal chapter states no result`)
    if (BANNED.test(t)) out.push(`${id}: names a real club, ground or body`)
    if (/[֐-׿Ͱ-Ͽ]/.test(t)) out.push(`${id}: source text is English`)
    if (t !== t.trim() || / {2,}/.test(t)) out.push(`${id}: stray whitespace`)
    return t
  })
  return out
}

export function packFor(chapter: Chapter): LifePack {
  const cast = buildCast(null)
  return {
    schemaVersion: 1, version: 'check', clubId: 'test', club: {name: TEST_VARS.club, short: 'TST', city: TEST_VARS.city, country: 'XX'},
    skin: {} as LifePack['skin'], cast, hero: {birthYear: null, looks: HERO_LOOKS}, chapters: [chapter], rooms: ROOMS,
    readiness: {state: 'PARTIAL', playable: true, reasons: [], anchors: 0, target: 8}, anchors: [],
    provenance: {kind: 'generated-from-anchors', universalChapters: 1, anchoredChapters: 0, cultureDna: 'pending'},
  }
}

export function checkChapter(raw: Chapter): {faults: string[]; report: string} {
  const faults: string[] = []
  faults.push(...textFaults(raw))
  let chapter: Chapter
  try { chapter = fillChapter(raw, TEST_VARS) } catch (e) { return {faults: [...faults, String((e as Error).message)], report: ''} }
  const pack = packFor(chapter)
  faults.push(...validateChapter(pack, chapter, new Set(EARLIER_FLAGS)))
  const seeds: [string, LifeEvent[]][] = [
    ['a life that kept nothing', []],
    ['a life that kept everything', [...EARLIER_KEEPS.map(item => ({t: 'keep', item}) as LifeEvent), ...EARLIER_FLAGS.map(k => ({t: 'flag', k, v: true}) as LifeEvent), {t: 'wear', what: 'both'}]],
  ]
  const lines: string[] = []
  const reached = new Set<string>()
  for (const [name, seed] of seeds) {
    const r = simulate(pack, chapter, seed, 60000)
    r.endings.forEach(e => reached.add(e))
    lines.push(`  ${name}: ${r.states} states · endings ${r.endings.join(', ') || '—'}${r.truncated ? ' · DID NOT CLOSE' : ''}`)
    if (r.truncated) faults.push(`${chapter.id}: the state space does not close (${name}) — some heart/bond/coins effect can be repeated; gate it behind a flag`)
    if (!r.endings.length) faults.push(`${chapter.id}: no ending can be reached (${name})`)
    for (const s of r.stuck) faults.push(`${chapter.id}: a state the day cannot end from (${name}): ${s}`)
  }
  for (const key of Object.keys(chapter.endings)) if (!reached.has(key)) faults.push(`${chapter.id}: ending "${key}" is never reached by any way of playing`)
  const words = (() => { let n = 0; mapText(chapter, t => { n += t.split(/\s+/).length; return t }); return n })()
  return {faults, report: `${chapter.id} · age ${chapter.age} · ${chapter.talks.length} talks · ${words} words\n${lines.join('\n')}`}
}

async function main() {
  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: universal-chapter-check.ts <chapter file>…'); process.exit(2) }
  let bad = 0
  for (const file of files) {
    const mod = await import(pathToFileURL(path.resolve(file)).href) as Record<string, unknown>
    const chapters = Object.values(mod).filter((v): v is Chapter => !!v && typeof v === 'object' && 'talks' in v && 'endings' in v && 'id' in v)
    if (!chapters.length) { console.error(`${file}: exports no Chapter`); bad++; continue }
    for (const c of chapters) {
      const {faults, report} = checkChapter(c)
      console.log(report)
      for (const f of faults) console.log(`  ✗ ${f}`)
      if (!faults.length) console.log('  ✓ passes')
      bad += faults.length
    }
  }
  process.exit(bad ? 1 : 0)
}

if (process.argv[1] && /universal-chapter-check/.test(process.argv[1])) void main()

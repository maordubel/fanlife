/**
 * `npm run life:sync` — מי שמדבר בשיחה, איפה הוא עומד (`lib/life/world/sync.ts`, כלל 85).
 *
 * מדפיס טבלה לפי פרק: לכל ביט, לכל דובר — בחדר, בטלפון, במקום אחר, נכנס לצד פוגי, או
 * **חסר**. חסר הוא כשל. ביט כניסה שמסתמך על מלווה מודפס כאזהרה: בחדר שהסצנה כתובה לו,
 * האנשים מחכים — הם לא נכנסים אחריו.
 */
import { syncRows, type SyncRow } from '../../lib/life/world/sync'

const rows = syncRows()
const MARK: Record<SyncRow['verdict'], string> = { staged: '●', remote: '☎', elsewhere: '◇', companion: '→', missing: '✗' }
const byChapter = new Map<string, SyncRow[]>()
for (const row of rows) byChapter.set(row.chapter, [...(byChapter.get(row.chapter) ?? []), row])

for (const [chapter, list] of byChapter) {
  console.log(`\n${chapter}`)
  const beats = new Map<string, SyncRow[]>()
  for (const row of list) beats.set(`${row.beat}|${row.room ?? '—'}|${row.trigger}`, [...(beats.get(`${row.beat}|${row.room ?? '—'}|${row.trigger}`) ?? []), row])
  for (const [key, group] of beats) {
    const [beat, room, trigger] = key.split('|')
    console.log(`  ${beat!.padEnd(18)} ${`${room}/${trigger}`.padEnd(28)} ${group.map((row) => `${MARK[row.verdict]} ${row.who}`).join('  ')}`)
  }
}

const missing = rows.filter((row) => row.verdict === 'missing')
const walkIn = rows.filter((row) => row.verdict === 'companion' && row.trigger === 'enter' && row.room)
const count = (verdict: SyncRow['verdict']) => rows.filter((row) => row.verdict === verdict).length
console.log(`\n=== ${rows.length} דוברים · ● בחדר ${count('staged')} · ☎ בטלפון ${count('remote')} · ◇ במקום אחר ${count('elsewhere')} · → נכנס ${count('companion')} · ✗ חסר ${missing.length} ===`)
if (walkIn.length) {
  console.log(`\nאזהרה — ביט כניסה שהאנשים שלו נכנסים אחריו במקום לחכות (${walkIn.length}):`)
  for (const row of walkIn) console.log(`  ${row.chapter} · ${row.beat} @${row.room} · ${row.who}`)
}
if (missing.length) {
  console.log('\nחסרים:')
  for (const row of missing) console.log(`  ${row.chapter} · ${row.beat} @${row.room ?? 'שעון'} · ${row.who} (${row.conversation})`)
  console.log('\nFAIL — מישהו מדבר, ואין לו מקום על המסך')
  process.exit(1)
}
console.log('\nPASS — כל מי שמדבר עומד בחדר, בטלפון, במקום אחר, או נכנס לצד פוגי')

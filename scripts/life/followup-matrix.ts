/**
 * `npm run life:followups` — writes the Batch 0 matrix (design pass v2 §25) to
 * `tests/fixtures/life-followup-matrix.json`: every conversation a player can open again
 * while a mandatory next step is open, what it said before the follow-up resolver (the
 * generic pool), and what it says now. Prints a summary per class.
 *
 * `--baseline` also keeps the file's existing `today` column when a row already exists, so
 * the "before" answer is never overwritten by a later run.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildMatrix, type MatrixRow } from '../../tests/fixtures/followupMatrix'

const OUT = resolve(__dirname, '../../tests/fixtures/life-followup-matrix.json')

const rows = buildMatrix()
const previous: MatrixRow[] = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).rows ?? []) : []
const before = new Map(previous.map((row) => [`${row.chapter}|${row.conversation}|${row.branch}|${row.step}`, row]))
for (const row of rows) {
  const old = before.get(`${row.chapter}|${row.conversation}|${row.branch}|${row.step}`)
  if (old) row.today = old.today
}

const byClass = new Map<string, number>()
for (const row of rows) for (const tag of row.now) {
  const cls = tag.split(':')[0] + (tag.includes(':generic') ? '(generic)' : tag.includes(':closer:') ? '(closer)' : '')
  byClass.set(cls, (byClass.get(cls) ?? 0) + 1)
}
const people = rows.filter((row) => row.who)
const generic = people.filter((row) => row.now.some((tag) => tag.endsWith(':generic')))

writeFileSync(
  OUT,
  `${JSON.stringify({ generated: '25.9.2026 · design pass v2 Batch 0', rows }, null, 1)}\n`,
)
console.log(`rows: ${rows.length} (people ${people.length}, things ${rows.length - people.length})`)
for (const [cls, count] of [...byClass.entries()].sort()) console.log(`  ${cls}: ${count}`)
console.log(`people still answered by the generic pool: ${generic.length}`)
for (const row of generic) console.log(`  ${row.chapter} · ${row.conversation}#${row.branch} · ${row.who} · step ${row.step} (${row.stepHe})`)

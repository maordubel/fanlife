/**
 * npm run blind-cow:build — builds gate 10's question bank from the two canonical masters.
 *
 *   content/generated/player-master.json ─┐
 *   content/generated/match-master.json  ─┼─► lib/game/blind-cow/build.ts ─► content/generated/blind-cow-bank.json
 *   content/generated/entity-graph.json  ─┘   (team names)                  └► the duel seed block inside
 *   content/manual/competitions.json          (competition names)              supabase/migrations/20260924090000_worker_blind_cow.sql
 *
 * The seed block is regenerated between its two marker lines (and the expected count in
 * the file's check line); nothing else in the SQL file is touched. A question whose facts
 * changed gets a new version — the old version's row stays in the database, so a duel
 * already created on it finishes on what it started with.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { buildBank } from '@/lib/game/blind-cow/build'
import { duelSeedSql, SEED_BEGIN, SEED_END } from '@/lib/game/blind-cow/seed-sql'

import { BANK_PATH, readInputs, SQL_PATH } from './inputs'

const bank = buildBank(readInputs())
writeFileSync(BANK_PATH, JSON.stringify(bank, null, 1) + '\n')

if (existsSync(SQL_PATH)) {
  const sql = readFileSync(SQL_PATH, 'utf8')
  const a = sql.indexOf(SEED_BEGIN)
  const b = sql.indexOf(SEED_END)
  if (a < 0 || b < a) throw new Error('seed markers missing in the blind cow migration')
  const duel = bank.questions.filter((q) => q.eligibleModes.includes('duel')).length
  // the check line the owner compares against names the seed's own count
  const next = (sql.slice(0, a) + duelSeedSql(bank) + sql.slice(b + SEED_END.length)).replace(
    /duel_questions \d+/g,
    `duel_questions ${duel}`,
  )
  if (next !== sql) writeFileSync(SQL_PATH, next)
}

const c = bank.counts
console.log(
  `blind-cow bank v${bank.bankVersion}: pool ${c.players} · questions ${c.withQuestion} · solo ${c.solo} · daily ${c.daily} · duel ${c.duel} · hardcore ${c.hardcore} · clues ${c.clues}`,
)
console.log(`  eligible matches ${c.eligibleMatches} · verified goals ${c.eligibleGoals} · by type ${JSON.stringify(c.byType)}`)

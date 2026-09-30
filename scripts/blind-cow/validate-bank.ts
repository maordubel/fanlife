/**
 * npm run blind-cow:validate — the bank is checked, not trusted.
 *
 * Fails (exit 1) on: a clue that names its man, two clues of one facet back to back, a
 * clue that narrows nothing, a shirt number without its season, a career total, a clue
 * with no provenance, a competitive question with fewer than 10 clues / 3 families or a
 * tenth clue that does not settle it — and on a bank that is not what a fresh build
 * produces from the same masters (the file is generated, never hand-edited), or a duel
 * seed in the migration that is not this bank's.
 */
import { readFileSync } from 'node:fs'

import { buildBank } from '@/lib/game/blind-cow/build'
import { duelSeedSql } from '@/lib/game/blind-cow/seed-sql'
import { validateBank } from '@/lib/game/blind-cow/validate'

import { readBank, readInputs, SQL_PATH } from './inputs'

const bank = readBank()
if (!bank) {
  console.error('content/generated/blind-cow-bank.json is missing — run npm run blind-cow:build')
  process.exit(1)
}
const input = readInputs(bank)
const problems = validateBank(bank, input.players)
if (JSON.stringify(buildBank(input)) !== JSON.stringify(bank)) {
  problems.push('the bank is not what a fresh build makes from the same masters — run npm run blind-cow:build')
}
if (!readFileSync(SQL_PATH, 'utf8').includes(duelSeedSql(bank))) {
  problems.push('the duel seed in the migration is not this bank — run npm run blind-cow:build')
}
const c = bank.counts
console.log(`blind-cow bank v${bank.bankVersion}: solo ${c.solo} · daily ${c.daily} · duel ${c.duel} · hardcore ${c.hardcore}`)
if (problems.length) {
  for (const line of problems.slice(0, 40)) console.error(`  ✗ ${line}`)
  console.error(`${problems.length} problem(s)`)
  process.exit(1)
}
console.log('clean')

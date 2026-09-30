/**
 * npm run away-days:report — the research queue, printed for a person (spec §18.2, §33).
 *
 * One block per match that is NOT on the public journey: its date, the tie, what is
 * missing and every reason, with the sources that were read. Reads the committed master;
 * writes nothing. `-- --json` prints the raw queue instead.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { AwayDaysMaster } from '@/lib/away-days/types'
import { AWAY_DAYS_OUT } from './build-master'

export function researchReport(master: AwayDaysMaster): string {
  const lines: string[] = []
  const c = master.counts
  lines.push(`AWAY DAYS — research queue`)
  lines.push(`candidates ${c.candidates} · public ${c.visits} (${c.stops} grounds, ${c.countries} countries) · in research ${c.researchQueue} · in Israel ${c.inIsrael}`)
  lines.push(`by status: CONFLICT ${c.byStatus.CONFLICT} · BLOCKED ${c.byStatus.BLOCKED} · PARTIAL ${c.byStatus.PARTIAL}`)
  const order = { CONFLICT: 0, BLOCKED: 1, PARTIAL: 2 }
  const items = [...master.researchQueue].sort((a, b) => order[a.status] - order[b.status] || (a.playedOn ?? '').localeCompare(b.playedOn ?? ''))
  for (const item of items) {
    lines.push('')
    const score = item.score ? `${item.score.for}:${item.score.against}` : 'no result'
    lines.push(`${item.status}  ${item.playedOn ?? 'date ?'}  ${item.matchId}  ${item.competitionHe} · ${item.stageHe ?? ''} · ${item.opponentHe ?? 'opponent ?'} · ${score} · ${item.designatedSide ?? 'side ?'}`)
    lines.push(`  venue: ${item.venueId ?? '—'} · country: ${item.countryCode ?? '?'}${item.missing.length ? ` · missing: ${item.missing.join(', ')}` : ''}`)
    for (const reason of item.reasons) lines.push(`  - ${reason.code}: ${reason.detail}`)
    for (const candidate of item.candidates) lines.push(`  ? candidate: ${candidate}`)
    lines.push(`  sources: ${item.sourceRefs.join(' · ')}`)
  }
  return lines.join('\n')
}

if (process.argv[1] && /research-report\.ts$/.test(process.argv[1])) {
  const master = JSON.parse(readFileSync(join(process.cwd(), AWAY_DAYS_OUT), 'utf8')) as AwayDaysMaster
  console.log(process.argv.includes('--json') ? JSON.stringify(master.researchQueue, null, 1) : researchReport(master))
}

/**
 * npm run rumble:report — the OWNER-REVIEW report for Gate 9 (Deep QA 29.9.2026, §11 and §15).
 *
 * Not a verdict. It puts every canonical €5 next to the men the historical lists name as club
 * pillars (appearances, goals, captaincy), so the ten is a decision somebody makes with the
 * evidence open — never the by-product of a formula. Writes docs/royal-rumble-owner-audit.md.
 */
import Module from 'node:module'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolve = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(process.cwd(), 'tests/stubs/server-only.ts')
  return resolve.call(this, request, ...rest)
}

/** the men the QA file asks to be compared with the weakest €5 candidates */
const REVIEW_NAMES = ['יעקב אקהויז', 'אריה בז׳רנו', "אריה בז'רנו", 'שייע פייגנבוים', 'יחזקאל חזום', 'שביט אלימלך', 'יגאל אנטבי', 'יעקב רחמינוביץ׳', "יעקב רחמינוביץ'"]

async function main() {
  const engine = await import('../../lib/game/royal-rumble')
  const { reportOf } = await import('../../lib/game/royal-rumble-audit')
  const players = engine.royalRumbleAuditView().players
  const audit = players.map((p) => ({ ...p }))
  const report = reportOf(audit as never)
  const line = (p: (typeof players)[number]) => {
    const e = p.evidence
    return `| ${p.nameHe} | ${p.position} | ${p.fromYear ?? '—'} | ${e.seasons} | ${e.titles} | ${e.goals} | ${e.lineups} | ${e.moments} | ${e.captain ? 'כן' : ''} | ${e.songs} | ${p.rating} | ${p.confidence} | €${p.price}${p.overridden ? ` (${p.overrideReasonHe ?? 'override'})` : ''} |`
  }
  const head = '| שם | עמדה | מ- | עונות | תארים | שערים | פתיחות מתועדות | רגעים | קפטן | שירים | Rating | ביטחון | מחיר |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|'
  const named = players.filter((p) => REVIEW_NAMES.some((n) => p.nameHe.includes(n.replace(/[׳']/g, '')) || p.nameHe === n))
  const fives = players.filter((p) => p.price === 5)
  const out = [
    '# Royal Rumble — owner audit (מחולל)\n',
    'נוצר מ-`npm run rumble:report`. אינו הכרעה: עשרת ה-€5 הם החלטת בעלים.\n',
    '## עשרת ה-€5 הנוכחיים\n', head, ...fives.map(line),
    '\n## המועמדים שה-QA ביקש להשוות\n', head, ...named.map(line),
    '\n## Top 30 (Rating נסתר)\n', head, ...report.top30.map((p) => line(players.find((x) => x.slug === p.slug)!)),
    '\n## הגבוה ביותר בכל מחיר\n',
    ...([4, 3, 2, 1] as const).flatMap((tier) => [`### €${tier}\n`, head, ...report.highestByTier[tier].map((p) => line(players.find((x) => x.slug === p.slug)!)), '']),
    '\n## חריגים לסקירה\n', ...report.anomalies.map((a) => `- **${a.kind}** — ${a.nameHe}: ${a.detail}`),
  ].join('\n')
  writeFileSync('docs/royal-rumble-owner-audit.md', out + '\n')
  console.log(`written docs/royal-rumble-owner-audit.md · fives ${fives.length} · named ${named.length} · anomalies ${report.anomalies.length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })

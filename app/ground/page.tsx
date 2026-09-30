import { AwayDaysStrip } from '@/components/gates/AwayDaysStrip'
import { NowLayer } from '@/components/home/NowLayer'
import { TunnelPlate } from '@/components/life/TunnelPlate'
import { Screen } from '@/components/ui/Screen'
import { GatePlate } from '@/components/gates/GatePlate'
import { Intro } from '@/components/ui/Intro'
import { StructuredData } from '@/components/seo/StructuredData'
import { greetingKey, hourInIsrael } from '@/lib/daily/copy'
import { resolveDaily } from '@/lib/daily/resolve'
import { todayInIsrael } from '@/lib/date/israel'
import { GATES, wallOrder } from '@/lib/gates'
import { t } from '@/lib/i18n'

/**
 * בלומפילד — the ground.
 *
 * The screen is the gate plan and nothing else. A player does not pick a mode from a
 * list; they walk in by a gate, and each gate carries its own printed bill.
 *
 * Three things used to sit here and have been taken out rather than explained, because
 * none of them could say what it was for: a "lighting streak" tower that counted
 * nothing, a "today's sheet" that was placeholder copy, and a "paste a new sheet"
 * button that went to trivia. A screen that has to be explained is a screen that is
 * wrong.
 *
 * 28.9.2026 — ONE RED WORLD §55: a "now" layer sits ABOVE the wall, never instead of it —
 * a greeting, היום בהפועל (three things for today's Israel date, `lib/daily`), and the
 * device's own way back into the archive and LIFE. The wall is untouched under it, and the
 * opening still plays over all of it (rule 30). The daily is resolved here, on the server,
 * for the date it is in Tel Aviv; the page is re-rendered every five minutes so the day
 * turns over at midnight there, not at midnight UTC.
 */
export const revalidate = 300

export default function BloomfieldPage() {
  const now = new Date()
  const daily = resolveDaily(todayInIsrael(now))
  return (
    <Screen title={t('screen.home.title')} sub={t('screen.home.sub')}>
      {/* An overlay, not a route: the wall below is already rendered and complete, so
          the opening never stands between a shared link and the gates. */}
      <Intro />

      {/* The machine-readable half of the same masthead: who this is and what it is.
          `/` only — it describes the site, and a node repeated on thirteen routes is
          thirteen claims where there is one. */}
      <StructuredData />

      {/* the "now" layer — compact, so a first visit still meets the gate plan on the
          first screen; the returning rows appear only when the device holds something */}
      <NowLayer daily={daily} greeting={greetingKey(hourInIsrael(now))} />

      {/* THE WORKER LIFE is the wall's own first plate — a tunnel, not a gate. The wall
          carries no heading (owner, 29.9.2026): the plates are the explanation. */}
      <section id="gates" aria-label={t('home.gates.aria')} className="mt-stack scroll-mt-4">
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {/* The tunnel is the head of the grid, above gate 5 — full width, same span
              rule as the curva below it, but never one of the eleven (rule 24, 39). */}
          <li className="col-span-2 lg:col-span-3">
            <TunnelPlate />
          </li>
          {wallOrder(GATES).map((gate) => (
            // The curva takes the full width of the wall. The span has to sit on the
            // grid ITEM — a col-span on the link inside it spans nothing at all.
            <li key={gate.number} className={gate.plate === 'curva' ? 'col-span-2 lg:col-span-3' : ''}>
              <GatePlate gate={gate} />
            </li>
          ))}
        </ul>
      </section>

      {/* AWAY DAYS (23.9.2026) — where the "מקומכם בשורותינו" cloth hung: the way into
          the next feature, announced and not yet open. */}
      <div className="mt-stack">
        <AwayDaysStrip />
      </div>
    </Screen>
  )
}

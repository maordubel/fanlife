'use client'

import type { LifeBusEvents } from '@/lib/life/runtime/bus'

type Match = NonNullable<LifeBusEvents['match']>

/**
 * הלוח — the other clock.
 *
 * The HUD says `שבת • 17:41`, which is the time of day. For ninety minutes of this
 * chapter there is a second clock that matters more, and it is the one every person in
 * the ground is actually looking at: two names, two numbers, and a minute.
 *
 * Three deliberate decisions, in the order they were made:
 *
 * · **It is a board, not a widget.** Black plate, cream type, the score in the middle at
 *   the size a scoreboard puts it. 1986 had no graphics package and neither does this.
 * · **The score is printed as two separate numbers with the clubs they belong to**, never
 *   as `1:0`. A bare scoreline in an RTL line is genuinely ambiguous about who scored it,
 *   which is why `tests/seed.test.ts` bans one in prose — and a rule the content obeys
 *   should not be broken by the component that renders the same fact.
 * · **The minute is `tabular-nums` and it never moves.** A digit that shifts the layout as
 *   the clock ticks is the difference between a scoreboard and a spinner.
 *
 * Every value here came off `content/manual` by way of the anchor. The component invents
 * nothing and cannot: it is handed four fields and a label.
 */
export function ScoreStrip({ match, objective = null }: { match: Match; objective?: string | null }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center p-2.5"
      data-life="scoreboard"
    >
      <div
        className={`flex items-stretch border-rule bg-ink ${
          match.scored ? 'border-red' : 'border-ink'
        }`}
      >
        <Side nameHe={match.homeHe} score={match.homeScore} lit={match.scored && (match.homeScore ?? 0) > 0} />

        <div className="flex min-w-[52px] flex-col items-center justify-center border-x-hair border-concrete/40 px-2 py-1">
          <span
            className="font-mono text-[13px] leading-none tabular-nums text-sheet"
            dir="ltr"
            data-life="match-minute"
          >
            {match.labelHe}
          </span>
        </div>

        <Side nameHe={match.awayHe} score={match.awayScore} lit={match.scored && (match.awayScore ?? 0) > 0} />
      </div>
      {/* After the whistle the board stays — it is the fact of the day — but the boy has
          somewhere to be, and the one line under the clock comes back beneath it. */}
      {/* Under the board, centred, in the flow — not pinned to the corner. Pinned, it sat
          on top of the menu button at every viewport (5.9.2026, seen on the terrace). */}
      {objective && (
        <div className="mt-1.5 border-hair border-red bg-red px-2.5 py-1.5">
          <p className="font-body text-[11px] leading-none text-sheet" data-life="objective">
            <bdi>{objective}</bdi>
          </p>
        </div>
      )}
    </div>
  )
}

function Side({ nameHe, score, lit }: { nameHe: string; score: number | null; lit: boolean }) {
  if (!nameHe) return null
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5">
      <span className="font-display text-[12px] leading-none text-sheet">
        <bdi>{nameHe}</bdi>
      </span>
      <span
        className={`min-w-[18px] px-1 text-center font-mono text-[15px] leading-none tabular-nums ${
          lit ? 'bg-red text-sheet' : 'text-concrete'
        }`}
        dir="ltr"
      >
        {score ?? '–'}
      </span>
    </div>
  )
}

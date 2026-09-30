'use client'

import { Badge } from '@/components/ui/Badge'
import { Num } from '@/components/ui/Num'
import { RANKS } from '@/lib/profile/standing'
import { STAMP_LABEL, type WorkerCardState } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import {
  STAMP_TILT,
  barcodeBars,
  beganLabel,
  cardStamps,
  fanSinceLabel,
  firstLabel,
  homeGateLabel,
  type CardNames,
} from './cardView'

/**
 * כרטיס הפועל — the hero of gate 10, drawn from the derived state and nothing else.
 *
 * The prototype's card, kept where it carries meaning and rebuilt in the shell's own
 * press: an ink head strip with the frozen TIK, the nickname large, four boxes for the
 * four things a person declares about how they came to this club, a barcode printed FROM
 * the TIK (`barcodeBars`, Code 39 — the bars are the file number), a signature line, the
 * personal number on a vermilion plate with the navy plate printing 3px off it, a seal
 * that names the home gate, and at most three stamps.
 *
 * What it refuses from the prototype: the wordmark PNG (the badge is the identity, rule
 * 23), the random `TW-####` (the TIK is frozen), the demo defaults (an empty field prints
 * a dash, never "פוגי, 1983, בלומפילד"), and the stamp for registering — nothing on this
 * card can be earned by signing in.
 *
 * `draft` marks a preview that has not been saved yet, so the live preview beside the
 * editor never passes for the card itself. `fresh` is set once, right after the card is
 * issued: the stamps drop and a sheen crosses the card — CSS only, and under
 * `prefers-reduced-motion` the stamps are simply there and the sheen never draws.
 */
export function WorkerCard({
  state,
  names,
  draft = false,
  fresh = false,
}: {
  state: WorkerCardState
  names: CardNames
  draft?: boolean
  fresh?: boolean
}) {
  const d = state.declared
  const rank = RANKS.find((row) => row.id === state.rank) ?? (RANKS[0] as (typeof RANKS)[number])
  const stamps = cardStamps(state.stamps)
  const meta: { key: string; label: string; value: string | null }[] = [
    { key: 'gate', label: t('tik.card.metaGate'), value: homeGateLabel(d.homeGate) },
    { key: 'since', label: t('tik.card.metaSince'), value: fanSinceLabel(d.fanSince) },
    { key: 'first', label: t('tik.card.metaFirst'), value: firstLabel(d.first, names) },
    { key: 'began', label: t('tik.card.metaBegan'), value: beganLabel(d.began) },
  ]

  return (
    <article
      aria-labelledby="worker-card-name"
      data-card="worker"
      className="relative overflow-hidden border-plate border-ink bg-sheet transition-transform duration-plate ease-stamp motion-reduce:transition-none lg:hover:-rotate-[0.4deg]"
    >
      {/* ---------------------------------------------------------------- head strip */}
      <header className="flex items-center justify-between gap-3 bg-ink px-3.5 py-2">
        <div className="min-w-0">
          <p className="font-display text-[19px] leading-none text-paper">{t('core.card.eyebrow')}</p>
          <p dir="ltr" className="mt-1 truncate font-latin text-[9px] font-bold tracking-[0.12em] text-red sm:tracking-[0.2em]">
            THE WORKER · WORKER CARD
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p dir="ltr" className="font-latin text-[8px] font-bold tracking-[0.18em] text-concrete">
            MEMBER NO.
          </p>
          <p dir="ltr" className="font-mono text-[14px] font-bold tabular-nums leading-tight text-paper">
            {state.tik}
          </p>
        </div>
      </header>

      {draft && (
        <p
          role="status"
          className="border-b-hair border-ink bg-sign px-3.5 py-1 font-body text-[11px] font-extrabold text-paper"
        >
          {t('tik.card.draft')}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_88px] sm:grid-cols-[minmax(0,1fr)_128px] lg:grid-cols-[minmax(0,1fr)_108px]">
        {/* ------------------------------------------------------------ identity side */}
        <div className="flex min-w-0 flex-col gap-3 p-3.5">
          <div className="flex items-start gap-2.5">
            <Badge size={34} className="shrink-0" />
            <div className="min-w-0">
              <h2
                id="worker-card-name"
                className={`break-words font-display text-[clamp(1.6rem,7.4vw,2.6rem)] leading-[0.95] lg:text-[2.05rem] ${
                  state.nameHe !== '' ? 'text-ink' : 'text-ink/45'
                }`}
              >
                {state.nameHe !== '' ? <bdi>{state.nameHe}</bdi> : t('tik.card.noName')}
              </h2>
              <p className="mt-1.5 font-body text-[11.5px] leading-snug text-muted">
                {t(rank.key)}
                {' · '}
                {t('tik.card.gatesLine', { lit: String(state.gates.lit), of: String(state.gates.of) })}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-2">
            {meta.map((row) => (
              <div key={row.key} className="min-w-0 border-t-rule border-ink pt-1">
                <dt className="font-body text-[10.5px] font-bold leading-tight text-muted">{row.label}</dt>
                <dd
                  className={`mt-0.5 break-words font-sign text-[13.5px] font-bold leading-tight ${
                    row.value === null ? 'text-ink/35' : 'text-ink'
                  }`}
                >
                  {row.value === null ? '—' : <bdi>{row.value}</bdi>}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <Barcode tik={state.tik} />
            <div className="min-w-[128px] flex-1 text-center">
              <p
                aria-hidden="true"
                className="-rotate-3 truncate border-b-hair border-ink px-1 font-display text-[17px] leading-tight text-ink"
              >
                {state.nameHe !== '' ? <bdi>{state.nameHe}</bdi> : ' '}
              </p>
              <p className="mt-0.5 font-body text-[9.5px] text-muted">{t('tik.card.signature')}</p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- number plate */}
        <div className="flex flex-col items-center justify-between gap-2 bg-red px-1.5 py-3">
          <p className="font-body text-[10px] font-extrabold tracking-wide text-paper/80">{t('tik.card.number')}</p>
          <p className="relative font-poster text-[64px] leading-none sm:text-[92px] lg:text-[76px]">
            <span className="sr-only">{t('tik.card.numberAria', { n: String(state.number) })}</span>
            <span aria-hidden="true" className="plate-shift absolute inset-0 text-sign">
              <Num>{state.number}</Num>
            </span>
            <span aria-hidden="true" className="plate-top relative text-paper">
              <Num>{state.number}</Num>
            </span>
          </p>
          <Seal gate={d.homeGate} />
        </div>
      </div>

      {/* --------------------------------------------------------------------- stamps */}
      <ul className="flex items-stretch justify-center gap-2 border-t-hair border-ink bg-paper px-2 py-2.5" aria-label={t('tik.stamp.label')}>
        {stamps.map((slot, index) => (
          // The tilt sits on the item and the drop on what is inside it, so the press's
          // fixed angle survives the animation's last frame.
          <li key={slot.id} className="flex min-w-0 flex-1" style={{ transform: `rotate(${STAMP_TILT[index] ?? 0}deg)` }}>
            <div
              data-stamp={slot.id}
              data-earned={slot.earned ? '1' : '0'}
              style={fresh ? { animationDelay: `${160 + index * 140}ms` } : undefined}
              className={`flex w-full flex-col items-center justify-center px-1.5 py-1 text-center ${
                slot.earned
                  ? `border-rule border-red text-red ${fresh ? 'animate-ticket-in motion-reduce:animate-none' : ''}`
                  : 'border-rule border-dashed border-ink/35 text-ink/45'
              }`}
            >
              <span className="font-sign text-[12px] font-bold leading-tight">{t(STAMP_LABEL[slot.id])}</span>
              <span className="mt-0.5 font-body text-[9.5px] leading-tight">
                {slot.earned ? t('tik.stamp.done') : t('tik.stamp.open')}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {fresh && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-sheet/45 to-transparent opacity-0 animate-[leak-sweep_1100ms_ease-out_both] motion-reduce:hidden"
        />
      )}
    </article>
  )
}

/** The TIK as Code 39, drawn in modules. Physical SVG coordinates (rule 9 allows them in a drawing). */
function Barcode({ tik }: { tik: string }) {
  const { bars, width } = barcodeBars(tik)
  return (
    <div className="min-w-0 shrink" dir="ltr">
      <svg
        viewBox={`0 0 ${width} 30`}
        preserveAspectRatio="none"
        className="block h-[30px] w-[118px] max-w-full sm:w-[150px]"
        role="img"
        aria-label={t('tik.card.barcode', { tik })}
      >
        {bars.map((bar) => (
          <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={30} className="fill-ink" />
        ))}
      </svg>
      <p className="mt-0.5 font-mono text-[9px] tabular-nums tracking-[0.3em] text-ink">{tik}</p>
    </div>
  )
}

/**
 * החותם — a ring that names the home gate. Drawn, not an image: the badge is the only
 * artwork on the card, and a seal is type on a circle.
 */
function Seal({ gate }: { gate: number | 'none' | null }) {
  const centre = gate === null ? null : gate === 'none' ? t('tik.card.sealAll') : t('core.card.homeGateN', { n: String(gate) })
  return (
    <svg viewBox="0 0 100 100" className="block h-[70px] w-[70px] -rotate-[8deg] sm:h-[96px] sm:w-[96px] lg:h-[84px] lg:w-[84px]" aria-hidden="true">
      <defs>
        <path id="tik-seal-ring" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" className="stroke-paper" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="30" fill="none" className="stroke-paper" strokeWidth="1.2" />
      {/* LTR on purpose: in an RTL document a textPath lays Latin out from the path's END */}
      <text className="fill-paper font-latin" direction="ltr" style={{ fontSize: 8.6, fontWeight: 700, letterSpacing: 0.9, direction: 'ltr' }}>
        <textPath href="#tik-seal-ring" startOffset="2%">
          THE WORKER · WORKER CARD · 1923 ·
        </textPath>
      </text>
      {centre !== null ? (
        <text x="50" y="55" textAnchor="middle" className="fill-paper font-sign" style={{ fontSize: centre.length > 6 ? 10 : 13, fontWeight: 700 }}>
          {centre}
        </text>
      ) : (
        <text x="50" y="54" textAnchor="middle" className="fill-paper font-latin" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
          WORKER
        </text>
      )}
    </svg>
  )
}

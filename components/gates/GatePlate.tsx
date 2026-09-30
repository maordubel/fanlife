import Link from 'next/link'

import { PlayLink } from '@/components/play/PlayLink'
import { Num } from '@/components/ui/Num'
import { t } from '@/lib/i18n'
import type { Gate } from '@/lib/gates'

/**
 * לוחית השער — one gate, printed.
 *
 * Anatomy, top to bottom, straight off the design:
 *   1. a bilingual header strip — GATE on one side, שער on the other, same weight,
 *      because neither language is the translation of the other here
 *   2. the number well, where the gate number is the largest thing on the plate
 *   3. an ink foot carrying the Hebrew name and the Latin line
 *
 * The number is printed TWICE: the navy plate first, shifted 3px right and down, then
 * the vermilion plate on top, both multiplying. The dark edge you see is not a shadow
 * and not a third colour — it is the two inks overlapping, which is the one thing that
 * makes a two-plate print look printed.
 */
export function GatePlate({ gate }: { gate: Gate }) {
  const away = gate.plate === 'away'
  const curva = gate.plate === 'curva'
  const className = `group relative block overflow-hidden border-hair border-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
    away ? 'bg-sign/[.07]' : 'bg-sheet'
  }`
  const ariaLabel = `${t('gate.aria')} ${gate.number} — ${t(gate.title)}`

  /*
   * The plate is the way IN, so a gate that deals a round carries this device's place in
   * its deck: walk through gate 3 twice in an afternoon and the second round is not the
   * first one again. Before that, every plate pointed at a hardcoded `?seed=1`.
   *
   * **But five of the eleven deal no round**, and until 17.9.2026 they went through the
   * same component — so the wall minted a deck for `/xi`, `/kits`, `/polls`, `/tik` and
   * the trivia PICKER, advanced its cursor on every click, and stapled the result onto a
   * URL none of those pages reads. The worst of the five was `/trivia`: the real decks
   * are per topic (`/trivia/europe`), so the one the wall was walking belonged to nothing.
   */
  const inner = (
    <>
      <div className={`pointer-events-none absolute inset-0 stain-${gate.stain}`} aria-hidden="true" />

      {/* 1 · the bilingual plate. It sits on solid paper so the sunburst behind the
          number cannot run up under the lettering — a plate is printed over the field,
          not through it. */}
      <div className={`relative flex items-baseline justify-between border-b-hair border-ink px-2.5 py-1.5 ${
        away ? 'bg-sign/[.04]' : 'bg-sheet'
      }`}>
        {/* שער on the right, the Latin on the left. In an RTL row the FIRST child
            lands on the right, so the Hebrew is written first. */}
        <span className="font-display text-[13px] leading-none text-sign">{t('gate.word')}</span>
        <span
          className="font-latin text-[8.5px] font-bold tracking-[0.18em] text-sign"
          dir="ltr"
        >
          {curva ? 'ULTRAS HAPOEL' : 'GATE'}
        </span>
      </div>

      {/* 2 · the number well */}
      <div
        className={`relative flex items-center justify-center ${curva ? 'h-[140px] sm:h-[168px]' : 'h-[104px] sm:h-[126px]'}`}
      >
        {/* rays — gates 2, 5 and 8 only, never on the away end */}
        {(gate.plate === 'rays' || curva) && (
          <div
            aria-hidden="true"
            // Centred with inset-x-0 + mx-auto rather than a physical half-offset: a
            // sunburst has no start and no end, and this codebase forbids physical
            // direction utilities outright — including inside a comment, it turns out.
            className={`rays pointer-events-none absolute inset-x-0 top-1/2 mx-auto -translate-y-1/2 ${
              curva ? 'h-[420px] w-[420px] opacity-25' : 'h-[240px] w-[240px] opacity-[.22]'
            }`}
          />
        )}

        {/* the ranks marching away — they recede upward and shrink, which is
            perspective and not decoration */}
        <Ranks tone={away ? 'away' : 'home'} />

        <span
          aria-hidden="true"
          className={`plate-shift absolute font-poster leading-none text-sign ${
            curva ? 'text-[104px] sm:text-[130px]' : 'text-[78px] sm:text-[96px]'
          }`}
        >
          <Num>{gate.number}</Num>
        </span>
        <span
          className={`plate-top relative font-poster leading-none ${
            away ? 'text-sign' : 'text-red'
          } ${curva ? 'text-[104px] sm:text-[130px]' : 'text-[78px] sm:text-[96px]'}`}
        >
          <Num>{gate.number}</Num>
        </span>
      </div>

      {/* gate 5 gets the flag; nobody else does */}
      {curva && gate.callHe && (
        <div className="relative mx-2.5 mb-2 flex h-7 items-center justify-center sm:h-8">
          <div aria-hidden="true" className="flag absolute inset-0" />
          <span className="relative font-poster text-[15px] tracking-[0.22em] text-paper sm:text-[19px] sm:tracking-[0.28em]">
            {t(gate.callHe)}
          </span>
        </div>
      )}

      {/* 3 · the ink foot */}
      <div className="relative bg-ink px-2.5 pb-2.5 pt-2">
        <div className="font-display text-[14px] leading-tight text-paper sm:text-[17px]">
          {t(gate.title)}
        </div>
        <div
          className="mt-1 font-latin text-[7.5px] font-semibold leading-snug tracking-[0.12em] text-concrete sm:text-[8.5px]"
          dir="ltr"
        >
          {gate.latin}
        </div>
      </div>
    </>
  )

  /**
   * **בשיפוצים — a plate that is not a link.**
   *
   * Gate 9 is on the ground and has nothing behind it yet (Maor, 17.9.2026). A `<Link>`
   * to a route that does not exist is a 404 with a nice plate on it, and this file has
   * argued since gate 7 that a gate pointing at nothing is worse than a gap. So a gate
   * with no `href` renders as a `<div>` — no tap target, no hover, no cursor — with the
   * refurbishment stamped across the number well, so the wall says what the ground says.
   */
  if (gate.href === null) {
    return (
      <div
        role="img"
        className={`${className} cursor-default ${gate.soon ? '' : 'opacity-90'}`}
        aria-label={t(gate.soon ? 'gate.soon.aria' : 'gate.closed.aria', { number: String(gate.number), title: t(gate.title) })}
      >
        {inner}
        {gate.soon ? (
          // בקרוב — announced, not closed: a vermilion stamp slapped across the plate
          // at the press angle, the way a "coming" bill is over-pasted on a fence.
          <div className="absolute inset-x-0 top-[38%] -translate-y-1/2" aria-hidden="true">
            <p className="mx-3 -rotate-6 border-plate border-red bg-sheet py-0.5 text-center font-poster text-[22px] leading-tight tracking-[0.16em] text-red sm:text-[26px]">
              {t('stage.soon')}
            </p>
          </div>
        ) : (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden="true">
            <p className="mx-2 border-y-rule border-ink bg-sheet py-1 text-center font-poster text-[18px] tracking-[0.2em] text-ink sm:text-[22px]">
              {t('gate.closed')}
            </p>
          </div>
        )}
      </div>
    )
  }

  const href = gate.href
  return gate.seeded ? (
    <PlayLink
      gate={href.split('?')[0] ?? href}
      href={href}
      ariaLabel={ariaLabel}
      className={className}
    >
      {inner}
    </PlayLink>
  ) : (
    <Link href={href} aria-label={ariaLabel} className={className}>
      {inner}
    </Link>
  )
}

/** which ink the silhouette prints in — the away end's navy, the home plates' ink,
 *  or paper for a crowd walking away from the camera into a lit, roofed well */
export type RanksTone = 'home' | 'away' | 'paper'

type RankRow = { bottom: number; height: number; size: string; opacity: number; shift: string }

const RANKS_RGB: Record<RanksTone, string> = {
  home: '21,18,14', // --ink
  away: '30,44,90', // --sign
  paper: '240,232,212', // --sheet
}

/** the gate plates' own row geometry — each rank further back is shorter, tighter,
 *  fainter, and offset by half a figure, so the rows read as a crowd rather than a
 *  picket fence. A tunnel plate brings its own rows (TunnelPlate.tsx) rather than
 *  reusing these, because its well is a different height and its crowd is lit from
 *  the mouth rather than standing on a gate's own poster ground. */
const GATE_ROWS: Record<'home' | 'away', RankRow[]> = {
  home: [
    { bottom: 0, height: 44, size: '30px 46px', opacity: 0.3, shift: '0' },
    { bottom: 30, height: 30, size: '21px 32px', opacity: 0.19, shift: '10px' },
    { bottom: 52, height: 20, size: '15px 22px', opacity: 0.12, shift: '4px' },
  ],
  away: [
    { bottom: 0, height: 44, size: '30px 46px', opacity: 0.42, shift: '0' },
    { bottom: 30, height: 30, size: '21px 32px', opacity: 0.26, shift: '10px' },
    { bottom: 52, height: 20, size: '15px 22px', opacity: 0.17, shift: '4px' },
  ],
}

/**
 * שורות הצועדים — ranks of marchers, drawn as a repeating silhouette.
 *
 * A row further back is shorter, tighter and fainter. That is the only reason the
 * rows exist: they put the crowd behind the number without a photograph.
 *
 * Exported so the tunnel plate can draw the same figure, recoloured to paper and
 * walking into a different well, rather than a second silhouette being hand-drawn.
 */
export function Ranks({ tone = 'home', rows }: { tone?: RanksTone; rows?: readonly RankRow[] }) {
  // One marcher: head, shoulders, body. Repeated along the row by background-repeat.
  const figure = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='46' viewBox='0 0 30 46'>
       <g fill='rgb(${RANKS_RGB[tone]})'>
         <circle cx='15' cy='9' r='6'/>
         <path d='M6 46 V22 q0-6 9-6 t9 6 v24 z'/>
       </g>
     </svg>`.replace(/\s+/g, ' '),
  )}")`

  const activeRows = rows ?? GATE_ROWS[tone === 'away' ? 'away' : 'home']

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
      {activeRows.map((row, index) => (
        <div
          key={index}
          className="absolute inset-x-0"
          style={{
            bottom: row.bottom,
            height: row.height,
            opacity: row.opacity,
            backgroundImage: figure,
            backgroundRepeat: 'repeat-x',
            backgroundSize: row.size,
            backgroundPosition: `${row.shift} bottom`,
          }}
        />
      ))}
    </div>
  )
}

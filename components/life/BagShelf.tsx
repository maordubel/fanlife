'use client'

import Image from 'next/image'

import { artUrl } from '@/lib/life/runtime/art'

/**
 * המדפים של התיק — the four objects the bag is built out of, and nothing else.
 *
 * This file is deliberately dumb. It holds no state, reads no `LifeState` and imports no
 * translator: everything it draws arrives as a string or as a count it is told to DRAW.
 * That separation is what keeps rule 46 enforceable in one place — `lib/life/profile.ts`
 * decides what a number means, this file decides what an object looks like, and neither
 * of them is in a position to accidentally print a value.
 *
 *  · `Shelf`  — a section of the bag: a rule, a mono kicker, an optional quiet sentence.
 *  · `Marks`  — a count, drawn. Never a bar: a bar draws the EMPTY part too, which is a
 *               promise that the thing can be filled and the reason §33 banned them. Six
 *               coins in a pocket are six marks and no channel behind them.
 *  · `Thing`  — one object on a shelf: its picture at a size you can see it, its name,
 *               the sentence that came with it, and whatever provenance it carries.
 *  · `Tag`    — a printed word beside an object (a rarity, a way of being somewhere).
 *               Not a badge and not a pill: radius 0, a hairline, mono, the same object
 *               the rest of the site prints a caption in.
 */

export function Shelf({
  titleHe,
  noteHe,
  children,
}: {
  titleHe: string
  /** the one quiet line that says what this shelf IS, when that is not obvious */
  noteHe?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t-hair border-concrete/25 pt-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-concrete">
        <bdi>{titleHe}</bdi>
      </h3>
      {noteHe && (
        <p className="mt-1 font-body text-[11px] leading-snug text-concrete/80">
          <bdi>{noteHe}</bdi>
        </p>
      )}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/**
 * כמה — as marks, and the cap is part of the honesty.
 *
 * `more` is passed when the caller had to cut the row short, so a very full pocket says
 * so in a word instead of quietly showing a smaller one. The marks are `aria-hidden` and
 * the accessible name is the caller's own sentence: a screen reader being read eleven
 * identical bullets is worse than not hearing them at all.
 */
export function Marks({ n, moreHe }: { n: number; moreHe?: string | null }) {
  if (n <= 0) return null
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} aria-hidden="true" className="block h-[7px] w-[7px] bg-red" />
      ))}
      {moreHe && (
        <span className="font-mono text-[9px] leading-none tabular-nums text-concrete">
          <bdi>{moreHe}</bdi>
        </span>
      )}
    </span>
  )
}

export function Tag({ children, tone = 'quiet' }: { children: React.ReactNode; tone?: 'quiet' | 'red' }) {
  return (
    <span
      className={`inline-block border-hair px-1.5 py-[3px] font-mono text-[9px] uppercase leading-none tracking-[0.12em] tabular-nums ${
        tone === 'red' ? 'border-red/70 text-red' : 'border-concrete/40 text-concrete'
      }`}
    >
      <bdi>{children}</bdi>
    </span>
  )
}

/**
 * חפץ אחד — a picture at a size that is still the thing, then the words.
 *
 * §50 is entirely about the difference between a noun and an object: "צעיף" is a receipt,
 * a striped scarf on a lit shelf is a memory. The picture runs the full width because
 * half of these things are long and thin — a scarf, a folded page, a torn stub — and a
 * thumbnail turns every one of them into the same grey smudge.
 *
 * `copies` draws the object that many times instead of counting it, which is the whole
 * argument of this screen in one prop: a bag with three bottles in it looks like three
 * bottles, and a bag with "3" written on it is a stock take.
 */
export function Thing({
  art,
  nameHe,
  noteHe,
  copies = 1,
  moreHe,
  tags,
  meta,
  children,
  standout = false,
}: {
  art: string | null
  nameHe: string
  noteHe?: string | null
  copies?: number
  moreHe?: string | null
  tags?: React.ReactNode
  /** the provenance line — a year, a sponsor, a season */
  meta?: React.ReactNode
  children?: React.ReactNode
  standout?: boolean
}) {
  return (
    <li className={`border-hair ${standout ? 'border-red/60 bg-red/10' : 'border-concrete/30 bg-sheet/[0.04]'}`}>
      {art && (
        /*
         * Up to four of the thing, side by side, and the marks under the name carry the
         * exact count. Four is not a taste decision: a 360px phone has 320px of shelf
         * inside the gutters, and a fifth picture is the width at which a glass bottle
         * stops being a glass bottle and becomes a tally.
         */
        <div className="flex h-[86px] items-center justify-center gap-2 border-b-hair border-concrete/25 bg-sheet/10 px-3 py-2">
          {Array.from({ length: Math.min(Math.max(1, copies), 4) }, (_, i) => (
            <span key={i} className="relative block h-full w-full max-w-[96px]">
              <Image src={artUrl(art)} alt="" aria-hidden="true" fill sizes="96px" className="object-contain" />
            </span>
          ))}
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-display text-[14px] leading-none text-sheet">
            <bdi>{nameHe}</bdi>
          </p>
          {tags}
        </div>
        {noteHe && (
          <p className="mt-1.5 font-body text-[11px] leading-snug text-concrete">
            <bdi>{noteHe}</bdi>
          </p>
        )}
        {copies > 1 && (
          <div className="mt-2 flex">
            <Marks n={copies} moreHe={moreHe} />
          </div>
        )}
        {meta && <div className="mt-1.5">{meta}</div>}
        {children}
      </div>
    </li>
  )
}

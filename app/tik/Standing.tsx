'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { GATES, isOpen } from '@/lib/gates'
import { FAMILY_LABEL, type WorkerCardState } from '@/lib/profile/card'
import { wallStat } from '@/lib/profile/gate-id'
import { gateId, rankOf, standingScore, stillToDo } from '@/lib/profile/standing'
import { HISTORY_DAYS, historyGrid, rotationFor, totalCorrect, totalPlays, type Profile } from '@/lib/profile/store'
import { mintSeed, withRound } from '@/lib/rotation/deck'
import { t, type MessageKey } from '@/lib/i18n'

import { dayLabel, gateTitle, lineFigures, type CardNames } from './cardView'

/**
 * המעמד — what the card's tab says about everything you did, gate by gate.
 *
 * Maor: *"האזור האישי צריך להיות קשור לכל מיני המשחקים שיש לנו באפליקציה, שהכל ידבר עם
 * הכל, שהכל יישמר שם."* Every gate reports into one record (`lib/profile/events.ts`), and
 * since 21.9.2026 this screen reads it through ONE derivation — `workerCard()` — so the
 * card at the top, the wall below and the share card cannot disagree about a number.
 *
 * Four parts, in the order a person reads them:
 *  · **the standing** — a rank that is only ever earned (days, gates, rounds; nothing
 *    bought, nothing unlocked by an account), with the figures under it;
 *  · **DNA and recent** — the three families this person plays most, and the three gates
 *    they touched last;
 *  · **ONE activity grid** — `profile.days` and the member book's legacy punches, unioned
 *    (`activityDays`). There used to be two grids on this page that disagreed, because the
 *    punches were stamped by only four gates;
 *  · **the wall** — every open gate, lit when played, with what that gate says about you
 *    (`CARD_SOURCES`, identity spec §3.5). One PLATE rolls up every id under it, so
 *    `/trivia/europe` lights gate 2 and the Royal Rumble's old slash-less ids light gate 9.
 *
 * Each gate's link carries the DEVICE's place in that gate's deck (`lib/rotation/deck.ts`),
 * so "שוב" from here deals the next round rather than the one you already played.
 */
export function Standing({
  profile,
  state,
  names,
  days,
}: {
  profile: Profile
  state: WorkerCardState
  names: CardNames
  /** the union of played days and legacy punches */
  days: readonly string[]
}) {
  /**
   * The wall's links, worked out ONCE after mount — `rotationFor` mints and writes a seed
   * for a gate that has none, and a storage write during render is the bug the LIFE
   * intro's seen-flag was (rule 30). The cursor is not stepped here either: stepping
   * belongs to the click (`PlayLink`).
   */
  const [links, setLinks] = useState<Record<string, string>>({})
  useEffect(() => {
    setLinks(wallLinks())
  }, [])

  const rank = rankOf(profile)
  const grid = historyGrid({ ...profile, days: [...days] })
  const todo = stillToDo(profile)
  const figures: { k: MessageKey; v: string }[] = [
    { k: 'member.gatesTouched', v: `${state.gates.lit}/${state.gates.of}` },
    { k: 'member.days', v: String(state.days) },
    { k: 'member.streak', v: String(state.streak) },
    { k: 'member.plays', v: String(totalPlays(profile)) },
    { k: 'member.correct', v: String(totalCorrect(profile)) },
  ]
  const lines = new Map(state.lines.map((line) => [line.gate, line]))

  return (
    <div>
      {/* ---------------------------------------------------------------- the standing */}
      <section className="border-plate border-ink bg-ink p-4" aria-labelledby="member-standing">
        <div className="flex items-baseline justify-between gap-3">
          <p id="member-standing" className="font-latin text-[9px] font-bold tracking-[0.28em] text-red" dir="ltr">
            STANDING
          </p>
          {standingScore(profile) > 0 && (
            <p className="font-mono text-[10px] tabular-nums text-concrete">
              <Num>{standingScore(profile)}</Num>
            </p>
          )}
        </div>
        <p className="mt-1 font-display text-step-4 leading-[0.95] text-paper">{t(rank.now.key)}</p>
        <p className="mt-1.5 font-body text-[11.5px] leading-snug text-concrete">
          {rank.next ? t('member.rankNext', { n: String(rank.toGo), name: t(rank.next.key) }) : t('member.rankTop')}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-y-3 border-t-hair border-concrete/30 pt-3 sm:grid-cols-5">
          {figures.map((stat) => (
            <div key={stat.k}>
              <dd className="font-poster text-[26px] leading-none text-red">
                <Num>{stat.v}</Num>
              </dd>
              <dt className="mt-1 font-body text-[10px] leading-tight text-concrete">{t(stat.k)}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------------------------------------------------- DNA and recent */}
      <section className="mt-3 grid gap-3 sm:grid-cols-2" aria-label={t('tik.dna.label')}>
        <div className="border-rule border-ink bg-sheet p-3">
          <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.22em] text-red">
            SUPPORTER DNA
          </p>
          <h2 className="mt-0.5 font-display text-step-1 leading-tight text-ink">{t('tik.dna.title')}</h2>
          {state.dna.length > 0 ? (
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {state.dna.map((family, index) => (
                <li
                  key={family}
                  data-dna={family}
                  className={`flex min-h-[36px] items-center gap-1.5 border-rule px-2.5 font-sign text-[14px] font-bold ${
                    index === 0 ? 'border-red bg-red text-paper' : 'border-ink bg-paper text-ink'
                  }`}
                >
                  <span className="font-poster text-[15px] leading-none">
                    <Num>{index + 1}</Num>
                  </span>
                  {t(FAMILY_LABEL[family])}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 font-body text-[12px] leading-snug text-muted">{t('tik.dna.empty')}</p>
          )}
        </div>
        <div className="border-rule border-ink bg-sheet p-3">
          <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.22em] text-red">
            RECENTLY
          </p>
          <h2 className="mt-0.5 font-display text-step-1 leading-tight text-ink">{t('tik.dna.recent')}</h2>
          {state.recent.length > 0 ? (
            <ol className="mt-2 flex flex-col gap-1">
              {state.recent.map((number) => {
                const line = lines.get(number)
                return (
                  <li key={number} className="flex items-baseline gap-2 border-b-hair border-ink/20 pb-1">
                    <span className="font-poster text-[17px] leading-none text-red">
                      <Num>{number}</Num>
                    </span>
                    <span className="min-w-0 flex-1 font-sign text-[14px] leading-tight text-ink">{gateTitle(number)}</span>
                    {line?.lastOn && (
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted">
                        <Num>{dayLabel(line.lastOn)}</Num>
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="mt-2 font-body text-[12px] leading-snug text-muted">{t('tik.dna.recentEmpty')}</p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ the one activity grid */}
      <section className="mt-3 border-rule border-ink bg-sheet p-3" aria-labelledby="member-days">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="member-days" className="font-body text-[11px] font-extrabold tracking-widest text-muted">
            {t('member.quarter')}
          </h2>
          <p className="font-mono text-[10.5px] tabular-nums text-red">
            <Num>{`${grid.filter(Boolean).length}/${HISTORY_DAYS}`}</Num>
          </p>
        </div>
        <ol className="mt-2 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px]" aria-hidden="true">
          {grid.map((punched, index) => (
            <li
              key={index}
              className={`aspect-square border-hair ${punched ? 'border-red bg-red' : 'border-ink/20 bg-paper'}`}
            />
          ))}
        </ol>
        <p className="mt-2 font-body text-[11px] leading-relaxed text-muted">{t('tik.card.gridNote')}</p>
      </section>

      {/* ------------------------------------------------------------------- your wall */}
      <section className="mt-stack" aria-labelledby="member-wall">
        <div className="flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1.5">
          <h2 id="member-wall" className="font-display text-step-2 leading-tight text-ink">
            {t('member.wall')}
          </h2>
          <p className="font-mono text-[11px] tabular-nums text-muted">
            <Num>{`${state.gates.lit}/${state.gates.of}`}</Num>
          </p>
        </div>
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('member.wallLede')}</p>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {GATES.filter(isOpen).map((gate) => {
            if (!gate.playable) return null
            // One PLATE, every id under it (`lib/profile/gate-id.ts`).
            const stat = wallStat(profile, gate.href)
            const played = stat.plays > 0
            const shown = played ? lineFigures(lines.get(gate.number)?.figures ?? [], names) : []
            return (
              <li key={gate.number}>
                <Link
                  href={links[gate.href] || gate.href}
                  data-plate={gate.number}
                  data-lit={played ? '1' : '0'}
                  className={`flex min-h-tap items-stretch gap-3 border-rule transition-transform duration-press ease-stamp active:scale-[.985] motion-reduce:transition-none ${
                    played ? 'border-ink bg-sheet' : 'border-ink/35 bg-paper'
                  }`}
                >
                  <span
                    className={`flex w-[52px] shrink-0 items-center justify-center font-poster text-[26px] leading-none ${
                      played ? 'bg-red text-paper' : 'bg-ink/10 text-ink/40'
                    }`}
                  >
                    <Num>{gate.number}</Num>
                  </span>
                  <span className="min-w-0 flex-1 py-2 pe-1">
                    <span className="block font-sign text-step-0 leading-tight text-ink">{t(gate.title)}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] tabular-nums leading-snug text-muted">
                      {played ? (
                        <>
                          <Num>{stat.plays}</Num> {t('member.plays')}
                          {stat.best > 0 && (
                            <>
                              {' · '}
                              {t('member.best')} <Num>{stat.best}</Num>
                            </>
                          )}
                        </>
                      ) : (
                        t('member.never')
                      )}
                    </span>
                    {shown.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 font-body text-[11px] leading-snug text-ink">
                        {shown.map((figure) => (
                          <span key={figure.label} className="whitespace-nowrap">
                            <span className="text-muted">{figure.label}</span>{' '}
                            <bdi className="font-extrabold">{figure.text}</bdi>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center pe-3 font-body text-[11px] font-extrabold text-red">
                    {played ? t('member.again') : t('member.enter')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ what's left */}
      {todo.length > 0 && (
        <section className="mt-stack" aria-labelledby="member-next">
          <h2
            id="member-next"
            className="border-b-rule border-ink pb-1 font-display text-step-2 leading-tight text-ink"
          >
            {t('member.nextUp')}
          </h2>
          <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('member.nextUpLede')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {todo.map((gate) => (
              <li key={gate.number}>
                <Link
                  href={gate.href}
                  className="flex min-h-tap items-center gap-2 border-rule border-red bg-sheet px-3 font-body text-step--1 font-extrabold text-ink"
                >
                  <span className="font-poster text-[17px] leading-none text-red">
                    <Num>{gate.number}</Num>
                  </span>
                  {t(gate.title)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * The link every gate on this wall gets. A gate that READS a seed gets the device's own
 * place in its deck; a gate that does not gets its bare route, because a `?seed=` on a
 * page that never looks at one is a parameter that lies (rule 19).
 */
function wallLinks(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const gate of GATES.filter(isOpen)) {
    if (!gate.seeded) {
      out[gate.href] = gate.href
      continue
    }
    const rotation = rotationFor(gateId(gate.href), mintSeed)
    out[gate.href] = withRound(gate.href, rotation.seed, rotation.cursor)
  }
  return out
}

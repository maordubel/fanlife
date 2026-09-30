'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { FitBox } from '@/components/stage/FitBox'
import { NEUTRAL_SHIRT_SPEC } from '@/components/roster/RosterSheet'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { firePickFxAt } from '@/components/stage/PickFx'
import { PickRail, flyShirt, type RailItem } from '@/components/roster/PickRail'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { t, type MessageKey } from '@/lib/i18n'
import {
  COACH_NOTES,
  LINES,
  MAX_LOCKS,
  XI_SIZE,
  displaySpot,
  lineCounts,
  placeOn,
  takeOff,
  type CoachNote,
  type Line,
  type LineupVerdict,
  type LockerName,
  type Placement,
} from '@/lib/game/lineup-sheet'
import { splitName, compactName } from '@/lib/game/roster-search'
import type { LineupWindow, MatchIntro } from '@/lib/game/lineup'
import type { KitSpec } from '@/lib/kit/spec'
import type { Embedded } from '@/lib/mechanics/types'
import { haptic } from '@/lib/play/haptics'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { tierFromShare, voice, voiceAction, type ResultTier } from '@/lib/voice'
import { askCoach, nextAfterLineup, submitLineup } from './actions'
import { BandPitch, BandPitchStage, LINE_LABEL } from './BandPitch'
import { LockerRack } from './LockerRack'
import { TeamSheet } from './TeamSheet'
import { TunnelGate } from './TunnelGate'
import { PlayLink } from '@/components/play/PlayLink'
import { RecordRun } from '@/components/play/RecordRun'
import { CompareCard } from '@/components/share/CompareCard'
import { ShareRow } from '@/components/share/ShareRow'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { programmeCard } from '@/lib/share/artefacts'

/**
 * שער 3 — חדר ההלבשה.
 *
 * The room the shirts hang in, the three names you are willing to stake something on,
 * the coach who will tell you a number but not a name, and the mouth of the tunnel where
 * the sheet stops being changeable. The data underneath is the verified records and the
 * server-side grade.
 *
 * **Four bands, not a formation (21.9.2026, players.md §2 Gate 3 V3).** No source in
 * `lineups.json` states a formation, so the pitch no longer draws eleven slots that
 * imply one: it is keeper, defence, midfield and attack, and any number of men in each.
 * The board holds `{playerId, line, order}` and nothing else; the grade is by line, on
 * the server, as it always was.
 *
 * **Placing works from either end.** Tap a band then a locker, or a locker then a band.
 * A man on the pitch is tapped to select him — then LOCK, send him back to the lockers,
 * or tap another band to move him.
 *
 * **The prototype's XI is not in this file and must never be.** Its 14.3.2002 eleven
 * contains a man called `קשר נוסף`; `content/manual/lineups.json` holds the verified
 * reading of that same match, and that is the one that plays (rule 11).
 *
 * **Nothing here waits.** The tunnel is a decision, not a countdown, and the reveal
 * (`TeamSheet.tsx`) moves on taps, with an opt-in fast walk.
 */

const COACH_LINE: Record<CoachNote['kind'], MessageKey> = {
  stillOut: 'lineup.coach.stillOut',
  benchOn: 'lineup.coach.benchOn',
  lineRight: 'lineup.coach.lineRight',
}

/** §12 — the rail asks the plan's questions for the keeper and the back line; the rest by name. */
function railPrompt(line: Line): string {
  if (line === 'GK') return voiceAction(3, 'gk') ?? t(LINE_LABEL[line])
  if (line === 'D') return voiceAction(3, 'defence') ?? t(LINE_LABEL[line])
  if (line === 'M') return voiceAction(3, 'midfield') ?? t(LINE_LABEL[line])
  return voiceAction(3, 'attack') ?? t(LINE_LABEL[line])
}

/** "מצאת 9 מתוך 11." — found is a starter in HIS band; eleven in the wrong bands is not `perfect`. */
function lineupTier(verdict: LineupVerdict): ResultTier {
  if (verdict.perfect) return 'perfect'
  return tierFromShare(verdict.total > 0 ? verdict.exact / verdict.total : 0)
}

function coachSentence(note: CoachNote): string {
  // "0 bench traps" reads as an accusation with a zero in it; the room says nothing happened.
  if (note.kind === 'benchOn' && note.n === 0) return t('lineup.coach.benchOn.none')
  return t(COACH_LINE[note.kind], { n: String(note.n), of: String(note.of) })
}

/** per slot of the real XI (keeper first): did the player put that man in his band? */
function lineupResult(verdict: LineupVerdict): ChallengeResult {
  return {
    gate: 3,
    found: verdict.solution.map((m) => verdict.rows.some((r) => r.playerId === m.playerId && r.status === 'exact')),
  }
}

export function LineupBoard({
  bank,
  seed,
  cursor = 0,
  graded,
  kit,
  kitSeason,
  look = null,
  keeperLook = null,
  intro = null,
  sourceTitle = '',
  fixture = null,
  embedded,
}: {
  bank: LockerName[]
  seed: number
  cursor?: number
  /** false when no verified XI exists — the board is then a free build */
  graded: boolean
  /** the season's real kit for the lockers — null where the archive has none */
  kit: KitSpec | null
  kitSeason: string | null
  /**
   * The match season's REAL shirt (delta 88, `lib/kit/playerShirt.ts` pinned to the match
   * season): every man in the room wore that night's shirt, so every locker shows it — and
   * a per-man era shirt would leak who belongs to the season. Absent (LIFE), the drawing.
   */
  look?: ShirtLook | null
  /** the same night's goalkeeper shirt — the GK band wears it */
  keeperLook?: ShirtLook | null
  /** the match record, for the phone stage's "פרטי המשחק" sheet — absent inside LIFE */
  intro?: MatchIntro | null
  sourceTitle?: string
  /** the fixture as the intro prints it — the programme's masthead (never the eleven) */
  fixture?: { titleHe: string; dateHe: string } | null
  /**
   * Opened from inside THE WORKER LIFE — the café's argument, the schoolyard's bet. The same
   * lockers, coach and grade over the one match the life pinned (the server re-derives it
   * from the window); the verdict goes back to the table, once — the gate's "last switch"
   * after the reveal would make a second try free, and a bet is a bet.
   */
  embedded?: Omit<Embedded<LineupVerdict>, 'window'> & { window: LineupWindow }
}) {
  const [board, setBoard] = useState<Placement[]>([])
  /** a locker held, waiting for a band */
  const [held, setHeld] = useState<string | null>(null)
  /** a band tapped first, waiting for a locker */
  const [armedLine, setArmedLine] = useState<Line | null>(null)
  /** a man on the pitch, selected */
  const [active, setActive] = useState<string | null>(null)
  const [locks, setLocks] = useState<string[]>([])
  const [notes, setNotes] = useState<CoachNote[]>([])
  const [note, setNote] = useState<MessageKey | null>(null)
  const [tunnel, setTunnel] = useState(false)
  const [lastCall, setLastCall] = useState(false)
  const [verdict, setVerdict] = useState<LineupVerdict | null>(null)
  /** the Universal Exit's doors — asked for once a sheet comes back (§6, §38) */
  const [next, setNext] = useState<NextAction[]>([])
  const opening = voice({ gate: 3, moment: 'intro' })
  useEffect(() => {
    if (!verdict || embedded) return
    track('run_complete', { detail: 'lineup', value: verdict.exact })
    let live = true
    nextAfterLineup(seed, cursor, verdict.exact, verdict.missing.map((man) => man.playerId))
      .then((answer) => {
        if (live) setNext(answer.next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one sheet, one context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict])
  const [pending, startTransition] = useTransition()
  /** the phone stage (delta 87): "מלתחה" or "פרטי המשחק" over the pitch */
  const [mobileSheet, setMobileSheet] = useState<'info' | 'coach' | null>(null)
  /**
   * The phone's picking rail (delta 88 — the same `PickRail` gate 1 picks from). It is OPEN
   * from the first frame, aimed at a band: the keeper's, then the defence. Maor, 24.9.2026:
   * "לא ניתן לבחור שחקנים בכלל" — the lockers used to hide behind a chip and a tap on the
   * pitch armed a band with nothing to show for it.
   */
  const [railLine, setRailLine] = useState<Line>('GK')
  const [railShut, setRailShut] = useState(false)

  const nameOf = useMemo(() => new Map(bank.map((locker) => [locker.id, locker.nameHe])), [bank])
  const used = useMemo(() => new Set(board.map((row) => row.playerId)), [board])
  const counts = lineCounts(board)
  const complete = board.length === XI_SIZE

  /** Put him in a band. A move keeps his LOCK; a twelfth man is refused and said. */
  function put(playerId: string, line: Line, from: Element | null = null) {
    const next = placeOn(board, playerId, line)
    if (!next.some((row) => row.playerId === playerId && row.line === line)) {
      setNote('lineup.zone.full')
      haptic('miss')
      return
    }
    setBoard(next)
    setHeld(null)
    setArmedLine(null)
    // nobody stays selected after a placement: the next band tap arms that band for the
    // next shirt instead of quietly moving the man just placed
    setActive(null)
    setNote(null)
    haptic('tap')
    const family = compactName(nameOf.get(playerId) ?? '')
    // from the rail the shirt FLIES into the band, then the stamp (delta 88)
    if (from) flyShirt(from, `[data-drop="band-${line}"]`, family)
    else firePickFxAt(document.querySelector(`[data-drop="band-${line}"]`), { label: family })
    // one keeper: once he stands, the rail moves on to the defence
    if (line === 'GK' && railLine === 'GK') setRailLine('D')
  }

  /** The phone's band tap: a man in hand lands there; otherwise the rail is aimed at it. */
  function tapBandStage(line: Line) {
    if (verdict) return
    if (held !== null) return put(held, line)
    if (active !== null) return put(active, line)
    setRailLine(line)
    setRailShut(false)
    setNote(null)
  }

  function tapBand(line: Line) {
    if (verdict) return
    if (held !== null) return put(held, line)
    if (active !== null) return put(active, line)
    setArmedLine(armedLine === line ? null : line)
    setNote(null)
  }

  function tapLocker(id: string) {
    if (verdict) return
    if (armedLine !== null) return put(id, armedLine)
    setHeld(held === id ? null : id)
    setActive(null)
    setNote(null)
  }

  function tapMan(id: string) {
    if (verdict) return
    // A shirt in hand lands in the band of whoever was tapped — on a full band the men
    // cover most of it, and a tap on one of them means "here".
    if (held !== null) {
      const line = board.find((row) => row.playerId === id)?.line
      if (line) return put(held, line)
    }
    setActive(active === id ? null : id)
    setHeld(null)
    setArmedLine(null)
    setNote(null)
  }

  function sendBack() {
    if (active === null) return
    setBoard(takeOff(board, active))
    // a LOCK on a man who is no longer on the pitch would still be counted at the end
    setLocks((current) => current.filter((id) => id !== active))
    setActive(null)
    haptic('miss')
  }

  function toggleLock() {
    if (active === null) return
    if (locks.includes(active)) {
      setLocks(locks.filter((id) => id !== active))
      setNote(null)
      return
    }
    if (locks.length >= MAX_LOCKS) {
      setNote('lineup.lock.full')
      haptic('miss')
      return
    }
    setLocks([...locks, active])
    setNote(null)
    haptic('lock')
  }

  function coach() {
    if (notes.length >= COACH_NOTES) return
    const index = notes.length
    startTransition(async () => {
      const got = await askCoach(seed, board, cursor, index, embedded?.window)
      if (got) setNotes((current) => [...current, got])
    })
  }

  function send() {
    setTunnel(false)
    startTransition(async () => {
      const result = await submitLineup(seed, board, cursor, embedded?.window)
      setVerdict(result)
      haptic(result && result.exact >= 8 ? 'lock' : 'tap')
    })
  }

  const prompt: MessageKey = held
    ? 'lineup.zone.prompt.held'
    : armedLine
      ? 'lineup.zone.prompt.band'
      : active
        ? 'lineup.zone.prompt.man'
        : complete
          ? 'lineup.prompt.full'
          : 'lineup.zone.prompt.start'

  const railOpen = !railShut && !complete && verdict === null
  const railItems = useMemo<RailItem[]>(
    () =>
      bank.map((locker) => {
        const parts = splitName(locker.nameHe)
        return {
          key: locker.id,
          family: compactName(locker.nameHe),
          given: parts.givenHe,
          look: look ?? { kind: 'engine', spec: kit ?? NEUTRAL_SHIRT_SPEC, seasonLabel: kitSeason ?? '', approx: false },
          taken: used.has(locker.id),
        }
      }),
    [bank, look, kit, kitSeason, used],
  )

  const men = board.map((row) => ({
    ...row,
    nameHe: nameOf.get(row.playerId) ?? row.playerId,
    locked: locks.includes(row.playerId),
  }))

  return (
    <>
      {!graded && !verdict && <EmptyState title={t('empty.lineup')} body={t('empty.lineup.body')} />}

      {!verdict && (
        <>
          {/* ================================================================ phone stage
              Maor, 23.9.2026: one screen, the pitch big, a locker DRAGGED onto a band. */}
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
              {LINES.map((line) => (
                <span
                  key={line}
                  className="flex min-h-[30px] shrink-0 items-center gap-1 border-hair border-ink/40 px-2 font-body text-[11px] text-ink"
                >
                  <span className="font-mono text-[12px] tabular-nums">
                    <Num>{String(counts[line])}</Num>
                  </span>
                  {t(LINE_LABEL[line])}
                </span>
              ))}
              <p className="ms-auto shrink-0 font-mono text-[13px] tracking-widest text-ink">
                <Num>{`${String(board.length).padStart(2, '0')}/${XI_SIZE}`}</Num>
              </p>
            </div>

            <FitBox ratio={100 / 122} className="mt-1.5">
              <BandPitchStage
                men={men}
                kit={kit}
                look={look}
                keeperLook={keeperLook}
                target={railOpen ? railLine : null}
                active={active}
                onBand={tapBandStage}
                onMan={tapMan}
                onDrop={(line, payload) => {
                  const id = payload.replace(/^(locker|man):/, '')
                  put(id, line)
                }}
              />
            </FitBox>

            {active !== null ? (
              <div className="mt-1.5 flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleLock}
                  aria-pressed={locks.includes(active)}
                  className={`min-h-tap flex-1 border-rule px-3 font-body text-[13px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                    locks.includes(active) ? 'border-red bg-red text-sheet' : 'border-ink bg-sheet text-ink'
                  }`}
                >
                  {locks.includes(active) ? t('lineup.lock.drop') : voiceAction(3, 'lock')}
                </button>
                <button
                  type="button"
                  onClick={sendBack}
                  className="min-h-tap flex-1 border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
                >
                  {t('lineup.zone.sendBack')}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  aria-label={t('stage.close')}
                  className="grid min-h-tap w-tap shrink-0 place-items-center font-mono text-[20px] leading-none text-ink"
                >
                  ×
                </button>
              </div>
            ) : railOpen ? (
              <div className="mt-1.5 shrink-0">
                <PickRail
                  target={railPrompt(railLine)}
                  targetSub={`${String(board.length).padStart(2, '0')}/${XI_SIZE}`}
                  items={railItems}
                  eras={false}
                  searchable={bank.length > 12}
                  chips={[
                    { key: 'coach', label: voiceAction(3, 'hint') ?? '', pressed: false, onClick: () => setMobileSheet('coach') },
                    ...(intro
                      ? [{ key: 'info', label: t('lineup.stage.setup'), pressed: false, onClick: () => setMobileSheet('info') }]
                      : []),
                  ]}
                  onPick={(id, shirt) => put(id, railLine, shirt)}
                  onDrop={(zone, id) => {
                    if (zone.startsWith('band-')) put(id, zone.replace(/^band-/, '') as Line)
                  }}
                  onClose={() => setRailShut(true)}
                />
              </div>
            ) : (
              <p className="mt-1.5 shrink-0 truncate border-hair border-ink/30 bg-sheet px-2.5 py-1.5 font-body text-[11px] leading-snug text-ink">
                {t(prompt)}
              </p>
            )}

            {!(railOpen && active === null) && (
            <div className="mt-1.5 flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTunnel(true)}
                disabled={!complete || pending}
                className="flex min-h-tap flex-1 items-center justify-center bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-40 motion-reduce:transition-none"
              >
                {pending ? t('state.loading') : t('lineup.stage.finish')}
              </button>
              {!complete && (
                <button
                  type="button"
                  onClick={() => {
                    setActive(null)
                    setRailShut(false)
                  }}
                  className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-2.5 font-body text-[11px] font-extrabold leading-none text-ink"
                >
                  {t('lineup.stage.rack')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileSheet('coach')}
                className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-2.5 font-body text-[11px] font-extrabold leading-none text-ink"
              >
                {voiceAction(3, 'hint')}
              </button>
              {intro && (
                <button
                  type="button"
                  onClick={() => setMobileSheet('info')}
                  className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-2.5 font-body text-[11px] font-extrabold leading-none text-ink"
                >
                  {t('lineup.stage.setup')}
                </button>
              )}
            </div>
            )}

            {note !== null && <p className="mt-1.5 shrink-0 font-body text-[11px] leading-snug text-red">{t(note)}</p>}
            {lastCall && (
              <p className="mt-1 shrink-0 border-s-rule border-red ps-2 font-body text-[11px] leading-snug text-red">
                {t('lineup.lastCall')}
              </p>
            )}

            <SlideSheet open={mobileSheet === 'coach'} onClose={() => setMobileSheet(null)} title={voiceAction(3, 'hint') ?? ''} size="auto">
              <ul className="flex flex-wrap gap-2">
                <li className="flex min-h-[34px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink">
                  <span className="font-mono text-step-0 tabular-nums">
                    <Num>{`${locks.length}/${MAX_LOCKS}`}</Num>
                  </span>
                  {t('lineup.lock.left')}
                </li>
                <li className="flex min-h-[34px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink">
                  <span className="font-mono text-step-0 tabular-nums">
                    <Num>{`${COACH_NOTES - notes.length}/${COACH_NOTES}`}</Num>
                  </span>
                  {t('lineup.coach.left')}
                </li>
              </ul>
              <button
                type="button"
                onClick={coach}
                disabled={notes.length >= COACH_NOTES || pending}
                className="mt-2 flex min-h-tap w-full items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink disabled:opacity-40"
              >
                {voiceAction(3, 'hint')}
              </button>
              {notes.length > 0 && (
                <ul className="mt-2 border-s-rule border-ink ps-2">
                  {notes.map((row, index) => (
                    <li key={`${row.kind}-${index}`} className="font-body text-step--1 leading-relaxed text-ink">
                      {coachSentence(row)}
                    </li>
                  ))}
                </ul>
              )}
            </SlideSheet>

            {intro && (
              <SlideSheet open={mobileSheet === 'info'} onClose={() => setMobileSheet(null)} title={t('lineup.stage.setup')} size="auto">
                <p className="font-body text-[11px] leading-snug text-muted">{t('lineup.zone.intro')}</p>
                {intro.dateDisputed && (
                  <p className="mt-1.5 font-body text-[11.5px] leading-snug text-ink">{t('lineup.intro.dateDisputed')}</p>
                )}
                {(sourceTitle !== '' || intro.matchSourceTitle) && <SourceNote newTab className="mt-2" />}
              </SlideSheet>
            )}
          </div>

          {/* ================================================================ desktop / tablet
              untouched design */}
          <div className="hidden md:block">
          {/* §12 — the gate opens on a line: "את המשחק אתה זוכר. מי עלה לדשא?" */}
          <p className="mt-stack font-display text-step-1 leading-tight text-ink">{opening.title}</p>
          {opening.body && <p className="mt-1 font-body text-step--1 leading-snug text-muted">{opening.body}</p>}

          {/* the zone counters — how many men stand in each band, never who, never out of what */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {LINES.map((line) => (
              <li
                key={line}
                className="flex min-h-[34px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink"
              >
                <span className="font-mono text-step-0 tabular-nums">
                  <Num>{String(counts[line])}</Num>
                </span>
                {t(LINE_LABEL[line])}
              </li>
            ))}
            <li className="ms-auto flex min-h-[34px] items-center font-mono text-step-1 tabular-nums text-ink">
              <Num>{`${String(board.length).padStart(2, '0')}/${XI_SIZE}`}</Num>
            </li>
          </ul>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_20rem]">
            <div>
              <BandPitch
                men={men}
                kit={kit}
                look={look}
                keeperLook={keeperLook}
                active={active}
                armed={held !== null || active !== null}
                armedLine={armedLine}
                onBand={tapBand}
                onMan={tapMan}
              />

              <p className="mt-2 font-body text-step--1 leading-snug text-muted">{t(prompt)}</p>
              {lastCall && (
                <p className="mt-1 border-s-rule border-red ps-2 font-body text-step--1 leading-snug text-red">
                  {t('lineup.lastCall')}
                </p>
              )}

              {/* the coach's table: the LOCK, back to the lockers, and the notes */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={toggleLock}
                  disabled={active === null}
                  aria-pressed={active !== null && locks.includes(active)}
                  className={`flex min-h-tap items-center justify-center border-rule px-3 font-body text-[13px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none ${
                    active !== null && locks.includes(active) ? 'border-red bg-red text-sheet' : 'border-ink bg-sheet text-ink'
                  }`}
                >
                  {active !== null && locks.includes(active) ? t('lineup.lock.drop') : voiceAction(3, 'lock')}
                </button>
                <button
                  type="button"
                  onClick={sendBack}
                  disabled={active === null}
                  className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none"
                >
                  {t('lineup.zone.sendBack')}
                </button>
                <button
                  type="button"
                  onClick={coach}
                  disabled={notes.length >= COACH_NOTES || pending}
                  className="col-span-2 flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none sm:col-span-1"
                >
                  {voiceAction(3, 'hint')}
                </button>
              </div>

              <ul className="mt-2 flex flex-wrap gap-2">
                <li className="flex min-h-[34px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink">
                  <span className="font-mono text-step-0 tabular-nums">
                    <Num>{`${locks.length}/${MAX_LOCKS}`}</Num>
                  </span>
                  {t('lineup.lock.left')}
                </li>
                <li className="flex min-h-[34px] items-center gap-2 border-hair border-ink px-2 font-body text-[12px] text-ink">
                  <span className="font-mono text-step-0 tabular-nums">
                    <Num>{`${COACH_NOTES - notes.length}/${COACH_NOTES}`}</Num>
                  </span>
                  {t('lineup.coach.left')}
                </li>
              </ul>

              {note !== null && <p className="mt-2 font-body text-step--1 leading-snug text-red">{t(note)}</p>}
              {active === null && locks.length === 0 && (
                <p className="mt-2 font-body text-step--1 leading-snug text-muted">{t('lineup.lock.hint')}</p>
              )}

              {notes.length > 0 && (
                <ul className="mt-2 border-s-rule border-ink ps-2">
                  {notes.map((row, index) => (
                    <li key={`${row.kind}-${index}`} className="font-body text-step--1 leading-relaxed text-ink">
                      {coachSentence(row)}
                    </li>
                  ))}
                </ul>
              )}
              {notes.length >= COACH_NOTES && (
                <p className="mt-1 font-body text-step--1 leading-snug text-muted">{t('lineup.coach.spent')}</p>
              )}

              {/* the way out sits under the board, in the same column, on both viewports */}
              <button
                type="button"
                onClick={() => setTunnel(true)}
                disabled={!complete || pending}
                className="mt-stack flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-1 font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none"
              >
                {pending ? t('state.loading') : t('lineup.tunnel')}
              </button>
            </div>

            <LockerRack bank={bank} used={used} selected={held} onSelect={tapLocker} kit={kit} kitSeason={kitSeason} look={look} />
          </div>
          </div>
        </>
      )}

      {tunnel && (
        <TunnelGate
          pending={pending}
          onSend={send}
          onLastSwitch={() => {
            setTunnel(false)
            setLastCall(true)
          }}
        />
      )}

      {verdict && (
        <TeamSheet
          verdict={verdict}
          locks={locks}
          notesTaken={notes.length}
          kit={kit}
          look={look}
          keeperLook={keeperLook}
          seed={`${seed}:${cursor}`}
          spoken={voice({
            gate: 3,
            moment: 'result',
            result: lineupTier(verdict),
            seed: `${seed}:${cursor}`,
            vars: { n: String(verdict.exact) },
          })}
          doors={embedded ? [] : next}
          share={
            embedded ? undefined : (
              // The card is the SHEET, not the score (rule 19): what travels is the team the
              // player sent out, by band, with the score beside the title. The x/y are the
              // display spots of the bands — nothing about them was graded.
              <ShareRow
                kind="lineup"
                params={{ s: String(seed), r: String(cursor) }}
                headline={`${verdict.exact}/${verdict.total}`}
                card={programmeCard({
                  match: fixture?.titleHe ?? t('screen.lineup.title'),
                  date: fixture?.dateHe ?? '',
                  slots: verdict.solution.map((man) => ({ role: t(LINE_LABEL[man.line]), found: verdict.rows.some((r) => r.playerId === man.playerId && r.status === 'exact') })),
                })}
                challenge={{ gate: 3, result: lineupResult(verdict) }}
              />
            )
          }
          onBack={() => {
            if (embedded) return embedded.onResult(verdict)
            setVerdict(null)
            setLastCall(true)
          }}
        >
          {embedded ? (
            <button
              type="button"
              onClick={() => embedded.onResult(verdict)}
              data-lineup="back"
              className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-1 font-extrabold text-paper"
            >
              {embedded.doneLabel}
            </button>
          ) : (
            <>
          <RecordRun gate="/lineup" correct={verdict.exact} asked={verdict.total} score={verdict.exact} />
          <CompareCard gate={3} mine={lineupResult(verdict)} />
          <PlayLink
            gate="/lineup"
            className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-1 font-extrabold text-paper"
          >
            {t('run.again')}
          </PlayLink>
            </>
          )}
        </TeamSheet>
      )}
    </>
  )
}

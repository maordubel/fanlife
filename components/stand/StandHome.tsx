'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { joinStandAction, leaveStandAction, peekStandAction, standHomeAction } from '@/app/stand/actions'
import { DailyCard } from '@/components/home/DailyCard'
import { track } from '@/lib/analytics/meter'
import { SITE_URL } from '@/lib/brand'
import type { Daily, DailyItem } from '@/lib/daily/types'
import { t, type MessageKey } from '@/lib/i18n'
import { readPref } from '@/lib/profile/identity'
import { defaultStandNick, publicName, type Peek, type StandError, type StandHome as Home } from '@/lib/stand/contract'
import type { StandDebate } from '@/lib/stand/debate'
import { forgetStand, noteStandDailyComplete, rememberStand, todayReport } from '@/lib/stand/local'
import { groupStory, notYetLine, objectives, pairLines } from '@/lib/stand/story'
import type { Station } from '@/lib/stand/week'

import { WeekCard } from './WeekCard'

/**
 * בית היציע (§8.2) — one route, two screens: a GUEST who arrived from the invite link and
 * a MEMBER. The guest is never walled off from playing: the day's three things are right
 * there, playable before (or instead of) joining (§50, §58.11). Joining is one tap, a
 * nickname optional; the device key it mints is httpOnly and never reaches this component.
 *
 * Every number on the member screen is a count the database answered from real rows
 * (§58.12). The blind cow and the debate tally stay closed until you have played and voted
 * — the database decides that, not this file.
 *
 * Phone: one column in reading order — today, the group result, the week, together, what
 * the stand remembers, the archive, the pairs, the feed, and the invite at the foot where a
 * thumb reaches it. Desktop: two columns, the invite beside the name at the top.
 */

const ERROR_KEY: Partial<Record<StandError, MessageKey>> = {
  unavailable: 'stand.error.unavailable',
  not_found: 'stand.error.not_found',
  not_member: 'stand.error.not_member',
  full: 'stand.error.full',
  too_many: 'stand.error.too_many',
  slow_down: 'stand.error.slow_down',
  bad_name: 'stand.error.bad_name',
}
const errorKey = (e: StandError): MessageKey => ERROR_KEY[e] ?? 'stand.error.generic'

type Phase =
  | { at: 'loading' }
  | { at: 'error'; error: StandError }
  | { at: 'guest'; peek: Peek }
  | { at: 'member'; home: Home }

export function StandHome({
  code,
  daily,
  debate,
  program,
  weekStart,
}: {
  code: string
  daily: Daily
  debate: StandDebate | null
  program: Station[]
  weekStart: string
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'loading' })

  const loadHome = useCallback(async () => {
    const report = todayReport(daily)
    const home = await standHomeAction(code, report)
    if (!home.ok) {
      if (home.error === 'not_member') forgetStand(code)
      setPhase({ at: 'error', error: home.error })
      return
    }
    rememberStand({ code: home.value.code, name: home.value.name })
    noteStandDailyComplete(daily.date, report.slots)
    setPhase({ at: 'member', home: home.value })
  }, [code, daily])

  useEffect(() => {
    let live = true
    peekStandAction(code)
      .then((peek) => {
        if (!live) return
        if (!peek.ok) setPhase({ at: 'error', error: peek.error })
        else if (peek.value.member) void loadHome()
        else setPhase({ at: 'guest', peek: peek.value })
      })
      .catch(() => live && setPhase({ at: 'error', error: 'network' }))
    return () => {
      live = false
    }
  }, [code, loadHome])

  if (phase.at === 'loading') {
    return (
      <div data-stand="loading">
        <p className="mt-stack font-body text-step--1 text-muted">{t('stand.loading')}</p>
        <DailyCard daily={daily} />
      </div>
    )
  }
  if (phase.at === 'error') {
    return (
      <div data-stand="error">
        <p role="status" className="mt-stack border-hair border-ink/40 bg-sheet p-3 font-body text-step--1 text-ink">
          {t(errorKey(phase.error))}
        </p>
        <p className="mt-3 font-body text-step--1 text-muted">{t('stand.join.playFirst')}</p>
        <div className="mt-2">
          <DailyCard daily={daily} />
        </div>
        <BackLink />
      </div>
    )
  }
  if (phase.at === 'guest') return <Guest peek={phase.peek} daily={daily} onJoined={loadHome} />
  return (
    <Member
      home={phase.home}
      daily={daily}
      debate={debate}
      program={program}
      weekStart={weekStart}
      onChanged={loadHome}
      onLeft={() => {
        forgetStand(code)
        window.location.assign('/stand')
      }}
    />
  )
}

function BackLink() {
  return (
    <p className="mt-stack">
      <Link href="/stand" className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4">
        {t('stand.back')}
      </Link>
    </p>
  )
}

/* ------------------------------------------------------------------ the guest */

function Guest({ peek, daily, onJoined }: { peek: Peek; daily: Daily; onJoined: () => Promise<void> }) {
  const [nick, setNick] = useState('')
  // §35 — the public nickname this device chose is the default; it can be changed for this stand
  useEffect(() => setNick((have) => have || defaultStandNick(readPref())), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StandError | null>(null)

  async function join() {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = await joinStandAction(peek.code, nick)
    if (!out.ok) {
      setError(out.error)
      setBusy(false)
      return
    }
    track('stand_joined', { gate: '/stand' })
    rememberStand({ code: out.value.code, name: out.value.name })
    await onJoined()
  }

  return (
    <div data-stand="guest">
      <section className="mt-stack border-rule border-ink bg-ink p-4 text-paper md:p-6">
        <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-concrete">{t('stand.join.eyebrow')}</p>
        <h2 className="mt-1 font-display text-step-2 leading-tight text-sheet">
          <bdi>{peek.name}</bdi>
        </h2>
        <p className="mt-1 font-body text-step--1 text-concrete">{t('stand.join.members', { n: String(peek.members) })}</p>
        <form
          className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void join()
          }}
        >
          <label className="flex flex-col gap-1 font-body text-[12px] text-concrete">
            {t('stand.join.nick')}
            <input
              value={nick}
              onChange={(event) => setNick(event.target.value)}
              maxLength={20}
              placeholder={t('stand.join.nickPh')}
              data-stand="nick"
              className="min-h-tap border-hair border-concrete/60 bg-paper px-3 font-body text-step-0 text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            data-stand="join"
            className="flex min-h-tap items-center justify-center bg-red px-5 font-body text-step-0 font-extrabold text-paper disabled:opacity-60"
          >
            {t('stand.join.cta')}
          </button>
        </form>
        {error && (
          <p role="status" className="mt-2 font-body text-[12px] text-concrete">
            {t(errorKey(error))}
          </p>
        )}
        <p className="mt-3 font-body text-[11.5px] leading-relaxed text-concrete">{t('stand.join.privacy')}</p>
        <p className="font-body text-[11.5px] leading-relaxed text-concrete">{t('stand.join.counts')}</p>
      </section>
      <p className="mt-stack font-body text-step--1 text-muted">{t('stand.join.playFirst')}</p>
      <div className="mt-2">
        <DailyCard daily={daily} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the member */

function Member({
  home,
  daily,
  debate,
  program,
  weekStart,
  onChanged,
  onLeft,
}: {
  home: Home
  daily: Daily
  debate: StandDebate | null
  program: Station[]
  weekStart: string
  onChanged: () => Promise<void>
  onLeft: () => void
}) {
  const discover = daily.items.find((item) => item.slot === 'discover') ?? null
  return (
    <div data-stand="member" className="md:grid md:grid-cols-[3fr_2fr] md:gap-x-6">
      <header className="mt-stack md:col-span-2 md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-red">{t('stand.title')}</p>
          <h2 className="font-display text-step-2 leading-tight text-ink">
            <bdi>{home.name}</bdi>
          </h2>
          <p className="font-body text-step--1 text-muted">
            {t('stand.mine.members', { n: String(home.members) })} · <bdi>{publicName(home.you.no, home.you.nick)}</bdi>{' '}
            <span className="text-[11px]">({t('stand.member.you')})</span>
          </p>
          <NickEdit code={home.code} current={home.you.nick} onChanged={onChanged} />
        </div>
        <div className="hidden md:block md:w-80">
          <Invite code={home.code} name={home.name} />
        </div>
      </header>

      <div className="min-w-0">
        <Today home={home} daily={daily} debate={debate} />
        <GroupResult home={home} />
        <WeekCard program={program} weekStart={weekStart} home={home} />
      </div>
      <div className="min-w-0">
        <Together home={home} program={program} />
        <Remember home={home} />
        {discover && <Archive item={discover} />}
        <Pairs home={home} />
        <Feed home={home} />
        <div className="md:hidden">
          <Invite code={home.code} name={home.name} />
        </div>
        <Leave code={home.code} onLeft={onLeft} />
      </div>
    </div>
  )
}

/**
 * §35 — the per-stand override. A member may be called something else in THIS stand than
 * the public nickname; re-joining with a new nickname is how the database already updates
 * it (`worker_stand_join` on an existing member), so no new function and no new privilege.
 * An empty field returns to the stand's anonymous "אדום מהיציע #N".
 */
function NickEdit({ code, current, onChanged }: { code: string; current: string | null; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [nick, setNick] = useState(current ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StandError | null>(null)
  if (!open) {
    return (
      <button
        type="button"
        data-stand="nick-edit"
        onClick={() => {
          setNick(current ?? defaultStandNick(readPref()))
          setOpen(true)
        }}
        className="mt-1 inline-flex min-h-tap items-center font-body text-[12px] font-extrabold text-red underline underline-offset-4"
      >
        {t('stand.nick.edit')}
      </button>
    )
  }
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (busy) return
        setBusy(true)
        setError(null)
        const out = await joinStandAction(code, nick)
        setBusy(false)
        if (!out.ok) return setError(out.error)
        setOpen(false)
        await onChanged()
      }}
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 font-body text-[12px] text-muted">
        {t('stand.nick.label')}
        <input
          value={nick}
          onChange={(event) => setNick(event.target.value)}
          maxLength={20}
          placeholder={t('stand.join.nickPh')}
          data-stand="nick-override"
          className="min-h-tap border-hair border-ink/40 bg-paper px-3 font-body text-step-0 text-ink"
        />
      </label>
      <button type="submit" disabled={busy} className="flex min-h-tap items-center justify-center bg-ink px-4 font-body text-[13px] font-extrabold text-paper disabled:opacity-60">
        {t('stand.nick.save')}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="flex min-h-tap items-center justify-center border-hair border-ink px-3 font-body text-[13px] font-extrabold text-ink">
        {t('stand.leave.no')}
      </button>
      {error && (
        <p role="status" className="w-full font-body text-[12px] text-muted">
          {t(errorKey(error))}
        </p>
      )}
    </form>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`stand-${id}`} data-stand={id} className="mt-stack">
      <h3 id={`stand-${id}`} className="font-display text-step-1 leading-none text-ink">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Today({ home, daily, debate }: { home: Home; daily: Daily; debate: StandDebate | null }) {
  const notYet = notYetLine(home)
  const challenges = home.feed.filter((row) => row.href.startsWith('/c/') && !row.mine).slice(0, 3)
  return (
    <Section id="today" title={t('stand.today.title')}>
      <DailyCard daily={daily} />
      {notYet && <p className="mt-2 font-body text-step--1 text-muted">{t(notYet.key, notYet.vars)}</p>}
      {debate && (
        <div data-stand="debate" className="mt-3 border-hair border-ink/40 bg-sheet p-3">
          <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-red">{t('stand.today.debate')}</p>
          <p className="mt-1 font-sign text-[16px] leading-snug text-ink">
            <bdi>{debate.promptHe}</bdi>
          </p>
          <DebateBody home={home} href={debate.href} />
        </div>
      )}
      <div data-stand="challenges" className="mt-3">
        <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-red">{t('stand.today.challenges')}</p>
        {challenges.length === 0 ? (
          <p className="mt-1 font-body text-step--1 text-muted">{t('stand.today.noChallenges')}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {challenges.map((row) => (
              <FeedItem key={`${row.at}-${row.href}`} row={row} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

function DebateBody({ home, href }: { home: Home; href: string }) {
  const d = home.debate
  if (!d.mine) {
    return (
      <>
        <p className="mt-1 font-body text-step--1 text-muted">
          {d.voters > 0 ? t('stand.debate.locked', { n: String(d.voters) }) : t('stand.debate.lockedNone')}
        </p>
        <Link href={href} className="mt-2 inline-flex min-h-tap items-center bg-ink px-4 font-body text-step--1 font-extrabold text-paper">
          {t('stand.debate.vote')}
        </Link>
      </>
    )
  }
  const total = Math.max(1, d.voters)
  return (
    <ul className="mt-2 space-y-1" data-stand="tally">
      {d.tally.map((row) => (
        <li key={row.pick} className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-body text-[13px] text-ink">
          <span className={row.pick === d.yours ? 'font-extrabold text-red' : ''}>
            <bdi>{row.labelHe}</bdi>
            {row.pick === d.yours && <span className="ms-2 text-[11px]">{t('stand.debate.yours')}</span>}
          </span>
          <span className="tabular-nums" dir="ltr">
            {row.n}/{total}
          </span>
        </li>
      ))}
    </ul>
  )
}

function GroupResult({ home }: { home: Home }) {
  const lines = groupStory(home)
  const bc = home.blindCow
  return (
    <Section id="result" title={t('stand.result.title')}>
      <div className="border-rule border-ink bg-ink p-4 text-paper">
        {lines.map((line, i) => (
          <p key={line.key} className={i === 0 ? 'font-display text-step-1 leading-tight text-sheet' : 'mt-1 font-body text-step-0 text-concrete'}>
            {t(line.key, line.vars)}
          </p>
        ))}
        {!bc.mine && bc.finished > 0 && (
          <>
            <p className="mt-2 font-body text-step--1 text-concrete" data-stand="bc-locked">
              {t('stand.story.bcLocked', { n: String(bc.finished) })}
            </p>
            <Link href="/blind-cow/daily" className="mt-2 inline-flex min-h-tap items-center bg-red px-4 font-body text-step--1 font-extrabold text-paper">
              {t('stand.story.bcPlay')}
            </Link>
          </>
        )}
      </div>
      {bc.mine && bc.ranking.length > 1 && (
        <div className="mt-2" data-stand="ranking">
          <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-muted">{t('stand.ranking.title')}</p>
          <ol className="mt-1 divide-y divide-ink/15 border-y border-ink/15">
            {bc.ranking.map((row) => (
              <li key={row.no} className="flex min-h-[36px] items-center justify-between gap-3 font-body text-[13px] text-ink">
                <span className={row.you ? 'font-extrabold' : ''}>
                  <bdi>{publicName(row.no, row.nick)}</bdi>
                </span>
                <span className="text-muted">{t('stand.ranking.hints', { n: String(row.hints) })}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Section>
  )
}

function Together({ home, program }: { home: Home; program: Station[] }) {
  const list = objectives(home, program)
  return (
    <Section id="together" title={t('stand.coop.title')}>
      <ul className="space-y-1.5">
        {list.map((goal) => (
          <li key={goal.key} data-done={goal.done ? 'true' : 'false'} className={`border-hair p-2.5 ${goal.done ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-sheet text-ink'}`}>
            <p className="font-body text-step--1 leading-snug">{t(goal.key)}</p>
            <p className={`mt-0.5 font-body text-[12px] font-extrabold ${goal.done ? 'text-concrete' : 'text-red'}`}>
              {goal.done ? t('stand.coop.done') : t('stand.coop.progress', { have: String(goal.have), need: String(goal.need) })}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Remember({ home }: { home: Home }) {
  const { daysTogether, debates } = home.remember
  const agreed = debates.find((d) => d.picks.length === 1) ?? null
  const split =
    debates
      .filter((d) => d.picks.length > 1 && d.voters >= 3)
      .sort((a, b) => (a.picks[0]?.n ?? 0) / a.voters - (b.picks[0]?.n ?? 0) / b.voters)[0] ?? null
  const empty = daysTogether === 0 && !agreed && !split
  return (
    <Section id="remember" title={t('stand.remember.title')}>
      {empty ? (
        <p className="font-body text-step--1 text-muted">{t('stand.remember.none')}</p>
      ) : (
        <div className="space-y-2">
          {daysTogether > 0 && <p className="font-body text-step-0 text-ink">{t('stand.remember.days', { n: String(daysTogether) })}</p>}
          {agreed && (
            <p className="font-body text-step--1 text-ink">
              <span className="font-extrabold text-red">{t('stand.remember.agreed')}: </span>
              <bdi>{agreed.promptHe}</bdi> — <bdi>{agreed.picks[0]?.labelHe}</bdi>
            </p>
          )}
          {split && (
            <div className="font-body text-step--1 text-ink">
              <p>
                <span className="font-extrabold text-red">{t('stand.remember.split')}: </span>
                <bdi>{split.promptHe}</bdi>
              </p>
              <ul className="mt-1 space-y-0.5">
                {split.picks.slice(0, 3).map((p) => (
                  <li key={p.pick} className="flex justify-between gap-3 text-[13px]">
                    <bdi>{p.labelHe}</bdi>
                    <span className="tabular-nums" dir="ltr">
                      {p.n}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

function Archive({ item }: { item: DailyItem }) {
  return (
    <Section id="archive" title={t('stand.archive.title')}>
      <Link href={item.href} className="flex min-h-tap flex-col justify-center border-hair border-ink/40 bg-sheet px-3 py-2 hover:bg-paper">
        <span className="font-sign text-[15px] leading-tight text-ink">
          <bdi>{item.subjectHe ?? t('stand.archive.title')}</bdi>
        </span>
      </Link>
    </Section>
  )
}

function Pairs({ home }: { home: Home }) {
  return (
    <Section id="pairs" title={t('stand.pairs.heading')}>
      {home.pairs.length === 0 ? (
        <p className="font-body text-step--1 text-muted">{t('stand.pairs.none')}</p>
      ) : (
        <ul className="space-y-2">
          {home.pairs.map((pair) => (
            <li key={pair.no} className="border-hair border-ink/40 bg-sheet p-3">
              <p className="font-sign text-[15px] text-ink">{t('stand.pairs.title', { name: publicName(pair.no, pair.nick) })}</p>
              <ul className="mt-1 space-y-0.5">
                {pairLines(pair).map((line) => (
                  <li key={line.key} className="font-body text-[13px] text-muted">
                    {t(line.key, line.vars)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function FeedItem({ row }: { row: Home['feed'][number] }) {
  return (
    <li>
      <Link href={row.href} className="flex min-h-tap items-center justify-between gap-3 border-hair border-ink/40 bg-sheet px-3 py-2 hover:bg-paper">
        <span className="min-w-0">
          <span className="block font-body text-[11px] text-muted">
            <bdi>{publicName(row.no, row.nick)}</bdi> · {t('stand.feed.gate', { n: String(row.gate) })}
          </span>
          <span className="block truncate font-sign text-[15px] text-ink">
            <bdi>{row.headline}</bdi>
          </span>
        </span>
        <span className="shrink-0 font-body text-[12px] font-extrabold text-red">{t('stand.feed.open')}</span>
      </Link>
    </li>
  )
}

function Feed({ home }: { home: Home }) {
  if (home.feed.length === 0) return null
  return (
    <Section id="feed" title={t('stand.feed.title')}>
      <ul className="space-y-1">
        {home.feed.map((row) => (
          <FeedItem key={`${row.at}-${row.href}-${row.no}`} row={row} />
        ))}
      </ul>
    </Section>
  )
}

function Invite({ code, name }: { code: string; name: string }) {
  const [note, setNote] = useState<MessageKey | null>(null)
  const link = `${SITE_URL}/stand/${code}`
  const wa = `https://wa.me/?text=${encodeURIComponent(`${t('stand.invite.line', { name })}\n${link}`)}`
  return (
    <section aria-label={t('stand.invite.title')} data-stand="invite" className="mt-stack border-rule border-ink bg-ink p-3 md:mt-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-step-0 text-paper">{t('stand.invite.title')}</p>
        <p className="font-body text-[11px] text-concrete">
          {t('stand.invite.code')}{' '}
          <bdi dir="ltr" className="font-latin tracking-[0.2em] text-sheet">
            {code}
          </bdi>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-tap items-center justify-center bg-red px-3 font-body text-step--1 font-extrabold text-paper"
        >
          {t('stand.invite.whatsapp')}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              setNote('stand.invite.copied')
            } catch {
              setNote('stand.error.generic')
            }
          }}
          className="flex min-h-tap items-center justify-center border-hair border-concrete/50 px-3 font-body text-step--1 text-paper"
        >
          {t('stand.invite.copy')}
        </button>
      </div>
      {note && (
        <p aria-live="polite" className="mt-1 font-body text-[11px] text-concrete">
          {t(note)}
        </p>
      )}
    </section>
  )
}

function Leave({ code, onLeft }: { code: string; onLeft: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <p className="mt-stack">
        <button type="button" onClick={() => setAsking(true)} className="inline-flex min-h-tap items-center font-body text-step--1 text-muted underline underline-offset-4">
          {t('stand.leave')}
        </button>
      </p>
    )
  }
  return (
    <div className="mt-stack border-hair border-ink/40 bg-sheet p-3" data-stand="leave">
      <p className="font-body text-step--1 text-ink">{t('stand.leave.confirm')}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const out = await leaveStandAction(code)
            if (out.ok || out.error === 'not_member') onLeft()
          }}
          className="inline-flex min-h-tap items-center bg-ink px-4 font-body text-step--1 font-extrabold text-paper"
        >
          {t('stand.leave.yes')}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="inline-flex min-h-tap items-center border-hair border-ink px-4 font-body text-step--1 text-ink">
          {t('stand.leave.no')}
        </button>
      </div>
    </div>
  )
}

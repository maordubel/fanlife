'use client'
import { useEffect, useState, useTransition } from 'react'

import { touchStreak } from '@/lib/clubs/streak'
import { answerTerrace, todayTerrace, type Public } from '@/app/clubs/[slug]/daily/actions'

export type TerraceCopy = {
  kicker: string; round: string; of: string; kinds: [string, string, string]; tryN: string; right: string; wrong: string; points: string
  yourDay: string; share: string; copied: string; back: string; notReady: string; closed: string; loading: string; gone: string
}
const BAR = (p: number | null) => (p === null ? '·' : p >= 100 ? '■■■' : p >= 70 ? '■■□' : p >= 40 ? '■□□' : '□□□')

/** Daily Terrace — three rounds, one graded attempt; the server holds the answers and grades each option. */
export function DailyTerrace({ slug, club, copy }: { slug: string; club: string; copy: TerraceCopy }) {
  const [s, setS] = useState<Public | null>(null)
  const [msg, setMsg] = useState<'closed' | 'not-ready' | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, go] = useTransition()

  useEffect(() => {
    void todayTerrace(slug).then((r) => (r.ok ? setS(r) : setMsg(r.error === 'NOT_READY' ? 'not-ready' : 'closed')))
  }, [slug])

  if (msg) return <p className="wk-panel" role="status">{msg === 'closed' ? copy.closed : copy.notReady}</p>
  if (!s) return <p className="wk-small" role="status">{copy.loading}</p>

  const round = s.points.findIndex((p) => p === null)
  const pick = (opt: number) => {
    if (busy || round < 0) return
    go(async () => {
      const r = await answerTerrace(slug, round, opt)
      if (!r.ok) { setFlash(copy.gone); return }
      setS(r.state)
      setFlash(r.correct ? copy.right : copy.wrong)
      if (r.state.finished) touchStreak(club)
    })
  }
  const share = async () => {
    const line = `${copy.kicker} · ${club} · ${s.edition.date}\n${s.points.map(BAR).join(' ')}  ${s.total}/300`
    try {
      if (navigator.share) await navigator.share({ text: line })
      else { await navigator.clipboard.writeText(line); setCopied(true) }
    } catch { /* a cancelled share is not an error */ }
  }

  if (s.finished) return (
    <section className="wk-panel terrace-done" aria-live="polite" data-testid="terrace-done">
      <p className="wk-k">{copy.yourDay}</p>
      <p className="wk-goal terrace-total">{s.total}<small>/300</small></p>
      <ol className="terrace-rows">{s.edition.rounds.map((r, i) => <li key={r.kind}><b>{copy.kinds[i]}</b><span>{BAR(s.points[i] ?? 0)} {s.points[i]}</span></li>)}</ol>
      <button type="button" className="wk-btn min-h-tap" onClick={share}>{copied ? copy.copied : copy.share}</button>
      <p className="wk-small">{copy.back}</p>
    </section>
  )

  const r = s.edition.rounds[round]!
  const tried = s.tried[round] ?? []
  return (
    <section className="terrace-round" aria-labelledby="terrace-q" data-testid="terrace-round" data-verdict={flash === copy.right ? 'right' : flash === copy.wrong ? 'wrong' : undefined} data-shout="off">
      <p className="wk-k">{copy.kicker} · {copy.round.replace('{n}', String(round + 1))} {copy.of} · {copy.kinds[round]}</p>
      <h2 className="wk-head" id="terrace-q">{r.prompt}</h2>
      <p className="wk-small">{copy.tryN.replace('{n}', String(tried.length + 1))}{flash ? ` · ${flash}` : ''}</p>
      <div className="game-options" role="group" aria-labelledby="terrace-q">
        {r.options.map((o, i) => (
          <button key={i} type="button" className="game-option min-h-tap" disabled={busy || tried.includes(i)} aria-disabled={tried.includes(i)} onClick={() => pick(i)}>{o}</button>
        ))}
      </div>
      {r.source && <p className="wk-small">{r.source}</p>}
    </section>
  )
}

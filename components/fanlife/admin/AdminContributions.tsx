'use client'
// FAN LIFE: hand-written (not in the fork map) — the editors' queue of offered photos, and the club merge.

import { useCallback, useEffect, useState } from 'react'

import { adminClubMerge, adminContributionQueue, adminContributionReview, photoUrl, type QueuedPhoto } from '@/lib/collector/api'
import { fl } from '@/lib/fanlife/copy'

const FILTERS = ['pending', 'approved', 'rejected'] as const

export function AdminContributions() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('pending')
  const [items, setItems] = useState<QueuedPhoto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    setItems(null)
    void adminContributionQueue(status).then((out) => {
      if (out.ok) { setItems(out.items); setError(null) } else setError(out.error)
    })
  }, [status])
  useEffect(load, [load])

  return (
    <div className="space-y-8">
      <section>
        <div role="tablist" className="flex flex-wrap gap-1.5 border-b-plate border-ink pb-2">
          {FILTERS.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={status === f} onClick={() => setStatus(f)}
              className={`min-h-tap border-rule px-3 font-sign text-[15px] font-bold ${status === f ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-sheet text-ink'}`}>
              {fl(`contrib.admin.${f}`)}
            </button>
          ))}
        </div>
        {error ? <p role="alert" className="mt-3 font-body text-step--1 font-extrabold text-red">{fl('contrib.error', { code: error })}</p> : null}
        {items && items.length === 0 ? <p className="mt-4 font-body text-step-0 text-muted">{fl('contrib.admin.empty')}</p> : null}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {(items ?? []).map((q) => <Card key={q.id} q={q} status={status} onDone={load} />)}
        </ul>
      </section>
      <Merge />
    </div>
  )
}

function Card({ q, status, onDone }: { q: QueuedPhoto; status: string; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function decide(next: 'approved' | 'rejected') {
    const out = await adminContributionReview(q.id, next, next === 'rejected' ? reason : undefined)
    if (!out.ok) { setErr(out.error); return }
    onDone()
  }
  return (
    <li className="border-rule border-ink bg-sheet p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-user-photo="" src={photoUrl(q.path)} alt="" className="aspect-[4/3] w-full border-hair border-ink/40 object-cover" />
      <p className="mt-2 font-body text-step--1 font-extrabold text-ink">{q.club}{q.season ? ` · ${q.season}` : ''}{q.variant ? ` · ${q.variant}` : ''}</p>
      <p className="font-body text-[12px] text-muted">{q.credit ? fl('contrib.admin.credit', { credit: q.credit }) : fl('contrib.admin.nocredit')}{q.marketingUse ? ` · ${fl('contrib.admin.marketing')}` : ''}</p>
      {q.note ? <p className="font-body text-[12px] text-muted">{q.note}</p> : null}
      {status !== 'approved' ? (
        <button type="button" onClick={() => void decide('approved')} className="mt-2 min-h-tap border-rule border-ink bg-ink px-3 font-body text-step--1 font-bold text-paper">{fl('contrib.admin.approve')}</button>
      ) : null}
      {status !== 'rejected' ? (
        rejecting ? (
          <div className="mt-2 flex gap-2">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={fl('contrib.admin.reason')} maxLength={300} className="min-h-tap min-w-0 flex-1 border-rule border-ink bg-paper px-2 font-body text-step--1" />
            <button type="button" disabled={!reason.trim()} onClick={() => void decide('rejected')} className="min-h-tap border-rule border-red bg-red px-3 font-body text-step--1 font-bold text-paper disabled:opacity-50">{fl('contrib.admin.reject')}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setRejecting(true)} className="ms-2 mt-2 min-h-tap border-rule border-ink/40 bg-paper px-3 font-body text-step--1 font-bold text-ink">{fl('contrib.admin.reject')}</button>
        )
      ) : null}
      {err ? <p role="alert" className="mt-1 font-body text-[12px] font-bold text-red">{fl('contrib.error', { code: err })}</p> : null}
    </li>
  )
}

function Merge() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  async function go() {
    const out = await adminClubMerge(from.trim(), to.trim())
    setBad(!out.ok)
    setMsg(out.ok ? fl('contrib.merge.done', { n: out.moved }) : fl('contrib.error', { code: out.error }))
  }
  const field = 'min-h-tap w-full border-rule border-ink bg-paper px-2 font-body text-step--1'
  return (
    <section className="border-rule border-ink bg-sheet p-3">
      <h2 className="font-sign text-step-1 font-bold text-ink">{fl('contrib.merge.title')}</h2>
      <p className="font-body text-[12px] text-muted">{fl('contrib.merge.hint')}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="font-body text-[12px] font-bold text-ink">{fl('contrib.merge.from')}<input value={from} onChange={(e) => setFrom(e.target.value)} className={field} /></label>
        <label className="font-body text-[12px] font-bold text-ink">{fl('contrib.merge.to')}<input value={to} onChange={(e) => setTo(e.target.value)} className={field} /></label>
      </div>
      <button type="button" disabled={!from.trim() || !to.trim()} onClick={() => void go()} className="mt-2 min-h-tap border-rule border-ink bg-ink px-3 font-body text-step--1 font-bold text-paper disabled:opacity-50">{fl('contrib.merge.go')}</button>
      {msg ? <p role={bad ? 'alert' : 'status'} className={`mt-1 font-body text-[12px] font-bold ${bad ? 'text-red' : 'text-ink'}`}>{msg}</p> : null}
    </section>
  )
}

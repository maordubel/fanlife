'use client'
// FAN LIFE: hand-written (not in the fork map) — "My contributions": consent per photo, never in bulk, always revocable.

import { useCallback, useEffect, useState } from 'react'

import { consentSet, contributionsMine, photoUrl, type Contribution, type CreditChoice } from '@/lib/collector/api'
import { fl } from '@/lib/fanlife/copy'

const CREDITS: CreditChoice[] = ['none', 'anonymous', 'nickname']

export function Contributions() {
  const [photos, setPhotos] = useState<Contribution[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    void contributionsMine().then((out) => {
      if (out.ok) setPhotos(out.photos)
      else setError(out.error)
    })
  }, [])
  useEffect(load, [load])

  if (error) return <p role="alert" className="font-body text-step--1 font-extrabold text-red">{fl('contrib.error', { code: error })}</p>
  if (!photos) return <p className="font-body text-step--1 text-muted">…</p>
  if (photos.length === 0) return <p className="font-body text-step-0 text-muted">{fl('contrib.empty')}</p>
  return (
    <ul className="grid gap-4 sm:grid-cols-2" data-contributions="">
      {photos.map((p) => <Row key={p.id} p={p} onChange={load} />)}
    </ul>
  )
}

function Row({ p, onChange }: { p: Contribution; onChange: () => void }) {
  const [archive, setArchive] = useState(p.archiveUse)
  const [marketing, setMarketing] = useState(p.marketingUse)
  const [credit, setCredit] = useState<CreditChoice>(p.credit)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function save(a: boolean, m: boolean, c: CreditChoice) {
    setBusy(true)
    setNote(null)
    const out = await consentSet(p.id, a, m, c)
    setBusy(false)
    if (!out.ok) {
      setNote(fl('contrib.error', { code: out.error }))
      // the server is the judge: show what it holds
      setArchive(p.archiveUse); setMarketing(p.marketingUse); setCredit(p.credit)
      return
    }
    setNote(fl('contrib.saved'))
    onChange()
  }
  const anyUse = archive || marketing
  return (
    <li className="border-rule border-ink bg-sheet p-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-user-photo="" src={photoUrl(p.path)} alt="" className="h-24 w-24 shrink-0 border-hair border-ink/40 object-cover" />
        <div className="min-w-0">
          <p className="font-body text-step--1 font-extrabold text-ink">{p.club}</p>
          {p.season ? <p className="font-body text-[12px] text-muted">{p.season}</p> : null}
          <p className="mt-1 inline-block border-hair border-ink/40 px-1.5 font-body text-[11px] font-extrabold text-ink" data-review={p.review}>{fl(`contrib.review.${p.review}`)}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Switch label={fl('contrib.archive')} on={archive} disabled={busy} onChange={(v) => { setArchive(v); void save(v, marketing, credit) }} />
        <Switch label={fl('contrib.marketing')} on={marketing} disabled={busy} onChange={(v) => { setMarketing(v); void save(archive, v, credit) }} />
        <fieldset disabled={busy || !anyUse} className="disabled:opacity-50">
          <legend className="font-body text-[11.5px] font-extrabold text-muted">{fl('contrib.credit')}</legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CREDITS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={credit === c}
                onClick={() => { setCredit(c); void save(archive, marketing, c) }}
                className={`min-h-tap border-rule px-3 font-body text-step--1 font-bold ${credit === c ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'}`}
              >
                {fl(`contrib.credit.${c}`)}
              </button>
            ))}
          </div>
        </fieldset>
        {note ? <p role="status" className="font-body text-[12px] text-muted">{note}</p> : null}
      </div>
    </li>
  )
}

function Switch({ label, on, disabled, onChange }: { label: string; on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex min-h-tap w-full items-center gap-3 border-rule px-3 py-2 text-start disabled:opacity-60 ${on ? 'border-ink bg-paper' : 'border-ink/30 bg-sheet'}`}
    >
      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center border-rule font-body text-[14px] font-black ${on ? 'border-ink bg-ink text-paper' : 'border-ink'}`}>{on ? '✓' : ''}</span>
      <span className="font-body text-step--1 font-extrabold text-ink">{label}</span>
    </button>
  )
}

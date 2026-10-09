'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { UserPhoto } from '@/components/fanlife/collector/UserPhoto'
import { CollectorTag } from '@/components/fanlife/collector/CollectorTag'
import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'
import { photoStore } from '@/lib/collector/api'
import type { CollectorShirt } from '@/lib/collector/types'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import { shirtName } from '@/lib/fanlife/collector/market'
import { idreqGet, idreqList, idreqMine, idreqOpen, idreqPropose, idreqResolve } from '@/lib/fanlife/hub/api'
import { circleKeyForClub } from '@/lib/fanlife/hub/clubs'
import { h } from '@/lib/fanlife/hub/copy'
import type { IdProposal, IdRequest } from '@/lib/fanlife/hub/types'
import { portalConfigured } from '@/lib/portal/env'
import { sessionUserId } from '@/lib/portal/sync'
import { REGISTRY } from '@/lib/master/registry'

import { MarketSignIn } from './MarketSignIn'
import { Kicker, Notice, buttonPlain, buttonPrimary } from './HubParts'

type Shirt = CollectorShirt & { club?: string; clubName?: string }

const suggestions = (n: number) => (n === 0 ? h('hub.help.noSuggestions') : n === 1 ? h('hub.help.oneSuggestion') : h('hub.help.suggestions', { n }))

/** A request card: photos, the asker's words, how many suggestions, and the way in. */
function Card({ r, shirts, onOpen }: { r: IdRequest; shirts: Readonly<Record<string, Shirt>>; onOpen: () => void }) {
  const solved = r.solvedSlug ? shirts[r.solvedSlug] : null
  return (
    <li className="border-rule border-ink bg-paper p-2.5">
      <div className="flex gap-1.5 overflow-x-auto">
        {r.photos.map((p) => (
          <span key={p} className="block h-[84px] w-[84px] shrink-0 border-hair border-ink/30"><UserPhoto path={p} /></span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {r.asker ? <CollectorTag label={r.asker} compact /> : null}
        <span className="font-body text-[11.5px] font-extrabold text-muted">
          {r.status === 'solved' ? h('hub.help.solved', { shirt: solved ? shirtName(solved) : '' }) : r.status === 'closed' ? h('hub.help.closed') : suggestions(r.proposals)}
        </span>
      </div>
      {r.note ? <p className="mt-1 font-body text-[13px] text-ink">{h('hub.help.askerNote', { note: r.note })}</p> : null}
      <button type="button" onClick={onOpen} className={`${buttonPlain} mt-2`}>
        {r.mine ? h('hub.help.mine') : r.status === 'open' ? h('hub.help.suggest') : h('hub.help.seeShirt')}
      </button>
    </li>
  )
}

/** One request, open: suggestions, the suggest form, and (for the asker) "this is it". */
function Detail({ id, shirts, signedIn, onClose, onChanged }: { id: string; shirts: Readonly<Record<string, Shirt>>; signedIn: boolean; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<{ request: IdRequest; proposals: IdProposal[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<string | null>(null)
  const [why, setWhy] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(() => {
    void idreqGet(id).then((out) => (out.ok ? setData(out) : setError(errorLabel(out.error))))
  }, [id])
  useEffect(load, [load])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return Object.values(shirts)
      .filter((s) => {
        const hay = `${s.clubName ?? ''} ${s.variantHe} ${s.seasonLabel ?? ''} ${s.yearRaw ?? ''}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .slice(0, 8)
  }, [q, shirts])

  const suggest = async () => {
    if (!pick) return
    setBusy(true)
    const out = await idreqPropose(id, pick, why)
    setBusy(false)
    if (out.ok) {
      setSent(true)
      setPick(null)
      setQ('')
      setWhy('')
      load()
      onChanged()
    } else setError(errorLabel(out.error))
  }
  const resolve = async (proposalId: string | null) => {
    setBusy(true)
    const out = await idreqResolve(id, proposalId)
    setBusy(false)
    if (out.ok) {
      load()
      onChanged()
    } else setError(errorLabel(out.error))
  }

  const r = data?.request
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center" role="dialog" aria-modal="true" aria-label={h('hub.help.suggestTitle')}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto border-plate border-ink bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-step-1 leading-tight text-ink">{h('hub.help.suggestTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={h('hub.close')} className="min-h-tap min-w-tap font-body text-step-0 font-extrabold text-ink">✕</button>
        </div>
        {error ? <p className="mt-2 font-body text-[13px] font-extrabold text-red" role="alert">{error}</p> : null}
        {!r ? (
          <p className="mt-3 font-body text-step--1 text-muted" role="status">{h('hub.circles.loading')}</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {r.photos.map((p) => (
                <span key={p} className="block aspect-square border-hair border-ink/30"><UserPhoto path={p} /></span>
              ))}
            </div>
            {r.note ? <p className="mt-2 font-body text-[13px] text-ink">{h('hub.help.askerNote', { note: r.note })}</p> : null}

            <ul className="mt-3 grid gap-1.5">
              {data!.proposals.map((p) => {
                const s = shirts[p.archiveSlug]
                return (
                  <li key={p.id} className="flex items-center gap-3 border-hair border-ink/30 bg-sheet p-2">
                    <span className="block w-[44px] shrink-0">{s ? <ArchivePhoto shirt={s} /> : null}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-[13px] font-extrabold text-ink">{s ? <>{s.variantHe} · <ShirtDate shirt={s} /></> : p.archiveSlug}</span>
                      {p.note ? <span className="block font-body text-[12px] text-muted">{p.note}</span> : null}
                      <span className="block font-body text-[11px] text-muted">{p.mine ? h('hub.help.youSuggested') : h('hub.help.from', { who: '' })}{p.mine || !p.by ? null : <CollectorTag label={p.by} compact />}</span>
                    </span>
                    {r.mine && r.status === 'open' ? (
                      <button type="button" disabled={busy} onClick={() => void resolve(p.id)} className={buttonPrimary}>{h('hub.help.pick')}</button>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            {r.status === 'solved' && r.solvedSlug ? (
              <p className="mt-3"><Link href={`/market?slug=${encodeURIComponent(r.solvedSlug)}`} className={buttonPrimary}>{h('hub.help.seeShirt')}</Link></p>
            ) : null}
            {r.mine && r.status === 'open' ? (
              <button type="button" disabled={busy} onClick={() => void resolve(null)} className={`${buttonPlain} mt-3`}>{h('hub.help.closeQ')}</button>
            ) : null}

            {!r.mine && r.status === 'open' ? (
              signedIn ? (
                <div className="mt-3">
                  {sent ? <p className="font-body text-[13px] font-extrabold text-ink" role="status">{h('hub.help.suggestSent')}</p> : null}
                  {pick && shirts[pick] ? (
                    <div className="flex items-center gap-3 border-rule border-ink bg-sheet p-2">
                      <span className="block w-[44px] shrink-0"><ArchivePhoto shirt={shirts[pick]!} /></span>
                      <span className="min-w-0 flex-1 truncate font-body text-[13px] font-extrabold text-ink">{shirtName(shirts[pick])}</span>
                      <button type="button" onClick={() => setPick(null)} className="min-h-tap px-2 font-body text-[12px] font-extrabold text-sign underline underline-offset-4">{h('hub.request.change')}</button>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="hub-help-q" className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.search')}</label>
                      <input id="hub-help-q" value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 min-h-tap w-full border-rule border-ink bg-sheet px-3 font-body text-[14px] text-ink" />
                      <ul className="mt-1">
                        {hits.map((s) => (
                          <li key={s.slug}>
                            <button type="button" onClick={() => setPick(s.slug)} className="flex min-h-tap w-full items-center gap-3 border-b-hair border-dashed border-ink/40 py-1.5 text-start">
                              <span className="block w-[40px] shrink-0"><ArchivePhoto shirt={s} /></span>
                              <span className="min-w-0 flex-1 truncate font-body text-[13px] font-extrabold text-ink">{s.clubName} · {s.variantHe}</span>
                              <span className="font-poster text-[16px] text-ink"><ShirtDate shirt={s} /></span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {pick ? (
                    <>
                      <label htmlFor="hub-help-why" className="mt-2 block font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.why')}</label>
                      <input id="hub-help-why" value={why} maxLength={200} onChange={(e) => setWhy(e.target.value)} className="mt-1 min-h-tap w-full border-hair border-ink/40 bg-sheet px-2 font-body text-[14px] text-ink" />
                      <button type="button" disabled={busy} onClick={() => void suggest()} className={`${buttonPrimary} mt-2`}>{h('hub.help.suggestSend')}</button>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 font-body text-[13px] text-ink">{h('hub.help.signIn')}</p>
              )
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** The ask form: photos first (they are the question), a note, an optional club hint. */
function Ask({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const id = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [club, setClub] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clubs = useMemo(() => REGISTRY.filter((c) => circleKeyForClub(c.id)).sort((a, b) => a.name.localeCompare(b.name)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const add = async (files: FileList | null) => {
    if (!files) return
    const userId = await sessionUserId()
    if (!userId) return setError(errorLabel('auth_required'))
    setBusy(true)
    setError(null)
    for (const file of Array.from(files).slice(0, 4 - photos.length)) {
      const out = await photoStore(userId, id.current, file)
      if (out.ok) setPhotos((p) => (p.length < 4 ? [...p, out.path] : p))
      else setError(h('hub.help.photoFailed'))
    }
    setBusy(false)
  }
  const send = async () => {
    if (!photos.length) return setError(h('hub.help.needPhoto'))
    setBusy(true)
    const out = await idreqOpen(id.current, photos, note, club || null)
    setBusy(false)
    if (out.ok) onDone()
    else setError(errorLabel(out.error))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center" role="dialog" aria-modal="true" aria-label={h('hub.help.ask')}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto border-plate border-ink bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-step-1 leading-tight text-ink">{h('hub.help.ask')}</h2>
          <button type="button" onClick={onClose} aria-label={h('hub.close')} className="min-h-tap min-w-tap font-body text-step-0 font-extrabold text-ink">✕</button>
        </div>
        <p className="mt-2 font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.photos')}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {photos.map((p) => (
            <span key={p} className="relative block h-[84px] w-[84px] border-hair border-ink/30">
              <UserPhoto path={p} />
              <button type="button" aria-label={h('hub.help.removePhoto')} onClick={() => setPhotos((l) => l.filter((x) => x !== p))} className="absolute end-0 top-0 min-h-tap min-w-tap bg-ink/70 font-body text-[13px] font-extrabold text-paper">✕</button>
            </span>
          ))}
          {photos.length < 4 ? (
            <label className="flex h-[84px] w-[84px] cursor-pointer items-center justify-center border-rule border-dashed border-ink px-1 text-center font-body text-[11.5px] font-extrabold text-sign">
              {h('hub.help.addPhotos')}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => void add(e.target.files)} />
            </label>
          ) : null}
        </div>
        <label htmlFor="hub-ask-note" className="mt-3 block font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.note')}</label>
        <textarea id="hub-ask-note" value={note} maxLength={300} rows={3} placeholder={h('hub.help.notePlaceholder')} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full border-rule border-ink bg-sheet p-2 font-body text-[14px] text-ink" />
        <label htmlFor="hub-ask-club" className="mt-2 block font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.club')}</label>
        <select id="hub-ask-club" value={club} onChange={(e) => setClub(e.target.value)} className="mt-1 min-h-tap w-full border-hair border-ink/40 bg-paper px-2 font-body text-[14px] text-ink">
          <option value="">{h('hub.help.anyClub')}</option>
          {clubs.map((c) => (
            <option key={c.id} value={circleKeyForClub(c.id) ?? ''}>{c.name}</option>
          ))}
        </select>
        {error ? <p className="mt-2 font-body text-[13px] font-extrabold text-red" role="alert">{error}</p> : null}
        <button type="button" disabled={busy} onClick={() => void send()} className={`${buttonPrimary} mt-3`}>{h('hub.help.send')}</button>
      </div>
    </div>
  )
}

export function HelpScreen({ shirts }: { shirts: Readonly<Record<string, Shirt>> }) {
  const [open, setOpen] = useState<IdRequest[] | null>(null)
  const [mine, setMine] = useState<IdRequest[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!portalConfigured()) return setOpen([])
    void idreqList().then((out) => (out.ok ? setOpen(out.requests) : setFailed(errorLabel(out.error))))
    void idreqMine().then((out) => {
      setSignedIn(out.ok)
      if (out.ok) setMine(out.requests)
    })
  }, [])
  useEffect(() => {
    load()
    const req = new URLSearchParams(window.location.search).get('req')
    if (req && /^[0-9a-f-]{36}$/.test(req)) setDetail(req)
  }, [load])

  return (
    <div className="mt-stack" data-hub="help">
      <p><Link href="/market?view=circles" className="min-h-tap inline-flex items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">← {h('hub.help.back')}</Link></p>
      <Kicker>{h('hub.help.title')}</Kicker>
      <p className="mt-1 max-w-prose font-body text-step--1 leading-relaxed text-ink">{h('hub.help.lede')}</p>
      <div className="mt-3">
        {signedIn ? <button type="button" onClick={() => setAsking(true)} className={buttonPrimary}>{h('hub.help.ask')}</button> : <MarketSignIn next="/market/help" />}
      </div>
      {note ? <p className="mt-2 border-hair border-ink bg-sheet px-3 py-2 font-body text-[13px] font-extrabold text-ink" role="status">{note}</p> : null}
      {failed ? <Notice title={h('hub.help.title')} body={failed} tone="red" /> : null}

      {signedIn ? (
        <section className="mt-stack" aria-label={h('hub.help.mine')}>
          <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.mine')}</h3>
          {mine.length ? (
            <ul className="mt-1 grid gap-2">{mine.map((r) => <Card key={r.id} r={r} shirts={shirts} onOpen={() => setDetail(r.id)} />)}</ul>
          ) : (
            <p className="mt-1 font-body text-[13px] text-muted">{h('hub.help.noMine')}</p>
          )}
        </section>
      ) : null}

      <section className="mt-stack" aria-label={h('hub.help.open')}>
        <h3 className="font-body text-[11px] font-extrabold uppercase tracking-wide text-muted">{h('hub.help.open')}</h3>
        {open === null ? (
          <p className="mt-1 font-body text-step--1 text-muted" role="status">{h('hub.circles.loading')}</p>
        ) : open.length ? (
          <ul className="mt-1 grid gap-2 sm:grid-cols-2">{open.map((r) => <Card key={r.id} r={r} shirts={shirts} onOpen={() => setDetail(r.id)} />)}</ul>
        ) : (
          <p className="mt-1 border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{h('hub.help.empty')}</p>
        )}
      </section>

      {detail ? <Detail id={detail} shirts={shirts} signedIn={signedIn} onClose={() => setDetail(null)} onChanged={load} /> : null}
      {asking ? <Ask onClose={() => setAsking(false)} onDone={() => { setAsking(false); setNote(h('hub.help.sent')); load() }} /> : null}
    </div>
  )
}

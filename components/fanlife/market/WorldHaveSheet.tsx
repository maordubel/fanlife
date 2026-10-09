'use client'
// FAN LIFE — hand-written (rest of the world, 9.10.2026). Two steps: which club (type-ahead over the library,
// or a new name), then what the seller knows. Everything optional stays optional — "unknown" is a real answer.

import { useEffect, useRef, useState } from 'react'

import { clubSearch, worldHave, type LibraryClub } from '@/lib/fanlife/hub/api'
import { h } from '@/lib/fanlife/hub/copy'
import { countryFlag } from '@/lib/fanlife/hub/places'
import { worldShirt } from '@/lib/fanlife/world'

const VARIANTS = ['home', 'away', 'third', 'goalkeeper', 'training', 'special'] as const
const VARIANT_LABEL: Record<(typeof VARIANTS)[number], string> = { home: 'Home', away: 'Away', third: 'Third', goalkeeper: 'Keeper', training: 'Training', special: 'Special' }

export function WorldHaveSheet({ signedIn, signIn, onClose, onDone }: { signedIn: boolean | null; signIn: React.ReactNode; onClose: () => void; onDone: (itemId: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<LibraryClub[]>([])
  const [club, setClub] = useState<{ key: string | null; name: string; country: string | null } | null>(null)
  const [season, setSeason] = useState('')
  const [variant, setVariant] = useState<string | null>(null)
  const [maker, setMaker] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  const run = useRef(0)

  useEffect(() => {
    const mine = ++run.current
    const id = window.setTimeout(() => {
      void clubSearch(q.trim(), 8).then((out) => {
        if (mine === run.current && out.ok) setHits(out.clubs)
      })
    }, 140)
    return () => window.clearTimeout(id)
  }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const typed = q.trim()
  const exact = hits.some((c) => c.name.toLowerCase() === typed.toLowerCase())

  async function create() {
    if (!club || busy) return
    setBusy(true)
    setErr(false)
    const out = await worldHave({ clubKey: club.key, clubName: club.name, country: club.country, season: season.trim() || null, variant, maker: maker.trim() || null })
    setBusy(false)
    if (out.ok) {
      const w = out.item.world
      if (w) worldShirt(out.item.id, w)
      onDone(out.item.id)
    } else setErr(true)
  }

  return (
    <div className="fl-wiz z-[60]" role="dialog" aria-modal="true" aria-label={h('hub.wizard.title')} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fl-wiz-card">
        <header className="fl-wiz-head">
          <p><span aria-hidden="true">{step}/2</span> {step === 1 ? h('hub.wizard.step.club') : h('hub.wizard.step.details')}</p>
          <button type="button" onClick={onClose} aria-label={h('hub.wizard.close')} className="fl-wiz-x min-h-tap">✕</button>
        </header>
        <h2 className="fl-wiz-title">{h('hub.wizard.title')}</h2>

        {signedIn === false ? (
          <div className="fl-wiz-body"><p>{h('hub.wizard.signin')}</p><div className="fl-wiz-row">{signIn}</div></div>
        ) : step === 1 ? (
          <div className="fl-wiz-body">
            <label htmlFor="wiz-club" className="fl-wiz-label">{h('hub.wizard.club.label')}</label>
            <input id="wiz-club" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={h('hub.wizard.club.placeholder')} maxLength={60} autoComplete="off" className="fl-wiz-input" />
            <ul className="fl-wiz-list">
              {hits.map((c) => (
                <li key={c.key}>
                  <button type="button" className="min-h-tap" onClick={() => { setClub({ key: c.key, name: c.name, country: c.country }); setStep(2) }}>
                    <b>{c.name}</b>
                    <span>{c.country ? countryFlag(c.country) : ''}</span>
                  </button>
                </li>
              ))}
              {typed.length >= 2 && !exact ? (
                <li>
                  <button type="button" className="min-h-tap fl-wiz-new" onClick={() => { setClub({ key: null, name: typed, country: null }); setStep(2) }}>
                    <b>{h('hub.wizard.club.new', { name: typed })}</b>
                    <small>{h('hub.wizard.club.newHint')}</small>
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className="fl-wiz-body">
            <p className="fl-wiz-club">{club?.name}</p>
            <label htmlFor="wiz-season" className="fl-wiz-label">{h('hub.wizard.season.label')}</label>
            <input id="wiz-season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder={h('hub.wizard.season.placeholder')} maxLength={20} className="fl-wiz-input" />
            <p className="fl-wiz-label" id="wiz-kit">{h('hub.wizard.variant.label')}</p>
            <div className="fl-wiz-chips" role="group" aria-labelledby="wiz-kit">
              <button type="button" aria-pressed={variant === null} onClick={() => setVariant(null)}>{h('hub.wizard.variant.none')}</button>
              {VARIANTS.map((v) => <button key={v} type="button" aria-pressed={variant === v} onClick={() => setVariant(v)}>{VARIANT_LABEL[v]}</button>)}
            </div>
            <label htmlFor="wiz-maker" className="fl-wiz-label">{h('hub.wizard.maker.label')}</label>
            <input id="wiz-maker" value={maker} onChange={(e) => setMaker(e.target.value)} placeholder={h('hub.wizard.maker.placeholder')} maxLength={30} className="fl-wiz-input" />
            <p className="fl-wiz-honest">{h('hub.wizard.honest')}</p>
            {err ? <p className="fl-wiz-err" role="alert">{h('hub.wizard.error')}</p> : null}
            <div className="fl-wiz-row">
              <button type="button" className="fl-wiz-back min-h-tap" onClick={() => setStep(1)}>{h('hub.wizard.back')}</button>
              <button type="button" className="fl-world-go min-h-tap" disabled={busy} onClick={() => void create()}>{busy ? h('hub.wizard.creating') : h('hub.wizard.create')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

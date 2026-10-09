'use client'

import { useEffect, useState } from 'react'

import { errorLabel } from '@/lib/fanlife/collector/labels'
import { placeSet } from '@/lib/fanlife/hub/api'
import { h } from '@/lib/fanlife/hub/copy'
import { COUNTRY_CODES, countryFlag, countryName, placeLine } from '@/lib/fanlife/hub/places'
import type { Place } from '@/lib/fanlife/hub/types'

import { Kicker, buttonPlain, buttonPrimary } from './HubParts'

/**
 * "Where are you?" — optional, and hidden until you say otherwise. A place makes two things possible: your copies
 * can tell a buyer where they are, and you can filter the market down to sellers who ship to your country.
 * It is never inferred from anything.
 */
export function PlaceCard({ place, onChange }: { place: Place | null; onChange: (next: Place) => void }) {
  const [country, setCountry] = useState(place?.country ?? '')
  const [city, setCity] = useState(place?.city ?? '')
  const [show, setShow] = useState(place?.show ?? true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setCountry(place?.country ?? '')
    setCity(place?.city ?? '')
    setShow(place?.show ?? true)
  }, [place?.country, place?.city, place?.show])

  const save = async (clear = false) => {
    setBusy(true)
    setMessage(null)
    const out = clear ? await placeSet(null, null, false) : await placeSet(country || null, city.trim() || null, show)
    setBusy(false)
    if (!out.ok) return setMessage(errorLabel(out.error))
    onChange(out)
    setMessage(clear ? h('hub.place.cleared') : h('hub.place.saved'))
  }

  const line = place?.country ? placeLine({ country: place.country, city: place.city }) : null
  return (
    <section aria-label={h('hub.place.title')} className="mt-3 border-plate border-ink bg-sheet p-3">
      <Kicker>{h('hub.place.title')}</Kicker>
      <p className="mt-1 max-w-prose font-body text-[12.5px] leading-snug text-muted">{h('hub.place.lede')}</p>
      {line ? (
        <p className="mt-2 font-body text-[13px] font-extrabold text-ink" role="status">
          {countryFlag(place!.country!)} {place!.show ? h('hub.place.shown', { place: line }) : h('hub.place.hidden')}
        </p>
      ) : null}
      <form
        className="mt-2 grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="grid gap-1 font-body text-[10.5px] font-extrabold uppercase tracking-wide text-muted">
          {h('hub.place.country')}
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="min-h-tap border-hair border-ink/40 bg-paper px-2 font-body text-[14px] normal-case tracking-normal text-ink">
            <option value="">{h('hub.place.pick')}</option>
            {COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>{`${countryFlag(code)} ${countryName(code)}`}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-body text-[10.5px] font-extrabold uppercase tracking-wide text-muted">
          {h('hub.place.city')}
          <input value={city} maxLength={40} onChange={(e) => setCity(e.target.value)} className="min-h-tap border-hair border-ink/40 bg-paper px-2 font-body text-[14px] normal-case tracking-normal text-ink" />
        </label>
        <label className="flex min-h-tap items-center gap-2 font-body text-[13px] text-ink sm:col-span-2">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-5" />
          {h('hub.place.show')}
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={busy || !country} className={buttonPrimary}>{h('hub.place.save')}</button>
          {place?.country ? (
            <button type="button" disabled={busy} onClick={() => void save(true)} className={buttonPlain}>{h('hub.place.clear')}</button>
          ) : null}
        </div>
      </form>
      {message ? <p className="mt-2 font-body text-[12.5px] font-extrabold text-ink" role="status">{message}</p> : null}
    </section>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { cardExtras } from '@/app/tik/actions'
import { readBook, type SupporterRecord } from '@/lib/game/member'
import { t } from '@/lib/i18n'
import { positionLabel } from '@/lib/polls/ballot'
import { memoryMap, type MemoryMapReading } from '@/lib/profile/memoryMap'
import { readRawDevice, recordsFrom } from '@/lib/profile/records'
import { readStandLink, type StandLink } from '@/lib/profile/standLink'
import { emptyProfile, readProfile } from '@/lib/profile/store'

import { MemoryMap } from './MemoryMap'
import { PublicIdentity } from './PublicIdentity'

/**
 * "אני" — under the card (ONE RED WORLD §24): how the terrace sees you, what you said about
 * yourself (position, favourite, gate 7's "הכרטיס שלי", your stand), and the memory map.
 *
 * The name, the number and "fan since" are the card's own fields and stay on the card and
 * its editor above — this panel does not print a second copy of them. Everything here is
 * read from the device after mount; the first render is the empty reading, so the server and
 * the client agree on every character.
 */
export function MeArea() {
  const [seal, setSeal] = useState<SupporterRecord | null>(null)
  const [sealed, setSealed] = useState(false)
  const [favName, setFavName] = useState<string | null>(null)
  const [stand, setStand] = useState<StandLink | null>(null)
  const [map, setMap] = useState<MemoryMapReading>(() =>
    memoryMap(recordsFrom({ profile: emptyProfile() })),
  )

  useEffect(() => {
    const book = readBook()
    const profile = readProfile()
    const raw = readRawDevice(profile)
    const records = recordsFrom(raw)
    setMap(memoryMap(records))
    setSeal(book.supporter ?? null)
    setSealed(records.ballotSealed)
    setStand(readStandLink())
    const fav = book.supporter?.favouriteId ?? ''
    if (fav === '') return
    let live = true
    cardExtras({ saved: [], seen: [], reactions: [], shelf: [], goals: [], routes: [], people: [fav], marks: [] })
      .then((answer) => {
        if (live) setFavName(answer.names[fav] ?? null)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const position = positionLabel(seal?.positionCode ?? null)

  return (
    <div data-personal="me" className="mt-stack md:grid md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start md:gap-6">
      <div className="flex flex-col gap-3">
        <PublicIdentity />
        <section aria-labelledby="me-facts-title" className="border-rule border-ink bg-paper p-3 md:p-4">
          <h2 id="me-facts-title" className="font-display text-step-1 leading-none text-ink">
            {t('personal.facts.title')}
          </h2>
          <dl className="mt-2 divide-y divide-ink/20">
            <Fact label={t('personal.facts.position')} value={position} />
            <Fact label={t('personal.facts.favourite')} value={favName} />
            <div className="flex min-h-tap items-center justify-between gap-3 py-1.5">
              <dt className="font-body text-[12.5px] font-extrabold text-muted">{t('personal.facts.ballot')}</dt>
              <dd className="flex items-center gap-2">
                <span className={`font-sign text-[14px] font-bold ${sealed ? 'text-red' : 'text-ink'}`}>
                  {sealed ? t('personal.facts.ballotSealed') : t('personal.facts.ballotOpen')}
                </span>
                <Link href="/polls" className="inline-flex min-h-tap items-center font-body text-[12.5px] font-extrabold text-red underline underline-offset-4">
                  {t('personal.facts.ballotGo')}
                </Link>
              </dd>
            </div>
            {stand && (
              <div className="flex min-h-tap items-center justify-between gap-3 py-1.5" data-personal="stand-link">
                <dt className="font-body text-[12.5px] font-extrabold text-muted">{t('personal.facts.stand')}</dt>
                <dd>
                  <Link href={stand.href} className="inline-flex min-h-tap items-center gap-2 font-sign text-[14px] font-bold text-ink underline underline-offset-4">
                    <bdi dir="ltr">{stand.code}</bdi>
                    <span className="text-red">{t('personal.facts.standGo')}</span>
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">
            {t('personal.facts.fromBallot')} {t('personal.facts.cardNote')}
          </p>
        </section>
      </div>
      <div className="md:mt-0">
        <MemoryMap reading={map} />
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-h-tap items-center justify-between gap-3 py-1.5">
      <dt className="font-body text-[12.5px] font-extrabold text-muted">{label}</dt>
      <dd className={`font-sign text-[14px] font-bold ${value ? 'text-ink' : 'text-muted'}`}>
        <bdi>{value ?? t('personal.facts.unset')}</bdi>
      </dd>
    </div>
  )
}

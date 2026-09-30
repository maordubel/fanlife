'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { LifePassport } from '@/components/profile/LifePassport'
import { MemoryList } from '@/components/profile/MemoryList'
import { Num } from '@/components/ui/Num'
import { readBook, type MemberBook as Book } from '@/lib/game/member'
import { TOPIC_SPECS, isTopic } from '@/lib/game/topics'
import { t, type MessageKey } from '@/lib/i18n'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import { workerCard } from '@/lib/profile/card'
import { memoriesOf } from '@/lib/profile/memories'
import { peopleRefs, readRawDevice, recordsFrom, type RawDevice } from '@/lib/profile/records'
import { activeIn, collected, emptyProfile, onIds, readProfile, type Profile } from '@/lib/profile/store'
import { readDevice, type DeviceSummary } from '@/lib/profile/summary'

import { cardExtras, type CardExtras } from '../actions'
import { KeptPanel } from '../KeptPanel'
import { fileExtras, type FileExtras } from './actions'

const NO_DEVICE: DeviceSummary = { kits: 0, kitKeys: [], designs: 0, xi: 0, ballot: 0, life: null }
const BLANK_BOOK: Book = { tik: 'TIK-————', nameHe: '', number: 17, since: 0, punches: [], corrections: [] }

/**
 * התיק שלי — what you made and kept, from every gate (ONE RED WORLD §24, §26, §23.3).
 *
 * The device is read once after mount. The memories are `memoriesOf(recordsFrom(raw))` — the
 * same fold the tests build from raw storage — with people resolved to canonical ids and the
 * LIFE passport's lived ids folded in once `fileExtras` answers. Until then the page draws the
 * empty reading, which is exactly what an empty file looks like.
 *
 * Two layouts. Phone: one column — memories as a rail, the passport, then the shelves.
 * Desktop: the shelves in the main column, memories and the passport in a sticky aside.
 */
export function FileArea({ kitsTotal }: { kitsTotal: number }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [book, setBook] = useState<Book>(BLANK_BOOK)
  const [device, setDevice] = useState<DeviceSummary>(NO_DEVICE)
  const [raw, setRaw] = useState<RawDevice>(() => ({ profile: emptyProfile() }))
  const [extras, setExtras] = useState<CardExtras | null>(null)
  const [file, setFile] = useState<FileExtras | null>(null)

  useEffect(() => {
    const nextProfile = readProfile()
    const nextRaw = readRawDevice(nextProfile)
    setProfile(nextProfile)
    setBook(readBook())
    setDevice(readDevice())
    setRaw(nextRaw)
    let live = true
    cardExtras({
      saved: onIds('archive.mine', nextProfile),
      seen: activeIn(nextProfile, 'archive'),
      reactions: onIds('archive.react', nextProfile),
      shelf: collected(nextProfile, 'memory'),
      goals: [...new Set([...collected(nextProfile, 'goal'), ...collected(nextProfile, 'goal.rebuilt')])],
      routes: collected(nextProfile, 'thread.routes'),
      people: [],
      marks: [],
    })
      .then((answer) => {
        if (live) setExtras(answer)
      })
      .catch(() => {})
    void readCompletedChapters()
      .then((chapters) => fileExtras({ refs: peopleRefs(nextRaw), chapters }))
      .then((answer) => {
        if (live) setFile(answer)
      })
      .catch(() => {
        if (live) setFile({ people: {}, lived: [], livedIds: [] })
      })
    return () => {
      live = false
    }
  }, [])

  const records = useMemo(() => {
    const people = file?.people ?? {}
    return recordsFrom({ ...raw, livedIds: file?.livedIds ?? [] }, (ref) => people[ref] ?? ref)
  }, [raw, file])
  const memories = useMemo(() => memoriesOf(records), [records])
  const state = workerCard({ profile, device, kitsTotal, revenge: null, favouriteHe: null, bestTopic: null, book })
  const kitKeys = [...new Set([...device.kitKeys, ...collected(profile, 'kits')])].sort()

  const topics = Object.entries(profile.gates)
    .map(([id, stat]) => ({ topic: /^\/trivia\/([a-z0-9-]+)$/.exec(id)?.[1] ?? '', lastOn: stat.lastOn, plays: stat.plays }))
    .filter((row) => row.topic !== '' && isTopic(row.topic) && row.plays > 0)
    .sort((a, b) => b.lastOn.localeCompare(a.lastOn))
  const timelinePlays = records.plays['/timeline'] ?? 0

  const aside = (
    <>
      <MemoryList memories={memories} />
      <LifePassport lived={file?.lived ?? []} loading={file === null} />
    </>
  )

  return (
    <div data-personal="file" className="mt-stack lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start lg:gap-8">
      {/* phone: the aside comes first */}
      <div className="lg:hidden">{aside}</div>

      <div className="min-w-0">
        <div className="mt-stack lg:mt-0">
          <KeptPanel
            state={state}
            extras={extras}
            kitKeys={kitKeys}
            collections={{
              xi: device.xi,
              ballot: device.ballot,
              archiveSeen: activeIn(profile, 'archive').length,
              lifeEvents: device.life?.events ?? null,
              lifeYear: device.life?.year ?? null,
            }}
          />
        </div>

        <Shelf id="trivia" title={t('personal.file.trivia')}>
          {topics.length === 0 ? (
            <Empty href="/trivia" text={t('personal.file.triviaEmpty')} />
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {topics.map((row) => (
                <li key={row.topic}>
                  <Link
                    href={`/trivia/${row.topic}`}
                    className="flex min-h-tap flex-col justify-center border-hair border-ink bg-paper px-2.5 py-1"
                  >
                    <span className="font-sign text-[13.5px] font-bold text-ink">
                      {t(TOPIC_SPECS[row.topic as keyof typeof TOPIC_SPECS].titleKey as MessageKey)}
                    </span>
                    {row.lastOn !== '' && (
                      <span className="font-body text-[11px] text-muted">
                        {t('personal.file.lastOn')} <Num>{row.lastOn.split('-').reverse().join('.')}</Num>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Shelf>

        <Shelf id="timelines" title={t('personal.file.timelines')}>
          {timelinePlays === 0 ? (
            <Empty href="/timeline" text={t('personal.file.timelinesEmpty')} />
          ) : (
            <Line href="/timeline" text={t('personal.file.timelinesLine', { n: String(timelinePlays) })} />
          )}
        </Shelf>

        <Shelf id="debates" title={t('personal.file.debates')}>
          {records.debates === 0 ? (
            <Empty href="/polls?tab=debate" text={t('personal.file.debatesEmpty')} />
          ) : (
            <Line href="/polls?tab=debate" text={t('personal.file.debatesLine', { n: String(records.debates) })} />
          )}
        </Shelf>

        <Shelf id="challenges" title={t('personal.file.challenges')}>
          {records.duels === 0 && records.shares === 0 ? (
            <Empty href="/" text={t('personal.file.challengesEmpty')} />
          ) : (
            <ul className="flex flex-col gap-1">
              {records.duels > 0 && <li className="font-body text-[13px] text-ink">{t('personal.file.duels', { n: String(records.duels) })}</li>}
              {records.shares > 0 && <li className="font-body text-[13px] text-ink">{t('personal.file.shares', { n: String(records.shares) })}</li>}
            </ul>
          )}
        </Shelf>
      </div>

      {/* desktop: the aside sits beside the shelves */}
      <aside className="hidden lg:sticky lg:top-4 lg:block">{aside}</aside>
    </div>
  )
}

function Shelf({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`file-${id}`} className="mt-stack">
      <h3 id={`file-${id}`} className="border-b-rule border-ink pb-1 font-display text-step-1 leading-tight text-ink">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Line({ href, text }: { href: string; text: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 font-body text-[13px] text-ink">
      {text}
      <Link href={href} className="inline-flex min-h-tap items-center font-extrabold text-red underline decoration-2 underline-offset-4">
        {t('personal.file.go')}
      </Link>
    </p>
  )
}

function Empty({ href, text }: { href: string; text: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 font-body text-[12.5px] leading-snug text-muted">
      {text}
      <Link href={href} className="inline-flex min-h-tap items-center font-extrabold text-red underline decoration-2 underline-offset-4">
        {t('personal.file.go')}
      </Link>
    </p>
  )
}

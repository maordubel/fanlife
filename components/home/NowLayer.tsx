'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { savedArchiveItem, type SavedArchiveItem } from '@/lib/daily/actions'
import { greetingKey, hourInIsrael, type GreetingKey } from '@/lib/daily/copy'
import type { Daily } from '@/lib/daily/types'
import { t } from '@/lib/i18n'
import { readLifeResume, type LifeResume } from '@/lib/life/resume'
import { softLine, type MemoryReading } from '@/lib/profile/memories'
import { readRawDevice, recordsFrom } from '@/lib/profile/records'
import { onIds, readProfile } from '@/lib/profile/store'

import { DailyCard } from './DailyCard'
import { StandHooks } from './StandHooks'

/**
 * שכבת ה"עכשיו" — above the gate wall, never instead of it (ONE RED WORLD §55).
 *
 *   ערב טוב.
 *   היום בהפועל · אחד לזכור · אחד לבחור · אחד לגלות
 *   חזר מהארכיון · המשך LIFE          (only when the device holds one)
 *   כל השערים ↓
 *
 * A first-time visitor sees a greeting, one compact card and the wall right under it — the
 * gate concept is still the first thing the ground is. A returning one gets a reason to do
 * something today. Nothing here counts anybody else: there is no "7 already voted" line,
 * because there is no count behind it yet (§58.12).
 *
 * The greeting is rendered by the server from the hour in Israel and re-read on the client
 * after mount, so a cached page that was built at 11:58 still says צהריים at 12:03 — with
 * the same first render on both sides, so hydration never disagrees. The two "return"
 * rows read the device only after mount and appear only when there is something real to
 * show: a saved archive item the graph still resolves, a LIFE save with a year in it.
 */
export function NowLayer({ daily, greeting }: { daily: Daily; greeting: GreetingKey }) {
  const [hello, setHello] = useState<GreetingKey>(greeting)

  useEffect(() => {
    setHello(greetingKey(hourInIsrael()))
  }, [])

  return (
    <section aria-label={t('home.now.aria')} data-home="now" className="mt-stack">
      <p className="font-display text-[22px] leading-tight text-ink md:text-[28px]">{t(hello)}</p>
      <div className="mt-2">
        <DailyCard daily={daily} variant="compact" />
      </div>
      <Returns />
      <StandHooks daily={daily} />
      <p className="mt-3">
        <a
          href="#gates"
          className="inline-flex min-h-tap items-center gap-2 font-body text-[14px] font-extrabold text-red underline underline-offset-4"
        >
          {t('home.allGates')}
          <span aria-hidden="true">↓</span>
        </a>
      </p>
    </section>
  )
}

function Returns() {
  const [saved, setSaved] = useState<SavedArchiveItem | null>(null)
  const [life, setLife] = useState<LifeResume | null>(null)
  const [memory, setMemory] = useState<MemoryReading | null>(null)

  useEffect(() => {
    let live = true
    try {
      // ONE RED WORLD §24 — at most ONE soft line from the personal file: the last memory the
      // device's own records reached. Nothing when none has; never a count.
      setMemory(softLine(recordsFrom(readRawDevice(readProfile()))))
    } catch {
      // no records: no line
    }
    try {
      const ids = onIds('archive.mine', readProfile())
      if (ids.length > 0) {
        savedArchiveItem(ids)
          .then((item) => {
            if (live) setSaved(item)
          })
          .catch(() => {})
      }
    } catch {
      // no profile: nothing came back from the archive
    }
    void readLifeResume().then((resume) => {
      if (live) setLife(resume)
    })
    return () => {
      live = false
    }
  }, [])

  if (!saved && !life && !memory) return null
  return (
    <>
      {memory && (
        <p className="mt-2 font-body text-[13px] text-muted" data-home="memory-line">
          <Link href="/tik/file" className="inline-flex min-h-tap items-center underline decoration-ink/30 underline-offset-4 hover:text-ink">
            {t('personal.home.memory', { title: t(memory.titleKey) })}
          </Link>
        </p>
      )}
      {(saved || life) && (
    <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2" data-home="returns">
      {saved && (
        <li>
          <Link
            href={saved.href}
            data-home="archive-return"
            className="flex min-h-tap flex-col justify-center border-hair border-ink/40 bg-sheet px-3 py-2 hover:bg-paper"
          >
            <span className="font-body text-[11px] font-extrabold tracking-[0.08em] text-red">{t('home.return.archive')}</span>
            <span className="truncate font-sign text-[15px] leading-tight text-ink">
              <bdi>{saved.titleHe}</bdi>
            </span>
            {saved.when && (
              <span className="font-body text-[12px] text-muted">
                <bdi>{saved.when}</bdi>
              </span>
            )}
          </Link>
        </li>
      )}
      {life && (
        <li>
          <Link
            href="/life"
            data-home="life-return"
            className="flex min-h-tap flex-col justify-center border-hair border-ink bg-ink px-3 py-2 text-paper"
          >
            <span className="font-body text-[11px] font-extrabold tracking-[0.08em] text-concrete">{t('home.return.life')}</span>
            <span className="font-sign text-[15px] leading-tight text-sheet">
              <bdi dir="ltr" className="tabular-nums">
                {life.year}
              </bdi>
              {life.placeHe && (
                <>
                  {' · '}
                  <bdi>{life.placeHe}</bdi>
                </>
              )}
            </span>
          </Link>
        </li>
      )}
    </ul>
      )}
    </>
  )
}

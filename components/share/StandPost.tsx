'use client'

import { useEffect, useState } from 'react'

import { postStandAction } from '@/app/stand/actions'
import { t } from '@/lib/i18n'
import { gateOfPath, standPath } from '@/lib/stand/contract'
import { localStands, type LocalStand } from '@/lib/stand/local'

/**
 * "שלח ליציע" → into a stand (ONE RED WORLD §7.3, §8). The fifth way out of the share row,
 * and the only one that stays inside the app: the run's link and its headline go into the
 * feed of a stand this device is in. Not a message — the database takes a path on this site
 * and a 48-character line, nothing else (`worker_stand_post`).
 *
 * Silent for a device in no stand, and for a link no gate plays: the share row stays
 * exactly what it was for everybody else. ShareRow mounts it in ONE line.
 */
export function StandPost({ link, headline }: { link: string; headline: string }) {
  const [stands, setStands] = useState<LocalStand[]>([])
  const [sent, setSent] = useState<Record<string, 'sent' | 'failed' | 'busy'>>({})

  useEffect(() => {
    setStands(localStands())
  }, [])

  const path = standPath(link)
  if (stands.length === 0 || !path || gateOfPath(path) === null) return null

  async function post(stand: LocalStand) {
    if (sent[stand.code] === 'busy' || sent[stand.code] === 'sent') return
    setSent((s) => ({ ...s, [stand.code]: 'busy' }))
    const out = await postStandAction(stand.code, link, headline).catch(() => null)
    setSent((s) => ({ ...s, [stand.code]: out?.ok ? 'sent' : 'failed' }))
  }

  return (
    <div data-share="stand" className="mt-3 border-t border-concrete/30 pt-3">
      <p className="font-body text-[11px] font-extrabold tracking-[0.08em] text-concrete">{t('stand.post.label')}</p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {stands.slice(0, 4).map((stand) => {
          const state = sent[stand.code]
          return (
            <li key={stand.code}>
              <button
                type="button"
                onClick={() => void post(stand)}
                disabled={state === 'busy' || state === 'sent'}
                aria-live="polite"
                className="flex min-h-tap items-center border-hair border-concrete/50 px-3 font-body text-step--1 text-paper disabled:opacity-70"
              >
                {state === 'sent' ? (
                  t('stand.post.sent', { name: stand.name })
                ) : state === 'failed' ? (
                  t('stand.post.failed')
                ) : (
                  <bdi>{stand.name}</bdi>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

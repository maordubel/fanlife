'use client'

import { useEffect, useState } from 'react'

import { clearIntents, pendingIntents } from '@/lib/collector/pending'
import { IN_CLOSET } from '@/lib/collector/metrics'
import type { Closet, CollectorShirt } from '@/lib/collector/types'
import { portalConfigured } from '@/lib/portal/env'
import { signInWithGoogle } from '@/lib/portal/sync'
import { t } from '@/lib/i18n'

import { liveApi } from './api'
import { ClosetBoard } from './ClosetBoard'

/**
 * הארון — טוען, ואז מחליט איזה מסך זה: בלי מפתחות (הארון לא מחובר בגרסה הזאת), אורח (ההזמנה
 * להתחבר), תקלה (משפט ו"נסה שוב"), או הלוח עצמו.
 *
 * **מה שאורח סימן בדרך נכנס כאן** (`lib/collector/pending.ts`): הלחיצות שנרשמו לפני ההתחברות
 * נשלחות למסד פעם אחת, נמחקות, והארון נקרא מחדש — כדי שהחולצה שבגללה הוא נרשם תהיה שם כשהוא נכנס.
 */
type Phase = { kind: 'loading' } | { kind: 'off' } | { kind: 'out' } | { kind: 'error' } | { kind: 'ready'; closet: Closet; flash: string | null }

export function ClosetScreen({ shirts, archive }: { shirts: Record<string, CollectorShirt>; archive: CollectorShirt[] }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [edit, setEdit] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!portalConfigured()) {
      setPhase({ kind: 'off' })
      return
    }
    let live = true
    void (async () => {
      let out = await liveApi.reload()
      if (!live) return
      if (!out.ok) {
        setPhase(out.error === 'auth_required' ? { kind: 'out' } : { kind: 'error' })
        return
      }
      let flash: string | null = null
      const waiting = pendingIntents()
      if (waiting.length > 0) {
        let saved = 0
        for (const intent of waiting) {
          const done = intent.action === 'have' ? await liveApi.have(intent.slug, intent.kitId) : await liveApi.wantSet(intent.slug, true, { kitId: intent.kitId })
          if (done.ok) saved += 1
        }
        clearIntents(waiting.map((intent) => intent.slug))
        if (saved > 0) {
          flash = saved === 1 ? t('collector.closet.pendingSavedOne') : t('collector.closet.pendingSaved', { n: String(saved) })
          const again = await liveApi.reload()
          if (again.ok) out = again
        }
      }
      if (!live || !out.ok) return
      // `?shirt=<slug>` — the archive's "✓ בארון שלך" and "אולי אפתח להצעות" open that copy
      const slug = new URLSearchParams(window.location.search).get('shirt')
      if (slug) {
        const copy = out.items.filter((item) => item.archiveSlug === slug && IN_CLOSET.has(item.state)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
        setEdit(copy?.id ?? null)
      }
      setPhase({ kind: 'ready', closet: out, flash })
    })()
    return () => {
      live = false
    }
  }, [attempt])

  if (phase.kind === 'ready') {
    return <ClosetBoard closet={phase.closet} shirts={shirts} archive={archive} api={liveApi} initialEdit={edit} flash={phase.flash} />
  }

  return (
    <div className="mt-stack max-w-2xl">
      {phase.kind === 'loading' ? (
        <p role="status" className="border-rule border-ink bg-sheet p-4 font-body text-step--1 text-muted">
          {t('collector.closet.loading')}
        </p>
      ) : phase.kind === 'error' ? (
        <div role="alert" className="border-rule border-red bg-sheet p-4">
          <p className="font-display text-step-1 leading-tight text-ink">{t('collector.closet.error')}</p>
          <p className="mt-1 font-body text-step--1 text-muted">{t('collector.error.network')}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 min-h-tap border-rule border-ink bg-paper px-4 font-body text-step--1 font-extrabold text-ink">
            {t('collector.closet.retry')}
          </button>
        </div>
      ) : (
        <ClosetInvite off={phase.kind === 'off'} />
      )}
    </div>
  )
}

/** The door for somebody without a closet yet — and, in a build without keys, the plain truth. */
export function ClosetInvite({ off }: { off: boolean }) {
  return (
    <section aria-labelledby="closet-invite" data-closet-invite="" className="border-plate border-ink bg-sheet">
      <div className="flex items-stretch">
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center justify-center bg-red font-poster text-[44px] leading-none text-paper">
          ✓
        </span>
        <div className="min-w-0 flex-1 p-4">
          <h2 id="closet-invite" className="font-display text-step-2 leading-tight text-ink">
            {t('collector.closet.out.title')}
          </h2>
          <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-ink">{off ? t('collector.closet.off') : t('collector.closet.out.body')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {off ? null : (
              <button type="button" onClick={() => void signInWithGoogle('/kits/closet')} className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper">
                {t('collector.signIn.button')}
              </button>
            )}
            <a href="/kits/archive" className="inline-flex min-h-tap items-center border-rule border-ink bg-paper px-4 font-body text-step--1 font-extrabold text-ink">
              {t('collector.closet.archive')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { portalConfigured } from '@/lib/portal/env'
import { signInWithGoogle } from '@/lib/portal/sync'
import { t } from '@/lib/i18n'

/**
 * "מעולה. שמור אותה בארון שלך." — ההזמנה להירשם, ברגע שיש לה סיבה (מפרט §44).
 * לא "הירשם כדי להשתמש באתר": הארכיון פתוח, והחשבון רק שומר את מה שכבר בחרת.
 */
export function SignInPrompt({ next, onClose }: { next?: string; onClose?: () => void }) {
  const back = next ?? (typeof window === 'undefined' ? '/kits/closet' : `${window.location.pathname}${window.location.search}`)
  return (
    <div role="status" className="border-plate border-ink bg-sheet p-4">
      <p className="font-display text-step-1 leading-tight text-ink">{t('collector.signIn.title')}</p>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-ink">
        {portalConfigured() ? t('collector.signIn.body') : t('collector.signIn.off')}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {portalConfigured() ? (
          <button
            type="button"
            onClick={() => void signInWithGoogle(back)}
            className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper"
          >
            {t('collector.signIn.button')}
          </button>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="min-h-tap px-2 font-body text-step--1 text-sign underline underline-offset-4">
            {t('collector.donate.later')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

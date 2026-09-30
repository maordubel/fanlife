'use client'

import { portalConfigured } from '@/lib/portal/env'
import { signInWithGoogle } from '@/lib/portal/sync'
import { t } from '@/lib/i18n'

/**
 * The sign-in button inside the matches box. The box already says why (its own title and line);
 * `SignInPrompt`'s "שמור אותה בארון שלך" is the sentence for a shirt just marked, not for a board
 * of matches — so here it is the button alone, the same call, back to the same page.
 */
export function MarketSignIn({ next }: { next: string }) {
  if (!portalConfigured()) return null
  return (
    <button
      type="button"
      onClick={() => void signInWithGoogle(next)}
      className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper"
    >
      {t('collector.signIn.button')}
    </button>
  )
}

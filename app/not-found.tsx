import Link from 'next/link'
import { SignPlate } from '@/components/ui/SignPlate'
import { t } from '@/lib/i18n'

/**
 * This used to print the retired `wall.empty` string — "הקיר עוד ריק. הגיליון הראשון יודבק ב־06:00" —
 * copy written for a daily-sheet mechanic that no longer exists in the app (rule 10/32:
 * a dead screen's strings get deleted, not repurposed onto a screen they were never
 * about). A 404 here means a URL pointed at a gate that is not on the wall, so the copy
 * says that instead, in the same gate language the rest of the nav uses (rule 9).
 */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-gutter py-16">
      <SignPlate title={t('screen.home.title')} sub={t('screen.home.sub')} />
      <p className="mt-stack font-mono text-step-5 tabular-nums text-red">404</p>
      <p className="mt-2 font-body text-step-0 text-muted">{t('notFound.body')}</p>
      <Link
        href="/"
        className="mt-stack inline-flex min-h-tap items-center bg-ink px-4 font-body text-step-1 font-extrabold text-sheet"
      >
        {t('tab.ground')}
      </Link>
    </main>
  )
}

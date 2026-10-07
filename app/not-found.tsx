import Link from 'next/link'
import { headers } from 'next/headers'
import { SignPlate } from '@/components/ui/SignPlate'
import { Shell } from '@/components/master/Shell'
import { Dye } from '@/components/master/Dye'
import { t } from '@/lib/i18n'
import en from '@/messages/clubs/en.json'

/**
 * Two products share this app. On The Worker's own host (Hapoel, Hebrew) a 404 stays in the gate
 * language of that product; everywhere else it is a page of the FAN LIFE magazine — the keeper
 * beaten, in ink, and a way back (page audit, 7.10.2026).
 */
export default function NotFound() {
  if (headers().get('x-fan-life-club') === 'hapoel-tel-aviv') {
    return (
      <main id="main" className="mx-auto max-w-5xl px-gutter py-16">
        <SignPlate title={t('screen.home.title')} sub={t('screen.home.sub')} />
        <p className="mt-stack font-mono text-step-5 tabular-nums text-red">404</p>
        <p className="mt-2 font-body text-step-0 text-muted">{t('notFound.body')}</p>
        <Link href="/" className="mt-stack inline-flex min-h-tap items-center bg-ink px-4 font-body text-step-1 font-extrabold text-sheet">
          {t('tab.ground')}
        </Link>
      </main>
    )
  }
  return (
    <Shell locale="en">
      <main id="main" className="mag-404">
        <Dye art="net-keeper" ink="var(--mag-vermilion)" className="mag-404-art" />
        <p className="mag-kicker">{en.lostKicker}</p>
        <p className="big" aria-hidden="true">404</p>
        <h1 className="mag-h2">{en.lostTitle}</h1>
        <p>{en.lostBody}</p>
        <div className="row">
          <Link className="mag-cta red" href="/">{en.backHome} →</Link>
          <Link className="mag-chip" href="/#clubs">{en.clubs}</Link>
        </div>
      </main>
    </Shell>
  )
}

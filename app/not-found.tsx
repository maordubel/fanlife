import Link from 'next/link'
import { headers } from 'next/headers'
import { SignPlate } from '@/components/ui/SignPlate'
import { Shell } from '@/components/master/Shell'
import { Plate } from '@/components/weekly/Plate'
import { Icon } from '@/components/weekly/Icon'
import { t } from '@/lib/i18n'
import en from '@/messages/clubs/en.json'

/** A page torn out of the paper: a ragged top and bottom edge, the same on every visit. */
function torn(points = 18): string {
  let h = 404
  const next = () => { h = (Math.imul(h ^ (h >>> 13), 1274126177) + 2654435761) >>> 0; return h % 1000 / 1000 }
  const top: string[] = [], bottom: string[] = []
  for (let i = 0; i <= points; i++) top.push(`${(i * 100 / points).toFixed(2)}% ${(next() * 3.2).toFixed(2)}%`)
  for (let i = points; i >= 0; i--) bottom.push(`${(i * 100 / points).toFixed(2)}% ${(100 - next() * 3.2).toFixed(2)}%`)
  return `polygon(${[...top, ...bottom].join(',')})`
}

/**
 * Two products share this app. On The Worker's own host (Hapoel, Hebrew) a 404 stays in the gate
 * language of that product; everywhere else it is a page of THE WEEKLY (rule 124, boards NotFound-M / NotFound-D) — a page
 * torn out, the ball gone wide of the post, and a way back: the front page or the clubs, under the thumb.
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
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' }).format(now)
  return (
    <Shell locale="en">
      <main id="main" className="wkh-lost">
        <div className="wkh-lost-sheetwrap">
          <article className="wkh-lost-sheet" style={{ clipPath: torn() }} aria-labelledby="lost-h">
            <div className="wkh-lost-folio"><span className="wk-k">{en.wkhPage.replace('{n}', '404')}</span><time className="wk-k" dateTime={now.toISOString().slice(0, 10)}>FAN LIFE · {date}</time></div>
            <p className="wk-k red">{en.lostKicker}</p>
            <p className="wkh-404" aria-hidden="true">
              <span className="wk-num">4</span>
              <span className="wkh-404-hole"><span className="wk-k">{en.wkhBallWas}</span></span>
              <span className="wk-num">4</span>
              <svg className="wkh-404-ball" viewBox="0 0 100 100"><defs><clipPath id="wkh-ball-clip"><circle cx="50" cy="50" r="44"/></clipPath></defs><circle className="b" cx="50" cy="50" r="44"/><g clipPath="url(#wkh-ball-clip)"><path className="p" d="M50.0 35.0 L64.3 45.4 L58.8 62.1 L41.2 62.1 L35.7 45.4 Z M63.5 31.4 L58.1 14.6 L72.3 4.3 L86.6 14.6 L81.2 31.4 Z M71.9 57.1 L86.1 46.7 L100.4 57.1 L95.0 73.9 L77.3 73.9 Z M50.0 73.0 L64.3 83.4 L58.8 100.1 L41.2 100.1 L35.7 83.4 Z M28.1 57.1 L22.7 73.9 L5.0 73.9 L-0.4 57.1 L13.9 46.7 Z M36.5 31.4 L18.8 31.4 L13.4 14.6 L27.7 4.3 L41.9 14.6 Z"/><path className="s" d="M50.0 35.0 L50.0 23.0 M64.3 45.4 L75.7 41.7 M58.8 62.1 L65.9 71.8 M41.2 62.1 L34.1 71.8 M35.7 45.4 L24.3 41.7"/></g><circle className="o" cx="50" cy="50" r="44"/></svg>
            </p>
            <h1 className="wk-logo red wkh-lost-title" id="lost-h">{en.lostTitle}</h1>
            <p className="wkh-lost-body">{en.lostBody}</p>
          </article>
        </div>
        <figure className="wkh-lost-panel wk-redplate" aria-hidden="true">
          <span className="wk-speed" />
          <Plate art="bootball" ink="red" className="wkh-lost-art" />
          <span className="wk-burst white wkh-lost-burst" />
          <span className="wk-shout white wkh-lost-shout">{en.wkhWide}</span>
          <figcaption className="wk-cap white wkh-lost-cap">{en.wkhTorn}</figcaption>
        </figure>
        <div className="wkh-lost-ctas">
          <Link className="wk-btn red lg" href="/">{en.backHome} <svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
          <Link className="wk-btn paper" href="/#clubs"><Icon name="clubs" />{en.clubs}</Link>
        </div>
      </main>
    </Shell>
  )
}

'use client'

import en from '@/messages/clubs/en.json'

/**
 * A crashed page, printed as a magazine correction slip: what happened, one button to try again.
 * English, because the FAN LIFE interface is English; no Shell here, an error boundary must not
 * depend on the code that may have just failed.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="fl mag" lang="en" dir="ltr">
      <main id="main" className="mag-404">
        <p className="mag-kicker">{en.errKicker}</p>
        <h1 className="mag-h2">{en.errTitle}</h1>
        <p>{en.errBody}</p>
        <div className="row">
          <button type="button" className="mag-cta red min-h-tap" onClick={reset}>{en.errRetry}</button>
          <a className="mag-chip" href="/">{en.backHome}</a>
        </div>
      </main>
    </div>
  )
}

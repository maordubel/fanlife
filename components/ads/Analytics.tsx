import Script from 'next/script'

import { GA_ID } from '@/lib/ads'

/**
 * Google Analytics 4.
 *
 * `afterInteractive` and not `beforeInteractive`: a measurement tag has no business
 * blocking the first paint of a game, and GA is designed to be loaded late — it queues
 * into `dataLayer` and flushes when it arrives.
 *
 * Loaded only when an ID is configured, so a fork or a preview deploy does not report
 * into Maor's property.
 */
export function Analytics() {
  if (!GA_ID) return null
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  )
}

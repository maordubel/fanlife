import Script from 'next/script'

import { GA_ID } from '@/lib/ads'

/**
 * Google Analytics 4.
 *
 * `afterInteractive` and not `beforeInteractive`: a measurement tag has no business
 * blocking the first paint of a game, and GA is designed to be loaded late — it queues
 * into `dataLayer` and flushes when it arrives.
 *
 * Default ID is the owner's property (G-8YW4SSHHNL); NEXT_PUBLIC_GA_ID overrides it.
 * Never loaded in the control room (`off`). Global Privacy Control / Do Not Track deny
 * analytics storage, and ad storage stays denied (no ad personalisation from this tag).
 */
export function Analytics({ off = false }: { off?: boolean }) {
  if (!GA_ID || off) return null
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
var gpc = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
gtag('consent', 'default', { analytics_storage: gpc ? 'denied' : 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
gtag('config', '${GA_ID}', { allow_google_signals: false, allow_ad_personalization_signals: false });`}
      </Script>
    </>
  )
}

import type { Metadata, Viewport } from 'next'
import Script from 'next/script'

import { Analytics } from '@/components/ads/Analytics'
import { ClosetBridge } from '@/components/collector/ClosetBridge'
import { GateMeter } from '@/components/meter/GateMeter'
import { ADSENSE_CLIENT } from '@/lib/ads'
import { BRAND, SITE_URL } from '@/lib/brand'
import { DIRECTION, LOCALE, t } from '@/lib/i18n'
import './globals.css'
import './master.css'
import './club-theme.css'
import './magazine.css'
import { headers } from 'next/headers'
import {clubFromHost,DEFAULT_CLUB} from '@/lib/master/registry'
import { readState } from '@/lib/master/store'
import { GATES } from '@/lib/master/types'
import {uiLocale,localeDirection} from '@/lib/clubs/locale'
import { Shell } from '@/components/master/Shell'

/**
 * The faces live in `globals.css` as self-hosted @font-face rules (brand spec §3) —
 * `next/font/google` needs the network at build time, and the one time it did not have
 * it the stub that replaced it shipped, and the whole site fell back to Georgia.
 */
export const viewport: Viewport = {
  // Required for env(safe-area-inset-*) to report anything on a notched iPhone.
  viewportFit: 'cover',
  themeColor: BRAND.ink,
  width: 'device-width',
  initialScale: 1,
}

/**
 * `metadataBase` resolves every relative URL a page's `openGraph`/`twitter` images use
 * (`lib/seo.ts` builds them as `${SITE_URL}/og/<slug>.png`, already absolute, but this
 * is what keeps a future relative path from resolving against whatever host actually
 * served the request instead of the canonical address rule 23 requires).
 */
const workerMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // The product is called The Worker. Full stop — no suffix, no bilingual pair, no
  // brand-system tagline. A name with something appended to it is not a name.
  title: {
    default: 'FAN LIFE',
    template: '%s · FAN LIFE',
  },
  description: t('app.description'),
  applicationName: 'The Worker',
  alternates: { canonical: SITE_URL },
  // The base every route inherits unless it sets its own (`lib/seo.ts#gateMetadata`) —
  // Next replaces this object key-for-key per route, so a route with no `openGraph` of
  // its own still gets a real title, description and image instead of the blue-line
  // link with no preview that this whole delta exists to fix.
  openGraph: {
    title: 'The Worker',
    description: t('app.description'),
    url: SITE_URL,
    siteName: 'The Worker',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: '/og/default.png', width: 1200, height: 630, alt: 'The Worker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Worker',
    description: t('app.description'),
    images: ['/og/default.png'],
  },
  // The badge is the identity everywhere (rule 8), and `app/icon.svg` is a Next
  // file-convention route that would otherwise compete with this field for the tab —
  // see the comment in `app/icon.svg` itself for why its content now IS the badge
  // rather than the two sources disagreeing about what a reader sees.
  icons: {
    icon: [{ url: '/brand/logo-192.png', type: 'image/png' }],
    apple: '/brand/logo-192.png',
  },
}

/**
 * Two products, one app: The Worker keeps its own name, badge and Hebrew card on Hapoel's host;
 * everywhere else the tab, the app icon and the share card are FAN LIFE's seal (owner, 7.10.2026).
 * The tab shows only the ball and its ring (`mark-*`) — the lettering cannot be read at 32px.
 */
const fanLifeMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'FAN LIFE — Football. Forever.', template: '%s · FAN LIFE' },
  description: 'Every club, a world: the games, the archive and a supporter\'s life, from each club\'s own history.',
  applicationName: 'FAN LIFE',
  openGraph: { title: 'FAN LIFE', description: 'Football. Forever. Every club, a world.', siteName: 'FAN LIFE', locale: 'en_GB', type: 'website', images: [{ url: '/brand/fanlife/og.png', width: 1200, height: 630, alt: 'FAN LIFE — Football. Forever.' }] },
  twitter: { card: 'summary_large_image', title: 'FAN LIFE', description: 'Football. Forever. Every club, a world.', images: ['/brand/fanlife/og.png'] },
  icons: {
    icon: [{ url: '/brand/fanlife/mark-32.png', sizes: '32x32', type: 'image/png' }, { url: '/brand/fanlife/mark-64.png', sizes: '64x64', type: 'image/png' }, { url: '/brand/fanlife/logo-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/brand/fanlife/logo-180.png',
  },
}

export function generateMetadata(): Metadata {
  return clubFromHost(headers().get('host')) === DEFAULT_CLUB ? workerMetadata : fanLifeMetadata
}

const FAN_PATHS=['/master','/clubs','/sources','/closet','/market','/auction','/shirts','/me','/stands']

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname=headers().get('x-fan-life-path')||'/'
  const sharedLocale=pathname.startsWith('/clubs/')?uiLocale(headers().get('x-fan-life-locale')||undefined):'en'
  // FAN LIFE's own pages (English, LTR, never behind The Worker's gate switches): the hub, the clubs,
  // the control room, and "your corner" — the personal area ported from The Worker (7.10.2026).
  const master=pathname==='/'||FAN_PATHS.some(p=>pathname===p||pathname.startsWith(p+'/'))
  const club=master?undefined:(await readState()).clubs.find(c=>c.id==='hapoel-tel-aviv')
  const gate=GATES.find(g=>pathname===g[2]||pathname.startsWith(g[2]+'/'))
  const tenant=clubFromHost(headers().get('host'))
  const otherTenant=Boolean(tenant&&tenant!==DEFAULT_CLUB)
  const closed=!master&&(otherTenant||(club?.status!=='live'||gate&&!club?.gates.includes(gate[0])))
  return (
    <html lang={master||otherTenant?sharedLocale:LOCALE} dir={master||otherTenant?localeDirection(sharedLocale):DIRECTION}>
      <body className="font-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:bg-red focus:px-4 focus:py-2 focus:text-sheet"
        >
          {master?'Skip to content':t('nav.skipToContent')}
        </a>
        {closed?<Shell><main id="main" className="section"><h1>This gate is resting.</h1><p>{otherTenant?<>This mode is not yet available for this club. <a href={`/clubs/${tenant}/timeline`}>Open Timeline ↗</a></>:<>The administrator has paused access. <a href="/master/admin">Open administration ↗</a></>}</p></main></Shell>:children}

        {/*
          AdSense's loader, and Google's measurement tag.

          `afterInteractive` for both. Neither has any business blocking the first paint
          of a game screen, and both are designed to arrive late — AdSense fills any
          `<ins>` already on the page when it lands, and gtag queues into `dataLayer`.
          Loading them `beforeInteractive` would trade the thing the app is for against
          the things that pay for it.

          The loader is global; WHERE a unit may appear is decided in `lib/ads.ts`, and
          never inside a run.
        */}
        {ADSENSE_CLIENT && !master ? <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        /> : null}
        <Analytics />
        {/* first-party measurement: views, starts, finishes, where people leave (lib/analytics) */}
        <GateMeter />
        <ClosetBridge />
      </body>
    </html>
  )
}

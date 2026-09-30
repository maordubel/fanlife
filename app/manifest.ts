import type { MetadataRoute } from 'next'

import { BRAND } from '@/lib/brand'
import { t } from '@/lib/i18n'

/**
 * The PWA manifest.
 *
 * `background_color`/`theme_color` are read from `BRAND` (rule 8 — design tokens only,
 * never an invented hex): `sheet` is the ageing cream the whole shell prints on, `ink`
 * is what `app/layout.tsx`'s own `viewport.themeColor` already uses, so the splash
 * screen and the browser chrome agree with each other.
 *
 * Icons are the badge (rule 8 — "the identity everywhere") at the two sizes a manifest
 * actually needs, both of which exist on disk (`public/brand/logo-192.png`,
 * `logo-512.png`). No `purpose: 'maskable'` — that PNG was never built with the ~40%
 * safe-zone padding a maskable icon needs, and claiming it is safe to crop into a
 * circle when nobody checked that is exactly the kind of invented fact rule 11 forbids.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Worker',
    short_name: 'The Worker',
    description: t('app.description'),
    lang: 'he',
    dir: 'rtl',
    start_url: '/',
    display: 'standalone',
    background_color: BRAND.sheet,
    theme_color: BRAND.ink,
    icons: [
      { src: '/brand/logo-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

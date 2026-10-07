/**
 * Brand values needed outside CSS.
 *
 * Components read colour from tokens, never from a literal — but a few surfaces take a
 * real value and cannot read a CSS custom property: the browser theme colour, and the
 * share cards, which are drawn on a canvas at 1080×1920 and then handed to the phone as
 * a PNG. Those values live here, once, mirroring `app/globals.css`. `tests/brand.test.ts`
 * parses the stylesheet and fails if the two ever drift.
 */
export const BRAND = {
  /** mirrors --sheet */
  sheet: '#F0E8D4',
  /** mirrors --paper */
  paper: '#E9DFC7',
  /** mirrors --ink */
  ink: '#15120E',
  /** mirrors --red */
  red: '#B02D10',
  /** mirrors --sign */
  sign: '#1E2C5A',
  /** mirrors --concrete */
  concrete: '#C9BFA4',
  /** mirrors --muted */
  muted: '#5A5242',
} as const

/**
 * Where a shared card sends people.
 *
 * Every story, every WhatsApp message and every copied link carries this, because a
 * share that does not name where it came from is a share that recruits nobody. Set
 * `NEXT_PUBLIC_SITE_URL` on the deployment; without it a production build uses the official
 * address, https://fanlife.dubelteam.com (owner, 7.10.2026), and a dev server uses localhost —
 * so a canonical link, the sitemap and a share card never point at localhost in production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === 'production' ? 'https://fanlife.dubelteam.com' : 'http://localhost:3000')
).replace(/\/$/, '')

/** The line printed along the foot of every share card, under the badge. */
export const SITE_LABEL = SITE_URL.replace(/^https?:\/\//, '')

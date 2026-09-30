import type { Config } from 'tailwindcss'

/**
 * Every value maps to a token in app/globals.css.
 * Spec: brand/THE-WORKER-BRAND-SPEC.md — no yellow, radius 0, no shadows
 * except the single night lamp glow.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sheet: 'rgb(var(--sheet) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        red: 'rgb(var(--red) / <alpha-value>)',
        concrete: 'rgb(var(--concrete) / <alpha-value>)',
        sign: 'rgb(var(--sign) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'lamp-off': 'rgb(var(--lamp-off) / <alpha-value>)',

        /* שכבת הדפוס — the DUBID press layer. Scoped to the game surfaces:
           the pitch, the drawn player, the kit plates and the share cards. */
        press: {
          paper: 'rgb(var(--p-paper) / <alpha-value>)',
          paperDeep: 'rgb(var(--p-paper-deep) / <alpha-value>)',
          card: 'rgb(var(--p-card) / <alpha-value>)',
          ink: 'rgb(var(--p-ink) / <alpha-value>)',
          red: 'rgb(var(--p-red) / <alpha-value>)',
          redDeep: 'rgb(var(--p-red-deep) / <alpha-value>)',
          grass: 'rgb(var(--p-grass) / <alpha-value>)',
          grassDark: 'rgb(var(--p-grass-dark) / <alpha-value>)',
          line: 'rgb(var(--p-line) / <alpha-value>)',
          halo: 'rgb(var(--p-halo) / <alpha-value>)',
          disc: 'rgb(var(--p-disc) / <alpha-value>)',
        },
        night: {
          paper: 'rgb(var(--n-paper) / <alpha-value>)',
          paperDeep: 'rgb(var(--n-paper-deep) / <alpha-value>)',
          ink: 'rgb(var(--n-ink) / <alpha-value>)',
          inkDim: 'rgb(var(--n-ink-dim) / <alpha-value>)',
          inkFaint: 'rgb(var(--n-ink-faint) / <alpha-value>)',
          rule: 'rgb(var(--n-rule) / <alpha-value>)',
          accent: 'rgb(var(--n-accent) / <alpha-value>)',
          red: 'rgb(var(--n-red) / <alpha-value>)',
          grass: 'rgb(var(--n-grass) / <alpha-value>)',
        },

        /* שער 11 — "דשא כבוי". A THIRD scoped system, alongside שערי הפועל (the
           shell) and the DUBID press layer above. Gate 11 is a shell route, so it
           gets its own named tokens rather than reaching across for `night`/`press`
           (rule 8 — see the marked block at the foot of app/globals.css). */
        hate: {
          field: 'rgb(var(--hate-field) / <alpha-value>)',
          card: 'rgb(var(--hate-card) / <alpha-value>)',
          'red-deep': 'rgb(var(--hate-red-deep) / <alpha-value>)',
          'red-light': 'rgb(var(--hate-red-light) / <alpha-value>)',
          ink: 'rgb(var(--hate-ink) / <alpha-value>)',
          muted: 'rgb(var(--hate-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-frank)', 'Georgia', 'serif'],
        // Latin caps on a poster plate: GATE · BLOOMFIELD · EST. 1923
        latin: ['var(--font-latin)', 'system-ui', 'sans-serif'],
        sign: ['var(--font-miriam)', 'system-ui', 'sans-serif'],
        body: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-courier)', 'ui-monospace', 'monospace'],
        // The gate face — Karantina 700. Big figures and gate numbers.
        poster: ['var(--font-poster)', 'Archivo', 'ui-monospace', 'monospace'],
      },
      // Fluid scale. Hebrew needs more body size than Latin to read comfortably, so
      // step-0 starts at 17px on a phone; the display steps grow faster than the body
      // steps so headlines stay headlines on a wide screen without shouting on a small
      // one. Line-heights are tuned per step — Hebrew has no descender rhythm to lean
      // on, and a serif at 1.05 looks cramped.
      fontSize: {
        'step--1': ['clamp(0.813rem, 0.79rem + 0.11vw, 0.875rem)', { lineHeight: '1.55' }],
        'step-0': ['clamp(1.063rem, 1.03rem + 0.16vw, 1.125rem)', { lineHeight: '1.65' }],
        'step-1': ['clamp(1.188rem, 1.13rem + 0.28vw, 1.313rem)', { lineHeight: '1.4' }],
        'step-2': ['clamp(1.375rem, 1.26rem + 0.56vw, 1.625rem)', { lineHeight: '1.25' }],
        'step-3': ['clamp(1.625rem, 1.42rem + 1vw, 2.125rem)', { lineHeight: '1.2' }],
        'step-4': ['clamp(2rem, 1.65rem + 1.7vw, 2.75rem)', { lineHeight: '1.12' }],
        'step-5': ['clamp(2.75rem, 2.1rem + 3.2vw, 4.25rem)', { lineHeight: '1.04' }],
      },
      borderRadius: { none: '0', DEFAULT: '0', full: '9999px' },
      borderWidth: { hair: '1px', rule: '2px', plate: '3px', stamp: '5px' },
      spacing: { gutter: 'var(--gutter)', stack: 'var(--stack)', tap: 'var(--tap)' },
      transitionTimingFunction: { stamp: 'var(--ease-stamp)', peel: 'var(--ease-peel)' },
      transitionDuration: {
        press: '90ms',
        plate: '160ms',
        stamp: '240ms',
        peel: '260ms',
        paste: '320ms',
      },
      boxShadow: { lamp: '0 0 42px rgba(247,245,240,.35)' },
      animation: {
        'stamp-in': 'stamp-in 240ms var(--ease-stamp) both',
        'lamp-on': 'lamp-on 90ms linear both',
        'paste-in': 'paste-in 320ms var(--ease-stamp) both',
        crawl: 'crawl 22s linear infinite',
        /* the floodlights coming on: strike, stutter, hold */
        strike: 'strike 900ms steps(1, end) both',
        wash: 'wash 1200ms var(--ease-stamp) both',
        'glow-up': 'glow-up 1200ms ease-out both',
        /* 4.9.2026 — the popups: a ticket pasted in from above, a thing landing on it */
        'ticket-in': 'ticket-in 360ms var(--ease-stamp) both',
        land: 'land 420ms var(--ease-stamp) both',
        'plate-in': 'plate-in 320ms var(--ease-stamp) both',
        'rule-draw': 'rule-draw 520ms var(--ease-stamp) 120ms both',
        'title-rise': 'title-rise 700ms var(--ease-stamp) both',
        'title-sub': 'title-sub 600ms var(--ease-stamp) 420ms both',
        'sheet-in': 'sheet-in 260ms var(--ease-stamp) both',
        'plate-bump': 'plate-bump 300ms var(--ease-stamp) both',
        'caret-blink': 'caret-blink 900ms steps(1, end) infinite',
        'push-in': 'push-in 6000ms linear both',
        'balloon-pop': 'balloon-pop 320ms var(--ease-stamp) both',
        'balloon-pop-end': 'balloon-pop-end 320ms var(--ease-stamp) both',
        'face-in': 'face-in 360ms var(--ease-stamp) both',
        /* הקופסה האדומה — המכסה נפתח לפני שהחפצים נוחתים */
        'box-lid': 'box-lid 820ms var(--ease-stamp) both',
      },
    },
  },
  plugins: [],
}

export default config

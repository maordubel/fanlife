import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The house faces for the OG renderer. `public/fonts/` ships WOFF2, which satori cannot
 * read, so `lib/og/fonts/` holds the same files converted to TrueType (fontTools, no
 * subsetting beyond the WOFF2 subsets themselves): Frank Ruhl Libre 900 for titles, Heebo
 * 400/800 for text, Karantina 700 for the big figures, Archivo 800 for the Latin caps.
 * Each face is registered twice — Hebrew and Latin subset under one family — and satori
 * falls back between them glyph by glyph.
 *
 * The paths are literal `join(process.cwd(), …)` calls so Next's file tracing ships the
 * files with the route.
 */
type Font = { name: string; data: Buffer; weight: 400 | 700 | 800 | 900; style: 'normal' }

let cache: Promise<Font[]> | null = null

export function ogFonts(): Promise<Font[]> {
  cache ??= Promise.all([
    readFile(join(process.cwd(), 'lib/og/fonts/frank-ruhl-libre-hebrew-900.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/frank-ruhl-libre-latin-900.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/heebo-hebrew-800.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/heebo-latin-800.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/heebo-hebrew-400.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/heebo-latin-400.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/karantina-hebrew-700.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/karantina-latin-700.ttf')),
    readFile(join(process.cwd(), 'lib/og/fonts/archivo-latin-800.ttf')),
  ]).then(([frankHe, frankLa, heebo8He, heebo8La, heebo4He, heebo4La, karHe, karLa, archivo]) => [
    { name: 'Frank', data: frankHe as Buffer, weight: 900, style: 'normal' },
    { name: 'Frank', data: frankLa as Buffer, weight: 900, style: 'normal' },
    { name: 'Heebo', data: heebo8He as Buffer, weight: 800, style: 'normal' },
    { name: 'Heebo', data: heebo8La as Buffer, weight: 800, style: 'normal' },
    { name: 'Heebo', data: heebo4He as Buffer, weight: 400, style: 'normal' },
    { name: 'Heebo', data: heebo4La as Buffer, weight: 400, style: 'normal' },
    { name: 'Karantina', data: karHe as Buffer, weight: 700, style: 'normal' },
    { name: 'Karantina', data: karLa as Buffer, weight: 700, style: 'normal' },
    { name: 'Archivo', data: archivo as Buffer, weight: 800, style: 'normal' },
  ])
  return cache
}

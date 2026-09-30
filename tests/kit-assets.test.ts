import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { yellowPhotoAllowed } from '@/lib/brand/yellowExemptions'

const ROOT = join(__dirname, '..')
const KITS = join(ROOT, 'public/kits')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

type LedgerRow = { file: string; bytes: number; yellowPx: number; method: string }
const ledger = JSON.parse(readFileSync(join(ROOT, 'content/manual/kit-templates.json'), 'utf8')) as { records: LedgerRow[] }
const photos = new Set(
  (JSON.parse(readFileSync(join(ROOT, 'content/manual/kit-photos.json'), 'utf8')) as { records: { file: string }[] }).records.map((row) => row.file),
)

/**
 * `public/kits/` is the one folder exempt from rule 8 by PREFIX — for the archive photographs,
 * whose yellow is a fact about a real object (rule 69). The prefix also covers anything else put
 * in the folder, and a V13 upload used exactly that hole: nineteen megabytes of layers, Arkia's
 * yellow included, passed silently. So the exemption is now fenced from the other side: every
 * file here that is not an archive photograph must have a measured ledger row, and that row must
 * say zero.
 */
describe('public/kits — nothing but the photographs is exempt', () => {
  const files = walk(KITS).map((path) => relative(KITS, path).split('\\').join('/'))
  // 25.9.2026 (delta 89): `og/<slug>.png` is the share-card twin of `<slug>.webp` — the same
  // photograph scaled for the image renderer (scripts/og/kit-thumbs.py). It carries exactly the
  // yellow of the object it copies, so it is the photograph, not a new file in the hole; a twin
  // with no photograph behind it is still caught.
  const twinOf = (file: string) => file.replace(/^og\/(.+)\.png$/, '$1.webp')
  const others = files.filter((file) => !photos.has(file) && !(file.startsWith('og/') && photos.has(twinOf(file))))

  it('is the folder the exemption names', () => {
    expect(yellowPhotoAllowed('public/kits/templates/2010s-fitted/shading.webp')).toBe(true)
  })

  it('measures every file that is not an archive photograph', () => {
    const rows = new Map(ledger.records.map((row) => [row.file, row]))
    expect(others.filter((file) => !rows.has(file)), 'files with no ledger row').toEqual([])
    expect(ledger.records.filter((row) => !files.includes(row.file)).map((row) => row.file), 'rows with no file').toEqual([])
  })

  it('found zero yellow in every one of them, on the bytes that ship', () => {
    for (const row of ledger.records) {
      expect(row.yellowPx, row.file).toBe(0)
      expect(statSync(join(KITS, row.file)).size, `${row.file}: rebuild with npm run kits:templates`).toBe(row.bytes)
      expect(row.method, row.file).toBe(row.file.endsWith('.svg') ? 'svg-colour-table' : 'decoded-rgba')
    }
  })

  it('ships the photo templates and marks as WebP, never as a layered PNG', () => {
    for (const file of others.filter((f) => f.startsWith('templates/') || f.startsWith('marks/'))) {
      expect(file).toMatch(/\.webp$/)
    }
    expect(others.filter((file) => file.includes('knowledge-v1'))).toEqual([])
  })
})

/**
 * The V14 layers kept the whole reveal image in RGB under alpha=0. A SOURCE may not do that
 * either: a mask is one channel, and the garment's hidden pixels are zero.
 */
describe('brand/source/kits — no hidden picture in a source', () => {
  const dir = join(ROOT, 'brand/source/kits')
  const pngs = walk(dir).filter((path) => path.endsWith('.png'))

  it('keeps every mask as a single channel', () => {
    const masks = pngs.filter((path) => /mask-[a-z-]+\.png$/.test(path))
    expect(masks.length).toBeGreaterThanOrEqual(5)
    for (const path of masks) {
      const png = PNG.sync.read(readFileSync(path))
      // pngjs expands to RGBA; a greyscale source has R = G = B and full alpha everywhere
      for (let i = 0; i < png.data.length; i += 4 * 97) {
        expect(png.data[i], path).toBe(png.data[i + 1])
        expect(png.data[i + 1], path).toBe(png.data[i + 2])
      }
    }
  })

  it('zeroes the colour of every transparent pixel', () => {
    for (const path of pngs.filter((p) => !/mask-/.test(p))) {
      const png = PNG.sync.read(readFileSync(path))
      let hidden = 0
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] === 0 && (png.data[i]! | png.data[i + 1]! | png.data[i + 2]!) !== 0) hidden += 1
      }
      expect(hidden, path).toBe(0)
    }
  })
})

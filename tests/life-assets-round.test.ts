/**
 * The assets made with the game-asset skills (29.10.2026): chirp cues, loom ground, kiln props.
 * Each is checked where it can break silently — a cue the code plays that no file answers, a model the
 * stage asks for that the library does not hold, a club colour baked into a shared file.
 */
import {existsSync, readFileSync, statSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {normalFromHeight} from '@/lib/life/rush-render/surfaces'
import type {PickupKind} from '@/lib/life/rush/level'

const read = (p: string) => readFileSync(p, 'utf8')

function parseGlb(path: string): Promise<{scene: import('three').Group}> {
  const b = readFileSync(path), ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  return new Promise((res, rej) => new GLTFLoader().parse(ab, '', g => res(g as never), rej))
}

describe('chirp cues', () => {
  const sound = read('components/clubs/life/sound.ts')
  const table = sound.slice(sound.indexOf('const CHIRP'), sound.indexOf('}', sound.indexOf('const CHIRP')))
  const names = [...table.matchAll(/'?([a-z-]+)'?:\s*0\.\d+/g)].map(m => m[1]!)
  it('every cue in the table ships as .ogg and .m4a, and is recorded in the manifest and the provenance', () => {
    expect(names.length).toBeGreaterThanOrEqual(19)
    const man = JSON.parse(read('public/life/sfx/manifest.json')) as Record<string, {source: string}>
    const prov = read('content/manual/asset-provenance.json')
    for (const n of names) {
      for (const ext of ['ogg', 'm4a']) expect(existsSync(`public/life/sfx/${n}.${ext}`), `${n}.${ext}`).toBe(true)
      expect(man[n]?.source, n).toBe('chirp-2026-10-29')
      expect(prov, n).toContain(`"${n}.*"`)
    }
  })
  it('the cues the Season One shell and RUSH call are cues the sound knows', () => {
    const calls = ['components/clubs/life/LifeGame.tsx', 'components/clubs/life/season/Cinema.tsx', 'components/clubs/life/Dialogue.tsx']
      .flatMap(f => [...read(f).matchAll(/(?:cue|onCue\?\.|cueRef\.current\?\.|play)\('([a-z-]+)'\)/g)].map(m => m[1]!))
    const rush = [...read('components/clubs/life/rush/RushHost.tsx').matchAll(/'([a-z-]+)'/g)].map(m => m[1]!).filter(n => names.includes(n))
    const known = new Set([...names, ...[...sound.matchAll(/case '([a-z-]+)'/g)].map(m => m[1]!)])
    for (const c of [...calls, ...rush]) expect(known.has(c), c).toBe(true)
    expect(rush).toEqual(expect.arrayContaining(['caught', 'objective', 'pickup', 'spray', 'clang']))
  })
})

describe('loom ground for RUSH', () => {
  it('ships colour, height and roughness for each surface, small enough for a phone', () => {
    let total = 0
    for (const s of ['asphalt', 'slabs', 'concrete']) for (const k of ['albedo', 'height', 'rough']) {
      const p = `public/life/rush/tex/${s}-${k}.webp`
      expect(existsSync(p), p).toBe(true)
      total += statSync(p).size
    }
    expect(total).toBeLessThan(600 * 1024)
  })
  it('turns a height into a unit normal that leans away from the slope', () => {
    const w = 4, h = 4, px = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[(y * w + x) * 4] = x * 60
    const n = normalFromHeight(px, w, h, 4), i = (1 * w + 1) * 4
    expect(n[i]!).toBeLessThan(128) // rising to the right: the normal tips left
    expect(Math.abs(n[i + 1]! - 128)).toBeLessThanOrEqual(1)
    const v = [n[i]!, n[i + 1]!, n[i + 2]!].map(c => c / 255 * 2 - 1)
    expect(Math.hypot(v[0]!, v[1]!, v[2]!)).toBeGreaterThan(0.97)
  })
})

describe('kiln props for RUSH', () => {
  it('the library holds every pickup the stage draws (the sticker keeps its printed face) and a bin with a lid', async () => {
    const kinds: PickupKind[] = ['sticker', 'coin', 'bottle', 'roll', 'bag', 'scarf', 'paint', 'cloth', 'tape']
    const pack = await parseGlb('public/life/rush/models/rush-props.glb')
    const names = pack.scene.children.map(c => c.name)
    for (const k of kinds.filter(k => k !== 'sticker')) expect(names, k).toContain(k)
    const bin = await parseGlb('public/life/rush/models/bin.glb')
    expect(bin.scene.getObjectByName('binlid'), 'GLTFLoader drops the dot: kiln names it bin.lid').toBeTruthy()
  })
  it('club colours are placeholders to repaint, never a club baked in', async () => {
    const pack = await parseGlb('public/life/rush/models/rush-props.glb')
    const mats = new Set<string>()
    pack.scene.traverse(o => { const m = (o as import('three').Mesh).material as {name?: string} | undefined; if (m?.name) mats.add(m.name) })
    expect([...mats]).toEqual(expect.arrayContaining(['clubP', 'clubS']))
    const stage = read('lib/life/rush-render/stage.ts')
    expect(stage).toContain('propCopy(src, paint2')
    expect(read('lib/life/rush-render/props.ts')).toMatch(/c\.color\.set\(paint\.p\)/)
  })
})

describe('pxl keepsake stickers', () => {
  it('a keepsake is drawn as what it is, and every sticker is painted only in LIFE tokens', async () => {
    const {SPRITES, spriteForKeep} = await import('@/components/clubs/life/PixelSprite')
    expect(spriteForKeep('shirt')).toBe('shirt')
    expect(spriteForKeep('away-ticket')).toBe('ticket')
    expect(spriteForKeep('borrowed-key')).toBe('key')
    expect(spriteForKeep('march-pin')).toBe('pin')
    expect(spriteForKeep('album')).toBe('album')
    expect(spriteForKeep('first-earnings')).toBe('coins')
    expect(spriteForKeep('napkin-list')).toBe('note')
    expect(spriteForKeep('scarf')).toBe('scarf')
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(new Set(rows.map(r => r.length)).size, name).toBe(1)
      for (const r of rows) expect(r, name).toMatch(/^[.ckwsnm]+$/)
    }
  })
})

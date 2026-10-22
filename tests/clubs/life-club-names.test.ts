/**
 * LIFE is one engine for every club, so a name that belongs to one club must never be painted for another.
 * The owner (22.10.2026): "there should not be THE RED BOX in every club". Hapoel's keepsake box is the Red
 * Box — The Worker's name for it; every other club's box carries that club's own name.
 */
import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import vm from 'node:vm'
import {describe, expect, it} from 'vitest'

const TOWN = 'public/life/town'
const read = (p: string) => readFileSync(p, 'utf8')

/** runs kit.js's clubKit() for a skin, with the browser bits it touches stubbed out */
function boxFor(name: string, club: Record<string, unknown>): string {
  const src = read(join(TOWN, 'kit.js'))
  const start = src.indexOf('function clubKit('), end = src.indexOf('window.__CK=clubKit(null)')
  expect(start).toBeGreaterThan(0)
  const body = src.slice(start, end)
  class Color { constructor(public h = '#000') {} getHSL(o: Record<string, number>) { o.h = 0; o.s = 0; o.l = 0.5 } setHSL() { return this } lerp() { return this } getHexString() { return '777777' } }
  const ctx = {THREE: {Color}, T: {Color}, Date, result: '' as unknown}
  vm.runInNewContext(`var T=THREE;function shade(h,k){return h}function title(s){return String(s)}${body};result=clubKit(${JSON.stringify({name, c1: '#008000', club})}).BOX`, ctx)
  return String(ctx.result)
}

describe('LIFE · a club-specific name is painted only for the club that owns it', () => {
  it('Hapoel Tel Aviv keeps the Red Box; every other club gets a box in its own name', () => {
    expect(boxFor('hapoel-tel-aviv', {name: 'Hapoel Tel Aviv', short: 'Hapoel'})).toBe('The Red Box')
    for (const [id, name] of [['aek-athens', 'AEK Athens'], ['panathinaikos', 'Panathinaikos'], ['olympiacos', 'Olympiacos'], ['celtic', 'Celtic'], ['st-pauli', 'St. Pauli'], ['zrinjski-mostar', 'Zrinjski Mostar'], ['hapoel-petah-tikva', 'Hapoel Petah Tikva']]) {
      const box = boxFor(id, {name, short: name})
      expect(box, id).toBe(`The ${name} Box`)
      expect(box, id).not.toMatch(/red box/i)
    }
  })

  it('no room, kit or LIFE component letters "Red Box" on its own: only the club-owned rule above may', () => {
    const files = [
      ...readdirSync(TOWN).filter(f => f.endsWith('.js')).map(f => join(TOWN, f)),
      ...readdirSync('components/clubs/life').filter(f => /\.(tsx|ts)$/.test(f)).map(f => join('components/clubs/life', f)),
    ]
    const offenders = files.filter(f => /red box/i.test(read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')) && !(f.endsWith('kit.js') && /'hapoel-tel-aviv'\?'The Red Box'/.test(read(f))))
    expect(offenders).toEqual([])
  })

  it('the LIFE title card names the club only from its researched world', () => {
    const page = read('app/clubs/[slug]/life/page.tsx')
    expect(page).toMatch(/clubWorld\(id\)/)
    expect(page).toMatch(/heart=\{heart\}/)
  })
})

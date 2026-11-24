import {describe, expect, it} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
import {facadeMetres, flowFits, flowPieces, flowSize, flowTown, flowUrl, type FlowManifest, type FlowPiece} from '@/lib/life/rush-render/look/flowArt'

const f = {w: 512, h: 512, bytes: 1, sha: 'x'}
const piece = (stem: string, o: Partial<FlowPiece>): FlowPiece => ({stem, kind: 'facade', files: {'512': f, '1024': f}, use: true, ...o})
const man: FlowManifest = {version: 1, pieces: Object.fromEntries([
  piece('life-facade-ath-01-fl1', {town: 'ath', key: '01', floors: 6}),
  piece('life-facade-ath-02-fl1', {town: 'ath', key: '02', use: false, note: 'a crest on the door'}),
  piece('life-facade-eur-01-fl1', {town: 'eur', key: '01'}),
  piece('life-stadium-olympiacos-b-fl1', {kind: 'stadium', club: 'olympiacos', town: 'ath', key: 'b'}),
  piece('life-stadium-olympiacos-a-fl1', {kind: 'stadium', club: 'olympiacos', town: 'ath', key: 'a'}),
  piece('life-skyline-ath-fl1', {kind: 'skyline', town: 'ath', files: {'1024': f}}),
].map(p => [p.stem, p]))}

describe('the Flow pictures as the game reads them (look/flowArt.ts, rule life-flow-art)', () => {
  it('gives a club its town\'s facades, never a piece reviewed use:false, and the European set where the town has none', () => {
    expect(flowPieces(man, {kind: 'facade', club: 'olympiacos'}).map(p => p.stem)).toEqual(['life-facade-ath-01-fl1'])
    expect(flowPieces(man, {kind: 'facade', club: 'celtic'}).map(p => p.stem)).toEqual(['life-facade-eur-01-fl1'])
    expect(flowPieces(null, {kind: 'facade', club: 'celtic'})).toEqual([])
  })
  it('gives a club only its own ground, -a first, and its town\'s skyline', () => {
    expect(flowPieces(man, {kind: 'stadium', club: 'olympiacos'}).map(p => p.key)).toEqual(['a', 'b'])
    expect(flowPieces(man, {kind: 'stadium', club: 'panathinaikos'})).toEqual([])
    expect(flowPieces(man, {kind: 'skyline', club: 'aek-athens'}).map(p => p.stem)).toEqual(['life-skyline-ath-fl1'])
  })
  it('asks only for sizes that exist, at /life/flow/<stem>-<size>.webp', () => {
    const sky = man.pieces['life-skyline-ath-fl1']!
    expect(flowSize(sky, [2048, 1024])).toBe('1024')
    expect(flowSize(sky, [512])).toBeNull()
    expect(flowUrl('life-skyline-ath-fl1', 1024)).toBe('/life/flow/life-skyline-ath-fl1-1024.webp')
    expect(flowTown('hapoel-tel-aviv')).toBe('tlv')
    expect(flowTown('unknown', 'mos')).toBe('mos')
  })
  it('skips a picture carrying a rival\'s colour family or yellow, and sizes a facade by its storeys', () => {
    const p = piece('life-facade-ath-03-fl1', {families: {green: 0.05, red: 0.001}})
    expect(flowFits(p, fam => fam === 'green')).toBe(false)
    expect(flowFits(p, fam => fam === 'red')).toBe(true)
    expect(flowFits(piece('y', {yellow: 0.2}), () => false)).toBe(false)
    expect(facadeMetres(piece('x', {floors: 3}))).toBeCloseTo(11.3, 1)
    expect(facadeMetres(piece('x', {floors: 7}))).toBeCloseTo(23.7, 1)
  })
  it('the baked manifest, when present, only lists files that are on disk and marks every piece use:true|false', () => {
    if (!existsSync('public/life/flow/manifest.json')) return
    const m = JSON.parse(readFileSync('public/life/flow/manifest.json', 'utf8')) as FlowManifest
    for (const p of Object.values(m.pieces)) {
      expect(typeof p.use, p.stem).toBe('boolean')
      for (const size of Object.keys(p.files)) expect(existsSync(`public/life/flow/${p.stem}-${size}.webp`), `${p.stem}-${size}`).toBe(true)
    }
  })
})

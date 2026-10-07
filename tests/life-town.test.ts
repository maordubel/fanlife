/**
 * The smooth 3D picture (`public/life/town`) is a second renderer behind the voxel runtime's contract.
 * It decides nothing about the story, so what these tests hold is the contract and the geometry:
 * the same events, a room for every place the game can send somebody, and geometry that cannot drift
 * from the walking band the game uses.
 */
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {ROOM_CATALOGUE, ROOMS} from '@/lib/life/universal/rooms'
import {SITES} from '@/lib/life/universal/city'
import {roomgeoSource, ROOMGEO_PATH} from '../scripts/life/export-roomgeo'

const dir = path.join(process.cwd(), 'public/life/town')
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8')
const defs = new Set(['rooms_home.js', 'rooms_street.js', 'rooms_club.js', 'rooms_stadium.js'].flatMap(f => [...read(f).matchAll(/RM\.def\('([^']+)'/g)].map(m => m[1]!)))

describe('the smooth picture', () => {
  it('draws from the geometry the game walks on', () => {
    expect(fs.readFileSync(ROOMGEO_PATH, 'utf8')).toBe(roomgeoSource())
  })

  it('has a room for every place the game can send somebody', () => {
    const ids = [...Object.keys(ROOMS), ...Object.keys(SITES), ...(ROOM_CATALOGUE as unknown as {id: string}[]).map(r => r.id)]
    expect(ids.filter(id => !defs.has(id))).toEqual([])
  })

  it('answers with the voxel runtime contract', () => {
    const play = read('play.js')
    for (const fn of ['on', 'enter', 'update', 'axis', 'run', 'act', 'freeze', 'focus', 'emote', 'project', 'frame', 'where']) expect(play).toMatch(new RegExp(`\\b${fn}:function`))
    for (const ev of ['ready', 'entered', 'target', 'act', 'exit', 'locked', 'tap', 'step', 'arrived', 'error']) expect(play).toContain(`type:'${ev}'`)
    expect(play).toContain('window.__vxPlay')
    expect(play).toContain('__vxHostReady')
  })

  it('puts no words on the canvas — every word is the shell\'s DOM', () => {
    expect(read('play.html')).not.toMatch(/<(h1|h2|p|button)\b/i)
  })

  it('keeps its page self-contained: only its own files and the shared three.js', () => {
    const srcs = [...read('play.html').matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]!)
    expect(srcs.filter(s => !s.startsWith('/life/town/') && s !== '/life/voxel/three.r128.min.js')).toEqual([])
    for (const s of srcs.filter(s => s.startsWith('/life/town/'))) expect(fs.existsSync(path.join(process.cwd(), 'public', s))).toBe(true)
  })

  it('degrades: three quality tiers and a fallback to the block picture', () => {
    const kit = read('kit.js')
    expect(kit).toMatch(/QL!=='low'/)
    expect(kit).toMatch(/QL==='med'/)
    const shell = fs.readFileSync(path.join(process.cwd(), 'components/clubs/life/LifeGame.tsx'), 'utf8')
    expect(shell).toContain("'blocks'")
    expect(shell).toContain('/life/voxel/play.html')
  })
})

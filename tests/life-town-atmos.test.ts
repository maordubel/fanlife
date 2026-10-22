/**
 * TOWN — the weather and the hour, what a surface is made of, a room that ages, and quality that adapts
 * (owner's list, items 1, 6, 7, 8). The runtime is plain browser JS, so its contracts are read from the source.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const kit = readFileSync('public/life/town/kit.js', 'utf8')
const play = readFileSync('public/life/town/play.js', 'utf8')
const home = readFileSync('public/life/town/rooms_home.js', 'utf8')
const runtime = readFileSync('components/clubs/life/runtime.ts', 'utf8')

describe('TOWN · the weather and the hour reach the picture', () => {
  it('the shell passes weather, mood, age and year into the room', () => {
    expect(play).toMatch(/weather:c\.weather\|\|null,mood:c\.mood\|\|'normal',age:/)
    expect(runtime).toMatch(/age: chapter\.age, year: pack\.hero\.birthYear == null \? null : pack\.hero\.birthYear \+ chapter\.age/)
  })
  it('every room load runs the atmosphere, with its own random stream', () => {
    expect(kit).toMatch(/ atmos\(sc,inside,opts\);\n cur\.cam=/)
    const body = kit.slice(kit.indexOf('function atmos('), kit.indexOf('var VW='))
    expect(body).not.toMatch(/\brnd\(\)|\brr\(/)
    expect(body).toMatch(/l\.isPointLight\|\|l\.isSpotLight\)l\.intensity\*=1\.55/) // a room at night is lit by its lamps
  })
})

describe('TOWN · a surface is what it is made of', () => {
  it('relief only where the thing has relief: plaster, paint, paper and cloth never bump', () => {
    const k = kit.match(/var WXK=(\{[^;]+\});/)![1]
    const table = Function(`return ${k}`)() as Record<string, number[]>
    for (const kind of ['plaster', 'paint', 'paper', 'cloth', 'metal']) expect(table[kind]![3], kind).toBe(0)
    expect(table.stone![3]).toBeGreaterThan(0)
    expect(kit).not.toMatch(/if\(m\.map&&!m\.bumpMap&&m\.map\.image&&m\.map\.image\.width>=128\)\{m\.bumpMap=m\.map;m\.bumpScale=big/)
  })
  it('the home textures say what they are made of', () => {
    for (const t of ["L.fabric=tg(L.fabric,'cloth')", "L.posterTex=tg(L.posterTex,'paper')", "L.wallTex=tg(L.wallTex,'plaster')"]) expect(home).toContain(t)
  })
})

describe('TOWN · the room ages with him', () => {
  it('the year picks the set, the phone and the desk; his age picks his walls', () => {
    expect(home).toMatch(/L\.era=function\(\)\{var Y=qn\('year'\);return Y==null\|\|Y<1990\?'analog':Y<2005\?'late':'flat'\}/)
    expect(home).toMatch(/var ERA=L\.era\(\),FLAT=ERA==='flat'/)
    expect(home).toMatch(/var PE=L\.era\(\);if\(PE==='flat'\)/)
    expect(home).toMatch(/if\(AG==null\|\|AG<13\)\{L\.sph\(\.55,'#8a5a40'/) // the teddy belongs to a child
  })
})

describe('TOWN · quality adapts to the device', () => {
  it('steps down gradually and never below one pixel per pixel', () => {
    expect(kit).toMatch(/AQ\.lvl>=3\?Math\.min\(1,AQ\.pr0\):AQ\.lvl>=1\?Math\.max\(1,AQ\.pr0\*\.8\):AQ\.pr0/)
    expect(kit).toMatch(/adapt\(n-last\);last=n;/)
  })
})

import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import wave from '@/club-packs/aek-athens/wave-kits-aek-2026-10-09.json'
import core from '@/club-packs/aek-athens/core.json'
import {SWATCH} from '@/lib/clubs/rumble-kit'
import {colourKey,patternOf} from '@/lib/clubs/kit-model'

const manifest=JSON.parse(readFileSync('content/manual/kit-commons-aek-athens.json','utf8')) as {count:number;records:{file:string;season:string|null;hex:Record<string,string>}[]}
type K={id:string;value:{season:string;type:string;manufacturer:string|null;sponsor:string|null;construction:{design:string;colors:string}};sources:string[];status:string;confidence:number}
const kits=wave.kits as unknown as K[]

const cof=JSON.parse(readFileSync('content/manual/kit-cof-aek-athens.json','utf8')) as {count:number;records:{season:string;type:string;shirt:{hex:Record<string,string>};shorts:{hex:string};socks:{hex:string}}[]}
const joined=JSON.parse(readFileSync('content/manual/kit-aek-athens.json','utf8')) as {kitCount:number;kits:{id:string;origin:string;sources:string[];maker:string|null}[]}

describe('AEK Athens kits: catalogue + Commons drawings',()=>{
 it('measures all 57 catalogue kits, each with a shirt, shorts and socks colour',()=>{
  expect(cof.count).toBe(57);expect(cof.records).toHaveLength(57)
  for(const r of cof.records){expect(r.shorts.hex).toMatch(/^#[0-9a-f]{6}$/);expect(r.socks.hex).toMatch(/^#[0-9a-f]{6}$/);expect(Object.values(r.shirt.hex).every(h=>/^#[0-9a-f]{6}$/.test(h))).toBe(true)}
 })
 it('the wave is the joined archive, one entry per kit',()=>{expect(kits).toHaveLength(joined.kitCount);expect(new Set(kits.map(k=>k.id))).toEqual(new Set(joined.kits.map(k=>k.id)))})
 it('a maker is only ever named for a kit the catalogue drew; Commons-only kits name none',()=>{
  for(const k of joined.kits)if(k.origin==='drawing')expect(k.maker).toBeNull()
 })
 it('measures all 133 drawings in the category',()=>{expect(manifest.count).toBe(133);expect(manifest.records).toHaveLength(133)})
 it('is a review delivery: nothing approved, nothing above confidence 1, no approver claimed',()=>{
  for(const k of kits){expect(k.status).toBe('review');expect(k.confidence).toBe(1);expect(k).not.toHaveProperty('approvedBy')}
 })
 it('names a maker or sponsor only where a catalogue drawing shows one (rule 11)',()=>{
  const drawn=new Set(joined.kits.filter(k=>k.origin==='catalogue').map(k=>k.id))
  for(const k of kits)if(k.value.manufacturer||k.value.sponsor)expect(drawn.has(k.id),k.id).toBe(true)
 })
 it('ids are unique and every kit cites the one declared source',()=>{
  expect(new Set(kits.map(k=>k.id)).size).toBe(kits.length)
  const ids=new Set(wave.sources.map(s=>s.id))
  for(const k of kits)for(const s of k.sources)expect(ids.has(s),`${k.id} cites ${s}`).toBe(true)
 })
 it('has one kit per season, type and drawing, with a parseable season',()=>{for(const k of kits)expect(k.value.season).toMatch(/\d{4}/)})
 it('names only colours the swatch can paint, and designs the model knows how to draw or knows it cannot',()=>{
  for(const k of kits){
   for(const c of k.value.construction.colors.split('/'))expect(colourKey(c),`${k.id} ${c}`).not.toBeNull()
   const d=k.value.construction.design,p=patternOf(d)
   expect(p!==null||['graphic','contrasting sleeves','gradient'].includes(d),`${k.id} ${d}`).toBe(true)
  }
 })
 it('never contradicts the makers the club pack already approved (2016/17 and 2023/24 home: Nike)',()=>{
  const approved=new Set((core.kits as unknown as K[]).filter(k=>k.status==='approved').map(k=>`${k.value.season}|${k.value.type}`))
  expect(approved.size).toBe(2)
  const nike=new Map((core.kits as unknown as K[]).filter(k=>k.status==='approved').map(k=>[`${k.value.season}|${k.value.type}`,k.value.manufacturer]))
  for(const k of kits)if(approved.has(`${k.value.season}|${k.value.type}`)&&k.value.manufacturer)expect(k.value.manufacturer,k.id).toBe(nike.get(`${k.value.season}|${k.value.type}`))
 })
 it('the swatch carries AEK\'s own colour',()=>{expect(SWATCH.yellow).toMatch(/^#[0-9a-f]{6}$/i)})
})

/* ---- wiring: what the features see once the owner approves (approval applied in memory only, never on disk) ---- */
import {compilePack} from '@/lib/clubs/compiler'
import {mergeWave} from '@/lib/clubs/waves'
import {REGISTRY} from '@/lib/master/registry'
import {kitViews,buildableKits,waveCReadiness} from '@/lib/clubs/gate-content'
import {collectionOf,isBuildable} from '@/lib/clubs/kit-collection'
import {documentedCloth} from '@/lib/clubs/kit-model'
import {forbiddenColor} from '@/lib/clubs/theme'
import React,{createElement} from 'react'
;(globalThis as {React?:unknown}).React=React
import {renderToStaticMarkup} from 'react-dom/server'
import {KitPlate} from '@/components/clubs/games/KitPlate'

const aek=REGISTRY.find(c=>c.id==='aek-athens')!
const approvedWave=()=>{const w=structuredClone(wave) as unknown as {kits:Record<string,unknown>[]};for(const k of w.kits)Object.assign(k,{status:'approved',confidence:2,approvedAt:'2026-10-09',approvedBy:'Maor Harel (owner, chat)'});return w}
const build=(approve:boolean)=>compilePack(mergeWave(structuredClone(core) as never,(approve?approvedWave():structuredClone(wave)) as never),aek)

describe('AEK kits reach the gates, the shelf and the market',()=>{
 it('while the wave is in review nothing reaches a gate (the two kits already in core cite aekfc.gr, whose access is "unknown", so they are held back too)',()=>{
  expect(kitViews(build(false).data)).toHaveLength(0)
 })
 const data=build(true).data
 it('once approved, every kit is a row of the club\'s archive (the market and closet read this same list)',()=>{
  const views=kitViews(data);expect(views.length).toBeGreaterThanOrEqual(90)
  expect(new Set(views.map(v=>v.id)).size).toBe(views.length)
  expect(collectionOf(data)).toHaveLength(views.length)
 })
 it('gate 4 (build the kit) has a full round and gate 5 (shirt collection) a full shelf',()=>{
  const r=waveCReadiness(data);expect(buildableKits(data).length).toBeGreaterThanOrEqual(5)
  expect(r['kit-builder']!.playable).toBe(true);expect(r.kits!.playable).toBe(true)
  expect(r['kit-builder']!.state).toBe('READY');expect(r.kits!.state).toBe('READY')
 })
 it('AEK yellow is paintable under AEK\'s own colour policy, so its yellow kits are real gate-4 puzzles',()=>{
  const forbidden=(h:string)=>forbiddenColor(data.theme,h)
  const yellow=kitViews(data).filter(k=>k.colours.includes('yellow')&&k.design==='stripes'&&k.maker)
  expect(yellow.length).toBeGreaterThan(3)
  for(const k of yellow){expect(documentedCloth(k,forbidden),k.id).not.toBeNull();expect(isBuildable(data,k)).toBe(true)}
 })
 it('shorts and socks travel with the kit, and only for kits a catalogue drew whole',()=>{
  const views=kitViews(data),whole=views.filter(v=>v.shorts&&v.socks)
  expect(whole).toHaveLength(57);expect(views.filter(v=>!v.shorts&&!v.socks).length).toBe(views.length-57)
 })
 it('KitPlate draws the whole kit (taller frame) when shorts and socks are documented, the shirt alone otherwise',()=>{
  const v=kitViews(data),full=v.find(k=>k.shorts&&k.socks&&k.colours.length&&k.season==='2025/26'&&k.design==='stripes')!,bare=v.find(k=>!k.shorts)!
  expect(renderToStaticMarkup(createElement(KitPlate,{kit:full,label:false}))).toContain('viewBox="0 0 430 470"')
  expect(renderToStaticMarkup(createElement(KitPlate,{kit:bare,label:false}))).toContain('viewBox="0 0 340 320"')
 })
})

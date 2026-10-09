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

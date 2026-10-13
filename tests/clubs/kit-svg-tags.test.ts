import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'

const CLUBS:[string,string][]=[['aek-athens','kit-aek-athens'],['celtic','kit-archive-celtic'],['hapoel-petah-tikva','kit-archive-hapoel-petah-tikva'],['hapoel-tel-aviv','kit-archive-hapoel-tel-aviv'],['olympiacos','kit-archive-olympiacos'],['panathinaikos','kit-archive-panathinaikos'],['st-pauli','kit-archive-st-pauli'],['zrinjski-mostar','kit-archive-zrinjski-mostar']]
type K={id:string;origin:string;season:string;type:string;maker:string|null;sponsor:string|null;readUnsure?:boolean;shorts:unknown;socks:unknown;image?:string}

describe('every club kit drawing is tagged and complete (13.10.2026)',()=>{
 for(const [club,file] of CLUBS){
  const kits=(JSON.parse(readFileSync(`content/manual/${file}.json`,'utf8')) as {kits:K[]}).kits
  it(`${club}: each kit has an SVG carrying its season, type and index row`,()=>{
   const index=JSON.parse(readFileSync(`public/club-kits/${club}/svg/index.json`,'utf8')) as {count:number;kits:{id:string;season:string;type:string}[]}
   expect(index.count).toBe(kits.length)
   for(const k of kits){
    const f=`public/club-kits/${club}/svg/${k.id}.svg`
    expect(existsSync(f),f).toBe(true)
    const head=readFileSync(f,'utf8').slice(0,600)
    expect(head).toContain(`data-season="${k.season}"`)
    expect(head).toContain(`data-type="${k.type}"`)
    expect(head).toContain(`data-club="${club}"`)
    expect(index.kits.find(r=>r.id===k.id)?.season).toBe(k.season)
   }
  })
  it(`${club}: a kit read from a photograph keeps to what a photograph shows`,()=>{
   for(const k of kits.filter(x=>x.origin==='photo')){
    expect(k.readUnsure).toBe(true)
    expect(k.shorts).toBeNull(); expect(k.socks).toBeNull()
    expect(k.image).toMatch(/^\/club-kits\//)
    expect(existsSync(`public${k.image}`)).toBe(true)
   }
   const keys=kits.filter(x=>x.origin==='photo').map(k=>`${k.season}|${k.type}`)
   expect(new Set(keys).size).toBe(keys.length)
  })
 }
 it('the photograph kits add seasons the catalogue lacked',()=>{
  const n=CLUBS.reduce((a,[,f])=>a+(JSON.parse(readFileSync(`content/manual/${f}.json`,'utf8')) as {kits:K[]}).kits.filter(k=>k.origin==='photo').length,0)
  expect(n).toBeGreaterThanOrEqual(55)
 })
})

import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {sponsorMark} from '@/lib/clubs/marks'
import sponsorVectors from '@/content/manual/sponsor-marks.json'
import hapoelFronts from '@/content/manual/hapoel-kit-fronts.json'
import {kitFrontOf,measuredSponsor} from '@/lib/clubs/kit-fronts'

const CLUBS:[string,string][]=[['aek-athens','kit-aek-athens'],['celtic','kit-archive-celtic'],['hapoel-petah-tikva','kit-archive-hapoel-petah-tikva'],['hapoel-tel-aviv','kit-archive-hapoel-tel-aviv'],['olympiacos','kit-archive-olympiacos'],['panathinaikos','kit-archive-panathinaikos'],['st-pauli','kit-archive-st-pauli'],['zrinjski-mostar','kit-archive-zrinjski-mostar']]
type K={id:string;origin:string;season:string;type:string;maker:string|null;sponsor:string|null;readUnsure?:boolean;shorts:unknown;socks:unknown;image?:string}

describe('every club kit drawing is tagged and complete (13.10.2026)',()=>{
 for(const [club,file] of CLUBS){
  const kits=(JSON.parse(readFileSync(`content/manual/${file}.json`,'utf8')) as {kits:K[]}).kits
  it(`${club}: each kit has an SVG carrying its season, type and index row`,()=>{
   const index=JSON.parse(readFileSync(`public/club-kits/${club}/svg/index.json`,'utf8')) as {count:number;kits:{id:string;season:string;type:string}[]}
   // 12.11.2026 — the folder also draws every approved pack kit with a documented colour (npm run kits:svgs): the index counts the joined
   // list, and every archive kit is still in it
   const joined=`content/generated/kit-svgs/${club}.json`,all=existsSync(joined)?(JSON.parse(readFileSync(joined,'utf8')) as {kits:K[]}).kits:kits
   expect(index.count).toBe(all.length)
   expect(all.filter(k=>k.origin!=='pack').map(k=>k.id).sort()).toEqual(kits.map(k=>k.id).sort())
   for(const k of all){
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

describe('sourced shirt sponsor artwork', () => {
 it('keeps the different Hapoel front references and measurements on their own kit IDs', () => {
  const main = kitFrontOf({id:'hapoel-tel-aviv:kit-kit-2022-23-home'})
  const alternative = kitFrontOf({id:'hapoel-tel-aviv:cof-k-28-v2'})
  expect(main?.photo).toBe('/kits/fka-2022-23-home.webp')
  expect(alternative?.photo).toBe('/kits/fka-2022-23-home-2.webp')
  expect(measuredSponsor(main)).not.toEqual(measuredSponsor(alternative))
  const ids = hapoelFronts.flatMap(front=>front.kitIds)
  expect(new Set(ids).size).toBe(ids.length)
  for(const front of hapoelFronts){
   expect(existsSync(join(process.cwd(),'public',front.photo)),front.photo).toBe(true)
   const box=measuredSponsor(kitFrontOf({id:`hapoel-tel-aviv:${front.kitIds[0]}`}))
   if(!box)continue
   expect(Math.min(box.x,box.y,box.w,box.h),front.photo).toBeGreaterThan(0)
   expect(Math.max(box.x+box.w,box.y+box.h),front.photo).toBeLessThanOrEqual(100)
  }
 })
 it('selects the print from the documented club, season and variant', () => {
  expect(sponsorMark('  IBI ')).toMatchObject({kind:'svg',src:'/kits/marks/sponsor-ibi.svg'})
  const stPauli = {club:'st-pauli',variant:'home'} as const
  expect(sponsorMark('congstar',{...stPauli,season:'2023/24'})?.src).toContain('congstar-stacked')
  expect(sponsorMark('congstar',{...stPauli,season:'2017/18'})?.src).toContain('congstar-stacked')
  expect(sponsorMark('Cosmote',{club:'panathinaikos',season:'2008/09',variant:'home'})?.src).toContain('cosmote-home')
  expect(sponsorMark('Cosmote',{club:'panathinaikos',season:'2008/09',variant:'away'})).toBeNull()
  expect(sponsorMark('Pame Stoixima',{club:'aek-athens',season:'2024/25',variant:'home'})?.src).toContain('pame-stoixima.svg')
  expect(sponsorMark('Pame Stoixima',{club:'aek-athens',season:'2020/21',variant:'home'})).toBeNull()
  expect(sponsorMark('stoixima',{club:'panathinaikos',season:'2019/20',variant:'away'})?.src).toContain('pame-stoixima.svg')
  expect(sponsorMark('Piraeus Bank',{club:'aek-athens',season:'2003/04',variant:'away'})?.src).toContain('piraeus-bank-2000.svg')
  expect(sponsorMark('Superbet',{club:'panathinaikos',season:'2026/27',variant:'home'})?.src).toContain('superbet.svg')
  expect(sponsorMark('Superbet',{club:'panathinaikos',season:'2025/26',variant:'home'})).toMatchObject({src:'/club-kits/marks/superbet.svg',print:'colour'})
  const ote = {club:'panathinaikos',season:'2003/04'} as const
  expect(sponsorMark('OTE',{...ote,variant:'home'})).toMatchObject({src:'/club-kits/marks/ote-oval.svg',print:'colour'})
  expect(sponsorMark('OTE',{...ote,variant:'away'})).toBeNull()
  expect(sponsorMark('UMBRO',{club:'hapoel-tel-aviv',season:'2008/09',variant:'away'})?.src).toContain('umbro-wordmark-2000.svg')
  expect(sponsorMark('UMBRO',{club:'hapoel-tel-aviv',season:'2009/10',variant:'away'})).toBeNull()
  const hapoelDouble = {club:'hapoel-tel-aviv',season:'1999/00'} as const
  expect(sponsorMark('כתר',{...hapoelDouble,variant:'home'})).toMatchObject({src:'/club-kits/marks/keter-1999-hebrew.svg',print:'colour'})
  expect(sponsorMark('כתר',{...hapoelDouble,variant:'away'})).toBeNull()
  const hachshara={club:'hapoel-tel-aviv',season:'2020/21'} as const
  expect(sponsorMark('הכשרה',{...hachshara,variant:'home',base:'red'})?.src).toContain('hachshara-shirt-white.svg')
  expect(sponsorMark('הכשרה',{...hachshara,variant:'away',base:'white'})?.src).toContain('hachshara-shirt-red.svg')
  expect(sponsorMark('Siemens mobile',{club:'olympiacos',season:'2004/05',variant:'away'})?.src).toContain('siemens-mobile-white')
  expect(sponsorMark('congstar',{...stPauli,season:'2024/25'})?.src).toContain('congstar-horizontal-light')
  expect(sponsorMark('congstar',{...stPauli,season:'2010/11'})).toBeNull()
  const citi = {club:'olympiacos',season:'2009/10'} as const
  expect(sponsorMark('citibank',{...citi,variant:'home'})?.src).toContain('citibank-2009')
  expect(sponsorMark('citibank',{...citi,variant:'third'})?.src).toContain('citibank-2009-white')
  expect(sponsorMark('citibank',{...citi,variant:'special'})).toBeNull()
  expect(sponsorMark('stoiximan',{club:'olympiacos',season:'2018/19',variant:'home'})).toBeNull()
 })
 it('ships every sourced print as a self-contained vector', () => {
  for (const mark of Object.values(sponsorVectors).flat()) {
   expect(['mono','colour'],mark.src).toContain(mark.print)
   const svg = readFileSync(join(process.cwd(),'public',mark.src),'utf8')
   expect(svg,mark.src).toMatch(/<svg\b/)
   expect(svg,mark.src).toMatch(/<(?:path|polygon)\b/)
   expect(svg,mark.src).not.toMatch(/<(?:image|text|foreignObject|script)\b|\shref\s*=/i)
  }
 })
})

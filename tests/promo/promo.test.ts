import {describe,expect,it} from 'vitest'
import {capped,cleanBanner,cleanDoc,eligible,inWindow,israelClock,outbound,pageOf,pickBanner,PromoInvalid} from '@/lib/promo/rules'
import {SEED_DOC} from '@/lib/promo/seed'
import {existsSync} from 'node:fs'

const NOW=Date.parse('2026-10-14T09:00:00Z') // Wed 12:00 in Israel
const at=(club:string|null,path='/')=>pageOf(club,path)
const ids=(page:ReturnType<typeof at>,israel=false,doc=SEED_DOC)=>eligible(doc,page,NOW,{israel}).map(b=>b.id).sort()

describe('the owner\'s three banners',()=>{
 it('Offsides and TakeMeOut are on every page',()=>{
  for(const p of [at(null),at('olympiacos','/clubs/olympiacos'),at(null,'/market'),at('hapoel-tel-aviv','/clubs/hapoel-tel-aviv/trivia')])expect(ids(p)).toEqual(expect.arrayContaining(['offsides','takemeout']))
 })
 it('Dubid is only on Hapoel Tel Aviv and Hapoel Petah Tikva',()=>{
  expect(ids(at('hapoel-tel-aviv','/clubs/hapoel-tel-aviv'))).toContain('dubid')
  expect(ids(at('hapoel-petah-tikva','/clubs/hapoel-petah-tikva/polls'))).toContain('dubid')
  for(const p of [at(null),at('olympiacos','/clubs/olympiacos'),at('zrinjski-mostar','/x'),at(null,'/market')])expect(ids(p)).not.toContain('dubid')
 })
 it('every shipped banner image exists, at 1× and 2×',()=>{for(const b of SEED_DOC.banners){expect(existsSync('public'+b.img1x)).toBe(true);expect(existsSync('public'+b.img2x)).toBe(true)}})
 it('never on the control room, test pages or The Worker\'s game',()=>{for(const p of ['/master/admin','/qa/stats','/life','/api/x'])expect(ids(at(null,p))).toEqual([])})
})
describe('targeting',()=>{
 const doc=(b:Record<string,unknown>,settings:Record<string,unknown>={})=>({settings:{...SEED_DOC.settings,...settings},banners:[cleanBanner({...SEED_DOC.banners[0],enabled:true,...b})]}) as typeof SEED_DOC
 it('Israeli-only needs an Israeli viewer',()=>{const d=doc({audience:'israel'});expect(ids(at(null),false,d)).toEqual([]);expect(ids(at(null),true,d)).toEqual(['offsides'])})
 it('a disabled banner or a switched-off system shows nothing',()=>{expect(ids(at(null),false,doc({enabled:false}))).toEqual([]);expect(ids(at(null),false,doc({},{enabled:false}))).toEqual([])})
 it('a page rule can switch a page off or restrict it to chosen banners',()=>{
  expect(ids(at(null),false,doc({},{pageRules:[{page:'home',mode:'off',only:[]}]}))).toEqual([])
  expect(ids(at('olympiacos','/c'),false,doc({},{pageRules:[{page:'clubs',mode:'only',only:['x-other']}]}))).toEqual([])
  expect(ids(at('olympiacos','/c'),false,doc({},{pageRules:[{page:'clubs',mode:'off',only:[]},{page:'club:olympiacos',mode:'auto',only:[]}]}))).toEqual(['offsides'])
 })
 it('exclusions beat inclusions',()=>{expect(ids(at(null,'/market/x'),false,doc({targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:['/market']}}))).toEqual([])})
})
describe('schedule',()=>{
 const b=(p:Record<string,unknown>)=>cleanBanner({...SEED_DOC.banners[0],...p})
 it('Israel clock: 09:00Z in October is Wednesday 12:00',()=>{const c=israelClock(NOW);expect(c.dow).toBe(3);expect(c.hour).toBe(12)})
 it('date window',()=>{expect(inWindow(b({startsAt:'2026-10-15T00:00:00Z'}),NOW)).toBe(false);expect(inWindow(b({endsAt:'2026-10-14T00:00:00Z'}),NOW)).toBe(false);expect(inWindow(b({startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-11-01T00:00:00Z'}),NOW)).toBe(true)})
 it('days and hours, including a window that wraps midnight',()=>{
  expect(inWindow(b({days:[3]}),NOW)).toBe(true);expect(inWindow(b({days:[0,6]}),NOW)).toBe(false)
  expect(inWindow(b({fromHour:9,toHour:13}),NOW)).toBe(true);expect(inWindow(b({fromHour:13,toHour:18}),NOW)).toBe(false)
  expect(inWindow(b({fromHour:22,toHour:6}),NOW)).toBe(false);expect(inWindow(b({fromHour:10,toHour:2}),NOW)).toBe(true)
 })
})
describe('caps and rotation',()=>{
 const [a,b]=SEED_DOC.banners as [typeof SEED_DOC.banners[0],typeof SEED_DOC.banners[0]]
 it('per-visit, per-day and cooldown caps',()=>{
  const day=israelClock(NOW).day
  expect(capped(a,{},{[a.id]:{n:1,last:NOW,day,dn:1}},NOW)).toBe(true)
  expect(capped({...a,maxPerSession:0,maxPerDay:2},{[a.id]:{n:5,last:0,day,dn:2}},{},NOW)).toBe(true)
  expect(capped({...a,maxPerSession:0,cooldownMin:30},{[a.id]:{n:1,last:NOW-10*60000,day,dn:1}},{},NOW)).toBe(true)
  expect(capped({...a,maxPerSession:0,cooldownMin:30},{[a.id]:{n:1,last:NOW-40*60000,day,dn:1}},{},NOW)).toBe(false)
 })
 it('never repeats the last banner while another is available, and cycles',()=>{
  for(let i=0;i<20;i++)expect(pickBanner([a,b],{},a.id,NOW,()=>i/20)?.id).toBe(b.id)
  expect(pickBanner([a],{},a.id,NOW,()=>0.5)?.id).toBe(a.id)
  expect(pickBanner([],{},null,NOW,()=>0.5)).toBeNull()
 })
 it('weight 0 is never picked; an unseen banner is favoured',()=>{
  expect(pickBanner([{...a,weight:0},b],{},null,NOW,()=>0.99)?.id).toBe(b.id)
  const seen={[a.id]:{n:9,last:0,day:israelClock(NOW).day,dn:9}};let hits=0;for(let i=0;i<200;i++)if(pickBanner([a,b],seen,null,NOW,()=>i/200)?.id===b.id)hits++
  expect(hits).toBeGreaterThan(150)
 })
})
describe('the control room\'s write path',()=>{
 it('refuses a bad id, a non-https link and a missing image',()=>{
  expect(()=>cleanBanner({...SEED_DOC.banners[0],id:'Bad Id'})).toThrow(PromoInvalid)
  expect(()=>cleanBanner({...SEED_DOC.banners[0],href:'http://x.com'})).toThrow(PromoInvalid)
  expect(()=>cleanBanner({...SEED_DOC.banners[0],href:'javascript:alert(1)'})).toThrow(PromoInvalid)
  expect(()=>cleanBanner({...SEED_DOC.banners[0],img1x:''})).toThrow(PromoInvalid)
  expect(()=>cleanBanner({...SEED_DOC.banners[0],img1x:'/other/x.png'})).toThrow(PromoInvalid)
 })
 it('refuses two banners with one id and round-trips the seed unchanged',()=>{
  expect(()=>cleanDoc({...SEED_DOC,banners:[SEED_DOC.banners[0],SEED_DOC.banners[0]]})).toThrow(PromoInvalid)
  expect(cleanDoc(SEED_DOC).banners).toEqual(SEED_DOC.banners.map(b=>({...b,href:new URL(b.href).toString()})))
 })
 it('clamps numbers into their range',()=>{const x=cleanBanner({...SEED_DOC.banners[0],weight:9999,fromHour:99,showSec:1});expect([x.weight,x.fromHour,x.showSec]).toEqual([100,23,2])})
 it('the outbound link says where it was seen',()=>{const u=new URL(outbound(SEED_DOC.banners[2]!,at('hapoel-tel-aviv','/c')));expect(u.hostname).toBe('dubid.dubelteam.com');expect(u.searchParams.get('utm_content')).toBe('hapoel-tel-aviv');expect(u.searchParams.get('utm_campaign')).toBe('dubid')})
})

import {isOwn} from '@/lib/promo/rules'
describe('own banners',()=>{
 it('seeds Manager, Market, LIFE and the extra banner',()=>{
  const by=Object.fromEntries(SEED_DOC.banners.map(b=>[b.id,b]))
  expect(Object.keys(by)).toEqual(expect.arrayContaining(['manager','market','life','fuckyou']))
  expect(by.manager!.href).toContain('/all-football/legends')
  expect(by.fuckyou!.href).toBe('https://fuckyou.dubelteam.com')
  expect(isOwn(by.market!)).toBe(true)
  expect(isOwn(by.fuckyou!)).toBe(false)
 })
})

describe('the “/” exclusion',()=>{
 it('hides a banner on the home page only, not on every page',async()=>{
  const {pageAllows}=await import('@/lib/promo/rules')
  const t={home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:['/']}
  expect(pageAllows(t,{kind:'home'})).toBe(false)
  expect(pageAllows(t,{kind:'other',path:'/market'})).toBe(true)
 })
})

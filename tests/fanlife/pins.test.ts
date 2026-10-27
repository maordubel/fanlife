import {describe,expect,it,beforeEach} from 'vitest'
import {readFileSync} from 'node:fs'
import {addPin,MAX_PINS,normalizePins,pinHref,pinKind,pinTarget,readPins,removePin,writePins,PINS_KEY,type Pin} from '@/lib/fanlife/pins'
import {DEFAULT_FEATURES,FEATURE_TEXT,featuresOf,validateFeaturePatch} from '@/lib/features'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const NOW='2026-10-27T10:00:00.000Z'
const add=(list:Pin[],href:string,label='X',replace?:string)=>addPin(list,href,label,{now:NOW,replace})

describe('pinned shortcuts — the whitelist',()=>{
 it('accepts only the internal routes a fan can pin',()=>{
  expect(pinKind('/clubs/olympiacos')).toBe('club')
  expect(pinKind('/clubs/olympiacos/trivia')).toBe('gate')
  expect(pinKind('/clubs/hapoel-tel-aviv/royal-rumble')).toBe('gate')
  expect(pinKind('/clubs/olympiacos/timeline')).toBe('gate')
  expect(pinKind('/clubs/celtic/life')).toBe('life')
  expect(pinKind('/all-football')).toBe('allFootball')
  expect(pinKind('/all-football/legends')).toBe('legends')
  expect(pinKind('/all-football/legends/career/9f2c0a41b7d3e8aa')).toBe('legends')
  expect(pinKind('/go/dubid?c=pin')).toBe('app')
  expect(pinKind('/go/offsides?c=pin&club=olympiacos')).toBe('app')
 })
 it('refuses external, malformed and unknown routes',()=>{
  for(const bad of ['https://evil.example/','//evil.example','javascript:alert(1)','/clubs/olympiacos/not-a-gate','/clubs/Olympiacos','/clubs/olympiacos?lang=he',
   '/clubs/olympiacos/trivia/../../admin','/master/admin','/go/theworker?c=pin','/go/dubid?c=pin&to=https://x','/go/dubid','/all-football/legends/career/../x','',null,42,'/'+'a'.repeat(200)])
   expect(pinKind(bad as never)).toBeNull()
 })
 it('a stored list that was tampered with comes back clean',()=>{
  expect(normalizePins([{href:'https://x.example',label:'X'},{href:'/clubs/celtic',label:'  Celtic <b> '},{href:'/clubs/celtic',label:'dup'},{href:'/all-football',label:''},{href:'/all-football',label:'AF'},{href:'/clubs/aek',label:'third'}]))
   .toEqual([{href:'/clubs/celtic',label:'Celtic b',kind:'club',at:''},{href:'/all-football',label:'AF',kind:'allFootball',at:''}])
  expect(normalizePins('nope')).toEqual([])
 })
})

describe('pinned shortcuts — the list',()=>{
 it('adds in order, at most two, and refuses a third without a swap',()=>{
  expect(MAX_PINS).toBe(2)
  let r=add([],'/clubs/celtic','Celtic');expect(r.ok).toBe(true);const one=r.ok?r.pins:[]
  r=add(one,'/clubs/celtic/trivia','Celtic · Trivia');const two=r.ok?r.pins:[]
  expect(two.map(p=>p.href)).toEqual(['/clubs/celtic','/clubs/celtic/trivia'])
  expect(add(two,'/all-football')).toEqual({ok:false,reason:'full'})
  // pinning what is already pinned is a no-op, not a refusal
  expect(add(two,'/clubs/celtic')).toEqual({ok:true,pins:two})
 })
 it('a swap takes the place of the one given up, so the order is kept',()=>{
  const two=normalizePins([{href:'/clubs/celtic',label:'A'},{href:'/clubs/aek',label:'B'}])
  const r=add(two,'/all-football','AF','/clubs/celtic')
  expect(r.ok&&r.pins.map(p=>p.href)).toEqual(['/all-football','/clubs/aek'])
 })
 it('rejects an invalid route even with a swap named',()=>{
  expect(add([],'https://x.example')).toEqual({ok:false,reason:'invalid'})
  expect(add([],'/clubs/celtic','   ')).toEqual({ok:false,reason:'invalid'})
 })
 it('removes by route',()=>{
  const two=normalizePins([{href:'/clubs/celtic',label:'A'},{href:'/clubs/aek',label:'B'}])
  expect(removePin(two,'/clubs/celtic').map(p=>p.href)).toEqual(['/clubs/aek'])
 })
 it('a club page keeps its language; other routes stay as stored',()=>{
  const [c,af]=normalizePins([{href:'/clubs/celtic/life',label:'A'},{href:'/all-football',label:'B'}])
  expect(pinHref(c!,'he')).toBe('/clubs/celtic/life?lang=he')
  expect(pinHref(c!,'en')).toBe('/clubs/celtic/life')
  expect(pinHref(af!,'he')).toBe('/all-football')
  expect(pinTarget('/clubs/celtic/?lang=he')).toBe('/clubs/celtic')
 })
})

describe('pinned shortcuts — device storage',()=>{
 const store=new Map<string,string>()
 beforeEach(()=>{store.clear();(globalThis as Record<string,unknown>).localStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v)},removeItem:(k:string)=>{store.delete(k)}};(globalThis as Record<string,unknown>).window={dispatchEvent:()=>true,addEventListener(){},removeEventListener(){}}})
 it('writes under fanlife.pins.v1 and reads back a stable list',()=>{
  writePins(normalizePins([{href:'/clubs/celtic',label:'Celtic'}]))
  expect(JSON.parse(store.get(PINS_KEY)!)).toHaveLength(1)
  const a=readPins(),b=readPins();expect(a).toBe(b);expect(a[0]!.href).toBe('/clubs/celtic')
 })
 it('a refused storage falls back to memory, never throws',()=>{
  (globalThis as Record<string,unknown>).localStorage={getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('blocked')}}
  expect(()=>writePins(normalizePins([{href:'/all-football',label:'AF'}]))).not.toThrow()
  expect(readPins().map(p=>p.href)).toEqual(['/all-football'])
 })
})

describe('the pins switch',()=>{
 it('ships off, reads strictly, and is in the control room',()=>{
  expect(DEFAULT_FEATURES.pins).toBe(false)
  expect(featuresOf(null).pins).toBe(false)
  expect(featuresOf({features:{pins:true}} as never).pins).toBe(true)
  expect(validateFeaturePatch({pins:true})).toEqual({ok:true,patch:{pins:true}})
  expect(validateFeaturePatch({pins:'on'})).toEqual({ok:false,error:'pins must be true or false.'})
  expect(FEATURE_TEXT.pins.label).toBe('Pinned shortcuts')
  expect(readFileSync('components/master/FeatureControl.tsx','utf8')).toMatch(/row\('pins'\)/)
 })
 it('the menu carries door(pins) with owner preview, on the hub and on every club page',()=>{
  expect(readFileSync('components/master/Shell.tsx','utf8')).toMatch(/featuresOf\(state\)\.pins\|\|isOwner\(\)/)
  expect(readFileSync('app/clubs/[slug]/layout.tsx','utf8')).toMatch(/pins=\{featuresOf\(state\)\.pins\|\|isOwner\(\)\}/)
  expect(readFileSync('components/weekly/Contents.tsx','utf8')).toMatch(/<PinsSwitch on=\{pins\}\/>/)
 })
})

describe('where pins live',()=>{
 const src=(p:string)=>readFileSync(p,'utf8')
 it('every named surface carries a Pin toggle',()=>{
  for(const p of ['components/clubs/GateHead.tsx','components/clubs/PlayHeader.tsx','app/clubs/[slug]/page.tsx','components/clubs/ClubLifeCard.tsx','components/clubs/life/LifeGame.tsx','app/all-football/legends/page.tsx','components/legends/CareerApp.tsx','app/all-football/page.tsx','components/weekly/Contents.tsx'])
   expect(src(p),p).toMatch(/<PinToggle\b/)
  expect(src('app/clubs/[slug]/[gate]/page.tsx').match(/pin=\{\{href:`\/clubs\/\$\{club\.identity\.id\}\/\$\{gate\.key\}`/g)).toHaveLength(2)
 })
 it('the shortcuts show in the menu, on the hub and on a club home',()=>{
  expect(src('components/weekly/Contents.tsx')).toMatch(/<PinsRow locale=\{locale\} where="menu"/)
  expect(src('app/page.tsx')).toMatch(/<PinsRow locale=\{locale\} where="hub"\/>/)
  expect(src('app/clubs/[slug]/page.tsx')).toMatch(/<PinsRow locale=\{locale\} where="club"\/>/)
 })
 it('pins are never discovery units: no data-discovery-unit, no snooze, no attention policy',()=>{
  const code=(f:string)=>src(f).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')
  const p=code('components/fanlife/Pins.tsx')+code('lib/fanlife/pins.ts')+code('app/weekly/pins.css')
  expect(p).not.toMatch(/data-discovery-unit|DiscoveryUnit|snooze|data-up\b/i)
  expect(p).not.toMatch(/recommend/i)
  // and the empty line is the menu's alone
  expect(src('components/fanlife/Pins.tsx')).toMatch(/if\(!pins\.length&&where!=='menu'\)return null/)
 })
 it('the sheet never scrolls sideways and prints with tokens only',()=>{
  const css=src('app/weekly/pins.css')
  expect(css).not.toMatch(/overflow-x|snap-|#[0-9a-f]{3,8}\b|\b(left|right)\s*:/i)
 })
 it('English and Hebrew carry the same pin keys',()=>{
  const k=(o:object)=>Object.keys(o).filter(x=>x.startsWith('pin')).sort()
  expect(k(en)).toEqual(k(he));expect(k(en).length).toBeGreaterThanOrEqual(12)
 })
})

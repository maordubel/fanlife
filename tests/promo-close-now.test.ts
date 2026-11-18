import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
/** owner, 18.11.2026: × takes an ad off the screen for that moment; ads keep coming as usual */
describe('ads: × closes for now only',()=>{
 it('the banner, the discovery unit and the DUBID strip never snooze or stop the visit',()=>{
  const banner=readFileSync('components/promo/PromoBanner.tsx','utf8'),unit=readFileSync('components/universe/DiscoveryUnit.tsx','utf8'),strip=readFileSync('components/promo/RoundLockStrip.tsx','utf8')
  const dismiss=/const dismiss=\(\)=>\{[^\n]*/.exec(banner)![0]
  expect(dismiss).not.toMatch(/snooze|stop=true/);expect(dismiss).toMatch(/resume\.current/)
  expect(unit).toMatch(/const close = \(\) => \{ setState\('gone'\) \}/);expect(unit).not.toMatch(/hide for a week/)
  expect(strip).not.toMatch(/snooze|fl\.lock\./)
 })
 it('old week-long hides are forgotten',async()=>{
  const store=new Map<string,string>([['fanlife.discovery.snooze.v1',JSON.stringify({dubid:Date.now()+9e8})]])
  ;(globalThis as {localStorage?:unknown}).localStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)}
  const {snoozed,snooze,snoozedSet}=await import('@/lib/universe/attention')
  expect(snoozed('dubid')).toBe(false);snooze('offsides');expect(snoozedSet().size).toBe(0);expect(store.size).toBe(0)
 })
})

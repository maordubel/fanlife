import {describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
const src=(p:string)=>readFileSync(p,'utf8')

// owner, 9.11.2026: "for now no club lets anyone into LIFE — the banner says Coming soon until it is finished"
describe('LIFE is closed to fans until the owner opens it',()=>{
 it('ships switched off, with a switch in Settings → Features',async()=>{
  const {DEFAULT_FEATURES,featuresOf,validateFeaturePatch}=await import('@/lib/features')
  expect(DEFAULT_FEATURES.life).toBe(false)
  expect(featuresOf({features:undefined} as never).life).toBe(false)
  expect(validateFeaturePatch({life:true})).toEqual({ok:true,patch:{life:true}})
  expect(src('components/master/FeatureControl.tsx')).toContain("row('life')")
 })
 it('every door answers Coming soon and the game itself is not served',async()=>{
  vi.resetModules()
  vi.doMock('server-only',()=>({}))
  vi.doMock('@/lib/features-server',()=>({door:async()=>({open:false,preview:false})}))
  const {lifeEntry}=await import('@/lib/clubs/life/entry')
  expect(await lifeEntry('hapoel-tel-aviv',{evaluation:true,status:'live'})).toEqual({state:'soon',href:null})
  expect(src('app/clubs/[slug]/life/page.tsx')).toMatch(/if \(!\(await lifeOpen\(\)\)\) notFound\(\)/)
  expect(src('components/clubs/ClubLifeCard.tsx')).toContain("state==='soon'")
  expect(src('app/page.tsx')).toContain('copy.lifeSoon')
 })
})

describe('the YouTube channel on the hub, the bottom bar, the menu and every club home',()=>{
 it('is linked everywhere the owner asked, from one definition',()=>{
  expect(src('app/page.tsx')).toMatch(/<WatchBanner copy=\{copy\}\/>/)
  expect(src('app/clubs/[slug]/page.tsx')).toMatch(/<WatchBanner copy=\{copy\} club=\{id\} ink="club"\/>/)
  expect(src('components/master/TabBar.tsx')).toContain('CHANNEL.url')
  expect(src('lib/weekly/menu.ts')).toContain('CHANNEL.url')
  expect(src('components/weekly/WatchBanner.tsx')).not.toMatch(/#[0-9a-f]{3,6}\b/i)
 })
})

import {describe,it,expect,beforeEach,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {GATE_MODES,modeOf,isPlayMode} from '@/lib/clubs/layout-mode'
import {readActivity,activityKey} from '@/lib/clubs/activity'

describe('Wave 0 · layout modes',()=>{
 it('every shared gate has exactly one mode, and nothing else is mapped',()=>{
  expect(Object.keys(GATE_MODES).sort()).toEqual(SHARED_GATES.map(g=>g.key).sort())
  SHARED_GATES.forEach(g=>expect(['reading','game','arena','studio']).toContain(modeOf(g.key)))
 })
 it('reading gates keep the masthead; play gates get the compact header',()=>{
  expect(isPlayMode('reading')).toBe(false);(['game','arena','studio'] as const).forEach(m=>expect(isPlayMode(m)).toBe(true))
  expect(modeOf('archive')).toBe('reading');expect(modeOf('derby')).toBe('reading')
  expect(modeOf('royal-rumble')).toBe('arena');expect(modeOf('kits')).toBe('studio')
 })
 it('the dispatcher uses the compact header only for a playable play-mode gate, and hides the tab bar there',()=>{
  const page=readFileSync('app/clubs/[slug]/[gate]/page.tsx','utf8')
  expect(page).toContain('compact=readiness.playable&&isPlayMode(mode)')
  expect(page).toContain('tabbar={!compact}')
  expect(page).toContain('data-mode={mode}')
 })
 it('the play header has a ≥44px back, a help sheet, and strings come from the locale files',()=>{
  const src=readFileSync('components/clubs/PlayHeader.tsx','utf8'),css=readFileSync('app/magazine.css','utf8')
  expect(src).toContain('aria-haspopup="dialog"');expect(src).toContain('closeLabel={copy.close}')
  expect(css).toMatch(/\.mag-playhead-back[^{]*\{[^}]*min-height: 44px/)
  for(const l of ['en','he']){const d=JSON.parse(readFileSync(`messages/games/${l}.json`,'utf8'));for(const k of ['play.back','play.help','play.close','play.fanlife','play.language','triviaSub'])expect(d[k],`${l}:${k}`).toBeTruthy()}
 })
})

describe('Wave 0 · completion contract',()=>{
 const store=new Map<string,string>()
 beforeEach(()=>{store.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>void store.set(k,v),removeItem:(k:string)=>void store.delete(k)})})
 it('an attempt is counted once however many times its result renders',async()=>{
  const {completeRun}=await import('@/lib/clubs/completion')
  expect(completeRun('c1','trivia','trivia:v1:7:0',90)).toBe(true);completeRun('c1','trivia','trivia:v1:7:0',90);completeRun('c1','trivia','trivia:v1:7:0',90)
  expect(readActivity('c1').trivia.completed).toBe(1)
  completeRun('c1','trivia','trivia:v1:8:0',40);expect(readActivity('c1').trivia).toEqual({completed:2,best:90})
 })
 it('derby and archive can be on the ticket; an old ticket without them still reads',()=>{
  store.set(activityKey('c2'),JSON.stringify({recent:[],seen:[],xi:false,trivia:{completed:1,best:5}}))
  const a=readActivity('c2');expect(a.trivia.completed).toBe(1);expect(a.derby).toEqual({completed:0,best:0});expect(a.archive).toEqual({completed:0,best:0})
 })
 it('clubs never share a ticket',async()=>{
  const {completeRun}=await import('@/lib/clubs/completion');completeRun('a','goal','goal:1',1);expect(readActivity('b').goal.completed).toBe(0)
 })
})

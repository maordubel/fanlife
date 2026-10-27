import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {SPRINT,actorAt,sceneFor} from '@/lib/highlights/scenes'
import {qaReel} from '@/lib/highlights/qa-reel'
import {MAN_PX,PX_UP,scaleAt} from '@/components/highlights/paint'
import type {Moment} from '@/lib/highlights/types'

/* the accuracy pass (owner, 27.10.2026: "more accurate") — measured, not eyeballed */
const reel=qaReel()
const KINDS=['goal','save','miss','post','block','offside','yellow','red','injury'] as const
const scenes=Array.from({length:450},(_,i)=>{const m:Moment={minute:20+i%60,side:(i%2) as 0|1,kind:KINDS[i%9]!,score:[0,0]};return sceneFor({...reel,seed:hash(`acc${i}`)},m,i)})

describe('the highlights move at a footballer’s pace',()=>{
 it('nobody in a move outruns a sprinter (the through ball used to ask 32 m/s, the cutback 44)',()=>{
  let worst=0
  for(const sc of scenes)for(const a of sc.actors){if(a.extra)continue
   for(let t=0;t<sc.duration;t+=.05){const p=actorAt(a,t),q=actorAt(a,t+.05);if(['dive','slide','down','celebrate'].includes(q.pose))continue;worst=Math.max(worst,Math.hypot(q.x-p.x,q.y-p.y)/.05)}}
  expect(worst).toBeLessThan(SPRINT*1.35)
 })
 it('a run carries on through its waypoints instead of stopping dead at each one',()=>{
  // a defender shadowing his man has a key every 0.3 s: halfway between two keys he is still moving
  const sc=scenes.find(s=>s.variant==='through ball')!,d=sc.actors.find(a=>a.id==='d1')!,mid=d.keys.slice(1,-1).find((k,i)=>Math.hypot(k.x-d.keys[i]!.x,k.y-d.keys[i]!.y)>.3&&Math.hypot(d.keys[i+2]!.x-k.x,d.keys[i+2]!.y-k.y)>.3)
  if(!mid)return
  const p=actorAt(d,mid.t-.02),q=actorAt(d,mid.t+.02);expect(Math.hypot(q.x-p.x,q.y-p.y)/.04).toBeGreaterThan(.5)
 })
 it('nobody celebrates before the ball is in the net',()=>{
  for(const sc of scenes){if(sc.outcome!=='goal')continue;const g=sc.cues.find(q=>q.kind==='goal')!.t
   for(const a of sc.actors)for(let t=0;t<g-.05;t+=.05)expect(actorAt(a,t).pose,`${sc.variant} ${a.id} at ${t.toFixed(2)} (goal ${g.toFixed(2)})`).not.toBe('celebrate')}
 })
 it('a keeper dives to the height of the shot, never above the bar',()=>{
  const lifts=scenes.flatMap(s=>s.actors.filter(a=>a.role==='gk'&&a.lift!==undefined).map(a=>a.lift!))
  expect(lifts.length).toBeGreaterThan(20);expect(Math.max(...lifts)).toBeLessThanOrEqual(1.5);expect(Math.min(...lifts)).toBeGreaterThanOrEqual(0)
 })
})

describe('the picture keeps one scale',()=>{
 it('the crossbar stands 2.44 m of a 1.8 m man — taller than the players, as it is',()=>{
  expect(2.44*PX_UP/MAN_PX).toBeCloseTo(2.44/1.8,5)
  expect(2.44*PX_UP).toBeGreaterThan(MAN_PX)
 })
 it('the far touchline is further from the camera than the near one, and drawn smaller',()=>{
  expect(scaleAt(0)).toBeLessThan(scaleAt(34));expect(scaleAt(34)).toBeCloseTo(1,5);expect(scaleAt(68)).toBeGreaterThan(1)
  // a long lens: the far side is never drawn at less than three quarters of halfway
  expect(scaleAt(0)).toBeGreaterThan(.75)
 })
})

describe('the boards and the radar (owner, 27.10.2026)',()=>{
 it('every pitch-side board is one of our own banners, and it exists in both sizes',async()=>{
  const {BOARD_ADS}=await import('@/components/highlights/boards'),{existsSync}=await import('node:fs')
  for(const id of BOARD_ADS)for(const r of ['1x','2x'])expect(existsSync(`public/ads/${id}-${r}.webp`),`${id}-${r}`).toBe(true)
 })
 it('a club page prints the boards in one ink (rule 95); the hub in colour',async()=>{
  const {highlightsAllow}=await import('@/lib/highlights/page')
  expect(highlightsAllow(undefined,{}).mono).toBe(false)
  expect(highlightsAllow(()=>false,{}).mono).toBe(true)
 })
 it('the radar is its own canvas, never drawn on the picture',async()=>{
  const {readFileSync}=await import('node:fs'),src=readFileSync('components/highlights/paint.ts','utf8')
  const body=src.slice(src.indexOf('export function draw('),src.indexOf('/** where a man'))
  expect(body).not.toMatch(/radar|Radar/)
  expect(readFileSync('components/highlights/Theatre.tsx','utf8')).toMatch(/drawRadar\(rc/)
 })
})

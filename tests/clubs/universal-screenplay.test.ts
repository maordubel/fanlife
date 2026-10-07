import {describe, expect, it} from 'vitest'
import {SCREENPLAY, screenplayChapters} from '@/lib/life/universal/screenplay'
import {apply, emptyState, eventsOf, Life, openChapter, saveKey, type Directive, type LifeStore} from '@/lib/life/universal/engine'
import {Runner, sceneOf} from '@/lib/life/universal/world'
import {validateChapter, lifeFlagsOf, validatePack} from '@/lib/life/universal/validate'
import {ROOMS} from '@/lib/life/universal/rooms'
import {buildCast} from '@/lib/life/universal/cast'
import {simulate} from '@/lib/life/universal/sim'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import type {Chapter, LifeState, LifeEvent} from '@/lib/life/universal/types'

function perform(chapter:Chapter, id:string, state:LifeState, choice?:string){
 let ended:string|null=null
 const applyNow=(events:LifeEvent[])=>state=events.reduce(apply,state)
 const direct=(ds:Directive[])=>{for(const d of ds){
  if(d.d==='play'){const r=eventsOf(d.then,state);applyNow(r.events);direct(r.directives)}
  if(d.d==='goto')applyNow([{t:'moved',room:d.room,spawn:d.spawn,time:d.time??state.time}])
  if(d.d==='end'){ended=d.ending;applyNow([{t:'ended',chapter:chapter.id,ending:d.ending}])}
 }}
 const runner=new Runner(chapter,state,applyNow)
 let v=runner.start(id);expect(v).toBeTruthy()
 for(let i=0;v&&!v.done&&i<30;i++){
  if(v.choices.length){const selected=choice??v.choices[0]!.id;expect(v.choices.map(c=>c.id)).toContain(selected);v=runner.choose(selected)}
  else v=runner.advance()
 }
 expect(v?.done).toBe(true);direct(runner.directives)
 return {state,ended}
}
const journey=(choices:Record<string,string>={})=>{
 let state=emptyState()
 const chapters=screenplayChapters('he')
 for(const [index,chapter] of chapters.entries()){
  state=openChapter(chapter).reduce(apply,state)
  for(const scene of SCREENPLAY[index]!.scenes){
   state=perform(chapter,`${scene.id}:choose`,state,choices[scene.id]).state
   const task=sceneOf({rooms:ROOMS,cast:buildCast(null)} as Parameters<typeof sceneOf>[0],chapter,state,state.room!).spots.find(s=>s.talk===`${scene.id}:act`)
   expect(task,`task ${scene.id} reachable in ${state.room}`).toBeTruthy()
   state=perform(chapter,`${scene.id}:act`,state).state
  }
  expect(state.done[chapter.id]).toBeTruthy()
 }
 return state
}

describe('universal screenplay 2',()=>{
 it('has eighteen complete chapters, fifty-four scenes and bilingual choices',()=>{
  expect(SCREENPLAY).toHaveLength(18)
  const scenes=SCREENPLAY.flatMap(c=>c.scenes);expect(scenes).toHaveLength(54)
  expect(new Set(scenes.map(s=>s.id)).size).toBe(54)
  for(const s of scenes){expect(s.options.length).toBeGreaterThanOrEqual(3);expect(s.options.some(o=>!o.when)).toBe(true)}
  for(const locale of ['en','he'] as const){
   const previous=new Set<string>()
   for(const c of screenplayChapters(locale)){expect(validateChapter({rooms:ROOMS,cast:buildCast(null)},c,previous)).toEqual([]);lifeFlagsOf(c).forEach(k=>previous.add(k))}
  }
 })
 it('completes the default family route with a real local budget',()=>{
  const s=journey();expect(s.flags['life:trip:result']).toBe('outing');expect(s.flags['life:family']).toBe('child');expect(s.coins).toBe(4)
 })
 it('completes alone without money or parenting, and keeps the home ending honest',()=>{
  const s=journey({S23:'miss',S25:'space',S26:'people',S40:'new',S41:'fail',S43:'none',S44:'slow',S45:'wait',S46:'solo',S47:'shared',S48:'home',S50:'return',S51:'home',S54:'own'})
  expect(s.flags['life:trip:result']).toBe('home');expect(s.flags['life:family']).toBe('none');expect(s.coins).toBe(0)
 })
 it('repairs a broken shift, with a newcomer and a longer affordable trip',()=>{
  const s=journey({S23:'miss',S25:'friendship',S26:'people',S37:'materials',S39:'paid',S40:'shift',S41:'shift',S43:'newfan',S46:'three',S47:'far'})
  expect(s.flags['life:promise:shift']).toBe('repaired');expect(s.flags['life:family']).toBe('newfan');expect(s.coins).toBe(8);expect(s.flags['life:trip:route']).toBe('far')
 })
 it('returns an unpaid ride to a real later repair, and permits the honest free walk ending',()=>{
  const s=journey({S19:'friend',S21:'later',S23:'miss',S40:'ride',S41:'ride',S47:'shared',S51:'walk'})
  expect(s.flags['life:promise:ride']).toBe('repaired');expect(s.flags['life:trip:result']).toBe('walk')
 })
 it('does not reward selecting or closing dialogue; an action pays once',()=>{
  const c=screenplayChapters('he').find(c=>c.id==='c6-work')!
  let state=openChapter(c).reduce(apply,emptyState());state=apply(state,{t:'flag',k:'story:c6-work:stage',v:1})
  state=perform(c,'S23:choose',state,'work').state;expect(state.coins).toBe(0);expect(state.flags['life:promise:shift']).toBeUndefined()
  const close=new Runner(c,state,es=>state=es.reduce(apply,state));close.start('S23:act');expect(state.coins).toBe(0)
  state=perform(c,'S23:act',state).state;expect(state.coins).toBe(24)
  state=perform(c,'S23:act',state).state;expect(state.coins).toBe(24)
 })
 it('has no dead end within each chapter at zero energy and zero money',()=>{
  const seed:LifeEvent[]=[{t:'energy',by:-100}]
  for(const c of screenplayChapters('he')){
   const r=simulate({rooms:ROOMS,cast:buildCast(null)} as Parameters<typeof simulate>[0],c,seed)
   expect(r.truncated,c.id).toBe(false);expect(r.stuck,c.id).toEqual([]);expect(r.endings.length,c.id).toBeGreaterThan(0)
  }
 })
 it('composes against a real club without altering original chapters or its save',async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data
  const v1=clubLife(data),v2=clubLife(data,{edition:2,locale:'he'})
  expect(v1.provenance.universalChapters).toBe(12);expect(v2.provenance.universalChapters).toBe(18);expect(v2.readiness.playable).toBe(true)
  expect(v2.anchors).toEqual(v1.anchors)
  const map=new Map<string,string>();const store:LifeStore={read:k=>map.get(k)??null,write:(k,v)=>{map.set(k,v)},clear:k=>{map.delete(k)}}
  const original=new Life(v1,[],store);original.begin();original.dispatch({t:'flag',k:'life:original',v:true});const before=map.get(saveKey(v1.clubId))
  const upgraded=Life.load(v2,store);expect(upgraded.state.chapter).toBeNull();upgraded.begin()
  expect(map.get(saveKey(v1.clubId))).toBe(before);expect(map.has(saveKey(v2.clubId,2))).toBe(true)
  const resume=Life.load(clubLife(data,{edition:2,locale:'en'}),store);expect(resume.state.chapter).toBe(v2.chapters[0]!.id)
 },30000)
 it.each(CORE_CLUB_IDS)('%s: embeds the new story alongside approved historical nights',async id=>{
  const data=(await loadClub(id))!.data
  for(const locale of ['he','en'] as const){const pack=clubLife(data,{edition:2,locale});expect(pack.readiness.playable).toBe(true);expect(validatePack(pack)).toEqual([]);expect(pack.chapters.at(-1)!.id).toBe('finale')}
 },30000)
})

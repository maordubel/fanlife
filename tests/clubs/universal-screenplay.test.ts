import {describe, expect, it} from 'vitest'
import {SCREENPLAY, screenplayChapters} from '@/lib/life/universal/screenplay'
import {apply, emptyState, eventsOf, Life, meets, openChapter, saveKey, type Directive, type LifeStore} from '@/lib/life/universal/engine'
import {Runner, sceneOf} from '@/lib/life/universal/world'
import {validateChapter, lifeFlagsOf, validatePack} from '@/lib/life/universal/validate'
import {ROOMS} from '@/lib/life/universal/rooms'
import {buildCast} from '@/lib/life/universal/cast'
import {simulate} from '@/lib/life/universal/sim'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {callbackSubsets, MAX_CALLBACKS} from '@/lib/life/universal/screenplay/compile'
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
/** Every scene of a chapter that the world offers now, in the script's order; hubs, `after` and `when` decide. */
const available=(chapter:Chapter,id:string,state:LifeState)=>chapter.spots.some(sp=>sp.talk===`${id}:choose`&&meets(state,sp.when))
const journey=(choices:Record<string,string>={},upTo?:string)=>{
 let state=emptyState()
 const chapters=screenplayChapters('he')
 for(const [index,chapter] of chapters.entries()){
  state=openChapter(chapter).reduce(apply,state)
  for(let round=0;round<SCREENPLAY[index]!.scenes.length;round++){
   const scene=SCREENPLAY[index]!.scenes.find(sc=>!state.flags[`story:${chapter.id}:${sc.id}:done`]&&available(chapter,sc.id,state))
   if(!scene)break
   state=perform(chapter,`${scene.id}:choose`,state,choices[scene.id]).state
   expect(chapter.spots.some(sp=>sp.talk===`${scene.id}:act`&&meets(state,sp.when)),`task ${scene.id} reachable`).toBe(true)
   state=perform(chapter,`${scene.id}:act`,state).state
  }
  expect(state.done[chapter.id],`${chapter.id} ends`).toBeTruthy()
  if(chapter.id===upTo)break
 }
 return state
}
/** every condition a chapter reads, and every flag it raises */
const walk=(node:unknown,reads:Set<string>,raised:Set<string>)=>{
 if(Array.isArray(node)){node.forEach(n=>walk(n,reads,raised));return}
 if(!node||typeof node!=='object')return
 const o=node as Record<string,unknown>
 if(typeof o.flag==='string')reads.add(o.flag)
 if(typeof o.not==='string')reads.add(o.not)
 if(Array.isArray(o.is)&&typeof o.is[0]==='string')reads.add(o.is[0])
 if(o.e==='flag'&&typeof o.k==='string')raised.add(o.k)
 Object.values(o).forEach(v=>walk(v,reads,raised))
}


/** `life:` flags that are raised for the record — the box, the card, the end of the life — and read by nobody on purpose. */
const UNREAD_ON_PURPOSE = new Set<string>([
 // what the box remembers at the end of the life: its shape, not a thing anybody asks about again
 'life:legacy','life:legacy:object','life:legacy:voice',
 // the account of a trip, a repair or a ride is spoken in the scene that raises it; the later scenes read the promise, not the sum
 'life:trip:budget','life:trip:pace','life:trip:prepared','life:trip:route','life:repair:account','life:ride:account',
 // small choices whose whole effect is the heart and the line in the moment: they are the texture, and are deliberately free of consequence
 'life:album:offer','life:away2:end','life:away2:home','life:kick:last','life:kick:role',
])

describe('universal screenplay 2',()=>{
 it('has twenty-one complete chapters, sixty-seven scenes and bilingual choices',()=>{
  expect(SCREENPLAY).toHaveLength(21)
  const scenes=SCREENPLAY.flatMap(c=>c.scenes);expect(scenes).toHaveLength(67)
  expect(new Set(scenes.map(s=>s.id)).size).toBe(67)
  for(const s of scenes){expect(s.options.length).toBeGreaterThanOrEqual(3);expect(s.options.some(o=>!o.when)).toBe(true)}
  for(const locale of ['en','he'] as const){
   const previous=new Set<string>()
   for(const c of screenplayChapters(locale)){expect(validateChapter({rooms:ROOMS,cast:buildCast(null)},c,previous)).toEqual([]);lifeFlagsOf(c).forEach(k=>previous.add(k))}
  }
 })
 it('completes the default family route with a real local budget',()=>{
  const s=journey();expect(s.flags['life:trip:result']).toBeTruthy();expect(s.flags['life:family']).toBe('child')
 })
 it('completes alone without parenting, and keeps the home ending honest',()=>{
  const s=journey({S23:'miss',S26:'people',S43:'none',S46:'solo',S47:'shared',S51:'home'})
  expect(s.flags['life:trip:result']).toBe('home');expect(s.flags['life:family']).toBe('none')
 })
 it('every route of the middle years reaches the end of its chapter, however it is entered',()=>{
  expect(journey({S58:'stay'}).done['c5b-far-end']).toBeTruthy()
  expect(journey({S58:'borrow'}).flags['life:promise:ride']).toBeTruthy()
  expect(journey({S16:'stay'}).done['c5-away']).toBeTruthy()
 })
 it('does not reward selecting or closing dialogue; an action pays once',()=>{
  const c=screenplayChapters('he').find(c=>c.id==='c6-work')!
  let state=openChapter(c).reduce(apply,emptyState());state=apply(state,{t:'flag',k:'story:c6-work:S22:done',v:true})
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
 },120000)
 it('stacks callbacks: every combination, the largest first, and never two of one exclusive group',()=>{
  const cb=(when:string,group?:string)=>({when:{flag:when},lines:[],group})
  const a=cb('a'),b=cb('b'),c=cb('c','g'),d=cb('d','g')
  const sets=callbackSubsets([a,b,c,d])
  expect(sets[0]).toHaveLength(3);expect(sets.at(-1)).toHaveLength(1)
  expect(sets.every(x=>x.filter(y=>y.group==='g').length<=1)).toBe(true)
  expect(sets.some(x=>x.includes(a)&&x.includes(b)&&x.includes(c))).toBe(true)
  expect(sets.some(x=>x.includes(c)&&x.includes(d))).toBe(false)
  for(const chapter of SCREENPLAY)for(const sc of chapter.scenes)expect((sc.callbacks??[]).length,sc.id).toBeLessThanOrEqual(MAX_CALLBACKS)
  // in a compiled talk a richer stack always comes before the plainer one it contains
  for(const chapter of screenplayChapters('en'))for(const t of chapter.talks)if(t.id.endsWith(':choose'))expect(t.branches.at(-1)!.when,t.id).toBeUndefined()
 })
 it('lets nobody speak who is not in the room: an absent person is narrated, not quoted',()=>{
  for(const chapter of SCREENPLAY)for(const sc of chapter.scenes)if(sc.presence){
   expect(sc.solo?.length,`${sc.id} has narrated lines for when ${sc.who} is away`).toBeGreaterThan(0)
   for(const line of sc.solo!)expect(line[0],`${sc.id} solo`).toBeNull()
  }
 })
 it('reads the flags it raises: every life flag is read by a later (or the same) chapter, or is on the allow-list',()=>{
  const reads=new Set<string>(),raised=new Set<string>()
  for(const c of screenplayChapters('en'))walk(c,reads,raised)
  // the nights read and raise their own
  const unread=[...raised].filter(k=>k.startsWith('life:')&&!k.startsWith('life:decision:')&&!reads.has(k)&&!UNREAD_ON_PURPOSE.has(k)).sort()
  expect(unread).toEqual([])
  for(const k of UNREAD_ON_PURPOSE)expect(raised.has(k),`${k} is on the allow-list but nothing raises it`).toBe(true)
 })
 it('has one script and one save: the first edition is gone, its saves are ignored, never read or deleted',async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data
  const he=clubLife(data,{locale:'he'}),en=clubLife(data,{locale:'en'})
  expect(he.provenance.universalChapters).toBe(21);expect(he.readiness.playable).toBe(true);expect(he.storyLocale).toBe('he')
  expect(he.cast.dad!.name).toBe('אבא');expect(en.cast.dad!.name).toBe('Dad')
  expect(saveKey('hapoel-tel-aviv')).toMatch(/:story2$/)
  const map=new Map<string,string>();const store:LifeStore={read:k=>map.get(k)??null,write:(k,v)=>{map.set(k,v)},clear:k=>{map.delete(k)}}
  const old=`fan-life:club:${en.clubId}:life`
  map.set(old,JSON.stringify({v:1,club:en.clubId,pack:en.version,events:[{t:'started',pack:en.version},{t:'chapter',id:en.chapters[0]!.id}],savedAt:''}))
  const fresh=Life.load(en,store);expect(fresh.state.chapter).toBeNull();fresh.begin()
  expect(map.get(old)).toBeDefined();expect(map.has(saveKey(en.clubId))).toBe(true)
  expect(Life.load(clubLife(data,{locale:'en'}),store).state.chapter).toBe(en.chapters[0]!.id)
 },30000)
 it.each(CORE_CLUB_IDS)('%s: embeds the story alongside approved historical nights',async id=>{
  const data=(await loadClub(id))!.data
  for(const locale of ['he','en'] as const){const pack=clubLife(data,{locale});expect(pack.readiness.playable).toBe(true);expect(validatePack(pack)).toEqual([]);expect(pack.chapters.at(-1)!.id).toBe('finale')}
 },30000)
})

import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.dubelteam.com',gates:[1,2,4,5,6,12,13]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:'live',gates:request.gates}))})}))
import {loadClub} from '@/lib/clubs/resolver'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import {COLOUR_KEYS,colourHex,patternOf,BLANK} from '@/lib/clubs/kit-model'
import {HINT_LIMIT,HINT_PENALTY,PERFECT_BONUS,STEP_ORDER,canRun,activeSteps,dealKitRun,eligibleKits,gradePuzzle,kitModeFrom,nextCursor,publicRun,roundScore,strikeFor,weightsOf,type Step} from '@/lib/clubs/kit-run'
import {BRIEFS,edit,redo,resetTo,startHistory,undo,validateSpec,upsertDesign,type SavedDesign} from '@/lib/clubs/kit-studio'
import {collectionOf,gate4Playable,studioLimits} from '@/lib/clubs/kit-collection'
import {signUnlock,verifyUnlock} from '@/lib/clubs/kit-unlock'
import {gradeKitShirt,hintKitShirt} from '@/components/clubs/gates/kit-builder/actions'
import {openBuiltKits} from '@/components/clubs/gates/kits/actions'

beforeEach(()=>{request.host='olympiacos.fanlife.dubelteam.com';request.gates=[1,2,4,5,6,12,13]})
const club=async(id:string)=>(await loadClub(id))!.data

describe('gate 4 · the deal',()=>{
 it('is the same for the same seed and cursor, and never hands the client an answer sheet',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos']){
   const d=await club(id),list=eligibleKits(d)
   expect(canRun(list),id).toBe(true)
   const a=dealKitRun(list,7,0),b=dealKitRun(list,7,0)
   expect(a.map(x=>x.puzzle.id)).toEqual(b.map(x=>x.puzzle.id))
   const wire=JSON.stringify(publicRun(a))
   expect(wire).not.toMatch(/correct|answer/i)
   for(const p of publicRun(a)){
    for(const s of p.steps){
     expect(new Set(s.options.map(o=>o.id)).size,`${id} ${p.id} ${s.step}`).toBe(s.options.length)
     expect(s.options.length).toBeGreaterThanOrEqual(2)
    }
    expect(p.steps.map(s=>s.step).every(s=>(STEP_ORDER as readonly string[]).includes(s))).toBe(true)
   }
  }
 },60000)
 it('takes the next kits from the cursor and never repeats a kit inside a lap',async()=>{
  const list=eligibleKits(await club('hapoel-tel-aviv')),n=list.length
  const first=dealKitRun(list,11,0,3),second=dealKitRun(list,11,nextCursor(0,3),3)
  const ids=[...first,...second].map(x=>x.eligible.kit.id)
  if(n>=6)expect(new Set(ids).size).toBe(6)
  expect(nextCursor(4,3)).toBe(7);expect(nextCursor(Number.NaN,3)).toBe(3)
 },60000)
 it('asks only what the archive can honestly ask',async()=>{
  const o=await club('olympiacos'),steps=activeSteps(eligibleKits(o))
  expect(steps.length).toBeGreaterThanOrEqual(2)
  expect(steps).toContain('colours')
  for(const id of ['hapoel-tel-aviv','olympiacos']){const d=await club(id);for(const dealt of dealKitRun(eligibleKits(d),3,0)){for(const s of dealt.puzzle.steps){if(s.step==='maker')expect(dealt.eligible.cloth.maker).toBeTruthy();if(s.step==='sponsor')expect(dealt.eligible.cloth.sponsor).toBeTruthy()}}}
 },60000)
 it('never draws a colour the club page may not show (rule 95)',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos','zrinjski-mostar']){
   const d=await club(id)
   for(const e of eligibleKits(d))for(const k of [e.cloth.base,e.cloth.trim])if(k)expect(forbiddenColor(d.theme,colourHex(k)),`${id} ${e.kit.id} ${k}`).toBe(false)
   for(const k of studioLimits(d).colours)expect(forbiddenColor(d.theme,colourHex(k))).toBe(false)
  }
 },60000)
 it('a club with too few drawable kits has no run, and its gate is not playable',async()=>{
  const z=await club('zrinjski-mostar')
  expect(canRun(eligibleKits(z))).toBe(false);expect(dealKitRun(eligibleKits(z),1,0)).toEqual([]);expect(gate4Playable(z)).toBe(false)
 },60000)
 it('mode comes from ?n=',()=>{expect(kitModeFrom('3')).toBe('quick');expect(kitModeFrom(['5'])).toBe('full');expect(kitModeFrom('4')).toBeNull();expect(kitModeFrom(undefined)).toBeNull()})
})

describe('gate 4 · the grade',()=>{
 it('weights always add up to 100 for any set of steps the archive asks',()=>{
  for(let m=1;m<16;m++){const steps=STEP_ORDER.filter((_,i)=>m&(1<<i)) as Step[];const w=weightsOf(steps);expect(Object.values(w).reduce((n,v)=>n+v,0),steps.join()).toBe(100);for(const s of steps)expect(w[s]).toBeGreaterThan(0)}
 })
 it('grades from the server-side sheet: all right is perfect, all wrong scores nothing, hints cost points',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0)
  const right=Object.fromEntries(Object.entries(deal[0]!.correct)),wrong=Object.fromEntries(deal[0]!.puzzle.steps.map(s=>[s.step,s.options.find(o=>o.id!==deal[0]!.correct[s.step])!.id]))
  const g=gradePuzzle(deal,0,right,0)!
  expect(g.perfect).toBe(true);expect(g.base).toBe(100);expect(g.score).toBe(100+PERFECT_BONUS)
  expect(gradePuzzle(deal,0,right,2)!.score).toBe(100-2*HINT_PENALTY+PERFECT_BONUS)
  const w=gradePuzzle(deal,0,wrong,0)!;expect(w.right).toBe(0);expect(w.score).toBe(0);expect(w.perfect).toBe(false)
  expect(gradePuzzle(deal,0,{},0)!.score).toBe(0)
  expect(gradePuzzle(deal,99,right,0)).toBeNull();expect(gradePuzzle(deal,0,right,99)!.hints).toBe(HINT_LIMIT)
  expect(roundScore([g,w])).toBe(g.score+w.score)
 },60000)
 it('a hint strikes a different wrong card each time and always leaves the right one and another standing',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0)
  for(const dealt of deal)for(const row of dealt.puzzle.steps){
   const struck:string[]=[]
   for(let n=0;n<HINT_LIMIT;n++){const id=strikeFor(deal,dealt.puzzle.index,row.step,n);if(!id)break;expect(id).not.toBe(dealt.correct[row.step]);expect(struck).not.toContain(id);struck.push(id)}
   expect(row.options.length-struck.length).toBeGreaterThanOrEqual(2)
  }
  expect(strikeFor(deal,0,'colours',-1)).toBeNull();expect(strikeFor(deal,0,'colours',HINT_LIMIT)).toBeNull()
 },60000)
})

describe('gate 4 · the server actions',()=>{
 it('grade and hint refuse stale versions, bad input and a closed gate — by name, never silently',async()=>{
  const d=await club('olympiacos')
  expect(await gradeKitShirt('olympiacos','old-version',7,0,0,{},0)).toEqual({ok:false,error:'stale'})
  expect(await gradeKitShirt('olympiacos',d.version,-1,0,0,{},0)).toEqual({ok:false,error:'invalid'})
  expect(await gradeKitShirt('olympiacos',d.version,7,0,99,{},0)).toEqual({ok:false,error:'invalid'})
  expect(await hintKitShirt('olympiacos',d.version,7,0,0,'nonsense',0)).toEqual({ok:false,error:'invalid'})
  request.gates=[1,2,6]
  expect(await gradeKitShirt('olympiacos',d.version,7,0,0,{},0)).toEqual({ok:false,error:'locked'})
 },60000)
 it('an empty check is a peek and mints no unlock; a complete build mints one that verifies for that kit only',async()=>{
  const d=await club('olympiacos'),dealt=dealKitRun(eligibleKits(d),7,0)
  const peek=await gradeKitShirt('olympiacos',d.version,7,0,0,{},0)
  expect(peek.ok&&peek.unlock).toBeNull()
  const picks=Object.fromEntries(dealt[0]!.puzzle.steps.map(s=>[s.step,s.options[0]!.id]))
  const full=await gradeKitShirt('olympiacos',d.version,7,0,0,picks,0)
  expect(full.ok).toBe(true)
  if(full.ok&&full.unlock){
   expect(full.unlock.kitId).toBe(dealt[0]!.eligible.kit.id)
   expect(verifyUnlock('olympiacos',full.unlock.kitId,full.unlock.token)).toBe(true)
   expect(verifyUnlock('olympiacos',dealt[1]!.eligible.kit.id,full.unlock.token)).toBe(false)
   expect(verifyUnlock('hapoel-tel-aviv',full.unlock.kitId,full.unlock.token)).toBe(false)
  }else throw new Error('a complete build must mint an unlock')
 },60000)
 it('the grade is the same whoever asks — the answer is recomputed from the seed, not taken from the client',async()=>{
  const d=await club('olympiacos'),dealt=dealKitRun(eligibleKits(d),7,0)
  const right=await gradeKitShirt('olympiacos',d.version,7,0,0,dealt[0]!.correct,0)
  expect(right.ok&&right.verdict.perfect).toBe(true)
  const forged=await gradeKitShirt('olympiacos',d.version,7,0,0,{colours:'zzzz'},0)
  expect(forged.ok&&forged.verdict.right).toBe(0)
 },60000)
})

describe('gate 5 · the collection',()=>{
 it('a shirt that gate 4 can deal travels as season and strip only — no facts until the server confirms a build',async()=>{
  const d=await club('hapoel-tel-aviv'),rows=collectionOf(d)
  expect(rows.length).toBe(kitViews(d).length)
  const locked=rows.filter(r=>!r.open)
  expect(locked.length).toBeGreaterThan(0)
  for(const r of locked){const wire=JSON.stringify(r);expect(Object.keys(r).sort()).toEqual(['id','open','season','variant']);expect(wire).not.toMatch(/maker|sponsor|design|colours|cloth/)}
  const open=rows.filter(r=>r.open)
  for(const r of open)expect(r.open!.cloth,`${r.id} is open without a build, so it can never have been a gate-4 puzzle`).toBeNull()
 },60000)
 it('a club whose gate 4 is closed shows every documented shirt openly — there is nothing to unlock with',async()=>{
  const z=await club('zrinjski-mostar'),rows=collectionOf(z)
  expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.open)).toBe(true)
 },60000)
 it('openBuiltKits opens exactly the shirts with a valid server token, and nothing else',async()=>{
  const d=await club('olympiacos'),list=eligibleKits(d)
  const [a,b]=[list[0]!.kit.id,list[1]!.kit.id]
  const r=await openBuiltKits('olympiacos',[{id:a,t:signUnlock('olympiacos',a)},{id:b,t:'x'.repeat(24)},{id:'nope',t:signUnlock('olympiacos','nope')}])
  expect(r.ok&&r.kits.map(k=>k.id)).toEqual([a])
  if(r.ok)expect(r.kits[0]!.cloth).not.toBeNull()
  expect(await openBuiltKits('olympiacos',Array.from({length:500},()=>({id:a,t:'x'})))).toEqual({ok:false,error:'invalid'})
  const other=await openBuiltKits('hapoel-tel-aviv',[{id:a,t:signUnlock('olympiacos',a)}])
  expect(other).toEqual({ok:false,error:'locked'}) // another tenant's host is refused before any token is read
 },60000)
})

describe('gate 5 · the studio',()=>{
 const L={colours:['red','white','navy','black'] as ('red'|'white'|'navy'|'black')[],makers:['Umbro','Kappa'],sponsors:['Acme']}
 it('history: edit, undo, redo, reset; a no-op edit adds no step; a new edit clears redo',()=>{
  let h=startHistory();expect(edit(h,{base:null})).toBe(h)
  h=edit(h,{base:'red'});h=edit(h,{trim:'white',pattern:'hoops'})
  expect(h.present.pattern).toBe('hoops');h=undo(h);expect(h.present.pattern).toBe('solid');expect(h.future.length).toBe(1)
  h=redo(h);expect(h.present.pattern).toBe('hoops');h=undo(h);h=edit(h,{base:'navy'});expect(h.future.length).toBe(0)
  const r=resetTo(h);expect(r.present).toEqual(BLANK);expect(undo(r).present.base).toBe('navy')
  expect(undo(startHistory())).toEqual(startHistory())
 })
 it('a spec read back from storage is re-validated against the club limits (a hand-edited save cannot bring a rival colour in)',()=>{
  const ok={...BLANK,base:'red',trim:'white',pattern:'hoops',maker:'Umbro',sponsor:'Acme',name:'  Dina ',number:10}
  expect(validateSpec(ok,L)).toMatchObject({base:'red',trim:'white',maker:'Umbro',name:'Dina',number:10})
  expect(validateSpec({...ok,base:'green'},L)).toBeNull()
  expect(validateSpec({...ok,trim:'purple'},L)).toBeNull()
  expect(validateSpec({...ok,maker:'Nike'},L)).toBeNull()
  expect(validateSpec({...ok,pattern:'polka'},L)).toBeNull()
  expect(validateSpec({...ok,number:100},L)?.number).toBeNull()
  expect(validateSpec({...ok,trim:'red'},L)?.trim).toBeNull()
  expect(validateSpec(null,L)).toBeNull();expect(validateSpec('red',L)).toBeNull()
 })
 it('the saved list is newest-first, replaces by id and is capped',()=>{
  const d=(id:string):SavedDesign=>({id,name:id,spec:BLANK,from:null,at:'',updated:''})
  let rows:SavedDesign[]=[];for(let i=0;i<30;i++)rows=upsertDesign(rows,d(`d${i}`))
  expect(rows.length).toBe(24);expect(rows[0]!.id).toBe('d29')
  rows=upsertDesign(rows,{...d('d10'),name:'renamed'});expect(rows[0]!.name).toBe('renamed');expect(rows.filter(r=>r.id==='d10').length).toBe(1)
 })
 it('briefs are prompts, not scores',()=>{
  const s={...BLANK,base:'red' as const,trim:'white' as const,pattern:'hoops' as const}
  expect(BRIEFS.find(b=>b.id==='two-tone')!.met(s)).toBe(true);expect(BRIEFS.find(b=>b.id==='squad')!.met(s)).toBe(false)
  expect(BRIEFS.find(b=>b.id==='classic')!.met({...BLANK,base:'red',collar:'polo'})).toBe(true)
 })
 it('design names map to drawable patterns, and a name we cannot draw faithfully is not drawn',()=>{
  expect(patternOf('Hoops')).toBe('hoops');expect(patternOf('Tonal hoops')).toBe('hoop-tonal');expect(patternOf('twin stripe')).toBe('twin-stripe');expect(patternOf('Plain')).toBe('solid')
  expect(patternOf('graphic')).toBeNull();expect(patternOf('')).toBeNull();expect(patternOf(null)).toBeNull()
  expect(COLOUR_KEYS.every(k=>/^#[0-9a-f]{6}$/i.test(colourHex(k)))).toBe(true)
 })
 it('every club offers a palette, and only documented makers and sponsors',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos','zrinjski-mostar']){
   const d=await club(id),l=studioLimits(d),kits=kitViews(d)
   expect(l.colours.length).toBeGreaterThanOrEqual(3)
   for(const m of l.makers)expect(kits.some(k=>k.maker?.trim()===m)).toBe(true)
   for(const s of l.sponsors)expect(kits.some(k=>k.sponsor?.trim()===s)).toBe(true)
  }
 },60000)
})

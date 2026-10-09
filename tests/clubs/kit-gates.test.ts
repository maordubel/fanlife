import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.dubelteam.com',gates:[1,2,4,5,6,12,13]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv','panathinaikos'].map(id=>({id,status:'live',gates:request.gates}))})}))
import {loadClub} from '@/lib/clubs/resolver'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import {COLOUR_KEYS,colourHex,patternOf,BLANK} from '@/lib/clubs/kit-model'
import {DNA_THRESHOLD,FIELDS,FIELD_WEIGHT,HINT_LIMIT,HINT_PENALTY,OPTION_RAMP,PERFECT_BONUS,RULES,STEP_FIELDS,STEP_ORDER,canRun,activeSteps,dealKitRun,documentedFields,documentsEverything,eligibleKits,gameFrom,gradePuzzle,kitModeFrom,nextCursor,publicRun,roundScore,runGames,strikeFor,unlocksDna,weightsOf,type Field} from '@/lib/clubs/kit-run'
import {decodeDesign,edit,encodeDesign,redo,resetTo,startHistory,undo,validateSpec,upsertDesign,TRAIT_SCHEMA,RENDERER,type SavedDesign} from '@/lib/clubs/kit-studio'
import {BRIEFS,briefMet,briefsOffered,identityScore,scorecard,METRIC_WEIGHT,type BriefCtx,type Reference} from '@/lib/clubs/kit-design'
import {collectionOf,gate4Playable,identityOf,studioLimits} from '@/lib/clubs/kit-collection'
import {signHint,signUnlock,verifyHint,verifyUnlock} from '@/lib/clubs/kit-unlock'
import {gradeKitShirt,hintKitShirt} from '@/components/clubs/gates/kit-builder/actions'
import {openBuiltKits} from '@/components/clubs/gates/kits/actions'

beforeEach(()=>{request.host='olympiacos.fanlife.dubelteam.com';request.gates=[1,2,4,5,6,12,13]})
const club=async(id:string)=>(await loadClub(id))!.data
const out=(f:number,o=3)=>({f,o,r:RULES})

describe('gate 4 · the deal',()=>{
 it('is the same for the same seed and cursor, and never hands the client an answer sheet',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos']){
   const d=await club(id),list=eligibleKits(d)
   expect(canRun(list),id).toBe(true)
   const a=dealKitRun(list,7,0),b=dealKitRun(list,7,0)
   expect(a.map(x=>x.puzzle.id)).toEqual(b.map(x=>x.puzzle.id))
   const wire=JSON.stringify(publicRun(a))
   expect(wire).not.toMatch(/correct|answer|scored/i)
   for(const p of publicRun(a)){
    for(const s of p.steps){
     expect(new Set(s.options.map(o=>o.id)).size,`${id} ${p.id} ${s.step}`).toBe(s.options.length)
     expect(s.options.length).toBeGreaterThanOrEqual(2)
     expect(s.options.length).toBeLessThanOrEqual(OPTION_RAMP[Math.min(p.index,OPTION_RAMP.length-1)]!)
    }
    expect(p.steps.map(s=>s.step).every(s=>(STEP_ORDER as readonly string[]).includes(s))).toBe(true)
   }
  }
 },60000)
 it('option ids are opaque: they carry neither the season nor the answer, and differ from puzzle to puzzle',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),9,0)
  const seen=new Map<string,string>()
  for(const dealt of deal)for(const row of dealt.puzzle.steps)for(const o of row.options){
   expect(o.id).toMatch(/^[0-9a-z]+$/);expect(o.id).not.toContain(dealt.puzzle.seasonLabel.replace(/\D/g,'').slice(0,4))
   expect(seen.get(o.id),`id ${o.id} reused across puzzles`).toBeUndefined();seen.set(o.id,dealt.puzzle.id)
  }
 },60000)
 it('takes the next kits from the cursor; Quick then Full consumes eight shirts with no repeat inside a lap',async()=>{
  const list=eligibleKits(await club('hapoel-tel-aviv')),n=list.length
  const quick=dealKitRun(list,11,0,3),full=dealKitRun(list,11,nextCursor(0,quick.length),5)
  expect(quick).toHaveLength(3)
  const ids=[...quick,...full].map(x=>x.eligible.kit.id)
  if(n>=8)expect(new Set(ids).size).toBe(8)
  expect(nextCursor(4,3)).toBe(7);expect(nextCursor(Number.NaN,3)).toBe(3)
 },60000)
 it('asks only what the archive can honestly ask, and scores only the fields a row documents',async()=>{
  const o=await club('olympiacos'),steps=activeSteps(eligibleKits(o))
  expect(steps.length).toBeGreaterThanOrEqual(2);expect(steps).toContain('body');expect(steps).not.toContain('crest')
  for(const id of ['hapoel-tel-aviv','olympiacos']){
   const d=await club(id)
   for(const dealt of dealKitRun(eligibleKits(d),3,0)){
    for(const s of dealt.puzzle.steps){if(s.step==='maker')expect(dealt.eligible.cloth.maker).toBeTruthy();if(s.step==='sponsor')expect(dealt.eligible.cloth.sponsor).toBeTruthy()}
    const noSponsor=!dealt.eligible.cloth.sponsor
    if(noSponsor){expect(dealt.scored).not.toContain('sponsor');expect(dealt.puzzle.steps.map(s=>s.step)).not.toContain('sponsor')}
    for(const f of ['collar','collarInk','sleeves','sleeveInk','crest'] as Field[])expect(dealt.scored).not.toContain(f)
   }
  }
 },60000)
 it('an unknown sponsor is neither asked nor scored as a verified blank',async()=>{
  const list=eligibleKits(await club('hapoel-tel-aviv')),without=list.find(e=>!e.cloth.sponsor)
  if(!without)return
  const deal=dealKitRun(list,1,0,list.length),idx=deal.findIndex(x=>x.eligible.kit.id===without.kit.id)
  expect(idx).toBeGreaterThanOrEqual(0)
  const v=gradePuzzle(deal,idx,deal[idx]!.correct,0)!
  expect(v.unknown).toContain('sponsor');expect(v.fields.map(f=>f.field)).not.toContain('sponsor');expect(v.fieldPoints).toBe(100)
 },60000)
 it('never draws a colour the club page may not show (rule 95)',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos','zrinjski-mostar','panathinaikos']){
   const d=await club(id)
   for(const e of eligibleKits(d))for(const k of [e.cloth.base,e.cloth.trim])if(k)expect(forbiddenColor(d.theme,colourHex(k)),`${id} ${e.kit.id} ${k}`).toBe(false)
   for(const k of studioLimits(d).colours)expect(forbiddenColor(d.theme,colourHex(k))).toBe(false)
  }
 },60000)
 it('a club with too few drawable kits has no run, and its gate is not playable',async()=>{
  const full=await club('celtic'),z={...full,kits:(full.kits as unknown[]).slice(0,2),gates:{...full.gates,'kit-builder':{...full.gates['kit-builder'],playable:false}}} as typeof full
  expect(canRun(eligibleKits(z))).toBe(false);expect(dealKitRun(eligibleKits(z),1,0)).toEqual([]);expect(gate4Playable(z)).toBe(false)
 },60000)
 it('names the games: the five-part assembly needs a kit that documents all ten fields — none does yet — so the reduced-parts practice is the run',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos']){
   const list=eligibleKits(await club(id))
   expect(list.some(documentsEverything)).toBe(false)
   expect(runGames(list)).toEqual(['practice'])
   expect(dealKitRun(list,3,0,5,'assembly')).toEqual([])
   for(const e of list)expect(documentedFields(e).length).toBeLessThan(FIELDS.length)
  }
  expect(gameFrom('recognition')).toBe('recognition');expect(gameFrom(['practice'])).toBe('practice');expect(gameFrom('x')).toBeNull();expect(gameFrom(undefined)).toBeNull()
 },60000)
 it('mode comes from ?n=',()=>{expect(kitModeFrom('3')).toBe('quick');expect(kitModeFrom(['5'])).toBe('full');expect(kitModeFrom('4')).toBeNull();expect(kitModeFrom(undefined)).toBeNull()})
})

describe('gate 4 · the grade',()=>{
 it('the native field weights total 100 and any set of fields is renormalised to exactly 100',()=>{
  expect(FIELDS.reduce((n,f)=>n+FIELD_WEIGHT[f],0)).toBe(100)
  expect(weightsOf(FIELDS)).toEqual(FIELD_WEIGHT)
  for(let m=1;m<1<<FIELDS.length;m+=7){const fs=FIELDS.filter((_,i)=>m&(1<<i));const w=weightsOf(fs);expect(fs.reduce((n,f)=>n+w[f],0),fs.join()).toBe(100);for(const f of fs)expect(w[f]).toBeGreaterThan(0)}
 })
 it('every field belongs to exactly one step',()=>{
  for(const f of FIELDS)expect(STEP_ORDER.filter(s=>STEP_FIELDS[s].includes(f)).length,f).toBe(1)
 })
 it('perfect without hints is 115; perfect with three hints is 91; each hint is 8',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0)
  const right=deal[0]!.correct,g=gradePuzzle(deal,0,right,0)!
  expect(g.perfect).toBe(true);expect(g.fieldPoints).toBe(100);expect(g.score).toBe(100+PERFECT_BONUS);expect(g.score).toBe(115)
  expect(gradePuzzle(deal,0,right,2)!.score).toBe(100-2*HINT_PENALTY+PERFECT_BONUS)
  expect(gradePuzzle(deal,0,right,3)!.score).toBe(91)
  expect(gradePuzzle(deal,0,right,99)!.hints).toBe(HINT_LIMIT)
  expect(gradePuzzle(deal,0,right,3)!.fieldPoints).toBe(100) // hints change the score, never the field accuracy
 },60000)
 it('wrong picks score nothing; field accuracy and score are two numbers',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0)
  const wrong=Object.fromEntries(deal[0]!.puzzle.steps.map(s=>[s.step,s.options.find(o=>o.id!==deal[0]!.correct[s.step])!.id]))
  const w=gradePuzzle(deal,0,wrong,0)!;expect(w.fieldPoints).toBeLessThan(DNA_THRESHOLD);expect(w.score).toBe(w.fieldPoints);expect(w.perfect).toBe(false);expect(w.dna).toBe(false)
  expect(gradePuzzle(deal,0,{},0)!.score).toBe(gradePuzzle(deal,0,{},0)!.fieldPoints);expect(gradePuzzle(deal,99,deal[0]!.correct,0)).toBeNull()
  expect(roundScore([w,gradePuzzle(deal,0,deal[0]!.correct,0)!])).toBe(w.score+115)
 },60000)
 it('DNA opens at 75 field points and not at 74, read before penalty and bonus',async()=>{
  expect(DNA_THRESHOLD).toBe(75);expect(unlocksDna(74)).toBe(false);expect(unlocksDna(75)).toBe(true)
  // the full ten-field sheet: dropping the base, collar, sleeves and collar ink leaves exactly 74
  expect(100-(FIELD_WEIGHT.base+FIELD_WEIGHT.collar+FIELD_WEIGHT.sleeves+FIELD_WEIGHT.collarInk)).toBe(74)
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0),steps=deal[0]!.puzzle.steps
  for(let m=0;m<1<<steps.length;m++){
   const picks=Object.fromEntries(steps.map((s,i)=>[s.step,m&(1<<i)?deal[0]!.correct[s.step]!:s.options.find(o=>o.id!==deal[0]!.correct[s.step])!.id]))
   const v=gradePuzzle(deal,0,picks,3)!
   expect(v.dna,`${m} → ${v.fieldPoints}`).toBe(v.fieldPoints>=DNA_THRESHOLD)
  }
 },60000)
 it('a hint strikes a different wrong card each time and always leaves the right one and another standing',async()=>{
  const d=await club('hapoel-tel-aviv'),deal=dealKitRun(eligibleKits(d),5,0)
  for(const dealt of deal)for(const row of dealt.puzzle.steps){
   const struck:string[]=[]
   for(let n=0;n<HINT_LIMIT;n++){const id=strikeFor(deal,dealt.puzzle.index,row.step,n);if(!id)break;expect(id).not.toBe(dealt.correct[row.step]);expect(struck).not.toContain(id);struck.push(id)}
   expect(row.options.length-struck.length).toBeGreaterThanOrEqual(2)
  }
  expect(strikeFor(deal,0,'body',-1)).toBeNull();expect(strikeFor(deal,0,'body',HINT_LIMIT)).toBeNull()
 },60000)
})

describe('gate 4 · the server actions and receipts',()=>{
 const slug='olympiacos'
 it('grade and hint refuse stale versions, bad input and a closed gate — by name, never silently',async()=>{
  const d=await club(slug)
  expect(await gradeKitShirt(slug,'old-version',7,0,'practice',0,{},[])).toEqual({ok:false,error:'stale'})
  expect(await gradeKitShirt(slug,d.version,-1,0,'practice',0,{},[])).toEqual({ok:false,error:'invalid'})
  expect(await gradeKitShirt(slug,d.version,7,0,'practice',99,{},[])).toEqual({ok:false,error:'invalid'})
  expect(await gradeKitShirt(slug,d.version,7,0,'nonsense',0,{},[])).toEqual({ok:false,error:'invalid'})
  expect(await hintKitShirt(slug,d.version,7,0,'practice',0,'nonsense',0)).toEqual({ok:false,error:'invalid'})
  request.gates=[1,2,6]
  expect(await gradeKitShirt(slug,d.version,7,0,'practice',0,{},[])).toEqual({ok:false,error:'locked'})
 },60000)
 it('an empty check is a peek and mints no unlock; a perfect build mints one that verifies for that kit, club, parts and rules only',async()=>{
  const d=await club(slug),dealt=dealKitRun(eligibleKits(d),7,0)
  const peek=await gradeKitShirt(slug,d.version,7,0,'practice',0,{},[])
  expect(peek.ok&&peek.unlock).toBeNull()
  const full=await gradeKitShirt(slug,d.version,7,0,'practice',0,dealt[0]!.correct,[])
  if(!(full.ok&&full.unlock))throw new Error('a build at 100 field points must mint an unlock')
  const u=full.unlock
  expect(u.kitId).toBe(dealt[0]!.eligible.kit.id);expect(u).toMatchObject({f:100,r:RULES})
  const o={f:u.f,o:u.o,r:u.r}
  expect(verifyUnlock(slug,u.kitId,o,u.token)).toBe(true)
  expect(verifyUnlock(slug,dealt[1]!.eligible.kit.id,o,u.token)).toBe(false)
  expect(verifyUnlock('hapoel-tel-aviv',u.kitId,o,u.token)).toBe(false)
  expect(verifyUnlock(slug,u.kitId,{...o,f:74},u.token)).toBe(false)
  expect(verifyUnlock(slug,u.kitId,{...o,o:o.o+1},u.token)).toBe(false)
  expect(verifyUnlock(slug,u.kitId,{...o,r:'kb1'},u.token)).toBe(false)
 },60000)
 it('the grade is the same whoever asks — the answer is recomputed from the seed, not taken from the client',async()=>{
  const d=await club(slug),dealt=dealKitRun(eligibleKits(d),7,0)
  const right=await gradeKitShirt(slug,d.version,7,0,'practice',0,dealt[0]!.correct,[])
  expect(right.ok&&right.verdict.perfect).toBe(true)
  const forged=await gradeKitShirt(slug,d.version,7,0,'practice',0,{body:'zzzz'},[])
  expect(forged.ok&&forged.verdict.fieldPoints).toBe(0)
 },60000)
 it('a hint is a signed receipt: a duplicate costs nothing more, a forged or foreign one costs nothing at all, the client count is ignored',async()=>{
  const d=await club(slug),dealt=dealKitRun(eligibleKits(d),7,0),right=dealt[0]!.correct
  const step=dealt[0]!.puzzle.steps[0]!.step
  const h=await hintKitShirt(slug,d.version,7,0,'practice',0,step,0)
  if(!(h.ok&&h.receipt))throw new Error('a hint must come with a receipt')
  const grade=async(rs:unknown[],idx=0)=>{const r=await gradeKitShirt(slug,d.version,7,0,'practice',idx,idx===0?right:dealt[idx]!.correct,rs as never);if(!r.ok)throw new Error(r.error);return r.verdict}
  expect((await grade([])).score).toBe(115)
  expect((await grade([h.receipt])).score).toBe(115-HINT_PENALTY)
  expect((await grade([h.receipt,h.receipt,{...h.receipt}])).score).toBe(115-HINT_PENALTY) // the same receipt spent three times is one hint
  expect((await grade([{...h.receipt,r:'x'.repeat(24)}])).score).toBe(115)               // forged
  expect((await grade([{...h.receipt,optionId:'zzzz'}])).score).toBe(115)                 // not the card that was struck
  expect((await grade([h.receipt],1)).hints).toBe(0)                                      // another shirt's grade
  expect(verifyHint('hapoel-tel-aviv',dealt[0]!.puzzle.id,h.receipt.step,h.receipt.nth,h.receipt.optionId,h.receipt.r)).toBe(false)
  expect(verifyHint(slug,dealt[0]!.puzzle.id,h.receipt.step,h.receipt.nth,h.receipt.optionId,signHint(slug,dealt[0]!.puzzle.id,h.receipt.step,h.receipt.nth,h.receipt.optionId))).toBe(true)
  expect((await grade(Array.from({length:50},()=>h.receipt))).hints).toBe(1)
 },60000)
})

describe('gate 5 · the collection',()=>{
 it('a shirt that gate 4 can deal travels as season and strip only — no facts until the server confirms a build',async()=>{
  const d=await club('hapoel-tel-aviv'),rows=collectionOf(d)
  expect(rows.length).toBe(kitViews(d).length)
  const locked=rows.filter(r=>!r.open)
  expect(locked.length).toBeGreaterThan(0)
  for(const r of locked){const wire=JSON.stringify(r);expect(Object.keys(r).sort()).toEqual(['id','open','season','variant']);expect(wire).not.toMatch(/maker|sponsor|design|colours|cloth/)}
  for(const r of rows.filter(r=>r.open))expect(r.open!.cloth,`${r.id} is open without a build, so it can never have been a gate-4 puzzle`).toBeNull()
 },60000)
 it('a club whose gate 4 is closed shows every documented shirt on the shelf — there is nothing to earn it with',async()=>{
  const full=await club('celtic'),z={...full,kits:(full.kits as unknown[]).slice(0,2)} as typeof full,rows=collectionOf(z)
  expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.open)).toBe(true)
 },60000)
 it('openBuiltKits opens exactly the shirts with a valid receipt for 75+ field points, once each',async()=>{
  const d=await club('olympiacos'),list=eligibleKits(d)
  const [a,b]=[list[0]!.kit.id,list[1]!.kit.id]
  const mint=(id:string,f:number,o=3)=>({id,t:signUnlock('olympiacos',id,out(f,o)),...out(f,o)})
  const r=await openBuiltKits('olympiacos',[mint(a,100),{id:b,t:'x'.repeat(24),...out(100)},{id:'nope',t:signUnlock('olympiacos','nope',out(100)),...out(100)}])
  expect(r.ok&&r.kits.map(k=>k.id)).toEqual([a])
  if(r.ok)expect(r.kits[0]!.cloth).not.toBeNull()
  const dup=await openBuiltKits('olympiacos',[mint(a,100),mint(a,100),mint(a,90)])
  expect(dup.ok&&dup.kits.map(k=>k.id)).toEqual([a]) // the same receipt posted again mints no second item
  const low=await openBuiltKits('olympiacos',[mint(b,74)]);expect(low.ok&&low.kits).toEqual([])
  const swapped=await openBuiltKits('olympiacos',[{...mint(a,100),f:90}]);expect(swapped.ok&&swapped.kits).toEqual([])
  expect(await openBuiltKits('olympiacos',Array.from({length:500},()=>mint(a,100)))).toEqual({ok:false,error:'invalid'})
  const other=await openBuiltKits('hapoel-tel-aviv',[mint(a,100)])
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
 it('a spec read back from storage or a link is re-validated against the club limits (a hand-edited save cannot bring a rival colour in)',()=>{
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
 it('a shared design survives the link, and is refused at a club whose palette cannot draw it',()=>{
  const spec=validateSpec({...BLANK,base:'red',trim:'white',pattern:'hoops',name:'Dina',number:10},L)!
  expect(decodeDesign(encodeDesign(spec),L)).toEqual(spec)
  expect(decodeDesign(encodeDesign(spec),{...L,colours:['navy','white']})).toBeNull()
  expect(decodeDesign('not base64 !!',L)).toBeNull();expect(decodeDesign(undefined,L)).toBeNull();expect(decodeDesign('A'.repeat(2000),L)).toBeNull()
 })
 it('the saved list is newest-first, replaces by id, is capped, and names its schema and renderer',()=>{
  const d=(id:string):SavedDesign=>({id,name:id,spec:BLANK,from:null,brief:null,schema:TRAIT_SCHEMA,renderer:RENDERER,author:'device',at:'',updated:''})
  let rows:SavedDesign[]=[];for(let i=0;i<30;i++)rows=upsertDesign(rows,d(`d${i}`))
  expect(rows.length).toBe(24);expect(rows[0]!.id).toBe('d29')
  rows=upsertDesign(rows,{...d('d10'),name:'renamed'});expect(rows[0]!.name).toBe('renamed');expect(rows.filter(r=>r.id==='d10').length).toBe(1)
  expect(rows[0]).toMatchObject({schema:1,renderer:'kc1',author:'device'})
 })
 it('design names map to drawable patterns, and a name we cannot draw faithfully is not drawn',()=>{
  expect(patternOf('Hoops')).toBe('hoops');expect(patternOf('Tonal hoops')).toBe('hoop-tonal');expect(patternOf('twin stripe')).toBe('twin-stripe');expect(patternOf('Plain')).toBe('solid')
  expect(patternOf('graphic')).toBeNull();expect(patternOf('')).toBeNull();expect(patternOf(null)).toBeNull()
  expect(COLOUR_KEYS.every(k=>/^#[0-9a-f]{6}$/i.test(colourHex(k)))).toBe(true)
 })
 it('every club offers a palette, and only documented makers and sponsors',async()=>{
  for(const id of ['hapoel-tel-aviv','olympiacos','zrinjski-mostar','panathinaikos']){
   const d=await club(id),l=studioLimits(d),kits=kitViews(d)
   expect(l.colours.length).toBeGreaterThanOrEqual(3)
   for(const m of l.makers)expect(kits.some(k=>k.maker?.trim()===m)).toBe(true)
   for(const s of l.sponsors)expect(kits.some(k=>k.sponsor?.trim()===s)).toBe(true)
  }
 },60000)
})

describe('gate 5 · identity, briefs and the design review',()=>{
 it('a green club reaches full identity compliance without red; its palette leads with its own colours',async()=>{
  const pana=await club('panathinaikos'),id=identityOf(pana),limits=studioLimits(pana)
  expect(id.primary).toBe('green');expect(limits.colours[0]).toBe('green');expect(limits.colours).not.toContain('red')
  const ctx:BriefCtx={identity:id,memory:null},spec={...BLANK,base:id.primary,trim:id.secondary,pattern:'hoops' as const,crest:true}
  expect(identityScore(spec,ctx)).toBe(100)
  expect([spec.base,spec.trim]).not.toContain('red')
  const card=scorecard(spec,null,[],ctx)
  expect(card.metrics.find(m=>m.id==='identity')!.value).toBe(100)
 },60000)
 it('no club is given a red default or a word-for-word club reward: the palette follows the club, not a constant',async()=>{
  const ids=await Promise.all(['olympiacos','panathinaikos','hapoel-tel-aviv'].map(async c=>identityOf(await club(c)).primary))
  expect(new Set(ids).size).toBeGreaterThan(1)
  const base={...BLANK,base:'red' as const,crest:true},ctx:BriefCtx={identity:{primary:'green',secondary:'white',derby:false,wordmark:'PANATHINAIKOS'.slice(0,12)},memory:null}
  expect(identityScore(base,ctx)).toBe(20) // red body in a green club scores only for the crest
 })
 it('briefs are parameterised by the club: derby only with an approved rivalry; the memory brief only when a shirt is open',async()=>{
  const pana=await club('panathinaikos'),zr=await club('zrinjski-mostar')
  const idP=identityOf(pana)
  const none=briefsOffered({identity:{...idP,derby:false},memory:null}).map(b=>b.id)
  expect(none).toContain('free');expect(none).not.toContain('derby');expect(none).not.toContain('memory')
  const ref:Reference={id:'k1',season:'1995/96',cloth:{...BLANK,base:'green',trim:'white',pattern:'hoops'}}
  const withMemory=briefsOffered({identity:{...idP,derby:true},memory:ref}).map(b=>b.id)
  expect(withMemory).toEqual(expect.arrayContaining(['free','derby','european','supporters','memory']))
  const memory=BRIEFS.find(b=>b.id==='memory')!,ctx:BriefCtx={identity:idP,memory:ref}
  expect(briefMet(memory,{...ref.cloth,crest:false},ctx)).toBe(false) // an exact copy changes nothing
  expect(briefMet(memory,{...ref.cloth,crest:true},ctx)).toBe(true)
  expect(identityOf(zr).primary).not.toBeNull()
  expect(identityOf(pana).derby).toBe(pana.theme.colorPolicy.status==='approved'&&pana.theme.colorPolicy.rivalIdentityColors.length>0)
 },60000)
 it('the design review shows N/A where nothing can be compared and renormalises — a club with no open shirts is not penalised',()=>{
  const ctx:BriefCtx={identity:{primary:'green',secondary:'white',derby:false,wordmark:null},memory:null}
  const spec={...BLANK,base:'green' as const,trim:'white' as const,pattern:'hoops' as const,crest:true}
  const free=BRIEFS.find(b=>b.id==='free')!
  const card=scorecard(spec,free,[],ctx),by=Object.fromEntries(card.metrics.map(m=>[m.id,m.value]))
  expect(by.originality).toBeNull();expect(by.dna).toBeNull();expect(by.identity).toBe(100);expect(by.brief).toBe(100)
  const w=METRIC_WEIGHT.identity+METRIC_WEIGHT.brief+METRIC_WEIGHT.coherence
  expect(card.overall).toBe(Math.round((100*METRIC_WEIGHT.identity+100*METRIC_WEIGHT.brief+(by.coherence as number)*METRIC_WEIGHT.coherence)/w))
  expect(METRIC_WEIGHT).toEqual({identity:27,brief:28,originality:18,coherence:22,dna:5})
  const withRef=scorecard(spec,free,[{id:'k',season:'2000/01',cloth:{...spec}}],ctx)
  expect(withRef.metrics.find(m=>m.id==='dna')!.value).toBe(100);expect(withRef.metrics.find(m=>m.id==='originality')!.value).toBe(0)
  expect(scorecard(BLANK,free,[],ctx).overall).toBeNull() // an empty shirt is not measured
 })
})

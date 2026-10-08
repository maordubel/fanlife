import {describe,it,expect} from 'vitest'
import {NUMBERS,POSITION_CODES,REASONS,DEBATE_REASONS,answerDebate,choicesFor,cleanName,clearPick,dealBallot,debatesDone,emptySlip,filled,fits,isComplete,nextOpen,pending,poolFor,questionOf,readDebates,reasonDebate,reasonsOf,receiptsFor,setPick,setReason,shareText,slipKey,standingOf,typeName,usableDebates,validateSlip,validateVotes,voteKey,xiIds,type Ballot} from '@/lib/clubs/polls-model'
import {pollKey} from '@/lib/clubs/activity'
import type {ClubPlayer} from '@/lib/clubs/contract'

const P=(id:string,name:string,positions:ClubPlayer['positions'],detail?:ClubPlayer['detail']):ClubPlayer=>({id,name,aliases:[],positions,fromYear:2000,toYear:2005,...(detail?{detail}:{})})
const rich=[P('a','Alpha Keeper',['GK']),P('a2','Aleph Keeper',['GK']),P('b','Beta Back',['DF'],{centreBack:true,foreignSlot:'domestic'}),P('b2','Bet Back',['DF'],{centreBack:true}),P('c','Cee Mid',['MF'],{foreignSlot:'foreign'}),P('c2','Cey Mid',['MF']),P('d','Dee Forward',['FW'],{foreignSlot:'foreign'}),P('e','Ee Utility',['MF','FW']),P('f','Eff Unknown',[])]
const coarse=[P('a','Alpha Keeper',['GK']),P('a2','Aleph Keeper',['GK']),P('b','Beta Back',['DF']),P('b2','Bet Back',['DF']),P('c','Cee Mid',['MF']),P('c2','Cey Mid',['MF']),P('d','Dee Forward',['FW']),P('d2','Dei Forward',['FW'])]
const ctx={club:'x',voter:'voter12345678'}
const full=dealBallot(rich)

describe('PO-R02/R03/R05 · the ballot is dealt from the roster',()=>{
 it('deals eight lines for a roster that can answer all of them, with the dealt length',()=>{
  expect(full.questions.map(q=>q.id)).toEqual(['favourite','keeper','centreback','midfield','striker','foreign','number','position'])
  expect(full.length).toBe(8);expect(full.off).toEqual([])
  expect(NUMBERS[0]).toBe(1);expect(NUMBERS.at(-1)).toBe(99);expect(POSITION_CODES).toHaveLength(8)
  for(const q of full.questions)expect(reasonsOf(q.id).length,q.id).toBeGreaterThanOrEqual(3)
 })
 it('swaps an unprovable centre-back line for an honestly named defender line and says so',()=>{
  const b=dealBallot(coarse)
  expect(b.questions.map(q=>q.id)).not.toContain('centreback');expect(b.questions.map(q=>q.id)).toContain('defender')
  expect(b.off.find(o=>o.id==='centreback')).toMatchObject({code:'POLL_CHOICES_SHORT',renamedTo:'defender'})
  expect(b.off.find(o=>o.id==='foreign')).toMatchObject({code:'POLL_CHOICES_SHORT',have:0})
  expect(b.length).toBe(b.questions.length);expect(b.length).toBe(7)
 })
 it('drops a line with fewer than two documented choices instead of padding it',()=>{
  const one=[P('a','A',['GK']),P('b','B',['DF']),P('c','C',['MF'])]
  const b=dealBallot(one);expect(b.questions.map(q=>q.id)).toEqual(['favourite','number','position'])
  expect(b.off.map(o=>o.id)).toEqual(expect.arrayContaining(['keeper','centreback','defender','midfield','striker','foreign']))
  expect(b.off.every(o=>o.code==='POLL_CHOICES_SHORT'&&o.need===2)).toBe(true)
  expect(dealBallot([]).questions.map(q=>q.id)).toEqual(['number','position'])
 })
 it('only offers people the record shows for the line; an unknown fact is a no',()=>{
  const q=(id:string)=>questionOf(full,id)!
  expect(choicesFor(rich,q('keeper')).map(p=>p.id)).toEqual(['a','a2'])
  expect(choicesFor(rich,q('centreback')).map(p=>p.id)).toEqual(['b','b2'])
  expect(choicesFor(rich,q('foreign')).map(p=>p.id)).toEqual(['c','d'])
  expect(choicesFor(rich,q('striker')).map(p=>p.id)).toEqual(['d','e'])
  expect(choicesFor(rich,q('favourite'))).toHaveLength(rich.length)
  expect(fits(P('z','Z',['DF']),{centreBack:true})).toBe(false);expect(fits(P('z','Z',[],{foreignSlot:'domestic'}),{foreign:true})).toBe(false)
  expect(choicesFor(rich,q('number'))).toEqual([])
 })
 it('changes a line version when its choices change (PO-R09)',()=>{
  const v=(ps:ClubPlayer[])=>questionOf(dealBallot(ps),'keeper')!.version
  expect(v(rich)).toBe(v([...rich].reverse()));expect(v([...rich,P('a3','Alef',['GK'])])).not.toBe(v(rich))
  expect(questionOf(full,'number')!.version).toBe('n1')
 })
})

describe('PO-R04 · a number and a position are the voter’s own',()=>{
 it('accepts 1–99 and the eight position codes only, and never ties them to a footballer',()=>{
  const ok=(raw:unknown)=>validateSlip({v:2,voter:'voter12345678',picks:raw,pv:Object.fromEntries(Object.keys(raw as object).map(k=>[k,questionOf(full,k)?.version??'']))},rich,full).picks
  expect(ok({number:'99'})).toEqual({number:'99'});expect(ok({number:'1'})).toEqual({number:'1'})
  expect(ok({number:'100'})).toEqual({});expect(ok({number:'0'})).toEqual({});expect(ok({number:'09'})).toEqual({})
  expect(ok({position:'ST'})).toEqual({position:'ST'});expect(ok({position:'LB'})).toEqual({})
  expect(questionOf(full,'number')!.need).toBeNull();expect(questionOf(full,'position')!.need).toBeNull()
 })
})

describe('PO-R06 · one active vote per voter and line; choosing again replaces',()=>{
 it('A then B replaces A, keeps one pick, drops the old reason, and mints a new key',()=>{
  const q=questionOf(full,'keeper')!
  let s=setPick(emptySlip(),q,'a',ctx);const keyA=s.keys.keeper!;s=setReason(s,'keeper','calm')
  expect(s.reasons.keeper).toBe('calm')
  expect(setPick(s,q,'a',ctx)).toEqual(s)
  s=setPick(s,q,'a2',ctx)
  expect(s.picks.keeper).toBe('a2');expect(Object.values(s.picks)).toHaveLength(1);expect(s.reasons.keeper).toBeUndefined();expect(s.keys.keeper).not.toBe(keyA)
  expect(clearPick(s,'keeper').picks).toEqual({})
 })
 it('mints the voter once and gives the same choice the same key every time (PO-R08)',()=>{
  const q=questionOf(full,'keeper')!,a=setPick(emptySlip(),q,'a',ctx),b=setPick(emptySlip(),q,'a',{club:'x',voter:'voter12345678'})
  expect(a.keys.keeper).toBe(b.keys.keeper);expect(a.voter).toBe('voter12345678')
  expect(voteKey('x','keeper','v','a','v1')).not.toBe(voteKey('y','keeper','v','a','v1'))
  expect(voteKey('x','keeper','v','a','v1')).not.toBe(voteKey('x','keeper','v','a','v2'))
 })
 it('reasons need a pick, one per answer, a second tap clears, an unknown id is ignored',()=>{
  const q=questionOf(full,'keeper')!
  expect(setReason(emptySlip(),'keeper','calm').reasons).toEqual({})
  const s=setPick(emptySlip(),q,'a',ctx)
  expect(setReason(s,'keeper','not-a-reason').reasons).toEqual({})
  expect(setReason(setReason(s,'keeper','calm'),'keeper','calm').reasons).toEqual({})
  expect(setReason(setReason(s,'keeper','calm'),'keeper','oneGame').reasons).toEqual({keeper:'oneGame'})
 })
 it('counts the dealt length, completes on it, and aims at the next open line',()=>{
  const b:Ballot=dealBallot(coarse);let s=emptySlip();expect(nextOpen(s,b)).toBe('favourite')
  for(const q of b.questions)s=setPick(s,q,q.kind==='player'?choicesFor(coarse,q)[0]!.id:q.kind==='number'?'9':'ST',ctx)
  expect(filled(s,b)).toBe(7);expect(isComplete(s,b)).toBe(true);expect(nextOpen(s,b)).toBeNull()
  s=clearPick(s,'striker');expect(nextOpen(s,b,'midfield')).toBe('striker');expect(isComplete(s,b)).toBe(false)
  expect(isComplete(emptySlip(),dealBallot([]))).toBe(false)
 })
})

describe('PO-R08 · a slip on the device is not a count',()=>{
 it('stands as "device" until a store accepted exactly this key',()=>{
  const q=questionOf(full,'keeper')!;let s=setPick(emptySlip(),q,'a',ctx)
  expect(standingOf(s,'keeper')).toBe('device');expect(pending(s,full).map(x=>x.id)).toEqual(['keeper'])
  s={...s,sent:{keeper:s.keys.keeper!}};expect(standingOf(s,'keeper')).toBe('counted');expect(pending(s,full)).toEqual([])
  s=setPick(s,q,'a2',ctx);expect(standingOf(s,'keeper')).toBe('device')
  expect(standingOf(emptySlip(),'keeper')).toBeNull()
 })
})

describe('PO-R09 · a changed prompt makes a receipt, never moves a vote',()=>{
 it('keeps the live pick when the version is unchanged and survives a round trip',()=>{
  const q=questionOf(full,'keeper')!,s=setPick(emptySlip(),q,'a',ctx),back=validateSlip(JSON.parse(JSON.stringify(s)),rich,full)
  expect(back.picks).toEqual({keeper:'a'});expect(back.keys.keeper).toBe(s.keys.keeper)
 })
 it('turns a pick made under an older version into a receipt and shows it beside the line',()=>{
  const q=questionOf(full,'keeper')!,s=setPick(emptySlip(),q,'a',ctx)
  const grown=[...rich,P('a3','Alef Keeper',['GK'])],next=validateSlip(JSON.parse(JSON.stringify(s)),grown,dealBallot(grown))
  expect(next.picks.keeper).toBeUndefined();expect(next.receipts).toEqual([{qid:'keeper',choice:'a',pv:q.version,retired:false}])
  expect(receiptsFor(next,'keeper')).toHaveLength(1)
 })
 it('retires a receipt whose player can no longer answer, and one whose line is gone',()=>{
  const b2=dealBallot(coarse),s=setPick(emptySlip(),questionOf(full,'centreback')!,'b',ctx)
  const next=validateSlip(JSON.parse(JSON.stringify(s)),coarse,b2)
  expect(next.picks).toEqual({});expect(next.receipts[0]).toMatchObject({qid:'centreback',choice:'b',retired:true})
  const gone=validateSlip(JSON.parse(JSON.stringify(setPick(emptySlip(),questionOf(full,'foreign')!,'c',ctx))),coarse,b2)
  expect(gone.receipts[0]).toMatchObject({qid:'foreign',retired:true})
 })
 it('drops a pick for a player who left the roster and one with no recorded version',()=>{
  const q=questionOf(full,'keeper')!,s=setPick(emptySlip(),q,'a',ctx)
  const noV={...JSON.parse(JSON.stringify(s)),pv:{}};expect(validateSlip(noV,rich,full).picks).toEqual({})
  const left=rich.filter(p=>p.id!=='a');expect(validateSlip(JSON.parse(JSON.stringify(s)),left,dealBallot(left)).picks.keeper).toBeUndefined()
 })
})

describe('a device save is untrusted',()=>{
 it('falls back to an empty slip on junk and on the old v1 shape',()=>{
  for(const junk of [null,undefined,'x',5,[],{picks:[]},{v:1,picks:{favourite:'a'}},{v:2,picks:'x',reasons:3}])expect(validateSlip(junk,rich,full)).toEqual(emptySlip())
 })
 it('keeps reasons only for live picks and only if the reason belongs to the line; strips the name',()=>{
  const q=questionOf(full,'keeper')!,s=setPick(emptySlip(),q,'a',ctx)
  const raw={...JSON.parse(JSON.stringify(s)),reasons:{keeper:'calm',midfield:'heart',striker:'bogus'},name:'  Dana\n<b>  K  ',voter:'<script>'}
  const out=validateSlip(raw,rich,full);expect(out.reasons).toEqual({keeper:'calm'});expect(out.name).toBe('Danab K');expect(out.voter).toBe('')
 })
 it('caps and cleans the name; typing keeps a trailing space',()=>{
  expect(cleanName('x'.repeat(60))).toHaveLength(24);expect(cleanName(5)).toBe('')
  expect(typeName('Dana ')).toBe('Dana ');expect(typeName('a<b>\u0007c')).toBe('abc')
 })
 it('keeps its storage per club and never the shared debates key',()=>{
  expect(slipKey('olympiacos')).not.toBe(slipKey('hapoel-tel-aviv'));expect(slipKey('olympiacos')).not.toBe(pollKey('olympiacos'))
 })
})

describe('the picker pool',()=>{
 const none=new Set<string>(),elig=choicesFor(rich,questionOf(full,'midfield')!)
 it('lists only the eligible people and narrows by search or by my XI',()=>{
  expect(poolFor(elig,{q:'',mine:false},none).map(p=>p.id)).toEqual(['c','c2','e'])
  expect(poolFor(elig,{q:'cee',mine:false},none).map(p=>p.id)).toEqual(['c'])
  expect(poolFor(elig,{q:'',mine:true},new Set(['c2','d'])).map(p=>p.id)).toEqual(['c2'])
  expect(poolFor(elig,{q:'beta',mine:false},none)).toEqual([])
 })
 it('reads my XI from the XI save, ignoring junk',()=>{
  const ids=xiIds({formation:'4-4-2',picks:{GK:'a',D2:'b',D3:'ghost'},captain:null,twelfth:'c'},rich)
  expect(ids).toEqual(expect.arrayContaining(['a','b','c']));expect(ids).not.toContain('ghost')
  expect(xiIds('junk',rich)).toEqual([]);expect(xiIds(null,rich)).toEqual([])
 })
})

describe('PO-R02/R09/R10 · debates',()=>{
 const debates=[{id:'d1',choices:[{id:'x'},{id:'y'}]},{id:'d2',choices:[{id:'z'}]},{id:'d3',choices:[{id:'p'},{id:'p'}]}]
 it('keeps only debates with two distinct choices',()=>{
  expect(usableDebates(debates).map(d=>d.id)).toEqual(['d1'])
 })
 it('keeps votes only for a live debate and a live choice, and is done only when all are answered',()=>{
  expect(validateVotes({d1:'x',d2:'nope',d9:'z'},debates)).toEqual({d1:'x'});expect(validateVotes(null,debates)).toEqual({})
  const us=usableDebates(debates);expect(debatesDone({d1:'x'},us)).toBe(true);expect(debatesDone({},us)).toBe(false);expect(debatesDone({},[])).toBe(false)
 })
 it('replaces an answer, keeps a fixed-id reason about it, and drops it when the side changes',()=>{
  const us=usableDebates(debates),d=us[0]!
  let st=answerDebate(readDebates(null,null,us),d,'x');st=reasonDebate(st,'d1','heart')
  expect(st.why.d1).toBe('heart');expect(DEBATE_REASONS).toEqual(['heart','proof','era'])
  expect(reasonDebate(st,'d1','heart').why.d1).toBeUndefined()
  expect(answerDebate(st,d,'x').why.d1).toBe('heart');st=answerDebate(st,d,'y')
  expect(st.votes.d1).toBe('y');expect(st.why.d1).toBeUndefined();expect(answerDebate(st,d,'nope')).toBe(st)
  expect(reasonDebate(readDebates(null,null,us),'d1','heart').why).toEqual({})
 })
 it('turns an answer made under older options into a receipt, never onto another choice',()=>{
  const us=usableDebates(debates),st=readDebates({d1:'x'},{made:{d1:{pv:'oldversion',choice:'x'}}},us)
  expect(st.votes).toEqual({});expect(st.receipts.d1).toMatchObject({choice:'x',pv:'oldversion',retired:false})
  const gone=readDebates({d1:'q'},null,us);expect(gone.receipts.d1).toMatchObject({choice:'q',retired:true})
  const adopted=readDebates({d1:'x'},null,us);expect(adopted.votes.d1).toBe('x')
  expect(REASONS.foreign).toHaveLength(3)
 })
})

describe('PO-R01 · the share text is a slip, never a score',()=>{
 it('prints the club, the lines and the link — and no count, rank or percentage',()=>{
  const t=shareText({club:'Olympiacos',title:'Terrace vote',name:'Dana',rows:[{label:'Your goalkeeper',value:'Alpha Keeper'},{label:'The number on your back',value:'#9'}],url:'https://x/y'})
  expect(t.split('\n')[0]).toBe('FAN LIFE · Olympiacos · Terrace vote · Dana')
  expect(t).toContain('Your goalkeeper: Alpha Keeper');expect(t.endsWith('https://x/y')).toBe(true)
  expect(t).not.toMatch(/%|rank|votes|most/i)
  expect(shareText({club:'C',title:'T',name:'',rows:[],url:'u'}).split('\n')[0]).toBe('FAN LIFE · C · T')
 })
})

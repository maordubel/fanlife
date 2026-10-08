import {describe,it,expect} from 'vitest'
import type {MasterQuestion} from '@/lib/game/questions/types'
import {bandOf,bankReport,claimOf,distinctFacts,dropCodeOf,factsOf,isDateCheck,normKey,resolveHint,sanitizeBank,stageCapacity} from '@/lib/clubs/trivia-bank'

let n=0
const q=(o:Partial<MasterQuestion>={}):MasterQuestion=>{n++;return {id:`q_${n}`,key:`t:${n}`,template:'t',type:'mcq',topic:'players',tags:[],sport:'football',decades:[2000],difficulty:3,prompt:`Prompt ${n}`,answer:'Alpha',pool:'p',distractors:['Beta','Gamma','Delta'],explanation:'because',hint:{kind:'strike'},factIds:[`f${n}`],source:{title:'S',url:'https://x.test',confidence:2},...o}}
const dateCheck=(stem:string,claimDate:string,truthDate:string,answer:'true'|'false'):MasterQuestion=>q({type:'tf',template:'match-date-check',answer,distractors:undefined,pool:undefined,prompt:`${stem} — ${claimDate}`,explanation:`${stem} — ${truthDate}`,hint:{kind:'context'}})

describe('Gate 2 · a fact is one fact (TR-R03, R04)',()=>{
 it('normalises case, accents, punctuation and spacing',()=>{expect(normKey('  Ola-Kalu, Jr. ')).toBe(normKey('ola kalu jr'));expect(normKey('Café')).toBe(normKey('cafe'))})
 it('a question with no fact ids stands on its key minus the template, so two templates on one event count once',()=>{
  expect(factsOf({factIds:[],key:'a:2020|x'})).toEqual(factsOf({factIds:[],key:'b:2020|x'}))
  expect(factsOf({factIds:['f1','f2'],key:'a:1'})).toEqual(['f1','f2'])
 })
 it('distinct facts are counted once however many questions stand on them',()=>{expect(distinctFacts([q({factIds:['x']}),q({factIds:['x']}),q({factIds:['y']})])).toBe(2)})
})

describe('Gate 2 · false statements are never the truth (TR-R03)',()=>{
 it('reads "<stem> — <date>" and ignores anything else',()=>{expect(claimOf('A v B — 1977-12-03')).toEqual({stem:normKey('A v B'),date:'1977-12-03'});expect(claimOf('no date here')).toBeNull();expect(isDateCheck(dateCheck('A','2000-01-01','2000-01-01','true'))).toBe(true)})
 it('a "true" statement must carry the date the explanation states',()=>{
  expect(dropCodeOf(dateCheck('A v B','1977-12-03','1977-12-03','true'),{},new Set())).toBeNull()
  expect(dropCodeOf(dateCheck('A v B','1977-12-04','1977-12-03','true'),{},new Set())).toBe('TF_TRUE_MISMATCH')
 })
 it('a "false" statement equal to the truth is dropped',()=>{expect(dropCodeOf(dateCheck('A v B','1977-12-03','1977-12-03','false'),{},new Set())).toBe('TF_FALSE_EQUALS_TRUTH')})
 it('a "false" statement that is true elsewhere in the bank is dropped',()=>{
  const bank=[dateCheck('A v B','1977-12-03','1977-12-03','true'),dateCheck('A v B','1977-12-03','1978-01-01','false')]
  const {questions,dropped}=sanitizeBank(bank,{})
  expect(questions).toHaveLength(1);expect(dropped).toEqual([{id:bank[1]!.id,code:'TF_CONTEXT_COLLISION'}])
 })
 it('a statement whose stem differs from its explanation cannot be checked and is dropped',()=>{
  const x=dateCheck('A v B','1977-12-03','1977-12-03','true');x.explanation='C v D — 1977-12-03'
  expect(dropCodeOf(x,{},new Set())).toBe('TF_CLAIM_UNREADABLE')
 })
})

describe('Gate 2 · options are real and answers are not repeated (TR-R04, rule 15)',()=>{
 it('drops unsourced and unchecked questions by name',()=>{
  expect(dropCodeOf(q({source:{title:'',url:null,confidence:2}}),{p:[]},new Set())).toBe('NO_SOURCE')
  expect(dropCodeOf(q({source:{title:'S',url:null,confidence:1}}),{p:[]},new Set())).toBe('SOURCE_UNCHECKED')
 })
 it('an alias of the answer in the options is dropped; aliases are not separate choices',()=>{expect(dropCodeOf(q({distractors:['alpha!','Beta','Gamma','Delta']}),{},new Set())).toBe('ALIAS_OF_ANSWER')})
 it('fewer than three real distractors is dropped and never padded',()=>{expect(dropCodeOf(q({distractors:['Beta','Gamma']}),{},new Set())).toBe('OPTIONS_SHORT');expect(dropCodeOf(q({distractors:['Beta','beta','Gamma']}),{},new Set())).toBe('OPTIONS_SHORT')})
 it('pool values count as distractors',()=>expect(dropCodeOf(q({distractors:undefined,pool:'p'}),{p:['B','C','D','E']},new Set())).toBeNull())
 it('a multi needs exactly three distinct answers and no answer among its distractors',()=>{
  expect(dropCodeOf(q({type:'multi',answer:['A','B'],distractors:['C','D','E']}),{},new Set())).toBe('MULTI_SHAPE')
  expect(dropCodeOf(q({type:'multi',answer:['A','B','C'],distractors:['b','D','E']}),{},new Set())).toBe('ALIAS_OF_ANSWER')
  expect(dropCodeOf(q({type:'multi',answer:['A','B','C'],distractors:['D','E','F']}),{},new Set())).toBeNull()
 })
 it('order and match need distinct items; a match needs a left column the same length',()=>{
  expect(dropCodeOf(q({type:'order',answer:['A','A'],distractors:undefined,pool:undefined}),{},new Set())).toBe('ORDER_SHAPE')
  expect(dropCodeOf(q({type:'match',answer:['x','y','z'],left:['a','b'],distractors:undefined,pool:undefined}),{},new Set())).toBe('MATCH_SHAPE')
  expect(dropCodeOf(q({type:'match',answer:['x','y','z'],left:['a','b','c'],distractors:undefined,pool:undefined}),{},new Set())).toBeNull()
 })
 it('a prompt with two different correct answers is dropped whole; the same answer twice is kept',()=>{
  const a=q({prompt:'Who?',answer:'Alpha'}),b=q({prompt:'who',answer:'Beta',distractors:['Alpha','Gamma','Delta']}),c=q({prompt:'Else',answer:'Alpha'}),d=q({prompt:'Else',answer:'Alpha'})
  const {questions,dropped}=sanitizeBank([a,b,c,d],{})
  expect(dropped.map(x=>x.id).sort()).toEqual([a.id,b.id].sort());expect(dropped.every(x=>x.code==='PROMPT_CONFLICT')).toBe(true)
  expect(questions.map(x=>x.id)).toEqual([c.id,d.id])
 })
 it('order and match prompts are generic by design and never conflict',()=>{
  const mk=(items:string[])=>q({type:'order',prompt:'Put in order',answer:items,distractors:undefined,pool:undefined})
  expect(sanitizeBank([mk(['a','b','c']),mk(['d','e','f'])],{}).dropped).toEqual([])
 })
 it('does not mutate its input',()=>{const bank=[q(),q({distractors:['x']})],copy=JSON.stringify(bank);sanitizeBank(bank,{p:[]});expect(JSON.stringify(bank)).toBe(copy)})
})

describe('Gate 2 · stage composition (TR-R05)',()=>{
 const at=(difficulty:number,count:number,tag:string)=>Array.from({length:count},(_,i)=>q({difficulty:difficulty as 1,factIds:[`${tag}${i}`]}))
 it('bands follow the engine: standard ≤2 / 3 / ≥4, hard ≤3 / 4 / 5',()=>{
  expect([1,2,3,4,5].map(d=>bandOf(d,false))).toEqual([0,0,1,2,2]);expect([1,2,3,4,5].map(d=>bandOf(d,true))).toEqual([0,0,0,1,2])
 })
 it('opens when each band holds four distinct facts and reports the exact counts when it does not',()=>{
  const good=[...at(1,4,'a'),...at(3,4,'b'),...at(5,4,'c')]
  expect(stageCapacity(good,false,4)).toMatchObject({ok:true,counts:[4,4,4],union:12})
  const short=[...at(1,9,'a'),...at(3,2,'b')]
  expect(stageCapacity(short,false,4)).toMatchObject({ok:false,counts:[9,2,0]})
 })
 it('one fact usable in two bands is only one fact (Hall\'s condition)',()=>{
  const shared=[...at(1,4,'s'),...Array.from({length:4},(_,i)=>q({difficulty:3,factIds:[`s${i}`]})),...at(5,4,'c')]
  expect(stageCapacity(shared,false,4).ok).toBe(false)
 })
 it('a date-only bank is flagged in its report',()=>{const r=bankReport([dateCheck('A','2000-01-01','2000-01-01','true')]);expect(r.dateOnly).toBe(true);expect(bankReport([q()]).dateOnly).toBe(false)})
})

describe('Gate 2 · hints (TR-R09)',()=>{
 const opts=['Alpha','Beta','Gamma','Delta']
 it('a true/false never has a hint: striking "false" is the answer',()=>expect(resolveHint(dateCheck('A','2000-01-01','2000-01-01','true'),['true','false'],1)).toBeNull())
 it('a strike removes one wrong option, never the answer, and is stable for a seed',()=>{
  const x=q({hint:{kind:'strike'}}),h=resolveHint(x,opts,5)
  expect(h?.kind).toBe('strike');if(h?.kind==='strike'){expect(h.strike).toHaveLength(1);expect(h.strike[0]).not.toBe('Alpha');expect(opts).toContain(h.strike[0])}
  expect(resolveHint(x,opts,5)).toEqual(h)
 })
 it('a strike needs enough wrong options left to stay a choice',()=>expect(resolveHint(q({hint:{kind:'strike'}}),['Alpha','Beta','Gamma'],1)).toBeNull())
 it('a context hint that contains the answer is refused',()=>{
  expect(resolveHint(q({hint:{kind:'context',he:'Alpha scored it'}}),opts,1)?.kind).toBe('strike')
  expect(resolveHint(q({hint:{kind:'context',he:'A late winner'}}),opts,1)).toEqual({kind:'context',text:'A late winner'})
 })
 it('a decade hint that singles out the right year option becomes a strike instead',()=>{
  const x=q({type:'year',answer:'1984',hint:{kind:'decade'},decades:[1980]})
  expect(resolveHint(x,['1984','1991','2003','2010'],1)?.kind).toBe('strike')
  expect(resolveHint(q({hint:{kind:'decade'},decades:[1980]}),opts,1)).toEqual({kind:'decade',decade:1980})
 })
 it('order and match never strike',()=>expect(resolveHint(q({type:'order',answer:['a','b','c'],hint:{kind:'strike'},distractors:undefined}),['a','b','c'],1)).toBeNull())
})

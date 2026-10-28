import {describe,it,expect,beforeAll} from 'vitest'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {clubBank,dealMode,type Bank} from '@/lib/clubs/trivia-deck'
import {factsOf} from '@/lib/clubs/trivia-bank'
import {curateQuestions} from '@/lib/trivia/curation'
import {EDITORIAL_TAG,questionFamily,standardQuestion} from '@/lib/trivia/editorial'
import {questionSeconds} from '@/lib/trivia/clock'
import edits from '@/content/manual/trivia-editorial-2026-10-21.json'
import heritage from '@/content/manual/trivia-heritage-facts-2026-10-21.json'
const banks=new Map<string,Bank>()
beforeAll(async()=>{for(const id of CORE_CLUB_IDS)banks.set(id,clubBank((await loadClub(id))!.data))},120000)

describe('Original, source-backed club trivia',()=>{
 it('all 240 editorial selections still match the current answer, fact identity and source',()=>{
  expect(Object.values(edits.clubs).flat()).toHaveLength(240)
  for(const [club,entries] of Object.entries(edits.clubs)){
   expect(entries).toHaveLength(30)
   for(const e of entries){const q=banks.get(club)!.byId.get(e.questionId)!
    expect(q,e.questionId).toBeDefined();expect(q.facets).toContain(EDITORIAL_TAG)
    expect(q.answer).toEqual(e.answer);expect(q.factIds).toEqual(e.factIds);expect(q.source.url).toBe(e.sourceUrl);expect(q.prompt).toBe(e.prompt)
   }
  }
 })
 it('an answer, source or confidence correction withdraws the wording overlay',()=>{
  const e=edits.clubs['hapoel-tel-aviv'][0]!,q=banks.get('hapoel-tel-aviv')!.byId.get(e.questionId)!
  for(const change of [{},{answer:'corrected answer'},{source:{...q.source,url:'https://example.org/corrected'}},{source:{...q.source,confidence:1}},{factIds:['replacement-fact']}]){
   const changed={...q,...change,prompt:'Updated source wording',facets:[]}
   expect(curateQuestions('hapoel-tel-aviv',[changed])[0]!.prompt).toBe('Updated source wording')
  }
 })
 it('the new heritage questions survive sanitisation; variants share their underlying story',()=>{
  expect(heritage.facts).toHaveLength(22)
  for(const f of heritage.facts){
   const qs=banks.get(f.club)!.questions.filter(q=>q.key===`fl-heritage-${f.kind}:${f.club}:heritage:${f.id}`)
   expect(qs,f.id).toHaveLength(1);expect(qs[0]!.factIds).toEqual([`heritage:${f.club}:${f.group}`])
   expect(qs[0]!.answer).toBe(f.answer);expect(qs[0]!.source.url).toBe(f.source.url)
  }
 })
 it('pairs have three distinct clues and answers, and preserve each component fact',()=>{
  for(const b of banks.values())for(const q of b.questions.filter(q=>['fl-player-pairs','fl-kit-pairs'].includes(q.template))){
   expect(new Set(q.left).size).toBe(3);expect(new Set(q.answer).size).toBe(3);expect(q.factIds).toHaveLength(3)
   expect(q.source.url).toBeTruthy()
  }
 })
 it('the reviewed Milan goal uses the contemporary UEFA report and its minute, without asserting replay geometry',()=>{
  const q=banks.get('hapoel-tel-aviv')!.questions.find(q=>q.template==='fl-goal-finisher'&&q.factIds.includes('hapoel-tel-aviv:goal-milan-2002-kleschenko-31'))!
  expect(q.answer).toBe('Sergei Kleschenko')
  expect(q.explanation).toContain('minute 32')
  expect(q.source.url).toContain('clescenko-stuns-milan')
  expect(q.prompt+q.explanation).not.toContain('31st')
 })
 it('scoreboard false statements compare one documented score; they never infer absence of a fixture',()=>{
  for(const b of banks.values())for(const q of b.questions.filter(q=>q.template==='fl-match-tf')){
   expect(q.prompt).toMatch(/Scoreboard check:.*\d{4}.*It finished/)
   expect(q.explanation).toMatch(/\d+-\d+/)
   expect(q.prompt).not.toMatch(/did not|never played|season was/)
  }
 })
 // Raja, Wydad and Al Ahly (opened 28.10.2026) have no kits, goals or moments yet: their banks cannot field four topics in every
// band, so Standard stays shut BY NAME and the honest History round opens instead. A research wave that opens Standard fails here (rule 65).
const STANDARD_NOT_YET=new Set(['raja-casablanca','wydad-casablanca','al-ahly'])
for(const club of CORE_CLUB_IDS)if(STANDARD_NOT_YET.has(club))it(`${club}: Standard is shut by name and History deals a full, fact-unique round`,()=>{
  const bank=banks.get(club)!
  for(let seed=1;seed<=12;seed++){
   const s=dealMode(bank,{mode:'standard'},seed,0);expect('blocked' in s&&s.blocked.code).toBe('TRIVIA_DECK_UNVERIFIED')
   const d=dealMode(bank,{mode:'history'},seed,0);if('blocked' in d)throw new Error(JSON.stringify(d))
   expect(d.ids).toHaveLength(12);const facts=d.ids.map(id=>bank.byId.get(id)!).flatMap(factsOf);expect(new Set(facts).size).toBe(facts.length)
  }
 })
for(const club of CORE_CLUB_IDS.filter(c=>!STANDARD_NOT_YET.has(c)))it(`${club}: 12 seeds preserve the Standard experience and shared-seed determinism`,()=>{
  const bank=banks.get(club)!
  for(let seed=1;seed<=12;seed++){
   const d=dealMode(bank,{mode:'standard'},seed,0);if('blocked' in d)throw new Error(JSON.stringify(d))
   const qs=d.ids.map(id=>bank.byId.get(id)!)
   expect(qs).toHaveLength(12);expect(qs.every(standardQuestion)).toBe(true)
   expect(new Set(qs.map(q=>q.type)).size).toBeGreaterThanOrEqual(3)
   expect(new Set(qs.map(q=>q.topic)).size).toBeGreaterThanOrEqual(4)
   expect(qs.filter(q=>q.type==='tf').length).toBeLessThanOrEqual(2)
   expect(qs.filter(q=>q.type==='year').length).toBeLessThanOrEqual(2)
   expect(qs.filter(q=>questionFamily(q)==='scoreboard').length).toBeLessThanOrEqual(3)
   expect(qs.filter(q=>questionFamily(q)==='shirts').length).toBeLessThanOrEqual(2)
   expect(qs.some(q=>['multi','order','match'].includes(q.type))).toBe(true)
   const facts=qs.flatMap(factsOf);expect(new Set(facts).size).toBe(facts.length)
   expect(dealMode(bank,{mode:'standard'},seed,0)).toEqual(d)
  }
 })
})

describe('A clock sized for the task',()=>{
 const q={type:'mcq' as const,prompt:'Who scored?',options:['A','B','C','D']}
 it('gives ordering and matching more time than one-tap questions in every stage',()=>{
  for(const stage of [0,1,2]){
   const simple=questionSeconds(q,stage)
   for(const type of ['multi','match','order'] as const)expect(questionSeconds({...q,type},stage)).toBeGreaterThan(simple)
   expect(questionSeconds({...q,type:'tf'},stage)).toBeLessThan(simple)
  }
 })
 it('includes clues and options in reading time, with a 45-second ceiling',()=>{
  const long={...q,type:'match' as const,left:['A long player name '.repeat(20)],prompt:'Read this clue '.repeat(40)}
  expect(questionSeconds(long,0)).toBe(45)
  expect(questionSeconds({...q,prompt:'A long clue '.repeat(30)},2)).toBeGreaterThan(questionSeconds(q,2))
 })
})

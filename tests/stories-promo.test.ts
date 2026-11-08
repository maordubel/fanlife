import {describe,expect,it} from 'vitest'
import {PROMO_SUBJECTS,validatePromo} from '@/lib/stories/promo'
import {memoryStore,readPrefix} from '@/lib/master/durable'
import {jobKind} from '@/lib/stories/jobs'

// 8.11.2026 — owner: "the marketing area makes marketing films about a feature, the channel, a film we made, or standalone"
describe('marketing films',()=>{
 const films=new Map([['job-aaaaaaaa',{title:'Five Days in May',description:'Hapoel Tel Aviv won the league and the cup in 2000.',url:'https://youtu.be/x'}]])
 it('a feature carries its own published facts and nothing typed by the owner',()=>{
  const {spec,brief}=validatePromo({about:'feature',subject:'trivia',seconds:30},films)
  expect(spec.facts).toBe(PROMO_SUBJECTS.find(s=>s.id==='trivia')!.facts)
  expect(brief.club_id).toBe('promo')
 })
 it('a film must be a finished one; free words must say something; the length is 20 or 30 s',()=>{
  expect(validatePromo({about:'film',subject:'job-aaaaaaaa'},films).spec.label).toBe('Five Days in May')
  expect(()=>validatePromo({about:'film',subject:'nope'},films)).toThrow(/finished film/)
  expect(()=>validatePromo({about:'free',facts:'too short'},films)).toThrow(/at least a few sentences/)
  expect(()=>validatePromo({about:'channel',seconds:45},films)).toThrow(/20 or 30/)
 })
 it('is a kind of job of its own',()=>{expect(jobKind({kind:'promo'})).toBe('promo')})
})

// 8.11.2026 — the Vercel account was frozen on Active CPU: the job list read every job file with its own request
describe('readPrefix',()=>{
 it('reads every file under a prefix in one call, and only those',async()=>{
  const d=memoryStore()
  await d.write('stories/jobs/a.json','{"a":1}',null);await d.write('stories/jobs/b.json','{"b":2}',null);await d.write('other/c.json','{}',null)
  const rows=await readPrefix(d,'stories/jobs/')
  expect(rows.map(r=>r.name).sort()).toEqual(['stories/jobs/a.json','stories/jobs/b.json'])
  expect(rows[0]!.etag).toBeTruthy()
 })
})

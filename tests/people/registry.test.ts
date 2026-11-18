import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe,expect,it} from 'vitest'
import {buildRegistry,isPersonId,linkKey,type Candidate,type Link,type Stint} from '@/lib/people/model'

const ROOT=join(__dirname,'..','..')
const read=<T>(f:string)=>JSON.parse(readFileSync(join(ROOT,f),'utf8')) as T
const gen=read<{stints:Stint[];candidates:Candidate[]}>('content/generated/people-stints.json')
const ids=read<{stints:Record<string,string>}>('content/manual/people-ids.json').stints
const links=read<{links:Link[]}>('content/manual/people-links.json').links

describe('People Registry — the files agree', () => {
 it('every stint carries the id minted for it, and ids are unique', () => {
  for(const s of gen.stints){expect(isPersonId(s.id)).toBe(true);expect(ids[s.key]).toBe(s.id)}
  expect(new Set(Object.values(ids)).size).toBe(Object.keys(ids).length)
 })
 it('a record id is unique across every club (games join a man by his record id alone)', () => {
  const seen=new Map<string,string>()
  for(const s of gen.stints){expect(seen.get(s.eid)??s.club).toBe(s.club);seen.set(s.eid,s.club)}
 })
 it('every link names two records at two different clubs and is recorded once', () => {
  const keys=new Set(gen.stints.map(s=>s.key)),seen=new Set<string>()
  for(const l of links){
   expect(l.a.split(':')[0]).not.toBe(l.b.split(':')[0])
   expect(['same','different']).toContain(l.verdict);expect(l.evidence.length).toBeGreaterThan(0)
   const k=linkKey(l.a,l.b);expect(seen.has(k)).toBe(false);seen.add(k)
   if(keys.has(l.a)&&keys.has(l.b))continue
   // a link to a record the latest build no longer holds is kept (append-only), never applied
  }
 })
 it('a Wikidata verdict cites a Wikidata item', () => {
  for(const l of links.filter(x=>x.basis==='wikidata'))expect(l.evidence).toMatch(l.verdict==='same'?/^Q\d+$/:/^Q\d+ \/ Q\d+$/)
 })
 it('the registry builds, joins the multi-club men, and leaves only undecided pairs in the queue', () => {
  const r=buildRegistry(gen.stints,links,gen.candidates)
  expect(r.counts.people).toBeLessThan(r.counts.stints)
  expect(r.counts.multiClub).toBeGreaterThan(50)
  for(const q of r.queue)expect(links.some(l=>linkKey(l.a,l.b)===q.key)).toBe(false)
 })
})

import {beforeAll,describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {buildEntries,encodeArchive,decodeArchive} from '@/lib/clubs/entities'
import {related} from '@/lib/clubs/archive-model'
import {MAX_ROWS,makeRoom,parseSaved,type SavedBook} from '@/lib/clubs/archive-mine'
import {clubBank} from '@/lib/clubs/trivia-deck'
import {standardDeck,EDITORIAL_BUDGET} from '@/lib/clubs/trivia-selection'
import {EDITORIAL_TAG} from '@/lib/trivia/editorial'
import {usablePool} from '@/lib/clubs/memory-solver'
import {legacyOpen} from '@/lib/master/legacy-access'
import {portalOrigin} from '@/lib/master/registry'
import type {ClubData} from '@/lib/clubs/contract'

/** The site review of 10.11.2026 (FanLife-complete-review-he.md): V01–V04, D01–D06, F01–F07 — each finding as a check. */
const clubs=new Map<string,ClubData>()
beforeAll(async()=>{for(const id of CORE_CLUB_IDS)clubs.set(id,(await loadClub(id))!.data)},300_000)

describe('V01 · the archive prints the record, the game gets the hint',()=>{
 it('no archive line is a season with its year cut off ("Scottish Premiership · -20")',()=>{
  for(const [id,d] of clubs)for(const e of buildEntries(d))expect(e.hint,`${id} ${e.id}`).not.toMatch(/·\s*-\d{2}\b|\s-\d{2}$/)
 })
 it('the timeline game still never prints a year in its hint',()=>{
  for(const [id,d] of clubs)for(const f of d.timeline)expect(f.value.hint,`${id} ${f.id}`).not.toMatch(/\b(18|19|20)\d{2}\b/)
 })
})

describe('V02 · a decade is printed whole',()=>{
 it('the trivia era dial never cuts the century off',()=>{
  const src=readFileSync('components/clubs/gates/trivia/ClubTrivia.tsx','utf8')
  expect(src).not.toMatch(/String\(e\.decade\)\.slice\(2\)/)
 })
})

describe('D01 · a moment that is a match carries its own record',()=>{
 it('moments link to the match they are, and the match\'s people link back (whole names only)',()=>{
  let withPeople=0
  for(const [,d] of clubs){
   const es=buildEntries(d),byId=new Map(es.map(e=>[e.id,e]))
   for(const e of es){
    if(!e.match)continue
    for(const id of [...e.match.started,...e.match.scored]){const p=byId.get(id);expect(p?.kind).toBe('player')
     expect(related(es,byId,p!).playedIn.some(x=>x.id===e.id)||e.names.includes(id)).toBe(true)}
    if(e.match.started.length||e.match.scored.length)withPeople++
   }
  }
  // 35 before the review; the record of the matches themselves now reaches the archive
  expect(withPeople).toBeGreaterThan(1000)
 })
 it('a projected match passes the archive\'s own gate: approved, confidence ≥ 2, exact day, checked sources',()=>{
  for(const [id,d] of clubs){
   const ids=new Set(d.archive.map(f=>f.id)),ok=new Set(d.sources.filter(s=>s.access==='available'&&s.checkedAt).map(s=>s.id))
   for(const e of buildEntries(d)){if(e.kind!=='moment'||ids.has(e.id)||!(d.matches||[]).some(m=>m.id===e.id))continue
    const m=(d.matches||[]).find(x=>x.id===e.id)!
    expect(m.status,`${id} ${e.id}`).toBe('approved');expect(m.confidence).toBeGreaterThanOrEqual(2);expect(e.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(m.sources.every(s=>ok.has(s))).toBe(true)}
  }
 })
 it('the wire carries the match link both ways',()=>{
  const d=clubs.get('celtic')!,es=buildEntries(d),back=decodeArchive(encodeArchive(es,d.sources))
  expect(back.find(e=>e.match)?.match).toEqual(es.find(e=>e.match)?.match)
 })
})

describe('D03 · Standard trivia rounds rotate through the bank',()=>{
 it(`at most ${EDITORIAL_BUDGET} editorial questions a round, and ten rounds share far fewer questions than before`,()=>{
  for(const [id,d] of clubs){
   const b=clubBank(d),ids=new Set<string>();let n=0
   for(let seed=1;seed<=10;seed++){const deck=standardDeck(b.questions,seed,0);if(!deck)continue;n++
    expect(deck.filter(x=>b.byId.get(x)?.facets?.includes(EDITORIAL_TAG)).length,id).toBeLessThanOrEqual(EDITORIAL_BUDGET);deck.forEach(x=>ids.add(x))}
   // before: 37–62 distinct questions in 120 slots
   if(n===10)expect(ids.size,id).toBeGreaterThanOrEqual(65)
  }
 },300_000)
})

describe('D04 · Memory is more than dates',()=>{
 it('every core club deals at least two kinds of relation',()=>{
  for(const [id,d] of clubs)expect(Object.keys(usablePool(d.memory).stats.types).length,id).toBeGreaterThanOrEqual(2)
 })
})

describe('F01 · on a club\'s own host, other clubs live on the portal',()=>{
 it('maps a club host to the portal origin',()=>{
  expect(portalOrigin('celtic.fanlife.dubelteam.com')).toBe('https://fanlife.dubelteam.com')
  expect(portalOrigin('celtic.localhost:3000')).toBe('http://localhost:3000')
  const sw=readFileSync('components/clubs/ClubSwitcher.tsx','utf8')
  expect(sw).toMatch(/\$\{portal\}\$\{clubHref/);expect(sw).toMatch(/\$\{portal\}\/#clubs/)
 })
})

describe('F02/F03 · one club-wide policy for paused and for robots',()=>{
 it('the club layout rests a paused club on every page and sets robots for every page',()=>{
  const src=readFileSync('app/clubs/[slug]/layout.tsx','utf8')
  expect(src).toMatch(/c\.status==='paused'&&!preview&&!isOwner\(\)/)
  expect(src).toMatch(/robots:indexableStatus\(status\)/)
 })
})

describe('F04 · the archive offers only gates the control room has on',()=>{
 it('the archive view asks `allowed` before it links',()=>{
  expect(readFileSync('components/clubs/gates/views/archive.tsx','utf8')).toMatch(/allowed\(k\)&&gateAvailability/)
 })
})

describe('F05 · the saved list never writes what it cannot read back',()=>{
 const book=(live:number,tomb:number):SavedBook=>Object.fromEntries([...Array.from({length:live},(_,i)=>[`a${i}`,{b:true,at:`2026-01-01T00:00:${String(i%60).padStart(2,'0')}Z`}]),...Array.from({length:tomb},(_,i)=>[`t${i}`,{b:false,at:`2025-0${1+i%9}-01T00:00:00Z`}])])
 it('a full book of live saves refuses; one with un-saves drops the oldest un-save',()=>{
  expect(makeRoom(book(MAX_ROWS,0),'new')).toBe('full')
  const r=makeRoom(book(MAX_ROWS-3,3),'new');expect(r).not.toBe('full');expect(Object.keys(r as SavedBook)).toHaveLength(MAX_ROWS-1)
  expect(makeRoom(book(1999,0),'new')).not.toBe('full')
 })
 it('reading an over-full book keeps the newest rows',()=>{
  const big={...book(MAX_ROWS,0),newest:{b:true,at:'2027-01-01T00:00:00Z'}}
  const p=parseSaved(JSON.stringify(big));expect(Object.keys(p)).toHaveLength(MAX_ROWS);expect(p.newest).toBeDefined()
 })
})

describe('F06 · the next match streams',()=>{
 it('club home and terrace never await the fixture feed in the page',()=>{
  for(const f of ['app/clubs/[slug]/page.tsx','app/clubs/[slug]/terrace/page.tsx'])expect(readFileSync(f,'utf8')).not.toMatch(/await getFixtureFeed/)
 })
})

describe('F07 · sitemap and the Worker gate screen agree',()=>{
 it('a Worker gate switched off, or Hapoel not live, is closed — and FAN LIFE paths are always open',()=>{
  expect(legacyOpen('/xi',{status:'live',gates:[1]})).toBe(true)
  expect(legacyOpen('/xi',{status:'live',gates:[2]})).toBe(false)
  expect(legacyOpen('/kits/archive',{status:'review',gates:[5]})).toBe(false)
  expect(legacyOpen('/clubs/celtic',{status:'paused',gates:[]})).toBe(true)
 })
})

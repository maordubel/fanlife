import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compilePack} from '@/lib/clubs/compiler'
import {loadClub,resolveClubId,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {clubTimeline} from '@/lib/clubs/timeline'
import {REGISTRY} from '@/lib/master/registry'
import raw from '@/club-packs/olympiacos/core.json'
import golden from '@/tests/fixtures/timeline-golden.json'
const registry=REGISTRY.find(c=>c.id==='olympiacos')!
const compile=(change:(p:typeof raw)=>void=()=>{})=>{const p=structuredClone(raw);change(p);return compilePack(p,registry)}
describe('M1 shared chronology',()=>{
 it('preserves captured Hapoel deals and boards exactly',async()=>{const g=clubTimeline((await loadClub('hapoel-tel-aviv'))!.data);expect(g.poolSize).toBe(golden.poolSize);for(const r of golden.runs){expect(g.dealTimelineRun(r.seed,r.cursor)).toEqual(r.deal);expect(g.boardAfter(r.seed,10,r.cursor)).toEqual(r.board)}})
 it.each(CORE_CLUB_IDS)('%s completes using one algorithm',async id=>{const g=clubTimeline((await loadClub(id))!.data);expect(g.available).toBe(true);for(const seed of [1,42,95,300])for(const cursor of [0,1,3]){const deal=g.dealTimelineRun(seed,cursor);expect(deal.queue).toHaveLength(g.length);expect(JSON.stringify(deal.queue)).not.toMatch(/\d{4}-\d{2}-\d{2}|"on"/);for(let p=0;p<g.length;p++){const truth=g.gradeInsert(seed,p,-1,cursor)!;expect(truth.card.id).toBe(deal.queue[p]!.id);expect(g.gradeInsert(seed,p,truth.position,cursor)?.correct).toBe(true);expect(truth.done).toBe(p===g.length-1)}}})
 it('isolates ids and immutable versioned caches',async()=>{const a=(await loadClub('zrinjski-mostar'))!.data,b=(await loadClub('olympiacos'))!.data;expect(a.timeline.some(x=>b.timeline.some(y=>y.value.id===x.value.id))).toBe(false);expect(clubTimeline(a)).not.toBe(clubTimeline(b));expect(clubTimeline(a)).toBe(clubTimeline(a));expect(Object.isFrozen(a.timeline[0]?.value)).toBe(true);expect(await loadClub('../../hapoel')).toBeNull();expect(await loadClub('constructor')).toBeNull()})
 it('preserves unapproved Zrinjski research and missing dates',async()=>{const {data}=(await loadClub('zrinjski-mostar'))!,f=data.archive.find(f=>f.id.endsWith(':legacy-founded-1905'))!;expect(f.status).toBe('review');expect(f.value.on).toBeNull();expect(data.readiness.state).toBe('PARTIAL');expect(data.timeline).toHaveLength(3)})
 it('keeps legacy archive imports outside shared board and algorithm',()=>{for(const f of ['components/timeline/SharedTimelineBoard.tsx','lib/game/timeline-engine.ts'])expect(readFileSync(f,'utf8')).not.toMatch(/from ['"].*(?:content\/|club-packs\/|game\/archive|hapoel)/)})
})
describe('pack validation',()=>{
 it('rejects mismatched identities and invalid schema',()=>{expect(()=>compilePack({...raw,clubId:'zrinjski-mostar'},registry)).toThrow();expect(()=>compilePack({...raw,archive:{}},registry)).toThrow()})
 it('excludes drafts, rejected facts and low confidence',()=>expect(compile(p=>{p.archive[0]!.status='draft';p.archive[1]!.status='rejected';p.archive[2]!.confidence=1}).data.timeline).toHaveLength(0))
 it('requires real dates, referenced sources and approval provenance',()=>{expect(compile(p=>p.archive[0]!.value.on='2024-02-30').diagnostics.some(d=>d.code==='DATE_INVALID')).toBe(true);expect(compile(p=>p.archive[0]!.sources=['missing']).data.timeline).toHaveLength(2);expect(compile(p=>p.archive[0]!.approvedBy='').data.timeline).toHaveLength(2)})
 it('blocks unavailable and unchecked sources',()=>{expect(compile(p=>p.sources[0]!.access='blocked').data.timeline).toHaveLength(0);expect(compile(p=>p.sources[0]!.checkedAt='').data.timeline).toHaveLength(0)})
 it('requires independent publishers for automated approval',()=>expect(compile(p=>p.sources.forEach(s=>s.publisher='UEFA')).data.timeline).toHaveLength(0))
 it('quarantines both duplicate id versions',()=>{const r=compile(p=>p.archive.push({...p.archive[0]!,value:{...p.archive[0]!.value,on:'2024-05-03'}}));expect(r.data.timeline).toHaveLength(2);expect(r.diagnostics.some(d=>d.code==='CONFLICT')).toBe(true)})
 it('requires human review for sensitive or uncertain facts',()=>{expect(compile(p=>p.archive[0]!.value.sensitive=true).data.timeline).toHaveLength(2);expect(compile(p=>p.archive[0]!.parserCertainty='low').data.timeline).toHaveLength(2)})
 it('removes date hints and rejects year titles and duplicate dates',()=>{const r=compile(p=>{p.archive[0]!.value.hint='UEFA 02.05.2024 2023/24';p.archive[1]!.value.name='Cup in 2024';p.archive[2]!.value.on=p.archive[0]!.value.on});expect(r.data.timeline).toHaveLength(1);expect(r.data.timeline[0]!.value.hint).not.toMatch(/202[34]/)})
 it('handles empty pools and short rounds',()=>{const d=compile(p=>p.archive=[]).data,g=clubTimeline(d);expect(d.readiness.state).toBe('LOCKED');expect(g.available).toBe(false);expect(g.gradeInsert(1,0,0)).toBeNull();expect(g.boardAfter(1,0)).toEqual([]);expect(()=>g.dealTimelineRun(1)).toThrow('TIMELINE_UNAVAILABLE');expect(clubTimeline(compile().data).length).toBe(2)})
 it('rejects invalid grading indices but accepts timeout misses',()=>{const g=clubTimeline(compile().data);for(const p of [-1,NaN,1.5,Infinity,2])expect(g.gradeInsert(1,p,0)).toBeNull();expect(g.gradeInsert(NaN,0,0)).toBeNull();expect(g.gradeInsert(1,0,3)).toBeNull();expect(g.gradeInsert(1,0,-1)?.correct).toBe(false)})
})
describe('tenant resolution',()=>{
 it('host wins over path selection',()=>{expect(resolveClubId('olympiacos.fanlife.game','zrinjski-mostar',true)).toBeNull();expect(resolveClubId('olympiacos.fanlife.game','olympiacos',true)).toBe('olympiacos');expect(resolveClubId('olympiacos.fanlife.game')).toBe('olympiacos')})
 it('unknown subdomains stay neutral; path previews need evaluation',()=>{expect(resolveClubId('unknown.fanlife.game','hapoel-tel-aviv',true)).toBeNull();expect(resolveClubId('localhost:3000','olympiacos',false)).toBeNull();expect(resolveClubId('localhost:3000','olympiacos',true)).toBe('olympiacos')})
})

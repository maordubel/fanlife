import {describe,it,expect} from 'vitest'
import {readFileSync,readdirSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {dryRun} from '@/lib/club-research/report'
import {dateFitsSeason,homeAwayFor,seasonStart,separateResult,lineupVerdict,groupGoals,goalKey,independentEnough,mergeStaging,identityReport,isNeutralFinal} from '@/lib/club-research/rules'
const dir='research-staging/panathinaikos',s:Record<string,any[]>={}
for(const f of readdirSync(dir)){const n=f.replace(/\.(json|jsonl\.gz)$/,'');if(f.endsWith('.jsonl.gz'))s[n]=gunzipSync(readFileSync(`${dir}/${f}`)).toString().split('\n').filter(Boolean).map(l=>JSON.parse(l));else if(f.endsWith('.json')&&!/manifest|dry-run/.test(n))s[n]=JSON.parse(readFileSync(`${dir}/${f}`,'utf8'))}
const r=dryRun('panathinaikos','2026-10-06',s)
describe('seasons are read from the competition, not a July rule',()=>{
 it('parses labels and rejects impossible tokens',()=>{expect(seasonStart('1966/67')).toBe(1966);expect(seasonStart('2011/2012')).toBe(2011);expect(seasonStart('1996/96')).toBeNull();expect(seasonStart('x')).toBeNull()})
 it('a 5 July 1967 cup final still fits 1966/67',()=>{expect(dateFitsSeason('1966/67','1967-07-05')).toBe(true);expect(dateFitsSeason('1966/67','1967-10-01')).toBe(false)})
 it('the 1996/96 token is reported, never corrected',()=>{expect(r.seasonTokenIssues.map(i=>i.token)).toContain('1996/96')})
})
describe('real data failures',()=>{
 it('game 35886 stays in quarantine with a 2026 date that no 2011/12 calendar explains',()=>{
  expect(r.matches.quarantined).toHaveLength(1);expect(s.quarantined![0].providerIds.pao).toBe('35886')
  expect(dateFitsSeason('2011/2012',s.quarantined![0].playedOn)).toBe(false)
  expect(s.matches!.some(m=>m.providerIds?.pao==='35886')).toBe(false)})
 it('no match is dated after the snapshot or outside its season',()=>{expect(r.matches.futureDated).toEqual([]);expect(r.matches.seasonMismatch).toEqual([])})
 it('1971 second goal stays an open conflict between two sources',()=>{const c=s.conflicts!.find(c=>c.fieldPaths);expect(c.status).toBe('deep_research');expect(c.claims).toHaveLength(2);expect(new Set(c.claims.map((x:any)=>x.value.name))).toEqual(new Set(['Kapsis','Arie Haan']));expect(c.resolution).toBeNull();expect(c.productRule).toMatch(/withheld/)})
 it('Berg 114/74 vs 115/73 is two language versions of ONE publisher — not independent',()=>{const c=s.conflicts!.find(c=>/Berg/.test(c.topic||''));expect(c.blockedUses).toContain('records ranking');const byId=new Map(s.sources!.map(x=>[x.id,x]));expect(independentEnough(c.alternatives.map((a:any)=>a.sourceId),byId)).toBe(false)})
 it('1969 final was decided by lots, not penalties',()=>{const f=s['cup-final-assertions']!.find(x=>x.season==='1968/69');expect(separateResult({notesAsReported:f.notesAsReported,scoreAsReported:{home:1,away:1}}).kind).toBe('drawn_by_lot')})
 it('the 1991 final is two games, kept as two score pairs',()=>{expect(s['cup-final-assertions']!.find(x=>x.season==='1990/91').scorePairsAsReported).toHaveLength(2)})
 it('90+7 in the 2024 final keeps minute 90 and stoppage 7',()=>{const g=s['goal-claims']!.find(x=>x.scorerNameAsReported==='Vagiannidis');expect([g.minute,g.stoppageMinute]).toEqual([90,7])})
 it('Wembley-style neutral finals carry no home advantage',()=>{expect(isNeutralFinal({stage:'Final, second leg'})).toBe(true);expect(homeAwayFor({stage:'Final'})).toBe('neutral_unassigned');expect(homeAwayFor({})).toBe('unassigned')})
 it('assertions never become matches',()=>{expect(r.matches.assertionsNotMatches).toBe(598);expect(r.matches.total).toBe(917)})
})
describe('lineups and goals',()=>{
 it('12 malformed lineups are blocked, 143 are only candidates',()=>{expect(r.lineups.blocked).toHaveLength(12);expect(r.lineups.xiCandidatesNeedIdentity).toBe(143);expect(lineupVerdict({startersAsReported:Array.from({length:11},(_,i)=>({nameAsReported:`P${i}`})),coverageStatus:'complete_listing'}).status).toBe('xi_candidate_needs_identity')})
 it('a duplicated or short list is blocked and says why',()=>{const v=lineupVerdict({startersAsReported:[{nameAsReported:'A'},{nameAsReported:'a'}]});expect(v.status).toBe('blocked');expect(v.reasons.join()).toMatch(/not 11.*duplicate/)})
 it('goals merge only on identical identity; no side is invented',()=>{const g={matchId:'m',scorerNameAsReported:'Haan',minute:87,stoppageMinute:null,creditedTeamId:null,typeAsReported:'goal',sourceIds:['a']};expect(goalKey(g)).toBe(goalKey({...g,scorerNameAsReported:'HAAN'}));expect(goalKey(g)).not.toBe(goalKey({...g,minute:83}));expect(groupGoals([g,{...g,sourceIds:['b']}]).duplicates).toBe(1);expect(r.goals.sideUnresolved).toBe(295)})
})
describe('approval and identity',()=>{
 it('nothing is approved and no name becomes an identity',()=>{expect(r.approvedForProduction).toBe(0);expect(r.identity.archivePlayers.matched).toBe(0);expect(identityReport([{providerIds:{pao:'1'}}],new Set(['pao:1'])).matched).toBe(1);expect(identityReport([{nameOriginal:'x'}],new Set(['pao:1'])).matched).toBe(0)})
 it('every gate stays LOCKED on raw material',()=>{expect(Object.entries(r.gates).filter(([k])=>k!=='note').every(([,v])=>v==='LOCKED')).toBe(true)})
 it('no source permits images in the app',()=>{expect(r.sources.imagesUsableInApp).toBe(0)})
 it('re-import is idempotent and never replaces a manual approval',()=>{
  const prev=[{id:'a',v:1,status:'approved',approvedBy:'maor'},{id:'b',v:1,status:'review'}],next=[{id:'a',v:2,status:'review'},{id:'b',v:2,status:'review'},{id:'c',v:1,status:'review'}]
  const m=mergeStaging(prev,next);expect(m).toMatchObject({inserts:1,updates:1,keptApproved:1,disputed:1,unchanged:0});expect(m.rows.find(x=>x.id==='a')!.v).toBe(1)
  expect(mergeStaging(m.rows,next).inserts).toBe(0)
  expect(JSON.stringify(dryRun('panathinaikos','2026-10-06',s))).toBe(JSON.stringify(r))})
})

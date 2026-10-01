import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.game',paused:false,gates:[1,2,6,12,13]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {answerTrivia} from '@/app/clubs/[slug]/[gate]/actions'
import {requestClub} from '@/lib/clubs/request'
import {loadClub} from '@/lib/clubs/resolver'
import {clubTrivia} from '@/lib/clubs/games'
import {MIXED} from '@/lib/game/trivia-engine'
beforeEach(()=>{request.host='olympiacos.fanlife.game';request.paused=false;request.gates=[1,2,6,12,13]})
async function deal(id='olympiacos'){const d=(await loadClub(id))!.data,g=clubTrivia(d),ids=g.dealSeededRun(MIXED,42,0).ids,q=d.trivia.questions.find(q=>q.id===ids[0])!;return {d,ids,q}}
describe('shared trivia action authority',()=>{
 it('grades only the current dealt question and reveals its evidence after submission',async()=>{const {d,q}=await deal();const result=await answerTrivia('olympiacos',d.version,q.id,42,0,0,q.answer);expect(result?.correct).toBe(true);expect(result?.source.url).toMatch(/^https:/);expect(await answerTrivia('olympiacos','stale',q.id,42,0,0,q.answer)).toBeNull();expect(await answerTrivia('olympiacos',d.version,q.id,42,0,1,q.answer)).toBeNull()})
 it('rejects copied cross-tenant deals and unknown hosts',async()=>{const {d,q}=await deal('zrinjski-mostar');expect(await answerTrivia(d.identity.id,d.version,q.id,42,0,0,q.answer)).toBeNull();request.host='unknown.fanlife.game';expect(await requestClub('olympiacos',2)).toBeNull()})
 it('respects per-gate controls independently and admin pause',async()=>{const {d,q}=await deal();request.gates=[2];expect(await requestClub('olympiacos',13)).toBeNull();expect((await answerTrivia('olympiacos',d.version,q.id,42,0,0,q.answer))?.correct).toBe(true);request.gates=[13];expect(await answerTrivia('olympiacos',d.version,q.id,42,0,0,q.answer)).toBeNull();request.gates=[2];request.paused=true;expect(await answerTrivia('olympiacos',d.version,q.id,42,0,0,q.answer)).toBeNull()})
 it('rejects invalid cursors, indices and options; timeout is a valid miss',async()=>{const {d,q}=await deal();for(const index of [-1,NaN,12,1.5])expect(await answerTrivia('olympiacos',d.version,q.id,42,0,index,q.answer)).toBeNull();expect(await answerTrivia('olympiacos',d.version,q.id,NaN,0,0,q.answer)).toBeNull();expect(await answerTrivia('olympiacos',d.version,q.id,42,-1,0,q.answer)).toBeNull();expect(await answerTrivia('olympiacos',d.version,q.id,42,0,0,'not-an-option')).toBeNull();expect((await answerTrivia('olympiacos',d.version,q.id,42,0,0,[]))?.correct).toBe(false)})
})

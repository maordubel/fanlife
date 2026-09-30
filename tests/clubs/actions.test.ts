import {describe,it,expect,vi} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.game',paused:false,enabled:true}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.enabled?[13]:[]}))})}))
import {placeCard} from '@/app/clubs/[slug]/timeline/actions'
import {loadClub} from '@/lib/clubs/resolver'
import {clubTimeline} from '@/lib/clubs/timeline'
describe('shared Timeline server action',()=>{
 it('respects admin pause and disabled gate controls',async()=>{request.host='olympiacos.fanlife.game';const d=(await loadClub('olympiacos'))!.data,c=clubTimeline(d).dealTimelineRun(42).queue[0]!;request.paused=true;expect(await placeCard(d.identity.id,d.version,c.id,42,0,0,0)).toBeNull();request.paused=false;request.enabled=false;expect(await placeCard(d.identity.id,d.version,c.id,42,0,0,0)).toBeNull();request.enabled=true})
 it('grades its dealt card and rejects stale versions and wrong cards',async()=>{request.host='olympiacos.fanlife.game';const d=(await loadClub('olympiacos'))!.data,g=clubTimeline(d),c=g.dealTimelineRun(42,1).queue[0]!,t=g.gradeInsert(42,0,-1,1)!;expect((await placeCard('olympiacos',d.version,c.id,42,0,t.position,1))?.correct).toBe(true);expect(await placeCard('olympiacos','stale',c.id,42,0,0,1)).toBeNull();expect(await placeCard('olympiacos',d.version,'wrong-card',42,0,0,1)).toBeNull()})
 it('rejects a valid deal copied from another tenant',async()=>{request.host='olympiacos.fanlife.game';const d=(await loadClub('zrinjski-mostar'))!.data,c=clubTimeline(d).dealTimelineRun(42).queue[0]!;expect(await placeCard(d.identity.id,d.version,c.id,42,0,0,0)).toBeNull()})
 it('does not fall back to Hapoel on unknown hosts',async()=>{request.host='unregistered.fanlife.game';const d=(await loadClub('hapoel-tel-aviv'))!.data,c=clubTimeline(d).dealTimelineRun(1).queue[0]!;expect(await placeCard(d.identity.id,d.version,c.id,1,0,0,0)).toBeNull()})
})

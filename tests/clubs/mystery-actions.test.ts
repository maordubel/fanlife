import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'hapoeltelaviv.localhost',paused:false,gates:[10],values:new Map<string,string>()}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host}),cookies:()=>({get:(key:string)=>request.values.has(key)?{value:request.values.get(key)}:undefined,set:(key:string,value:string)=>request.values.set(key,value)})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {startMystery,moveMystery} from '@/app/clubs/[slug]/[gate]/mystery-actions'
import {loadClub} from '@/lib/clubs/resolver'
import {open,seal} from '@/lib/game/blind-cow/token'
import type {RunState} from '@/lib/game/blind-cow/solo-engine'
beforeEach(()=>{request.host='hapoeltelaviv.localhost';request.paused=false;request.gates=[10];request.values.clear()})
describe('shared mystery server authority',()=>{
 it('resumes the same sealed run and reveals a target only after a valid guess',async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data,first=(await startMystery(data.identity.id,data.version))!
  expect(first.result).toBeUndefined();expect((await startMystery(data.identity.id,data.version))?.rid).toBe(first.rid)
  const token=request.values.get('fanlife-mystery-hapoel-tel-aviv')!,session=open<{run:RunState}>(token)!,target=data.mysteries.find(q=>q.id===session.run.qid)!.value.targetPlayerId
  expect(token).not.toContain(target);expect(JSON.stringify(first)).not.toContain(target)
  expect((await moveMystery(data.identity.id,data.version,first.rid,'reveal',1))?.shown).toBe(2)
  expect((await moveMystery(data.identity.id,data.version,first.rid,'reveal',1))?.shown).toBe(2)
  expect((await moveMystery(data.identity.id,data.version,first.rid,'guess','zrinjski-mostar:marko-maric'))?.wrong).toBe(0)
  const solved=(await moveMystery(data.identity.id,data.version,first.rid,'guess',target))!
  expect(solved.status).toBe('solved');expect(solved.result?.playerId).toBe(target)
  expect((await moveMystery(data.identity.id,data.version,first.rid,'give_up',0))?.status).toBe('solved')
  expect((await startMystery(data.identity.id,data.version,true))?.rid).not.toBe(first.rid)
 },30000)
 it('rejects stale versions, wrong run IDs, cross-tenant sessions, tampering and revoked gates',async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data,run=(await startMystery(data.identity.id,data.version))!,key='fanlife-mystery-hapoel-tel-aviv',token=request.values.get(key)!
  expect(await moveMystery(data.identity.id,'stale',run.rid,'reveal',1)).toBeNull()
  expect(await moveMystery(data.identity.id,data.version,'deadbeef','reveal',1)).toBeNull()
  request.values.set(key,token.slice(0,-3)+'AAA');expect(await moveMystery(data.identity.id,data.version,run.rid,'reveal',1)).toBeNull()
  const parsed=open<Record<string,unknown>>(token)!;request.values.set(key,seal({...parsed,club:'olympiacos'}));expect(await moveMystery(data.identity.id,data.version,run.rid,'reveal',1)).toBeNull()
  request.values.set(key,token);request.host='zrinjski.localhost';expect(await moveMystery(data.identity.id,data.version,run.rid,'reveal',1)).toBeNull()
  request.host='hapoeltelaviv.localhost';request.gates=[13];expect(await startMystery(data.identity.id,data.version)).toBeNull()
  request.gates=[10];request.paused=true;expect(await moveMystery(data.identity.id,data.version,run.rid,'give_up',0)).toBeNull()
 })
})

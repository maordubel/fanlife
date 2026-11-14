import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {withHold,publishedSeed} from '@/lib/master/store'
import HOLD from '@/lib/master/owner-hold.json'
import LAUNCH from '@/lib/master/launch-defaults.json'
import type {State} from '@/lib/master/types'
const club=(id:string,extra:object={})=>({id,name:id,city:'',country:'',initials:'',primary:'#000000',secondary:'#FFFFFF',status:'live',version:1,gates:[1,2,3],sources:[],findings:[],gaps:[],...extra})
describe('owner hold (14.11.2026): only the owner opens a club to the public',()=>{
 it('holds the five clubs the archive round opened by mistake',()=>{expect([...HOLD.clubs].sort()).toEqual(['al-ahly','atalanta','maccabi-haifa','raja-casablanca','wydad-casablanca'])})
 it('no held club is in the launch defaults; St Pauli keeps all 13 gates',()=>{for(const id of HOLD.clubs)expect(Object.keys(LAUNCH)).not.toContain(id);expect((LAUNCH as Record<string,number[]>)['st-pauli']).toHaveLength(13)})
 it('a held club that is live without the owner’s own opening is closed, with no gates',()=>{
  const s=withHold({clubs:[club('atalanta'),club('celtic')]} as unknown as State)
  expect(s.clubs[0]).toMatchObject({status:'review',gates:[]});expect(s.clubs[1]).toMatchObject({status:'live',gates:[1,2,3]})
 })
 it('the owner’s own opening (stamped by the control room) is respected',()=>{
  const s=withHold({clubs:[club('raja-casablanca',{ownerOpenedAt:'2026-11-15T09:00:00.000Z'})]} as unknown as State)
  expect(s.clubs[0]).toMatchObject({status:'live',gates:[1,2,3]})
 })
 it('the fallback the public site serves holds them too',()=>{for(const c of publishedSeed().clubs)if(HOLD.clubs.includes(c.id))expect(c.status).not.toBe('live')})
})

import {describe,expect,it} from 'vitest'
import {buildCatalog} from '@/lib/fan-league/catalog'
import {createCareer} from '@/lib/fan-league/career'
import {acceptFriendly,closeFriendly,createFriendly,friendlyView,lockSide,statusAt,type LockedSide} from '@/lib/fan-league/friendly'
import type {Catalog} from '@/lib/fan-league/types'
import type {Pos} from '@/lib/clubs/rumble-format'

function club(id:string):Catalog{const fam:Pos[]=['GK','DF','DF','DF','MF','MF','MF','FW','FW','DF'];const rows=Array.from({length:40},(_,i)=>({id:`${id}-p${i}`,name:`${id} ${i}`,position:fam[i%10]!,price:1+(i%5),rating:60+(i*7%30),fromYear:1980+(i%9),toYear:1983+(i%9)}));return buildCatalog(id,id.toUpperCase(),rows,new Set(rows.map(r=>r.id)))}
const career=(id:string,owner:string,own:string)=>{const r=createCareer({id,owner,now:'2026-10-12T00:00:00Z',own:club(own),homeDecade:1980,rivals:['x','y','z'].map(c=>({catalog:club(c),decade:1980}))});if(!r.ok)throw new Error(r.error);return r.career}
const now=new Date('2026-10-12T10:00:00Z')

describe('FAN LEAGUE — friendlies',()=>{
 const a=career('aaaaaaaaaaaaaaaa','a'.repeat(32),'hap'),b=career('bbbbbbbbbbbbbbbb','b'.repeat(32),'cel')
 const sa=lockSide(a,now.toISOString()) as LockedSide,sb=lockSide(b,now.toISOString()) as LockedSide
 it('a locked side is its own club’s eleven',()=>{expect(sa.xi.length).toBe(11);expect(sa.xi.every(x=>x.id.startsWith('hap-'))).toBe(true);expect(sb.xi.every(x=>x.id.startsWith('cel-'))).toBe(true)})
 it('plays once, from two snapshots, and changes neither career',()=>{
  const beforeA=JSON.stringify(a),beforeB=JSON.stringify(b)
  const f=createFriendly('f000000000000001','tok-123456',sa,now)
  expect(friendlyView(f,null,now.getTime()).home.xi).toBeNull()
  const r=acceptFriendly(f,'tok-123456',sb,now);expect(r.ok).toBe(true);if(!r.ok)return
  expect(r.friendly.status).toBe('completed');expect(r.friendly.result!.goals).toEqual([0,1].map(i=>r.friendly.result!.events.filter(e=>e.kind==='goal'&&e.side===i).length))
  for(const e of r.friendly.result!.events)if(e.kind==='goal')expect(e.scorer.startsWith(e.side?'cel-':'hap-')).toBe(true)
  expect(JSON.stringify(a)).toBe(beforeA);expect(JSON.stringify(b)).toBe(beforeB)
  expect(acceptFriendly(r.friendly,'tok-123456',sb,now).ok).toBe(false)
  expect(acceptFriendly(f,'tok-123456',sb,now)).toEqual(r)
  const v=friendlyView(r.friendly,'b'.repeat(32),now.getTime());expect(v.role).toBe('invitee');expect(v.home.xi?.length).toBe(11)
 })
 it('refuses a wrong token, yourself, an expired invitation, and a second answer after a decline',()=>{
  const f=createFriendly('f000000000000002','tok-abcdefgh',sa,now)
  expect(acceptFriendly(f,'nope',sb,now).ok).toBe(false)
  expect(acceptFriendly(f,'tok-abcdefgh',{...sa,careerId:'other'},now).ok).toBe(false)
  const late=new Date(now.getTime()+49*3600_000);expect(statusAt(f,late.getTime())).toBe('expired');expect(acceptFriendly(f,'tok-abcdefgh',sb,late).ok).toBe(false)
  const d=closeFriendly(f,'decline',now);expect(d.ok).toBe(true);if(d.ok)expect(acceptFriendly(d.friendly,'tok-abcdefgh',sb,now).ok).toBe(false)
 })
})

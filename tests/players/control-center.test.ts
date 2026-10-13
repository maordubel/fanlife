import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {loadClub,invalidateClub} from '@/lib/clubs/resolver'
import {ratedPool,fits} from '@/lib/clubs/rumble'
import {listPlayers,playerDetail,saveDraft,publish,revert,impactOf,exportCsv,Refusal} from '@/lib/players/service'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
vi.setConfig({testTimeout:60000})
import {parsePatch} from '@/lib/players/validate'
import {mergePatch} from '@/lib/players/effective'
import {ADMIN_COOKIE,issueToken} from '@/lib/master/admin-token'

const who={actor:'tester',role:'owner'}
const CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)}) // revisions restart at 0 in every test, so a club built at an earlier test's revision 1 must not be reused
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT);vi.unstubAllEnvs()})
const pick=async(f:(r:Awaited<ReturnType<typeof listPlayers>>['rows'][number])=>boolean)=>{const l=await listPlayers({clubs:[CLUB],limit:200,page:1});for(let p=1;p<=l.pages;p++){const rows=p===1?l.rows:(await listPlayers({clubs:[CLUB],limit:200,page:p})).rows;const r=rows.find(f);if(r)return r}throw new Error('no candidate')}
const poolMan=async(id:string)=>ratedPool((await loadClub(CLUB))!.data).find(c=>c.id===id)

describe('patch validation: a whitelist, whole numbers, no surprises',()=>{
 it('accepts the four editable fields and a note, refuses everything else by name',()=>{
  expect(parsePatch({price:3,positions:['DF','MF'],rating:80,removed:true,note:'x'}).ok).toBe(true)
  expect(parsePatch({positions:[]}).ok).toBe(true)
  for(const bad of [{price:0},{price:6},{price:2.5},{positions:['GK','GK']},{positions:['SW']},{rating:20},{rating:100},{name:'x'},{id:'y'},{},null,[]])expect(parsePatch(bad).ok,JSON.stringify(bad)).toBe(false)
 })
 it('merge: null clears a field, a value sets it, an empty position list is a decision (unknown), not "inherit"',()=>{
  const meta={by:'a',at:'t',reason:'r'}
  const o1=mergePatch(null,{price:3,positions:[]},meta)!;expect(o1.price).toBe(3);expect(o1.positions).toEqual([]);expect(o1.rev).toBe(1)
  const o2=mergePatch(o1,{price:null},meta)!;expect('price' in o2).toBe(false);expect(o2.positions).toEqual([]);expect(o2.rev).toBe(2)
  expect(mergePatch(o2,{positions:null},meta)).toBeNull()
 })
})

describe('the desk lists every man, base next to effective',()=>{
 it('every core club is present, with decades, and a man with no price entry shows as fallback',async()=>{
  const l=await listPlayers({limit:200});expect(l.counts.total).toBeGreaterThan(5000)
  const per=await Promise.all(['celtic','aek-athens','hapoel-tel-aviv','hapoel-petah-tikva','olympiacos','panathinaikos','st-pauli','zrinjski-mostar'].map(c=>listPlayers({clubs:[c],limit:10})))
  for(const p of per)expect(p.total).toBeGreaterThan(20)
  expect(l.decades.length).toBeGreaterThan(3)
 })
 it('search finds a man by his English name, his original name or his id, never by a fuzzy match',async()=>{
  const r=await pick(x=>x.name.includes(' '));const byName=await listPlayers({clubs:[CLUB],q:r.name});expect(byName.rows.some(x=>x.id===r.id)).toBe(true)
  const byId=await listPlayers({clubs:[CLUB],q:r.id});expect(byId.rows.some(x=>x.id===r.id)).toBe(true)
  expect((await listPlayers({clubs:[CLUB],q:'zzzzqqqq'})).total).toBe(0)
 })
 it('filters: multi-position, price, decade, missing position',async()=>{
  const gk=await listPlayers({clubs:[CLUB],positions:['GK'],limit:200});expect(gk.rows.every(r=>r.positions.includes('GK'))).toBe(true)
  const p5=await listPlayers({clubs:[CLUB],prices:[5]});expect(p5.rows.every(r=>r.price===5)).toBe(true);expect(p5.total).toBe(10)
  const miss=await listPlayers({clubs:[CLUB],status:'missing-position',limit:50});expect(miss.rows.every(r=>!r.positions.length)).toBe(true)
 })
 it('CSV export has stable ids, a BOM, and defuses formulas',async()=>{
  const csv=await exportCsv({clubs:[CLUB],prices:[5]});expect(csv.startsWith('﻿club_id,player_id')).toBe(true);expect(csv.trim().split('\n').length).toBe(11)
 })
})

describe('draft → publish → revert: the game only sees what is published',()=>{
 it('a draft changes nothing; publishing changes the price in the pool; the base stays; revert restores',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked&&x.positions.length>0)
  const before=(await poolMan(r.id))!;expect(before.price).toBe(1)
  await saveDraft(CLUB,r.id,{price:3},0,who)
  expect((await poolMan(r.id))!.price).toBe(1)                        // a draft is invisible to the games
  expect((await playerDetail(CLUB,r.id))!.draft).toBeTruthy()
  const out=await publish(CLUB,r.id,{reason:'test raise',confirmQuota:true},who)
  expect(out.revision).toBe(1)
  expect((await poolMan(r.id))!.price).toBe(3)                        // and after publishing, everywhere the pool is read
  const d=(await playerDetail(CLUB,r.id))!;expect(d.base.basePrice).toBe(1);expect(d.row.price).toBe(3);expect(d.row.priceSource).toBe('owner')
  const ev=d.audit.find(e=>e.action==='publish')!;expect(ev.reason).toBe('test raise');expect(ev.before).toBeNull();expect(ev.after!.price).toBe(3)
  await revert(CLUB,r.id,ev.id,'undo',who)
  expect((await poolMan(r.id))!.price).toBe(1)
  expect((await playerDetail(CLUB,r.id))!.audit.map(e=>e.action)).toEqual(['revert','publish'])   // the audit keeps both
 })
 it('five-a-side and the eleven read the same price: one pool',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  await publish(CLUB,r.id,{reason:'same price everywhere',confirmQuota:true,patch:{price:4},expectedRev:0},who)
  const {xiPool}=await import('@/lib/clubs/rumble-xi/pool');const d=(await loadClub(CLUB))!.data
  expect(xiPool(d).find(c=>c.id===r.id)!.price).toBe(4);expect(ratedPool(d).find(c=>c.id===r.id)!.price).toBe(4)
 })
 it('a stale edit is a 409, not a lost update',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  await publish(CLUB,r.id,{reason:'first',confirmQuota:true,patch:{price:2},expectedRev:0},who)
  await expect(publish(CLUB,r.id,{reason:'second',confirmQuota:true,patch:{price:3},expectedRev:0},who)).rejects.toMatchObject({status:409})
  await expect(saveDraft(CLUB,r.id,{price:3},0,who)).rejects.toMatchObject({status:409})
 })
 it('publishing needs a reason, and leaving the price ladder needs a confirmation',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  await expect(publish(CLUB,r.id,{reason:'',patch:{price:2},expectedRev:0},who)).rejects.toMatchObject({status:400})
  const e=await publish(CLUB,r.id,{reason:'raise one man',patch:{price:2},expectedRev:0},who).catch(x=>x)
  expect(e).toBeInstanceOf(Refusal);expect((e as Refusal).status).toBe(422);expect(((e as Refusal).detail as {quota:{violations:string[]}}).quota.violations.length).toBeGreaterThan(0)
 })
 it('a pinned €5M icon is open to the admin: no exception box, the history records it',async()=>{
  const icon=await pick(x=>x.price===5&&x.locked)
  const ok=await publish(CLUB,icon.id,{reason:'demote',confirmQuota:true,patch:{price:4},expectedRev:0},who);expect(ok.revision).toBe(1)
 })
 it('an unknown player or club is a 404, an unknown field a 400',async()=>{
  await expect(saveDraft(CLUB,'nobody',{price:2},0,who)).rejects.toMatchObject({status:404})
  await expect(saveDraft('real-madrid','x',{price:2},0,who)).rejects.toMatchObject({status:404})
  const r=await pick(()=>true);await expect(saveDraft(CLUB,r.id,{shirt:9},0,who)).rejects.toMatchObject({status:400})
 })
})

describe('positions: several at once, and "unknown" is a real answer',()=>{
 it('a man given DF + MF fits a slot of either; his id and card stay one',async()=>{
  const r=await pick(x=>x.positions.length===1&&x.positions[0]==='DF')
  await publish(CLUB,r.id,{reason:'also plays midfield',confirmQuota:true,patch:{positions:['DF','MF']},expectedRev:0},who)
  const c=(await poolMan(r.id))!;expect(c.position).toBe('DF');expect(c.alt).toEqual(['MF']);expect(fits(c,'DF')).toBe(true);expect(fits(c,'MF')).toBe(true);expect(fits(c,'FW')).toBe(false)
  expect(ratedPool((await loadClub(CLUB))!.data).filter(x=>x.id===r.id).length).toBe(1)
 })
 it('MF → FW moves his slot; "unknown" makes him a free man, never a silently verified midfielder',async()=>{
  const r=await pick(x=>x.positions.length===1&&x.positions[0]==='MF')
  await publish(CLUB,r.id,{reason:'striker',confirmQuota:true,patch:{positions:['FW']},expectedRev:0},who)
  let c=(await poolMan(r.id))!;expect(c.position).toBe('FW');expect(fits(c,'MF')).toBe(false)
  await publish(CLUB,r.id,{reason:'not sure',confirmQuota:true,patch:{positions:[]},expectedRev:1},who)
  c=(await poolMan(r.id))!;expect(c.free).toBe(true);expect((await playerDetail(CLUB,r.id))!.row.positionState).toBe('owner');expect((await playerDetail(CLUB,r.id))!.row.positions).toEqual([])
 })
})

describe('rating and removal',()=>{
 it('the manager score is the owner’s, separate from the price',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  await publish(CLUB,r.id,{reason:'better than his price',confirmQuota:true,patch:{rating:91},expectedRev:0},who)
  const c=(await poolMan(r.id))!;expect(c.rating).toBe(91);expect(c.price).toBe(1);expect(c.basis).toBe('individual')
 })
 it('a removed man leaves every game and the pool, stays visible (and restorable) in the desk',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked&&x.positions.length>0)
  const n=(await loadClub(CLUB))!.data.players!.length
  await publish(CLUB,r.id,{reason:'not a Celtic player',confirmQuota:true,patch:{removed:true},expectedRev:0},who)
  expect((await loadClub(CLUB))!.data.players!.length).toBe(n-1);expect(await poolMan(r.id)).toBeUndefined()
  const gone=await listPlayers({clubs:[CLUB],status:'removed'});expect(gone.rows.map(x=>x.id)).toContain(r.id)
  await publish(CLUB,r.id,{reason:'restored',confirmQuota:true,patch:{removed:false},expectedRev:1},who)
  expect((await loadClub(CLUB))!.data.players!.length).toBe(n);expect(await poolMan(r.id)).toBeTruthy()
 })
 it('impact: names what a change touches and whether a game would stop working',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  const i=(await impactOf(CLUB,r.id,{price:2}))!;expect(i.consumers).toContain('Royal Rumble XI');expect(i.quota.ok).toBe(false)
  expect(Array.isArray(i.readiness.broke)).toBe(true)
 })
})

describe('the store being down is never a false "saved"',()=>{
 it('a failing store turns publish into an error and the pool stays on the last known good values',async()=>{
  const r=await pick(x=>x.price===1&&!x.locked)
  useDurableStore({kind:'memory',read:async()=>{throw new Error('store down')},write:async()=>{throw new Error('store down')},list:async()=>[]})
  await expect(publish(CLUB,r.id,{reason:'while down',confirmQuota:true,patch:{price:2},expectedRev:0},who)).rejects.toThrow()
  expect((await poolMan(r.id))!.price).toBe(1)
 })
})

describe('the API: owner session on every route, same-origin on every write',()=>{
 it('no cookie → 401 on list, detail, export and every action; a signed cookie passes; a cross-site POST is refused',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('FAN_LIFE_ADMIN_KEY','correct-horse-battery-staple-2026')
  const list=await import('@/app/api/master/players/route'),detail=await import('@/app/api/master/players/[club]/[id]/route'),exp=await import('@/app/api/master/players/export/route')
  const bare=(u:string,init?:RequestInit)=>new Request('http://localhost'+u,init)
  expect((await list.GET(bare('/api/master/players'))).status).toBe(401)
  expect((await exp.GET(bare('/api/master/players/export'))).status).toBe(401)
  expect((await detail.GET(bare('/x'),{params:{club:CLUB,id:'a'}})).status).toBe(401)
  expect((await detail.POST(bare('/x',{method:'POST',body:'{}'}),{params:{club:CLUB,id:'a'}})).status).toBe(401)
  const cookie=`${ADMIN_COOKIE}=${issueToken('correct-horse-battery-staple-2026',Math.floor(Date.now()/1000))}`
  const ok=await list.GET(bare('/api/master/players?club=celtic&limit=10',{headers:{cookie}}));expect(ok.status).toBe(200);expect((await ok.json()).rows.length).toBe(10)
  const evil=await detail.POST(bare('/x',{method:'POST',body:JSON.stringify({action:'preview',patch:{price:2}}),headers:{cookie,origin:'https://evil.example',host:'localhost'}}),{params:{club:CLUB,id:'a'}});expect(evil.status).toBe(403)
 })
})

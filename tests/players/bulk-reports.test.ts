import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,playerDetail,exportCsv} from '@/lib/players/service'
import {bulkPreview,bulkCommit} from '@/lib/players/bulk'
import {playerReports} from '@/lib/players/reports'
import {parseCsv,unquoteCell} from '@/lib/players/csv'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {loadClub,invalidateClub} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
vi.setConfig({testTimeout:90000})
const owner={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)}) // revisions restart at 0 in every test, so a club built at an earlier test's revision 1 must not be reused
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const free=async(n:number,pred:(r:{price:number;locked:boolean;positions:string[]})=>boolean=r=>r.price===1&&!r.locked)=>{const out=[];for(let p=1;out.length<n;p++){const l=await listPlayers({clubs:[CLUB],limit:200,page:p});out.push(...l.rows.filter(pred));if(p>=l.pages)break}return out.slice(0,n)}
const H='club_id,player_id,proposed_price_m,primary_position,secondary_positions,rating_override,removed,reason,expected_revision'

describe('CSV reader',()=>{
 it('reads a BOM, CRLF, quoted commas and doubled quotes',()=>{
  const rows=parseCsv('﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n\r\n2,,3\r\n');expect(rows).toEqual([['a','b','c'],['1','x, y','say "hi"'],['2','','3']])
 })
 it('a cell the export defused with a leading apostrophe is restored, once',()=>{expect(unquoteCell("'=SUM(A1)")).toBe('=SUM(A1)');expect(unquoteCell("'ok")).toBe("'ok")})
})

describe('bulk preview: every row’s fate, nothing written',()=>{
 it('changed / unchanged / missing / invalid / conflict, by id only — a name never matches',async()=>{
  const [a,b]=await free(2)
  const csv=[H,`${CLUB},${a!.id},3,DF,MF,,,raise,`,`${CLUB},${b!.id},${b!.price},,,,,same,`,`${CLUB},celtic:nobody,2,,,,,x,`,`${CLUB},${a!.id.replace('p-','q-')},2,,,,,x,`,`real-madrid,x,2,,,,,x,`,`${CLUB},${b!.id},9,,,,,dup,`].join('\n')
  const pv=await bulkPreview(csv)
  expect(pv.rows.map(r=>r.status)).toEqual(['changed','unchanged','missing','missing','missing','invalid'])
  expect(pv.rows[5]!.note).toMatch(/twice|whole number|1 to 5/i)
  expect(pv.counts.changed).toBe(1);expect(pv.clubs[0]!.club).toBe(CLUB);expect(pv.clubs[0]!.violations.length).toBeGreaterThan(0)
  expect((await playerDetail(CLUB,a!.id))!.row.price).toBe(1)    // preview wrote nothing
  expect((await bulkPreview(`${H}\n${CLUB},${a!.id},3,,,,,r,5`)).rows[0]!.status).toBe('conflict')
 })
 it('rejects a missing id column, an oversize file and too many rows',async()=>{
  await expect(bulkPreview('name,price\nx,2')).rejects.toMatchObject({status:400})
  await expect(bulkPreview('x'.repeat(1_100_000))).rejects.toMatchObject({status:400})
  await expect(bulkPreview(H+'\n'+Array.from({length:2001},(_,i)=>`${CLUB},id${i},2,,,,,r,`).join('\n'))).rejects.toMatchObject({status:400})
 })
})

describe('bulk commit: one revision, all or nothing, once',()=>{
 it('applies the whole batch in one revision, with an audit line per man, and replays idempotently',async()=>{
  const [a,b]=await free(2)
  const csv=`${H}\n${CLUB},${a!.id},3,DF,MF,84,,r,\n${CLUB},${b!.id},2,GK,,,,r,`
  const pv=await bulkPreview(csv)
  await expect(bulkCommit(csv,{token:'wrong',idempotencyKey:'key-0001-aaaa',reason:'batch test'},owner)).rejects.toMatchObject({status:409})
  await expect(bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0001-aaaa',reason:'batch test'},owner)).rejects.toMatchObject({status:422})   // off the ladder: needs the exception
  const r=await bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0001-aaaa',reason:'batch test',confirmQuota:true},owner)
  expect(r).toMatchObject({replayed:false,revision:1,changed:2})
  const pool=ratedPool((await loadClub(CLUB))!.data);const pa=pool.find(c=>c.id===a!.id)!,pb=pool.find(c=>c.id===b!.id)!
  expect(pa.price).toBe(3);expect(pa.rating).toBe(84);expect(pa.alt).toEqual(['MF']);expect(pb.price).toBe(2);expect(pb.position).toBe('GK')
  const d=(await playerDetail(CLUB,a!.id))!;expect(d.audit[0]!.reason).toContain('batch key-0001-aaaa')
  const again=await bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0001-aaaa',reason:'batch test',confirmQuota:true},owner)
  expect(again.replayed).toBe(true);expect((await playerDetail(CLUB,a!.id))!.row.rev).toBe(1)    // not written twice
 })
 it('one bad row refuses the whole file: nothing is written',async()=>{
  const [a]=await free(1)
  const csv=`${H}\n${CLUB},${a!.id},3,,,,,r,\n${CLUB},celtic:nobody,2,,,,,r,`;const pv=await bulkPreview(csv)
  await expect(bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0002-bbbb',reason:'x y z',confirmQuota:true},owner)).rejects.toMatchObject({status:422})
  expect((await playerDetail(CLUB,a!.id))!.row.price).toBe(1)
 })
 it('a locked price is open to the admin (13.10.2026); a key and a reason are still required',async()=>{
  const icon=(await free(1,r=>r.price===5&&r.locked))[0]!
  const csv=`${H}\n${CLUB},${icon.id},4,,,,,demote,`;const pv=await bulkPreview(csv);expect(pv.lockedRows).toBe(1)
  await expect(bulkCommit(csv,{token:pv.token,idempotencyKey:'',reason:'demote',confirmQuota:true,ownerException:true},owner)).rejects.toMatchObject({status:400})
  await expect(bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0003-cccc',reason:'',confirmQuota:true,ownerException:true},owner)).rejects.toMatchObject({status:400})
  expect((await bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0003-cccc',reason:'demote',confirmQuota:true},owner)).revision).toBe(1)
 })
 it('inherit clears an override, unknown makes a free man, removed takes him out',async()=>{
  const [a,b]=await free(2,r=>r.price===1&&!r.locked&&r.positions.length>0)
  let csv=`${H}\n${CLUB},${a!.id},,unknown,,,,r,\n${CLUB},${b!.id},,,,,true,r,`;let pv=await bulkPreview(csv)
  await bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0004-dddd',reason:'cleanup',confirmQuota:true},owner)
  const pool=ratedPool((await loadClub(CLUB))!.data);expect(pool.find(c=>c.id===a!.id)!.free).toBe(true);expect(pool.find(c=>c.id===b!.id)).toBeUndefined()
  csv=`${H}\n${CLUB},${a!.id},,inherit,,,,r,\n${CLUB},${b!.id},,,,,false,r,`;pv=await bulkPreview(csv)
  await bulkCommit(csv,{token:pv.token,idempotencyKey:'key-0005-eeee',reason:'undo',confirmQuota:true},owner)
  const after=ratedPool((await loadClub(CLUB))!.data);expect(after.find(c=>c.id===a!.id)!.free).toBeFalsy();expect(after.find(c=>c.id===b!.id)).toBeTruthy()
 })
 it('the export round-trips: every exported row re-imports as unchanged',async()=>{
  const csv=await exportCsv({clubs:[CLUB],prices:[5]});const rows=parseCsv(csv),h=rows[0]!
  const mine=[H,...rows.slice(1).map(r=>`${r[h.indexOf('club_id')]},${r[h.indexOf('player_id')]},${r[h.indexOf('price_m')]},,,,,r,`)].join('\n')
  expect((await bulkPreview(mine)).counts).toMatchObject({unchanged:10,changed:0})
 })
})

describe('reports: working lists that change nothing',()=>{
 it('missing positions, price outliers with a reasoned recommendation, exact-name twins, per-club distribution',async()=>{
  const r=await playerReports([CLUB],50)
  expect(r.missingTotal).toBeGreaterThan(0);expect(r.missing.length).toBeLessThanOrEqual(50);expect(r.missing[0]!.rating).toBeGreaterThanOrEqual(r.missing.at(-1)!.rating)
  for(const o of r.outliers)expect(Math.abs(o.recommended-o.price)).toBeGreaterThanOrEqual(2)
  for(const t of r.twins){expect(new Set(t.members.map(m=>m.id)).size).toBe(t.members.length);expect(t.members.length).toBeGreaterThan(1)}
  expect(r.distribution).toHaveLength(1);expect(Object.values(r.distribution[0]!.have).reduce((a,b)=>a+b,0)).toBe(r.distribution[0]!.n)
  expect(new Set(r.outliers.map(o=>o.id)).size).toBe(r.outliers.length)
 })
})

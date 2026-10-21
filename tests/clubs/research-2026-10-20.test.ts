import {describe,it,expect} from 'vitest'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {loadClubBase} from '@/lib/clubs/resolver'

type W={clubId:string;matches:{id:string;status:string;value:{on:string;homeGoals:number;awayGoals:number;score:string;name:string;us?:string}}[]}
const wave=(c:string):W=>JSON.parse(readFileSync(`club-packs/${c}/wave-history-2026-10-20.json`,'utf8'))
const OPEN=['aek-athens','celtic','olympiacos','panathinaikos','st-pauli','zrinjski-mostar']

describe('research bundle 2026-10-20',()=>{
 for(const id of OPEN)it(`${id}: every approved record reaches the club or is reported as a conflict`,async()=>{
  const w=wave(id),approved=w.matches.filter(m=>m.status==='approved')
  expect(approved.length).toBe(w.matches.length)
  for(const m of approved){expect(m.value.score).toBe(`${m.value.homeGoals}-${m.value.awayGoals}`);expect(m.value.name).not.toMatch(/\([A-Z]{3}\)/);expect(['home','away']).toContain(m.value.us)}
  const r=(await loadClubBase(id))!,here=new Set(r.data.matches!.map(f=>f.id))
  const conflicted=new Set(r.diagnostics.filter(x=>x.code==='HISTORY_CONFLICT').map(x=>x.record))
  const missing=approved.filter(m=>!here.has(m.id)&&!conflicted.has(m.id))
  // a record may also have been corroborated into an existing match (it keeps the older id)
  const corroborated=missing.filter(m=>r.data.matches!.some(f=>(f.value as {on?:string}).on===m.value.on))
  expect(missing.length-corroborated.length).toBe(0)
 },60000)
 it('unopened clubs are staged, never wired, and none is approved',()=>{
  const dirs=readdirSync('research-staging').filter(d=>existsSync(`research-staging/${d}/wave-history-2026-10-20.json`))
  expect(dirs.length).toBeGreaterThanOrEqual(10)
  for(const d of dirs){const w=JSON.parse(readFileSync(`research-staging/${d}/wave-history-2026-10-20.json`,'utf8')) as W;expect(w.matches.every(m=>m.status==='review')).toBe(true);expect(existsSync(`club-packs/${d}`)).toBe(false)}
 })
 it('only CC0 sources feed the new waves',()=>{
  for(const id of OPEN){const w=JSON.parse(readFileSync(`club-packs/${id}/wave-history-2026-10-20.json`,'utf8')) as {sources:{license?:string}[]};expect(w.sources.every(s=>s.license==='CC0-1.0')).toBe(true)}
 })
})

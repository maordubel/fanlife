import {describe,it,expect} from 'vitest'
import raw from '@/tests/fixtures/hapoel-petah-tikva-core-m1.json'
import {compilePack} from '@/lib/clubs/compiler'
import {eligibleArchive} from '@/lib/clubs/archive'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
const registry=REGISTRY.find(c=>c.id==='hapoel-petah-tikva')!
describe('Hapoel Petah Tikva sourced core',()=>{
 it('keeps year-only honours in the archive and out of date-based games',()=>{
  const {data,diagnostics}=compilePack(raw,registry),honours=data.archive.filter(f=>f.value.precision==='year')
  expect(honours).toHaveLength(13);expect(honours.every(f=>f.value.on===null)).toBe(true)
  expect(honours.slice(0,6).map(f=>f.value.year)).toEqual([1955,1959,1960,1961,1962,1963])
  expect(data.timeline).toHaveLength(11);expect(data.trivia.questions).toHaveLength(11)
  expect(data.memory).toHaveLength(11);expect(eligibleArchive(data)).toHaveLength(45)
  expect(diagnostics.filter(d=>d.code!=='EXACT_DATE_REQUIRED')).toEqual([])
  expect(data.timeline.every(f=>f.value.on>='2025-05-19'&&f.value.on<='2026-09-18')).toBe(true)
 })
 it('preserves unknown player roles and career years without claiming a complete XI archive',async()=>{
  const {data}=(await loadClub(registry.id))!
  expect(data.players!.length).toBeGreaterThanOrEqual(21)
  expect(data.players?.find(p=>p.id.endsWith(':noam-cohen'))?.value.positions).toEqual([])
  expect(data.players?.find(p=>p.id.endsWith(':omer-katz'))?.value.positions).toEqual(['GK'])
  expect(data.gates.xi.state).toBe('PARTIAL');expect(data.gates.xi.playable).toBe(true)
  expect(data.gates.polls?.playable).toBe(true);expect(data.gates['blind-cow']?.playable).toBe(data.mysteries.length>0)
  expect(data.locales.content).toBe('he');expect(data.theme.primary).toBe('#1F4E9C')
  expect(data.theme.colorPolicy.status).toBe('pending');expect(data.life.state).toBe('unavailable')
 })
 it('withdraws dependent gameplay and player identities when their corroborating sources are blocked',()=>{
  const pack=structuredClone(raw)
  for(const source of pack.sources)if(source.publisher==='HPT Museum')source.access='blocked'
  const {data}=compilePack(pack,registry)
  expect(data.timeline).toEqual([]);expect(data.trivia.questions).toEqual([])
  expect(data.memory).toEqual([]);expect(data.players).toEqual([]);expect(eligibleArchive(data)).toEqual([])
  expect(data.gates.timeline.playable).toBe(false);expect(data.gates.xi.playable).toBe(false)
 })
 it('uses the registered host as authority and rejects foreign club paths',()=>{
  expect(resolveClubId('hapoelpetahtikva.fanlife.game',registry.id,true)).toBe(registry.id)
  expect(resolveClubId('hapoelpetahtikva.fanlife.game','zrinjski-mostar',true)).toBeNull()
 })
})

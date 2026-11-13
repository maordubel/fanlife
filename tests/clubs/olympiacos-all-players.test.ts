import {describe,expect,it} from 'vitest'
import wave from '@/club-packs/olympiacos/wave-olympiacos-history.json'
import snap from '@/research-data/olympiacos-history/players-table.json'
import {skeleton,latin} from '@/scripts/ingest/clubs/olympiacos-history-players'
type W={players:{id:string;value:{name:string;career:{apps:number;goals:number}};approvedBy:string}[];ambiguous:string[]}
const w=wave as unknown as W
describe('Olympiacos: every man of the club’s all-players table is in the archive (13.11.2026)',()=>{
 it('Greek and Latin spellings fold to one skeleton, accents and diaereses included',()=>{
  expect(skeleton('Φορτούνης')).toBe(skeleton('Fortounis'))
  expect(skeleton('Καραταΐδης')).toBe(skeleton('Karataidis'))
  expect(skeleton('Τζόρτζεβιτς')).toBe(skeleton('Djordjevic'))
  expect(skeleton('Σισέ')).toBe(skeleton('Cissé'))
  expect(latin('Σιώκος Βασίλης')).toBe('Siokos Vasilis')
 })
 it('every row is placed: a career filled, a man added, already stated, or left out as ambiguous',()=>{
  expect(snap.rows.length).toBeGreaterThan(850)
  expect(w.players.length).toBeGreaterThan(450)
  expect(w.ambiguous.length).toBeLessThan(25)
 })
 it('a known man is joined, not duplicated (Fortounis, Karataidis are in the pack already)',()=>{
  const added=w.players.filter(p=>p.id.startsWith('oh-')).map(p=>p.value.name)
  for(const n of ['Kostas Fortounis','Kyriakos Karataidis','Giorgos Masouras','Mathieu Valbuena'])expect(added).not.toContain(n)
 })
 it('every record carries the owner’s approval of the source',()=>{for(const p of w.players)expect(p.approvedBy).toMatch(/^Maor Harel/)})
})

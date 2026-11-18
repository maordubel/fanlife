import {describe,expect,it} from 'vitest'
import data from '@/content/manual/legends-fm-ratings.json'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {createCareer} from '@/lib/legends/career'
import {fmGameAttrs,fmRaw,fmScaled,fmSheet,KEY_ATTRS,levelOf} from '@/lib/legends/fm'
import {careerView} from '@/lib/legends/view'
import {LEAGUE} from './fixtures'

/** 18.11.2026 — manager ratings: real shape from the research pack, level from the stars, hidden outside the manager's own squad */
const F=data as unknown as {keys:string[];men:Record<string,{r:string;v:string;k:number;s:string;e?:string}>;counts:{observed:number;partial:number;estimated:number}}
describe('manager ratings · the data',()=>{
 it('every row is 47 slots of A–T or "." and an outfield man carries no goalkeeping attributes',()=>{
  expect(F.keys).toHaveLength(47)
  for(const r of Object.values(F.men)){expect(r.v).toMatch(/^[A-T.]{47}$/);if(r.r!=='GK')expect(r.v.slice(36)).toBe('.'.repeat(11))}
  expect(F.counts.observed+F.counts.partial).toBeGreaterThan(2500)
 })
 it('a profile matched by name only outside his years is refused (a 1997 Stenhousemuir Scott Brown is not Celtic\'s captain)',()=>{
  const r=F.men['celtic:p-10312c3e5265d5'];expect(r?.e).not.toBe('CM 97/98')
 })
})
describe('manager ratings · fair between clubs',()=>{
 it('the level follows the stars, whatever the source: two five-star men read the same 1–20 level',()=>{
  const a=fmSheet('celtic','celtic:p-10312c3e5265d5','MF',5),b=fmSheet('atalanta','atalanta:nobody','MF',5)
  expect(Math.abs(a.ability-b.ability)).toBeLessThan(1.2);expect(a.ability).toBeGreaterThan(15);expect(levelOf(1)).toBe(8)
  const low=fmSheet('celtic','celtic:p-10312c3e5265d5','MF',1.5);expect(low.ability).toBeLessThan(10.5)
 })
 it('the shape stays his own: game attributes sit within a star and a quarter of his stars',()=>{
  const raw=fmRaw('hapoel-tel-aviv','unknown-man','FW');for(const v of Object.values(fmGameAttrs(raw,3,'FW')))expect(Math.abs(v-3)).toBeLessThanOrEqual(1.25)
  expect(Object.values(fmScaled(raw,3)).every(v=>v>=1&&v<=20)).toBe(true)
 })
 it('a man with no game data is a scout\'s estimate and says so',()=>{
  const s=fmSheet('maccabi-haifa','maccabi-haifa:p-u-none','GK',3);expect(s.source).toBe('estimate');expect(s.groups.map(g=>g.id)).toEqual(['goalkeeping','mental','physical'])
  expect(s.best.every(k=>KEY_ATTRS.GK.includes(k))).toBe(true)
 })
})
describe('manager ratings · hidden outside the squad',()=>{
 it('draft offers carry no ratings; the men he signs carry the sheet',()=>{
  const r=createCareer({id:'f'.repeat(16),owner:'o'.repeat(32),now:'2026-11-18T10:00:00.000Z',own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
  const v=careerView(r.career)
  for(const s of v.squad){expect(s.fm).toBeDefined();expect(Object.keys(s.attrs).length).toBeGreaterThan(0)}
  for(const o of v.draft?.offers??[]){expect(o.attrs).toEqual({});expect(o.fm).toBeUndefined()}
  for(const o of v.window?.offers??[]){expect(o.attrs).toEqual({});expect(o.fm).toBeUndefined()}
  expect(JSON.stringify(v.clubs)).not.toMatch(/"attrs"|"fm"/)
 })
})
describe('manager ratings · reachable',()=>{
 it('a man on the pitch opens his profile from the tray (not only men outside the matchday squad)',async()=>{
  const {readFileSync}=await import('node:fs');const t=readFileSync('components/legends/TeamSheet.tsx','utf8')
  expect(t).toMatch(/onClick=\{\(\)=>\{setCard\(held\.squad!\);setSel\(null\)\}\} data-testid="legends-open-profile">Profile</)
 })
})

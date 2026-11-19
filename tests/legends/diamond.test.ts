import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {BALL_TRAIL_FROM,MOW_CROSS,NET_SHAKE,ballRadius} from '@/components/highlights/paint'

const read=(p:string)=>readFileSync(p,'utf8')

describe('Legends · the polish round of 19.11.2026',()=>{
 it('Given the camera scale, When the ball is drawn, Then it is never smaller than the old ball and two pixels across near the camera',()=>{
  expect(ballRadius(1.3)).toBe(2);expect(ballRadius(1)).toBe(1.5);expect(ballRadius(.8)).toBeGreaterThanOrEqual(1.25)
 })
 it('Given the picture effects, Then they stay small: a short shake, a faint cross-cut, a trail only for a struck ball',()=>{
  expect(NET_SHAKE.for).toBeLessThanOrEqual(.4);expect(NET_SHAKE.px).toBeLessThanOrEqual(2)
  expect(MOW_CROSS).toBeGreaterThan(0);expect(MOW_CROSS).toBeLessThanOrEqual(.12);expect(BALL_TRAIL_FROM).toBeGreaterThan(8)
 })
 it('Given kick-off, Then the flow is one card and the dressing room: the eleven is confirmed on the matchday card, read by slot',()=>{
  const pre=read('components/legends/PreMatch.tsx'),talk=read('components/legends/Talk.tsx')
  expect(pre).not.toContain('export function LineupConfirm')
  expect(pre).toContain('legends-lineup-confirm');expect(pre).toContain('v.lineup.slots[i]?.family')
  expect(talk).toContain("if(t.when==='pre')kickoffNow()");expect(talk).not.toContain("'lineup'")
 })
 it('Given matchday, Then a phone reads it in three pages and every part says which page it is on',()=>{
  const app=read('components/legends/CareerApp.tsx'),css=read('app/all-football/legends/diamond.css')
  for(const k of ['next','last','table']){expect(app).toContain(`data-in="${k}"`);expect(css).toContain(`[data-part='${k}']`)}
  expect(css).toMatch(/@media \(min-width: 900px\) \{ \.lgm-md-seg \{ display: none; \} \}/)
 })
 it('Given the round sheet, Then it is in the style index (rule 120) and paints with tokens only',()=>{
  expect(read('app/all-football/legends/styles.ts')).toContain("import './diamond.css'")
  expect(read('app/all-football/legends/diamond.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
 })
 it('Given the seventeen are in and no eighteenth fits, Then the draft shows Register and no dead controls',()=>{
  const d=read('components/legends/DraftRoom.tsx')
  expect(d).toContain('const noExtra=d.optionalOpen&&!d.group&&d.lines.every(g=>!g.open),closing=done||noExtra')
  expect(d.indexOf('data-testid="legends-register"')).toBeLessThan(d.indexOf('data-testid="legends-lines"'))
 })
})

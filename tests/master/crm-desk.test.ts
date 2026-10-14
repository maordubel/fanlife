import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {applyTaskAction,deskView,EMPTY_FLOW,fromAttention,parseTaskAction,playerTasks,type Task} from '@/lib/master/crm/tasks'
import {cellOf} from '@/lib/master/crm/games'
import {SECTIONS,TOOLS} from '@/lib/master/crm/areas'
import type {AttentionItem} from '@/lib/master/attention'

const item=(id:string,priority:1|2|3,club:string|null,reason='r'):AttentionItem=>({id,priority,club,clubName:club?club.toUpperCase():null,title:`t ${id}`,reason,href:'/x',cta:'Go'})
const now=new Date('2026-10-12T09:00:00Z')

describe('the task desk (CRM 1 §7)',()=>{
 it('attention rules become tasks with an area and an evidence fingerprint',()=>{
  const t=fromAttention([item('storage',1,null),item('findings:olympiacos',2,'olympiacos'),item('job:abc',2,'aek-athens')])
  expect(t.map(x=>x.area)).toEqual(['system','research','research'])
  expect(new Set(t.map(x=>x.evidence)).size).toBe(3)
 })
 it('player reports become one task per club and kind, counted from the report',()=>{
  const t=playerTasks([{club:'olympiacos',clubName:'Olympiacos',missing:3,twins:0,outliers:1}])
  expect(t.map(x=>x.key)).toEqual(['players:missing:olympiacos','players:outliers:olympiacos'])
  expect(t[0]!.title).toBe('3 players have no position')
  expect(t[0]!.href).toContain('section=players')
 })
 it('the same issue appears once, sorted blocking first',()=>{
  const v=deskView(fromAttention([item('gates:b',3,'b'),item('activation:a',1,'a'),item('changed:a',2,'a')]),EMPTY_FLOW,now)
  expect(v.open.map(t=>t.key)).toEqual(['activation:a','changed:a','gates:b'])
  expect(v.counts).toMatchObject({blocking:1,decide:1,look:1})
 })
 it('a dismissal holds only while the evidence is the same — a new count comes back',()=>{
  const tasks=fromAttention([item('findings:a',2,'a','3 to decide')])
  const flow=applyTaskAction(EMPTY_FLOW,{op:'dismiss',key:'findings:a',reason:'waiting on the club'},tasks[0]!.evidence,now,'owner')
  expect(deskView(tasks,flow,now).dismissed).toHaveLength(1)
  const changed=fromAttention([item('findings:a',2,'a','4 to decide')])
  const v=deskView(changed,flow,now)
  expect(v.open.map(t=>t.key)).toEqual(['findings:a']);expect(v.dismissed).toHaveLength(0)
 })
 it('a snooze lasts until its date, then the task is open again',()=>{
  const tasks=fromAttention([item('parser:a',3,'a')])
  const flow=applyTaskAction(EMPTY_FLOW,{op:'snooze',key:'parser:a',days:3,reason:'parser next week'},tasks[0]!.evidence,now,'owner')
  expect(deskView(tasks,flow,now).snoozed).toHaveLength(1)
  expect(deskView(tasks,flow,new Date(now.getTime()+4*86_400_000)).open).toHaveLength(1)
 })
 it('a task is resolved only when its check stops reporting it — never by a click',()=>{
  const tasks=fromAttention([item('blocked:a',3,'a')])
  const flow=applyTaskAction(EMPTY_FLOW,{op:'dismiss',key:'blocked:a',reason:'source refused'},tasks[0]!.evidence,now,'owner')
  const v=deskView([],flow,now)
  expect(v.cleared.map(c=>c.key)).toEqual(['blocked:a'])
  expect(()=>applyTaskAction(EMPTY_FLOW,{op:'dismiss',key:'gone:x',reason:'x'},null,now,'owner')).toThrow(/no longer reported/)
 })
 it('actions are strict: a reason is required and snooze lengths are fixed',()=>{
  expect(parseTaskAction({op:'dismiss',key:'storage'})).toMatchObject({ok:false})
  expect(parseTaskAction({op:'snooze',key:'storage',days:2,reason:'x'})).toMatchObject({ok:false})
  expect(parseTaskAction({op:'snooze',key:'players:missing:olympiacos',days:7,reason:'x'})).toMatchObject({ok:true})
  expect(parseTaskAction({op:'delete',key:'storage'})).toMatchObject({ok:false})
  expect(parseTaskAction({op:'restore',key:'../../etc'})).toMatchObject({ok:false})
 })
 it('a decision older than ninety days is dropped from the file',()=>{
  const old={v:1 as const,decisions:{'x:1':{state:'dismissed' as const,until:null,reason:'r',evidence:'e',at:'2026-01-01T00:00:00Z',by:'o'}}}
  expect(applyTaskAction(old,{op:'restore',key:'y:2'},null,now,'o').decisions).toEqual({})
 })
})

describe('the desk frame and the games matrix',()=>{
 it('seven work areas, then the tools — old section keys still exist',()=>{
  expect(SECTIONS.map(s=>s.key)).toEqual(['overview','clubs','players','games','market','community','audience'])
  expect(TOOLS.map(s=>s.key)).toEqual(['data','operations','advertising','settings'])
  const page=readFileSync('app/master/admin/page.tsx','utf8')
  expect(page).toMatch(/section==='data'&&view==='players'\)section='players'/)
  expect(page).toMatch(/LEGACY:Record<string/)
 })
 it('market and community are the same consoles inside the frame — the database still decides',()=>{
  const src=readFileSync('components/master/desk/MarketDesk.tsx','utf8')
  expect(src).toContain('<AdminGate/>');expect(src).toContain('<AdminContributions/>')
  expect(src).not.toMatch(/supabase|rpc\(|service_role/i)
 })
 it('a cell separates what the data can play from what fans can enter',()=>{
  const g={key:'trivia' as const,number:2,state:'READY' as const,eligible:60,target:60,dataPlayable:true,full:true,access:'switched-off' as const,openNow:false,reason:null}
  expect(cellOf(g).state).toBe('ready-off')
  expect(cellOf({...g,openNow:true,access:'open'}).state).toBe('open')
  expect(cellOf({...g,full:false}).state).toBe('partial')
  expect(cellOf({...g,dataPlayable:false}).state).toBe('locked')
  expect(cellOf(undefined).state).toBe('no-pack')
 })
 it('every desk task links into the control room',()=>{
  const tasks:Task[]=[...fromAttention([item('storage',1,null)]),...playerTasks([{club:'a',clubName:'A',missing:1,twins:1,outliers:1}])]
  for(const t of tasks)expect(t.href.startsWith('/master/admin?')||t.href==='/x').toBe(true)
 })
})

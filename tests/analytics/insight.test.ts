import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {readFileSync} from 'node:fs'
import {cleanHit,clubOfPath,readAgent,sourceOf} from '@/lib/analytics/insight'
import {composeInsightDigest,periodOf,shiftDay,type Report} from '@/lib/analytics/insight-report'

describe('FAN LIFE INSIGHT (17.11.2026)',()=>{
 it('keeps a clean hit and drops a malformed one',()=>{
  expect(cleanHit({kind:'view',path:'/clubs/olympiacos/trivia?x=1#top',source:'Instagram',ref:'www.l.instagram.com'})).toEqual({kind:'view',path:'/clubs/olympiacos/trivia?x=1',club:'olympiacos',source:'instagram',ref:'l.instagram.com'})
  expect(cleanHit({kind:'leave',path:'/',dwell:1e12,scroll:140})).toEqual({kind:'leave',path:'/',dwell:86_400_000,scroll:100})
  expect(cleanHit({kind:'click',path:'/',dwell:5})).toEqual({kind:'click',path:'/'})
  expect(cleanHit({kind:'hack',path:'/'})).toBeNull()
  expect(cleanHit({kind:'view',path:'https://evil.example/'})).toBeNull()
  expect(clubOfPath('/clubs/aek-athens')).toBe('aek-athens');expect(clubOfPath('/shop')).toBeUndefined()
 })
 it('names where a visit came from',()=>{
  expect(sourceOf('l.instagram.com',undefined,'fanlife.dubelteam.com')).toBe('instagram')
  expect(sourceOf('www.google.gr',undefined,'fanlife.dubelteam.com')).toBe('google')
  expect(sourceOf('t.co',undefined,'x')).toBe('x')
  expect(sourceOf(undefined,undefined,'x')).toBe('direct')
  expect(sourceOf('anything.org','newsletter','x')).toBe('newsletter')
  expect(sourceOf('fanlife.dubelteam.com',undefined,'fanlife.dubelteam.com')).toBe('direct')
 })
 it('reads only the family of a user-agent, and knows a bot',()=>{
  expect(readAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toEqual({device:'mobile',os:'iOS',browser:'Safari',bot:false})
  expect(readAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120').browser).toBe('Edge')
  expect(readAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/120 Safari/537.36').device).toBe('tablet')
  expect(readAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').bot).toBe(true)
  expect(readAgent('Mozilla/5.0 (iPhone) Instagram 300.0').browser).toBe('In app')
 })
 it('reads a period from the address, never longer than 180 days',()=>{
  const p=periodOf({from:'2020-01-01',to:'2026-01-31'});expect(p.from).toBe(shiftDay('2026-01-31',-179));expect(p.preset).toBeNull()
  expect(periodOf({range:'yesterday'}).from).toBe(periodOf({range:'yesterday'}).to)
  expect(periodOf({}).preset).toBe('7')
 })
 it('writes the morning digest from the report alone',()=>{
  const z={views:0,visitors:0,new:0,returning:0,sessions:0,clicks:0,avgSessionSec:0,pagesPerSession:0,bounceRate:0,avgPageSec:0}
  const r={from:'2026-11-16',to:'2026-11-16',days:1,totals:{...z,views:120,visitors:40,new:30,returning:10,sessions:52,clicks:77,avgSessionSec:95,pagesPerSession:2.3,bounceRate:41},previous:{...z,visitors:20,views:120},
   series:[],grid:[],hours:[[21,30,12]],weekdays:[],pages:[{key:'/',views:50}],entries:[],exits:[],clubs:[{key:'olympiacos',views:40}],sources:[{key:'instagram',sessions:20}],mediums:[],campaigns:[],referrers:[],
   countries:[{key:'GR',visitors:25}],cities:[{key:'Athens',visitors:20}],devices:[{key:'mobile',visitors:35}],os:[],browsers:[],langs:[],screens:[],clicks:[{key:'Play <now>',n:9}],events:[],depth:[],sessionLength:[],loyalty:[]} as unknown as Report
  const m=composeInsightDigest(r,null,'https://fanlife.dubelteam.com')
  expect(m).toContain('<b>40</b> visitors (▲100%)');expect(m).toContain('busiest hour 21:00');expect(m).toContain('🇬🇷 25');expect(m).toContain('Play &lt;now&gt;')
  expect(m).toContain('/master/admin?section=audience')
 })
 it('the database keeps no address and no user-agent, and only the server role reads it',()=>{
  const sql=readFileSync('supabase/migrations/20261117150000_worker_insight.sql','utf8')
  expect(sql).not.toMatch(/\bip\b\s+(text|inet)|user_agent|\bua\s+text/i)
  expect(sql).toMatch(/grant execute on function public\.worker_insight_report\([^)]*\) to service_role;/)
  expect(sql).toMatch(/revoke all on function public\.worker_insight_report\([^)]*\) from public, anon, authenticated;/)
  expect(sql).toMatch(/cron\.schedule\('fanlife:insight-sweep'/)
 })
})

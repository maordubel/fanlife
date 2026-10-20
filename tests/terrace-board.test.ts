import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {NICK} from '@/lib/terrace/board'

const sql=readFileSync('supabase/migrations/20261020090000_worker_terrace_board.sql','utf8').replace(/\/\*[\s\S]*?\*\//g,'')
describe('terrace board',()=>{
 it('accepts plain names, refuses links and symbols',()=>{
  for(const ok of ['Dina','Red 7','אדום_10','a.b-c'])expect(NICK.test(ok)).toBe(true)
  for(const bad of ['x','a'.repeat(21),'<b>hi</b>','me@x.com','🔥🔥'])expect(NICK.test(bad)).toBe(false)
 })
 it('the table and functions are closed to the browser (rules 76/89)',()=>{
  expect(sql).toMatch(/enable row level security/)
  expect(sql).toMatch(/revoke all on public\.worker_terrace_score from public, anon, authenticated/)
  expect(sql).toMatch(/to service_role/)
  expect(sql).not.toMatch(/grant [^;]*\bto (anon|authenticated|public)\b/i)
  expect(sql).not.toMatch(/auth\.|create trigger/i)
  const made=[...sql.matchAll(/create (?:table|index|or replace function|function)(?: if not exists)? (?:\w+ on )?public\.(\w+)|create index(?: if not exists)? (\w+)/gi)].map(m=>m[1]??m[2])
  expect(made.length).toBeGreaterThan(2);expect(made.every(n=>n!.startsWith('worker_'))).toBe(true)
 })
 it('the browser never sends a score',()=>{
  const a=readFileSync('app/clubs/[slug]/daily/actions.ts','utf8')
  expect(a).toMatch(/joinTerraceBoard\(slug: string, nick: string\)/)
})
})

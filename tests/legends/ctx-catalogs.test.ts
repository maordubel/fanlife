import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'

/** 17.11.2026 — a move that does not read other clubs' catalogs must not load them; one that does must (career.ts is the truth) */
describe('which moves read the league catalogs',()=>{
 it('every case in career.ts that touches ctx.catalogs or prepareSide/commit is in NEEDS_CATALOGS',()=>{
  const src=readFileSync('lib/legends/career.ts','utf8'),act=readFileSync('app/all-football/legends/actions.ts','utf8')
  const needs=new Set([...act.matchAll(/NEEDS_CATALOGS=new Set\(\[([^\]]*)\]\)/g)].flatMap(m=>m[1]!.split(',').map(x=>x.trim().replace(/'/g,''))))
  const body=src.slice(src.indexOf('function step('),src.indexOf('function prepareSide('))
  const cases=[...body.matchAll(/case '([a-z-]+)':(?:case '([a-z-]+)':)?\{?([\s\S]*?)(?=\n  case '|\n \}\n)/g)]
  expect(cases.length).toBeGreaterThan(15)
  for(const m of cases){const uses=/ctx\.catalogs|prepareSide|commitMine|commitRound/.test(m[3]!);for(const k of [m[1],m[2]].filter(Boolean))if(uses)expect(needs.has(k!),k).toBe(true)}
 })
})

import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {FORMATIONS as GATE_XI} from '@/lib/game/formations'
import {FORMATIONS as RUMBLE_XI} from '@/lib/clubs/rumble-xi/formations'

/** Left is left: every pitch table measures x from the physical left edge (owner, 16.11.2026). */
const LEFT=new Set(['LB','LWB','LM','LW']),RIGHT=new Set(['RB','RWB','RM','RW'])

describe('pitch sides',()=>{
 it('gate 1 formations put left roles on the left',()=>{
  for(const f of Object.values(GATE_XI))for(const s of f.slots){
   if(LEFT.has(s.role))expect(s.x,`${f.name} ${s.slotId} ${s.role}`).toBeLessThan(50)
   if(RIGHT.has(s.role))expect(s.x,`${f.name} ${s.slotId} ${s.role}`).toBeGreaterThan(50)
  }
 })
 it('rumble / legends formations put left roles on the left',()=>{
  for(const [id,slots] of Object.entries(RUMBLE_XI))for(const s of slots){
   if(LEFT.has(s.fine))expect(s.x,`${id} ${s.id}`).toBeLessThan(50)
   if(RIGHT.has(s.fine))expect(s.x,`${id} ${s.id}`).toBeGreaterThan(50)
  }
 })
 it('no surface mirrors a formation x',()=>{
  for(const f of ['app/api/shop/personal/route.ts','components/roster/RosterSheet.tsx'])
   expect(readFileSync(f,'utf8'),f).not.toMatch(/100 ?- ?(s|slot)\.x\b/)
 })
})

import type {Pos} from '../rumble'
import type {FormationId,XISlot} from './types'

const S=(id:string,fine:XISlot['fine'],family:Pos,x:number,y:number):XISlot=>({id,fine,family,x,y})

/**
 * Where eleven stand. The archive records four broad positions (GK · DF · MF · FW), so a slot's FAMILY is what a card must
 * match; the fine label (LB, DM, LW …) is where the man stands, and the screen says so: "general position — fit estimated".
 * y: 84 is his own goal line, 20 the far end (the same axis `PITCH_SLOTS` uses).
 */
export const FORMATIONS:Readonly<Record<FormationId,readonly XISlot[]>>={
 '4-3-3':[S('gk','GK','GK',50,84),S('lb','LB','DF',13,67),S('lcb','CB','DF',37,70),S('rcb','CB','DF',63,70),S('rb','RB','DF',87,67),S('lcm','CM','MF',29,48),S('dm','DM','MF',50,58),S('rcm','CM','MF',71,48),S('lw','LW','FW',15,27),S('st','ST','FW',50,20),S('rw','RW','FW',85,27)],
 '4-4-2':[S('gk','GK','GK',50,84),S('lb','LB','DF',13,67),S('lcb','CB','DF',37,70),S('rcb','CB','DF',63,70),S('rb','RB','DF',87,67),S('lm','LM','MF',12,46),S('lcm','CM','MF',37,52),S('rcm','CM','MF',63,52),S('rm','RM','MF',88,46),S('lst','ST','FW',38,22),S('rst','ST','FW',62,22)],
 '3-5-2':[S('gk','GK','GK',50,84),S('lcb','CB','DF',25,70),S('cb','CB','DF',50,72),S('rcb','CB','DF',75,70),S('lwb','LWB','DF',9,50),S('lcm','CM','MF',31,47),S('dm','DM','MF',50,58),S('rcm','CM','MF',69,47),S('rwb','RWB','DF',91,50),S('lst','ST','FW',38,22),S('rst','ST','FW',62,22)],
}
export const FORMATION_IDS=Object.keys(FORMATIONS) as FormationId[]
export const DEFAULT_FORMATION:FormationId='4-3-3'
export const isFormation=(v:unknown):v is FormationId=>typeof v==='string'&&Object.hasOwn(FORMATIONS,v)
export const slotsOf=(f:FormationId):readonly XISlot[]=>FORMATIONS[f]
export const familiesOf=(f:FormationId):Pos[]=>slotsOf(f).map(s=>s.family)
export const countFamily=(f:FormationId,p:Pos)=>slotsOf(f).filter(s=>s.family===p).length

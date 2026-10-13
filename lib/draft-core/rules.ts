import type {DraftRules,Group} from './types'

/** Gate 9 rule sets. The pitch order of a shape decides which place a chosen group fills first; prices are never touched. */
export const rumbleFiveRules=():DraftRules=>({mode:'rumble-five',budgetM:15,offersPerSlot:3,rerolls:3,rulesId:'rumble-five-draft-v1',
 slots:(['GK','DF','MF','MF','FW'] as Group[]).map((group,i)=>({id:`s${i}`,group}))})
export const rumbleXiRules=(slots:readonly {id:string;family:Group}[],budgetM:number,formation:string):DraftRules=>({mode:'rumble-xi',budgetM,offersPerSlot:3,rerolls:3,rulesId:`rumble-xi-draft-v1:${formation}`,
 slots:slots.map(s=>({id:s.id,group:s.family}))})

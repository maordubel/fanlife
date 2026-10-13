/**
 * DRAFT CORE — the one set of rules a slot draft is dealt by (spec GATE 9 final draft, 13.10.2026). LEGENDS MANAGER and the Royal
 * Rumble both deal their cards through it: three different men a slot, one per price tier; a position group chosen freely before every
 * slot; a hard budget; three rerolls a draft; and a server verdict on every card. No React, no I/O, no club names in here.
 */
export type Group='GK'|'DF'|'MF'|'FW'
export const GROUPS:readonly Group[]=['GK','DF','MF','FW']
/** a man as the draft sees him: the group he is filed under, the others he has played, or no recorded position at all (`free`: any outfield group) */
export type DCard={id:string;pos:Group;alt?:readonly Group[];free?:boolean;price:number;decades?:readonly number[]}
export const cardFits=(c:Pick<DCard,'pos'|'alt'|'free'>,g:Group)=>c.free?g!=='GK':c.pos===g||!!c.alt?.includes(g)
export type Tier='premium'|'mid'|'budget'
/** premium €4–5M · mid €2–4M · budget €1–2M — tiers may share a price, never a man */
export const TIER_PRICES:Record<Tier,readonly number[]>={premium:[5,4],mid:[4,3,2],budget:[2,1]}
export const TIERS:readonly Tier[]=['premium','mid','budget']
export type LockKind='locked_budget'|'locked_completion'|'locked_identity'
export type Offer={id:string;tier:Tier;/** null = pickable; otherwise the server's verdict and the reason a fan reads */locked:{kind:LockKind;reason:string}|null}

export type DraftRules={
 mode:'rumble-five'|'rumble-xi'|'legends-manager'
 budgetM:number
 /** the places to fill, in the order a chosen group fills them */
 slots:readonly {id:string;group:Group}[]
 offersPerSlot:3
 rerolls:number
 /** the version a record is stamped with; a rule change is a new id, never an edit */
 rulesId:string
}
export type DraftPick={slotId:string;group:Group;id:string;priceM:number}
export type DraftState={
 picks:DraftPick[]
 /** the group whose three men are on the table, or null between slots */
 active:Group|null
 offers:Offer[]
 /** per group, the men already shown for the CURRENT slot (cleared by a pick) */
 seen:Record<Group,string[]>
 rerollsLeft:number
 /** counts every accepted action — a stale client is refused */
 rev:number
}
export type DraftAction={t:'open';g:Group}|{t:'reroll'}|{t:'pick';id:string}
export type GroupVerdict={group:Group;open:boolean;remaining:number;reason:string|null}
export type StepResult={ok:true;state:DraftState}|{ok:false;error:string}

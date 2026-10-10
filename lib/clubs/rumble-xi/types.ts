import type {Pos,Rated,RumbleCard} from '../rumble'

/**
 * Royal Rumble XI — eleven a side, a €35M budget, one engine for every club (owner spec 10.10.2026).
 * The classic five-a-side game keeps its own constants (`lib/clubs/rumble.ts`); nothing here changes them.
 */
export const XI_RULES_ID='xi35-v1' as const
export const XI_BUDGET=35
/**
 * €35M is the rule. A club whose archive holds only stars (Olympiacos: thirty-three men, every one dear on the global table) cannot
 * field ANY eleven for €35M — so it would be unreachable for ever. The match budget is then the smallest round-fiver that leaves a few
 * million of real choice over the cheapest eleven of the dearer side, and BOTH sides play by it. The screen names it.
 */
export const matchBudget=(...cheapest:(number|null)[]):number=>{const worst=Math.max(0,...cheapest.map(c=>c??0));return worst+4<=XI_BUDGET?XI_BUDGET:Math.ceil((worst+4)/5)*5}
export const XI_OFFERS=3
export const PRICE_SCHEME='fan-life-global-v1' as const
export const RATING_SCHEME='fan-life-estimate-v1' as const

export type FormationId='4-3-3'|'4-4-2'|'3-5-2'
export type Fine='GK'|'CB'|'LB'|'RB'|'DM'|'CM'|'LM'|'RM'|'LWB'|'RWB'|'LW'|'RW'|'ST'
export type XISlot={id:string;fine:Fine;family:Pos;/** across the pitch, 0–100 */x:number;/** 84 = own goal line, 20 = the far end */y:number}
export type RivalSelection={type:'same-club'}|{type:'club';clubId:string}|{type:'random-club'}
export type XICard=RumbleCard
export type XIPlayer=Rated
export type XIBoard={seed:number;formation:FormationId;draft:XICard[][]}
export type XIReadiness={ready:boolean;formation:FormationId;offers:number;reasons:string[];counts:Record<Pos,number>;need:Record<Pos,number>;affordableXI:boolean;sameClub22:boolean;/** some slot has a single card: still a round, with fewer choices */limited:boolean;offersBy:Record<Pos,number>}
/** Scouting: any man of the slot's family can be signed for his price plus this fee, twice a round at most — so nobody in the archive is out of reach. */
export const SCOUT_FEE=1
export const MAX_SCOUTS=2

import type {Pos,Rated,RumbleCard} from '../rumble'

/**
 * Royal Rumble XI — eleven a side, a €35M budget, one engine for every club (owner spec 10.10.2026).
 * The classic five-a-side game keeps its own constants (`lib/clubs/rumble.ts`); nothing here changes them.
 */
export const XI_RULES_ID='xi35-v1' as const
export const XI_BUDGET=35
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
export type XIReadiness={ready:boolean;formation:FormationId;offers:number;reasons:string[];counts:Record<Pos,number>;need:Record<Pos,number>;affordableXI:boolean;sameClub22:boolean}

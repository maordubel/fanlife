import type {State} from '@/lib/master/types'

/**
 * Feature switches (ADR-fanlife-0012, owner roadmap 12.10.2026). Saved in the control state, toggled in the control room
 * (Settings → Features), audited, read on the server only. Every new fan-facing feature ships OFF; the owner's session
 * always sees it ("owner preview"), so it can be played in production before anyone else does.
 * Turning a switch off never deletes what it made (careers, pools, invites) — it only closes the door.
 */
export const EXPERIENCE_GATES=['trivia','timeline','memory'] as const
export type ExperienceGate=typeof EXPERIENCE_GATES[number]
export type Features={allFootball:boolean;allFootballGates:ExperienceGate[];fanLeague:boolean;/** clubs the owner has held out of NEW careers (a career already running keeps its club) */fanLeagueOff:string[];friendlies:boolean;updatedAt:string|null}
export const DEFAULT_FEATURES:Features={allFootball:false,allFootballGates:[...EXPERIENCE_GATES],fanLeague:false,fanLeagueOff:[],friendlies:false,updatedAt:null}
export const FEATURE_TEXT:Record<'allFootball'|'fanLeague'|'friendlies',{label:string;hint:string}>={
 allFootball:{label:'ALL FOOTBALL',hint:'The cross-club space on the hub: trivia, timeline and memory drawn from every published club.'},
 fanLeague:{label:'LEGENDS MANAGER',hint:'The heritage manager: one real club, a founding draft of its own legends, seasons against other clubs.'},
 friendlies:{label:'Friendlies',hint:'Two fans’ careers meet in one match. Nothing in either season changes.'},
}

/** the switches as saved, with every missing key at its default — an old state file reads as "all off" */
export function featuresOf(s:Pick<State,'features'>|null|undefined):Features{
 const f=s?.features
 if(!f||typeof f!=='object')return {...DEFAULT_FEATURES,allFootballGates:[...DEFAULT_FEATURES.allFootballGates],fanLeagueOff:[]}
 const gates=Array.isArray(f.allFootballGates)?f.allFootballGates.filter((g):g is ExperienceGate=>(EXPERIENCE_GATES as readonly string[]).includes(g)):[...EXPERIENCE_GATES]
 return {allFootball:f.allFootball===true,allFootballGates:[...new Set(gates)],fanLeague:f.fanLeague===true,fanLeagueOff:Array.isArray(f.fanLeagueOff)?[...new Set(f.fanLeagueOff.filter((x):x is string=>typeof x==='string'&&SLUG.test(x)))]:[],friendlies:f.friendlies===true,updatedAt:typeof f.updatedAt==='string'?f.updatedAt:null}
}

const SLUG=/^[a-z0-9][a-z0-9-]{0,60}$/
export type FeaturePatch=Partial<Pick<Features,'allFootball'|'allFootballGates'|'fanLeague'|'fanLeagueOff'|'friendlies'>>
/** strict: an unknown key or a wrong type is refused BY NAME, never ignored */
export function validateFeaturePatch(raw:unknown):{ok:true;patch:FeaturePatch}|{ok:false;error:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,error:'A patch object is required.'}
 const out:FeaturePatch={}
 for(const [k,v] of Object.entries(raw as Record<string,unknown>)){
  if(k==='allFootball'||k==='fanLeague'||k==='friendlies'){if(typeof v!=='boolean')return {ok:false,error:`${k} must be true or false.`};out[k]=v}
  else if(k==='allFootballGates'){if(!Array.isArray(v)||!v.every(g=>(EXPERIENCE_GATES as readonly unknown[]).includes(g)))return {ok:false,error:`allFootballGates must list only ${EXPERIENCE_GATES.join(', ')}.`};out.allFootballGates=[...new Set(v as ExperienceGate[])]}
  else if(k==='fanLeagueOff'){if(!Array.isArray(v)||!v.every(x=>typeof x==='string'&&SLUG.test(x)))return {ok:false,error:'fanLeagueOff must list club ids.'};out.fanLeagueOff=[...new Set(v as string[])]}
  else return {ok:false,error:`Unknown switch: ${k}.`}
 }
 if(!Object.keys(out).length)return {ok:false,error:'Nothing to change.'}
 return {ok:true,patch:out}
}
export function applyFeaturePatch(cur:Features,patch:FeaturePatch,now:string):Features{return {...cur,...patch,allFootballGates:patch.allFootballGates?[...patch.allFootballGates]:[...cur.allFootballGates],fanLeagueOff:patch.fanLeagueOff?[...patch.fanLeagueOff]:[...cur.fanLeagueOff],updatedAt:now}}

/** who may enter: everyone when the switch is on; the owner (preview) when it is off */
export type FeatureDoor={open:boolean;preview:boolean}
export function featureDoor(on:boolean,owner:boolean):FeatureDoor{return {open:on||owner,preview:!on&&owner}}

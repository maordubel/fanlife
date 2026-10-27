import type {State} from '@/lib/master/types'

/**
 * Feature switches (ADR-fanlife-0012, owner roadmap 12.10.2026). Saved in the control state, toggled in the control room
 * (Settings → Features), audited, read on the server only. Every new fan-facing feature ships OFF; the owner's session
 * always sees it ("owner preview"), so it can be played in production before anyone else does.
 * Turning a switch off never deletes what it made (careers, pools, invites) — it only closes the door.
 */
export const EXPERIENCE_GATES=['trivia','timeline','memory'] as const
export type ExperienceGate=typeof EXPERIENCE_GATES[number]
export type Features={allFootball:boolean;allFootballGates:ExperienceGate[];fanLeague:boolean;/** clubs the owner has held out of NEW careers (a career already running keeps its club) */fanLeagueOff:string[];friendlies:boolean;/** the Royal Rumble's match as watch-only highlights (12.10.2026); off = the match centre */highlights:boolean;/** Gate 7's swipe-duel (THE PEOPLE'S CHOICE, 13.10.2026); off = the direct ballot only */peoplesChoice:boolean;universe:boolean;/** discovery units held out (CF-06): 'dubid' · 'offsides' · 'legends' · 'life' · 'club:<id>' · '<product>:<id>' */universeOff:string[];/** LIFE · RUSH missions (ADR-fanlife-0013); off = a mission's choice plays its small game, or simply happens */lifeRush:boolean;/** pinned shortcuts (owner audit §5.5, 27.10.2026): one or two places the fan chose, in the menu and on the hub/club home */pins:boolean;updatedAt:string|null}
export const DEFAULT_FEATURES:Features={allFootball:false,allFootballGates:[...EXPERIENCE_GATES],fanLeague:false,fanLeagueOff:[],friendlies:false,highlights:false,peoplesChoice:false,universe:true,universeOff:[],lifeRush:false,pins:false,updatedAt:null}
export type SwitchKey='allFootball'|'fanLeague'|'friendlies'|'highlights'|'peoplesChoice'|'universe'|'lifeRush'|'pins'
export const FEATURE_TEXT:Record<SwitchKey,{label:string;hint:string}>={
 allFootball:{label:'ALL FOOTBALL',hint:'The cross-club space on the hub: trivia, timeline and memory drawn from every published club.'},
 fanLeague:{label:'LEGENDS MANAGER',hint:'The heritage manager: one real club, a founding draft of its own legends, seasons against other clubs.'},
 friendlies:{label:'Friendlies',hint:'Two fans’ careers meet in one match. Nothing in either season changes.'},
 peoplesChoice:{label:'The People’s Choice',hint:'Gate 7 as a swipe-duel: two legends, the chosen one stays, ten decisions, then confirm. Off: the direct ballot only. Votes are unchanged either way.'},
 lifeRush:{label:'LIFE · Missions',hint:'Inside LIFE, some choices become a mission: run to the gate, drive the away day, find someone in the crowd — fitted to each club from its own archive. Off: those choices play their small game, or simply happen.'},
 universe:{label:'Universe bridge',hint:'One matchday card on the hub that points to a companion app (DUBID or OFFSIDES) when a verified fixture is close. On for everyone by default; off: nothing is shown. Each product can also be held out in code (lib/universe/registry.ts).'},
 pins:{label:'Pinned shortcuts',hint:'A fan can pin one or two places of his own — a club, a gate, his LEGENDS career, LIFE, ALL FOOTBALL, DUBID or OFFSIDES. They show as “Your shortcuts” at the top of the menu and on the hub and club home. Never a suggestion; kept on the device only.'},
 highlights:{label:'Match highlights',hint:'The Royal Rumble match on every club page plays as sixteen-bit highlights in the right kits. Off: the match centre. (LEGENDS MANAGER always shows them.)'},
}

/** the switches as saved, with every missing key at its default — an old state file reads as "all off" */
export function featuresOf(s:Pick<State,'features'>|null|undefined):Features{
 const f=s?.features
 if(!f||typeof f!=='object')return {...DEFAULT_FEATURES,allFootballGates:[...DEFAULT_FEATURES.allFootballGates],fanLeagueOff:[],universeOff:[]}
 const gates=Array.isArray(f.allFootballGates)?f.allFootballGates.filter((g):g is ExperienceGate=>(EXPERIENCE_GATES as readonly string[]).includes(g)):[...EXPERIENCE_GATES]
 return {allFootball:f.allFootball===true,allFootballGates:[...new Set(gates)],fanLeague:f.fanLeague===true,fanLeagueOff:Array.isArray(f.fanLeagueOff)?[...new Set(f.fanLeagueOff.filter((x):x is string=>typeof x==='string'&&SLUG.test(x)))]:[],friendlies:f.friendlies===true,highlights:f.highlights===true,peoplesChoice:f.peoplesChoice===true,universe:f.universe!==false,universeOff:Array.isArray(f.universeOff)?[...new Set(f.universeOff.filter((x):x is string=>typeof x==='string'&&UNIVERSE_OFF.test(x)))]:[],lifeRush:f.lifeRush===true,pins:f.pins===true,updatedAt:typeof f.updatedAt==='string'?f.updatedAt:null}
}

const SLUG=/^[a-z0-9][a-z0-9-]{0,60}$/
/** a product of the universe, a club, or one product for one club */
export const UNIVERSE_OFF=/^(?:(?:dubid|offsides|legends|life)(?::[a-z0-9][a-z0-9-]{0,60})?|club:[a-z0-9][a-z0-9-]{0,60})$/
export type FeaturePatch=Partial<Pick<Features,'allFootball'|'allFootballGates'|'fanLeague'|'fanLeagueOff'|'friendlies'|'highlights'|'peoplesChoice'|'universe'|'universeOff'|'lifeRush'|'pins'>>
/** strict: an unknown key or a wrong type is refused BY NAME, never ignored */
export function validateFeaturePatch(raw:unknown):{ok:true;patch:FeaturePatch}|{ok:false;error:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,error:'A patch object is required.'}
 const out:FeaturePatch={}
 for(const [k,v] of Object.entries(raw as Record<string,unknown>)){
  if(k==='allFootball'||k==='fanLeague'||k==='friendlies'||k==='highlights'||k==='peoplesChoice'||k==='universe'||k==='lifeRush'||k==='pins'){if(typeof v!=='boolean')return {ok:false,error:`${k} must be true or false.`};out[k]=v}
  else if(k==='allFootballGates'){if(!Array.isArray(v)||!v.every(g=>(EXPERIENCE_GATES as readonly unknown[]).includes(g)))return {ok:false,error:`allFootballGates must list only ${EXPERIENCE_GATES.join(', ')}.`};out.allFootballGates=[...new Set(v as ExperienceGate[])]}
  else if(k==='universeOff'){if(!Array.isArray(v)||!v.every(x=>typeof x==='string'&&UNIVERSE_OFF.test(x)))return {ok:false,error:'universeOff must list dubid, offsides, legends, life, club:<id> or <product>:<id>.'};out.universeOff=[...new Set(v as string[])]}
  else if(k==='fanLeagueOff'){if(!Array.isArray(v)||!v.every(x=>typeof x==='string'&&SLUG.test(x)))return {ok:false,error:'fanLeagueOff must list club ids.'};out.fanLeagueOff=[...new Set(v as string[])]}
  else return {ok:false,error:`Unknown switch: ${k}.`}
 }
 if(!Object.keys(out).length)return {ok:false,error:'Nothing to change.'}
 return {ok:true,patch:out}
}
export function applyFeaturePatch(cur:Features,patch:FeaturePatch,now:string):Features{return {...cur,...patch,allFootballGates:patch.allFootballGates?[...patch.allFootballGates]:[...cur.allFootballGates],fanLeagueOff:patch.fanLeagueOff?[...patch.fanLeagueOff]:[...cur.fanLeagueOff],universeOff:patch.universeOff?[...patch.universeOff]:[...cur.universeOff],updatedAt:now}}

/** who may enter: everyone when the switch is on; the owner (preview) when it is off */
export type FeatureDoor={open:boolean;preview:boolean}
export function featureDoor(on:boolean,owner:boolean):FeatureDoor{return {open:on||owner,preview:!on&&owner}}

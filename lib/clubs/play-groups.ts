import type {GateKey} from './gates'

/** How the Play tab groups the thirteen gates. Every gate sits in exactly one group (tests/clubs/club-shell.test.ts). */
export const PLAY_GROUPS:readonly {id:'quick'|'deep'|'archive';keys:readonly GateKey[]}[]=[
 {id:'quick',keys:['trivia','memory','kit-builder','goal']},
 {id:'deep',keys:['xi','lineup','royal-rumble','blind-cow']},
 {id:'archive',keys:['kits','archive','timeline','derby','polls']},
]
/** Gates that make a good "today's pick": a round you can finish today. Collections are not picks. */
export const PICKABLE:readonly GateKey[]=[...PLAY_GROUPS[0]!.keys,...PLAY_GROUPS[1]!.keys]

const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
/** One gate per club per day, the same for everyone who opens the page that day. `day` is a calendar day (YYYY-MM-DD). */
export function todaysPick(clubId:string,open:readonly GateKey[],day:string):GateKey|null{
 const pool=PICKABLE.filter(k=>open.includes(k))
 return pool.length?pool[hash(`${clubId}:${day}`)%pool.length]!:null
}

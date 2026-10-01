import type {ClubData,Readiness} from './contract'
export const SHARED_GATES=[
 {number:1,key:'xi',name:'All-time XI',requirement:'Approved player identities, documented positions and career years.'},
 {number:2,key:'trivia',name:'Trivia wing',requirement:'60 eligible questions for full readiness; short rounds start at 3.'},
 {number:3,key:'lineup',name:'Historical line-up',requirement:'Verified match ID, eleven canonical starters and sourced decoys; shared engine pending.'},
 {number:4,key:'kit-builder',name:'Kit builder',requirement:'Verified season, sponsor, maker, collar and pattern; cleared assets; shared engine pending.'},
 {number:5,key:'kits',name:'Shirt collection',requirement:'Verified kit metadata and asset rights; shared engine pending.'},
 {number:6,key:'memory',name:'Memory',requirement:'Six distinct sourced fact pairs for a full board; short boards start at 2.'},
 {number:7,key:'polls',name:'Terrace vote',requirement:'Reviewed club-specific debates and culture; shared engine pending.'},
 {number:8,key:'goal',name:'Goal reconstruction',requirement:'Verified scorer, event, player/ball positions and cleared footage; shared engine pending.'},
 {number:9,key:'royal-rumble',name:'Royal Rumble',requirement:'Sourced player versions and attribute coverage; shared engine pending.'},
 {number:10,key:'blind-cow',name:'Blind Cow',requirement:'Canonical players and enough verified clues per player; shared engine pending.'},
 {number:11,key:'derby',name:'The derby',requirement:'Human-approved primary rival and verified derby matches; shared engine pending.'},
 {number:12,key:'archive',name:'Living archive',requirement:'Eligible sourced records; unapproved research stays in the review console.'},
 {number:13,key:'timeline',name:'Timeline',requirement:'Eleven distinct eligible dates for a full round; short rounds start at 3.'},
] as const
export type GateKey=typeof SHARED_GATES[number]['key']
export const sharedGate=(key:string)=>SHARED_GATES.find(g=>g.key===key)
export function gateAvailability(data:ClubData,key:GateKey):Readiness {
 if(Object.hasOwn(data.gates,key))return data.gates[key as keyof ClubData['gates']]
 const gate=sharedGate(key)!
 return {state:'LOCKED',playable:false,eligible:0,target:0,reasons:[gate.requirement]}
}

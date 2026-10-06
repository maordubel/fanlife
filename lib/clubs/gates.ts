import type {ClubData,Readiness} from './contract'
export const SHARED_GATES=[
 {number:1,key:'xi',name:'All-time XI',requirement:'Approved player identities, documented positions and career years.'},
 {number:2,key:'trivia',name:'Trivia wing',requirement:'60 eligible questions for full readiness; short rounds start at 3.'},
 {number:3,key:'lineup',name:'Historical line-up',requirement:'Matches whose starting eleven two sources agree on, plus same-era decoys. Full round at 5 matches.'},
 {number:4,key:'kit-builder',name:'Kit builder',requirement:'Kits naming season, maker and design from sourced records. Full round at 5 kits.'},
 {number:5,key:'kits',name:'Shirt collection',requirement:'Kits with a sourced season; drawn from metadata, never from uncleared photos. Full shelf at 8.'},
 {number:6,key:'memory',name:'Memory',requirement:'Six distinct sourced fact pairs for a full board; short boards start at 2.'},
 {number:7,key:'polls',name:'Terrace vote',requirement:'Opinion prompts using eligible club archive/player choices; device ballot only.'},
 {number:8,key:'goal',name:'Goal reconstruction',requirement:'Goals whose reports describe each touch — who, verb, zone. Full round at 6 goals.'},
 {number:9,key:'royal-rumble',name:'Royal Rumble',requirement:'Players with documented positions covering GK, DF, MF and FW; ratings from career span and recorded goals.'},
 {number:10,key:'blind-cow',name:'Blind Cow',requirement:'Canonical players with at least four eligible, sourced clues per player; solo evaluation engine.'},
 {number:11,key:'derby',name:'The derby',requirement:'A human-approved primary rival; the wall reads every meeting the archives record.'},
 {number:12,key:'archive',name:'Living archive',requirement:'Eligible sourced records; unapproved research stays in the review console.'},
 {number:13,key:'timeline',name:'Timeline',requirement:'Eleven distinct eligible dates for a full round; short rounds start at 3.'},
] as const
export type GateKey=typeof SHARED_GATES[number]['key']
export const sharedGate=(key:string)=>SHARED_GATES.find(g=>g.key===key)
export function gateAvailability(data:ClubData,key:GateKey):Readiness {
 if(Object.hasOwn(data.gates,key))return data.gates[key as keyof ClubData['gates']]!
 const gate=sharedGate(key)!
 return {state:'LOCKED',playable:false,eligible:0,target:0,reasons:[gate.requirement]}
}

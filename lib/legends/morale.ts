import {clamp,LEGENDS_RULES as R} from './config'
import type {Team} from './types'

/**
 * The dressing room's mood (owner, 13.10.2026). Pure. Two things move a squad: results (the old `morale`, 0.9–1.1, written by
 * the books after every match) and the manager's talks (`mood`, −1…+1, and single men's `moodMen`). The engine reads only
 * the small bounded edge in config `talk`; a fan sees WORDS — this file is the only translator from number to word, and the
 * view never carries the number (tests/legends/match-flow.test.ts reads the UI for it).
 */
export type MoodWord='low'|'edgy'|'steady'|'confident'|'flying'
export const MOOD_WORDS:readonly MoodWord[]=['low','edgy','steady','confident','flying']
export const MOOD_TEXT:Record<MoodWord,{label:string;line:string}>={
 low:{label:'Low',line:'Heads are down. Nobody is talking in the warm-up.'},
 edgy:{label:'Edgy',line:'A tight room. Every word is weighed.'},
 steady:{label:'Steady',line:'Business as usual. Boots laced, minds on the job.'},
 confident:{label:'Confident',line:'Loud in the showers, sharp in training.'},
 flying:{label:'Flying',line:'They would run through a wall for this club today.'},
}
export type ManMood='lifted'|'stung'
const step=(x:number)=>clamp(x,-R.talk.maxStep,R.talk.maxStep)
const bound=(x:number)=>Math.round(clamp(x,R.talk.min,R.talk.max)*1000)/1000
/** the whole room, results and talks together, on one scale: talk mood −1…+1 plus results morale (±0.1 → ±1) */
export const moodScore=(t:Pick<Team,'mood'|'morale'>)=>(t.mood??0)+(t.morale-1)*10
export function moodWord(score:number):MoodWord{return score<=-1.1?'low':score<=-0.35?'edgy':score<0.35?'steady':score<1.1?'confident':'flying'}
export const manMood=(x:number|undefined):ManMood|null=>x===undefined?null:x>=0.25?'lifted':x<=-0.25?'stung':null
/** a talk's effect, applied: each step bounded, every mood bounded, a man at neutral dropped from the map */
export function applyTalk(t:Team,e:{team:number;men:readonly {id:string;d:number}[]}):Team{
 const men={...(t.moodMen??{})}
 for(const m of e.men){const v=bound((men[m.id]??0)+step(m.d));if(Math.abs(v)<0.05)delete men[m.id];else men[m.id]=v}
 return {...t,mood:bound((t.mood??0)+step(e.team)),moodMen:men}
}
/** after every match the room drifts back toward neutral */
export function decayMood(t:Team):Team{
 if(t.mood===undefined&&!t.moodMen)return t
 const men:Record<string,number>={}
 for(const [k,v] of Object.entries(t.moodMen??{})){const x=bound(v*R.talk.decay);if(Math.abs(x)>=0.05)men[k]=x}
 const mood=bound((t.mood??0)*R.talk.decay)
 return {...t,mood:Math.abs(mood)<0.02?0:mood,moodMen:men}
}

import type {DuelState} from './types'
/** The namespace of one club's one poll. Another club, another poll or another version never reads it (spec §4, D7-19). */
export const duelKey=(club:string,pollId:string)=>`fan-life:club:${club}:polls-duel:v1:${pollId}`
/** the birth year is a convenience kept on THIS device only — never in a share link, an event or a profile (spec §3) */
export const BIRTH_KEY='fan-life:polls-duel:v1:birth'
export const flagKey=(club:string)=>`fan-life:club:${club}:polls-duel:v1:path`

const read=(key:string):unknown=>{try{const raw=localStorage.getItem(key);return raw&&raw.length<20000?JSON.parse(raw):null}catch{return null}}
export const loadDuel=(club:string,pollId:string):unknown=>read(duelKey(club,pollId))
export function saveDuel(club:string,s:DuelState):boolean{try{localStorage.setItem(duelKey(club,s.pollId),JSON.stringify(s));return true}catch{return false}}
export function dropDuel(club:string,pollId:string){try{localStorage.removeItem(duelKey(club,pollId))}catch{/* nothing to drop */}}
export function loadBirth():number|null{const v=read(BIRTH_KEY);return typeof v==='number'&&Number.isInteger(v)?v:null}
export function saveBirth(y:number|null){try{if(y===null)localStorage.removeItem(BIRTH_KEY);else localStorage.setItem(BIRTH_KEY,JSON.stringify(y))}catch{/* kept in memory only */}}
/** a short random id for one run — the measurement unit of a session, never an identity */
export const newSessionId=()=>{try{return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(36).padStart(2,'0')).join('').slice(0,12)}catch{return Math.random().toString(36).slice(2,14).padEnd(8,'0')}}

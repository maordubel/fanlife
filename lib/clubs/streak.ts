/**
 * A per-club streak: consecutive local calendar days on which the fan finished a round at THAT club. Device-only, never
 * ranked, never compared across clubs. A day is a local `YYYY-MM-DD`; missing a day ends the streak.
 */
export const streakKey=(club:string)=>`fan-life:club:${club}:streak:v1`
const DAY=86_400_000
export const dayOf=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const ord=(s:string)=>{const [y,m,d]=s.split('-').map(Number) as [number,number,number];return Math.round(Date.UTC(y,m-1,d)/DAY)}
const ok=(xs:unknown):xs is string[]=>Array.isArray(xs)&&xs.length<=400&&xs.every(s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s))
export function addDay(days:string[],today:string):string[]{return days.includes(today)?days:[...days,today].sort().slice(-400)}
/** current streak as of `today`: counts back from today, or from yesterday if today has no round yet (the streak is still alive). */
export function streakOf(days:string[],today:string):number{
 const set=new Set(days.map(ord));let t=ord(today);if(!set.has(t))t-=1
 let n=0;while(set.has(t)){n++;t--}return n
}
export function readStreak(club:string):string[]{try{const p=JSON.parse(localStorage.getItem(streakKey(club))||'[]');return ok(p)?p:[]}catch{return []}}
export function touchStreak(club:string,now=new Date()):void{try{localStorage.setItem(streakKey(club),JSON.stringify(addDay(readStreak(club),dayOf(now))))}catch{/* a convenience */}}

import 'server-only'
import {durable} from '@/lib/master/durable'
import {StoryError} from './jobs'
import {EMPTY_DESK,type PitchDay,type PitchDesk} from './pitches'

/**
 * The pitches in the control room's durable store: one file a day (`stories/pitches/<YYYY-MM-DD>.json`) and one small
 * desk file (`studio/pitch-desk.json`: the owner's request and what the last run said). Every write is compare-and-swap,
 * retried on a lost race — the pitch run and the owner's clicks can never overwrite each other. Outside `stories/jobs/`
 * so the job list never reads them.
 */
const DAY_PREFIX='stories/pitches/'
const DESK='studio/pitch-desk.json'
const DAY=/^\d{4}-\d{2}-\d{2}$/

function store(){
 const d=durable()
 if(!d||d.kind==='memory')throw new StoryError('STORE','Durable storage is not configured: the studio will not keep pitches in memory.',503)
 return d
}
const parse=<T>(t:string|undefined|null):T|null=>{try{return t?JSON.parse(t) as T:null}catch{return null}}

/** The newest days first (at most `n`). */
export async function readPitchDays(n=14):Promise<PitchDay[]>{
 const d=store()
 const keys=(await d.list(DAY_PREFIX,{fresh:true,soft:false})).filter(k=>DAY.test(k.slice(DAY_PREFIX.length,-5))&&k.endsWith('.json')).sort().reverse().slice(0,n)
 const rows=await Promise.all(keys.map(k=>d.read(k,{fresh:true,soft:false})))
 return rows.flatMap(r=>{const x=parse<PitchDay>(r?.text);return x?[x]:[]})
}

export async function updatePitchDay(date:string,change:(d:PitchDay|null)=>PitchDay):Promise<PitchDay>{
 if(!DAY.test(date))throw new StoryError('PITCH','Invalid day.')
 const d=store(),name=`${DAY_PREFIX}${date}.json`
 for(let i=0;i<5;i++){
  const cur=await d.read(name,{fresh:true,soft:false})
  const next=change(parse<PitchDay>(cur?.text))
  if(await d.write(name,JSON.stringify(next),cur?.etag??null))return next
 }
 throw new StoryError('CONFLICT','The pitches changed while saving; try again.',409)
}

/** Soft read for the desk's screens: storage that cannot answer is "not readable" (null), never an empty desk. */
export async function readPitchDesk():Promise<PitchDesk|null>{
 const d=durable()
 if(!d||d.kind==='memory')return null
 try{const r=await d.read(DESK,{fresh:true,soft:false});return parse<PitchDesk>(r?.text)??EMPTY_DESK}catch{return null}
}
export async function updatePitchDesk(change:(d:PitchDesk)=>PitchDesk):Promise<PitchDesk>{
 const d=store()
 for(let i=0;i<5;i++){
  const cur=await d.read(DESK,{fresh:true,soft:false})
  const next=change(parse<PitchDesk>(cur?.text)??EMPTY_DESK)
  if(await d.write(DESK,JSON.stringify(next),cur?.etag??null))return next
 }
 throw new StoryError('CONFLICT','The pitch desk changed while saving; try again.',409)
}

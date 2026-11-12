/**
 * The Gemini keys on the writer light (owner, 12.11.2026: two keys are repository secrets — "check credit on both and use
 * whichever works, by itself"). One line per key, by its SECRET NAME only: ok / no credit / refused / quota, with the
 * time the runner checked (scripts/football-stories/studio/gemini.py → check_keys). Pure, so the desk can read it.
 */
export const KEY_NAMES=['GEMINI_API_KEY','GEMINI_API_KEY_KIDS'] as const
export const KEY_STATES=['ok','no credit','refused','quota','error'] as const
export type KeyLine={name:typeof KEY_NAMES[number];state:typeof KEY_STATES[number];at:string}
/** Only a known secret name, a known state and a time pass: whatever else a runner sends is dropped, so the file can
 *  never hold a key or a piece of one. */
export function cleanKeys(raw:unknown):KeyLine[]{
 if(!Array.isArray(raw))return []
 const out:KeyLine[]=[]
 for(const r of raw.slice(0,4)){
  const x=(r&&typeof r==='object'?r:{}) as Record<string,unknown>
  const name=KEY_NAMES.find(n=>n===x.name),state=KEY_STATES.find(k=>k===x.state)
  if(name&&state&&typeof x.at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(x.at)&&!out.some(o=>o.name===name))out.push({name,state,at:x.at})
 }
 return out
}
const KEY_TEXT:Record<KeyLine['state'],string>={ok:'works','no credit':'no credit (its Google project has billing on and a zero balance)',refused:'refused by Google',quota:"today's free quota is spent",error:'could not be checked'}
/** "GEMINI_API_KEY: no credit … · GEMINI_API_KEY_KIDS: works", for the desk. */
export const keysText=(keys:KeyLine[]|undefined):string=>(keys??[]).map(k=>`${k.name}: ${KEY_TEXT[k.state]}`).join(' · ')

import {EMPTY_SNAPSHOT,keyOf,type Override,type Patch,type Snapshot} from './types'
/**
 * The published overrides as the engine reads them — synchronous, because `priceFor` / `rawPool` are pure functions of what is
 * loaded. The snapshot is set by the server after it reads the store (lib/players/snapshot.ts); here there is no I/O at all.
 */
const g=globalThis as typeof globalThis&{fanPlayerSnapshot?:Snapshot}
export const setSnapshot=(s:Snapshot)=>{g.fanPlayerSnapshot=s}
export const getSnapshot=():Snapshot=>g.fanPlayerSnapshot??EMPTY_SNAPSHOT
export const overrideOf=(club:string,id:string):Override|undefined=>process.env.PLAYER_OVERRIDES_OFF?undefined:getSnapshot().overrides[keyOf(club,id)]
export const hasOverrides=(club:string)=>!process.env.PLAYER_OVERRIDES_OFF&&Object.keys(getSnapshot().overrides).some(k=>k.startsWith(club+'|'))
/** apply an editor's patch to an override: null clears a field, a value sets it (pure) */
export function mergePatch(cur:Override|null,patch:Patch,meta:{by:string;at:string;reason:string}):Override|null{
 const next:Record<string,unknown>={...(cur??{})}
 for(const [k,v] of Object.entries(patch)){if(v===null||v===undefined||(k==='removed'&&v===false))delete next[k];else next[k]=v}
 const fields=['price','positions','rating','reputation','name','removed','mergedInto','note'].filter(k=>k in next)
 if(!fields.length)return null
 return {...next,rev:(cur?.rev??0)+1,...meta} as Override
}

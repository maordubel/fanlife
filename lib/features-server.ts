import 'server-only'
import {readState} from '@/lib/master/store'
import {adminSession} from '@/lib/master/admin'
import {featureDoor,featuresOf,type FeatureDoor,type Features} from '@/lib/features'

/** the switches for this request; a store that cannot answer reads as "all off" (rule 105: a read never takes a screen down) */
export async function serverFeatures():Promise<Features>{return featuresOf(await readState().catch(()=>null))}
/** the owner's verified cookie — never evaluation mode (rule 97) */
export function isOwner():boolean{try{return adminSession()!==null}catch{return false}}
export async function door(key:import('./features').SwitchKey):Promise<FeatureDoor&{features:Features}>{
 const f=await serverFeatures()
 return {...featureDoor(f[key],isOwner()),features:f}
}

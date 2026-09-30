import 'server-only'
import {REGISTRY,clubFromHost,PORTAL_HOST_ROOT} from '@/lib/master/registry'
import {compilePack} from './compiler'
import type {ClubData,Diagnostic} from './contract'
const providers:Record<string,()=>Promise<{data:ClubData;diagnostics:Diagnostic[]}>>={
 'hapoel-tel-aviv':async()=>({data:(await import('./adapters/hapoel')).getHapoelData(),diagnostics:[]}),
 'zrinjski-mostar':async()=>compilePack((await import('./adapters/zrinjski')).zrinjskiPack(),REGISTRY.find(c=>c.id==='zrinjski-mostar')!),
 olympiacos:async()=>compilePack((await import('@/club-packs/olympiacos/core.json')).default,REGISTRY.find(c=>c.id==='olympiacos')!),
}
export const CORE_CLUB_IDS=Object.keys(providers)
const cache=new Map<string,Promise<{data:ClubData;diagnostics:Diagnostic[]}>>()
function freeze<T>(v:T):T {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const item of Object.values(v))freeze(item)}return v}
/** Static packs are immutable within a deployment; content versions travel with each run. */
export function loadClub(id:string) {
 if(!Object.hasOwn(providers,id))return Promise.resolve(null)
 if(!cache.has(id))cache.set(id,providers[id]!().then(freeze).catch(e=>{cache.delete(id);throw e}))
 return cache.get(id)!
}
/** Host is authority. Neutral-portal path selection is available only in evaluation. */
export function resolveClubId(host:string|null,pathId?:string,preview=false):string|null {
 const tenant=clubFromHost(host)
 if(tenant)return !pathId||pathId===tenant?tenant:null
 const h=host?.toLowerCase().split(':')[0]||''
 if((h.endsWith('.'+PORTAL_HOST_ROOT)&&h!=='www.'+PORTAL_HOST_ROOT)||(h.endsWith('.localhost')&&h!=='www.localhost'))return null
 return preview&&pathId&&REGISTRY.some(c=>c.id===pathId)?pathId:null
}

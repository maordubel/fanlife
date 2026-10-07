import 'server-only'
import {wikipediaAdapter} from './wikipedia'
import {packageAdapter} from './package'
import type {Adapter} from './types'
export const ADAPTERS:Record<string,Adapter>={[wikipediaAdapter.id]:wikipediaAdapter,[packageAdapter.id]:packageAdapter}
/** Public, serialisable catalogue for the admin's adapter picker. */
export const ADAPTER_LIST=Object.values(ADAPTERS).map(a=>({id:a.id,label:a.label,needsQuery:a.needsQuery,capabilities:a.capabilities}))
export const adapterAvailable=(id:string,clubId:string)=>{const a=ADAPTERS[id];return !!a&&(a.available?a.available(clubId):true)}
export const adapterFor=(id?:string)=>ADAPTERS[id||'wikipedia']
export type {Adapter,AdapterResult} from './types'

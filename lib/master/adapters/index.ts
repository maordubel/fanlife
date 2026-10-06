import 'server-only'
import {wikipediaAdapter} from './wikipedia'
import {packageAdapter} from './package'
import type {Adapter} from './types'
export const ADAPTERS:Record<string,Adapter>={[wikipediaAdapter.id]:wikipediaAdapter,[packageAdapter.id]:packageAdapter}
export const adapterFor=(id?:string)=>ADAPTERS[id||'wikipedia']
export type {Adapter,AdapterResult} from './types'

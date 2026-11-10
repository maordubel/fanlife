import {GATES} from './types'

/** FAN LIFE's own paths: never behind The Worker's gate switches (the hub, the clubs, the control room, your corner). */
export const FAN_PATHS=['/today','/about','/privacy','/terms','/contact','/master','/clubs','/telegram','/our-games','/all-football','/sources','/closet','/market','/auction','/shirts','/me','/stands'] as const
export const isFanPath=(pathname:string)=>pathname==='/'||FAN_PATHS.some(p=>pathname===p||pathname.startsWith(p+'/'))

/**
 * ONE answer for "is this Worker (Hapoel) page open?" — the root layout's gate screen and the sitemap both ask it
 * (review F07: the sitemap listed gates the layout was showing as "resting"). Hapoel must be live, and a page under
 * a gate's path needs that gate switched on.
 */
export function legacyOpen(pathname:string,hapoel:{status:string;gates:readonly number[]}|null|undefined):boolean{
 if(isFanPath(pathname))return true
 if(!hapoel||hapoel.status!=='live')return false
 const gate=GATES.find(g=>pathname===g[2]||pathname.startsWith(g[2]+'/'))
 return !gate||hapoel.gates.includes(gate[0])
}

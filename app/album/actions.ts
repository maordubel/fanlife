'use server'
import {door} from '@/lib/features-server'
import {call,openWings,type SwapBoard} from '@/lib/album/server'
import type {Me,Variant} from '@/lib/album/view'

/** THE ALBUM's intents. Every one goes to a database function that checks the fan and the rules itself (server authority). */
type R<T>={ok:true;data:T}|{ok:false;error:string}
async function gate():Promise<{ok:true;owner:boolean}|{ok:false;error:string}>{const d=await door('album');return d.open?{ok:true,owner:d.preview}:{ok:false,error:'THE ALBUM is not open yet.'}}
const ID=/^[a-z0-9-]{2,60}:[0-9]{1,3}$/

export async function startAlbum(wing:string,name:string):Promise<R<Me>>{
 const g=await gate();if(!g.ok)return g
 if(!(await openWings(g.owner)).some(w=>w.id===wing))return {ok:false,error:'That wing is not open.'}
 const clean=name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,28)
 return call<Me>('worker_album_start',{p_wing:wing,p_cover:clean?{name:clean}:{}})
}
export async function setWing(wing:string):Promise<R<{wing:string}>>{
 const g=await gate();if(!g.ok)return g
 if(!(await openWings(g.owner)).some(w=>w.id===wing))return {ok:false,error:'That wing is not open.'}
 return call('worker_album_wing',{p_wing:wing})
}
export type Drawn={envelope:string;stickers:string[];variants:Variant[];fresh:boolean[];pickEarned?:boolean;already?:boolean}
export async function claimDaily():Promise<R<Drawn>>{
 const g=await gate();if(!g.ok)return g
 const r=await call<Drawn&{envelope:unknown}>('worker_album_daily');if(!r.ok)return r
 const d=r.data as unknown as Record<string,unknown>
 if(d.already){const e=d.envelope as {id:string;stickers:string[];variants:Variant[];fresh:boolean[]};return {ok:true,data:{envelope:e.id,stickers:e.stickers,variants:e.variants,fresh:e.fresh,already:true}}}
 return {ok:true,data:r.data as Drawn}
}
export async function markOpened(envelope:string):Promise<R<unknown>>{
 const g=await gate();if(!g.ok)return g
 if(!/^[0-9a-f-]{36}$/.test(envelope))return {ok:false,error:'Bad envelope.'}
 return call('worker_album_opened',{p_envelope:envelope})
}
export async function stick(id:string):Promise<R<unknown>>{const g=await gate();if(!g.ok)return g;if(!ID.test(id))return {ok:false,error:'Bad sticker.'};return call('worker_album_stick',{p_sticker:id})}
export async function usePick(id:string):Promise<R<unknown>>{const g=await gate();if(!g.ok)return g;if(!ID.test(id))return {ok:false,error:'Bad sticker.'};return call('worker_album_pick',{p_sticker:id})}
export async function tradeIn(give:string[],want:string):Promise<R<unknown>>{
 const g=await gate();if(!g.ok)return g
 if(give.length!==5||!give.every(x=>ID.test(x))||!ID.test(want))return {ok:false,error:'Choose five spare copies and one missing sticker.'}
 return call('worker_album_trade',{p_give:give,p_want:want})
}
export async function refresh():Promise<R<Me>>{const g=await gate();if(!g.ok)return g;return call<Me>('worker_album_me')}

const UUID=/^[0-9a-f-]{36}$/
export async function swaps():Promise<R<SwapBoard>>{const g=await gate();if(!g.ok)return g;return call<SwapBoard>('worker_album_swap_board')}
export async function swapOffer(give:string,want:string):Promise<R<unknown>>{const g=await gate();if(!g.ok)return g;if(!ID.test(give)||!ID.test(want)||give===want)return {ok:false,error:'Choose a spare and a sticker you miss.'};return call('worker_album_swap_offer',{p_give:give,p_want:want})}
export async function swapCancel(id:string):Promise<R<unknown>>{const g=await gate();if(!g.ok)return g;if(!UUID.test(id))return {ok:false,error:'Bad swap.'};return call('worker_album_swap_cancel',{p_swap:id})}
export async function swapAccept(id:string):Promise<R<unknown>>{const g=await gate();if(!g.ok)return g;if(!UUID.test(id))return {ok:false,error:'Bad swap.'};return call('worker_album_swap_accept',{p_swap:id})}

/** a promotion code (posted on FAN LIFE's social accounts) → free packets, checked and spent by the database */
export async function redeemCode(code:string):Promise<R<{packets:number}>>{const g=await gate();if(!g.ok)return g;const c=code.replace(/\s/g,'').slice(0,40);if(c.length<3)return {ok:false,error:'That is not a code.'};return call<{packets:number}>('worker_album_redeem',{p_code:c})}

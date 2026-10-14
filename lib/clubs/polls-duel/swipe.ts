import type {Side} from './types'
/**
 * The gesture, as arithmetic (spec §7). Physical sides only: a swipe to the RIGHT of the screen chooses the name on the
 * RIGHT of the screen, in LTR and in RTL alike — the arena is laid out physically, so nothing here is ever mirrored.
 * No gesture library: a vertical drag is the page scrolling, a short or slow drag is nothing, a tap is the button's.
 */
export type Drag={dx:number;dy:number;ms:number;width:number}
export const INTENT_PX=10
/** which axis the finger is on, once it has moved enough to say */
export const intentOf=(dx:number,dy:number):'h'|'v'|null=>{
 const ax=Math.abs(dx),ay=Math.abs(dy)
 if(Math.max(ax,ay)<INTENT_PX)return null
 return ax>ay*1.25?'h':'v'
}
/** the side a finished drag chooses, or null (cancel: it springs back and nothing is decided) */
export function swipeSide(d:Drag):Side|null{
 const ax=Math.abs(d.dx),ay=Math.abs(d.dy)
 if(!(ax>ay*1.25))return null
 const far=ax>=Math.max(64,d.width*0.18)
 const quick=d.ms>0&&ax>=32&&ax/d.ms>=0.6
 return far||quick?(d.dx>0?'R':'L'):null
}
/** ← and → are physical too */
export const keySide=(key:string):Side|null=>key==='ArrowLeft'?'L':key==='ArrowRight'?'R':null

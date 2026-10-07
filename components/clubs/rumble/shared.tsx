'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {Pos,RumbleCard} from '@/lib/clubs/rumble'
import {kitFor,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {KitPlate} from '@/components/clubs/games/KitPlate'

/** a key of the club game copy, filled — the English UI never reaches for a Worker string */
export function tr(copy:GameCopy,key:string,vars:Record<string,string|number>={}):string{
 const raw=(copy as Record<string,string>)[key]??key
 return raw.replace(/\{(\w+)\}/g,(_,k:string)=>k in vars?String(vars[k]):`{${k}}`)
}
export const money=(m:number)=>`€${m}M`
export const posName=(copy:GameCopy,p:Pos)=>tr(copy,`rr.pos.${p}`)
export const posShort=(copy:GameCopy,p:Pos)=>tr(copy,`rr.short.${p}`)
/** the name a shirt carries on the pitch: the last word, as the terraces say it */
export const shortName=(name:string)=>{const parts=name.trim().split(/\s+/);return parts.length>1?parts[parts.length-1]!:name}
export function years(copy:GameCopy,c:Pick<RumbleCard,'fromYear'|'toYear'>):string{
 if(c.fromYear===null&&c.toYear===null)return tr(copy,'rr.yearsUnknown')
 if(c.fromYear===c.toYear)return String(c.fromYear)
 return `${c.fromYear??''}–${c.toYear??''}`
}

/** `prefers-reduced-motion`, read after mount so the server and the first client render agree */
export function useReducedMotion():boolean{
 const [reduced,setReduced]=useState(false)
 useEffect(()=>{
  let q:MediaQueryList
  try{q=window.matchMedia('(prefers-reduced-motion: reduce)')}catch{return}
  const update=()=>setReduced(q.matches);update()
  q.addEventListener('change',update);return()=>q.removeEventListener('change',update)
 },[])
 return reduced
}

/**
 * The shirt a man wears in the Rumble (port of the Worker's `RumbleShirt`): the club's documented kit
 * nearest his years, or the club livery — never an empty box, never a rival's colour (lib/clubs/rumble-kit).
 */
export function RumbleShirt({card,side,wardrobe,className}:{card:Pick<RumbleCard,'id'|'fromYear'|'toYear'>;side:'us'|'them';wardrobe:RumbleWardrobe;className?:string}){
 const worn=kitFor(card,side,wardrobe)
 if(worn.source==='archive')return <KitPlate kit={{...worn.kit,id:`${worn.kit.id}-${side}`}} label={false} decorative className={className}/>
 const home=worn.variant==='home'
 return <KitPlate kit={{id:`livery-${worn.variant}`,design:home?'plain':'chest band',colours:[],season:''}} label={false} decorative className={className} paints={home?{a:'var(--club-primary)',b:null}:{a:'var(--mag-card)',b:'var(--club-primary)'}}/>
}

/** the budget's crown — drawn, one ink */
export function Crown({className}:{className?:string}){
 return <svg viewBox="0 0 32 22" className={className} aria-hidden="true" focusable="false"><path d="M2 6l7 6 7-10 7 10 7-6-3 15H5z" fill="currentColor"/><rect x="5" y="19" width="22" height="2" fill="currentColor"/></svg>
}

/** a row of marquee bulbs */
export function Bulbs({n,className}:{n:number;className?:string}){
 return <span className={className} aria-hidden="true">{Array.from({length:n},(_,i)=><i key={i}/>)}</span>
}

/** sound: the crowd recordings the Worker plays, only after the player's own tap, and muted on request */
const SFX={kickoff:'/life/sfx/whistle-1.m4a',goal:'/life/sfx/crowd-real-goal.m4a',concede:'/life/sfx/crowd-real-miss.m4a',kick:'/life/sfx/ball-kick.m4a',final:'/life/sfx/whistle-3.m4a',roar:'/life/sfx/crowd-real-final.m4a'} as const
export type Sfx=keyof typeof SFX
const SOUND_KEY='fan-life:rumble:sound'
export function useRumbleSound(){
 const [on,setOn]=useState(true),ref=useRef(true)
 useEffect(()=>{try{const v=window.localStorage.getItem(SOUND_KEY)!=='off';ref.current=v;setOn(v)}catch{}},[])
 const toggle=useCallback(()=>{const next=!ref.current;ref.current=next;setOn(next);try{window.localStorage.setItem(SOUND_KEY,next?'on':'off')}catch{}},[])
 const play=useCallback((name:Sfx,volume=.6)=>{if(!ref.current)return;try{const a=new Audio(SFX[name]);a.volume=volume;void a.play().catch(()=>undefined)}catch{}},[])
 return {on,toggle,play}
}

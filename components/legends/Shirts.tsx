'use client'
import {createContext,useContext,type ReactNode} from 'react'
import {KitCloth} from '@/components/clubs/gates/kit-builder/KitCloth'
import {RumbleShirt} from '@/components/clubs/rumble/shared'
import {crestFor} from '@/lib/clubs/crest'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {CareerShirt} from '@/lib/legends/shirts'
import {KitChip} from './Sheet'

/**
 * What a career's men wear and which mark a club shows (owner, 13.10.2026). One context, set once by the career screen:
 *  · a man's shirt is his club's documented home kit nearest the middle of his recorded years, drawn as the FAN LIFE garment with
 *    its maker and sponsor; a club with no drawable kit falls back to the Royal Rumble's shirt (livery when nothing is documented)
 *  · a club's mark is its own crest where we hold one (`lib/clubs/crest.ts`), else its shirt chip — never an invented badge
 */
type Ctx={shirts:CareerShirt[];wardrobe:RumbleWardrobe;colours:Record<string,{shirt:string;second:string|null;pattern:string}>}
const ShirtCtx=createContext<Ctx>({shirts:[],wardrobe:{home:[],away:[]},colours:{}})
export function ShirtProvider({value,children}:{value:Ctx;children:ReactNode}){return <ShirtCtx.Provider value={value}>{children}</ShirtCtx.Provider>}

const eraOf=(m:{from:number|null;to:number|null})=>m.from!==null&&m.to!==null?Math.round((m.from+m.to)/2):m.from??m.to
export function shirtFor(shirts:readonly CareerShirt[],m:{from:number|null;to:number|null}):CareerShirt|null{
 if(!shirts.length)return null
 const y=eraOf(m);if(y===null)return shirts[shirts.length-1]!
 let best=shirts[0]!
 for(const s of shirts){const d=Math.abs(s.year-y),bd=Math.abs(best.year-y);if(d<bd||(d===bd&&s.year>best.year))best=s}
 return best
}
export function LegendShirt({man,className}:{man:{id:string;from:number|null;to:number|null};className?:string}){
 const {shirts,wardrobe}=useContext(ShirtCtx),s=shirtFor(shirts,man)
 if(s)return <span className={`lgm-shirt ${className??''}`} data-shirt="cloth"><KitCloth spec={s.cloth} texture={false} title={`${s.season} home shirt`}/></span>
 return <span className={`lgm-shirt ${className??''}`} data-shirt="plate"><RumbleShirt card={{id:man.id,fromYear:man.from,toYear:man.to}} side="us" wardrobe={wardrobe}/></span>
}
export function ClubMark({club,name,size=28}:{club:string;name?:string;size?:number}){
 const {colours}=useContext(ShirtCtx),src=crestFor(club)
 // eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded in the crest register
 if(src)return <span className="lgm-crest" style={{inlineSize:size,blockSize:size}}><img src={src} alt={name?`${name} crest`:''} loading="lazy" decoding="async"/></span>
 return <span className="lgm-crest" data-chip style={{inlineSize:size,blockSize:size}}><KitChip c={colours[club]} size={Math.round(size*0.86)}/></span>
}

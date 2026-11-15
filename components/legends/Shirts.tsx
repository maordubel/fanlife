'use client'
import {createContext,useContext,type ReactNode} from 'react'
import {KitCloth} from '@/components/clubs/gates/kit-builder/KitCloth'
import {RumbleShirt} from '@/components/clubs/rumble/shared'
import {crestFor} from '@/lib/clubs/crest'
import {kitFor,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
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

export function LegendShirt({man,className}:{man:{id:string;from:number|null;to:number|null;pos?:string};className?:string}){
 const {shirts,wardrobe}=useContext(ShirtCtx)
 const card={id:man.id,fromYear:man.from,toYear:man.to},keeper=man.pos==='GK'
 const worn=kitFor(card,'us',wardrobe,{keeper})
 const cloth=worn.source==='archive'&&!worn.kit.svg?shirts.find(s=>s.id===worn.kit.id):null
 if(cloth)return <span className={['lgm-shirt',className].filter(Boolean).join(' ')} data-shirt="cloth"><KitCloth spec={cloth.cloth} texture={false} title={cloth.season}/></span>
 return <span className={['lgm-shirt',className].filter(Boolean).join(' ')}><RumbleShirt card={card} side="us" wardrobe={wardrobe} keeper={keeper}/></span>
}
export function ClubMark({club,name,size=28}:{club:string;name?:string;size?:number}){
 const {colours}=useContext(ShirtCtx),src=crestFor(club)
 // eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded in the crest register
 if(src)return <span className="lgm-crest" style={{inlineSize:size,blockSize:size}}><img src={src} alt={name?`${name} crest`:''} loading="lazy" decoding="async"/></span>
 return <span className="lgm-crest" data-chip style={{inlineSize:size,blockSize:size}}><KitChip c={colours[club]} size={Math.round(size*0.86)}/></span>
}

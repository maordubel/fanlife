'use client'
import {crestFor} from '@/lib/clubs/crest'
import {kitFor,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {documentedCloth} from '@/lib/clubs/kit-model'
import type {CareerView} from '@/lib/legends/view'
import {KitCloth} from '@/components/clubs/gates/kit-builder/KitCloth'
import {RumbleShirt} from '@/components/clubs/rumble/shared'
import {KitChip} from './Sheet'

/**
 * A club's mark wherever a career names a club (owner, 13.10.2026): its own crest when the archive holds one, the shirt chip
 * of its last documented kit when it does not — never an invented badge (lib/clubs/crest.ts).
 */
export function ClubMark({club,v,size=24}:{club:string;v:Pick<CareerView,'colours'>;size?:number}){
 const src=crestFor(club)
 // eslint-disable-next-line @next/next/no-img-element -- a small static crest; the measured file is the shipped file
 if(src)return <img className="lgt-crest" src={src} alt="" width={size} height={Math.round(size*1.3)} style={{blockSize:size,inlineSize:'auto'}} loading="lazy" decoding="async"/>
 return <KitChip c={v.colours?.[club]} size={size}/>
}
/** maker and sponsor by kit id, from the server (`lib/legends/cloth.ts`) */
export type Marks=Record<string,{maker:string|null;sponsor:string|null}>

/**
 * A man in the shirt of his own years: the club's documented kit nearest his recorded years, drawn as the FAN LIFE garment
 * with the club's crest, maker and sponsor lettered on. A kit the garment cannot draw faithfully falls back to the Rumble plate.
 * ALL FOOTBALL is a hub surface: every club wears its own colours (rule 95).
 */
export function LegendShirt({man,club,wardrobe,marks,className,mini=false}:{man:{id:string;from:number|null;to:number|null};club:string;wardrobe:RumbleWardrobe;marks?:Marks;className?:string;mini?:boolean}){
 const card={id:man.id,fromYear:man.from,toYear:man.to},worn=kitFor(card,'us',wardrobe)
 if(worn.source==='archive'){
  const m=marks?.[worn.kit.id],cloth=documentedCloth({colours:worn.kit.colours,design:worn.kit.design,maker:mini?null:m?.maker??null,sponsor:mini?null:m?.sponsor??null},()=>false)
  if(cloth)return <span className={`lgt-shirt ${className??''}`} data-kit={worn.kit.season}><KitCloth spec={{...cloth,crest:true}} texture={!mini} crestSrc={crestFor(club)} monogram=""/></span>
 }
 return <span className={`lgt-shirt ${className??''}`}><RumbleShirt card={card} side="us" wardrobe={wardrobe}/></span>
}

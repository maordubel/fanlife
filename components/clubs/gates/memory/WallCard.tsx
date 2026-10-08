'use client'
import {memo} from 'react'
import type {MemoryCard} from '@/lib/game/memory'
import {numericFace} from '@/lib/game/memory-run'
import {memoryKindLabel} from '@/lib/clubs/memory-kinds'
import {displayFace} from '@/lib/clubs/memory-model'
import {ObjectMark} from '@/components/memory/ObjectMark'
import {Num} from '@/components/ui/Num'
import css from './memory.module.css'

export type WallCardProps={
 card:MemoryCard;n:number;order:number;open:boolean;done:boolean;wrong:boolean;echo:boolean;flashing:boolean
 locale:string;contentLocale:string;labels:{closed:(n:number)=>string;matched:string;echo:string}
 onFlip:(id:string,el:HTMLElement)=>void
}

/**
 * One card of the wall, in the four states it can be in. A CLOSED card wears the same plain back whatever is under
 * it — in the pixels and in the `aria-label`: its label is "Closed card 7" and nothing else, and its DOM id is its
 * position, so neither the label nor the markup says which card is its mate (ME-R12). An open card prints the archive
 * object it is, the face, and the category; the category names a KIND of fact, never the relation between two cards.
 * A matched card is the club's colour, with a tick, so no state is carried by colour alone. A card that cannot be taken
 * (matched, face up, or the wall is lit) is `aria-disabled`, not `disabled`: a disabled button drops the keyboard's place.
 */
export const WallCard=memo(function WallCard({card,n,order,open,done,wrong,echo,flashing,locale,contentLocale,labels,onFlip}:WallCardProps){
 const face=open||done||flashing,shown=displayFace(card.face,locale),kind=memoryKindLabel(card.kind,locale)
 return <button type="button" className={`min-h-tap ${css.card}`} data-card-id={card.id} data-state={done?'done':wrong?'wrong':face?'open':'closed'} data-echo={echo||undefined}
  aria-disabled={done||flashing||open||undefined} aria-pressed={face} aria-label={face?`${shown} — ${kind}${done?` — ${labels.matched}`:''}`:echo?`${labels.closed(n)} — ${labels.echo}`:labels.closed(n)} onClick={e=>{if(done||flashing||open)return;onFlip(card.id,e.currentTarget)}}>
  {face?<span className={css.face} key="face">
   <ObjectMark object={card.object} className={css.obj}/>
   <span className={css.faceText} lang={contentLocale} dir="auto">{numericFace(shown)?<Num>{shown}</Num>:shown}</span>
   <span className={css.faceKind} lang={locale==='en'?'en':contentLocale} dir="auto">{kind}</span>
  </span>
  :<span className={css.back} aria-hidden="true" key="back"><i/></span>}
  {done&&<span className={css.stamp} aria-hidden="true">✓{order>0?` ${order}`:''}</span>}
  {wrong&&<span className={css.cross} aria-hidden="true">✗</span>}
 </button>
})

'use client'
import type {MouseEvent} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {DraftView} from '@/lib/clubs/rumble-draft'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {RumbleCard} from '@/lib/clubs/rumble'
import type {Group} from '@/lib/draft-core/types'
import {GROUPS} from '@/lib/draft-core/types'
import {RumbleSlotMachine} from './RumbleSlotMachine'
import {money,posName,posShort,tr} from './shared'
import s from './rumble.module.css'

/** the first screen of every slot: pick ANY position group that still has a place, then three men of it — one per price tier */
export function DraftPanel({copy,view,groupsLeft,busy,error,onOpen,onReroll,onPick,nextLabel,wardrobe,reduced,seed,pickedCount,total}:{copy:GameCopy;view:DraftView|null;groupsLeft:Record<Group,number>;busy:boolean;error:string|null;onOpen:(g:Group)=>void;onReroll:()=>void;onPick:(c:RumbleCard,e:MouseEvent<HTMLButtonElement>)=>void;nextLabel?:(g:Group)=>string|null;wardrobe:RumbleWardrobe;reduced:boolean;seed:number;pickedCount:number;total:number}){
 const verdict=(g:Group)=>view?.groups.find(x=>x.group===g)
 const active=view?.active??null,offers=view?.offers??[],rerolls=view?.rerollsLeft??3
 const closedWhy=GROUPS.map(g=>({g,v:verdict(g)})).find(x=>x.v&&!x.v.open&&x.v.remaining>0)?.v?.reason??null
 const sig=`${seed}-${view?.rev??0}-${active}`
 return <div data-testid="rumble-draft">
  <div className={s.groups} role="group" aria-label={tr(copy,'rr.draft.choose')}>
   {GROUPS.map(g=>{const v=verdict(g),left=v?v.remaining:groupsLeft[g],open=v?v.open:left>0,nx=nextLabel?.(g)
    return <button type="button" key={g} className={`${s.groupBtn} min-h-tap`} aria-pressed={active===g} aria-disabled={!open||busy} data-next={active===g||undefined} data-testid={`rumble-group-${g}`} title={!open?v?.reason??undefined:undefined}
     onClick={()=>{if(busy)return;if(open)onOpen(g)}}>
     <span>{posShort(copy,g)}</span><small dir="ltr">{tr(copy,'rr.draft.places',{n:left})}</small>{nx&&open&&<small>{nx}</small>}
    </button>})}
  </div>
  <p className={s.draftNote} role="status" aria-live="polite">{error??(!active?tr(copy,'rr.draft.choose'):closedWhy)}</p>
  {active&&offers.length>0&&<>
   <div className={s.draftTop}>
    <button type="button" className={`${s.chip} min-h-tap`} disabled={busy||rerolls<=0} onClick={onReroll} data-testid="rumble-reroll"><span>{rerolls>0?tr(copy,'rr.draft.reroll',{n:rerolls}):tr(copy,'rr.draft.rerollNone')}</span></button>
    {view&&<span className={`${s.chip} ${s.rules}`} aria-live="polite" style={{cursor:'default'}} dir="ltr">{view.keep!==null&&view.keep>0?tr(copy,'rr.draft.keep',{n:money(view.keep)}):money(view.cash)}</span>}
   </div>
   <RumbleSlotMachine board={[offers.map(o=>o.card)]} slot={0} seed={seed} picks={[null]} canPick={c=>!offers.find(o=>o.card.id===c.id)?.locked} onPick={onPick} copy={copy} wardrobe={wardrobe} reduced={reduced} signature={sig}
    tiers={offers.map(o=>tr(copy,`rr.draft.tier.${o.tier}`))} reasons={offers.map(o=>o.locked?.reason??null)}
    heading={{no:String(pickedCount+1).padStart(2,'0'),meta:tr(copy,'rr.draft.meta',{n:pickedCount+1,total,position:posShort(copy,active)}),question:tr(copy,'rr.question',{position:posName(copy,active)})}}/>
  </>}
 </div>
}

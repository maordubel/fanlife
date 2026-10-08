'use client'
import {FitBox} from '@/components/stage/FitBox'
import {dropZone,useDragSource} from '@/components/stage/useDrag'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {ClubPlayer} from '@/lib/clubs/contract'
import {FORMATIONS} from '@/lib/game/formations'
import {TWELFTH,occupant,type Where} from '@/lib/clubs/xi-model'
import type {ClubXI} from '@/lib/clubs/xi'
import {shortName} from '@/components/clubs/rumble/shared'
import css from './xi.module.css'

/** The pitch is 100 wide and 133 tall (ratio .75): wide enough that a shirt is a shirt on a 360px phone. */
export const PITCH_RATIO=0.75
/** formation y (14 = the striker's line … 94 = the keeper) → where the token's CENTRE sits, kept inside the touchlines */
export const topOf=(y:number)=>11+(y-14)*(77/80)

function Lines(){
 return <svg className={css.lines} viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <line x1="0" y1="66.5" x2="100" y2="66.5"/><circle cx="50" cy="66.5" r="10"/><circle className={css.spot} cx="50" cy="66.5" r=".9"/>
  <rect x="22" y="0" width="56" height="20"/><rect x="36" y="0" width="28" height="7.5"/><circle className={css.spot} cx="50" cy="15" r=".9"/>
  <rect x="22" y="113" width="56" height="20"/><rect x="36" y="125.5" width="28" height="7.5"/><circle className={css.spot} cx="50" cy="118" r=".9"/>
 </svg>
}

export type PitchProps={
 xi:ClubXI;byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;side:'us'|'them';kind:'best'|'worst'
 active:Where;contentLocale:string
 /** LTR screens mirror the formation: the right back stands on the right of the screen, as on a match-day graphic */
 flip:boolean
 label:(role:string,name:string|null)=>string
 chairLabel:string;chairTag:string
 onSelect:(where:Where)=>void
 onMove:(from:Where,zone:string)=>void
 hud:{count:string;done:boolean;formation:string;onFormation:()=>void;formationLabel:string}
}

function Token({where,role,x,y,xi,byId,wardrobe,side,active,contentLocale,flip,label,onSelect,onMove,chair,chairTag}:{where:Where;role:string;x?:number;y?:number}&Omit<PitchProps,'kind'|'hud'|'chairLabel'|'chairTag'>&{chair?:boolean;chairTag?:string}){
 const id=occupant(xi,where),p=id?byId.get(id)??null:null
 const drag=useDragSource({payload:`slot:${where}`,disabled:!p,onDrop:zone=>onMove(where,zone)})
 const style=chair?undefined:{insetInlineStart:`${flip?100-x!:x}%`,top:`${topOf(y!)}%`}
 return <button type="button" {...drag} {...dropZone(`xi:${where}`)} className={`min-h-tap ${css.token} ${chair?css.chair:''}`} style={{...drag.style,...style}}
  data-slot={where} data-active={active===where} aria-pressed={active===where} aria-label={label(role,p?.name??null)} onClick={()=>onSelect(where)} data-player-id={p?.id}>
  {p
   ?<><span className={css.shirt} key={p.id}><ClubShirt player={p} wardrobe={wardrobe} side={side}/>{xi.captain===p.id&&where!==TWELFTH&&<span className={css.cap} aria-hidden="true">C</span>}</span>
     <span className={css.plate} lang={contentLocale} dir="auto">{shortName(p.name)}</span></>
   :<><span className={css.empty} aria-hidden="true">{chair?'12':role}</span>{chair&&<span className={css.chairTag}>{chairTag}</span>}</>}
 </button>
}

/** The playing surface: percent-positioned men, every one a drop zone and (when filled) a drag source. */
export function XIPitch(props:PitchProps){
 const {xi,kind,hud}=props
 return <FitBox ratio={PITCH_RATIO} always={false}>
  <div className={css.pitch} data-kind={kind} data-testid="xi-pitch">
   <Lines/>
   <span className={css.hudCount} data-done={hud.done} role="status">{hud.count}</span>
   <button type="button" className={`min-h-tap ${css.hudFormation}`} onClick={hud.onFormation} aria-label={hud.formationLabel}>{hud.formation} ▾</button>
   {FORMATIONS[xi.formation]!.slots.map(s=><Token key={s.slotId} where={s.slotId} role={s.role} x={s.x} y={s.y} {...props}/>)}
   <Token where={TWELFTH} role="12" chair {...props}/>
  </div>
 </FitBox>
}

'use client'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {DuelCandidate} from '@/lib/clubs/polls-duel/types'
import css from './duel.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
/** the years a name is recorded for, in words — or nothing: an unknown span is never printed as a guess */
export function yearsOf(c:Pick<DuelCandidate,'yearFrom'|'yearTo'>,t:T):string|null{
 const a=c.yearFrom??null,b=c.yearTo??null
 if(a===null&&b===null)return null
 if(a!==null&&b!==null)return a===b?String(a):t('pc.years',{a,b})
 return a!==null?t('pc.years.open',{a}):String(b)
}
/**
 * The picture of a name: a player is his documented shirt (the club's own kit nearest his years, never a stand-in from
 * another side); a moment is a plain plate with its year. Never a photograph of somebody else.
 */
export function Mark({cand,byId,wardrobe,big=false}:{cand:DuelCandidate;byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;big?:boolean}){
 const p=cand.kind==='player'?byId.get(cand.id):undefined
 if(p)return <span className={big?css.pickShirt:css.shirt} aria-hidden="true"><ClubShirt player={p} wardrobe={wardrobe} side="us"/></span>
 const y=cand.yearFrom??cand.yearTo
 return <span className={css.plate} aria-hidden="true">{y??'•'}</span>
}

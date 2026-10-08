import type {GameCopy} from '@/lib/clubs/game-copy'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'
import {resultOf,type WallMeeting,type Result} from '@/lib/clubs/derby-model'

export type T=(key:string,vars?:Record<string,string|number>)=>string
/** a plain interpolating lookup — no 'use client' module in the chain, so server views and client presenters can both call it */
const tr=(copy:GameCopy,key:string,vars:Record<string,string|number>={}):string=>((copy as Record<string,string>)[key]??key).replace(/\{(\w+)\}/g,(_,k:string)=>k in vars?String(vars[k]):`{${k}}`)
export const makeT=(copy:GameCopy):T=>(k,v)=>tr(copy,k,v)
export type Open=(m:WallMeeting,opener:HTMLElement|null)=>void
export type Shared={t:T;locale:UiLocale;contentLocale:string;club:string;clubName:string;rival:string}

/** The date as the archive states it: the day when it has one, the bare year (labelled as such) when it has not. */
export function dateText(m:WallMeeting,locale:UiLocale,t:T):string{
 if(m.on)return localizedDate(m.on,locale)
 if(m.year!==null)return t('derby.date.yearOnly',{year:m.year})
 return t('derby.date.unknown')
}
export const resKey=(m:WallMeeting):Result|'U'=>resultOf(m)??'U'

/** home – away, always one LTR-isolated run, so a Hebrew name can never flip the score. */
export function Names({m,contentLocale,className}:{m:WallMeeting;contentLocale:string;className?:string}){
 return <span className={className} dir="ltr"><span data-us={m.us==='home'}><bdi lang={contentLocale} dir="auto">{m.home}</bdi></span><span data-us={m.us==='away'}><bdi lang={contentLocale} dir="auto">{m.away}</bdi></span></span>
}

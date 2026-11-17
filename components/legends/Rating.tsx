'use client'
import {ratingBand} from '@/lib/legends/match-ratings'

/**
 * The match-rating chip (17.11.2026): the number on a coloured plate, one decimal, the same five bands on every screen —
 * 8+ gold, 7+ green, 6.3+ ivory, 5.6+ amber, under that red. A changed number pulses once (`key` on the value), so a live
 * rating that moves is seen moving. The plate is never the only sign: the number is always written.
 */
export function RatingChip({r,size='md',potm=false,label}:{r:number|null|undefined;size?:'sm'|'md'|'lg';potm?:boolean;label?:string}){
 if(r==null)return <i className="lgm-rt" data-size={size} data-band="none" aria-label={label??'No rating yet'}>–</i>
 return <i key={r} className="lgm-rt" data-size={size} data-band={ratingBand(r)} data-potm={potm||undefined} aria-label={`${label?`${label} `:''}rating ${r.toFixed(1)}${potm?', player of the match':''}`}>{r.toFixed(1)}{potm?<b aria-hidden="true">★</b>:null}</i>
}
/** the last five match ratings as five small bars — the form line FM fans read at a glance */
export function FormBars({last}:{last:readonly number[]}){
 if(!last.length)return null
 return <span className="lgm-formbars" aria-label={`Last ${last.length}: ${last.map(x=>x.toFixed(1)).join(', ')}`}>{last.map((x,i)=><i key={i} data-band={ratingBand(x)} style={{blockSize:`${Math.round(20+Math.max(0,Math.min(1,(x-4.5)/5))*80)}%`}}/>)}</span>
}

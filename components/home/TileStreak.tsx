'use client'
import {useEffect,useState} from 'react'
import {dayOf,readStreak,streakOf} from '@/lib/clubs/streak'
/** The fan's streak at this one club, printed on its tile. Nothing printed for zero. */
export function TileStreak({clubId,label}:{clubId:string;label:string}){
 const [n,setN]=useState(0)
 useEffect(()=>{setN(streakOf(readStreak(clubId),dayOf(new Date())))},[clubId])
 return n>0?<span className="wkh-stk-streak wk-k" data-testid="tile-streak">{label.replace('{n}',String(n))}</span>:null
}

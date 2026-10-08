'use client'
import {useEffect,useRef} from 'react'
import {type RunGate} from '@/lib/clubs/activity'
import {completeRun} from '@/lib/clubs/completion'

/** Mounted inside a finished round's result: puts the round on the club's ticket, once. */
export function RecordRun({club,gate,run,score=0}:{club:string;gate:RunGate;run:string;score?:number}){
 const done=useRef(false)
 useEffect(()=>{if(done.current)return;done.current=true;completeRun(club,gate,run,score)},[club,gate,run,score])
 return null
}

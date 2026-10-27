'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {lifeProgress} from '@/lib/life/universal/progress'

/**
 * Connected Football (27.10.2026): the LIFE door reads this device's own save for THIS club (the multi-club engine's key,
 * never The Worker's) and says Continue when there is a life to go back to. Without a save — or storage — it stays Enter.
 */
export function LifeContinue({club,href,enter,cont,waiting,note}:{club:string;href:string;enter:string;cont:string;waiting:string;note:string}){
 const [n,setN]=useState<number|null>(null)
 useEffect(()=>{try{setN(lifeProgress(club,window.localStorage)?.chapters??null)}catch{setN(null)}},[club])
 return <>
  <p className="wkk-life-note">{n?waiting.replace('{n}',String(n)):note}</p>
  <Link className="wk-btn red wkk-life-cta min-h-tap" href={href} data-intent={n?'resume':'start'}>{n?cont:enter}</Link>
 </>
}

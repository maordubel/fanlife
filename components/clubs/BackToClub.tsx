'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {LAST_CLUB_KEY} from './RememberClub'

/** "Back to <last club>": one chip on the hub, only for a club that is open and only once you have been inside one. */
export function BackToClub({clubs,locale,label}:{clubs:{id:string;name:string}[];locale:string;label:string}) {
 const [id,setId]=useState<string|null>(null)
 useEffect(()=>{try{const v=localStorage.getItem(LAST_CLUB_KEY);setId(v&&clubs.some(c=>c.id===v)?v:null)}catch{setId(null)}},[clubs])
 const c=clubs.find(x=>x.id===id)
 if(!c)return null
 return <Link className="mag-chip club-back" href={`/clubs/${c.id}${locale==='en'?'':`?lang=${locale}`}`} data-testid="back-to-club">{label.replace('{club}',c.name)} →</Link>
}

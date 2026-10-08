'use client'
import {useEffect} from 'react'
export const LAST_CLUB_KEY='fanlife.last-club.v1'
/** Remembers, on this device only, the club you were last inside, so the hub can offer a way back. Renders nothing. */
export function RememberClub({clubId}:{clubId:string}) {
 useEffect(()=>{try{localStorage.setItem(LAST_CLUB_KEY,clubId)}catch{/* storage is a convenience */}},[clubId])
 return null
}

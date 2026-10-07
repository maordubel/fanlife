'use client'
import {useEffect,useState} from 'react'
import {readActivity,activityKey,xiKey,pollKey,type Activity} from '@/lib/clubs/activity'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
export function ClubActivity({club,locale}:{club:string;locale:UiLocale}){
 const [activity,setActivity]=useState<Activity|null>(null),copy=gameCopy(locale)
 useEffect(()=>{setActivity(readActivity(club))},[club])
 const clear=()=>{try{localStorage.removeItem(activityKey(club));localStorage.removeItem(xiKey(club));localStorage.removeItem(pollKey(club));setActivity(readActivity(club))}catch{/* Nothing was changed. */}}
 // A season ticket: one tile per game, the count large, the best score under it.
 return <div className="mag-ticket" data-testid="club-activity"><p className="mag-fine">{copy.localOnly}</p>{activity&&<><div className="mag-stats">{(['trivia','memory','polls','blind-cow'] as const).map(g=><div key={g}><b>{activity[g].completed}</b><span>{copy[`gate.${g}`]}</span>{(g==='trivia'||g==='memory')&&<small>{copy.best}: {activity[g].best}</small>}</div>)}<div><b>{activity.xi?'XI':'—'}</b><span>{copy['gate.xi']}</span><small>{activity.xi?copy.xiSaved:copy.notSaved}</small></div></div><button className="mag-chip min-h-tap" onClick={clear}>{copy.clearActivity}</button></>}</div>
}

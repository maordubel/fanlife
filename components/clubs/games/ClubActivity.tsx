'use client'
import {useEffect,useState} from 'react'
import {readActivity,activityKey,xiKey,pollKey,type Activity} from '@/lib/clubs/activity'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
export function ClubActivity({club,locale}:{club:string;locale:UiLocale}){
 const [activity,setActivity]=useState<Activity|null>(null),copy=gameCopy(locale)
 useEffect(()=>{setActivity(readActivity(club))},[club])
 return <section className="panel spaced" data-testid="club-activity"><h2>{copy.progress}</h2><p>{copy.localOnly}</p>{activity&&<><div className="gates spaced">{(['trivia','memory','polls','blind-cow'] as const).map(g=><div key={g}><h3>{copy[`gate.${g}`]}</h3><p>{copy.completed}: {activity[g].completed}{(g==='trivia'||g==='memory')&&<> · {copy.best}: {activity[g].best}</>}</p></div>)}<div><h3>{copy['gate.xi']}</h3><p>{activity.xi?copy.xiSaved:copy.notSaved}</p></div></div><button className="button spaced min-h-tap" onClick={()=>{try{localStorage.removeItem(activityKey(club));localStorage.removeItem(xiKey(club));localStorage.removeItem(pollKey(club));setActivity(readActivity(club))}catch{/* Nothing was changed. */}}}>{copy.clearActivity}</button></>}</section>
}

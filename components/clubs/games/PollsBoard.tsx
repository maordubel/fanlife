'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import type {ClubPoll} from '@/lib/clubs/polls'
import {gameCopy} from '@/lib/clubs/game-copy'
import {recordActivity,pollKey} from '@/lib/clubs/activity'
import type {UiLocale} from '@/lib/clubs/locale'
export function PollsBoard({polls,club,version,seed,cursor,locale,contentLocale}:{polls:ClubPoll[];club:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string}){
 const copy=gameCopy(locale),[votes,setVotes]=useState<Record<string,string>>({}),[loaded,setLoaded]=useState(false),[saved,setSaved]=useState<boolean|null>(null),[queries,setQueries]=useState<Record<string,string>>({})
 useEffect(()=>{try{const raw=localStorage.getItem(pollKey(club));if(raw&&raw.length<20000){const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value))setVotes(Object.fromEntries(polls.filter(p=>p.choices.some(c=>c.id===value[p.id])).map(p=>[p.id,value[p.id]])))}}catch{/* No usable saved ballot. */}setLoaded(true)},[club,polls])
 const complete=loaded&&polls.every(p=>votes[p.id])
 function vote(id:string,choice:string){const next={...votes,[id]:choice};setVotes(next);try{let previous={};const raw=localStorage.getItem(pollKey(club));if(raw&&raw.length<20000){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))previous=parsed}localStorage.setItem(pollKey(club),JSON.stringify({...previous,...next}));setSaved(true)}catch{setSaved(false)}}
 useEffect(()=>{if(complete)recordActivity(club,'polls',`polls:${version}:${seed}:${cursor}`)},[complete,club,version,seed,cursor])
 return <section className="game-panel" data-testid="polls-board"><p>{copy.pollSub}</p>{polls.map(p=><fieldset className="game-panel" key={p.id} data-poll-id={p.id}><legend>{p.prompt}</legend><label>{copy.search}<input className="w-full" type="search" value={queries[p.id]||''} onChange={e=>setQueries(q=>({...q,[p.id]:e.target.value}))}/></label><label>{copy.pick}<select aria-label={p.prompt} className="min-h-tap w-full" value={votes[p.id]||''} onChange={e=>vote(p.id,e.target.value)}><option value="">{copy.pick}</option>{p.choices.filter(c=>c.id===votes[p.id]||c.name.toLocaleLowerCase().includes((queries[p.id]||'').toLocaleLowerCase())).map(c=><option key={c.id} value={c.id} lang={contentLocale}>{c.name}</option>)}</select></label></fieldset>)}{saved!==null&&<p role="status">{saved?copy.pollSaved:copy.savedUnavailable}</p>}{complete&&<div data-testid="polls-result"><h2>{copy.complete}</h2><Link className="game-button" href={`?seed=${seed}&r=${cursor+1}&lang=${locale}`}>{copy.replay}</Link></div>}</section>
}

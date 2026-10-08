'use client'
import {useEffect,useMemo,useState} from 'react'
import {SHARE_TEMPLATES} from '@/lib/share/v3/templates'
import {renderShare,SHARE_FORMATS,type ShareAssets,type ShareFormat} from '@/lib/share/v3/render'
import {shareClubs,clubOrigin,policyNote} from '@/lib/share/v3/theme'
import {canvasMeasure,loadShareAssets} from '@/lib/share/v3/client'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {triviaShare,xiShare} from '@/lib/share/v3/adapters'

export function ShareGallery(){
 const clubs=useMemo(()=>shareClubs(),[]),[club,setClub]=useState('panathinaikos'),[format,setFormat]=useState<ShareFormat>('story'),[assets,setAssets]=useState<ShareAssets|null>(null)
 useEffect(()=>{const q=new URLSearchParams(location.search);if(q.get('club'))setClub(q.get('club')!);if(q.get('format'))setFormat(q.get('format') as ShareFormat);loadShareAssets().then(setAssets)},[])
 const c=clubs.find(x=>x.id===club)!
 const cards=useMemo(()=>assets?SHARE_TEMPLATES.map(t=>{const r=renderShare(t,{...t,club,sample:true,link:clubOrigin(c)+'/'},format,{assets,measure:canvasMeasure});return {t,url:URL.createObjectURL(new Blob([r.svg],{type:'image/svg+xml'})),warnings:r.warnings}}):[],[assets,club,format,c])
 return <main lang="en" dir="ltr" style={{padding:16}} data-testid="share-gallery" data-ready={assets?'1':'0'}>
  <h1 className="mag-h2">Share kit V3 · {c.name}</h1><p className="mag-fine">{policyNote(c)}</p>
  <p style={{display:'flex',gap:8,flexWrap:'wrap'}}><select aria-label="Club" value={club} onChange={e=>setClub(e.target.value)} className="min-h-tap">{clubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>{(Object.keys(SHARE_FORMATS) as ShareFormat[]).map(f=><button key={f} type="button" className="mag-chip" aria-pressed={f===format} onClick={()=>setFormat(f)}>{SHARE_FORMATS[f].label}</button>)}</p>
  <p style={{display:'flex',gap:12,flexWrap:'wrap'}}><ShareComposer draft={triviaShare(club,{seed:42,cursor:0,correct:9,answered:12,marks:[true,true,false,true,true,true,false,true,true,false,true,true],score:840,bestCombo:4})} label="Composer · trivia"/><ShareComposer draft={xiShare(club,{formation:'4-3-3',lines:[['Keeper'],['Right Back','Centre Back','Centre Back','Left Back'],['Midfield','Midfield','Midfield'],['Winger','Striker','Winger']],captain:'Striker'})} label="Composer · XI"/></p>
  <ul style={{listStyle:'none',padding:0,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>{cards.map(({t,url,warnings})=><li key={t.id}><img src={url} alt={t.name} style={{width:'100%',border:'2px solid var(--mag-ink)'}}/><small>{t.id}{warnings.length?` · ${warnings.length} note(s)`:''}</small></li>)}</ul>
 </main>
}

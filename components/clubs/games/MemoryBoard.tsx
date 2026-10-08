'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import type {MemoryRound} from '@/lib/game/memory'
import {gameCopy} from '@/lib/clubs/game-copy'
import {completeRun} from '@/lib/clubs/completion'
import type {UiLocale} from '@/lib/clubs/locale'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {memoryShare} from '@/lib/share/v3/adapters'
import {MEMORY_KIND_EN,memoryKindLabel} from '@/lib/clubs/memory-kinds'
export function MemoryBoard({round,club,version,seed,cursor,locale,contentLocale}:{round:MemoryRound;club:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string}){
 const copy=gameCopy(locale),[open,setOpen]=useState<string[]>([]),[matched,setMatched]=useState<string[]>([]),[moves,setMoves]=useState(0),recorded=useRef(false),complete=matched.length===round.pairs.length
 useEffect(()=>{if(open.length!==2)return;const a=round.cards.find(c=>c.id===open[0])!,b=round.cards.find(c=>c.id===open[1])!
  const timer=setTimeout(()=>{if(a.pair===b.pair)setMatched(p=>p.includes(a.pair)?p:[...p,a.pair]);setOpen([])},700)
  return ()=>clearTimeout(timer)
 },[open,round.cards])
 useEffect(()=>{if(complete&&!recorded.current){recorded.current=true;completeRun(club,'memory',`memory:${version}:${seed}:${cursor}`,Math.max(0,round.pairs.length*200-moves*10))}},[complete,club,version,seed,cursor,round.pairs.length,moves])
 return <section className="game-panel"><h2>{copy.memoryTitle}</h2><p>{copy.memorySub}</p><div className="game-hud"><span>{copy.matched}: {matched.length}/{round.pairs.length}</span><span>{copy.flips}: {moves}</span></div>
  <div className="memory-grid" data-testid="memory-board">{round.cards.map((card,index)=>{const visible=open.includes(card.id)||matched.includes(card.pair);return <button key={card.id} data-card-id={card.id} className="memory-card min-h-tap" aria-pressed={visible} aria-label={visible?card.face:`${copy['gate.memory']} ${index+1}`} disabled={matched.includes(card.pair)||open.length===2||open.includes(card.id)} onClick={()=>{setOpen(p=>[...p,card.id]);if(open.length===1)setMoves(n=>n+1)}}><small lang={locale==='en'&&MEMORY_KIND_EN[card.kind]?'en':contentLocale} dir="auto">{memoryKindLabel(card.kind,locale)}</small><span lang={contentLocale} dir="auto">{visible?card.face:'?'}</span></button>})}</div>
  <div aria-live="polite">{matched.map(id=>{const pair=round.pairs.find(p=>p.id===id)!;return <p key={id} lang={contentLocale} dir="auto">{pair.a} ↔ {pair.b}{pair.factHe&&` · ${pair.factHe}`}</p>})}</div>
  {complete&&<div data-testid="memory-result" role="status"><h2>{copy.memoryComplete}</h2><p>{copy.flips}: {moves}</p><p>{copy.localOnly}</p><ShareComposer draft={memoryShare(club,{seed,cursor,moves,pairs:round.pairs.length})}/><Link className="game-button" href={`?seed=${seed}&r=${cursor+1}&lang=${locale}`}>{copy.replay}</Link></div>}
  <Link className="game-button" href={`/clubs/${club}/archive?lang=${locale}`}>{copy['gate.archive']}</Link>
 </section>
}

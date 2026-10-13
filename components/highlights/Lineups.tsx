'use client'
import {shirtArt,teamMark} from '@/lib/highlights/board'
import type {Reel} from '@/lib/highlights/types'
import {Shirt} from './Shirt'
import css from './theatre.module.css'

/**
 * The line-ups as a broadcast card (owner's reference: the World Cup '94 caption — a blue board, the colours of the side beside
 * its name, the eleven in white italics with their numbers). Each board carries the club's crest where the repo holds one and
 * the shirt the side wears tonight, drawn with its maker and sponsor where the archive documents them.
 * Side by side on a wide screen; on a phone one above the other, the shirt tucked beside the list.
 */
export function Lineups({teams,onStart}:{teams:Reel['teams'];onStart:()=>void}){
 return <div className={css.lineups}>
  <div className={css.boards}>{teams.map((t,i)=>{const mark=teamMark(t);return <section key={i} className={css.board} data-side={i} aria-label={`${t.name} line-up`}>
   <h3>{mark.kind==='crest'?<span className={css.crest}>{/* eslint-disable-next-line @next/next/no-img-element -- the club's own crest file, shown as it is */}<img src={mark.src} alt="" width={139} height={181} decoding="async"/></span>:<span className={css.flag} style={{background:mark.background}} aria-hidden="true"/>}<span className={css.boardName}>{t.name}</span><i className={css.boardTag}>{i===0?'Home':'Away'}</i></h3>
   {t.formation?<p className={css.formation}>{t.formation}</p>:null}
   <div className={css.boardBody}>
    <ol>{t.lineup.filter(p=>!p.bench).sort((a,b)=>a.no-b.no).map(p=><li key={p.id}><b>{p.no}</b><span>{p.name}</span></li>)}</ol>
    <figure className={css.boardShirt} data-shirt-kind={t.cloth?'cloth':'pixel'}><Shirt art={shirtArt(t)} className={css.shirtArt} title={`${t.name} shirt`}/></figure>
   </div>
  </section>})}</div>
  <button type="button" className={`${css.btn} ${css.kick} min-h-tap`} onClick={onStart}>Kick off</button>
 </div>
}

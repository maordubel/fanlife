'use client'
import type {Reel} from '@/lib/highlights/types'
import css from './theatre.module.css'

/**
 * The line-ups as a broadcast card (owner's reference: the World Cup '94 caption — a blue board, the colours of the side beside
 * its name, the eleven in white italics with their numbers). Side by side on a wide screen, one above the other on a phone.
 */
export function Lineups({teams,onStart}:{teams:Reel['teams'];onStart:()=>void}){
 return <div className={css.lineups}>
  <div className={css.boards}>{teams.map((t,i)=><section key={i} className={css.board} aria-label={`${t.name} line-up`}>
   <h3><span className={css.flag} style={{background:t.kit.second&&t.kit.pattern!=='plain'?`linear-gradient(90deg,${t.kit.shirt} 0 33%,${t.kit.second} 33% 66%,${t.kit.shirt} 66%)`:`linear-gradient(90deg,${t.kit.shirt} 0 50%,${t.kit.shorts} 50%)`}} aria-hidden="true"/>{t.name}</h3>
   {t.formation?<p className={css.formation}>{t.formation}</p>:null}
   <ol>{t.lineup.filter(p=>!p.bench).sort((a,b)=>a.no-b.no).map(p=><li key={p.id}><b>{p.no}</b><span>{p.name}</span></li>)}</ol>
  </section>)}</div>
  <button type="button" className={`${css.btn} ${css.kick} min-h-tap`} onClick={onStart}>Kick off</button>
 </div>
}

'use client'
import Link from 'next/link'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {MysteryMark} from './MysteryMark'
import {secondsLabel} from '@/lib/game/blind-cow/scoring'
import {ledger,standing,verdictOf,type Challenge} from '@/lib/clubs/mystery-model'
import type {MysteryView} from '@/lib/clubs/mystery'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import css from './blind-cow.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
export type ResultProps={
 run:MysteryView;mode:'solo'|'daily'|'duel';player:ClubPlayer|null;wardrobe:RumbleWardrobe;contentLocale:string;club:string;locale:string
 /** the friend's number, when this run is the answer to a challenge link */
 versus:Challenge|null;t:T;notice:string;pending:boolean;nextDaily:boolean
 onShare:()=>void;onChallenge:(()=>void)|null;onAgain:(()=>void)|null;onLobby:()=>void
}
/** The result: the identity reveal, the score shown as a sum, the comparison with a friend, and what to do next. */
export function ResultCard({run,mode,player,wardrobe,contentLocale,club,locale,versus,t,notice,pending,nextDaily,onShare,onChallenge,onAgain,onLobby}:ResultProps){
 const r=run.result;if(!r)return null
 const solved=run.status==='solved',lg=ledger(r.rawElapsedMs,run.shown,run.wrong,r.weightedTimeMs),verdict=verdictOf(solved,run.shown,run.total)
 const vs=versus?standing({solved,weightedMs:r.weightedTimeMs},versus):null
 const them=versus&&versus.solved&&versus.weightedMs!==null?secondsLabel(versus.weightedMs):null
 const vsText=!vs?'':vs.kind==='win'?(versus?.solved?t('bc.vs.win',{s:secondsLabel(vs.marginMs)}):t('bc.vs.winMiss')):vs.kind==='lose'?(versus?.solved&&solved?t('bc.vs.lose',{s:secondsLabel(vs.marginMs)}):t('bc.vs.loseMiss')):vs.kind==='tie'?t('bc.vs.tie'):t('bc.vs.open')
 return <article className={css.result} data-testid="mystery-result" data-solved={solved} aria-label={t(solved?'bc.res.solved':'bc.res.missed')}>
  <div className={css.resultScroll}>
   <header className={css.ticketHead}><span className={css.ticketMode}>{t(`bc.mode.${mode}`)}</span><b role="status">{t(solved?'bc.res.solved':'bc.res.missed')}</b></header>
   <section className={css.reveal}>
    <span className={css.revealShirt}>{player?<ClubShirt player={player} wardrobe={wardrobe} side="us" className={css.revealShirtSvg}/>:<MysteryMark peek className={css.revealShirtSvg}/>}</span>
    <div className={css.revealText}>
     <p className={css.was}>{t('bc.res.was')}</p>
     <h2 className={css.name} lang={contentLocale} dir="auto" data-testid="mystery-name">{r.name}</h2>
     {player&&<p className={css.meta} lang={contentLocale}>{[player.positions.join(' / '),`${player.fromYear??'?'}–${player.toYear??'?'}`].filter(Boolean).join(' · ')}</p>}
    </div>
   </section>
   <p className={css.verdict}>{t(`bc.verdict.${verdict}`)}</p>
   <section className={css.ledger} aria-label={t('bc.ledger.title')}>
    <h3>{t('bc.ledger.title')}</h3>
    {lg?<dl>
     <div><dt>{t('bc.ledger.raw')}</dt><dd>{secondsLabel(lg.rawMs)}s</dd></div>
     {lg.extraClues>0&&<div><dt>{lg.extraClues===1?t('bc.ledger.clues1'):t('bc.ledger.clues',{n:lg.extraClues})}</dt><dd>+{secondsLabel(lg.clueMs)}s</dd></div>}
     {run.wrong>0&&<div><dt>{run.wrong===1?t('bc.ledger.wrong1'):t('bc.ledger.wrong',{n:run.wrong})}</dt><dd>+{secondsLabel(lg.wrongMs)}s</dd></div>}
     <div className={css.total}><dt>{t('bc.ledger.total')}</dt><dd data-testid="mystery-weighted">{secondsLabel(lg.totalMs)}s</dd></div>
    </dl>:<dl><div className={css.total}><dt>{t('bc.ledger.total')}</dt><dd data-testid="mystery-weighted">{secondsLabel(r.weightedTimeMs)}s</dd></div></dl>}
    <p className={css.fine}>{t('bc.ledger.rule')}</p>
   </section>
   {vs&&<section className={css.versus} data-kind={vs.kind} data-testid="mystery-versus">
    <div><span>{t('bc.vs.you')}</span><b>{solved?`${secondsLabel(r.weightedTimeMs)}s`:'—'}</b></div>
    <div><span>{t('bc.vs.them')}</span><b>{them?`${them}s`:'—'}</b></div>
    <p>{vsText}</p>
    <p className={css.fine}>{t('bc.duel.note')}</p>
   </section>}
   {mode==='daily'&&nextDaily&&<p className={css.fine}>{t('bc.res.tomorrow')}</p>}
   {r.sources.length>0&&<details className={css.sources}><summary>{t('bc.res.sources')} ({r.sources.length})</summary>
    <ul>{r.sources.map(s=><li key={s.id}>{s.url?<a href={s.url} target="_blank" rel="noreferrer"><bdi>{s.title}</bdi> ↗</a>:<bdi>{s.title}</bdi>}</li>)}</ul></details>}
   <Link className={css.link} href={`/clubs/${club}/archive?q=${encodeURIComponent(r.name)}&lang=${locale}`}>{t('bc.res.archive')} ↗</Link>
  </div>
  <div className={css.resultDock}>
   <p className={css.status} role="status">{notice}</p>
   <div className={css.dockRow}>
    <button type="button" className={`${css.btn} ${css.primary}`} onClick={onShare}>{t('bc.share')}</button>
    {onChallenge&&<button type="button" className={css.btn} onClick={onChallenge}>{t('bc.share.challenge')}</button>}
   </div>
   <div className={css.dockRow}>
    {onAgain&&<button type="button" className={css.btn} disabled={pending} onClick={onAgain}>{t('bc.res.again')}</button>}
    <button type="button" className={css.btn} onClick={onLobby}>{t('bc.res.lobby')}</button>
   </div>
  </div>
 </article>
}

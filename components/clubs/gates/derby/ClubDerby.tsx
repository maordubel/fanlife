'use client'
import {useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {livery} from '@/lib/club-livery'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'
import {canPlay,shootoutOf,type WallMeeting} from '@/lib/clubs/derby-model'
import {CallPanel} from './CallPanel'
import {RecordPanel} from './RecordPanel'
import {WallPanel} from './WallPanel'
import {dateText,makeT,resKey,type Shared} from './ui'
import css from './derby.module.css'

type Tab='wall'|'call'|'record'
export type ClubDerbyProps={club:string;clubName:string;rival:string;rivalNote:string|null;meetings:WallMeeting[];version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;initialTab:Tab;autoStart:boolean}

/**
 * Gate 11 · Rivalry Wall (a generic template — every club, every approved rival).
 * Three views over ONE input, the meetings the archives document: the Wall (posters), Call it (a round) and the Record.
 * The club wears its own colour; the rival is ink and paper, always.
 */
export function ClubDerby(p:ClubDerbyProps){
 const {club,clubName,rival,rivalNote,meetings,version,seed,cursor,locale,contentLocale,copy}=p
 const t=useMemo(()=>makeT(copy),[copy]),rtl=localeDirection(locale)==='rtl'
 const [tab,setTab]=useState<Tab>(p.initialTab),[open,setOpen]=useState<WallMeeting|null>(null),opener=useRef<HTMLElement|null>(null)
 const s:Shared={t,locale,contentLocale,club,clubName,rival}
 const lv=livery(club),playable=canPlay(meetings)
 const onOpen=(m:WallMeeting,el:HTMLElement|null)=>{opener.current=el;setOpen(m)}
 const close=()=>{setOpen(null);window.requestAnimationFrame(()=>opener.current?.focus?.())}
 const tabs:{k:Tab;label:string}[]=[{k:'wall',label:t('derby.tab.wall')},{k:'call',label:t('derby.tab.call')},{k:'record',label:t('derby.tab.record')}]
 const onKey=(e:React.KeyboardEvent)=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return
  const i=tabs.findIndex(x=>x.k===tab),step=(e.key==='ArrowRight')!==rtl?1:-1
  const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+step+tabs.length)%tabs.length
  e.preventDefault();setTab(tabs[n]!.k);window.requestAnimationFrame(()=>document.getElementById(`derby-tab-${tabs[n]!.k}`)?.focus())
 }
 const r=open?resKey(open):'U'
 return <section className={css.stage} data-testid="derby-wall" data-tab={tab} data-playable={playable} lang={locale}>
  <div className={css.layout}>
   <div className={css.head}>
    <div className={css.versus} role="group" aria-label={`${clubName} ${t('derby.vs')} ${rival}`}>
     <div className={`${css.side} ${css.sideClub}`}>{lv&&<span className="mag-badge" data-livery={lv.pattern} aria-hidden="true">{lv.initials}</span>}<b><bdi>{clubName}</bdi></b></div>
     <span className={css.vs} aria-hidden="true">{t('derby.vs')}</span>
     <div className={`${css.side} ${css.sideRival}`}><b><bdi>{rival}</bdi></b></div>
    </div>
    {rivalNote&&<p className={css.rivalNote}><bdi>{rivalNote}</bdi></p>}
    <div className={css.tabs} role="tablist" aria-label={t('derby.tabs')} onKeyDown={onKey}>
     {tabs.map(x=><button key={x.k} id={`derby-tab-${x.k}`} type="button" role="tab" className={`${css.tab} min-h-tap`} aria-selected={tab===x.k} aria-controls="derby-panel" tabIndex={tab===x.k?0:-1} onClick={()=>setTab(x.k)}>{x.label}</button>)}
    </div>
   </div>
   <div className={css.panel} id="derby-panel" role="tabpanel" aria-labelledby={`derby-tab-${tab}`}>
    {tab==='wall'&&<WallPanel meetings={meetings} s={s} onOpen={onOpen}/>}
    {tab==='call'&&<CallPanel key={`${seed}:${cursor}`} meetings={meetings} s={s} seed={seed} cursor={cursor} version={version} rtl={rtl} autoStart={p.autoStart} onOpen={onOpen} onWall={()=>setTab('wall')}/>}
    {tab==='record'&&<RecordPanel meetings={meetings} s={s} onOpen={onOpen}/>}
   </div>
  </div>
  <SlideSheet open={open!==null} onClose={close} title={t('derby.dossier')} closeLabel={copy['play.close']}>
   {open&&<div className={css.dossier} data-testid="derby-dossier">
    <div className={css.dossHead} data-r={r}>
     <span className={css.dossScore} dir="ltr">{open.hg}–{open.ag}</span>
     <div className={css.dossSides} dir="ltr"><span><bdi lang={contentLocale} dir="auto">{open.home}</bdi></span><span><bdi lang={contentLocale} dir="auto">{open.away}</bdi></span></div>
    </div>
    <dl className={css.facts}>
     <dt>{t('derby.dossier.date')}</dt><dd><bdi>{dateText(open,locale,t)}</bdi></dd>
     <dt>{t('derby.dossier.comp')}</dt><dd><bdi lang={contentLocale} dir="auto">{open.comp||t('derby.dossier.noComp')}</bdi></dd>
     <dt>{t('derby.dossier.result',{club:clubName})}</dt><dd>{t(`derby.word.${r}`)}</dd>
     {(()=>{const so=shootoutOf(open);return so?<><dt>{t('derby.dossier.so')}</dt><dd><bdi dir="ltr">{t('derby.dossier.soLine',{us:so.us,them:so.them,word:so.won?t('derby.dossier.soWon',{club:clubName}):t('derby.dossier.soLost',{club:clubName})})}</bdi></dd></>:null})()}
     {open.us&&<><dt>{t('derby.dossier.played',{club:clubName})}</dt><dd>{open.us==='home'?t('derby.dossier.atHome'):t('derby.dossier.away')}</dd></>}
     {open.from.length>0&&<><dt>{t('derby.dossier.from')}</dt><dd>{open.from.map((f,k)=><span key={f}>{k>0?', ':''}<bdi>{f}</bdi></span>)}</dd></>}
    </dl>
    {open.us===null&&<p className={css.fine}>{t('derby.dossier.unstated',{club:clubName})}</p>}
   </div>}
  </SlideSheet>
 </section>
}

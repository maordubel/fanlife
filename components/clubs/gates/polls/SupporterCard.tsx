'use client'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {NAME_MAX,SLIP,filled,type Slip} from '@/lib/clubs/polls-model'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import css from './polls.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string

/** What the slip says for one line, in words: a name, `#9`, or a role. */
export function answerOf(slip:Slip,qid:string,byId:ReadonlyMap<string,ClubPlayer>,t:T):string|null{
 const v=slip.picks[qid];if(v===undefined)return null
 return qid==='number'?`#${v}`:qid==='position'?t(`tv.posn.${v}`):byId.get(v)?.name??null
}

/**
 * The supporter card: the slip read back as a person. Your name (kept on this device), the favourite on a shirt,
 * the number on your back, where you play, the other picks and how many carry a reason. It never prints a count of
 * other people, a rank or a score.
 */
export function SupporterCard({slip,byId,wardrobe,clubName,contentLocale,t,editable,onName}:{
 slip:Slip;byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;clubName:string;contentLocale:string;t:T;editable:boolean;onName:(v:string)=>void
}){
 const fav=slip.picks.favourite?byId.get(slip.picks.favourite)??null:null,n=filled(slip),reasoned=SLIP.filter(q=>slip.reasons[q.id]).length
 const rest=SLIP.filter(q=>q.id!=='favourite'&&q.id!=='number'&&q.id!=='position')
 return <article className={css.card} data-testid="polls-card" data-filled={n}>
  <header className={css.cardHead}><p className={css.cardKicker}>{t('tv.card.kicker')}</p><h3 className={css.cardTitle} lang={contentLocale}>{t('tv.card.title',{club:clubName})}</h3></header>
  <div className={css.cardBody}>
   <div className={css.cardMain}>
    <span className={css.cardShirt}>{fav?<ClubShirt player={fav} wardrobe={wardrobe} side="us"/>:<span className={css.cardGhost} aria-hidden="true">?</span>}
     {slip.picks.number&&<span className={css.cardNum}>{slip.picks.number}</span>}</span>
    <div className={css.cardWho}>
     {editable
      ?<label className={css.nameField}><span>{t('tv.card.name')}</span><input type="text" maxLength={NAME_MAX} value={slip.name} placeholder={t('tv.card.namePh')} data-testid="polls-name" onChange={e=>onName(e.target.value)}/></label>
      :slip.name&&<p className={css.cardName}>{slip.name}</p>}
     <p className={css.cardLine}><span>{t('tv.card.fav')}</span><b lang={contentLocale} dir="auto">{fav?.name??'—'}</b></p>
     <p className={css.cardLine}><span>{t('tv.card.plays')}</span><b>{slip.picks.position?`${slip.picks.position} · ${t(`tv.posn.${slip.picks.position}`)}`:'—'}</b></p>
    </div>
   </div>
   <ul className={css.cardList}>{rest.map(q=>{const a=answerOf(slip,q.id,byId,t);return <li key={q.id} data-empty={a===null}><span>{t(`tv.q.${q.id}`)}</span><b lang={contentLocale} dir="auto">{a??'—'}</b></li>})}</ul>
   <p className={css.cardFoot}>{n===0?t('tv.card.empty'):`${t('tv.count',{n})} · ${t('tv.card.reasoned',{n:reasoned})}`}</p>
  </div>
 </article>
}

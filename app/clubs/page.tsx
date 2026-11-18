import type {Metadata} from 'next'
import {Shell} from '@/components/master/Shell'
import {readState} from '@/lib/master/store'
import {hubModels} from '@/lib/home/hub-model'
import {isOpenClub} from '@/lib/home/hub-open'
import {livery} from '@/lib/club-livery'
import {clubWorld} from '@/lib/clubs/world'
import {crestFor} from '@/lib/clubs/crest'
import {REGISTRY} from '@/lib/master/registry'
import {uiLocale} from '@/lib/clubs/locale'
import {ClubsIndex,type IndexClub} from '@/components/home/ClubsIndex'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import './clubs.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'The Clubs · FAN LIFE',description:'Every club on FAN LIFE, in its own colours: pick yours and walk into its ground — its archive, its games, its story.'}

/**
 * THE CLUBS (owner, 18.11.2026: "Clubs leads to its own, beautifully designed page for choosing a club"). The sticker
 * page of the weekly on its own spread: every open club as a sticker in its colours, found by name, city or nickname,
 * sorted A–Z or by country; the clubs still in the workshop below, honest about it. Phone: two stickers a row, the
 * search and the filter in reach of the thumb. Desktop: four a row, the masthead across the spread. Nothing scrolls sideways.
 */
export default async function ClubsPage({searchParams}:{searchParams:{lang?:string}}){
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
 const {strict}=await hubModels(open,locale)
 const row=(c:(typeof open)[number],live:boolean):IndexClub=>{
  const l=livery(c.id),w=clubWorld(c.id),r=REGISTRY.find(x=>x.id===c.id)
  return {id:c.id,name:c.name,city:c.city,country:r?.country??'',nick:w?.nicknames[0]?.text??null,crest:crestFor(c.id),initials:l?.initials??c.initials,
   primary:l?.primary??'var(--mag-ink)',on:l?.on??'var(--mag-white)',pattern:l?.pattern??'',href:`/clubs/${c.id}?lang=${locale}`,live}
 }
 const live=open.filter(c=>isOpenClub(strict.find(x=>x.id===c.id))).map(c=>row(c,true))
 const soon=open.filter(c=>!isOpenClub(strict.find(x=>x.id===c.id))).map(c=>row(c,false))
 return <Shell locale={locale}>
  <main id="main" className="ckp" dir="ltr" lang={locale==='he'?'he':'en'}>
   <ClubsIndex live={live} soon={soon} copy={{
    kicker:copy.pickClub,title:copy.wkPickClub,note:copy.wkhStickerNote,stamp:copy.wkhStampOpen.replace('{n}',String(live.length)),
    search:copy.ckpSearch,all:copy.ckpAll,az:copy.ckpAz,byCountry:copy.ckpByCountry,none:copy.ckpNone,soon:copy.ckpSoon,soonNote:copy.ckpSoonNote,vote:copy.ckpVote,enter:copy.ckpEnter,back:copy.backTo,
   }}/>
  </main>
 </Shell>
}

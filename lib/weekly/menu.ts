import type {Club} from '@/lib/master/types'
import {crestFor} from '@/lib/clubs/crest'
import {clubHref} from '@/lib/clubs/club-href'
import {bannedHere,type ClubTheme} from '@/lib/clubs/theme'
import {livery} from '@/lib/club-livery'
import type {UiLocale} from '@/lib/clubs/locale'
import type {ContentsClub,ContentsItem} from '@/components/weekly/Contents'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {APP_URL} from '@/ecosystem/sdk'
import {goHref} from '@/lib/ecosystem/links'

/**
 * The data behind THE WEEKLY's menu (rule 124). The hub's menu and a club's menu list the same corner and the same
 * clubs; a club's adds its own sections and its wall. On a club's page a club whose colour is that club's rival's
 * prints its crest in one ink (rule 95).
 */
export const menuCopy=(locale:UiLocale)=>locale==='he'?he:en

export function menuClubs(clubs:readonly Club[],current:string|null,locale:UiLocale,theme?:ClubTheme):ContentsClub[]{
 return clubs.filter(c=>c.status!=='paused').slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{
  const lv=livery(c.id)
  return {id:c.id,name:c.name,city:c.city,crest:crestFor(c.id),initials:c.initials,href:clubHref(c.id,'',locale),current:c.id===current,rival:!!(theme&&lv&&c.id!==current&&bannedHere(theme,lv.primary))}
 })
}

export function menuCorner(locale:UiLocale,path=''):ContentsItem[]{
 const t=menuCopy(locale),at=(p:string)=>path===p||path.startsWith(p+'/')
 return [
  {href:'/me',title:t.wkMe,sub:t.wkMeSub,icon:'me',current:path==='/me'},
  {href:'/me/file',title:t.wkFile,sub:t.wkFileSub,icon:'file',current:at('/me/file')},
  {href:'/closet',title:t.wkCloset,sub:t.wkClosetSub,icon:'hanger',current:at('/closet')},
  {href:'/market',title:t.wkMarket,sub:t.wkMarketSub,icon:'shirt',current:at('/market')},
  {href:'/auction',title:t.wkAuction,sub:t.wkAuctionSub,icon:'gavel',current:at('/auction')},
  {href:'/shirts',title:t.wkShirts,sub:t.wkShirtsSub,icon:'grid',current:at('/shirts')},
 ]
}

export function menuFanLife(locale:UiLocale):ContentsItem[]{
 const t=menuCopy(locale)
 return [
  {href:'/',title:t.wkFront,icon:'home'},
  {href:'/all-football',title:t.wkAllFootball,icon:'globe'},
  {href:'/#life',title:t.tabLife,icon:'life'},
  {href:'/sources',title:t.wkSources,icon:'sources'},
 ]
}

export function hubSections(locale:UiLocale):ContentsItem[]{
 const t=menuCopy(locale)
 return [
  {href:'/',title:t.home,sub:t.wkHomeSub,icon:'home'},
  {href:'/#clubs',title:t.clubs,sub:t.wkClubsSub,icon:'clubs'},
  {href:'/#life',title:t.tabLife,sub:t.wkLifeSub,icon:'life'},
  {href:'/market',title:t.wkMarket,sub:t.wkMarketSub,icon:'shirt'},
  {href:'/me',title:t.corner,sub:t.wkCornerSub,icon:'me'},
  {href:'/all-football',title:t.wkAllFootball,sub:t.wkAllFootballSub,icon:'globe'},
 ]
}

export function clubSections(clubId:string,locale:UiLocale,o:{terrace:string;away:string|null;kitArchive:boolean}):ContentsItem[]{
 const t=menuCopy(locale)
 const rows:ContentsItem[]=[
  {href:clubHref(clubId,'',locale),title:t.clubTabHome,sub:t.wkClubHomeSub,icon:'home'},
  {href:clubHref(clubId,'play',locale),title:t.clubTabPlay,sub:t.wkPlaySub,icon:'play'},
  {href:clubHref(clubId,'history',locale),title:t.clubTabHistory,sub:t.wkHistorySub,icon:'history'},
  {href:clubHref(clubId,'terrace',locale),title:o.terrace,sub:t.wkTerraceSub,icon:'terrace'},
 ]
 if(o.kitArchive)rows.push({href:clubHref(clubId,'kit-archive',locale),title:t.wkKitArchive,sub:t.wkKitArchiveSub,icon:'shirt'})
 if(o.away)rows.push({href:o.away,title:t.wkAwayDays,sub:t.wkAwayDaysSub,icon:'plane'})
 return rows
}

/** The companion apps, always through the tracked door (/go). Shown in the menu with the shortcuts (switch `pins`). */
export function menuApps(locale:UiLocale,clubId?:string|null):ContentsItem[]{
 const t=menuCopy(locale)
 return [
  {href:goHref(APP_URL.dubid,'menu',clubId)!,title:'DUBID',sub:t.pinDubidSub,icon:'star',pin:goHref(APP_URL.dubid,'pin')!},
  {href:goHref(APP_URL.offsides,'menu',clubId)!,title:'OFFSIDES',sub:t.pinOffsidesSub,icon:'terrace',pin:goHref(APP_URL.offsides,'pin')!},
 ]
}

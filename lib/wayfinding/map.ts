import copy from '@/messages/wayfinding.en.json'

/**
 * WAYFINDING (owner, 22.11.2026: "it must always be clear what he is doing and what he can do — easier understanding,
 * orientation, instructions, directions"). One map of the whole site: for any address it says where the fan is (the trail
 * back to the front page), what this page is in one line, what he can do on it, and where to go on. A magazine prints this
 * as the running head of every page; here it is the FOLIO (components/wayfinding/Folio.tsx), drawn once by the shell and by
 * a club's layout, so a new page is placed by adding it HERE, not by remembering to explain itself.
 * Pure: no I/O, no React. Every word comes from messages/wayfinding.en.json or the games catalogue (rule 10).
 */
export type Crumb={label:string;href:string}
export type Place={key:string;trail:Crumb[];title:string;here:string;can:string[];next:Crumb[]}
export type Names={club:(id:string)=>string|null}
const T=copy as unknown as Record<string,string|string[]>
const s=(k:string,v:Record<string,string>={})=>String(T[k]??'').replace(/\{(\w+)\}/g,(_,n)=>v[n]??'')
const l=(k:string)=>(Array.isArray(T[k])?T[k] as string[]:[])
const HOME:Crumb={label:s('home'),href:'/'}
const flat=(key:string,trail:Crumb[],next:Crumb[]=[]):Place=>({key,trail,title:s(`${key}.title`),here:s(`${key}.here`),can:l(`${key}.can`),next})
const CLUB_PAGES:Record<string,string>={play:'play',history:'history',terrace:'terrace',daily:'daily',meetings:'meetings','kit-archive':'kitArchive','away-days':'away'}

/** the place an address is, or null where the page explains itself (the front page, a game in play, the control room) */
export function placeFor(path:string,names:Names):Place|null{
 const seg=path.split('?')[0]!.split('/').filter(Boolean)
 if(!seg.length)return null
 const [a,b,c]=seg
 if(a==='clubs'){
  if(!b)return flat('clubs',[HOME])
  const club=names.club(b);if(!club)return null
  const clubs:Crumb={label:s('clubs.title'),href:'/clubs'},home:Crumb={label:club,href:`/clubs/${b}`},v={club}
  if(!c)return {key:'club',trail:[HOME,clubs],title:club,here:s('club.here',v),can:l('club.can'),
   next:[{label:s('club.playNext'),href:`/clubs/${b}/play`},{label:s('club.historyNext'),href:`/clubs/${b}/history`},{label:s('club.terraceNext'),href:`/clubs/${b}/terrace`},{label:s('club.shopNext'),href:`/shop?club=${b}`}]}
  if(c==='life')return null
  const page=CLUB_PAGES[c]
  if(page)return {key:page,trail:[HOME,clubs,home],title:s(`${page}.title`),here:s(`${page}.here`,v),can:[],next:page==='play'?[]:[{label:s('club.playNext'),href:`/clubs/${b}/play`}]}
  // a gate is a game in play: it has its own frame, its own way out and its own "?" — the folio stays off it
  return null
 }
 if(a==='our-games')return flat('games',[HOME],[{label:s('games.clubsNext'),href:'/clubs'}])
 if(a==='shop')return b?null:flat('shop',[HOME],[{label:s('shop.marketNext'),href:'/market'}])
 if(a==='market')return flat('market',b?[HOME,{label:s('market.title'),href:'/market'}]:[HOME],b?[]:[{label:s('market.shopNext'),href:'/shop'}])
 if(a==='me')return flat('me',[HOME])
 if(a==='album')return flat('album',[HOME])
 if(a==='sources'||a==='credits')return flat('sources',[HOME])
 if(a==='players'&&b)return flat('player',[HOME])
 if(a==='all-football'&&b==='legends'&&!c)return flat('legends',[HOME,{label:s('games.title'),href:'/our-games'}])
 return null
}
export const WAY={label:s('label'),back:(place:string)=>s('back',{place}),canTitle:s('canTitle'),nextTitle:s('nextTitle')}

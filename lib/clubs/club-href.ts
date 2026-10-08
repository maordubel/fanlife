import type {UiLocale} from './locale'

/** The five doors of a club's own app. Market and Me live in the club switcher, not here. */
export const CLUB_TABS=['home','play','life','history','terrace'] as const
export type ClubTab=typeof CLUB_TABS[number]

/** Which tab a path segment under /clubs/<id>/ belongs to. No segment is the home page. */
const SEGMENT_TAB:Record<string,ClubTab>={
 play:'play',life:'life',history:'history',terrace:'terrace',
 archive:'history',timeline:'history',derby:'history',kits:'history',
 polls:'terrace',meetings:'terrace',
}
export function tabOfSegment(segment:string|null|undefined):ClubTab{
 if(!segment)return 'home'
 return SEGMENT_TAB[segment]??'play'
}

/** Every link inside a club's app goes through here, so `?lang` is never dropped and no tab can point at a hub page. */
export function clubHref(clubId:string,path:string='',locale:UiLocale='en'):string{
 const clean=path.replace(/^\/+/,'').replace(/\/+$/,'')
 const base=clean?`/clubs/${clubId}/${clean}`:`/clubs/${clubId}`
 return locale==='en'?base:`${base}?lang=${locale}`
}
export const tabHref=(clubId:string,tab:ClubTab,locale:UiLocale='en')=>clubHref(clubId,tab==='home'?'':tab,locale)

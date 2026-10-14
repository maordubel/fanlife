'use client'
import Link from 'next/link'
import {useSelectedLayoutSegment} from 'next/navigation'
import {tabHref,tabOfSegment,type ClubTab} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'

const ICON={fill:'none',stroke:'currentColor',strokeWidth:2.5,'aria-hidden':true,width:22,height:22,viewBox:'0 0 24 24'} as const
const ICONS:Record<ClubTab,JSX.Element>={
 home:<svg {...ICON}><path d="M3 11l9-7 9 7v9H3z"/></svg>,
 play:<svg {...ICON}><circle cx="12" cy="12" r="9"/><path d="M12 8l4 3-1.5 5h-5L8 11z"/></svg>,
 life:<svg {...ICON}><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5M16 11.5h.01M18.5 13.5h.01"/></svg>,
 history:<svg {...ICON}><path d="M5 4h11l3 3v13H5z"/><path d="M8 11h8M8 15h8"/></svg>,
 terrace:<svg {...ICON}><path d="M3 20h18M5 20v-5h4v5M10 20v-9h4v9M15 20v-7h4v7"/></svg>,
}
const ORDER:ClubTab[]=['home','play','life','history','terrace']

/**
 * The club app's own bottom bar. Five doors; LIFE stands in the middle, raised, wearing the club's livery.
 * On a desktop the same bar becomes a rail on the inline-start edge (CSS only — one component, two designs).
 */
export function ClubTabBar({clubId,locale,labels,navLabel,pattern}:{clubId:string;locale:UiLocale;labels:Record<ClubTab,string>;navLabel:string;lifeLive:boolean;pattern:string}) {
 const on=tabOfSegment(useSelectedLayoutSegment())
 return <nav className="club-tabbar" aria-label={navLabel}>
  {ORDER.map(tab=>{
   const href=tab==='life'?`/our-games?lang=${locale}`:tabHref(clubId,tab,locale)
   const centre=tab==='life'
   return <Link key={tab} href={href} data-tab={tab} aria-current={on===tab?'page':undefined} className={centre?'club-tab club-tab-centre':'club-tab'}>
    {centre?<span className="mag-badge club-tab-badge" data-livery={pattern} aria-hidden="true">{ICONS[tab]}</span>:ICONS[tab]}
    <span className="club-tab-label">{labels[tab]}</span>
   </Link>
  })}
 </nav>
}

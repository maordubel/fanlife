import Link from 'next/link'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import type {Moment} from '@/lib/clubs/today'

type Copy={kicker:string;exact:string;near:string;open:string;pick:string}
const pad=(n:number)=>String(n).padStart(2,'0')

/** The ball on the Kick off! plate (decorative). */
function Ball(){return <svg className="wkk-ball" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><path d="M20 11l7 5-3 8h-8l-3-8z"/></svg>}

/**
 * THE WEEKLY's one action (rule 124): the Kick off! plate — the gate's wall number in cyan, the shout on red. The shout is
 * fixed; the gate's own name travels in the accessible label.
 */
export function KickOff({href,n,gateWord,shout,label,testid,keys}:{href:string;n:number|null;gateWord:string;shout:string;label:string;testid?:string;keys?:string}){
 return <Link className="wk-kick wkk-kick min-h-tap" href={href} data-testid={testid} aria-label={label} aria-keyshortcuts={keys}>
  {n!==null&&<span className="wk-kick-gate" dir="ltr"><small>{gateWord}</small><b>{pad(n)}</b></span>}
  <span className="wk-kick-go"><span className="wk-speed" aria-hidden="true"/><span>{shout}</span><Ball/></span>
 </Link>
}

/**
 * The club's own dated moment as the issue's "Did you know?" box: the real date, how long ago, and a door into the timeline.
 * Nothing on file near today → nothing printed.
 */
export function TodayMoment({clubId,clubName,moment,locale,copy,dyk,cta}:{clubId:string;clubName:string;moment:Moment|null;locale:UiLocale;copy:Copy;dyk:string;cta:string}){
 if(!moment)return null
 const date=new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${moment.on}T00:00:00Z`))
 const when=moment.offset===0?copy.exact.replace('{n}',String(moment.yearsAgo)):copy.near.replace('{n}',String(moment.yearsAgo))
 return <aside className="wk-dyk wkk-dyk" aria-label={copy.kicker.replace('{club}',clubName)}>
  <span className="wk-dyk-lbl" aria-hidden="true">{dyk}</span>
  <p className="wk-k red">{when} · <bdi>{date}</bdi></p>
  <p className="wk-head wkk-dyk-head">{moment.title}</p>
  <Link className="wk-btn cyan wkk-dyk-cta min-h-tap" href={clubHref(clubId,'timeline',locale)} data-testid="today-moment">{cta} <span aria-hidden="true">→</span></Link>
 </aside>
}

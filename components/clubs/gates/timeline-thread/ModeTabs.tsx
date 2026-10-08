import Link from 'next/link'
import css from './thread.module.css'

export type TimelineMode='chronology'|'thread'|'chronicle'

/**
 * Gate 13 is three views of one club's dated history, each its own URL: Chronology (place cards on the line — the default,
 * and what every existing link opens), The Thread (connect two cards with documented links) and the Chronicle (read the
 * documented history in order). A view that cannot open says so on its own page, with exact counts.
 */
export function ModeTabs({mode,locale,labels,aria}:{mode:TimelineMode;locale:string;labels:Record<TimelineMode,string>;aria:string}){
 const href=(m:TimelineMode)=>`?${new URLSearchParams(m==='chronology'?{lang:locale}:{mode:m,lang:locale})}`
 return <nav className={css.modes} aria-label={aria} data-testid="timeline-modes">
  {(['chronology','thread','chronicle'] as const).map(m=><Link key={m} prefetch={false} className={css.mode} href={href(m)} aria-current={mode===m?'page':undefined} data-testid={`timeline-mode-${m}`}>{labels[m]}</Link>)}
 </nav>
}

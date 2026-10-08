import Link from 'next/link'
import css from './thread.module.css'

/** Chronology | The Thread — two views of one club's dated history, switched by a link so each one is its own URL. */
export function ModeTabs({mode,locale,labels,aria}:{mode:'chronology'|'thread';locale:string;labels:{chronology:string;thread:string};aria:string}){
 return <nav className={css.modes} aria-label={aria} data-testid="timeline-modes">
  <Link prefetch={false} className={css.mode} href={`?${new URLSearchParams({lang:locale})}`} aria-current={mode==='chronology'?'page':undefined} data-testid="timeline-mode-chronology">{labels.chronology}</Link>
  <Link prefetch={false} className={css.mode} href={`?${new URLSearchParams({mode:'thread',lang:locale})}`} aria-current={mode==='thread'?'page':undefined} data-testid="timeline-mode-thread">{labels.thread}</Link>
 </nav>
}

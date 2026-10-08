import Link from 'next/link'
import type {ModeInfo,ModeKey,Rival} from '@/lib/clubs/rivalry-modes'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {makeT} from '../derby/ui'
import css from './rivalry.module.css'

export const MODE_BAR_HEIGHT='56px'

/**
 * Gate 11 is three separate experiences (rulebook §2.4): the meetings the archives document, the wall, and the Black File.
 * Each is its own URL and each says — in words and with exact counts — whether it is open, limited or locked.
 * An approved rival alone opens only the meetings.
 */
export function ModeBar({modes,current,hrefs,copy,rivals,rivalHref,currentRival}:{modes:ModeInfo[];current:ModeKey;hrefs:Record<ModeKey,string>;copy:GameCopy;rivals:Rival[];rivalHref:(id:string)=>string;currentRival:string|null}){
 const t=makeT(copy)
 const count=(m:ModeInfo)=>m.key==='meetings'?t('derby.mode.count.meetings',{n:m.have}):m.key==='wall'?t('derby.mode.count.wall',{have:m.have,need:m.need}):t('derby.mode.count.blackfile',{have:m.have,have2:m.have2??0,need2:m.need2??0})
 return <>
  <nav className={css.modes} aria-label={t('derby.mode.aria')} data-testid="derby-modes">
   {modes.map(m=><Link key={m.key} prefetch={false} className={css.mode} href={hrefs[m.key]} aria-current={current===m.key?'page':undefined} data-state={m.state} data-testid={`derby-mode-${m.key}`}>
    <b>{t(`derby.mode.${m.key}`)}</b>
    <small>{t(`derby.mode.state.${m.state}`)} · {count(m)}</small>
   </Link>)}
  </nav>
  {rivals.length>1&&current==='meetings'&&<ul className={css.rivals} aria-label={t('derby.rival.aria')} data-testid="derby-rivals">
   {rivals.map(r=><li key={r.id}><Link prefetch={false} className={css.rival} href={rivalHref(r.id)} aria-current={currentRival===r.id?'true':undefined} data-testid="derby-rival"><small>{t(`derby.rival.role.${r.role}`)}</small><bdi>{r.name}</bdi></Link></li>)}
  </ul>}
 </>
}

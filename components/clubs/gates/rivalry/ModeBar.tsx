import Link from 'next/link'
import type {ModeInfo,ModeKey,Rival} from '@/lib/clubs/rivalry-modes'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {Icon} from '@/components/weekly/Icon'
import {makeT} from '../derby/ui'
import css from './rivalry.module.css'

export const MODE_BAR_HEIGHT='56px'
const ICON:Record<ModeKey,string>={meetings:'history',wall:'flag',blackfile:'search'}

/**
 * Gate 11 is three separate experiences (rulebook §2.4): the meetings the archives document, the wall, and the Black File.
 * Each is its own URL and each says — in words and with exact counts — whether it is open, limited or locked.
 * An approved rival alone opens only the meetings. The Weekly (rule 124): three cards side by side, each stamped
 * Open / Locked / Limited — never a sideways strip; a second rivalry is a wrapping grid of name plates.
 */
export function ModeBar({modes,current,hrefs,copy,rivals,rivalHref,currentRival}:{modes:ModeInfo[];current:ModeKey;hrefs:Record<ModeKey,string>;copy:GameCopy;rivals:Rival[];rivalHref:(id:string)=>string;currentRival:string|null}){
 const t=makeT(copy)
 const count=(m:ModeInfo)=>m.key==='meetings'?t('derby.mode.count.meetings',{n:m.have}):m.key==='wall'?t('derby.mode.count.wall',{have:m.have,need:m.need}):t('derby.mode.count.blackfile',{have:m.have,have2:m.have2??0,need2:m.need2??0})
 return <div className={css.ways}>
  <h2 className={`wk-logo red wk-tilt ${css.waysHead}`}>{t('derby.mode.ways')}</h2>
  <nav className={css.modes} aria-label={t('derby.mode.aria')} data-testid="derby-modes">
   {modes.map((m,i)=><Link key={m.key} prefetch={false} className={css.mode} href={hrefs[m.key]} aria-current={current===m.key?'page':undefined} data-state={m.state} data-testid={`derby-mode-${m.key}`}>
    <span className={css.modeIcon} aria-hidden="true"><Icon name={ICON[m.key]} size={26}/></span>
    <span className={css.modeNo} aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
    <b>{t(`derby.mode.${m.key}`)}</b>
    <span className={css.modeState}>{t(`derby.mode.state.${m.state}`)}</span>
    <small>{count(m)}</small>
   </Link>)}
  </nav>
  {rivals.length>1&&current==='meetings'&&<ul className={css.rivals} aria-label={t('derby.rival.aria')} data-testid="derby-rivals">
   {rivals.map(r=><li key={r.id}><Link prefetch={false} className={`${css.rival} min-h-tap`} href={rivalHref(r.id)} aria-current={currentRival===r.id?'true':undefined} data-testid="derby-rival"><small>{t(`derby.rival.role.${r.role}`)}</small><bdi>{r.name}</bdi></Link></li>)}
  </ul>}
 </div>
}

import {useMemo} from 'react'
import {coverageOf,type WallMeeting} from '@/lib/clubs/derby-model'
import type {Shared} from './ui'
import css from './derby.module.css'

/**
 * DE-R02 — what the list covers, said where the list is read: how many meetings, how many carry a date and a side, which
 * competitions the sources name, how many went to penalties — and that this is the documented list, never "all of them".
 */
export function Coverage({meetings,s}:{meetings:WallMeeting[];s:Shared}){
 const {t,clubName}=s
 const c=useMemo(()=>coverageOf(meetings),[meetings])
 if(c.n===0)return null
 return <details className={css.coverage} data-testid="derby-coverage">
  <summary>{t('derby.cov.title')} · {t('derby.coverage',{n:c.n})}</summary>
  <p>{t('derby.cov.line',{n:c.n,counted:c.counted,dated:c.dated})}</p>
  {c.first!==null&&c.last!==null&&<p>{t('derby.cov.span',{first:c.first,last:c.last})}</p>}
  {c.undated>0&&<p>{t('derby.cov.undated',{n:c.undated})}</p>}
  {c.noCompetition>0&&<p>{t('derby.cov.noComp',{n:c.noCompetition})}</p>}
  {c.competitions.length>0&&<p>{t('derby.cov.comps',{list:c.competitions.join(' · ')})}</p>}
  {c.shootouts>0&&<p>{t('derby.cov.shootouts',{n:c.shootouts})}</p>}
  <p>{t('derby.cov.persp',{club:clubName})}</p>
  <p>{t('derby.cov.incomplete')}</p>
 </details>
}

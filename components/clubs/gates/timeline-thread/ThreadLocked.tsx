import Link from 'next/link'
import type {ThreadPlan} from '@/lib/clubs/thread-engine'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {makeT} from '../derby/ui'
import css from './threadgame.module.css'

/** The Thread with no sound level says why — the exact graph counts and the §16.5 blocker — and points at the modes that are open. */
export function ThreadLocked({plan,clubName,copy,chronicleHref}:{plan:ThreadPlan;clubName:string;copy:GameCopy;chronicleHref:string}){
 const t=makeT(copy)
 return <section className={css.card} data-tone="locked" data-testid="thread-locked" data-blocker={plan.blocker??''}>
  <p className={css.kicker}>{t('th.locked.kicker')}</p>
  <h2 className={css.h2}>{t('th.locked.title')}</h2>
  <p className={css.body}>{t('th.locked.body',{club:clubName})}</p>
  <dl className={css.counts}>
   <dt>{t('th.locked.nodes')}</dt><dd>{plan.counts.nodes}</dd>
   <dt>{t('th.locked.edges')}</dt><dd>{plan.counts.edges}</dd>
   <dt>{t('th.locked.rejected')}</dt><dd>{plan.counts.rejectedEdges}</dd>
  </dl>
  <p className={css.fine}>{t('th.locked.need')}</p>
  {plan.blocker&&<p className={css.fine}><span className={css.code}>{t('th.locked.blocker',{code:plan.blocker})}</span></p>}
  <Link prefetch={false} className={css.ghost} href={chronicleHref}>{t('th.locked.other')}</Link>
 </section>
}

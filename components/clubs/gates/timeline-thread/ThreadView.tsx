import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {PublicPlan} from '@/lib/clubs/thread-data'
import {ThreadGame} from './ThreadGame'
import {ThreadLocked} from './ThreadLocked'

/** One decision in one place: a plan with at least one sound level is played (practice or full); otherwise the honest locked card. */
export function ThreadView({plan,club,clubName,slug,version,seed,cursor,locale,contentLocale,copy,playUrl,chronicleHref,fixture=false}:{plan:PublicPlan;club:string;clubName:string;slug:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;playUrl:string;chronicleHref:string;fixture?:boolean}){
 if(plan.mode==='locked'||plan.levels.length===0)return <ThreadLocked plan={{levels:[],missingTiers:plan.missingTiers,mode:'locked',blocker:plan.blocker,counts:plan.counts}} clubName={clubName} copy={copy} chronicleHref={chronicleHref}/>
 return <ThreadGame key={`${slug}:${version}:${seed}:${cursor}`} club={club} clubName={clubName} slug={slug} version={version} seed={seed} cursor={cursor} locale={locale} contentLocale={contentLocale} copy={copy} levels={plan.levels} mode={plan.mode==='full'?'full':'practice'} missingTiers={plan.missingTiers} playUrl={playUrl} fixture={fixture}/>
}

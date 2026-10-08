import {ClubGoal} from '@/components/clubs/gates/goal/ClubGoal'
import {kitViews} from '@/lib/clubs/gate-content'
import {goalDeal} from '@/lib/clubs/goal'
import {matchYear} from '@/lib/clubs/lineup-model'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import type {GateView} from '../types'

/** Gate 8 · deals the club's documented goals (a `?g=` link pins one first) and mounts the rebuild board. */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const dealt=goalDeal(club,round.seed)
 const pinned=searchParams.g?dealt.findIndex(x=>x.id===searchParams.g):-1
 const ordered=pinned>0?[dealt[pinned]!,...dealt.slice(0,pinned),...dealt.slice(pinned+1)]:dealt
 const items=ordered.map(g=>({...g,year:matchYear(g.on)}))
 return <ClubGoal key={gameKey} items={items} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))}/>
}

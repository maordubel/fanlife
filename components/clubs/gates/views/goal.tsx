import {ClubGoal} from '@/components/clubs/gates/goal/ClubGoal'
import {clubGoals,goalDeal} from '@/lib/clubs/goal'
import {MIN_TOUCHES} from '@/lib/clubs/goal-model'
import {matchYear} from '@/lib/clubs/lineup-model'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
import {forbiddenColor} from '@/lib/clubs/theme'
import type {GateView} from '../types'

/**
 * Gate 8 · deals the club's documented goals (a `?g=` link pins one first) and mounts the rebuild board. A goal whose report
 * describes a single touch is not a sequence and is never dealt: full reconstruction needs two or more (GO-R04). The dealt
 * items carry no touch, no side and no count — those stay on the server.
 */
const clubKey=(name:string)=>name.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')

export const view:GateView=async({club,locale,copy,round,gameKey,searchParams})=>{
 const sequences=new Set(clubGoals(club).filter(g=>g.steps.length>=MIN_TOUCHES).map(g=>g.id))
 const dealt=goalDeal(club,round.seed).filter(g=>sequences.has(g.id))
 const pinned=searchParams.g?dealt.findIndex(x=>x.id===searchParams.g):-1
 const ordered=pinned>0?[dealt[pinned]!,...dealt.slice(0,pinned),...dealt.slice(pinned+1)]:dealt
 const items=ordered.map(g=>({...g,year:matchYear(g.on)}))
 const rivalIds=new Map(items.flatMap(g=>{
  const name=clubKey(g.opponent)
  if(!name)return []
  const r=REGISTRY.find(c=>CORE_CLUB_IDS.includes(c.id)&&(clubKey(c.name)===name||clubKey(c.id)===name))
  return r&&r.id!==club.identity.id?[[g.id,r.id] as const]:[]
 }))
 const wardrobes=new Map(await Promise.all([...new Set(rivalIds.values())].map(async id=>{
  const rival=await loadClub(id).catch(()=>null)
  const w=rival?clubWardrobe(rival.data,hex=>forbiddenColor(club.theme,hex)):null
  return [id,w?{...w,away:w.away.length?w.away:w.home}:null] as const
 })))
 const opponents=Object.fromEntries([...rivalIds].flatMap(([goal,id])=>{
  const w=wardrobes.get(id)
  return w?[[goal,w] as const]:[]
 }))
 return <ClubGoal key={gameKey} items={items} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={clubWardrobe(club)} opponents={opponents}/>
}

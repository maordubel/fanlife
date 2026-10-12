import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {hash} from '@/lib/clubs/rumble-rng'
import {clash,clubCode,keeperKit,kitOfMan,numberEleven} from '@/lib/highlights/kit'
import type {Moment,MomentKind,PixelKit,Reel,ReelPlayer,ReelTeam,Shape} from '@/lib/highlights/types'
import {cardOf,pauseOf} from './career'
import type {Career,Fixture,FixtureSide,MatchEventRow} from './types'

/**
 * A LEGENDS MANAGER result as a highlights reel (owner, 12.10.2026: "display only, the right kits, the line-ups shown properly").
 * The engine already decided everything; this only reads the booked result:
 *  · the two elevens as they kicked off (`result.sides`), each man in his own club's shirt of HIS years (`kitFor`), the away side
 *    switching to its away list when its shirt would clash with the home side's
 *  · every goal (scorer + assist from the log), every red, injury and booking, and the chances — a chance is "goes close" in the
 *    record, so the scene shows it saved, wide, blocked or off the post by the reel's seed; it names nobody the log does not name
 *  · a man who came on is added as BENCH: named when he does something, never on the line-up board, never anybody's stand-in
 * Pure: the wardrobes are handed in by the server (`kits.ts`).
 */
export type ClubKit={wardrobe:RumbleWardrobe;primary:string}
const CHANCE:readonly MomentKind[]=['save','miss','save','block','post','miss','save']
const SHAPES:readonly Shape[]=['through','cross','cutback','long','dribble','combo','counter','rebound','lob','volley','free-kick','corner']

export function legendsReel(c:Career,f:Fixture,kits:Record<string,ClubKit|undefined>,opts:{champion?:boolean}={}):Reel|null{
 const res=f.result;if(!res?.sides)return null
 return reelOf(c,{id:f.id,home:f.home,away:f.away,goals:res.goals,pens:res.pens,events:res.events,seed:res.seed,sides:res.sides},kits,opts)
}
/** the live match so far — the same reel, cut at the stop the manager is standing at; `final` is the score at that minute */
export function liveReel(c:Career,kits:Record<string,ClubKit|undefined>):Reel|null{
 const L=c.live;if(!L)return null
 const fx=c.season.playoff?.id===L.fixture?c.season.playoff:c.season.fixtures.find(f=>f.id===L.fixture);if(!fx)return null
 const p=pauseOf(c);if(!p)return null
 const teams=new Map(c.teams.map(t=>[t.club,t]))
 const sides=L.snapshot.sides.map(sd=>{const t=teams.get(sd.club);return {formation:sd.formation,xi:sd.xi.map(m=>{const k=t?cardOf(c,t,m.id):undefined;return {id:m.id,name:m.name,pos:m.pos,from:k?.from??null,to:k?.to??null}})}}) as [FixtureSide,FixtureSide]
 return reelOf(c,{id:fx.id,home:fx.home,away:fx.away,goals:p.goals,pens:null,events:p.events,seed:L.snapshot.seed,sides},kits,{})
}
type Played={id:string;home:string;away:string;goals:[number,number];pens:[number,number]|null;events:MatchEventRow[];seed:number;sides:[FixtureSide,FixtureSide]}
function reelOf(c:Career,f:Played,kits:Record<string,ClubKit|undefined>,opts:{champion?:boolean}):Reel{
 const res=f
 const teams=new Map(c.teams.map(t=>[t.club,t])),clubs=[f.home,f.away] as const
 const seed=hash(`legends-reel:${f.id}:${res.seed}`)
 const build=(side:0|1,home:PixelKit|null):ReelTeam=>{
  const club=clubs[side],t=teams.get(club),kit=kits[club]??{wardrobe:{home:[],away:[]},primary:side?'#1C2F93':'#D7261E'}
  const man=(m:{id:string;from:number|null;to:number|null})=>({id:m.id,fromYear:m.from,toYear:m.to})
  const dress=(m:{id:string;from:number|null;to:number|null})=>{const k=kitOfMan(man(m),'us',kit.wardrobe,kit.primary);return home&&clash(k,home)?kitOfMan(man(m),'them',kit.wardrobe,kit.primary):k}
  const sd=res.sides![side],xi=numberEleven(sd.xi)
  const lineup:ReelPlayer[]=xi.map(m=>({id:m.id,no:m.no,name:m.name,pos:m.pos,kit:dress(m)}))
  // the men who came on: from the log, named from the club's own card
  let no=12
  for(const e of res.events)if(e.kind==='sub'&&e.side===side&&e.player&&!lineup.some(p=>p.id===e.player)){
   const card=t?cardOf(c,t,e.player):undefined;if(!card)continue
   lineup.push({id:card.id,no:no++,name:card.name,pos:card.pos,kit:dress(card),bench:true})
  }
  const shirt=lineup.find(p=>p.pos!=='GK'&&!p.bench)?.kit??lineup[0]!.kit
  return {name:t?.name??club,code:clubCode(t?.name??club),kit:shirt,keeper:shirt,lineup,formation:sd.formation}
 }
 const h=build(0,null),a=build(1,h.kit)
 h.keeper=keeperKit(h.kit,a.kit,0);a.keeper=keeperKit(a.kit,h.kit,3)
 for(const t of [h,a])for(const p of t.lineup)if(p.pos==='GK')p.kit=t.keeper
 const score:[number,number]=[0,0],moments:Moment[]=[]
 let i=0
 for(const e of res.events){
  if(e.side===null||!e.player)continue
  const side=e.side,at=e.minute>90?{label:`${e.minute}′ ET`}:{}
  const pick=<T,>(xs:readonly T[])=>xs[hash(`${seed}:${i++}:${e.minute}`)%xs.length]!
  if(e.kind==='goal'){score[side]++;moments.push({minute:e.minute,side,kind:'goal',player:e.player,...(e.other?{assist:e.other}:{}),shape:pick(SHAPES),score:[score[0],score[1]],...at})}
  else if(e.kind==='chance')moments.push({minute:e.minute,side,kind:pick(CHANCE),player:e.player,shape:pick(SHAPES),score:[score[0],score[1]],...at})
  // a card's side in a moment is the side of the man booked (the scene gives the ball to the other side)
  else if(e.kind==='yellow'||e.kind==='red'||e.kind==='injury')moments.push({minute:e.minute,side,kind:e.kind,player:e.player,score:[score[0],score[1]],...at})
 }
 const mine=f.home===c.clubId?0:f.away===c.clubId?1:null
 return {id:`legends-${f.id}`,seed,teams:[h,a],moments,final:res.goals,pens:res.pens,mine,...(opts.champion?{champion:true}:{})}
}

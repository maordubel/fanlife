import type {Move} from '@/lib/clubs/rumble-play'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {ShowPlayer,ShowScript} from '@/lib/clubs/rumble-show'
import {hash} from '@/lib/clubs/rumble-rng'
import {clubCode,keeperKit,kitOfMan,numberEleven} from './kit'
import type {Moment,MomentKind,Reel,ReelTeam,Shape} from './types'

/**
 * The club Royal Rumble's match as a reel: the server staged the football already (`rumble-play` — passes, crosses, dribbles,
 * and how each move ended); here each move that is worth watching becomes a moment, its build-up becomes the scene's shape, and
 * every man wears the shirt `kitFor` already gives him on the pitch. Nothing is decided here.
 */
const END:Partial<Record<Move['end'],MomentKind>>={goal:'goal',save:'save',miss:'miss',block:'block',post:'post',offside:'offside',card:'yellow'}
function shapeOf(m:Move):Shape|undefined{
 const kinds=m.steps.map(s=>s.kind),last=kinds[kinds.length-1]
 if(last==='cross')return m.header?'cross':'cutback'
 if(last==='through')return 'through'
 if(last==='dribble')return kinds.filter(k=>k==='dribble').length>1?'dribble':'counter'
 if(last==='long')return 'long'
 if(last==='switch')return 'volley'
 if(kinds.length>=3)return 'combo'
 return undefined
}
export function rumbleReel(script:ShowScript,wardrobe:RumbleWardrobe,faces:{us:{name:string;primary:string};them:{name:string;primary:string}},seed:number,keepers?:readonly string[]):Reel{
 const team=(side:'us'|'them',men:ShowPlayer[],face:{name:string;primary:string},other:ReelTeam|null):ReelTeam=>{
  const numbered=numberEleven(men.map(p=>({...p,pos:p.position})))
  const lineup=numbered.map(p=>({id:p.id,no:p.no,name:p.name,pos:p.position,kit:kitOfMan(p,side,wardrobe,face.primary)}))
  const kit=lineup.find(p=>p.pos!=='GK')?.kit??lineup[0]!.kit
  return {name:face.name,code:clubCode(face.name),kit,keeper:keeperKit(kit,other?.kit??kit,side==='us'?0:3,keepers),lineup,...(script.formation?{formation:script.formation}:{})}
 }
 const us=team('us',script.us,faces.us,null),them=team('them',script.them,faces.them,us)
 us.keeper=keeperKit(us.kit,them.kit,0,keepers)
 for(const p of us.lineup)if(p.pos==='GK')p.kit=us.keeper
 for(const p of them.lineup)if(p.pos==='GK')p.kit=them.keeper
 const moments:Moment[]=[]
 for(const m of script.play?.moves??[]){
  const kind=END[m.end];if(!kind)continue
  const side=(m.side==='us'?0:1) as 0|1
  // a card is shown on the man who fouled: he plays for the side that did not have the ball
  const cardSide=(side?0:1) as 0|1
  moments.push(kind==='yellow'?{minute:m.minute,side:cardSide,kind,...(m.by?{player:m.by}:{}),score:[m.score.us,m.score.them]}
   :{minute:m.minute,side,kind,...(m.shooter?{player:m.shooter}:{}),...(m.assist?{assist:m.assist}:{}),...(m.keeper?{keeper:m.keeper}:{}),...(m.header?{header:true}:{}),...(shapeOf(m)?{shape:shapeOf(m)!}:{}),score:[m.score.us,m.score.them]})
 }
 return {id:`rumble-${seed}`,seed:hash(`rumble:${seed}`),teams:[us,them],moments,final:[script.final.us,script.final.them],pens:null,mine:0}
}

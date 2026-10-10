import type {GameCopy} from '@/lib/clubs/game-copy'
import type {Move,MoveStep} from '@/lib/clubs/rumble-play'
import type {ShowScript,Side} from '@/lib/clubs/rumble-show'
import {findPlayer} from './RumbleStage'
import {shortName,tr} from './shared'

const other=(s:Side):Side=>s==='us'?'them':'us'
const nm=(script:ShowScript,side:Side,id?:string)=>{const p=findPlayer(script,side,id);return p?shortName(p.name):''}

/** the line for one pass of a build-up */
export function stepLine(copy:GameCopy,script:ShowScript,side:Side,step:MoveStep,variant:number):string{
 return tr(copy,`rr.mc.build.${step.kind}.${variant%3}`,{a:nm(script,side,step.from),b:nm(script,side,step.to)})
}
/** how the move ended — the script's own words for goals, saves, misses and blocks, the match centre's for the rest */
export function endLine(copy:GameCopy,script:ShowScript,m:Move):string{
 const def=other(m.side),name=nm(script,m.side,m.shooter),by=nm(script,def,m.by),keeper=nm(script,def,m.keeper),v=m.variant%3
 switch(m.end){
  case 'goal':case 'save':case 'miss':return tr(copy,`rr.${m.end}.${v}`,{name,keeper,other:by})
  case 'block':return tr(copy,`rr.block.${v}`,{name,keeper,other:by})
  default:return tr(copy,`rr.mc.end.${m.end}.${v}`,{name,by})
 }
}
/** the build-up line worth reading: how the ball reached the man at the end (a header, or the last pass) */
export function buildLine(copy:GameCopy,script:ShowScript,m:Move):string|null{
 if(m.header)return tr(copy,'rr.mc.header',{name:nm(script,m.side,m.shooter)})
 const last=m.steps[m.steps.length-1];return last?stepLine(copy,script,m.side,last,m.variant):null
}

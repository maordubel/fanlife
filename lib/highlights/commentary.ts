/**
 * THE COMMENTARY LINE (19.11.2026 — "more from Football and Championship Manager"): CM 01/02 told a match in one bar of text
 * under the pitch, and you read the game in it. Every moment the picture has already shown becomes one line: the minute, who,
 * what, and the score after a goal. Pure and client-safe; the same line for the same moment, every time (the wording is picked
 * by the reel's seed and the minute, never by a random call).
 *
 * Rule 111.2 holds here too: a man is named only when the record names him in that moment. A moment with no name speaks of
 * his side. Nothing is said about a moment the picture has not reached — the caller passes only what has been shown.
 */
import type {Moment,Reel} from './types'

export type CommentTone='goal'|'chance'|'card'|'plain'
export type CommentLine={key:string;minute:number;label:string;side:0|1;tone:CommentTone;text:string;/** ours, theirs, or a neutral reel */mine:boolean|null}

const pick=<T,>(list:readonly T[],n:number):T=>list[Math.abs(n)%list.length]!

function goalText(m:Moment,who:string|null,team:string,ast:string|null,n:number):string{
 const by=who??team
 const how=m.shape==='penalty'?`${by} ${who?'converts':'convert'} the penalty`
  :m.shape==='free-kick'?`${by} ${who?'bends':'bend'} the free kick in`
  :m.header?`${by} ${who?'heads':'head'} it in${m.shape==='corner'?' from the corner':''}`
  :m.shape==='long'?`${by} ${who?'lets':'let'} fly from distance — and it is in`
  :m.shape==='lob'?`${by} ${who?'lifts':'lift'} it over the keeper`
  :m.shape==='volley'?`${by} ${who?'meets':'meet'} it on the volley`
  :m.shape==='rebound'?`${by} ${who?'is':'are'} first to the rebound`
  :m.shape==='counter'?`${by} ${who?'finishes':'finish'} the break`
  :pick([`${by} ${who?'scores':'score'}`,`${by} ${who?'finds':'find'} the net`,`${by} ${who?'makes':'make'} no mistake`],n)
 const pass=ast&&m.shape!=='penalty'?pick([` — ${ast} with the pass`,` — made by ${ast}`,` — ${ast} set it up`],n+1):''
 return `GOAL! ${how}${pass}. ${m.score[0]}–${m.score[1]}`
}

/** one moment as one line of commentary */
export function commentLine(reel:Reel,m:Moment):CommentLine{
 const team=reel.teams[m.side],other=reel.teams[m.side?0:1]
 const name=(id:string|undefined,t=team)=>id?(t.lineup.find(p=>p.id===id)?.name??null):null
 const who=name(m.player),ast=m.assist&&m.assist!==m.player?name(m.assist):null
 const keeper=name(m.keeper,other),by=name(m.by,other)
 const n=reel.seed+m.minute*7+m.side
 const subject=who??team.name,verb=(s:string,pl:string)=>who?s:pl
 let text:string,tone:CommentTone='plain'
 switch(m.kind){
  case 'goal':text=goalText(m,who,team.name,ast,n);tone='goal';break
  case 'save':tone='chance';text=keeper
   ?pick([`${keeper} keeps ${who??team.name} out`,`Saved! ${keeper} turns ${who?`${who}’s`:'the'} ${m.header?'header':'shot'} away`,`${subject} ${verb('tests','test')} ${keeper} — a fine save`],n)
   :pick([`${subject} ${verb('forces','force')} a save`,`Saved — ${subject} ${verb('is','are')} denied`],n);break
  case 'miss':tone='chance';text=pick([`${subject} ${verb('fires','fire')} wide`,`${subject} ${verb('puts','put')} it over the bar`,`${subject} ${verb('drags','drag')} it past the post`],n);break
  case 'post':tone='chance';text=pick([`${subject} ${verb('hits','hit')} the woodwork!`,`Off the post! ${subject} so close`],n);break
  case 'block':text=by?`${by} blocks ${who?`${who}’s`:'the'} shot`:pick([`${who?`${who}’s`:`${team.name}’s`} shot is blocked`,`Bodies in the way — ${subject} ${verb('is','are')} blocked`],n);break
  case 'offside':text=`${subject} ${verb('is','are')} flagged offside`;break
  case 'yellow':tone='card';text=`${subject} ${verb('is','are')} booked`;break
  case 'red':tone='card';text=`${who??`A ${team.name} man`} is sent off!`;break
  case 'injury':text=`${who??`A ${team.name} man`} is down and needs treatment`;break
  default:text=team.name
 }
 return {key:`${m.minute}:${m.side}:${m.kind}:${m.player??''}`,minute:m.minute,label:m.label??`${m.minute}′`,side:m.side,tone,text,mine:reel.mine===null?null:reel.mine===m.side}
}

/**
 * The commentary so far, newest first. `shown` are the moments the picture has played in this spell; `before` is the minute the
 * spell began at — everything up to it was watched (or passed) in an earlier spell and may be told.
 */
export function commentary(reel:Reel,shown:readonly Moment[],before=0):CommentLine[]{
 const seen=new Set(shown),out=reel.moments.filter(m=>m.minute<=before||seen.has(m)).map(m=>commentLine(reel,m))
 return out.reverse()
}

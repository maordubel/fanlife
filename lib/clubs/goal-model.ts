import {LANDMARKS,PITCH,ZONES,zoneParts} from '@/lib/game/goal-zones'
import {REPLAY_ACTIONS,type ReplayAction} from '@/lib/game/replay/vocab'
import {easeInOut,flightMs,liftAt,pointAt,type Pt} from '@/lib/game/replay/motion'

/**
 * Gate 8 · Rebuild the Goal — the rules of the board and of the replay, as pure functions.
 *
 * A goal is rebuilt in the reporter's own terms: a man, a verb and one of twenty zones, up to five touches. Nothing here
 * invents a move the source does not describe (rule 11): the replay only ever draws touches somebody supplied — the
 * player's own, or the archive's after the whistle — and the ball's flight is a curve between two zone centres, never a
 * claim about where on the pitch the ball really went. Grading lives on the server (`judgeGoal`).
 */
export type {Pt}
export const MAX_TOUCHES=5
export const RUN_MAX=3
/** the part of the 300x400 board the game shows: the zone grid plus a margin and the net behind the goal line */
export const VIEW={x:0,y:-30,w:300,h:380} as const

export type Touch={actor:string;action:ReplayAction;zone:string}
export type Draft=Touch[]

export const isVerb=(v:unknown):v is ReplayAction=>typeof v==='string'&&(REPLAY_ACTIONS as readonly string[]).includes(v)
export const isZoneId=(v:unknown):v is string=>typeof v==='string'&&ZONES.includes(v)

/** the centre of a zone, in board units */
export function zoneCentre(zone:string):Pt{
 const p=zoneParts(zone)
 return p?{x:PITCH.x0+p.col*PITCH.cw+PITCH.cw/2,y:PITCH.y0+p.row*PITCH.ch+PITCH.ch/2}:{x:PITCH.w/2,y:PITCH.h/2}
}
/** a zone's rectangle as a share of the visible view — for the tap grid laid over the drawing */
export function zonePercent(zone:string){
 const p=zoneParts(zone);if(!p)return null
 const x=PITCH.x0+p.col*PITCH.cw,y=PITCH.y0+p.row*PITCH.ch
 return {left:(x/VIEW.w)*100,top:((y-VIEW.y)/VIEW.h)*100,width:(PITCH.cw/VIEW.w)*100,height:(PITCH.ch/VIEW.h)*100}
}
/** a board point as a share of the visible view */
export const percentOf=(p:Pt)=>({left:(p.x/VIEW.w)*100,top:((p.y-VIEW.y)/VIEW.h)*100})
export const GOAL_MOUTH:Pt=LANDMARKS.goalMouth

/**
 * Where each touch is drawn. Two touches in one zone sit side by side, never on top of each other — the same rule the
 * Worker's board uses — so a man who plays two touches in a zone is two tokens.
 */
export function pointsFor(zones:readonly string[]):Pt[]{
 return zones.map((z,i)=>{const c=zoneCentre(z),k=zones.slice(0,i).filter(x=>x===z).length;return {x:c.x+k*18,y:c.y-k*6}})
}

// ---------------------------------------------------------------- the draft
export const isFull=(d:Draft)=>d.length>=MAX_TOUCHES
/** a touch needs a real verb and a real zone; the actor is a name from the room or the empty string ("unnamed") */
export const valid=(t:Touch)=>isVerb(t.action)&&isZoneId(t.zone)&&typeof t.actor==='string'
export function addTouch(d:Draft,t:Touch):Draft{return isFull(d)||!valid(t)?d:[...d,{...t}]}
export function removeAt(d:Draft,i:number):Draft{return Number.isInteger(i)&&i>=0&&i<d.length?d.filter((_,j)=>j!==i):d}
export const removeLast=(d:Draft):Draft=>d.length?d.slice(0,-1):d
export function setVerb(d:Draft,i:number,action:ReplayAction):Draft{
 const t=d[i];if(!t||!isVerb(action)||t.action===action)return d
 return d.map((x,j)=>j===i?{...x,action}:x)
}
export function moveTouch(d:Draft,i:number,zone:string):Draft{
 const t=d[i];if(!t||!isZoneId(zone)||t.zone===zone)return d
 return d.map((x,j)=>j===i?{...x,zone}:x)
}
/** the wire shape the grader takes: at most five, every one valid */
export const wire=(d:Draft):Touch[]|null=>d.length>=1&&d.length<=MAX_TOUCHES&&d.every(valid)?d.map(t=>({actor:t.actor,action:t.action,zone:t.zone})):null

/**
 * A verb to suggest when a shirt is dragged onto the pitch with no verb chosen. It reads only the geometry of the
 * player's OWN placement — never the archive — so it can never leak the answer: a ball played into the box from far out is
 * a shot, a wide ball into the middle a cross, a long ball forward a through ball, anything shorter a pass.
 */
export function suggestVerb(prev:string|null,zone:string):ReplayAction{
 const b=zoneParts(zone);if(!b)return 'pass'
 const a=prev?zoneParts(prev):null
 if(b.row===0&&b.col>=1&&b.col<=3)return 'shot'
 if(!a)return 'pass'
 if(Math.abs(a.col-b.col)>=2&&b.row<=1)return 'cross'
 if(a.row-b.row>=2)return 'throughBall'
 return 'pass'
}

// ---------------------------------------------------------------- the replay
export type Seg={i:number;a:Pt;b:Pt;action:ReplayAction;start:number;dur:number;toGoal:boolean}
export type Timeline={segs:Seg[];pts:Pt[];total:number;scores:boolean}
const LEAD=320,HOLD=170,TAIL=420

/** does the last touch end in an attempt on goal? Only then does the ball go to the net — nothing else is claimed. */
export const endsOnGoal=(last?:{action:ReplayAction})=>last?.action==='shot'||last?.action==='header'

/**
 * The deterministic timeline of a sequence: the ball starts at the first touch, flies to each next one with the verb of
 * the touch it leaves, and — only if the last touch is a shot or a header — on into the goal mouth. The same input
 * always gives the same timeline; there is no randomness in the replay.
 */
export function buildTimeline(steps:readonly {zone:string;action:ReplayAction}[],speed=1):Timeline{
 const pts=pointsFor(steps.map(s=>s.zone)),segs:Seg[]=[]
 let t=LEAD/speed
 steps.forEach((s,i)=>{
  const toGoal=i===steps.length-1
  if(toGoal&&!endsOnGoal(s))return
  const a=pts[i]!,b=toGoal?GOAL_MOUTH:pts[i+1]!,dur=flightMs(a,b,s.action,speed)
  segs.push({i,a,b,action:s.action,start:t,dur,toGoal});t+=dur+HOLD/speed
 })
 return {segs,pts,total:Math.round(t-(segs.length?HOLD/speed:0)+TAIL/speed),scores:segs.some(s=>s.toGoal)}
}
export type Frame={ball:Pt;lift:number;reached:number;goal:boolean;done:boolean}
/** the picture at `ms`: where the ball is, how many touches it has reached, and whether it is in the net */
export function stateAt(tl:Timeline,ms:number):Frame{
 const start=tl.pts[0]??{x:PITCH.w/2,y:PITCH.h/2},n=tl.pts.length
 if(!n)return {ball:start,lift:0,reached:0,goal:false,done:true}
 let ball=start,lift=0,reached=1,goal=false
 for(const s of tl.segs){
  if(ms<s.start)break
  const t=Math.min(1,(ms-s.start)/s.dur),k=easeInOut(t)
  if(t<1){ball=pointAt(s.a,s.b,s.action,k);lift=liftAt(s.action,k,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y));break}
  ball=s.b;lift=0;if(s.toGoal)goal=true;else reached=Math.min(n,s.i+2)
 }
 return {ball,lift,reached,goal,done:ms>=tl.total}
}
/** the final state: every touch drawn, the ball where the sequence leaves it */
export const finalFrame=(tl:Timeline):Frame=>stateAt(tl,tl.total)

// ---------------------------------------------------------------- the run
export type Tier='perfect'|'strong'|'keep'
export const tierOf=(points:number,max:number):Tier=>max>0&&points>=max?'perfect':max>0&&points/max>=0.6?'strong':'keep'
/** the goals dealt to run number `run`: up to {@link RUN_MAX}, wrapping round the club's goals, never the same goal twice in a run */
export function runIndices(len:number,run:number):number[]{
 if(!Number.isInteger(len)||len<=0)return []
 const size=Math.min(RUN_MAX,len),at=(((run*size)%len)+len)%len
 return Array.from({length:size},(_,k)=>(at+k)%len)
}
export type GoalResult={id:string;title:string;points:number;max:number}
export const totals=(r:readonly GoalResult[])=>({points:r.reduce((n,x)=>n+x.points,0),max:r.reduce((n,x)=>n+x.max,0)})

export function shareText(o:{club:string;title:string;points:number;max:number;touches:readonly {actor:string;actionWord:string}[];unnamed:string;url:string}):string{
 return [`${o.club} · ${o.title}`,`${o.points}/${o.max}`,...o.touches.map((t,i)=>`${i+1}. ${t.actor||o.unnamed} — ${t.actionWord}`),o.url].join('\n')
}

'use client'
import type {CSSProperties,ReactNode} from 'react'
import {dropZone,useDragSource} from '@/components/stage/useDrag'
import {COLS,ROWS,PITCH} from '@/lib/game/goal-zones'
import {curvePath} from '@/lib/game/replay/motion'
import type {ReplayAction} from '@/lib/game/replay/vocab'
import {GOAL_MOUTH,VIEW,endsOnGoal,percentOf,zonePercent,type Pt} from '@/lib/clubs/goal-model'
import css from './goal.module.css'

export type Tok={actor:string;label:string;side:'us'|'them'|'unnamed';action:ReplayAction;zone:string}
/** one drawn sequence: the player's own (dashed) or the archive's (solid) */
export type Layer={id:'yours'|'archive';toks:Tok[];pts:Pt[];reached:number;tone:'yours'|'archive';compact:boolean;/** draw the last ball into the goal */goal:boolean}
export type PitchLabels={zone:(zone:string)=>string;token:(n:number,label:string,verb:string)=>string;goal:string}

const Chalk=()=><g className={css.chalk}>
 <rect x={PITCH.left} y={PITCH.goalY} width={PITCH.right-PITCH.left} height={PITCH.ch*4}/>
 <rect x={PITCH.x0+PITCH.cw} y={PITCH.goalY} width={PITCH.cw*3} height={PITCH.ch*.95}/>
 <rect x={PITCH.x0+PITCH.cw*1.8} y={PITCH.goalY} width={PITCH.cw*1.4} height={PITCH.ch*.38}/>
 {COLS.slice(1).map((_,i)=><line key={i} data-k="grid" x1={PITCH.x0+(i+1)*PITCH.cw} y1={PITCH.goalY} x2={PITCH.x0+(i+1)*PITCH.cw} y2={PITCH.goalY+PITCH.ch*4}/>)}
 {ROWS.slice(1).map((_,i)=><line key={i} data-k="grid" x1={PITCH.left} y1={PITCH.goalY+(i+1)*PITCH.ch} x2={PITCH.right} y2={PITCH.goalY+(i+1)*PITCH.ch}/>)}
 <circle data-k="spot" cx={150} cy={PITCH.goalY+PITCH.ch*.78} r={1.8}/>
</g>

function Net({hit,label}:{hit:boolean;label:string}){
 return <g className={css.net} data-hit={hit} aria-label={label}>
  <rect x={GOAL_MOUTH.x-34} y={-22} width={68} height={PITCH.goalY+22} />
  {Array.from({length:7},(_,i)=><line key={i} x1={GOAL_MOUTH.x-34+i*11.3} y1={-22} x2={GOAL_MOUTH.x-34+i*11.3} y2={PITCH.goalY}/>)}
  {Array.from({length:3},(_,i)=><line key={`h${i}`} x1={GOAL_MOUTH.x-34} y1={-22+i*11.3} x2={GOAL_MOUTH.x+34} y2={-22+i*11.3}/>)}
 </g>
}

function Paths({layer}:{layer:Layer}){
 const {toks,pts,reached,goal}=layer,segs:ReactNode[]=[]
 for(let i=0;i<toks.length-1&&i+1<reached;i++)segs.push(<path key={i} d={curvePath(pts[i]!,pts[i+1]!,toks[i]!.action)}/>)
 if(goal&&toks.length&&endsOnGoal(toks[toks.length-1])&&reached>=toks.length)segs.push(<path key="goal" d={curvePath(pts[toks.length-1]!,GOAL_MOUTH,toks[toks.length-1]!.action)} data-k="shot"/>)
 return <g className={css.path} data-tone={layer.tone}>{segs}</g>
}

function Token({tok,i,pt,tone,compact,active,interactive,shirt,labels,onTap,onMove}:{tok:Tok;i:number;pt:Pt;tone:'yours'|'archive';compact:boolean;active:boolean;interactive:boolean;shirt:ReactNode;labels:PitchLabels;onTap:(i:number)=>void;onMove:(i:number,zone:string)=>void}){
 const drag=useDragSource({payload:`touch:${i}`,disabled:!interactive,onDrop:zone=>onMove(i,zone)})
 const at=percentOf(pt),pos:CSSProperties={left:`${at.left}%`,top:`${at.top}%`}
 const body=compact
  ?<span className={css.dot} data-tone={tone}>{i+1}</span>
  :<><span className={css.magnet} data-tone={tone}>{shirt}<span className={css.num}>{i+1}</span></span><span className={css.nameplate} dir="auto">{tok.label}</span></>
 return <span className={css.tokenAt} style={pos} data-tone={tone}>
  {interactive
   ?<button type="button" {...drag} className={`min-h-tap ${css.token}`} style={drag.style} data-touch={i} data-active={active} aria-pressed={active} aria-label={labels.token(i+1,tok.label,tok.action)} onClick={()=>onTap(i)}>{body}</button>
   :<span className={css.token} data-touch={`${tone}-${i}`} role="img" aria-label={labels.token(i+1,tok.label,tok.action)}>{body}</span>}
 </span>
}

/**
 * The board: half a pitch drawn in ink and chalk (never grass, so never a rival's colour), the goal at the top, twenty
 * tap/drop zones laid over it, and the touches as men standing where they played. The tap grid is the whole interaction
 * for keyboard and thumb; dragging a shirt onto a zone, or a man to another zone, is the same action by another route.
 */
export function GoalPitch({layers,ball,lift,goalHit,interactive,armed,active,cam,shirtOf,labels,contentLocale,onZone,onToken,onMove}:{layers:Layer[];ball:Pt|null;lift:number;goalHit:boolean;interactive:boolean;armed:boolean;active:number|null;cam:{s:number;tx:number;ty:number}|null;shirtOf:(t:Tok)=>ReactNode;labels:PitchLabels;contentLocale:string;onZone:(zone:string)=>void;onToken:(i:number)=>void;onMove:(i:number,zone:string)=>void}){
 const camStyle:CSSProperties|undefined=cam&&cam.s>1?{transform:`translate(${cam.tx*100}%,${cam.ty*100}%) scale(${cam.s})`}:undefined
 return <div className={css.pitch} data-testid="goal-pitch" data-armed={armed}>
  <div className={css.cam} style={camStyle}>
   <svg className={css.svg} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
    <Chalk/>
    <Net hit={goalHit} label={labels.goal}/>
    {layers.map(l=><Paths key={l.id} layer={l}/>)}
    {ball&&<g className={css.ball}><ellipse cx={ball.x} cy={ball.y+3} rx={5} ry={2.2} data-k="shadow"/><circle cx={ball.x} cy={ball.y-lift} r={6.5}/><path d={`M${ball.x-3} ${ball.y-lift-1} l3 -3 l3 3 l-1.5 3.5 h-3z`}/></g>}
   </svg>
   <div className={css.zones} role="group" aria-label={labels.zone('')}>
    {ROWS.flatMap(r=>COLS.map(c=>{
     const z=`${c}${r}`,p=zonePercent(z)!
     return <button key={z} type="button" className={`${css.zone} min-h-tap`} data-zone={z} data-testid={`zone-${z}`} {...dropZone(`zone-${z}`)} style={{left:`${p.left}%`,top:`${p.top}%`,width:`${p.width}%`,height:`${p.height}%`}} aria-label={labels.zone(z)} onClick={()=>onZone(z)}/>
    }))}
   </div>
   <div className={css.tokens} lang={contentLocale}>
    {layers.flatMap(l=>l.toks.slice(0,l.reached).map((tok,i)=>
     <Token key={`${l.id}${i}`} tok={tok} i={i} pt={l.pts[i]!} tone={l.tone} compact={l.compact} active={l.id==='yours'&&active===i} interactive={interactive&&l.id==='yours'} shirt={shirtOf(tok)} labels={labels} onTap={onToken} onMove={onMove}/>))}
   </div>
  </div>
 </div>
}

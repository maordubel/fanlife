'use client'
import type {ReactNode} from 'react'
import {dropZone,useDragSource} from '@/components/stage/useDrag'
import {BANDS,menIn,type Band,type Board,type Mark} from '@/lib/clubs/lineup-model'
import css from './lineup.module.css'

export type PitchLabels={band:(b:Band)=>string;short:(b:Band)=>string;place:(b:Band,n:number)=>string;man:(name:string,band:string,locked:boolean)=>string;lock:string;marks:{right:string;wrong:string}}

/** the chalk on the board: touchlines, the halfway line and both penalty areas — drawn once, never an answer */
function Chalk(){
 return <svg className={css.chalk} viewBox="0 0 100 119" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <line data-k="dash" x1="0" y1="29.75" x2="100" y2="29.75"/><line data-k="dash" x1="0" y1="89.25" x2="100" y2="89.25"/>
  <line x1="0" y1="59.5" x2="100" y2="59.5"/><circle data-k="spot" cx="50" cy="59.5" r="1.2"/>
  <rect x="24" y="0" width="52" height="16"/><rect x="38" y="0" width="24" height="6"/>
  <rect x="24" y="103" width="52" height="16"/><rect x="38" y="113" width="24" height="6"/>
 </svg>
}

function Man({name,band,n,shirt,active,locked,mark,disabled,labels,plate,onTap,onMove}:{name:string;band:Band;n:number;shirt:ReactNode;active:boolean;locked:boolean;mark:Mark|null;disabled:boolean;labels:PitchLabels;plate:string;onTap:(name:string)=>void;onMove:(name:string,zone:string)=>void}){
 const drag=useDragSource({payload:`man:${name}`,disabled,onDrop:zone=>onMove(name,zone)})
 return <button type="button" {...drag} className={`min-h-tap ${css.man}`} style={{...drag.style,['--n' as string]:n}} data-man={name} data-active={active} data-mark={mark??undefined} aria-pressed={active} aria-label={labels.man(name,labels.band(band),locked)} onClick={()=>onTap(name)}>
  <span className={css.magnet}>{shirt}{locked&&<span className={css.lock} aria-hidden="true">{labels.lock}</span>}{mark&&<span className={css.mark} data-mark={mark} aria-hidden="true">{mark==='right'?'✓':'✗'}</span>}</span>
  <span className={css.nameplate} dir="auto">{plate}</span>
 </button>
}

/**
 * The board: four bands, attack at the top and the keeper at the foot, any number of men in each. A band is a button
 * ("hang him here") and a drop zone; a man standing in it is a separate button and a drag source. Nothing here implies a
 * formation — the archive states none.
 */
export function BandPitch({board,aimed,active,marks,locked,graded,shirtOf,plateOf,labels,contentLocale,onBand,onMan,onMove}:{board:Board;aimed:Band|null;active:string|null;marks:Map<string,Mark>|null;locked:ReadonlySet<string>;graded:boolean;shirtOf:(name:string)=>ReactNode;plateOf:(name:string)=>string;labels:PitchLabels;contentLocale:string;onBand:(b:Band)=>void;onMan:(name:string)=>void;onMove:(name:string,zone:string)=>void}){
 return <div className={css.pitch} data-testid="lineup-pitch">
  <Chalk/>
  {[...BANDS].reverse().map(band=>{
   const men=menIn(board,band)
   return <div key={band} className={css.band} data-band={band} data-aimed={aimed===band&&!graded} {...dropZone(`band-${band}`)}>
    <span className={css.bandWord} aria-hidden="true">{labels.band(band)}</span>
    <button type="button" className={`${css.bandHit} min-h-tap`} data-testid={`band-${band}`} aria-pressed={aimed===band} disabled={graded} aria-label={labels.place(band,men.length)} onClick={()=>onBand(band)}/>
    <span className={css.bandTag}>{labels.short(band)}<b>{men.length}</b></span>
    <div className={css.men} lang={contentLocale}>
     {men.map(m=><Man key={m.name} name={m.name} band={band} n={Math.max(4,men.length)} shirt={shirtOf(m.name)} plate={plateOf(m.name)} active={active===m.name} locked={locked.has(m.name)} mark={marks?.get(m.name)??null} disabled={graded} labels={labels} onTap={onMan} onMove={onMove}/>)}
     {!graded&&aimed===band&&men.length===0&&<span className={css.hole} aria-hidden="true"><span className={css.ghostShirt}/></span>}
    </div>
   </div>
  })}
 </div>
}

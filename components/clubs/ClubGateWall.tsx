import Link from 'next/link'
import type {CSSProperties,ReactNode} from 'react'
import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'
import {clubHref} from '@/lib/clubs/club-href'
import {PLAY_GROUPS} from '@/lib/clubs/play-groups'
import type {UiLocale} from '@/lib/clubs/locale'
import type {gameCopy} from '@/lib/clubs/game-copy'
import {Plate,type PlateArt,type PlateInk} from '@/components/weekly/Plate'
import type {GateState} from './GateTickets'
import {GateMark} from './SupporterCard'
import {wallNumbers,type Beloved} from '@/lib/clubs/beloved'
import {RUN_GATES} from '@/lib/clubs/activity'
/** Gates this device keeps a tally for (the shirt shelf keeps none). */
const TALLIED=new Set<string>([...RUN_GATES,'xi'])

/**
 * The club's gate wall, as THE WEEKLY prints it (rule 124): every gate is a little comic cover — a process plate, speed
 * lines, a comic plate in the club's own ink, the gate's name in the masthead face and its wall number as the price
 * roundel. The wall numbers are the club's own (`wallNumbers`: the beloved gate takes the terrace's number). The beloved
 * gate hangs big at the top. A gate the archive cannot fill yet stays on the wall, stamped and not a link.
 * Gate 11 is the away end: no club colour at all (ink on the floodlit night).
 */
type Surface='wk-clubplate'|'wk-sky'|'wk-stripes'|'wk-navyplate'|'wk-night'
type Art={art:PlateArt|'shirt';surface:Surface;ink?:PlateInk;flip?:boolean}
export const GATE_ART:Record<GateKey,Art>={
 trivia:{art:'face',surface:'wk-clubplate'},
 memory:{art:'memo',surface:'wk-sky'},
 'kit-builder':{art:'shirt',surface:'wk-stripes'},
 goal:{art:'keeper',surface:'wk-sky'},
 xi:{art:'kicker',surface:'wk-clubplate'},
 lineup:{art:'fans',surface:'wk-sky'},
 'royal-rumble':{art:'dribbler',surface:'wk-clubplate'},
 'blind-cow':{art:'face',surface:'wk-sky',flip:true},
 kits:{art:'swap',surface:'wk-sky'},
 archive:{art:'bootball',surface:'wk-navyplate'},
 timeline:{art:'cheer',surface:'wk-sky'},
 derby:{art:'scarf',surface:'wk-night',ink:'ink'},
 polls:{art:'fanfist',surface:'wk-clubplate'},
}
export const groupOfGate=(key:GateKey)=>(PLAY_GROUPS.find(g=>(g.keys as readonly string[]).includes(key))?.id??'archive') as 'quick'|'deep'|'archive'
const pad=(n:number)=>String(n).padStart(2,'0')
const longest=(s:string)=>Math.max(5,...s.split(/\s+/).map(w=>w.length))

/** A drawn shirt (no photograph): the club's colour, ink outline, a paper collar — or a blank one for the guessing game. */
export function ShirtMark({blank=false,className=''}:{blank?:boolean;className?:string}){
 return <svg className={`wkk-shirt${blank?' blank':''}${className?` ${className}`:''}`} viewBox="0 0 24 24" aria-hidden="true">
  <path className="body" d="M8 3L3 6l2 5 2-1v11h10V10l2 1 2-5-5-3c-1 2-2 3-4 3S9 5 8 3z"/>
  {blank?<path className="dash" d="M9.5 13h5M9.5 15.5h5"/>:<path className="collar" d="M9.6 3.6c.8 1.4 1.4 2 2.4 2s1.6-.6 2.4-2"/>}
 </svg>
}
/** The art of a gate's cover: its surface, speed lines and the comic plate. */
export function GateArt({gate,children,className='',big=false}:{gate:GateKey;children?:ReactNode;className?:string;big?:boolean}){
 const a=GATE_ART[gate]
 return <span className={`wk-cover-art wkk-art ${a.surface}${big?' big':''}${className?` ${className}`:''}`} data-art={a.art}>
  {a.surface!=='wk-stripes'&&<span className="wk-speed" aria-hidden="true"/>}
  {gate==='goal'&&<span className="wk-flash wkk-art-flash" aria-hidden="true"/>}
  {a.art==='shirt'?<><ShirtMark blank className="wkk-art-shirt"/><span className="wk-burst cyan wkk-art-q" aria-hidden="true">?</span></>
  :<Plate art={a.art} ink={a.ink??'club'} flip={a.flip} className="wkk-art-plate"/>}
  {gate==='blind-cow'&&<span className="wkk-art-bar" aria-hidden="true"/>}
  {children}
 </span>
}

type CoverProps={clubId:string;gate:GateKey;n:number;open:boolean;locale:UiLocale;games:ReturnType<typeof gameCopy>;soon:string;gateWord:string;pick?:string|null;mark?:MarkCopy}
export type MarkCopy={best:string;played:string;fresh:string;xi:string}
/** One gate as a cover: name in the masthead face, the wall number as its price, one line and its state underneath. */
export function GateCover({clubId,gate,n,open,locale,games,soon,gateWord,pick,mark}:CoverProps){
 const name=games[`gate.${gate}`]??gate
 const inner=<>
  <GateArt gate={gate}>
   <span className="wk-cover-name wkk-cover-name" style={{['--len' as string]:longest(name)} as CSSProperties}>{name}</span>
   <span className="wk-cover-price" dir="ltr"><small>{gateWord}</small><b>{pad(n)}</b></span>
  </GateArt>
  <span className="wk-cover-foot wkk-cover-foot">
   <span className="wkk-cover-line">{games[`blurb.${gate}`]}</span>
   {open&&(pick?<span className="wk-k red">{pick}</span>:mark&&TALLIED.has(gate)?<GateMark club={clubId} gate={gate} copy={mark}/>:null)}
  </span>
  {!open&&<span className="wk-stamp wkk-soon">{soon}</span>}
 </>
 return open
  ?<Link className="wk-cover wkk-cover min-h-tap" data-gate={gate} data-group={groupOfGate(gate)} data-away={gate==='derby'||undefined} href={clubHref(clubId,gate,locale)}>{inner}</Link>
  :<div className="wk-cover wkk-cover" data-gate={gate} data-group={groupOfGate(gate)} data-away={gate==='derby'||undefined} aria-disabled="true">{inner}</div>
}

/** A gate as a contents row (the archive shelf on the wall): roundel number, red head, a line, and where you are with it. */
export function GateRow({clubId,gate,n,open,locale,games,soon,mark}:Omit<CoverProps,'gateWord'|'pick'>){
 const inner=<>
  <span className="wk-roundel wkk-row-no" dir="ltr"><b className="wk-num">{pad(n)}</b></span>
  <span className="wkk-row-t"><b className="wk-head">{games[`gate.${gate}`]}</b><small>{games[`blurb.${gate}`]}</small>{!open?<span className="wk-k muted">{soon}</span>:mark&&TALLIED.has(gate)?<GateMark club={clubId} gate={gate} copy={mark}/>:null}</span>
  {open&&<span className="wkk-row-go" aria-hidden="true">→</span>}
 </>
 return open
  ?<Link className="wkk-row min-h-tap" data-gate={gate} data-group={groupOfGate(gate)} data-away={gate==='derby'||undefined} href={clubHref(clubId,gate,locale)}>{inner}</Link>
  :<div className="wkk-row" data-gate={gate} data-group={groupOfGate(gate)} data-away={gate==='derby'||undefined} aria-disabled="true">{inner}</div>
}

export type BelovedCopy={featured:string;shout:string;title:string;line?:string;cta:string;gateWord:string;local?:string;script?:string}
/** The beloved gate's big plate: stripes in the club's colours, the terrace number on a burst, the shirt game behind it. */
export function BelovedPlate({clubId,beloved,locale,copy,games,testid,variant='home'}:{clubId:string;beloved:Beloved;locale:UiLocale;copy:BelovedCopy;games:ReturnType<typeof gameCopy>;testid?:boolean;variant?:'home'|'wall'|'terrace'}){
 const gate=SHARED_GATES.find(g=>g.key===beloved.feature)!,num=wallNumbers(beloved)[gate.key]
 // a terrace without a number (Zrinjski's Standing Tribune) shows the gate's own wall number under the plain word
 const word=beloved.number!==null?(copy.local??copy.gateWord):copy.gateWord
 return <Link className={`wk-panel wk-lift wkk-beloved min-h-tap`} data-variant={variant} data-gate={testid?gate.key:undefined} data-group={testid?groupOfGate(gate.key):undefined} data-beloved={beloved.number??'shirt'} href={clubHref(clubId,gate.key,locale)}>
  <span className="wkk-beloved-art wk-stripes" aria-hidden="true">
   <Plate art="scarf" ink="ink" className="wkk-beloved-scarf"/>
   <ShirtMark className="wkk-beloved-shirt"/>
   <span className="wk-burst cyan wkk-beloved-burst"><span><small lang={copy.script}>{word}</small><b className="wk-num">{beloved.number??num}</b></span></span>
  </span>
  <span className="wkk-beloved-text">
   <span className="wk-tag ink">{copy.featured}</span>
   <span className="wk-shout wkk-beloved-shout">{copy.shout}</span>
   <span className="wk-head wkk-beloved-title">{copy.title}</span>
   <span className="wkk-beloved-line">{games[`blurb.${gate.key}`]}</span>
   {copy.line&&<span className="wkk-beloved-line muted">{copy.line}</span>}
   <span className="wk-btn red wkk-beloved-cta">{copy.cta} <span aria-hidden="true">→</span></span>
  </span>
 </Link>
}

export type WallCopy={soon:string;gateWord:string;all:string;quick:string;deep:string;archive:string;quickNote:string;deepNote:string;archiveNote:string;show:string;pick:string;mark:MarkCopy}
/**
 * Play — the whole wall: All / Quick / Deep / Archive as one segmented choice (native radios: no script, nothing scrolls
 * sideways), the beloved gate big at the top, Quick and Deep as covers, the archive shelf as contents rows. Every gate is
 * one element with `data-gate` inside a `shared-gates` group: thirteen in all, the beloved one counted once.
 */
export function ClubGateWall({clubId,states,locale,games,beloved,belovedCopy,copy,pickKey,title}:{clubId:string;states:readonly GateState[];locale:UiLocale;games:ReturnType<typeof gameCopy>;beloved?:Beloved|null;belovedCopy?:BelovedCopy;copy:WallCopy;pickKey?:GateKey|null;title:ReactNode}) {
 const on=(k:string)=>{const x=states.find(s=>s.key===k);return !!(x?.allowed&&x.playable)}
 const num=wallNumbers(beloved??null),big=beloved?SHARED_GATES.find(g=>g.key===beloved.feature):null
 const count=(id:string)=>PLAY_GROUPS.find(g=>g.id===id)!.keys.length
 const name=`wkk-wall-${clubId}`
 const opts=[['all',copy.all,SHARED_GATES.length],['quick',copy.quick,count('quick')],['deep',copy.deep,count('deep')],['archive',copy.archive,count('archive')]] as const
 const note={quick:copy.quickNote,deep:copy.deepNote,archive:copy.archiveNote},head={quick:copy.quick,deep:copy.deep,archive:copy.archive}
 return <div className="wkk-wall" data-testid="gate-wall">
  <aside className="wkk-wall-side">
   {title}
   <div className="wk-seg wkk-filter" role="radiogroup" aria-label={copy.show}>
    {opts.map(([id,label,n],i)=><label key={id}><input className="wkk-sr" type="radio" name={name} value={id} defaultChecked={i===0}/><span>{label}</span><small dir="ltr">{n}</small></label>)}
   </div>
   {beloved&&big&&belovedCopy&&<div className="wkk-grp wkk-wall-beloved" data-grp={groupOfGate(big.key)} data-testid="shared-gates"><BelovedPlate clubId={clubId} beloved={beloved} locale={locale} copy={belovedCopy} games={games} testid variant="wall"/></div>}
  </aside>
  <div className="wkk-wall-main">
   {PLAY_GROUPS.map(gr=>{
    const keys=gr.keys.filter(k=>!big||k!==big.key).sort((a,b)=>Number(on(b))-Number(on(a))||num[a]-num[b])
    return <section key={gr.id} className="wkk-grp wkk-wall-grp" data-grp={gr.id} aria-labelledby={`wkk-g-${gr.id}`}>
     <div className="wkk-sechead"><h2 id={`wkk-g-${gr.id}`} className="wk-logo red sm wk-tilt">{head[gr.id]}</h2><p className="wk-k muted">{note[gr.id]}</p></div>
     {gr.id==='archive'
      ?<div className="wkk-rows" data-testid="shared-gates">{keys.map(k=><GateRow key={k} clubId={clubId} gate={k} n={num[k]} open={on(k)} locale={locale} games={games} soon={copy.soon} mark={copy.mark}/>)}</div>
      :<div className="wkk-covers" data-testid="shared-gates">{keys.map(k=><GateCover key={k} clubId={clubId} gate={k} n={num[k]} open={on(k)} locale={locale} games={games} soon={copy.soon} gateWord={copy.gateWord} pick={k===pickKey?copy.pick:null} mark={copy.mark}/>)}</div>}
    </section>})}
  </div>
 </div>
}

export type PickCopy={kicker:string;title:string;allCta:string;seeAll:string;show:string;quick:string;deep:string;archive:string;quickSub:string;deepSub:string;archiveSub:string;soon:string;gateWord:string;pick:string;mark:MarkCopy}
/** The home's "Pick a gate": Quick / Deep / Archive as one segmented choice and two covers a row — never a sideways rail. */
export function PickAGate({clubId,states,locale,games,beloved,copy,pickKey,playHref}:{clubId:string;states:readonly GateState[];locale:UiLocale;games:ReturnType<typeof gameCopy>;beloved?:Beloved|null;copy:PickCopy;pickKey?:GateKey|null;playHref:string}){
 const on=(k:string)=>{const x=states.find(s=>s.key===k);return !!(x?.allowed&&x.playable)}
 const num=wallNumbers(beloved??null),big=beloved?.feature
 const name=`wkk-pick-${clubId}`,sub={quick:copy.quickSub,deep:copy.deepSub,archive:copy.archiveSub},label={quick:copy.quick,deep:copy.deep,archive:copy.archive}
 return <section className="wkk-picker" id="gates" aria-labelledby="gates-h">
  <div className="wkk-sechead wkk-picker-head">
   <div><p className="wk-banner">{copy.kicker}</p><h2 id="gates-h" className="wk-logo red wk-tilt">{copy.title}</h2></div>
   <Link className="wk-btn paper wkk-picker-all min-h-tap" href={playHref}>{copy.allCta}</Link>
  </div>
  <div className="wk-seg wkk-filter" role="radiogroup" aria-label={copy.show}>
   {PLAY_GROUPS.map((g,i)=><label key={g.id}><input className="wkk-sr" type="radio" name={name} value={g.id} defaultChecked={i===0}/><span>{label[g.id]}</span><small>{sub[g.id]}</small></label>)}
  </div>
  {PLAY_GROUPS.map(gr=><div key={gr.id} className="wkk-grp wkk-covers" data-grp={gr.id}>
   {gr.keys.filter(k=>k!==big).sort((a,b)=>Number(on(b))-Number(on(a))||num[a]-num[b]).map(k=><GateCover key={k} clubId={clubId} gate={k} n={num[k]} open={on(k)} locale={locale} games={games} soon={copy.soon} gateWord={copy.gateWord} pick={k===pickKey?copy.pick:null} mark={copy.mark}/>)}
  </div>)}
  <Link className="wk-seeall min-h-tap" href={playHref}>{copy.seeAll}<span aria-hidden="true">→</span></Link>
 </section>
}

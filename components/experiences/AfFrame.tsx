import Link from 'next/link'
import type {ReactNode} from 'react'
import {livery,wearLivery} from '@/lib/club-livery'
import {crestFor} from '@/lib/clubs/crest'
import type {Member,Mode} from '@/lib/experiences/pool'

/**
 * ALL FOOTBALL's press (ADR-fanlife-0009): FAN LIFE's own neutral weekly — newsprint, ink, process plates — with every
 * contributing club present only as its crest on a paper disc (its initials in its colours where no crest is on file). No club
 * colour paints the page; a club wears its colour on its own disc.
 */
export function PreviewRibbon({on}:{on:boolean}){return on?<p className="af-ribbon wkl-ribbon" role="note"><b className="wk-tag ink">Owner preview</b> <span>Fans cannot see this yet — switch it on in the control room (Settings → Features).</span></p>:null}
export function Contributors({members,label='Drawn from',compact=false}:{members:Member[];label?:string;compact?:boolean}){
 return <div className="af-contrib wkl-contrib" data-compact={compact||undefined}>
  <p className="wkl-contrib-h"><span className="af-label wk-k red">{label}</span>{compact?null:<span className="wk-k wkl-mute">{members.length} clubs</span>}</p>
  <ul>{members.map(m=>{const l=livery(m.id),crest=crestFor(m.id);return <li key={m.id} title={m.name}>
   {/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded in the crest register */}
   <span className="wkl-disc" aria-hidden="true">{crest?<img src={crest} alt="" loading="lazy" decoding="async"/>:<span className="mag-badge af-badge" data-livery={l?.pattern} style={wearLivery(l)}>{l?.initials??m.name.slice(0,2)}</span>}</span>
   <bdi className={compact?'sr-only':'wk-k'}>{m.name}</bdi></li>})}</ul>
 </div>
}
export const modeLabel=(m:Mode)=>m.kind==='balanced'?'Balanced':m.kind==='chaos'?'Open draw':'Club duel'
export const modeQuery=(m:Mode)=>m.kind==='duel'?`mode=duel&a=${m.clubs[0]}&b=${m.clubs[1]}`:m.kind==='chaos'?'mode=chaos':''
/**
 * A gate inside ALL FOOTBALL wears the weekly's game scoreboard (rule 124) — the same dark bar a club's gate shows once a
 * round is on the glass (`components/clubs/PlayHeader.tsx`): leave (✕ → ALL FOOTBALL), the globe where a club shows its
 * crest, the gate's name in the masthead face, the draw and the gate number. The clubs the round draws from follow it.
 */
export function GateBar({title,mode,back,gateNo,children}:{title:string;mode:Mode;back:string;gateNo?:string;children?:ReactNode}){
 return <>
  <header className="af-gatebar wk-hud wga-hud wkl-gatebar">
   <Link href={back} className="af-back wga-hud-back min-h-tap" aria-label="Back: ALL FOOTBALL">
    <svg className="wga-hud-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    <svg className="wga-hud-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
   </Link>
   <div className="wga-hud-title">
    <span className="mag-badge wkl-globe-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg></span>
    <div className="wga-hud-words">
     <p className="wga-hud-kicker">ALL FOOTBALL · <span className="af-mode">{modeLabel(mode)}</span></p>
     <h1 className="wga-hud-name" data-long={title.length>13||undefined}>{title}</h1>
    </div>
    {gateNo?<span className="wga-hud-gate" aria-hidden="true">Gate {gateNo}</span>:null}
   </div>
   {/* eslint-disable-next-line @next/next/no-img-element -- 28px mark, shipped as measured */}
   <Link className="wga-hud-mark" href="/" aria-label="FAN LIFE"><img src="/brand/fanlife/logo-96.png" alt="" width={28} height={28}/></Link>
  </header>
  {children?<div className="wkl-gate-from">{children}</div>:null}
 </>
}

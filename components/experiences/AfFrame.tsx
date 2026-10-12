import Link from 'next/link'
import type {ReactNode} from 'react'
import {livery,wearLivery} from '@/lib/club-livery'
import type {Member,Mode} from '@/lib/experiences/pool'

/**
 * ALL FOOTBALL's press (ADR-fanlife-0009): FAN LIFE's own neutral magazine — paper, ink, vermilion rules — with every
 * contributing club present only as its badge. No club colour paints the page; a club wears its colour on its badge.
 */
export function PreviewRibbon({on}:{on:boolean}){return on?<p className="af-ribbon" role="note"><b>Owner preview</b> Fans cannot see this yet — switch it on in the control room (Settings → Features).</p>:null}
export function Contributors({members,label='Drawn from',compact=false}:{members:Member[];label?:string;compact?:boolean}){
 return <div className="af-contrib" data-compact={compact||undefined}><span className="af-label">{label}</span><ul>{members.map(m=>{const l=livery(m.id);return <li key={m.id} title={m.name}><span className="mag-badge af-badge" data-livery={l?.pattern} style={wearLivery(l)} aria-hidden="true">{l?.initials??m.name.slice(0,2)}</span><bdi className={compact?'sr-only':undefined}>{m.name}</bdi></li>})}</ul></div>
}
export const modeLabel=(m:Mode)=>m.kind==='balanced'?'Balanced':m.kind==='chaos'?'Open draw':'Club duel'
export const modeQuery=(m:Mode)=>m.kind==='duel'?`mode=duel&a=${m.clubs[0]}&b=${m.clubs[1]}`:m.kind==='chaos'?'mode=chaos':''
export function GateBar({title,mode,back,children}:{title:string;mode:Mode;back:string;children?:ReactNode}){
 return <header className="af-gatebar"><Link href={back} className="af-back min-h-tap">← ALL FOOTBALL</Link><h1>{title}</h1><span className="af-mode">{modeLabel(mode)}</span>{children}</header>
}

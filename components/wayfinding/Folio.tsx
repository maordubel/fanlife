'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {WAY,placeFor} from '@/lib/wayfinding/map'

/**
 * THE FOLIO — the running head of every page (owner, 22.11.2026). Where you are, what this page is, what you can do here,
 * where to go on. Phone: one back step, the page's name and its line, with the directions folded under "What can I do
 * here?". Desktop: the whole trail on one line and the next steps beside it. Never on the front page or inside a game.
 */
export function Folio({clubs}:{clubs:Record<string,string>}){
 const path=usePathname()||'/',p=placeFor(path,{club:id=>clubs[id]??null})
 if(!p)return null
 return <nav className="wkf" aria-label={WAY.label} data-testid="folio" data-place={p.key}>
  <div className="wkf-in">
   <ol className="wkf-trail">
    {p.trail.map((c,i)=><li key={c.href} className={i===p.trail.length-1?'wkf-up':undefined}><Link className="min-h-tap" href={c.href} aria-label={i===p.trail.length-1?WAY.back(c.label):undefined}><span className="wkf-chev" aria-hidden="true">‹</span>{c.label}</Link></li>)}
    <li className="wkf-at" aria-current="page"><b>{p.title}</b></li>
   </ol>
   {p.here?<p className="wkf-here wkf-wide">{p.here}</p>:null}
   {p.next.length>0&&<ul className="wkf-next wkf-wide" aria-label={WAY.nextTitle}>{p.next.map(n=><li key={n.href}><Link className="min-h-tap" href={n.href}>{n.label} <span aria-hidden="true">→</span></Link></li>)}</ul>}
   <details className="wkf-can" data-can={p.can.length||undefined}><summary className="min-h-tap" aria-label={WAY.canTitle}><span aria-hidden="true">?</span><span className="wkf-can-l">{WAY.canTitle}</span></summary>
    <div className="wkf-sheet">
     {p.here?<p className="wkf-here wkf-narrow">{p.here}</p>:null}
     {p.can.length>0&&<ol>{p.can.map(t=><li key={t}>{t}</li>)}</ol>}
     {p.next.length>0&&<ul className="wkf-next wkf-narrow" aria-label={WAY.nextTitle}>{p.next.map(n=><li key={n.href}><Link className="min-h-tap" href={n.href}>{n.label} <span aria-hidden="true">→</span></Link></li>)}</ul>}
    </div>
   </details>
  </div>
 </nav>
}

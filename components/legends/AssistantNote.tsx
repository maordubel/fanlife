'use client'
import type {AdviceNote} from '@/lib/legends/advice'
import type {Tab} from './CareerNav'

/** U01: the assistant manager — up to three plain notes, a button each that only opens the right tab (it never changes the eleven). */
export function AssistantNotes({notes,go}:{notes:AdviceNote[];go:(t:Tab)=>void}){
 if(!notes.length)return null
 return <section className="lgm-panel lgm-assist" aria-label="Assistant manager" data-testid="legends-assistant">
  <p className="lgm-kicker">Your assistant</p>
  <ul>{notes.map(n=><li key={n.id} data-severity={n.severity}><span>{n.text}</span><button type="button" className="lgm-link min-h-tap" onClick={()=>go(n.to)}>{n.cta}</button></li>)}</ul>
 </section>
}

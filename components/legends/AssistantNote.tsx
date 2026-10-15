'use client'
import type {AdviceNote} from '@/lib/legends/advice'
import type {Tab} from './CareerNav'

/** U01: the assistant manager — up to three plain notes, a button each that only opens the right tab (it never changes the eleven). */
export function AssistantNotes({notes,go}:{notes:AdviceNote[];go:(t:Tab)=>void}){
 if(!notes.length)return null
 return <section className="wk-panel wk-lift wkl-assist" aria-label="Assistant manager" data-testid="legends-assistant">
  <h3 className="wk-logo sm">Your assistant</h3>
  <ul>{notes.map(n=><li key={n.id} data-severity={n.severity}><span className="wk-cap white">{n.text}</span><button type="button" className="wk-btn paper min-h-tap" onClick={()=>go(n.to)}>{n.cta}</button></li>)}</ul>
 </section>
}

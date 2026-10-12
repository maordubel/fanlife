import Link from 'next/link'
import {ALL_FOOTBALL} from '@/lib/experiences/registry'
import {deskHref} from '@/lib/master/attention'
import type {Features} from '@/lib/features'

/** Experiences on the Games desk (CRM 2 §6.5): ALL FOOTBALL is an experience, not a row in the club registry (ADR-0009). */
export function ExperienceDesk({features,compact=false}:{features:Features;compact?:boolean}){
 const on=features.allFootball
 const card=<section className="crm-exp" aria-labelledby="exp-af-h">
  <span className="desk-stamp" data-ok={on||undefined}>{on?'Open to fans':'Owner preview'}</span>
  <div><h2 id="exp-af-h">{ALL_FOOTBALL.name}</h2><p>{ALL_FOOTBALL.tagline}</p>
   <p className="desk-fine">Gates: {features.allFootballGates.length?features.allFootballGates.join(' · '):'none switched on'}.</p></div>
  <p className="desk-actions"><Link className="desk-btn" href={deskHref('games',{view:'all-football'})}>Workspace →</Link><a className="desk-btn ghost" href={ALL_FOOTBALL.path} target="_blank" rel="noreferrer">Play it ↗</a></p>
 </section>
 if(compact)return <div className="crm-exps"><p className="desk-kicker">Experiences</p>{card}</div>
 return <div className="desk-content"><header className="desk-head"><p className="desk-kicker">Games · Experience</p><h1 className="desk-h1">{ALL_FOOTBALL.name}</h1></header>{card}
  <p className="desk-fine">Switch it on or off in <Link href={deskHref('settings')}>Settings → Features</Link>.</p></div>
}

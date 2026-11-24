import Link from 'next/link'
import {bit} from '@/lib/home/art'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

/**
 * LIFE IS CLOSED TO THE PUBLIC (owner, 24.11.2026: "LIFE must stay closed to the public. Coming soon only."). Every LIFE
 * address — a club's, and the old /life — answers a visitor with this one screen while the switch `life` is off; nothing of
 * the game is rendered behind it. The owner's preview still walks in. Rule: docs/rules/life-coming-soon.md
 */
export function LifeSoon({back,backLabel,locale='en'}:{back:string;backLabel?:string;locale?:string}){
 const copy=locale==='he'?he:en,ticket=bit('match-ticket')
 return <main id="main" className="wkls" data-testid="life-soon">
  {/* eslint-disable-next-line @next/next/no-img-element -- the owner's cut-out, decoration only */}
  <img className="wkls-art" src={ticket.src} srcSet={ticket.srcSet} sizes="180px" alt="" width={320} height={132} decoding="async"/>
  <p className="wk-banner">{copy.lifeSoon}</p>
  <h1 className="wkls-h">Life!</h1>
  <p className="wkls-note">{copy.lifeSoonNote}</p>
  <Link className="wk-btn wkls-back min-h-tap" href={back}>{backLabel??copy.lifeSoonBack} <span aria-hidden="true">→</span></Link>
 </main>
}

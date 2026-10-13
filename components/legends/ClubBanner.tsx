import Link from 'next/link'
import {Emblem} from './Brand'
import {door} from '@/lib/features-server'
import {legendsReadyFor} from '@/lib/legends/server'
import {bannerPaint,legendsHref} from '@/lib/legends/banner'
import type {ClubTheme} from '@/lib/clubs/theme'

/**
 * LEGENDS MANAGER's own banner on a club's home (owner, 12.10.2026). It appears only when the door is open to this viewer (the
 * switch, or the owner's preview) AND this club can open a career — the same verdict the front door reads, for this one club.
 * The page streams it in a Suspense boundary, so the club's home never waits on a readiness check (rule 104).
 * Rule 95: the paint is chosen by `bannerPaint`, so a colour the club bans never reaches its page.
 */
export async function LegendsBanner({club,name,theme}:{club:string;name:string;theme:ClubTheme}){
 const d=await door('fanLeague').catch(()=>null);if(!d?.open)return null
 const r=await legendsReadyFor(club).catch(()=>null);if(!r||r.verdict!=='READY'||r.held)return null
 const p=bannerPaint(theme)
 return <section className="mag-section lgm-banner-wrap" id="legends" aria-labelledby="lgm-banner-h" lang="en" dir="ltr">
  <Link className="lgm-banner min-h-tap" href={legendsHref(club)} data-night={p.night} data-star={p.star} data-bronze={p.bronze} data-testid="legends-banner">
   <span className="lgm-banner-mark" aria-hidden="true"><Emblem size={168} label="LEGENDS MANAGER" mono/></span>
   <span className="lgm-banner-text">
    <span className="lgm-banner-kicker">ALL FOOTBALL presents{d.preview?<i> · Owner preview</i>:null}</span>
    <b className="lgm-banner-title" id="lgm-banner-h">Legends <span>Manager</span></b>
    <span className="lgm-banner-lede">Build {name}&rsquo;s all-time legends side &mdash; season after season.</span>
    <span className="lgm-banner-fine">{r.men.toLocaleString('en-GB')} men who wore the shirt · draft seventeen · run the club</span>
   </span>
   <span className="lgm-banner-cta">Found the dynasty <i aria-hidden="true">→</i></span>
  </Link>
 </section>
}

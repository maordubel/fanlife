import Link from 'next/link'
import type {HubClub} from '@/lib/home/hub-model'
import type {GameCard,PlayFilter,PlayMode} from '@/lib/home/doors'
import {GateChooser,type ChooserCopy} from './MagazineHubControls'

export type PlayCopy={kicker:string;title:string;all:string;solo:string;friends:string;both:string;pick:string;open:string;none:string}
const TABS:PlayFilter[]=['all','solo','friends']

/** OUR GAMES, every game with its way of playing said in advance (owner spec, 22.11.2026). Tabs are links: the server filters. */
export function PlayIndex({cards,filter,copy,clubs,chooser,lang}:{cards:GameCard[];filter:PlayFilter;copy:PlayCopy;clubs:HubClub[];chooser:ChooserCopy;lang:string}){
 const tab=(f:PlayFilter)=>f==='all'?copy.all:f==='solo'?copy.solo:copy.friends
 const mode=(m:PlayMode)=>m==='both'?copy.both:m==='friends'?copy.friends:copy.solo
 const face=(c:GameCard,go:string)=><><span className="wkd-game-no wk-num" aria-hidden="true">{c.number===null?'★':String(c.number).padStart(2,'0')}</span>
  <span className="wkd-game-t"><b>{c.name}</b><small>{go}</small></span><span className="wkd-mode" data-mode={c.mode}>{mode(c.mode)}</span></>
 return <section className="wkd-play" id="play" aria-labelledby="play-h" data-testid="play-index">
  <div className="wkd-play-head"><p className="wk-banner">{copy.kicker}</p><h2 className="wk-logo green wkd-play-title" id="play-h">{copy.title}</h2></div>
  <nav className="wkd-tabs" aria-label={copy.kicker}>{TABS.map(f=><Link key={f} className="wkd-tab min-h-tap" aria-current={f===filter?'page':undefined} href={`/our-games?play=${f}${lang}#play`} scroll={false}>{tab(f)}</Link>)}</nav>
  {cards.length===0?<p className="wk-small">{copy.none}</p>
   :<ul className="wkd-games">{cards.map(c=><li key={c.key} data-game={c.key} data-mode={c.mode}>{c.key==='legends'
    ?<Link className="wkd-game min-h-tap" href="/all-football/legends">{face(c,copy.open)}</Link>
    :<GateChooser gate={c.key} clubs={clubs} copy={chooser} className="wkd-game">{face(c,copy.pick)}</GateChooser>}</li>)}</ul>}
 </section>
}

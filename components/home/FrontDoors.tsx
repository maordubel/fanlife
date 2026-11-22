import Link from 'next/link'
import type {HubClub} from '@/lib/home/hub-model'
import {ARCHIVE_GATE,doorPicture} from '@/lib/home/doors'
import {GateChooser,type ChooserCopy} from './MagazineHubControls'

const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
export type DoorsCopy={kicker:string;lines:string[];sub:string;soloT:string;soloSub:string;friendsT:string;friendsSub:string;archiveT:string;archiveSub:string;preview:string}

/**
 * THE THREE DOORS, straight under the masthead (owner spec, 22.11.2026). The cover picture is the owner's (pack of
 * 22.11.2026, scripts/brand/front-doors.py): its dark half carries the headline on a desktop; on a phone it is a band
 * and the three doors are rows a thumb reaches. The archive door opens the club chooser, because every club has its own.
 */
export function FrontDoors({copy,clubs,chooser,lang,preview}:{copy:DoorsCopy;clubs:HubClub[];chooser:ChooserCopy;lang:string;preview:boolean}){
 const cover=doorPicture('cover'),solo=doorPicture('solo'),friends=doorPicture('friends'),archive=doorPicture('archive')
 const face=(p:{src:string;srcSet:string},t:string,sub:string)=><>
  <img className="wkd-pic" src={p.src} srcSet={p.srcSet} sizes="(min-width: 901px) 30vw, 104px" alt="" width={960} height={640} loading="eager" decoding="async"/>
  <span className="wkd-t"><b>{t}</b><small>{sub}</small></span><Arrow/></>
 return <section className="wkd" aria-labelledby="doors-h" data-testid="front-doors" data-preview={preview||undefined}>
  <div className="wkd-cover">
   <img className="wkd-cover-pic" src={cover.src} srcSet={cover.srcSet} sizes="(min-width: 901px) 92vw, 100vw" alt="" width={1536} height={1024} fetchPriority="high" decoding="async"/>
   <div className="wkd-cover-t">
    <p className="wk-banner">{copy.kicker}{preview?` · ${copy.preview}`:''}</p>
    <h2 className="wkd-h" id="doors-h">{copy.lines.map((l,i)=><span key={i}>{l} </span>)}</h2>
    <p className="wkd-sub">{copy.sub}</p>
   </div>
  </div>
  <ul className="wkd-list">
   <li><Link className="wkd-door min-h-tap" data-door="solo" href={`/our-games?play=solo${lang}#play`}>{face(solo,copy.soloT,copy.soloSub)}</Link></li>
   <li><Link className="wkd-door min-h-tap" data-door="friends" href={`/our-games?play=friends${lang}#play`}>{face(friends,copy.friendsT,copy.friendsSub)}</Link></li>
   <li data-door="archive"><GateChooser gate={ARCHIVE_GATE} clubs={clubs} copy={chooser} className="wkd-door">{face(archive,copy.archiveT,copy.archiveSub)}</GateChooser></li>
  </ul>
 </section>
}

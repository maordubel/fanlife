import Link from 'next/link'

export type ClubDoor={key:'solo'|'friends'|'archive';href:string;title:string;sub:string}

/**
 * THREE WAYS INTO THE CLUB (owner, 24.11.2026: "the inner pages, each club's home, are still not at the level asked").
 * Under the masthead the club says what a supporter can do here, before anything else: play on his own today, challenge a
 * friend, open the club's archive. The owner's door pictures print in the club's one ink (rule 95). Phone: three slim rows.
 * Desktop: three cards in a row. Rule: docs/rules/club-home-short.md
 */
export function ClubDoors({kicker,doors}:{kicker:string;doors:ClubDoor[]}){
 return <nav className="wkcd" aria-label={kicker} data-testid="club-doors">
  <p className="wk-banner wkcd-k">{kicker}</p>
  <ol className="wkcd-list">{doors.map((d,i)=><li key={d.key}><Link className="wkcd-door min-h-tap" href={d.href} data-door={d.key}>
   <span className="wkcd-pic" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- the owner's door picture, cut by scripts/brand/front-doors.py */}
    <img src={`/brand/fanlife/doors/${d.key}-480.webp`} srcSet={`/brand/fanlife/doors/${d.key}-480.webp 480w, /brand/fanlife/doors/${d.key}-960.webp 960w`} sizes="(min-width: 901px) 30vw, 120px" alt="" width={480} height={320} loading="lazy" decoding="async"/>
    <span className="wkcd-no wk-num">{i+1}</span>
   </span>
   <span className="wkcd-t"><b>{d.title}</b><small>{d.sub}</small></span>
   <svg className="wkcd-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  </Link></li>)}</ol>
 </nav>
}

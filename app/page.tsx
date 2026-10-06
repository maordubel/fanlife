import Link from 'next/link'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {FixtureRotator,type RotatorItem} from '@/components/home/FixtureRotator'
import {readState} from '@/lib/master/store'
import {GATES} from '@/lib/master/types'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {livery} from '@/lib/club-livery'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'

const wear=(primary:string)=>({['--club-primary' as string]:primary})

export default async function Home({searchParams}:{searchParams:{lang?:string}}){
 const hc=headers().get('x-fan-life-club')
 if(hc)redirect(hc==='hapoel-tel-aviv'?'/ground':`/clubs/${hc}`)
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
 const life=await lifeEntries(open,evaluationMode())
 const now=new Date()
 const feed=await getFixtureFeed(now).catch(()=>null)
 const order=feed?rotationOrder(feed.fixtures,now):[]
 const items:RotatorItem[]=order.flatMap(f=>{
  const l=livery(f.clubId)
  if(!l)return []
  return [{clubId:f.clubId,club:l.name,opponent:f.opponent,initials:l.initials,primary:l.primary,pattern:l.pattern,kickoff:f.kickoff,dateOnly:f.dateOnly,clubSide:f.clubSide,competition:f.competition,venue:f.venue,href:`/clubs/${f.clubId}/meetings?vs=${encodeURIComponent(f.opponent)}&lang=${locale}`,tag:f.phase}]
 })
 const first=items[0]
 const date=new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(now)
 const stop=first?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{first.club} {copy.vs} {first.opponent}</span></div>:undefined
 const rotatorCopy={next:copy.nextUp,cta:copy.nextCta,home:copy.homeSide,away:copy.awaySide,vs:copy.vs,pause:copy.pause,play:copy.resume,live:copy.tagLive,today:copy.tagToday,soon:copy.tagSoon,later:copy.tagLater}
 return <Shell locale={locale} stop={stop}><main id="main">
  <section className="mag-cover"><div className="mag-cover-in">
   <div>
    <div className="mag-dateline"><span>{date}</span><span>No. 1 · FREE</span></div>
    <h1 className="mag-masthead">FAN<br/>LIFE</h1>
    <p className="mag-sticker paper">{copy.coverTag}</p>
    <div className="mag-inside"><p className="mag-mono">{copy.insideTitle}</p><ul>{GATES.slice(0,4).map(([n,name])=><li key={n}><i>{String(n).padStart(2,'0')}</i>{name}</li>)}</ul></div>
   </div>
   <div>
    <div className="mag-circle" role="img" aria-label={copy.coverHead}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="var(--mag-paper)" stroke="var(--mag-ink)" strokeWidth="4"/><polygon points="50,30 66,42 60,62 40,62 34,42" fill="var(--mag-ink)"/><path d="M50 30V8M66 42l22-8M60 62l14 18M40 62L26 80M34 42L12 34" stroke="var(--mag-ink)" strokeWidth="3" fill="none"/></svg></div>
    <p className="mag-bowl" style={{fontSize:'clamp(26px,5vw,38px)',lineHeight:1,textAlign:'center',marginTop:18}}>{copy.coverHead}</p>
    <p className="mag-mono" style={{textAlign:'center',marginTop:8}}>{copy.coverSub}</p>
    <div className="mag-xi" role="img" aria-label={copy.teamSheet}>{Array.from({length:11},(_,i)=><span key={i} aria-hidden="true">{i+1}</span>)}</div>
    <span className="mag-burst mag-gates-burst" aria-hidden="true"><b>{GATES.length}</b>{copy.gates}</span>
   </div>
  </div></section>

  <section className="mag-section" id="next">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.tabNext}</p><h2 className="mag-h2">{copy.nextUp}</h2></div><p className="mag-fine">{copy.nextNote}</p></div>
   {items.length>0?<FixtureRotator items={items} copy={rotatorCopy} locale={locale}/>
    :<div className="mag-fixture empty"><div className="mag-fixture-body"><h3>{feed&&feed.status!=='unavailable'?copy.nextEmpty:copy.nextDown}</h3></div></div>}
  </section>

  <section className="mag-section" id="clubs">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.clubs}</p><h2 className="mag-h2">{copy.pickClub}</h2></div></div>
   <div className="mag-tiles">{open.map((c,n)=>{
    const l=livery(c.id),entry=life[c.id]
    return <div key={c.id}>
     <Link className="mag-tile" href={`/clubs/${c.id}?lang=${locale}`} style={l?wear(l.primary):undefined}>
      <span className="no">{String(n+1).padStart(2,'0')}</span>
      {l&&<span className="mag-badge" data-livery={l.pattern} aria-hidden="true">{l.initials}</span>}
      <span><b>{c.name}</b><small>{c.city}</small></span>
     </Link>
     {entry?.href?<Link className="mag-tile-life" href={entry.href}>{copy.lifeStrip}<span>{copy.lifeIn} →</span></Link>:<span className="mag-tile-life off">{copy.lifeStrip} · {copy.lifeOff}</span>}
    </div>})}</div>
  </section>

  <section className="mag-section" id="gates">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.gates}</p><h2 className="mag-h2">{copy.gatesTitle}</h2></div><p className="mag-fine">{copy.gatesNote}</p></div>
   <div className="mag-contents mag-contents-grid">{GATES.map(([n,name,url,desc])=><Link className="mag-row" href={url} key={n}><em>{String(n).padStart(2,'0')}</em><span>{name}<small>{desc}</small></span><span className="lead" aria-hidden="true"/><s>→</s></Link>)}</div>
  </section>

  <section className="mag-section"><div className="mag-letter"><p className="mag-kicker" style={{color:'var(--mag-salmon)'}}>{copy.letterKicker}</p><p className="dropcap">{copy.letterBody}</p><p className="mag-sign">{copy.editor}</p></div></section>
  <section className="mag-section"><div className="mag-ps"><p className="mag-kicker">{copy.psKicker}</p><p>{copy.psBody}</p></div></section>
 </main></Shell>}

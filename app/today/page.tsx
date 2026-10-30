import Link from 'next/link'
import type {Metadata} from 'next'
import {Shell} from '@/components/master/Shell'
import {REGISTRY} from '@/lib/master/registry'
import {readState} from '@/lib/master/store'
import {featuresOf} from '@/lib/features'
import {SITE_URL} from '@/lib/brand'

export const dynamic='force-dynamic'
export const metadata:Metadata={
 title:'Today on FAN LIFE',
 description:'Every game from today\'s FAN LIFE posts in one place: the quiz, the gate and the challenge you just saw.',
 alternates:{canonical:`${SITE_URL}/today`},
 // a page that changes every hour is a door, not a document: followed, not indexed
 robots:{index:false,follow:true},
}

type Post={at:string;label:string|null;hook:string|null;url:string}

/** The day's sent FAN LIFE posts (public.worker_marketing_today, service role) — never the answers. Null = could not ask. */
async function todaysPosts():Promise<Post[]|null>{
 const base=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!base||!key)return null
 try{
  const r=await fetch(`${base}/rest/v1/rpc/worker_marketing_today`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(4000),headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:'{}'})
  if(!r.ok)return null
  const rows=await r.json()
  return Array.isArray(rows)?rows.filter((p:Post)=>typeof p?.url==='string'&&p.url.startsWith(SITE_URL)):null
 }catch{return null}
}
const path=(u:string)=>u.slice(SITE_URL.length)||'/'
/** Today's shared round: the same seed for everyone who opens it today (Israel date), so two people get the same questions. */
const todaySeed=()=>{const d=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});let h=0;for(const ch of d)h=(h*31+ch.charCodeAt(0))>>>0;return 100000+h%900000}

/**
 * /today — the "link in bio" (30.10.2026). Every post on the FAN LIFE page ends "link in bio"; this is that link: the
 * day's posts, newest first, each one tap from its game. Below them, the way in for anyone who came without a post:
 * every published club, and a round to play with your dad (the audience is 15–55, and the club passes down).
 */
export default async function Today(){
 const [posts,state]=await Promise.all([todaysPosts(),readState().catch(()=>null)])
 const live=REGISTRY.filter(r=>state?.clubs.find(c=>c.id===r.id)?.status==='live').sort((a,b)=>a.name.localeCompare(b.name))
 const legends=featuresOf(state).fanLeague,seed=todaySeed()
 return <Shell locale="en"><main id="main" className="wkh-doc wkh-today">
  <header className="wkh-doc-head">
   <p className="wk-banner">From the posts</p>
   <h1 className="wk-head wkh-title">Today on FAN LIFE</h1>
   <p className="wkh-doc-lede">Saw a post? Tap it here and play it. Free, no sign-up.</p>
  </header>
  {posts&&posts.length?<ol className="wkh-today-list">{posts.map((p,i)=><li key={`${p.at}-${i}`}>
   <Link href={path(p.url)} className="wk-panel wk-lift wkh-today-card">
    <span className="wk-k wk-muted"><bdi>{p.at}</bdi>{p.label?` · ${p.label}`:''}</span>
    <b className="wk-head" dir="auto">{p.hook||'Play'}</b>
    <span className="wkh-today-go">Play →</span>
   </Link></li>)}</ol>
   :<p className="wkh-doc-lede">{posts?'Today\'s posts start at 08:00. Until then, pick your club below.':'Pick your club below and start with any gate.'}</p>}
  <section className="wkh-doc-body">
   <h2>Play with your dad (or your kid)</h2>
   <p>Today’s round for two: open your club’s link, then send the same link to your dad or your kid. You both get the same questions — compare scores after.</p>
   <ul className="wkh-today-clubs">{live.map(c=><li key={c.id}><Link href={`/clubs/${c.id}/trivia?seed=${seed}`}>{c.name}</Link></li>)}</ul>
   <h2>Your club’s home</h2>
   <ul className="wkh-today-clubs">{live.map(c=><li key={c.id}><Link href={`/clubs/${c.id}`}>{c.name}</Link></li>)}</ul>
   {legends?<p><Link href="/all-football/legends">Legends Manager</Link> — run one club with only the players who wore its shirt.</p>:null}
  </section>
 </main></Shell>
}

'use client'
import {useEffect,useMemo,useState} from 'react'
import type {Job} from '@/lib/stories/jobs'
import {LIMITS,PLATFORMS,PLATFORM_NAME,captionLength,compose,filmLink,mediaAllowed,mediaChoices,textProblem,type Platform,type SocialLights,type SocialMedia,type SocialPost} from '@/lib/stories/social'
import css from './social.module.css'

/**
 * A finished film on Facebook, Instagram, X and TikTok (owner, 4.11.2026). One card per platform: the post as composed
 * (editable), copy buttons, the connection light, Publish now / Schedule (Athens time), and the posts already planned.
 * The runner (.github/workflows/stories-social.yml) publishes what is connected and switched on; everything else
 * arrives on the owner's Telegram as a ready copy-paste pack. This panel never sees a secret — only yes/no lights.
 */
const ATHENS=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
const when=(iso:string)=>`${ATHENS.format(new Date(iso))} Athens`
const STATE:Record<SocialPost['state'],string>={scheduled:'Scheduled',sending:'Sending',sent:'Published',failed:'Did not go out',manual:'On your Telegram'}
const SETUP:Record<Platform,string[]>={
 facebook:[
  'Uses the same Page connection as the social plan (docs/fanlife/53): if it is already set up there, only the last step is new.',
  'GitHub → Settings → Secrets and variables → Actions → Variables → New variable: META_PAGE_ID (the Page id).',
  'Same page → Secrets → New repository secret: META_PAGE_TOKEN (the Page token of the system user).',
  'Variables → New variable: STORIES_SOCIAL_AUTOPUBLISH = 1 (this switch is for the films only; delete it to stop).',
 ],
 instagram:[
  'The Instagram account must be a Business or Creator account, linked to the Facebook Page (Page settings → Linked accounts → Instagram).',
  'Set up Facebook first (same token).',
  'GitHub → Settings → Secrets and variables → Actions → Variables → New variable: META_IG_USER_ID.',
 ],
 x:[
  'developer.x.com → Projects & Apps → your app → User authentication settings → Read and write.',
  'Keys and tokens → API Key and Secret → Regenerate; Access Token and Secret → Generate (for the FanLife account).',
  'GitHub → Settings → Secrets and variables → Actions → New repository secret, four times: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.',
  'Needs an X API plan that allows posting and media upload.',
 ],
 tiktok:[
  'developers.tiktok.com → Manage apps → Create app → add Login Kit and Content Posting API (Direct Post), scope video.publish.',
  'Until TikTok audits the app, every post is private ("only me"): set the TikTok account to private, or submit the app for audit.',
  'Authorise the FanLife TikTok account once, then GitHub → Settings → Secrets and variables → Actions → New repository secret: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REFRESH_TOKEN (lasts a year). TIKTOK_ACCESS_TOKEN alone works for 24 hours.',
 ],
}
async function call(path:string,init?:RequestInit){
 const r=await fetch(path,{cache:'no-store',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}})
 const b=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`)
 return b
}
/** A datetime-local value read as Athens wall-clock time → an ISO string with Athens' offset on that date. */
function athensToIso(local:string){
 const [d,t]=local.split('T');const guess=new Date(`${d}T${t}:00Z`)
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',timeZoneName:'longOffset'}).formatToParts(guess)
 const off=(parts.find(p=>p.type==='timeZoneName')?.value||'GMT+02:00').replace('GMT','')||'+00:00'
 return `${d}T${t}:00${off}`
}
const mkey=(m:SocialMedia|null)=>m?`${m.kind}:${m.index}`:'none'
const unkey=(k:string):SocialMedia|null=>{if(k==='none')return null;const [kind,i]=k.split(':');return {kind:kind as SocialMedia['kind'],index:Number(i)}}

export function SocialPanel({job}:{job:Job}){
 const [posts,setPosts]=useState<SocialPost[]>(job.social?.posts??[])
 const [lights,setLights]=useState<SocialLights|null>(null),[fresh,setFresh]=useState(false)
 useEffect(()=>{setPosts(job.social?.posts??[])},[job.updatedAt,job.social])
 useEffect(()=>{void call('/api/master/stories/social').then(b=>{setLights(b.lights??null);setFresh(!!b.fresh)}).catch(()=>{})},[job.id])
 const link=filmLink(job)
 const [allAt,setAllAt]=useState(''),[allMsg,setAllMsg]=useState(''),[allBusy,setAllBusy]=useState(false)
 const [drafts,setDrafts]=useState<Record<Platform,{caption:string;comment:string;media:SocialMedia|null}>>(()=>Object.fromEntries(PLATFORMS.map(p=>{const d=compose(job,p);return [p,{caption:d.caption,comment:d.comment,media:d.media}]})) as Record<Platform,{caption:string;comment:string;media:SocialMedia|null}>)
 const schedule=async(items:{platform:Platform;when:string;caption:string;comment:string;media:SocialMedia|null}[])=>{
  const b=await call(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify({action:'social_schedule',posts:items})})
  setPosts(b.job?.social?.posts??[])
 }
 const cancel=async(id:string)=>{const b=await call(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify({action:'social_cancel',id})});setPosts(b.job?.social?.posts??[])}
 async function scheduleAll(){
  setAllMsg('');if(!allAt){setAllMsg('Choose a date and time first.');return}
  const iso=athensToIso(allAt)
  const items=PLATFORMS.filter(p=>!mediaAllowed(p,drafts[p].media)&&!textProblem(p,drafts[p].caption,drafts[p].comment)).map(p=>({platform:p,when:iso,...drafts[p]}))
  if(!items.length){setAllMsg('No platform is ready: fix the captions below.');return}
  setAllBusy(true)
  try{await schedule(items);setAllMsg(`${items.length} posts scheduled for ${when(iso)}.`)}catch(e){setAllMsg(e instanceof Error?e.message:'Could not schedule.')}finally{setAllBusy(false)}
 }
 const sorted=useMemo(()=>[...posts].sort((a,b)=>b.dueAt.localeCompare(a.dueAt)),[posts])
 const on=lights?.autopublish===true

 return <section className={css.root} aria-labelledby={`social-${job.id}`}>
  <h3 className={css.h} id={`social-${job.id}`}>Social — Facebook · Instagram · X · TikTok</h3>
  <p className={css.lead}>{on?'Automatic publishing is on: connected platforms publish at the time you set. Anything else arrives on your Telegram as a ready pack — caption, first comment and the file.':'Automatic publishing is off: every post arrives on your Telegram at its time as a ready pack — caption, first comment and the file — to paste by hand.'} The runner looks every 10 minutes, so a post goes out up to 10 minutes after its time.</p>
  {!link.film&&<p className={css.warn}>Not on YouTube yet: the posts link to the channel. Record the YouTube video id below first and the first comments will link to the film itself.</p>}
  <div className={css.all}>
   <label className={css.lab}>All four at one time (Athens)<input type="datetime-local" value={allAt} onChange={e=>setAllAt(e.target.value)} className={css.input}/></label>
   <button type="button" className={`${css.btn} ${css.red} min-h-tap`} disabled={allBusy} onClick={()=>void scheduleAll()}>{allBusy?'Scheduling…':'Schedule all four'}</button>
   {allMsg&&<p className={css.msg} role="status">{allMsg}</p>}
  </div>
  <div className={css.grid}>{PLATFORMS.map(p=><PlatformCard key={p} job={job} platform={p} lights={lights} fresh={fresh} draft={drafts[p]} setDraft={d=>setDrafts(x=>({...x,[p]:d}))} schedule={schedule}/>)}</div>
  {sorted.length?<><h4 className={css.h4}>Planned and sent</h4><ul className={css.posts}>{sorted.map(x=><PostRow key={x.id} post={x} cancel={cancel}/>)}</ul></>:null}
 </section>
}

function PlatformCard({job,platform,lights,fresh,draft,setDraft,schedule}:{job:Job;platform:Platform;lights:SocialLights|null;fresh:boolean
 draft:{caption:string;comment:string;media:SocialMedia|null};setDraft:(d:{caption:string;comment:string;media:SocialMedia|null})=>void
 schedule:(items:{platform:Platform;when:string;caption:string;comment:string;media:SocialMedia|null}[])=>Promise<void>}){
 const name=PLATFORM_NAME[platform]
 const [at,setAt]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[copied,setCopied]=useState('')
 const connected=lights?.[platform]===true,auto=lights?.autopublish===true
 const live=connected&&auto
 const choices=mediaChoices(job).filter(c=>platform!=='tiktok'||c.media.kind==='short')
 const n=captionLength(platform,draft.caption),max=LIMITS[platform].caption
 const problem=mediaAllowed(platform,draft.media)||textProblem(platform,draft.caption,draft.comment)
 const copy=async(k:string,v:string)=>{try{await navigator.clipboard.writeText(v);setCopied(k);setTimeout(()=>setCopied(''),1600)}catch{setCopied('')}}
 const go=async(whenValue:string)=>{
  setMsg('');if(problem){setMsg(problem);return}
  setBusy(true)
  try{await schedule([{platform,when:whenValue,...draft}]);setMsg(whenValue==='now'?(live?`Queued — goes out on ${name} within about 10 minutes.`:'Queued — the ready pack reaches your Telegram within about 10 minutes.'):`Scheduled for ${when(whenValue)}.`);setAt('')}
  catch(e){setMsg(e instanceof Error?e.message:'Could not schedule.')}finally{setBusy(false)}
 }
 const light=!lights?'wait':connected?'yes':'no'
 return <article className={css.card} data-platform={platform}>
  <header className={css.cardHead}><b className={css.name}>{name}</b>
   <span className={css.light} data-ok={light}>{!lights?'Not checked yet':connected?(auto?'Connected · publishes by itself':'Connected · automatic publishing is off'):'Not connected · goes to your Telegram'}{lights&&!fresh?' (last check over 45 min ago)':''}</span></header>
  <label className={css.lab}>File<select className={css.input} value={mkey(draft.media)} onChange={e=>{const m=unkey(e.target.value);const hookOf=(x:SocialMedia|null)=>x?.kind==='short'?mediaChoices(job).find(c=>c.media.kind==='short'&&c.media.index===x.index)?.hook:null;const next=compose(job,platform,m);setDraft({...draft,media:m,caption:hookOf(draft.media)!==hookOf(m)?next.caption:draft.caption})}}>
   {platform==='x'||platform==='facebook'?<option value="none">No file (text only)</option>:null}
   {choices.map(c=><option key={mkey(c.media)} value={mkey(c.media)}>{c.label}{c.hook?` — ${c.hook}`:''}</option>)}
  </select></label>
  <div className={css.field}><div className={css.fieldHead}><span>Caption</span><span className={n>max?css.over:undefined}>{n} / {max}</span><button type="button" className={`${css.btn} min-h-tap`} onClick={()=>void copy('c',draft.caption)}>{copied==='c'?'Copied':'Copy'}</button></div>
   <textarea className={css.text} rows={platform==='x'?4:8} value={draft.caption} onChange={e=>setDraft({...draft,caption:e.target.value})} aria-label={`${name} caption`}/></div>
  <div className={css.field}><div className={css.fieldHead}><span>First comment{platform==='x'?' (a reply)':''}{platform==='tiktok'?' (by hand: TikTok has no comment API)':''}</span><button type="button" className={`${css.btn} min-h-tap`} onClick={()=>void copy('m',draft.comment)}>{copied==='m'?'Copied':'Copy'}</button></div>
   <textarea className={css.text} rows={2} value={draft.comment} onChange={e=>setDraft({...draft,comment:e.target.value})} aria-label={`${name} first comment`}/></div>
  {problem&&<p className={css.problem}>{problem}</p>}
  <div className={css.actions}>
   <button type="button" className={`${css.btn} ${css.red} min-h-tap`} disabled={busy||!!problem} onClick={()=>void go('now')}>{live?'Publish now':'Send pack to Telegram now'}</button>
  </div>
  <div className={css.later}>
   <label className={css.lab}>Or at (Athens time)<input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)} className={css.input}/></label>
   <button type="button" className={`${css.btn} min-h-tap`} disabled={busy||!at||!!problem} onClick={()=>void go(athensToIso(at))}>Schedule</button>
  </div>
  {msg&&<p className={css.msg} role="status">{msg}</p>}
  {!connected&&<details className={css.setup}><summary className="min-h-tap">How to connect {name}</summary><ol>{SETUP[platform].map(s=><li key={s}>{s}</li>)}</ol></details>}
 </article>
}

function PostRow({post,cancel}:{post:SocialPost;cancel:(id:string)=>Promise<void>}){
 const [busy,setBusy]=useState(false),[err,setErr]=useState('')
 const stuck=post.state==='sending'&&Date.now()-Date.parse(post.claimedAt||post.dueAt)>60*60_000
 const canRemove=post.state==='scheduled'||post.state==='failed'||post.state==='manual'||stuck
 return <li className={css.post} data-state={post.state}>
  <div className={css.postHead}><b>{PLATFORM_NAME[post.platform]}</b><span className={css.chip} data-state={post.state}>{STATE[post.state]}</span><span className={css.when}>{when(post.dueAt)}</span></div>
  <p className={css.snip}>{post.caption.split('\n')[0]}</p>
  {post.result&&<p className={css.meta}>{post.result}</p>}
  {post.error&&<p className={css.problem}>{post.error}</p>}
  {stuck&&<p className={css.problem}>This post never reported back. Check {PLATFORM_NAME[post.platform]} before removing it — it will not be sent again.</p>}
  <div className={css.actions}>
   {post.url&&<a className={`${css.btn} min-h-tap`} href={post.url} target="_blank" rel="noreferrer">Open on {PLATFORM_NAME[post.platform]}</a>}
   {canRemove&&<button type="button" className={`${css.btn} min-h-tap`} disabled={busy} onClick={async()=>{if(post.state==='scheduled'||confirm('Remove this post from the list?')){setBusy(true);setErr('');try{await cancel(post.id)}catch(e){setErr(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}}}}>{post.state==='scheduled'?'Cancel':'Remove'}</button>}
  </div>
  {err&&<p className={css.problem} role="alert">{err}</p>}
 </li>
}

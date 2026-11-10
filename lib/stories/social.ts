/**
 * FanLife: Football Stories — a finished film on Facebook, Instagram, X and TikTok (owner, 4.11.2026: "a button for
 * automatic / scheduled publishing … the copy, the info, the tags, the titles and everything needed").
 *
 * Pure functions only (no I/O), so the composer, the schedule and every transition are tested on their own:
 *   · compose() — one platform's post for a finished film: hook, caption within the platform's limit, smart tags
 *     (lib/marketing/tags.ts), the first comment (the film's link — rule 127: the answer and the link go in the first
 *     comment, never in the caption) and which file goes with it (a Short, or a thumbnail).
 *   · scheduleSocial / cancelSocial — the owner's actions, stored on the job (`job.social.posts`).
 *   · dueSocial / claimSocial / resultSocial — the GitHub runner's door. A post is claimed once and tried once:
 *     a claimed post is never published twice, whatever happens after the claim.
 * Nothing here publishes; scripts/football-stories/publish/social.mjs does, and only when its secret is set AND the
 * repository variable STORIES_SOCIAL_AUTOPUBLISH is 1. Otherwise a post becomes `manual`: a ready copy-paste pack on
 * the owner's Telegram.
 */
import {CLUB_TAGS,smartTags,type Topic} from '@/lib/marketing/tags'
import type {Job} from './jobs'

export const PLATFORMS=['facebook','instagram','x','tiktok'] as const
export type Platform=typeof PLATFORMS[number]
export const PLATFORM_NAME:Record<Platform,string>={facebook:'Facebook',instagram:'Instagram',x:'X',tiktok:'TikTok'}
export type SocialMedia={kind:'short'|'thumbnail';index:number}
export type SocialState='scheduled'|'sending'|'sent'|'failed'|'manual'
export type SocialPost={
 id:string;platform:Platform;when:'now'|string;dueAt:string;caption:string;comment:string;media:SocialMedia|null
 state:SocialState;createdAt:string;by:string
 claimedBy?:string|null;claimedAt?:string|null;doneAt?:string|null
 /** what the platform answered (an id, "pack sent to Telegram", …) — never a secret */
 result?:string|null;error?:string|null;url?:string|null
}
export type SocialPlan={posts:SocialPost[]}
/** The connection lights the runner records: yes/no only, never a token. */
export type SocialLights={at:string;autopublish:boolean;telegram:boolean}&Record<Platform,boolean>

export {CHANNEL} from './channel'
import {CHANNEL} from './channel'
export const SLOGAN='Football is ninety minutes. Being a supporter is a lifetime.'
/** Caption limits as each platform counts them; X counts every link as 23 characters (t.co). */
export const LIMITS:Record<Platform,{caption:number;comment:number;tags:number}>={
 facebook:{caption:5000,comment:2000,tags:4},instagram:{caption:2200,comment:2200,tags:8},x:{caption:280,comment:280,tags:3},tiktok:{caption:2200,comment:150,tags:5},
}
export const IG_MAX_HASHTAGS=30
export const MAX_POSTS=20
export const MIN_LEAD_MS=2*60_000
export const MAX_AHEAD_MS=60*86_400_000
/** A post claimed this long ago and not answered: the runner died after the claim — check the platform before removing it. */
export const STUCK_MS=60*60_000
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const YT_ID=/^[A-Za-z0-9_-]{11}$/

export class SocialError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}

/** The film's own link once YouTube has shown its id; the channel until then (never a link that does not exist yet). */
export function filmLink(job:Job):{url:string;film:boolean}{
 const id=job.upload?.videoId
 return id&&YT_ID.test(id)?{url:`https://youtu.be/${id}`,film:true}:{url:CHANNEL.url,film:false}
}

const clubTag=(name:string)=>{const t=name.normalize('NFKD').replace(/[^A-Za-z0-9]/g,'');return t.length>=3?`#${t}`:''}
/** #FootballStories, the club's own supporters' tags, #FANLIFE, then the topic — at most the platform's count. */
export function socialTags(job:Job,platform:Platform):string[]{
 const b=job.brief
 const topics:Topic[]=b.kind==='rivalry'||b.tone==='rivalry'?['derby','fact']:['fact']
 const club=CLUB_TAGS[b.club_id]??[clubTag(b.club_name)].filter(Boolean)
 const all=smartTags({brand:'#FootballStories',topics,max:40}).split(' ')
 const out=[all[0]!,...club,'#FANLIFE',...all.slice(1)]
 return [...new Set(out)].slice(0,LIMITS[platform].tags)
}

type Yt={title?:string;title_candidates?:{title:string}[];synthetic_media?:{altered_or_synthetic:boolean}}
const ytOf=(job:Job)=>(job.youtube??{}) as Yt
export function filmTitle(job:Job):string{
 const t=ytOf(job).title
 return typeof t==='string'&&t.trim()?t.trim():`${job.brief.club_name} · ${job.brief.season}`
}

/** The files a post can carry, in the order they are offered: every Short (9:16), then every thumbnail. */
export function mediaChoices(job:Job):{media:SocialMedia;label:string;hook:string|null}[]{
 const a=job.artefacts
 const shorts=(a?.shorts??[]).map((s,i)=>({media:{kind:'short' as const,index:i},label:`${s.title==='Your Reel'?'Your Reel':`Short ${i+1}`} · ${Math.round(s.seconds)} s`,hook:s.hook||null}))
 const thumbs=(a?.thumbnails??[]).map((_,i)=>({media:{kind:'thumbnail' as const,index:i},label:`Thumbnail ${i+1}`,hook:null}))
 return [...shorts,...thumbs]
}
export function mediaPathOf(job:Job,m:SocialMedia|null):string|null{
 if(!m)return null
 const a=job.artefacts
 const row=m.kind==='short'?a?.shorts?.[m.index]:a?.thumbnails?.[m.index]
 return row?.path??null
}
/** A Short wherever there is one; Facebook and X fall back to a thumbnail; TikTok and Instagram need a file. */
export function defaultMedia(job:Job,platform:Platform):SocialMedia|null{
 const c=mediaChoices(job)
 const short=c.find(x=>x.media.kind==='short')?.media
 const thumb=c.find(x=>x.media.kind==='thumbnail')?.media
 if(platform==='tiktok')return short??null
 return short??thumb??null
}
export function mediaAllowed(platform:Platform,m:SocialMedia|null):string|null{
 if(platform==='tiktok'&&m?.kind!=='short')return 'TikTok takes a video: choose a Short.'
 if(platform==='instagram'&&!m)return 'Instagram needs a Short or a thumbnail.'
 return null
}

/** How the platform counts a caption: code points, and on X every link as 23. */
export function captionLength(platform:Platform,text:string):number{
 if(platform!=='x')return [...text].length
 return [...text.replace(/https?:\/\/\S+/g,'x'.repeat(23))].length
}
export function hashtagCount(text:string){return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu)??[]).length}
/** Why this text cannot go out on this platform, or null. */
export function textProblem(platform:Platform,caption:string,comment:string):string|null{
 const name=PLATFORM_NAME[platform]
 if(!caption.trim())return `The ${name} caption is empty.`
 const n=captionLength(platform,caption),max=LIMITS[platform].caption
 if(n>max)return `The ${name} caption is ${n} characters; ${name} takes ${max}.`
 if(platform==='instagram'&&hashtagCount(caption)>IG_MAX_HASHTAGS)return `Instagram takes at most ${IG_MAX_HASHTAGS} hashtags.`
 const c=captionLength(platform,comment),cmax=LIMITS[platform].comment
 if(c>cmax)return `The ${name} first comment is ${c} characters; keep it under ${cmax}.`
 return null
}

const clip=(s:string,n:number)=>{const a=[...s];return a.length<=n?s:a.slice(0,Math.max(0,n-1)).join('').trimEnd()+'…'}

export type Draft={platform:Platform;title:string;hook:string;caption:string;comment:string;tags:string[];media:SocialMedia|null;link:string;linkIsFilm:boolean;length:number;limit:number}
/**
 * One platform's post. The caption opens on the hook (the Short's own line when a Short goes with it), names the film,
 * says where it is, and ends on the tags. The link lives in the first comment on every platform (rule 127), because a
 * link in an Instagram or TikTok caption does not click and a link in the post itself costs reach on X and Facebook.
 */
export function compose(job:Job,platform:Platform,media:SocialMedia|null=defaultMedia(job,platform)):Draft{
 const title=filmTitle(job)
 const ch=mediaChoices(job)
 const hook=(media?.kind==='short'?ch.find(x=>x.media.kind==='short'&&x.media.index===media.index)?.hook:null)||title
 const {url,film}=filmLink(job)
 const tags=socialTags(job,platform)
 const where=film?'The full film is on YouTube':`The full film is on YouTube — ${CHANNEL.name}`
 const sameAsTitle=hook.trim().toLowerCase()===title.toLowerCase()
 // X bills a post that carries a link many times over (marketing chat, PR #385): there the reply names the channel and
 // the link lives in the account's bio, unless X_LINKS=1 lets the publisher put it back (scripts/football-stories/publish)
 const comment=platform==='x'?`▶ The full film: YouTube · ${CHANNEL.handle} (link in bio)`
  :film?`▶ The full film: ${url}\nEvery film: ${CHANNEL.url}`:`▶ Every film: ${url}`
 let caption=''
 if(platform==='x'){
  const tagLine=tags.join(' ')
  const room=LIMITS.x.caption-[...`\n\n${tagLine}`].length
  const body=sameAsTitle?hook:`${hook}\n\n${title}`
  caption=`${[...body].length<=room?body:clip(hook,room)}\n\n${tagLine}`
 }else if(platform==='tiktok'){
  caption=[sameAsTitle?hook:`${hook} · ${title}`,`${where}: ${CHANNEL.handle}`,'',tags.join(' ')].join('\n')
 }else{
  caption=[hook,'',sameAsTitle?null:`${title}.`,`${where} — link in the first comment.`,'',SLOGAN,'',tags.join(' ')].filter(x=>x!==null).join('\n')
 }
 const limit=LIMITS[platform].caption
 if(captionLength(platform,caption)>limit)caption=clip(caption,limit)
 return {platform,title,hook,caption,comment:platform==='tiktok'?clip(comment,LIMITS.tiktok.comment):comment,tags,media,link:url,linkIsFilm:film,length:captionLength(platform,caption),limit}
}
export function composeAll(job:Job):Record<Platform,Draft>{
 return Object.fromEntries(PLATFORMS.map(p=>[p,compose(job,p)])) as Record<Platform,Draft>
}

/** A film can be posted once it is finished: the master exists and the job is ready or waiting for the owner's review. */
export function finishedFilm(job:Job):boolean{
 return !!job.artefacts?.master&&(job.state==='ready'||job.state==='needs_review')
}

export type PostInput={platform:unknown;when:unknown;caption:unknown;comment?:unknown;media?:unknown}
const log=(j:Job,text:string,at:string)=>{j.log=[...j.log,{at,text:text.slice(0,400)}].slice(-120)}
const isPlatform=(v:unknown):v is Platform=>typeof v==='string'&&(PLATFORMS as readonly string[]).includes(v)

/** The owner schedules one or more posts. `when` is 'now' or a full date-time with its zone, at least two minutes ahead. */
export function scheduleSocial(job:Job,input:PostInput[],actor:string,now=new Date()):Job{
 if(!finishedFilm(job))throw new SocialError('SOCIAL','Posts can be scheduled once the film is finished.',409)
 if(!Array.isArray(input)||!input.length)throw new SocialError('SOCIAL','Nothing to schedule.')
 const j:Job=structuredClone(job),at=now.toISOString(),t=now.getTime()
 const posts=[...(j.social?.posts??[])]
 if(posts.length+input.length>MAX_POSTS)throw new SocialError('SOCIAL',`At most ${MAX_POSTS} posts for one film — cancel one first.`)
 input.forEach((x,i)=>{
  if(!x||typeof x!=='object')throw new SocialError('SOCIAL','Invalid post.')
  if(!isPlatform(x.platform))throw new SocialError('SOCIAL','Unknown platform.')
  const platform=x.platform
  if(typeof x.caption!=='string'||(x.comment!==undefined&&typeof x.comment!=='string'))throw new SocialError('SOCIAL','Invalid caption.')
  const caption=x.caption.trim(),comment=String(x.comment??'').trim()
  const bad=textProblem(platform,caption,comment);if(bad)throw new SocialError('SOCIAL',bad)
  let media:SocialMedia|null=null
  if(x.media!==undefined&&x.media!==null){
   const m=x.media as SocialMedia
   if(!m||(m.kind!=='short'&&m.kind!=='thumbnail')||!Number.isInteger(m.index)||m.index<0)throw new SocialError('SOCIAL','Invalid file.')
   media={kind:m.kind,index:m.index}
   if(!mediaPathOf(j,media))throw new SocialError('SOCIAL','That file is not part of this film.')
  }
  const why=mediaAllowed(platform,media);if(why)throw new SocialError('SOCIAL',why)
  let when:'now'|string,dueAt:string
  if(x.when==='now'){when='now';dueAt=at}
  else{
   if(typeof x.when!=='string'||!ISO.test(x.when)||!Number.isFinite(Date.parse(x.when)))throw new SocialError('SOCIAL','The time must be a full date and time with its time zone.')
   const d=Date.parse(x.when)
   if(d<t+MIN_LEAD_MS)throw new SocialError('SOCIAL','Schedule at least two minutes ahead, or press Publish now.')
   if(d>t+MAX_AHEAD_MS)throw new SocialError('SOCIAL','Schedule at most sixty days ahead.')
   when=x.when;dueAt=new Date(d).toISOString()
  }
  // a double click is one post: the same text, on the same platform, for the same minute
  const dupe=posts.find(p=>p.platform===platform&&p.caption===caption&&p.state!=='failed'&&Math.abs(Date.parse(p.dueAt)-Date.parse(dueAt))<(when==='now'?MIN_LEAD_MS:60_000))
  if(dupe)throw new SocialError('SOCIAL',`This ${PLATFORM_NAME[platform]} post is already in the list.`,409)
  posts.push({id:`${platform}-${t.toString(36)}-${i}`,platform,when,dueAt,caption,comment,media,state:'scheduled',createdAt:at,by:actor,claimedBy:null,claimedAt:null,doneAt:null,result:null,error:null,url:null})
  log(j,`${PLATFORM_NAME[platform]} post ${when==='now'?'queued now':`scheduled for ${dueAt}`} by ${actor}`,at)
 })
 j.social={posts};j.updatedAt=at;return j
}

/** Remove a post that has not gone out. A post that went out cannot be removed; one being sent only after an hour. */
export function cancelSocial(job:Job,id:unknown,actor:string,now=new Date()):Job{
 const j:Job=structuredClone(job),at=now.toISOString()
 const posts=j.social?.posts??[]
 const p=posts.find(x=>x.id===id)
 if(!p)throw new SocialError('SOCIAL','No such post.',404)
 if(p.state==='sent')throw new SocialError('SOCIAL','This post is already published — delete it on the platform itself.',409)
 if(p.state==='sending'&&now.getTime()-Date.parse(p.claimedAt||p.dueAt)<STUCK_MS)throw new SocialError('SOCIAL','This post is being sent right now.',409)
 j.social={posts:posts.filter(x=>x.id!==id)}
 log(j,`${PLATFORM_NAME[p.platform]} post removed by ${actor}${p.state==='sending'?' (it never reported back — check the platform)':''}`,at)
 j.updatedAt=at;return j
}

/** What the runner should send now: scheduled posts whose time has come, oldest first. */
export function dueSocial(jobs:Job[],now=new Date(),limit=10):{jobId:string;postId:string;platform:Platform}[]{
 const t=now.getTime()
 return jobs.flatMap(j=>(j.social?.posts??[]).filter(p=>p.state==='scheduled'&&Date.parse(p.dueAt)<=t).map(p=>({jobId:j.id,postId:p.id,platform:p.platform,dueAt:p.dueAt})))
  .sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).slice(0,limit).map(({jobId,postId,platform})=>({jobId,postId,platform}))
}
export function claimSocial(job:Job,postId:unknown,worker:string,now=new Date()):Job{
 const j:Job=structuredClone(job),at=now.toISOString()
 const p=(j.social?.posts??[]).find(x=>x.id===postId)
 if(!p)throw new SocialError('SOCIAL','No such post.',404)
 if(p.state!=='scheduled')throw new SocialError('TAKEN','This post was already taken.',409)
 if(Date.parse(p.dueAt)>now.getTime())throw new SocialError('EARLY','This post is not due yet.',409)
 p.state='sending';p.claimedBy=worker;p.claimedAt=at
 log(j,`${PLATFORM_NAME[p.platform]} post taken by ${worker}`,at);j.updatedAt=at;return j
}
export type SocialResult={state:unknown;result?:unknown;error?:unknown;url?:unknown}
export function resultSocial(job:Job,postId:unknown,worker:string,r:SocialResult,now=new Date()):Job{
 const j:Job=structuredClone(job),at=now.toISOString()
 const p=(j.social?.posts??[]).find(x=>x.id===postId)
 if(!p)throw new SocialError('SOCIAL','No such post.',404)
 if(p.state!=='sending'||p.claimedBy!==worker)throw new SocialError('LEASE','This runner does not hold the post.',409)
 if(r.state!=='sent'&&r.state!=='failed'&&r.state!=='manual')throw new SocialError('SOCIAL','Invalid result.')
 const url=typeof r.url==='string'&&/^https:\/\/[^\s<>"]{4,300}$/.test(r.url)?r.url:null
 p.state=r.state;p.doneAt=at;p.result=r.result?String(r.result).slice(0,300):null;p.error=r.error?String(r.error).slice(0,400):null;p.url=url
 log(j,`${PLATFORM_NAME[p.platform]}: ${p.state==='sent'?`published${p.result?` (${p.result})`:''}`:p.state==='manual'?'ready pack sent to Telegram':`failed — ${p.error??'no answer'}`}`,at)
 j.updatedAt=at;return j
}

/** Only yes/no reaches the store from the runner. */
export function cleanLights(raw:unknown,now=new Date()):SocialLights|null{
 if(!raw||typeof raw!=='object')return null
 const r=raw as Record<string,unknown>
 const b=(k:string)=>r[k]===true
 return {at:now.toISOString(),autopublish:b('autopublish'),telegram:b('telegram'),facebook:b('facebook'),instagram:b('instagram'),x:b('x'),tiktok:b('tiktok')}
}

/**
 * FAN LIFE INSIGHT — the site's own analytics, the vocabulary both ends share (17.11.2026). The browser sends hits; the server adds where and on what (edge geo, the
 * user-agent's family) and the database keeps them (supabase/migrations/20261117150000_worker_insight.sql).
 *
 * A hit: a page VIEW (with where it came from on the session's landing), a CLICK (what was pressed), a LEAVE (time on the
 * page and deepest scroll) or a named EVENT. No IP, no user-agent string, no account is ever stored.
 */
export type InsightKind='view'|'click'|'leave'|'event'
export type InsightHit={kind:InsightKind;path:string;club?:string;title?:string;ref?:string;source?:string;medium?:string;campaign?:string;target?:string;dwell?:number;scroll?:number;value?:number}
export type InsightCtx={country?:string;region?:string;city?:string;device?:'mobile'|'tablet'|'desktop';os?:string;browser?:string;lang?:string;screen?:number}

export const INSIGHT_MAX=30
const KINDS=new Set(['view','click','leave','event'])
const PATH=/^\/[^\s]{0,159}$/
const SLUG=/^[a-z0-9_.-]{1,48}$/
const CAMPAIGN=/^[a-z0-9_.:-]{1,64}$/
const HOST=/^[a-z0-9.-]{1,80}$/
const text=(v:unknown,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)||undefined:undefined
const slug=(v:unknown,re=SLUG)=>{const s=typeof v==='string'?v.toLowerCase().trim().replace(/\s+/g,'_').slice(0,64):'';return re.test(s)?s:undefined}
const int=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,Math.round(v))):undefined

/** the club a path belongs to: /clubs/<id>/… */
export const clubOfPath=(path:string)=>/^\/clubs\/([a-z0-9-]{2,48})(?:[/?#]|$)/.exec(path)?.[1]

/** The one filter both ends run: a malformed hit is dropped, never "fixed". */
export function cleanHit(raw:unknown):InsightHit|null{
 if(!raw||typeof raw!=='object')return null
 const h=raw as Record<string,unknown>
 if(typeof h.kind!=='string'||!KINDS.has(h.kind))return null
 const path=typeof h.path==='string'?h.path.split('#')[0]!.slice(0,160):''
 if(!PATH.test(path))return null
 const out:InsightHit={kind:h.kind as InsightKind,path}
 const club=clubOfPath(path);if(club)out.club=club
 const title=text(h.title,120);if(title)out.title=title
 const ref=typeof h.ref==='string'?h.ref.toLowerCase().replace(/^www\./,''):'';if(HOST.test(ref))out.ref=ref
 const source=slug(h.source);if(source)out.source=source
 const medium=slug(h.medium);if(medium)out.medium=medium
 const campaign=slug(h.campaign,CAMPAIGN);if(campaign)out.campaign=campaign
 const target=text(h.target,80);if(target)out.target=target
 const dwell=int(h.dwell,0,86_400_000);if(dwell!==undefined&&out.kind==='leave')out.dwell=dwell
 const scroll=int(h.scroll,0,100);if(scroll!==undefined&&out.kind==='leave')out.scroll=scroll
 const value=int(h.value,-1_000_000,100_000_000);if(value!==undefined)out.value=value
 return out
}

/** where a landing came from: utm_source, else the referring site (a known one by its family), else direct */
const FAMILIES:[RegExp,string][]=[[/(^|\.)google\./,'google'],[/(^|\.)bing\.com$/,'bing'],[/duckduckgo\.com$/,'duckduckgo'],[/(^|\.)yahoo\./,'yahoo'],[/(^|\.)yandex\./,'yandex'],
 [/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/,'facebook'],[/instagram\.com$/,'instagram'],[/(^|\.)(t\.co|twitter\.com|x\.com)$/,'x'],
 [/tiktok\.com$/,'tiktok'],[/(youtube\.com|youtu\.be)$/,'youtube'],[/reddit\.com$/,'reddit'],[/(whatsapp\.com|wa\.me)$/,'whatsapp'],[/(t\.me|telegram\.org|telegram\.me)$/,'telegram'],
 [/linkedin\.com$/,'linkedin'],[/pinterest\./,'pinterest'],[/printify\.me$/,'shop'],[/(^|\.)dubelteam\.com$/,'dubelteam'],[/chatgpt\.com$|openai\.com$/,'chatgpt'],[/perplexity\.ai$/,'perplexity']]
export function sourceOf(ref:string|undefined,utm:string|undefined,own:string):string{
 if(utm)return utm
 if(!ref||ref===own)return 'direct'
 for(const [re,name] of FAMILIES)if(re.test(ref))return name
 return ref.replace(/^www\./,'').slice(0,48)
}

/** the user-agent's family only — the string itself is never kept */
export function readAgent(ua:string):{device:'mobile'|'tablet'|'desktop';os:string;browser:string;bot:boolean}{
 const u=ua||''
 const bot=/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegrambot|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http/i.test(u)
 const tablet=/ipad|tablet|(android(?!.*mobile))|kindle|silk/i.test(u)
 const mobile=!tablet&&/mobi|iphone|ipod|android.*mobile|windows phone/i.test(u)
 const os=/windows phone/i.test(u)?'Windows Phone':/windows/i.test(u)?'Windows':/iphone|ipad|ipod/i.test(u)?'iOS':/android/i.test(u)?'Android':/cros/i.test(u)?'ChromeOS':/mac os x|macintosh/i.test(u)?'macOS':/linux/i.test(u)?'Linux':'Other'
 const browser=/edg\//i.test(u)?'Edge':/opr\/|opera/i.test(u)?'Opera':/samsungbrowser/i.test(u)?'Samsung Internet':/fban|fbav|instagram/i.test(u)?'In app':/crios|chrome\//i.test(u)?'Chrome':/fxios|firefox\//i.test(u)?'Firefox':/safari\//i.test(u)?'Safari':'Other'
 return {device:tablet?'tablet':mobile?'mobile':'desktop',os,browser,bot}
}

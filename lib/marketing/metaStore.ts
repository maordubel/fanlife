import 'server-only'
import {fileArea} from '@/lib/master/files'

/**
 * The Facebook Page + Instagram connection for the publishers that run on THIS deployment (the plan's tick, the studio's
 * Reels) — owner, 10.11.2026: "everything needed for permanent automatic publishing". The Page token lives in GitHub's
 * secrets; GitHub's scheduled runs come every few hours, while the tick runs every five minutes on Vercel, which never had
 * it. `.github/workflows/meta-handoff.yml` hands it over (cron secret, HTTPS) into the server-only store
 * (`worker_fanlife_files`, rule 105: service role, no grant, no policy). It never reaches a page, a log or a response.
 * Vercel's own environment variables, when set, win.
 */
export type MetaStored={page:string;ig:string;token:string;on:boolean;version:string|null;at:string}
const FILE='meta.json'
const area=()=>fileArea('marketing')

export function validMeta(x:unknown):Omit<MetaStored,'at'>|null{
 if(!x||typeof x!=='object')return null
 const v=x as Record<string,unknown>
 const page=String(v.page??'').trim(),ig=String(v.ig??'').trim(),token=String(v.token??'').trim(),version=String(v.version??'').trim()
 if(!/^\d{5,30}$/.test(page)||(ig&&!/^\d{5,30}$/.test(ig))||token.length<41||token.length>1000||/\s/.test(token))return null
 return {page,ig,token,on:v.on===true||v.on==='1',version:/^v\d+\.\d+$/.test(version)?version:null}
}

/**
 * The token GitHub holds may be the system user's (doc 53 step 5) rather than the Page's own (step 6): posting to a Page
 * with the former is refused with "(#200) publish_actions … deprecated". Ask Meta for the Page's token with it — for a
 * Page token the answer is the same token — and the linked Instagram account when the id is missing.
 */
export async function pageTokenFor(x:Omit<MetaStored,'at'>,fetcher:typeof fetch=fetch):Promise<{meta:Omit<MetaStored,'at'>;how:'page token'|'as given'}>{
 try{
  const v=x.version??'v23.0'
  const r=await fetcher(`https://graph.facebook.com/${v}/${x.page}?${new URLSearchParams({fields:'access_token,instagram_business_account',access_token:x.token})}`,{cache:'no-store',signal:AbortSignal.timeout(15_000)})
  const j=await r.json().catch(()=>({})) as {access_token?:string;instagram_business_account?:{id?:string}}
  const token=typeof j.access_token==='string'&&j.access_token.length>40&&!/\s/.test(j.access_token)?j.access_token:null
  const ig=x.ig||(/^\d{5,30}$/.test(String(j.instagram_business_account?.id??''))?String(j.instagram_business_account!.id):'')
  return token?{meta:{...x,token,ig},how:'page token'}:{meta:{...x,ig},how:'as given'}
 }catch{return {meta:x,how:'as given'}}
}

export async function saveMeta(x:Omit<MetaStored,'at'>,now=new Date()):Promise<void>{
 await area().update<MetaStored|null>(FILE,null,()=>({...x,at:now.toISOString()}))
}

async function stored():Promise<MetaStored|null>{
 try{return await area().readJson<MetaStored|null>(FILE,null)}catch{return null}
}

/** The environment the Meta publisher reads: Vercel's own variables first, the handed-over connection otherwise. */
export async function metaEnv(env:NodeJS.ProcessEnv=process.env):Promise<Record<string,string|undefined>>{
 if(env.META_PAGE_TOKEN&&env.META_PAGE_ID)return {...env}
 const s=await stored()
 if(!s)return {...env}
 return {...env,META_PAGE_ID:s.page,META_IG_USER_ID:s.ig,META_PAGE_TOKEN:s.token,META_AUTOPUBLISH:env.META_AUTOPUBLISH??(s.on?'1':'0'),...(s.version&&!env.META_GRAPH_VERSION?{META_GRAPH_VERSION:s.version}:{})}
}

/** yes/no only — never a value — for the desk and the morning briefing. */
export async function metaLights(env:NodeJS.ProcessEnv=process.env):Promise<{facebook:boolean;instagram:boolean;on:boolean;source:'vercel'|'github'|'none';at:string|null}>{
 if(env.META_PAGE_TOKEN&&env.META_PAGE_ID)return {facebook:true,instagram:!!env.META_IG_USER_ID,on:env.META_AUTOPUBLISH==='1',source:'vercel',at:null}
 const s=await stored()
 return s?{facebook:true,instagram:!!s.ig,on:env.META_AUTOPUBLISH?env.META_AUTOPUBLISH==='1':s.on,source:'github',at:s.at}:{facebook:false,instagram:false,on:false,source:'none',at:null}
}

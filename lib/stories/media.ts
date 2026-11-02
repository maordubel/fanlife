import 'server-only'
import {StoryError} from './jobs'

/**
 * Renders live in the PRIVATE Supabase Storage bucket `worker-stories` (migration 20261102090000). Nothing is public:
 * the worker receives short-lived signed UPLOAD urls for its own job folder, the studio receives short-lived signed
 * DOWNLOAD urls for the owner's eyes only. The service-role key stays on the server.
 * The free plan caps one file at 50 MB, so a master is uploaded in 45 MB chunks and reassembled where it is used.
 */
export const BUCKET='worker-stories'
export const CHUNK_BYTES=45*1024*1024

function cfg(){
 const url=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!url||!key)throw new StoryError('MEDIA','Media storage is not configured (Supabase URL and service key).',503)
 return {url,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}}
}
const enc=(p:string)=>p.split('/').map(encodeURIComponent).join('/')

export async function signedUpload(path:string):Promise<string>{
 const {url,headers}=cfg()
 const r=await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${enc(path)}`,{method:'POST',headers:{...headers,'x-upsert':'true'},body:JSON.stringify({}),cache:'no-store'})
 if(!r.ok)throw new StoryError('MEDIA',`Storage refused an upload url (${r.status}).`,502)
 const b=await r.json() as {url?:string}
 if(!b.url)throw new StoryError('MEDIA','Storage returned no upload url.',502)
 return `${url}/storage/v1${b.url}`
}

export async function signedDownload(paths:string[],seconds=3600):Promise<Record<string,string>>{
 if(!paths.length)return {}
 const {url,headers}=cfg()
 const r=await fetch(`${url}/storage/v1/object/sign/${BUCKET}`,{method:'POST',headers,body:JSON.stringify({expiresIn:seconds,paths}),cache:'no-store'})
 if(!r.ok)throw new StoryError('MEDIA',`Storage refused download urls (${r.status}).`,502)
 const rows=await r.json() as {path:string;signedURL:string|null;error:string|null}[]
 const out:Record<string,string>={}
 for(const x of rows)if(x.signedURL)out[x.path]=`${url}/storage/v1${x.signedURL}`
 return out
}

export async function removeFolder(jobId:string,names:string[]):Promise<void>{
 if(!names.length)return
 const {url,headers}=cfg()
 await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers,body:JSON.stringify({prefixes:names.map(n=>`jobs/${jobId}/${n}`)}),cache:'no-store'})
}

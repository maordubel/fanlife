import 'server-only'
import {StoryError} from './jobs'
import {isBig} from './trim'

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
 const r=await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers,body:JSON.stringify({prefixes:names.map(n=>`jobs/${jobId}/${n}`)}),cache:'no-store'})
 if(!r.ok)throw new StoryError('MEDIA',`Storage refused deletion (${r.status}).`,502)
}

/** List the real prefix before deleting: includes nested files and uploads absent from the job manifest. */
export async function purgeJobMedia(id:string):Promise<void>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))throw new StoryError('MEDIA','Invalid job id.')
 const {url,headers}=cfg(),paths:string[]=[],folders=[`jobs/${id}`]
 while(folders.length){
  const prefix=folders.pop()!
  for(let offset=0;;offset+=100){
   const r=await fetch(`${url}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers,body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}}),cache:'no-store'})
   if(!r.ok)throw new StoryError('MEDIA',`Storage listing failed (${r.status}).`,502)
   const rows=await r.json() as {name:string;id:string|null}[]
   for(const row of rows){
    if(!row.name||row.name.includes('/')||row.name==='.'||row.name==='..')throw new StoryError('MEDIA','Invalid storage listing.',502)
    const path=`${prefix}/${row.name}`
    if(row.id===null)folders.push(path);else paths.push(path)
   }
   if(rows.length<100)break
  }
 }
 for(let i=0;i<paths.length;i+=100){
  const r=await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers,body:JSON.stringify({prefixes:paths.slice(i,i+100)}),cache:'no-store'})
  if(!r.ok)throw new StoryError('MEDIA',`Storage deletion failed (${r.status}).`,502)
 }
}

/** The file names directly under a folder of the bucket (no recursion), at most `max`. */
export async function listNames(prefix:string,max=1000):Promise<string[]>{
 const {url,headers}=cfg(),out:string[]=[]
 for(let offset=0;offset<max;offset+=100){
  const r=await fetch(`${url}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers,body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}}),cache:'no-store'})
  if(!r.ok)throw new StoryError('MEDIA',`Storage listing failed (${r.status}).`,502)
  const rows=await r.json() as {name:string;id:string|null}[]
  for(const row of rows)if(row.id&&row.name&&!row.name.includes('/'))out.push(row.name)
  if(rows.length<100)break
 }
 return out
}

/** Every file under jobs/<id>/ with its size (recursive), for the after-YouTube trim. */
async function listSized(id:string):Promise<{path:string;bytes:number}[]>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))throw new StoryError('MEDIA','Invalid job id.')
 const {url,headers}=cfg(),out:{path:string;bytes:number}[]=[],folders=[`jobs/${id}`]
 while(folders.length){
  const prefix=folders.pop()!
  for(let offset=0;;offset+=100){
   const r=await fetch(`${url}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers,body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}}),cache:'no-store'})
   if(!r.ok)throw new StoryError('MEDIA',`Storage listing failed (${r.status}).`,502)
   const rows=await r.json() as {name:string;id:string|null;metadata?:{size?:number}|null}[]
   for(const row of rows){
    if(!row.name||row.name.includes('/')||row.name==='.'||row.name==='..')throw new StoryError('MEDIA','Invalid storage listing.',502)
    const path=`${prefix}/${row.name}`
    if(row.id===null)folders.push(path);else out.push({path,bytes:Number(row.metadata?.size)||0})
   }
   if(rows.length<100)break
  }
 }
 return out
}

/** Deletes a published film's big files (video, audio, archives); pictures and captions stay. */
export async function trimJobMedia(id:string):Promise<{bytes:number;files:number}>{
 const {url,headers}=cfg()
 const big=(await listSized(id)).filter(f=>isBig(f.path.split('/').pop()!,f.bytes))
 for(let i=0;i<big.length;i+=100){
  const r=await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers,body:JSON.stringify({prefixes:big.slice(i,i+100).map(f=>f.path)}),cache:'no-store'})
  if(!r.ok)throw new StoryError('MEDIA',`Storage deletion failed (${r.status}).`,502)
 }
 return {bytes:big.reduce((n,f)=>n+f.bytes,0),files:big.length}
}

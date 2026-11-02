import {NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {durable} from '@/lib/master/durable'
import {validateBrief,type Brief} from '@/lib/stories/projects'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow'}})
const prefix='stories/briefs/'
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 const d=durable();if(!d||d.kind==='memory')return json({error:'Durable storage is not configured.'},503)
 try{const keys=(await d.list(prefix,{fresh:true,soft:false})).filter(k=>k.startsWith(prefix)&&k.endsWith('.json')).slice(-100);const items=await Promise.all(keys.map(k=>d.read(k,{fresh:true,soft:false})));const briefs=items.flatMap(x=>{try{return x?[JSON.parse(x.text) as Brief]:[]}catch{return []}}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return json({briefs})}catch{return json({error:'Could not read saved briefs.'},503)}
}
export async function POST(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 const origin=r.headers.get('origin');if(!origin||origin!==new URL(r.url).origin||r.headers.get('sec-fetch-site')==='cross-site')return json({error:'Invalid request origin.'},403)
 const d=durable();if(!d||d.kind==='memory')return json({error:'Durable storage is not configured.'},503)
 try{const raw=await r.text();if(raw.length>3000)return json({error:'Brief is too large.'},413);const input=validateBrief(JSON.parse(raw));const brief:Brief={id:crypto.randomUUID(),createdAt:new Date().toISOString(),...input,status:'brief_saved',blockers:['Production worker is not connected','Research, rights and media assets are not yet verified']};if(!await d.write(`${prefix}${brief.id}.json`,JSON.stringify(brief),null))return json({error:'Could not save brief.'},409);return json({brief},201)}catch(e){if(e instanceof SyntaxError)return json({error:'Invalid JSON.'},400);if(e instanceof Error&&/^(Invalid |Duration |A production)/.test(e.message))return json({error:e.message},400);return json({error:'Could not save brief.'},503)}
}

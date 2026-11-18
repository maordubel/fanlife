import 'server-only'
import edition from '@/content/generated/album-edition-1.json'
import ledger from '@/content/generated/album-stickers.json'
import albumClubs from '@/content/generated/album-clubs.json'
import {createClient} from '@/lib/supabase/server'
import {readState} from '@/lib/master/store'
import {evaluationMode} from '@/lib/master/mode'
import {gateAccess} from '@/lib/clubs/access'
import {crestFor} from '@/lib/clubs/crest'
import type {EditionFile} from './curate'
import type {CatalogRow,Me,Pressed,WingInfo} from './view'

/**
 * THE ALBUM's server side (18.11.2026). The database is the authority (supabase/migrations/20261118120000_worker_album.sql):
 * this module only calls its functions with the fan's own session, and reads the repository's catalog files for the page.
 * A wing is offered to fans only when the club's archive is open to them (only the owner opens a club); the owner previews all.
 */
const ED=edition as unknown as EditionFile
const CLUBS=albumClubs as unknown as Record<string,{name:string;primary:string;on:string;initials:string;code:string}>
export const PRESSED=(ledger as unknown as {stickers:Record<string,Pressed>}).stickers
/** the repository catalog (the database holds the same rows once album-sync has run) */
export const CATALOG:CatalogRow[]=Object.entries(ED.wings).flatMap(([club,rows])=>rows.map(r=>[`${club}:${r.slot}`,club,r.slot,r.page,r.person_id,r.name] as CatalogRow))
/** the measured club shirt each drawn figure wears (rule club-shirt-only) */
export const KITS:Record<string,string>=Object.fromEntries(Object.entries(ED.wings).flatMap(([club,rows])=>rows.filter(r=>r.kit).map(r=>[`${club}:${r.slot}`,r.kit!])))
export const ERAS:Record<string,string>=Object.fromEntries(Object.entries(ED.wings).flatMap(([club,rows])=>rows.map(r=>[`${club}:${r.slot}`,r.era])))

export async function openWings(owner:boolean):Promise<WingInfo[]>{
 const state=await readState().catch(()=>null),preview=evaluationMode()
 return Object.keys(ED.wings).filter(id=>{
  if(owner)return true
  const c=state?.clubs.find(x=>x.id===id)
  return gateAccess(c?{status:c.status,gates:c.gates}:null,12,preview).allowed
 }).map(id=>({id,name:CLUBS[id]?.name??id,primary:CLUBS[id]?.primary??'#1b1b1b',on:CLUBS[id]?.on??'#FFFFFF',initials:CLUBS[id]?.initials??id.slice(0,2).toUpperCase(),code:CLUBS[id]?.code??id.slice(0,3).toUpperCase(),crest:crestFor(id)}))
  .sort((a,b)=>a.name.localeCompare(b.name))
}

type Rpc={rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string}|null}>;auth:{getUser:()=>Promise<{data:{user:{id:string;email?:string}|null}}>}}
const db=()=>createClient() as unknown as Rpc
export async function signedIn():Promise<boolean>{try{const {data}=await db().auth.getUser();return !!data.user}catch{return false}}
/** call one album function as the fan; a failure reads as a plain message, never a thrown page */
export async function call<T=Record<string,unknown>>(name:string,args?:Record<string,unknown>):Promise<{ok:true;data:T}|{ok:false;error:string}>{
 try{
  const {data,error}=await db().rpc(name,args)
  if(error)return {ok:false,error:/sign in/i.test(error.message)?'Sign in to keep an album.':'The album is not answering right now. Nothing was lost — try again in a moment.'}
  const d=data as {ok?:boolean;error?:string}
  if(d&&d.ok===false)return {ok:false,error:d.error??'Not possible.'}
  return {ok:true,data:data as T}
 }catch{return {ok:false,error:'The album is not answering right now. Nothing was lost — try again in a moment.'}}
}
export const readMe=()=>call<Me>('worker_album_me')

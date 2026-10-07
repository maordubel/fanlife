'use client'
import {useCallback,useState} from 'react'
/**
 * The platform answers a crashed or timed-out function with a plain-text page, not JSON (owner, 7.10.2026:
 * "Unexpected token 'A', "An error o"… is not valid JSON"). Read the text first and say what happened.
 */
async function body(r:Response):Promise<{error?:string}&Record<string,unknown>>{
 const text=await r.text()
 try{return JSON.parse(text)}catch{
  const head=text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,140)
  const why=r.status===504||/TIMEOUT/i.test(text)?'The server ran out of time on this request — run it again; it resumes from its checkpoint.':`The server failed (HTTP ${r.status}).`
  return {error:`${why}${head?` ${head}`:''}`}
 }
}
/** One way to call the control-room API from every admin screen: busy flag, error and notice that name the operation. */
export function useAdminApi(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const post=useCallback(async<T=unknown>(action:string,data:unknown={},message='Saved.'):Promise<T|null>=>{
  setBusy(true);setError('');setNotice('')
  try{const r=await fetch(`/api/master/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const out=await body(r)
   if(!r.ok)throw new Error(r.status===409?`${out.error} (409 — someone else saved first)`:out.error||'Operation failed')
   setNotice(message);return out as T}
  catch(e){setError(e instanceof Error?e.message:'Operation failed');return null}
  finally{setBusy(false)}
 },[])
 const get=useCallback(async<T=unknown>(path:string):Promise<T|null>=>{try{const r=await fetch(`/api/master/${path}`,{cache:'no-store'});const out=await body(r);if(!r.ok)throw new Error(out.error||'Could not load');return out as T}catch(e){setError(e instanceof Error?e.message:'Could not load');return null}},[])
 return {busy,error,notice,post,get,setNotice,setError}
}

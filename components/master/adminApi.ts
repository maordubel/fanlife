'use client'
import {useCallback,useState} from 'react'
/** One way to call the control-room API from every admin screen: busy flag, error and notice that name the operation. */
export function useAdminApi(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const post=useCallback(async<T=unknown>(action:string,data:unknown={},message='Saved.'):Promise<T|null>=>{
  setBusy(true);setError('');setNotice('')
  try{const r=await fetch(`/api/master/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json()
   if(!r.ok)throw new Error(r.status===409?`${body.error} (409 — someone else saved first)`:body.error||'Operation failed')
   setNotice(message);return body as T}
  catch(e){setError(e instanceof Error?e.message:'Operation failed');return null}
  finally{setBusy(false)}
 },[])
 const get=useCallback(async<T=unknown>(path:string):Promise<T|null>=>{try{const r=await fetch(`/api/master/${path}`,{cache:'no-store'});if(!r.ok)throw new Error((await r.json()).error||'Could not load');return await r.json() as T}catch(e){setError(e instanceof Error?e.message:'Could not load');return null}},[])
 return {busy,error,notice,post,get,setNotice,setError}
}

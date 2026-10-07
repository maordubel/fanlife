'use client'
import {useState} from 'react'
import {useFormState,useFormStatus} from 'react-dom'
import {login} from './actions'
function Submit(){const {pending}=useFormStatus();return <button type="submit" className="min-h-tap button mag-pass-go" disabled={pending}>{pending?'Checking…':'Enter the control room'}</button>}
/** One field, the owner key. Errors are announced, the field keeps focus order, nothing is stored in the page. */
export function LoginForm({next}:{next:string}){
 const [state,action]=useFormState(login,{error:''}),[show,setShow]=useState(false)
 return <form action={action} className="mag-pass-form">
  <input type="hidden" name="next" value={next}/>
  <label className="mag-pass-label" htmlFor="owner-key">Owner key</label>
  <input id="owner-key" className="mag-pass-input" name="key" type={show?'text':'password'} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} data-1p-ignore="" data-lpignore="true" required maxLength={256} aria-describedby={state.error?'owner-key-error':undefined} aria-invalid={state.error?true:undefined}/>
  <label className="mag-pass-show"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Show the key</label>
  {state.error&&<p id="owner-key-error" className="mag-pass-error" role="alert">{state.error}</p>}
  <Submit/>
 </form>
}

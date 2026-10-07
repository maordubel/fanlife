'use client'
import {useFormState,useFormStatus} from 'react-dom'
import {login} from './actions'
function Submit(){const {pending}=useFormStatus();return <button type="submit" className="min-h-tap button mag-pass-go" disabled={pending}>{pending?'Checking…':'Enter the control room'}</button>}
/** One field, the owner key. Errors are announced, the field keeps focus order, nothing is stored in the page. */
export function LoginForm({next}:{next:string}){
 const [state,action]=useFormState(login,{error:''})
 return <form action={action} className="mag-pass-form">
  <input type="hidden" name="next" value={next}/>
  <label className="mag-pass-label" htmlFor="owner-key">Owner key</label>
  <input id="owner-key" className="mag-pass-input" name="key" type="password" autoComplete="current-password" required maxLength={256} aria-describedby={state.error?'owner-key-error':undefined} aria-invalid={state.error?true:undefined}/>
  {state.error&&<p id="owner-key-error" className="mag-pass-error" role="alert">{state.error}</p>}
  <Submit/>
 </form>
}

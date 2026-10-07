import type {Metadata} from 'next'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {adminSession} from '@/lib/master/admin'
import {adminPolicy,safeNext} from '@/lib/master/admin-token'
import {LoginForm} from './LoginForm'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Control room · FAN LIFE',robots:{index:false,follow:false,nocache:true}}
/** The press-box door: the control room opens with the owner key (audit F01). */
export default function Page({searchParams}:{searchParams:{next?:string}}){
 const next=safeNext(searchParams.next)
 if(adminSession())redirect(next)
 const closed=adminPolicy({FAN_LIFE_ADMIN_KEY:process.env.FAN_LIFE_ADMIN_KEY,NODE_ENV:process.env.NODE_ENV})==='closed'
 return <Shell><main id="main" className="mag-section mag-pass-wrap">
  <section className="mag-pass" aria-labelledby="pass-title">
   <div className="mag-pass-stub" aria-hidden="true"><span>PRESS</span><span>ADMIT ONE</span></div>
   <div className="mag-pass-body">
    <p className="eyebrow">Staff only · Control room</p>
    <h1 id="pass-title" className="mag-pass-title">Owner&rsquo;s pass</h1>
    {closed
     ?<p className="mag-pass-note" role="status">The control room is closed: the owner key is not configured on this server. Add <code>FAN_LIFE_ADMIN_KEY</code> (at least 16 characters) to the deployment&rsquo;s environment variables and redeploy.</p>
     :<><p className="mag-pass-note">The games are open to every fan. The control room is not — show your key at the door.</p><LoginForm next={next}/></>}
   </div>
  </section>
 </main></Shell>
}

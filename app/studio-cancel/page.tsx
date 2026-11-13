import type {Metadata} from 'next'
import {Shell} from '@/components/master/Shell'
import {athens} from '@/lib/stories/autopilot'
import {verifyCancel} from '@/lib/stories/autopilotToken'
import {cancelView} from '@/lib/stories/autopilotStore'
import css from '@/app/master/stories/studio.module.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Cancel publishing · Football Stories',robots:{index:false,follow:false}}

/**
 * The owner's one tap from Telegram (docs/rules/studio-autopilot.md): a signed link for ONE film, valid until its
 * publishing time, opened without a login. Opening it changes nothing — a link preview fetches the address too — so the
 * page only shows the film and one button; the button's POST (/api/stories/autopilot/cancel) is what cancels.
 */
export default async function Page({searchParams}:{searchParams:{job?:string;exp?:string;sig?:string}}){
 const id=searchParams.job??'',exp=Number(searchParams.exp),sig=searchParams.sig??''
 const valid=verifyCancel(process.env.CRON_SECRET||'',id,exp,sig,Date.now())
 const film=valid?await cancelView(id).catch(()=>null):null
 const open=film&&['producing','window','publishing'].includes(film.state)
 return <Shell><div className={css.root}><div className={css.wrap} style={{maxWidth:560,paddingBlock:24}}>
  <section className={css.panel} aria-labelledby="cancel-h">
   <div className={css.bar}><span id="cancel-h">Football Stories · autopilot</span></div>
   <div className={css.body}>
    {!film?<p role="alert" className={css.alert}>This link is not valid any more. It works for one film, until its publishing time. Open the studio to see where the film stands.</p>
    :film.state==='cancelled_by_owner'?<p role="status" className={`${css.alert} ${css.ok}`}><b>Publishing cancelled.</b> &ldquo;{film.title}&rdquo; ({film.club}) will not be published. It stays in the studio, and you can still upload it yourself.</p>
    :open?<>
     <h1 className={css.h3} style={{marginTop:0}}>{film.title}</h1>
     <p>{film.club}{film.publishAt?<> · publishing at <b>{athens(new Date(film.publishAt)).hm}</b> Athens time</>:null}</p>
     <form method="post" action="/api/stories/autopilot/cancel">
      <input type="hidden" name="job" value={id}/><input type="hidden" name="exp" value={String(exp)}/><input type="hidden" name="sig" value={sig}/>
      <button type="submit" className={`${css.btn} ${css.btnRed} min-h-tap`} style={{width:'100%',minHeight:56,fontSize:18}}>Cancel publishing</button>
     </form>
     <p className={css.hint}>One tap. The film is not deleted: it stays in the studio, unpublished.</p>
    </>
    :<p role="status" className={css.alert}>{film.state==='published'?'This film is already published.':film.state==='handoff'?'The two hours have passed: the film is approved and is uploaded from the browser on your computer. To stop it now, turn the autopilot off in the studio.':'The autopilot already stopped for this film. Nothing is published by itself.'}</p>}
    <p className={css.hint}><a href="/master/admin?section=studio&view=docs">Open the studio</a></p>
   </div>
  </section>
 </div></div></Shell>
}

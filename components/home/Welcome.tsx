import {WELCOME_BOOT} from '@/lib/home/art'

export type WelcomeCopy={kicker:string;to:string;lead:string;s1:string;s1Sub:string;s2:string;s2Sub:string;s3:string;s3Sub:string;s4?:string;s4Sub?:string;go:string;skip:string;free:string;wait:string}

/**
 * THE WELCOME (owner, 23.11.2026: "an opening screen that comes up really fast while the rest of the site loads, a graphic
 * welcome with a quick explanation"). It is plain HTML at the top of the front page, raised before the first paint by one
 * inline line (lib/home/art.ts) on a first visit only; its pictures are CSS backgrounds, so a returning fan downloads none
 * of them. Three beats say what a supporter will do here: pick a club, play, open the archive. Rule: docs/rules/welcome.md
 */
export function Welcome({copy}:{copy:WelcomeCopy}){
 // the fourth beat is the shop, said only while there is something to sell
 const steps:(readonly [string,string,string])[]=[['flag',copy.s1,copy.s1Sub],['ball',copy.s2,copy.s2Sub],['ticket',copy.s3,copy.s3Sub],...(copy.s4?[['scarf',copy.s4,copy.s4Sub??''] as const]:[])]
 return <>
  <script dangerouslySetInnerHTML={{__html:WELCOME_BOOT}}/>
  <div className="wko z-[1000]" id="welcome" role="dialog" aria-modal="true" aria-labelledby="wko-h" data-testid="welcome">
   <span className="wko-bg" aria-hidden="true"/><span className="wko-rays" aria-hidden="true"/>
   <div className="wko-in">
    <p className="wk-banner wko-k">{copy.kicker}</p>
    <h2 className="wko-h" id="wko-h"><span>{copy.to}</span> <b className="wk-logo" dir="ltr">Fan Life</b></h2>
    <p className="wko-lead">{copy.lead}</p>
    <ol className="wko-steps" data-n={steps.length}>{steps.map(([art,t,sub],i)=><li key={art} data-art={art}>
     <span className="wko-art" aria-hidden="true"/><span className="wko-no wk-num" aria-hidden="true">{i+1}</span>
     <span className="wko-t"><b>{t}</b><small>{sub}</small></span></li>)}</ol>
    {/* plain buttons: the boot line answers them, so they work before any bundle arrives */}
    <div className="wko-go">
     <button type="button" className="wk-btn wko-kick min-h-tap" data-welcome-act="go" data-testid="welcome-go" autoFocus>{copy.go} <svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
     <button type="button" className="wko-skip min-h-tap" data-welcome-act="skip" data-testid="welcome-skip">{copy.skip}</button>
    </div>
    {/* said only while the page behind is still on its way (the front page's loading cover is in the document) */}
    <p className="wko-wait wk-k" role="status"><span>{copy.wait}</span><i aria-hidden="true"/><i aria-hidden="true"/><i aria-hidden="true"/></p>
    <p className="wko-free wk-k">{copy.free}</p>
   </div>
  </div>
 </>
}

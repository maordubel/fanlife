import {headers} from 'next/headers'
import {readPromo} from '@/lib/promo/store'
import {PromoBanner} from './PromoBanner'
import {RoundLockStrip} from './RoundLockStrip'

/** Israeli audience = the platform's country header; with none (local, a proxy that strips it) the browser's language is the fallback. */
export function isIsraeli(h:Headers):boolean{
 const c=(h.get('x-vercel-ip-country')||h.get('cf-ipcountry')||'').toUpperCase()
 if(c)return c==='IL'
 return /^he\b|^iw\b/i.test((h.get('accept-language')||'').trim())
}
/** Greek audience = the same header, GR. */
export function isGreek(h:Headers):boolean{return (h.get('x-vercel-ip-country')||h.get('cf-ipcountry')||'').toUpperCase()==='GR'}
/** Server half: reads the banners (never fails a page) and hands the browser only what this viewer may ever see. */
export async function PromoSlot(){
 const h=headers(),israel=isIsraeli(h),greece=isGreek(h),doc=await readPromo()
 if(!doc.settings.enabled)return israel?<RoundLockStrip/>:null
 const banners=doc.banners.filter(b=>b.enabled&&(b.audience==='all'||(b.audience==='israel'&&israel)||b.audience==='greece')).map(b=>({...b,note:''}))
 return <>{israel?<RoundLockStrip/>:null}{banners.length>0?<PromoBanner doc={{v:1,settings:doc.settings,banners,audit:[]}} israel={israel} greece={greece}/>:null}</>
}

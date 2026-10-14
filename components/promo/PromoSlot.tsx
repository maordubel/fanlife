import {headers} from 'next/headers'
import {readPromo} from '@/lib/promo/store'
import {PromoBanner} from './PromoBanner'

/** Israeli audience = the platform's country header; with none (local, a proxy that strips it) the browser's language is the fallback. */
export function isIsraeli(h:Headers):boolean{
 const c=(h.get('x-vercel-ip-country')||h.get('cf-ipcountry')||'').toUpperCase()
 if(c)return c==='IL'
 return /^he\b|^iw\b/i.test((h.get('accept-language')||'').trim())
}
/** Server half: reads the banners (never fails a page) and hands the browser only what this viewer may ever see. */
export async function PromoSlot(){
 const h=headers(),israel=isIsraeli(h),doc=await readPromo()
 if(!doc.settings.enabled)return null
 const banners=doc.banners.filter(b=>b.enabled&&(b.audience==='all'||israel)).map(b=>({...b,note:''}))
 if(banners.length===0)return null
 return <PromoBanner doc={{v:1,settings:doc.settings,banners,audit:[]}} israel={israel}/>
}

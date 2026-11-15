import {headers} from 'next/headers'
import {readPromo} from '@/lib/promo/store'
import {publicShop} from '@/lib/shop/store'
import type {Banner} from '@/lib/promo/types'
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
 const want=doc.banners.filter(b=>b.enabled&&(b.audience==='all'||(b.audience==='israel'&&israel)||(b.audience==='world'&&!israel)||b.audience==='greece')).map(b=>({...b,note:''}))
 // a card that prints a price shows the shop's price right now (sale included); with the product gone or the shop closed it is not shown
 const shop=want.some(b=>b.price)?await publicShop().catch(()=>null):null
 const banners=want.flatMap((b):Banner[]=>{if(!b.price)return [b];const p=shop?.open?shop.products.find(x=>x.id===b.price!.product):null
  return p?[{...b,priceNow:new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency}).format(p.priceFrom/100)}]:[]})
 return <>{israel?<RoundLockStrip/>:null}{banners.length>0?<PromoBanner doc={{v:1,settings:doc.settings,banners,audit:[]}} israel={israel} greece={greece}/>:null}</>
}

import 'server-only'
import {printify,type PProduct} from './printify'
import {readShop,updateShop,printifyToken} from './store'
import {SUBJECT_IDS,subjectName} from './subjects'
import {KINDS,type Kind,type PublicProduct,type ShopCatalog} from './types'

/**
 * THE SHOP RUNS ITSELF (owner, 12.11.2026: "I design the products, they are sold on the external site — full automation").
 * The owner designs and publishes in Printify; this file mirrors every published product of the Pop-Up store onto /shop,
 * with its mock-ups, its lowest price and a Buy link into the Pop-Up checkout. Nothing is made or priced here.
 */
const KIND_WORDS:[Kind,RegExp][]=[
 ['framed',/framed/i],['tote',/tote|\bbag\b/i],['canvas',/canvas/i],['puzzle',/puzzle/i],['phone-case',/phone|iphone|case/i],['sticker',/sticker/i],
 ['mug',/mug|cup/i],['kids-tee',/kid|youth|toddler|baby|bodysuit|onesie/i],['hoodie',/hoodie|sweatshirt/i],
 ['tee',/t-?shirt|\btee\b/i],['notebook',/notebook|journal/i],['poster',/poster|print/i]]
/** what the product is: its title and tags, in the order above (a "framed poster" is framed, a "kids tee" is kids) */
export function kindOf(p:{title:string;tags?:string[]}):Kind{const t=`${p.title} ${(p.tags||[]).join(' ')}`;return KIND_WORDS.find(([,re])=>re.test(t))?.[0]??'poster'}
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
/** whom it is for: a tag (or title words) naming a club id or a club's name; otherwise FAN LIFE's own shelf */
export function subjectOf(p:{title:string;tags?:string[]}):string{
 const hay=` ${norm([...(p.tags||[]),p.title].join(' '))} `
 for(const id of SUBJECT_IDS){if(id==='fanlife')continue;if(hay.includes(` ${norm(id)} `)||hay.includes(` ${norm(subjectName(id))} `))return id}
 return 'fanlife'
}
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,600)
/** the Buy link: the Pop-Up product page Printify gives back on publishing, else the store's own front door */
export function buyUrl(p:Pick<PProduct,'external'>,popupUrl:string):string{
 const h=p.external?.handle
 if(h&&/^https:\/\//.test(h))return h
 const base=popupUrl.replace(/\/$/,'')
 if(h)return `${base}/${h.replace(/^\//,'')}`
 if(p.external?.id)return `${base}/product/${p.external.id}`
 return base
}
/** published (Printify gave it an external id) and visible: only then is it for sale in the Pop-Up store */
export const forSale=(p:PProduct)=>p.visible!==false&&!!(p.external&&(p.external.id||p.external.handle))&&p.variants.some(v=>v.is_enabled)
export function toCatalog(p:PProduct,popupUrl:string,currency:string):PublicProduct{
 const imgs=[...p.images].sort((a,b)=>Number(b.is_default)-Number(a.is_default)).map(i=>i.src)
 return {id:`pf-${p.id}`,subject:subjectOf(p),kind:kindOf(p),title:p.title.slice(0,90),description:plain(p.description||''),image:imgs[0]||'',images:imgs.slice(0,4),
  priceFrom:Math.min(...p.variants.filter(v=>v.is_enabled).map(v=>v.price)),currency,url:buyUrl(p,popupUrl)}
}
let running:Promise<ShopCatalog>|null=null
/** Read every product of the store (50 a page), keep what is for sale, save it. One run at a time per server. */
export function syncCatalog(by='auto'):Promise<ShopCatalog>{
 if(running)return running
 running=(async()=>{
  const token=await printifyToken(),doc=await readShop(),s=doc.settings,at=new Date().toISOString()
  if(!token||!s.shopId){const c:ShopCatalog={...doc.catalog,at,error:'Printify is not connected.'};await updateShop(by,'',d=>{d.catalog=c});return c}
  try{
   const api=printify(token),all:PProduct[]=[]
   for(let page=1;page<=20;page++){const r=await api.list(s.shopId,page);all.push(...r.data);if(page>=r.last_page)break}
   const base=s.popupUrl||'https://fanlife.printify.me',products=all.filter(forSale).map(p=>toCatalog(p,base,s.currency||'USD')).filter(p=>p.image&&Number.isFinite(p.priceFrom))
   const c:ShopCatalog={at,error:null,products,seen:all.length}
   await updateShop(by,by==='auto'?'':`Synced ${products.length} product(s) from Printify`,d=>{d.catalog=c});return c
  }catch(e){const c:ShopCatalog={...doc.catalog,at,error:String((e as Error).message||e).slice(0,300)};await updateShop(by,'',d=>{d.catalog=c});return c}
 })().finally(()=>{running=null})
 return running
}
export {KINDS}

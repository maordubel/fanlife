import Link from 'next/link'
import {publicShop} from '@/lib/shop/store'
import type {PublicProduct} from '@/lib/shop/types'
import {ShopCard} from './ShopStrip'
import {scene,bit} from '@/lib/home/art'
import copy from '@/messages/en.shop.json'

/** One product per design, best sellers and sales first — the window shows what sells, not what was pressed last. */
export function windowPick(products:PublicProduct[],limit:number){
 const seen=new Set<string>()
 return [...products].sort((a,b)=>(Number(!!b.was)-Number(!!a.was))||(b.sold-a.sold)).filter(p=>{if(seen.has(p.design))return false;seen.add(p.design);return true}).slice(0,limit)
}

/**
 * THE SHOP WINDOW on the front page (owner, 23.11.2026: "the shop is missing — sales are something we will have to push
 * wisely"). A spread of its own between the clubs and the contents: the picture, one promise, three reasons to trust the
 * order, the four products that sell, one way in. Renders NOTHING while the shop is closed or empty — a door never leads to
 * an empty room. Phone: the picture band, two products a row. Desktop: the promise beside a row of four.
 */
export function ShopWindowView({products}:{products:PublicProduct[]}){
 const pic=scene('kit-detail'),scarf=bit('supporter-scarf'),sale=products.some(p=>p.was)
 return <section className="wkz" id="shop" aria-labelledby="wkz-h" data-testid="shop-window" data-sale={sale||undefined}>
  <div className="wkz-head">
   {/* eslint-disable-next-line @next/next/no-img-element -- the owner's picture, cut by scripts/brand/art-vol2.py */}
   <img className="wkz-pic" src={pic.src} srcSet={pic.srcSet} sizes="(min-width: 901px) 32vw, 100vw" alt="" width={960} height={640} loading="lazy" decoding="async"/>
   <div className="wkz-head-t">
    <p className="wk-banner">{sale?copy.windowSaleK:copy.windowK}</p>
    <h2 className="wkz-h" id="wkz-h">{copy.windowT}</h2>
    <p className="wkz-sub">{copy.windowSub}</p>
    <ul className="wkz-why"><li>{copy.windowWhy1}</li><li>{copy.windowWhy2}</li><li>{copy.windowWhy3}</li></ul>
    <Link className="wk-btn wkz-go min-h-tap" href="/shop" data-testid="shop-window-go">{copy.windowGo} <span aria-hidden="true">→</span></Link>
   </div>
   {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out breaking the frame, decoration only */}
   <img className="wkz-scarf" src={scarf.src} srcSet={scarf.srcSet} sizes="140px" alt="" width={320} height={207} loading="lazy" decoding="async"/>
  </div>
  <ul className="wks-grid wkz-shelf">{products.map(p=><ShopCard key={p.id} p={p}/>)}</ul>
 </section>
}
export async function ShopWindow({limit=4}:{limit?:number}){
 const shop=await publicShop().catch(()=>null);if(!shop?.open||!shop.products.length)return null
 const pick=windowPick(shop.products,limit);return pick.length?<ShopWindowView products={pick}/>:null
}

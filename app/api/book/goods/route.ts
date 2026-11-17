import {NextResponse} from 'next/server'
import {BOOK_SITE,GOODS,isGoods,isLang,isRegion} from '@/lib/book/catalog'
import {goodsSession} from '@/lib/book/checkout'
import {createBookOrder,moveBookOrder,newBookId} from '@/lib/book/orders'
import {payOpen,stripeCall,type Session} from '@/lib/pay/stripe'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/** GET /api/book/goods?item=tee&size=M&colour=Ivory&region=eu&lang=en — one garment from the book's own range (Printify, the book's store) */
export async function GET(r:Request){
 const u=new URL(r.url),q=(k:string)=>u.searchParams.get(k)
 const lang=q('lang'),L=isLang(lang)?lang:'en',home=`${BOOK_SITE}/${L}/#goods`,item=q('item'),region=q('region')
 if(!payOpen()||!isGoods(item)||!isRegion(region))return NextResponse.redirect(home,303)
 const g=GOODS[item],size=g.sizes.length===1?g.sizes[0]!:(q('size')??'').toUpperCase(),colour=g.colours.find(c=>c.toLowerCase()===(q('colour')??'').toLowerCase())??g.colours[0]!
 if(!g.sizes.includes(size))return NextResponse.redirect(home,303)
 const id=newBookId()
 try{
  await createBookOrder({id,kind:item,lang:L,region,variant:`${colour}|${size}`,amount_cents:g.cents+g.ship[region]})
  const s=await stripeCall<Session>('checkout/sessions',goodsSession({order:id,lang:L,kind:item,colour,size,region}),`book-${id}`)
  await moveBookOrder(id,['open'],{stripe_session:s.id})
  return NextResponse.redirect(s.url||home,303)
 }catch{return NextResponse.redirect(`${home}?pay=error`,303)}
}

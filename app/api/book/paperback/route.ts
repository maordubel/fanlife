import {NextResponse} from 'next/server'
import {BOOK_SITE,PAPERBACK,REGIONS,isLang,isRegion,isShip,type Ship} from '@/lib/book/catalog'
import {paperbackSession} from '@/lib/book/checkout'
import {createBookOrder,moveBookOrder,newBookId} from '@/lib/book/orders'
import {luluOpen} from '@/lib/book/lulu'
import {payOpen,stripeCall,type Session} from '@/lib/pay/stripe'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/**
 * GET /api/book/paperback?lang=he&region=il&ship=standard — one paperback of one edition, posted to one region.
 * Stripe Checkout collects the address (only that region's countries) and a phone (Lulu's couriers require one).
 * Closed (back to the book) until both Stripe and Lulu are connected, so nobody pays for a book that cannot be printed.
 */
export async function GET(r:Request){
 const u=new URL(r.url),q=(k:string)=>u.searchParams.get(k)
 const lang=q('lang'),L=isLang(lang)?lang:'en',home=`${BOOK_SITE}/${L}/#paperback`
 const region=q('region'),ship=q('ship')??'standard'
 if(!payOpen()||!luluOpen()||!isRegion(region)||!isShip(ship))return NextResponse.redirect(home,303)
 const post=REGIONS[region].ship[ship]??REGIONS[region].ship.standard
 if(!post)return NextResponse.redirect(home,303)
 const sh:Ship=REGIONS[region].ship[ship]?ship:'standard',id=newBookId(),cents=PAPERBACK.cents+post.cents
 try{
  await createBookOrder({id,kind:'paperback',lang:L,region,ship:sh,amount_cents:cents})
  const s=await stripeCall<Session>('checkout/sessions',paperbackSession({order:id,lang:L,region,ship:sh}),`book-${id}`)
  await moveBookOrder(id,['open'],{stripe_session:s.id})
  return NextResponse.redirect(s.url||home,303)
 }catch{return NextResponse.redirect(`${home}?pay=error`,303)}
}

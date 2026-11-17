import {NextResponse} from 'next/server'
import {BOOK_SITE,isLang,tipCents} from '@/lib/book/catalog'
import {tipSession} from '@/lib/book/checkout'
import {createBookOrder,moveBookOrder,newBookId} from '@/lib/book/orders'
import {payOpen,stripeCall,type Session} from '@/lib/pay/stripe'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/**
 * GET /api/book/give?lang=he&amount=6 — the book's tip jar (a plain link from the static book site, no script needed):
 * opens an order and sends the reader straight to Stripe Checkout. Anything unreadable goes back to the book's support page.
 */
export async function GET(r:Request){
 const u=new URL(r.url),lang=u.searchParams.get('lang'),cents=tipCents(u.searchParams.get('amount'))
 const L=isLang(lang)?lang:'en',home=`${BOOK_SITE}/${L}/#support`
 if(!payOpen()||cents===null)return NextResponse.redirect(home,303)
 const id=newBookId()
 try{
  await createBookOrder({id,kind:'tip',lang:L,amount_cents:cents})
  const s=await stripeCall<Session>('checkout/sessions',tipSession({order:id,lang:L,cents}),`book-${id}`)
  await moveBookOrder(id,['open'],{stripe_session:s.id})
  return NextResponse.redirect(s.url||home,303)
 }catch{return NextResponse.redirect(`${home}?pay=error`,303)}
}

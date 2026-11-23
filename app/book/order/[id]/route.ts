import {getBookOrder,isBookId} from '@/lib/book/orders'
import {journeyPage,missingPage} from '@/lib/book/journeyPage'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/**
 * GET /book/order/<id> — the reader's journey page (lib/book/journeyPage), linked from every Broken Collective letter.
 * The order id is the key (72 random bits); the page shows no name or address. A whole document, outside FAN LIFE's layout.
 */
const html=(body:string,status=200)=>new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
export async function GET(r:Request,{params}:{params:{id:string}}){
 const o=isBookId(params.id)?await getBookOrder({id:params.id}).catch(()=>null):null
 if(!o||o.status==='open'||o.status==='expired'||o.kind==='tip')return html(missingPage(/^he/i.test(r.headers.get('accept-language')||'')?'he':'en'),404)
 return html(journeyPage(o))
}

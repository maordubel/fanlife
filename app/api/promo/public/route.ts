import {NextResponse} from 'next/server'
import {readPromo} from '@/lib/promo/store'
export const dynamic='force-dynamic'
const SITE='https://fanlife.dubelteam.com'
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}
const abs=(p:string)=>p.startsWith('/')?`${SITE}${p}`:p
/**
 * The owner's advertising, read by his other apps (DUBID) so ONE control room sets every banner.
 * Only what a viewer may see: enabled banners, no notes, no audit; images made absolute. A failing store is the seed (readPromo), never an error.
 */
export async function GET(){
 const doc=await readPromo()
 const banners=doc.banners.filter(b=>b.enabled).map(b=>({...b,note:'',img1x:abs(b.img1x),img2x:abs(b.img2x)}))
 return NextResponse.json({v:1,settings:doc.settings,banners,audit:[]},{headers:CORS})
}
export function OPTIONS(){return new NextResponse(null,{status:204,headers:CORS})}

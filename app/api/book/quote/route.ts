import {NextResponse} from 'next/server'
import {PAPERBACK,REGIONS,type BookLang,type Region,type Ship} from '@/lib/book/catalog'
import {cost,coverSize,luluOpen} from '@/lib/book/lulu'

export const runtime='nodejs'
export const revalidate=3600
/**
 * GET /api/book/quote — the owner's margin check, readable in a browser: for each edition, region and post, what the reader
 * pays (catalog) beside what Lulu charges (live), plus the cover size Lulu expects for the page count. Cached an hour.
 */
export async function GET(){
 if(!luluOpen())return NextResponse.json({error:'Lulu keys are not set.'},{status:503})
 const rows:Record<string,unknown>[]=[]
 for(const lang of ['he','en'] as BookLang[])for(const region of Object.keys(REGIONS) as Region[])for(const ship of ['standard','express'] as Ship[]){
  const s=REGIONS[region].ship[ship],charge=(PAPERBACK.cents+s.cents)/100
  try{const c=await cost(lang,s.level,REGIONS[region].sample);rows.push({lang,region,ship,level:s.level,reader_pays_eur:charge,lulu_total:`${c.total_cost_incl_tax} ${c.currency}`})}
  catch(e){rows.push({lang,region,ship,level:s.level,reader_pays_eur:charge,error:String((e as Error).message).slice(0,160)})}
 }
 const covers:Record<string,unknown>={}
 for(const lang of ['he','en'] as BookLang[])try{covers[lang]=await coverSize(lang)}catch(e){covers[lang]=String((e as Error).message).slice(0,160)}
 return NextResponse.json({at:new Date().toISOString(),covers,rows},{headers:{'Cache-Control':'s-maxage=3600'}})
}

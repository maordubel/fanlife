import {NextResponse} from 'next/server'
import {PAPERBACK,REGIONS,parcelCents,type BookLang,type Region,type Ship} from '@/lib/book/catalog'
import {cost,coverSize,luluOpen} from '@/lib/book/lulu'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/**
 * GET /api/book/quote — the owner's margin check, readable in a browser: for each edition, region and post, what the reader
 * pays (catalog) beside what Lulu charges (live), plus the cover size Lulu expects for the page count. Live on every visit (the owner's page, rarely opened).
 */
export async function GET(){
 if(!luluOpen())return NextResponse.json({error:'Lulu keys are not set.'},{status:503})
 const rows:Record<string,unknown>[]=[]
 const levels=['MAIL','PRIORITY_MAIL','GROUND','EXPEDITED','EXPRESS'] as const
 // every Lulu post level for every region (English edition — the Hebrew differs by page count only), next to what the reader pays now
 await Promise.all((Object.keys(REGIONS) as Region[]).flatMap(region=>levels.flatMap(level=>(['en','both'] as const).map(async parcel=>{
  const now=(Object.keys(REGIONS[region].ship) as Ship[]).find(s=>REGIONS[region].ship[s]?.level===level)
  const c=now?parcelCents(parcel,region,now):null,charge=c?(c.books+c.post)/100:null
  try{const q=await cost(parcel,level,REGIONS[region].sample);rows.push({region,level,parcel,ship:now??null,reader_pays_eur:charge,lulu_total:`${q.total_cost_incl_tax} ${q.currency}`,margin_eur:charge!==null?+(charge-Number(q.total_cost_incl_tax)-charge*0.015-0.25).toFixed(2):null})}
  catch(e){rows.push({region,level,parcel,ship:now??null,reader_pays_eur:charge,error:String((e as Error).message).slice(0,120)})}
 }))))
 rows.sort((a,b)=>String(a.region).localeCompare(String(b.region))||levels.indexOf(a.level as never)-levels.indexOf(b.level as never)||String(a.parcel).localeCompare(String(b.parcel)))
 const covers:Record<string,unknown>={}
 for(const lang of ['he','en'] as BookLang[])try{covers[lang]=await coverSize(lang)}catch(e){covers[lang]=String((e as Error).message).slice(0,160)}
 return NextResponse.json({at:new Date().toISOString(),covers,rows},{headers:{'Cache-Control':'s-maxage=3600'}})
}

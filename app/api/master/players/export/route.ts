import {guard,fail} from '../_http'
import {exportCsv} from '@/lib/players/service'
import {queryFrom} from '@/lib/players/query'
export const dynamic='force-dynamic'
export async function GET(r:Request){const g=guard(r);if(g.error)return g.error;try{return new Response(await exportCsv(queryFrom(new URL(r.url).searchParams)),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="fanlife-players.csv"','Cache-Control':'no-store'}})}catch(e){return fail(e)}}

import {guard,json,fail} from './_http'
import {listPlayers} from '@/lib/players/service'
import {queryFrom} from '@/lib/players/query'
export const dynamic='force-dynamic'
export async function GET(r:Request){const g=guard(r);if(g.error)return g.error;try{return json(await listPlayers(queryFrom(new URL(r.url).searchParams)))}catch(e){return fail(e)}}

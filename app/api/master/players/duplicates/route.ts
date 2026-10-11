import {guard,json,fail} from '../_http'
import {duplicateCandidates} from '@/lib/players/merge'
export const dynamic='force-dynamic'
export async function GET(r:Request){const g=guard(r);if(g.error)return g.error;try{const c=new URL(r.url).searchParams.get('club');return json(await duplicateCandidates(c?c.split(',').slice(0,8):undefined))}catch(e){return fail(e)}}

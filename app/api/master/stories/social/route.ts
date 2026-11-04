import {adminFromRequest} from '@/lib/master/admin'
import {LIGHTS_STALE_MS,readLights} from '@/lib/stories/socialLights'
import {fail,json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET: the social runner's connection lights (yes/no per platform, never a secret) for the studio's Social panel. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{
  const lights=await readLights()
  return json({lights,fresh:!!lights&&Date.now()-Date.parse(lights.at)<LIGHTS_STALE_MS})
 }catch(e){return fail(e)}
}

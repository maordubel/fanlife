import {adminFromRequest} from '@/lib/master/admin'
import {readClassified} from '@/lib/stories/classified'
import {readPitchDays,readPitchDesk} from '@/lib/stories/pitchStore'
import {readLights} from '@/lib/stories/socialLights'
import {marketingToday} from '@/lib/stories/marketing'
import {readAutopilot} from '@/lib/stories/autopilotStore'
import {fail,json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** The studio desk's slower facts, read once a minute: the CLASSIFIED FILEs, the directors' pitches and the pitch desk,
 *  the social runner's lights and what the social plan sent today. Each one that cannot be read is null ("not
 *  connected" on the screen), never an empty list. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{
  const soft=<T>(p:Promise<T>)=>p.catch(()=>null)
  const [classified,days,pitchDesk,lights,plan,autopilot]=await Promise.all([soft(readClassified()),soft(readPitchDays(14)),soft(readPitchDesk()),soft(readLights()),soft(marketingToday()),soft(readAutopilot())])
  return json({classified,pitches:days,pitchDesk,lights,plan,autopilot})
 }catch(e){return fail(e)}
}

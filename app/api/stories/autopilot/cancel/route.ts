import {cancelByOwner} from '@/lib/stories/autopilot'
import {verifyCancel} from '@/lib/stories/autopilotToken'
import {updateJob} from '@/lib/stories/store'
import {json,limited} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * "Cancel publishing" (docs/rules/studio-autopilot.md). The only way in is the signed link the autopilot sent to the
 * owner's Telegram: one film, one purpose, valid until that film's publishing time, signed with the scheduler's secret
 * (as the Final Whistle render link is) — it is not a login and opens nothing else. Only this POST cancels; opening the
 * link (GET /studio-cancel) never does, because link previews fetch addresses. A second POST changes nothing.
 */
const back=(q:URLSearchParams)=>new Response(null,{status:303,headers:{Location:`/studio-cancel?${q}`,'Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow'}})
export async function POST(r:Request){
 if(limited('autopilot-cancel',20,60_000))return json({error:'Too many requests; wait a moment.'},429)
 let f:URLSearchParams
 try{const raw=await r.text();if(raw.length>600)throw new Error('large');f=new URLSearchParams(raw)}catch{return json({error:'Invalid request.'},400)}
 const id=f.get('job')??'',exp=Number(f.get('exp')),sig=f.get('sig')??''
 const q=new URLSearchParams({job:id,exp:String(exp),sig})
 if(!verifyCancel(process.env.CRON_SECRET||'',id,exp,sig,Date.now()))return back(q)
 // too late, or already cancelled: the page says which — it reads the job's real state
 try{await updateJob(id,j=>cancelByOwner(j))}catch{/* the page shows where the film stands */}
 return back(q)
}
/** Opening the address never cancels. */
export function GET(){return json({error:'Use the button on the cancel page.'},405)}

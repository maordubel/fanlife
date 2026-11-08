import {adminFromRequest} from '@/lib/master/admin'
import {listJobs} from '@/lib/stories/store'
import {FLOW_KINDS,flowFiles,jobKind} from '@/lib/stories/jobs'
import {fail,json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The Flow operator's queue (owner, 8.11.2026: "everything in full automation"). Claude, on the owner's computer, opens
 * Google Flow in its browser and makes what a waiting animated Short or marketing film needs: GET this (owner session),
 * make each missing file in Flow, put it with a signed upload from /api/master/stories/<id>/art, record it with the
 * `flow_added` action, and finish with `flow_ready` — the worker then edits it. Oldest first.
 */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{
  const jobs=(await listJobs(200)).filter(j=>FLOW_KINDS.includes(jobKind(j))&&j.flow&&['needs_review','paused','failed'].includes(j.state)&&j.stage!=='done'&&!j.lease)
  return json({jobs:jobs.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(j=>{
   const have=new Set((j.brief.art??[]).map(a=>a.name))
   return {id:j.id,kind:jobKind(j),title:j.flow!.title,state:j.state,characters:j.flow!.characters,clips:j.flow!.clips,stills:j.flow!.stills,
    missing:flowFiles(j.flow!).filter(n=>!have.has(n)),have:[...have]}
  })})
 }catch(e){return fail(e)}
}

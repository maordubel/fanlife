import type {Job} from './jobs'
import {autopilotActive} from './autopilot'

/**
 * After YouTube has a film, its big files leave the free 1 GB bucket by themselves (owner, 11.11.2026: "yes" to deleting
 * the big film files once the film is on YouTube). Pictures, captions and the contact sheet are small and stay, so the
 * desk still shows what the film was. A film waits while a social post may still need its file (scheduled or sending),
 * and for GRACE_HOURS after the upload, so a re-upload from the studio is still possible the same day.
 * A film that was never uploaded does not stay for ever either (owner, 12.11.2026: "yes" — the bucket filled and the whole
 * project was restricted): UNUPLOADED_DAYS after it was last touched, its big files go the same way and the desk says so.
 * The listener (stories-watch.yml → studio/cleanup.py) asks for this every ten minutes: op `trim` in the worker route.
 */
export const GRACE_HOURS=6
/** a finished film with no YouTube upload keeps its big files this many days (the owner gave no number: seven) */
export const UNUPLOADED_DAYS=7
/** what counts as a big file: video, audio and archives — never a picture, a caption or a job's JSON — and every chunk
 *  of one, whatever its size: `master.mp4.part0`, `master.part3` and the worker's own `master.000.part` (the number
 *  BEFORE `.part`: it was missed, so a chunk under 8 MB stayed in the bucket for ever) */
export const BIG=/\.(mp4|mov|webm|mkv|m4v|wav|mp3|m4a|aac|flac|ogg|zip|tar|gz)(\.part\d+)?$|\.part\d*$|\.chunk\d+$/i

export type Trim={at:string;bytes:number;files:number;reason?:'unuploaded'}
const posting=(j:Job)=>(j.social?.posts??[]).some(p=>p.state==='scheduled'||p.state==='sending')

export function trimDue(jobs:Job[],now=new Date()):Job[]{
 const t=+now
 return jobs.filter(j=>{
  if(j.upload.state!=='done'||j.trim)return false
  const at=Date.parse(j.upload.at??'')
  if(Number.isFinite(at)&&t-at<GRACE_HOURS*3600_000)return false
  return !posting(j)
 })
}

/** Finished films nobody uploaded: ready (or waiting for review) with a master, untouched for UNUPLOADED_DAYS. Never a
 *  job the worker holds or may take again, never an upload in progress or uncertain, never a film inside the autopilot
 *  (in production, or in the owner's two hours to cancel), never while a post still needs its file. */
export function unuploadedDue(jobs:Job[],now=new Date()):Job[]{
 const t=+now
 return jobs.filter(j=>{
  if(j.trim||j.upload.state!=='none'||j.lease||!j.artefacts?.master)return false
  if(j.state!=='ready'&&j.state!=='needs_review')return false
  if(autopilotActive(j)||posting(j))return false
  const at=Date.parse(j.updatedAt)
  return Number.isFinite(at)&&t-at>=UNUPLOADED_DAYS*86_400_000
 })
}

export function isBig(name:string,bytes:number):boolean{
 return BIG.test(name)||bytes>=8*1024*1024&&!/\.(json|srt|vtt|txt)$/i.test(name)
}

/** What the desk says, plainly, on a film whose media was removed without an upload. */
export const UNUPLOADED_TEXT=`media removed after ${UNUPLOADED_DAYS} days without upload — re-render to get it back`
export const trimLog=(t:Trim)=>t.reason==='unuploaded'
 ?`Big files removed: ${UNUPLOADED_TEXT} (${t.files} file(s), ${(t.bytes/1048576).toFixed(0)} MB freed; the script, captions, pictures and metadata are kept)`
 :`Big files removed after the YouTube upload: ${t.files} file(s), ${(t.bytes/1048576).toFixed(0)} MB freed (pictures and captions kept)`

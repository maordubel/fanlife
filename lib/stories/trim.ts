import type {Job} from './jobs'

/**
 * After YouTube has a film, its big files leave the free 1 GB bucket by themselves (owner, 11.11.2026: "yes" to deleting
 * the big film files once the film is on YouTube). Pictures, captions and the contact sheet are small and stay, so the
 * desk still shows what the film was. A film waits while a social post may still need its file (scheduled or sending),
 * and for GRACE_HOURS after the upload, so a re-upload from the studio is still possible the same day.
 * The listener (stories-watch.yml → studio/cleanup.py) asks for this every ten minutes: op `trim` in the worker route.
 */
export const GRACE_HOURS=6
/** what counts as a big file: video, audio and archives — never a picture, a caption or a job's JSON — and every chunk
 *  of one, whatever its size: `master.mp4.part0`, `master.part3` and the worker's own `master.000.part` (the number
 *  BEFORE `.part`: it was missed, so a chunk under 8 MB stayed in the bucket for ever) */
export const BIG=/\.(mp4|mov|webm|mkv|m4v|wav|mp3|m4a|aac|flac|ogg|zip|tar|gz)(\.part\d+)?$|\.part\d*$|\.chunk\d+$/i

export type Trim={at:string;bytes:number;files:number}

export function trimDue(jobs:Job[],now=new Date()):Job[]{
 const t=+now
 return jobs.filter(j=>{
  if(j.upload.state!=='done'||(j as Job&{trim?:Trim|null}).trim)return false
  const at=Date.parse(j.upload.at??'')
  if(Number.isFinite(at)&&t-at<GRACE_HOURS*3600_000)return false
  return !(j.social?.posts??[]).some(p=>p.state==='scheduled'||p.state==='sending')
 })
}

export function isBig(name:string,bytes:number):boolean{
 return BIG.test(name)||bytes>=8*1024*1024&&!/\.(json|srt|vtt|txt)$/i.test(name)
}

export const trimLog=(t:Trim)=>`Big files removed after the YouTube upload: ${t.files} file(s), ${(t.bytes/1048576).toFixed(0)} MB freed (pictures and captions kept)`

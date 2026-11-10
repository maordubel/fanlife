import {jobKind,type Job} from './jobs'

/**
 * The production standard (owner, 10.11.2026): every documentary goes out as a full film, its Shorts, a Reel on Instagram
 * and Facebook, and an animated Short. This reads which of the four a film already has — from the job and from the other
 * jobs, never from a guess — so the desk shows what is missing and offers the one click that makes it.
 */
export type Deliverable={key:'film'|'shorts'|'reel'|'animated';label:string;done:boolean;detail:string}

export function deliverables(job:Job,jobs:readonly Job[]):Deliverable[]{
 const shorts=job.artefacts?.shorts?.length??0
 const posts=(job.social?.posts??[]).filter(p=>(p.platform==='instagram'||p.platform==='facebook')&&p.media?.kind==='short'&&p.state!=='failed')
 const reelOn=new Set(posts.map(p=>p.platform))
 const ids=new Set(job.brief.match_ids??[]),match=(job.brief.match_ids??[])[0]
 const animated=ids.size?jobs.find(j=>jobKind(j)==='short'&&!['cancelled','failed'].includes(j.state)&&(j.brief.match_ids??[]).some(id=>ids.has(id))):undefined
 return [
  {key:'film',label:'Full film',done:job.upload.state==='done',detail:job.upload.state==='done'?(job.upload.visibility==='scheduled'?'scheduled on YouTube':'on YouTube'):'not on YouTube yet'},
  {key:'shorts',label:'Shorts',done:shorts>0,detail:shorts?`${shorts} ready`:'none yet'},
  {key:'reel',label:'Reel · Instagram + Facebook',done:reelOn.has('instagram')&&reelOn.has('facebook'),detail:reelOn.size?[...reelOn].map(p=>p==='instagram'?'Instagram':'Facebook').join(' + '):'not planned'},
  {key:'animated',label:'Animated Short',done:!!animated,detail:animated?(animated.state==='ready'?'ready':'in the studio'):match?'not made':'needs one match'},
 ]
}

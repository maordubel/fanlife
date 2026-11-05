import type {ClassifiedFile} from './jobs'

/**
 * CLASSIFIED as the studio desk sees it (pure; lib/stories/classified.ts reads the files). Every FILE in the panel map
 * (scripts/football-stories/comic/classified_manifest.json) with its episode script, if one is written
 * (comic/episodes/<file>-*.json — never the `-demo` cut, which the produce workflow skips too), its draft, whether the
 * episode file itself says approved, and how many of the brief's roles have a panel in the owner's Drive.
 */
type Panel={id?:string;role?:string;drive_id?:string|null}
type ManifestFile={title?:string;number?:string;tone?:string;year?:number;brief_roles?:string[];panels?:Panel[]}
export type Manifest={files?:Record<string,ManifestFile>}
type Episode={file?:string;number?:string;title?:string;tone?:string;script?:string;script_version?:string;approved?:boolean;minutes?:number;beats?:unknown[];package?:{shorts?:unknown[]}}

/** A panel's role may name two ("CH1/CH2", "S04/S05"): it covers both. */
const rolesOf=(p:Panel)=>String(p.role||'').split('/').map(x=>x.trim()).filter(Boolean)

export function classifiedIndex(manifest:Manifest,episodes:{name:string;json:unknown}[]):ClassifiedFile[]{
 const eps=episodes.filter(e=>/\.json$/.test(e.name)&&!/-demo\.json$/.test(e.name))
 return Object.entries(manifest.files||{}).map(([file,f])=>{
  const e=eps.filter(x=>x.name.startsWith(`${file}-`)).sort((a,b)=>a.name.localeCompare(b.name))[0]
  const ep=(e?.json??null) as Episode|null
  const roles=f.brief_roles||[]
  const covered=new Set((f.panels||[]).filter(p=>p.drive_id).flatMap(rolesOf))
  const missing=roles.filter(r=>!covered.has(r))
  return {file,number:String(f.number||ep?.number||file.replace(/\D/g,'')),title:String(f.title||ep?.title||file.toUpperCase()),tone:String(f.tone||ep?.tone||''),
   year:typeof f.year==='number'?f.year:null,episode:e?.name??null,script:ep?.script??null,script_version:ep?.script_version??null,
   approved_in_file:ep?.approved===true,minutes:typeof ep?.minutes==='number'?ep.minutes:null,beats:Array.isArray(ep?.beats)?ep!.beats!.length:0,
   panels:{have:roles.length-missing.length,roles:roles.length,missing},shorts:Array.isArray(ep?.package?.shorts)?ep!.package!.shorts!.length:0}
 }).sort((a,b)=>a.file.localeCompare(b.file))
}

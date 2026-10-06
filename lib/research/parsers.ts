import type {ResourceKind} from './contract'
/**
 * Registered parsers: providerId + kind → pure function (snapshot bytes → observations). A parser enters this table
 * only with a stored fixture and a test (spec §5/§7). Until then a fetched page is kept as a snapshot and its job
 * ends as `needs-adapter`, so writing the parser later re-parses from disk without a single new request.
 */
export type Observation={subject:string;field:string;value:unknown;locator:string}
export type Parser=(body:Buffer,ctx:{url:string;subjects:string[]})=>{observations:Observation[];diagnostics:string[]}
export const PARSERS:Record<string,Partial<Record<ResourceKind,Parser>>>={}
export const parserFor=(providerId:string,kind:ResourceKind):Parser|null=>PARSERS[providerId]?.[kind]??null
/** Archive parsers by parserId. A parser reads ONE document (title, HTML, and the listing's own taxonomy) and returns
 * candidate observations — never a decision. Names stay as the source wrote them; identity stays unresolved. */
export type ArchiveDocInput={url:string;title:string|null;html:string;providerKey:string;meta:{slug:string|null;categories:string[];parent:number|null}}
export type ArchiveObservation={schemaVersion:1;id:string;recordType:'player'|'coach'|'season';providerRecordKey:string;sourceUrl:string;parserVersion:string;locator:string
 nameAsReported:string|null;seasonsAsReported:string|null;seasonAsReported:string|null;canonicalId:null;identityState:'unresolved';status:'candidate'}
export type ArchiveParser={id:string;needsTaxonomy:boolean;parse:(doc:ArchiveDocInput)=>{observations:ArchiveObservation[];diagnostics:string[]}}
const text=(html:string)=>html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&#8211;|&ndash;/g,'–').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()
const SPAN=/\((\d{4}\/\d{2}(?:\s*[-–,]\s*\d{4}\/\d{2})*)\)/
const SEASON=/(?:^|\D)(\d{4})\s*[-/–]\s*(\d{2}|\d{4})(?:\D|$)/
/**
 * AEKpedia (WordPress). Classification comes from the site's OWN categories (players / coaches / seasons), read
 * from the categories endpoint by slug — never from guessing at prose. Extracted, and only this:
 *  - player / coach: the title as written, and the first-team span the profile's opening line prints, e.g.
 *    "Σπύρος Μιχαλάς (1976/77)" → seasonsAsReported "1976/77" (a claim to check, not a roster row)
 *  - season review: the season label from the title or slug ("season-1974-75" → "1974/75")
 * Built on 6.10.2026 against the structure of the public listing (post 7883 and the category index);
 * tests/research/aekpedia-parser.test.ts holds a minimal reconstruction of that structure (facts only).
 */
const aekpedia:ArchiveParser={id:'aekpedia-football-v1',needsTaxonomy:true,parse(doc){
 const c=new Set(doc.meta.categories),out:ArchiveObservation[]=[],diag:string[]=[]
 const base={schemaVersion:1 as const,providerRecordKey:doc.providerKey,sourceUrl:doc.url,parserVersion:'aekpedia-football-v1',canonicalId:null,identityState:'unresolved' as const,status:'candidate' as const}
 const type=c.has('players')?'player':(c.has('coaches')||c.has('coach-1')||c.has('coach-2'))?'coach':(c.has('seasons')||/^season-/.test(doc.meta.slug||''))?'season':null
 if(!type)return {observations:[],diagnostics:['not a player, coach or season document by the site\'s own categories']}
 if(type==='season'){
  const m=(doc.title||'').match(SEASON)||(doc.meta.slug||'').replace(/-/g,' - ').match(SEASON)
  if(!m){diag.push('season document without a readable season label');return {observations:[],diagnostics:diag}}
  const a=m[1]!,b=m[2]!.length===4?m[2]!.slice(2):m[2]!
  out.push({...base,id:`obs:${doc.providerKey}:season`,recordType:'season',locator:m.input===doc.title?'title.rendered':'slug',nameAsReported:null,seasonsAsReported:null,seasonAsReported:`${a}/${b}`})
  return {observations:out,diagnostics:diag}
 }
 const first=text((doc.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)||[])[1]||'')
 const span=first.match(SPAN)?.[1]?.replace(/\s+/g,'')??null
 if(!span)diag.push('profile opening line carries no (YYYY/YY) span')
 out.push({...base,id:`obs:${doc.providerKey}:${type}`,recordType:type,locator:span?'content.rendered p:first-of-type':'title.rendered',nameAsReported:doc.title,seasonsAsReported:span,seasonAsReported:null})
 return {observations:out,diagnostics:diag}
}}
export const ARCHIVE_PARSERS:Record<string,ArchiveParser>={[aekpedia.id]:aekpedia}
export const archiveParserFor=(id:string|null):ArchiveParser|null=>id?ARCHIVE_PARSERS[id]??null:null

/**
 * Are these two records one man? A SUGGESTION engine for the owner — it never merges anything (rule 7: no fuzzy linking in the data).
 * Evidence, strongest first: an exact shared name or alias (after folding case, accents and punctuation); the same family name and the same given name or initial;
 * years that overlap. Evidence against: years that are far apart, a different given name. The result carries its reasons so the owner can see why.
 */
export type Person={id:string;name:string;nameOriginal:string;aliases:string[];fromYear:number|null;toYear:number|null;wave:boolean;locked:boolean;price:number;positions:string[]}
export const fold=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu,' ').replace(/\s+/g,' ').trim()
/** consonant skeleton of a Latin word: spelling variants (Yiannis/Giannis, Kostas/Costas, Michailidis/Mihailidis) meet */
export const skeleton=(s:string)=>fold(s).replace(/ph/g,'f').replace(/th/g,'t').replace(/kh|ch|gh/g,'h').replace(/[ckq]/g,'k').replace(/[wb]/g,'v').replace(/tz|ts/g,'s').replace(/[^a-z]/g,'').replace(/[aeiouyj]/g,'').replace(/(.)\1+/g,'$1')
const latin=(s:string)=>/^[\x20-\x7eÀ-ɏ.'’-]+$/.test(s)
const parts=(s:string)=>fold(s.replace(/\(.*?\)/g,'')).split(' ').filter(Boolean)
const namesOf=(p:Person)=>[...new Set([p.name,p.nameOriginal,...p.aliases].filter(Boolean))]
export type Likeness={score:number;confidence:'exact'|'high'|'medium';reasons:string[];against:string[]}
export function likeness(a:Person,b:Person):Likeness|null{
 const reasons:string[]=[],against:string[]=[];let score=0
 const fa=new Set(namesOf(a).map(fold)),fb=new Set(namesOf(b).map(fold))
 const shared=[...fa].filter(x=>x.length>=5&&fb.has(x))
 if(shared.length){score+=6;reasons.push(`the same name or alias: “${shared[0]}”`)}
 const la=namesOf(a).filter(latin),lb=namesOf(b).filter(latin)
 let bestName=0
 for(const x of la)for(const y of lb){const px=parts(x),py=parts(y);if(px.length<2||py.length<2)continue
  const last=skeleton(px.at(-1)!)&&skeleton(px.at(-1)!)===skeleton(py.at(-1)!)
  if(!last)continue
  const f1=px[0]!,f2=py[0]!
  const given=skeleton(f1)===skeleton(f2)&&skeleton(f1)!==''?3:f1[0]===f2[0]?1.5:0
  bestName=Math.max(bestName,2+given)}
 if(bestName){score+=bestName;reasons.push(bestName>=5?'the same family name and given name (spelling variants)':bestName>=3.5?'the same family name and the same initial':'the same family name')}
 const A=[a.fromYear,a.toYear],B=[b.fromYear,b.toYear]
 if(A[0]!==null&&B[0]!==null){
  const a1=A[0]!,a2=A[1]??a1,b1=B[0]!,b2=B[1]??b1,gap=Math.max(a1,b1)-Math.min(a2,b2)
  if(gap<=0){score+=2;reasons.push('their years overlap')}else if(gap<=3){score+=0.5;reasons.push('their years are close')}else if(gap>6){score-=4;against.push(`their years are ${gap} years apart`)}
 }
 if(score<5)return null
 return {score,confidence:shared.length?'exact':score>=7?'high':'medium',reasons,against}
}
/** which record should survive: the one the archive already stands behind */
export function suggestKeeper(a:Person,b:Person):{keep:Person;drop:Person;why:string}{
 const rank=(p:Person)=>[p.locked?1:0,p.wave?0:1,p.positions.length?1:0,p.aliases.length,p.fromYear!==null?1:0,p.name.length]
 const ra=rank(a),rb=rank(b)
 for(let i=0;i<ra.length;i++)if(ra[i]!==rb[i]){const keepA=ra[i]!>rb[i]!;const why=['is pinned/locked','is in the archive proper (not the unreviewed roster wave)','has a position on record','carries more aliases','has recorded years','has the fuller name'][i]!
  return keepA?{keep:a,drop:b,why:`${a.name} ${why}`}:{keep:b,drop:a,why:`${b.name} ${why}`}}
 return a.id<b.id?{keep:a,drop:b,why:'equal evidence — the earlier id'}:{keep:b,drop:a,why:'equal evidence — the earlier id'}
}

import 'server-only'
import {createHash} from 'node:crypto'
import {dealBinary,dealPairs,gradeBinary,gradePair,publicBinary,publicPair,type BinaryReveal,type BinaryRow,type DatedItem,type Mask,type Pair,type PublicBinary,type PublicPair,type Transition} from './blackfile-engine'

/** The server half of the Black File: deal from a seed, mask every key, grade by key. Nothing answer-bearing leaves here. */
export type Source={binary:readonly BinaryRow[];items:readonly DatedItem[]}
export type FileDeal={binary:BinaryRow[];pairs:Pair[]}
export type PublicFile={binary:PublicBinary[];pairs:PublicPair[];/** BF-R07: the real denominator */total:number}
export type SourceRef={title:string;url:string|null;publisher:string}

export function dealFile(src:Source,seed:number,cursor=0):FileDeal{
 return {binary:dealBinary(src.binary,seed,cursor),pairs:dealPairs(src.items,seed,cursor)}
}

/** a keyed, answer-free key: the club, its version and the exact run are folded in, so keys are not portable */
export function maskFor(scope:string):Mask{
 return (kind,id)=>createHash('sha256').update(`${scope}|${kind}|${id}`).digest('hex').slice(0,14)
}

export const scopeOf=(club:string,version:string,seed:number,cursor:number)=>`${club}:${version}:${seed}:${cursor}`

export function publicFile(deal:FileDeal,scope:string):PublicFile{
 const mask=maskFor(scope)
 return {binary:deal.binary.map(r=>publicBinary(r,mask)),pairs:deal.pairs.map(p=>publicPair(p,mask)),total:deal.binary.length+deal.pairs.length}
}

export type OrderReveal={correct:boolean;days:number;earlier:{title:string;on:string;sources:SourceRef[]};later:{title:string;on:string;sources:SourceRef[]}}
export type CrossingReveal=BinaryReveal&{person:string;from:string;to:string;sources:SourceRef[];/** every club, with the move that joins it to the next */moves:{from:string;to:string;loan:boolean;on:string|null;year:number|null}[]}

const refs=(ids:readonly string[]|undefined,lookup:(id:string)=>SourceRef|null):SourceRef[]=>[...new Set(ids??[])].map(lookup).filter((s):s is SourceRef=>s!==null)

export function gradeOrderBy(deal:FileDeal,scope:string,pairKey:string,pickKey:string,lookup:(id:string)=>SourceRef|null):OrderReveal|null{
 const mask=maskFor(scope)
 const pair=deal.pairs.find(p=>mask('pair',`${p.a.id}|${p.b.id}`)===pairKey)
 if(!pair)return null
 const picked=[pair.a,pair.b].find(i=>mask('pair',i.id)===pickKey)
 if(!picked)return null
 const g=gradePair(pair,picked.id)
 if(!g)return null
 return {correct:g.correct,days:g.days,earlier:{title:g.earlier.title,on:g.earlier.on as string,sources:refs(g.earlier.sources,lookup)},later:{title:g.later.title,on:g.later.on as string,sources:refs(g.later.sources,lookup)}}
}

export function gradeCrossingBy(deal:FileDeal,scope:string,key:string,said:string,lookup:(id:string)=>SourceRef|null):CrossingReveal|null{
 const mask=maskFor(scope)
 const row=deal.binary.find(r=>mask('binary',r.id)===key)
 if(!row||(said!=='crossed'&&said!=='did_not'))return null
 const g=gradeBinary(row,said)
 if(!g)return null
 const tr=(t:Transition)=>({from:t.from,to:t.to,loan:t.loan===true,on:t.on??null,year:t.year??null})
 return {...g,person:row.person,from:row.from,to:row.to,moves:g.transitions.map(tr),sources:refs([...g.transitions.flatMap(t=>t.sources),...(row.negativeProof?.sources??[])],lookup)}
}

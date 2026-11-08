export type Evidence = {id:string;summary:string;status:'verified'|'disputed'|'context';links:string[]}
export type DraftBeat = {id:string;text:string;evidence:Evidence[]}
export type Draft = {option:number;title:string;angle?:string;revision:string;chapters:{title:string;beats:DraftBeat[]}[]}
export type Scene = {
 id:string;chapter:string;text:string;seconds:number;visual:string;movement:string
 image?:string;preview?:string;source?:string;label?:string;required?:boolean;alternatives?:string[]
}
export type Review = {
 drafts:Draft[];scenes?:Scene[];plan?:string;issues?:string[];gaps?:string[]
 suggestion?:{option:number;beat:string;before:string;after:string}
}
export type ReviewAction =
 | {action:'editorial_script';option:number;revision:string;edits:Record<string,string>;removed?:string[]}
 | {action:'editorial_rewrite';option:number;revision:string;beat:string;instruction:string}
 | {action:'editorial_combine';opening:number;body:number;ending:number}
 | {action:'editorial_plan';revision:string;images:Record<string,string>;order:string[];approved?:boolean}
 | {action:'editorial_back'}
 | {action:'editorial_refresh'}
 | {action:'editorial_restart';attempt:number}

export function reviewEdits(input:unknown,allowed:Set<string>,limit:number):Record<string,string>{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid editorial changes.')
 const out:Record<string,string>={}
 for(const [key,value] of Object.entries(input)){
  if(!allowed.has(key)||typeof value!=='string'||!value.trim()||value.length>limit)throw new Error('Invalid scene or text.')
  out[key]=value.trim()
 }
 return out
}

/**
 * LIFE display settings — the server's contract for `public/life/voxel/engine.js`'s DISP object.
 * The engine is the authority on what each dial MEANS; this file is the authority on what the admin may SAVE.
 * Pure (no fs, no server-only) so the admin client, the API route and the tests share one definition.
 *
 * Runtime precedence stays the engine's: code defaults → published live config (/life/voxel/display.json) →
 * the player's own choice (localStorage, per key) → ?d.<key> in the URL.
 */
export type DisplayConfig={figure:'human'|'chibi';mirror:boolean;charScale:number;zoom:number;fov:number;azimuth:number;elevation:number;blob:boolean;blobOpacity:number;faces:boolean;idle:boolean;vignette:number;grain:number;exposure:number;warmth:number;quality:'auto'|'low'|'medium'|'high';mood?:Mood}
export type Mood='normal'|'match'|'grief'|'dusk'|'memory'
export type LifeDisplayState={live:DisplayConfig;previous:DisplayConfig|null;draft:DisplayConfig|null;publishedAt:string|null;revision:number}

export const DISPLAY_DEFAULTS:DisplayConfig={figure:'human',mirror:false,charScale:1,zoom:1,fov:20,azimuth:.22,elevation:.24,blob:true,blobOpacity:.3,faces:true,idle:true,vignette:1,grain:1,exposure:1,warmth:0,quality:'auto'}
/** [min, max, step] — the same ranges the engine's controls have always offered. */
export const RANGES={zoom:[.6,1.8,.01],fov:[10,45,1],azimuth:[-.6,.6,.01],elevation:[.05,.6,.01],charScale:[.7,1.5,.01],blobOpacity:[0,.7,.01],exposure:[.6,1.5,.01],warmth:[-1,1,.01],vignette:[0,1.4,.01],grain:[0,3,.05]} as const
export const BOOLEANS=['mirror','blob','faces','idle'] as const
export const ENUMS={figure:['human','chibi'],quality:['auto','low','medium','high'],mood:['normal','match','grief','dusk','memory']} as const
export const DISPLAY_KEYS=[...Object.keys(DISPLAY_DEFAULTS),'mood'] as const

export type ValidationError={key:string;problem:'unknown-key'|'wrong-type'|'out-of-range'|'not-allowed'}
/** Strict: unknown keys, wrong types and out-of-range numbers are REJECTED with the key named — never clamped silently. */
export function validateDisplay(input:unknown,{partial=false}:{partial?:boolean}={}):{ok:true;value:Partial<DisplayConfig>}|{ok:false;errors:ValidationError[]}{
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,errors:[{key:'(root)',problem:'wrong-type'}]}
 const errors:ValidationError[]=[],out:Record<string,unknown>={}
 for(const [k,v] of Object.entries(input as Record<string,unknown>)){
  if(k in RANGES){const [lo,hi]=RANGES[k as keyof typeof RANGES];if(typeof v!=='number'||!Number.isFinite(v)){errors.push({key:k,problem:'wrong-type'});continue}if(v<lo||v>hi){errors.push({key:k,problem:'out-of-range'});continue}out[k]=Math.round(v*1000)/1000;continue}
  if((BOOLEANS as readonly string[]).includes(k)){if(typeof v!=='boolean'){errors.push({key:k,problem:'wrong-type'});continue}out[k]=v;continue}
  if(k in ENUMS){const allowed=ENUMS[k as keyof typeof ENUMS] as readonly string[];if(typeof v!=='string'){errors.push({key:k,problem:'wrong-type'});continue}if(!allowed.includes(v)){errors.push({key:k,problem:'not-allowed'});continue}out[k]=v;continue}
  errors.push({key:k,problem:'unknown-key'})
 }
 if(!partial)for(const k of Object.keys(DISPLAY_DEFAULTS))if(!(k in out))errors.push({key:k,problem:'wrong-type'})
 return errors.length?{ok:false,errors}:{ok:true,value:out as Partial<DisplayConfig>}
}
export const fullConfig=(patch:Partial<DisplayConfig>):DisplayConfig=>({...DISPLAY_DEFAULTS,...patch})
export const emptyDisplay=():LifeDisplayState=>({live:{...DISPLAY_DEFAULTS},previous:null,draft:null,publishedAt:null,revision:0})
/** Keys whose value differs between two configs — what a publish changes, and what the audit records. */
export function changedKeys(a:Partial<DisplayConfig>,b:Partial<DisplayConfig>):string[]{return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>(a as Record<string,unknown>)[k]!==(b as Record<string,unknown>)[k]).sort()}

export function saveDraft(s:LifeDisplayState,patch:Partial<DisplayConfig>):LifeDisplayState{return {...s,draft:fullConfig({...(s.draft||s.live),...patch})}}
export function publish(s:LifeDisplayState,now:string):LifeDisplayState{if(!s.draft)throw new Error('Nothing to publish — save a draft first.');return {live:s.draft,previous:s.live,draft:null,publishedAt:now,revision:s.revision+1}}
export function revert(s:LifeDisplayState,now:string):LifeDisplayState{if(!s.previous)throw new Error('There is no previous version to return to.');return {live:s.previous,previous:s.live,draft:null,publishedAt:now,revision:s.revision+1}}
export function reset(s:LifeDisplayState,now:string):LifeDisplayState{return {live:{...DISPLAY_DEFAULTS},previous:s.live,draft:null,publishedAt:now,revision:s.revision+1}}
/** What the public file serves: the live config only — never the draft, the previous version or the audit. */
/** Live only, and only once something was published (revision > 0): until then the engine keeps its own defaults. */
export const publicDisplay=(s:LifeDisplayState|undefined):Partial<DisplayConfig>=>s&&s.revision>0?{...s.live}:{}

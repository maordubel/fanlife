import {POSITIONS,RATING_MAX,RATING_MIN,type Patch,type Pos,type Price} from './types'
/** The whitelist: unknown keys are refused by name, never ignored and never applied. */
const KEYS=new Set(['price','positions','rating','reputation','name','removed','mergedInto','note'])
export type Parsed={ok:true;patch:Patch}|{ok:false;error:string}
export function parsePatch(input:unknown):Parsed{
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,error:'patch must be an object'}
 const o=input as Record<string,unknown>,out:Patch={}
 for(const k of Object.keys(o))if(!KEYS.has(k))return {ok:false,error:`field "${k}" cannot be edited`}
 if('price' in o){const v=o.price;if(v===null)out.price=null;else if(Number.isInteger(v)&&(v as number)>=1&&(v as number)<=5)out.price=v as Price;else return {ok:false,error:'price must be a whole number from 1 to 5 (€M)'}}
 if('positions' in o){const v=o.positions;if(v===null)out.positions=null;else if(Array.isArray(v)&&v.length<=4&&v.every(x=>POSITIONS.includes(x as Pos))&&new Set(v).size===v.length)out.positions=v as Pos[];else return {ok:false,error:'positions must be a list of distinct GK / DF / MF / FW'}}
 if('rating' in o){const v=o.rating;if(v===null)out.rating=null;else if(Number.isInteger(v)&&(v as number)>=RATING_MIN&&(v as number)<=RATING_MAX)out.rating=v as number;else return {ok:false,error:`rating must be a whole number from ${RATING_MIN} to ${RATING_MAX}`}}
 if('reputation' in o){const v=o.reputation;if(v===null)out.reputation=null;else if(Number.isInteger(v)&&(v as number)>=RATING_MIN&&(v as number)<=RATING_MAX)out.reputation=v as number;else return {ok:false,error:`reputation must be a whole number from ${RATING_MIN} to ${RATING_MAX}`}}
 if('name' in o){const v=o.name;if(v===null)out.name=null;else if(typeof v==='string'){const t=v.trim().replace(/\s+/g,' ');if(t.length>=2&&t.length<=80&&/\p{L}/u.test(t)&&!/[<>{}\u0000-\u001f]/u.test(t))out.name=t;else return {ok:false,error:'a name is 2–80 characters with at least one letter and no markup'}}else return {ok:false,error:'name must be text'}}
 if('removed' in o){const v=o.removed;if(v===null||typeof v==='boolean')out.removed=v;else return {ok:false,error:'removed must be true, false or null'}}
 if('mergedInto' in o){if(o.mergedInto===null)out.mergedInto=null;else return {ok:false,error:'a merge is made with the merge action, not by editing a field'}}
 if('note' in o){const v=o.note;if(v===null)out.note=null;else if(typeof v==='string'&&v.length<=500)out.note=v;else return {ok:false,error:'note must be text of at most 500 characters'}}
 if(!Object.keys(out).length)return {ok:false,error:'nothing to change'}
 return {ok:true,patch:out}
}

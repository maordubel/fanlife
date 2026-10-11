import type {Query} from './service'
const list=(v:string|null)=>v?v.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12):undefined
/** Every parameter is validated here; an unknown sort or status falls back to the default, never reaches the service as typed. */
export function queryFrom(sp:URLSearchParams):Query{
 const sort=['club','name','price','rating','years','updated'].includes(sp.get('sort')??'')?sp.get('sort')!:'club'
 const status=['missing-position','overridden','draft','removed','merged','fallback-price','locked','wave','archive'].includes(sp.get('status')??'')?sp.get('status')!:undefined
 const positions=list(sp.get('position'))?.filter(p=>['GK','DF','MF','FW','unknown'].includes(p)),prices=list(sp.get('price'))?.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=5)
 const decade=/^(\d{4}s|unknown)$/.test(sp.get('decade')??'')?sp.get('decade')!:undefined
 return {clubs:list(sp.get('club')),q:(sp.get('q')??'').slice(0,80)||undefined,positions,prices,status,decade,sort,dir:sp.get('dir')==='desc'?'desc':'asc',page:Number(sp.get('page'))||1,limit:Number(sp.get('limit'))||60}
}

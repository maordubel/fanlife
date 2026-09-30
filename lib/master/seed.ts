import {CLUB} from '@/lib/club/context'
import type {State,Club} from './types'
import {REGISTRY} from './registry'
import sources from '@/club-packs/zrinjski-mostar/sources.json'
export function seedState():State{return{schemaVersion:1,revision:0,jobs:[],audit:[],upstream:null,clubs:[
{id:CLUB.id,name:CLUB.names.en,city:CLUB.city.en,country:'Israel',initials:'HT',primary:'#B02D10',secondary:'#FFFFFF',status:'live',version:1,gates:Array.from({length:13},(_,i)=>i+1),sources:[],findings:[],gaps:['The native game UI and historical dialogue retain the original Hebrew.']},
{id:'zrinjski-mostar',name:'Zrinjski Mostar',city:'Mostar',country:'Bosnia and Herzegovina',initials:'ZM',primary:'#C92D39',secondary:'#FFFFFF',status:'review',version:1,gates:[],sources:sources.map(s=>({id:s.id,title:s.title,url:s.url,excerpt:'Source supplied in the English Zrinjski pack. Review before approval.',reviewed:false,retrievedAt:'2026-09-29T00:00:00Z'})),findings:[],gaps:['Adapt the supplied English pack to native engine schemas.','Verify historical facts, gameplay coverage and media rights.']},
...REGISTRY.filter(r=>r.id!==CLUB.id&&r.id!=='zrinjski-mostar').map((r):Club=>({id:r.id,name:r.name,city:r.city,country:r.country,initials:r.initials,primary:r.primary,secondary:'#FFFFFF',status:'research',version:1,gates:[],sources:[],findings:[],gaps:['Research, evidence review and native content adapter required.']}))
]}}
export const playable=(club:Club)=>club.id===CLUB.id&&club.status==='live'

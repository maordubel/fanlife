import 'server-only'
import {patchSettings,type LegendsSettings} from './config'
import {ATTR_LABEL,quarter,readControl,ROLE_ATTRS,type RatingControl} from './ratings'
import {allCatalogs,catalogFor} from './server'
import {readLegendsSettings,readRatingControl,writeLegendsSettings,writeRatingControl} from './store'

/**
 * The control room's handles on LEGENDS MANAGER (owner, 12.10.2026: "give me control over the rating"):
 *  · settings — the rulebook's [PROPOSED] values (§9), each changed by name and refused when out of range
 *  · club calibration — shift a whole club by up to one star either way
 *  · one man — pin his stars and any attribute, with a note; clear the pin to go back to the measured value
 * A new career freezes the values of its kick-off: a change here never rewrites a season already being played (S05).
 */
export async function legendsPlayers(club:string,q:string,limit=40){
 const r=await catalogFor(club);if(!r)return {club,players:[],total:0}
 const ctl=await readRatingControl(),needle=q.trim().toLowerCase()
 const all=r.catalog.cards.filter(c=>!needle||c.name.toLowerCase().includes(needle)).sort((a,b)=>b.stars-a.stars||a.name.localeCompare(b.name))
 return {club,total:all.length,offset:ctl.clubs[club]?.offset??0,players:all.slice(0,limit).map(c=>({id:c.id,name:c.name,pos:c.pos,price:c.price,stars:c.stars,attrs:c.attrs,from:c.from,to:c.to,pin:ctl.players[`${club}:${c.id}`]??null}))}
}
export async function legendsOverview(){
 const [cats,ctl,settings]=await Promise.all([allCatalogs(),readRatingControl(),readLegendsSettings()])
 return {settings,clubs:cats.map(({catalog})=>{const s=catalog.cards.map(c=>c.stars),avg=s.reduce((a,b)=>a+b,0)/Math.max(1,s.length);return {club:catalog.club,name:catalog.clubName,men:s.length,avgStars:Math.round(avg*100)/100,fiveStars:s.filter(x=>x>=4.75).length,offset:ctl.clubs[catalog.club]?.offset??0,pins:Object.keys(ctl.players).filter(k=>k.startsWith(`${catalog.club}:`)).length}}),attrs:ROLE_ATTRS,labels:ATTR_LABEL}
}
type Body=Record<string,unknown>
export async function legendsAdminPost(a:string,b:Body):Promise<{result:unknown;audit:{what:string;target:string;detail:string;before:string;after:string}}>{
 if(a==='legends/settings'){
  const cur=await readLegendsSettings(),v=patchSettings(cur,b.patch);if(!v.ok)throw new Error(v.error)
  const next=await writeLegendsSettings(()=>v.settings)
  return {result:next,audit:{what:'legends.settings',target:'global',detail:Object.keys(b.patch as object).join(', '),before:JSON.stringify(cur),after:JSON.stringify(next satisfies LegendsSettings)}}
 }
 if(a==='legends/ratings'){
  const club=typeof b.club==='string'&&/^[a-z0-9-]{2,60}$/.test(b.club)?b.club:null;if(!club)throw new Error('Choose a club.')
  if(!await catalogFor(club))throw new Error('Unknown club.')
  const before=await readRatingControl()
  let next:RatingControl
  if(b.op==='club-offset'){
   if(typeof b.offset!=='number'||b.offset<-1||b.offset>1)throw new Error('A club shift is between −1 and +1 star.')
   next=await writeRatingControl(cur=>{const clubs={...cur.clubs};if(b.offset===0)delete clubs[club];else clubs[club]={offset:quarter((b.offset as number)+3)-3};return {...cur,clubs,updatedAt:new Date().toISOString()}})
  }else if(b.op==='player'||b.op==='clear-player'){
   const id=typeof b.id==='string'&&b.id.length<=200?b.id:null;if(!id)throw new Error('Choose a player.')
   const r=await catalogFor(club);if(!r!.catalog.cards.some(c=>c.id===id))throw new Error('That man is not in this club’s Legends pool.')
   const key=`${club}:${id}`
   next=await writeRatingControl(cur=>{
    const players={...cur.players}
    if(b.op==='clear-player')delete players[key]
    else{const row=readControl({players:{[key]:{stars:b.stars,attrs:b.attrs,note:b.note}}}).players[key];if(!row)throw new Error('Stars are 1–5 in quarters; attributes too.');players[key]=row}
    return {...cur,players,updatedAt:new Date().toISOString()}
   })
  }else throw new Error('Unknown rating operation.')
  return {result:next,audit:{what:`legends.ratings.${String(b.op)}`,target:club,detail:typeof b.id==='string'?b.id:`offset ${String(b.offset)}`,before:JSON.stringify({clubs:before.clubs[club]??null,player:typeof b.id==='string'?before.players[`${club}:${b.id}`]??null:undefined}),after:JSON.stringify({clubs:next.clubs[club]??null,player:typeof b.id==='string'?next.players[`${club}:${b.id}`]??null:undefined})}}
 }
 throw new Error('Unknown Legends operation.')
}

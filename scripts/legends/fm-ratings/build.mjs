// LEGENDS · manager ratings (18.11.2026). Builds content/manual/legends-fm-ratings.json from the owner's research pack
// (FanLife-Manager-Ratings/manager-ratings.json: community FM 2008–2023 exports and CM 97/98–03/04 databases, matched to FanLife
// ids, plus cohort estimates where no game data exists).
//
//   node scripts/legends/fm-ratings/build.mjs <path to manager-ratings.json>
//
// What it keeps, per FanLife man: ONE profile of 1–20 attributes in FM's three groups (+ goalkeeping), the edition it came from,
// and how complete it is. It never mixes two men: a profile matched by name only counts only when its edition falls inside his
// years at the club; a profile matched by name AND date of birth is the same man at another stage, so the edition nearest his
// years at the club wins (and, inside those years, his best one). Gaps are filled from his own other editions first, then from
// the pack's estimate for him, then from the median of men in his role — and the share filled is recorded.
// The numbers are RAW here. The game scales them to the man's stars at read time (lib/legends/fm.ts), so every club stays level.
import {readFileSync,writeFileSync} from 'node:fs'
const src=process.argv[2];if(!src)throw new Error('usage: build.mjs <manager-ratings.json>')
const d=JSON.parse(readFileSync(src,'utf8').replace(/^﻿/,''))
export const KEYS=['Corners','Crossing','Dribbling','Finishing','First Touch','Free Kick Taking','Heading','Long Shots','Long Throws','Marking','Passing','Penalty Taking','Tackling','Technique',
 'Aggression','Anticipation','Bravery','Composure','Concentration','Decisions','Determination','Flair','Leadership','Off the Ball','Positioning','Teamwork','Vision','Work Rate',
 'Acceleration','Agility','Balance','Jumping Reach','Natural Fitness','Pace','Stamina','Strength',
 'Aerial Reach','Command of Area','Communication','Eccentricity','Handling','Kicking','One on Ones','Reflexes','Rushing Out','Tendency to Punch','Throwing']
const GK_ONLY=new Set(KEYS.slice(36))
const W=Object.fromEntries(Object.entries(d.calibration).filter(([k])=>k!=='unknown').map(([k,v])=>[k,v.weights]))
const prof=new Map(d.profiles.map(p=>[p.key,p])),est=new Map(d.estimates.map(e=>[e.player_id,e]))
const matches=new Map();for(const m of d.matches){if(!matches.has(m.player_id))matches.set(m.player_id,[]);matches.get(m.player_id).push(m)}
const roleOf=p=>['GK','DF','MF','FW'].includes(p.position_group)?p.position_group:null
const vals=a=>{const o={};for(const k of KEYS){const v=a?.[k];if(typeof v==='number'&&v>=0&&v<=20)o[k]=Math.max(1,Math.round(v))}
 // CM 97/98 had Creativity and Shooting; the pack already reads Creativity as Vision — Shooting stands in for Long Shots where absent
 if(o['Long Shots']===undefined&&typeof a?.['Shooting (CM97)']==='number')o['Long Shots']=Math.max(1,Math.round(a['Shooting (CM97)']));return o}
const keyAvg=(o,role)=>{const w=W[role]??W.MF;let s=0,n=0;for(const [k,x] of Object.entries(w))if(o[k]!==undefined){s+=o[k]*x;n+=x}return n?s/n:null}
// the median man of each role, from every profile the pack observed — the last resort for a gap
const byRole={GK:[],DF:[],MF:[],FW:[]}
for(const p of d.players){const r=roleOf(p);if(!r)continue;for(const m of matches.get(p.id)??[]){const pr=prof.get(m.profile_key);if(pr)byRole[r].push(vals(pr.attributes))}}
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]}
const MEDIAN=Object.fromEntries(Object.entries(byRole).map(([r,list])=>[r,Object.fromEntries(KEYS.map(k=>[k,median(list.map(o=>o[k]).filter(x=>x!==undefined))]))]))
const window=p=>{const ys=(p.years??[]).filter(y=>y>1850&&y<2100);return ys.length?[Math.min(...ys),Math.max(...ys)]:null}
const enc=o=>KEYS.map(k=>o[k]===undefined?'.':String.fromCharCode(64+o[k])).join('') // A=1 … T=20, '.' = not kept
const out={generatedAt:new Date().toISOString().slice(0,10),
 source:'Owner research pack 18.11.2026 (FanLife-Manager-Ratings): community exports of Football Manager 2008–2023 and Championship Manager 97/98, 01/02 (3.9.60, 3.9.68) and 03/04 databases, matched to FanLife ids by name, alias and date of birth; cohort estimates where no game data exists. Not certified by Sports Interactive.',
 rule:'one profile per man; name-only matches count inside his years at the club only; date-of-birth matches take the edition nearest his years at the club (his best inside them); gaps filled from his own editions, then his estimate, then the role median; values are raw 1–20 and scaled to his stars in the game',
 keys:KEYS,men:{},medians:{}}
const ids=p=>[...new Set(p.database_ids.filter(i=>!/^(roster-title|research|obs:|ea-person|AHLY-|WYDAD-|RA-0)/.test(i)).flatMap(i=>i.includes(':')?[i]:[`${p.club}:${i}`,i]))]
let obs=0,partial=0,estimated=0,rejected=0
for(const p of d.players){
 const role=roleOf(p)??'MF',win=window(p),cands=[]
 for(const m of matches.get(p.id)??[]){
  const pr=prof.get(m.profile_key);if(!pr)continue
  const y=pr.edition_year,inWin=win?y>=win[0]-2&&y<=win[1]+4:null
  if(m.identity_method!=='name_alias_and_matching_dob'&&inWin===false){rejected++;continue}
  const o=vals(pr.attributes);if(Object.keys(o).length<20)continue
  const dist=win?(inWin?0:Math.min(Math.abs(y-win[0]),Math.abs(y-win[1]))):0
  cands.push({o,ed:pr.edition,y,dist,k:keyAvg(o,role)??0})
 }
 cands.sort((a,b)=>a.dist-b.dist||b.k-a.k)
 const best=cands[0],e=est.get(p.id)
 let o,kind,ed=null,filled=0
 if(best){o={...best.o};ed=best.ed;kind='o'
  for(const k of KEYS){if(o[k]!==undefined||(GK_ONLY.has(k)&&role!=='GK'))continue
   const alt=cands.slice(1).find(c=>c.o[k]!==undefined)?.o[k]??(typeof e?.attributes?.[k]==='number'?e.attributes[k]:undefined)??MEDIAN[role][k]
   if(alt!=null){o[k]=Math.round(alt);filled++}}
  if(filled>8)kind='p'}
 else if(e){o=vals(e.attributes);kind='e'
  for(const k of KEYS)if(o[k]===undefined&&!(GK_ONLY.has(k)&&role!=='GK')&&MEDIAN[role][k]!=null)o[k]=MEDIAN[role][k]}
 else continue
 if(role!=='GK')for(const k of GK_ONLY)delete o[k]
 const row={r:role,v:enc(o),k:Math.round((keyAvg(o,role)??10)*100)/100,s:kind,...(ed?{e:ed}:{}),...(filled?{f:filled}:{})}
 kind==='o'?obs++:kind==='p'?partial++:estimated++
 // the same FanLife id can sit on two pack rows (a duplicate record): the better-sourced one wins — game data over a partial over an estimate
 const rank={o:0,p:1,e:2}
 for(const i of ids(p)){const was=out.men[i];if(!was||rank[row.s]<rank[was.s]||rank[row.s]===rank[was.s]&&row.k>was.k)out.men[i]=row}
}
for(const r of Object.keys(MEDIAN)){const o={};for(const k of KEYS)if(MEDIAN[r][k]!=null&&!(GK_ONLY.has(k)&&r!=='GK'))o[k]=MEDIAN[r][k];out.medians[r]={v:enc(o),k:Math.round(keyAvg(o,r)*100)/100}}
out.counts={observed:obs,partial,estimated,rejectedNameOnly:rejected}
writeFileSync('content/manual/legends-fm-ratings.json',JSON.stringify(out))
console.log(JSON.stringify(out.counts),Object.keys(out.men).length,'ids')

/**
 * THE SUPPORTER'S XI — personal prints (owner, 14–15.11.2026: "after building his XI, offer him a framed print / poster …
 * use each player's kit SVG for his era … 3–5 templates for him to choose … and a shirt").
 * Drawn for satori (next/og): flex boxes and absolute positions only. Every sheet is designed in its own units and drawn at
 * any scale `k` — the proof at k=0.6, the print at k=3.
 * Each man wears the club's documented kit nearest his years: our own kit drawing (public/club-kits/<club>/svg), with the
 * crest picture and the sponsor's word taken out for print (an official mark is not ours to sell). A club without drawings
 * gets the kit plate in the kit's colours. The club's colour is the only accent; a colour its rivalry bans never appears.
 */
import {visual as bidi} from '@/lib/og/bidi'
/** Hebrew in visual order for the renderer; Latin untouched (the reorder marks would knock a face off its glyphs) */
const visual=(t:string)=>/[\u0590-\u05FF]/.test(t)?bidi(t):t

export const TEMPLATES=['touchline','archive','night','kits','dream'] as const
export type Template=(typeof TEMPLATES)[number]
export type Man={x:number;y:number;name:string;cap?:boolean
 /** his kit: design and two colours (hex) — for the plate when the club has no drawing */
 k?:{d:string;a:string;b:string|null}
 /** the drawing's file id under public/club-kits/<club>/svg, and the kit's season */
 u?:string;s?:string
 /** the club whose drawing it is, when not the sheet's own (a closet holds shirts of every club) */
 cl?:string}
export type XIPrintSpec={
 /** club id, display name, colour */
 c:string;cn:string;col:string
 /** formation */
 f:string
 n:Man[]
 /** the 12th man, the manager (the supporter's own name, if he chose), the date picked (dd.mm.yyyy) */
 t?:string|null;m?:string|null;d:string
 /** the template he chose; and which colour families the club may print: green, blue (rule 95) */
 v?:Template;g?:boolean;b?:boolean
}
/** the turf and the sky of the prints: a club whose rivalry bans their family prints neither (rule 95) */
export const PROBE={green:'#3E5A3C',blue:'#3A8FC4'}
export type Layout='print'|'tee-back'|'tee-front'|'tee-proof'
/** the sheet of each layout, in design units */
export const SHEET:Record<Layout,{w:number;h:number}>={print:{w:1200,h:1600},'tee-back':{w:1200,h:1400},'tee-front':{w:1200,h:1200},'tee-proof':{w:1200,h:1600}}

export const INK='#15130F',CREAM='#F7F0E1'
const rgb=(hex:string)=>{const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);return [n>>16&255,n>>8&255,n&255] as const}
export const light=(hex:string)=>{const [r,g,b]=rgb(hex);return 0.299*r+0.587*g+0.114*b>170}
export const mix=(hex:string,to:string,t:number)=>{const a=rgb(hex),b=rgb(to);return '#'+a.map((x,i)=>Math.round(x+(b[i]!-x)*t).toString(16).padStart(2,'0')).join('')}
/** the accent that reads on a light sheet: the club colour, deepened when it is pale (white, sky) */
export const inkOf=(col:string)=>light(col)?mix(col,INK,.55):mix(col,INK,.12)

const BODY='M82 18 L120 6 Q170 28 220 6 L258 18 L312 74 L282 110 L252 92 L252 300 L88 300 L88 92 L58 110 L28 74 Z'
/** the kit plate (components/clubs/games/KitPlate) in hex, for a club without kit drawings */
function Plate({kit,col,w,id}:{kit?:Man['k'];col:string;w:number;id:string}){
 const a=kit?.a??col,b=kit?.b||(light(a)?INK:CREAM),d=(kit?.d||'').toLowerCase()
 return <svg width={w} height={Math.round(w*320/340)} viewBox="0 0 340 320"><defs><clipPath id={id}><path d={BODY}/></clipPath></defs>
  <g clipPath={`url(#${id})`}><rect width="340" height="320" fill={a}/>
   {d.includes('hoop')&&Array.from({length:6},(_,i)=><rect key={i} x="0" y={20+i*48} width="340" height="24" fill={b}/>)}
   {d.includes('stripe')&&!d.includes('pinstripe')&&Array.from({length:6},(_,i)=><rect key={i} x={30+i*52} y="0" width="26" height="320" fill={b}/>)}
   {d.includes('check')&&Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8);return (x+y)%2===0?<rect key={i} x={28+x*35} y={y*52} width="35" height="52" fill={b}/>:null})}
   {d.includes('half')&&<rect x="170" y="0" width="170" height="320" fill={b}/>}
   {d.includes('sash')&&<polygon points="60,40 130,40 290,300 220,300" fill={b}/>}
   {d.includes('pinstripe')&&Array.from({length:14},(_,i)=><rect key={i} x={20+i*22} y="0" width="4" height="320" fill={b}/>)}
   {d.includes('quarter')&&[<rect key="q1" x="170" y="0" width="170" height="160" fill={b}/>,<rect key="q2" x="0" y="160" width="170" height="160" fill={b}/>]}
   {d.includes('chest band')&&<rect x="0" y="120" width="340" height="56" fill={b}/>}
   {d.includes('shoulder')&&[<polygon key="s1" points="82,18 150,8 120,70 40,90 28,74" fill={b}/>,<polygon key="s2" points="258,18 190,8 220,70 300,90 312,74" fill={b}/>]}
   {(!d||d==='plain')&&[<path key="c" d="M120 6 Q170 40 220 6" fill="none" stroke={b} strokeWidth="16"/>,<path key="w" d="M28 74 L58 110 M312 74 L282 110" stroke={b} strokeWidth="18"/>]}
  </g>
  <path d={BODY} fill="none" stroke={INK} strokeWidth="9" strokeLinejoin="round"/></svg>
}
/** one man's shirt in a box w wide: the drawing (cropped to the shirt alone, 340×300) or the plate — never shorts or socks */
export function Kit({p,i,w,col,art}:{p:Man;i:number;w:number;col:string;art:Record<number,string>}){
 const sw=Math.round(w*1.12),h=Math.round(sw*300/340)
 // eslint-disable-next-line @next/next/no-img-element
 return <div style={{display:'flex',width:sw,height:h,alignItems:'center',justifyContent:'center'}}>{art[i]?<img src={art[i]} width={sw} height={h} alt=""/>:<Plate kit={p.k} col={col} w={Math.round(sw*.94)} id={`k${i}`}/>}</div>
}
/** the lines of the formation, attack first: men grouped by depth, each line left to right */
export function linesOf(n:Man[]):Man[][]{
 const ys=[...new Set(n.map(p=>Math.round(p.y/4)))].sort((a,b)=>a-b)
 return ys.map(y=>n.filter(p=>Math.round(p.y/4)===y).sort((a,b)=>a.x-b.x))
}
const seasons=(n:Man[])=>{const ys=n.map(p=>p.s?parseInt(p.s,10):NaN).filter(Number.isFinite);return ys.length?[Math.min(...ys),Math.max(...ys)+1]:null}

type P={spec:XIPrintSpec;k:number;seal:string;art:Record<number,string>}
const heads=(spec:XIPrintSpec,a:string,b:string,mb='ALL-TIME XI.'):[string,string]=>{const m=(spec.m||'').trim();return m?[`${m.toUpperCase()}’S`,mb]:[a,b]}

/** a pitch print (touchline · night): the sheet, the masthead, the headline, the pitch with each man by his place, the foot */
function PitchSheet({spec,k,art,night}:P&{night:boolean}){
 const u=(n:number)=>Math.round(n*k),acc=night?mix(spec.col,'#FFFFFF',light(spec.col)?0:.42):inkOf(spec.col)
 const paper=night?'#1D232C':'#F4ECDD',ink=night?CREAM:INK,mute=night?'rgba(247,240,225,.7)':'rgba(21,19,15,.62)'
 const green=spec.g!==false&&!night,turf=night?['#26303B','#2B3642']:green?['#3E5A3C','#365236']:['#EFE5CF','#E8DCC2']
 const chalk=night||green?'rgba(247,240,225,.55)':'rgba(21,19,15,.32)',onTurf=night||green?CREAM:INK
 const [h1,h2]=heads(spec,night?'MY XI.':'THE ONES',night?'UNDER LIGHTS.':'I’D PICK.',night?'XI. UNDER LIGHTS.':'ALL-TIME XI.'),cap=spec.n.find(p=>p.cap)?.name
 const mono={fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(5),textTransform:'uppercase' as const,display:'flex'}
 const PW=1040,PH=960,KW=112
 return <div style={{width:u(1200),height:u(1600),display:'flex',flexDirection:'column',background:paper,padding:`${u(70)}px ${u(80)}px`}}>
  <div style={{display:'flex',justifyContent:'space-between'}}><div style={{...mono,fontSize:u(24),color:acc}}>Fan Life</div><div style={{...mono,fontSize:u(24),color:ink}}>All-time XI / {spec.f}</div></div>
  <div style={{height:u(2),background:mute,marginTop:u(26),display:'flex'}}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(36)}}>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(h1.length>12?92:118),lineHeight:0.92,letterSpacing:u(-5),color:ink,display:'flex'}}>{h1}</div>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(118),lineHeight:0.98,letterSpacing:u(-5),color:acc,display:'flex'}}>{h2}</div>
   <div style={{...mono,fontSize:u(26),color:ink,marginTop:u(24)}}>{spec.cn}</div>
  </div>
  <div style={{position:'relative',display:'flex',overflow:'hidden',width:u(PW),height:u(PH),marginTop:u(34),border:`${u(2)}px solid ${chalk}`}}>
   {[0,1,2,3,4,5,6,7].map(i=><div key={i} style={{position:'absolute',left:0,top:u(i*PH/8),width:'100%',height:u(PH/8)+1,background:turf[i%2],display:'flex'}}/>)}
   <div style={{position:'absolute',left:0,top:u(PH/2),width:'100%',height:u(2),background:chalk,display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-80),top:u(PH/2-80),width:u(160),height:u(160),borderRadius:u(80),border:`${u(2)}px solid ${chalk}`,display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-150),top:-u(2),width:u(300),height:u(110),border:`${u(2)}px solid ${chalk}`,display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-150),top:u(PH-108),width:u(300),height:u(110),border:`${u(2)}px solid ${chalk}`,display:'flex'}}/>
   {spec.n.map((p,i)=>{const cx=Math.min(PW-100,Math.max(100,p.x/100*PW)),cy=(p.y-12)/84*(PH-230)+14
    return <div key={i} style={{position:'absolute',left:u(cx-96),top:u(cy),width:u(192),display:'flex',flexDirection:'column',alignItems:'center'}}>
     <Kit p={p} i={i} w={u(KW)} col={spec.col} art={art}/>
     <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(p.name.length>16?20:23),lineHeight:1.1,color:onTurf,marginTop:u(4),display:'flex',justifyContent:'center',textAlign:'center',width:u(188),textShadow:night||green?`0 ${u(2)}px ${u(3)}px rgba(0,0,0,.55)`:'none'}}>{visual(p.name)}</div>
     {p.cap?<div style={{display:'flex',marginTop:u(3),padding:`0 ${u(6)}px`,background:acc,color:night?INK:CREAM,fontFamily:'Heebo',fontWeight:800,fontSize:u(16)}}>C</div>:null}
     {p.s?<div style={{...mono,letterSpacing:u(1),fontSize:u(17),color:night||green?'rgba(247,240,225,.85)':mute,marginTop:u(2)}}>{p.s}</div>:null}
    </div>})}
  </div>
  <div style={{height:u(2),background:mute,marginTop:'auto',display:'flex'}}/>
  <div style={{display:'flex',justifyContent:'space-between',marginTop:u(20)}}>
   <div style={{...mono,fontSize:u(22),color:acc}}>The supporter’s XI</div>
   <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
    {cap?<div style={{...mono,fontSize:u(22),color:ink}}>Captain · {visual(cap)}</div>:null}
    {spec.t?<div style={{...mono,fontSize:u(20),color:ink,marginTop:u(6)}}>12th man · {visual(spec.t)}</div>:null}
    {spec.m?<div style={{...mono,fontSize:u(20),color:acc,marginTop:u(6)}}>Manager · {spec.m}</div>:null}
   </div>
  </div>
 </div>
}

/** CLUB ARCHIVE: a sepia programme page, the serif headline, each line of the team on its own ruled row */
function ArchiveSheet({spec,k,art}:P){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),brown='#6B4A2E',rule='rgba(107,74,46,.45)',cap=spec.n.find(p=>p.cap)?.name
 const [h1,h2]=heads(spec,'THE','ALL-TIME XI.')
 const mono={fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(5),textTransform:'uppercase' as const,display:'flex'}
 const lines=linesOf(spec.n)
 return <div style={{width:u(1200),height:u(1600),display:'flex',flexDirection:'column',background:'#F3E6CD',padding:`${u(70)}px ${u(80)}px`}}>
  <div style={{display:'flex',justifyContent:'space-between'}}><div style={{...mono,fontSize:u(24),color:acc}}>Fan Life</div><div style={{...mono,fontSize:u(24),color:INK}}>All-time XI / {spec.f}</div></div>
  <div style={{height:u(2),background:rule,marginTop:u(26),display:'flex'}}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(40)}}>
   <div style={{fontFamily:'FrankL, Frank, Heebo, HeeboX',fontWeight:900,fontSize:u(h1.length>12?96:124),lineHeight:0.9,color:INK,display:'flex'}}>{h1}</div>
   <div style={{fontFamily:'FrankL, Frank, Heebo, HeeboX',fontWeight:900,fontSize:u(124),lineHeight:0.98,color:acc,display:'flex'}}>{h2}</div>
   <div style={{...mono,fontSize:u(26),color:INK,marginTop:u(26)}}>{spec.cn}</div>
  </div>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(30),borderTop:`${u(2)}px solid ${rule}`}}>
   {lines.map((line,r)=><div key={r} style={{display:'flex',justifyContent:'center',borderBottom:`${u(2)}px solid ${rule}`,padding:`${u(16)}px 0`}}>
    {line.map(p=>{const i=spec.n.indexOf(p);return <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',width:u(250)}}>
     <Kit p={p} i={i} w={u(104)} col={spec.col} art={art}/>
     <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(p.name.length>16?20:23),color:INK,marginTop:u(4),display:'flex'}}>{visual(p.name)}</div>
     {p.cap?<div style={{display:'flex',marginTop:u(3),padding:`0 ${u(6)}px`,background:acc,color:CREAM,fontFamily:'Heebo',fontWeight:800,fontSize:u(16)}}>C</div>:null}
     {p.s?<div style={{...mono,letterSpacing:u(1),fontSize:u(17),color:brown,marginTop:u(2)}}>{p.s}</div>:null}
    </div>})}
   </div>)}
  </div>
  <div style={{height:u(2),background:rule,marginTop:'auto',display:'flex'}}/>
  <div style={{display:'flex',justifyContent:'space-between',marginTop:u(20)}}>
   <div style={{...mono,fontSize:u(22),color:acc}}>The supporter’s XI</div>
   <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
    {cap?<div style={{...mono,fontSize:u(22),color:INK}}>Captain · {visual(cap)}</div>:null}
    {spec.t?<div style={{...mono,fontSize:u(20),color:INK,marginTop:u(6)}}>12th man · {visual(spec.t)}</div>:null}
    {spec.m?<div style={{...mono,fontSize:u(20),color:acc,marginTop:u(6)}}>Manager · {spec.m}</div>:null}
   </div>
  </div>
 </div>
}

/** THE KIT COLLECTION: "Eleven kits. One club." — eleven framed cells, each man's shirt of his day */
function KitsSheet({spec,k,art}:P){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),line='rgba(107,74,46,.55)',yr=seasons(spec.n)
 const mono={fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(5),textTransform:'uppercase' as const,display:'flex'}
 const order=linesOf(spec.n).flat(),m=(spec.m||'').trim()
 const cell=(p:Man,wide:boolean)=>{const i=spec.n.indexOf(p);return <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:u(wide?676:330),height:u(226),border:`${u(2)}px solid ${line}`,background:'#F8EEDC',margin:u(8)}}>
  <Kit p={p} i={i} w={u(112)} col={spec.col} art={art}/>
  <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(p.name.length>16?20:23),color:INK,marginTop:u(4),display:'flex'}}>{visual(p.name)}{p.cap?' (C)':''}</div>
  {p.s?<div style={{...mono,letterSpacing:u(1),fontSize:u(16),color:'#6B4A2E'}}>{p.s}</div>:null}
 </div>}
 return <div style={{width:u(1200),height:u(1600),display:'flex',flexDirection:'column',background:'#EFE1C6',padding:`${u(64)}px ${u(80)}px`}}>
  <div style={{...mono,fontSize:u(22),color:INK}}>Fan Life / {spec.cn}</div>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(26)}}>
   <div style={{fontFamily:'FrankL, Frank, Heebo, HeeboX',fontWeight:900,fontSize:u(110),lineHeight:0.9,color:acc,display:'flex'}}>{m?`${m}’s eleven.`:'Eleven kits.'}</div>
   <div style={{fontFamily:'FrankL, Frank, Heebo, HeeboX',fontWeight:900,fontSize:u(110),lineHeight:0.98,color:acc,display:'flex'}}>One club.</div>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',width:u(1050),marginTop:u(26),marginLeft:u(-8)}}>
   {order.map((p,j)=>cell(p,j===10))}
  </div>
  <div style={{height:u(2),background:line,marginTop:'auto',display:'flex'}}/>
  <div style={{display:'flex',justifyContent:'space-between',marginTop:u(18)}}>
   <div style={{...mono,fontSize:u(20),color:INK}}>The all-time XI{yr?` · ${yr[0]}–${yr[1]}`:''} · {spec.f}</div>
   <div style={{...mono,fontSize:u(20),color:acc}}>The supporter’s XI</div>
  </div>
 </div>
}

/** MY DREAM TEAM: for the youngest supporters — a sticker album page, cards slightly askew, the captain's card big */
function DreamSheet({spec,k,art}:P){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),m=(spec.m||'').trim()
 const bg=spec.b===false?'#F3ECDC':'#D9EEF5',tints=['#FBF3DD',mix(spec.col,'#FFFFFF',.8),spec.g===false?'#ECE6DA':'#DCEFD6']
 const order=linesOf(spec.n).flat(),capI=Math.max(0,order.findIndex(p=>p.cap)),cards=[order[capI]!,...order.filter((_,j)=>j!==capI)]
 const mono={fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(4),textTransform:'uppercase' as const,display:'flex'}
 const tilt=[-2,1.5,-1,2,-1.5,1,-2,1.5,-1,2,-1.5]
 return <div style={{width:u(1200),height:u(1600),display:'flex',flexDirection:'column',alignItems:'center',background:bg,padding:`${u(56)}px ${u(64)}px`}}>
  <div style={{...mono,fontSize:u(22),color:INK}}>Fan Life / {spec.cn}</div>
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:u(22),transform:'rotate(-3deg)'}}>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(m&&m.length>9?96:120),lineHeight:0.92,letterSpacing:u(-4),color:acc,display:'flex'}}>{m?`${m.toUpperCase()}’S`:'MY DREAM'}</div>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(120),lineHeight:0.98,letterSpacing:u(-4),color:acc,display:'flex'}}>{m?'DREAM TEAM!':'TEAM!'}</div>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',width:u(1072),marginTop:u(40)}}>
   {cards.map((p,j)=>{const i=spec.n.indexOf(p),big=j===0
    return <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:u(big?520:250),height:u(318),margin:u(9),background:tints[j%3],borderRadius:u(26),border:`${u(4)}px solid #FFFFFF`,boxShadow:`0 ${u(6)}px ${u(14)}px rgba(21,19,15,.18)`,transform:`rotate(${tilt[j]}deg)`}}>
     <Kit p={p} i={i} w={u(big?150:118)} col={spec.col} art={art}/>
     <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(p.name.length>14?21:25),color:INK,marginTop:u(4),display:'flex',textAlign:'center',maxWidth:u(big?480:230),justifyContent:'center'}}>{visual(p.name)}{p.cap?' (C)':''}</div>
     {p.s?<div style={{...mono,letterSpacing:u(1),fontSize:u(16),color:'rgba(21,19,15,.6)'}}>{p.s}</div>:null}
    </div>})}
  </div>
  <div style={{marginTop:'auto',width:u(1040),justifyContent:'center',padding:`${u(22)}px 0`,borderRadius:u(48),background:INK,...mono,fontSize:u(24),color:CREAM}}>My all-time XI · {spec.f}</div>
 </div>
}

/** the tee's back: the eleven on a chalk-line pitch, in two inks, on a transparent sheet (light shirts only) */
function TeeBack({spec,k,art}:P){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),[h1,h2]=heads(spec,'THE ONES','I’D PICK.')
 const mono={fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(5),textTransform:'uppercase' as const,display:'flex'}
 const PW=1080,PH=940
 return <div style={{width:u(1200),height:u(1400),display:'flex',flexDirection:'column',alignItems:'center',padding:`${u(20)}px ${u(60)}px`}}>
  <div style={{display:'flex',flexDirection:'column',width:u(PW)}}>
   <div style={{...mono,fontSize:u(26),color:acc}}>Fan Life / {spec.cn}</div>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(h1.length>12?96:124),lineHeight:0.92,letterSpacing:u(-5),color:acc,marginTop:u(14),display:'flex'}}>{h1}</div>
   <div style={{fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800,fontSize:u(124),lineHeight:0.98,letterSpacing:u(-5),color:acc,display:'flex'}}>{h2}</div>
  </div>
  <div style={{position:'relative',display:'flex',width:u(PW),height:u(PH),marginTop:u(24),border:`${u(4)}px solid ${acc}`}}>
   <div style={{position:'absolute',left:0,top:u(PH/2),width:'100%',height:u(3),background:acc,display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-90),top:u(PH/2-90),width:u(180),height:u(180),borderRadius:u(90),border:`${u(3)}px solid ${acc}`,display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-170),top:u(PH-120),width:u(340),height:u(120),border:`${u(3)}px solid ${acc}`,borderBottomWidth:0,display:'flex'}}/>
   {spec.n.map((p,i)=>{const cx=Math.min(PW-115,Math.max(115,p.x/100*PW)),cy=(p.y-12)/84*(PH-220)+14
    return <div key={i} style={{position:'absolute',left:u(cx-115),top:u(cy),width:u(230),display:'flex',flexDirection:'column',alignItems:'center'}}>
     <Kit p={p} i={i} w={u(124)} col={spec.col} art={art}/>
     <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(p.name.length>16?23:27),color:INK,marginTop:u(4),display:'flex',textAlign:'center'}}>{visual(p.name)}{p.cap?' (C)':''}</div>
    </div>})}
  </div>
  <div style={{...mono,fontSize:u(28),color:acc,marginTop:u(26)}}>All-time XI / {spec.f}{spec.m?` · manager ${spec.m}`:''}</div>
 </div>
}
/** the tee's chest: a small "XI" mark over FAN LIFE, in the club's ink */
function TeeFront({spec,k}:P){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col)
 return <div style={{width:u(1200),height:u(1200),display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
  <div style={{fontFamily:'Archivo, Heebo',fontWeight:800,fontSize:u(560),lineHeight:0.9,letterSpacing:u(-20),color:acc,display:'flex'}}>XI</div>
  <div style={{fontFamily:'Heebo',fontWeight:800,fontSize:u(110),letterSpacing:u(30),color:acc,display:'flex',marginTop:u(30),paddingBottom:u(26),borderBottom:`${u(14)}px solid ${acc}`}}>FAN LIFE</div>
 </div>
}
const TEE='M300 120 L470 70 Q600 150 730 70 L900 120 L1110 360 L960 470 L900 410 L900 1500 L300 1500 L300 410 L240 470 L90 360 Z'
/** the tee shown for the proof: the back with its print large, the front with its chest mark small beside it */
function TeeProof(p:P){
 const u=(n:number)=>Math.round(n*p.k)
 const tee=(w:number,id:string)=><svg width={w} height={Math.round(w*1540/1200)} viewBox="0 0 1200 1540" style={{position:'absolute',left:0,top:0}}><defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#E9DFC9"/><stop offset=".5" stopColor="#F6EFDF"/><stop offset="1" stopColor="#E9DFC9"/></linearGradient></defs><path d={TEE} fill={`url(#${id})`} stroke="#CDBE9E" strokeWidth="8" strokeLinejoin="round"/></svg>
 const BW=1000,BH=Math.round(BW*1540/1200),PWd=BW*.46
 return <div style={{width:u(1200),height:u(1600),display:'flex',position:'relative',background:'#DCD5CA'}}>
  <div style={{display:'flex',position:'absolute',left:u(170),top:u(300),width:u(BW),height:u(BH)}}>
   {tee(u(BW),'tb')}
   <div style={{position:'absolute',left:u((BW-PWd)/2),top:u(BH*.17),display:'flex',width:u(PWd),height:u(PWd*1400/1200),overflow:'hidden'}}><TeeBack {...p} k={p.k*PWd/1200}/></div>
  </div>
  <div style={{position:'absolute',left:u(40),top:u(40),width:u(340),height:u(436),display:'flex'}}>
   {tee(u(340),'tf')}
   <div style={{position:'absolute',left:u(196),top:u(100),display:'flex'}}><TeeFront {...p} k={p.k*60/1200}/></div>
  </div>
 </div>
}

export function XIPoster(props:P&{layout?:Layout}){
 const l=props.layout??'print'
 if(l==='tee-back')return <TeeBack {...props}/>
 if(l==='tee-front')return <TeeFront {...props}/>
 if(l==='tee-proof')return <TeeProof {...props}/>
 const v=props.spec.v??'touchline'
 if(v==='archive')return <ArchiveSheet {...props}/>
 if(v==='kits')return <KitsSheet {...props}/>
 if(v==='dream')return <DreamSheet {...props}/>
 return <PitchSheet {...props} night={v==='night'}/>
}

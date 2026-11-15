import {visual as bidi} from '@/lib/og/bidi'
/** Hebrew in visual order for the renderer; Latin untouched (the reorder marks would knock a face off its glyphs) */
const visual=(t:string)=>/[\u0590-\u05FF]/.test(t)?bidi(t):t
import {CREAM,INK,Kit,inkOf,light,mix,type Man} from './xi-poster'

/**
 * FAN LIFE SOUVENIRS — the personal prints beyond the all-time XI (owner, 15.11.2026: "my shirt collection, the Legends
 * Manager squad, my first match, and 'I was there' for every place he travelled with the team abroad").
 * Each sheet is 1200×1600 design units, drawn for satori, at any scale k. Everything printed comes from the archive (kits,
 * matches, UEFA's journey, the career) except what the supporter types himself: his name, one short line, his age, his gate.
 */
type Base={c:string;cn:string;col:string;who?:string|null;line?:string|null;d:string;g?:boolean;b?:boolean}
export type ShirtsSpec=Base&{w:'shirts';hero:Man;note?:string|null;rest:Man[]}
export type LegendsSpec=Base&{w:'legends';team:string;season:number;pts:number;place:number;of:number;champ:boolean;rec:[number,number,number];f:string;n:Man[]}
export type FirstSpec=Base&{w:'first';home:string;away:string;hg:number;ag:number;on:string;comp:string|null;venue:string|null;age?:number|null;gate?:string|null}
export type AwayStop={city:string;year:number;opp:string;sc:string;lat:number;lng:number}
export type AwaySpec=Base&{w:'away';home:{city:string;lat:number;lng:number};stops:AwayStop[]}
export type SouvenirSpec=ShirtsSpec|LegendsSpec|FirstSpec|AwaySpec
export const SOUVENIRS=['shirts','legends','first','away'] as const
/** the drawn map of an away print (computed on the server, lib/shop/personal/map.ts) */
export type MapArt={land:string;borders:string;pts:[number,number][];home:[number,number];w:number;h:number}

const WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty']
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]??'th'}`
const mono=(u:(n:number)=>number,ls=5)=>({fontFamily:'Heebo, HeeboX',fontWeight:800,letterSpacing:u(ls),textTransform:'uppercase' as const,display:'flex'})
const serif={fontFamily:'FrankL, Frank, Heebo, HeeboX',fontWeight:900 as const}
const grotesk={fontFamily:'Archivo, ArchivoX, Heebo',fontWeight:800 as const}
type P<S>={spec:S;k:number;art:Record<number,string>;map?:MapArt}
const Frame=({u,bg,children}:{u:(n:number)=>number;bg:string;children:React.ReactNode})=><div style={{width:u(1200),height:u(1600),display:'flex',flexDirection:'column',background:bg,padding:`${u(70)}px ${u(80)}px`}}>{children}</div>
const Rule=({u,c,mt=0}:{u:(n:number)=>number;c:string;mt?:number})=><div style={{height:u(2),background:c,marginTop:u(mt),display:'flex'}}/>

/** MY SHIRT COLLECTION: "From the collection of …", the one he loves most on a card, the rest in a row, each with its season */
function ShirtsSheet({spec,k,art}:P<ShirtsSpec>){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),brown='#6B4A2E',rule='rgba(107,74,46,.45)'
 const words=(spec.who||spec.cn).trim().split(/\s+/),l1=words.length>1?words.slice(0,-1).join(' '):words[0]!,l2=words.length>1?`${words.at(-1)}.`:''
 const big=Math.max(...[l1,l2].map(x=>x.length))>9?120:150
 return <Frame u={u} bg="#F3E6CD">
  <div style={{...mono(u),fontSize:u(22),color:brown}}>{spec.who?'From the collection of':`Fan Life / ${spec.cn}`}</div>
  <Rule u={u} c={rule} mt={22}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(34)}}>
   <div style={{...serif,fontSize:u(big),lineHeight:0.88,color:acc,display:'flex'}}>{visual(spec.who?l1:'My shirts.')}</div>
   {spec.who&&l2?<div style={{...serif,fontSize:u(big),lineHeight:0.92,color:acc,display:'flex'}}>{visual(l2)}</div>:null}
  </div>
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',marginTop:u(40),height:u(520),background:'#E6CFA9',border:`${u(2)}px solid rgba(107,74,46,.5)`,transform:'rotate(-2.5deg)',boxShadow:`${u(10)}px ${u(12)}px 0 rgba(21,19,15,.12)`}}>
   <Kit p={spec.hero} i={0} w={u(300)} col={spec.col} art={art}/>
   <div style={{...mono(u,3),fontSize:u(22),color:brown,marginTop:u(26)}}>{spec.hero.s||''}{spec.note?` · ${visual(spec.note)}`:''}</div>
  </div>
  {spec.line?<div style={{...serif,fontSize:u(44),lineHeight:1.15,color:brown,marginTop:u(56),display:'flex'}}>“{visual(spec.line)}”</div>:null}
  {spec.rest.length?<><Rule u={u} c={rule} mt={spec.line?36:56}/>
   <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',marginTop:u(22)}}>{spec.rest.map((p,j)=><div key={j} style={{display:'flex',flexDirection:'column',alignItems:'center',width:u(spec.rest.length>4?205:250),marginBottom:u(14)}}>
    <Kit p={p} i={j+1} w={u(spec.rest.length>4?96:120)} col={spec.col} art={art}/>
    <div style={{...mono(u,1),fontSize:u(19),color:INK,marginTop:u(6)}}>{p.s||''}</div>
   </div>)}</div></>:null}
  <div style={{display:'flex',justifyContent:'space-between',marginTop:'auto'}}><div style={{...mono(u),fontSize:u(18),color:brown}}>{spec.cn}</div><div style={{...mono(u),fontSize:u(18),color:acc}}>Fan Life</div></div>
 </Frame>
}

/** LEGENDS MANAGER: the season he managed — points, the final place, his eleven in their shirts, the record */
function LegendsSheet({spec,k,art}:P<LegendsSpec>){
 const u=(n:number)=>Math.round(n*k),bg=spec.g===false?'#1D232C':'#1B3327',acc=mix(spec.col,'#FFFFFF',light(spec.col)?0:.35),soft='rgba(247,240,225,.7)'
 const [h1,h2]=spec.champ?['Champions.',`Season ${spec.season}.`]:[`${ordinal(spec.place)} of ${spec.of}.`,`Season ${spec.season}.`]
 const PW=1040,PH=820
 return <Frame u={u} bg={bg}>
  <div style={{...mono(u),fontSize:u(22),color:soft}}>{spec.who?`Managed by ${visual(spec.who)}`:'Legends Manager'} · {visual(spec.team)}</div>
  <Rule u={u} c="rgba(247,240,225,.35)" mt={22}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(30)}}>
   <div style={{...grotesk,fontSize:u(138),lineHeight:0.9,letterSpacing:u(-6),color:CREAM,display:'flex'}}>{h1}</div>
   <div style={{...grotesk,fontSize:u(138),lineHeight:0.95,letterSpacing:u(-6),color:acc,display:'flex'}}>{h2}</div>
  </div>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:u(26),paddingTop:u(18),borderTop:`${u(2)}px solid rgba(247,240,225,.35)`}}>
   <div style={{display:'flex',alignItems:'center'}}><div style={{...grotesk,fontSize:u(110),color:CREAM,display:'flex',lineHeight:1}}>{spec.pts}</div>
    <div style={{display:'flex',flexDirection:'column',marginLeft:u(18)}}><div style={{...mono(u,3),fontSize:u(20),color:CREAM}}>Points</div><div style={{...mono(u,3),fontSize:u(20),color:soft}}>{spec.rec[0]} W · {spec.rec[1]} D · {spec.rec[2]} L</div></div></div>
   <div style={{...mono(u,3),fontSize:u(22),color:acc}}>{spec.champ?'League champions':`Finished ${ordinal(spec.place)}`}</div>
  </div>
  <div style={{position:'relative',display:'flex',width:u(PW),height:u(PH),marginTop:u(22),border:`${u(2)}px solid rgba(247,240,225,.4)`,background:'rgba(255,255,255,.04)'}}>
   <div style={{position:'absolute',left:0,top:u(PH/2),width:'100%',height:u(2),background:'rgba(247,240,225,.3)',display:'flex'}}/>
   <div style={{position:'absolute',left:u(PW/2-80),top:u(PH/2-80),width:u(160),height:u(160),borderRadius:u(80),border:`${u(2)}px solid rgba(247,240,225,.3)`,display:'flex'}}/>
   {spec.n.map((p,i)=>{const cx=Math.min(PW-100,Math.max(100,p.x/100*PW)),cy=(p.y-12)/84*(PH-200)+14
    return <div key={i} style={{position:'absolute',left:u(cx-96),top:u(cy),width:u(192),display:'flex',flexDirection:'column',alignItems:'center'}}>
     <Kit p={p} i={i} w={u(104)} col={spec.col} art={art}/>
     <div style={{fontFamily:'Heebo, HeeboX',fontWeight:800,fontSize:u(21),color:CREAM,marginTop:u(4),display:'flex',textAlign:'center',justifyContent:'center',width:u(188)}}>{visual(p.name)}{p.cap?' (C)':''}</div>
    </div>})}
  </div>
  <div style={{display:'flex',justifyContent:'space-between',marginTop:'auto'}}><div style={{...mono(u),fontSize:u(18),color:soft}}>{spec.f}</div><div style={{...mono(u),fontSize:u(18),color:acc}}>Fan Life · Legends Manager</div></div>
 </Frame>
}

/** MY FIRST MATCH: "I was eight." — the ticket stub of the day (venue, gate, the score, the two sides), his line, his name */
function FirstSheet({spec,k}:P<FirstSpec>){
 const u=(n:number)=>Math.round(n*k),bg=light(spec.col)?INK:mix(spec.col,INK,.18),stub='#FBF0D2',ink=mix(spec.col,INK,.35)
 const age=spec.age&&spec.age>0?spec.age<=20?WORDS[spec.age]!:String(spec.age):null
 const [h1,h2]=age?['I was',`${age}.`]:['My first','match.']
 const date=spec.on.split('-').reverse().join('.')
 return <Frame u={u} bg={bg}>
  <div style={{...mono(u),fontSize:u(22),color:'rgba(251,240,210,.8)'}}>{spec.who?`${visual(spec.who)}’s first match`:'My first match'}</div>
  <Rule u={u} c="rgba(251,240,210,.4)" mt={22}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(40)}}>
   <div style={{...serif,fontSize:u(170),lineHeight:0.84,letterSpacing:u(-4),color:CREAM,display:'flex'}}>{h1}</div>
   <div style={{...serif,fontSize:u(170),lineHeight:0.9,letterSpacing:u(-4),color:CREAM,display:'flex'}}>{h2}</div>
  </div>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(56),marginLeft:u(20),width:u(980),padding:`${u(34)}px ${u(44)}px`,background:stub,transform:'rotate(-4deg)',boxShadow:`${u(16)}px ${u(16)}px 0 rgba(0,0,0,.28)`}}>
   <div style={{display:'flex',justifyContent:'space-between',paddingBottom:u(14),borderBottom:`${u(3)}px dashed ${ink}`}}><div style={{...mono(u,3),fontSize:u(22),color:ink}}>{visual(spec.venue||spec.home)}</div><div style={{...mono(u,3),fontSize:u(22),color:ink}}>{spec.gate?`Gate ${visual(spec.gate)}`:date}</div></div>
   <div style={{...grotesk,fontSize:u(46),color:INK,marginTop:u(26),display:'flex'}}>{visual(spec.comp||'Matchday')}</div>
   <div style={{...grotesk,fontSize:u(250),lineHeight:1,letterSpacing:u(-8),color:ink,display:'flex'}}>{spec.hg}–{spec.ag}</div>
   <div style={{display:'flex',justifyContent:'space-between',paddingTop:u(14),borderTop:`${u(3)}px dashed ${ink}`,marginTop:u(10)}}><div style={{...mono(u,3),fontSize:u(22),color:ink}}>{visual(spec.home)}</div><div style={{...mono(u,3),fontSize:u(22),color:ink}}>{spec.gate?date:''}</div><div style={{...mono(u,3),fontSize:u(22),color:ink}}>{visual(spec.away)}</div></div>
  </div>
  {spec.line?<div style={{...serif,fontSize:u(48),lineHeight:1.15,color:CREAM,marginTop:u(84),display:'flex'}}>“{visual(spec.line)}”</div>:null}
  {spec.who?<div style={{...serif,fontSize:u(70),color:CREAM,marginTop:u(24),display:'flex'}}>{visual(spec.who.split(/\s+/)[0]!)}</div>:null}
  <div style={{display:'flex',justifyContent:'space-between',marginTop:'auto'}}><div style={{...mono(u),fontSize:u(18),color:'rgba(251,240,210,.75)'}}>From the first whistle</div><div style={{...mono(u),fontSize:u(18),color:CREAM}}>Fan Life</div></div>
 </Frame>
}

/** I WAS THERE: the map of the nights away he was in the ground (UEFA's own record of each), the road from home, the list */
function AwaySheet({spec,k,map}:P<AwaySpec>){
 const u=(n:number)=>Math.round(n*k),acc=inkOf(spec.col),bg=spec.g===false?'#EEE7D8':'#E3E9D8',water=spec.b===false?'#D8D0BE':'#B9D2D2'
 const words=spec.stops.length,two=words>8
 const m=map!,pts=m.pts,route=[m.home,...pts].map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
 return <Frame u={u} bg={bg}>
  <div style={{...mono(u),fontSize:u(22),color:acc}}>{spec.who?`${visual(spec.who)} / `:''}Away with {visual(spec.cn)}</div>
  <Rule u={u} c="rgba(21,19,15,.3)" mt={22}/>
  <div style={{display:'flex',flexDirection:'column',marginTop:u(30)}}>
   <div style={{...grotesk,fontSize:u(160),lineHeight:0.86,letterSpacing:u(-7),color:acc,display:'flex'}}>I was</div>
   <div style={{...grotesk,fontSize:u(160),lineHeight:0.92,letterSpacing:u(-7),color:acc,display:'flex'}}>there.</div>
  </div>
  <div style={{display:'flex',marginTop:u(30),width:u(1040),height:u(m.h),border:`${u(2)}px solid rgba(21,19,15,.45)`,overflow:'hidden'}}>
   <svg width={u(1040)} height={u(m.h)} viewBox={`0 0 ${m.w} ${m.h}`}>
    <rect width={m.w} height={m.h} fill={water}/>
    <path d={m.land} fill="#F4ECDA"/>
    <path d={m.borders} fill="none" stroke="rgba(21,19,15,.25)" strokeWidth="1"/>
    <path d={route} fill="none" stroke={acc} strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round"/>
    <circle cx={m.home[0]} cy={m.home[1]} r="9" fill={INK}/>
    {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="8" fill={acc} stroke="#FFFFFF" strokeWidth="3"/>)}
   </svg>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',marginTop:u(20)}}>
   {spec.stops.map((s,i)=><div key={i} style={{display:'flex',width:u(two?500:1040),justifyContent:'space-between',padding:`${u(9)}px 0`,borderBottom:`${u(2)}px solid rgba(21,19,15,.18)`}}>
    <div style={{display:'flex'}}><div style={{...mono(u,2),fontSize:u(20),color:acc,width:u(48)}}>{String(i+1).padStart(2,'0')}</div><div style={{...mono(u,3),fontSize:u(20),color:INK}}>{visual(s.city)}</div></div>
    <div style={{...mono(u,1),fontSize:u(19),color:'rgba(21,19,15,.7)'}}>{two?'':`${visual(s.opp)} ${s.sc} · `}{s.year}</div>
   </div>)}
  </div>
  {spec.line?<div style={{...serif,fontSize:u(44),color:INK,marginTop:u(26),display:'flex'}}>“{visual(spec.line)}”</div>:null}
  <div style={{display:'flex',justifyContent:'space-between',marginTop:'auto'}}><div style={{...mono(u),fontSize:u(18),color:'rgba(21,19,15,.6)'}}>{spec.stops.length} {spec.stops.length===1?'night':'nights'} away · from {visual(spec.home.city)}</div><div style={{...mono(u),fontSize:u(18),color:acc}}>Fan Life</div></div>
 </Frame>
}

export function SouvenirSheet(p:P<SouvenirSpec>){
 const s=p.spec
 if(s.w==='shirts')return <ShirtsSheet {...p} spec={s}/>
 if(s.w==='legends')return <LegendsSheet {...p} spec={s}/>
 if(s.w==='first')return <FirstSheet {...p} spec={s}/>
 return <AwaySheet {...p} spec={s}/>
}
/** the kits each sheet draws, in the order of the `art` index: [club, drawing id] */
export function kitsOf(s:SouvenirSpec):(Man&{cl?:string})[]{
 if(s.w==='shirts')return [s.hero,...s.rest]
 if(s.w==='legends')return s.n
 return []
}

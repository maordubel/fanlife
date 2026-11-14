/**
 * THE SUPPORTER'S XI — a personal print (owner, 14.11.2026: "after building his XI, offer him a framed print / poster from our
 * template, upgraded: the players' names, more impact, a personal touch — the manager's name if he wants").
 * Drawn for satori (next/og): flex boxes and absolute positions only. Designed on a 1200×1600 sheet (3:4) and drawn at any
 * scale `k` — the proof at k=0.75, the print at k=3 (3600×4800, sharp on every framed size up to 18×24″).
 * The weekly's language: newsprint, ink rules, the club's own colour as the only accent (a rival's colour never appears: the
 * club's colour is its own), a printed pitch with chalk lines, the shirt in the club colour, the name under each shirt.
 * No crest (an official mark is not ours to print) — the FAN LIFE seal in one ink signs it.
 */
export type XIPrintSpec={
 /** club id, its display name and its colour */
 c:string;cn:string;col:string
 /** formation name */
 f:string
 /** each man: x,y on the pitch (0–100, the formation's own), his name, captain flag */
 n:{x:number;y:number;name:string;cap?:boolean}[]
 /** the 12th man, if any */
 t?:string|null
 /** the manager's name — the supporter's own, if he chose to add it */
 m?:string|null
 /** the date it was picked (dd.mm.yyyy) */
 d:string
}

const INK='#15130F',PAPER='#F4ECD8',CARD='#FFFBF2',LINE='rgba(21,19,15,.55)'
const light=(hex:string)=>{const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);const r=n>>16&255,g=n>>8&255,b=n&255;return 0.299*r+0.587*g+0.114*b>170}

function Shirt({col,s}:{col:string;s:number}){
 const trim=light(col)?INK:CARD
 return <svg width={s} height={s} viewBox="0 0 64 64"><path d="M22 6 L10 12 L2 24 L12 30 L16 26 L16 60 L48 60 L48 26 L52 30 L62 24 L54 12 L42 6 Q32 14 22 6 Z" fill={col} stroke={INK} strokeWidth="3" strokeLinejoin="round"/><path d="M22 6 Q32 14 42 6" fill="none" stroke={trim} strokeWidth="4"/><path d="M2 24 L12 30 M62 24 L52 30" stroke={trim} strokeWidth="4"/></svg>
}

export function XIPoster({spec,k,seal}:{spec:XIPrintSpec;k:number;seal:string}){
 const u=(n:number)=>Math.round(n*k)
 const accent=spec.col,manager=(spec.m||'').trim(),cap=spec.n.find(p=>p.cap)?.name
 const head1=manager?`${manager.toUpperCase()}’S`:'THE ONES',head2=manager?'ALL-TIME XI.':'I’D PICK.'
 const mono={fontFamily:'Heebo',fontWeight:800,letterSpacing:u(3),textTransform:'uppercase' as const}
 const PW=994,PH=730
 return <div style={{width:u(1200),height:u(1600),display:'flex',background:PAPER,padding:u(46)}}>
  <div style={{flex:1,display:'flex',flexDirection:'column',border:`${u(5)}px solid ${INK}`,background:CARD,padding:u(48)}}>
   {/* masthead */}
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <div style={{display:'flex',alignItems:'center'}}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={seal} width={u(84)} height={u(84)} alt="" style={{marginRight:u(20)}}/>
     <div style={{...mono,fontSize:u(26),color:INK,display:'flex'}}>The Supporter’s XI</div>
    </div>
    <div style={{...mono,fontSize:u(24),color:accent,display:'flex'}}>{spec.d}</div>
   </div>
   <div style={{height:u(5),background:INK,marginTop:u(26),marginBottom:u(30),display:'flex'}}/>
   {/* headline */}
   <div style={{display:'flex',flexDirection:'column'}}>
    <div style={{fontFamily:'Archivo, Heebo',fontWeight:800,fontSize:u(manager&&manager.length>11?104:132),lineHeight:0.9,letterSpacing:u(-4),color:INK,display:'flex'}}>{head1}</div>
    <div style={{fontFamily:'Archivo, Heebo',fontWeight:800,fontSize:u(132),lineHeight:0.95,letterSpacing:u(-4),color:accent,display:'flex'}}>{head2}</div>
    <div style={{...mono,fontSize:u(26),color:INK,marginTop:u(18),display:'flex'}}>{spec.cn} · {spec.f}</div>
   </div>
   {/* the pitch */}
   <div style={{position:'relative',display:'flex',overflow:'hidden',width:u(PW),height:u(PH),marginTop:u(34),border:`${u(4)}px solid ${INK}`,background:'#ECE3CB'}}>
    {[0,1,2,3,4,5,6,7,8].map(i=><div key={i} style={{position:'absolute',left:0,top:u(i*PH/9),width:'100%',height:u(PH/9),background:i%2?'#E6DCC1':'#EFE7D1',display:'flex'}}/>)}
    <div style={{position:'absolute',left:0,top:u(PH/2-2),width:'100%',height:u(3),background:LINE,display:'flex'}}/>
    <div style={{position:'absolute',left:u(PW/2-90),top:u(PH/2-90),width:u(180),height:u(180),borderRadius:u(90),border:`${u(3)}px solid ${LINE}`,display:'flex'}}/>
    <div style={{position:'absolute',left:u(PW/2-210),top:0,width:u(420),height:u(130),border:`${u(3)}px solid ${LINE}`,borderTopWidth:0,display:'flex'}}/>
    <div style={{position:'absolute',left:u(PW/2-210),top:u(PH-130),width:u(420),height:u(130),border:`${u(3)}px solid ${LINE}`,borderBottomWidth:0,display:'flex'}}/>
    {spec.n.map((p,i)=>{const cx=Math.min(PW-110,Math.max(110,p.x/100*PW)),cy=(p.y-14)/80*(PH-140)+30
     return <div key={i} style={{position:'absolute',left:u(cx-110),top:u(cy-20),width:u(220),display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{display:'flex',position:'relative'}}><Shirt col={accent} s={u(78)}/>
       {p.cap?<div style={{position:'absolute',right:u(-26),top:u(-6),width:u(40),height:u(40),borderRadius:u(20),background:INK,color:CARD,fontFamily:'Heebo',fontWeight:800,fontSize:u(24),display:'flex',alignItems:'center',justifyContent:'center'}}>C</div>:null}</div>
      <div style={{marginTop:u(6),padding:`${u(4)}px ${u(10)}px`,background:INK,color:CARD,fontFamily:'Heebo',fontWeight:800,fontSize:u(p.name.length>16?20:24),textAlign:'center',display:'flex',justifyContent:'center',maxWidth:u(220)}}>{p.name}</div>
     </div>})}
   </div>
   {/* the foot */}
   <div style={{height:u(5),background:INK,marginTop:u(30),display:'flex'}}/>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:u(18)}}>
    <div style={{...mono,fontSize:u(30),color:accent,display:'flex'}}>{spec.f}</div>
    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
     {cap?<div style={{...mono,fontSize:u(22),color:INK,display:'flex'}}>Captain · {cap}</div>:null}
     {spec.t?<div style={{...mono,fontSize:u(22),color:INK,display:'flex',marginTop:u(6)}}>12th man · {spec.t}</div>:null}
     {manager?<div style={{...mono,fontSize:u(22),color:accent,display:'flex',marginTop:u(6)}}>Manager · {manager}</div>:null}
    </div>
   </div>
   <div style={{display:'flex',justifyContent:'center',marginTop:'auto',...mono,fontSize:u(16),color:'rgba(21,19,15,.6)'}}>One supporter’s eleven · FAN LIFE · fanlife.dubelteam.com</div>
  </div>
 </div>
}

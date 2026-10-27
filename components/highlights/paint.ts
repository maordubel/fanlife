import type {Palette} from '@/lib/highlights/kit'
import {actorAt,ballAt,type Scene} from '@/lib/highlights/scenes'
import {LENGTH,WIDTH,attackDir,toWorld} from '@/lib/highlights/pitch'
import type {Reel} from '@/lib/highlights/types'
import {drawMan,type Look} from './sprite'
import {boardRow} from './boards'

/**
 * THE PICTURE — how the theatre paints one frame of a highlight (moved out of `Theatre.tsx` on 27.10.2026 so a frame can be
 * drawn and checked on its own, `/qa/highlights`). Pure canvas, no React.
 *
 * The accuracy pass (owner, 27.10.2026: "more accurate"):
 * - **A broadcast camera, not a map.** The ground is projected through one camera on the main stand: the far touchline is
 *   further away than the near one, so it is drawn smaller (×0.81 against ×1.31 under the camera), every line converges the
 *   way it does on television, and a man is drawn at the size of where he stands. Straight lines stay straight, circles
 *   stay true ellipses — every point goes through the same `toScreen`.
 * - **One scale for height.** A man is 15 px for 1.8 m, so everything with a height uses that scale: the crossbar is 2.44 m
 *   of a man (it used to be shorter than the players), a header meets the ball at head height instead of the waist, a ball
 *   over the bar clears it on screen, and a keeper's dive rises to the height of the shot.
 * - **Half pixels.** The canvas is drawn at twice its logical size (`RES`), so a man moves and scales in half pixels and the
 *   pan no longer jitters a whole pixel at a time; the look stays the sixteen-bit one.
 */
export const WIDE=256,NARROW=192,H=160,RES=2
/** metres → pixels along the length at mid-pitch; the camera's tilt across it; where the camera's aim sits on the screen */
const S=4.6,YS=.62,HORIZON=.56
/** the camera stands ZN m behind the near touchline (a long lens) — the far touchline is drawn at ZN/(ZN+68) of the near one */
const ZN=108,ZMID=ZN+WIDTH/2
/** a man is 15 px tall for 1.8 m: every height is measured in men */
export const MAN_PX=15,PX_UP=MAN_PX/1.8
// the frame being drawn — set at the top of each synchronous draw, so two theatres on one page cannot disagree
let W=WIDE,VIEW_L=W/S
const view=(w:number)=>{W=w;VIEW_L=W/S}
export type Cam={L:number;D:number;t?:number}
/** whether this page prints the boards in one ink (rule 95) — set by the theatre before it draws */
export const BOARDS={mono:false}
const lerp=(a:number,b:number,u:number)=>a+(b-a)*u
const VIEW_D=H/(S*YS)
const depth=(D:number)=>ZN+WIDTH-D
/** the camera's scale at a depth across the pitch, 1 on the halfway spot */
export const scaleAt=(D:number)=>ZMID/depth(D)
const across=(D:number)=>YS*ZMID*ZMID/depth(D)
export function toScreen(L:number,D:number,cam:Cam,s=S){const k=scaleAt(D);return {x:(L-cam.L)*s*k+W/2,y:(across(D)-across(cam.D))*s+H*HORIZON,k:k*s/S}}
export function clampCam(L:number,D:number):Cam{return {L:Math.max(VIEW_L/2-7,Math.min(LENGTH+7-VIEW_L/2,L)),D:Math.max(-18+VIEW_D*HORIZON,Math.min(WIDTH+11-VIEW_D*(1-HORIZON),D))}}
/** a new camera for a scene: it takes its first shot on the first frame */
export const freshCam=():Cam=>({L:NaN,D:NaN,t:0})
const snap=(v:number)=>Math.round(v*RES)/RES

/** one frame of a scene at scene time `t` — the camera eases in scene time, so a slow phone and the ×2 button frame the same shot */
export function draw(c:CanvasRenderingContext2D,sc:Scene,t:number,cam:Cam,yellow:boolean,P:Palette,w:number){
 view(w);c.setTransform(RES,0,0,RES,0,0)
 const bs=ballAt(sc.ball,t),bw=toWorld(bs.x,bs.y,sc.dir)
 // the camera leads the ball a little toward the goal it is going to, keeps the goal mouth in the frame once the ball is near it,
 // sits a few metres toward the far side, as a main-stand camera does (the far boards in view), and never shows past the stands
 const near=Math.max(0,1-Math.abs((sc.dir>0?LENGTH:0)-bw.L)/30),want=clampCam(bw.L+sc.dir*4,lerp(bw.D,WIDTH/2,near*.45)-5)
 if(Number.isNaN(cam.L)){cam.L=want.L;cam.D=want.D;cam.t=t}else{const k=1-Math.exp(-Math.max(0,t-(cam.t??t))*5.5);cam.L+=(want.L-cam.L)*k;cam.D+=(want.D-cam.D)*k;cam.t=t}
 c.imageSmoothingEnabled=false
 ground(c,cam,P,t)
 const net=(g:number)=>sc.dir===(g?1:-1)&&sc.cues.some(q=>q.kind==='net'&&t>=q.t&&t<q.t+.6)?t:null
 goal(c,cam,P,0,net(0));goal(c,cam,P,LENGTH,net(LENGTH))
 const card=sc.cues.find(q=>(q.kind==='card-yellow'||q.kind==='card-red')&&t>=q.t)
 const items=sc.actors.map(a=>{const p=actorAt(a,t),q=actorAt(a,Math.max(0,t-.08)),w=toWorld(p.x,p.y,sc.dir),wq=toWorld(q.x,q.y,sc.dir),dL=w.L-wq.L
  const face=(Math.abs(dL)>.02?Math.sign(dL):Math.sign(bw.L-w.L)||1) as -1|1,speed=Math.hypot(p.x-q.x,p.y-q.y)/.08
  return {a,p,w,face,speed}}).sort((u,v)=>u.w.D-v.w.D)
 // the ball, drawn among the people at its own depth; it spins only while it travels, a turn every 0.7 m
 const prev=ballAt(sc.ball,Math.max(0,t-.06)),travel=Math.hypot(bs.x-prev.x,bs.y-prev.y)>.02
 let ballDrawn=false
 const drawBall=()=>{
  const s=toScreen(bw.L,bw.D,cam),lift=bs.z*PX_UP*s.k,r=s.k>1.05?1.5:1,spin=travel?Math.floor((bs.x+bs.y)/.7)%2:0
  c.globalAlpha=Math.max(.35,1-bs.z/6);c.fillStyle=P.shadow;c.beginPath();c.ellipse(snap(s.x),snap(s.y),r*1.3,.6*s.k+.2,0,0,Math.PI*2);c.fill();c.globalAlpha=1
  const x=snap(s.x),y=snap(s.y-lift-r)
  c.fillStyle=P.ball;c.fillRect(x-r,y-r,r*2,r*2);c.fillStyle=P.ballDark;c.fillRect(x-r+(spin?r:0),y-r+(spin?0:r),r,r)
  ballDrawn=true}
 for(const {a,p,w,face,speed} of items){
  if(!ballDrawn&&bw.D<w.D)drawBall()
  const s=toScreen(w.L,w.D,cam)
  if(s.x<-14||s.x>W+14||s.y<-34||s.y>H+24)continue
  const look:Look={kit:a.kit,skin:a.skin,hair:a.hair,role:a.role,card:card?(card.kind==='card-red'?'red':yellow?'yellow':null):null}
  // the legs turn over faster the faster he runs: a jog and a sprint are different strides
  const stride=p.moving?Math.floor(t*(3+speed*.75))%4:0
  const lift=p.pose==='dive'&&a.lift?a.lift*Math.sin(Math.PI*Math.min(1,p.u*1.15))*PX_UP*s.k:0
  drawMan(c,cellOf(),look,p.pose,stride,face,s.x,s.y,a.dive?((a.dive*sc.dir) as -1|1):undefined,P,s.k,lift)
 }
 if(!ballDrawn)drawBall()
}
/** where a man's name tag sits on the screen, as a share of the frame (it floats above his head at his depth) */
export function tagAt(sc:Scene,id:string,t:number,cam:Cam,w:number){
 view(w);const a=sc.actors.find(x=>x.id===id)!,p=actorAt(a,t),wd=toWorld(p.x,p.y,sc.dir),s=toScreen(wd.L,wd.D,cam)
 return {x:s.x/W*100,y:(s.y-MAN_PX*s.k-8)/H*100}
}
/** the stands, the boards, the grass cut in bands across the length, and every line of the ground */
function ground(c:CanvasRenderingContext2D,cam:Cam,P:Palette,t:number,s=S){
 const at=(L:number,D:number)=>toScreen(L,D,cam,s)
 c.fillStyle=P.ref;c.fillRect(0,0,W,H)
 const far=at(cam.L,-4),near=at(cam.L,WIDTH+4)
 // the crowd in the far stand and the near one, a little restless
 const flick=Math.floor(t*3),fy=far.y-11*far.k*(W<WIDE?1.15:1)
 for(let y=0;y<fy;y+=3)for(let x=(y/3)%2?1:0;x<W;x+=3){const k=(x*7+y*13+((x*y+flick)%23===0?3:0))%11;c.fillStyle=k<5?P.skin[k]!:k<8?P.board:P.hair[k%5]!;c.fillRect(x,y,2,2)}
 const ny=near.y+12*near.k*(W<WIDE?1.15:1)
 for(let y=Math.ceil(ny);y<H;y+=3)for(let x=(y/3)%2?0:1;x<W;x+=3){const k=(x*5+y*11)%11;c.fillStyle=k<5?P.skin[k]!:k<8?P.board:P.hair[k%5]!;c.fillRect(x,y,2,2)}
 // grass, in bands across the length like the cut of a real pitch — each band a trapezoid, narrower at the far side
 const quad=(L0:number,L1:number,D0:number,D1:number)=>{const a=at(L0,D0),b=at(L1,D0),d=at(L1,D1),e=at(L0,D1);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(d.x,d.y);c.lineTo(e.x,e.y);c.closePath();c.fill()}
 c.fillStyle=P.grassB;quad(-40,LENGTH+40,-4,WIDTH+4)
 c.fillStyle=P.grassA;for(let L=-36.75,i=1;L<LENGTH+36.75;L+=5.25,i++)if(i%2)quad(L,L+5.25,-4,WIDTH+4)
 // the boards along both touchlines: our own banners as LED panels (`boards.ts`), the far row smaller and slower
 const fh=11*far.k*(W<WIDE?1.15:1),nh=12*near.k*(W<WIDE?1.15:1)
 boardRow(c,{y:snap(fy),h:fh,w:W,scroll:cam.L*s*far.k,t,salt:0,mono:BOARDS.mono,ink:P.ref,bed:P.board,light:P.line})
 boardRow(c,{y:snap(near.y),h:nh,w:W,scroll:cam.L*s*near.k,t,salt:4,mono:BOARDS.mono,ink:P.ref,bed:P.board,light:P.line})
 // lines: a 12 cm line is a pixel wide wherever it is, so it is drawn point by point along its projection
 c.fillStyle=P.line
 const dot=(p:{x:number;y:number})=>c.fillRect(snap(p.x),snap(p.y),1,1/RES+.5)
 const line=(L1:number,D1:number,L2:number,D2:number)=>{const a=at(L1,D1),z=at(L2,D2),n=Math.ceil(Math.max(Math.abs(z.y-a.y),Math.abs(z.x-a.x))*RES);if(Math.abs(a.y-z.y)<.5){c.fillRect(snap(Math.min(a.x,z.x)),snap(a.y),Math.abs(z.x-a.x)+1,1);return}for(let i=0;i<=n;i++)dot({x:a.x+(z.x-a.x)*i/n,y:a.y+(z.y-a.y)*i/n})}
 const arc=(L:number,D:number,r:number,a0:number,a1:number,keep?:(L:number)=>boolean)=>{for(let a=a0;a<=a1;a+=.02){const x=L+r*Math.cos(a),y=D+r*Math.sin(a);if(!keep||keep(x))dot(at(x,y))}}
 line(0,0,LENGTH,0);line(0,WIDTH,LENGTH,WIDTH);line(0,0,0,WIDTH);line(LENGTH,0,LENGTH,WIDTH);line(LENGTH/2,0,LENGTH/2,WIDTH)
 for(const g of [0,LENGTH]){const d=g?-1:1
  line(g,13.84,g+d*16.5,13.84);line(g,54.16,g+d*16.5,54.16);line(g+d*16.5,13.84,g+d*16.5,54.16)
  line(g,24.84,g+d*5.5,24.84);line(g,43.16,g+d*5.5,43.16);line(g+d*5.5,24.84,g+d*5.5,43.16)
  const sp=at(g+d*11,34);c.fillRect(snap(sp.x)-.5,snap(sp.y),1.5,1)
  // the arc: 9.15 m from the spot, only the part outside the area
  arc(g+d*11,34,9.15,0,Math.PI*2,L=>Math.abs(L-g)>16.5)
  // the corner arcs, a metre round each flag
  arc(g,0,1,d>0?0:Math.PI/2,d>0?Math.PI/2:Math.PI);arc(g,WIDTH,1,d>0?-Math.PI/2:Math.PI,d>0?0:Math.PI*1.5)
 }
 arc(LENGTH/2,34,9.15,0,Math.PI*2);const cs=at(LENGTH/2,34);c.fillRect(snap(cs.x)-.5,snap(cs.y),1.5,1)
 // the corner flags: a 1.5 m pole and a pennant
 for(const [L,D] of [[0,0],[LENGTH,0],[0,WIDTH],[LENGTH,WIDTH]] as const){const p=at(L,D),h=1.5*PX_UP*p.k;if(p.x<-4||p.x>W+4)continue
  c.fillStyle=P.post;c.fillRect(snap(p.x),snap(p.y-h),1,h);c.fillStyle=P.flagA;c.fillRect(snap(p.x)+1,snap(p.y-h),2.5*p.k,1.5*p.k);c.fillStyle=P.flagB;c.fillRect(snap(p.x)+1,snap(p.y-h)+1.5*p.k,2.5*p.k,.5)}
}
/**
 * A goal seen from the main stand: 7.32 m between the posts (they stand one behind the other, the far one smaller), 2.44 m to
 * the bar measured in men, the net running 2 m back to a lower back bar — side panels, roof and back — bulging when it is hit.
 */
function goal(c:CanvasRenderingContext2D,cam:Cam,P:Palette,gL:number,shake:number|null,s=S){
 const d=gL?1:-1,at=(L:number,D:number)=>toScreen(L,D,cam,s)
 const fp=at(gL,30.34),np=at(gL,37.66),fb=at(gL+d*2,30.34),nb=at(gL+d*2,37.66)
 if(Math.max(fp.x,fb.x,np.x,nb.x)<-6||Math.min(fp.x,fb.x,np.x,nb.x)>W+6)return
 const up=(p:{x:number;y:number;k:number},m:number)=>({x:p.x,y:p.y-m*PX_UP*p.k})
 const sh=shake===null?0:Math.sin(shake*60)*.8*d
 const fpT=up(fp,2.44),npT=up(np,2.44),fbT={...up(fb,1.5),x:fb.x+sh},nbT={...up(nb,1.5),x:nb.x+sh},fbB={...fb,x:fb.x+sh},nbB={...nb,x:nb.x+sh}
 const poly=(pts:{x:number;y:number}[])=>{c.beginPath();c.moveTo(pts[0]!.x,pts[0]!.y);for(const p of pts.slice(1))c.lineTo(p.x,p.y);c.closePath()}
 // the net: a shadow inside the frame, then the mesh, clipped to each panel
 const panels=[[fp,fpT,fbT,fbB],[fbB,fbT,nbT,nbB],[fpT,npT,nbT,fbT],[np,npT,nbT,nbB]]
 c.globalAlpha=.24;c.fillStyle=P.shadow;for(const pn of panels){poly(pn);c.fill()}c.globalAlpha=1
 c.fillStyle=P.net
 for(const pn of panels){c.save();poly(pn);c.clip();const xs=pn.map(p=>p.x),ys=pn.map(p=>p.y)
  for(let x=Math.floor(Math.min(...xs));x<=Math.max(...xs);x+=1)for(let y=Math.floor(Math.min(...ys))+(x%2);y<=Math.max(...ys);y+=2)c.fillRect(x,y,.5,.5)
  c.restore()}
 // the frame behind (the back bar and its stanchions), then the posts and the bar — the near post thicker, it is nearer
 const bar=(a:{x:number;y:number},b:{x:number;y:number},wd:number)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*RES);for(let i=0;i<=n;i++)c.fillRect(snap(a.x+(b.x-a.x)*i/n)-wd/2,snap(a.y+(b.y-a.y)*i/n)-wd/2,wd,wd)}
 c.fillStyle=P.net;bar(fbB,fbT,.5);bar(nbB,nbT,.5);bar(fbT,nbT,.5);bar(fpT,fbT,.5);bar(npT,nbT,.5);bar(fp,fbB,.5);bar(np,nbB,.5)
 c.fillStyle=P.post;bar(fp,fpT,1.5*fp.k);bar(fpT,npT,1.5*fp.k);bar(np,npT,2*np.k)
}
/**
 * The radar — its own small canvas beside the caption, never on the picture (owner, 27.10.2026: it hid players in the corner).
 * The whole ground, all twenty-two in their shirts, the ball, and the camera's window, wider at the far touchline as the lens sees it.
 */
export const RADAR_W=110,RADAR_H=72
export function drawRadar(c:CanvasRenderingContext2D,sc:Scene,t:number,cam:Cam,P:Palette,teams:Reel['teams'],w:number){
 view(w);c.setTransform(RES,0,0,RES,0,0);c.imageSmoothingEnabled=false
 const bs=ballAt(sc.ball,t),bw=toWorld(bs.x,bs.y,sc.dir)
 const pad=3,RW=RADAR_W-pad*2,RH=RADAR_H-pad*2,x0=pad,y0=pad,kx=RW/LENGTH,ky=RH/WIDTH
 c.clearRect(0,0,RADAR_W,RADAR_H)
 c.fillStyle=P.grassB;c.fillRect(x0,y0,RW,RH)
 c.fillStyle=P.grassA;for(let i=1;i<20;i+=2)c.fillRect(x0+i*RW/20,y0,RW/20,RH)
 c.globalAlpha=.85;c.fillStyle=P.line
 const box=(L0:number,D0:number,L1:number,D1:number)=>{const l=x0+L0*kx,r=x0+L1*kx,tp=y0+D0*ky,bt=y0+D1*ky;c.fillRect(l,tp,r-l,.6);c.fillRect(l,bt,r-l,.6);c.fillRect(l,tp,.6,bt-tp);c.fillRect(r,tp,.6,bt-tp+.6)}
 box(0,0,LENGTH,WIDTH);c.fillRect(x0+RW/2,y0,.6,RH);box(0,13.84,16.5,54.16);box(LENGTH-16.5,13.84,LENGTH,54.16)
 c.beginPath();c.ellipse(x0+RW/2,y0+RH/2,9.15*kx,9.15*ky,0,0,Math.PI*2);c.strokeStyle=P.line;c.lineWidth=.6;c.stroke()
 c.globalAlpha=1
 for(const a of sc.actors){if(a.team<0)continue;const p=actorAt(a,t),wd=toWorld(p.x,p.y,sc.dir);c.fillStyle=a.role==='gk'?(teams[a.team as 0|1].keeper.shirt):a.kit?.shirt??P.line
  c.beginPath();c.arc(x0+wd.L*kx,y0+wd.D*ky,1.6,0,Math.PI*2);c.fill();c.lineWidth=.5;c.strokeStyle=P.ref;c.stroke()}
 c.fillStyle=P.ball;c.beginPath();c.arc(x0+bw.L*kx,y0+bw.D*ky,Math.floor(t*6)%2?1.4:1.1,0,Math.PI*2);c.fill();c.lineWidth=.5;c.strokeStyle=P.ref;c.stroke()
 // the camera's window
 const half=(D:number)=>VIEW_L/2/scaleAt(D),fD=Math.max(0,cam.D-VIEW_D*HORIZON),nD=Math.min(WIDTH,cam.D+VIEW_D*(1-HORIZON))
 c.globalAlpha=.7;c.strokeStyle=P.line;c.lineWidth=.7;c.beginPath()
 c.moveTo(x0+(cam.L-half(fD))*kx,y0+fD*ky);c.lineTo(x0+(cam.L+half(fD))*kx,y0+fD*ky);c.lineTo(x0+(cam.L+half(nD))*kx,y0+nD*ky);c.lineTo(x0+(cam.L-half(nD))*kx,y0+nD*ky);c.closePath();c.stroke()
 c.globalAlpha=1
}
/** the change of ends: the whole ground at a glance, each side's arrow turning round to the other goal */
export function drawEnds(c:CanvasRenderingContext2D,teams:Reel['teams'],before:number,after:number,u:number,P:Palette,w:number){
 view(w);c.setTransform(RES,0,0,RES,0,0)
 // the whole ground in one frame: the near touchline, drawn largest, is the one that has to fit
 const s=w/LENGTH*.72,cam:Cam={L:LENGTH/2,D:WIDTH/2-6}
 c.imageSmoothingEnabled=false
 ground(c,cam,P,u*3,s);goal(c,cam,P,0,null,s);goal(c,cam,P,LENGTH,null,s)
 const turn=u<.42?0:u>.58?1:(u-.42)/.16
 teams.forEach((tm,side)=>{
  const d0=attackDir(before,side as 0|1),d1=attackDir(after,side as 0|1),d=turn<.5?d0:d1,squash=Math.abs(1-turn*2)
  const lane=side?44:20,shift=(turn<.5?d0:d1)*(8+12*(turn<.5?1-u/.42:Math.min(1,(u-.58)/.42)))
  const p=toScreen(LENGTH/2+shift,lane,cam,s),len=Math.round(46*(w/WIDE)*Math.max(.18,squash)),h=12
  // the arrow: a block in the side's shirt, its head pointing at the goal it now attacks, outlined in ink
  const x=Math.round(p.x-len/2*d),y=Math.round(p.y-h/2)
  c.fillStyle=P.ref;c.fillRect(Math.min(x,x+len*d)-1,y-1,len+2,h+2)
  c.fillStyle=tm.kit.shirt;c.fillRect(Math.min(x,x+len*d),y,len,h)
  if(tm.kit.second){c.fillStyle=tm.kit.second;for(let i=2;i<len-2;i+=6)c.fillRect(Math.min(x,x+len*d)+i,y+1,2,h-2)}
  const tip=x+len*d;for(let i=0;i<9;i++){c.fillStyle=P.ref;c.fillRect(tip+d*i-(d<0?1:0),y-3+i,1,h+6-2*i);c.fillStyle=tm.kit.shirt;if(i>0&&i<8)c.fillRect(tip+d*i-(d<0?1:0),y-2+i,1,h+4-2*i)}
  c.fillStyle=P.boardText;c.font=`8px ${caps()}`;c.textBaseline='middle';c.fillText(tm.code,Math.round(p.x-10),Math.round(p.y)-12)
 })
}
/** the boards' lettering in the weekly's caps face (rule 124), read once from the page's own token; a bare canvas keeps monospace */
let capsFace:string|null=null
const caps=()=>capsFace??=((typeof document!=='undefined'&&getComputedStyle(document.documentElement).getPropertyValue('--mag-mono').trim())||'monospace')
let shared:HTMLCanvasElement|null=null
const cellOf=()=>shared??=Object.assign(document.createElement('canvas'),{width:16,height:20})

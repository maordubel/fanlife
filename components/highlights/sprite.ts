import type {Palette} from '@/lib/highlights/kit'
import type {PixelKit} from '@/lib/highlights/types'
import type {Pose} from '@/lib/highlights/scenes'

/**
 * The pixel man — drawn, not loaded, so every player in every match wears his own club's shirt of his own years (stripes, hoops,
 * halves, a sash or a chest band) without one sprite file per kit. Sixteen-bit in spirit; the artwork is ours.
 *
 * The players pass (owner, 27.10.2026: "more polish on the players"):
 * - **Drawn in half pixels** (the theatre's canvas is twice its logical size), so a man is still 15 px tall on the screen but
 *   carries twice the detail: a face with an eye, five haircuts, an ear, a neck, shoulders, sleeves and hands.
 * - **Seen from the side, as the main-stand camera sees him**: he faces the way he runs, his legs stride forward and back with a
 *   knee, the far leg and arm a shade darker than the near ones, and his arms swing against his legs.
 * - **A real run cycle**: contact, passing, contact, passing — the body rises a half pixel on the passing frames.
 * - **Shaded cloth**: the back of the shirt and shorts a shade darker, the stripes and hoops two half pixels wide, a band of
 *   the shirt colour at the top of the socks, boots with a toe.
 * - **An ink outline** round the whole man, the way the old cartridges kept a player readable on any grass.
 * - **Every look is drawn once and kept** (a small cache), so twenty-two men cost twenty-two copies a frame, not twenty-two paintings.
 */
type Ctx=CanvasRenderingContext2D
export type Look={kit:PixelKit|null;skin:number;hair:number;role:'gk'|'out'|'ref'|'lino';card?:'yellow'|'red'|null}

/** the cell, in half pixels: 32 wide, 40 tall, the feet at (16, 35) */
const CW=32,CH=40,FX=16,FY=35

const rgb=(h:string):[number,number,number]|null=>{const m=/^#?([0-9a-f]{6})$/i.exec(h);if(!m)return null;const n=parseInt(m[1]!,16);return [(n>>16)&255,(n>>8)&255,n&255]}
/** the same colour in shadow (f < 1) or catching the light (f > 1) — its hue never moves, so a page's paint rules still hold */
function shade(h:string,f:number):string{const c=rgb(h);if(!c)return h;const k=(v:number)=>Math.max(0,Math.min(255,Math.round(f<1?v*f:v+(255-v)*(f-1))));return `rgb(${k(c[0])} ${k(c[1])} ${k(c[2])})`}

function shirtAt(k:PixelKit,x:number,row:number){
 if(!k.second)return k.shirt
 switch(k.pattern){
  case 'stripes':return Math.floor(x/2)%2?k.second:k.shirt
  case 'hoops':return Math.floor(row/2)%2?k.second:k.shirt
  case 'halves':return x<4?k.second:k.shirt
  case 'sash':return ((x+row+40)%8)<2?k.second:k.shirt
  case 'band':return row>=3&&row<=4?k.second:k.shirt
  default:return k.shirt
 }
}
type Pt=[number,number]
type Limbs={near:{knee:Pt;foot:Pt};far:{knee:Pt;foot:Pt};hands:{near:Pt;far:Pt};elbows?:{near:Pt;far:Pt};lift:number;arms?:'up'}
const HIP_Y=23,SHOULDER_Y=12
/** where the legs and arms are for a pose and a frame of the run (facing right) */
function limbs(pose:Pose,phase:number):Limbs{
 const stride=pose==='run'?1:pose==='walk'?.55:0
 if(stride>0){
  // contact (near leg ahead), passing (near leg under him, far leg tucked), contact (far ahead), passing (far under him)
  const f=phase%4,s=stride
  const ahead=(dx:number):{knee:Pt;foot:Pt}=>({knee:[16+dx*.7,29],foot:[16+dx,FY-1]})
  const behind=(dx:number):{knee:Pt;foot:Pt}=>({knee:[16-dx*.5,29],foot:[16-dx,FY-2]})
  const under:{knee:Pt;foot:Pt}={knee:[16.5,29],foot:[16,FY-1]},tucked:{knee:Pt;foot:Pt}={knee:[18,28],foot:[13,FY-4]}
  const fwd=Math.round(5*s),back=Math.round(5*s)
  const legs=f===0?{near:ahead(fwd),far:behind(back)}:f===2?{near:behind(back),far:ahead(fwd)}:f===1?{near:under,far:tucked}:{near:tucked,far:under}
  const swing=f===0?-1:f===2?1:0
  return {...legs,hands:{near:[18+swing*4*s,19],far:[14-swing*4*s,19]},elbows:{near:[18.5+swing*2*s,16],far:[13.5-swing*2*s,16]},lift:f%2?1:0}
 }
 switch(pose){
  case 'kick':return {near:{knee:[20,27],foot:[24,30]},far:{knee:[15.5,29],foot:[15,FY-1]},hands:{near:[9,15],far:[23,14]},lift:0}
  case 'head':return {near:{knee:[18,28],foot:[17,32]},far:{knee:[14,28],foot:[13,32]},hands:{near:[10,6],far:[22,6]},lift:4,arms:'up'}
  case 'celebrate':return {near:{knee:[17.5,29],foot:[18,FY-1]},far:{knee:[14.5,29],foot:[14,FY-1]},hands:{near:[21,2],far:[11,2]},lift:1,arms:'up'}
  case 'catch':return {near:{knee:[17.5,29],foot:[19,FY-1]},far:{knee:[14.5,29],foot:[13,FY-1]},hands:{near:[21,14],far:[21,17]},elbows:{near:[19,16],far:[18,18]},lift:0}
  case 'card':return {near:{knee:[17,29],foot:[18,FY-1]},far:{knee:[15,29],foot:[14,FY-1]},hands:{near:[20,3],far:[14,19]},elbows:{near:[19,8],far:[15,16]},lift:0}
  case 'flag':return {near:{knee:[17,29],foot:[18,FY-1]},far:{knee:[15,29],foot:[14,FY-1]},hands:{near:[21,5],far:[14,19]},elbows:{near:[20,9],far:[15,16]},lift:0}
  default:return {near:{knee:[17,29],foot:[18,FY-1]},far:{knee:[15,29],foot:[14,FY-1]},hands:{near:[20,20],far:[12.5,20]},elbows:{near:[19.5,16],far:[13,16]},lift:0}
 }
}
/** a limb as a stroke `w` half pixels thick, each point coloured by how far along it is */
function stroke(c:Ctx,a:Pt,b:Pt,w:number,colour:(u:number)=>string){
 const n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))))
 for(let i=0;i<=n;i++){const u=i/n,x=Math.round(a[0]+(b[0]-a[0])*u-w/2),y=Math.round(a[1]+(b[1]-a[1])*u-w/2);c.fillStyle=colour(u);c.fillRect(x,y,w,w)}
}
/** draw the man facing right into a 32 × 40 cell, his feet at (16, 35) */
function paintMan(c:Ctx,look:Look,pose:Pose,phase:number,P:Palette){
 const kit=look.kit??{shirt:P.ref,second:P.refTrim,pattern:'band' as const,shorts:P.ref,socks:P.ref}
 const skin=P.skin[look.skin%5]!,hair=P.hair[look.hair%5]!,gk=look.role==='gk',L=limbs(pose,phase),up=L.lift
 const skinShade=shade(skin,.82),bootLit=shade(P.boot,1.35)
 const sockTop=kit.socks===kit.shirt?(kit.second??shade(kit.socks,1.3)):kit.shirt
 const px=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y-up,w,h)}
 // a leg: thigh in skin, the sock from the knee down with its band, the boot at the foot pointing the way he faces
 const leg=(l:{knee:Pt;foot:Pt},far:boolean)=>{
  const hip:Pt=[l===L.near?17:15,HIP_Y-up],knee:Pt=[l.knee[0],l.knee[1]-up],foot:Pt=[l.foot[0],l.foot[1]-up],d=far?.82:1
  stroke(c,hip,knee,3,()=>shade(skin,d*.98))
  stroke(c,knee,foot,3,u=>u<.18?shade(sockTop,d):shade(kit.socks,d))
  c.fillStyle=far?shade(P.boot,.9):P.boot;c.fillRect(Math.round(foot[0])-1,Math.round(foot[1]),4,2)
  c.fillStyle=bootLit;c.fillRect(Math.round(foot[0])+2,Math.round(foot[1]),1,1)
 }
 const arm=(hand:Pt,elbow:Pt|undefined,far:boolean)=>{
  const sh:Pt=[far?13.5:18.5,SHOULDER_Y-up+1],h:Pt=[hand[0],hand[1]-up],e:Pt=elbow?[elbow[0],elbow[1]-up]:[(sh[0]+h[0])/2,(sh[1]+h[1])/2],d=far?.8:1
  const sleeve=gk?shade(kit.shirt,d):shade(shirtAt(kit,far?0:7,1),d)
  stroke(c,sh,e,2,u=>u<(gk?1.1:.7)?sleeve:shade(skin,d))
  stroke(c,e,h,2,u=>gk&&u>.55?shade(P.glove,d):u<.05&&gk?sleeve:shade(skin,d))
  c.fillStyle=gk?shade(P.glove,d):shade(skin,d*.95);c.fillRect(Math.round(h[0])-1,Math.round(h[1])-1,gk?3:2,gk?3:2)
 }
 // far side first
 leg(L.far,true)
 arm(L.hands.far,L.elbows?.far,true)
 // shorts, the back a shade darker
 for(let x=0;x<8;x++)px(12+x,20,1,4,x<2?shade(kit.shorts,.8):kit.shorts)
 leg(L.near,false)
 // the shirt: eight half pixels wide, the back in shadow, the shoulders catching the light
 for(let row=0;row<9;row++)for(let x=0;x<8;x++){
  const base=shirtAt(kit,x,row),f=x<2?.8:row===0&&x>2?1.12:1
  px(12+x,11+row,1,1,f===1?base:shade(base,f))
 }
 // the neck and the head: face toward where he looks, an ear, an eye, a haircut
 px(15,10,3,1,skinShade)
 px(14,4,6,6,skin);px(19,6,1,3,skin)
 px(15,7,1,2,skinShade)
 px(18,6,1,1,P.ref)
 const style=(look.hair*3+look.skin)%5
 if(style===0){px(14,3,6,2,hair);px(13,4,2,4,hair)}            // short
 else if(style===1){px(14,3,5,1,hair);px(13,4,1,3,hair)}       // cropped
 else if(style===2){px(14,3,6,2,hair);px(13,4,2,7,hair);px(12,8,1,3,hair)} // long, to the collar
 else if(style===3){px(13,2,7,3,hair);px(12,3,3,5,hair);px(19,3,1,2,hair)} // curly
 else{px(14,3,5,1,shade(skin,.9));px(13,4,1,2,hair)}           // shaved
 // a referee's card, a linesman's flag
 if(pose==='card'){const h=L.hands.near;px(Math.round(h[0])-1,Math.round(h[1])-5,3,4,look.card==='red'?P.cardRed:look.card==='yellow'?P.cardYellow:P.glove)}
 if(pose==='flag'){const h=L.hands.near;px(Math.round(h[0]),Math.round(h[1])-6,1,10,P.flagPole);px(Math.round(h[0])+1,Math.round(h[1])-6,4,3,P.flagA);px(Math.round(h[0])+1,Math.round(h[1])-6,2,1,P.flagB)}
 // near arm last, over the shirt
 arm(L.hands.near,L.elbows?.near,false)
}
/** the ink outline round everything the man is — one pass over the cell */
function outline(c:Ctx,ink:string){
 const im=c.getImageData(0,0,CW,CH),d=im.data,col=rgb(ink)??[20,20,20],solid=(x:number,y:number)=>x>=0&&y>=0&&x<CW&&y<CH&&d[(y*CW+x)*4+3]!>120
 const add:number[]=[]
 for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(!solid(x,y)&&(solid(x-1,y)||solid(x+1,y)||solid(x,y-1)||solid(x,y+1)))add.push((y*CW+x)*4)
 for(const i of add){d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];d[i+3]=215}
 c.putImageData(im,0,0)
}
const cache=new Map<string,HTMLCanvasElement>()
function sprite(look:Look,pose:Pose,phase:number,P:Palette):HTMLCanvasElement{
 const k=look.kit,key=[k?`${k.shirt}|${k.second}|${k.pattern}|${k.shorts}|${k.socks}`:'-',look.skin%5,look.hair%5,look.role,look.card??'',pose,phase%4,P.skin[0],P.ref,P.cardYellow,P.cardRed].join(':')
 let cell=cache.get(key)
 if(!cell){
  if(cache.size>800)cache.clear()
  cell=Object.assign(document.createElement('canvas'),{width:CW,height:CH})
  const g=cell.getContext('2d',{willReadFrequently:true})!
  paintMan(g,look,pose,phase,P);outline(g,P.ref);cache.set(key,cell)
 }
 return cell
}
/**
 * The shadow, the man, and the pose's rotation for a dive, a slide or a man on the floor. `k` is the camera's scale at the
 * man's depth (a man on the far touchline is drawn smaller than one under the camera), `lift` how high a diving keeper is off the
 * ground in pixels — his shadow stays on the grass. Positions snap to the canvas's half pixels.
 */
export function drawMan(c:Ctx,look:Look,pose:Pose,phase:number,face:-1|1,x:number,y:number,dive:-1|1|undefined,P:Palette,k=1,lift=0){
 const flat=pose==='dive'||pose==='down'||pose==='slide',snap=(v:number)=>Math.round(v*2)/2
 const cell=sprite(look,flat?'stand':pose,phase,P)
 c.fillStyle=P.shadow;c.beginPath();c.ellipse(snap(x),snap(y),(flat?7:4)*k,2*k,0,0,Math.PI*2);c.fill()
 c.save();c.translate(snap(x),snap(y-lift));c.scale(k/2,k/2)
 if(flat){const dir=pose==='dive'?(dive??face):face,ang=(pose==='slide'?62:90)*Math.PI/180*dir;c.translate(0,pose==='dive'?-8:-2);c.rotate(ang)}
 if(face<0&&!flat)c.scale(-1,1)
 c.drawImage(cell,-FX,-FY);c.restore()
}

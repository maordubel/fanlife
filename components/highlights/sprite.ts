import type {Palette} from '@/lib/highlights/kit'
import type {PixelKit} from '@/lib/highlights/types'
import type {Pose} from '@/lib/highlights/scenes'

/**
 * The pixel man — drawn, not loaded: 7 × 15 pixels from a kit, a skin and a hair colour, so every player in every match can
 * wear his own club's shirt of his own years (stripes, hoops, halves, a sash or a chest band) without one sprite file per kit.
 * Feet at (0,0). Sixteen-bit in spirit; the artwork is ours.
 */
type Ctx=CanvasRenderingContext2D
const px=(c:Ctx,x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h)}
function shirtAt(k:PixelKit,x:number,row:number){
 if(!k.second)return k.shirt
 switch(k.pattern){
  case 'stripes':return (x+10)%2?k.second:k.shirt
  case 'hoops':return row%2?k.second:k.shirt
  case 'halves':return x<0?k.second:k.shirt
  case 'sash':return (x+row+20)%4===0||(x+row+21)%4===0?k.second:k.shirt
  case 'band':return row===2?k.second:k.shirt
  default:return k.shirt
 }
}
export type Look={kit:PixelKit|null;skin:number;hair:number;role:'gk'|'out'|'ref'|'lino';card?:'yellow'|'red'|null}
/** draw upright into the 16×20 cell, feet at (8,18); `phase` 0–3 is the run cycle */
export function drawUpright(c:Ctx,look:Look,pose:Pose,phase:number,PALETTE:Palette){
 const kit=look.kit??{shirt:PALETTE.ref,second:PALETTE.refTrim,pattern:'band' as const,shorts:PALETTE.ref,socks:PALETTE.ref}
 const skin=PALETTE.skin[look.skin%5]!,hair=PALETTE.hair[look.hair%5]!,ox=8,oy=18
 const up=pose==='head'||pose==='celebrate'?3:0,y0=oy-15-up
 // legs
 const run=pose==='run'||pose==='walk',a=run?[0,1,0,-1][phase%4]!:0,kick=pose==='kick'
 px(c,ox-2,y0+10,2,1,skin);px(c,ox+1,y0+10,2,1,skin)
 px(c,ox-2+(run?a:0),y0+11,2,3,kit.socks);px(c,ox+1-(run?a:0)+(kick?2:0),y0+11-(kick?1:0),2,3,kit.socks)
 px(c,ox-2+(run?a:0),y0+14,2,1,PALETTE.boot);px(c,ox+1-(run?a:0)+(kick?2:0),y0+14-(kick?1:0),kick?3:2,1,PALETTE.boot)
 // shorts
 px(c,ox-2,y0+8,5,2,kit.shorts)
 // shirt, with its pattern
 for(let row=0;row<5;row++)for(let x=-2;x<=2;x++)px(c,ox+x,y0+3+row,1,1,shirtAt(kit,x,row))
 // arms: sleeves in the shirt, hands in skin; up for a header, a goal or a card
 const armsUp=pose==='head'||pose==='celebrate',out=pose==='kick'||pose==='catch'
 if(armsUp){px(c,ox-3,y0+1,1,3,kit.shirt);px(c,ox+3,y0+1,1,3,kit.shirt);px(c,ox-3,y0,1,1,skin);px(c,ox+3,y0,1,1,skin)}
 else if(pose==='card'){px(c,ox-3,y0+4,1,3,kit.shirt);px(c,ox+3,y0,1,4,kit.shirt);px(c,ox+3,y0-1,1,1,skin);px(c,ox+2,y0-4,3,3,look.card==='red'?PALETTE.cardRed:look.card==='yellow'?PALETTE.cardYellow:PALETTE.glove)}
 else if(pose==='flag'){px(c,ox+3,y0-2,1,6,kit.shirt);px(c,ox+4,y0-6,1,7,PALETTE.flagPole);px(c,ox+5,y0-6,3,3,PALETTE.flagA);px(c,ox+5,y0-6,1,1,PALETTE.flagB)}
 else{const sw=run?[0,1,0,1][phase%4]!:0;px(c,ox-3,y0+3+sw,1,2,kit.shirt);px(c,ox+3,y0+4-sw,1,2,kit.shirt);px(c,ox-3,y0+5+sw+(out?-1:0),1,1,skin);px(c,ox+3,y0+6-sw+(out?-1:0),1,1,skin)}
 if(look.role==='gk'){px(c,ox-3,y0+5,1,1,PALETTE.glove);px(c,ox+3,y0+6,1,1,PALETTE.glove)}
 // head
 px(c,ox-1,y0,3,1,hair);px(c,ox-1,y0+1,3,2,skin);px(c,ox-1,y0+1,1,1,hair)
}
/** the shadow, the cell, and the pose's rotation for a dive, a slide or a man on the floor */
export function drawMan(c:Ctx,cell:HTMLCanvasElement,look:Look,pose:Pose,phase:number,face:-1|1,x:number,y:number,dive:-1|1|undefined,PALETTE:Palette){
 const g=cell.getContext('2d')!;g.clearRect(0,0,cell.width,cell.height)
 const flat=pose==='dive'||pose==='down'||pose==='slide'
 drawUpright(g,look,flat?'stand':pose,phase,PALETTE)
 c.fillStyle=PALETTE.shadow;c.beginPath();c.ellipse(Math.round(x),Math.round(y),flat?7:4,2,0,0,Math.PI*2);c.fill()
 c.save();c.translate(Math.round(x),Math.round(y))
 if(flat){const dir=pose==='dive'?(dive??face):face,ang=(pose==='slide'?62:90)*Math.PI/180*dir;c.translate(0,pose==='dive'?-4:-1);c.rotate(ang)}
 if(face<0&&!flat)c.scale(-1,1)
 c.drawImage(cell,-8,-18);c.restore()
}

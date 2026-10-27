/**
 * THE PITCH-SIDE BOARDS — our own banners (`public/ads`, the house banners of `lib/promo/seed.ts`) as LED panels along both
 * touchlines (owner, 27.10.2026: "put our banners on as the adverts"). They slide past with the camera at the depth of their
 * touchline and change every few seconds with a quick LED wipe, like a real ground.
 *
 * Rule 95: on a club's own page a banner's colours may be a rival's, so there the boards print in one ink (a grey of the same
 * lightness, made once per banner on a canvas — never `ctx.filter`, which older Safari ignores). The hub shows them in colour.
 * A banner that has not loaded yet is a blank board, never a broken image.
 */
export const BOARD_ADS=['manager','offsides','life','dubid-en','market','takemeout','fuckyou'] as const
/** a banner is 320 × 50 */
export const BOARD_ASPECT=6.4
/** seconds a set of boards stays up before the LED changes */
export const BOARD_TURN=4.5

const colour=new Map<string,HTMLImageElement>()
const grey=new Map<string,HTMLCanvasElement>()
function load(id:string):HTMLImageElement|null{
 if(typeof Image==='undefined')return null
 let im=colour.get(id)
 if(!im){im=new Image();im.decoding='async';im.src=`/ads/${id}-2x.webp`;colour.set(id,im)}
 return im.complete&&im.naturalWidth>0?im:null
}
/** the banner as it may be shown on this page: in colour, or once-greyed for a club page */
export function boardArt(id:string,mono:boolean):CanvasImageSource|null{
 const im=load(id);if(!im)return null
 if(!mono)return im
 let g=grey.get(id)
 if(!g){
  g=document.createElement('canvas');g.width=im.naturalWidth;g.height=im.naturalHeight
  const x=g.getContext('2d');if(!x)return null
  x.drawImage(im,0,0);const d=x.getImageData(0,0,g.width,g.height),p=d.data
  for(let i=0;i<p.length;i+=4){const y=Math.round(.3*p[i]!+.59*p[i+1]!+.11*p[i+2]!);p[i]=p[i+1]=p[i+2]=y}
  x.putImageData(d,0,0);grey.set(id,g)
 }
 return g
}
/** warm the cache before the first frame, so the boards are up when the match starts */
export function preloadBoards(){for(const id of BOARD_ADS)load(id)}

/**
 * One row of boards, drawn at height `h` from `y`; `scroll` is how far the camera has travelled in this row's pixels (so the far
 * row slides slower than the near one). `salt` keeps the two touchlines from showing the same banner side by side.
 */
export function boardRow(c:CanvasRenderingContext2D,o:{y:number;h:number;w:number;scroll:number;t:number;salt:number;mono:boolean;ink:string;bed:string;light:string}){
 const {y,h,w,scroll,t,salt,mono}=o,bw=h*BOARD_ASPECT,gap=Math.max(1,h*.14),period=bw+gap,n=BOARD_ADS.length
 c.fillStyle=o.ink;c.fillRect(0,y-.5,w,h+1)
 const turn=Math.floor(t/BOARD_TURN),since=t-turn*BOARD_TURN,wipe=since<.3?since/.3:1
 const first=Math.floor(scroll/period)-1,off=scroll-first*period
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high'
 for(let x=-off,i=first;x<w+period;x+=period,i++){
  const id=BOARD_ADS[(((i+turn*3+salt)%n)+n)%n]!,art=boardArt(id,mono)
  c.fillStyle=o.bed;c.fillRect(x,y,bw,h)
  if(art){
   // the LED change: the new banner rises into the panel, the blank board above it
   const top=h*(1-wipe)
   if(wipe<1){c.save();c.beginPath();c.rect(x,y+top,bw,h-top);c.clip();c.drawImage(art,x,y,bw,h);c.restore()}else c.drawImage(art,x,y,bw,h)
  }
 }
 c.restore()
 // the LED's rows, and the light catching the top edge of the boards
 c.globalAlpha=.16;c.fillStyle=o.ink;for(let r=y+1;r<y+h;r+=1.5)c.fillRect(0,r,w,.5)
 c.globalAlpha=.22;c.fillStyle=o.light;c.fillRect(0,y,w,.5)
 c.globalAlpha=1
}

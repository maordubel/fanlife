/**
 * REMOVE A PLAIN BACKGROUND (13.11.2026: the owner asked for background removal as an edit).
 * The FAN LIFE art sits on paper — a cream or white ground. This takes the colour that dominates the picture's border and
 * floods inward from every edge through pixels close to it, making them transparent, with a soft two-step edge so the cut
 * is not jagged. Pure (a plain RGBA buffer in, the same buffer out), so the desk runs it in the browser on an upload and the
 * server runs it with sharp on a library picture. Paper inside the subject (a white shirt) is kept: only what touches the
 * border through background-coloured pixels goes.
 */
export type Rgba={data:Uint8ClampedArray|Uint8Array;width:number;height:number}
const dist=(d:Rgba['data'],i:number,c:[number,number,number])=>Math.abs(d[i]!-c[0])+Math.abs(d[i+1]!-c[1])+Math.abs(d[i+2]!-c[2])
/** the border's most common colour, quantised (the paper), and how much of the border it covers */
export function borderColour(img:Rgba):{rgb:[number,number,number];share:number}{
 const {data:d,width:w,height:h}=img,count=new Map<number,{n:number;r:number;g:number;b:number}>();let total=0
 const take=(x:number,y:number)=>{const i=(y*w+x)*4;if(d[i+3]!<16)return;const k=(d[i]!>>4)<<8|(d[i+1]!>>4)<<4|(d[i+2]!>>4),c=count.get(k)??{n:0,r:0,g:0,b:0};c.n++;c.r+=d[i]!;c.g+=d[i+1]!;c.b+=d[i+2]!;count.set(k,c);total++}
 for(let x=0;x<w;x++){take(x,0);take(x,h-1)}for(let y=1;y<h-1;y++){take(0,y);take(w-1,y)}
 let best={n:0,r:0,g:0,b:0};for(const c of count.values())if(c.n>best.n)best=c
 return {rgb:best.n?[best.r/best.n,best.g/best.n,best.b/best.n]:[255,255,255],share:total?best.n/total:0}
}
/** returns how much of the picture became transparent (0–1); `tolerance` is the summed RGB distance still counted as paper */
export function removePlainBackground(img:Rgba,tolerance=60):number{
 const {data:d,width:w,height:h}=img,{rgb}=borderColour(img),seen=new Uint8Array(w*h),stack:number[]=[]
 const push=(p:number)=>{if(!seen[p]&&d[p*4+3]!>0&&dist(d,p*4,rgb)<=tolerance){seen[p]=1;stack.push(p)}}
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 let gone=0
 while(stack.length){const p=stack.pop()!,x=p%w,y=(p-x)/w;d[p*4+3]=0;gone++
  if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w)}
 // soften the cut: a pixel next to a removed one keeps alpha in proportion to how far its colour is from the paper
 const edge:number[]=[]
 for(let p=0;p<w*h;p++){if(seen[p])continue;const x=p%w,y=(p-x)/w
  if((x>0&&seen[p-1])||(x<w-1&&seen[p+1])||(y>0&&seen[p-w])||(y<h-1&&seen[p+w]))edge.push(p)}
 for(const p of edge){const t=Math.min(1,dist(d,p*4,rgb)/(tolerance*2.5));d[p*4+3]=Math.round(d[p*4+3]!*Math.max(.25,t))}
 return gone/(w*h)
}

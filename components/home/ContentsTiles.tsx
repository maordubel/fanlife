import {scene,bit,type Scene,type Bit} from '@/lib/home/art'

export type Tile={href:string;title:string;sub:string;go:string;pic?:Scene|'kits';cut?:Bit;plate?:'green'|'navy'|'red'|'orange'}

/**
 * INSIDE THIS ISSUE, as pictures (owner, 23.11.2026: "far more graphic, more inviting, it must be clear what the user will
 * experience"). Each feature is a picture card that says what happens behind it. Phone: two a row, the first one across.
 * Desktop: four a row. Pictures: the owner's packs (scripts/brand/art-vol2.py, scripts/brand/front-doors.py).
 */
/** `mono` (a club's own pages, rule 95): the pictures print in one ink, the club's — no picture brings a rival's colours into a club's ground */
export function ContentsTiles({title,tiles,mono}:{title:string;tiles:Tile[];mono?:boolean}){
 return <nav className="wkx" aria-label={title} data-testid="contents-tiles" data-mono={mono||undefined}>
  <p className="wk-banner wkx-k">{title}</p>
  <ol className="wkx-list">{tiles.map((x,i)=>{
   const p=x.pic?(x.pic==='kits'?{src:'/brand/fanlife/doors/kits-960.webp',srcSet:'/brand/fanlife/doors/kits-480.webp 480w, /brand/fanlife/doors/kits-960.webp 960w'}:scene(x.pic)):null,c=x.cut?bit(x.cut):null
   return <li key={x.href}><a href={x.href} className="wkx-tile min-h-tap" data-plate={x.plate} {...(x.href.startsWith('http')?{target:'_blank',rel:'noopener'}:{})}>
    <span className="wkx-pic">
     {/* eslint-disable-next-line @next/next/no-img-element -- the owner's pictures, cut to fixed widths */}
     {p&&<img src={p.src} srcSet={p.srcSet} sizes="(min-width: 901px) 23vw, 46vw" alt="" width={960} height={640} loading="lazy" decoding="async"/>}
     {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out on a colour plate */}
     {c&&<img className="wkx-cut" src={c.src} srcSet={c.srcSet} sizes="120px" alt="" width={320} height={320} loading="lazy" decoding="async"/>}
     <span className="wkx-no wk-num" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
    </span>
    <span className="wkx-t"><b>{x.title}</b><small>{x.sub}</small></span><span className="wkx-go" aria-hidden="true">{x.go}</span>
   </a></li>})}</ol>
 </nav>
}

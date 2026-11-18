'use client'
import {useId} from 'react'

/**
 * The printed front of THE ALBUM's packet and cover (18.11.2026), in the style of the owner's reference artwork
 * (brand/source/album/): an eighties kiosk album — lime board, a blue band crossing it, red arcs, chunky lettering with
 * a printed gradient and a hard ink shadow, the illustrated terrace scene in an oval, a shield, a starburst, the roundel.
 * Only true claims are printed: the wing, the real counts, edition one. The scene is the owner's art, cut by
 * scripts/brand/album-art.py; the colour chips are the wings' own colours. All inks come from album.css (--rt-*).
 */
export type RetroProps={kind:'pack'|'cover';wing:string;count?:number;total?:number;chips:string[];owner?:string}

const W=300,H=420

export function RetroFront({kind,wing,count=2,total=0,chips,owner}:RetroProps){
 const u=useId().replace(/:/g,'')
 const pack=kind==='pack'
 // the printed card sits inside the foil (packet) or inside the worn board edge (cover)
 const [x,y,w,h]=pack?[16,28,268,364]:[14,12,272,396]
 const cx=x+w/2,oy=y+(pack?186:176),rx=w*0.47,ry=pack?92:96
 const words=wing.toUpperCase()
 const wingSize=Math.min(30,(w-30)/(words.length*0.82))
 return <svg className="rt" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pack?`THE ALBUM packet, ${wing}, ${count} stickers`:`THE ALBUM, ${wing}`}>
  <defs>
   <linearGradient id={`t${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="rt-st-teal"/><stop offset=".5" className="rt-st-blue"/><stop offset="1" className="rt-st-green"/></linearGradient>
   <linearGradient id={`o${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="rt-st-orange"/><stop offset="1" className="rt-st-red"/></linearGradient>
   <pattern id={`d${u}`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" className="rt-f-blue" opacity=".55"/></pattern>
   <clipPath id={`c${u}`}><rect x={x} y={y} width={w} height={h} rx={pack?3:2}/></clipPath>
   <clipPath id={`e${u}`}><ellipse cx={cx} cy={oy} rx={rx} ry={ry}/></clipPath>
   <filter id={`n${u}`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .25  0 0 0 0 .2  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
   <pattern id={`f${u}`} width="40" height={H} patternUnits="userSpaceOnUse"><image href="/album/art/foil-side.webp" width="40" height={H} preserveAspectRatio="none"/></pattern>
  </defs>
  {pack?<>
   {/* the silver foil wrapper: the owner's own crimped ends, foil down the sides */}
   <rect width={W} height={H} fill={`url(#f${u})`}/>
   <image href="/album/art/foil-top.webp" x="0" y="0" width={W} height="30" preserveAspectRatio="none"/>
   <image href="/album/art/foil-bottom.webp" x="0" y={H-30} width={W} height="30" preserveAspectRatio="none"/>
  </>:<>
   {/* the board: a green cloth edge, worn at the corners, two staples down the spine */}
   <rect width={W} height={H} rx="4" className="rt-f-board"/>
   <rect width={W} height={H} rx="4" fill="black" filter={`url(#n${u})`}/>
   {[110,310].map(sy=><rect key={sy} x="4" y={sy} width="5" height="22" rx="1" className="rt-staple"/>)}
  </>}
  <g clipPath={`url(#c${u})`}>
   <rect x={x} y={y} width={w} height={h} className="rt-f-lime"/>
   <rect x={x} y={y+h*0.52} width={w*0.22} height={h*0.3} fill={`url(#d${u})`}/>
   <rect x={x+w*0.78} y={y+h*0.52} width={w*0.22} height={h*0.3} fill={`url(#d${u})`}/>
   {/* the blue band and the red arcs */}
   <path d={`M${x} ${oy-ry*0.75} L${x+w} ${oy-ry*0.75} L${x+w} ${oy-ry*0.55} L${x} ${oy-ry*0.55} Z`} className="rt-f-blue"/>
   <path d={`M${x-10} ${y+h} L${x-10} ${oy+ry*0.9} Q${cx} ${oy+ry*1.55} ${x+w+10} ${oy+ry*0.9} L${x+w+10} ${y+h} Z`} className="rt-f-blue"/>
   <path d={`M${x+4} ${oy-ry*0.95} Q${x-ry*0.2} ${oy+ry*0.2} ${x+w*0.18} ${oy+ry*0.95}`} className="rt-arc"/>
   <path d={`M${x+w-4} ${oy-ry*0.95} Q${x+w+ry*0.2} ${oy+ry*0.2} ${x+w*0.82} ${oy+ry*0.95}`} className="rt-arc"/>
   {/* the scene in its oval */}
   <ellipse cx={cx} cy={oy} rx={rx+7} ry={ry+7} className="rt-f-blue rt-s-ink"/>
   <ellipse cx={cx} cy={oy} rx={rx+3} ry={ry+3} className="rt-f-red"/>
   <image href="/album/art/scene-600.webp" x={cx-rx} y={oy-ry} width={rx*2} height={ry*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#e${u})`}/>
   <ellipse cx={cx} cy={oy} rx={rx} ry={ry} fill="none" className="rt-s-ink" strokeWidth="2"/>
   {/* the title */}
   <rect x={x+8} y={y+8} width={w-16} height={pack?62:70} rx="10" fill="none" className="rt-s-blue" strokeWidth="3"/>
   <circle cx={x+40} cy={y+30} r="26" className="rt-f-red rt-s-blue" strokeWidth="3"/>
   <text x={x+16} y={y+28} className="rt-small">FAN LIFE’S</text>
   <text x={x+14} y={y+(pack?60:60)} className="rt-big rt-shadow" textLength={w*(pack?0.62:0.6)} lengthAdjust="spacingAndGlyphs">FOOTBALL</text>
   <text x={x+12} y={y+(pack?58:58)} className="rt-big" fill={`url(#t${u})`} textLength={w*(pack?0.62:0.6)} lengthAdjust="spacingAndGlyphs">FOOTBALL</text>
   {pack?<>
    <text x={x+w-12} y={y+60} textAnchor="end" className="rt-mid rt-shadow" dx="2" dy="2">2026</text>
    <text x={x+w-12} y={y+60} textAnchor="end" className="rt-mid" fill={`url(#o${u})`}>2026</text>
   </>:<>
    <text x={x+w-14} y={y+34} textAnchor="end" className="rt-mid rt-mid-s rt-shadow" dx="2" dy="2">STICKER</text>
    <text x={x+w-14} y={y+34} textAnchor="end" className="rt-mid rt-mid-s" fill={`url(#o${u})`}>STICKER</text>
    <text x={x+w-14} y={y+58} textAnchor="end" className="rt-mid rt-mid-s rt-shadow" dx="2" dy="2">ALBUM</text>
    <text x={x+w-14} y={y+58} textAnchor="end" className="rt-mid rt-mid-s" fill={`url(#o${u})`}>ALBUM</text>
   </>}
   <text x={cx+1.5} y={y+(pack?92:96)+1.5} textAnchor="middle" className="rt-wing rt-shadow" style={{fontSize:wingSize}}>{words}</text>
   <text x={cx} y={y+(pack?92:96)} textAnchor="middle" className="rt-wing" style={{fontSize:wingSize}} fill={`url(#o${u})`}>{words}</text>
   {!pack&&<text x={cx} y={y+112} textAnchor="middle" className="rt-line">{total?`COLLECT ALL ${total} STICKERS!`:'COLLECT THEM ALL!'}</text>}
   {/* the foot: shield, roundel, the wings' colours, the count */}
   <g transform={`translate(${x+40} ${y+h-(pack?40:62)}) rotate(-6)`}>
    <path d="M-34 -20 L34 -20 L34 6 Q34 22 0 30 Q-34 22 -34 6 Z" className="rt-f-red rt-s-ink" strokeWidth="2.5"/>
    <path d="M-38 -10 L38 -10 L38 12 L-38 12 Z" className="rt-f-blue rt-s-ink" strokeWidth="2.5"/>
    <text y="-1" textAnchor="middle" className="rt-shield">{pack?'ALBUM':'THE ALBUM'}</text>
    <text y="9.5" textAnchor="middle" className="rt-shield">{pack?'STICKERS':'EDITION ONE'}</text>
   </g>
   <circle cx={cx-2} cy={y+h-(pack?38:60)} r="20" className="rt-f-ivory rt-s-ink" strokeWidth="2"/>
   <image href="/brand/fanlife/logo-192.png" x={cx-20} y={y+h-(pack?56:78)} width="36" height="36"/>
   <g transform={`translate(${cx+28} ${y+h-(pack?50:72)})`}>
    {chips.slice(0,8).map((c,i)=><g key={i} transform={`translate(${(i%4)*13} ${Math.floor(i/4)*12})`}><rect width="12" height="10" style={{fill:c}} className="rt-s-ink" strokeWidth=".8"/><rect y="3.5" width="12" height="3" className="rt-f-ivory" opacity=".8"/></g>)}
   </g>
   {pack?<g transform={`translate(${x+w-30} ${y+h-36})`}>
    <circle r="23" className="rt-f-ivory rt-s-ink" strokeWidth="3"/><circle r="19" fill="none" className="rt-s-blue" strokeWidth="1.5"/>
    <text y="4" textAnchor="middle" className="rt-count">{count}</text><text y="14" textAnchor="middle" className="rt-count-s">STICKERS</text>
   </g>:<>
    <g transform={`translate(${x+w-34} ${y+h-108}) rotate(-10)`}><polygon points={burst(26,19,14)} className="rt-f-orange rt-s-ink" strokeWidth="2"/><text y="-1" textAnchor="middle" className="rt-burst">EDITION</text><text y="9" textAnchor="middle" className="rt-burst">ONE!</text></g>
    <g transform={`translate(${x+w-36} ${y+h-60}) rotate(8)`}><polygon points={burst(32,24,16)} className="rt-f-orange rt-s-ink" strokeWidth="2"/><text y="-2" textAnchor="middle" className="rt-burst-big">{total||'100s'}</text><text y="9" textAnchor="middle" className="rt-burst">STICKERS</text></g>
    <rect x={x} y={y+h-24} width={w} height="24" className="rt-f-lime"/>
    <text x={cx} y={y+h-7} textAnchor="middle" className="rt-foot">COLLECT THEM ALL!</text>
    {owner&&<g transform={`translate(${x+w-70} ${y+148}) rotate(4)`}><rect width="62" height="28" className="rt-f-ivory rt-s-ink" strokeWidth="1.5"/><text x="31" y="10" textAnchor="middle" className="rt-label-s">THIS ALBUM BELONGS TO</text><text x="31" y="22" textAnchor="middle" className="rt-label">{owner.toUpperCase().slice(0,14)}</text></g>}
   </>}
   <rect x={x} y={y} width={w} height={h} fill="black" filter={`url(#n${u})`} opacity=".6"/>
  </g>
 </svg>
}

function burst(r1:number,r2:number,n:number){
 return Array.from({length:n*2},(_,i)=>{const a=Math.PI*i/n,r=i%2?r2:r1;return `${(Math.cos(a)*r).toFixed(1)},${(Math.sin(a)*r).toFixed(1)}`}).join(' ')
}

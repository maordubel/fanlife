import {SHARE_FONTS,type FontKey,type Measure} from '@/lib/share/v3/render'
import {auditColours,onColour,sharePalette,shareClub} from '@/lib/share/v3/theme'
import {COVER_LINK,coverOk,type CoverData} from './cover'

/**
 * The LEGENDS MANAGER cover renderer (U05) — an extension of the V3 share kit, not a second one: the same club palette (with the
 * club's rival-colour policy), fonts and measuring, drawn as one self-contained SVG at 1080×1920 (story) or 1080×1350 (feed).
 * Every line is fitted to its print area by the caller's `measure`; a line that cannot fit even at the smallest size is reported
 * in `warnings` rather than overflowing. The approved Legends badge is placed as given (mono — it is never redrawn or recoloured).
 * The person's alias prints only when `showAlias` is true; it is hidden by default. Client-safe, no DOM.
 */
export type CoverFormat='story'|'feed'
export const COVER_FORMATS:Record<CoverFormat,{w:number;h:number;label:string}>={story:{w:1080,h:1920,label:'Story 1080×1920'},feed:{w:1080,h:1350,label:'Feed 1080×1350'}}
export type CoverOptions={format:CoverFormat;alias?:string;showAlias?:boolean;assets:{logo:string;fontCss:string};measure:Measure}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
export function renderCover(d:CoverData,o:CoverOptions):{svg:string;warnings:string[]}{
 if(!coverOk(d))throw new Error('This cover carries a field a public cover may not.')
 const club=shareClub(d.club);if(!club)throw new Error('Unknown club')
 const {w:W,h:H}=COVER_FORMATS[o.format],story=o.format==='story',P=sharePalette(club),warnings:string[]=[],out:string[]=[]
 const add=(s:string)=>{out.push(s)}
 const safe=story?260:48                      // Instagram keeps the top and bottom 260px of a story for itself
 const tx=(s:unknown,x:number,y:number,n:number,k:FontKey,fill:string,max:number,anchor='start',min=18)=>{
  const t=String(s??'');let at=n;while(o.measure(t,at,k)>max&&at>min)at-=.5
  if(o.measure(t,at,k)>max+.5)warnings.push(`"${t.slice(0,24)}" does not fit its print area.`)
  add(`<text x="${x}" y="${y}" font-family="${SHARE_FONTS[k].family}" font-weight="${SHARE_FONTS[k].weight}" font-size="${at}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`)
  return at
 }
 const rect=(x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="3"`:''}/>`)
 add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${d.clubName} — ${d.headline}`)}" data-template="legends-cover" data-kind="${d.kind}" data-format="${o.format}" data-club="${club.id}">`)
 add(`<defs><style>${o.assets.fontCss}</style></defs>`)
 rect(0,0,W,H,P.paper)
 // the masthead slab (also the top of the story's reserved band)
 const mast=story?236:210;rect(0,0,W,mast,P.slabHead)
 const onMast=onColour(P.slabHead);tx('LEGENDS MANAGER',52,story?150:128,story?64:58,'display',onMast,W-380)
 tx(`ISSUE ${String(d.season).padStart(2,'0')}`,W-52,story?150:128,26,'mono',onMast,260,'end')
 add(`<line x1="52" y1="${mast-34}" x2="${W-52}" y2="${mast-34}" stroke="${onMast}" stroke-width="2"/>`)
 // badge + club
 const logo=story?300:170,ly=mast+(story?50:34)
 add(`<image href="${esc(o.assets.logo)}" x="52" y="${ly}" width="${logo}" height="${logo}"/>`)
 const cx=52+logo+40,cw=W-cx-52,cy=ly+logo*(story?.2:.12)
 rect(cx,cy,cw,story?96:80,P.primary);tx(d.clubName.toUpperCase(),cx+22,cy+(story?68:57),story?64:52,'condensed',P.onPrimary,cw-44)
 tx(d.stamp,cx+2,cy+(story?150:128),story?30:26,'mono',P.ink,cw-4)
 // headline + the big thing
 let y=ly+logo+(story?120:84)
 tx(d.headline,52,y,story?140:100,'display',P.red,W-104,'start',40)
 y+=story?290:196
 tx(d.big,52,y,story?260:170,'condensed',P.navy,W-104,'start',60)
 y+=story?70:48
 tx(d.label,52,y,story?40:32,'mono',P.ink,W-104)
 y+=story?64:44;add(`<line x1="52" y1="${y}" x2="${W-52}" y2="${y}" stroke="${P.ink}" stroke-width="3"/>`)
 y+=story?64:46
 for(const l of d.lines.slice(0,3)){tx(l,52,y,story?42:34,'body',P.ink,W-104);y+=story?60:46}
 if(d.star){y+=14;rect(52,y-(story?44:36),W-104,story?78:62,P.slabA);tx(`${d.star.name} · ${d.star.detail}`,76,y+(story?12:10),story?42:34,'condensed',onColour(P.slabA),W-152);y+=story?96:74}
 if(o.showAlias&&o.alias&&o.alias.trim()){tx(`Manager: ${o.alias.trim().slice(0,18)}`,52,y+18,story?30:26,'mono',P.muted,W-104)}
 // the invitation (the bottom of a story is reserved: colour and the address only)
 const fh=story?safe:140,fy=H-fh;rect(0,fy,W,fh,P.slabB)
 const onFoot=onColour(P.slabB),host=COVER_LINK(d.club).replace(/^https:\/\//,'').replace(/\?.*$/,'')
 tx('BUILD YOURS',52,fy+(story?100:62),story?52:46,'display',onFoot,W-104)
 tx(host,52,fy+(story?160:112),story?28:26,'mono',onFoot,W-104)
 if(y>fy-24)warnings.push('The cover content runs into the footer.')
 add('</svg>')
 const svg=out.join('')
 const bad=auditColours(svg,club);if(bad.length)warnings.push(`Forbidden colours for ${club.name}: ${bad.join(', ')}`)
 return {svg,warnings}
}

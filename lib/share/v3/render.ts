import type {ShareArt,ShareTemplate} from './templates'
import {auditColours,onColour,sharePalette,shareClub,type InkMode,type SharePalette} from './theme'

/**
 * THE V3 RENDERER — the owner's approved halftone magazine kit (Share Studio V3, 8.10.2026), ported as a pure
 * function: template + public data + format → one self-contained SVG (fonts and images inlined by the caller).
 * Club colour governs the whole composition; decorative images and the FAN LIFE crest print in monochrome; a real
 * photo keeps its colours only when the person chooses so. Text is measured by the caller's `measure` (a canvas in
 * the browser) so every line shrinks to its print area instead of overflowing. Client-safe, no DOM.
 */
export type ShareFormat='story'|'square'|'link'
export const SHARE_FORMATS:Record<ShareFormat,{w:number;h:number;label:string}>={story:{w:1080,h:1920,label:'Story'},square:{w:1080,h:1080,label:'Post'},link:{w:1200,h:630,label:'Link'}}
export type FontKey='display'|'condensed'|'body'|'mono'|'serif'
export const SHARE_FONTS:Record<FontKey,{family:string;weight:number;file:string}>={display:{family:'FLBowlby',weight:400,file:'FLBowlby'},condensed:{family:'FLKarantina',weight:700,file:'FLKarantina'},body:{family:'FLArchivo',weight:600,file:'FLArchivo'},mono:{family:'FLCourier',weight:400,file:'FLCourier'},serif:{family:'FLSerif',weight:700,file:'FLSerif'}}
export type Measure=(text:string,size:number,font:FontKey)=>number
export type ShareAssets={logo:string;shirt:string;art:Record<ShareArt,string>;fontCss:string}
/** The public, already-filtered data a card prints. Nothing private or secret may be put here. */
export type ShareData={club:string;headline:string;context:string;main:string;label:string;detail:string;cta:string;rows:string[]
 statement?:string;alias?:string;showAlias?:boolean;inkMode?:InkMode;photo?:string;photoMode?:'monochrome'|'original';art?:ShareArt;sample?:boolean;link:string}
export type Rendered={svg:string;warnings:string[];palette:SharePalette;size:{w:number;h:number}}

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
const SURFACE_LABEL:Record<string,string>={hate:'DERBY ARCHIVE',blindcow:'BLIND COW',wardrobe:'SHIRTS & STORIES',member:'SUPPORTER CARD',kit:'KIT BUILDER',wanted:'COLLECTOR NOTICE',gaps:'MISSING SEASONS',match:'SHIRT EXCHANGE',away:'AWAY DAYS'}
function pattern(P:SharePalette){let shape='';if(P.pattern==='stripes')shape=`<path d="M0 0V24" stroke="${P.paper}" stroke-width="5"/>`;if(P.pattern==='diagonal')shape=`<path d="M-6 6L6 -6M0 24L24 0M18 30L30 18" stroke="${P.paper}" stroke-width="3"/>`;if(P.pattern==='rules')shape=`<path d="M0 12H24" stroke="${P.paper}" stroke-width="2"/>`;return `<pattern id="club-print" width="24" height="24" patternUnits="userSpaceOnUse">${shape}</pattern>`}

export function renderShare(t:ShareTemplate,d:ShareData,format:ShareFormat,{assets,measure,guides=false}:{assets:ShareAssets;measure:Measure;guides?:boolean}):Rendered{
 const size=SHARE_FORMATS[format],W=size.w,H=size.h,story=format==='story',link=format==='link'
 const merged=['collection','exchange','journey','stand'].includes(t.layout)
 const club=shareClub(d.club);if(!club)throw new Error('Unknown club')
 const P=sharePalette(club,d.inkMode),A=assets,out:string[]=[],warnings:string[]=[],rows=d.rows
 const statement=String(d.statement||'').trim(),personalDetail=statement||d.detail
 if(d.showAlias&&(!String(d.alias||'').trim()||String(d.alias).length>18))warnings.push('Use a public alias of 1–18 characters, or share anonymously.')
 if(statement.length>210)warnings.push('Shorten your words to 210 characters.')
 if(['life','album'].includes(t.layout)&&/\b\d{1,3}\s*%|\b(?:my score|my rank|points earned)\b/i.test([statement,d.detail].join(' ')))warnings.push('LIFE shares carry your memory, not a score or ranking.')
 const add=(s:string)=>{out.push(s)}
 const rect=(x:number,y:number,w:number,h:number,fill=P.paper,stroke:string|null=null,sw=2,extra='')=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''} ${extra}/>`)
 const line=(x1:number,y1:number,x2:number,y2:number,c=P.ink,sw=2,dash='')=>add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"${dash?` stroke-dasharray="${dash}"`:''}/>`)
 const path=(v:string,c=P.ink)=>add(`<path d="${v}" fill="${c}"/>`)
 const image=(url:string,x:number,y:number,w:number,h:number,original=false)=>add(`<image filter="${original?'none':'url(#club-mono)'}" href="${esc(url)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`)
 const f=(k:FontKey)=>SHARE_FONTS[k]
 function tx(s0:unknown,x:number,y:number,n=32,k:FontKey='body',colour=P.ink,max=Infinity,anchor='start',field=''){
  const s=String(s0??'');let at=n;while(measure(s,at,k)>max&&at>18)at-=.5
  if(measure(s,at,k)>max+.5)warnings.push(`Shorten ${field||'text'}; it exceeds its print area.`)
  add(`<text x="${x}" y="${y}" font-family="${f(k).family}" font-weight="${f(k).weight}" font-size="${at}" fill="${colour}" text-anchor="${anchor}"${field?` data-field="${esc(field)}"`:''}>${esc(s)}</text>`);return at
 }
 function para(s:unknown,x:number,y:number,max:number,n=28,k:FontKey='body',lines=2,colour=P.ink,field=''){
  const words=String(s??'').split(/\s+/).filter(Boolean)
  const wrap=(at:number)=>{const a:string[]=[];let row='';for(const word of words){const next=row?row+' '+word:word;if(row&&measure(next,at,k)>max){a.push(row);row=word}else row=next}if(row)a.push(row);return a}
  let at=n,a=wrap(n);while(a.length>lines&&at>20){at-=.5;a=wrap(at)}if(a.length>lines)warnings.push(`Shorten ${field||'text'}.`)
  a.slice(0,lines).forEach((r,i)=>tx(r,x,y+i*at*1.15,at,k,colour,max,'start',field?field+'.'+i:''));return a.length*at*1.15
 }
 const rough=(x:number,y:number,w:number,h:number,c=P.slabB)=>{add('<g mask="url(#wear-mask)">');const shape=`M${x} ${y+12} L${x+w*.3} ${y} L${x+w*.31} ${y+7} L${x+w*.77} ${y+4} L${x+w} ${y+17} L${x+w-11} ${y+h*.36} L${x+w} ${y+h*.72} L${x+w-6} ${y+h} L${x+w*.69} ${y+h-6} L${x+w*.35} ${y+h} L${x+7} ${y+h-5} Z`;path(shape,c);if(P.pattern!=='plain')add(`<path d="${shape}" fill="url(#club-print)" opacity=".1"/>`);add('</g>')}
 const main=d.main,label=d.label
 if(rows.length>t.rowLimit)warnings.push(`This card has ${t.rowLimit} row slots.`)
 if(t.kind==='rumble'&&rows.length!==5)warnings.push('Include all five selected players.')
 if(t.kind==='score'&&rows.length&&rows.every(x=>['✓','×'].includes(x))){const m=String(main).match(/^(\d+)\/(\d+)$/);if(m&&(Number(m[1])!==rows.filter(x=>x==='✓').length||Number(m[2])!==rows.length))warnings.push('The result must match the marks.')}
 if(t.kind==='gaps'&&/^\d+$/.test(String(main))&&Number(main)!==rows.length)warnings.push('The count must match the list.')
 if(t.kind==='xi'&&rows.length!==11)warnings.push('An XI card needs all 11 names.')

 add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.name)}" data-template="${t.id}" data-format="${format}" data-club="${club.id}" data-theme-version="3">`)
 add(`<defs><style>${A.fontCss}</style><filter id="club-mono" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>${pattern(P)}<filter id="wear-noise" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="1" seed="19"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="8" intercept="-2.4"/><feFuncG type="linear" slope="8" intercept="-2.4"/><feFuncB type="linear" slope="8" intercept="-2.4"/><feFuncA type="table" tableValues="1 1"/></feComponentTransfer></filter><mask id="wear-mask" x="-100" y="-100" width="2500" height="2500" maskUnits="userSpaceOnUse"><rect x="-100" y="-100" width="2500" height="2500" fill="white" filter="url(#wear-noise)"/></mask><pattern id="grain" width="68" height="71" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r=".7" fill="${P.ink}" opacity=".14"/><circle cx="19" cy="27" r=".65" fill="${P.ink}" opacity=".15"/><circle cx="38" cy="14" r=".8" fill="${P.ink}" opacity=".12"/><circle cx="59" cy="51" r=".8" fill="${P.ink}" opacity=".16"/><circle cx="28" cy="63" r=".5" fill="${P.ink}" opacity=".14"/></pattern></defs>`)
 rect(0,0,W,H);rect(0,0,W,H,'url(#grain)')
 // STORY: the 260px Instagram keeps for its own interface is not left as blank paper. The top is the club's own slab
 // (pattern, issue line), the bottom is one torn block that carries the invitation and the address. No reading text
 // lives in either reserved band — only colour, pattern and the masthead line.
 if(story){
  add('<g mask="url(#wear-mask)">');path(`M0 0H${W}V236L${W-90} 252L${W*.62} 241L${W*.31} 258L${W*.08} 244L0 256Z`,P.slabHead)
  if(P.pattern!=='plain')add(`<path d="M0 0H${W}V236L0 256Z" fill="url(#club-print)" opacity=".16"/>`);add('</g>')
  const mast=onColour(P.slabHead);tx('FAN LIFE',52,150,40,'display',mast,420);tx(`NO. ${t.id.slice(0,2)} · ${(SURFACE_LABEL[t.surface]||t.surface).toUpperCase()}`,W-52,148,24,'mono',mast,560,'end')
  line(52,176,W-52,176,mast,2)
 }
 const centered=['collection','exchange','archive','life','album','cover'].includes(t.layout)&&!link
 const top=story?272:link?22:25,logo=story?(centered?196:236):link?138:190
 if(centered){
  rough(-40,top+60,220,logo-70,t.layout==='archive'?P.slabB:P.slabA);rough(W-150,top+135,210,80,P.red)
  image(A.logo,(W-logo)/2,top,logo,logo)
  const cy=top+logo+35;line(52,cy-10,220,cy-10,P.red,5);line(W-220,cy-10,W-52,cy-10,P.green,5);tx(club.name.toUpperCase(),W/2,cy,story?24:21,'mono',P.ink,W-490,'middle','club')
 }else{
  rough(0,top+45,link?610:W,logo-62,t.layout==='identity'?P.slabB:P.slabHead);image(A.logo,link?38:62,top,logo,logo)
  const x=link?197:logo+93,w=link?385:W-x-62
  const rh=link?47:story?84:61,ry=top+logo*(story?.33:.37);rect(x,ry,w,rh,P.primary);tx(club.name.toUpperCase(),x+18,ry+rh*.72,link?23:story?58:30,'condensed',P.onPrimary,w-36,'start','club')
  if(!story)tx(SURFACE_LABEL[t.surface]||t.surface.toUpperCase(),x+2,top+logo*.79,link?18:22,'mono',onColour(P.slabHead),w-12)
 }
 if(d.sample)tx('SAMPLE DATA',W-48,top+15,link?13:16,'mono',P.muted,150,'end')
 const titleX=link?45:52,titleW=link?550:W-104,titleY=story?628:link?248:342,titleN=story?112:link?61:84
 const lines=String(d.headline).split('\n');if(lines.length>2)warnings.push('Use at most two headline lines.')
 let at=titleN;for(const s of lines)while(measure(s,at,'display')>titleW&&at>24)at-=.5
 lines.slice(0,2).forEach((s,i)=>tx(s,titleX,titleY+i*at*1.05,at,'display',i===1?P.red:P.ink,titleW,'start','headline.'+i))
 const contextY=story?786:link?380:457;para(merged&&!story?[d.context,personalDetail].filter(Boolean).join(' · '):d.context,titleX,contextY,titleW,link?21:story?25:23,'mono',link&&merged?3:1,P.ink,'context')
 const B=link?{x:625,y:53,w:535,h:457}:story?{x:52,y:816,w:976,h:606}:{x:52,y:483,w:976,h:449}
 // the person's own words: on a story they are a printed quote under the picture; elsewhere a strip inside it
 const outside=story,scale=B.w/1000,bh=B.h/scale,bottom=bh-(outside?6:84)
 const photograph=(x:number,y:number,w:number,h:number)=>{if(d.photo){const cap=bh-(merged?0:84)-Math.max(0,y);image(d.photo,x,Math.max(0,y),w,Math.min(h,Math.max(60,cap)),d.photoMode==='original')}else image(A.art[d.art||t.art],x,y,w,h)}
 const pill=(s:string,x:number,y:number,w:number,colour=P.navy,n=29)=>{rect(x,y,w,60,colour);tx(s,x+w/2,y+41,n,'mono',P.paper,w-28,'middle')}
 add(`<defs><clipPath id="plate"><rect x="0" y="0" width="1000" height="${bh}"/></clipPath></defs><g transform="translate(${B.x} ${B.y}) scale(${scale})" clip-path="url(#plate)" data-zone="graphic">`)
 const m=(x:number,y:number,n=240,max=460,align='start',c=P.navy)=>tx(main,x,y,n,'condensed',c,max,align,'main')
 const l=(x:number,y:number,w=440,n=27,c=P.ink)=>para(label,x,y,w,n,'mono',2,c,'label')
 const slip=(x:number,y:number,w:number,h:number,turn=0)=>{add(`<g transform="rotate(${turn} ${x+w/2} ${y+h/2})">`);rect(x+5,y+5,w,h,P.ink);rect(x,y,w,h,P.paper,P.ink,2)}
 const close=()=>add('</g>')
 if(t.layout==='cover'){
  rough(250,25,740,bottom,P.slabA);photograph(265,0,730,bottom+15);m(12,134,115,232);l(15,188,228,28);rows.forEach((s,i)=>pill(s,10,270+i*68,310,i===1?P.red:P.petrol,30))
 }else if(t.layout==='team'){
  const h=bottom-37;rough(0,0,1000,bottom,P.slabHead);rect(15,16,970,h,P.paper,P.navy,3);line(15,h/2,985,h/2,P.petrol,2);add(`<circle cx="500" cy="${h/2}" r="65" fill="none" stroke="${P.petrol}" stroke-width="2"/>`)
  let formation=String(main).split('-').map(Number);const valid=formation.length>=3&&formation.length<=4&&formation.every(x=>Number.isInteger(x)&&x>0&&x<=5)&&formation.reduce((a,b)=>a+b,0)===10
  if(!valid){warnings.push('Use a formation of 10 outfield players, for example 4-3-3.');formation=[4,3,3]}
  const points:[number,number][]=[[500,h-54]];formation.forEach((n,i)=>{const y=h-140-i*((h-218)/(formation.length-1));for(let j=0;j<n;j++)points.push([n===1?500:130+j*740/(n-1),y])})
  const gap=(h-218)/(formation.length-1),sh=Math.max(30,Math.min(64,gap*.5)),nm=Math.max(20,Math.min(story?36:31,gap*.36));points.forEach(([x,y],i)=>{image(A.shirt,x-sh/2,y-sh*.85,sh,sh*.92);tx(rows[i]||'',x,y+nm*.95,nm,'body',P.ink,176,'middle','rows.'+i)})
  rect(0,bottom-29,1000,65,P.paper);m(16,bottom+5,42,180);tx(label,985,bottom+4,24,'mono',P.ink,650,'end','label')
 }else if(t.layout==='score'){
  rough(460,20,545,bottom,P.slabA);photograph(427,-8,580,t.kind==='freeze'?bottom+45:820);m(8,Math.min(255,bottom*.58),t.kind==='freeze'?240:300,425);l(13,Math.min(305,bottom*.7),390,30)
  line(13,Math.min(328,bottom*.76),410,Math.min(328,bottom*.76),P.red,9)
  if(t.kind==='score'&&rows.length){
   // every question of THIS run, stamped: a box per mark, ✓ in the club's colour, × in ink — shape and sign, never colour alone
   const y0=Math.min(360,bottom*.8),cols=Math.min(rows.length,6),lines=Math.ceil(rows.length/cols),room=Math.max(30,bottom-y0-8)
   const box=Math.max(26,Math.min(58,(410-(cols-1)*10)/cols,room/lines-10))
   rows.forEach((s,i)=>{const x=14+(i%cols)*(box+10),y=y0+Math.floor(i/cols)*(box+10),ok=s==='✓';rect(x,y,box,box,ok?P.paper:P.ink,P.ink,3);tx(ok?'✓':'×',x+box/2,y+box*.76,box*.74,'body',ok?P.green:P.paper,box,'middle')})
  }
  if(t.kind==='kit')rows.forEach((s,i)=>tx('○ '+s,16,Math.min(393,bottom-68)+i*34,24,'mono',P.ink,360,'start','rows.'+i))
 }else if(t.layout==='programme'){
  rough(460,0,540,bottom,P.slabB);photograph(490,-15,510,bottom+35);slip(12,18,555,bottom-29,-2)
  tx(rows[0]||'',38,64,30,'mono',P.red,500,'start','rows.0');para(rows[1]||'',38,122,480,45,'serif',2,P.ink,'rows.1');tx(rows[2]||'',38,222,27,'mono',P.ink,495,'start','rows.2');m(38,bottom-68,Math.min(180,Math.max(85,(bottom-275)*.8)),480);l(38,bottom-18,480,25);close()
 }else if(t.layout==='collection'||t.layout==='exchange'){
  rough(0,15,1000,bh-15,P.slabB);rough(0,75,620,bh-75,P.slabA);photograph(0,-10,1000,620)
  rect(0,bh-82,1000,82,P.paper);m(8,bh-39,58,425);tx(label,970,bh-45,23,'mono',P.ink,590,'end','label')
  rows.forEach((s,i)=>tx(s,24+i*(950/Math.max(1,rows.length)),bh-8,22,'mono',P.ink,945/Math.max(1,rows.length)-14,'start','rows.'+i))
 }else if(t.layout==='memory'){
  rough(525,20,490,bottom,P.slabB);photograph(515,22,470,bottom-2);m(8,154,204,440);l(12,202,420,29)
  const cw=128,chh=Math.max(48,Math.min(110,(bottom-262)/Math.ceil(rows.length/3)-16));for(let i=0;i<rows.length;i++){const x=10+(i%3)*(cw+20),y=250+Math.floor(i/3)*(chh+16);rect(x+5,y+5,cw,chh,P.ink);rect(x,y,cw,chh,P.paper,P.ink,3);tx('✓',x+cw/2,y+chh*.7,chh*.6,'body',P.green,cw-20,'middle')}
 }else if(t.layout==='ballot'){
  rough(450,0,550,bottom,P.slabA);photograph(430,35,575,bottom-20);slip(12,8,580,bottom-8,-2);m(36,99,100,510);l(38,148,505,27)
  rect(38,201,50,50,'none',P.ink,3);tx('✓',62,240,45,'body',P.green,50,'middle');para(rows[0]||'',111,236,425,43,'serif',2,P.ink,'rows.0');tx(rows[1]||'',38,bottom-44,24,'mono',P.ink,490,'start','rows.1');close()
 }else if(t.layout==='rumble'){
  rough(710,15,280,bottom,P.slabB);photograph(711,22,280,bottom-5);m(10,154,210,640);l(15,203,655,29)
  const y0=238,ch=Math.max(30,Math.min(78,(bottom-y0)/5-8))
  rows.forEach((s,i)=>{const [pos,...rest]=String(s).split(' · '),y=y0+i*(ch+8),name=rest.join(' · ')||pos;rect(15,y,670,ch,P.paper,P.ink,3);if(rest.length){rect(15,y,92,ch,P.slabHead);tx(pos,61,y+ch*.66,Math.min(30,ch*.5),'condensed',onColour(P.slabHead),80,'middle')}tx(name,rest.length?124:32,y+ch*.68,Math.min(40,ch*.58),'serif',P.ink,rest.length?548:640,'start','rows.'+i)})
 }else if(t.layout==='mystery'){
  rough(610,0,390,bottom,P.slabHead);photograph(565,45,445,bottom-42);slip(10,15,600,bottom-24,-1)
  tx('IDENTITY: KEPT UNDER WRAPS',36,58,26,'mono',P.red,547);m(34,218,185,230);l(252,172,314,34);rows.forEach((s,i)=>{rect(35,Math.min(270,bottom-145)+i*47,532,34,P.ink);tx(s,51,Math.min(270,bottom-145)+24+i*47,22,'mono',P.paper,495,'start','rows.'+i)});close()
 }else if(t.layout==='derby'){
  // two clubs, one fixture: the owner's club in its colour, the other side in neutral ink (never the rival's colours)
  const top=Math.min(250,bottom*.42),mid=500
  rough(0,0,mid+8,top,P.slabHead);rough(mid-8,0,1000-mid+8,top,P.ink)
  para(rows[0]||'',30,top*.42,mid-90,52,'serif',2,onColour(P.slabHead),'rows.0');para(rows[1]||'',mid+60,top*.42,mid-90,52,'serif',2,P.paper,'rows.1')
  add(`<circle cx="${mid}" cy="${top/2}" r="58" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>`);tx('V',mid,top/2+24,66,'display',P.ink,80,'middle')
  rough(0,top+18,1000,bottom-top-18,P.slabB);photograph(0,top+18,1000,bottom-top-18)
  slip(18,bottom-150,640,140,-2);m(44,bottom-82,72,590);tx(rows[2]||'',44,bottom-34,26,'mono',P.ink,590,'start','rows.2');close()
 }else if(t.layout==='archive'){
  rough(-15,36,1010,bottom,P.slabB);photograph(0,-80,1000,620)
  const sy=bottom-168;slip(18,sy,956,176,-2);m(44,sy+45,t.kind==='date'?64:56,897);para(rows[0]||'',44,sy+89,894,36,'serif',1,P.ink,'rows.0');tx(label,44,sy+125,23,'mono',P.ink,893,'start','label');tx(rows[1]||'',44,sy+156,21,'mono',P.petrol,890,'start','rows.1');close()
 }else if(t.layout==='timeline'){
  rough(535,12,468,bottom,P.slabB);photograph(531,20,470,bottom-7);m(10,157,204,475);l(15,210,475,28);const n=Math.max(1,rows.length),per=n>6?Math.ceil(n/2):n,cw=Math.min(100,470/per),ch=cw*1.25;rows.forEach((s,i)=>{const r=Math.floor(i/per),x=14+(i%per)*cw,y=262+r*(ch+18);if(i%per===0)line(10,y+ch/2,14+per*cw,y+ch/2,P.ink,4);const ok=s==='✓',no=s==='×';rect(x+4,y,cw-12,ch,ok||!no?P.paper:P.ink,P.ink,3);tx(ok||no?s:'?',x+cw/2-2,y+ch*.7,ch*.55,'body',no?P.paper:P.green,cw-16,'middle','rows.'+i)})
 }else if(t.layout==='life'){
  const ly=bottom<420?-60:0;rough(405,0,595,bottom,P.slabA);photograph(439,-5,560,bottom+5);slip(5,86+ly,520,Math.min(348,bottom-92),-3);tx(rows[0]||'',30,132+ly,27,'mono',P.red,468,'start','rows.0');para(rows[1]||'',30,197+ly,455,46,'serif',2,P.ink,'rows.1');m(30,294+ly,99,454);tx(rows[2]||'',30,343+ly,24,'mono',P.ink,455,'start','rows.2');close();if(!story)l(12,bottom-14,400,25)
 }else if(t.layout==='identity'){
  rough(462,6,540,bottom,P.slabB);photograph(449,0,553,bottom+10);m(12,112,113,442);l(15,155,430,27);rows.forEach((s,i)=>{line(15,262+i*72,413,262+i*72,P.ink,2);tx(s,15,242+i*72,32,'mono',P.ink,420,'start','rows.'+i)})
 }else if(t.layout==='journey'){
  rough(0,100,1000,bh-100,P.slabB);photograph(0,85,1000,600);slip(12,5,600,140,-3);m(28,108,110,150);para(label,196,58,380,25,'mono',2,P.ink,'label');close()
  if(rows.length){rect(18,bh-49,964,50,P.paper);rows.forEach((s,i)=>tx(s,36+i*312,bh-7,25,'mono',P.ink,294,'start','rows.'+i))}
 }else if(t.layout==='stand'){
  rough(0,50,1000,bh-50,P.slabA);photograph(0,-35,1000,620);rect(0,0,1000,55,P.paper);rows.forEach((s,i)=>tx(s,16+i*322,35,25,'mono',P.ink,306,'start','rows.'+i));slip(12,bh-133,960,133,-2);m(40,bh-76,68,905);l(40,bh-20,910,24);close()
 }else if(t.layout==='wanted'||t.layout==='gaps'){
  rough(492,10,498,bottom,P.slabB);photograph(495,10,492,bottom-12);m(8,104,t.layout==='gaps'?145:91,447);l(12,156,450,26);rows.forEach((s,i)=>{rect(14,232+i*46,22,22,'none',P.ink,2);tx(s,52,252+i*46,28,'mono',P.ink,394,'start','rows.'+i)})
 }else if(t.layout==='daily'){
  rough(470,0,530,bottom,P.slabA);photograph(447,0,555,bottom+10);m(9,119,111,453);l(14,169,430,26);rows.forEach((s,i)=>pill(s,12,230+i*63,360,i===1?P.red:P.navy,28))
 }else if(t.layout==='album'){
  rough(490,23,510,bottom,P.slabB);photograph(490,20,515,bottom-7);m(10,75,74,470);l(14,113,451,25);rows.forEach((s,i)=>{rect(15,163+i*63,420,49,P.paper,P.ink,2);tx(s,31,197+i*63,29,'mono',P.ink,389,'start','rows.'+i)})
 }
 // the person's own words sit on a clean print strip, outside the art and above the invitation
 if(!merged&&!outside){rect(0,bh-70,1000,70,P.paper);para(personalDetail,8,bh-42,985,28,'serif',2,P.ink,'detail')}
 add('</g>')
 if(outside){
  // “ quote ” — the first-person sentence is the loudest thing after the headline
  const qy=1452;tx('“',44,qy+86,150,'display',P.red,90)
  const used=para(statement||d.detail,140,qy+46,W-200,statement?48:38,'serif',2,P.ink,'detail')
  if(statement&&d.detail)tx(d.detail,140,qy+46+used+8,24,'mono',P.muted,W-200,'start','detailLine')
 }
 const fy=story?1586:link?524:945,fh=story?H-1586+20:link?106:135
 const base=['archive','journey','identity','timeline'].includes(t.layout)?P.slabB:['collection','stand','cover','daily'].includes(t.layout)?P.slabA:P.paper,footer=story&&base===P.paper?P.ink:base,dark=footer!==P.paper,fc=onColour(footer)
 rough(-15,fy,W+30,fh,footer)
 if(d.showAlias&&String(d.alias||'').trim())tx('BY '+String(d.alias).trim().toUpperCase(),W/2,fy+(link?19:25),link?16:20,'mono',fc,W-104,'middle','publicAlias')
 const ctaY=story?1638:link?569:1000;tx(String(d.cta).toUpperCase(),W/2,ctaY,story?42:link?27:33,'display',fc,W-104,'middle','cta')
 const urlY=story?1696:link?608:1050;line(52,urlY-11,140,urlY-11,dark?fc:P.red,4);line(W-140,urlY-11,W-52,urlY-11,dark?fc:P.green,4)
 let host='fanlife.dubelteam.com';try{host=new URL(d.link).host}catch{/* printed address falls back to the portal */}
 tx(host,W/2,urlY,story?30:link?23:28,'mono',fc,W-330,'middle','site')
 if(story){tx('FOOTBALL. FOREVER.',W/2,1812,30,'display',fc,W-104,'middle');line(W/2-180,1840,W/2+180,1840,fc,2)}
 if(guides){const s=story?260:25;rect(25,s,W-50,H-2*s,'none',P.muted,2,'stroke-dasharray="10 8"')}
 add('</svg>')
 const svg=out.join('\n')
 for(const c of auditColours(svg,club))warnings.push(`Forbidden club colour in graphic: ${c}`)
 return {svg,warnings,palette:P,size}
}

/** The message that travels with the image: same statement, context and link — never more than the card shows. */
export function shareCaption(t:ShareTemplate,d:ShareData){
 const words=String(d.statement||'').trim()||d.detail
 const list=['xi','gaps','rumble'].includes(t.kind)?d.rows.join(' · '):''
 return [d.headline.replace(/\n/g,' '),d.context,[d.main,d.label].filter(Boolean).join(' · '),list,words,d.showAlias&&d.alias?.trim()?`— ${d.alias.trim()}`:'',d.cta,d.link].filter(Boolean).join('\n')
}

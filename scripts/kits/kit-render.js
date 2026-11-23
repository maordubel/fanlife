/* Kit renderer: one complete kit (shirt, shorts, socks) from measured layers, as an SVG string. Plain JS, no imports: the archive page inlines this file,
   and scripts/kits/export-kit-svgs.mjs runs it in Node. A kit is {shirt:{design,colours,hex,measured},shorts,socks,sponsor,crest}. */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex=(k,i)=>k.shirt.hex[k.shirt.colours[i]]||'#101010';
const lum=h=>{const n=parseInt(h.slice(1),16);return .3*(n>>16&255)+.59*(n>>8&255)+.11*(n&255)};
const shade=(h,f)=>{const n=parseInt(h.slice(1),16),c=v=>Math.max(0,Math.min(255,Math.round(v*(1+f)))).toString(16).padStart(2,'0');return '#'+c(n>>16&255)+c(n>>8&255)+c(n&255)};
let uid=0;


/* One complete kit on a 430x470 board: shirt (340x320), shorts below, socks to the right. Drawn from the measured layers only.
   Realism pass (10.10.2026): soft fold shading under the arms and along the armhole seams, ribbed collar with the dark inside of the neck,
   cuff bands cut to the sleeve, hem and waist ribs, drawstring, a finer weave and a ground shadow. Geometry of the board is unchanged. */
/* Studio pass (23.11.2026, owner: "this is the level for every club" — the Hapoel kit-studio drawings): a tailored cut (sloped shoulders,
   set-in sleeves on a curved armhole, a body that narrows to the waist and a rounded hem), an ink contour, fold creases where cloth gathers,
   a ribbed collar with the inside of the neck showing, ribbed cuffs. Same 340x320 board and the same crest, maker and sponsor places. */
const BODY='M124 30C138 47 153 53 170 53S202 47 216 30L272 42C292 70 316 120 336 145L306 174C296 160 282 146 265 136C262 180 255 222 255 252C256 270 259 286 260 300C206 312 134 312 80 300C81 286 84 270 85 252C85 222 78 180 75 136C58 146 44 160 34 174L4 145C24 120 48 70 68 42Z';
const SL_L='M84 38L68 42C48 70 24 120 4 145L34 174C44 160 58 146 75 136C88 110 94 70 84 38Z',SL_R='M256 38L272 42C292 70 316 120 336 145L306 174C296 160 282 146 265 136C252 110 246 70 256 38Z';
const CUFFS='M4 145L34 174L40 162L10 133Z M336 145L306 174L300 162L330 133Z';
const NECK_IN='M128 29C145 21 195 21 212 29C198 42 142 42 128 29Z';
/* the cloth's creases, drawn once for the left half and mirrored */
const FOLDS_SOFT='<path d="M78 140C80 170 84 200 86 236" stroke-opacity=".26" stroke-width="14"/><path d="M84 38C94 70 88 110 75 136" stroke-opacity=".28" stroke-width="9"/><path d="M24 132C36 116 50 106 66 102" stroke-opacity=".22" stroke-width="10"/><path d="M80 140C96 150 108 158 124 164" stroke-opacity=".24" stroke-width="7"/><path d="M80 292C120 300 150 302 170 302" stroke-opacity=".12" stroke-width="8"/>';
const FOLDS_INK='<path d="M78 140C92 150 104 156 120 160"/><path d="M80 152C92 162 102 168 114 176"/><path d="M76 132C86 128 96 128 106 133"/><path d="M86 222C96 230 104 236 114 240" stroke-opacity=".22"/><path d="M88 252C98 258 108 260 118 260" stroke-opacity=".2"/><path d="M30 134C40 126 52 122 62 124"/><path d="M46 110C54 104 62 102 70 104" stroke-opacity=".22"/><path d="M122 42C112 58 102 72 94 84" stroke-opacity=".18"/>';
const SHORTS='M8 0H192L200 112Q200 128 184 130L114 130Q104 130 100 114Q96 130 86 130L16 130Q0 128 0 112Z';
const SOCK='M0 0H34L36 112Q36 140 54 150Q72 160 66 182Q40 190 12 184Q-4 176 0 150Z';

/* Chest sponsor, lettered (rule 25: never a redrawn logo): weight, case, family, tracking and — on the archive drawings only — the colour the real
   lettering is printed in, from content/manual/sponsor-type.json (injected as SPONSOR_TYPE). Falls back to the plain condensed capitals. */
const FAM={heavy:"'Archivo Black','Arial Black',Impact,sans-serif",cond:"'Bebas Neue','Arial Narrow',Impact,sans-serif",round:"Nunito,'Varela Round','Arial Rounded MT Bold','Trebuchet MS',sans-serif",serif:"Georgia,'Times New Roman',serif"};
const contrast=(a,b)=>{const L=h=>{const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)};const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};

/* Real marks (content/manual/maker-marks.json, injected as MARKS): the maker's mark on the chest, a sponsor's mark where one exists. A name with no mark is lettered. */
let markUid=0;
function markG(m,cx,cy,w,h,fill,halo){
  const [x0,y0,vw,vh]=m.viewBox.split(' ').map(Number),k=Math.min(w/vw,h/vh),tx=cx-(x0+vw/2)*k,ty=cy-(y0+vh/2)*k;
  if(m.kind==='raster'){
    const src=typeof RESOLVE==='function'?RESOLVE(m.src):m.src,id='mk'+(++markUid);
    const img=`<image href="${src}" x="${x0}" y="${y0}" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet"/>`;
    return m.print==='mono'?`<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})"><mask id="${id}" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${vw}" height="${vh}">${img}</mask><rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="${halo}" fill-opacity=".0" mask="url(#${id})"/><rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="${fill}" mask="url(#${id})"/></g>`:`<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">${img}</g>`;
  }
  const body=m.kind==='stroke'?`<path d="${m.d}" fill="none" stroke="${fill}" stroke-width="${m.strokeWidth}" stroke-linejoin="round"/>`:`<path d="${m.d}" fill="${fill}"/>`;
  const back=m.kind==='stroke'?`<path d="${m.d}" fill="none" stroke="${halo}" stroke-opacity=".5" stroke-width="${m.strokeWidth+5}" stroke-linejoin="round"/>`:`<path d="${m.d}" fill="${halo}" fill-opacity=".5" stroke="${halo}" stroke-opacity=".5" stroke-width="${1.6/k}" stroke-linejoin="round"/>`;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">${back}${body}</g>`;
}
const markOf=(group,name)=>{const M=typeof MARKS!=='undefined'?MARKS:null;return M&&M[group]?M[group][String(name||'').toLowerCase().trim()]||null:null};
function sponsorSVG(name,base,opt){
  const T=typeof SPONSOR_TYPE!=='undefined'?SPONSOR_TYPE:{default:{},styles:{}},st=T.styles[name]||T.styles[String(name).toLowerCase()]||{},d=T.default||{};
  const light=lum(base)>150,auto=light?'#111':'#fff',halo=light?'#fff':'#000',useBrand=!(opt&&opt.neutral);
  const lines=st.lines||[{t:name,...st}],W=Math.round(108*(st.w||1)),cx=170,top=128+(st.dy||0),n=lines.length;
  const base1=n>1?19:28,sizes=lines.map(l=>base1*(l.scale||1));let y=top+(n>1?-1:2);
  return lines.map((l,i)=>{
    const f=Object.assign({},d,st,l),cs=f.case==='lower'?'toLowerCase':f.case==='asis'?null:'toUpperCase',tx=cs?String(l.t||name)[cs]():String(l.t||name);
    const wc=opt&&opt.patterned&&opt.trim?Math.min(contrast(f.brand||'#000000',base),contrast(f.brand||'#000000',opt.trim)):f.brand?contrast(f.brand,base):0,ink=useBrand&&f.brand&&wc>=3.2?f.brand:auto;
    let sz=sizes[i];const per=(f.fam==='cond'?.42:.58)+(f.track||0);let est=tx.length*sz*per;if(n===1){sz=Math.min(34*(f.scale||1),W*.94/(tx.length*per));est=tx.length*sz*per}else if(est>W){sz=sz*W/est;est=W}
    const yy=y+sz*.8;y+=sizes[i]*(n>1?.98:1);
    const sm=markOf('sponsors',String(l.t||name));if(sm&&sm.replace){const mh=n>1?14:(st.mh||34),ar=(()=>{const q=sm.viewBox.split(' ').map(Number);return q[2]/q[3]})(),my=(n>1?yy-mh*.35:top+22),mc=useBrand&&f.brand&&wc>=3.2?f.brand:auto,mw=Math.min(W*.96,mh*ar),plate=sm.plate&&(lum(base)<190||(opt&&opt.patterned))?`<rect x="${(cx-mw/2-6).toFixed(1)}" y="${(my-mh/2-4).toFixed(1)}" width="${(mw+12).toFixed(1)}" height="${(mh+8).toFixed(1)}" rx="5" fill="#f4f0e6" fill-opacity=".94"/>`:'';return plate+markG(sm,cx,my,mw,mh,mc,halo)}
    const vf=tx.toLowerCase()==='vodafone'?markOf('sponsors','vodafone'):null,gh=sz*.95,tcx=vf?cx+gh*.55:cx;
    const glyph=vf?markG(vf,tcx-est*.5-gh*.45,(n>1?yy:top+30)-sz*.3,gh,gh,useBrand&&wc>=3.2?'#e60000':auto,halo):'';
    return glyph+`<text x="${tcx}" y="${n>1?yy:top+30}" text-anchor="middle" font-family="${FAM[f.fam]||FAM.cond}" font-weight="${f.weight||700}" ${f.italic?'font-style="italic" ':''}font-size="${sz.toFixed(1)}" letter-spacing="${((f.track||0)*sz).toFixed(2)}" fill="${ink}" stroke="${halo}" stroke-opacity="${opt&&opt.patterned?.92:.55}" stroke-width="${opt&&opt.patterned?5.2:2.4}" paint-order="stroke" stroke-linejoin="round"${est>W&&n===1?` textLength="${W}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(tx)}</text>`}).join('');
}
function shirtG(k,id){
  const b=hex(k,0),t=k.shirt.colours.length>1?hex(k,1):shade(hex(k,0),-.14),m=k.shirt.measured||{},d=k.shirt.design;
  const art=k.shirt.artwork||{};
  let pat='',sleeveInk=b;
  const panel=Array.isArray(art.bodyTiles)?art.bodyTiles.filter(t=>/^#[a-f0-9]{6}$/i.test(t.fill)&&/^[MHVZ0-9 .-]+$/.test(t.path)):[];
  const runInk=i=>k.shirt.hex[k.shirt.colours[i]]||b,ry=m.runsY,rx=m.runsX;
  if(!art.centralPanel&&d==='hoops'&&ry&&ry.length>=3){pat=ry.map(r=>`<rect x="0" y="${(30+r[0]*266).toFixed(1)}" width="340" height="${((r[1]-r[0])*266+.6).toFixed(1)}" fill="${runInk(r[2])}"/>`).join('')}
  else if(!art.centralPanel&&(d==='stripes'||d==='pinstripes')&&rx&&rx.length>=3){pat=rx.map(r=>`<rect x="${(82+r[0]*176).toFixed(1)}" y="20" width="${((r[1]-r[0])*176+.6).toFixed(1)}" height="300" fill="${runInk(r[2])}"/>`).join('')}
  else if(art.centralPanel){pat=`<rect x="${art.centralPanel.x}" y="20" width="${art.centralPanel.width}" height="290" fill="${t}"/>`}
  else if(d==='stripes'){const n=Math.max(1,m.stripes||4),w=176/(2*n+1);for(let i=0;i<n;i++)pat+=`<rect x="${82+w*(2*i+1)}" y="20" width="${w}" height="300" fill="${t}"/>`}
  else if(d==='hoops'){const n=Math.max(1,m.hoops||3),h=240/(2*n+1);for(let i=0;i<n;i++)pat+=`<rect x="0" y="${64+h*(2*i+1)}" width="340" height="${h}" fill="${t}"/>`}
  else if(d==='pinstripes'){for(let x=94;x<258;x+=17)pat+=`<rect x="${x}" y="20" width="3.5" height="290" fill="${t}" opacity=".9"/>`}
  else if(d==='half-and-half'){pat=`<rect x="0" y="20" width="170" height="290" fill="${t}"/>`}
  else if(d==='sash'){pat=`<polygon points="82,66 128,52 258,236 258,292 216,292 82,126" fill="${t}"/>`}
  else if(d==='chest band'){pat=art.bandColours?art.bandColours.map((colour,i)=>`<rect x="0" y="${142+20*i}" width="340" height="20" fill="${colour}"/>`).join(''):`<rect x="0" y="126" width="340" height="44" fill="${t}"/>`}
  else if(d==='diagonal'){let g='';for(let i=-4;i<8;i++)g+=`<rect x="${i*72}" y="-120" width="36" height="520" fill="${t}"/>`;pat=`<g transform="rotate(-38 170 170)">${g}</g>`}
  else if(d==='contrasting sleeves'){sleeveInk=t}
  else if(d==='gradient'){pat=`<rect width="340" height="320" fill="url(#${id}g)"/>`}
  else if(d==='graphic'&&!art.omitUnmeasuredGraphics){pat=`<g fill="${t}" opacity=".18">${Array.from({length:60},(_,i)=>`<circle cx="${96+(i%10)*17+(Math.floor(i/10)%2)*8}" cy="${96+Math.floor(i/10)*30}" r="3.2"/>`).join('')}</g>`}
  if(panel.length)pat=panel.map(t=>`<path d="${t.path}" fill="${t.fill}"/>`).join('');
  const light=lum(b)>150,ink=light?'#111':'#fff',edge=shade(b,-.55);
  if(typeof STUDIO!=='undefined'&&STUDIO&&!art.legacyCut)return studioShirtG(k,id,{b,t,pat,sleeveInk,d,ry,art,light,ink,edge});
  const collar=art.collarInk||(d==='contrasting sleeves'?b:t);
  const asset=(src)=>typeof RESOLVE==='function'?RESOLVE(src):src;
  const sp=art.sponsorSrc?`<image href="${esc(asset(art.sponsorSrc))}" x="110" y="128" width="120" height="40" preserveAspectRatio="xMidYMid meet"/>`:k.sponsor?sponsorSVG(k.sponsor,b,{neutral:!!k.neutralSponsor,trim:t,patterned:['stripes','hoops','pinstripes','half-and-half','sash','chest band','diagonal','graphic'].includes(d)}):'';
  const mm=k.maker?markOf('makers',k.maker):null,mAr=mm?(q=>q[2]/q[3])(mm.viewBox.split(' ').map(Number)):1;
  const mk=k.maker?(mm?markG(mm,132,95,mAr>3?34:(mm.kind==='stroke'?30:24),mAr>3?9:(mm.kind==='stroke'?17:15),art.makerInk||ink,art.makerHalo||(light?'#fff':'#000')):`<text x="132" y="98" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="700" font-size="${k.maker.length>8?9:11}" letter-spacing=".6" fill="${ink}" fill-opacity=".8">${esc(k.maker.toUpperCase())}</text>`):'';
  const crestTag=art.crestSrc?`<image href="${esc(asset(art.crestSrc))}" x="188" y="80" width="38" height="42" preserveAspectRatio="xMidYMid meet"/>`:k.crest?`<image href="${k.crest}" x="188" y="80" width="38" height="42" preserveAspectRatio="xMidYMid meet"/>`:'';
  return `<defs><clipPath id="${id}c"><path d="${BODY}"/></clipPath>
<pattern id="${id}p" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H3M.5 0V3" stroke="#000" stroke-opacity=".5" stroke-width=".5"/></pattern>
<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="${id}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<linearGradient id="${id}f" x1="0" x2="1"><stop offset=".18" stop-color="#000" stop-opacity=".34"/><stop offset=".32" stop-color="#fff" stop-opacity=".06"/><stop offset=".46" stop-color="#fff" stop-opacity=".16"/><stop offset=".7" stop-color="#000" stop-opacity=".06"/><stop offset=".84" stop-color="#000" stop-opacity=".36"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="${b}"/><stop offset="1" stop-color="${t}"/></linearGradient></defs>
<ellipse cx="170" cy="304" rx="104" ry="9" fill="#000" opacity=".16" filter="url(#${id}b)"/>
<g clip-path="url(#${id}c)"><g data-layer="shirt-body"><rect width="340" height="320" fill="${b}"/></g><g data-layer="shirt-design">${pat}</g>
<g data-layer="sleeves">
${d==='hoops'&&ry&&ry.length>=3?'':`<path d="${SL_L}" fill="${art.leftSleeveInk||sleeveInk}"/><path d="${SL_R}" fill="${art.rightSleeveInk||sleeveInk}"/>`}
${art.plainCuffs?'':`<path d="M16 120 62 148 76 124 30 98Z M324 120 278 148 264 124 310 98Z" fill="${d==='contrasting sleeves'?b:t}" opacity=".96"/>`}${art.shoulderStripes?`\n<g fill="none" stroke="${t}" stroke-width="3.2" stroke-linecap="round"><path d="M111 30Q79 38 56 61"/><path d="M114 35Q82 43 59 66"/><path d="M117 40Q85 48 62 71"/><path d="M229 30Q261 38 284 61"/><path d="M226 35Q258 43 281 66"/><path d="M223 40Q255 48 278 71"/></g>`:''}
<path d="M30 98 76 124M310 98 264 124" stroke="#000" stroke-opacity=".28" stroke-width="1"/></g>
<g data-layer="fabric-shading">
<rect width="340" height="320" fill="url(#${id}f)"/><rect width="340" height="320" fill="url(#${id}v)"/>
<g filter="url(#${id}b)" fill="none" stroke="#000" stroke-linecap="round"><path d="M84 128C80 150 82 176 86 200" stroke-opacity=".11" stroke-width="10"/><path d="M256 128C260 150 258 176 254 200" stroke-opacity=".11" stroke-width="10"/><path d="M64 52L84 124M276 52L256 124" stroke-opacity=".14" stroke-width="7"/></g>
<g filter="url(#${id}b2)" fill="none" stroke-linecap="round"><path d="M104 160C122 190 118 236 106 288" stroke="#000" stroke-opacity=".07" stroke-width="6"/><path d="M236 160C218 190 222 236 234 288" stroke="#000" stroke-opacity=".07" stroke-width="6"/><path d="M142 200C160 214 186 214 204 200" stroke="#000" stroke-opacity=".07" stroke-width="5"/><path d="M130 100C150 90 190 90 210 100" stroke="#fff" stroke-opacity=".16" stroke-width="8"/></g>
<rect width="340" height="320" fill="url(#${id}p)" opacity=".05"/>
<path d="M88 276C130 286 210 286 252 276L252 292C216 304 124 304 88 292Z" fill="#000" opacity=".1"/>
<path d="M82 282C124 296 216 296 258 282" stroke="${t}" stroke-width="5" stroke-opacity=".5" fill="none"/></g></g>
<g data-layer="collar">${art.vCollar?`<path d="M110 29 170 73 230 29 221 23 170 57 119 23Z" fill="${collar}" stroke="${edge}" stroke-width="1"/>`:`<path d="M110 30C128 46 150 56 170 56S212 46 230 30L226 26C210 38 190 46 170 46S130 38 114 26Z" fill="#000" opacity=".55"/>
<path d="M110 30C128 46 150 56 170 56S212 46 230 30L220 22C204 36 188 42 170 42S136 36 120 22Z" fill="${collar}"/>
<path d="M120 22C136 36 154 42 170 42S204 36 220 22" stroke="#000" stroke-opacity=".3" stroke-width="1.2" fill="none"/><path d="M112 30C130 47 150 55 170 55S210 47 228 30" stroke="#fff" stroke-opacity=".22" stroke-width="1" fill="none"/>`}
${art.poloCollar?`<path d="M120 22L169 44L151 65L123 37Z M220 22L171 44L189 65L217 37Z" fill="${collar}" stroke="${edge}"/><path d="M170 44V76" stroke="${edge}" stroke-width="4"/>`:''}
</g><path d="${BODY}" fill="none" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>
<path d="M82 120V290M258 120V290M64 46L82 120M276 46L258 120" stroke="#000" stroke-opacity=".3" stroke-width="1.1" stroke-dasharray="4 3" fill="none"/>
<g data-layer="club-crest">${crestTag}</g><g data-layer="manufacturer">${mk}</g><g data-layer="sponsor">${sp}</g>`;
}

/* The studio cut (23.11.2026): the owner's drawn crew shirt (scripts/kits/studio-template.json, made by studio-template.py) worn in the
   kit's own colours — its outline, ink folds and fold shadows are the drawing, the colours and patterns are the kit's. Board unchanged. */
const ST_K=340/721,ST_Y=19.5,ST_T=`translate(0 ${ST_Y}) scale(${ST_K.toFixed(5)})`;
/* a collar from the owner's kit studio (crew, polo, lace, v, wrap), in the kit's collar colour and trim */
function collarPart(S,type,a,b){
  const P=S.collars&&S.collars[type];if(!P)return '';
  return `<g transform="${P.t}"><path d="${P.A}" fill="${a}"/><path d="${P.B}" fill="${b}"/>${P.shade.map((d,i)=>`<path d="${d}" fill="#000" fill-opacity="${[.1,.14,.2][i]}"/>`).join('')}<path d="${P.ink}" fill="#170f0c"/></g>`;
}
function studioShirtG(k,id,o){
  const S=STUDIO,{b,t,pat,sleeveInk,d,ry,art,light,ink,edge}=o;
  const collar=art.collarInk||(d==='contrasting sleeves'?b:t);
  const cType=(k.shirt.collar||art.collar||(art.poloCollar?'polo':'crew'));
  const asset=(src)=>typeof RESOLVE==='function'?RESOLVE(src):src;
  const box=(n)=>{const [cx,cy,w,h]=S.marks[n];return {x:cx*ST_K-w*ST_K/2,y:ST_Y+cy*ST_K-h*ST_K/2,w:w*ST_K,h:h*ST_K,cx:cx*ST_K,cy:ST_Y+cy*ST_K}};
  const cr=box('crest'),mb=box('maker');
  const sp=art.sponsorSrc?`<image href="${esc(asset(art.sponsorSrc))}" x="110" y="128" width="120" height="40" preserveAspectRatio="xMidYMid meet"/>`:k.sponsor?sponsorSVG(k.sponsor,b,{neutral:!!k.neutralSponsor,trim:t,patterned:['stripes','hoops','pinstripes','half-and-half','sash','chest band','diagonal','graphic'].includes(d)}):'';
  const mm=k.maker?markOf('makers',k.maker):null,mAr=mm?(q=>q[2]/q[3])(mm.viewBox.split(' ').map(Number)):1;
  const mk=k.maker?(mm?markG(mm,mb.cx,mb.cy,mAr>3?34:(mm.kind==='stroke'?30:24),mAr>3?9:(mm.kind==='stroke'?17:15),art.makerInk||ink,art.makerHalo||(light?'#fff':'#000')):`<text x="${mb.cx.toFixed(1)}" y="${(mb.cy+4).toFixed(1)}" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="700" font-size="${k.maker.length>8?9:11}" letter-spacing=".6" fill="${ink}" fill-opacity=".8">${esc(k.maker.toUpperCase())}</text>`):'';
  const crestSrc=art.crestSrc?esc(asset(art.crestSrc)):k.crest||null;
  const shades=S.shade.map((dd,i)=>`<path d="${dd}" fill="#000" fill-opacity="${[.1,.12,.14,.18][i]}"/>`).join('');
  return `<defs><clipPath id="${id}c"><path d="${S.cut}" transform="${ST_T}"/></clipPath><clipPath id="${id}t"><path d="${S.cut}"/></clipPath>
<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<radialGradient id="${id}h" cx=".48" cy=".3" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="${b}"/><stop offset="1" stop-color="${t}"/></linearGradient>
<linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".6" stop-color="#000" stop-opacity=".08"/></linearGradient></defs>
<ellipse cx="170" cy="312" rx="96" ry="8" fill="#000" opacity=".2" filter="url(#${id}b)"/>
<g clip-path="url(#${id}c)"><g data-layer="shirt-body"><rect width="340" height="340" fill="${b}"/></g><g data-layer="shirt-design">${pat}</g></g>
${art.shoulderStripes?`<g clip-path="url(#${id}c)" fill="none" stroke="${t}" stroke-width="3.2" stroke-linecap="round"><path d="M134 22Q98 30 62 62"/><path d="M137 27Q101 35 65 67"/><path d="M140 32Q104 40 68 72"/><path d="M206 22Q242 30 278 62"/><path d="M203 27Q239 35 275 67"/><path d="M200 32Q236 40 272 72"/></g>`:''}
<g transform="${ST_T}"><g clip-path="url(#${id}t)">
<g data-layer="sleeves">${d==='hoops'&&ry&&ry.length>=3?'':(art.leftSleeveInk||art.rightSleeveInk)?`<clipPath id="${id}sl"><rect width="360.5" height="638"/></clipPath><clipPath id="${id}sr"><rect x="360.5" width="360.5" height="638"/></clipPath><path d="${S.sleeves}" fill="${art.leftSleeveInk||sleeveInk}" clip-path="url(#${id}sl)"/><path d="${S.sleeves}" fill="${art.rightSleeveInk||sleeveInk}" clip-path="url(#${id}sr)"/>`:`<path d="${S.sleeves}" fill="${sleeveInk}"/>`}
${art.plainCuffs?'':`<path d="${S.cuffs}" fill="${d==='contrasting sleeves'?b:t}"/>`}</g>
<g data-layer="collar"><path d="${S.collar}" fill="${collar}"/>
<path d="${S.neck}" fill="${shade(collar,-.06)}"/><path d="${S.neck}" fill="url(#${id}n)"/></g>
<g data-layer="fabric-shading">${shades}<rect width="721" height="638" fill="url(#${id}h)"/></g></g>
<path d="${S.ink}" fill="#170f0c"/>${collarPart(S,cType,collar,collar===b?t:b)}</g>
<g data-layer="club-crest">${crestSrc?`<image href="${crestSrc}" x="${cr.x.toFixed(1)}" y="${cr.y.toFixed(1)}" width="${cr.w.toFixed(1)}" height="${cr.h.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`:''}</g><g data-layer="manufacturer">${mk}</g><g data-layer="sponsor">${sp}</g>`;
}
function shortsG(sh,id){
  const b=sh.hex,t=sh.trimHex||shade(b,-.2),light=lum(b)>150;
  return `<defs><clipPath id="${id}q"><path d="${SHORTS}"/></clipPath><filter id="${id}sb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter></defs>
<ellipse cx="100" cy="136" rx="86" ry="6" fill="#000" opacity=".15" filter="url(#${id}sb)"/>
<g clip-path="url(#${id}q)"><rect width="200" height="140" fill="${b}"/>
${sh.trim?`<polygon points="0,0 30,0 26,140 0,140" fill="${t}"/><polygon points="200,0 170,0 174,140 200,140" fill="${t}"/>`:''}
<rect width="200" height="140" fill="#fff" opacity=".05"/>
<rect width="200" height="16" fill="${sh.trim?t:shade(b,-.14)}"/><rect width="200" height="16" fill="#000" opacity=".12"/>
<path d="M0 8H200" stroke="#000" stroke-opacity=".22" stroke-width="1"/><path d="M0 5H200M0 11H200" stroke="#fff" stroke-opacity=".07" stroke-width="1"/>
<g filter="url(#${id}sb)" fill="none" stroke="#000" stroke-linecap="round"><path d="M100 20C102 60 100 100 100 118" stroke-opacity=".3" stroke-width="7"/><path d="M52 22C62 62 60 100 50 128" stroke-opacity=".16" stroke-width="7"/><path d="M148 22C138 62 140 100 150 128" stroke-opacity=".16" stroke-width="7"/></g>
<path d="M0 118H200" stroke="#000" stroke-opacity=".14" stroke-width="4"/>
<path d="M92 16Q86 40 88 52M108 16Q114 40 112 52" stroke="${light?'#000':'#fff'}" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
<path d="${SHORTS}" fill="none" stroke="#1c1714" stroke-width="3" stroke-linejoin="round"/>
<g fill="none" stroke="${light?'#000':'#fff'}" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="3 3"><rect x="22" y="86" width="26" height="30" rx="3"/></g>`;
}
function sockG(so,dx){
  const b=so.hex,t=so.trimHex||shade(b,-.25),n=++uid,bands=so.bands?`<rect x="-8" y="14" width="52" height="11" fill="${t}"/><rect x="-8" y="34" width="52" height="11" fill="${t}"/>`:'';
  return `<g transform="translate(${dx} 0)"><clipPath id="sk${n}"><path d="${SOCK}"/></clipPath><filter id="skb${n}"><feGaussianBlur stdDeviation="2"/></filter><g clip-path="url(#sk${n})"><rect x="-10" width="60" height="200" fill="${b}"/>${bands}
<rect x="-10" width="60" height="9" fill="#000" opacity=".16"/><path d="M-4 9H44" stroke="#000" stroke-opacity=".2"/>
<g filter="url(#skb${n})"><rect x="-10" width="20" height="200" fill="#000" opacity=".2"/><rect x="26" width="12" height="200" fill="#fff" opacity=".12"/><path d="M0 150Q20 140 50 160" stroke="#000" stroke-opacity=".2" stroke-width="6" fill="none"/></g>
<path d="M4 176Q36 186 64 178" stroke="#000" stroke-opacity=".25" stroke-width="2" fill="none"/></g><path d="${SOCK}" fill="none" stroke="#1c1714" stroke-width="3" stroke-linejoin="round"/></g>`;
}
function kitSVG(k,label){
  const id='k'+(++uid);
  return `<svg viewBox="${k.shorts||k.socks?'0 0 430 470':'0 20 340 300'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label||'')}">${shirtG(k,id)}`
   .replace('</svg>','')+(k.shorts?`<g data-layer="shorts" transform="translate(70 318)">${shortsG(k.shorts,id)}</g>`:'')+(k.socks?`<g data-layer="socks" transform="translate(336 128)">${sockG(k.socks,0)}${sockG(k.socks,24)}</g>`:'')+'</svg>';
}

/* Kit renderer: one complete kit (shirt, shorts, socks) from measured layers, as an SVG string. Plain JS, no imports: the archive page inlines this file,
   and scripts/kits/export-kit-svgs.mjs runs it in Node. A kit is {shirt:{design,colours,hex,measured},shorts,socks,sponsor,crest}. */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex=(k,i)=>k.shirt.hex[k.shirt.colours[i]]||'#101010';
const lum=h=>{const n=parseInt(h.slice(1),16);return .3*(n>>16&255)+.59*(n>>8&255)+.11*(n&255)};
const shade=(h,f)=>{const n=parseInt(h.slice(1),16),c=v=>Math.max(0,Math.min(255,Math.round(v*(1+f)))).toString(16).padStart(2,'0');return '#'+c(n>>16&255)+c(n>>8&255)+c(n&255)};
let uid=0;


/* One complete kit on a 430x470 board: shirt (340x320), shorts below, socks to the right. Drawn from the measured layers only. */
const BODY='M110 30C128 46 150 56 170 56S212 46 230 30L276 46 324 120 278 148 258 120V292C222 304 118 304 82 292V120L62 148 16 120 64 46Z';
const SL_L='M64 46L16 120 62 148 82 120V66Z',SL_R='M276 46L324 120 278 148 258 120V66Z';
const SHORTS='M10 0H190L200 120Q200 132 186 133L118 133L100 54L82 133L14 133Q0 132 0 120Z';
const SOCK='M0 0H34V118Q34 148 58 158Q72 168 64 184Q38 190 10 186Q-6 180 2 150Z';
function shirtG(k,id){
  const b=hex(k,0),t=k.shirt.colours.length>1?hex(k,1):shade(hex(k,0),-.14),m=k.shirt.measured||{},d=k.shirt.design;
  let pat='',sleeveInk=b;
  if(d==='stripes'){const n=Math.max(1,m.stripes||4),w=176/(2*n+1);for(let i=0;i<n;i++)pat+=`<rect x="${82+w*(2*i+1)}" y="20" width="${w}" height="290" fill="${t}"/>`}
  else if(d==='hoops'){const n=Math.max(1,m.hoops||3),h=240/(2*n+1);for(let i=0;i<n;i++)pat+=`<rect x="0" y="${64+h*(2*i+1)}" width="340" height="${h}" fill="${t}"/>`}
  else if(d==='pinstripes'){for(let x=94;x<258;x+=17)pat+=`<rect x="${x}" y="20" width="3.5" height="290" fill="${t}" opacity=".9"/>`}
  else if(d==='half-and-half'){pat=`<rect x="0" y="20" width="170" height="290" fill="${t}"/>`}
  else if(d==='sash'){pat=`<polygon points="82,66 128,52 258,236 258,292 216,292 82,126" fill="${t}"/>`}
  else if(d==='chest band'){pat=`<rect x="0" y="126" width="340" height="44" fill="${t}"/>`}
  else if(d==='diagonal'){let g='';for(let i=-4;i<8;i++)g+=`<rect x="${i*72}" y="-120" width="36" height="520" fill="${t}"/>`;pat=`<g transform="rotate(-38 170 170)">${g}</g>`}
  else if(d==='contrasting sleeves'){sleeveInk=t}
  else if(d==='gradient'){pat=`<rect width="340" height="320" fill="url(#${id}g)"/>`}
  else if(d==='graphic'){pat=`<g fill="${t}" opacity=".18">${Array.from({length:60},(_,i)=>`<circle cx="${96+(i%10)*17+(Math.floor(i/10)%2)*8}" cy="${96+Math.floor(i/10)*30}" r="3.2"/>`).join('')}</g>`}
  const ink=lum(b)>150?'#111':'#fff';
  const plate=d!=='plain'&&d!=='gradient'&&d!=='contrasting sleeves';
  const sp=k.sponsor?`${plate?`<rect x="92" y="164" width="156" height="42" rx="3" fill="#f4f0e6" fill-opacity=".94"/>`:''}<text x="170" y="196" text-anchor="middle" font-family="Bebas Neue,Impact,sans-serif" font-size="${k.sponsor.length>9?25:36}" letter-spacing="1.5" fill="${plate?'#111':ink}" ${k.sponsor.length>9?'textLength="140" lengthAdjust="spacingAndGlyphs"':''}>${esc(k.sponsor.toUpperCase())}</text>`:'';
  return `<defs><clipPath id="${id}c"><path d="${BODY}"/></clipPath>
<filter id="${id}w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .55" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0"/></filter>
<linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".22" stop-color="#fff" stop-opacity=".08"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset=".8" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
<radialGradient id="${id}s" cx=".5" cy=".12" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="${b}"/><stop offset="1" stop-color="${t}"/></linearGradient></defs>
<g clip-path="url(#${id}c)"><rect width="340" height="320" fill="${b}"/>${pat}
<path d="${SL_L}" fill="${sleeveInk}"/><path d="${SL_R}" fill="${sleeveInk}"/>
<path d="M16 120 62 148 76 124 30 98Z M324 120 278 148 264 124 310 98Z" fill="${d==='contrasting sleeves'?b:t}" opacity=".95"/>
<rect width="340" height="320" fill="url(#${id}f)"/><rect width="340" height="320" fill="url(#${id}s)"/>
<path d="M92 150C110 180 108 230 98 292M248 150C230 180 232 230 242 292M140 190C160 202 190 202 200 190" stroke="#000" stroke-opacity=".16" stroke-width="6" fill="none" stroke-linecap="round"/>
<rect width="340" height="320" filter="url(#${id}w)" opacity=".13"/></g>
<path d="M110 30C128 46 150 56 170 56S212 46 230 30L220 24C204 38 188 44 170 44S136 38 120 24Z" fill="${t}"/>
<path d="${BODY}" fill="none" stroke="${shade(b,-.55)}" stroke-width="2" stroke-linejoin="round"/>
<path d="M82 120V290M258 120V290M64 46L82 120M276 46L258 120" stroke="#000" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="4 3" fill="none"/>
<g fill="none" stroke="${lum(b)>150?'#000':'#fff'}" stroke-opacity=".42" stroke-width="1.2" stroke-dasharray="3 3">${k.crest?'':'<rect x="190" y="82" width="34" height="38" rx="3"/>'}<rect x="116" y="86" width="52" height="16" rx="3"/></g>${k.crest?`<image href="${k.crest}" x="188" y="80" width="38" height="42" preserveAspectRatio="xMidYMid meet"/>`:''}${sp}`;
}
function shortsG(sh,id){
  const b=sh.hex,t=sh.trimHex||shade(b,-.2);
  return `<defs><clipPath id="${id}q"><path d="${SHORTS}"/></clipPath></defs><g clip-path="url(#${id}q)"><rect width="200" height="140" fill="${b}"/>
${sh.trim?`<polygon points="0,0 30,0 26,140 0,140" fill="${t}"/><polygon points="200,0 170,0 174,140 200,140" fill="${t}"/>`:''}
<rect width="200" height="12" fill="#000" opacity=".16"/><path d="M60 14C70 60 66 100 56 133M140 14C130 60 134 100 144 133" stroke="#000" stroke-opacity=".14" stroke-width="5" fill="none" stroke-linecap="round"/>
<rect width="200" height="140" fill="#fff" opacity=".05"/></g><path d="${SHORTS}" fill="none" stroke="${shade(b,-.55)}" stroke-width="2" stroke-linejoin="round"/>
<g fill="none" stroke="${lum(b)>150?'#000':'#fff'}" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="3 3"><rect x="22" y="86" width="26" height="30" rx="3"/></g>`;
}
function sockG(so,dx){
  const b=so.hex,t=so.trimHex||shade(b,-.25),bands=so.bands?`<rect x="-8" y="12" width="52" height="12" fill="${t}"/><rect x="-8" y="34" width="52" height="12" fill="${t}"/>`:'';
  return `<g transform="translate(${dx} 0)"><clipPath id="sk${++uid}"><path d="${SOCK}"/></clipPath><g clip-path="url(#sk${uid})"><rect x="-10" width="60" height="200" fill="${b}"/>${bands}<rect x="-10" width="22" height="200" fill="#000" opacity=".12"/><rect x="30" width="12" height="200" fill="#fff" opacity=".08"/></g><path d="${SOCK}" fill="none" stroke="${shade(b,-.55)}" stroke-width="2"/></g>`;
}
function kitSVG(k,label){
  const id='k'+(++uid);
  return `<svg viewBox="${k.shorts||k.socks?'0 0 430 470':'0 20 340 300'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label||'')}">${shirtG(k,id)}`
   .replace('</svg>','')+(k.shorts?`<g transform="translate(70 318)">${shortsG(k.shorts,id)}</g>`:'')+(k.socks?`<g transform="translate(336 128)">${sockG(k.socks,0)}${sockG(k.socks,24)}</g>`:'')+'</svg>';
}

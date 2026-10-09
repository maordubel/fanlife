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
const BODY='M110 30C128 46 150 56 170 56S212 46 230 30L276 46 324 120 278 148 258 120V292C222 304 118 304 82 292V120L62 148 16 120 64 46Z';
const SL_L='M64 46L16 120 62 148 82 120V66Z',SL_R='M276 46L324 120 278 148 258 120V66Z';
const SHORTS='M8 0H192L200 112Q200 128 184 130L114 130Q104 130 100 114Q96 130 86 130L16 130Q0 128 0 112Z';
const SOCK='M0 0H34L36 112Q36 140 54 150Q72 160 66 182Q40 190 12 184Q-4 176 0 150Z';
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
  const light=lum(b)>150,ink=light?'#111':'#fff',edge=shade(b,-.55);
  const collar=d==='contrasting sleeves'?b:t;
  const sp=k.sponsor?`<text x="170" y="196" text-anchor="middle" font-family="Bebas Neue,Impact,sans-serif" font-size="${k.sponsor.length>9?25:36}" letter-spacing="1.5" fill="${ink}" stroke="${light?'#fff':'#000'}" stroke-opacity=".55" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round" ${k.sponsor.length>9?'textLength="140" lengthAdjust="spacingAndGlyphs"':''}>${esc(k.sponsor.toUpperCase())}</text>`:'';
  const mk=k.maker?`<text x="132" y="98" text-anchor="middle" font-family="Archivo,Arial,sans-serif" font-weight="700" font-size="${k.maker.length>8?9:11}" letter-spacing=".6" fill="${ink}" fill-opacity=".8">${esc(k.maker.toUpperCase())}</text>`:'';
  return `<defs><clipPath id="${id}c"><path d="${BODY}"/></clipPath>
<pattern id="${id}p" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H3M.5 0V3" stroke="#000" stroke-opacity=".5" stroke-width=".5"/></pattern>
<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="${id}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset=".2" stop-color="#fff" stop-opacity=".06"/><stop offset=".45" stop-color="#fff" stop-opacity=".14"/><stop offset=".78" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="${b}"/><stop offset="1" stop-color="${t}"/></linearGradient></defs>
<ellipse cx="170" cy="304" rx="104" ry="9" fill="#000" opacity=".16" filter="url(#${id}b)"/>
<g clip-path="url(#${id}c)"><rect width="340" height="320" fill="${b}"/>${pat}
<path d="${SL_L}" fill="${sleeveInk}"/><path d="${SL_R}" fill="${sleeveInk}"/>
<path d="M16 120 62 148 76 124 30 98Z M324 120 278 148 264 124 310 98Z" fill="${d==='contrasting sleeves'?b:t}" opacity=".96"/>
<path d="M30 98 76 124M310 98 264 124" stroke="#000" stroke-opacity=".28" stroke-width="1"/>
<rect width="340" height="320" fill="url(#${id}f)"/><rect width="340" height="320" fill="url(#${id}v)"/>
<g filter="url(#${id}b)" fill="none" stroke="#000" stroke-linecap="round"><path d="M84 128C80 150 82 176 86 200" stroke-opacity=".11" stroke-width="10"/><path d="M256 128C260 150 258 176 254 200" stroke-opacity=".11" stroke-width="10"/><path d="M64 52L84 124M276 52L256 124" stroke-opacity=".14" stroke-width="7"/></g>
<g filter="url(#${id}b2)" fill="none" stroke-linecap="round"><path d="M104 160C122 190 118 236 106 288" stroke="#000" stroke-opacity=".07" stroke-width="6"/><path d="M236 160C218 190 222 236 234 288" stroke="#000" stroke-opacity=".07" stroke-width="6"/><path d="M142 200C160 214 186 214 204 200" stroke="#000" stroke-opacity=".07" stroke-width="5"/><path d="M130 100C150 90 190 90 210 100" stroke="#fff" stroke-opacity=".16" stroke-width="8"/></g>
<rect width="340" height="320" fill="url(#${id}p)" opacity=".05"/>
<path d="M88 276C130 286 210 286 252 276L252 292C216 304 124 304 88 292Z" fill="#000" opacity=".1"/>
<path d="M82 282C124 296 216 296 258 282" stroke="${t}" stroke-width="5" stroke-opacity=".5" fill="none"/></g>
<path d="M110 30C128 46 150 56 170 56S212 46 230 30L226 26C210 38 190 46 170 46S130 38 114 26Z" fill="#000" opacity=".55"/>
<path d="M110 30C128 46 150 56 170 56S212 46 230 30L220 22C204 36 188 42 170 42S136 36 120 22Z" fill="${collar}"/>
<path d="M120 22C136 36 154 42 170 42S204 36 220 22" stroke="#000" stroke-opacity=".3" stroke-width="1.2" fill="none"/><path d="M112 30C130 47 150 55 170 55S210 47 228 30" stroke="#fff" stroke-opacity=".22" stroke-width="1" fill="none"/>
<path d="${BODY}" fill="none" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>
<path d="M82 120V290M258 120V290M64 46L82 120M276 46L258 120" stroke="#000" stroke-opacity=".3" stroke-width="1.1" stroke-dasharray="4 3" fill="none"/>
${k.crest?`<image href="${k.crest}" x="188" y="80" width="38" height="42" preserveAspectRatio="xMidYMid meet"/>`:''}${mk}${sp}`;
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
<path d="${SHORTS}" fill="none" stroke="${shade(b,-.55)}" stroke-width="2" stroke-linejoin="round"/>
<g fill="none" stroke="${light?'#000':'#fff'}" stroke-opacity=".4" stroke-width="1.2" stroke-dasharray="3 3"><rect x="22" y="86" width="26" height="30" rx="3"/></g>`;
}
function sockG(so,dx){
  const b=so.hex,t=so.trimHex||shade(b,-.25),n=++uid,bands=so.bands?`<rect x="-8" y="14" width="52" height="11" fill="${t}"/><rect x="-8" y="34" width="52" height="11" fill="${t}"/>`:'';
  return `<g transform="translate(${dx} 0)"><clipPath id="sk${n}"><path d="${SOCK}"/></clipPath><filter id="skb${n}"><feGaussianBlur stdDeviation="2"/></filter><g clip-path="url(#sk${n})"><rect x="-10" width="60" height="200" fill="${b}"/>${bands}
<rect x="-10" width="60" height="9" fill="#000" opacity=".16"/><path d="M-4 9H44" stroke="#000" stroke-opacity=".2"/>
<g filter="url(#skb${n})"><rect x="-10" width="20" height="200" fill="#000" opacity=".2"/><rect x="26" width="12" height="200" fill="#fff" opacity=".12"/><path d="M0 150Q20 140 50 160" stroke="#000" stroke-opacity=".2" stroke-width="6" fill="none"/></g>
<path d="M4 176Q36 186 64 178" stroke="#000" stroke-opacity=".25" stroke-width="2" fill="none"/></g><path d="${SOCK}" fill="none" stroke="${shade(b,-.55)}" stroke-width="2" stroke-linejoin="round"/></g>`;
}
function kitSVG(k,label){
  const id='k'+(++uid);
  return `<svg viewBox="${k.shorts||k.socks?'0 0 430 470':'0 20 340 300'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label||'')}">${shirtG(k,id)}`
   .replace('</svg>','')+(k.shorts?`<g transform="translate(70 318)">${shortsG(k.shorts,id)}</g>`:'')+(k.socks?`<g transform="translate(336 128)">${sockG(k.socks,0)}${sockG(k.socks,24)}</g>`:'')+'</svg>';
}

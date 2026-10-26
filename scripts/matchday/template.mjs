// Editable code-native template: actual Fan Life identity, deterministic live text.
// No network calls, no provider guesses, no generated/redrawn club crests.
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {crestSlug} from '../../ecosystem/crests/index.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// club crests are the project's own files (public/crests), never a second copy
const CREST_DIR = path.join(ROOT, '..', '..', 'public', 'crests');
const crestFile = id => path.join(CREST_DIR, id + '.png');
export const hasCrest = id => /^[a-z0-9-]+$/.test(id) && existsSync(crestFile(id));
// every other team's crest comes from the universe's one library (OFFSIDES, ecosystem/crests); run.mjs fetches the
// day's crests into this folder before drawing, so the template itself still makes no network call
export const LIB_CACHE = process.env.MATCHDAY_CREST_CACHE || path.join(tmpdir(), 'fanlife-crests');
export const libCrestFile = name => { const s = crestSlug(name); return s ? path.join(LIB_CACHE, s + '.png') : null; };
export const ZONE = 'Europe/Athens';
export const SIZES = {story: {width:1080,height:1920}, post: {width:1080,height:1350}};
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function asset(file) {
  if (file.startsWith('crests/')) return `data:image/png;base64,${readFileSync(crestFile(file.slice(7, -4))).toString('base64')}`;
  const mime = file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'font/woff2';
  return `data:${mime};base64,${readFileSync(path.join(ROOT,'assets',file)).toString('base64')}`;
}
const dayAt = iso => new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export function validate(data) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.day) || new Date(data.day+'T12:00:00Z').toISOString().slice(0,10)!==data.day) throw Error('A valid Athens calendar day is required');
  if (!['complete','partial','unavailable'].includes(data.coverage)) throw Error('Coverage must be explicit');
  if (!Array.isArray(data.fixtures)) throw Error('fixtures must be an array');
  if (!Number.isFinite(Date.parse(data.updatedAt))) throw Error('updatedAt is required');
  if (data.coverage === 'unavailable') throw Error('Provider unavailable: send an operational alert, never a no-games graphic');
  const seen = new Set();
  for (const f of data.fixtures) {
    if (!f.id || seen.has(f.id)) throw Error('Fixture IDs must be unique');
    seen.add(f.id);
    for (const t of [f.home,f.away]) if (!t?.name || !t?.id) throw Error('Both teams need stable IDs and English names');
    if (!['scheduled','live','finished','postponed'].includes(f.status)) throw Error('Unsupported status');
    if (f.kickoff !== null && (!Number.isFinite(Date.parse(f.kickoff)) || dayAt(f.kickoff)!==data.day)) throw Error('Fixture is outside the requested Athens day');
    if (f.kickoff === null && f.localDate !== data.day) throw Error('Date-only fixture needs a verified localDate');
    if (!data.sample && (!f.source?.url || !f.source?.observedAt)) throw Error('Live fixtures need source evidence');
  }
  return data;
}

// The Weekly type is outlined from the project's own fonts for portable output.
const TYPE=JSON.parse(readFileSync(path.join(ROOT,'assets/type-paths.json'),'utf8'));
const P={paper:'#fff8e8',ink:'#141b22',blue:'#246c83',red:'#b9322b',line:'#a99f8d'};
function glyph(char,font){
 const g=TYPE[font].glyphs[char]??TYPE[font].glyphs[char==='—'||char==='–'?'-':char==='’'||char==='‘'?"'":char==='·'?'.':char];
 if(!g)throw Error(`The ${font} font has no glyph for ${char}; use an approved English alias`);
 return g;
}
export function measure(text,size,font='Head'){return [...text].reduce((w,c)=>w+glyph(c,font).a,0)*size/TYPE[font].units;}
function textPath(text,x,y,size,font,color,anchor='start',max=2000,min=14){
 let n=size;while(measure(text,n,font)>max&&n>min)n-=.5;
 const w=measure(text,n,font);if(w>max+.5)throw Error(`Text exceeds its area: ${text}`);
 const scale=n/TYPE[font].units;let px=x-(anchor==='middle'?w/2:anchor==='end'?w:0);
 const out=[`<g aria-label="${esc(text)}" fill="${color}" role="img"><title>${esc(text)}</title>`];
 for(const c of text){const g=glyph(c,font);if(g.d)out.push(`<path d="${g.d}" transform="translate(${px.toFixed(3)} ${y}) scale(${scale.toFixed(8)} ${(-scale).toFixed(8)})"/>`);px+=g.a*scale;}
 out.push('</g>');return out.join('');
}
function wrap(text,size,max,font='Head'){
 const rows=[];let row='';for(const word of text.split(/\s+/)){const next=row?row+' '+word:word;if(row&&measure(next,size,font)>max){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);return rows;
}
function teamName(text,x,cy,max,anchor){
 text=text.toUpperCase();let n=34,rows=wrap(text,n,max);while((rows.length>3||rows.some(r=>measure(r,n)>max))&&n>23){n--;rows=wrap(text,n,max);}
 if(rows.length>3)throw Error('Team name needs an approved shorter display alias: '+text);
 const step=n*1.04,first=cy-(rows.length-1)*step/2+n*.32;
 return rows.map((r,i)=>textPath(r,x,first+i*step,n,'Head',P.ink,anchor,max,23)).join('');
}
function img(file,x,y,w,h,more=''){return `<image href="${asset(file)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${more}/>`;}
function crest(team,x,y,size){
 if(!/^[a-z0-9-]+$/.test(team.id))throw Error('Invalid team ID');
 const file=`crests/${team.id}.png`;
 if(hasCrest(team.id))return img(file,x,y,size,size);
 const lib=libCrestFile(team.name);
 if(lib&&existsSync(lib))return `<image href="data:image/png;base64,${readFileSync(lib).toString('base64')}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
 const initials=team.name.split(/\s+/).slice(0,3).map(w=>[...w][0]).join('');
 return `<circle cx="${x+size/2}" cy="${y+size/2}" r="${size/2-2}" fill="none" stroke="${P.ink}" stroke-width="2"/>`+textPath(initials,x+size/2,y+size*.6,25,'Caps',P.ink,'middle',size-10);
}

export function renderSvg(data,format='story',page=0){
 validate(data);if(!(format in SIZES))throw Error('Unknown format');
 const {width:W,height:H}=SIZES[format],story=format==='story';
 const total=Math.max(1,Math.ceil(data.fixtures.length/4));
 if(!Number.isInteger(page)||page<0||page>=total)throw Error('Invalid page');
 const fixtures=data.fixtures.slice(page*4,page*4+4),out=[];
 const add=x=>out.push(x),rect=(x,y,w,h,fill,extra='')=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`);
 const tx=(s,x,y,n,f='Head',c=P.ink,a='start',max=2000,min=14)=>add(textPath(s,x,y,n,f,c,a,max,min));
 const date=data.sample?(data.edition||'YOUR MATCHDAY'):new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date(data.day+'T12:00:00Z')).toUpperCase();
 const updated=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(data.updatedAt));
 const label=data.sample?'DESIGN SAMPLE · FICTIONAL FIXTURES':data.coverage==='partial'?'PARTIAL SCHEDULE · SOME CLUBS UNCONFIRMED':`DAILY EDITION · ${data.fixtures.length} ${data.fixtures.length===1?'MATCH':'MATCHES'} TODAY`;
 add(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fan Life today's football ${esc(date)}"><title>Fan Life — Today's Football</title><defs><filter id="mono"><feColorMatrix type="saturate" values="0"/></filter><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".75" fill="${P.ink}" opacity=".13"/></pattern></defs>`);
 rect(0,0,W,H,P.paper);rect(0,0,W,H,'url(#dots)');
 if(story){
  rect(0,0,W,245,P.blue);rect(0,239,W,8,P.ink);
  add(`<g opacity=".13" transform="rotate(-7 0 130)">${textPath('FOOTBALL. FOREVER.',-26,158,150,'Head',P.paper)}</g>`);
  add(img('fans-line.png',680,0,365,238,'filter="url(#mono)" opacity=".85"'));
  rect(0,1674,W,246,P.ink);rect(0,1674,W,8,P.blue);
  add(`<g opacity=".09" transform="rotate(-4 0 1810)">${textPath('THE SUPPORT NEVER STOPS.',30,1840,90,'Head',P.paper)}</g>`);
 }
 const mast=story?270:45;
 add(img('fanlife-logo.png',64,mast,112,112));tx('FAN LIFE',200,mast+80,94,'Brand',P.ink,'start',790);
 tx('THE DAILY FIXTURE EDITION',204,mast+110,19,'Caps',P.ink,'start',760);
 rect(64,mast+138,952,6,P.ink);
 if(story){tx('TODAY’S',64,522,120,'Head',P.ink,'start',952);tx('FOOTBALL.',64,638,132,'Head',P.blue,'start',952);}
 else{tx('TODAY’S',64,279,90,'Head',P.ink,'start',405);tx('FOOTBALL.',483,279,90,'Head',P.blue,'start',533);}
 const bar=story?660:306,barH=story?57:50;
 rect(64,bar,952,barH,P.ink);tx(date,82,bar+barH*.69,27,'Caps',P.paper,'start',755);
 tx(`${String(page+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`,994,bar+barH*.67,20,'Caps',P.paper,'end',130);
 tx('ALL KICK-OFFS · ATHENS TIME',64,bar+barH+30,18,'Caps',P.ink,'start',560);
 tx(data.sample?'TIMES FOR LAYOUT ONLY':`UPDATED ${updated}`,1016,bar+barH+30,16,'Caps',P.ink,'end',350);
 const flag=bar+barH+47;
 rect(64,flag,952,36,data.sample?P.paper:P.blue,data.sample?`stroke="${P.red}" stroke-width="2" stroke-dasharray="7 5"`:'');
 tx(label,80,flag+24,18,'Caps',data.sample?P.red:P.paper,'start',920);
 const start=flag+52,space=704;
 if(fixtures.length){
  const rowH=space/fixtures.length;
  fixtures.forEach((f,i)=>{
   const y=start+i*rowH,cy=y+rowH*.57,crestSize=fixtures.length===1?142:fixtures.length===2?106:82;
   tx(`${String(page*4+i+1).padStart(2,'0')} / ${(f.competition||'COMPETITION TBC').toUpperCase()}`,64,y+22,16,'Caps',P.ink,'start',690);
   tx('HOME — AWAY',1016,y+22,15,'Caps',P.ink,'end',230);
   const time=f.status==='postponed'?'P-P':f.kickoff===null?'TBC':new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(f.kickoff));
   const status=f.status==='postponed'?'POSTPONED':f.status==='live'?'LIVE':f.status==='finished'?'PLAYED TODAY':f.kickoff===null?'TIME TBC':'KICK-OFF';
   if(fixtures.length===1){
    add(crest(f.home,155,cy-180,crestSize));add(crest(f.away,783,cy-180,crestSize));
    add(teamName(f.home.name,226,cy+45,310,'middle'));add(teamName(f.away.name,854,cy+45,310,'middle'));
   }else{
    add(crest(f.home,64,cy-crestSize/2,crestSize));add(crest(f.away,1016-crestSize,cy-crestSize/2,crestSize));
    add(teamName(f.home.name,64+crestSize+18,cy,310-crestSize,'start'));
    add(teamName(f.away.name,1016-crestSize-18,cy,310-crestSize,'end'));
   }
   rect(442,cy-37,1,76,P.line);rect(638,cy-37,1,76,P.line);
   tx(time,540,cy+7,fixtures.length===1?49:38,'Goal',P.ink,'middle',177,24);
   tx(status,540,cy+34,14,'Caps',P.ink,'middle',180,12);
   rect(64,y+rowH-6,952,3,P.ink);
  });
 }else{
  add(img('bootball-line.png',300,start+30,480,355));
  tx(data.coverage==='complete'?'NO GAMES TODAY.':'SCHEDULE UNCONFIRMED.',540,start+462,68,'Head',P.ink,'middle',952,35);
  tx(data.coverage==='complete'?'THE TERRACES TAKE A BREATHER.':'NO FIXTURES VERIFIED YET.',540,start+520,29,'Caps',P.ink,'middle',920);
  tx('THE STORIES NEVER STOP.',540,start+564,29,'Caps',P.blue,'middle',920);
  tx('EXPLORE YOUR CLUB’S ARCHIVE',540,start+625,22,'Caps',P.ink,'middle',920);
 }
 const foot=start+space+29;
 tx('THE SUPPORT NEVER STOPS.',540,foot,22,'Caps',P.ink,'middle',952);
 tx('FanLife.DubelTeam.com',540,foot+49,47,'Head',P.ink,'middle',952);
 tx(data.sample?'DESIGN PREVIEW — NOT A REAL FIXTURE LIST':'SCHEDULE SUBJECT TO CHANGE · CHECK FAN LIFE FOR UPDATES',540,foot+79,14,'Caps',data.sample?P.red:P.ink,'middle',952);
 if(foot+79>(story?1668:1320))throw Error('Footer exceeds safe print area');
 add('</svg>');return out.join('\n');
}

export function render(data,format='story',page=0){
 const svg=renderSvg(data,format,page);return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>Fan Life — Today's Football</title><style>html,body{margin:0;background:#fff8e8}svg{display:block}</style></head><body>${svg}</body></html>`;
}

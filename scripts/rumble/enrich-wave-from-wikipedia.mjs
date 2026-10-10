// Reads each roster-wave man's English Wikipedia football-biography infobox and keeps FOUR facts about his time at THIS club:
// years (from–to), league caps, league goals, and his stated position family. Polite (one request, 40 titles, ~1.5s apart, backoff on 429).
// A page counts only when its infobox has a clubs row naming this club — the same rule as fill-positions.mjs. Output: research-data/wp-infobox/<club>.json
// usage: NODE_USE_ENV_PROXY=1 node enrich-wave-from-wikipedia.mjs [club]
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
const CLUB={celtic:/Celtic/,'st-pauli':/St\.? Pauli/,'zrinjski-mostar':/Zrinjski/,'aek-athens':/AEK/,'hapoel-petah-tikva':/Hapoel Petah/i,'hapoel-tel-aviv':/Hapoel Tel[ -]Aviv/i,panathinaikos:/Panathinaikos/,olympiacos:/Olympiacos|Olympiakos/}
const UA='FanLifeResearch/1.0 (https://fanlife.dubelteam.com; maordubel@gmail.com)',sleep=ms=>new Promise(r=>setTimeout(r,ms))
const fam=t=>{t=t.toLowerCase();return /goalkeeper|goalie/.test(t)?'GK':/back|defender|sweeper|stopper|centre-half|center-half|libero/.test(t)?'DF':/midfield|playmaker/.test(t)?'MF':/forward|striker|winger|wing\b|outside|inside/.test(t)?'FW':null}
async function api(params){for(let i=0;i<10;i++){const r=await fetch('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({format:'json',action:'query',redirects:'1',...params}),{headers:{'User-Agent':UA}});const t=await r.text()
 if(r.ok&&t.startsWith('{')){await sleep(1500);return JSON.parse(t)};await sleep(5000*(i+1))}throw new Error('blocked')}
const field=(t,k)=>{const m=new RegExp('\\|\\s*'+k+'\\s*=\\s*([^\\n|]*)','i').exec(t);return m?m[1].replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g,'').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g,'$1').trim():''}
function read(text,club){
 if(!/Infobox (football biography|footballer)/i.test(text)||/may refer to:/.test(text.slice(0,600)))return null
 let from=null,to=null,caps=0,goals=0,hit=false
 for(let i=1;i<=40;i++){const c=field(text,'clubs'+i);if(!c)continue
  if(!CLUB[club].test(c)||/youth|academy|\bU-?\d\d\b/i.test(c))continue
  hit=true;const y=field(text,'years'+i),m=/(\d{4})(?:\s*[–-]\s*(\d{4})?)?/.exec(y);if(m){const a=+m[1],b=m[2]?+m[2]:(/[–-]\s*$/.test(y.trim())?null:a);from=from===null?a:Math.min(from,a);to=b===null?to:(to===null?b:Math.max(to,b))}
  caps+=parseInt(field(text,'caps'+i))||0;goals+=parseInt(field(text,'goals'+i))||0}
 if(!hit)return null
 return {from,to,caps,goals,pos:fam(field(text,'position'))}}
const only=process.argv[2];mkdirSync('research-data/wp-infobox',{recursive:true})
for(const club of Object.keys(CLUB)){if(only&&only!==club)continue
 const wave=JSON.parse(readFileSync(`club-packs/${club}/wave-roster-2026-10-10.json`,'utf8')),out=existsSync(`research-data/wp-infobox/${club}.json`)?JSON.parse(readFileSync(`research-data/wp-infobox/${club}.json`,'utf8')):{}
 const men=wave.players.filter(p=>p.sources.some(s=>s.startsWith('src-wp-roster-'))).map(p=>({id:p.id,title:p.value.aliases[0]??p.value.name})).filter(m=>!(m.id in out))
 for(let i=0;i<men.length;i+=40){const chunk=men.slice(i,i+40),d=await api({prop:'revisions',rvprop:'content|ids',rvslots:'main',titles:chunk.map(m=>m.title).join('|')})
  const redirect=new Map((d.query.redirects||[]).map(r=>[r.from,r.to])),norm=new Map((d.query.normalized||[]).map(r=>[r.from,r.to]))
  for(const m of chunk){const n=norm.get(m.title)??m.title,to=redirect.get(n)??n,pg=Object.values(d.query.pages).find(x=>x.title===to);const text=pg?.revisions?.[0]?.slots?.main?.['*']
   out[m.id]=text?(read(text,club)??{none:'infobox does not name this club'}):{none:'no page'};if(out[m.id].from!==undefined)out[m.id].title=pg.title,out[m.id].rev=pg.revisions[0].revid}
  writeFileSync(`research-data/wp-infobox/${club}.json`,JSON.stringify(out)+'\n')}
 const ok=Object.values(out).filter(x=>x.from!==undefined).length;console.log(club,'men',men.length,'enriched total',ok,'of',Object.keys(out).length)}

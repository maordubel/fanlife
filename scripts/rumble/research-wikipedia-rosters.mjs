// Reads the English Wikipedia category of each club's players (public API, polite: one request at a time, backoff on 429).
// Output: research-data/rosters/<club>.json — { category, fetchedAt, titles[] }. Offline afterwards: nothing else touches the network.
import {writeFileSync,existsSync,readFileSync} from 'node:fs'
const CATS={celtic:'Category:Celtic F.C. players','aek-athens':'Category:AEK Athens F.C. players',olympiacos:'Category:Olympiacos F.C. players',panathinaikos:'Category:Panathinaikos F.C. players','st-pauli':'Category:FC St. Pauli players','zrinjski-mostar':'Category:HŠK Zrinjski Mostar players','hapoel-petah-tikva':'Category:Hapoel Petah Tikva F.C. players','hapoel-tel-aviv':'Category:Hapoel Tel Aviv F.C. players'}
const UA='FanLifeResearch/1.0 (https://fanlife.dubelteam.com; maordubel@gmail.com)'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function get(url,tries=6){for(let i=0;i<tries;i++){const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});const t=await r.text()
 if(r.ok&&t.startsWith('{'))return JSON.parse(t)
 await sleep(4000*(i+1))}throw new Error('blocked: '+url)}
const only=process.argv[2]
for(const [club,cat] of Object.entries(CATS)){if(only&&only!==club)continue
 const file=`research-data/rosters/${club}.json`;if(existsSync(file)&&!process.env.REFRESH){console.log(club,'cached',JSON.parse(readFileSync(file,'utf8')).titles.length);continue}
 const titles=[];let cont=''
 do{const j=await get(`https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(cat)}&cmlimit=500&cmnamespace=0&format=json${cont}`)
  titles.push(...j.query.categorymembers.map(m=>m.title));cont=j.continue?`&cmcontinue=${encodeURIComponent(j.continue.cmcontinue)}`:'';await sleep(1500)}while(cont)
 writeFileSync(file,JSON.stringify({category:cat,fetchedAt:new Date().toISOString().slice(0,10),source:'https://en.wikipedia.org/wiki/'+encodeURIComponent(cat.replace(/ /g,'_')),titles},null,0)+'\n');console.log(club,titles.length)}

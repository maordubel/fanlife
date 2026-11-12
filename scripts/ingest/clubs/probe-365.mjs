// Temporary probe (removed before merge): prints the shape of 365Scores / LiveScore answers the lineups collector reads.
const B='https://webws.365scores.com/web',Q='appTypeId=5&langId=1&timezoneName=Europe/London&userCountryId=1',LS='https://prod-cdn-public-api.livescore.com/v1/api/app'
const get=async u=>{try{const r=await fetch(u,{headers:{accept:'application/json','user-agent':'FanLife-ingest/1.0'}});console.log('GET',r.status,u.slice(0,140));return r.ok?await r.json():null}catch(e){console.log('ERR',u,e.message);return null}}
const keys=(o,d=0)=>o&&typeof o==='object'?Object.fromEntries(Object.entries(o).slice(0,40).map(([k,v])=>[k,Array.isArray(v)?`[${v.length}] `+(v[0]&&typeof v[0]==='object'?JSON.stringify(Object.keys(v[0])):JSON.stringify(v[0])):v&&typeof v==='object'?(d<1?keys(v,d+1):'{…}'):v])):o
for(const q of ['Raja Casablanca','Wydad Casablanca','Al Ahly']){
 const s=await get(`${B}/search/?${Q}&query=${encodeURIComponent(q)}`)
 console.log(q,JSON.stringify((s?.competitors||[]).slice(0,6).map(c=>({id:c.id,name:c.name,country:c.countryId,sport:c.sportId,type:c.type}))))
}
const res=await get(`${B}/games/results/?${Q}&competitors=754&showOdds=false`)
const g=(res?.games||[]).find(x=>x.statusGroup===4&&x.hasLineups)
if(g){const d=await get(`${B}/game/?${Q}&gameId=${g.id}`);const game=d?.game
 console.log('GAME keys',JSON.stringify(Object.keys(game||{})))
 console.log('events sample',JSON.stringify((game?.events||[]).slice(0,4)))
 console.log('member sample',JSON.stringify((game?.members||[]).slice(0,2)))
 const lm=game?.homeCompetitor?.lineups;console.log('lineups keys',JSON.stringify(keys(lm)));console.log('lineup member sample',JSON.stringify((lm?.members||[]).slice(0,3)))
 const on=String(game.startTime).slice(0,10).replace(/-/g,'')
 const day=await get(`${LS}/date/soccer/${on}/0?locale=en`)
 let ev=null;for(const st of day?.Stages||[])for(const e of st.Events||[])if(/celtic/i.test(e.T1?.[0]?.Nm+e.T2?.[0]?.Nm))ev=e
 console.log('LS event keys',JSON.stringify(ev&&Object.keys(ev)))
 if(ev){const lu=await get(`${LS}/lineups/soccer/${ev.Eid}?locale=en`);console.log('LS Lu[0] keys',JSON.stringify(keys(lu?.Lu?.[0])));console.log('LS player sample',JSON.stringify(lu?.Lu?.[0]?.Ps?.slice(0,3)))
  for(const p of ['incidents','scoreboard']){const x=await get(`${LS}/${p}/soccer/${ev.Eid}?locale=en`);console.log('LS',p,JSON.stringify(keys(x)).slice(0,1500));if(x?.Incs)console.log('Incs sample',JSON.stringify(x.Incs).slice(0,1500))}}
}

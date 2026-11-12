// Temporary probe (removed before merge): can 365Scores list a club's results season by season?
const B='https://webws.365scores.com/web',Q='appTypeId=5&langId=1&timezoneName=Europe/London&userCountryId=1'
const get=async u=>{try{const r=await fetch(u,{headers:{accept:'application/json','user-agent':'FanLife-ingest/1.0'}});return {s:r.status,j:r.ok?await r.json():null}}catch(e){return {s:'ERR '+e.message,j:null}}}
for(const [name,id] of [['celtic',754],['zrinjski',5650],['raja',8204]]){
 const r=await get(`${B}/games/results/?${Q}&competitors=${id}&showOdds=false`)
 const g=r.j?.games||[];console.log(name,'results',r.s,g.length,g[0]?.startTime,g[g.length-1]?.startTime,JSON.stringify(r.j?.paging))
 for(const q of ['startDate=01/08/2015&endDate=31/12/2015','fromDate=01/08/2015&toDate=31/12/2015']){const x=await get(`${B}/games/results/?${Q}&competitors=${id}&${q}&showOdds=false`);const gg=x.j?.games||[];console.log(' ',q,x.s,gg.length,gg[0]?.startTime,gg[gg.length-1]?.startTime)}
 const x=await get(`${B}/games/?${Q}&competitors=${id}&startDate=01/08/2015&endDate=31/12/2015&showOdds=false`);const gg=x.j?.games||[];console.log('  games/?startDate',x.s,gg.length,gg[0]?.startTime,gg[gg.length-1]?.startTime,gg.filter(z=>z.hasLineups).length,'with lineups')
}

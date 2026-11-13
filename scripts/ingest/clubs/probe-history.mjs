// Temporary probe (removed before merge)
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ')
for(const u of ['https://www.fitbastats.com/celtic/team_results_season.php?from=79&to=79&competition=0','https://www.fitbastats.com/celtic/team_results_season.php?from=79','https://londonhearts.com/scores/allg/celtic1967.htm','https://londonhearts.com/scores/allg/celtic2005.htm','https://www.londonhearts.com/scores/a1960/celtic1967.htm']){
 const r=await fetch(u,{headers:UA});const t=await r.text();const rows=(t.match(/gameid=\d+">\d\d\/\d\d\/\d{4}/g)||[]).map(x=>x.split('>')[1])
 console.log('##',r.status,u,'bytes',t.length,'fitba rows',rows.length,rows[0],rows[rows.length-1])
 if(/londonhearts/.test(u)){const i=t.indexOf('Date Comp');const s=strip(t);const j=s.indexOf('Date Comp');console.log(s.slice(j,j+1200))}
 await new Promise(r=>setTimeout(r,1200))}

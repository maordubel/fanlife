// Temporary probe (removed before merge): the shape of the historical sources that answer from GitHub Actions.
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)','accept':'text/html,application/json'}
const show=async(u,n=1500,find)=>{try{const r=await fetch(u,{headers:UA});const t=await r.text();console.log('\n##',r.status,u,'bytes',t.length);const i=find?Math.max(0,t.indexOf(find)):0;console.log(t.slice(i,i+n).replace(/\s+/g,' '))}catch(e){console.log('ERR',u,e.message)}await new Promise(r=>setTimeout(r,1200))}
await show('https://www.fitbastats.com/celtic/team_results_season.php',2500,'<form')
await show('https://www.fitbastats.com/celtic/team_results_season.php?season=1966-1967',1500,'<table')
await show('https://www.fitbastats.com/celtic/team_results_season.php?seasonid=79',1500,'<table')
await show('https://www.fitbastats.com/celtic/match_details.php?matchid=1',1800,'<table')
await show('https://en.wikipedia.org/w/api.php?action=parse&page=1966%E2%80%9367_Celtic_F.C._season&prop=wikitext&format=json',2500,'Football box')
await show('https://datencenter.dfb.de/en/data-center/2-bundesliga/1975-1976-nord/31-matchday/fc-st-pauli-wacker-04-berlin-209466',1500,'Lineup')
await show('https://datencenter.dfb.de/en/data-center/2-bundesliga/1975-1976-nord/spielplan',1500,'St. Pauli')
await show('https://www.rsssf.org/tablesg/grie90.html',1500,'Olymp')
await show('https://en.wikipedia.org/w/api.php?action=parse&page=1997%E2%80%9398_Olympiacos_F.C._season&prop=wikitext&format=json',1500,'Football box')
await show('https://en.wikipedia.org/w/api.php?action=parse&page=2004%E2%80%9305_Al_Ahly_SC_season&prop=wikitext&format=json',1200,'Football box')
await show('https://www.kooora.com/?team=65',800)
await show('https://www.footballzz.com/team_matches.php?id=1679&epoca_id=150',800,'<table')
await show('https://www.zerozero.pt/team_matches.php?id=1679&epoca_id=150',800,'<table')
await show('https://www.soccerway.com/teams/scotland/celtic-football-club/1898/matches/',800,'<table')
await show('https://api.sofascore.com/api/v1/team/2352/events/last/40',600)
await show('https://www.fotmob.com/api/teams?id=9925',600)

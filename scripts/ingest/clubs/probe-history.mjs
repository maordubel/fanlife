// Temporary probe (removed before merge): which historical match sites answer a polite reader from GitHub Actions, and how they print a season.
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)','accept':'text/html,application/json'}
const urls=[
 'https://www.11v11.com/teams/celtic/tab/matches/season/1967/',
 'https://www.worldfootball.net/teams/celtic-fc/1967/3/',
 'https://www.worldfootball.net/all_matches/sco-premiership-1966-1967/',
 'https://fbref.com/en/squads/b81aa4fa/1966-1967/Celtic-Stats',
 'https://www.transfermarkt.com/celtic-glasgow/spielplandatum/verein/371/saison_id/1966',
 'https://www.rsssf.org/tabless/scot67.html',
 'https://www.footballdatabase.eu/en/club/matches/1229-celtic_glasgow/1966-1967',
 'https://www.fitbastats.com/celtic/team_results_season.php?season=1966/67',
 'https://www.thecelticwiki.com/1966-67-season/',
 'https://en.wikipedia.org/w/api.php?action=parse&page=1966%E2%80%9367_Celtic_F.C._season&prop=wikitext&format=json',
 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4330&s=1999-2000',
 'https://www.footballdatabase.eu/en/club/matches/2077-raja_casablanca/2005-2006',
 'https://www.worldfootball.net/teams/olympiakos-piraeus/1990/3/',
 'https://www.11v11.com/teams/olympiakos/tab/matches/season/1990/',
]
for(const u of urls){try{const r=await fetch(u,{headers:UA,redirect:'follow'});const t=await r.text();const rows=(t.match(/<tr/g)||[]).length
 console.log(r.status,u,'bytes',t.length,'rows',rows,'title',(t.match(/<title>([^<]*)/)||[])[1]?.slice(0,80))
 if(r.ok&&/11v11|worldfootball/.test(u)){const i=t.search(/Celtic|Olympi/);console.log('  sample',t.slice(t.indexOf('<table'),t.indexOf('<table')+1200).replace(/\s+/g,' '))}
}catch(e){console.log('ERR',u,e.message)}await new Promise(r=>setTimeout(r,1500))}
